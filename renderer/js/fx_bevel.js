/* fx_bevel.js — bevel & emboss from image luminance.
   Builds a height field from luma, lights it with a directional lamp,
   and shades either flat (matte relief) or through a metal/chrome fold curve. */

window.FXBevel = {
  defaults: {
    depth: 4,          // gradient strength
    smoothing: 3,      // height-field blur radius
    angle: 135,        // light azimuth degrees
    altitude: 45,      // light altitude degrees
    style: 'flat',     // flat | metal | chrome
    folds: 3,          // metal curve folds
    output: 'shaded',  // shaded | emboss | overlay
    invert: false
  },

  schema: [
    { type: 'range', key: 'depth', label: 'Depth', min: 0.5, max: 20, step: 0.5 },
    { type: 'range', key: 'smoothing', label: 'Smoothing', min: 0, max: 20, step: 1 },
    { type: 'range', key: 'angle', label: 'Light angle', min: 0, max: 360, step: 1 },
    { type: 'range', key: 'altitude', label: 'Altitude', min: 5, max: 85, step: 1 },
    {
      type: 'select', key: 'style', label: 'Surface',
      options: [{ v: 'flat', l: 'Flat / matte' }, { v: 'metal', l: 'Metal' }, { v: 'chrome', l: 'Chrome' }]
    },
    { type: 'range', key: 'folds', label: 'Metal folds', min: 1, max: 8, step: 1 },
    {
      type: 'select', key: 'output', label: 'Output',
      options: [{ v: 'shaded', l: 'Shaded image' }, { v: 'emboss', l: 'Emboss only' }, { v: 'overlay', l: 'Overlay blend' }]
    },
    { type: 'check', key: 'invert', label: 'Invert height' }
  ],

  apply(imgData, p) {
    const w = imgData.width, h = imgData.height;
    const d = imgData.data;

    let height = new Float32Array(w * h);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      height[j] = lumaOf(d[i], d[i + 1], d[i + 2]) / 255;
    }
    if (p.invert) for (let j = 0; j < height.length; j++) height[j] = 1 - height[j];
    if (p.smoothing > 0) height = blurField(height, w, h, p.smoothing);

    const az = p.angle * Math.PI / 180;
    const alt = p.altitude * Math.PI / 180;
    const lx = Math.cos(az) * Math.cos(alt);
    const ly = -Math.sin(az) * Math.cos(alt); // canvas y is down
    const lz = Math.sin(alt);
    const depth = p.depth;

    const metalCurve = (s) => {
      // fold the shading through sine bands -> banded specular metal look
      const t = Math.abs(Math.sin(s * Math.PI * p.folds));
      return Math.pow(t, 0.7);
    };
    const chromeCurve = (s) => {
      const t = Math.abs(Math.sin(s * Math.PI * p.folds * 1.5 + Math.cos(s * 7)));
      return clamp(Math.pow(t, 0.5) * 1.2 - 0.1, 0, 1);
    };

    const out = new ImageData(w, h);
    const o = out.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const j = y * w + x;
        const xl = height[y * w + Math.max(x - 1, 0)];
        const xr = height[y * w + Math.min(x + 1, w - 1)];
        const yu = height[Math.max(y - 1, 0) * w + x];
        const yd = height[Math.min(y + 1, h - 1) * w + x];
        let nx = (xl - xr) * depth;
        let ny = (yu - yd) * depth;
        let nz = 1;
        const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx *= invLen; ny *= invLen; nz *= invLen;
        let s = clamp(nx * lx + ny * ly + nz * lz, 0, 1);

        if (p.style === 'metal') s = metalCurve(s);
        else if (p.style === 'chrome') s = chromeCurve(s);

        const i = j * 4;
        if (p.output === 'emboss') {
          const v = s * 255;
          o[i] = o[i + 1] = o[i + 2] = v;
        } else if (p.output === 'overlay') {
          // overlay blend: shade against mid-gray
          for (let c = 0; c < 3; c++) {
            const b = d[i + c] / 255;
            const g = s;
            const v = g < 0.5 ? 2 * b * g : 1 - 2 * (1 - b) * (1 - g);
            o[i + c] = clamp(v * 255, 0, 255);
          }
        } else {
          const k = p.style === 'flat' ? 0.35 + 0.65 * s : 0.15 + 0.85 * s;
          o[i] = clamp(d[i] * k * (p.style !== 'flat' ? 1.15 : 1), 0, 255);
          o[i + 1] = clamp(d[i + 1] * k * (p.style !== 'flat' ? 1.15 : 1), 0, 255);
          o[i + 2] = clamp(d[i + 2] * k * (p.style !== 'flat' ? 1.15 : 1), 0, 255);
        }
        o[i + 3] = d[i + 3];
      }
    }
    return out;
  }
};
