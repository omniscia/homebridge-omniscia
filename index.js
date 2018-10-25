'use strict';

let Service, Characteristic, Accessory, uuid;
let LutronRgbwAdapter, LutronShadeAdapter, CoolAdapter, NeoAdapter;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  Accessory = homebridge.hap.Accessory;
  uuid = homebridge.hap.uuid;
  const exportedTypes = {
    Accessory: Accessory,
    Service: Service,
    Characteristic: Characteristic,
    uuid: uuid,
  };

  const { LutronRgbwAdapter } = require('./lutron-rgbw-adapter.js')(homebridge);
  const { LutronShadeAdapter } = require('./lutron-shade-adapter')(homebridge);
  const { CoolAdapter } = require('./cool-adapter')(homebridge);
  const { NeoAdapter } = require('./neo-adapter')(homebridge);

  homebridge.registerAccessory('homebridge-omniscia', 'LutronRgbwAdapter', LutronRgbwAdapter, true);
  homebridge.registerAccessory('homebridge-omniscia', 'LutronShadeAdapter', LutronShadeAdapter, true);
  homebridge.registerAccessory('homebridge-omniscia', 'CoolAdapter', CoolAdapter, true);
  homebridge.registerAccessory('homebridge-omniscia', 'NeoAdapter', NeoAdapter, true);
};
