/* fx_noisegrain.js — Animated Grain: film-style animated noise built on the
   bundled real noise plates. Every frame samples the plate at a new offset so
   the grain crawls like film. (Independent implementation — the Fast Grain
   .aex is an After Effects plugin binary and can only run inside AE.) */

window.FXNoise = {
  defaults: {
    amount: 0.35,
    size: 1,          // plate scale
    speed: 12,        // reshuffles per second
    plate: 1,
    colored: false,
    blend: 'grain',   // grain (add-centered) | overlay | softlight | screen
    flicker: 0.1,
    shadows: 1,       // grain visibility in shadows
    highlights: 0.7,  // grain visibility in highlights
    chunky: 0         // posterize the grain for digital crunch
  },
  schema: [
    { type: 'range', key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'size', label: 'Grain size', min: 0.3, max: 4, step: 0.05 },
    { type: 'range', key: 'speed', label: 'Anim speed', min: 0, max: 30, step: 1 },
    { type: 'range', key: 'plate', label: 'Noise plate', min: 1, max: 4, step: 1 },
    { type: 'check', key: 'colored', label: 'RGB grain' },
    {
      type: 'select', key: 'blend', label: 'Blend', options: [
        { v: 'grain', l: 'Grain merge' }, { v: 'overlay', l: 'Overlay' },
        { v: 'softlight', l: 'Soft light' }, { v: 'screen', l: 'Screen' }
      ]
    },
    { type: 'range', key: 'flicker', label: 'Flicker', min: 0, max: 0.6, step: 0.02 },
    { type: 'range', key: 'shadows', label: 'In shadows', min: 0, max: 1, step: 0.05 },
    { type: 'range', key: 'highlights', label: 'In highlights', min: 0, max: 1, step: 0.05 },
    { type: 'range', key: 'chunky', label: 'Chunky', min: 0, max: 1, step: 0.05 }
  ],
  apply(id, p, meta) {
    const w = id.width, h = id.height, d = id.data;
    const txw = 720, txh = 720;
    const tex = TexLib.field('noise-' + Math.round(p.plate), txw, txh);
    if (!tex) return id;

    // frame-hash offsets so the grain re-seeds over time
    const t = meta ? (meta.time || 0) : 0;
    const fIdx = meta && meta.frame !== undefined ? meta.frame : 0;
    const tick = p.speed > 0 ? Math.floor((t || fIdx / 30) * p.speed) : 0;
    const rr = mulberry32(tick * 7919 + 13);
    const ox = [Math.floor(rr() * txw), Math.floor(rr() * txw), Math.floor(rr() * txw)];
    const oy = [Math.floor(rr() * txh), Math.floor(rr() * txh), Math.floor(rr() * txh)];
    const amp = p.amount * (1 + (rr() - 0.5) * 2 * p.flicker) * 190;
    const inv = 1 / Math.max(0.05, p.size);
    const levels = p.chunky > 0 ? Math.max(2, Math.round(8 - p.chunky * 6)) : 0;

    for (let y = 0; y < h; y++) {
      const ty = Math.floor(y * inv);
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const tx = Math.floor(x * inv);
        const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255;
        const vis = lerp(p.shadows, p.highlights, l);
        if (vis <= 0) continue;

        for (let c = 0; c < 3; c++) {
          const k = p.colored ? c : 0;
          let n = tex[((ty + oy[k]) % txh) * txw + ((tx + ox[k]) % txw)] - 0.5;
          if (levels) n = Math.round(n * levels) / levels;
          const g = n * amp * vis;
          const B = d[i + c];
          let v;
          if (p.blend === 'overlay') {
            const T = clamp(0.5 + g / 255, 0, 1), Bn = B / 255;
            v = (Bn < 0.5 ? 2 * Bn * T : 1 - 2 * (1 - Bn) * (1 - T)) * 255;
          } else if (p.blend === 'softlight') {
            const T = clamp(0.5 + g / 255, 0, 1), Bn = B / 255;
            v = ((1 - 2 * T) * Bn * Bn + 2 * T * Bn) * 255;
          } else if (p.blend === 'screen') {
            v = 255 - (255 - B) * (255 - Math.max(0, g * 1.4)) / 255;
          } else {
            v = B + g; // grain merge
          }
          d[i + c] = clamp(v, 0, 255);
          if (!p.colored && c === 0) { // reuse for g/b, faster + mono
            d[i + 1] = clamp(d[i + 1] + (v - B), 0, 255);
            d[i + 2] = clamp(d[i + 2] + (v - B), 0, 255);
            break;
          }
        }
      }
    }
    return id;
  }
};
