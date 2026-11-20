import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLocalAgentService} from '../native/local-service.mjs';
import {VersionedMockOffice} from '../src/versioned-mock.mjs';
const dir=await mkdtemp(join(tmpdir(),'office-agent-v4-demo-'));
try {
  const binary=join(dir,'fake-llama-cli'),model=join(dir,'placeholder.gguf');
  await writeFile(model,'placeholder');
  await writeFile(binary,'#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({description:"Create a slide",actions:[{module:"slide",tool:"add_slide",args:{title:"AI presentation"}},{module:"slide",tool:"add_text",args:{slideId:"$result:0.id",text:"Editable content"}}]}));\n',{mode:0o755});
  const editor=new VersionedMockOffice();
  const agent=createLocalAgentService({editor,binaryPath:binary,modelPath:model});
  const preview=await agent.prepare('Create one slide');
  console.log('PREVIEW (document unchanged):',JSON.stringify(preview,null,2));
  const changed=await agent.approve(preview.id);
  console.log('APPLIED:',JSON.stringify(changed,null,2));
  console.log('PRESENTATION:',JSON.stringify(await editor.execute({module:'slide',tool:'read_document',args:{}}),null,2));
  await agent.undo();
  console.log('AFTER UNDO:',JSON.stringify(await editor.execute({module:'slide',tool:'read_document',args:{}}),null,2));
}finally{await rm(dir,{recursive:true,force:true});}
