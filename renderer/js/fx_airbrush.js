/* fx_airbrush.js — vintage airbrush: soft carnival-art blends (heavy smoothing),
   pastel lift, rainbow mist, soft dark outlines from edges, bloom, grain. */

// foliage mist color stops — deep shadow -> mid leaf -> yellow-green highlight -> brown accent
const AIR_FOLIAGE_STOPS = [
  [40, 60, 24],
  [74, 110, 40],
  [150, 160, 60],
  [110, 80, 40]
];
function airFoliageColor(nz) {
  const n = Math.max(0, Math.min(1, nz)) * (AIR_FOLIAGE_STOPS.length - 1);
  const i0 = Math.floor(n), i1 = Math.min(i0 + 1, AIR_FOLIAGE_STOPS.length - 1), f = n - i0;
  const a = AIR_FOLIAGE_STOPS[i0], b = AIR_FOLIAGE_STOPS[i1];
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}

window.FXAir = {
  defaults: {
    smoothness: 8,     // blur radius for the soft body
    blend: 0.85,       // how much smoothed image replaces source
    pastel: 0.35,      // lightness lift toward pastel
    saturation: 0.45,
    mistMode: 'iridescent', // iridescent | foliage
    rainbow: 0.25,     // mist amount
    rainbowScale: 2.2, // mist spatial scale
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
    { type: 'select', key: 'mistMode', label: 'Mist style', options: [{ v: 'iridescent', l: 'Iridescent' }, { v: 'foliage', l: 'Foliage' }] },
    { type: 'range', key: 'rainbow', label: 'Mist amount', min: 0, max: 1, step: 0.02 },
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

    const needsEdge = p.outline > 0 || (p.mistMode === 'iridescent' && p.rainbow > 0);
    // edge field from blurred luma (soft dark outlines, and iridescent mist phase)
    let edge = null;
    if (needsEdge) {
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

    // blotchy low-frequency noise field for the foliage mist mode
    let foliageField = null;
    if (p.mistMode === 'foliage' && p.rainbow > 0) {
      const raw = new Float32Array(n);
      const frng = mulberry32(99);
      for (let k = 0; k < n; k++) raw[k] = frng();
      foliageField = blurField(raw, w, h, Math.max(1, Math.round(p.rainbowScale * 8)));
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

      // mist: iridescent (edge/highlight-driven thin-film sheen) or foliage (blotchy organic tint)
      if (p.rainbow > 0) {
        if (p.mistMode === 'iridescent') {
          const e = edge ? edge[j] : 0;
          const t = (e * 3 + l / 255) * Math.PI * p.rainbowScale;
          const mr = 128 + 90 * Math.sin(t);
          const mg = 128 + 90 * Math.sin(t + 2.094);
          const mb = 128 + 90 * Math.sin(t + 4.188);
          const amt = p.rainbow * 0.6 * (0.25 + e * 1.5);
          r = r + (mr - 128) * amt;
          g = g + (mg - 128) * amt;
          b = b + (mb - 128) * amt;
        } else {
          const nz = foliageField ? foliageField[j] : 0.5;
          const [tr, tg, tb] = airFoliageColor(nz);
          const amt = p.rainbow * 0.55;
          r = r * (1 - amt) + tr * amt;
          g = g * (1 - amt) + tg * amt;
          b = b * (1 - amt) + tb * amt;
        }
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
