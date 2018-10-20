const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAccessory = require('./omniscia-accessory')();

'use strict';

module.exports = function(exportedTypes) {
  if (exportedTypes && !Service) {
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;

    const acc = LutronAccessory.prototype;
    inherits(LutronAccessory, OmnisciaAccessory);
    LutronAccessory.prototype.parent = OmnisciaAccessory.prototype;
    for (const mn in acc) LutronAccessory.prototype[mn] = acc[mn];
  }
  return LutronAccessory;
};

function LutronAccessory(log, config, serviceList) {
    OmnisciaAccessory.call(this, log, config,
        'QNET>',
        { "~OUTPUT": this.outputResponseHandler.bind(this) },
        { "output": this.outputEventHandler.bind(this) },
        serviceList 
    );
}

LutronAccessory.prototype.writeToDevice  = function(item, val) { this.sendCommand('#OUTPUT,' + this.integrationId + ',' + item            + (val?','+val:'')); };
LutronAccessory.prototype.readFromDevice = function(item)      { this.sendCommand('?OUTPUT,' + this.integrationId + ',' + (item?item:'1')                   ); };

LutronAccessory.prototype.outputResponseHandler = function(response) { return { output: response.replace('~OUTPUT,', '').split(',') }; };
LutronAccessory.prototype.outputEventHandler = function(integrationId, actionId, ...parameters) { this.log.error("YOU NEED TO REPLACE THIS FUNCTION"); };

LutronAccessory.prototype.bindCharacteristic = OmnisciaAccessory.prototype.bindCharacteristic;
LutronAccessory.prototype.refreshDataFromDevice = OmnisciaAccessory.prototype.refreshDataFromDevice;
LutronAccessory.prototype.sendCommand = OmnisciaAccessory.prototype.sendCommand;
LutronAccessory.prototype.getServices = OmnisciaAccessory.prototype.getServices;
