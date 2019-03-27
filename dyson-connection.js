const mqtt = require('mqtt');
const crypto = require('crypto');
const Promise = require('promise');

'use strict';

let ConnectionInstances = {};

class DysonConnection {
    constructor(log, host, port, username, password) {
        this.log = log;

        this.modelNumber = '475';
        this.mqttCommandChannel = this.modelNumber + "/" + username + "/command";
        this.mqttStatusChannel = this.modelNumber + "/" + username + "/status/current";

        this.requestStatusPromise = null;
        this.requestStatusPromiseFulfill = null;

        this.deviceData = {
            power: false,
            speed: 0,
            temperature: null,
            humidity: null,
            nightMode: true,
            autoMode: false,
            swingEnabled: "disabled"
        };

        this.connection =  this.setupConnection(host, usdrname, password);

        this.jsonReadBuffer = '';
        this.telnetConnection = TelnetConnection.getInstance(log, host, port, username, password, '',
            { '': this.jsonResponseHandler.bind(this) });
        this.telnetConnection.on("json", this.jsonEventHandler.bind(this));
    }

    static getInstance(log, host, port, username, password) {
        host = host || '192.168.0.219';
        port = port || 4242;
        username = username || '';
        password = password || '';

        let instanceKey = host + '-' + port + '-' + username + '-' + new Buffer(password).toString('base64');

        if (!ConnectionInstances[instanceKey]) {
            log.warn("CREATE CON>>" + instanceKey + "<<");
            let instance = new DysonConnection(log, host, port, username, password);
            ConnectionInstances[instanceKey] = instance;
        } else log.warn("REUSED CON>>" + instanceKey + "<<");

        ConnectionInstances[instanceKey].refreshData();

        return ConnectionInstances[instanceKey];
    }

    sendCommand(command) {
        this.log.warn("WRITING>>" + JSON.stringify(command) + "<<");
        this.telnetConnection.send(JSON.stringify(command) + new Buffer([0]));
    }

    setValue(id, setting, value) {
        let command = { };
        command[setting] = value ? [value, id] : id;
        this.sendCommand(command);
    }

    refreshData() {
        if ( Date.now() < (this.lastRefreshed + 500) )  return;
        this.lastRefreshed = Date.now();

        this.sendCommand({ "INFO" : 0 });
    }

    jsonResponseHandler(data) { 
        this.log.debug("NEO>>"+data+"<<");

        data = data.toString();
        if ( data.charCodeAt( data.length - 1 ) !== 0 ) {
            this.jsonReadBuffer += data;
            return;
        }

        let fullData = this.jsonReadBuffer + data.substr( 0, data.length - 1 );
        this.jsonReadBuffer = '';

        return { json: fullData.split(/\u0000/) };
    };

    jsonEventHandler(...responses) {
      this.log.debug("JSON>"+responses+"<<");

      responses.forEach((response) => {
        var data;
        try {
            data = JSON.parse(response);
        } catch (error) {
            this.log.error("Could not parse JSON",error,response);
        }

        if (data != null && data.devices != null) {
            data.devices.forEach(function(device) {
                this.log.warn('READING>>'+device.device+'<');

                if (!this.deviceData[device.device]) this.deviceData[device.device] = { };

                Object.keys(device).forEach(function(key) {
                    if ( FLOAT_FIELDS.includes(key) )
                        this.deviceData[device.device][key] = parseFloat(device[key]);
                    else
                        this.deviceData[device.device][key] = device[key];
                }.bind(this));
            }.bind(this));
        };
      });
    }

    setupConnection(log, host, username, password) {
        var self = this;
        var connection = mqtt.connect('mqtt://' + host, {
            username: username,
            password: crypto.createHash('sha512').update(password, "utf8").digest("base64")
        });

        connection.on('connect', function () {
            log.warn('(MQTT) Connected to ' + config.host)
            connection.subscribe(self.mqttStatusChannel);
            self.requestCurrentState();
        });

        connection.on("error",     function(error) { log.warn("(MQTT) Error:", error); });
        connection.on('offline',   function()      { log.warn("(MQTT) Offline"); });
        connection.on('reconnect', function()      { log.warn("(MQTT) Reconnect"); });

        connection.on('message', function (topic, message) {
            log.warn("(MQTT) Received message from topic: " + topic);
            log.warn("(MQTT) Message is: " + message);

            if (topic === self.mqttStatusChannel) {
                parseMessage(log, self, message);
            }
        });
    }

