const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let ffmpegPath = null;
try { ffmpegPath = require('ffmpeg-static'); } catch (e) { /* video features disabled */ }
let UTIF = null;
try { UTIF = require('utif2'); } catch (e) { /* tiff features disabled */ }

let win = null;

// Blank-window resilience: on some Windows GPU drivers Electron's GPU
// compositor fails and the window renders black. The FX pipeline is pure-JS
// (CPU ImageData), so dropping GPU acceleration costs almost nothing here and
// makes launch reliable. Also stop the GPU shader disk-cache that was erroring.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Single-instance lock so stale copies don't pile up and fight over the cache.
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1120,
    minHeight: 700,
    backgroundColor: '#06080a',
    show: false,
    autoHideMenuBar: true,
    title: 'midFX',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    if (level >= 2) console.log(`[renderer] ${message} (${sourceId}:${line})`);
  });
  win.webContents.on('did-finish-load', () => {
    const openArg = process.argv.slice(1).find((a) => /\.(mp4|mov|png|jpe?g|tiff?)$/i.test(a) && fs.existsSync(a));
    if (openArg) {
      win.webContents.send('open-path', {
        path: openArg,
        autotest: process.argv.includes('--autotest'),
        autotestOut: path.join(app.getPath('temp'), 'sigstudio-autotest.mp4')
      });
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

if (hasLock) app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

function fileUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/').replace(/ /g, '%20');
}

function runFfmpeg(args, onLine) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let err = '';
    proc.stderr.on('data', (d) => {
      const s = d.toString();
      err += s;
      if (onLine) onLine(s);
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('ffmpeg exited ' + code + '\n' + err.slice(-2000)));
    });
  });
}

ipcMain.handle('has-ffmpeg', () => !!ffmpegPath);

function describeMedia(p) {
  const ext = path.extname(p).slice(1).toLowerCase();
  const isVideo = ext === 'mp4' || ext === 'mov';
  const out = { path: p, ext, url: fileUrl(p), kind: isVideo ? 'video' : 'image' };
  if ((ext === 'tif' || ext === 'tiff') && UTIF) {
    const buf = fs.readFileSync(p);
    const ifds = UTIF.decode(buf);
    UTIF.decodeImage(buf, ifds[0]);
    const rgba = UTIF.toRGBA8(ifds[0]);
    out.kind = 'image-raw';
    out.width = ifds[0].width;
    out.height = ifds[0].height;
    out.data = Buffer.from(rgba);
  }
  return out;
}

ipcMain.handle('open-media', async (e, kind) => {
  const filtersAll = [
    { name: 'All media', extensions: ['png', 'jpg', 'jpeg', 'tif', 'tiff', 'mp4', 'mov'] },
    { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tif', 'tiff'] },
    { name: 'Video', extensions: ['mp4', 'mov'] }
  ];
  const filtersImg = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tif', 'tiff'] }];
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: kind === 'image' ? filtersImg : filtersAll
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return describeMedia(r.filePaths[0]);
});

ipcMain.handle('load-media', async (e, p) => describeMedia(p));

// batch import — images only (see HANDOFF.md, batch mode is scoped to
// stills; video batch would mean running the CPU-heavy per-frame pipeline
// across N videos sequentially, a follow-up if ever wanted).
ipcMain.handle('open-media-batch', async () => {
  const filtersImg = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tif', 'tiff'] }];
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: filtersImg
  });
  if (r.canceled || !r.filePaths.length) return null;
  return r.filePaths.map(describeMedia);
});

// Convert .mov (or anything) to an h264 mp4 in temp so Chromium can play it.
ipcMain.handle('convert-mov', async (e, inPath) => {
  if (!ffmpegPath) throw new Error('ffmpeg-static not installed');
  const out = path.join(app.getPath('temp'), 'sigstudio-' + Date.now() + '.mp4');
  await runFfmpeg(
    ['-y', '-i', inPath, '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out],
    (s) => {
      const m = s.match(/time=(\d+):(\d+):([\d.]+)/);
      if (m && win) win.webContents.send('ffmpeg-progress', { seconds: (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) });
    }
  );
  return { path: out, url: fileUrl(out) };
});

ipcMain.handle('choose-save-path', async (e, opt) => {
  const r = await dialog.showSaveDialog(win, {
    defaultPath: opt.defaultDir ? path.join(opt.defaultDir, opt.defaultName) : opt.defaultName,
    filters: opt.filters
  });
  if (r.canceled || !r.filePath) return null;
  return r.filePath;
});

ipcMain.handle('write-file', async (e, p, data, isText) => {
  fs.writeFileSync(p, isText ? String(data) : Buffer.from(data));
  return p;
});

ipcMain.handle('write-tiff', async (e, p, w, h, rgba) => {
  if (!UTIF) throw new Error('utif2 not installed');
  const u8 = new Uint8Array(rgba);
  const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  const enc = UTIF.encodeImage(ab, w, h);
  fs.writeFileSync(p, Buffer.from(enc));
  return p;
});

ipcMain.handle('open-external', (e, url) => shell.openExternal(url));

// shared directory picker — backs both the Settings default export folder
// and the batch-export destination picker.
ipcMain.handle('choose-directory', async (e, opt) => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    defaultPath: opt && opt.defaultPath
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return r.filePaths[0];
});

