// EXAMPLE ONLY: import and register within desktop Electron main process.
// Native Rust llama.cpp is not linked here; pass a function from your native module.
const {ipcMain}=require('electron');
function registerAgentIpc({localGenerate,webSearch,openaiGenerate,authorizedSender}) {
  const guard=(fn)=>async(event,data)=>{
    if(!authorizedSender(event.senderFrame))throw new Error('Unauthorized renderer');
    if(!data || JSON.stringify(data).length>100000)throw new Error('Payload limit exceeded');
    return fn(data);
  };
  ipcMain.handle('agent:local-generate',guard(localGenerate));
  ipcMain.handle('agent:web-search',guard(async({query})=>webSearch.search(query)));
  ipcMain.handle('agent:openai-generate',guard(openaiGenerate));
}
module.exports={registerAgentIpc};
