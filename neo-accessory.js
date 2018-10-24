const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAccessory = require('./omniscia-accessory')();

'use strict';

module.exports = function(exportedTypes) {
  if (exportedTypes && !Service) {
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;

    const acc = NeoAccessory.prototype;
    inherits(NeoAccessory, OmnisciaAccessory);
    NeoAccessory.prototype.parent = OmnisciaAccessory.prototype;
    for (const mn in acc) NeoAccessory.prototype[mn] = acc[mn];
  }
  return NeoAccessory;
};

function NeoAccessory(log, config) {
    thermostatService = new Service.Thermostat();

    OmnisciaAccessory.call(this, log, config,
        '',
        { '': this.jsonResponseHandler.bind(this) },
        { "json": this.jsonEventHandler.bind(this) },
        [ thermostatService ]
    );

    this.bindCharacteristic(thermostatService, Characteristic.CurrentHeatingCoolingState, getCurrentHeatingCoolingState.bind(this), null, "CurrentHeatingCoolingState",
        {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.HEAT]});
    this.bindCharacteristic(thermostatService, Characteristic.TargetHeatingCoolingState, getTargetHeatingCoolingState.bind(this), setTargetHeatingCoolingState.bind(this), "TargetHeatingCoolingState",
        {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.HEAT]});
    this.bindCharacteristic(thermostatService, Characteristic.CurrentTemperature, getCurrentTemperature.bind(this), null, "CurrentTemperature");
    this.bindCharacteristic(thermostatService, Characteristic.TargetTemperature, getTargetTemperature.bind(this), setTargetTemperature.bind(this), "TargetTemperature");
    this.bindCharacteristic(thermostatService, Characteristic.TemperatureDisplayUnits, getTemperatureDisplayUnits.bind(this), setTemperatureDisplayUnits.bind(this), "TemperatureDisplayUnits");

    this.refreshDataFromDevice();
}

NeoAccessory.prototype.writeToDevice  = function(item, val) { 
    command = { };
    command[item] = val ? [val, this.integrationId] : this.integrationId;

    this.log.warn("WRITE>>" + JSON.stringify(command) + "<<");
    this.sendCommand(JSON.stringify(command) + new Buffer([0]));
};

NeoAccessory.prototype.readFromDevice = function() {
             this.sendCommand(JSON.stringify({"INFO": 0                        }) + new Buffer([0]));
};

var partialData = '';
NeoAccessory.prototype.jsonResponseHandler = function(data) { 
    data = data.toString();
    if ( data.charCodeAt( data.length - 1 ) !== 0 ) {
        partialData += data;
        return;
    }

    var fullData = partialData + data.substr( 0, data.length - 1 );
    partialData = '';

    return { json: [ fullData ] };
};

var FLOAT_FIELDS = [ "CURRENT_FLOOR_TEMPERATURE", "CURRENT_SET_TEMPERATURE", "CURRENT_TEMPERATURE", "MAX_TEMPERATURE", "MIN_TEMPERATURE" ];

NeoAccessory.prototype.jsonEventHandler = function(...response) {
    var data = JSON.parse(response);

    // some json floats are set as strings, fix
    if ( data.devices != null ) {
        for ( var i = 0; i < data.devices.length; i++ ) {
            for ( var j = 0; j < FLOAT_FIELDS.length; j++ ) {
                if ( data.devices[ i ][ FLOAT_FIELDS[ j ] ] != null ) {
                    data.devices[ i ][ FLOAT_FIELDS[ j ] ] = parseFloat( data.devices[ i ][ FLOAT_FIELDS[ j ] ] );
                }
            }
        }
    }

    if (data.devices != null) {
        data.devices.forEach(function(device) {
            if (!this.deviceData[device.device]) this.deviceData[device.device] = { };

            Object.keys(device).forEach(function(key) {
                this.deviceData[device.device][key] = device[key];
            }.bind(this));
        }.bind(this));
    };

    this.log.warn(this.integrationId + '>>' + JSON.stringify(this.deviceData[this.integrationId]));
};

const getCurrentHeatingCoolingState = function() {
    if (true == this.deviceData[this.integrationId].HEATING)
        return Characteristic.CurrentHeatingCoolingState.HEAT;
    else return Characteristic.CurrentHeatingCoolingState.OFF;
};


const getTargetHeatingCoolingState = function() {
    if (true == this.deviceData[this.integrationId].STANDBY)
        return Characteristic.TargetHeatingCoolingState.OFF;
    else return Characteristic.TargetHeatingCoolingState.HEAT;
};

const setTargetHeatingCoolingState = function (val) {
    switch (val) {
        case Characteristic.TargetHeatingCoolingState.AUTO:
        case Characteristic.TargetHeatingCoolingState.HEAT:
            this.writeToDevice('FROST_OFF');
            break;
        case Characteristic.TargetHeatingCoolingState.OFF:
            this.writeToDevice('FROST_ON');
            break;
        case Characteristic.TargetHeatingCoolingState.COOL:
        default:
            this.log.error("INVALID TargetHeatingCoolingState>>", val);
            break;
    }
};


const getCurrentTemperature = function() { return this.deviceData[this.integrationId].CURRENT_TEMPERATURE; };
const getTargetTemperature  = function() { return this.deviceData[this.integrationId].CURRENT_SET_TEMPERATURE; };
const setTargetTemperature  = function(val) { this.writeToDevice('SET_TEMP', val); };

const getTemperatureDisplayUnits = function() {
    return Characteristic.TemperatureDisplayUnits.CELSIUS;
};

const setTemperatureDisplayUnits = function(val) {
}
