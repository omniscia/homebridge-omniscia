const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAccessory = require('./omniscia-accessory')();
const Neo = require ('./neo');
const ip = require('ip');

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
    this.neo = new Neo(config['host'], config['port']);
    this.integrationId = config['id'];

    this.neo.on( 'success', function ( data ) {
        if (data.devices != null) {
            data.devices.forEach(function(device) {
                if (!this.neo.deviceData) this.neo.deviceData = { };
                if (!this.neo.deviceData[device.device]) this.neo.deviceData[device.device] = { };

                Object.keys(device).forEach(function(key) {
                    this.neo.deviceData[device.device][key] = device[key];
                }.bind(this));
            }.bind(this));
        };
        console.log(this.neo.deviceData[this.integrationId]);
    }.bind(this));
    this.neo.on( 'error', function ( data ) {
        console.log( data );
    } );

    var wait = function () {
        console.log( "waiting" );
    }
    setTimeout( wait, 1000 );

    thermostatService = new Service.Thermostat();

    OmnisciaAccessory.call(this, log, config,
        '>',
        { "L": this.lsResponseHandler.bind(this) },
        { "ls": this.lsEventHandler.bind(this) },
        [ filterMaintenanceService, thermostatService ]
    );

    this.bindCharacteristic(thermostatService, Characteristic.CurrentHeatingCoolingState, getCurrentHeatingCoolingState.bind(this), null, "CurrentHeatingCoolingState",
        {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.HEAT]});
    this.bindCharacteristic(thermostatService, Characteristic.TargetHeatingCoolingState, getTargetHeatingCoolingState.bind(this), setTargetHeatingCoolingState.bind(this), "TargetHeatingCoolingState",
        {validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.HEAT]});
    this.bindCharacteristic(thermostatService, Characteristic.CurrentTemperature, getCurrentTemperature.bind(this), null, "CurrentTemperature");
    this.bindCharacteristic(thermostatService, Characteristic.TargetTemperature, getTargetTemperature.bind(this), setTargetTemperature.bind(this), "TargetTemperature");
    this.bindCharacteristic(thermostatService, Characteristic.TemperatureDisplayUnits, getTemperatureDisplayUnits.bind(this), setTemperatureDisplayUnits.bind(this), "TemperatureDisplayUnits");

    this.refreshDataFromDevice();
    console.log(this.neo.deviceData);
}

NeoAccessory.prototype.writeToDevice  = function(item, val) { 
console.log("WTF>>",item,">>",val,">>",this.integrationId);
    if (val) this.neo.command({ item: [val, this.integrationId] });
    else     this.neo.command({ item:       this.integrationId  });
};

NeoAccessory.prototype.readFromDevice = function() {
    this.neo.info();
};

NeoAccessory.prototype.lsResponseHandler = function(response) { return { ls: response.split(/[\s,]+/) }; };
NeoAccessory.prototype.lsEventHandler = function(integrationId, ...parameters) {
    this.log.debug('LS::' + integrationId + '>>' + parameters + '<<');

    if (!parameters || parameters.length < 7) {
        this.log.debug('LS::READ INCOMPLETE - RETRY');
        this.refreshDataFromDevice();
    } else {
        this.neo.deviceData[this.integrationId].integrationId = integrationId;
        this.neo.deviceData[this.integrationId].tempUnits = parameters[1][parameters[1].length - 1];
        this.neo.deviceData[this.integrationId].isOn = parameters[0] == 'ON';
        this.neo.deviceData[this.integrationId].setTemp = parseFloat(parameters[1].substr(0, parameters[1].length - 1));
        this.neo.deviceData[this.integrationId].roomTemp = parseFloat(parameters[2].substr(0, parameters[2].length - 1));
        this.neo.deviceData[this.integrationId].fanSpeed = parameters[3];
        this.neo.deviceData[this.integrationId].operationMode = parameters[4];
        this.neo.deviceData[this.integrationId].failureCode = parameters[5];
        this.neo.deviceData[this.integrationId].changeFilter = parameters[6] != '-';
        this.neo.deviceData[this.integrationId].demand = parameters[7] == '1';

        this.log.debug('LS::' + JSON.stringify(this.neo.deviceData[this.integrationId]));
    }
};

const getCurrentHeatingCoolingState = function() {
    if (true == this.neo.deviceData[this.integrationId].HEATING)
        return Characteristic.CurrentHeatingCoolingState.HEAT;
    else return Characteristic.CurrentHeatingCoolingState.OFF;
};


const getTargetHeatingCoolingState = function() {
    if (true == this.neo.deviceData[this.integrationId].STANDBY)
        return Characteristic.TargetHeatingCoolingState.OFF;
    else return Characteristic.TargetHeatingCoolingState.HEAT;
};

const setTargetHeatingCoolingState = function (val) {
    switch (val) {
        case Characteristic.TargetHeatingCoolingState.AUTO:
        case Characteristic.TargetHeatingCoolingState.HEAT:
            this.neo.setStandby(false, this.integrationId);
            break;
        case Characteristic.TargetHeatingCoolingState.OFF:
            this.neo.setStandby(true, this.integrationId);
            break;
        case Characteristic.TargetHeatingCoolingState.COOL:
        default:
            this.log.error("INVALID TargetHeatingCoolingState>>", val);
            break;
    }
};


const getCurrentTemperature = function() { return this.neo.deviceData[this.integrationId].CURRENT_TEMPERATURE; };
const getTargetTemperature  = function() { return this.neo.deviceData[this.integrationId].CURRENT_SET_TEMPERATURE; };
const setTargetTemperature  = function(val) { this.neo.setTemperature(val, this.integrationId); };

const getTemperatureDisplayUnits = function() {
    return Characteristic.TemperatureDisplayUnits.CELSIUS;
};

const setTemperatureDisplayUnits = function(val) {
}
