/* app.js — shell: nav, tool mounting, global status */

(function () {
  const sidebar = document.getElementById('sidebar');
  const stage = document.getElementById('stage');
  const panelTitle = document.getElementById('panel-title');
  const panelBody = document.getElementById('panel-body');
  let active = null;

  const groups = [];
  for (const t of window.TOOLS) {
    let g = groups.find((x) => x.name === t.group);
    if (!g) { g = { name: t.group, tools: [] }; groups.push(g); }
    g.tools.push(t);
  }

  const buttons = new Map();
  for (const g of groups) {
    const box = el('div', 'nav-group');
    box.appendChild(el('div', 'nav-group-label', g.name));
    for (const t of g.tools) {
      const b = el('button', 'nav-item', `${t.name}<span class="sub">${t.sub || ''}</span>`);
      b.addEventListener('click', () => select(t));
      box.appendChild(b);
      buttons.set(t.id, b);
    }
    sidebar.appendChild(box);
  }

  function select(tool) {
    if (active && active.unmount) { try { active.unmount(); } catch (e) { console.error(e); } }
    active = tool;
    buttons.forEach((b, id) => b.classList.toggle('active', id === tool.id));
    panelTitle.textContent = tool.name;
    panelBody.innerHTML = '';
    stage.innerHTML = '';
    try {
      tool.mount(stage, panelBody);
    } catch (e) {
      console.error(e);
      stage.innerHTML = '<div class="stage-empty"><div class="big">MODULE FAULT</div>' + e.message + '</div>';
    }
    document.getElementById('top-status').textContent = tool.name.toUpperCase();
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
})();
