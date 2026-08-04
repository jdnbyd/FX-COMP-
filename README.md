# midFX

Desktop studio for typography effects, grid generation, and video/image FX.

## Run from source (Mac / Windows / Linux)

Node 18+ required. `npm install` auto-downloads the ffmpeg binary for whatever OS you're on, so the same repo runs everywhere.

```bash
git clone <your-repo-url> midfx
cd midfx
npm install
npm start
```

On macOS the first `npm start` builds nothing extra — it launches the app directly via Electron. To make a double-clickable `.app` on the Mac instead:

```bash
npx electron-packager . "midFX" --platform=darwin --arch=arm64 --out=dist --overwrite --no-asar
# use --arch=x64 for Intel Macs
```

That produces `dist/midFX-darwin-arm64/midFX.app`. Since it's unsigned, first launch: right-click the app → **Open** → **Open**, or run `xattr -cr "midFX.app"` once.

## Import / Export

- Images: PNG, JPG, TIF (TIFF decoded/encoded via utif2)
- Video: MP4 and MOV in — MOV auto-converts to H.264 MP4 on import (ffmpeg-static)
- Export: PNG / JPG / TIF images, MP4 / MOV video (frames re-rendered through the FX stack, original audio optionally muxed back in)

## Standalone builds

- Windows: `dist\midFX-win32-x64\midFX.exe` — portable, no install.
  Rebuild: `npx electron-packager . "midFX" --platform=win32 --arch=x64 --out=dist --overwrite --no-asar --ignore="^/dist$"`
- macOS: `dist\midFX-mac-x64.tar.gz` (Intel) and `dist\midFX-mac-arm64.tar.gz` (Apple Silicon).
  Cross-built from Windows — unsigned, so on first launch macOS Gatekeeper will block it. On the Mac: unzip, then either right-click the app → **Open** → **Open** in the dialog, or run `xattr -cr "midFX.app"` in Terminal once. No further steps needed after that.
  Rebuild (see `scripts/pack-mac-tar.py` — required because Windows can't natively author macOS-executable permission bits or forward-slash symlinks in a zip):
  1. `npx electron-packager . "midFX" --platform=darwin --arch=x64 --out=dist --overwrite --no-asar --app-bundle-id=app.midfx.studio --ignore="^/dist$" --ignore="^/vendor-ffmpeg"` (repeat with `--arch=arm64`)
  2. Copy the matching mac ffmpeg binary from `vendor-ffmpeg/darwin-<arch>/ffmpeg` into `dist/midFX-darwin-<arch>/midFX.app/Contents/Resources/app/node_modules/ffmpeg-static/ffmpeg`, and delete `ffmpeg.exe*` from that folder.
  3. `python scripts/pack-mac-tar.py "dist/midFX-darwin-<arch>" "dist/midFX-mac-<arch>.tar.gz"`
  Never `cp` a mac ffmpeg binary into the shared dev `node_modules/ffmpeg-static/` — on this machine's NTFS volume that has corrupted the sibling `ffmpeg.exe` in place. Always inject mac binaries into the packaged **output** tree instead.

## Modules

| Module | What it does |
|---|---|
| FX Compositor | 12-effect stack over image/video, each with 10 presets: **Color Correct**, **Gradient Layer** (linear/radial/conic, 8 blend modes), **Bevel & Emboss**, **Palette Dither** (12 curated palettes, adaptive, 18-swatch editor, 23 patterns, OKLab), **Vintage Airbrush** (10 sliders), **Risograph** (35 spot inks, real grain plates, registration drift, subtractive overprint), **Paper Scan** (real scanned paper plates, distortion), **Reeded Glass** (4 patterns, dispersion, animated shift), **Pixel Sort**, **Scanlines**, **Animated Grain** (film-style crawling noise from real plates), **Motion Trails** (temporal, 7 blend modes). Drag-to-reorder stack dock; order persists and saves into presets. Stack presets incl. ★ Vintage Print and ★ Ink Bleed. |
| Type Generator | Address-block clusters (stacked offset color boxes, justified `left|right` pairs) with width/height/font/size/kerning/padding/box-color controls + color wheel. 10 presets. |
| Grid Generator | Type a doc size → random column/modular/manuscript grid + baseline, PNG/SVG + numeric spec. |

Bundled assets in `renderer/assets/`: 8 real scanned paper plates + 4 noise plates (Resource Boy packs) used by Paper Scan, Risograph, Reeded Glass and Animated Grain.

Theme is selectable from **Settings** (gear icon, top bar): several modern presets plus a legacy Evangelion/NERV look (alert orange + terminal green on black-purple).

## Notes

- Setup gotcha (hit once on this machine): if `npm start` says "Electron failed to install correctly", the cached zip was corrupt — delete `%LOCALAPPDATA%\electron\Cache`, then extract the re-downloaded zip into `node_modules/electron/dist` and write `electron.exe` into `node_modules/electron/path.txt`.
- Presets, custom palettes, and theme choice live in localStorage under the `mfx.*` namespace. Projects (saved via the Past Projects screen) are separate `.midfx` JSON files you choose the location for.
