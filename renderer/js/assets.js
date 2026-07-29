/* assets.js — bundled texture library (real paper/noise scans) + preset UI helper */

window.TexLib = (function () {
  const FILES = {
    'paper-white-1': 'assets/paper-white-1.jpg',
    'paper-white-2': 'assets/paper-white-2.jpg',
    'paper-white-3': 'assets/paper-white-3.jpg',
    'paper-white-4': 'assets/paper-white-4.jpg',
    'paper-black-1': 'assets/paper-black-1.jpg',
    'paper-black-2': 'assets/paper-black-2.jpg',
    'paper-black-3': 'assets/paper-black-3.jpg',
    'paper-black-4': 'assets/paper-black-4.jpg',
    'noise-1': 'assets/noise-1.png',
    'noise-2': 'assets/noise-2.png',
    'noise-3': 'assets/noise-3.png',
    'noise-4': 'assets/noise-4.png'
  };
  const imgs = {};
  const fields = {}; // luma Float32Array cache keyed name@WxH

  function get(name) {
    if (!FILES[name]) return null;
    if (!imgs[name]) {
      const img = new Image();
      img.src = FILES[name];
      imgs[name] = img;
    }
    return imgs[name].complete && imgs[name].naturalWidth ? imgs[name] : null;
  }
  // warm the cache up front
  function preload() { Object.keys(FILES).forEach((n) => { const i = new Image(); i.src = FILES[n]; imgs[n] = i; }); }

  // luma field of texture stretched to w×h (cheap cache at capped res)
  function field(name, w, h) {
    const key = name + '@' + w + 'x' + h;
    if (fields[key]) return fields[key];
    const img = get(name);
    if (!img) return null;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const f = new Float32Array(w * h);
    for (let i = 0, j = 0; j < f.length; i += 4, j++) f[j] = lumaOf(d[i], d[i + 1], d[i + 2]) / 255;
    fields[key] = f;
    // keep the cache small
    const keys = Object.keys(fields);
    if (keys.length > 10) delete fields[keys[0]];
    return f;
  }
  function names(prefix) { return Object.keys(FILES).filter((n) => n.startsWith(prefix)); }
  return { get, field, names, preload };
})();
window.TexLib.preload();

/* preset dropdown row: presets = [{name, params}], apply(params) */
function presetRow(container, presets, apply, label) {
  const row = el('div', 'ctl-row');
  row.appendChild(el('label', null, label || 'Preset'));
  const sel = document.createElement('select');
  const o0 = document.createElement('option');
  o0.value = ''; o0.textContent = '— pick —';
  sel.appendChild(o0);
  presets.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i); o.textContent = (i + 1) + ' · ' + p.name;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    const p = presets[parseInt(sel.value)];
    if (p) apply(p.params, p);
  });
  row.appendChild(sel);
  container.appendChild(row);
  return sel;
}
