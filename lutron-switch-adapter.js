const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAdapter = require('./omniscia-adapter')();
LutronConnection = require('./lutron-connection');

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  return { LutronSwitchAdapter }
};

'use strict';
    
class LutronSwitchAdapter extends OmnisciaAdapter {
    constructor(log, config) {
        let windowCoveringService = new Service.WindowCovering();
    
        super(log, config,
            LutronConnection.getInstance(log, config['host'], config['port'], config['username'], config['password']),
            [ windowCoveringService ]);

        this.bindCharacteristic(windowCoveringService, Characteristic.PositionState, this.getPositionState, null, "PositionState");
        this.bindCharacteristic(windowCoveringService, Characteristic.CurrentPosition, this.getCurrentPosition, null, "CurrentPosition");
        this.bindCharacteristic(windowCoveringService, Characteristic.TargetPosition, this.getTargetPosition, this.setTargetPosition, "TargetPosition",
            {minStep: 50});
    }

    refreshDataFromDevice() { this.deviceConnection.refreshLevel(this.id); }

    getPositionState() { return Characteristic.PositionState.STOPPED; }
    getCurrentPosition() { return this.deviceConnection.getLevel(this.id); }
    getTargetPosition() { return this.deviceConnection.getLevel(this.id); }
    
    setTargetPosition (val) {
        switch (val) {
            case 100: this.deviceConnection.startRaising(this.id); break;
            case  50: this.deviceConnection.stopRaisingOrLowering(this.id); break; 
            case   0: this.deviceConnection.startLowering(this.id); break; 
            default:
                this.log.error("INVALID TARGET POSITION:", val);
        }
    }
};
