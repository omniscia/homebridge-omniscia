const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAdapter = require('./omniscia-adapter')();
NeoConnection = require('./neo-connection');

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  return { NeoStatAdapter }
};

'use strict';
    
class NeoStatAdapter extends OmnisciaAdapter {
    constructor(log, config) {
        let thermostatService = new Service.Thermostat();
    
        super(log, config,
            NeoConnection.getInstance(log, config['host'], config['port'], config['username'], config['password']),
            [ thermostatService ]);

        this.bindCharacteristic(thermostatService, Characteristic.CurrentHeatingCoolingState, this.getCurrentHeatingCoolingState, null, "CurrentHeatingCoolingState",
            {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.HEAT]});
        this.bindCharacteristic(thermostatService, Characteristic.TargetHeatingCoolingState, this.getTargetHeatingCoolingState, this.setTargetHeatingCoolingState, "TargetHeatingCoolingState",
            {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.HEAT]});
        this.bindCharacteristic(thermostatService, Characteristic.CurrentTemperature, this.getCurrentTemperature, null, "CurrentTemperature");
        this.bindCharacteristic(thermostatService, Characteristic.TargetTemperature, this.getTargetTemperature, this.setTargetTemperature, "TargetTemperature");
        this.bindCharacteristic(thermostatService, Characteristic.TemperatureDisplayUnits, this.getTemperatureDisplayUnits, this.setTemperatureDisplayUnits, "TemperatureDisplayUnits");
    }
    
    getCurrentHeatingCoolingState() {
        if (this.deviceConnection.isHeating(this.id))
            return Characteristic.CurrentHeatingCoolingState.HEAT;
        else return Characteristic.CurrentHeatingCoolingState.OFF;
    }
    
    getTargetHeatingCoolingState() {
        if (this.deviceConnection.isStandby(this.id))
            return Characteristic.TargetHeatingCoolingState.OFF;
        else return Characteristic.TargetHeatingCoolingState.HEAT;
    }
    
    setTargetHeatingCoolingState (val) {
        switch (val) {
            case Characteristic.TargetHeatingCoolingState.HEAT:
                this.deviceConnection.setStandby(this.id, false);
                break;
            case Characteristic.TargetHeatingCoolingState.OFF:
                this.deviceConnection.setStandby(this.id, true);
                break;
            case Characteristic.TargetHeatingCoolingState.AUTO:
            case Characteristic.TargetHeatingCoolingState.COOL:
            default:
                this.log.error("INVALID TargetHeatingCoolingState>>", val);
                break;
        }
    }
    
    getCurrentTemperature() { return this.deviceConnection.getCurrentTemperature(this.id); }
    getTargetTemperature () { return this.deviceConnection.getTargetTemperature(this.id); }
    setTargetTemperature (val) { this.deviceConnection.setTargetTemperature(this.id, val); } ;
    
    getTemperatureDisplayUnits() {
        return Characteristic.TemperatureDisplayUnits.CELSIUS;
    }
    
    setTemperatureDisplayUnits(val) { }
};
