/* fx_paperscan.js — paper scan: real scanned paper/wall texture overlay
   (bundled Resource Boy + curated wall plates), scan distortion via smooth
   noise displacement, brightness/contrast, grain, and an optional
   "Printer Scan" stage (faded contrast + posterize + halftone dot screen)
   layered on top for a photocopier/scanner artifact look. */

// 8x8 clustered-dot halftone threshold matrix (same table used by
// fx_dither.js's halftone patterns; duplicated here as a small standalone
// constant rather than reaching into that file's private closure).
const PAPER_HALFTONE8 = [
  [24, 10, 12, 26, 35, 47, 49, 37],
  [8, 0, 2, 14, 45, 59, 61, 51],
  [22, 6, 4, 16, 43, 57, 63, 53],
  [30, 20, 18, 28, 33, 41, 55, 39],
  [34, 46, 48, 36, 25, 11, 13, 27],
  [44, 58, 60, 50, 9, 1, 3, 15],
  [42, 56, 62, 52, 23, 7, 5, 17],
  [32, 40, 54, 38, 31, 21, 19, 29]
];

window.FXPaper = {
  defaults: {
    plate: 'paper-white-1',
    opacity: 0.55,
    texScale: 1.0,
    brightness: 0,
    contrast: 0.08,
    distort: 3,           // px displacement
    distortScale: 3,      // noise field frequency
    grain: 0.1,
    desat: 0.1,
    printerScan: false,   // photocopier/scanner artifact stage
    printerFade: 0.3,     // faded/lifted contrast
    printerLevels: 4,     // posterize levels per channel
    printerHalftone: 0.3  // clustered-dot halftone strength
  },
  schema: [
    {
      type: 'select', key: 'plate', label: 'Plate', options: [
        ...TexLib.names('paper-white-').map((n) => ({ v: n, l: 'White ' + n.replace('paper-white-', '') })),
        ...TexLib.names('paper-black-').map((n) => ({ v: n, l: 'Black ' + n.replace('paper-black-', '') }))
      ]
    },
    { type: 'range', key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'texScale', label: 'Texture scale', min: 0.3, max: 3, step: 0.05 },
    { type: 'range', key: 'brightness', label: 'Brightness', min: -0.5, max: 0.5, step: 0.02 },
    { type: 'range', key: 'contrast', label: 'Contrast', min: -0.5, max: 0.8, step: 0.02 },
    { type: 'range', key: 'distort', label: 'Distortion', min: 0, max: 12, step: 0.5 },
    { type: 'range', key: 'distortScale', label: 'Distort scale', min: 0.5, max: 8, step: 0.25 },
    { type: 'range', key: 'grain', label: 'Grain', min: 0, max: 0.5, step: 0.01 },
    { type: 'range', key: 'desat', label: 'Ink desat', min: 0, max: 1, step: 0.02 },
    { type: 'section', label: 'Printer Scan' },
    { type: 'check', key: 'printerScan', label: 'Enable' },
    { type: 'range', key: 'printerFade', label: 'Faded lift', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'printerLevels', label: 'Crushed levels', min: 2, max: 8, step: 1 },
    { type: 'range', key: 'printerHalftone', label: 'Halftone', min: 0, max: 1, step: 0.02 }
  ],
  apply(id, p) {
    const w = id.width, h = id.height;
    let d = id.data;

    // scan distortion — displace sampling through a smooth noise field
    if (p.distort > 0) {
      const gw = Math.max(2, Math.round(p.distortScale * 6)), gh = gw;
      const rng = mulberry32(42);
      const nx = new Float32Array(gw * gh), ny = new Float32Array(gw * gh);
      for (let i = 0; i < nx.length; i++) { nx[i] = rng() - 0.5; ny[i] = rng() - 0.5; }
      const sample = (f, u, v) => {
        const X = u * (gw - 1), Y = v * (gh - 1);
        const x0 = X | 0, y0 = Y | 0, fx = X - x0, fy = Y - y0;
        const x1 = Math.min(x0 + 1, gw - 1), y1 = Math.min(y0 + 1, gh - 1);
        return f[y0 * gw + x0] * (1 - fx) * (1 - fy) + f[y0 * gw + x1] * fx * (1 - fy) +
               f[y1 * gw + x0] * (1 - fx) * fy + f[y1 * gw + x1] * fx * fy;
      };
      const src = new Uint8ClampedArray(d);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const u = x / w, v = y / h;
          const sx = clamp(Math.round(x + sample(nx, u, v) * 2 * p.distort), 0, w - 1);
          const sy = clamp(Math.round(y + sample(ny, u, v) * 2 * p.distort), 0, h - 1);
          const si = (sy * w + sx) * 4, di = (y * w + x) * 4;
          d[di] = src[si]; d[di + 1] = src[si + 1]; d[di + 2] = src[si + 2];
        }
      }
    }

    // paper plate luma field (tiled at texScale) — normalize legacy state:
    // before this session's plate-select refactor, `plate` was a number
    // (1-4) paired with a separate `mode: 'white'|'black'` field. Anyone
    // with existing localStorage/.midfx state from that schema would
    // otherwise crash here on plate.indexOf.
    let plate = p.plate;
    if (typeof plate !== 'string') {
      plate = 'paper-' + (p.mode === 'black' ? 'black' : 'white') + '-' + (Math.round(Number(plate)) || 1);
    }
    const knownPlates = TexLib.names('paper-white-').concat(TexLib.names('paper-black-'));
    if (!knownPlates.includes(plate)) plate = 'paper-white-1';
    const isBlack = plate.indexOf('paper-black-') === 0;
    const tw = Math.max(64, Math.round(w / p.texScale));
    const th = Math.max(64, Math.round(h / p.texScale));
    const tex = TexLib.field(plate, Math.min(tw, 1024), Math.min(th, 1024));
    const txw = Math.min(tw, 1024), txh = Math.min(th, 1024);

    const bright = p.brightness * 255;
    const con = Math.tan((clamp(p.contrast, -0.99, 0.99) + 1) * Math.PI / 4);
    const rng2 = mulberry32(1337);
    const levels = Math.max(2, Math.round(p.printerLevels)) - 1;

    for (let y = 0; y < h; y++) {
      const tyRow = Math.round(y * p.texScale) % txh;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let r = d[i], g = d[i + 1], b = d[i + 2];
        // ink desat — pull toward print gray
        if (p.desat > 0) {
          const l = r * 0.2126 + g * 0.7152 + b * 0.0722;
          r = r + (l - r) * p.desat; g = g + (l - g) * p.desat; b = b + (l - b) * p.desat;
        }
        if (tex) {
          const t = tex[tyRow * txw + (Math.round(x * p.texScale) % txw)];
          if (isBlack) {
            // screen the dark paper grain over the image
            const tv = t * 255 * p.opacity;
            r = 255 - (255 - r) * (255 - tv) / 255;
            g = 255 - (255 - g) * (255 - tv) / 255;
            b = 255 - (255 - b) * (255 - tv) / 255;
            const dim = 1 - p.opacity * 0.35;
            r *= dim; g *= dim; b *= dim;
          } else {
            // multiply white paper fibers into the image
            const m = 1 - p.opacity + p.opacity * t;
            r *= m; g *= m; b *= m;
          }
        }
        r = (r + bright - 128) * con + 128;
        g = (g + bright - 128) * con + 128;
        b = (b + bright - 128) * con + 128;
        if (p.grain > 0) {
          const gr = (rng2() - 0.5) * p.grain * 110;
          r += gr; g += gr; b += gr;
        }

        if (p.printerScan) {
          // faded/lifted contrast — raises shadows toward gray, photocopier-style
          if (p.printerFade > 0) {
            const lift = p.printerFade * 0.3 * 255;
            r = r * (1 - p.printerFade * 0.3) + lift;
            g = g * (1 - p.printerFade * 0.3) + lift;
            b = b * (1 - p.printerFade * 0.3) + lift;
          }
          // crushed/posterized levels
          if (levels > 0) {
            r = Math.round(clamp(r, 0, 255) / 255 * levels) / levels * 255;
            g = Math.round(clamp(g, 0, 255) / 255 * levels) / levels * 255;
            b = Math.round(clamp(b, 0, 255) / 255 * levels) / levels * 255;
          }
          // clustered-dot halftone screen
          if (p.printerHalftone > 0) {
            const hv = (PAPER_HALFTONE8[y % 8][x % 8] / 63) * 255;
            const l2 = r * 0.2126 + g * 0.7152 + b * 0.0722;
            const on = l2 > hv ? 255 : 0;
            r = r * (1 - p.printerHalftone) + on * p.printerHalftone;
            g = g * (1 - p.printerHalftone) + on * p.printerHalftone;
            b = b * (1 - p.printerHalftone) + on * p.printerHalftone;
          }
        }

        d[i] = clamp(r, 0, 255); d[i + 1] = clamp(g, 0, 255); d[i + 2] = clamp(b, 0, 255);
      }
    }
    return id;
  }
};
