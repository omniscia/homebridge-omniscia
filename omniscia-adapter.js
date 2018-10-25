let Service, Characteristic;

'use strict';

module.exports = function(exportedTypes) {
  if (exportedTypes && !Service) {
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;
  }
  return OmnisciaAdapter;
};

class OmnisciaAdapter {
    constructor(log, config, deviceConnection, services) {
        this.log = log;
        this.config = config;
        this.name = config['name'];
        this.id = config['id'];

        this.deviceConnection = deviceConnection;
        this.services = services;

        this.refreshDataFromDevice();
    }

    refreshDataFromDevice() { this.deviceConnection.refreshData(); }

    bindCharacteristic(service, characteristic, getFunc, setFunc, desc, props) {
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
    }

    getServices() { return this.services; }
};
