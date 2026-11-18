/* bridge between the desktop shell and the web app (window.owDesktop) */
const { contextBridge, ipcRenderer } = require('electron');
let handler = null; const waiting = [];
ipcRenderer.on('open-files', (_e, files) => {
  const list = files.map(f => ({ name: f.name, data: new Uint8Array(f.data) }));
  if (handler) handler(list); else waiting.push(...list);
});
contextBridge.exposeInMainWorld('owDesktop', {
  platform: process.platform,
  onOpenFiles: cb => { handler = cb; if (waiting.length) cb(waiting.splice(0)); },
  version: () => ipcRenderer.invoke('ow:version'),
});
