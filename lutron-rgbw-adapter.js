const inherits = require('util').inherits;
let Service, Characteristic;
const OmnisciaAdapter = require('./omniscia-adapter')();
LutronConnection = require('./lutron-connection');

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  return { LutronRgbwAdapter }
};

'use strict';

let DEVICE_RGBW_MAX = 65279;
    
class LutronRgbwAdapter extends OmnisciaAdapter {
    constructor(log, config) {
        let lightbulbService = new Service.Lightbulb();
    
        super(log, config,
            LutronConnection.getInstance(log, config['host'], config['port'], config['username'], config['password']),
            [ lightbulbService ]);

        this.homekitData = { };
        this.homekitData.isOn = true;
        this.homekitData.hue        = config['hue'] || 0;
        this.homekitData.saturation = config['saturation'] || 0;
        this.homekitData.brightness = config['brightness'] || 100;

        this.rId = config['rId'];
        this.gId = config['gId'];
        this.bId = config['bId'];
        this.wId = config['wId'] || false;

        this.bindCharacteristic(lightbulbService, Characteristic.On, this.getOn, this.setOn, "On");
        this.bindCharacteristic(lightbulbService, Characteristic.Brightness, this.getBrightness, this.setBrightness, "Brightness");
        this.bindCharacteristic(lightbulbService, Characteristic.Saturation, this.getSaturation, this.setSaturation, "Saturation");
        this.bindCharacteristic(lightbulbService, Characteristic.Hue, this.getHue, this.setHue, "Hue",)
    }

    refreshDataFromDevice() { 
        this.deviceConnection.refreshDmxLevel(this.rId);
        this.deviceConnection.refreshDmxLevel(this.gId);
        this.deviceConnection.refreshDmxLevel(this.bId);
        if (this.wId) this.deviceConnection.refreshDmxLevel(this.wId);
    }

    writeDataToDevice() {
        let colors = hsv2rgb(this.homekitData.hue, this.homekitData.saturation, this.homekitData.isOn?this.homekitData.brightness:0);
        if (this.wId) colors = rgb2rgbw(colors.r, colors.g, colors.b);

        this.log.warn("WRITING>>"+JSON.stringify(this.homekitData));
        this.log.warn("WRITING>>",JSON.stringify(colors));

        this.deviceConnection.setDmxLevel(this.rId, Math.round(colors.r/255*DEVICE_RGBW_MAX));
        this.deviceConnection.setDmxLevel(this.gId, Math.round(colors.g/255*DEVICE_RGBW_MAX));
        this.deviceConnection.setDmxLevel(this.bId, Math.round(colors.b/255*DEVICE_RGBW_MAX));
        if (this.wId) this.deviceConnection.setDmxLevel(this.wId, Math.round(colors.w/255*DEVICE_RGBW_MAX));
    }

    getOn         () { return this.getBrightness() > 0; }
    getBrightness () { return rgbw2hsv(this.deviceConnection.getDmxLevel(this.rId)/DEVICE_RGBW_MAX,
                                       this.deviceConnection.getDmxLevel(this.gId)/DEVICE_RGBW_MAX, 
                                       this.deviceConnection.getDmxLevel(this.bId)/DEVICE_RGBW_MAX, 
                            this.wId ? this.deviceConnection.getDmxLevel(this.wId)/DEVICE_RGBW_MAX : null).v; }
    getSaturation () { return rgbw2hsv(this.deviceConnection.getDmxLevel(this.rId)/DEVICE_RGBW_MAX,
                                       this.deviceConnection.getDmxLevel(this.gId)/DEVICE_RGBW_MAX,
                                       this.deviceConnection.getDmxLevel(this.bId)/DEVICE_RGBW_MAX, 
                            this.wId ? this.deviceConnection.getDmxLevel(this.wId)/DEVICE_RGBW_MAX : null).s; }
    getHue        () { return rgbw2hsv(this.deviceConnection.getDmxLevel(this.rId)/DEVICE_RGBW_MAX,
                                       this.deviceConnection.getDmxLevel(this.gId)/DEVICE_RGBW_MAX,
                                       this.deviceConnection.getDmxLevel(this.bId)/DEVICE_RGBW_MAX, 
                            this.wId ? this.deviceConnection.getDmxLevel(this.wId)/DEVICE_RGBW_MAX : null).h; }

