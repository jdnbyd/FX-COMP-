/* fx_pixelsort.js — pixel sorting: sorts runs of pixels whose luma falls in a
   band, along rows or columns. Classic glitch-art smear. */

window.FXSort = {
  defaults: {
    direction: 'h',   // h | v
    lo: 0.25, hi: 0.8,
    order: 'asc',     // asc | desc
    maxRun: 240,
    chance: 1,        // probability a row/col gets sorted
    key: 'luma'       // luma | r | g | b
  },
  schema: [
    { type: 'select', key: 'direction', label: 'Direction', options: [{ v: 'h', l: 'Horizontal' }, { v: 'v', l: 'Vertical' }] },
    { type: 'range', key: 'lo', label: 'Band low', min: 0, max: 1, step: 0.02 },
    { type: 'range', key: 'hi', label: 'Band high', min: 0, max: 1, step: 0.02 },
    { type: 'select', key: 'order', label: 'Order', options: [{ v: 'asc', l: 'Dark → light' }, { v: 'desc', l: 'Light → dark' }] },
    { type: 'range', key: 'maxRun', label: 'Max run px', min: 8, max: 2000, step: 8 },
    { type: 'range', key: 'chance', label: 'Row chance', min: 0.05, max: 1, step: 0.05 },
    { type: 'select', key: 'key', label: 'Sort key', options: [{ v: 'luma', l: 'Luma' }, { v: 'r', l: 'Red' }, { v: 'g', l: 'Green' }, { v: 'b', l: 'Blue' }] }
  ],
  apply(id, p) {
    const w = id.width, h = id.height, d = id.data;
    const lo = Math.min(p.lo, p.hi) * 255, hi = Math.max(p.lo, p.hi) * 255;
    const keyOf = p.key === 'r' ? (i) => d[i] : p.key === 'g' ? (i) => d[i + 1] : p.key === 'b' ? (i) => d[i + 2]
      : (i) => d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
    const rng = mulberry32(1234);
    const horiz = p.direction === 'h';
    const outer = horiz ? h : w, inner = horiz ? w : h;
    const idx = horiz ? (o, k) => (o * w + k) * 4 : (o, k) => (k * w + o) * 4;

    const px = new Array(0);
    for (let o = 0; o < outer; o++) {
      if (rng() > p.chance) continue;
      let k = 0;
      while (k < inner) {
        const v0 = keyOf(idx(o, k));
        if (v0 < lo || v0 > hi) { k++; continue; }
        let end = k;
        while (end < inner && end - k < p.maxRun) {
          const v = keyOf(idx(o, end));
          if (v < lo || v > hi) break;
          end++;
        }
        if (end - k > 3) {
          px.length = 0;
          for (let j = k; j < end; j++) {
            const i = idx(o, j);
            px.push([keyOf(i), d[i], d[i + 1], d[i + 2], d[i + 3]]);
          }
          px.sort((a, b) => p.order === 'asc' ? a[0] - b[0] : b[0] - a[0]);
          for (let j = k; j < end; j++) {
            const i = idx(o, j);
            const s = px[j - k];
            d[i] = s[1]; d[i + 1] = s[2]; d[i + 2] = s[3]; d[i + 3] = s[4];
          }
        }
        k = end + 1;
      }
    }
    return id;
  }
};
