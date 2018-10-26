const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAdapter = require('./omniscia-adapter')();
NeoConnection = require('./neo-connection');

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  return { NeoPlugAdapter }
};

'use strict';
    
class NeoPlugAdapter extends OmnisciaAdapter {
    constructor(log, config) {
        let switchService = new Service.Switch();
    
        super(log, config,
            NeoConnection.getInstance(log, config['host'], config['port'], config['username'], config['password']),
            [ switchService ]);

        this.bindCharacteristic(switchService, Characteristic.On, this.getOn, this.setOn, "On");
    }
    
    getOn() { this.deviceConnection.isPlugOn(this.id);  }
    setOn (val) { this.deviceConnection.setPlugOn(this.id, val); } ;
};
