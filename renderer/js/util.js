/* util.js — shared helpers, seeded RNG, color math, export helpers */
window.TOOLS = [];

// one-time copy of pre-rename localStorage keys (sig.fx.* -> mfx.fx.*) so
// existing FX presets/state survive the SIGNAL STUDIO -> midFX rename.
// old keys are left in place (not deleted) — cheap, and avoids any risk of
// losing data if this ever ran twice or partway.
(function migrateLegacyStorage() {
  const keys = ['custom', 'order', 'expanded', 'paletteOpen', 'state', 'presets', 'dockCollapsed'];
  for (const k of keys) {
    const oldKey = 'sig.fx.' + k, newKey = 'mfx.fx.' + k;
    if (localStorage.getItem(newKey) === null && localStorage.getItem(oldKey) !== null) {
      localStorage.setItem(newKey, localStorage.getItem(oldKey));
    }
  }
})();

// ---------- seeded RNG ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function newSeed() { return (Math.random() * 0xffffffff) >>> 0; }
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function randInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
function randRange(rng, min, max) { return min + rng() * (max - min); }
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- color ----------
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
  const c = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function hslHex(h, s, l) { const [r, g, b] = hslToRgb(h, s, l); return rgbToHex(r, g, b); }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [h, s, l];
}
const lumaOf = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// sRGB -> OKLab
function rgbToOklab(r, g, b) {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lr = f(r), lg = f(g), lb = f(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  ];
}

// ---------- image processing ----------
function boxBlur1D(src, w, radius) {
  if (radius < 1) return src;
  const out = new Float32Array(w);
  const r = Math.floor(radius);
  let sum = 0, count = 0;
  for (let i = -r; i <= r; i++) { const j = clamp(i, 0, w - 1); sum += src[j]; count++; }
  for (let x = 0; x < w; x++) {
    out[x] = sum / count;
    const addI = clamp(x + r + 1, 0, w - 1), remI = clamp(x - r, 0, w - 1);
    sum += src[addI] - src[remI];
  }
  return out;
}

// separable box blur on Float32 field
function blurField(src, w, h, radius) {
  if (radius < 1) return src;
  const r = Math.floor(radius);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[y * w + clamp(i, 0, w - 1)];
    const n = 2 * r + 1;
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / n;
      sum += src[y * w + clamp(x + r + 1, 0, w - 1)] - src[y * w + clamp(x - r, 0, w - 1)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += tmp[clamp(i, 0, h - 1) * w + x];
    const n = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / n;
      sum += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x];
    }
  }
  return out;
}

// median-cut adaptive palette from ImageData
function adaptivePalette(imgData, count) {
  const px = [];
  const d = imgData.data;
  const step = Math.max(4, Math.floor(d.length / 4 / 6000) * 4);
  for (let i = 0; i < d.length; i += step * 4) px.push([d[i], d[i + 1], d[i + 2]]);
  if (!px.length) return [[0, 0, 0], [255, 255, 255]];
  let boxes = [px];
  while (boxes.length < count) {
    let bi = -1, bs = -1, bch = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let ch = 0; ch < 3; ch++) {
        let mn = 255, mx = 0;
        for (const p of box) { if (p[ch] < mn) mn = p[ch]; if (p[ch] > mx) mx = p[ch]; }
        if (mx - mn > bs) { bs = mx - mn; bi = i; bch = ch; }
      }
    });
    if (bi < 0) break;
    const box = boxes[bi];
    box.sort((a, b) => a[bch] - b[bch]);
    const mid = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
  }
  return boxes.map((box) => {
    let r = 0, g = 0, b = 0;
    for (const p of box) { r += p[0]; g += p[1]; b += p[2]; }
    const n = box.length || 1;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
}

// ---------- DOM ----------
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2600);
}
function setStatus(msg) { document.getElementById('status-text').textContent = msg; }

