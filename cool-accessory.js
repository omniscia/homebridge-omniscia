const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAccessory = require('./omniscia-accessory')();

'use strict';

module.exports = function(exportedTypes) {
  if (exportedTypes && !Service) {
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;

    const acc = CoolAccessory.prototype;
    inherits(CoolAccessory, OmnisciaAccessory);
    CoolAccessory.prototype.parent = OmnisciaAccessory.prototype;
    for (const mn in acc) CoolAccessory.prototype[mn] = acc[mn];
  }
  return CoolAccessory;
};

function CoolAccessory(log, config) {
   filterMaintenanceService = new Service.FilterMaintenance();
   thermostatService = new Service.Thermostat();

    OmnisciaAccessory.call(this, log, config,
        '>',
        { "L": this.lsResponseHandler.bind(this) },
        { "ls": this.lsEventHandler.bind(this) },
        [ filterMaintenanceService, thermostatService ]
    );

    this.bindCharacteristic(filterMaintenanceService, Characteristic.FilterChangeIndication, getFilterChangeIndication.bind(this), null, "FilterChangeIndication");

    this.bindCharacteristic(thermostatService, Characteristic.CurrentHeatingCoolingState, getCurrentHeatingCoolingState.bind(this), null, "CurrentHeatingCoolingState",
        {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.COOL]});
    this.bindCharacteristic(thermostatService, Characteristic.TargetHeatingCoolingState, getTargetHeatingCoolingState.bind(this), setTargetHeatingCoolingState.bind(this), "TargetHeatingCoolingState",
        {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.COOL]});
    this.bindCharacteristic(thermostatService, Characteristic.CurrentTemperature, getCurrentTemperature.bind(this), null, "CurrentTemperature");
    this.bindCharacteristic(thermostatService, Characteristic.TargetTemperature, getTargetTemperature.bind(this), setTargetTemperature.bind(this), "TargetTemperature");
    this.bindCharacteristic(thermostatService, Characteristic.TemperatureDisplayUnits, getTemperatureDisplayUnits.bind(this), setTemperatureDisplayUnits.bind(this), "TemperatureDisplayUnits");

    this.refreshDataFromDevice();
}

CoolAccessory.prototype.writeToDevice  = function(item, val) { this.sendCommand( item            + ' ' + this.integrationId + (val?' '+val:'')); };
CoolAccessory.prototype.readFromDevice = function(item)      { this.sendCommand((item?item:'ls') + ' ' + this.integrationId                   ); };

CoolAccessory.prototype.lsResponseHandler = function(response) { return { ls: response.split(/[\s,]+/) }; };
CoolAccessory.prototype.lsEventHandler = function(integrationId, ...parameters) {
    this.log.debug('LS::' + integrationId + '>>' + parameters + '<<');

    if (!parameters || parameters.length < 7) {
        this.log.debug('LS::READ INCOMPLETE - RETRY');
        this.refreshDataFromDevice();
    } else {
        this.deviceData[this.integrationId].integrationId = integrationId;
        this.deviceData[this.integrationId].tempUnits = parameters[1][parameters[1].length - 1];
        this.deviceData[this.integrationId].isOn = parameters[0] == 'ON';
        this.deviceData[this.integrationId].setTemp = parseFloat(parameters[1].substr(0, parameters[1].length - 1));
        this.deviceData[this.integrationId].roomTemp = parseFloat(parameters[2].substr(0, parameters[2].length - 1));
        this.deviceData[this.integrationId].fanSpeed = parameters[3];
        this.deviceData[this.integrationId].operationMode = parameters[4];
        this.deviceData[this.integrationId].failureCode = parameters[5];
        this.deviceData[this.integrationId].changeFilter = parameters[6] != '-';
        this.deviceData[this.integrationId].demand = parameters[7] == '1';

        this.log.debug('LS::' + JSON.stringify(this.deviceData[this.integrationId]));
    }
};

const getFilterChangeIndication = function() {
    return this.deviceData[this.integrationId].changeFilter 
        ? Characteristic.FilterChangeIndication.CHANGE_FILTER 
        : Characteristic.FilterChangeIndication.FILTER_OK;
};

const getCurrentHeatingCoolingState = function() {
    if (false == this.deviceData[this.integrationId].isOn)
        return Characteristic.CurrentHeatingCoolingState.OFF;

    switch (this.deviceData[this.integrationId].operationMode) {
        case "Auto":
        case "Cool":
            if (this.deviceData[this.integrationId].roomTemp > this.deviceData[this.integrationId].setTemp)
                return Characteristic.CurrentHeatingCoolingState.COOL;
            else return Characteristic.CurrentHeatingCoolingState.OFF;
        case "Fan":
            return Characteristic.CurrentHeatingCoolingState.OFF;
        case "Heat":
        case "Dry":
            this.log.error("INVALID CurrentHeatingCoolingState>>", this.deviceData[this.integrationId].operationMode);
            return Characteristic.CurrentHeatingCoolingState.OFF;

    }
};

const getTargetHeatingCoolingState = function() {
    if (false == this.deviceData[this.integrationId].isOn)
        return Characteristic.TargetHeatingCoolingState.OFF;

    switch (this.deviceData[this.integrationId].operationMode) {
        case "Auto":
        case "Cool":
            return Characteristic.TargetHeatingCoolingState.COOL;
        case "Fan":
            return Characteristic.TargetHeatingCoolingState.OFF;
        case "Heat":
        case "Dry":
        default:
            this.log.error("INVALID TargetHeatingCoolingState>>", this.deviceData[this.integrationId].operationMode);
            return Characteristic.CurrentHeatingCoolingState.OFF;
    }
};

const setTargetHeatingCoolingState = function (val) {
    switch (val) {
        case Characteristic.TargetHeatingCoolingState.AUTO:
        case Characteristic.TargetHeatingCoolingState.COOL:
            this.writeToDevice("on");
            this.writeToDevice("cool");
            break;
        case Characteristic.TargetHeatingCoolingState.OFF:
            this.writeToDevice("off");
            break;
        case Characteristic.TargetHeatingCoolingState.HEAT:
        default:
            this.log.error("INVALID TargetHeatingCoolingState>>", val);
            break;
    }
};


const getCurrentTemperature = function() { return this.deviceData[this.integrationId].roomTemp; };
const getTargetTemperature  = function() { return this.deviceData[this.integrationId].setTemp; };
const setTargetTemperature  = function(val) { this.writeToDevice('temp', val); };

const getTemperatureDisplayUnits = function() {
    return 'C' == this.deviceData[this.integrationId].tempUnit
        ? Characteristic.TemperatureDisplayUnits.CELSIUS
        : Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
};

const setTemperatureDisplayUnits = function(val) {
    if (Characteristic.TemperatureDisplayUnits.CELSIUS == val)
        this.sendCommand('set deg C');
    else this.sendCommand('set deg F');
}
