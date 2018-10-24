'use strict';

let Service, Characteristic, Accessory, uuid;
let LutronDmxLight, LutronWindowCovering, CoolAccessory, NeoAdapter;

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

  LutronDmxLight = require('./lutron-dmxlight.js')(exportedTypes);
  LutronWindowCovering = require('./lutron-windowcovering.js')(exportedTypes);
  CoolAccessory = require('./cool-accessory.js')(exportedTypes);
  NeoAdapter = require('./neo-adapter.js')(exportedTypes);

  homebridge.registerAccessory('homebridge-omniscia', 'LutronDmxLight', LutronDmxLight, true);
  homebridge.registerAccessory('homebridge-omniscia', 'LutronWindowCovering', LutronWindowCovering, true);
  homebridge.registerAccessory('homebridge-omniscia', 'CoolAccessory', CoolAccessory, true);
  homebridge.registerAccessory('homebridge-omniscia', 'NeoAdapter', NeoAdapter, true);
};
