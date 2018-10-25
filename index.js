'use strict';

let Service, Characteristic, Accessory, uuid;
let LutronRgbwAdapter, LutronShadeAdapter, CoolAdapter, NeoAdapter, NeoCoolAdapter;

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
  const { NeoStatAdapter } = require('./neostat-adapter')(homebridge);
  const { NeoPlugAdapter } = require('./neoplug-adapter')(homebridge);
  const { NeoCoolAdapter } = require('./neocool-adapter')(homebridge);

  homebridge.registerAccessory('homebridge-omniscia', 'LutronRgbwAdapter', LutronRgbwAdapter, true);
  homebridge.registerAccessory('homebridge-omniscia', 'LutronShadeAdapter', LutronShadeAdapter, true);
  homebridge.registerAccessory('homebridge-omniscia', 'CoolAdapter', CoolAdapter, true);
  homebridge.registerAccessory('homebridge-omniscia', 'NeoStatAdapter', NeoStatAdapter, true);
  homebridge.registerAccessory('homebridge-omniscia', 'NeoPlugAdapter', NeoPlugAdapter, true);
  homebridge.registerAccessory('homebridge-omniscia', 'NeoCoolAdapter', NeoCoolAdapter, true);
};
