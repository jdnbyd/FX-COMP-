# SIGNAL STUDIO — session handoff

Last updated: 2026-07-24 · HEAD `abc1cf9` · working tree clean

## What this is

Electron desktop app for typography, layout generation, and video/image FX.
Plain JS + Canvas, no framework, no build step. ~5,100 lines.
Runs on Windows, macOS, Linux — `npm install` fetches the platform's ffmpeg.

- Repo: https://github.com/jdnbyd/FX-COMP- (public, branch `main`)
- Local: `D:\Claude\signal-studio`
- Run: `npm start`
- Windows build: `dist\SIGNAL STUDIO-win32-x64\SIGNAL STUDIO.exe` (portable)

## Architecture in 60 seconds

```
main.js          Electron main. Dialogs, ffmpeg spawn, TIFF via utif2,
                 video frame-pipe export (vexStart/vexFrame/vexEnd IPC).
preload.js       contextBridge → window.native.*
renderer/
  index.html     28 <script> tags, load order matters (util → controls →
                 fx_* engines → fx_presets → tool_* → app)
  styles.css     All styling. CSS vars at :root drive the theme.
  js/
    util.js         Seeded RNG (mulberry32), color math, blur, export helpers
    controls.js     buildControls(container, schema, state, onChange)
                    — declarative control builder used by every tool
    assets.js       TexLib: bundled paper/noise plates + presetRow() helper
    fx_*.js         12 effect engines. Each exports {defaults, schema, apply}
    fx_presets.js   10 presets per effect + STACK_PRESETS (full-stack looks)
    tool_*.js       9 tools. Each pushes {id,group,name,sub,mount,unmount}
                    onto window.TOOLS
    app.js          Shell: builds nav from TOOLS, mounts tools,
                    window.setPanelActions() for the pinned footer
```

**Adding an effect:** create `fx_foo.js` exporting `{defaults, schema, apply}`,
add a `<script>` to index.html, add an entry to `FX_LIST` in `tool_fx.js`, add
10 presets under `FX_PRESETS.foo`.

**Adding a tool:** create `tool_foo.js` that pushes onto `window.TOOLS` with a
`mount(stage, panel)` method, add a `<script>` tag. Nav builds itself.

**Effect `kind` in FX_LIST** decides the call signature:
`'id'` → `apply(imageData, state)` · `'idmeta'` → `apply(imageData, state, meta)`
(meta = `{time, frame, reset}`, for temporal effects) · `'canvas'` →
`apply(canvas, state)` returns a canvas · `'dither'` → needs a resolved palette.

## Non-obvious things that will bite you

1. **Export must render at preview scale.** `renderToOutput()` renders the
   pipeline at the *preview* working size then scales to output. This is
   deliberate — rendering at full res makes every pixel-space effect (blur
   radius, grain size, scanline spacing) look weaker and sharper than the
   preview. Measured drift was 8.5% before this fix, 1.3% after. Do not
   "optimize" this into a full-res render.
2. **`window.prompt()` is a no-op in Electron.** Use `inlinePrompt()` in
   `tool_fx.js`. This silently broke preset saving once already.
3. **Packaging must use `--no-asar`.** @electron/packager v20 defaults to asar,
   which breaks the ffmpeg binary spawn.
4. **Never copy a mac ffmpeg binary into `node_modules/ffmpeg-static/`.** On
   this machine's NTFS volume it corrupted the sibling `ffmpeg.exe` in place
   (verified by checksum). Inject mac binaries into the packaged *output* tree
   instead — see README "Standalone builds".
5. **Hardware acceleration is disabled** in `main.js` (`app.disableHardware
   Acceleration()`). A blank-window GPU compositor bug on some Windows drivers.
   The FX pipeline is pure-CPU so this costs nothing.
6. **The dev preview server caches JS hard.** When verifying UI changes in a
   browser harness, script tags serve stale copies even after reload. Generate
   a cache-busted copy of index.html (append `?v=timestamp` to each src) and
   load that instead.
7. **All state persists to localStorage** under `sig.fx.*` keys: `state`,
   `order`, `expanded`, `paletteOpen`, `dockCollapsed`, `presets`, `custom`.
   Clear these when testing "fresh install" behaviour.

## Recent work (this session)

UI declutter pass. Measured, not guessed:

| Metric | Before | After |
|---|---|---|
| FX panel scroll at rest | 7.2 screens | 1.6 |
| Sliders mounted at once | 91 | 1 |
| Export button depth | 6.8 screens down | pinned footer |
| Dock covering portrait art | yes | no |
| Stale theme colors | 12 | 0 |
| Text failing 4.5:1 contrast | 3 styles | 0 |

Root cause was that 83% of panel height was controls for *disabled* effects.
Effect blocks are now disclosures (`fx-block` / `fx-block-head` / `fx-block-body`
in `tool_fx.js` → `fxSection()`).

## Known gaps / candidate next work

1. **Three expanded effects = 3.0 screens** (aimed for 2.5). Fixing it means
   tightening row spacing, which works against readability. Left deliberately.
   If revisited: consider an accordion (one block open at a time) behind a
   preference rather than shrinking spacing.
2. **Live video preview is CPU-heavy.** The stack re-runs per frame on the main
   thread; Paper Scan / Reeded Glass / Riso each cost 150–260ms at preview size.
   Stacking several drops framerate badly. Fix would be throttling preview to
   ~24fps and skipping frames while a render is in flight, or moving the
   pipeline to a Worker + OffscreenCanvas. Exports are unaffected.
3. **macOS builds are unsigned.** Gatekeeper blocks first launch; users need
   right-click → Open, or `xattr -cr`. Needs an Apple Developer cert to fix.
4. **No undo.** Every tool is seed + parameters, so an undo stack of parameter
   snapshots would be cheap and high-value.
5. **The 8 generator tools don't use the pinned footer yet.** `setPanelActions()`
   is generic and ready; they still append export buttons inline.

## Verifying a change

```bash
npm start                      # dev run
node --check renderer/js/*.js  # syntax
```

In DevTools, the declutter regression check:
```js
const p = document.getElementById('panel-body');
(p.scrollHeight / p.clientHeight).toFixed(1)   // expect ~1.6 at rest, was 7.2
```

Rebuild the Windows exe (close running instances first — they lock files):
```bash
npx electron-packager . "SIGNAL STUDIO" --platform=win32 --arch=x64 \
  --out=dist --overwrite --no-asar --ignore="^/dist$" --ignore="^/vendor-ffmpeg"
```

## User context

- Works on Windows, wants parity on a Mac (hence the repo).
- Reference material lives at `C:\Users\thesh\OneDrive\Desktop\fable\` —
  beetle / lace / micrographic / ornament / type gen / Marathon references,
  plus the Resource Boy paper + noise texture packs that ship in
  `renderer/assets/`.
- Prefers terse, action-first responses. Lead with what to do, number multi-step
  work, give concrete time estimates, no preamble or recap.
