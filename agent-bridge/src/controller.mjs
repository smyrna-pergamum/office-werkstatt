import { AgentBridge, validatePlan } from './core.mjs';

/** Strictly separates user request, model planning, preview and approved execution. */
export class OfficeAgentController {
  constructor({adapter,provider,webSearch=null}) {
    this.agent=new AgentBridge(adapter);
    this.provider=provider;
    this.webSearch=webSearch;
  }
  async prepare(userPrompt,{module='slide',useWeb=false}={}) {
    if(typeof userPrompt!=='string'||!userPrompt.trim()||userPrompt.length>5000)
      throw new TypeError('Invalid prompt');
    const context=await this.agent.read(module);
    let sources=[];
    if(useWeb) {
      if(!this.webSearch)throw new Error('Web search is not configured');
      sources=await this.webSearch.search(userPrompt);
    }
    // Web results are untrusted reference text. They are never executed as instructions.
    const modelContext={module,document:context,webSources:sources};
    const plan=validatePlan(await this.provider.plan(userPrompt,modelContext));
    // An additional explicit approve(id) call must be triggered by the user interface.
    const preview=this.agent.preview(plan);
    return {...preview,sources};
  }
  approve(id) {return this.agent.approve(id);}
  cancel(id) {return this.agent.cancel(id);}
  undo() {return this.agent.undo();}
}
