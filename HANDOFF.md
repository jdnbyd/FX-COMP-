# midFX — session handoff

Last updated: 2026-08-03 · working tree has uncommitted changes (rebrand session +
this round's feature/effect pass)

## What this is

Electron desktop app for typography, grid generation, and video/image FX.
Plain JS + Canvas, no framework, no build step. Was called SIGNAL STUDIO —
renamed to **midFX** in the rebrand session (branding only, see below).
Runs on Windows, macOS, Linux — `npm install` fetches the platform's ffmpeg.

- Repo: https://github.com/jdnbyd/FX-COMP- (public, branch `main`) — **repo name and
  folder path intentionally were not renamed**, only in-app branding was. Don't
  "fix" `D:\Claude\signal-studio` or the GitHub repo name to match midFX; that
  was an explicit scope decision, not an oversight.
- Local: `D:\Claude\signal-studio`
- Run: `npm start`
- Windows build: `dist\midFX-win32-x64\midFX.exe` (portable) — stale until rebuilt,
  see README "Standalone builds"

## Architecture in 60 seconds

```
main.js          Electron main. Dialogs, ffmpeg spawn, TIFF via utif2,
                 video frame-pipe export (vexStart/vexFrame/vexEnd IPC),
                 project I/O (list/register/clear recents, open/read .midfx),
                 batch import (open-media-batch), directory picker
                 (choose-directory), custom-skin image import/clear.
preload.js       contextBridge → window.native.*
renderer/
  index.html     25 <script> tags, load order matters (util → theme → skin →
                 controls → fx_* engines → fx_presets → tool_* → settings →
                 projects → app)
  styles.css     All styling. [data-theme="x"] blocks hold color presets;
                 shape/motion tokens (radius, blur, easing) are shared;
                 html.skin-* classes layer an independent custom-skin overlay
                 on top of whichever theme is active.
  js/
    util.js         Seeded RNG (mulberry32), color math, blur, export
                    helpers (incl. saveCanvasImageToPath() for silent batch
                    writes), openModal() (generic modal), showSpinner(),
                    one-time sig.fx.* -> mfx.fx.* localStorage migration
    theme.js        Theme.list / Theme.apply(id) / Theme.current()
    skin.js         Custom Skin v1: background/slider-track/slider-thumb/
                    panel-texture image overlay, independent of theme —
                    see "Custom Skin" below
    settings.js     Gear-icon modal: theme swatches, custom skin rows,
                    default export folder, reduce-motion, reset app data
    projects.js     Past Projects launch screen + save/load orchestration;
                    also reachable mid-session via the top-bar home icon
                    (Projects.showLaunchScreen())
    controls.js     buildControls(container, schema, state, onChange)
                    — declarative control builder used by every tool
    assets.js       TexLib: bundled paper/wall/noise plates + presetRow()
                    helper + names(prefix) (now used — drives Paper Scan's
                    plate <select>)
    fx_*.js         12 effect engines. Each exports {defaults, schema, apply}
    tool_*.js       3 tools (fx, type, grid). Each pushes
                    {id,group,name,sub,mount,unmount} onto window.TOOLS;
                    tool_fx.js also implements serialize()/hydrate() for
                    project save/load, and owns the batch import/export flow
                    (see "Batch export" below)
    app.js          Shell: builds the top tab bar from TOOLS, mounts tools,
                    window.setPanelActions(), window.SigApp.select/getActive,
                    wires the settings gear + home icon, calls Projects.boot()
```

**Adding an effect:** create `fx_foo.js` exporting `{defaults, schema, apply}`,
add a `<script>` to index.html, add an entry to `FX_LIST` in `tool_fx.js`, add
10 presets under `FX_PRESETS.foo`.

**Adding a tool:** create `tool_foo.js` that pushes onto `window.TOOLS` with a
`mount(stage, panel)` method, add a `<script>` tag before `settings.js`. Nav
(top tab bar) builds itself. Optionally implement `serialize()`/`hydrate(data)`
if the tool should participate in project save/load (see below).

**Effect `kind` in FX_LIST** decides the call signature:
`'id'` → `apply(imageData, state)` · `'idmeta'` → `apply(imageData, state, meta)`
(meta = `{time, frame, reset}`, for temporal effects) · `'canvas'` →
`apply(canvas, state)` returns a canvas · `'dither'` → needs a resolved palette.

## Theming

Presets are `[data-theme="x"]` custom-property blocks in `styles.css`:
**Midnight** (default), **Aurora**, **Slate**, **Sunset**, and **Evangelion**
(legacy — the original NERV orange/lime look, values unchanged, just moved
out of `:root` into its own block). Switch via the gear icon → Settings →
Theme, or programmatically via `Theme.apply(id)`. Persisted to
`localStorage['mfx.theme']`; applied synchronously by an inline `<script>`
at the very top of `<head>` (before the stylesheet `<link>`) so there's no
flash of the wrong theme on boot — **that inline script must stay first in
`<head>`**, moving it after the stylesheet defeats the point.

Shape/motion tokens (`--radius`, `--radius-sm`, `--glass-blur`, `--shadow-soft`,
`--ease`, `--dur-fast`, `--dur-med`) are shared across all presets — only
colors and the glass/glow tint (`--glass-bg`, `--glass-border`, `--shadow-glow`)
vary per theme.

## Custom Skin (v1)

An **independent overlay** on top of whichever theme is active — not a 6th
`[data-theme]` preset, so a custom background can pair with any theme's
accent colors. Four optional slots, each a real image file copied into
`app.getPath('userData')/skins/custom/<slot>.<ext>` via `import-skin-image`
IPC (native picker + copy in one step; re-picking overwrites cleanly):

- `bg` — replaces the ambient gradient behind the glass panels
  (`html.skin-bg body`), with an automatic 45%-black scrim so arbitrary
  user images don't break text legibility the way the curated theme
  presets never do.
- `sliderTrack` / `sliderThumb` — bitmap backgrounds on `input[type=range]`
  and its `::-webkit-slider-thumb`, replacing the CSS-drawn rounded slider.
  Each has its **own** class (`skin-slider-track` / `skin-slider-thumb`) so
  setting one doesn't blank out the other. Track art stretches
  (`background-size:100% 100%`) since sliders appear at many different
  widths across the FX panel; thumb art is expected cropped to ~14×14px —
  no natural-size detection in v1.
- `panelTexture` — a tileable overlay (`mix-blend-mode: overlay`, 14%
  opacity) blended into chrome surfaces only: `#topbar`, `#panel`,
  `#statusbar`, `.fx-dock`, `.sig-modal`. **Deliberately excludes
  `#stage-wrap`** — that's the live image/video preview, and this texture
  is UI decoration; applying it there would visually (and misleadingly)
  suggest it touches the user's actual content.

State lives in `localStorage['mfx.customSkin']` (JSON of the 4 slot paths).
Class-based application (`skin-bg`/`skin-slider-track`/`skin-slider-thumb`/
`skin-panel` on `<html>`), not CSS `var()` fallback — only a class toggle
can conditionally swap a whole rule set. Same boot-flash-avoidance pattern
as theme: the head-inline `<script>` in `index.html` applies saved skin
state synchronously before the stylesheet resolves — **keep that snippet in
sync with `skin.js`'s `applyAll()` if the storage shape ever changes.**

Explicitly out of scope for v1 (a "how hard would this be" question that
became a real ask — see below for the honest ceiling): per-button pixel
sprites (true Winamp-style skinning), custom window-shape/region masking,
a visualizer color palette (no visualizer exists), a fixed-canvas classic
mode. Any of those would mean a parallel rendering mode fighting midFX's
fluid responsive layout — multi-week, not attempted here.

## Projects

Real files on disk, not hidden state: `.midfx` JSON, saved/opened via native
dialogs. Schema: `{formatVersion, name, createdAt, updatedAt, activeToolId,
thumbnail, tools: {fx: {...}}}`. A small `recents.json` under Electron's
`app.getPath('userData')/projects/` backs the "Past Projects" launch screen
(shown at boot over the already-mounted default tool, and reachable anytime
via the top-bar home icon → `Projects.showLaunchScreen()` — no
unsaved-changes guard either way, see Known gaps).

**Only `tool_fx.js` implements `serialize()`/`hydrate(data)`** — it's the only
tool with meaningful persisted state today (effect stack, params, custom
palette, and the source media path, which `hydrate()` reloads via the existing
`openPath()`). `tool_type.js`/`tool_grid.js` do not participate yet — loading
a project resets them to their default/random state. Any tool CAN implement
these two methods to opt in; `projects.js`'s save/load orchestration already
calls them generically if present.

Don't assume `mfx.fx.*` localStorage state exists when loading a `.midfx`
file — project files are meant to be portable across machines and carry their
own full snapshot; localStorage is just this machine's autosave/backup, kept
separate on purpose.

## Batch export (images only)

FX Compositor's panel (Source section) has a "▦ BATCH" button next to Import
Media, wired to `openBatchModal()` in `tool_fx.js`. Flow: native multi-file
picker (`open-media-batch` IPC, images only — no video, see Known gaps) →
review grid modal (`openModal`, `.batch-modal`, plain `<img>` thumbnails, no
canvas compositing needed since each item exports separately) → destination
folder (`choose-directory` IPC, shared with the Settings default-export-folder
feature, pre-filled from `mfx.exportDir`) → sequential processing loop.

**The processing loop temporarily reassigns the module-level `S.source`
singleton per item** (decode → `S.source = {...}` → **`S.adaptiveCache = null`**
+ `FXTrails.reset()` → `renderToOutput()` at native resolution → write via
`saveCanvasImageToPath()`, no dialog) and restores the original `S.source`
afterward. **`S.adaptiveCache = null` is the one reset that actually
matters** — dither's adaptive-palette cache has no other invalidation path
and will silently leak image 1's palette onto every later image if this line
is ever dropped. Failures (decode or write) are caught per-item and don't
abort the batch; the modal stays open afterward with per-cell done/error
badges and a summary toast.

## Non-obvious things that will bite you

1. **Export must render at preview scale.** `renderToOutput()` renders the
   pipeline at the *preview* working size then scales to output. This is
   deliberate — rendering at full res makes every pixel-space effect (blur
   radius, grain size, scanline spacing) look weaker and sharper than the
   preview. Measured drift was 8.5% before this fix, 1.3% after. Do not
   "optimize" this into a full-res render.
2. **`window.prompt()` is a no-op in Electron.** Use `openModal()` in
   `util.js` (generic modal helper — `inlinePrompt()` in tool_fx.js and the
   project rename prompt in projects.js both wrap it). This silently broke
   preset saving once already, before the fix.
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
7. **Old `sig.fx.*` localStorage keys are kept intentionally**, not cleaned up.
   `util.js`'s `migrateLegacyStorage()` copies them to `mfx.fx.*` once (without
   deleting the originals) so existing FX presets/state survived the rename.
   Don't "clean up" the old keys without checking why they're there.
