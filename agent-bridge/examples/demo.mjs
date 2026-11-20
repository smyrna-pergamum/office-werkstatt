import {AgentBridge} from '../src/core.mjs';
import {MockOfficeAdapter} from '../src/mock-office.mjs';
const office=new MockOfficeAdapter();
const agent=new AgentBridge(office);
const plan=agent.preview({description:'AI presentation',actions:[
  {module:'slide',tool:'add_slide',args:{title:'Yapay Zeka ve Eğitim'}},
  {module:'word',tool:'append_paragraph',args:{text:'Sunum için konuşmacı notları.'}},
  {module:'form',tool:'add_form_question',args:{label:'Bu sunumu faydalı buldunuz mu?',type:'radio'}}
]});
console.log('Preview:',JSON.stringify(plan,null,2));
console.log('Approve:',await agent.approve(plan.id));
console.log('Slides:',await agent.read('slide'));
console.log('Undo:',await agent.undo());
console.log('Slides after undo:',await agent.read('slide'));
