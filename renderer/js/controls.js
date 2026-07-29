/* controls.js — declarative control panel builder */

/*
schema item types:
 { type:'section', label }
 { type:'range', key, label, min, max, step }
 { type:'select', key, label, options:[{v,l}] or ['a','b'] }
 { type:'color', key, label }
 { type:'check', key, label }
 { type:'number', key, label, min, max, step }
 { type:'text', key, label }
 { type:'textarea', key, label, rows }
 { type:'button', label, onClick, cls }
 { type:'buttons', items:[{label,onClick,cls}] }
 { type:'html', build(container) }
*/
function buildControls(container, schema, state, onChange) {
  const refs = {};
  const fire = (key) => onChange && onChange(key, state);

  for (const item of schema) {
    if (item.type === 'section') {
      container.appendChild(el('div', 'ctl-section', item.label));
      continue;
    }
    if (item.type === 'button') {
      const row = el('div', 'btn-row');
      const b = el('button', 'btn ' + (item.cls || ''), item.label);
      b.addEventListener('click', item.onClick);
      row.appendChild(b);
      container.appendChild(row);
      continue;
    }
    if (item.type === 'buttons') {
      const row = el('div', 'btn-row');
      for (const it of item.items) {
        const b = el('button', 'btn ' + (it.cls || ''), it.label);
        b.addEventListener('click', it.onClick);
        row.appendChild(b);
        if (it.ref) refs[it.ref] = b;
      }
      container.appendChild(row);
      continue;
    }
    if (item.type === 'html') {
      const box = el('div');
      container.appendChild(box);
      item.build(box);
      continue;
    }

    const row = el('div', 'ctl-row');
    const lab = el('label', null, item.label);
    row.appendChild(lab);

    if (item.type === 'range') {
      const inp = document.createElement('input');
      inp.type = 'range';
      inp.min = item.min; inp.max = item.max; inp.step = item.step || 1;
      inp.value = state[item.key];
      const val = el('span', 'val', String(state[item.key]));
      inp.addEventListener('input', () => {
        state[item.key] = parseFloat(inp.value);
        val.textContent = String(state[item.key]);
        fire(item.key);
      });
      row.appendChild(inp); row.appendChild(val);
      refs[item.key] = inp;
      refs[item.key + '_val'] = val;
    } else if (item.type === 'select') {
      const sel = document.createElement('select');
      for (const o of item.options) {
        const opt = document.createElement('option');
        if (typeof o === 'object') { opt.value = o.v; opt.textContent = o.l; }
        else { opt.value = o; opt.textContent = o; }
        sel.appendChild(opt);
      }
      sel.value = state[item.key];
      sel.addEventListener('change', () => { state[item.key] = sel.value; fire(item.key); });
      row.appendChild(sel);
      refs[item.key] = sel;
    } else if (item.type === 'color') {
      const inp = document.createElement('input');
      inp.type = 'color'; inp.value = state[item.key];
      inp.addEventListener('input', () => { state[item.key] = inp.value; fire(item.key); });
      row.appendChild(inp);
      refs[item.key] = inp;
    } else if (item.type === 'check') {
      const inp = document.createElement('input');
      inp.type = 'checkbox'; inp.checked = !!state[item.key];
      inp.addEventListener('change', () => { state[item.key] = inp.checked; fire(item.key); });
      row.appendChild(inp);
      refs[item.key] = inp;
    } else if (item.type === 'number') {
      const inp = document.createElement('input');
      inp.type = 'number';
      if (item.min !== undefined) inp.min = item.min;
      if (item.max !== undefined) inp.max = item.max;
      inp.step = item.step || 1;
      inp.value = state[item.key];
      inp.addEventListener('change', () => { state[item.key] = parseFloat(inp.value) || 0; fire(item.key); });
      row.appendChild(inp);
      refs[item.key] = inp;
    } else if (item.type === 'text') {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.value = state[item.key] || '';
      inp.addEventListener('change', () => { state[item.key] = inp.value; fire(item.key); });
      row.appendChild(inp);
      refs[item.key] = inp;
    } else if (item.type === 'textarea') {
      const inp = document.createElement('textarea');
      inp.rows = item.rows || 3; inp.value = state[item.key] || '';
      inp.addEventListener('change', () => { state[item.key] = inp.value; fire(item.key); });
      row.appendChild(inp);
      refs[item.key] = inp;
    }
    container.appendChild(row);
  }
  return refs;
}

// standard seed row: numeric readout + reroll button
function addSeedRow(container, getSeed, setSeed) {
  const row = el('div', 'btn-row');
  const b = el('button', 'btn accent', '⟳ RANDOMIZE');
  const s = el('span', 'hint');
  s.style.alignSelf = 'center';
  s.textContent = 'SEED ' + getSeed();
  b.addEventListener('click', () => {
    setSeed(newSeed());
    s.textContent = 'SEED ' + getSeed();
  });
  row.appendChild(b); row.appendChild(s);
  container.appendChild(row);
  return { update: () => { s.textContent = 'SEED ' + getSeed(); } };
}
