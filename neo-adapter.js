const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAdapter = require('./omniscia-adapter')();
NeoConnection = require('./neo-connection');

'use strict';

module.exports = function(exportedTypes) {
  if (exportedTypes && !Service) {
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;

    const acc = NeoAdapter.prototype;
    inherits(NeoAdapter, OmnisciaAdapter);
    NeoAdapter.prototype.parent = OmnisciaAdapter.prototype;
    for (const mn in acc) NeoAdapter.prototype[mn] = acc[mn];
  }
  return NeoAdapter;
};

function NeoAdapter(log, config) {
    thermostatService = new Service.Thermostat();
    this.neoConnection = NeoConnection.getInstance(log, config['host'], config['port'], config['username'], config['password']);

    OmnisciaAdapter.call(this, log, config, this.neoConnection, [ thermostatService ]);

    this.bindCharacteristic(thermostatService, Characteristic.CurrentHeatingCoolingState, getCurrentHeatingCoolingState.bind(this), null, "CurrentHeatingCoolingState",
        {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.HEAT]});
    this.bindCharacteristic(thermostatService, Characteristic.TargetHeatingCoolingState, getTargetHeatingCoolingState.bind(this), setTargetHeatingCoolingState.bind(this), "TargetHeatingCoolingState",
        {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.HEAT]});
    this.bindCharacteristic(thermostatService, Characteristic.CurrentTemperature, getCurrentTemperature.bind(this), null, "CurrentTemperature");
    this.bindCharacteristic(thermostatService, Characteristic.TargetTemperature, getTargetTemperature.bind(this), setTargetTemperature.bind(this), "TargetTemperature");
    this.bindCharacteristic(thermostatService, Characteristic.TemperatureDisplayUnits, getTemperatureDisplayUnits.bind(this), setTemperatureDisplayUnits.bind(this), "TemperatureDisplayUnits");

    this.refreshDataFromDevice();
}

const getCurrentHeatingCoolingState = function() {
    if (this.neoConnection.isHeating(this.id))
        return Characteristic.CurrentHeatingCoolingState.HEAT;
    else return Characteristic.CurrentHeatingCoolingState.OFF;
};


const getTargetHeatingCoolingState = function() {
    if (this.neoConnection.isStandby(this.id))
        return Characteristic.TargetHeatingCoolingState.OFF;
    else return Characteristic.TargetHeatingCoolingState.HEAT;
};

const setTargetHeatingCoolingState = function (val) {
    switch (val) {
        case Characteristic.TargetHeatingCoolingState.HEAT:
            this.neoConnection.setStandby(this.id, false);
            break;
        case Characteristic.TargetHeatingCoolingState.OFF:
            this.neoConnection.setStandby(this.id, true);
            break;
        case Characteristic.TargetHeatingCoolingState.AUTO:
        case Characteristic.TargetHeatingCoolingState.COOL:
        default:
            this.log.error("INVALID TargetHeatingCoolingState>>", val);
            break;
    }
};


const getCurrentTemperature = function() { return this.neoConnection.getCurrentTemperature(this.id); };
const getTargetTemperature  = function() { return this.neoConnection.getTargetTemperature(this.id); };
const setTargetTemperature  = function(val) { this.neoConnection.setTargetTemperature(this.id, val); } ;

const getTemperatureDisplayUnits = function() {
    return Characteristic.TemperatureDisplayUnits.CELSIUS;
};

const setTemperatureDisplayUnits = function(val) { }
