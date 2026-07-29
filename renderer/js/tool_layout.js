/* tool_layout.js — Layout Engine: random content placement on a user-defined
   grid, with modular type scales (golden ratio, major third, …) that can be
   rerolled independently of the layout. */

(function () {
  const SCALES = {
    'Golden ratio 1.618': 1.618,
    'Major third 1.25': 1.25,
    'Minor third 1.2': 1.2,
    'Perfect fourth 1.333': 1.333,
    'Aug. fourth 1.414': 1.414,
    'Perfect fifth 1.5': 1.5,
    'Major sixth 1.667': 1.667,
    'Octave 2.0': 2.0
  };
  const SCALE_NAMES = Object.keys(SCALES);

  const S = {
    seed: newSeed(),
    scaleSeed: newSeed(),
    docW: 1080, docH: 1350,
    cols: 6, rowsN: 8, gutter: 16, margin: 64,
    scale: SCALE_NAMES[0],
    baseSize: 16,
    headline: 'THE SECURITY MOIRÉ',
    body: 'Random layout engine — content blocks snap to your grid, type sizes climb a modular scale.',
    showGrid: true,
    ink: '#eaf6f9', accent: '#c8f751', bg: '#0b0e11'
  };
  let canvas, scaleInfoEl;

  function cellRect(c, r, spanC, spanR) {
    const innerW = S.docW - S.margin * 2, innerH = S.docH - S.margin * 2;
    const cw = (innerW - S.gutter * (S.cols - 1)) / S.cols;
    const rh = (innerH - S.gutter * (S.rowsN - 1)) / S.rowsN;
    return {
      x: S.margin + c * (cw + S.gutter),
      y: S.margin + r * (rh + S.gutter),
      w: cw * spanC + S.gutter * (spanC - 1),
      h: rh * spanR + S.gutter * (spanR - 1)
    };
  }

  function generate() {
    const rng = mulberry32(S.seed);
    const W = S.docW, H = S.docH;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = S.bg;
    ctx.fillRect(0, 0, W, H);

    const ratio = SCALES[S.scale];
    const sizes = [];
    for (let i = 0; i < 7; i++) sizes.push(S.baseSize * Math.pow(ratio, i));
    scaleInfoEl.textContent = 'SCALE  ' + sizes.map((s) => s.toFixed(1)).join(' · ');

    if (S.showGrid) {
      ctx.strokeStyle = 'rgba(0,229,255,0.12)';
      ctx.lineWidth = 1;
      for (let c = 0; c < S.cols; c++) for (let r = 0; r < S.rowsN; r++) {
        const rc = cellRect(c, r, 1, 1);
        ctx.strokeRect(rc.x, rc.y, rc.w, rc.h);
      }
    }

    // occupancy map so blocks don't overlap
    const occ = Array.from({ length: S.rowsN }, () => new Array(S.cols).fill(false));
    const place = (spanC, spanR) => {
      const spots = [];
      for (let r = 0; r <= S.rowsN - spanR; r++) {
        for (let c = 0; c <= S.cols - spanC; c++) {
          let free = true;
          for (let rr = r; rr < r + spanR && free; rr++)
            for (let cc = c; cc < c + spanC && free; cc++)
              if (occ[rr][cc]) free = false;
          if (free) spots.push([c, r]);
        }
      }
      if (!spots.length) return null;
      const [c, r] = pick(rng, spots);
      for (let rr = r; rr < r + spanR; rr++)
        for (let cc = c; cc < c + spanC; cc++) occ[rr][cc] = true;
      return cellRect(c, r, spanC, spanR);
    };

    // headline block
    const hSpanC = randInt(rng, Math.ceil(S.cols * 0.5), S.cols);
    const hSpanR = randInt(rng, 1, Math.max(1, Math.floor(S.rowsN / 3)));
    const hr = place(hSpanC, hSpanR);
    if (hr) {
      const level = randInt(rng, 4, 6);
      let fs = sizes[level];
      ctx.textBaseline = 'top';
      ctx.font = `800 ${fs}px "Bahnschrift", sans-serif`;
      while (ctx.measureText(S.headline).width > hr.w && fs > 10) {
        fs *= 0.93;
        ctx.font = `800 ${fs}px "Bahnschrift", sans-serif`;
      }
      ctx.fillStyle = S.ink;
      ctx.fillText(S.headline, hr.x, hr.y + (hr.h - fs) / 2);
    }

    // image placeholders
    const nImgs = randInt(rng, 1, 3);
    for (let i = 0; i < nImgs; i++) {
      const rc = place(randInt(rng, 2, Math.max(2, Math.floor(S.cols / 2))), randInt(rng, 2, Math.max(2, Math.floor(S.rowsN / 2))));
      if (!rc) continue;
      ctx.fillStyle = 'rgba(0,229,255,0.14)';
      ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      ctx.strokeStyle = 'rgba(0,229,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rc.x, rc.y, rc.w, rc.h);
      ctx.beginPath();
      ctx.moveTo(rc.x, rc.y); ctx.lineTo(rc.x + rc.w, rc.y + rc.h);
      ctx.moveTo(rc.x + rc.w, rc.y); ctx.lineTo(rc.x, rc.y + rc.h);
      ctx.stroke();
    }

    // body text block(s)
    const nBody = randInt(rng, 1, 2);
    for (let i = 0; i < nBody; i++) {
      const rc = place(randInt(rng, 2, Math.max(2, Math.ceil(S.cols / 2))), randInt(rng, 1, 3));
      if (!rc) continue;
      const fs = sizes[0];
      ctx.font = `400 ${fs}px "Segoe UI", sans-serif`;
      ctx.fillStyle = S.ink;
      wrapText(ctx, S.body, rc.x, rc.y, rc.w, fs * 1.5, rc.h);
    }

    // accent element
    const rc = place(1, 1);
    if (rc) {
      ctx.fillStyle = S.accent;
      const kind = pick(rng, ['dot', 'bar', 'tri']);
      if (kind === 'dot') {
        ctx.beginPath();
        ctx.arc(rc.x + rc.w / 2, rc.y + rc.h / 2, Math.min(rc.w, rc.h) * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'bar') {
        ctx.fillRect(rc.x, rc.y + rc.h * 0.4, rc.w, rc.h * 0.2);
      } else {
        ctx.beginPath();
        ctx.moveTo(rc.x, rc.y + rc.h);
        ctx.lineTo(rc.x + rc.w / 2, rc.y);
        ctx.lineTo(rc.x + rc.w, rc.y + rc.h);
        ctx.closePath();
        ctx.fill();
      }
    }

    // caption strip with scale info
    ctx.font = `600 ${sizes[0] * 0.75}px Consolas, monospace`;
    ctx.fillStyle = S.accent;
    ctx.fillText(`${S.scale.toUpperCase()} — BASE ${S.baseSize}px`, S.margin, H - S.margin * 0.7);
  }

  function wrapText(ctx, text, x, y, maxW, lineH, maxH) {
    const words = text.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = w;
        yy += lineH;
        if (yy > y + maxH - lineH) return;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
  }

  window.TOOLS.push({
    id: 'layout',
    group: 'DESIGN',
    name: 'Layout Engine',
    sub: 'grid placement + modular scale',
    mount(stage, panel) {
      stage.innerHTML = '';
      canvas = document.createElement('canvas');
      canvas.className = 'main-canvas';
      stage.appendChild(canvas);

      panel.innerHTML = '';
      buildControls(panel, [
        { type: 'section', label: 'Your grid' },
        { type: 'number', key: 'docW', label: 'Doc width', min: 200, max: 6000 },
        { type: 'number', key: 'docH', label: 'Doc height', min: 200, max: 6000 },
        { type: 'range', key: 'cols', label: 'Columns', min: 2, max: 12, step: 1 },
        { type: 'range', key: 'rowsN', label: 'Rows', min: 2, max: 14, step: 1 },
        { type: 'range', key: 'gutter', label: 'Gutter', min: 0, max: 64, step: 2 },
        { type: 'range', key: 'margin', label: 'Margin', min: 0, max: 240, step: 4 },
        { type: 'check', key: 'showGrid', label: 'Show grid' },
        { type: 'section', label: 'Content' },
        { type: 'text', key: 'headline', label: 'Headline' },
        { type: 'textarea', key: 'body', label: 'Body', rows: 3 },
        { type: 'section', label: 'Modular scale' },
        { type: 'select', key: 'scale', label: 'Scale', options: SCALE_NAMES },
        { type: 'range', key: 'baseSize', label: 'Base size', min: 10, max: 32, step: 1 },
        {
          type: 'button', label: '⟳ RANDOM SCALE', cls: 'accent', onClick: () => {
            const rng = mulberry32(newSeed());
            S.scale = pick(rng, SCALE_NAMES);
            S.baseSize = randInt(rng, 12, 22);
            mountScaleWidgets();
            generate();
          }
        }
      ], S, generate);

      scaleInfoEl = el('div', 'hint');
      panel.appendChild(scaleInfoEl);

      panel.appendChild(el('div', 'ctl-section', 'Generate'));
      addSeedRow(panel, () => S.seed, (s) => { S.seed = s; generate(); });
      buildControls(panel, [
        { type: 'button', label: '⬆ EXPORT IMAGE', cls: 'primary', onClick: () => saveCanvasImage(canvas, 'layout-' + S.seed) }
      ], S, null);

      function mountScaleWidgets() {
        // sync the select/range widgets after RANDOM SCALE
        panel.querySelectorAll('select').forEach((sel) => {
          if ([...sel.options].some((o) => o.value === S.scale)) sel.value = S.scale;
        });
      }
      generate();
    }
  });
})();
