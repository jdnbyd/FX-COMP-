# SIGNAL // STUDIO

Desktop studio for typography effects, layout generation, and video/image FX. Marathon (2026)-inspired UI: dark graphite, cyan/chartreuse HUD accents, angular cuts.

## Run from source (Mac / Windows / Linux)

Node 18+ required. `npm install` auto-downloads the ffmpeg binary for whatever OS you're on, so the same repo runs everywhere.

```bash
git clone <your-repo-url> signal-studio
cd signal-studio
npm install
npm start
```

On macOS the first `npm start` builds nothing extra — it launches the app directly via Electron. To make a double-clickable `.app` on the Mac instead:

```bash
npx electron-packager . "SIGNAL STUDIO" --platform=darwin --arch=arm64 --out=dist --overwrite --no-asar
# use --arch=x64 for Intel Macs
```

That produces `dist/SIGNAL STUDIO-darwin-arm64/SIGNAL STUDIO.app`. Since it's unsigned, first launch: right-click the app → **Open** → **Open**, or run `xattr -cr "SIGNAL STUDIO.app"` once.

## Import / Export

- Images: PNG, JPG, TIF (TIFF decoded/encoded via utif2)
- Video: MP4 and MOV in — MOV auto-converts to H.264 MP4 on import (ffmpeg-static)
- Export: PNG / JPG / TIF images, MP4 / MOV video (frames re-rendered through the FX stack, original audio optionally muxed back in)

## Standalone builds

- Windows: `dist\SIGNAL STUDIO-win32-x64\SIGNAL STUDIO.exe` — portable, no install.
  Rebuild: `npx electron-packager . "SIGNAL STUDIO" --platform=win32 --arch=x64 --out=dist --overwrite --no-asar --ignore="^/dist$"`
- macOS: `dist\SIGNAL STUDIO-mac-x64.tar.gz` (Intel) and `dist\SIGNAL STUDIO-mac-arm64.tar.gz` (Apple Silicon).
  Cross-built from Windows — unsigned, so on first launch macOS Gatekeeper will block it. On the Mac: unzip, then either right-click the app → **Open** → **Open** in the dialog, or run `xattr -cr "SIGNAL STUDIO.app"` in Terminal once. No further steps needed after that.
  Rebuild (see `scripts/pack-mac-tar.py` — required because Windows can't natively author macOS-executable permission bits or forward-slash symlinks in a zip):
  1. `npx electron-packager . "SIGNAL STUDIO" --platform=darwin --arch=x64 --out=dist --overwrite --no-asar --app-bundle-id=studio.signal.app --ignore="^/dist$" --ignore="^/vendor-ffmpeg"` (repeat with `--arch=arm64`)
  2. Copy the matching mac ffmpeg binary from `vendor-ffmpeg/darwin-<arch>/ffmpeg` into `dist/SIGNAL STUDIO-darwin-<arch>/SIGNAL STUDIO.app/Contents/Resources/app/node_modules/ffmpeg-static/ffmpeg`, and delete `ffmpeg.exe*` from that folder.
  3. `python scripts/pack-mac-tar.py "dist/SIGNAL STUDIO-darwin-<arch>" "dist/SIGNAL STUDIO-mac-<arch>.tar.gz"`
  Never `cp` a mac ffmpeg binary into the shared dev `node_modules/ffmpeg-static/` — on this machine's NTFS volume that has corrupted the sibling `ffmpeg.exe` in place. Always inject mac binaries into the packaged **output** tree instead.

## Modules

| Module | What it does |
|---|---|
| FX Compositor | 9-effect stack over image/video, each with 10 presets: **Color Correct**, **Bevel & Emboss**, **Palette Dither** (12 curated palettes, adaptive, 18-swatch editor, 23 patterns, OKLab), **Vintage Airbrush** (10 sliders), **Risograph** (35 spot inks, real grain plates, registration drift, subtractive overprint), **Paper Scan** (real scanned paper plates, distortion), **Reeded Glass** (4 patterns, dispersion, animated shift), **Scanlines**, **Motion Trails** (temporal, 7 blend modes). Stack presets incl. ★ Vintage Print and ★ Ink Bleed. |
| Type Generator | Address-block clusters (stacked offset color boxes, justified `left|right` pairs) with width/height/font/size/kerning/padding/box-color controls + color wheel. 10 presets. |
| Grid Generator | Type a doc size → random column/modular/manuscript grid + baseline, PNG/SVG + numeric spec. |
| Layout Engine | Random content placement on your grid; modular type scales (golden ratio, major third, …) with random reroll. |
| Shape Blur | shapeblur.com-style soft gradient shapes: 7 shapes, 2-color gradient, heavy blur, glow, grain, echoes. 10 presets. |
| Micrographics | Archive-label kit: barcodes, pill words, hex/circle badges, [00] tags, dot-matrix text, CE marks, warning triangles — sheet/grid/strip layouts. 10 presets. |
| Lace Filter | Doily engine: image halftoned inside oval/circle/rect/cross lace frames, scallops, ribbon rings, 5 stitch types, thread weight. 10 presets. |
| Glyph Forge | Marathon-style glyph grids, ATTENTION warning plates and badge sheets; uses the bundled Marathon glyph font and your own imported images. 10 presets. |
| Psycho's GD Tool | Embedded https://a-psychos-gd-tool.vercel.app (WebGPU node-based poster tool). |

v3: UI restyled to an Evangelion/NERV theme (alert orange + terminal green on black-purple, serif brand, MAGI.SYS bar). FX Compositor now has **12 effects** with a **drag-to-reorder stack dock** on the left of the stage (order persists and saves into presets). Added: **Gradient Layer** (linear/radial/conic, 8 blend modes), **Animated Grain** (film-style crawling noise from the real plates — the Fast Grain .aex is an AE-only plugin and cannot be embedded), **Pixel Sort**. Micrographics and Glyph Forge accept user-imported images as stamps/glyphs. Beetle Lab removed.

Bundled assets in `renderer/assets/`: 8 real scanned paper plates + 4 noise plates (Resource Boy packs) used by Paper Scan, Risograph, Reeded Glass and Animated Grain, plus the Marathon glyph font (`marathon-glyph.otf`).

## Notes

- Setup gotcha (hit once on this machine): if `npm start` says "Electron failed to install correctly", the cached zip was corrupt — delete `%LOCALAPPDATA%\electron\Cache`, then extract the re-downloaded zip into `node_modules/electron/dist` and write `electron.exe` into `node_modules/electron/path.txt`.
- Presets and custom palettes live in localStorage.
