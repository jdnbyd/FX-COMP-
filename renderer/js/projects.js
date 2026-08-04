/* projects.js — Past Projects launch screen + save/load orchestration.
   Project files are portable JSON (.midfx) written via native dialogs; a
   small recents index lives in Electron's userData dir (see main.js).
   Depends on util.js (el, toast, openModal, showSpinner) and the
   window.SigApp / window.TOOLS shell from app.js, which calls
   Projects.boot() once it has finished its own default mount. */
window.Projects = (function () {
  const FORMAT_VERSION = 1;
  let current = { path: null, name: 'Untitled Project', dirty: false, createdAt: null };
  let nameEl;

  function updateSaveLabel() {
    if (nameEl) nameEl.textContent = current.name + (current.dirty ? ' •' : '');
  }

  function newDefault() {
    current = { path: null, name: 'Untitled Project', dirty: false, createdAt: null };
    updateSaveLabel();
  }

  // ---------- thumbnail ----------
  function captureThumbnail() {
    const canvas = document.querySelector('#stage canvas.main-canvas');
    if (!canvas || !canvas.width) return null;
    const maxW = 320;
    const scale = Math.min(1, maxW / canvas.width);
    const w = Math.max(1, Math.round(canvas.width * scale));
    const h = Math.max(1, Math.round(canvas.height * scale));
    const t = document.createElement('canvas');
    t.width = w; t.height = h;
    t.getContext('2d').drawImage(canvas, 0, 0, w, h);
    try { return t.toDataURL('image/jpeg', 0.6); } catch (e) { return null; }
  }

  // ---------- serialize / hydrate ----------
  function serializeProject() {
    const tools = {};
    for (const t of window.TOOLS) {
      if (typeof t.serialize === 'function') {
        const s = t.serialize();
        if (s) tools[t.id] = s;
      }
    }
    const active = window.SigApp && window.SigApp.getActive();
    return {
      formatVersion: FORMAT_VERSION,
      name: current.name,
      createdAt: current.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeToolId: active ? active.id : (window.TOOLS[0] && window.TOOLS[0].id),
      thumbnail: captureThumbnail(),
      tools
    };
  }

  async function hydrateProject(data) {
    if (!data || !data.tools) return;
    for (const id of Object.keys(data.tools)) {
      const tool = window.TOOLS.find((t) => t.id === id);
      if (tool && typeof tool.hydrate === 'function') await tool.hydrate(data.tools[id]);
    }
    const target = window.TOOLS.find((t) => t.id === data.activeToolId) || window.TOOLS[0];
    if (target && window.SigApp) window.SigApp.select(target);
  }

  // ---------- save ----------
  async function save() {
    if (!current.path) return saveAs();
    const data = serializeProject();
    await window.native.writeFile(current.path, JSON.stringify(data, null, 2), true);
    current.dirty = false;
    current.createdAt = current.createdAt || data.createdAt;
    await window.native.registerRecentProject({
      path: current.path, name: data.name, updatedAt: data.updatedAt, thumbnail: data.thumbnail
    });
    updateSaveLabel();
    toast('SAVED → ' + current.path);
  }

  async function saveAs() {
    const data = serializeProject();
    const p = await window.native.chooseSavePath({
      defaultName: (current.name || 'Untitled Project') + '.midfx',
      filters: [{ name: 'midFX Project', extensions: ['midfx'] }]
    });
    if (!p) return;
    await window.native.writeFile(p, JSON.stringify(data, null, 2), true);
    current.path = p;
    current.dirty = false;
    current.createdAt = current.createdAt || data.createdAt;
    await window.native.registerRecentProject({
      path: p, name: data.name, updatedAt: data.updatedAt, thumbnail: data.thumbnail
    });
    updateSaveLabel();
    toast('SAVED → ' + p);
  }

  function renamePrompt() {
    let inp, close;
    const submit = () => {
      const v = inp.value.trim();
      close();
      if (v) { current.name = v; current.dirty = true; updateSaveLabel(); }
    };
    close = openModal({
      title: 'PROJECT NAME',
      build(body) {
        inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'sig-modal-input'; inp.value = current.name;
        body.appendChild(inp);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        setTimeout(() => { inp.focus(); inp.select(); }, 0);
      },
      actions: [
        { label: 'SAVE', cls: 'primary', onClick: submit },
        { label: 'CANCEL', onClick: (close) => close() }
      ]
    });
  }

  // ---------- topbar save control ----------
  function mountSaveControl() {
    const wrap = document.getElementById('project-control');
    if (!wrap) return;
    wrap.innerHTML = '';
    nameEl = el('button', 'project-name', current.name);
    nameEl.type = 'button';
    nameEl.title = 'Rename project';
    nameEl.addEventListener('click', renamePrompt);
    const saveBtn = el('button', 'icon-btn', '💾');
    saveBtn.type = 'button';
    saveBtn.title = 'Save project';
    saveBtn.addEventListener('click', () => save().catch((e) => toast('Save failed: ' + e.message)));
    wrap.appendChild(nameEl);
    wrap.appendChild(saveBtn);
    updateSaveLabel();
  }

  // ---------- launch screen ----------
  function relTime(iso) {
    if (!iso) return '';
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }

  async function openProjectData(path, data) {
    current = { path, name: data.name || 'Untitled Project', dirty: false, createdAt: data.createdAt || null };
    const hide = showSpinner(document.getElementById('stage-wrap'));
    try {
      await hydrateProject(data);
      await window.native.registerRecentProject({
        path, name: current.name, updatedAt: data.updatedAt, thumbnail: data.thumbnail
      });
    } finally {
      hide();
    }
    updateSaveLabel();
  }

  async function renderCards() {
    const grid = document.getElementById('launch-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const newCard = el('button', 'launch-card launch-card-action');
    newCard.type = 'button';
    newCard.appendChild(el('span', 'launch-card-icon', '+'));
    newCard.appendChild(el('span', 'launch-card-label', 'New Project'));
    newCard.addEventListener('click', () => { newDefault(); mountSaveControl(); dismiss(); });
    grid.appendChild(newCard);

    const openCard = el('button', 'launch-card launch-card-action');
    openCard.type = 'button';
    openCard.appendChild(el('span', 'launch-card-icon', '📂'));
    openCard.appendChild(el('span', 'launch-card-label', 'Open Project File…'));
    openCard.addEventListener('click', async () => {
      const r = await window.native.openProjectFile();
      if (!r) return;
      await openProjectData(r.path, r.data);
      dismiss();
    });
    grid.appendChild(openCard);

    let list = [];
    try { list = await window.native.listRecentProjects(); } catch (e) {}
    for (const proj of list) {
      const card = el('button', 'launch-card launch-card-project');
      card.type = 'button';
      if (proj.thumbnail) {
        const img = document.createElement('img');
        img.src = proj.thumbnail;
        card.appendChild(img);
      } else {
        card.appendChild(el('span', 'launch-card-icon', '◧'));
      }
      card.appendChild(el('span', 'launch-card-label', proj.name || 'Untitled Project'));
      card.appendChild(el('span', 'launch-card-time', relTime(proj.updatedAt)));
      card.addEventListener('click', async () => {
        const data = await window.native.readProjectFile(proj.path);
        if (!data) { toast('Project file not found — removing from recents'); renderCards(); return; }
        await openProjectData(proj.path, data);
        dismiss();
      });
      grid.appendChild(card);
    }
  }

  function dismiss() {
    const screen = document.getElementById('launch-screen');
    if (screen) screen.classList.add('hidden');
  }

  function boot() {
    mountSaveControl();
    showLaunchScreen();
  }

  // re-entrant version of boot()'s launch-screen display, for the top-bar
  // home button — no unsaved-changes guard, matching "New Project"'s
  // existing behavior (see HANDOFF.md known gaps).
  function showLaunchScreen() {
    if (!window.native) return; // no project persistence outside Electron
    const screen = document.getElementById('launch-screen');
    if (!screen) return;
    screen.classList.remove('hidden');
    renderCards();
  }

  return { boot, save, saveAs, showLaunchScreen };
})();
