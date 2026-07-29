/* tool_ornament.js — GLYPH FORGE: Marathon-style glyphs, warning plates and
   badge sheets per the reference set. Canvas-rendered so it can use the
   bundled Marathon glyph font and user-imported images. */

(function () {
  const S = {
    seed: newSeed(),
    docW: 1600, docH: 900,
    mode: 'glyphs',       // glyphs | plates | badges
    cols: 6, rowsN: 3,
    res: 6,               // pixel-grid resolution of generated glyphs
    density: 0.45,
    mirror: true,
    rounded: false,
    plusMarks: true,
    useFont: true,
    fontChars: 'ABCDEFXZ01',
    headline: 'ATTENTION!',
    lines: 'DANGER: EXTREME COLD\nNOTICE: LOW-LUMEN AREA\nCAUTION: AIR DISPLACEMENT RISK\nDANGER: LIFE SUPPORT ACTIVE\nNOTICE: KEEP SOUND LEVELS AT 30DBA',
    captions: 'CONTACT WITH EXPOSED SURFACES MAY CAUSE INJURY\nEXCESSIVE BRIGHTNESS DISRUPTS MONITORING\nTAMPERING IS STRICTLY PROHIBITED\nVENT CHAMBER SLOWLY',
    ink: '#111111', bg: '#d8e300', paper: '#0b0b0b',
    useCustoms: true, customScale: 1
  };
  let stageEl, canvas;
  const customImgs = []; // loaded Image elements

  const PRESETS = [
    { name: 'Hazard plates (ref)', params: { mode: 'plates', cols: 3, rowsN: 2, bg: '#d8e300', ink: '#111111', paper: '#0b0b0b' } },
    { name: 'Glyph wall', params: { mode: 'glyphs', cols: 8, rowsN: 5, res: 6, density: 0.45, bg: '#0b0b0b', ink: '#d8e300' } },
    { name: 'EVA glyphs', params: { mode: 'glyphs', cols: 7, rowsN: 4, ink: '#ff7a1a', bg: '#0a0a10', res: 7 } },
    { name: 'Badge sheet', params: { mode: 'badges', cols: 6, rowsN: 4, bg: '#f2efe9', ink: '#1a1a1a' } },
    { name: 'Terminal green', params: { mode: 'glyphs', ink: '#00ff9f', bg: '#050a07', res: 5, density: 0.55 } },
    { name: 'Red alert plates', params: { mode: 'plates', bg: '#ff3d3d', ink: '#0b0b0b', paper: '#0b0b0b', cols: 2, rowsN: 2 } },
    { name: 'Blueprint badges', params: { mode: 'badges', bg: '#10265c', ink: '#dfe8ff', cols: 5, rowsN: 3 } },
    { name: 'Chunky icons', params: { mode: 'glyphs', res: 4, density: 0.55, rounded: true, cols: 5, rowsN: 3 } },
    { name: 'Fine mosaic', params: { mode: 'glyphs', res: 9, density: 0.4, cols: 10, rowsN: 6, plusMarks: false } },
    { name: 'Font specimen', params: { mode: 'badges', useFont: true, fontChars: 'マラソンABXZ019', cols: 8, rowsN: 5 } }
  ];

  async function importCustom() {
    const f = await window.native.openMedia('image');
    if (!f) return false;
    if (f.kind === 'image-raw') {
      const c0 = document.createElement('canvas');
      c0.width = f.width; c0.height = f.height;
      c0.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(f.data), f.width, f.height), 0, 0);
      customImgs.push(c0);
    } else {
      const img = new Image();
      img.src = f.url;
      await img.decode();
      customImgs.push(img);
    }
    return true;
  }

  // ---- blocky mirrored pixel glyph into ctx at (x,y,size) ----
  function pixelGlyph(ctx, rng, x, y, size, ink) {
    const N = Math.round(S.res);
    const cell = size / N;
    const half = Math.ceil(N / 2);
    const grid = [];
    for (let gy = 0; gy < N; gy++) {
      grid[gy] = [];
      for (let gx = 0; gx < half; gx++) grid[gy][gx] = rng() < S.density;
    }
    // guarantee a spine
    for (let gy = 0; gy < N; gy++) if (rng() < 0.5) grid[gy][half - 1] = true;
    ctx.fillStyle = ink;
    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        const sx = gx < half ? gx : (S.mirror ? N - 1 - gx : gx % half);
        if (!grid[gy][sx]) continue;
        const px = x + gx * cell, py = y + gy * cell;
        if (S.rounded) {
          ctx.beginPath();
          ctx.roundRect(px, py, cell * 0.94, cell * 0.94, cell * 0.3);
          ctx.fill();
        } else {
          ctx.fillRect(px, py, cell * 0.94, cell * 0.94);
        }
        // punched hole detail
        if (rng() < 0.14) {
          ctx.clearRect ? 0 : 0;
          ctx.fillStyle = S.mode === 'plates' ? S.bg : (ctx.canvas._bgFill || S.bg);
          ctx.fillRect(px + cell * 0.3, py + cell * 0.3, cell * 0.34, cell * 0.34);
          ctx.fillStyle = ink;
        }
      }
    }
  }

  function plusMark(ctx, x, y, r, ink) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
    ctx.stroke();
  }

  function drawCustom(ctx, rng, x, y, size) {
    const img = pick(rng, customImgs);
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sc = (size / Math.max(iw, ih)) * S.customScale;
    ctx.drawImage(img, x + (size - iw * sc) / 2, y + (size - ih * sc) / 2, iw * sc, ih * sc);
  }

  function fontGlyph(ctx, rng, x, y, size, ink) {
    const chars = S.fontChars || 'X';
    const ch = chars[randInt(rng, 0, chars.length - 1)];
    ctx.fillStyle = ink;
    ctx.font = `${size * 0.9}px "MarathonGlyph", "Bahnschrift", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x + size / 2, y + size / 2);
    ctx.textAlign = 'left';
  }

  // one cell content chooser
  function cellContent(ctx, rng, x, y, size, ink) {
    const opts = ['pixel'];
    if (S.useFont) opts.push('font');
    if (S.useCustoms && customImgs.length) opts.push('img');
    const kind = pick(rng, opts);
    if (kind === 'img') drawCustom(ctx, rng, x, y, size);
    else if (kind === 'font') fontGlyph(ctx, rng, x, y, size, ink);
    else pixelGlyph(ctx, rng, x, y, size, ink);
  }

  // ---- modes ----
  function drawGlyphGrid(ctx, rng, W, H) {
    const cw = W / S.cols, ch = H / S.rowsN;
    const size = Math.min(cw, ch) * 0.62;
    for (let r = 0; r < S.rowsN; r++) {
      for (let c = 0; c < S.cols; c++) {
        const x = c * cw + (cw - size) / 2, y = r * ch + (ch - size) / 2;
        cellContent(ctx, rng, x, y, size, S.ink);
        if (S.plusMarks && ((r + c) % 2 === 0)) plusMark(ctx, c * cw + cw * 0.08, r * ch + ch * 0.1, size * 0.06, S.ink);
      }
    }
  }

  function drawPlates(ctx, rng, W, H) {
    const heads = ['ATTENTION!'];
    const lines = S.lines.split('\n').map((s) => s.trim()).filter(Boolean);
    const caps = S.captions.split('\n').map((s) => s.trim()).filter(Boolean);
    const cw = W / S.cols, ch = H / S.rowsN;
    for (let r = 0; r < S.rowsN; r++) {
      for (let c = 0; c < S.cols; c++) {
        const x = c * cw, y = r * ch;
        const invert = (r + c) % 2 === 1; // alternate yellow/black like the sheet
        const plateBg = invert ? S.paper : S.bg;
        const plateInk = invert ? S.bg : S.ink;
        ctx.fillStyle = plateBg;
        ctx.fillRect(x, y, cw, ch);

        // header band
        const headH = ch * 0.16;
        ctx.fillStyle = S.paper;
        ctx.fillRect(x, y, cw, headH);
        ctx.fillStyle = S.bg;
        ctx.font = `800 ${headH * 0.52}px "Bahnschrift", Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(S.headline || heads[0], x + cw / 2, y + headH / 2);
        // header dashes
        ctx.fillRect(x + cw * 0.05, y + headH * 0.36, cw * 0.07, headH * 0.24);
        ctx.fillRect(x + cw * 0.88, y + headH * 0.36, cw * 0.07, headH * 0.24);

        // subject line
        ctx.fillStyle = plateInk;
        ctx.font = `700 ${ch * 0.055}px "Bahnschrift", Arial, sans-serif`;
        ctx.fillText(pick(rng, lines) || 'NOTICE', x + cw / 2, y + headH + ch * 0.07);

        // center glyph
        const gs = Math.min(cw, ch) * 0.4;
        cellContent(ctx, rng, x + (cw - gs) / 2, y + headH + ch * 0.13, gs, plateInk);

        // plus marks corners
        if (S.plusMarks) {
          plusMark(ctx, x + cw * 0.08, y + headH + ch * 0.16, gs * 0.07, plateInk);
          plusMark(ctx, x + cw * 0.92, y + headH + ch * 0.16, gs * 0.07, plateInk);
          plusMark(ctx, x + cw * 0.08, y + ch * 0.78, gs * 0.07, plateInk);
          plusMark(ctx, x + cw * 0.92, y + ch * 0.78, gs * 0.07, plateInk);
        }

        // caption
        ctx.font = `600 ${ch * 0.035}px "Bahnschrift", Arial, sans-serif`;
        ctx.fillText(pick(rng, caps) || '', x + cw / 2, y + ch * 0.88);

        // micro strip
        ctx.font = `${ch * 0.028}px Consolas, monospace`;
        ctx.textAlign = 'left';
        ctx.fillText('UESC —▮▮— ' + Math.floor(rng() * 999), x + cw * 0.04, y + ch * 0.955);
        ctx.textAlign = 'center';
        ctx.strokeStyle = plateInk;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
      }
    }
    ctx.textAlign = 'left';
  }

  function drawBadges(ctx, rng, W, H) {
    const cw = W / S.cols, ch = H / S.rowsN;
    for (let r = 0; r < S.rowsN; r++) {
      for (let c = 0; c < S.cols; c++) {
        const cx = c * cw + cw / 2, cy = r * ch + ch / 2;
        const R = Math.min(cw, ch) * 0.32;
        const shape = pick(rng, ['hex', 'circle', 'square', 'shield']);
        ctx.strokeStyle = S.ink;
        ctx.lineWidth = Math.max(1.5, R * 0.09);
        ctx.beginPath();
        if (shape === 'hex') {
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + i * Math.PI / 3;
            const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
        } else if (shape === 'circle') ctx.arc(cx, cy, R, 0, Math.PI * 2);
        else if (shape === 'square') ctx.rect(cx - R, cy - R, R * 2, R * 2);
        else {
          ctx.moveTo(cx - R, cy - R * 0.7);
          ctx.lineTo(cx + R, cy - R * 0.7);
          ctx.lineTo(cx + R * 0.8, cy + R * 0.5);
          ctx.lineTo(cx, cy + R);
          ctx.lineTo(cx - R * 0.8, cy + R * 0.5);
          ctx.closePath();
        }
        ctx.stroke();
        cellContent(ctx, rng, cx - R * 0.62, cy - R * 0.62, R * 1.24, S.ink);
        // index tag
        ctx.fillStyle = S.ink;
        ctx.font = `${R * 0.28}px Consolas, monospace`;
        ctx.fillText('[' + String(r * S.cols + c).padStart(2, '0') + ']', cx + R * 0.7, cy - R * 0.85);
      }
    }
  }

  async function generate() {
    try { await document.fonts.load('20px "MarathonGlyph"'); } catch (e) { /* font optional */ }
    const rng = mulberry32(S.seed);
    const W = S.docW, H = S.docH;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = S.mode === 'plates' ? S.paper : S.bg;
    canvas._bgFill = ctx.fillStyle;
    ctx.fillRect(0, 0, W, H);
    if (S.mode === 'plates') drawPlates(ctx, rng, W, H);
    else if (S.mode === 'badges') drawBadges(ctx, rng, W, H);
    else drawGlyphGrid(ctx, rng, W, H);
  }

  window.TOOLS.push({
    id: 'ornament',
    group: 'DESIGN',
    name: 'Glyph Forge',
    sub: 'marathon glyphs · plates · badges',
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
        { type: 'number', key: 'docW', label: 'Width', min: 400, max: 6000 },
        { type: 'number', key: 'docH', label: 'Height', min: 300, max: 6000 },
        { type: 'select', key: 'mode', label: 'Mode', options: [{ v: 'glyphs', l: 'Glyph grid' }, { v: 'plates', l: 'Warning plates' }, { v: 'badges', l: 'Badge sheet' }] },
        { type: 'range', key: 'cols', label: 'Columns', min: 1, max: 12, step: 1 },
        { type: 'range', key: 'rowsN', label: 'Rows', min: 1, max: 8, step: 1 },
        { type: 'section', label: 'Glyph build' },
        { type: 'range', key: 'res', label: 'Pixel res', min: 3, max: 12, step: 1 },
        { type: 'range', key: 'density', label: 'Density', min: 0.15, max: 0.8, step: 0.05 },
        { type: 'check', key: 'mirror', label: 'Mirror symmetry' },
        { type: 'check', key: 'rounded', label: 'Rounded pixels' },
        { type: 'check', key: 'plusMarks', label: 'Plus marks' },
        { type: 'check', key: 'useFont', label: 'Marathon font glyphs' },
        { type: 'text', key: 'fontChars', label: 'Font chars' },
        { type: 'section', label: 'My images' },
        { type: 'check', key: 'useCustoms', label: 'Use my images' },
        { type: 'range', key: 'customScale', label: 'Image scale', min: 0.3, max: 2, step: 0.1 },
        {
          type: 'buttons', items: [
            { label: '⬇ ADD IMAGE', onClick: async () => { if (await importCustom()) { toast(customImgs.length + ' image(s)'); generate(); } } },
            { label: 'CLEAR', cls: 'danger', onClick: () => { customImgs.length = 0; generate(); } }
          ]
        },
        { type: 'section', label: 'Plate text' },
        { type: 'text', key: 'headline', label: 'Header' },
        { type: 'textarea', key: 'lines', label: 'Subjects', rows: 3 },
        { type: 'textarea', key: 'captions', label: 'Captions', rows: 3 },
        { type: 'section', label: 'Color' },
        { type: 'color', key: 'ink', label: 'Ink' },
        { type: 'color', key: 'bg', label: 'Field' },
        { type: 'color', key: 'paper', label: 'Plate dark' }
      ], S, generate);
      panel.appendChild(el('div', 'ctl-section', 'Generate'));
      addSeedRow(panel, () => S.seed, (s) => { S.seed = s; generate(); });
      buildControls(panel, [
        { type: 'button', label: '⬆ EXPORT IMAGE', cls: 'primary', onClick: () => saveCanvasImage(canvas, 'glyphforge-' + S.seed) }
      ], S, null);
      generate();
    }
  });
})();