8. **This sandboxed dev environment can't launch the Electron GUI by
   default** (`ELECTRON_RUN_AS_NODE=1` in the shell env forces `electron .`
   to run as plain Node, so `require('electron')` returns a path string
   instead of the API and `main.js` throws on
   `app.disableHardwareAcceleration()`). **Workaround that works**: unset
   that one env var for the launch command (e.g. `env -u
   ELECTRON_RUN_AS_NODE npm start` from Git Bash) — the window then boots
   normally. For automated verification without a human watching the
   screen, a throwaway `playwright-core` driver (`_electron.launch({
   executablePath: node_modules/electron/dist/electron.exe, env: {...
   ELECTRON_RUN_AS_NODE removed} })`) works well for screenshotting and
   `page.evaluate()`-driven interaction — install `playwright-core` in a
   scratch directory outside the repo, point `executablePath` at *this*
   project's bundled Electron binary. Native OS file/folder dialogs
   (`dialog.showOpenDialog` etc.) can't be driven this way, but
   `window.FXTool.openPath({path})` is exposed and lets a test load a real
   image without going through the picker.
9. **Legacy state after a schema change can crash `apply()`.** Paper Scan's
   `plate` field changed from a number (1-4, paired with a separate
   `mode: 'white'|'black'`) to a single string select
   (`'paper-white-1'`, etc.) this round. Anyone with existing
   `mfx.fx.state`/`.midfx` files from before that change would otherwise
   hit `plate.indexOf is not a function` — `fx_paperscan.js`'s `apply()`
   now normalizes non-string legacy values back into a valid plate name
   before use. **If you change a param's shape/type again, add the same
   kind of defensive normalization** rather than assuming everyone's saved
   state matches the new schema — this one was caught by re-running the
   Playwright verification driver against a *non-cleared* profile (i.e.
   with real leftover state from earlier in the session), not by testing
   against a fresh one.

