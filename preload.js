const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('native', {
  hasFfmpeg: () => ipcRenderer.invoke('has-ffmpeg'),
  openMedia: (kind) => ipcRenderer.invoke('open-media', kind),
  loadMedia: (p) => ipcRenderer.invoke('load-media', p),
  onOpenPath: (cb) => ipcRenderer.on('open-path', (e, d) => cb(d)),
  convertMov: (p) => ipcRenderer.invoke('convert-mov', p),
  chooseSavePath: (opt) => ipcRenderer.invoke('choose-save-path', opt),
  writeFile: (p, data, isText) => ipcRenderer.invoke('write-file', p, data, isText),
  writeTiff: (p, w, h, rgba) => ipcRenderer.invoke('write-tiff', p, w, h, rgba),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  vexStart: (opt) => ipcRenderer.invoke('vex-start', opt),
  vexFrame: (u8) => ipcRenderer.invoke('vex-frame', u8),
  vexEnd: () => ipcRenderer.invoke('vex-end'),
  onFfmpegProgress: (cb) => ipcRenderer.on('ffmpeg-progress', (e, d) => cb(d))
});
