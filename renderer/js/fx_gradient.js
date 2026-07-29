/* fx_gradient.js — Gradient Layer: linear/radial/conic color washes blended
   over the frame. Colors picked from the color menu on each swatch. */

window.FXGrad = {
  defaults: {
    type: 'linear',      // linear | radial | conic
    colorA: '#ff7a1a',
    colorB: '#1a0b2e',
    useMid: false,
    colorM: '#00ff9f',
    blend: 'overlay',    // normal|multiply|screen|overlay|softlight|color|hue|lighten
    opacity: 0.6,
    angle: 30,
    scale: 1,
    offsetX: 0, offsetY: 0
  },
  schema: [
    { type: 'select', key: 'type', label: 'Type', options: ['linear', 'radial', 'conic'] },
    { type: 'color', key: 'colorA', label: 'Color A' },
    { type: 'color', key: 'colorB', label: 'Color B' },
    { type: 'check', key: 'useMid', label: 'Mid stop' },
    { type: 'color', key: 'colorM', label: 'Mid color' },
    {
      type: 'select', key: 'blend', label: 'Blend', options: [
        { v: 'normal', l: 'Normal' }, { v: 'multiply', l: 'Multiply' }, { v: 'screen', l: 'Screen' },
        { v: 'overlay', l: 'Overlay' }, { v: 'softlight', l: 'Soft light' }, { v: 'color', l: 'Color' },
        { v: 'hue', l: 'Hue' }, { v: 'lighten', l: 'Lighten' }
      ]
    },
    { type: 'range', key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'angle', label: 'Angle', min: 0, max: 360, step: 5 },
    { type: 'range', key: 'scale', label: 'Scale', min: 0.3, max: 3, step: 0.05 },
    { type: 'range', key: 'offsetX', label: 'Offset X', min: -1, max: 1, step: 0.05 },
    { type: 'range', key: 'offsetY', label: 'Offset Y', min: -1, max: 1, step: 0.05 }
  ],
  apply(srcCanvas, p) {
    const w = srcCanvas.width, h = srcCanvas.height;
    const ctx = srcCanvas.getContext('2d');
    const cx = w / 2 + p.offsetX * w * 0.5, cy = h / 2 + p.offsetY * h * 0.5;
    const R = Math.max(w, h) * 0.75 * p.scale;
    let grad;
    if (p.type === 'radial') {
      grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    } else if (p.type === 'conic') {
      grad = ctx.createConicGradient(p.angle * Math.PI / 180, cx, cy);
    } else {
      const a = p.angle * Math.PI / 180;
      grad = ctx.createLinearGradient(cx - Math.cos(a) * R, cy - Math.sin(a) * R, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    }
    grad.addColorStop(0, p.colorA);
    if (p.useMid) grad.addColorStop(0.5, p.colorM);
    grad.addColorStop(1, p.colorB);
    if (p.type === 'conic' && p.useMid) grad.addColorStop(1, p.colorA); // seamless wrap

    const MODES = { normal: 'source-over', multiply: 'multiply', screen: 'screen', overlay: 'overlay', softlight: 'soft-light', color: 'color', hue: 'hue', lighten: 'lighten' };
    ctx.save();
    ctx.globalCompositeOperation = MODES[p.blend] || 'overlay';
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return srcCanvas;
  }
};
