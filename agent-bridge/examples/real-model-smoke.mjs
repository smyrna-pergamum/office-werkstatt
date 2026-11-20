// Run: node examples/real-model-smoke.mjs /path/to/llama-cli /path/to/model.gguf
// No network, no server; your own binary and model must already exist.
import {LlamaCliRunner} from '../native/llama-cli-runner.mjs';
const [binaryPath,modelPath]=process.argv.slice(2);
if(!binaryPath||!modelPath){console.error('Usage: node examples/real-model-smoke.mjs <llama-cli> <model.gguf>');process.exit(2);}
const runner=new LlamaCliRunner({binaryPath,modelPath,timeoutMs:180_000,maxTokens:768});
const plan=await runner.plan('Create one slide titled Local AI and a text block saying Offline works',{module:'slide',document:{items:[]}});
console.log(JSON.stringify(plan,null,2));
console.log('Validated plan only; no document changes were performed.');
