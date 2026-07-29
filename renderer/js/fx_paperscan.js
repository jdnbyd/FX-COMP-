/* fx_paperscan.js — paper scan: real scanned paper texture overlay (bundled
   Resource Boy plates), scan distortion via smooth noise displacement,
   brightness/contrast, grain. */

window.FXPaper = {
  defaults: {
    mode: 'white',        // white | black
    plate: 1,             // texture 1..4
    opacity: 0.55,
    texScale: 1.0,
    brightness: 0,
    contrast: 0.08,
    distort: 3,           // px displacement
    distortScale: 3,      // noise field frequency
    grain: 0.1,
    desat: 0.1
  },
  schema: [
    { type: 'select', key: 'mode', label: 'Paper', options: [{ v: 'white', l: 'White paper' }, { v: 'black', l: 'Black paper' }] },
    { type: 'range', key: 'plate', label: 'Plate #', min: 1, max: 4, step: 1 },
    { type: 'range', key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'texScale', label: 'Texture scale', min: 0.3, max: 3, step: 0.05 },
    { type: 'range', key: 'brightness', label: 'Brightness', min: -0.5, max: 0.5, step: 0.02 },
    { type: 'range', key: 'contrast', label: 'Contrast', min: -0.5, max: 0.8, step: 0.02 },
    { type: 'range', key: 'distort', label: 'Distortion', min: 0, max: 12, step: 0.5 },
    { type: 'range', key: 'distortScale', label: 'Distort scale', min: 0.5, max: 8, step: 0.25 },
    { type: 'range', key: 'grain', label: 'Grain', min: 0, max: 0.5, step: 0.01 },
    { type: 'range', key: 'desat', label: 'Ink desat', min: 0, max: 1, step: 0.02 }
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

    // paper plate luma field (tiled at texScale)
    const plate = (p.mode === 'black' ? 'paper-black-' : 'paper-white-') + Math.round(p.plate);
    const tw = Math.max(64, Math.round(w / p.texScale));
    const th = Math.max(64, Math.round(h / p.texScale));
    const tex = TexLib.field(plate, Math.min(tw, 1024), Math.min(th, 1024));
    const txw = Math.min(tw, 1024), txh = Math.min(th, 1024);

    const bright = p.brightness * 255;
    const con = Math.tan((clamp(p.contrast, -0.99, 0.99) + 1) * Math.PI / 4);
    const rng2 = mulberry32(1337);
    const isBlack = p.mode === 'black';

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
        d[i] = clamp(r, 0, 255); d[i + 1] = clamp(g, 0, 255); d[i + 2] = clamp(b, 0, 255);
      }
    }
    return id;
  }
};
