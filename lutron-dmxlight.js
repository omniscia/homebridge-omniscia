const inherits = require('util').inherits;
let Service, Characteristic;
const LutronAccessory = require('./lutron-accessory')();

'use strict';

module.exports = function(exportedTypes) {
  if (exportedTypes && !Service) {
    Service = exportedTypes.Service;
    Characteristic = exportedTypes.Characteristic;

    const acc = LutronDmxLight.prototype;
    inherits(LutronDmxLight, LutronAccessory);
    LutronDmxLight.prototype.parent = LutronAccessory.prototype;
    for (const mn in acc) LutronDmxLight.prototype[mn] = acc[mn];
  }
  return LutronDmxLight;
};

function LutronDmxLight(log, config) {
    if (!this.deviceData) this.deviceData = { }
    if (!this.homekitData) this.homekitData = { }

    this.homekitData.isOn = true;
    this.homekitData.hue        = config['hue'] || 0;
    this.homekitData.saturation = config['saturation'] || 0;
    this.homekitData.brightness = config['brightness'] || 100;

    this.deviceData.r = 0;
    this.deviceData.g = 0;
    this.deviceData.b = 0;
    this.deviceData.w = 0;

    this.rId = config['rId'];
    this.gId = config['gId'];
    this.bId = config['bId'];
    this.wId = config['wId'] || false;

    lightbulbService = new Service.Lightbulb();

    LutronAccessory.call(this, log, config,
        [ lightbulbService ]
    );

    this.bindCharacteristic(lightbulbService, Characteristic.On, getOn.bind(this), setOn.bind(this), "On");
    this.bindCharacteristic(lightbulbService, Characteristic.Brightness, getBrightness.bind(this), setBrightness.bind(this), "Brightness");
    this.bindCharacteristic(lightbulbService, Characteristic.Saturation, getSaturation.bind(this), setSaturation.bind(this), "Saturation");
    this.bindCharacteristic(lightbulbService, Characteristic.Hue, getHue.bind(this), setHue.bind(this), "Hue",)

    this.refreshDataFromDevice();
}

LutronDmxLight.prototype.readFromDevice = function(id)      { this.sendCommand('?OUTPUT,' + id + ',17'       ); };
LutronDmxLight.prototype.writeToDevice  = function(id, val) { this.sendCommand('#OUTPUT,' + id + ',17,' + val); };
const DEVICE_RGBW_MAX = 65279;

LutronDmxLight.prototype.lastRefreshTime = 0;
LutronDmxLight.prototype.refreshDataFromDevice = function () {
    if (Date.now() - this.lastRefreshTime > 1000)
        this.lastRefreshTime = Date.now();
    else return;

    this.readFromDevice(this.rId);
    this.readFromDevice(this.gId);
    this.readFromDevice(this.bId);
    if (this.wId)
        this.readFromDevice(this.wId);
}

LutronAccessory.prototype.writeDataToDevice = function () {
    colors = hsv2rgb(this.homekitData.hue, this.homekitData.saturation, this.homekitData.isOn?this.homekitData.brightness:0);
    if (this.wID)
        colors = rgb2rgbw(colors.r, colors.g, colors.b);

    this.log.warn("WRITING>>"+JSON.stringify(this.homekitData));
    this.log.warn("WRITING>>",Math.round(colors.r/255*DEVICE_RGBW_MAX), Math.round(colors.g/255*DEVICE_RGBW_MAX), Math.round(colors.b/255*DEVICE_RGBW_MAX), Math.round(colors.w/255*DEVICE_RGBW_MAX));

    this.writeToDevice(this.rId, Math.round(colors.r/255*DEVICE_RGBW_MAX));
    this.writeToDevice(this.gId, Math.round(colors.g/255*DEVICE_RGBW_MAX));
    this.writeToDevice(this.bId, Math.round(colors.b/255*DEVICE_RGBW_MAX));
    if (this.wId)
        this.writeToDevice(this.wId, Math.round(colors.w/255*DEVICE_RGBW_MAX));
}

LutronAccessory.prototype.outputEventHandler = function(integrationId, actionId, ...parameters) {
    if ( integrationId != this.rId && integrationId != this.gId && integrationId != this.bId && integrationId != this.wId ) return;

    this.log.debug('OUTPUT::' + integrationId + '>>' + actionId + '::' + parameters + '<<');

    switch(actionId) {
    case "17":
        if ( integrationId == this.rId) { this.deviceData.r = parseInt(parameters[0]); }
        if ( integrationId == this.gId) { this.deviceData.g = parseInt(parameters[0]); }
        if ( integrationId == this.bId) { this.deviceData.b = parseInt(parameters[0]); } 
        if ( integrationId == this.wId) { this.deviceData.w = parseInt(parameters[0]); }
        break;
    }

    this.log.debug('OUTPUT::' + JSON.stringify(this.deviceData));
}

const getOn         = function() { return rgb2hsv(this.deviceData.r/DEVICE_RGBW_MAX, this.deviceData.g/DEVICE_RGBW_MAX, this.deviceData.b/DEVICE_RGBW_MAX).v > 0; }
const getBrightness = function() { return rgb2hsv(this.deviceData.r/DEVICE_RGBW_MAX, this.deviceData.g/DEVICE_RGBW_MAX, this.deviceData.b/DEVICE_RGBW_MAX).v; };
const getSaturation = function() { return rgb2hsv(this.deviceData.r/DEVICE_RGBW_MAX, this.deviceData.g/DEVICE_RGBW_MAX, this.deviceData.b/DEVICE_RGBW_MAX).s; };
const getHue        = function() { return rgb2hsv(this.deviceData.r/DEVICE_RGBW_MAX, this.deviceData.g/DEVICE_RGBW_MAX, this.deviceData.b/DEVICE_RGBW_MAX).h; };

const setOn         = function(val) { this.homekitData.isOn                                     = val; this.writeDataToDevice(); };
const setBrightness = function(val) { this.homekitData.isOn = true; this.homekitData.brightness = val; this.writeDataToDevice(); };
const setSaturation = function(val) { this.homekitData.isOn = true; this.homekitData.saturation = val; this.writeDataToDevice(); };
const setHue        = function(val) { this.homekitData.isOn = true; this.homekitData.hue        = val; this.writeDataToDevice(); };

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
}

const rgb2rgbw = function (Ri, Gi, Bi) {
  tM = Math.Max(Ri, Math.max(Gi, Bi));

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
  if (Wo < 0) Wo = 0;
  if (Bo < 0) Bo = 0;
  if (Ro < 0) Ro = 0;
  if (Go < 0) Go = 0;
  if (Wo > 255) Wo = 255;
  if (Bo > 255) Bo = 255;
  if (Ro > 255) Ro = 255;
  if (Go > 255) Go = 255;

  return { r:Ro, g:Go, b:Bo, w:Wo };
}
