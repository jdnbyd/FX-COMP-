/* skin.js — Custom Skin v1: user-supplied background / slider track+thumb /
   panel texture images, layered independently on top of whichever
   [data-theme] preset is active (see theme.js). Real files copied into
   userData/skins/custom/ via main.js IPC, referenced by CSS custom
   properties + per-slot classes on <html> (a class toggle, not CSS var()
   fallback, since only a class can conditionally swap a whole rule set —
   see the html.skin-* rules in styles.css).
   Boot-flash avoidance: the same state this module manages is also
   applied synchronously by the inline <script> at the top of index.html's
   <head>, before the stylesheet resolves — keep both in sync if this
   module's storage shape ever changes.
   State shape: each slot is copied to a FIXED filename (bg.jpg, etc.), so
   re-picking a new image overwrites the same path on disk. That means the
   file:// URL never changes on its own — Chromium caches images by URL and
   will happily keep showing the old picture forever unless the URL itself
   changes. Each slot therefore stores {path, v} where v is a fresh
   Date.now() token appended as a "?v=" query string cache-buster. Don't
   drop the v param "for cleanliness" — that's the whole fix. */
window.Skin = (function () {
  const SLOT_CLASS = {
    bg: 'skin-bg',
    sliderTrack: 'skin-slider-track',
    sliderThumb: 'skin-slider-thumb',
    panelTexture: 'skin-panel'
  };
  const SLOT_VAR = {
    bg: '--skin-bg-url',
    sliderTrack: '--skin-slider-track-url',
    sliderThumb: '--skin-slider-thumb-url',
    panelTexture: '--skin-panel-texture-url'
  };
  const SLOTS = Object.keys(SLOT_CLASS);

  function toFileUrl(path, v) {
    return 'file:///' + path.replace(/\\/g, '/').replace(/ /g, '%20') + '?v=' + v;
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem('mfx.customSkin') || '{}'); } catch (e) { return {}; }
  }
  function writeState(state) { localStorage.setItem('mfx.customSkin', JSON.stringify(state)); }

  // returns a CSS url("...") string for the slot's current image, or null
  function urlFor(slot) {
    const entry = readState()[slot];
    if (!entry || !entry.path) return null;
    return 'url("' + toFileUrl(entry.path, entry.v) + '")';
  }

  function applyAll() {
    const state = readState();
    const root = document.documentElement;
    for (const slot of SLOTS) {
      const entry = state[slot];
      root.classList.toggle(SLOT_CLASS[slot], !!(entry && entry.path));
      if (entry && entry.path) root.style.setProperty(SLOT_VAR[slot], 'url("' + toFileUrl(entry.path, entry.v) + '")');
      else root.style.removeProperty(SLOT_VAR[slot]);
    }
  }

  async function set(slot) {
    if (!window.native) return;
    const p = await window.native.importSkinImage(slot);
    if (!p) return;
    const state = readState();
    state[slot] = { path: p, v: Date.now() };
    writeState(state);
    applyAll();
  }

  async function clear(slot) {
    if (window.native) await window.native.clearSkinImage(slot);
    const state = readState();
    delete state[slot];
    writeState(state);
    applyAll();
  }

  return { slots: SLOTS, get: readState, urlFor, set, clear, applyAll };
})();
