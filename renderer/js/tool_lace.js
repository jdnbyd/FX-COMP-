/* tool_lace.js — lace/doily engine per reference: image rendered as halftone
   inside a lace frame (oval doily, circle, rect, cross), scalloped borders,
   ribbon rings, selectable stitch types and thread thickness. */

(function () {
  const S = {
    seed: newSeed(),
    cell: 16,
    thickness: 1,
    thread: '#f7f3ea',
    bg: '#151013',
    imageInk: '#8fb3dd',      // halftone ink for the picture
    invert: false,
    frame: 'oval',            // none | oval | circle | rect | cross
    framePad: 0.1,            // margin around frame
    scallops: 26,             // scallop count on border
    rings: 2,                 // ribbon rings
    stitchDots: true, stitchLoops: true, stitchPetals: true, stitchKnots: true, stitchWebs: true,
    halftone: true,           // render image as halftone inside frame
    jitter: 0.2,
    maxW: 1400
  };
  let stageEl, canvas, source = null, fileInfoEl;

  const PRESETS = [
    { name: 'Blue doily', params: { frame: 'oval', thread: '#f7f3ea', bg: '#4a6da3', imageInk: '#5c85c4', halftone: true, scallops: 26, rings: 2 } },
    { name: 'Black ornate frame', params: { frame: 'rect', thread: '#f2ede2', bg: '#0c0a0a', imageInk: '#c8b78f', scallops: 34, rings: 3, thickness: 1.2 } },
    { name: 'Circle medallion', params: { frame: 'circle', scallops: 40, rings: 3, thread: '#ffffff', bg: '#1a1522', imageInk: '#9d7ad2' } },
    { name: 'Holy cross', params: { frame: 'cross', scallops: 20, rings: 2, thread: '#f5ead0', bg: '#241c14', imageInk: '#c9a227' } },
    { name: 'Raw threads', params: { frame: 'none', halftone: false, cell: 14, thickness: 0.8, thread: '#efe7d8', bg: '#181210' } },
    { name: 'Fine needlework', params: { cell: 10, thickness: 0.6, scallops: 48, rings: 4, frame: 'oval' } },
    { name: 'Chunky crochet', params: { cell: 26, thickness: 2, scallops: 16, rings: 1, frame: 'circle' } },
    { name: 'Cyan HUD lace', params: { thread: '#00e5ff', bg: '#06080a', imageInk: '#0090aa', frame: 'oval', thickness: 0.8 } },
    { name: 'Blood lace', params: { thread: '#e6c5c5', bg: '#1c0808', imageInk: '#a43b3b', frame: 'rect', rings: 3 } },
    { name: 'Paper cut', params: { thread: '#2a2118', bg: '#efe7d8', imageInk: '#5c4a33', frame: 'oval', invert: true } }
  ];

  async function importImage() {
    const f = await window.native.openMedia('image');
    if (!f) return;
    if (f.kind === 'image-raw') {
      const c = document.createElement('canvas');
      c.width = f.width; c.height = f.height;
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(f.data), f.width, f.height), 0, 0);
      source = { el: c, w: f.width, h: f.height, name: f.path.split(/[\\/]/).pop() };
    } else {
      const img = new Image();
      img.src = f.url;
      await img.decode();
      source = { el: img, w: img.naturalWidth, h: img.naturalHeight, name: f.path.split(/[\\/]/).pop() };
    }
    fileInfoEl.textContent = source.name + ' — ' + source.w + '×' + source.h;
  }

  // ---- frame SDF: inside +1 … border 0 … outside -1 (normalized-ish) ----
  function frameDist(x, y, W, H) {
    const cx = W / 2, cy = H / 2;
    const pad = S.framePad;
    if (S.frame === 'none') return 1;
    if (S.frame === 'circle') {
      const R = Math.min(W, H) * (0.5 - pad);
      return 1 - Math.hypot(x - cx, y - cy) / R;
    }
    if (S.frame === 'oval') {
      const rx = W * (0.5 - pad), ry = H * (0.5 - pad);
      return 1 - Math.hypot((x - cx) / rx, (y - cy) / ry);
    }
    if (S.frame === 'rect') {
      const rx = W * (0.5 - pad), ry = H * (0.5 - pad);
      const dx = Math.abs(x - cx) / rx, dy = Math.abs(y - cy) / ry;
      return 1 - Math.max(dx, dy);
    }
    // cross
    const armW = Math.min(W, H) * 0.16;
    const rx = W * (0.5 - pad), ry = H * (0.5 - pad);
    const inV = Math.abs(x - cx) < armW && Math.abs(y - cy) < ry;
    const inH = Math.abs(y - cy) < armW && Math.abs(x - cx) < rx;
    if (!inV && !inH) return -0.3;
    const dV = inV ? Math.min(1 - Math.abs(x - cx) / armW, 1 - Math.abs(y - cy) / ry) : -1;
    const dH = inH ? Math.min(1 - Math.abs(y - cy) / armW, 1 - Math.abs(x - cx) / rx) : -1;
    return Math.max(dV, dH) * 0.6;
  }

  // border path points for scallops/ribbons at scale t (1=edge)
  function borderPoint(a, t, W, H) {
    const cx = W / 2, cy = H / 2;
    const pad = S.framePad;
    if (S.frame === 'circle' || S.frame === 'none') {
      const R = Math.min(W, H) * (0.5 - pad) * t;
      return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    }
    if (S.frame === 'oval') {
      return [cx + Math.cos(a) * W * (0.5 - pad) * t, cy + Math.sin(a) * H * (0.5 - pad) * t];
    }
    if (S.frame === 'rect') {
      // superellipse approximation of a rounded rect ring
      const n = 6;
      const cs = Math.cos(a), sn = Math.sin(a);
      const fx = Math.sign(cs) * Math.pow(Math.abs(cs), 2 / n);
      const fy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      return [cx + fx * W * (0.5 - pad) * t, cy + fy * H * (0.5 - pad) * t];
    }
    // cross: trace a circle but clamp into the cross silhouette
    const R = Math.min(W, H) * (0.5 - pad) * t;
    let x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    const armW = Math.min(W, H) * 0.16 * (0.6 + 0.6 * t);
    if (Math.abs(x - cx) > armW && Math.abs(y - cy) > armW) {
      if (Math.abs(Math.cos(a)) > Math.abs(Math.sin(a))) y = cy + Math.sign(y - cy) * armW;
      else x = cx + Math.sign(x - cx) * armW;
    }
    return [x, y];
  }

  function motif(ctx, kind, x, y, s, rng) {
    ctx.beginPath();
    switch (kind) {
      case 'dot':
        ctx.arc(x, y, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        return;
      case 'loop':
        ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        return;
      case 'petal': {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + rng() * 0.3;
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + Math.cos(a - 0.5) * s * 0.55, y + Math.sin(a - 0.5) * s * 0.55,
            x + Math.cos(a) * s * 0.28, y + Math.sin(a) * s * 0.28);
          ctx.quadraticCurveTo(x + Math.cos(a + 0.5) * s * 0.55, y + Math.sin(a + 0.5) * s * 0.55, x, y);
        }
        ctx.stroke();
        return;
      }
      case 'knot': {
        ctx.arc(x, y, s * 0.34, 0, Math.PI * 2);
        ctx.moveTo(x - s * 0.45, y); ctx.lineTo(x + s * 0.45, y);
        ctx.moveTo(x, y - s * 0.45); ctx.lineTo(x, y + s * 0.45);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      case 'web': {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * s * 0.4, y + Math.sin(a + 0.4) * s * 0.4,
            x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5);
        }
        ctx.stroke();
        return;
      }
    }
  }

  function generate() {
    const rng = mulberry32(S.seed);
    const W = source ? Math.round(Math.min(source.w, S.maxW)) : 1100;
    const H = source ? Math.round(W * source.h / source.w) : 1400;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = S.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = S.thread;
    ctx.fillStyle = S.thread;
    ctx.lineWidth = Math.max(0.5, S.cell / 16 * S.thickness);
    ctx.lineCap = 'round';

    const stitches = [];
    if (S.stitchDots) stitches.push('dot');
    if (S.stitchLoops) stitches.push('loop');
    if (S.stitchPetals) stitches.push('petal');
    if (S.stitchKnots) stitches.push('knot');
    if (S.stitchWebs) stitches.push('web');
    if (!stitches.length) stitches.push('loop');

    // --- image luma (for halftone or stitch density) ---
    let lum = null, cols = 0, rows = 0;
    if (source) {
      cols = Math.ceil(W / S.cell); rows = Math.ceil(H / S.cell);
      const tmp = document.createElement('canvas');
      tmp.width = cols; tmp.height = rows;
      const tctx = tmp.getContext('2d');
      tctx.drawImage(source.el, 0, 0, cols, rows);
      const d = tctx.getImageData(0, 0, cols, rows).data;
      lum = new Float32Array(cols * rows);
      for (let i = 0, j = 0; j < lum.length; i += 4, j++) {
        let l = lumaOf(d[i], d[i + 1], d[i + 2]) / 255;
        lum[j] = S.invert ? 1 - l : l;
      }
    }

    // --- interior: halftoned image OR stitch fill by luma ---
    const interior = (x, y) => frameDist(x, y, W, H) > 0.06;
    if (source && lum) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * S.cell, y = (r + 0.5) * S.cell;
          if (!interior(x, y)) continue;
          const l = lum[r * cols + c];
          if (S.halftone) {
            // dark areas = big halftone dots of imageInk (like the printed doily picture)
            const dark = 1 - l;
            if (dark < 0.08) continue;
            ctx.fillStyle = S.imageInk;
            ctx.beginPath();
            ctx.arc(x + (rng() - 0.5) * S.cell * S.jitter, y + (rng() - 0.5) * S.cell * S.jitter,
              S.cell * 0.5 * Math.sqrt(dark) * 0.85, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = S.thread;
          } else {
            const level = Math.floor(l * (stitches.length + 1));
            if (level === 0) continue;
            motif(ctx, stitches[Math.min(level - 1, stitches.length - 1)],
              x + (rng() - 0.5) * S.cell * S.jitter, y + (rng() - 0.5) * S.cell * S.jitter, S.cell, rng);
          }
        }
      }
    }

    if (S.frame !== 'none') {
      // --- ribbon rings (concentric stitched rings inside the border) ---
      const steps = 220;
      for (let ring = 0; ring < S.rings; ring++) {
        const t = 0.995 - ring * 0.055;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const [x, y] = borderPoint(a, t, W, H);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        // running stitch dots between rings
        if (ring < S.rings - 1) {
          for (let i = 0; i < steps; i += 4) {
            const a = (i / steps) * Math.PI * 2;
            const [x, y] = borderPoint(a, t - 0.027, W, H);
            ctx.beginPath();
            ctx.arc(x, y, ctx.lineWidth * 0.9, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // --- scalloped edge: arcs + eyelet holes + picot dots ---
      const n = Math.max(6, Math.round(S.scallops));
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = ((i + 1) / n) * Math.PI * 2;
        const am = (a0 + a1) / 2;
        const [x0, y0] = borderPoint(a0, 1, W, H);
        const [x1, y1] = borderPoint(a1, 1, W, H);
        const [xm, ym] = borderPoint(am, 1.075, W, H);
        // scallop arc
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(xm, ym, x1, y1);
        ctx.stroke();
        // eyelet in each scallop
        const [ex, ey] = borderPoint(am, 0.955, W, H);
        motif(ctx, pick(rng, stitches), ex, ey, S.cell * 1.15, rng);
        // picot dot on the scallop tip
        ctx.beginPath();
        ctx.arc(xm, ym, ctx.lineWidth * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  window.TOOLS.push({
    id: 'lace',
    group: 'DESIGN',
    name: 'Lace Filter',
    sub: 'doily frames · halftone',
    mount(stage, panel) {
      stageEl = stage;
      stage.innerHTML = '';
      canvas = document.createElement('canvas');
      canvas.className = 'main-canvas';
      stage.appendChild(canvas);

      panel.innerHTML = '';
      presetRow(panel, PRESETS, (params) => { Object.assign(S, params); this.mount(stage, panel); });
      buildControls(panel, [
        { type: 'section', label: 'Source' },
        {
          type: 'button', label: '⬇ IMPORT IMAGE', cls: 'primary', onClick: async () => {
            await importImage();
            generate();
          }
        }
      ], S, null);
      fileInfoEl = el('div', 'file-info', source ? source.name : 'no image — frame renders without one');
      panel.appendChild(fileInfoEl);

      buildControls(panel, [
        { type: 'section', label: 'Frame' },
        { type: 'select', key: 'frame', label: 'Shape', options: [{ v: 'oval', l: 'Oval doily' }, { v: 'circle', l: 'Circle' }, { v: 'rect', l: 'Rect frame' }, { v: 'cross', l: 'Cross' }, { v: 'none', l: 'None (full field)' }] },
        { type: 'range', key: 'framePad', label: 'Frame margin', min: 0.02, max: 0.25, step: 0.01 },
        { type: 'range', key: 'scallops', label: 'Scallops', min: 8, max: 64, step: 1 },
        { type: 'range', key: 'rings', label: 'Ribbon rings', min: 0, max: 5, step: 1 },
        { type: 'section', label: 'Stitches' },
        { type: 'range', key: 'cell', label: 'Stitch size', min: 6, max: 48, step: 1 },
        { type: 'range', key: 'thickness', label: 'Thread weight', min: 0.4, max: 3, step: 0.1 },
        { type: 'range', key: 'jitter', label: 'Hand jitter', min: 0, max: 0.8, step: 0.05 },
        { type: 'check', key: 'stitchDots', label: 'Dots' },
        { type: 'check', key: 'stitchLoops', label: 'Loops' },
        { type: 'check', key: 'stitchPetals', label: 'Petals' },
        { type: 'check', key: 'stitchKnots', label: 'Knots' },
        { type: 'check', key: 'stitchWebs', label: 'Webs' },
        { type: 'section', label: 'Picture' },
        { type: 'check', key: 'halftone', label: 'Halftone image' },
        { type: 'check', key: 'invert', label: 'Invert luma' },
        { type: 'color', key: 'imageInk', label: 'Picture ink' },
        { type: 'section', label: 'Color' },
        { type: 'color', key: 'thread', label: 'Thread' },
        { type: 'color', key: 'bg', label: 'Ground' }
      ], S, generate);

      panel.appendChild(el('div', 'ctl-section', 'Generate'));
      addSeedRow(panel, () => S.seed, (s) => { S.seed = s; generate(); });
      buildControls(panel, [
        { type: 'button', label: '⬆ EXPORT IMAGE', cls: 'primary', onClick: () => saveCanvasImage(canvas, 'lace-' + S.seed) }
      ], S, null);
      generate();
    }
  });
})();
