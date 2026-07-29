/* fx_airbrush.js — vintage airbrush: soft carnival-art blends (heavy smoothing),
   pastel lift, rainbow mist, soft dark outlines from edges, bloom, grain. */

window.FXAir = {
  defaults: {
    smoothness: 8,     // blur radius for the soft body
    blend: 0.85,       // how much smoothed image replaces source
    pastel: 0.35,      // lightness lift toward pastel
    saturation: 0.45,
    rainbow: 0.25,     // rainbow mist amount
    rainbowScale: 2.2, // cycles across frame
    outline: 0.55,     // dark edge strength
    outlineSoft: 2,    // edge blur radius
    glow: 0.35,        // highlight bloom
    grain: 0.08
  },
  schema: [
    { type: 'range', key: 'smoothness', label: 'Smoothness', min: 0, max: 30, step: 1 },
    { type: 'range', key: 'blend', label: 'Soft blend', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'pastel', label: 'Pastel lift', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'saturation', label: 'Saturation', min: -0.5, max: 1.5, step: 0.02 },
    { type: 'range', key: 'rainbow', label: 'Rainbow mist', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'rainbowScale', label: 'Mist scale', min: 0.5, max: 6, step: 0.1 },
    { type: 'range', key: 'outline', label: 'Dark outline', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'outlineSoft', label: 'Outline soft', min: 0, max: 8, step: 0.5 },
    { type: 'range', key: 'glow', label: 'Highlight glow', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'grain', label: 'Airbrush grain', min: 0, max: 0.4, step: 0.01 }
  ],
  apply(id, p) {
    const w = id.width, h = id.height, d = id.data;
    const n = w * h;
    let R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
    for (let i = 0, j = 0; j < n; i += 4, j++) { R[j] = d[i]; G[j] = d[i + 1]; B[j] = d[i + 2]; }

    const rad = Math.round(p.smoothness);
    const Rb = rad > 0 ? blurField(R, w, h, rad) : R;
    const Gb = rad > 0 ? blurField(G, w, h, rad) : G;
    const Bb = rad > 0 ? blurField(B, w, h, rad) : B;

    // edge field from blurred luma (soft dark outlines)
    let edge = null;
    if (p.outline > 0) {
      const L = new Float32Array(n);
      for (let j = 0; j < n; j++) L[j] = (Rb[j] * 0.2126 + Gb[j] * 0.7152 + Bb[j] * 0.0722) / 255;
      edge = new Float32Array(n);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const j = y * w + x;
          const gx = L[j + 1] - L[j - 1], gy = L[j + w] - L[j - w];
          edge[j] = Math.min(1, Math.sqrt(gx * gx + gy * gy) * 4);
        }
      }
      if (p.outlineSoft > 0) edge = blurField(edge, w, h, Math.round(p.outlineSoft));
    }

    const rng = mulberry32(7);
    const sat = 1 + p.saturation;
    for (let j = 0, i = 0; j < n; j++, i += 4) {
      let r = R[j] * (1 - p.blend) + Rb[j] * p.blend;
      let g = G[j] * (1 - p.blend) + Gb[j] * p.blend;
      let b = B[j] * (1 - p.blend) + Bb[j] * p.blend;

      // pastel lift toward white
      r += (255 - r) * p.pastel * 0.5;
      g += (255 - g) * p.pastel * 0.5;
      b += (255 - b) * p.pastel * 0.5;

      // saturation
      const l = r * 0.2126 + g * 0.7152 + b * 0.0722;
      r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;

      // rainbow mist (smooth hue field, soft-light-ish)
      if (p.rainbow > 0) {
        const x = j % w, y = (j / w) | 0;
        const t = (x / w + y / h) * Math.PI * p.rainbowScale;
        const mr = 128 + 127 * Math.sin(t);
        const mg = 128 + 127 * Math.sin(t + 2.094);
        const mb = 128 + 127 * Math.sin(t + 4.188);
        r = r + (mr - 128) * p.rainbow * 0.7;
        g = g + (mg - 128) * p.rainbow * 0.7;
        b = b + (mb - 128) * p.rainbow * 0.7;
      }

      // glow on highlights
      if (p.glow > 0 && l > 170) {
        const k = (l - 170) / 85 * p.glow * 60;
        r += k; g += k; b += k;
      }

      // dark soft outline
      if (edge) {
        const e = edge[j] * p.outline;
        r *= 1 - e * 0.85; g *= 1 - e * 0.8; b *= 1 - e * 0.75;
      }

      if (p.grain > 0) {
        const gr = (rng() - 0.5) * p.grain * 90;
        r += gr; g += gr; b += gr;
      }
      d[i] = clamp(r, 0, 255); d[i + 1] = clamp(g, 0, 255); d[i + 2] = clamp(b, 0, 255);
    }
    return id;
  }
};
