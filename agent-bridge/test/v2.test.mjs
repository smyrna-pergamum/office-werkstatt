import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorAdapter,slideHandler} from '../src/editor-adapter.mjs';
import {WebSearch} from '../src/web-search.mjs';
import {OfficeAgentController} from '../src/controller.mjs';

function fixture() {
  let state={slides:[]};
  let changed=0;
  const handler=slideHandler({
    exportState:()=>structuredClone(state),
    importState:s=>{state=structuredClone(s);},
    addSlide:({title})=>{state.slides.push({title}); return state.slides.length;},
    addText:()=>{}, setText:()=>{}, deleteElement:()=>{},
    refresh:()=>{changed++;}
  });
  const adapter=new EditorAdapter({activeModule:()=> 'slide',handlers:{slide:handler}});
  return {adapter,get:()=>state,changes:()=>changed};
}
test('real handler binding: preview does not alter document, approve does, undo restores',async()=>{
  const f=fixture();
  const provider={plan:async()=>({description:'Create slide',actions:[{module:'slide',tool:'add_slide',args:{title:'Hello'}}]})};
  const c=new OfficeAgentController({adapter:f.adapter,provider});
  const p=await c.prepare('Make one slide');
  assert.equal(f.get().slides.length,0);
  await c.approve(p.id);
  assert.equal(f.get().slides[0].title,'Hello');
  await c.undo();
  assert.equal(f.get().slides.length,0);
});
test('web disabled by default and never calls fetch',async()=>{
  let calls=0;
  const w=new WebSearch({baseUrl:'https://search.example',allowedOrigins:['https://search.example'],fetchImpl:async()=>{calls++;}});
  await assert.rejects(()=>w.search('hello'),/WEB_DISABLED/);
  assert.equal(calls,0);
});
test('only allowlisted search origin, and returned text marked untrusted',async()=>{
  const w=new WebSearch({enabled:true,baseUrl:'https://search.example',allowedOrigins:['https://search.example'],fetchImpl:async()=>({ok:true,json:async()=>({results:[{title:'Title',url:'https://example.org/article',content:'Untrusted content'}]})})});
  const out=await w.search('research');
  assert.equal(out[0].untrusted,true);
  assert.equal(out[0].url,'https://example.org/article');
});
test('rejects unknown editing adapter action rather than manipulating DOM',async()=>{
  const f=fixture();
  await assert.rejects(()=>f.adapter.execute({module:'word',tool:'append_paragraph',args:{text:'x'}}),e=>e.code==='MODULE_NOT_CONNECTED');
});
