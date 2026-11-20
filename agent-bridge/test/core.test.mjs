import test from 'node:test';
import assert from 'node:assert/strict';
import {AgentBridge,AgentError} from '../src/core.mjs';
import {MockOfficeAdapter} from '../src/mock-office.mjs';
const action=(module,tool,args)=>({module,tool,args});
test('preview does not modify office; approve and undo are atomic',async()=>{
 const editor=new MockOfficeAdapter(),agent=new AgentBridge(editor);
 const p=agent.preview({actions:[action('slide','add_slide',{title:'Intro'}),action('word','append_paragraph',{text:'Hello'})]});
 assert.equal((await agent.read('slide')).items.length,0);
 await agent.approve(p.id);
 assert.equal((await agent.read('slide')).items.length,1);
 assert.equal((await agent.read('word')).items.length,1);
 await agent.undo();
 assert.equal((await agent.read('slide')).items.length,0);
 assert.equal((await agent.read('word')).items.length,0);
});
test('rollback on invalid live edit',async()=>{
 const agent=new AgentBridge(new MockOfficeAdapter());
 const p=agent.preview({actions:[action('slide','add_slide',{title:'Intro'}),action('slide','add_text',{text:'Oops',slideId:'invalid'})]});
 await assert.rejects(()=>agent.approve(p.id),e=>e.code==='EXECUTION_FAILED');
 assert.equal((await agent.read('slide')).items.length,0);
});
test('unknown commands rejected before execution',()=>{
 const agent=new AgentBridge(new MockOfficeAdapter());
 assert.throws(()=>agent.preview({actions:[action('word','shell',{command:'rm -rf /'})]}),e=>e.code==='UNSUPPORTED_TOOL');
});
test('read requires correct module',async()=>{
 const agent=new AgentBridge(new MockOfficeAdapter());
 await assert.rejects(()=>agent.read('filesystem'),e=>e.code==='UNSUPPORTED_MODULE');
});
test('single use approval token',async()=>{
 const agent=new AgentBridge(new MockOfficeAdapter());
 const p=agent.preview({actions:[action('note','add_note',{text:'Test'})]});
 await agent.approve(p.id);
 await assert.rejects(()=>agent.approve(p.id),e=>e.code==='UNKNOWN_PLAN');
});
test('cell validation rejects unsafe addresses',()=>{
 const agent=new AgentBridge(new MockOfficeAdapter());
 assert.throws(()=>agent.preview({actions:[action('excel','set_cell',{address:'../../',value:1})]}),e=>e.code==='INVALID_ARGUMENT');
});