    parseMessage(log, self, message) {
        status = JSON.parse(message.toString());

        // 2997 - 2731.5
        if (status.msg === 'ENVIRONMENTAL-CURRENT-SENSOR-DATA') {
        if (!isNaN(status.data.tact))
                        self.deviceData.temperature = Number(Math.round(parseFloat((status.data.tact - 2731.5) / 10) +'e1') + 'e-1');
                if (!isNaN(status.data.hact))
                self.deviceData.humidity = parseInt(status.data.hact);
                log.warn("(MQTT) Received sensor data. Temperature: " + self.deviceData.temperature + ". Humidity: " + self.deviceData.humidity);

                if (self.requestStatusPromise !== null) {
                    self.requestStatusPromiseFulfill(self.deviceData);
                    self.requestStatusPromise = null;
                }
            } else if (status.msg === 'CURRENT-STATE') {
                // {"msg":"CURRENT-STATE","time":"2017-04-11T07:21:06.000Z","mode-reason":"LAPP","state-reason":"MODE","dial":"OFF","rssi":"-43","product-state":{"fmod":"FAN","fnst":"FAN","fnsp":"0001","qtar":"0003","oson":"OFF","rhtm":"OFF","filf":"3352","ercd":"02C0","nmod":"ON","wacd":"NONE"},"scheduler":{"srsc":"6457","dstv":"0000","tzid":"0001"}}
                // Always override night mode
                self.deviceData.nightMode = true; //status['product-state'].nmod !== 'OFF';
                self.deviceData.power = status['product-state'].fmod !== 'OFF';
                self.deviceData.autoMode = status['product-state'].fmod === 'AUTO';
                self.deviceData.speed = parseInt(status['product-state'].fnsp) * 10;
                self.deviceData.swingEnabled = status['product-state'].oson === 'ON';
                log.warn("(MQTT) Got fan state. Power: " + (self.deviceData.power ? "on" : "off") + ". Nightmode: " + self.deviceData.nightMode + ". Speed: " + self.deviceData.speed + "% / " + (self.deviceData.speed / 10) + ". Swing: " + (self.deviceData.swingEnabled ? "on" : "off") + ". Auto: " + (self.deviceData.autoMode ? "on" : "off"));

            } else if (status.msg === 'STATE-CHANGE') {
                // {"msg":"STATE-CHANGE","time":"2017-04-11T07:22:27.000Z","mode-reason":"LAPP","state-reason":"MODE","product-state":{"fmod":["FAN","FAN"],"fnst":["FAN","FAN"],"fnsp":["0004","0004"],"qtar":["0003","0003"],"oson":["ON","OFF"],"rhtm":["OFF","OFF"],"filf":["3352","3352"],"ercd":["02C0","02C0"],"nmod":["ON","ON"],"wacd":["NONE","NONE"]},"scheduler":{"srsc":"6457","dstv":"0000","tzid":"0001"}}

                // TO AUTO:
                // Message is: {"msg":"STATE-CHANGE","time":"2017-04-24T08:07:28.000Z","mode-reason":"RAPP","state-reason":"MODE","product-state":{"fmod":["FAN","AUTO"],"fnst":["FAN","FAN"],"fnsp":["0003","AUTO"],"qtar":["0003","0003"],"oson":["OFF","OFF"],"rhtm":["ON","ON"],"filf":["3105","3105"],"ercd":["02C9","02C9"],"nmod":["ON","ON"],"wacd":["NONE","NONE"]},"scheduler":{"srsc":"6457","dstv":"0000","tzid":"0001"}}

                // Change air quality target:
                // Apr 24 08:09:22 hassbian homebridge[2619]: [4/24/2017, 8:09:22 AM] [Fan] (MQTT) Message is: {"msg":"STATE-CHANGE","time":"2017-04-24T08:09:19.000Z","mode-reason":"LAPP","state-reason":"ENV","product-state":{"fmod":["AUTO","AUTO"],"fnst":["OFF","FAN"],"fnsp":["AUTO","AUTO"],"qtar":["0003","0001"],"oson":["OFF","OFF"],"rhtm":["ON","ON"],"filf":["3105","3105"],"ercd":["02C9","02C9"],"nmod":["ON","ON"],"wacd":["NONE","NONE"]},"scheduler":{"srsc":"6457","dstv":"0000","tzid":"0001"}}

                // Always override night mode
                self.deviceData.nightMode = true; //status['product-state'].nmod[1] !== 'OFF';
                self.deviceData.power = status['product-state'].fmod[1] !== 'OFF';
                self.deviceData.autoMode = status['product-state'].fmod[1] === 'AUTO';
                self.deviceData.speed = parseInt(status['product-state'].fnsp[1]) * 10;
                self.deviceData.swingEnabled = status['product-state'].oson[1] === 'ON';
                self.log("(MQTT) Got fan state. Power: " + (self.deviceData.power ? "on" : "off") + ". Nightmode: " + self.deviceData.nightMode + ". Speed: " + self.deviceData.speed + "% / " + (self.deviceData.speed / 10) + ". Swing: " + (self.deviceData.swingEnabled ? "on" : "off") + ". Auto: " + (self.deviceData.autoMode ? "on" : "off"));
             }

             return;
         });
     }


    isHeating(id) { return this.deviceData[id].HEATING; }
    isStandby(id) { return this.deviceData[id].STANDBY; }

    setStandby(id, standby) {
        if (this.isStandby(id) == standby) return;

        if (standby) this.setValue(id, 'FROST_ON');
        else         this.setValue(id, 'FROST_OFF');
    }

    getCurrentTemperature(id) {
        if (!this.deviceData[id]) {
            this.log.error("Asking for current temperature before exists for id",id);
            this.refreshData();
            return;
        }
        return this.deviceData[id].CURRENT_TEMPERATURE;
    }

    getTargetTemperature(id) {
        if (!this.deviceData[id]) {
            this.log.error("Asking for target temperature before exists for id",id);
            this.refreshData();
            return;
        }
        return this.deviceData[id].CURRENT_SET_TEMPERATURE;
    }

    setTargetTemperature(id, temp) { 
        if (this.getTargetTemperature(id) == temp) return;

        this.setValue(id, 'SET_TEMP', temp); 
    }

    isPlugOn(id) {
        if (!this.deviceData[id]) {
            this.log.error("Asking for plug status before exists for id",id);
            this.refreshData();
            return;
        }
        return (this.deviceData[id].TIME_CLOCK_OVERIDE_BIT && this.deviceData[id].TIMER);
    }

    setPlugOn(id, on) {
        if ( on ) this.setValue(id, 'TIMER_ON')
        else      this.setValue(id, 'TIMER_OFF');
    }
};

module.exports = DysonConnection;
