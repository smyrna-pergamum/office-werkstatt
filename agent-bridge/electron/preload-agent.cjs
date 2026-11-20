// Add these calls to your EXISTING Electron preload rather than replacing it.
// Renderer never receives Node.js, raw shell access, or an API key.
const {contextBridge,ipcRenderer}=require('electron');
const allowed=['agent:local-generate','agent:web-search','agent:openai-generate'];
contextBridge.exposeInMainWorld('officeAgentNative',Object.freeze({
  localGenerate: payload=>ipcRenderer.invoke('agent:local-generate',payload),
  webSearch: query=>ipcRenderer.invoke('agent:web-search',{query}),
  openaiGenerate: payload=>ipcRenderer.invoke('agent:openai-generate',payload),
}));