    setOn         (val) { this.homekitData.isOn                                     = val; this.writeDataToDevice(); };
    setBrightness (val) { this.homekitData.isOn = true; this.homekitData.brightness = val; this.writeDataToDevice(); };
    setSaturation (val) { this.homekitData.isOn = true; this.homekitData.saturation = val; this.writeDataToDevice(); };
    setHue        (val) { this.homekitData.isOn = true; this.homekitData.hue        = val; this.writeDataToDevice(); };
};

const rgb2hsv = function (red, green, blue) {
  let h, s, v;

  let max = Math.max.apply(null, [red, green, blue]);
  let min = Math.min.apply(null, [red, green, blue]);

  v = max;
  s = max === 0 ? 0 : max - min;

  let diff = max - min;

  if (max === min) {
    h = 0;
  } else if (min === blue) {
    h = 60 * (green - red) / diff + 60;
  } else if (min === red) {
    h = 60 * (blue - green) / diff + 180;
  } else if (min === green) {
    h = 60 * (red - blue) / diff + 300;
  }

  let hue = h <= 360 ? Math.floor(h) : Math.floor(h % 360);
  let saturation = Math.floor(s * 100);
  let value = Math.floor(v * 100);

  return { h:hue, s:saturation, v:value };
};

const hsv2rgb = function (h, s, v) {
  s = s/100;
  v = v/100;

  if (s === 0.0) {
    return [v/100*255, v/100*255, v/100*255]
  }
  let c = v * s;
  let _h = h / 60;
  let x = c * (1 - Math.abs(_h % 2 - 1));

  let phd = parseInt(_h, 10);
  let rgb = [0, 0, 0];
  let diff = v - c;
  if (h == null) {
    let val = parseInt((diff*1) * 255, 10);
    return [val, val, val];
  }
  switch(phd) {
    case 0:
      rgb[0] = c + diff*1;
      rgb[1] = x + diff*1;
      rgb[2] = diff*1;
      break;
    case 1:
      rgb[0] = x + diff*1;
      rgb[1] = c + diff*1;
      rgb[2] = diff*1;
      break;
    case 2:
      rgb[0] = diff*1;
      rgb[1] = c + diff*1;
      rgb[2] = x + diff*1;
      break;
    case 3:
      rgb[0] = diff*1;
      rgb[1] = x + diff*1;
      rgb[2] = c + diff*1;
      break;
    case 4:
      rgb[0] = x + diff*1;
      rgb[1] = diff*1;
      rgb[2] = c + diff*1;
      break;
    case 5:
      rgb[0] = c + diff*1;
      rgb[1] = diff*1;
      rgb[2] = x + diff*1;
      break;
  }


  let red = rgb[0]*255;
  let green = rgb[1]*255;
  let blue = rgb[2]*255;

  return { r:red, g:green, b:blue };
};

const rgb2rgbw = function (Ri, Gi, Bi) {
  tM = Math.max(Ri, Math.max(Gi, Bi));

  //If the maximum value is 0, immediately return pure black.
  if(tM == 0)
    return { r:0, g:0, b:0, w:0 };

  //This section serves to figure out what the color with 100% hue is
  multiplier = 255.0 / tM;
  hR = Ri * multiplier;
  hG = Gi * multiplier;
  hB = Bi * multiplier;

  //This calculates the Whiteness (not strictly speaking Luminance) of the color
  M = Math.max(hR, Math.max(hG, hB));
  m = Math.min(hR, Math.min(hG, hB));
  Luminance = ((M + m) / 2.0 - 127.5) * (255.0/127.5) / multiplier;

  //Calculate the output values
  Wo = Luminance;
  Bo = Bi - Luminance;
  Ro = Ri - Luminance;
  Go = Gi - Luminance;

  //Trim them so that they are all between 0 and 255
  Ro = Math.max(0, Ro);
  Go = Math.max(0, Go);
  Bo = Math.max(0, Bo);
  Wo = Math.max(0, Wo);

  Ro = Math.min(255, Ro);
  Go = Math.min(255, Go);
  Bo = Math.min(255, Bo);
  Wo = Math.min(255, Wo);


  return { r:Ro, g:Go, b:Bo, w:Wo };
};

const rgbw2rgb = function (Ri, Gi, Bi, Wi) {
  Ro = Math.min(255, Ri + Wi);
  Go = Math.min(255, Gi + Wi);
  Bo = Math.min(255, Bi + Wi);
  Wo = Math.min(255, Wi + Wi);

  return { r:Ro, g:Go, b:Bo };
}

const rgbw2hsv = function (r, g, b, w) {
  if ( w == null ) return rgb2hsv(r, g, b);

  rgb = rgbw2rgb(r, g, b, w);
  return rgb2hsv(rgb.r, rgb.g, rgb.b);
};
