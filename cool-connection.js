var TelnetConnection = require('./telnet.js');

'use strict';

let ConnectionInstances = {};

class CoolConnection {
    constructor(log, host, port, username, password) {
        this.log = log;

        this.deviceData = { };
        this.jsonReadBuffer = '';

        this.telnetConnection = TelnetConnection.getInstance(log, host, port, username, password, '>',
            { '': this.lineResponseHandler.bind(this) });

        this.telnetConnection.on("stats", this.statsEventHandler.bind(this));
        this.telnetConnection.on("ok", this.okEventHandler.bind(this));
        this.telnetConnection.on("error", this.errorEventHandler.bind(this));
    }

    static getInstance(log, host, port, username, password) {
        host = host || '192.168.0.142';
        port = port || 10102;
        username = username || '';
        password = password || '';

        let instanceKey = host + '-' + port + '-' + username + '-' + new Buffer(password).toString('base64');

        if (!ConnectionInstances[instanceKey]) {
            log.warn("CREATE CON>>" + instanceKey + "<<");
            let instance = new CoolConnection(log, host, port, username, password);
            ConnectionInstances[instanceKey] = instance;
        } else log.warn("REUSED CON>>" + instanceKey + "<<");

        ConnectionInstances[instanceKey].refreshData();

        return ConnectionInstances[instanceKey];
    }

    sendCommand(command) {
        this.log.warn("WRITE>>" + JSON.stringify(command) + "<<");
        this.telnetConnection.send(command);
    }

    setValue(id, setting, value) {
        let command = setting + ' ' + id;
        if ( value ) command += (' ' + value);
        this.sendCommand(command);
    }

    refreshData() {
        if ( Date.now() < (this.lastRefreshed + 500) )  return;
        this.lastRefreshed = Date.now();

        this.sendCommand('ls');
    }

    lineResponseHandler(data) { 
        data = data.toString().trim();

        if ( data.length == 0 ) return;

        if ( data.startsWith("OK") ) return { ok: [ data ] };
        if ( data.startsWith("L") ) return { stats: data.split(/[\s,]+/) };

        return { error: [ data ] };
    }

    okEventHandler(data) { this.log.warn("OKAY>>"+data+"<<"); }
    errorEventHandler(data) { this.log.error("ERROR>>"+data+"<<"); }

    statsEventHandler(id, ...parameters) {
        this.log.warn('STATS::' + id + '>>' + parameters + '<<');

        if (!parameters || parameters.length < 7) {
            this.log.debug('STATS::READ INCOMPLETE - RETRY');
            this.refreshData();
            return;
        }

        if ( !this.deviceData[id] ) this.deviceData[id] = { };
        this.deviceData[id].id = id;
        this.deviceData[id].tempUnits = parameters[1][parameters[1].length - 1];
        this.deviceData[id].isOn = parameters[0] == 'ON';
        this.deviceData[id].setTemp = parseFloat(parameters[1].substr(0, parameters[1].length - 1));
        this.deviceData[id].roomTemp = parseFloat(parameters[2].substr(0, parameters[2].length - 1));
        this.deviceData[id].fanSpeed = parameters[3];
        this.deviceData[id].operationMode = parameters[4];
        this.deviceData[id].failureCode = parameters[5];
        this.deviceData[id].filterOk = parameters[6] == '-';
        this.deviceData[id].demand = parameters[7] == '1';

        this.log.debug('STAT::' + JSON.stringify(this.deviceData[id]));
    }

    isFilterOk(id) { return this.deviceData[id].filterOk; }
    isOn(id) { this.deviceData[id].isOn; }
    getOperationMode(id) { this.deviceData[id].operationMode; }

    isCooling(id) { return this.deviceData[id].operationMode == "Cool" && this.deviceData[id].isOn; };
    isStandby(id) { return this.deviceData[id].operationMode != "Cool" || this.deviceData[id].isOff; };

    setStandby(id, standby) {
        if (standby) this.setValue(id, 'off');
        else {
            this.setValue(id, 'on');
            this.setValue(id, 'cool');
        }
    }

    getCurrentTemperature(id) { return this.deviceData[id].roomTemp; }
    getTargetTemperature(id) { return this.deviceData[id].setTemp; }
    setTargetTemperature(id, temp) { this.setValue(id, 'temp', temp); }

    getTemperatureDisplayUnits(id) { return this.deviceData[id].tempUnits; }
    setTemperatureDisplayUnits(id, val) { this.sendCommand('set deg',val); }
};

module.exports = CoolConnection;
