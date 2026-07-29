/* colorwheel.js — HSV wheel + value slider for fine color tuning */

class ColorWheel {
  constructor(container, opts = {}) {
    this.size = opts.size || 150;
    this.onChange = opts.onChange || (() => {});
    this.h = 180; this.s = 0.8; this.v = 0.9;

    const box = el('div', 'cwheel');
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = this.size;
    box.appendChild(this.canvas);

    const vrow = el('div', 'vrow');
    const vlab = el('label', null, 'VAL');
    vlab.style.cssText = 'font-size:10px;color:var(--ink-dim);font-family:var(--mono)';
    this.vslider = document.createElement('input');
    this.vslider.type = 'range'; this.vslider.min = 0; this.vslider.max = 100; this.vslider.value = 90;
    this.chip = el('div', 'chip');
    vrow.appendChild(vlab); vrow.appendChild(this.vslider); vrow.appendChild(this.chip);
    box.appendChild(vrow);
    container.appendChild(box);

    this.drawWheel();
    this.updateChip();

    const pickAt = (ev) => {
      const r = this.canvas.getBoundingClientRect();
      const x = ev.clientX - r.left - this.size / 2;
      const y = ev.clientY - r.top - this.size / 2;
      const dist = Math.sqrt(x * x + y * y) / (this.size / 2);
      if (dist > 1.05) return;
      this.h = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
      this.s = clamp(dist, 0, 1);
      this.updateChip();
      this.onChange(this.hex());
    };
    let down = false;
    this.canvas.addEventListener('mousedown', (e) => { down = true; pickAt(e); });
    window.addEventListener('mousemove', (e) => { if (down) pickAt(e); });
    window.addEventListener('mouseup', () => { down = false; });
    this.vslider.addEventListener('input', () => {
      this.v = this.vslider.value / 100;
      this.updateChip();
      this.onChange(this.hex());
    });
  }

  drawWheel() {
    const ctx = this.canvas.getContext('2d');
    const s = this.size, r = s / 2;
    const id = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - r, dy = y - r;
        const d = Math.sqrt(dx * dx + dy * dy) / r;
        const i = (y * s + x) * 4;
        if (d > 1) { id.data[i + 3] = 0; continue; }
        const hue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
        const [rr, gg, bb] = hslToRgb(hue, 1, 1 - d * 0.5);
        id.data[i] = rr; id.data[i + 1] = gg; id.data[i + 2] = bb;
        id.data[i + 3] = d > 0.98 ? Math.round((1 - d) / 0.02 * 255) : 255;
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  hex() {
    // HSV -> RGB
    const h = this.h, s = this.s, v = this.v;
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  setHex(hex) {
    const [r, g, b] = hexToRgb(hex);
    const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255;
    this.v = mx;
    this.s = mx === 0 ? 0 : (mx - mn) / mx;
    const [hh] = rgbToHsl(r, g, b);
    this.h = hh;
    this.vslider.value = Math.round(this.v * 100);
    this.updateChip();
  }

  updateChip() { this.chip.style.background = this.hex(); }
}
