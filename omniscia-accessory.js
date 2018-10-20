let Service, Characteristic;

var TelnetConnection = require('./telnet.js');

'use strict';

module.exports = function(exportedTypes) {
  if (exportedTypes && !Service) {
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;
  }
  return OmnisciaAccessory;
};

function OmnisciaAccessory(log, config, prompt, telnetHandlers, emitHandlers, serviceList) {
    this.log = log;
    this.config = config;

    this.name = config['name'];

    this.integrationId = config['id'];
    if (!this.deviceData) this.deviceData = { };
    if (!this.deviceData[this.integrationId]) this.deviceData[this.integrationId] = { };

    this.telnetConnection = TelnetConnection.getInstance(
        log,
        config['host'] || '192.168.0.75',
        config['port'] || 23,
        config['username'] || '',
        config['password'] || '',
        prompt,
        telnetHandlers);

    Object.keys(emitHandlers).forEach((key) => {
        this.telnetConnection.on(key, emitHandlers[key]);
    });

    this.serviceList = serviceList;
}

OmnisciaAccessory.prototype.sendCommand = function (cmd) {
    this.telnetConnection.send(cmd);
}

OmnisciaAccessory.prototype.refreshDataFromDevice = function () {
    this.readFromDevice();
}

OmnisciaAccessory.prototype.bindCharacteristic = function (service, characteristic, getFunc, setFunc, desc, props) {
        if (!desc)
            desc = characteristic.toString();

        this.log.warn("BINDING>>", desc, getFunc ? "+get" : "", setFunc ? "+set" : ":");

        const actual = service.getCharacteristic(characteristic)
            .on('get', function (callback) {
                this.refreshDataFromDevice();
                const val = getFunc.bind(this)();
                this.log.warn(desc, "<<", val);
                if (callback) callback(null, val);
            }.bind(this))
            .on('change', function (change) {
                this.log.warn(desc, "<>", change.newValue);
            }.bind(this));

        if (setFunc)
            actual.on('set', function (val, callback) {
                this.log.warn(desc, ">>", val);
                setFunc.bind(this)(val);
                this.refreshDataFromDevice();
                if (callback) callback(null);
            }.bind(this));

        if (props)
            actual.setProps(props);
    };

OmnisciaAccessory.prototype.getServices = function () {
    return this.serviceList;
};