## Recent work

**Rebrand session** (renderer/index.html, styles.css, main.js, preload.js,
util.js, app.js, controls.js, tool_fx.js + 3 new files):
1. Deleted 6 unused tools (Layout Engine, Shape Blur, Micrographics, Lace
   Filter, Glyph Forge, Psycho's GD Tool).
2. Fixed the effect-slider value readout (float-precision + CSS overflow).
3. Renamed SIGNAL STUDIO → midFX (branding only), with `sig.fx.* →
   mfx.fx.*` localStorage migration.
4. Sidebar → top tab bar.
5. Built the 5-preset theme system.
6. Built the Settings modal + generic `openModal()`.
7. Full "modern glass" visual redesign.
8. Built the Past Projects launch screen + `.midfx` project file system.

**This round** (feedback from actually using it, plus new feature asks):
1. Home icon (top bar) → back to Past Projects screen anytime, not just at
   boot (`Projects.showLaunchScreen()`).
2. Settings: default export folder (`mfx.exportDir`), shared by single
   exports and batch.
3. Vintage Airbrush: replaced the flat "rainbow mist" (position-driven RGB
   sine waves, no relation to image content) with **Iridescent** (edge/luma-
   driven, thin-film-sheen feel) and **Foliage** (blurred noise field, green/
   yellow/brown color-graded tint) modes. All 10 presets re-tuned.
4. Paper Scan: added 3 curated wall-texture plates (from a licensed pack —
   see note below), converted the hardcoded 1-4 `plate` range into a
   `<select>` driven by `TexLib.names()` (scales to any plate count from
   now on), and added a **Printer Scan** stage (faded contrast lift +
   posterize/crushed levels + clustered-dot halftone, ported from
   `fx_colorcorrect.js`/`fx_noisegrain.js`/`fx_dither.js`'s existing
   formulas) layered on top of the paper texture.
5. Batch import/export (images only) — see "Batch export" above.
6. Custom Skin v1 (background/slider/panel-texture overlay) — see
   "Custom Skin" above.

**Paper plate curation note**: the user pointed at `D:\Paper` (84 raw
JPGs + a "Light Version" subfolder) as a new source. Filenames there carry
piracy-channel obfuscation signatures (Cyrillic homoglyphs, `.url`
shortcuts to a Telegram channel) — flagged to the user directly; they
confirmed a separate license for the content, so it was used. Of 62
"Berlin Walls Vol Two" images sampled from the Light Version folder (already
reasonably sized, ~1-3MB — the root-level originals are 40-50MB raw masters
and were never used), **only 3 held up as generic, non-distracting overlay
textures** after visual review — the pack is dominated by torn-poster and
graffiti-tag photography, which reads as an obvious repeating watermark
when tiled as a texture rather than neutral grain. The 3 that made it in:
`paper-white-5`, `paper-white-6`, `paper-black-5`. If more plates are
wanted later, this pack has been mostly mined already — a different,
grain-focused pack would yield a better hit rate than resampling this one.

## Known gaps / candidate next work

1. **Type/Grid tools don't participate in project saves yet** — pure
   in-session generators today. Adding `serialize()`/`hydrate()` would be a
   small, self-contained addition using the same pattern as `tool_fx.js`.
2. **No unsaved-changes guard**, for either "New Project"/opening a
   different project, or the new home-icon navigation. `projects.js`'s
   `current.dirty` flag exists but nothing sets it on effect edits (only
   project rename does) or checks it before switching. A cheap first pass:
   warn-toast before a destructive switch.
3. **Live video preview is CPU-heavy** — throttling or a Worker +
   OffscreenCanvas would help; exports are unaffected.
4. **macOS builds are unsigned.**
5. **No undo.**
6. **Batch mode is images-only** (explicit scope decision this round —
   video batch would mean the CPU-heavy per-frame pipeline running
   sequentially across N videos, likely very slow). A follow-up if wanted;
   the sequential-processing-loop shape would carry over, just swapping
   the still-image render call for the existing video frame-pipe export.
7. **Custom Skin's slider-thumb slot assumes a fixed ~14×14px crop** rather
   than reading the uploaded image's natural size — fine for v1, a nicer
   version would size the CSS thumb to match.
8. **Foliage/Iridescent airbrush presets were tuned by eye against a
   synthetic test image**, not real photos/video — worth a second pass with
   real source material before calling the preset values final.

## Verifying a change

```bash
npm start                      # dev run (needs a real desktop, or see
                                # gotcha #8 for this sandbox's workaround)
node --check renderer/js/*.js  # syntax
```

In DevTools, the declutter regression check (from an earlier session, still valid):
```js
const p = document.getElementById('panel-body');
(p.scrollHeight / p.clientHeight).toFixed(1)   // expect ~1.6 at rest
```

Rebuild the Windows exe (close running instances first — they lock files):
```bash
npx electron-packager . "midFX" --platform=win32 --arch=x64 \
  --out=dist --overwrite --no-asar --ignore="^/dist$" --ignore="^/vendor-ffmpeg"
```

## User context

- Works on Windows, wants parity on a Mac (hence the repo).
- Reference material lives at `C:\Users\thesh\OneDrive\Desktop\fable\` —
  beetle / lace / micrographic / ornament / type gen / Marathon references,
  plus the Resource Boy paper + noise texture packs that ship in
  `renderer/assets/`. (Several of the tools those references were for —
  Lace Filter, Glyph Forge, Micrographics — were deleted as no longer
  wanted; the reference folder itself wasn't touched.)
- Additional paper/wall texture source at `D:\Paper` — see the curation
  note above before pulling more from it.
- Prefers terse, action-first responses. Lead with what to do, number multi-step
  work, give concrete time estimates, no preamble or recap.
