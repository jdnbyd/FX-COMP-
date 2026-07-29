/* tool_micro.js — micrographics: archive/compliance-label kit per reference —
   barcodes, pill words, hex badges, circled letters, [00] index tags,
   dot-matrix text, CE-style marks, warning triangles, crosshairs. */

(function () {
  const S = {
    seed: newSeed(),
    docW: 1200, docH: 1500,
    layout: 'sheet',   // sheet | grid | strip
    density: 22,
    scale: 1,
    text: 'ALL RIGHTS RESERVED\nARCHIVE_01\nWORKS\nCOLLAB\n(NO) FINAL_VERSION\nUNDER CONSTRUCTION\nSIGNAL STUDIO\nATTENTION',
    letters: 'PZSX',
    ink: '#1a1a1a', bg: '#f2efe9', accent: '#e8622c',
    accentRate: 0.1,
    barcodes: true, pills: true, badges: true, tags: true, dotmatrix: true, marks: true,
    useCustoms: true, customScale: 1
  };
  let stageEl, svgText = '';
  const customImgs = []; // {url(dataURL), w, h}

  async function importStamp() {
    const f = await window.native.openMedia('image');
    if (!f) return false;
    let img;
    if (f.kind === 'image-raw') {
      const c0 = document.createElement('canvas');
      c0.width = f.width; c0.height = f.height;
      c0.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(f.data), f.width, f.height), 0, 0);
      img = c0;
    } else {
      img = new Image();
      img.src = f.url;
      await img.decode();
    }
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sc = Math.min(1, 260 / Math.max(iw, ih));
    const c = document.createElement('canvas');
    c.width = Math.round(iw * sc); c.height = Math.round(ih * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    customImgs.push({ url: c.toDataURL('image/png'), w: c.width, h: c.height });
    return true;
  }

  const PRESETS = [
    { name: 'Paper archive', params: { bg: '#f2efe9', ink: '#1a1a1a', accent: '#e8622c', layout: 'sheet', density: 22 } },
    { name: 'Blueprint', params: { bg: '#10265c', ink: '#dfe8ff', accent: '#7da9ff', layout: 'sheet', density: 26 } },
    { name: 'Hazard chart', params: { bg: '#d8e300', ink: '#111111', accent: '#111111', layout: 'grid', density: 18 } },
    { name: 'Terminal black', params: { bg: '#0a0c0e', ink: '#c8f751', accent: '#00e5ff', layout: 'grid', density: 24 } },
    { name: 'Compliance strip', params: { layout: 'strip', density: 14, bg: '#efe9dc', ink: '#191919', accent: '#b03030' } },
    { name: 'Dense sticker sheet', params: { layout: 'sheet', density: 38, scale: 0.75 } },
    { name: 'Sparse spec', params: { layout: 'grid', density: 10, scale: 1.3 } },
    { name: 'Red tape', params: { bg: '#f4f0e8', ink: '#b03030', accent: '#1a1a1a', density: 20 } },
    { name: 'Ghost print', params: { bg: '#e8e6e1', ink: '#9aa0a6', accent: '#6d7a84', density: 24 } },
    { name: 'Inverse lab', params: { bg: '#101216', ink: '#e8e6e1', accent: '#ff3d5a', layout: 'sheet', density: 28 } }
  ];

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const mono = 'Consolas,monospace';
  const sans = 'Bahnschrift,Arial,sans-serif';

  // ---- stamp builders: draw at (x,y), return svg + [w,h] used ----
  function barcode(rng, x, y, s, ink) {
    let out = '', bx = x;
    const hgt = 22 * s;
    for (let i = 0; i < 24; i++) {
      const bw = (rng() < 0.3 ? 3 : rng() < 0.6 ? 1.6 : 0.8) * s;
      if (rng() < 0.72) out += `<rect x="${bx.toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="${hgt.toFixed(1)}" fill="${ink}"/>`;
      bx += bw + 1.1 * s;
    }
    out += `<text x="${x}" y="${(y + hgt + 9 * s).toFixed(1)}" font-family="${mono}" font-size="${(7 * s).toFixed(1)}" fill="${ink}">${Math.floor(rng() * 9e9)}</text>`;
    return [out, bx - x, hgt + 12 * s];
  }
  function pillWord(rng, x, y, s, ink, word) {
    const fs = 15 * s, padX = 10 * s;
    const w = word.length * fs * 0.62 + padX * 2, h = fs * 1.7;
    return [
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h / 2).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="${(1.8 * s).toFixed(1)}"/>` +
      `<text x="${(x + w / 2).toFixed(1)}" y="${(y + h * 0.68).toFixed(1)}" font-family="${sans}" font-weight="700" font-size="${fs.toFixed(1)}" fill="${ink}" text-anchor="middle" letter-spacing="${(1.5 * s).toFixed(1)}">${esc(word)}</text>`,
      w, h
    ];
  }
  function hexBadge(rng, x, y, s, ink, ch) {
    const r = 13 * s;
    const cx = x + r, cy = y + r;
    let pts = '';
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      pts += `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} `;
    }
    return [
      `<polygon points="${pts}" fill="none" stroke="${ink}" stroke-width="${(1.8 * s).toFixed(1)}"/>` +
      `<text x="${cx.toFixed(1)}" y="${(cy + r * 0.36).toFixed(1)}" font-family="${sans}" font-weight="800" font-size="${(r * 1.05).toFixed(1)}" fill="${ink}" text-anchor="middle">${esc(ch)}</text>`,
      r * 2, r * 2
    ];
  }
  function circleBadge(rng, x, y, s, ink, ch) {
    const r = 12 * s;
    return [
      `<circle cx="${(x + r).toFixed(1)}" cy="${(y + r).toFixed(1)}" r="${r.toFixed(1)}" fill="${ink}"/>` +
      `<text x="${(x + r).toFixed(1)}" y="${(y + r * 1.38).toFixed(1)}" font-family="${sans}" font-weight="800" font-size="${(r * 1.1).toFixed(1)}" fill="#ffffff" text-anchor="middle">${esc(ch)}</text>`,
      r * 2, r * 2
    ];
  }
  function indexTag(rng, x, y, s, ink) {
    const n = String(randInt(rng, 0, 15)).padStart(2, '0');
    const fs = 13 * s;
    return [
      `<text x="${x}" y="${(y + fs).toFixed(1)}" font-family="${mono}" font-size="${fs.toFixed(1)}" fill="${ink}">[${n}]</text>`,
      fs * 2.6, fs * 1.3
    ];
  }
  function dotMatrix(rng, x, y, s, ink, word) {
    let out = '';
    const d = 1.6 * s, gap = 3.4 * s;
    // 5x5 dot block prefix
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      if (rng() < 0.75) out += `<circle cx="${(x + c * gap).toFixed(1)}" cy="${(y + r * gap).toFixed(1)}" r="${d.toFixed(1)}" fill="${ink}"/>`;
    }
    const fs = 13 * s;
    out += `<text x="${(x + 4 * gap).toFixed(1)}" y="${(y + fs).toFixed(1)}" font-family="${sans}" font-weight="700" font-size="${fs.toFixed(1)}" fill="${ink}" letter-spacing="${(0.5 * s).toFixed(1)}">${esc(word)}</text>`;
    return [out, 4 * gap + word.length * fs * 0.6, Math.max(5 * gap, fs * 1.3)];
  }
  function boxedLabel(rng, x, y, s, ink, word) {
    const fs = 11 * s, padX = 6 * s;
    const w = word.length * fs * 0.62 + padX * 2, h1 = fs * 1.8;
    return [
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h1.toFixed(1)}" fill="none" stroke="${ink}" stroke-width="${(1.4 * s).toFixed(1)}"/>` +
      `<text x="${(x + w / 2).toFixed(1)}" y="${(y + h1 * 0.66).toFixed(1)}" font-family="${mono}" font-size="${fs.toFixed(1)}" fill="${ink}" text-anchor="middle">[${esc(word)}]</text>`,
      w, h1
    ];
  }
  function warnTriangle(rng, x, y, s, ink) {
    const w = 26 * s;
    return [
      `<path d="M ${(x + w / 2).toFixed(1)} ${y} L ${(x + w).toFixed(1)} ${(y + w * 0.9).toFixed(1)} H ${x} Z" fill="none" stroke="${ink}" stroke-width="${(2 * s).toFixed(1)}" stroke-linejoin="round"/>` +
      `<text x="${(x + w / 2).toFixed(1)}" y="${(y + w * 0.75).toFixed(1)}" font-family="${sans}" font-weight="800" font-size="${(w * 0.55).toFixed(1)}" fill="${ink}" text-anchor="middle">!</text>`,
      w, w
    ];
  }
  function ceMark(rng, x, y, s, ink) {
    const r = 11 * s;
    const arc = (cx) => `<path d="M ${(cx + r * 0.7).toFixed(1)} ${(y + r * 0.15).toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(cx + r * 0.7).toFixed(1)} ${(y + r * 1.85).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="${(2.4 * s).toFixed(1)}"/>`;
    return [arc(x) + arc(x + r * 1.7) +
      `<line x1="${(x + r * 1.75).toFixed(1)}" y1="${(y + r).toFixed(1)}" x2="${(x + r * 2.45).toFixed(1)}" y2="${(y + r).toFixed(1)}" stroke="${ink}" stroke-width="${(2.4 * s).toFixed(1)}"/>`,
      r * 3, r * 2];
  }
  function crosshair(rng, x, y, s, ink) {
    const r = 9 * s;
    return [
      `<path d="M ${x} ${(y + r).toFixed(1)} H ${(x + 2 * r).toFixed(1)} M ${(x + r).toFixed(1)} ${y} V ${(y + 2 * r).toFixed(1)}" stroke="${ink}" stroke-width="${(1.6 * s).toFixed(1)}"/>`,
      r * 2, r * 2
    ];
  }
  function resistorStrip(rng, x, y, s, ink) {
    let out = `<line x1="${x}" y1="${(y + 6 * s).toFixed(1)}" x2="${(x + 90 * s).toFixed(1)}" y2="${(y + 6 * s).toFixed(1)}" stroke="${ink}" stroke-width="${(1.2 * s).toFixed(1)}"/>`;
    for (let i = 0; i < 3; i++) {
      out += `<circle cx="${(x + 24 * s + i * 14 * s).toFixed(1)}" cy="${(y + 6 * s).toFixed(1)}" r="${(4.4 * s).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="${(1.2 * s).toFixed(1)}"/>`;
    }
    out += `<rect x="${(x + 66 * s).toFixed(1)}" y="${(y + 2.6 * s).toFixed(1)}" width="${(11 * s).toFixed(1)}" height="${(6.8 * s).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="${(1.2 * s).toFixed(1)}"/>`;
    return [out, 90 * s, 12 * s];
  }

  function generate() {
    const rng = mulberry32(S.seed);
    const W = S.docW, H = S.docH;
    const words = S.text.split('\n').map((s) => s.trim()).filter(Boolean);
    const letters = (S.letters || 'X').replace(/\s/g, '');
    const wordAt = () => pick(rng, words);
    const chAt = () => letters[randInt(rng, 0, letters.length - 1)];

    const stamps = [];
    if (S.barcodes) stamps.push((r, x, y, s, c) => barcode(r, x, y, s, c));
    if (S.pills) stamps.push((r, x, y, s, c) => pillWord(r, x, y, s, c, wordAt().split(' ')[0] || 'WORKS'));
    if (S.badges) stamps.push((r, x, y, s, c) => hexBadge(r, x, y, s, c, chAt()), (r, x, y, s, c) => circleBadge(r, x, y, s, c, chAt()));
    if (S.tags) stamps.push((r, x, y, s, c) => indexTag(r, x, y, s, c), (r, x, y, s, c) => boxedLabel(r, x, y, s, c, wordAt().slice(0, 14)));
    if (S.dotmatrix) stamps.push((r, x, y, s, c) => dotMatrix(r, x, y, s, c, wordAt()));
    if (S.marks) stamps.push(warnTriangle, ceMark, crosshair, resistorStrip);
    if (S.useCustoms && customImgs.length) {
      for (const ci of customImgs) {
        stamps.push((r, x, y, s) => {
          const w = ci.w * 0.45 * s * S.customScale, h = ci.h * 0.45 * s * S.customScale;
          return [`<image href="${ci.url}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`, w, h];
        });
      }
    }
    if (!stamps.length) stamps.push(crosshair);

    let body = '';
    const put = (x, y, sMul) => {
      const c = rng() < S.accentRate ? S.accent : S.ink;
      const fn = pick(rng, stamps);
      const [svg] = fn(rng, x, y, S.scale * sMul, c);
      body += svg;
    };

    if (S.layout === 'grid') {
      const cell = 150 / Math.sqrt(S.density / 20) * S.scale;
      for (let y = cell * 0.3; y < H - cell; y += cell) {
        for (let x = cell * 0.25; x < W - cell; x += cell * 1.4) {
          if (rng() < 0.85) put(x, y, 0.9 + rng() * 0.4);
        }
      }
    } else if (S.layout === 'strip') {
      const bands = Math.max(2, Math.round(S.density / 4));
      for (let b = 0; b < bands; b++) {
        const y = (H / bands) * b + H / bands * 0.25;
        body += `<line x1="0" y1="${(y - 14 * S.scale).toFixed(1)}" x2="${W}" y2="${(y - 14 * S.scale).toFixed(1)}" stroke="${S.ink}" stroke-width="1"/>`;
        let x = W * 0.04;
        while (x < W * 0.9) {
          put(x, y, 0.9 + rng() * 0.5);
          x += randRange(rng, 90, 220) * S.scale;
        }
      }
    } else { // sheet — clustered scatter
      for (let i = 0; i < S.density; i++) {
        const x = W * (0.05 + rng() * 0.82);
        const y = H * (0.04 + rng() * 0.88);
        put(x, y, 0.8 + rng() * 0.9);
        if (rng() < 0.4) put(x + randRange(rng, 30, 90) * S.scale, y + randRange(rng, 18, 44) * S.scale, 0.7 + rng() * 0.5);
      }
    }

    svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${S.bg}"/>${body}</svg>`;
    stageEl.innerHTML = '';
    const img = new Image();
    img.className = 'main-preview';
    img.src = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
    stageEl.appendChild(img);
  }

  window.TOOLS.push({
    id: 'micro',
    group: 'DESIGN',
    name: 'Micrographics',
    sub: 'archive label kit',
    mount(stage, panel) {
      stageEl = stage;
      panel.innerHTML = '';
      presetRow(panel, PRESETS, (params) => { Object.assign(S, params); this.mount(stage, panel); });
      buildControls(panel, [
        { type: 'section', label: 'Canvas' },
        { type: 'number', key: 'docW', label: 'Width', min: 200, max: 5000 },
        { type: 'number', key: 'docH', label: 'Height', min: 200, max: 5000 },
        { type: 'select', key: 'layout', label: 'Layout', options: [{ v: 'sheet', l: 'Sticker sheet' }, { v: 'grid', l: 'Grid' }, { v: 'strip', l: 'Spec strips' }] },
        { type: 'range', key: 'density', label: 'Density', min: 4, max: 60, step: 1 },
        { type: 'range', key: 'scale', label: 'Mark scale', min: 0.4, max: 2.5, step: 0.05 },
        { type: 'section', label: 'Content' },
        { type: 'textarea', key: 'text', label: 'Words', rows: 4 },
        { type: 'text', key: 'letters', label: 'Badge letters' },
        { type: 'section', label: 'Mark types' },
        { type: 'check', key: 'barcodes', label: 'Barcodes' },
        { type: 'check', key: 'pills', label: 'Pill words' },
        { type: 'check', key: 'badges', label: 'Hex/circle badges' },
        { type: 'check', key: 'tags', label: '[00] tags + boxes' },
        { type: 'check', key: 'dotmatrix', label: 'Dot-matrix text' },
        { type: 'check', key: 'marks', label: 'CE / warning / ticks' },
        { type: 'check', key: 'useCustoms', label: 'My images' },
        { type: 'range', key: 'customScale', label: 'My image scale', min: 0.3, max: 3, step: 0.1 },
        {
          type: 'buttons', items: [
            { label: '⬇ ADD IMAGE', onClick: async () => { if (await importStamp()) { toast(customImgs.length + ' stamp(s) loaded'); generate(); } } },
            { label: 'CLEAR', cls: 'danger', onClick: () => { customImgs.length = 0; generate(); } }
          ]
        },
        { type: 'section', label: 'Color' },
        { type: 'color', key: 'ink', label: 'Ink' },
        { type: 'color', key: 'accent', label: 'Accent' },
        { type: 'range', key: 'accentRate', label: 'Accent rate', min: 0, max: 0.6, step: 0.02 },
        { type: 'color', key: 'bg', label: 'Ground' }
      ], S, generate);
      panel.appendChild(el('div', 'ctl-section', 'Generate'));
      addSeedRow(panel, () => S.seed, (s) => { S.seed = s; generate(); });
      buildControls(panel, [
        {
          type: 'buttons', items: [
            { label: 'SAVE SVG', cls: 'primary', onClick: () => saveSvgText(svgText, 'micro-' + S.seed) },
            { label: 'SAVE PNG', cls: 'primary', onClick: async () => saveCanvasImage(await svgToCanvas(svgText, S.docW, S.docH), 'micro-' + S.seed) }
          ]
        }
      ], S, null);
      generate();
    }
  });
})();
