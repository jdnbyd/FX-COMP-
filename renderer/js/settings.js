/* settings.js — gear-icon modal: theme picker, reduce-motion, reset app data.
   Depends on util.js (el, openModal) and theme.js (window.Theme), both
   loaded earlier in index.html. */
window.Settings = (function () {
  function applyReduceMotion(on) {
    document.documentElement.toggleAttribute('data-reduce-motion', on);
  }

  // apply stored preference immediately — no boot-flash risk like theme has,
  // since motion only matters once something animates.
  applyReduceMotion(localStorage.getItem('mfx.reduceMotion') === '1');

  function open() {
    let swatchWrap;

    function renderSwatches() {
      swatchWrap.innerHTML = '';
      const current = window.Theme.current();
      for (const t of window.Theme.list) {
        const sw = el('button', 'theme-swatch' + (t.id === current ? ' active' : ''));
        sw.type = 'button';
        sw.setAttribute('data-theme', t.id);
        sw.appendChild(el('span', 'theme-swatch-preview'));
        sw.appendChild(el('span', 'theme-swatch-label', t.name));
        sw.addEventListener('click', () => {
          window.Theme.apply(t.id);
          renderSwatches();
        });
        swatchWrap.appendChild(sw);
      }
    }

    openModal({
      title: 'SETTINGS',
      className: 'settings-modal',
      build(body) {
        body.appendChild(el('div', 'ctl-section', 'Theme'));
        swatchWrap = el('div', 'theme-swatches');
        body.appendChild(swatchWrap);
        renderSwatches();

        body.appendChild(el('div', 'ctl-section', 'Custom Skin'));
        const skinLabels = { bg: 'Background', sliderTrack: 'Slider track', sliderThumb: 'Slider thumb', panelTexture: 'Panel texture' };
        for (const slot of window.Skin.slots) {
          const row = el('div', 'ctl-row skin-row');
          row.appendChild(el('label', null, skinLabels[slot]));
          const preview = el('span', 'skin-preview');
          preview.style.backgroundImage = window.Skin.urlFor(slot) || 'none';
          row.appendChild(preview);
          const chooseBtn = el('button', 'btn', 'CHOOSE…');
          chooseBtn.type = 'button';
          chooseBtn.addEventListener('click', async () => {
            await window.Skin.set(slot);
            preview.style.backgroundImage = window.Skin.urlFor(slot) || 'none';
          });
          row.appendChild(chooseBtn);
          const resetBtn = el('button', 'btn', 'RESET');
          resetBtn.type = 'button';
          resetBtn.addEventListener('click', async () => {
            await window.Skin.clear(slot);
            preview.style.backgroundImage = 'none';
          });
          row.appendChild(resetBtn);
          body.appendChild(row);
        }
        body.appendChild(el('div', 'hint', 'Dark or busy backgrounds may reduce legibility — a translucent overlay is applied automatically.'));

        body.appendChild(el('div', 'ctl-section', 'Export'));
        const dirRow = el('div', 'ctl-row');
        dirRow.appendChild(el('label', null, 'Default folder'));
        const dirPath = el('span', 'hint export-dir-path', localStorage.getItem('mfx.exportDir') || 'not set — asks each time');
        const dirBtn = el('button', 'btn', 'CHOOSE…');
        dirBtn.type = 'button';
        dirBtn.addEventListener('click', async () => {
          if (!window.native) return;
          const p = await window.native.chooseDirectory({ defaultPath: localStorage.getItem('mfx.exportDir') || undefined });
          if (!p) return;
          localStorage.setItem('mfx.exportDir', p);
          dirPath.textContent = p;
        });
        dirRow.appendChild(dirBtn);
        body.appendChild(dirRow);
        body.appendChild(dirPath);

        body.appendChild(el('div', 'ctl-section', 'Interface'));
        const row = el('div', 'ctl-row');
        row.appendChild(el('label', null, 'Reduce motion'));
        const motionInput = document.createElement('input');
        motionInput.type = 'checkbox';
        motionInput.checked = localStorage.getItem('mfx.reduceMotion') === '1';
        motionInput.addEventListener('change', () => {
          localStorage.setItem('mfx.reduceMotion', motionInput.checked ? '1' : '0');
          applyReduceMotion(motionInput.checked);
        });
        row.appendChild(motionInput);
        body.appendChild(row);

        body.appendChild(el('div', 'ctl-section', 'Data'));
        const resetRow = el('div', 'btn-row');
        const resetBtn = el('button', 'btn danger', 'RESET APP DATA');
        resetBtn.addEventListener('click', confirmReset);
        resetRow.appendChild(resetBtn);
        body.appendChild(resetRow);
      }
    });
  }

  function confirmReset() {
    openModal({
      title: 'RESET APP DATA?',
      build(body) {
        body.appendChild(el('div', 'hint',
          'Clears saved FX presets, palettes, theme choice, and recent projects. This cannot be undone.'));
      },
      actions: [
        { label: 'CANCEL', onClick: (close) => close() },
        {
          label: 'RESET', cls: 'danger', onClick: (close) => {
            for (const k of Object.keys(localStorage)) {
              if (k.indexOf('mfx.') === 0 || k.indexOf('sig.') === 0) localStorage.removeItem(k);
            }
            const finish = () => { close(); location.reload(); };
            if (window.native && window.native.clearRecentProjects) {
              window.native.clearRecentProjects().then(finish).catch(finish);
            } else {
              finish();
            }
          }
        }
      ]
    });
  }

  return { open };
})();
