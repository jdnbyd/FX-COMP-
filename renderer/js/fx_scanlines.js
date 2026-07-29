/* fx_scanlines.js — luma-modulated horizontal light-bars.
   Bars swell where the source is bright, taper to hairlines in shadow.
   Softness box-blurs the per-column luma so the swell reads as one smooth
   continuous bar rather than stepped blocks. Halo = a dimmer, wider bar
   drawn behind each segment (approximated vector halo, not a blur). */

window.FXScan = {
  defaults: {
    spacing: 10,        // px between line centers
    minT: 0.6,          // hairline thickness
    maxT: 8,            // full-bright thickness
    softness: 6,        // horizontal luma smoothing radius
    gamma: 1.0,         // response curve on luma
    color: '#00e5ff',
    halo: true,
    haloWidth: 2.2,     // multiplier of bar thickness
    haloAlpha: 0.3,
    keepSource: 0       // 0..1 alpha of dimmed source behind the bars
  },

  schema: [
    { type: 'range', key: 'spacing', label: 'Line spacing', min: 4, max: 40, step: 1 },
    { type: 'range', key: 'minT', label: 'Hairline', min: 0.2, max: 4, step: 0.1 },
    { type: 'range', key: 'maxT', label: 'Max swell', min: 1, max: 30, step: 0.5 },
    { type: 'range', key: 'softness', label: 'Softness', min: 0, max: 40, step: 1 },
    { type: 'range', key: 'gamma', label: 'Response', min: 0.3, max: 3, step: 0.05 },
    { type: 'color', key: 'color', label: 'Bar color' },
    { type: 'check', key: 'halo', label: 'Vector halo' },
    { type: 'range', key: 'haloWidth', label: 'Halo width ×', min: 1.2, max: 5, step: 0.1 },
    { type: 'range', key: 'haloAlpha', label: 'Halo alpha', min: 0.05, max: 0.8, step: 0.05 },
    { type: 'range', key: 'keepSource', label: 'Source ghost', min: 0, max: 1, step: 0.05 }
  ],

  // input: source canvas; output: new canvas
  apply(srcCanvas, p) {
    const w = srcCanvas.width, h = srcCanvas.height;
    const sctx = srcCanvas.getContext('2d');
    const data = sctx.getImageData(0, 0, w, h).data;

    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    if (p.keepSource > 0) {
      ctx.globalAlpha = p.keepSource;
      ctx.drawImage(srcCanvas, 0, 0);
      ctx.globalAlpha = 1;
    }

    const spacing = Math.max(3, p.spacing);
    const maxT = Math.min(p.maxT, spacing * 1.15); // allow slight over-bleed

    const drawBars = (widthMul, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      for (let y0 = spacing / 2; y0 < h; y0 += spacing) {
        // sample band luma per column (3 taps inside the band)
        const lum = new Float32Array(w);
        const yA = clamp(Math.round(y0 - spacing * 0.3), 0, h - 1);
        const yB = clamp(Math.round(y0), 0, h - 1);
        const yC = clamp(Math.round(y0 + spacing * 0.3), 0, h - 1);
        for (let x = 0; x < w; x++) {
          let l = 0;
          for (const yy of [yA, yB, yC]) {
            const i = (yy * w + x) * 4;
            l += lumaOf(data[i], data[i + 1], data[i + 2]);
          }
          lum[x] = l / (3 * 255);
        }
        const sm = p.softness > 0 ? boxBlur1D(boxBlur1D(lum, w, p.softness), w, p.softness) : lum;

        // build one closed ribbon path: top edge L→R, bottom edge R→L
        ctx.beginPath();
        const stepX = 2;
        let first = true;
        for (let x = 0; x <= w; x += stepX) {
          const xi = Math.min(x, w - 1);
          const t = (p.minT + (maxT - p.minT) * Math.pow(sm[xi], p.gamma)) * widthMul;
          const yTop = y0 - t / 2;
          if (first) { ctx.moveTo(x, yTop); first = false; }
          else ctx.lineTo(x, yTop);
        }
        for (let x = w; x >= 0; x -= stepX) {
          const xi = Math.min(Math.max(x, 0), w - 1);
          const t = (p.minT + (maxT - p.minT) * Math.pow(sm[xi], p.gamma)) * widthMul;
          ctx.lineTo(x, y0 + t / 2);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    ctx.globalCompositeOperation = 'lighter';
    if (p.halo) drawBars(p.haloWidth, p.haloAlpha);
    drawBars(1, 1);
    ctx.globalCompositeOperation = 'source-over';
    return out;
  }
};
