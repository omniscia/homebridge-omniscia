const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAdapter = require('./omniscia-adapter')();
CoolConnection = require('./cool-connection');

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  return { CoolAdapter }
};

'use strict';
    
class CoolAdapter extends OmnisciaAdapter {
    constructor(log, config) {
        let filterMaintenanceService = new Service.FilterMaintenance();
        let thermostatService = new Service.Thermostat();
    
        super(log, config,
            CoolConnection.getInstance(log, config['host'], config['port'], config['username'], config['password']),
            [ filterMaintenanceService, thermostatService ]);

        this.bindCharacteristic(filterMaintenanceService, Characteristic.FilterChangeIndication, this.getFilterChangeIndication, null, "FilterChangeIndication");

        this.bindCharacteristic(thermostatService, Characteristic.CurrentHeatingCoolingState, this.getCurrentHeatingCoolingState, null, "CurrentHeatingCoolingState",
            {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.COOL]});
        this.bindCharacteristic(thermostatService, Characteristic.TargetHeatingCoolingState, this.getTargetHeatingCoolingState, this.setTargetHeatingCoolingState, "TargetHeatingCoolingState",
            {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.COOL]});
        this.bindCharacteristic(thermostatService, Characteristic.CurrentTemperature, this.getCurrentTemperature, null, "CurrentTemperature");
        this.bindCharacteristic(thermostatService, Characteristic.TargetTemperature, this.getTargetTemperature, this.setTargetTemperature, "TargetTemperature");
        this.bindCharacteristic(thermostatService, Characteristic.TemperatureDisplayUnits, this.getTemperatureDisplayUnits, this.setTemperatureDisplayUnits, "TemperatureDisplayUnits");
    }
    
    getCurrentHeatingCoolingState() {
        if (this.deviceConnection.isCooling(this.id))
            return Characteristic.CurrentHeatingCoolingState.COOL;
        else return Characteristic.CurrentHeatingCoolingState.OFF;
    }
    
    getTargetHeatingCoolingState() {
        if (this.deviceConnection.isStandby(this.id))
            return Characteristic.TargetHeatingCoolingState.OFF;
        else return Characteristic.TargetHeatingCoolingState.COOL;
    }
    
    setTargetHeatingCoolingState (val) {
        switch (val) {
            case Characteristic.TargetHeatingCoolingState.COOL:
                this.deviceConnection.setStandby(this.id, false);
                break;
            case Characteristic.TargetHeatingCoolingState.OFF:
                this.deviceConnection.setStandby(this.id, true);
                break;
            case Characteristic.TargetHeatingCoolingState.AUTO:
            case Characteristic.TargetHeatingCoolingState.HEAT:
            default:
                this.log.error("INVALID TargetHeatingCoolingState>>", val);
                break;
        }
    }
    
    getCurrentTemperature() { return this.deviceConnection.getCurrentTemperature(this.id); }
    getTargetTemperature () { return this.deviceConnection.getTargetTemperature(this.id); }
    setTargetTemperature (val) { this.deviceConnection.setTargetTemperature(this.id, val); } ;
    
    getTemperatureDisplayUnits() {
        return 'C' == this.deviceConnection.getTemperatureDisplayUnits(this.id)
            ? Characteristic.TemperatureDisplayUnits.CELSIUS
            : Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
    }
    
    setTemperatureDisplayUnits(val) {
        this.deviceConnection.setTemperatureDisplayUnits(this.id, Characteristic.TemperatureDisplayUnits.CELSIUS == val ? 'C' : 'F');
    }
};
