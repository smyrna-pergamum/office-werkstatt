import { AgentWorkflow } from '../src/agent-workflow.mjs';
/**
 * Framework-neutral integration for the existing right-hand Agent pane.
 * Do not render AI-provided strings with innerHTML; use textContent.
 * Host provides editor adapter and provider; this module only wires controls.
 */
export function mountAgentPane({root,editor,provider,webSearch=null}) {
  const workflow=new AgentWorkflow({editor,provider,webSearch});
  const prompt=document.createElement('textarea');
  prompt.placeholder='Ajanınıza görev verin...';prompt.rows=3;
  const prepare=document.createElement('button');prepare.textContent='Plan hazırla';
  const summary=document.createElement('pre');
  const apply=document.createElement('button');apply.textContent='Onayla ve uygula';apply.disabled=true;
  const cancel=document.createElement('button');cancel.textContent='İptal';cancel.disabled=true;
  const undo=document.createElement('button');undo.textContent='AI işlemini geri al';
  let pending=null;
  const clear=()=>{pending=null;apply.disabled=true;cancel.disabled=true;};
  prepare.addEventListener('click',async()=>{
    clear();prepare.disabled=true;
    try {
      pending=await workflow.prepare(prompt.value,{module:'slide',web:false});
      summary.textContent=JSON.stringify({description:pending.description,actions:pending.actions},null,2);
      apply.disabled=false;cancel.disabled=false;
    } catch(e){summary.textContent=`Hata: ${e.message}`;}
    finally{prepare.disabled=false;}
  });
  apply.addEventListener('click',async()=>{
    if(!pending)return;
    const id=pending.id;clear();
    try {const result=await workflow.approve(id);summary.textContent=`Uygulandı: ${result.results.length} işlem`;}
    catch(e){summary.textContent=`Uygulanamadı: ${e.message}`;}
  });
  cancel.addEventListener('click',()=>{if(pending)workflow.cancel(pending.id);clear();summary.textContent='İptal edildi';});
  undo.addEventListener('click',async()=>{
    try{await workflow.undo();summary.textContent='İşlem geri alındı';}
    catch(e){summary.textContent=`Geri alma mümkün değil: ${e.message}`;}
  });
  root.append(prompt,prepare,summary,apply,cancel,undo);
  return {workflow,dispose(){clear();root.replaceChildren();}};
}
