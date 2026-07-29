/* fx_presets.js — 10 presets per effect + full-stack looks (Vintage Print, Ink Bleed) */

window.FX_PRESETS = {
  cc: [
    { name: 'Neutral punch', params: { contrast: 0.15, saturation: 0.12 } },
    { name: 'Bleach bypass', params: { contrast: 0.4, saturation: -0.55, exposure: 0.08 } },
    { name: 'Teal & orange', params: { temperature: 0.35, tint: -0.1, contrast: 0.2, saturation: 0.25 } },
    { name: 'Cold broadcast', params: { temperature: -0.45, contrast: 0.18, shadows: 0.1 } },
    { name: 'Warm faded', params: { temperature: 0.3, fade: 0.45, contrast: -0.12 } },
    { name: 'Noir', params: { saturation: -1, contrast: 0.45, vignette: 0.5 } },
    { name: 'Overexposed scan', params: { exposure: 0.5, highlights: -0.3, fade: 0.25 } },
    { name: 'Crushed shadows', params: { shadows: -0.5, contrast: 0.3, vignette: 0.3 } },
    { name: 'Hue drift 90°', params: { hue: 90, saturation: 0.2 } },
    { name: 'Security cam', params: { saturation: -0.6, tint: 0.25, exposure: -0.1, vignette: 0.55 } }
  ],
  bevel: [
    { name: 'Soft paper relief', params: { depth: 2.5, smoothing: 4, style: 'flat', output: 'shaded' } },
    { name: 'Deep flat carve', params: { depth: 9, smoothing: 2, style: 'flat', output: 'shaded' } },
    { name: 'Brushed metal', params: { depth: 6, smoothing: 3, style: 'metal', folds: 2, output: 'shaded' } },
    { name: 'Liquid chrome', params: { depth: 10, smoothing: 5, style: 'chrome', folds: 4, output: 'shaded' } },
    { name: 'Foil emboss', params: { depth: 7, smoothing: 1, style: 'metal', folds: 5, output: 'emboss' } },
    { name: 'Gray relief map', params: { depth: 5, smoothing: 3, style: 'flat', output: 'emboss' } },
    { name: 'Overlay sheen', params: { depth: 4, smoothing: 4, style: 'metal', folds: 3, output: 'overlay' } },
    { name: 'Sunken invert', params: { depth: 6, smoothing: 3, style: 'flat', invert: true, output: 'shaded' } },
    { name: 'Hard chrome sign', params: { depth: 14, smoothing: 6, style: 'chrome', folds: 6, output: 'shaded' } },
    { name: 'Subtle top light', params: { depth: 2, smoothing: 6, angle: 90, altitude: 70, style: 'flat', output: 'shaded' } }
  ],
  dither: [
    { name: 'Neon Bayer', params: { pattern: 'Bayer 8×8', paletteMode: 'curated', curated: 'Neon', colorCount: 6, strength: 0.55 } },
    { name: 'Newsprint halftone', params: { pattern: 'Halftone', paletteMode: 'curated', curated: 'Monochrome', colorCount: 4, strength: 0.8, pixelate: 2 } },
    { name: 'Gameboy 4', params: { pattern: 'Bayer 4×4', paletteMode: 'curated', curated: 'Ocean', colorCount: 4, pixelate: 3, strength: 0.6 } },
    { name: 'Riso 2-tone', params: { pattern: 'Halftone 45°', paletteMode: 'curated', curated: 'Wildberry', colorCount: 3, strength: 0.7 } },
    { name: 'XOR glitch', params: { pattern: 'XOR', paletteMode: 'curated', curated: 'Galaxy', colorCount: 8, strength: 0.75 } },
    { name: 'Sepia print', params: { pattern: 'Cross Hatch', paletteMode: 'curated', curated: 'Sepia', colorCount: 6, strength: 0.65 } },
    { name: 'Pixel poster', params: { pattern: 'Bayer 2×2', paletteMode: 'adaptive', colorCount: 8, pixelate: 4, strength: 0.45 } },
    { name: 'Fishnet fade', params: { pattern: 'Fishnet', paletteMode: 'curated', curated: 'Faded', colorCount: 6, strength: 0.85 } },
    { name: 'OKLab smooth', params: { pattern: 'Bayer 8×8', paletteMode: 'adaptive', colorCount: 12, distMode: 'oklab', strength: 0.3 } },
    { name: 'Random grain 2-bit', params: { pattern: 'Random', paletteMode: 'curated', curated: 'Monochrome', colorCount: 2, strength: 0.9 } }
  ],
  scan: [
    { name: 'Cyan HUD', params: { spacing: 10, maxT: 8, softness: 6, color: '#00e5ff', halo: true } },
    { name: 'Fine hairlines', params: { spacing: 5, minT: 0.3, maxT: 3.4, softness: 3, color: '#00e5ff' } },
    { name: 'Fat CRT', params: { spacing: 22, minT: 1.5, maxT: 19, softness: 12, color: '#7df9ff', haloWidth: 3 } },
    { name: 'Chartreuse alert', params: { spacing: 12, maxT: 9, color: '#c8f751', haloAlpha: 0.4 } },
    { name: 'Amber terminal', params: { spacing: 9, maxT: 7, color: '#ffb454', softness: 5 } },
    { name: 'Ghost overlay', params: { spacing: 10, maxT: 8, keepSource: 0.4, haloAlpha: 0.2 } },
    { name: 'Laser etch', params: { spacing: 7, minT: 0.2, maxT: 6, softness: 0, gamma: 1.6, halo: false } },
    { name: 'Soft neon wash', params: { spacing: 16, maxT: 14, softness: 25, haloWidth: 4, haloAlpha: 0.45 } },
    { name: 'Red alarm', params: { spacing: 11, maxT: 9, color: '#ff3d5a', haloAlpha: 0.35 } },
    { name: 'White broadcast', params: { spacing: 8, maxT: 6, color: '#eaf6f9', softness: 8 } }
  ],
  air: [
    { name: 'Carnival dragon', params: { smoothness: 10, pastel: 0.45, saturation: 0.6, rainbow: 0.4, outline: 0.65, glow: 0.5 } },
    { name: 'Soft portrait', params: { smoothness: 14, blend: 0.9, pastel: 0.25, rainbow: 0.08, outline: 0.25 } },
    { name: 'T-shirt boardwalk', params: { smoothness: 8, pastel: 0.5, saturation: 0.8, rainbow: 0.5, rainbowScale: 1.4, outline: 0.7, grain: 0.12 } },
    { name: 'Dreamy haze', params: { smoothness: 22, blend: 1, pastel: 0.6, rainbow: 0.2, outline: 0, glow: 0.6 } },
    { name: 'Dark fantasy van', params: { smoothness: 9, pastel: 0.1, saturation: 0.7, rainbow: 0.3, outline: 0.9, outlineSoft: 3, grain: 0.1 } },
    { name: 'Chrome mist', params: { smoothness: 12, pastel: 0.3, saturation: -0.2, rainbow: 0.15, glow: 0.7, outline: 0.4 } },
    { name: 'Hard liner', params: { smoothness: 5, blend: 0.7, outline: 1, outlineSoft: 1, rainbow: 0.1 } },
    { name: 'Bubble pastel', params: { smoothness: 18, pastel: 0.7, saturation: 0.4, rainbow: 0.35, rainbowScale: 3.4, outline: 0.2 } },
    { name: 'Neon fog', params: { smoothness: 16, pastel: 0.2, saturation: 0.9, rainbow: 0.65, rainbowScale: 1, glow: 0.8, outline: 0.3 } },
    { name: 'Faded mural', params: { smoothness: 11, pastel: 0.4, saturation: 0.15, rainbow: 0.18, outline: 0.5, grain: 0.2 } }
  ],
  paper: [
    { name: 'Office scan', params: { mode: 'white', plate: 1, opacity: 0.45, contrast: 0.12, distort: 2, grain: 0.08 } },
    { name: 'Aged document', params: { mode: 'white', plate: 3, opacity: 0.75, brightness: -0.06, contrast: 0.2, distort: 5, desat: 0.35, grain: 0.16 } },
    { name: 'Photocopy gen 3', params: { mode: 'white', plate: 2, opacity: 0.6, contrast: 0.5, desat: 0.9, distort: 6, grain: 0.24 } },
    { name: 'Black archive', params: { mode: 'black', plate: 1, opacity: 0.6, contrast: 0.15, grain: 0.12 } },
    { name: 'Charcoal press', params: { mode: 'black', plate: 3, opacity: 0.8, brightness: -0.08, contrast: 0.3, grain: 0.2 } },
    { name: 'Fiber heavy', params: { mode: 'white', plate: 4, opacity: 0.9, texScale: 0.6, contrast: 0.1, grain: 0.1 } },
    { name: 'Warped fax', params: { mode: 'white', plate: 2, opacity: 0.5, distort: 11, distortScale: 1.5, desat: 0.7, contrast: 0.35 } },
    { name: 'Soft print', params: { mode: 'white', plate: 1, opacity: 0.35, brightness: 0.06, contrast: -0.05, desat: 0.2, grain: 0.05 } },
    { name: 'Night scan', params: { mode: 'black', plate: 2, opacity: 0.7, brightness: -0.12, distort: 3, grain: 0.18 } },
    { name: 'Zine crunch', params: { mode: 'white', plate: 3, opacity: 0.65, texScale: 1.6, contrast: 0.45, desat: 0.55, distort: 4, grain: 0.3 } }
  ],
  reeded: [
    { name: 'Door panel', params: { pattern: 'vertical', ridge: 28, strength: 22, dispersion: 0.35, reflection: 0.35 } },
    { name: 'Fine flute', params: { pattern: 'vertical', ridge: 10, strength: 12, dispersion: 0.2, reflection: 0.3 } },
    { name: 'Wide gallery', params: { pattern: 'vertical', ridge: 72, strength: 40, dispersion: 0.5, reflection: 0.45, reflScale: 1.6 } },
    { name: 'Privacy grid', params: { pattern: 'grid', ridge: 24, strength: 20, dispersion: 0.3, reflection: 0.25 } },
    { name: 'Horizontal blinds', params: { pattern: 'horizontal', ridge: 20, strength: 18, dispersion: 0.25, reflection: 0.35 } },
    { name: 'Wavy antique', params: { pattern: 'wavy', ridge: 34, strength: 26, wave: 0.8, dispersion: 0.4, imperfect: 0.45 } },
    { name: 'Prism split', params: { pattern: 'vertical', ridge: 40, strength: 34, dispersion: 1, reflection: 0.2 } },
    { name: 'Dirty window', params: { pattern: 'vertical', ridge: 26, strength: 18, imperfect: 0.85, reflection: 0.3 } },
    { name: 'Slow drift', params: { pattern: 'vertical', ridge: 30, strength: 24, animate: 0.2, dispersion: 0.35 } },
    { name: 'Strobe shift', params: { pattern: 'grid', ridge: 18, strength: 26, animate: 1.2, dispersion: 0.6 } }
  ],
  trails: [
    { name: 'Long exposure', params: { threshold: 0.62, fade: 0.94, intensity: 1, blend: 'add' } },
    { name: 'Light painting', params: { threshold: 0.75, fade: 0.975, intensity: 1.3, sourceDim: 0.65, blend: 'add' } },
    { name: 'Dance smear', params: { threshold: 0.5, fade: 0.85, driftX: 2, intensity: 0.9, blend: 'screen' } },
    { name: 'Falling stars', params: { threshold: 0.7, fade: 0.93, driftY: 5, intensity: 1.1, blend: 'add' } },
    { name: 'VHS feedback', params: { threshold: 0.45, fade: 0.9, shake: 4, intensity: 0.8, blend: 'screen', sourceDim: 0.2 } },
    { name: 'Dodge burn', params: { threshold: 0.6, fade: 0.9, intensity: 0.7, blend: 'colordodge' } },
    { name: 'Soft ghost', params: { threshold: 0.4, knee: 0.3, fade: 0.88, intensity: 0.6, blend: 'softlight' } },
    { name: 'Hard streak', params: { threshold: 0.68, fade: 0.96, driftX: -6, intensity: 1.2, blend: 'hardlight', sourceDim: 0.35 } },
    { name: 'Night drive', params: { threshold: 0.72, fade: 0.95, driftX: 8, driftY: -1, intensity: 1.4, sourceDim: 0.5, blend: 'lighten' } },
    { name: 'Overlay bloom', params: { threshold: 0.55, knee: 0.25, fade: 0.9, intensity: 0.9, blend: 'overlay' } }
  ],
  grad: [
    { name: 'EVA orange/green', params: { type: 'linear', colorA: '#ff7a1a', colorB: '#0a0a12', useMid: true, colorM: '#00ff9f', blend: 'overlay', opacity: 0.55, angle: 120 } },
    { name: 'Sunset wash', params: { type: 'linear', colorA: '#ff6c2f', colorB: '#7c3aed', blend: 'softlight', opacity: 0.7, angle: 90 } },
    { name: 'Radial spotlight', params: { type: 'radial', colorA: '#fff6e0', colorB: '#000000', blend: 'multiply', opacity: 0.85, scale: 1.2 } },
    { name: 'Duotone crush', params: { type: 'linear', colorA: '#00fbff', colorB: '#ff0095', blend: 'color', opacity: 1, angle: 45 } },
    { name: 'Conic sweep', params: { type: 'conic', colorA: '#ff2a2a', colorB: '#1a0b2e', useMid: true, colorM: '#ffb454', blend: 'overlay', opacity: 0.5 } },
    { name: 'Teal dip', params: { type: 'linear', colorA: '#073b4c', colorB: '#06d6a0', blend: 'screen', opacity: 0.45, angle: 270 } },
    { name: 'Vignette burn', params: { type: 'radial', colorA: '#00000000', colorB: '#120400', blend: 'multiply', opacity: 0.9, scale: 1.4 } },
    { name: 'Acid wash', params: { type: 'linear', colorA: '#c8f751', colorB: '#9d00ff', blend: 'hue', opacity: 0.8, angle: 15 } },
    { name: 'Purple haze', params: { type: 'radial', colorA: '#9d7ad2', colorB: '#1a0b2e', blend: 'softlight', opacity: 0.75 } },
    { name: 'Hard lighten split', params: { type: 'linear', colorA: '#ff3d5a', colorB: '#0a0a0a', blend: 'lighten', opacity: 0.6, angle: 0 } }
  ],
  anoise: [
    { name: '16mm film', params: { amount: 0.3, size: 1, speed: 24, blend: 'grain', flicker: 0.12 } },
    { name: '8mm dirty', params: { amount: 0.55, size: 1.6, speed: 18, blend: 'grain', flicker: 0.3, shadows: 1, highlights: 0.5 } },
    { name: 'Fine ISO 3200', params: { amount: 0.22, size: 0.6, speed: 30, colored: true, blend: 'grain' } },
    { name: 'Chunky digital', params: { amount: 0.5, size: 2.4, speed: 12, chunky: 0.8, blend: 'overlay' } },
    { name: 'Broadcast static', params: { amount: 0.75, size: 0.8, speed: 30, colored: true, blend: 'screen', highlights: 1 } },
    { name: 'Shadow crawl', params: { amount: 0.45, size: 1.2, speed: 10, shadows: 1, highlights: 0.1, blend: 'grain' } },
    { name: 'Soft bloom', params: { amount: 0.3, size: 1.8, speed: 8, blend: 'softlight', flicker: 0.05 } },
    { name: 'Frozen plate', params: { amount: 0.4, size: 1, speed: 0, blend: 'grain' } },
    { name: 'Flicker fire', params: { amount: 0.5, size: 1.3, speed: 20, flicker: 0.55, blend: 'overlay' } },
    { name: 'RGB storm', params: { amount: 0.85, size: 1, speed: 30, colored: true, blend: 'grain', chunky: 0.4 } }
  ],
  psort: [
    { name: 'Classic smear', params: { direction: 'h', lo: 0.25, hi: 0.8, order: 'asc' } },
    { name: 'Waterfall', params: { direction: 'v', lo: 0.3, hi: 0.9, order: 'desc' } },
    { name: 'Highlights only', params: { lo: 0.7, hi: 1, order: 'asc', maxRun: 400 } },
    { name: 'Shadow drag', params: { lo: 0, hi: 0.35, order: 'desc', maxRun: 600 } },
    { name: 'Short stutter', params: { lo: 0.2, hi: 0.85, maxRun: 48, chance: 0.8 } },
    { name: 'Sparse lines', params: { lo: 0.25, hi: 0.8, chance: 0.18, maxRun: 1200 } },
    { name: 'Red channel rip', params: { key: 'r', lo: 0.3, hi: 0.9, order: 'desc' } },
    { name: 'Full melt', params: { lo: 0.05, hi: 0.95, maxRun: 2000, chance: 1 } },
    { name: 'Vertical rain', params: { direction: 'v', lo: 0.4, hi: 0.75, maxRun: 160, chance: 0.6 } },
    { name: 'Green ghost', params: { key: 'g', direction: 'v', lo: 0.5, hi: 1, order: 'asc', chance: 0.4 } }
  ],
  riso: [
    { name: 'Blue/Pink classic', params: { channels: 2, ink1: 'Blue', ink2: 'Fluor Pink', grainAmt: 0.55, drift: 2.5 } },
    { name: 'Teal/Orange zine', params: { channels: 2, ink1: 'Teal', ink2: 'Orange', grainAmt: 0.6, drift: 3 } },
    { name: 'Black mono', params: { channels: 1, ink1: 'Black', grainAmt: 0.7, drift: 0, paper: '#f2ede2' } },
    { name: 'Burgundy duo', params: { channels: 2, ink1: 'Burgundy', ink2: 'Sunflower', grainAmt: 0.5, drift: 2 } },
    { name: 'CMY trap', params: { channels: 3, ink1: 'Blue', ink2: 'Fluor Pink', ink3: 'Yellow', grainAmt: 0.45, drift: 3.5, overprint: 1 } },
    { name: 'Full 4-color', params: { channels: 4, ink1: 'Black', ink2: 'Blue', ink3: 'Bright Red', ink4: 'Yellow', grainAmt: 0.4, drift: 2 } },
    { name: 'Grape soda', params: { channels: 2, ink1: 'Grape', ink2: 'Mint', grainAmt: 0.65, drift: 4 } },
    { name: 'Neon poster', params: { channels: 3, ink1: 'Purple', ink2: 'Fluor Orange', ink3: 'Fluor Pink', grainAmt: 0.55, drift: 5, overprint: 1.2 } },
    { name: 'Ledger green', params: { channels: 2, ink1: 'Ivy', ink2: 'Copper', grainAmt: 0.6, drift: 1.5, paper: '#efe7d2' } },
    { name: 'Cobalt heavy', params: { channels: 2, ink1: 'Cobalt', ink2: 'Sky Blue', grainAmt: 0.8, drift: 3, mix2: 1.4 } }
  ]
};

