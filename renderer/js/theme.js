/* theme.js — preset colorway switcher. Presets themselves live in styles.css
   as [data-theme="x"] custom-property blocks; this just toggles the
   attribute and persists the choice. See index.html's head-inline script
   for the boot-time apply that avoids a flash of the wrong theme. */
window.Theme = {
  list: [
    { id: 'midnight', name: 'Midnight' },
    { id: 'aurora', name: 'Aurora' },
    { id: 'slate', name: 'Slate' },
    { id: 'sunset', name: 'Sunset' },
    { id: 'evangelion', name: 'Evangelion (legacy)' }
  ],
  apply(id) {
    if (id && id !== 'midnight') document.documentElement.setAttribute('data-theme', id);
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('mfx.theme', id || 'midnight');
  },
  current() {
    return localStorage.getItem('mfx.theme') || 'midnight';
  }
};
