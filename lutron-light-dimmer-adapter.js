const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAdapter = require('./omniscia-adapter')();
LutronConnection = require('./lutron-connection');

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  return { LutronLightDimmerAdapter }
};

'use strict';
    
class LutronLightDimmerAdapter extends OmnisciaAdapter {
    constructor(log, config) {
        let lightbulbService = new Service.Lightbulb();
    
        super(log, config,
            LutronConnection.getInstance(log, config['host'], config['port'], config['username'], config['password']),
            [ lightbulbService ]);

        this.homekitData = { };
        this.homekitData.isOn = true;
        this.homekitData.brightness = config['brightness'] || 100;

        this.bindCharacteristic(lightbulbService, Characteristic.On, this.getOn, this.setOn, "On");
        this.bindCharacteristic(lightbulbService, Characteristic.Brightness, this.getBrightness, this.setBrightness, "Brightness");
    }

    refreshDataFromDevice() { this.deviceConnection.refreshLevel(this.id); }

    getOn() { return this.getBrightness() > 0; }
    getBrightness() { return this.deviceConnection.getLevel(this.id); }

    setOn         (val) { this.homekitData.isOn                                        = val; this.writeDataToDevice(); }
    setBrightness (val) { this.homekitData.isOn = (val>0); this.homekitData.brightness = val; this.writeDataToDevice(); }

    writeDataToDevice() {
        this.log.warn("WRITING>>"+JSON.stringify(this.homekitData));

        this.deviceConnection.setLevel(this.id, this.homekitData.isOn?this.homekitData.brightness:0);
    }
};
