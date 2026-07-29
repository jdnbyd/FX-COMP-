/* tool_type.js — Typography generator, "address block" style per reference:
   tightly stacked offset color boxes, justified left/right text pairs, caps,
   full control over doc size, font, size, kerning, padding, colors. */

(function () {
  const FONTS = ['Bahnschrift', 'Arial', 'Segoe UI', 'Consolas', 'Georgia', 'Impact', 'Verdana', 'Courier New', 'MarathonGlyph'];

  const S = {
    seed: newSeed(),
    docW: 1080, docH: 1350,
    words: 'MERIDIAN TYPE\n& PRINT WORKS\nREADING|ROOM\n48 MERCER STREET,\nNEW YORK,|NY 10012\nARCHIVE_01|[00]\nSECURITY|CLEARANCE\nTACTICAL|OPERATIONS',
    font: 'Bahnschrift',
    fontSize: 42,        // base px
    sizeJitter: 0.25,
    kerning: 1,          // extra px between chars
    padX: 18, padY: 10,
    rows: 0,             // 0 = random 3..6
    offsetAmt: 0.5,      // stagger amount
    justify: true,       // split rows on | into left/right
    caps: true,
    weight: '600',
    texture: 0.07,
    bg: '#0b0b0b',
    ink: '#141414',
    boxA: '#e8622c', boxB: '#f4c7d4', boxC: '#f5df4d', boxD: '#5661f0',
    multiColor: true,
    clusterAlign: 'center' // left | center | right
  };
  let canvas, wheel, targetSel;

  const PRESETS = [
    { name: 'Lausanne orange', params: { bg: '#0b0b0b', boxA: '#e8622c', multiColor: false, font: 'Bahnschrift', kerning: 1.5, rows: 4 } },
    { name: 'Meridian multi', params: { bg: '#0d0d0d', multiColor: true, rows: 0, offsetAmt: 0.7 } },
    { name: 'Milano pink', params: { bg: '#111', boxA: '#f4b8c8', multiColor: false, kerning: 2, rows: 4, weight: '600' } },
    { name: 'Dessau yellow', params: { bg: '#0a0a0a', boxA: '#f5df4d', multiColor: false, rows: 5, offsetAmt: 0.9 } },
    { name: 'Archive blue', params: { bg: '#08090c', boxA: '#5661f0', boxB: '#c8d4f0', multiColor: true, font: 'Consolas', kerning: 0 } },
    { name: 'Mono terminal', params: { bg: '#06080a', boxA: '#c8f751', multiColor: false, font: 'Consolas', ink: '#06080a', kerning: 3, weight: '400' } },
    { name: 'Paper cream', params: { bg: '#efe9dc', boxA: '#1a1a1a', ink: '#efe9dc', multiColor: false, texture: 0.12 } },
    { name: 'Big impact', params: { fontSize: 64, sizeJitter: 0.4, font: 'Impact', kerning: 4, rows: 3, offsetAmt: 0.3 } },
    { name: 'Tight small print', params: { fontSize: 26, kerning: 0.5, padX: 10, padY: 6, rows: 6, offsetAmt: 1 } },
    { name: 'Serif ledger', params: { font: 'Georgia', weight: '400', caps: false, kerning: 0, boxA: '#ded4c2', ink: '#242018', bg: '#141210', multiColor: false } }
  ];

  function generate() {
    const rng = mulberry32(S.seed);
    const W = clamp(S.docW, 200, 6000), H = clamp(S.docH, 200, 6000);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = S.bg;
    ctx.fillRect(0, 0, W, H);

    const lines = S.words.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;
    const nRows = S.rows > 0 ? Math.min(S.rows, 8) : randInt(rng, 3, 6);
    const boxColors = S.multiColor ? [S.boxA, S.boxB, S.boxC, S.boxD] : [S.boxA];

    // pick rows of text (in order, from a random start)
    const start = randInt(rng, 0, Math.max(0, lines.length - 1));
    const chosen = [];
    for (let i = 0; i < nRows; i++) chosen.push(lines[(start + i) % lines.length]);

    // measure rows
    const rows = chosen.map((text) => {
      const size = S.fontSize * (1 + (rng() - 0.35) * S.sizeJitter * 2);
      let t = S.caps ? text.toUpperCase() : text;
      const parts = S.justify && t.includes('|') ? t.split('|').map((s) => s.trim()) : [t];
      return { parts, size, color: pick(rng, boxColors) };
    });

    ctx.textBaseline = 'middle';
    const tracked = (txt, size) => {
      ctx.font = `${S.weight} ${size}px "${S.font}"`;
      let w = 0;
      for (const ch of txt) w += ctx.measureText(ch).width + S.kerning;
      return Math.max(0, w - S.kerning);
    };

    const maxW = W * 0.86;
    for (const r of rows) {
      r.textW = r.parts.reduce((a, t) => a + tracked(t, r.size), 0);
      const minGap = r.parts.length > 1 ? r.size * 1.2 : 0;
      while (r.textW + minGap + S.padX * 2 > maxW && r.size > 9) {
        r.size *= 0.95;
        r.textW = r.parts.reduce((a, t) => a + tracked(t, r.size), 0);
      }
      r.boxH = r.size + S.padY * 2;
      // box width: single part → fit; two parts → widened with justify gap
      const gapMin = r.parts.length > 1 ? r.size * 1.2 : 0;
      const extra = r.parts.length > 1 ? rng() * (maxW - r.textW - gapMin - S.padX * 2) * 0.7 : 0;
      r.boxW = Math.min(maxW, r.textW + gapMin + extra + S.padX * 2);
    }

    // stack rows touching (no gap) like the reference blocks
    const totalH = rows.reduce((a, r) => a + r.boxH, 0);
    let y = (H - totalH) / 2;
    const widest = Math.max(...rows.map((r) => r.boxW));
    let baseX = S.clusterAlign === 'left' ? W * 0.07
      : S.clusterAlign === 'right' ? W - W * 0.07 - widest
        : (W - widest) / 2;

    for (const r of rows) {
      const off = (rng() - 0.5) * 2 * S.offsetAmt * (widest - r.boxW + W * 0.05);
      const x = clamp(baseX + (widest - r.boxW) / 2 + off, W * 0.02, W - r.boxW - W * 0.02);

      ctx.fillStyle = r.color;
      ctx.fillRect(x, y, r.boxW, r.boxH);

      ctx.fillStyle = S.ink;
      ctx.font = `${S.weight} ${r.size}px "${S.font}"`;
      const cy = y + r.boxH / 2 + r.size * 0.03;
      const drawTracked = (txt, tx) => {
        let cx = tx;
        for (const ch of txt) {
          ctx.fillText(ch, cx, cy);
          cx += ctx.measureText(ch).width + S.kerning;
        }
      };
      if (r.parts.length > 1) {
        drawTracked(r.parts[0], x + S.padX);
        const rw = tracked(r.parts[1], r.size);
        drawTracked(r.parts[1], x + r.boxW - S.padX - rw);
      } else {
        drawTracked(r.parts[0], x + S.padX);
      }
      y += r.boxH;
    }

    drawGrain(ctx, W, H, S.texture, rng);
  }

  window.TOOLS.push({
    id: 'type',
    group: 'TYPOGRAPHY',
    name: 'Type Generator',
    sub: 'stacked block layouts',
    mount(stage, panel) {
      stage.innerHTML = '';
      canvas = document.createElement('canvas');
      canvas.className = 'main-canvas';
      stage.appendChild(canvas);

      panel.innerHTML = '';
      presetRow(panel, PRESETS, (params) => {
        Object.assign(S, params);
        this.mount(stage, panel);
      });
      buildControls(panel, [
        { type: 'section', label: 'Document' },
        { type: 'number', key: 'docW', label: 'Width px', min: 200, max: 6000 },
        { type: 'number', key: 'docH', label: 'Height px', min: 200, max: 6000 },
        { type: 'section', label: 'Content' },
        { type: 'textarea', key: 'words', label: 'Lines (| = justify split)', rows: 6 },
        {
          type: 'select', key: 'rows', label: 'Rows', options: [
            { v: 0, l: 'Random 3–6' }, { v: 2, l: '2' }, { v: 3, l: '3' }, { v: 4, l: '4' }, { v: 5, l: '5' }, { v: 6, l: '6' }, { v: 8, l: '8' }
          ]
        },
        { type: 'section', label: 'Type' },
        { type: 'select', key: 'font', label: 'Font', options: FONTS },
        { type: 'select', key: 'weight', label: 'Weight', options: [{ v: '400', l: 'Regular' }, { v: '600', l: 'Semibold' }, { v: '700', l: 'Bold' }, { v: '800', l: 'Heavy' }] },
        { type: 'range', key: 'fontSize', label: 'Font size', min: 12, max: 120, step: 1 },
        { type: 'range', key: 'sizeJitter', label: 'Size jitter', min: 0, max: 0.8, step: 0.05 },
        { type: 'range', key: 'kerning', label: 'Kerning px', min: -2, max: 12, step: 0.25 },
        { type: 'check', key: 'caps', label: 'All caps' },
        { type: 'check', key: 'justify', label: 'Justify | pairs' },
        { type: 'section', label: 'Boxes' },
        { type: 'range', key: 'padX', label: 'Pad X', min: 2, max: 80, step: 1 },
        { type: 'range', key: 'padY', label: 'Pad Y', min: 2, max: 60, step: 1 },
        { type: 'range', key: 'offsetAmt', label: 'Stagger', min: 0, max: 1, step: 0.05 },
        { type: 'select', key: 'clusterAlign', label: 'Cluster align', options: ['left', 'center', 'right'] },
        { type: 'check', key: 'multiColor', label: 'Multi-color boxes' },
        { type: 'color', key: 'boxA', label: 'Box color A' },
        { type: 'color', key: 'boxB', label: 'Box color B' },
        { type: 'color', key: 'boxC', label: 'Box color C' },
        { type: 'color', key: 'boxD', label: 'Box color D' },
        { type: 'range', key: 'texture', label: 'Texture', min: 0, max: 0.3, step: 0.01 }
      ], S, () => { S.rows = parseInt(S.rows); generate(); });

      panel.appendChild(el('div', 'ctl-section', 'Color — fine tune'));
      const trow = el('div', 'ctl-row');
      trow.appendChild(el('label', null, 'Target'));
      targetSel = document.createElement('select');
      [['bg', 'Background'], ['ink', 'Text ink'], ['boxA', 'Box A'], ['boxB', 'Box B'], ['boxC', 'Box C'], ['boxD', 'Box D']].forEach(([v, l]) => {
        const o = document.createElement('option'); o.value = v; o.textContent = l; targetSel.appendChild(o);
      });
      trow.appendChild(targetSel);
      panel.appendChild(trow);
      const wbox = el('div');
      panel.appendChild(wbox);
      wheel = new ColorWheel(wbox, {
        size: 150,
        onChange: (hex) => { S[targetSel.value] = hex; generate(); }
      });
      wheel.setHex(S.bg);
      targetSel.addEventListener('change', () => wheel.setHex(S[targetSel.value]));

      panel.appendChild(el('div', 'ctl-section', 'Generate'));
      addSeedRow(panel, () => S.seed, (s) => { S.seed = s; generate(); });
      buildControls(panel, [
        { type: 'button', label: '⬆ EXPORT IMAGE', cls: 'primary', onClick: () => saveCanvasImage(canvas, 'type-' + S.seed) }
      ], S, null);
      generate();
    }
  });
})();
