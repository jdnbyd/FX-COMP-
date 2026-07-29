/* tool_fx.js — FX Compositor: import image/video, run the effect stack
   (Color Correct → Bevel → Dither → Airbrush → Riso → Paper Scan → Reeded
   Glass → Scanlines → Motion Trails), preview live, export stills or video. */

(function () {
  const FX_LIST = [
    { key: 'cc', label: 'Color Correct', mod: () => FXColor, kind: 'id' },
    { key: 'grad', label: 'Gradient Layer', mod: () => FXGrad, kind: 'canvas' },
    { key: 'bevel', label: 'Bevel & Emboss', mod: () => FXBevel, kind: 'id' },
    { key: 'dither', label: 'Palette Dither', mod: () => FXDither, kind: 'dither' },
    { key: 'air', label: 'Vintage Airbrush', mod: () => FXAir, kind: 'id' },
    { key: 'riso', label: 'Risograph', mod: () => FXRiso, kind: 'id' },
    { key: 'paper', label: 'Paper Scan', mod: () => FXPaper, kind: 'id' },
    { key: 'reeded', label: 'Reeded Glass', mod: () => FXReeded, kind: 'idmeta' },
    { key: 'psort', label: 'Pixel Sort', mod: () => FXSort, kind: 'id' },
    { key: 'scan', label: 'Scanlines', mod: () => FXScan, kind: 'canvas' },
    { key: 'anoise', label: 'Animated Grain', mod: () => FXNoise, kind: 'idmeta' },
    { key: 'trails', label: 'Motion Trails', mod: () => FXTrails, kind: 'idmeta' }
  ];
  const DEFAULT_ORDER = FX_LIST.map((f) => f.key);
  const byKey = (k) => FX_LIST.find((f) => f.key === k);

  const S = {
    source: null,
    playing: false,
    rafId: 0,
    frame: 0,
    previewMaxW: 880,
    customPalette: JSON.parse(localStorage.getItem('sig.fx.custom') || 'null') ||
      ['#0a0a0a', '#ff2079', '#00f0ff', '#c8f751', '#ffe600', '#9d00ff',
        '#1e1b4b', '#7c3aed', '#f0abfc', '#118ab2', '#06d6a0', '#e63329',
        '#f7d038', '#a4133c', '#e9d8a6', '#5c33a4', '#38c7d8', '#ffffff'],
    adaptiveCache: null,
    order: null
  };
  for (const fx of FX_LIST) S[fx.key] = { on: false, ...fx.mod().defaults };
  // effect order — persisted, validated against the registry
  (function initOrder() {
    let o = JSON.parse(localStorage.getItem('sig.fx.order') || 'null') || DEFAULT_ORDER;
    o = o.filter((k) => byKey(k));
    for (const k of DEFAULT_ORDER) if (!o.includes(k)) o.push(k);
    S.order = o;
  })();
  function saveOrder() { localStorage.setItem('sig.fx.order', JSON.stringify(S.order)); }

  // per-effect state persistence so live tweaks survive reloads / restarts
  (function initState() {
    const saved = JSON.parse(localStorage.getItem('sig.fx.state') || 'null');
    if (saved) for (const fx of FX_LIST) if (saved[fx.key]) Object.assign(S[fx.key], saved[fx.key]);
  })();
  function saveFxState() {
    const snap = {};
    for (const fx of FX_LIST) snap[fx.key] = { ...S[fx.key] };
    localStorage.setItem('sig.fx.state', JSON.stringify(snap));
  }

  let canvas, ctx, stageEl, panelEl, swatchEls = [], fileInfoEl, playBtn, scrubEl, presetSel;
  let exporting = false;

  function saveCustom() { localStorage.setItem('sig.fx.custom', JSON.stringify(S.customPalette)); }

  // in-app name prompt — Electron's window.prompt() is a no-op, so presets never saved
  function inlinePrompt(title, cb) {
    const back = el('div', 'sig-modal-back');
    const box = el('div', 'sig-modal');
    box.appendChild(el('div', 'sig-modal-title', title));
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'sig-modal-input'; inp.placeholder = 'name…';
    box.appendChild(inp);
    const row = el('div', 'btn-row');
    const ok = el('button', 'btn primary', 'SAVE');
    const cancel = el('button', 'btn', 'CANCEL');
    row.appendChild(ok); row.appendChild(cancel);
    box.appendChild(row);
    back.appendChild(box);
    document.body.appendChild(back);
    inp.focus();
    const close = () => back.remove();
    const submit = () => { const v = inp.value.trim(); close(); if (v) cb(v); };
    ok.addEventListener('click', submit);
    cancel.addEventListener('click', close);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      else if (e.key === 'Escape') close();
    });
  }

  // ---------- pipeline ----------
  function renderPipeline(targetCanvas, srcW, srcH, meta) {
    meta = meta || { time: 0, frame: S.frame, reset: false };
    const tctx = targetCanvas.getContext('2d', { willReadFrequently: true });
    targetCanvas.width = srcW; targetCanvas.height = srcH;
    tctx.drawImage(S.source.el, 0, 0, srcW, srcH);

    let id = null;
    const flush = () => { if (id) { tctx.putImageData(id, 0, 0); id = null; } };
    const grab = () => { if (!id) id = tctx.getImageData(0, 0, srcW, srcH); return id; };

    for (const key of S.order) {
      const fx = byKey(key);
      if (!fx) continue;
      const st = S[fx.key];
      if (!st.on) continue;
      const mod = fx.mod();
      if (fx.kind === 'canvas') {
        flush();
        const outC = mod.apply(targetCanvas, st);
        tctx.drawImage(outC, 0, 0);
      } else if (fx.kind === 'dither') {
        let pal;
        if (st.paletteMode === 'adaptive') {
          if (!S.adaptiveCache) S.adaptiveCache = mod.resolvePalette(st, S.customPalette, grab());
          pal = S.adaptiveCache;
        } else {
          pal = mod.resolvePalette(st, S.customPalette, null);
        }
        id = mod.apply(grab(), st, pal);
      } else if (fx.kind === 'idmeta') {
        id = mod.apply(grab(), st, meta);
      } else {
        id = mod.apply(grab(), st);
      }
    }
    flush();
  }

  function previewSize() {
    const sc = Math.min(1, S.previewMaxW / S.source.w);
    return [Math.round(S.source.w * sc), Math.round(S.source.h * sc)];
  }

  // Render at the SAME working resolution as the live preview, then scale to the
  // requested output size. This makes exports match the preview: every
  // pixel-space effect (blur radius, grain size, scanline spacing, dither step)
  // runs at preview scale instead of full res, where it would look weaker/sharper.
  function renderToOutput(target, outW, outH, meta) {
    const [ww, wh] = previewSize();
    const work = document.createElement('canvas');
    renderPipeline(work, ww, wh, meta);
    target.width = outW; target.height = outH;
    const tctx = target.getContext('2d');
    tctx.imageSmoothingEnabled = true;
    tctx.imageSmoothingQuality = 'high';
    tctx.drawImage(work, 0, 0, outW, outH);
  }

  function render() {
    if (!S.source) return;
    const [pw, ph] = previewSize();
    const t = S.source.type === 'video' ? S.source.el.currentTime : 0;
    renderPipeline(canvas, pw, ph, { time: t, frame: S.frame++, reset: false });
  }

  function loop() {
    if (!S.playing) return;
    render();
    if (scrubEl && S.source.type === 'video') {
      scrubEl.value = (S.source.el.currentTime / (S.source.el.duration || 1)) * 1000;
    }
    S.rafId = requestAnimationFrame(loop);
  }

  function invalidate() {
    if (S.dither.paletteMode === 'adaptive') S.adaptiveCache = null;
    FXTrails.reset();
    saveFxState();
    if (!S.playing) render();
  }

  // ---------- import ----------
  async function importMedia() {
    const f = await window.native.openMedia('any');
    if (!f) return;
    await loadFromDescriptor(f);
  }

  async function loadFromDescriptor(f) {
    stopPlayback();
    setStatus('LOADING ' + f.path);

    if (f.kind === 'image-raw') {
      const c = document.createElement('canvas');
      c.width = f.width; c.height = f.height;
      const id = new ImageData(new Uint8ClampedArray(f.data), f.width, f.height);
      c.getContext('2d').putImageData(id, 0, 0);
      setSource({ type: 'image', el: c, w: f.width, h: f.height, path: f.path });
    } else if (f.kind === 'video') {
      let url = f.url, path = f.path;
      if (f.ext === 'mov') {
        setStatus('CONVERTING MOV → MP4 …');
        setProgress(0.05);
        try {
          const conv = await window.native.convertMov(f.path);
          url = conv.url; path = conv.path;
          toast('MOV converted to MP4');
        } catch (err) {
          toast('Convert failed: ' + err.message);
          setProgress(null);
          return;
        }
        setProgress(null);
      }
      const v = document.createElement('video');
      v.muted = true; v.loop = true;
      v.src = url;
      await new Promise((res, rej) => {
        v.onloadedmetadata = res;
        v.onerror = () => rej(new Error('video load failed'));
      }).catch((e) => { toast(e.message); });
      if (!v.videoWidth) { toast('Could not decode video'); return; }
      setSource({ type: 'video', el: v, w: v.videoWidth, h: v.videoHeight, path, origPath: f.path });
    } else {
      const img = new Image();
      img.src = f.url;
      await img.decode();
      setSource({ type: 'image', el: img, w: img.naturalWidth, h: img.naturalHeight, path: f.path });
    }
  }

  function setSource(src) {
    src.name = (src.path || 'untitled').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
    S.source = src;
    S.adaptiveCache = null;
    FXTrails.reset();
    stageEl.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.className = 'main-canvas';
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    stageEl.appendChild(canvas);
    fileInfoEl.textContent = `${src.name} — ${src.w}×${src.h}` +
      (src.type === 'video' ? ` — ${src.el.duration.toFixed(2)}s` : '');
    playBtn.style.display = src.type === 'video' ? '' : 'none';
    scrubEl.parentElement.style.display = src.type === 'video' ? '' : 'none';
    setStatus('SOURCE LOADED — ' + src.name);
    render();
  }

  function stopPlayback() {
    S.playing = false;
    cancelAnimationFrame(S.rafId);
    if (S.source && S.source.type === 'video') S.source.el.pause();
    if (playBtn) playBtn.textContent = '▶ PLAY';
  }

  function togglePlay() {
    if (!S.source || S.source.type !== 'video') return;
    if (S.playing) { stopPlayback(); render(); return; }
    S.playing = true;
    S.source.el.play();
    playBtn.textContent = '❚❚ PAUSE';
    loop();
  }

  // ---------- presets (full stack) ----------
  function loadPresets() { return JSON.parse(localStorage.getItem('sig.fx.presets') || '{}'); }
  function refreshPresetList() {
    presetSel.innerHTML = '<option value="">— preset —</option>';
    for (const name of Object.keys(window.STACK_PRESETS)) {
      const o = document.createElement('option');
      o.value = '★' + name; o.textContent = '★ ' + name;
      presetSel.appendChild(o);
    }
    for (const name of Object.keys(loadPresets())) {
      const o = document.createElement('option');
      o.value = name; o.textContent = name;
      presetSel.appendChild(o);
    }
  }
  function savePreset() {
    inlinePrompt('SAVE PRESET AS', (name) => {
      const ps = loadPresets();
      const snap = { customPalette: S.customPalette.slice(), order: S.order.slice() };
      for (const fx of FX_LIST) snap[fx.key] = { ...S[fx.key] };
      ps[name] = snap;
      localStorage.setItem('sig.fx.presets', JSON.stringify(ps));
      refreshPresetList();
      presetSel.value = name;
      toast('PRESET SAVED — ' + name);
    });
  }
  function applyPreset() {
    let p;
    if (presetSel.value.startsWith('★')) {
      const stack = window.STACK_PRESETS[presetSel.value.slice(1)];
      if (!stack) return;
      for (const fx of FX_LIST) S[fx.key] = { on: false, ...fx.mod().defaults };
      for (const key of Object.keys(stack)) Object.assign(S[key], stack[key]);
    } else {
      p = loadPresets()[presetSel.value];
      if (!p) return;
      for (const fx of FX_LIST) if (p[fx.key]) Object.assign(S[fx.key], p[fx.key]);
      if (p.customPalette) { S.customPalette = p.customPalette.slice(); saveCustom(); }
      if (p.order) {
        S.order = p.order.filter((k) => byKey(k));
        for (const k of DEFAULT_ORDER) if (!S.order.includes(k)) S.order.push(k);
        saveOrder();
      }
    }
    buildPanel();
    buildDock();
    invalidate(); render();
    toast('PRESET LOADED');
  }
  function deletePreset() {
    if (!presetSel.value || presetSel.value.startsWith('★')) return;
    const ps = loadPresets();
    delete ps[presetSel.value];
    localStorage.setItem('sig.fx.presets', JSON.stringify(ps));
    refreshPresetList();
  }

  // ---------- export ----------
  async function exportImage() {
    if (!S.source) { toast('Import media first'); return; }
    stopPlayback();
    const full = document.createElement('canvas');
    setStatus('RENDERING …');
    await new Promise((r) => setTimeout(r, 20));
    FXTrails.reset();
    renderToOutput(full, S.source.w, S.source.h, { time: 0, frame: 0, reset: true });
    await saveCanvasImage(full, S.source.name + '-fx');
    setStatus('READY');
  }

  async function exportVideo(opts) {
    const { fps, scalePct, withAudio } = opts;
    if (!S.source || S.source.type !== 'video') { toast('Import a video first'); return { ok: false, error: 'no video' }; }
    if (exporting) return { ok: false, error: 'busy' };
    const outPath = opts.outPath || await window.native.chooseSavePath({
      defaultName: S.source.name + '-fx.mp4',
      filters: [{ name: 'MP4', extensions: ['mp4'] }, { name: 'MOV', extensions: ['mov'] }]
    });
    if (!outPath) return { ok: false, error: 'cancelled' };

    exporting = true;
    stopPlayback();
    const v = S.source.el;
    const scale = scalePct / 100;
    const w = Math.round(S.source.w * scale / 2) * 2;
    const h = Math.round(S.source.h * scale / 2) * 2;
    const dur = Math.min(v.duration, opts.maxSeconds || Infinity);
    const frames = Math.max(1, Math.floor(dur * fps));
    const work = document.createElement('canvas');

    try {
      await window.native.vexStart({
        outPath, fps,
        audioPath: withAudio ? (S.source.origPath || S.source.path) : null
      });
      v.pause(); v.loop = false;
      FXTrails.reset();
      for (let i = 0; i < frames; i++) {
        const t = Math.min(i / fps, v.duration - 0.001);
        await new Promise((res) => {
          const done = () => { v.removeEventListener('seeked', done); res(); };
          v.addEventListener('seeked', done);
          v.currentTime = t;
        });
        renderToOutput(work, w, h, { time: t, frame: i, reset: i === 0 });
        const u8 = await canvasToU8(work, 'image/png');
        await window.native.vexFrame(u8);
        setProgress(i / frames);
        setStatus(`ENCODING FRAME ${i + 1}/${frames}`);
      }
      setStatus('FINALIZING …');
      const code = await window.native.vexEnd();
      setProgress(null);
      v.loop = true;
      setStatus('READY');
      if (code === 0) toast('VIDEO SAVED → ' + outPath);
      else toast('ffmpeg exited with code ' + code);
      return { ok: code === 0, outPath, frames, error: code === 0 ? null : 'ffmpeg exit ' + code };
    } catch (err) {
      setProgress(null);
      toast('Export failed: ' + err.message);
      return { ok: false, error: err.message };
    } finally {
      exporting = false;
    }
  }

  async function openPath(d) {
    const f = await window.native.loadMedia(d.path);
    if (!f) return;
    await loadFromDescriptor(f);
    if (d.autotest && S.source && S.source.type === 'video') {
      S.scan.on = true;
      S.dither.on = true;
      S.riso.on = true;
      S.trails.on = true;
      S.grad.on = true;
      S.anoise.on = true;
      buildPanel();
      render();
      const res = await exportVideo({ fps: 24, scalePct: 50, withAudio: true, outPath: d.autotestOut, maxSeconds: 2 });
      console.error('[AUTOTEST] ' + JSON.stringify(res));
    }
  }
  window.FXTool = { openPath };

  // ---------- palette editor (dither) ----------
  function paletteEditorUI(box) {
    box.appendChild(el('div', 'ctl-section', 'Dither palette'));
    const st = S.dither;

    const modeRow = el('div', 'ctl-row');
    modeRow.appendChild(el('label', null, 'Mode'));
    const modeSel = document.createElement('select');
    [['adaptive', 'Adaptive (from image)'], ['curated', 'Curated'], ['custom', 'Custom']].forEach(([v, l]) => {
      const o = document.createElement('option'); o.value = v; o.textContent = l; modeSel.appendChild(o);
    });
    modeSel.value = st.paletteMode;
    modeRow.appendChild(modeSel);
    box.appendChild(modeRow);

    const curRow = el('div', 'ctl-row');
    curRow.appendChild(el('label', null, 'Curated set'));
    const curSel = document.createElement('select');
    window.PALETTE_NAMES.forEach((n) => {
      const o = document.createElement('option'); o.value = o.textContent = n; curSel.appendChild(o);
    });
    curSel.value = st.curated;
    curRow.appendChild(curSel);
    box.appendChild(curRow);

    const grid = el('div', 'swatch-grid');
    swatchEls = [];
    for (let i = 0; i < 18; i++) {
      const inp = document.createElement('input');
      inp.type = 'color';
      inp.value = S.customPalette[i] || '#000000';
      inp.addEventListener('input', () => {
        S.customPalette[i] = inp.value;
        saveCustom();
        if (st.paletteMode !== 'custom') { st.paletteMode = 'custom'; modeSel.value = 'custom'; }
        syncSwatches(); invalidate(); render();
      });
      grid.appendChild(inp);
      swatchEls.push(inp);
    }
    box.appendChild(grid);

    function syncSwatches() {
      const st2 = S.dither;
      let shown;
      if (st2.paletteMode === 'custom') shown = S.customPalette.map((h) => h);
      else if (st2.paletteMode === 'adaptive' && S.adaptiveCache) shown = S.adaptiveCache.map((c) => rgbToHex(c[0], c[1], c[2]));
      else shown = (window.CURATED_PALETTES[st2.curated] || []).slice();
      swatchEls.forEach((sw, i) => {
        if (st2.paletteMode === 'custom') {
          sw.value = S.customPalette[i];
          sw.classList.toggle('off', i >= st2.colorCount);
        } else {
          if (shown[i]) { sw.value = shown[i]; sw.classList.toggle('off', i >= st2.colorCount); }
          else sw.classList.add('off');
        }
      });
    }
    S._syncSwatches = syncSwatches;

    modeSel.addEventListener('change', () => { st.paletteMode = modeSel.value; S.adaptiveCache = null; syncSwatches(); render(); });
    curSel.addEventListener('change', () => { st.curated = curSel.value; syncSwatches(); render(); });

    const btns = el('div', 'btn-row');
    const bSample = el('button', 'btn', 'SAMPLE IMG');
    bSample.addEventListener('click', () => {
      if (!S.source) { toast('No source'); return; }
      const [pw, ph] = previewSize();
      const tmp = document.createElement('canvas');
      tmp.width = pw; tmp.height = ph;
      tmp.getContext('2d').drawImage(S.source.el, 0, 0, pw, ph);
      const id = tmp.getContext('2d').getImageData(0, 0, pw, ph);
      const pal = adaptivePalette(id, 18);
      pal.forEach((c, i) => { S.customPalette[i] = rgbToHex(c[0], c[1], c[2]); });
      saveCustom();
      st.paletteMode = 'custom'; modeSel.value = 'custom';
      syncSwatches(); render();
    });
    const bRand = el('button', 'btn', 'RANDOM');
    bRand.addEventListener('click', () => {
      const rng = mulberry32(newSeed());
      const baseHue = rng() * 360;
      for (let i = 0; i < 18; i++) {
        S.customPalette[i] = hslHex(baseHue + rng() * 160 - 80 + (i % 3) * 120 * rng(), 0.3 + rng() * 0.7, 0.08 + (i / 18) * 0.85);
      }
      saveCustom();
      st.paletteMode = 'custom'; modeSel.value = 'custom';
      syncSwatches(); invalidate(); render();
    });
    const bReset = el('button', 'btn', 'RESET');
    bReset.addEventListener('click', () => {
      S.customPalette = window.CURATED_PALETTES.Neon.concat(window.CURATED_PALETTES.Elevate, window.CURATED_PALETTES.Ocean).slice(0, 18);
      while (S.customPalette.length < 18) S.customPalette.push('#ffffff');
      saveCustom(); syncSwatches(); invalidate(); render();
    });
    btns.appendChild(bSample); btns.appendChild(bRand); btns.appendChild(bReset);
    box.appendChild(btns);
    syncSwatches();
  }

  // ---------- stack dock (left side, drag to reorder) ----------
  let dockEl = null;
  function buildDock() {
    if (!stageEl) return;
    const wrap = stageEl.parentElement;
    if (dockEl) dockEl.remove();
    dockEl = el('div', 'fx-dock');
    dockEl.appendChild(el('div', 'fx-dock-title', 'STACK ⇕'));
    let dragKey = null;

    let dragEl = null;
    const syncOrderFromDom = () => {
      S.order = [...dockEl.querySelectorAll('.fxd-item')].map((n) => n._fxkey);
    };

    S.order.forEach((key) => {
      const fx = byKey(key);
      if (!fx) return;
      const item = el('div', 'fxd-item' + (S[key].on ? ' on' : ''));
      item._fxkey = key;
      item.draggable = true;
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = S[key].on;
      cb.addEventListener('change', () => {
        S[key].on = cb.checked;
        item.classList.toggle('on', cb.checked);
        invalidate(); render(); buildPanel();
      });
      // clicking the checkbox shouldn't start a drag
      cb.addEventListener('mousedown', (e) => e.stopPropagation());
      item.appendChild(cb);
      item.appendChild(el('span', 'fxd-name', fx.label));
      item.appendChild(el('span', 'fxd-grip', '⋮⋮'));

      item.addEventListener('dragstart', (e) => {
        dragKey = key; dragEl = item; item.classList.add('drag');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', key); } catch (_) {}
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('drag');
        dragKey = null; dragEl = null;
        syncOrderFromDom(); saveOrder();
        buildPanel(); invalidate(); render();
      });
      // move the dragged node in place — no rebuild, so one drag reaches any slot
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dragEl || dragEl === item) return;
        const r = item.getBoundingClientRect();
        if ((e.clientY - r.top) > r.height / 2) item.after(dragEl);
        else item.before(dragEl);
      });
      item.addEventListener('drop', (e) => e.preventDefault());
      dockEl.appendChild(item);
    });

    const reset = el('button', 'btn fxd-reset', 'RESET ORDER');
    reset.addEventListener('click', () => {
      S.order = DEFAULT_ORDER.slice();
      saveOrder();
      buildDock(); buildPanel(); invalidate(); render();
    });
    dockEl.appendChild(reset);
    wrap.appendChild(dockEl);
  }

  // ---------- panel ----------
  function fxSection(body, fx) {
    const st = S[fx.key];
    body.appendChild(el('div', 'ctl-section', fx.label));
    const row = el('div', 'ctl-row');
    row.appendChild(el('label', null, 'Enable'));
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = st.on;
    cb.addEventListener('change', () => { st.on = cb.checked; invalidate(); render(); buildDock(); });
    row.appendChild(cb);
    body.appendChild(row);

    if (window.FX_PRESETS[fx.key]) {
      presetRow(body, window.FX_PRESETS[fx.key], (params) => {
        Object.assign(st, fx.mod().defaults, params, { on: true });
        buildPanel();
        invalidate(); render();
      });
    }
    buildControls(body, fx.mod().schema, st, () => { invalidate(); render(); if (S._syncSwatches) S._syncSwatches(); });
    if (fx.key === 'dither') paletteEditorUI(body);
  }

  function buildPanel() {
    panelEl.innerHTML = '';
    const body = panelEl;

    body.appendChild(el('div', 'ctl-section', 'Source'));
    const btns = el('div', 'btn-row');
    const bImp = el('button', 'btn primary', '⬇ IMPORT MEDIA');
    bImp.addEventListener('click', importMedia);
    btns.appendChild(bImp);
    body.appendChild(btns);
    fileInfoEl = el('div', 'file-info', S.source ? `${S.source.name} — ${S.source.w}×${S.source.h}` : 'no source — PNG · JPG · TIF · MP4 · MOV');
    body.appendChild(fileInfoEl);

    const prow = el('div', 'btn-row');
    playBtn = el('button', 'btn', '▶ PLAY');
    playBtn.style.display = (S.source && S.source.type === 'video') ? '' : 'none';
    playBtn.addEventListener('click', togglePlay);
    prow.appendChild(playBtn);
    body.appendChild(prow);

    const srow = el('div', 'ctl-row');
    srow.appendChild(el('label', null, 'Scrub'));
    scrubEl = document.createElement('input');
    scrubEl.type = 'range'; scrubEl.min = 0; scrubEl.max = 1000; scrubEl.value = 0;
    scrubEl.addEventListener('input', () => {
      if (S.source && S.source.type === 'video') {
        S.source.el.currentTime = (scrubEl.value / 1000) * S.source.el.duration;
        S.source.el.addEventListener('seeked', () => render(), { once: true });
      }
    });
    srow.appendChild(scrubEl);
    srow.style.display = (S.source && S.source.type === 'video') ? '' : 'none';
    body.appendChild(srow);

    body.appendChild(el('div', 'ctl-section', 'Stack presets'));
    const pr = el('div', 'btn-row');
    presetSel = document.createElement('select');
    pr.appendChild(presetSel);
    body.appendChild(pr);
    const pr2 = el('div', 'btn-row');
    const bs = el('button', 'btn', 'SAVE'); bs.addEventListener('click', savePreset);
    const bl = el('button', 'btn', 'LOAD'); bl.addEventListener('click', applyPreset);
    const bd = el('button', 'btn danger', 'DEL'); bd.addEventListener('click', deletePreset);
    pr2.appendChild(bs); pr2.appendChild(bl); pr2.appendChild(bd);
    body.appendChild(pr2);
    refreshPresetList();

    for (const key of S.order) { const fx = byKey(key); if (fx) fxSection(body, fx); }

    body.appendChild(el('div', 'ctl-section', 'Export'));
    const ex1 = el('div', 'btn-row');
    const bImg = el('button', 'btn primary', '⬆ EXPORT IMAGE');
    bImg.addEventListener('click', exportImage);
    ex1.appendChild(bImg);
    body.appendChild(ex1);

    const vidOpts = { fps: '30', scale: '100', audio: true };
    buildControls(body, [
      { type: 'select', key: 'fps', label: 'Video FPS', options: ['24', '30', '60'] },
      { type: 'select', key: 'scale', label: 'Video scale %', options: ['100', '75', '50'] },
      { type: 'check', key: 'audio', label: 'Keep audio' }
    ], vidOpts, null);
    const ex2 = el('div', 'btn-row');
    const bVid = el('button', 'btn primary', '⬆ EXPORT VIDEO');
    bVid.addEventListener('click', () => exportVideo({ fps: parseInt(vidOpts.fps), scalePct: parseInt(vidOpts.scale), withAudio: vidOpts.audio }));
    ex2.appendChild(bVid);
    body.appendChild(ex2);
    body.appendChild(el('div', 'hint', 'Every frame runs the full stack. Motion Trails and animated Reeded Glass accumulate across frames — best on video.'));
  }

  window.TOOLS.push({
    id: 'fx',
    group: 'EFFECTS',
    name: 'FX Compositor',
    sub: '9-effect stack · video + image',
    mount(stage, panel) {
      stageEl = stage; panelEl = panel;
      if (S.source) {
        stage.innerHTML = '';
        canvas = document.createElement('canvas');
        canvas.className = 'main-canvas';
        ctx = canvas.getContext('2d', { willReadFrequently: true });
        stage.appendChild(canvas);
        render();
      } else {
        stage.innerHTML = '<div class="stage-empty"><div class="big">SOUND ONLY</div>IMPORT AN IMAGE OR VIDEO<br>PNG · JPG · TIF · MP4 · MOV</div>';
      }
      buildPanel();
      buildDock();
    },
    unmount() { stopPlayback(); if (dockEl) { dockEl.remove(); dockEl = null; } }
  });
})();
