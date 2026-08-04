/* app.js — shell: nav, tool mounting, global status */

(function () {
  const tabbar = document.getElementById('tabbar');
  const stage = document.getElementById('stage');
  const panelTitle = document.getElementById('panel-title');
  const panelBody = document.getElementById('panel-body');
  const panelFoot = document.getElementById('panel-foot');
  let active = null;

  // Pinned action bar at the bottom of the panel. Terminal actions (export)
  // live here so they never require scrolling the control list.
  window.setPanelActions = function (items) {
    panelFoot.innerHTML = '';
    if (!items || !items.length) { panelFoot.classList.remove('on'); return; }
    panelFoot.classList.add('on');
    const row = el('div', 'btn-row');
    for (const it of items) {
      const b = el('button', 'btn ' + (it.cls || 'primary'), it.label);
      b.addEventListener('click', it.onClick);
      if (it.title) b.title = it.title;
      row.appendChild(b);
    }
    panelFoot.appendChild(row);
  };

  const buttons = new Map();
  for (const t of window.TOOLS) {
    const b = el('button', 'tab-item', t.name);
    if (t.sub) b.title = t.sub;
    b.addEventListener('click', () => select(t));
    tabbar.appendChild(b);
    buttons.set(t.id, b);
  }

  function select(tool) {
    if (active && active.unmount) { try { active.unmount(); } catch (e) { console.error(e); } }
    active = tool;
    buttons.forEach((b, id) => b.classList.toggle('active', id === tool.id));
    panelTitle.textContent = tool.name;
    panelBody.innerHTML = '';
    window.setPanelActions(null);
    stage.innerHTML = '';
    document.getElementById('stage-wrap').classList.remove('has-dock', 'dock-collapsed');
    try {
      tool.mount(stage, panelBody);
    } catch (e) {
      console.error(e);
      stage.innerHTML = '<div class="stage-empty"><div class="big">MODULE FAULT</div>' + e.message + '</div>';
    }
    document.getElementById('top-status').textContent = tool.name.toUpperCase();
    // restart the fade-in transition (forced reflow — content already mounted above)
    for (const target of [stage, panelBody]) {
      target.classList.remove('tool-anim');
      void target.offsetWidth;
      target.classList.add('tool-anim');
    }
  }

  if (window.native) {
    window.native.hasFfmpeg().then((ok) => {
      if (!ok) toast('ffmpeg-static missing — video import/export disabled');
    });
    window.native.onFfmpegProgress(() => {});
    window.native.onOpenPath(async (d) => {
      const fx = window.TOOLS.find((t) => t.id === 'fx');
      if (fx && active !== fx) select(fx);
      if (window.FXTool) window.FXTool.openPath(d);
    });
  }

  if (window.TOOLS.length) select(window.TOOLS[0]);

  window.SigApp = { select, getActive: () => active };

  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) settingsBtn.addEventListener('click', () => { if (window.Settings) window.Settings.open(); });

  const homeBtn = document.getElementById('btn-home');
  if (homeBtn) homeBtn.addEventListener('click', () => { if (window.Projects) window.Projects.showLaunchScreen(); });

  if (window.Projects) window.Projects.boot();
})();
