/* tool_grid.js — random grid/layout generator from a typed document size */

(function () {
  const S = {
    seed: newSeed(),
    docW: 1080,
    docH: 1350,
    showBaseline: true,
    flavor: 'any' // any | columns | modular | manuscript
  };
  let canvas, specEl, seedRow;

  function generate() {
    const rng = mulberry32(S.seed);
    const W = clamp(S.docW, 64, 8000), H = clamp(S.docH, 64, 8000);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0b0e11';
    ctx.fillRect(0, 0, W, H);

    const flavor = S.flavor === 'any' ? pick(rng, ['columns', 'modular', 'manuscript']) : S.flavor;

    // margins proportional to doc, asymmetric sometimes
    const mBase = Math.min(W, H) * randRange(rng, 0.04, 0.1);
    const m = {
      top: mBase * randRange(rng, 0.8, 1.6),
      bottom: mBase * randRange(rng, 1.0, 2.2),
      left: mBase * randRange(rng, 0.8, 1.4),
      right: mBase * randRange(rng, 0.8, 1.4)
    };
    if (rng() < 0.5) { m.right = m.left; } // symmetric half the time

    const innerW = W - m.left - m.right;
    const innerH = H - m.top - m.bottom;
    const gutter = Math.min(W, H) * randRange(rng, 0.012, 0.03);

    let cols = 1, rows = 1;
    if (flavor === 'columns') { cols = pick(rng, [2, 3, 4, 5, 6, 8, 12]); rows = 1; }
    else if (flavor === 'modular') { cols = pick(rng, [3, 4, 5, 6]); rows = pick(rng, [3, 4, 5, 6, 8]); }
    else { cols = 1; rows = 1; }

    const baseline = Math.round(Math.min(W, H) / randInt(rng, 55, 90));

    // draw baseline grid
    if (S.showBaseline) {
      ctx.strokeStyle = 'rgba(0,229,255,0.08)';
      ctx.lineWidth = 1;
      for (let y = m.top; y <= H - m.bottom + 0.5; y += baseline) {
        ctx.beginPath(); ctx.moveTo(m.left, y); ctx.lineTo(W - m.right, y); ctx.stroke();
      }
    }

    // fields
    const colW = (innerW - gutter * (cols - 1)) / cols;
    const rowH = (innerH - gutter * (rows - 1)) / rows;
    ctx.strokeStyle = 'rgba(0,229,255,0.55)';
    ctx.lineWidth = Math.max(1, W / 1200);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = m.left + c * (colW + gutter);
        const y = m.top + r * (rowH + gutter);
        ctx.strokeRect(x, y, colW, rowH);
        ctx.fillStyle = 'rgba(0,229,255,0.04)';
        ctx.fillRect(x, y, colW, rowH);
      }
    }

    // margin frame
    ctx.strokeStyle = 'rgba(200,247,81,0.7)';
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(m.left, m.top, innerW, innerH);
    ctx.setLineDash([]);

    // hang lines (horizontal anchors)
    const hangs = randInt(rng, 1, 3);
    ctx.strokeStyle = 'rgba(255,61,90,0.6)';
    for (let i = 0; i < hangs; i++) {
      const y = m.top + innerH * randRange(rng, 0.12, 0.85);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const spec = [
      `DOC        ${W} × ${H}px`,
      `SYSTEM     ${flavor.toUpperCase()}`,
      `MARGINS    T${m.top.toFixed(0)} B${m.bottom.toFixed(0)} L${m.left.toFixed(0)} R${m.right.toFixed(0)}`,
      `FIELDS     ${cols} × ${rows}`,
      `GUTTER     ${gutter.toFixed(0)}px`,
      `BASELINE   ${baseline}px`,
      `COL WIDTH  ${colW.toFixed(1)}px`
    ].join('\n');
    specEl.textContent = spec;
    S._spec = { W, H, m, cols, rows, gutter, baseline, flavor };
  }

  function exportSVG() {
    const { W, H, m, cols, rows, gutter, baseline } = S._spec;
    const innerW = W - m.left - m.right, innerH = H - m.top - m.bottom;
    const colW = (innerW - gutter * (cols - 1)) / cols;
    const rowH = (innerH - gutter * (rows - 1)) / rows;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    s += `<rect width="${W}" height="${H}" fill="white"/>`;
    if (S.showBaseline) {
      for (let y = m.top; y <= H - m.bottom + 0.5; y += baseline)
        s += `<line x1="${m.left}" y1="${y}" x2="${W - m.right}" y2="${y}" stroke="#9adfff" stroke-width="0.5"/>`;
    }
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const x = m.left + c * (colW + gutter), y = m.top + r * (rowH + gutter);
      s += `<rect x="${x}" y="${y}" width="${colW}" height="${rowH}" fill="none" stroke="#0099cc"/>`;
    }
    s += `<rect x="${m.left}" y="${m.top}" width="${innerW}" height="${innerH}" fill="none" stroke="#88aa00" stroke-dasharray="6 6"/>`;
    s += '</svg>';
    saveSvgText(s, `grid-${S._spec.W}x${S._spec.H}-${S.seed}`);
  }

  window.TOOLS.push({
    id: 'grid',
    group: 'DESIGN',
    name: 'Grid Generator',
    sub: 'random grid per doc size',
    mount(stage, panel) {
      stage.innerHTML = '';
      canvas = document.createElement('canvas');
      canvas.className = 'main-canvas';
      stage.appendChild(canvas);

      panel.innerHTML = '';
      buildControls(panel, [
        { type: 'section', label: 'Document size' },
        { type: 'number', key: 'docW', label: 'Width px', min: 64, max: 8000 },
        { type: 'number', key: 'docH', label: 'Height px', min: 64, max: 8000 },
        {
          type: 'select', key: 'flavor', label: 'System', options: [
            { v: 'any', l: 'Random' }, { v: 'columns', l: 'Column grid' },
            { v: 'modular', l: 'Modular grid' }, { v: 'manuscript', l: 'Manuscript' }
          ]
        },
        { type: 'check', key: 'showBaseline', label: 'Baseline grid' }
      ], S, generate);

      panel.appendChild(el('div', 'ctl-section', 'Generate'));
      seedRow = addSeedRow(panel, () => S.seed, (s) => { S.seed = s; generate(); });

      panel.appendChild(el('div', 'ctl-section', 'Spec'));
      specEl = el('pre', 'hint');
      specEl.style.whiteSpace = 'pre';
      panel.appendChild(specEl);

      buildControls(panel, [
        {
          type: 'buttons', items: [
            { label: 'PNG', cls: 'primary', onClick: () => saveCanvasImage(canvas, 'grid-' + S.seed) },
            { label: 'SVG', cls: 'primary', onClick: exportSVG }
          ]
        }
      ], S, null);
      generate();
    }
  });
})();
