const inherits = require('util').inherits;
let Service, Characteristic;
const LutronAccessory = require('./lutron-accessory')();

'use strict';

module.exports = function(exportedTypes) {
  if (exportedTypes && !Service) {
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;

    const acc = LutronWindowCovering.prototype;
    inherits(LutronWindowCovering, LutronAccessory);
    LutronWindowCovering.prototype.parent = LutronAccessory.prototype;
    for (const mn in acc) LutronWindowCovering.prototype[mn] = acc[mn];
  }
  return LutronWindowCovering;
};

function LutronWindowCovering(log, config) {
    windowCoveringService = new Service.WindowCovering();

    LutronAccessory.call(this, log, config,
        [ windowCoveringService ]
    );

    this.bindCharacteristic(windowCoveringService, Characteristic.PositionState, getPositionState.bind(this), null, "PositionState");
    this.bindCharacteristic(windowCoveringService, Characteristic.CurrentPosition, getCurrentPosition.bind(this), null, "CurrentPosition");
    this.bindCharacteristic(windowCoveringService, Characteristic.TargetPosition, getTargetPosition.bind(this), setTargetPosition.bind(this), "TargetPosition",
      {minStep: 50});

    this.refreshDataFromDevice();
}

LutronAccessory.prototype.outputEventHandler = function(integrationId, actionId, ...parameters) {
    if (integrationId != this.integrationId ) return;

    this.log.debug('OUTPUT::' + integrationId + '>>' + actionId + '::' + parameters + '<<');

    switch(actionId) {
    case "1":
        this.deviceData[this.integrationId].level = parseInt(parameters[0], 10);
        windowCoveringService.getCharacteristic(Characteristic.CurrentPosition).setValue(this.deviceData[this.integrationId].level);
        windowCoveringService.getCharacteristic(Characteristic.PositionState).setValue(Characteristic.PositionState.STOPPED);
        break;
    }
    this.log.debug('OUTPUT::' + JSON.stringify(this.deviceData[this.integrationId]));
}

const getPositionState   = function() { return Characteristic.PositionState.STOPPED; };
const getCurrentPosition = function() { return this.deviceData[this.integrationId].level; };
const getTargetPosition  = function() { return this.deviceData[this.integrationId].level; };

const setTargetPosition = function(val) {
    switch (val) {
        case 100: this.writeToDevice(2); break;  //lower
        case  50: this.writeToDevice(4); break;  //raise
        case   0: this.writeToDevice(3); break;  //stop
        default:
            this.log.error("INVALID TARGET POSITION>>" + val + "<<");
    }
};
