/* fx_dither.js — palette-driven ordered dithering.
   Adaptive / curated / custom palettes, 2-18 colors, RGB | Luma | OKLab
   distance, 23 threshold patterns, strength, gamma, pixelation step. */

(function () {
  const bayer2 = [[0, 2], [3, 1]];
  const bayer4 = [
    [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
  ];
  const bayer8 = (() => {
    // recursive construction from bayer4
    const m = [];
    for (let y = 0; y < 8; y++) {
      m[y] = [];
      for (let x = 0; x < 8; x++) {
        m[y][x] = bayer4[y % 4][x % 4] * 4 + bayer2[Math.floor(y / 4)][Math.floor(x / 4)];
      }
    }
    return m;
  })();
  const halftone8 = [
    [24, 10, 12, 26, 35, 47, 49, 37],
    [8, 0, 2, 14, 45, 59, 61, 51],
    [22, 6, 4, 16, 43, 57, 63, 53],
    [30, 20, 18, 28, 33, 41, 55, 39],
    [34, 46, 48, 36, 25, 11, 13, 27],
    [44, 58, 60, 50, 9, 1, 3, 15],
    [42, 56, 62, 52, 23, 7, 5, 17],
    [32, 40, 54, 38, 31, 21, 19, 29]
  ];

  const hash = (x, y) => {
    let n = x * 374761393 + y * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return (((n ^ (n >> 16)) >>> 0) % 1000) / 1000;
  };
  const tri = (v) => Math.abs(((v % 2) + 2) % 2 - 1); // triangle wave 0..1
  const cell = (v, n) => ((v % n) + n) % n;

  // every pattern maps (x,y) -> threshold in [0,1)
  window.DITHER_PATTERNS = {
    'Random': (x, y) => hash(x, y),
    'Bayer 2×2': (x, y) => bayer2[y % 2][x % 2] / 4,
    'Bayer 4×4': (x, y) => bayer4[y % 4][x % 4] / 16,
    'Bayer 8×8': (x, y) => bayer8[y % 8][x % 8] / 64,
    'XOR': (x, y) => ((x ^ y) & 15) / 16,
    'ADD': (x, y) => ((x + y) & 15) / 16,
    'Hatch H': (x, y) => cell(y, 4) / 4,
    'Hatch V': (x, y) => cell(x, 4) / 4,
    'Hatch Diag': (x, y) => cell(x + y, 6) / 6,
    'Cross Hatch': (x, y) => Math.min(cell(x + y, 6), cell(x - y, 6)) / 6,
    'Zigzag': (x, y) => tri(x / 4 + tri(y / 8)),
    'Zigzag V': (x, y) => tri(y / 4 + tri(x / 8)),
    'Checkerboard': (x, y) => ((x + y) & 1) ? 0.72 : 0.28,
    'Fishnet': (x, y) => {
      const u = tri(x / 6) + tri(y / 6);
      return clamp(u / 2, 0, 0.999);
    },
    'Dot': (x, y) => {
      const dx = cell(x, 6) - 2.5, dy = cell(y, 6) - 2.5;
      return clamp(Math.sqrt(dx * dx + dy * dy) / 3.6, 0, 0.999);
    },
    'Dot Large': (x, y) => {
      const dx = cell(x, 12) - 5.5, dy = cell(y, 12) - 5.5;
      return clamp(Math.sqrt(dx * dx + dy * dy) / 7.8, 0, 0.999);
    },
    'Halftone': (x, y) => halftone8[y % 8][x % 8] / 64,
    'Halftone 45°': (x, y) => {
      const u = Math.round((x + y) / 1.4142), v = Math.round((x - y) / 1.4142);
      return halftone8[((u % 8) + 8) % 8][((v % 8) + 8) % 8] / 64;
    },
    'Square': (x, y) => {
      const dx = Math.abs(cell(x, 6) - 2.5), dy = Math.abs(cell(y, 6) - 2.5);
      return clamp(Math.max(dx, dy) / 3, 0, 0.999);
    },
    'Square Large': (x, y) => {
      const dx = Math.abs(cell(x, 12) - 5.5), dy = Math.abs(cell(y, 12) - 5.5);
      return clamp(Math.max(dx, dy) / 6, 0, 0.999);
    },
    'Spiral': (x, y) => {
      const dx = cell(x, 16) - 7.5, dy = cell(y, 16) - 7.5;
      const a = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) / 11;
      return (a + r * 2) % 1;
    },
    'Radial': (x, y) => {
      const dx = cell(x, 16) - 7.5, dy = cell(y, 16) - 7.5;
      return tri(Math.sqrt(dx * dx + dy * dy) / 4);
    },
    'Threshold': () => 0.5
  };
  window.DITHER_PATTERN_NAMES = Object.keys(window.DITHER_PATTERNS);

  window.FXDither = {
    defaults: {
      pattern: 'Bayer 8×8',
      strength: 0.5,
      gamma: 1.0,
      pixelate: 1,
      colorCount: 6,
      distMode: 'rgb',     // rgb | luma | oklab
      paletteMode: 'curated', // adaptive | curated | custom
      curated: 'Neon'
    },

    schema: [
      { type: 'select', key: 'pattern', label: 'Pattern', options: window.DITHER_PATTERN_NAMES },
      { type: 'range', key: 'strength', label: 'Dither strength', min: 0, max: 1, step: 0.02 },
      { type: 'range', key: 'gamma', label: 'Gamma', min: 0.3, max: 2.6, step: 0.05 },
      { type: 'range', key: 'pixelate', label: 'Pixel step', min: 1, max: 16, step: 1 },
      { type: 'range', key: 'colorCount', label: 'Colors', min: 2, max: 18, step: 1 },
      {
        type: 'select', key: 'distMode', label: 'Distance',
        options: [{ v: 'rgb', l: 'RGB' }, { v: 'luma', l: 'Luma' }, { v: 'oklab', l: 'OKLab' }]
      }
    ],

    // resolve active palette (array of [r,g,b]) from state + custom swatches
    resolvePalette(p, customHexes, sourceImageData) {
      const n = clamp(Math.round(p.colorCount), 2, 18);
      if (p.paletteMode === 'adaptive' && sourceImageData) {
        return adaptivePalette(sourceImageData, n);
      }
      if (p.paletteMode === 'custom') {
        return customHexes.slice(0, n).map(hexToRgb);
      }
      const base = (window.CURATED_PALETTES[p.curated] || window.CURATED_PALETTES.Neon).map(hexToRgb);
      if (base.length >= n) return base.slice(0, n);
      // extend by interpolating between neighbours
      const out = base.slice();
      let i = 0;
      while (out.length < n) {
        const a = base[i % base.length], b = base[(i + 1) % base.length];
        out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
        i++;
      }
      return out;
    },

    apply(imgData, p, palette) {
      const w = imgData.width, h = imgData.height;
      const d = imgData.data;
      const pat = window.DITHER_PATTERNS[p.pattern] || window.DITHER_PATTERNS['Bayer 8×8'];
      const step = Math.max(1, Math.round(p.pixelate));
      const amp = p.strength * 96;
      const invG = 1 / p.gamma;

      // gamma LUT
      const lut = new Uint8Array(256);
      for (let i = 0; i < 256; i++) lut[i] = clamp(Math.pow(i / 255, invG) * 255, 0, 255);

      const pal = palette;
      const palLab = p.distMode === 'oklab' ? pal.map((c) => rgbToOklab(c[0], c[1], c[2])) : null;
      const palLuma = p.distMode === 'luma' ? pal.map((c) => lumaOf(c[0], c[1], c[2])) : null;

      const nearest = (r, g, b) => {
        let bi = 0, bd = Infinity;
        if (p.distMode === 'oklab') {
          const [L, A, B] = rgbToOklab(r, g, b);
          for (let i = 0; i < pal.length; i++) {
            const q = palLab[i];
            const dd = (L - q[0]) * (L - q[0]) + (A - q[1]) * (A - q[1]) + (B - q[2]) * (B - q[2]);
            if (dd < bd) { bd = dd; bi = i; }
          }
        } else if (p.distMode === 'luma') {
          const l = lumaOf(r, g, b);
          for (let i = 0; i < pal.length; i++) {
            const dd = Math.abs(l - palLuma[i]);
            if (dd < bd) { bd = dd; bi = i; }
          }
        } else {
          for (let i = 0; i < pal.length; i++) {
            const q = pal[i];
            const dd = (r - q[0]) * (r - q[0]) + (g - q[1]) * (g - q[1]) + (b - q[2]) * (b - q[2]);
            if (dd < bd) { bd = dd; bi = i; }
          }
        }
        return pal[bi];
      };

      const out = new ImageData(w, h);
      const o = out.data;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const si = ((y * w) + x) * 4;
          const m = (pat(Math.floor(x / step), Math.floor(y / step)) - 0.5) * amp;
          const r = clamp(lut[d[si]] + m, 0, 255);
          const g = clamp(lut[d[si + 1]] + m, 0, 255);
          const b = clamp(lut[d[si + 2]] + m, 0, 255);
          const c = nearest(r, g, b);
          const ymax = Math.min(y + step, h), xmax = Math.min(x + step, w);
          for (let yy = y; yy < ymax; yy++) {
            for (let xx = x; xx < xmax; xx++) {
              const i = (yy * w + xx) * 4;
              o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2];
              o[i + 3] = d[i + 3];
            }
          }
        }
      }
      return out;
    }
  };
})();
