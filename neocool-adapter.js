const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAdapter = require('./omniscia-adapter')();
CoolConnection = require('./cool-connection');
NeoConnection = require('./neo-connection');

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  return { NeoCoolAdapter }
};

'use strict';

class NeoCoolAdapter extends OmnisciaAdapter {
    constructor(log, config) {
        let thermostatService = new Service.Thermostat();

        super(log, config,
            null,
            [ thermostatService ]);

        this.neoConnection = NeoConnection.getInstance(log, config['neoHost'], config['neoPort'], config['neoUsername'], config['neoPassword']);
        this.coolConnection = CoolConnection.getInstance(log, config['coolHost'], config['coolPort'], config['coolUsername'], config['coolPassword']);

        this.neoId = config['neoId'];
        this.coolId = config['coolId'];

        this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.AUTO;
        this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
        this.temperatureCheckInterval = 5000;

        this.refreshDataFromDevice();

        this.bindCharacteristic(thermostatService, Characteristic.CurrentHeatingCoolingState, this.getCurrentHeatingCoolingState, null, "CurrentHeatingCoolingState");
        this.bindCharacteristic(thermostatService, Characteristic.TargetHeatingCoolingState, this.getTargetHeatingCoolingState, this.setTargetHeatingCoolingState, "TargetHeatingCoolingState");
        this.bindCharacteristic(thermostatService, Characteristic.CurrentTemperature, this.getCurrentTemperature, null, "CurrentTemperature");
        this.bindCharacteristic(thermostatService, Characteristic.CoolingThresholdTemperature, this.getCoolingThresholdTemperature, this.setCoolingThresholdTemperature, "CoolingThresholdTemperature");
        this.bindCharacteristic(thermostatService, Characteristic.HeatingThresholdTemperature, this.getHeatingThresholdTemperature, this.setHeatingThresholdTemperature, "HeatingThresholdTemperature");
        this.bindCharacteristic(thermostatService, Characteristic.TargetTemperature, this.getTargetTemperature, this.setTargetTemperature, "TargetTemperature");
        this.bindCharacteristic(thermostatService, Characteristic.TemperatureDisplayUnits, this.getTemperatureDisplayUnits, this.setTemperatureDisplayUnits, "TemperatureDisplayUnits");

        setInterval(() => { this.refreshDataFromDevice(); this.writeDataToDevice(); }, this.temperatureCheckInterval);
    }

    refreshDataFromDevice() { 
this.log.error("REFRESHING DATA");
        if ( !this.coolConnection ) return this.log.error("Using this.coolConnection before it is ready");
        if ( !this.neoConnection ) return this.log.error("Using this.neoConnection before it is ready");

        this.coolConnection.refreshData();
        this.coolingThresholdTemperature = this.coolConnection.getTargetTemperature(this.coolId);

        this.neoConnection.refreshData();
        this.heatingThresholdTemperature = this.neoConnection.getTargetTemperature(this.neoId);

        if ( this.targetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.HEAT )
            this.targetTemperature = this.heatingThresholdTemperature;
        else if ( this.targetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.COOL )
            this.targetTemperature = this.coolingThresholdTemperature;
        else
            this.targetTemperature = (this.coolingThresholdTemperature + this.heatingThresholdTemperature) / 2;
    }

    writeDataToDevice() {
this.log.error("WRITING DATA");
        if ( this.targetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.COOL || this.targetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.AUTO ) {
            if ( this.currentTemperature > this.coolingThresholdTemperature )  {
                this.coolConnection.setStandby(this.coolId, false);
                this.coolConnection.setTargetTemperature(this.coolId, 1);
            } else {
                this.coolConnection.setStandby(this.coolId, true);
            }
        }
        if ( this.targetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.HEAT || this.targetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.AUTO ) {
            this.neoConnection.setStandby(this.neoId, false);
            this.neoConnection.setTargetTemperature(this.neoId, this.heatingThresholdTemperature);
        }

        if ( this.targetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.COOL || this.targetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.OFF  )
            this.neoConnection.setStandby(this.neoId, true);
        if ( this.targetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.HEAT || this.targetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.OFF )
            this.coolConnection.setStandby(this.coolId, true);
    }

    
    getCurrentHeatingCoolingState() {
        if (this.coolConnection.isCooling(this.coolId))
            return Characteristic.CurrentHeatingCoolingState.COOL;
        else if (this.neoConnection.isHeating(this.neoId))
            return Characteristic.CurrentHeatingCoolingState.HEAT;
        else return Characteristic.CurrentHeatingCoolingState.OFF;
    }

    getTargetHeatingCoolingState() { return this.targetHeatingCoolingState; }
    setTargetHeatingCoolingState(val) {
        this.targetHeatingCoolingState = val;

        if ( val == Characteristic.CurrentHeatingCoolingState.COOL ) this.targetTemperature = this.coolingThresholdTemperature;
        else if ( val == Characteristic.TargetHeatingCoolingState.HEAT ) this.targetTemperature = this.heatingThresholdTemperature;
        else this.targetTemperature = (this.coolingThresholdTemperature + this.heatingThresholdTemperature) / 2;

        this.writeDataToDevice();
    }
    
    getCurrentTemperature() { return this.neoConnection.getCurrentTemperature(this.neoId); }

    getTargetTemperature() { return this.targetTemperature; }
    setTargetTemperature(val) { this.targetTemperature = val; this.writeDataToDevice(); }

    getCoolingThresholdTemperature() { return this.coolingThresholdTemperature; }
    setCoolingThresholdTemperature(val) { this.coolingThresholdTemperature = val; this.writeDataToDevice(); }

    getHeatingThresholdTemperature() { return this.heatingThresholdTemperature; }
    setHeatingThresholdTemperature(val) { this.heatingThresholdTemperature = val; this.writeDataToDevice(); }
    
    getTemperatureDisplayUnits() { return this.temperatureDisplayUnits; }
    setTemperatureDisplayUnits(val) { this.temperatureDisplayUnits = val; }
};
