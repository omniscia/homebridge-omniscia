const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAdapter = require('./omniscia-adapter')();
LutronConnection = require('./lutron-connection');

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  return { LutronLightSwitchAdapter }
};

'use strict';

class LutronLightSwitchAdapter extends OmnisciaAdapter {
    constructor(log, config) {
        let lightbulbService = new Service.Lightbulb();

        super(log, config,
            LutronConnection.getInstance(log, config['host'], config['port'], config['username'], config['password']),
            [ lightbulbService ]);

        this.bindCharacteristic(lightbulbService, Characteristic.On, this.getOn, this.setOn, "On");
    }

    refreshDataFromDevice() { this.deviceConnection.refreshLevel(this.id); }

    getOn() { return this.deviceConnection.getLevel(this.id) > 0; }
    setOn(val) {
        this.log.warn("WRITING>>"+JSON.stringify(val));
        this.deviceConnection.setLevel(this.id, val>0?100:0);
    }
};