// generic modal: openModal({title, className, build(bodyEl), actions:[{label,cls,onClick(close)}]})
// returns close(). Backdrop click and Escape both close. onClick receives
// close so callers can chain confirmations before dismissing.
function openModal({ title, className, build, actions, onClose } = {}) {
  const back = el('div', 'sig-modal-back');
  const box = el('div', 'sig-modal' + (className ? ' ' + className : ''));
  if (title) box.appendChild(el('div', 'sig-modal-title', title));
  const body = el('div', 'sig-modal-body');
  box.appendChild(body);
  if (build) build(body);
  if (actions && actions.length) {
    const row = el('div', 'btn-row');
    for (const a of actions) {
      const b = el('button', 'btn ' + (a.cls || ''), a.label);
      b.addEventListener('click', () => a.onClick && a.onClick(close));
      row.appendChild(b);
    }
    box.appendChild(row);
  }
  back.appendChild(box);
  document.body.appendChild(back);
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  function close() {
    if (!back.isConnected) return;
    back.remove();
    document.removeEventListener('keydown', onKey);
    onClose && onClose();
  }
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  return close;
}
// positions a spinner overlay over any relatively/absolutely positioned
// container (e.g. #stage-wrap during a project load). Returns hide().
function showSpinner(container) {
  const overlay = el('div', 'spinner-overlay');
  overlay.appendChild(el('div', 'spinner'));
  container.appendChild(overlay);
  return () => overlay.remove();
}
function setProgress(frac) {
  const bar = document.getElementById('status-progress');
  const fill = document.getElementById('status-progress-fill');
  if (frac === null) { bar.classList.remove('on'); fill.style.width = '0%'; return; }
  bar.classList.add('on');
  fill.style.width = (clamp(frac, 0, 1) * 100).toFixed(1) + '%';
}

// ---------- export helpers ----------
function canvasToU8(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => resolve(new Uint8Array(await blob.arrayBuffer())), mime, quality);
  });
}

// shared ext-branch write logic — no dialog, no toast (used by both the
// interactive single-export path and the silent batch-export loop).
async function writeCanvasToPath(canvas, p) {
  const ext = p.split('.').pop().toLowerCase();
  if (ext === 'tif' || ext === 'tiff') {
    const ctx = canvas.getContext('2d');
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    await window.native.writeTiff(p, canvas.width, canvas.height, new Uint8Array(id.data.buffer.slice(0)));
  } else if (ext === 'jpg' || ext === 'jpeg') {
    await window.native.writeFile(p, await canvasToU8(canvas, 'image/jpeg', 0.94), false);
  } else {
    await window.native.writeFile(p, await canvasToU8(canvas, 'image/png'), false);
  }
  return p;
}

// batch export: write straight to a pre-resolved path, no save dialog.
async function saveCanvasImageToPath(canvas, outPath) {
  return writeCanvasToPath(canvas, outPath);
}

async function saveCanvasImage(canvas, baseName) {
  const dir = localStorage.getItem('mfx.exportDir');
  const p = await window.native.chooseSavePath({
    defaultName: baseName + '.png',
    defaultDir: dir || undefined,
    filters: [
      { name: 'PNG', extensions: ['png'] },
      { name: 'JPEG', extensions: ['jpg'] },
      { name: 'TIFF', extensions: ['tif'] }
    ]
  });
  if (!p) return null;
  await writeCanvasToPath(canvas, p);
  toast('SAVED → ' + p);
  return p;
}

async function saveSvgText(svg, baseName) {
  const p = await window.native.chooseSavePath({
    defaultName: baseName + '.svg',
    filters: [{ name: 'SVG', extensions: ['svg'] }]
  });
  if (!p) return null;
  await window.native.writeFile(p, svg, true);
  toast('SAVED → ' + p);
  return p;
}

// render an SVG string onto a canvas (for PNG export of SVG tools)
function svgToCanvas(svg, w, h) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// grain texture overlay
function drawGrain(ctx, w, h, amount, rng) {
  if (amount <= 0) return;
  const g = document.createElement('canvas');
  const gw = Math.min(w, 512), gh = Math.min(h, 512);
  g.width = gw; g.height = gh;
  const gctx = g.getContext('2d');
  const id = gctx.createImageData(gw, gh);
  const r = rng || Math.random;
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 255;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  gctx.putImageData(id, 0, 0);
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(g, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
