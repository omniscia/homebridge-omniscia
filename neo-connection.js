var TelnetConnection = require('./telnet.js');

'use strict';

let ConnectionInstances = {};
let FLOAT_FIELDS = [ "CURRENT_FLOOR_TEMPERATURE", "CURRENT_SET_TEMPERATURE", "CURRENT_TEMPERATURE", "MAX_TEMPERATURE", "MIN_TEMPERATURE" ];

class NeoConnection {
    constructor(log, host, port, username, password) {
        this.log = log;

        this.deviceData = { };
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
            let instance = new NeoConnection(log, host, port, username, password);
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

    isHeating(id) {
        if (!this.deviceData[id]) {
            this.log.error("Asking for current heating status before exists for id",id);
            this.refreshData();
            return;
        }
        return this.deviceData[id].HEATING;
    }
    isStandby(id) {
        if (!this.deviceData[id]) {
            this.log.error("Asking for current standby status before exists for id",id);
            this.refreshData();
            return;
        }
        return this.deviceData[id].STANDBY;
    }

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

module.exports = NeoConnection;
