/* fx_trails.js — motion trails: accumulates bright highlights over frames with
   per-frame dimming, directional drift and shake, then blends the trail buffer
   back over the source. Temporal — feeds off consecutive frames. */

window.FXTrails = {
  defaults: {
    threshold: 0.6,    // highlight cutoff
    knee: 0.15,        // soft knee below threshold
    fade: 0.9,         // per-frame trail retention
    driftX: 0, driftY: 0,
    shake: 0,
    intensity: 0.9,
    sourceDim: 0,
    blend: 'add'       // add|screen|overlay|softlight|hardlight|colordodge|lighten
  },
  schema: [
    { type: 'range', key: 'threshold', label: 'Threshold', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'knee', label: 'Knee', min: 0, max: 0.5, step: 0.01 },
    { type: 'range', key: 'fade', label: 'Trail fade', min: 0.5, max: 0.995, step: 0.005 },
    { type: 'range', key: 'driftX', label: 'Drift X', min: -12, max: 12, step: 0.5 },
    { type: 'range', key: 'driftY', label: 'Drift Y', min: -12, max: 12, step: 0.5 },
    { type: 'range', key: 'shake', label: 'Shake', min: 0, max: 12, step: 0.5 },
    { type: 'range', key: 'intensity', label: 'Intensity', min: 0, max: 2, step: 0.05 },
    { type: 'range', key: 'sourceDim', label: 'Source dim', min: 0, max: 1, step: 0.02 },
    {
      type: 'select', key: 'blend', label: 'Blend', options: [
        'add', 'screen', 'overlay', 'softlight', 'hardlight', 'colordodge', 'lighten'
      ]
    }
  ],

  _buf: null, _bw: 0, _bh: 0,
  reset() { this._buf = null; },

  apply(id, p, meta) {
    const w = id.width, h = id.height, d = id.data;
    const n = w * h;
    if (meta && meta.reset) this._buf = null;
    if (!this._buf || this._bw !== w || this._bh !== h) {
      this._buf = { r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n) };
      this._bw = w; this._bh = h;
    }
    const buf = this._buf;

    // 1. dim + drift the existing buffer
    const rng = mulberry32(((meta && meta.frame) || 0) + 1);
    const dx = p.driftX + (rng() - 0.5) * 2 * p.shake;
    const dy = p.driftY + (rng() - 0.5) * 2 * p.shake;
    if (dx !== 0 || dy !== 0) {
      const sr = buf.r.slice(), sg = buf.g.slice(), sb = buf.b.slice();
      const ix = Math.round(dx), iy = Math.round(dy);
      for (let y = 0; y < h; y++) {
        const sy = y - iy;
        for (let x = 0; x < w; x++) {
          const sx = x - ix;
          const j = y * w + x;
          if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
            const s = sy * w + sx;
            buf.r[j] = sr[s] * p.fade; buf.g[j] = sg[s] * p.fade; buf.b[j] = sb[s] * p.fade;
          } else { buf.r[j] = 0; buf.g[j] = 0; buf.b[j] = 0; }
        }
      }
    } else {
      for (let j = 0; j < n; j++) { buf.r[j] *= p.fade; buf.g[j] *= p.fade; buf.b[j] *= p.fade; }
    }

    // 2. add current highlights into the buffer, 3. composite back
    const th = p.threshold * 255, kn = Math.max(1, p.knee * 255);
    for (let j = 0, i = 0; j < n; j++, i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const l = r * 0.2126 + g * 0.7152 + b * 0.0722;
      let m = 0;
      if (l > th) m = 1;
      else if (l > th - kn) m = (l - (th - kn)) / kn;
      if (m > 0) {
        buf.r[j] = Math.max(buf.r[j], r * m);
        buf.g[j] = Math.max(buf.g[j], g * m);
        buf.b[j] = Math.max(buf.b[j], b * m);
      }

      const dim = 1 - p.sourceDim;
      let br = r * dim, bg = g * dim, bb = b * dim;
      const tr = buf.r[j] * p.intensity, tg = buf.g[j] * p.intensity, tb = buf.b[j] * p.intensity;
      d[i] = blendPx(br, tr, p.blend); d[i + 1] = blendPx(bg, tg, p.blend); d[i + 2] = blendPx(bb, tb, p.blend);
    }
    return id;

    function blendPx(base, top, mode) {
      let v;
      const B = base / 255, T = Math.min(top, 255) / 255;
      switch (mode) {
        case 'screen': v = 1 - (1 - B) * (1 - T); break;
        case 'overlay': v = B < 0.5 ? 2 * B * T : 1 - 2 * (1 - B) * (1 - T); break;
        case 'softlight': v = (1 - 2 * T) * B * B + 2 * T * B; break;
        case 'hardlight': v = T < 0.5 ? 2 * B * T : 1 - 2 * (1 - B) * (1 - T); break;
        case 'colordodge': v = T >= 1 ? 1 : Math.min(1, B / (1 - T)); break;
        case 'lighten': v = Math.max(B, T); break;
        default: v = B + T; // add
      }
      return clamp(v * 255, 0, 255);
    }
  }
};
