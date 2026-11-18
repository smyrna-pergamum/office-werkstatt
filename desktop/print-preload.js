/* bridge for the print preview window (desktop/print-preview.html) */
const { contextBridge, ipcRenderer } = require('electron');
const lang = (new URLSearchParams(location.search).get('lang') || 'en').slice(0, 2);
contextBridge.exposeInMainWorld('owPrint', {
  lang,
  printers: () => ipcRenderer.invoke('ow:pp-printers'),
  render: opts => ipcRenderer.invoke('ow:pp-render', opts),
  print: opts => ipcRenderer.invoke('ow:pp-print', opts),
  savePdf: () => ipcRenderer.invoke('ow:pp-save'),
  close: printed => ipcRenderer.send('ow:pp-close', !!printed),
});
