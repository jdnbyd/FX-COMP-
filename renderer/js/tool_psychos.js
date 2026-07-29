/* tool_psychos.js — embeds blakeshao/a-psychos-gd-tool (WebGPU node-based
   poster tool, hosted on Vercel) in a webview tab. */

(function () {
  const URL_LIVE = 'https://a-psychos-gd-tool.vercel.app';
  const URL_REPO = 'https://github.com/blakeshao/a-psychos-gd-tool';

  window.TOOLS.push({
    id: 'psychos',
    group: 'DESIGN',
    name: "Psycho's GD Tool",
    sub: 'node-based poster tool',
    mount(stage, panel) {
      stage.innerHTML = '';
      const wv = document.createElement('webview');
      wv.src = URL_LIVE;
      wv.setAttribute('allowpopups', '');
      stage.appendChild(wv);

      panel.innerHTML = '';
      panel.appendChild(el('div', 'ctl-section', 'Embedded tool'));
      panel.appendChild(el('div', 'hint',
        'a-psychos-gd-tool by blakeshao — a node-based graphic design tool. ' +
        'Text → vector outlines, warps, blurs, dithers, all as typed nodes. Runs on WebGPU inside this pane.'));
      buildControls(panel, [
        { type: 'button', label: '⟳ RELOAD', onClick: () => wv.reload() },
        { type: 'button', label: 'OPEN IN BROWSER', onClick: () => window.native.openExternal(URL_LIVE) },
        { type: 'button', label: 'SOURCE (GITHUB)', onClick: () => window.native.openExternal(URL_REPO) }
      ], {}, null);
      panel.appendChild(el('div', 'hint', 'Needs internet + WebGPU. Use its own export to save results, then import them into the FX Compositor.'));
    }
  });
})();
