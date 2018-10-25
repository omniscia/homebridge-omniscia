var TelnetConnection = require('./telnet.js');

'use strict';

let ConnectionInstances = {};

class LutronConnection {
    constructor(log, host, port, username, password) {
        this.log = log;

        this.deviceData = { };
        this.lastRefreshed = { };

        this.telnetConnection = TelnetConnection.getInstance(log, host, port, username, password, 'QNET>',
            { '': this.outputResponseHandler.bind(this) });

        this.telnetConnection.on("update", this.updateEventHandler.bind(this));
        this.telnetConnection.on("error", this.errorEventHandler.bind(this));
    }

    static getInstance(log, host, port, username, password) {
        host = host || '192.168.0.75';
        port = port || 23;
        username = username || 'lutron';
        password = password || 'lutron';

        let instanceKey = host + '-' + port + '-' + username + '-' + new Buffer(password).toString('base64');

        if (!ConnectionInstances[instanceKey]) {
            log.warn("CREATE CON>>" + instanceKey + "<<");
            let instance = new LutronConnection(log, host, port, username, password);
            ConnectionInstances[instanceKey] = instance;
        } else log.warn("REUSED CON>>" + instanceKey + "<<");

        ConnectionInstances[instanceKey].refreshData();

        return ConnectionInstances[instanceKey];
    }

    sendCommand(command) {
        this.log.warn("WRITE>>" + JSON.stringify(command) + "<<");
        this.telnetConnection.send(command);
    }

    setValue(id, setting, ...values) {
        let command = '#OUTPUT,' + id + ',' + setting;
        if ( values && values.length > 0 ) command += (','+values.join(','));
        this.sendCommand(command);
    }

    refreshData(id, setting) {
        if ( Date.now() < (this.lastRefreshed[id] + 500) )  return;
        this.lastRefreshed[id] = Date.now();

        if (id == null) this.log.error("ID can't be null")
        else if (setting == null) this.log.error("Setting can't be null")
        else this.sendCommand('?OUTPUT,' + id + ',' + setting);
    }

    outputResponseHandler(data) { 
        data = data.toString().trim();

        if ( data.length <= 1 ) return;
        if ( data.startsWith("~OUTPUT") ) return { update: data.replace('~OUTPUT,', '').split(',') };
        return { error: [ data ] };
    }

    errorEventHandler(data) { this.log.error("ERROR>>"+data+"<<"); }

    updateEventHandler(id, setting, ...values) {
        this.log.warn('UPDATE::' + id + '>>' + setting + '::' + values + '<<');

        if ( !this.deviceData[id] ) this.deviceData[id] = { };
        this.deviceData[id][setting] = (values.length == 1 ? values[0] : values);

        this.log.debug('UPDATE::' + JSON.stringify(this.deviceData[id]));
    }

    refreshLevel(id) { this.refreshData(id, 1); }
    getLevel(id) {
        this.refreshLevel(id);
        if (!this.deviceData[id]) {
            this.log.error("Asking for level before exists on id",id); 
            this.deviceData[id] = { };
        }

        return parseInt(this.deviceData[id][1]); 
    }
    setLevel(id,  level) { this.setValue(id, 1, level); }

    startRaising(id) { this.setValue(id, 2); }
    startLowering(id) { this.setValue(id, 3); }
    stopRaisingOrLowering(id) { this.setValue(id, 4); }

    refreshDmxLevel(id) { this.refreshData(id, 17); }
    getDmxLevel(id) {
        this.refreshDmxLevel(id);
        if (!this.deviceData[id]) {
            this.log.error("Asking for level before exists on id",id);
            this.deviceData[id] = { };
        }
         
        return parseInt(this.deviceData[id][17]);  
    }

    setDmxLevel(id, level) { this.setValue(id, 17, level); }
};

module.exports = LutronConnection;