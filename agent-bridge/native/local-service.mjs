import {LlamaCliRunner} from './llama-cli-runner.mjs';
import {AgentWorkflow} from '../src/agent-workflow.mjs';

/** Runs in trusted Electron main process; paths are read from local application settings. */
export function createLocalAgentService({editor,binaryPath,modelPath,webSearch=null}={}) {
  const provider=new LlamaCliRunner({binaryPath,modelPath});
  const workflow=new AgentWorkflow({editor,provider,webSearch});
  return Object.freeze({
    prepare:(prompt,{module='slide',web=false}={})=>workflow.prepare(prompt,{module,web}),
    approve:id=>workflow.approve(id),
    cancel:id=>workflow.cancel(id),
    undo:()=>workflow.undo(),
    verifyModel:()=>provider.verify(),
  });
}
