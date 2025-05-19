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
        let colors;
        if (this.wId)
            colors = hsv2rgbw(this.homekitData.hue, this.homekitData.saturation, this.homekitData.isOn?this.homekitData.brightness:0);
        else
            colors = hsv2rgb (this.homekitData.hue, this.homekitData.saturation, this.homekitData.isOn?this.homekitData.brightness:0);

        this.log.warn("WRITING>>"+JSON.stringify(this.homekitData));
        this.log.warn("WRITING>>",JSON.stringify(colors));

        this.deviceConnection.setDmxLevel(this.rId, Math.round(colors.r/255*DEVICE_RGBW_MAX));
        this.deviceConnection.setDmxLevel(this.gId, Math.round(colors.g/255*DEVICE_RGBW_MAX));
        this.deviceConnection.setDmxLevel(this.bId, Math.round(colors.b/255*DEVICE_RGBW_MAX));
        if (this.wId)
            this.deviceConnection.setDmxLevel(this.wId, Math.round(colors.w/255*DEVICE_RGBW_MAX));
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

const hsi2rgbw = function (H, S, I) {
	let rgbw = {}, cos_h, cos_1047_h;

	H = H % 360;
	H = Math.PI * H / 180;

        S = S / 100.0;
        I = I / 100.0;

	S = S > 0 ? (S < 1 ? S : 1) : 0;
	I = I > 0 ? (I < 1 ? I : 1) : 0;

	if(H < 2.09439) {
	    cos_h = Math.cos(H);
	    cos_1047_h = Math.cos(1.047196667 - H);
	    rgbw.r = S * 255 * I / 3 * (1 + cos_h / cos_1047_h);
	    rgbw.g = S * 255 * I / 3 * (1 + (1 - cos_h / cos_1047_h));
	    rgbw.b = 0;
	    rgbw.w = 255 * (1 - S) * I;
	} else if(H < 4.188787) {
	    H = H - 2.09439;
	    cos_h = Math.cos(H);
	    cos_1047_h = Math.cos(1.047196667 - H);
	    rgbw.r = 0;
	    rgbw.g = S * 255 * I / 3 * (1 + cos_h / cos_1047_h);
	    rgbw.b = S * 255 * I / 3 * (1 + (1 - cos_h / cos_1047_h));
	    rgbw.w = 255 * (1 - S) * I;
	} else {
	    H = H - 4.188787;
	    cos_h = Math.cos(H);
	    cos_1047_h = Math.cos(1.047196667 - H);
	    rgbw.r = S * 255 * I / 3 * (1 + (1 - cos_h / cos_1047_h));
	    rgbw.g = 0;
	    rgbw.b = S * 255 * I / 3 * (1 + cos_h / cos_1047_h);
	    rgbw.w = 255 * (1 - S) * I;
	}

	rgbw.r = +rgbw.r.toFixed(0);
	rgbw.g = +rgbw.g.toFixed(0);
	rgbw.b = +rgbw.b.toFixed(0);
	rgbw.w = +rgbw.w.toFixed(0);

	return {r: rgbw.r, g: rgbw.g, b: rgbw.b, w: rgbw.w};
};

const hsv2rgbw = function (h, s, v) {
    v = v / 100.0;

    let r, g, b, w;
    let C, Z = 0;
/*
    if ( s >= 50 ) {
        C = 100 * v;
        w = v * (200 - 2*s);
    } else {
        C = 2 * s * v;
        w = v * 100;
    }
*/
    C = s * v;
    w = v * 100 - C;

    if ( h < 60 ) {
        r = C;
        g = C * h / 60;
        b = Z;
    } else if ( h < 120 ) {
        h = 120 - h;
        r = C * h / 60;
        g = C;
        b = Z;
    } else if ( h < 180 ) {
        h -= 120;
        r = Z;
        g = C;
        b = C * h / 60;
    } else if ( h < 240 ) {
        h = 240 - h;
        r = Z;
        g = C * h / 60;
        b = C;
    } else if ( h < 300 ) {
        h -= 240;
        r = C * h / 60;
        g = Z;
        b = C;
    } else {
        h = 360 - h;
        r = C;
        g = Z;
        b = C * h / 60;
    }

    return {r: 2.55*r, g: 2.55*g, b: 2.55*b, w: 2.55*w};
};


const hsv2rgb = function (h, s, v) {
  s = s/100;
  v = v/100;

  if (s == 0) {
    return {r:v*255, g:v*255, b:v*255};
  }
  let c = v * s;
  let _h = h / 60;
  let x = c * (1 - Math.abs(_h % 2 - 1));

  let phd = parseInt(_h, 10);
  let rgb = [0, 0, 0];
  let diff = v - c;
  if (h == null) {
    let val = (diff*1) * 255;
    return { r:val, g:val, b:val};
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

const rgbw2rgb = function (Ri, Gi, Bi, Wi) {
  const Ro = Math.min(255, Ri + Wi);
  const Go = Math.min(255, Gi + Wi);
  const Bo = Math.min(255, Bi + Wi);

  return { r: Ro, g: Go, b: Bo };
}

const rgbw2hsv = function (r, g, b, w) {
  const rgb = w == null ? { r, g, b } : rgbw2rgb(r, g, b, w);

  return rgb2hsv(rgb.r, rgb.g, rgb.b);
};
