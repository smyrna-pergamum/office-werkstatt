import { AgentWorkflow } from '../src/agent-workflow.mjs';
import { VersionedMockOffice } from '../src/versioned-mock.mjs';
const editor=new VersionedMockOffice();
const provider={async plan(){return {description:'Two-slide editable deck',actions:[
  {module:'slide',tool:'add_slide',args:{title:'Yapay Zeka'}},
  {module:'slide',tool:'add_text',args:{slideId:'$result:0.id',text:'AI ile üretkenlik'}},
  {module:'slide',tool:'add_slide',args:{title:'Güvenli Kullanım'}},
  {module:'slide',tool:'add_text',args:{slideId:'$result:2.id',text:'Kaynakları doğrulayın'}}
]};}};
const workflow=new AgentWorkflow({editor,provider});
const preview=await workflow.prepare('İki slayt hazırla');
console.log('PREVIEW:',JSON.stringify(preview,null,2));
console.log('APPLY:',JSON.stringify(await workflow.approve(preview.id),null,2));
console.log('SLIDES:',JSON.stringify(editor.documents.slide,null,2));
console.log('UNDO:',JSON.stringify(await workflow.undo(),null,2));
console.log('SLIDES AFTER UNDO:',JSON.stringify(editor.documents.slide,null,2));
