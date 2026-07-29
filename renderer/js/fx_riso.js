/* fx_riso.js — risograph print emulation: tone split into up to 4 ink channels
   with measured GT72-style spot colors, real scanned grain plates, per-channel
   registration drift, subtractive overprint compositing. */

(function () {
  // 35 curated spot inks (approx GT72 swatches)
  window.RISO_INKS = {
    'Black': '#000000', 'Burgundy': '#914e72', 'Crimson': '#e45d50', 'Scarlet': '#f65058',
    'Red': '#ff665e', 'Bright Red': '#f15060', 'Orange': '#ff6c2f', 'Sunflower': '#ffb511',
    'Yellow': '#ffe800', 'Ivy': '#169b62', 'Green': '#00a95c', 'Emerald': '#19975d',
    'Kelly Green': '#67b346', 'Mint': '#82d8d5', 'Teal': '#00838a', 'Blue': '#0078bf',
    'Medium Blue': '#3255a4', 'Cobalt': '#1d4e89', 'Sky Blue': '#4982cf', 'Aqua': '#5ec8e5',
    'Cornflower': '#62a8e5', 'Purple': '#765ba7', 'Violet': '#9d7ad2', 'Grape': '#6c5d80',
    'Lilac': '#b5a7d1', 'Fluor Pink': '#ff48b0', 'Fluor Orange': '#ff7477', 'Pink': '#ff8ac4',
    'Rose': '#ff99cc', 'Bubblegum': '#f984ca', 'Brown': '#925f52', 'Copper': '#bd8b64',
    'Gold': '#ac936e', 'Gray': '#928d88', 'Steel': '#375e77'
  };
  const INK_NAMES = Object.keys(window.RISO_INKS);

  window.FXRiso = {
    defaults: {
      channels: 2,
      ink1: 'Blue', ink2: 'Fluor Pink', ink3: 'Yellow', ink4: 'Black',
      mix1: 1, mix2: 1, mix3: 1, mix4: 1,
      grainPlate: 1,       // noise plate 1..4
      grainAmt: 0.55,
      drift: 2.5,          // registration drift px
      overprint: 0.75,     // overprint saturation
      paper: '#f4efe6',
      gamma: 1.0
    },
    schema: [
      { type: 'range', key: 'channels', label: 'Ink channels', min: 1, max: 4, step: 1 },
      { type: 'select', key: 'ink1', label: 'Ink 1', options: INK_NAMES },
      { type: 'range', key: 'mix1', label: 'Ink 1 B&W mix', min: 0, max: 2, step: 0.05 },
      { type: 'select', key: 'ink2', label: 'Ink 2', options: INK_NAMES },
      { type: 'range', key: 'mix2', label: 'Ink 2 B&W mix', min: 0, max: 2, step: 0.05 },
      { type: 'select', key: 'ink3', label: 'Ink 3', options: INK_NAMES },
      { type: 'range', key: 'mix3', label: 'Ink 3 B&W mix', min: 0, max: 2, step: 0.05 },
      { type: 'select', key: 'ink4', label: 'Ink 4', options: INK_NAMES },
      { type: 'range', key: 'mix4', label: 'Ink 4 B&W mix', min: 0, max: 2, step: 0.05 },
      { type: 'range', key: 'grainPlate', label: 'Grain plate', min: 1, max: 4, step: 1 },
      { type: 'range', key: 'grainAmt', label: 'Grain', min: 0, max: 1, step: 0.02 },
      { type: 'range', key: 'drift', label: 'Registration', min: 0, max: 10, step: 0.5 },
      { type: 'range', key: 'overprint', label: 'Overprint sat', min: 0, max: 1.5, step: 0.05 },
      { type: 'range', key: 'gamma', label: 'Tone gamma', min: 0.4, max: 2.4, step: 0.05 },
      { type: 'color', key: 'paper', label: 'Paper stock' }
    ],
    apply(id, p) {
      const w = id.width, h = id.height, d = id.data;
      const src = new Uint8ClampedArray(d);
      const nCh = Math.round(p.channels);
      const paper = hexToRgb(p.paper);
      const inks = [p.ink1, p.ink2, p.ink3, p.ink4].slice(0, nCh)
        .map((nm) => hexToRgb(window.RISO_INKS[nm] || '#000'));
      const mixes = [p.mix1, p.mix2, p.mix3, p.mix4];

      // per-channel registration drift vector (deterministic)
      const drifts = [];
      const rg = mulberry32(99);
      for (let c = 0; c < nCh; c++) drifts.push([Math.round((rg() - 0.5) * 2 * p.drift), Math.round((rg() - 0.5) * 2 * p.drift)]);

      const tex = TexLib.field('noise-' + Math.round(p.grainPlate), Math.min(w, 900), Math.min(h, 900));
      const txw = Math.min(w, 900), txh = Math.min(h, 900);
      const invG = 1 / p.gamma;

      // tonal band per channel: ch0 darkest tones … lighter bands stack up
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          let r = paper[0], g = paper[1], b = paper[2];
          for (let c = 0; c < nCh; c++) {
            const sx = clamp(x + drifts[c][0], 0, w - 1);
            const sy = clamp(y + drifts[c][1], 0, h - 1);
            const si = (sy * w + sx) * 4;
            const lum = Math.pow(lumaOf(src[si], src[si + 1], src[si + 2]) / 255, invG);
            // channel c covers band [c/n, (c+1)/n] of darkness
            const dark = 1 - lum;
            const lo = c / nCh, hi = (c + 1) / nCh;
            let cov = clamp((dark - lo) / (hi - lo), 0, 1) * mixes[c];
            if (cov <= 0) continue;
            // grain plate modulates coverage (screened ink)
            if (tex && p.grainAmt > 0) {
              const t = tex[(sy % txh) * txw + (sx % txw)];
              cov = clamp(cov + (t - 0.5) * p.grainAmt * 1.6 * cov, 0, 1.25);
            }
            cov = Math.min(cov * (1 + p.overprint * 0.3), 1.25);
            // subtractive overprint: paper * mix(1, ink) per channel
            r *= 1 - cov * (1 - inks[c][0] / 255);
            g *= 1 - cov * (1 - inks[c][1] / 255);
            b *= 1 - cov * (1 - inks[c][2] / 255);
          }
          d[i] = clamp(r, 0, 255); d[i + 1] = clamp(g, 0, 255); d[i + 2] = clamp(b, 0, 255);
        }
      }
      return id;
    }
  };
})();
