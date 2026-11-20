// INTEGRATION EXAMPLE. Register from your existing Electron main process.
// 'service' must be instantiated only in main and connect to the real editor adapter.
const {ipcMain}=require('electron');
function registerV4Agent({service,authorize}) {
  if(typeof authorize!=='function')throw Error('Frame authorization callback required');
  const register=(channel,fn)=>ipcMain.handle(channel,async(event,...args)=>{
    if(!authorize(event.senderFrame))throw Error('Unauthorized frame');
    if(JSON.stringify(args).length>50_000)throw Error('Payload too large');
    return fn(...args);
  });
  register('office-agent:prepare', (prompt,options)=>service.prepare(prompt,options));
  register('office-agent:approve', id=>service.approve(id));
  register('office-agent:cancel', id=>service.cancel(id));
  register('office-agent:undo', ()=>service.undo());
  register('office-agent:verify', ()=>service.verifyModel());
}
module.exports={registerV4Agent};
