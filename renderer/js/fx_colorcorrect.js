/* fx_colorcorrect.js — grade pass: exposure, contrast, sat, temp/tint, hue,
   shadows/highlights, vignette. Runs first in the stack. */

window.FXColor = {
  defaults: {
    exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0,
    hue: 0, shadows: 0, highlights: 0, vignette: 0, fade: 0
  },
  schema: [
    { type: 'range', key: 'exposure', label: 'Exposure', min: -1, max: 1, step: 0.02 },
    { type: 'range', key: 'contrast', label: 'Contrast', min: -1, max: 1, step: 0.02 },
    { type: 'range', key: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.02 },
    { type: 'range', key: 'temperature', label: 'Temperature', min: -1, max: 1, step: 0.02 },
    { type: 'range', key: 'tint', label: 'Tint', min: -1, max: 1, step: 0.02 },
    { type: 'range', key: 'hue', label: 'Hue shift °', min: -180, max: 180, step: 1 },
    { type: 'range', key: 'shadows', label: 'Shadows', min: -1, max: 1, step: 0.02 },
    { type: 'range', key: 'highlights', label: 'Highlights', min: -1, max: 1, step: 0.02 },
    { type: 'range', key: 'vignette', label: 'Vignette', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'fade', label: 'Fade (lift)', min: 0, max: 1, step: 0.02 }
  ],
  apply(id, p) {
    const d = id.data, w = id.width, h = id.height;
    const exp = Math.pow(2, p.exposure);
    const con = Math.tan((clamp(p.contrast, -0.99, 0.99) + 1) * Math.PI / 4);
    const hueR = p.hue * Math.PI / 180;
    const cosH = Math.cos(hueR), sinH = Math.sin(hueR);
    const cx = w / 2, cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
        // exposure + temp/tint
        r *= exp * (1 + p.temperature * 0.3);
        b *= exp * (1 - p.temperature * 0.3);
        g *= exp * (1 + p.tint * 0.25);
        // hue rotate (YIQ approximation)
        if (p.hue !== 0) {
          const Y = 0.299 * r + 0.587 * g + 0.114 * b;
          const I = 0.596 * r - 0.274 * g - 0.322 * b;
          const Q = 0.211 * r - 0.523 * g + 0.312 * b;
          const I2 = I * cosH - Q * sinH, Q2 = I * sinH + Q * cosH;
          r = Y + 0.956 * I2 + 0.621 * Q2;
          g = Y - 0.272 * I2 - 0.647 * Q2;
          b = Y - 1.106 * I2 + 1.703 * Q2;
        }
        // shadows / highlights
        let l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const shW = Math.pow(1 - clamp(l, 0, 1), 2) * p.shadows * 0.6;
        const hiW = Math.pow(clamp(l, 0, 1), 2) * p.highlights * 0.6;
        r += shW + hiW; g += shW + hiW; b += shW + hiW;
        // contrast around 0.5, then fade lift
        r = (r - 0.5) * con + 0.5; g = (g - 0.5) * con + 0.5; b = (b - 0.5) * con + 0.5;
        if (p.fade > 0) { const lift = p.fade * 0.18; r = r * (1 - lift) + lift; g = g * (1 - lift) + lift; b = b * (1 - lift) + lift; }
        // saturation
        if (p.saturation !== 0) {
          l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const s = 1 + p.saturation;
          r = l + (r - l) * s; g = l + (g - l) * s; b = l + (b - l) * s;
        }
        // vignette
        if (p.vignette > 0) {
          const dx = x - cx, dy = y - cy;
          const v = 1 - p.vignette * Math.pow(Math.sqrt(dx * dx + dy * dy) / maxR, 2.2);
          r *= v; g *= v; b *= v;
        }
        d[i] = clamp(r * 255, 0, 255); d[i + 1] = clamp(g * 255, 0, 255); d[i + 2] = clamp(b * 255, 0, 255);
      }
    }
    return id;
  }
};
