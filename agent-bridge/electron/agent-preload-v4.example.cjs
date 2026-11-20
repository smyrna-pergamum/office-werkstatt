// Merge into your existing, trusted Electron preload. Do not enable nodeIntegration in the renderer.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('officeAgentV4',Object.freeze({
  prepare:(prompt,options)=>ipcRenderer.invoke('office-agent:prepare',prompt,options),
  approve:id=>ipcRenderer.invoke('office-agent:approve',id),
  cancel:id=>ipcRenderer.invoke('office-agent:cancel',id),
  undo:()=>ipcRenderer.invoke('office-agent:undo'),
  verify:()=>ipcRenderer.invoke('office-agent:verify'),
}));
