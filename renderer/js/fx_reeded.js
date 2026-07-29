/* fx_reeded.js — reeded/fluted architectural glass: parallel ridge refraction,
   chromatic dispersion, ridge highlights, imperfections, animated shift. */

window.FXReeded = {
  defaults: {
    pattern: 'vertical',   // vertical | horizontal | grid | wavy
    ridge: 28,             // ridge width px
    strength: 22,          // refraction px
    dispersion: 0.35,      // chromatic split
    reflection: 0.35,      // highlight streak strength
    reflScale: 1,          // highlight width
    imperfect: 0.15,       // per-ridge jitter + dirt
    wave: 0.4,             // waviness (wavy pattern)
    shift: 0,              // static phase shift
    animate: 0             // cycles per second (video)
  },
  schema: [
    { type: 'select', key: 'pattern', label: 'Pattern', options: [{ v: 'vertical', l: 'Vertical reeds' }, { v: 'horizontal', l: 'Horizontal reeds' }, { v: 'grid', l: 'Grid / privacy' }, { v: 'wavy', l: 'Wavy reeds' }] },
    { type: 'range', key: 'ridge', label: 'Ridge width', min: 6, max: 120, step: 2 },
    { type: 'range', key: 'strength', label: 'Refraction', min: 0, max: 80, step: 1 },
    { type: 'range', key: 'dispersion', label: 'Dispersion', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'reflection', label: 'Reflection', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'reflScale', label: 'Refl. scale', min: 0.3, max: 3, step: 0.1 },
    { type: 'range', key: 'imperfect', label: 'Imperfections', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'wave', label: 'Waviness', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'shift', label: 'Phase shift', min: 0, max: 1, step: 0.01 },
    { type: 'range', key: 'animate', label: 'Animate (cps)', min: 0, max: 2, step: 0.05 }
  ],
  apply(id, p, meta) {
    const w = id.width, h = id.height;
    const src = new Uint8ClampedArray(id.data);
    const d = id.data;
    const t = meta && meta.time ? meta.time : 0;
    const phase0 = (p.shift + t * p.animate) * p.ridge;

    const jitter = (ri) => {
      if (p.imperfect <= 0) return 0;
      let n = Math.sin(ri * 12.9898) * 43758.5453;
      return (n - Math.floor(n) - 0.5) * p.imperfect * p.ridge * 0.4;
    };

    const rd = Math.max(6, p.ridge);
    const pull = (arr, x, y, c) => arr[(clamp(y | 0, 0, h - 1) * w + clamp(x | 0, 0, w - 1)) * 4 + c];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let axisPos, ridgeIdx, frac;
        if (p.pattern === 'horizontal') axisPos = y + phase0;
        else if (p.pattern === 'wavy') axisPos = x + phase0 + Math.sin(y / rd * 0.8) * p.wave * rd;
        else axisPos = x + phase0;

        ridgeIdx = Math.floor(axisPos / rd);
        frac = (axisPos - ridgeIdx * rd) / rd; // 0..1 across the reed
        const theta = (frac - 0.5) * Math.PI;  // curvature of a half-round reed
        let off = Math.sin(theta) * p.strength + jitter(ridgeIdx);

        let off2 = 0;
        if (p.pattern === 'grid') {
          const ry = Math.floor((y + phase0) / rd);
          const fy = ((y + phase0) - ry * rd) / rd;
          off2 = Math.sin((fy - 0.5) * Math.PI) * p.strength + jitter(ry + 999);
        }

        const i = (y * w + x) * 4;
        const disp = p.dispersion * p.strength * 0.25;
        if (p.pattern === 'horizontal') {
          d[i] = pull(src, x, y + off - disp, 0);
          d[i + 1] = pull(src, x, y + off, 1);
          d[i + 2] = pull(src, x, y + off + disp, 2);
        } else {
          d[i] = pull(src, x + off - disp, y + off2, 0);
          d[i + 1] = pull(src, x + off, y + off2, 1);
          d[i + 2] = pull(src, x + off + disp, y + off2, 2);
        }

        // ridge boundary highlight + shadow (reflection streaks)
        if (p.reflection > 0) {
          const edge = Math.pow(Math.abs(Math.cos(theta)), 8 / p.reflScale);
          const hi = edge * p.reflection * 90;
          const shade = Math.pow(Math.abs(Math.sin(theta)), 3) * p.reflection * 30;
          d[i] = clamp(d[i] + hi - shade, 0, 255);
          d[i + 1] = clamp(d[i + 1] + hi - shade, 0, 255);
          d[i + 2] = clamp(d[i + 2] + hi - shade, 0, 255);
        }
      }
    }

    // glass dirt / imperfection film from a real noise plate
    if (p.imperfect > 0) {
      const tex = TexLib.field('noise-2', Math.min(w, 768), Math.min(h, 768));
      if (tex) {
        const txw = Math.min(w, 768), txh = Math.min(h, 768);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const tv = (tex[(y % txh) * txw + (x % txw)] - 0.5) * p.imperfect * 34;
            d[i] = clamp(d[i] + tv, 0, 255);
            d[i + 1] = clamp(d[i + 1] + tv, 0, 255);
            d[i + 2] = clamp(d[i + 2] + tv, 0, 255);
          }
        }
      }
    }
    return id;
  }
};
