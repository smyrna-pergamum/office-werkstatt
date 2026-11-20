import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LlamaCliRunner,extractJson,buildOfficePrompt} from '../native/llama-cli-runner.mjs';
import {createLocalAgentService} from '../native/local-service.mjs';
import {VersionedMockOffice} from '../src/versioned-mock.mjs';

test('extracts JSON from model output',()=>{
  assert.deepEqual(extractJson('output: {"description":"test","actions":[{"module":"slide","tool":"add_slide","args":{"title":"A"}}]}'),
    {description:'test',actions:[{module:'slide',tool:'add_slide',args:{title:'A'}}]});
});
test('rejects giant injected document context',()=>assert.throws(()=>buildOfficePrompt('make slides',{evil:'x'.repeat(40000)})));
test('fully offline inference subprocess produces a validated plan, approval changes mock slides',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'office-v4-test-'));
  try{
    const model=join(dir,'fake.gguf'),binary=join(dir,'fake-cli');
    await writeFile(model,'GGUF');
    await writeFile(binary,'#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({description:"One slide",actions:[{module:"slide",tool:"add_slide",args:{title:"V4"}},{module:"slide",tool:"add_text",args:{slideId:"$result:0.id",text:"Works"}}]}));\n',{mode:0o755});
    const runner=new LlamaCliRunner({binaryPath:binary,modelPath:model});
    const office=new VersionedMockOffice();
    const service=createLocalAgentService({editor:office,binaryPath:binary,modelPath:model});
    assert.deepEqual((await runner.plan('Make one slide',{})).actions.map(x=>x.tool),['add_slide','add_text']);
    const preview=await service.prepare('Make one slide');
    assert.equal(preview.requiresApproval,true);
    assert.equal((await office.execute({module:'slide',tool:'read_document',args:{}})).items.length,0);
    const approved=await service.approve(preview.id);
    assert.equal(approved.success,true);
    const doc=await office.execute({module:'slide',tool:'read_document',args:{}});
    assert.equal(doc.items[0].elements[0].text,'Works');
    await service.undo();
    assert.equal((await office.execute({module:'slide',tool:'read_document',args:{}})).items.length,0);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('invalid GGUF path is rejected before process execution',async()=>{
  const runner=new LlamaCliRunner({binaryPath:'/not-present',modelPath:'/not-present.gguf'});
  await assert.rejects(()=>runner.plan('hello',{}));
});
