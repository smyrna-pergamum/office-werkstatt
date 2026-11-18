/* bridge between the desktop shell and the web app (window.owDesktop) */
const { contextBridge, ipcRenderer } = require('electron');
let handler = null; const waiting = [];
ipcRenderer.on('open-files', (_e, files) => {
  const list = files.map(f => ({ name: f.name, data: new Uint8Array(f.data) }));
  if (handler) handler(list); else waiting.push(...list);
});
// tell the main process the interface language (used for the "unsaved changes" dialog when closing)
const sendLang = () => { try { const l = localStorage.getItem('ow-lang'); if (l) ipcRenderer.send('ow:lang', l); } catch { /* ignore */ } };
window.addEventListener('DOMContentLoaded', sendLang);
window.addEventListener('ow-lang', sendLang);
contextBridge.exposeInMainWorld('owDesktop', {
  platform: process.platform,
  onOpenFiles: cb => { handler = cb; if (waiting.length) cb(waiting.splice(0)); },
  version: () => ipcRenderer.invoke('ow:version'),
  // printing goes through the main process (window.print() hangs the desktop window)
  printHTML: html => ipcRenderer.invoke('ow:print-html', String(html)),
  setLanguage: l => ipcRenderer.send('ow:lang', String(l)),
});