// ---- projects: recent-projects index (recents.json) + .midfx file I/O ----
const PROJECTS_DIR = path.join(app.getPath('userData'), 'projects');
const RECENTS_PATH = path.join(PROJECTS_DIR, 'recents.json');

function ensureProjectsDir() { fs.mkdirSync(PROJECTS_DIR, { recursive: true }); }
function readRecents() {
  ensureProjectsDir();
  try { return JSON.parse(fs.readFileSync(RECENTS_PATH, 'utf8')); } catch (e) { return []; }
}
function writeRecents(list) { ensureProjectsDir(); fs.writeFileSync(RECENTS_PATH, JSON.stringify(list, null, 2)); }

ipcMain.handle('list-recent-projects', () => {
  const list = readRecents().filter((r) => fs.existsSync(r.path));
  writeRecents(list); // prune entries whose file went missing
  return list;
});

ipcMain.handle('register-recent-project', (e, entry) => {
  let list = readRecents().filter((r) => r.path !== entry.path);
  list.unshift(entry);
  list = list.slice(0, 20);
  writeRecents(list);
  return list;
});

ipcMain.handle('clear-recent-projects', () => { writeRecents([]); return true; });

// ---- custom skin: background / slider track+thumb / panel texture images ----
const SKIN_DIR = path.join(app.getPath('userData'), 'skins', 'custom');

ipcMain.handle('import-skin-image', async (e, { slot }) => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  });
  if (r.canceled || !r.filePaths[0]) return null;
  fs.mkdirSync(SKIN_DIR, { recursive: true });
  const ext = path.extname(r.filePaths[0]) || '.png';
  const dest = path.join(SKIN_DIR, slot + ext);
  // clear any previous file for this slot under a different extension
  for (const f of fs.readdirSync(SKIN_DIR)) {
    if (f.startsWith(slot + '.')) fs.unlinkSync(path.join(SKIN_DIR, f));
  }
  fs.copyFileSync(r.filePaths[0], dest);
  return dest;
});

ipcMain.handle('clear-skin-image', (e, { slot }) => {
  if (!fs.existsSync(SKIN_DIR)) return true;
  for (const f of fs.readdirSync(SKIN_DIR)) {
    if (f.startsWith(slot + '.')) fs.unlinkSync(path.join(SKIN_DIR, f));
  }
  return true;
});

ipcMain.handle('open-project-file', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'midFX Project', extensions: ['midfx'] }]
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const p = r.filePaths[0];
  return { path: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
});

ipcMain.handle('read-project-file', (e, p) => {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
});

// ---- video export: PNG frames piped into ffmpeg ----
let vex = null;
ipcMain.handle('vex-start', (e, opt) => {
  if (!ffmpegPath) throw new Error('ffmpeg-static not installed');
  const args = ['-y', '-f', 'image2pipe', '-framerate', String(opt.fps), '-i', '-'];
  if (opt.audioPath) args.push('-i', opt.audioPath);
  args.push('-map', '0:v');
  if (opt.audioPath) args.push('-map', '1:a?', '-c:a', 'aac', '-shortest');
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p');
  if (opt.outPath.toLowerCase().endsWith('.mp4')) args.push('-movflags', '+faststart');
  args.push(opt.outPath);
  vex = spawn(ffmpegPath, args);
  vex.stderr.on('data', () => {});
  vex.on('error', (err) => console.log('vex error', err));
  return true;
});

ipcMain.handle('vex-frame', (e, u8) => new Promise((resolve, reject) => {
  if (!vex) return reject(new Error('export not started'));
  const ok = vex.stdin.write(Buffer.from(u8));
  if (ok) resolve(true);
  else vex.stdin.once('drain', () => resolve(true));
}));

ipcMain.handle('vex-end', () => new Promise((resolve) => {
  if (!vex) return resolve(-1);
  vex.stdin.end();
  vex.on('close', (code) => { vex = null; resolve(code); });
}));