/* Full-stack looks — enable and configure several effects at once. */
window.STACK_PRESETS = {
  'Vintage Print': {
    cc: { on: true, temperature: 0.22, fade: 0.4, contrast: 0.1, saturation: 0.08, vignette: 0.18 },
    riso: { on: true, channels: 2, ink1: 'Bright Red', ink2: 'Sunflower', grainAmt: 0.7, drift: 2, paper: '#f7e8dc', overprint: 0.8, gamma: 1.1 },
    paper: { on: true, mode: 'white', plate: 3, opacity: 0.45, contrast: 0.12, distort: 2, grain: 0.2, desat: 0 }
  },
  'Ink Bleed': {
    cc: { on: true, temperature: -0.3, tint: -0.1, contrast: 0.15, saturation: -0.25, vignette: 0.3, shadows: -0.2 },
    air: { on: true, smoothness: 14, blend: 0.8, pastel: 0, saturation: 0.2, rainbow: 0, outline: 1, outlineSoft: 6, glow: 0, grain: 0.14 },
    paper: { on: true, mode: 'black', plate: 2, opacity: 0.6, brightness: -0.08, contrast: 0.2, distort: 8, distortScale: 1.2, grain: 0.25 }
  },
  'Archive HUD': {
    cc: { on: true, saturation: -0.2, contrast: 0.2 },
    dither: { on: true, pattern: 'Bayer 8×8', paletteMode: 'curated', curated: 'Ocean', colorCount: 6, strength: 0.5 },
    scan: { on: true, spacing: 10, maxT: 8, color: '#00e5ff', halo: true, keepSource: 0.15 }
  },
  'Night Trails': {
    cc: { on: true, contrast: 0.25, saturation: 0.3, vignette: 0.35 },
    trails: { on: true, threshold: 0.65, fade: 0.94, driftX: 3, intensity: 1.2, sourceDim: 0.3, blend: 'add' }
  },
  'Blue Bloom': {
    cc: { on: true, contrast: 0.14, saturation: 0.28, temperature: -0.12, shadows: -0.12, highlights: 0.1, vignette: 0.28, fade: 0.06 },
    air: { on: true, smoothness: 11, blend: 0.5, pastel: 0.08, saturation: 0.22, rainbow: 0, outline: 0.18, outlineSoft: 3, glow: 0.55, grain: 0.05 },
    anoise: { on: true, amount: 0.3, size: 1, speed: 18, blend: 'grain', flicker: 0.1, shadows: 1, highlights: 0.7 },
    scan: { on: true, spacing: 9, minT: 0.5, maxT: 6, softness: 9, color: '#3a7bff', halo: true, haloWidth: 2.4, haloAlpha: 0.22, keepSource: 0.9 }
  }
};
