/* tool_shapes.js — Shape Blur (shapeblur.com-style): a single soft-focus
   gradient shape floating on a ground — shape, two-color gradient, heavy
   gaussian-ish blur, grain, glow. Canvas render, PNG/SVG export. */

(function () {
  const S = {
    seed: newSeed(),
    docW: 1400, docH: 1400,
    shape: 'blob',        // circle | square | superellipse | triangle | ring | blob | pill
    size: 0.55,
    aspect: 1,
    rotation: 0,
    blur: 90,
    colorA: '#ff0095',
    colorB: '#00fbff',
    gradAngle: 35,
    bg: '#0a0a0c',
    bgLight: false,
    grain: 0.14,
    glow: 0.25,
    count: 1,             // echo copies
    echoScale: 0.7
  };
  let stageEl, canvas;

  const PRESETS = [
    { name: 'Signal pink/cyan', params: { shape: 'blob', colorA: '#ff0095', colorB: '#00fbff', blur: 90, grain: 0.14, bg: '#0a0a0c' } },
    { name: 'Sunset pill', params: { shape: 'pill', colorA: '#ff6c2f', colorB: '#ffd28a', blur: 70, rotation: 20, bg: '#140d0a' } },
    { name: 'Acid ring', params: { shape: 'ring', colorA: '#c8f751', colorB: '#00e5ff', blur: 55, grain: 0.2, bg: '#07090b' } },
    { name: 'Paper dot', params: { shape: 'circle', colorA: '#e8622c', colorB: '#f4c7d4', blur: 40, bg: '#efe9dc', bgLight: true, grain: 0.22 } },
    { name: 'Deep violet square', params: { shape: 'superellipse', colorA: '#7c3aed', colorB: '#22d3ee', blur: 110, rotation: 12 } },
    { name: 'Triple echo', params: { shape: 'circle', count: 3, echoScale: 0.65, colorA: '#ff2079', colorB: '#ffe600', blur: 60 } },
    { name: 'Ghost triangle', params: { shape: 'triangle', colorA: '#9aa5ad', colorB: '#e8e6e1', blur: 80, grain: 0.1, bg: '#101216' } },
    { name: 'Emerald soft square', params: { shape: 'square', colorA: '#06d6a0', colorB: '#073b4c', blur: 95, rotation: 45 } },
    { name: 'Hot coal', params: { shape: 'blob', colorA: '#ff3d5a', colorB: '#ffb454', blur: 75, glow: 0.6, grain: 0.18, bg: '#0c0505' } },
    { name: 'Ice sliver', params: { shape: 'pill', aspect: 0.3, rotation: -30, colorA: '#a8ceee', colorB: '#f8e6fb', blur: 65, bg: '#0a0e14' } }
  ];

  function shapePath(ctx, shape, r, rng) {
    ctx.beginPath();
    if (shape === 'circle') ctx.arc(0, 0, r, 0, Math.PI * 2);
    else if (shape === 'square') ctx.rect(-r, -r, r * 2, r * 2);
    else if (shape === 'pill') {
      const h = r * 0.6;
      ctx.roundRect(-r, -h, r * 2, h * 2, h);
    } else if (shape === 'superellipse') {
      const n = 3.5;
      for (let i = 0; i <= 90; i++) {
        const a = (i / 90) * Math.PI * 2;
        const cs = Math.cos(a), sn = Math.sin(a);
        const x = Math.sign(cs) * Math.pow(Math.abs(cs), 2 / n) * r;
        const y = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (shape === 'triangle') {
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.9, r * 0.7);
      ctx.lineTo(-r * 0.9, r * 0.7);
      ctx.closePath();
    } else if (shape === 'ring') {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2, true);
    } else { // blob — smooth random closed curve
      const pts = [];
      const k = 8;
      for (let i = 0; i < k; i++) {
        const a = (i / k) * Math.PI * 2;
        const rr = r * (0.75 + rng() * 0.45);
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      for (let i = 0; i <= k; i++) {
        const p0 = pts[i % k], p1 = pts[(i + 1) % k];
        const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        i === 0 ? ctx.moveTo(mx, my) : ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
      }
      ctx.closePath();
    }
  }

  function generate() {
    const rng = mulberry32(S.seed);
    const W = S.docW, H = S.docH;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = S.bg;
    ctx.fillRect(0, 0, W, H);

    const r = Math.min(W, H) * 0.5 * S.size;
    const ga = S.gradAngle * Math.PI / 180;
    const grad = ctx.createLinearGradient(-Math.cos(ga) * r, -Math.sin(ga) * r, Math.cos(ga) * r, Math.sin(ga) * r);
    grad.addColorStop(0, S.colorA);
    grad.addColorStop(1, S.colorB);

    for (let e = S.count - 1; e >= 0; e--) {
      const sc = Math.pow(S.echoScale, e);
      const alpha = e === 0 ? 1 : 0.5 / e;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(S.rotation * Math.PI / 180 + e * 0.25);
      ctx.scale(sc, sc * S.aspect);
      ctx.filter = `blur(${S.blur * sc}px)`;
      ctx.globalAlpha = alpha;
      // glow underlay
      if (S.glow > 0) {
        ctx.save();
        ctx.filter = `blur(${(S.blur * 2 + 40) * sc}px)`;
        ctx.globalAlpha = alpha * S.glow;
        ctx.fillStyle = grad;
        shapePath(ctx, S.shape, r * 1.15, mulberry32(S.seed + 1));
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = grad;
      shapePath(ctx, S.shape, r, mulberry32(S.seed + 1));
      ctx.fill();
      ctx.restore();
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    // grain
    if (S.grain > 0) {
      const id = ctx.getImageData(0, 0, W, H);
      const d = id.data;
      const g = S.grain * 255 * 0.35;
      const rr = mulberry32(S.seed + 2);
      for (let i = 0; i < d.length; i += 4) {
        const n = (rr() - 0.5) * g;
        d[i] += n; d[i + 1] += n; d[i + 2] += n;
      }
      ctx.putImageData(id, 0, 0);
    }
  }

  function exportSVG() {
    const W = S.docW, H = S.docH;
    const r = Math.min(W, H) * 0.5 * S.size;
    // simple SVG twin with feGaussianBlur (blob/superellipse approximated by ellipse)
    let shapeEl;
    const common = `fill="url(#g)" transform="translate(${W / 2} ${H / 2}) rotate(${S.rotation}) scale(1 ${S.aspect})"`;
    if (S.shape === 'square' || S.shape === 'superellipse') shapeEl = `<rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" rx="${S.shape === 'superellipse' ? r * 0.3 : 0}" ${common}/>`;
    else if (S.shape === 'triangle') shapeEl = `<path d="M 0 ${-r} L ${r * 0.9} ${r * 0.7} L ${-r * 0.9} ${r * 0.7} Z" ${common}/>`;
    else if (S.shape === 'ring') shapeEl = `<circle r="${r * 0.78}" fill="none" stroke="url(#g)" stroke-width="${r * 0.45}" transform="translate(${W / 2} ${H / 2}) scale(1 ${S.aspect})"/>`;
    else if (S.shape === 'pill') shapeEl = `<rect x="${-r}" y="${-r * 0.6}" width="${2 * r}" height="${r * 1.2}" rx="${r * 0.6}" ${common}/>`;
    else shapeEl = `<ellipse rx="${r}" ry="${r * 0.92}" ${common}/>`;
    const ga = S.gradAngle;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="g" gradientTransform="rotate(${ga} .5 .5)"><stop offset="0" stop-color="${S.colorA}"/><stop offset="1" stop-color="${S.colorB}"/></linearGradient>
<filter id="b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${S.blur}"/></filter></defs>
<rect width="${W}" height="${H}" fill="${S.bg}"/><g filter="url(#b)">${shapeEl}</g></svg>`;
    saveSvgText(svg, 'shapeblur-' + S.seed);
  }

  window.TOOLS.push({
    id: 'shapes',
    group: 'DESIGN',
    name: 'Shape Blur',
    sub: 'soft gradient shapes',
    mount(stage, panel) {
      stageEl = stage;
      stage.innerHTML = '';
      canvas = document.createElement('canvas');
      canvas.className = 'main-canvas';
      stage.appendChild(canvas);

      panel.innerHTML = '';
      presetRow(panel, PRESETS, (params) => { Object.assign(S, params); this.mount(stage, panel); });
      buildControls(panel, [
        { type: 'section', label: 'Canvas' },
        { type: 'number', key: 'docW', label: 'Width', min: 300, max: 4000 },
        { type: 'number', key: 'docH', label: 'Height', min: 300, max: 4000 },
        { type: 'color', key: 'bg', label: 'Ground' },
        { type: 'section', label: 'Shape' },
        { type: 'select', key: 'shape', label: 'Shape', options: ['blob', 'circle', 'square', 'superellipse', 'pill', 'triangle', 'ring'] },
        { type: 'range', key: 'size', label: 'Size', min: 0.1, max: 1.1, step: 0.02 },
        { type: 'range', key: 'aspect', label: 'Aspect', min: 0.2, max: 2, step: 0.05 },
        { type: 'range', key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1 },
        { type: 'range', key: 'count', label: 'Echo copies', min: 1, max: 4, step: 1 },
        { type: 'range', key: 'echoScale', label: 'Echo scale', min: 0.4, max: 0.95, step: 0.05 },
        { type: 'section', label: 'Soft focus' },
        { type: 'range', key: 'blur', label: 'Blur px', min: 0, max: 220, step: 2 },
        { type: 'range', key: 'glow', label: 'Glow', min: 0, max: 1, step: 0.05 },
        { type: 'range', key: 'grain', label: 'Grain', min: 0, max: 0.5, step: 0.01 },
        { type: 'section', label: 'Gradient' },
        { type: 'color', key: 'colorA', label: 'Color A' },
        { type: 'color', key: 'colorB', label: 'Color B' },
        { type: 'range', key: 'gradAngle', label: 'Angle', min: 0, max: 360, step: 5 }
      ], S, generate);
      panel.appendChild(el('div', 'ctl-section', 'Generate'));
      addSeedRow(panel, () => S.seed, (s) => { S.seed = s; generate(); });
      buildControls(panel, [
        {
          type: 'buttons', items: [
            { label: 'SAVE PNG', cls: 'primary', onClick: () => saveCanvasImage(canvas, 'shapeblur-' + S.seed) },
            { label: 'SAVE SVG', cls: 'primary', onClick: exportSVG }
          ]
        }
      ], S, null);
      generate();
    }
  });
})();
