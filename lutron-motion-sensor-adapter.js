const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAdapter = require('./omniscia-adapter')();
LutronConnection = require('./lutron-connection');

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  return { LutronMotionSensorAdapter }
};

'use strict';

class LutronMotionSensorAdapter extends OmnisciaAdapter {
    constructor(log, config) {
        let motionSensorService = new Service.MotionSensor();

        super(log, config,
            LutronConnection.getInstance(log, config['host'], config['port'], config['username'], config['password']),
            [ motionSensorService ]);

        this.bindCharacteristic(motionSensorService, Characteristic.MotionDetected, this.getMotionDetected, null, "MotionDetected");
    }

    refreshDataFromDevice() { this.deviceConnection.refreshOccupancy(this.id); }

    getMotionDetected() { return this.deviceConnection.getOccupancy(this.id); }
};
