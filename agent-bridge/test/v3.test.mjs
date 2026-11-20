import test from 'node:test';
import assert from 'node:assert/strict';
import { TransactionalOfficeAgent } from '../src/transactional-agent.mjs';
import { AgentWorkflow } from '../src/agent-workflow.mjs';
import { VersionedMockOffice } from '../src/versioned-mock.mjs';
const plan={description:'2 slides',actions:[
  {module:'slide',tool:'add_slide',args:{title:'Intro'}},
  {module:'slide',tool:'add_text',args:{slideId:'$result:0.id',text:'Hello'}},
  {module:'slide',tool:'add_slide',args:{title:'End'}}
]};
test('V3 referenced results create editable slide elements after approval',async()=>{
  const editor=new VersionedMockOffice(),tx=new TransactionalOfficeAgent(editor);
  const preview=await tx.preview(plan);
  assert.equal(editor.documents.slide.items.length,0);
  const result=await tx.approve(preview.id);
  assert.equal(result.success,true);
  assert.equal(editor.documents.slide.items[0].elements[0].text,'Hello');
  assert.equal(editor.documents.slide.items.length,2);
  await tx.undo();
  assert.equal(editor.documents.slide.items.length,0);
});
test('V3 disallows stale approval after manual editing',async()=>{
  const editor=new VersionedMockOffice(),tx=new TransactionalOfficeAgent(editor);
  const p=await tx.preview(plan);editor.manualEdit();
  await assert.rejects(()=>tx.approve(p.id),{code:'STALE_PREVIEW'});
});
test('V3 rejects nonexistent result references and rolls back',async()=>{
  const editor=new VersionedMockOffice(),tx=new TransactionalOfficeAgent(editor);
  const p=await tx.preview({actions:[{module:'slide',tool:'add_slide',args:{title:'One'}},
    {module:'slide',tool:'add_text',args:{slideId:'$result:99.id',text:'Fail'}}]});
  await assert.rejects(()=>tx.approve(p.id),{code:'EXECUTION_FAILED'});
  assert.equal(editor.documents.slide.items.length,0);
});
test('V3 detects undo conflict and preserves subsequent manual edits',async()=>{
  const editor=new VersionedMockOffice(),tx=new TransactionalOfficeAgent(editor);
  const p=await tx.preview(plan);await tx.approve(p.id);
  editor.manualEdit();await assert.rejects(()=>tx.undo(),{code:'UNDO_CONFLICT'});
  assert.equal(editor.documents.slide.items.length,2);
});
test('V3 workflow requires deliberate approval',async()=>{
 const editor=new VersionedMockOffice();
 const workflow=new AgentWorkflow({editor,provider:{async plan(){return plan;}}});
 const p=await workflow.prepare('A deck');
 assert.equal(editor.documents.slide.items.length,0);
 assert.equal(p.requiresApproval,true);
 await workflow.approve(p.id);
 assert.equal(editor.documents.slide.items.length,2);
});
test('V3 approval token cannot be reused',async()=>{
 const editor=new VersionedMockOffice(),tx=new TransactionalOfficeAgent(editor);
 const p=await tx.preview(plan);await tx.approve(p.id);
 await assert.rejects(()=>tx.approve(p.id),{code:'NOT_PENDING'});
});
