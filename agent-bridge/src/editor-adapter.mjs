import { AgentError, MODULES } from './core.mjs';

/**
 * Host-facing adapter: all mutations must use the real editor's document API.
 * Register a module handler only after binding it to the application's true model.
 * Each handler implements: snapshot(), restore(snapshot), execute(action), optional changed().
 */
export class EditorAdapter {
  constructor({activeModule, handlers, onChange=()=>{}}) {
    if(typeof activeModule !== 'function') throw new TypeError('activeModule callback required');
    this.activeModule = activeModule;
    this.handlers = new Map(Object.entries(handlers ?? {}));
    this.onChange = onChange;
    for(const module of this.handlers.keys()) {
      if(!MODULES.includes(module)) throw new TypeError(`Unknown module ${module}`);
      const h=this.handlers.get(module);
      if(!['snapshot','restore','execute'].every(k=>typeof h[k]==='function'))
        throw new TypeError(`${module} handler lacks snapshot/restore/execute`);
    }
  }
  handler(module) {
    const h=this.handlers.get(module);
    if(!h) throw new AgentError('MODULE_NOT_CONNECTED',`${module} has not been connected to Office Werkstatt`);
    return h;
  }
  async snapshot() {
    const result={};
    for(const [module,h] of this.handlers) result[module]=await h.snapshot();
    return result;
  }
  async restore(snapshot) {
    const errors=[];
    for(const [module,h] of this.handlers) {
      if(Object.hasOwn(snapshot,module)) {
        try { await h.restore(snapshot[module]); }
        catch(e) {errors.push(`${module}: ${e.message}`);}
      }
    }
    if(errors.length)throw new AgentError('RESTORE_FAILED',errors.join('; '));
  }
  async execute(action) {
    const module=action.module;
    const current=this.activeModule();
    // Reads may target other documents only if the module's host handler authorizes it.
    // Writes require a connected target module; no implicit DOM/electron shell fallback.
    if(!MODULES.includes(module)) throw new AgentError('UNKNOWN_MODULE',module);
    if(action.tool!=='read_document' && !this.handlers.has(module))
      throw new AgentError('MODULE_NOT_CONNECTED',module);
    return this.handler(module).execute(action,{activeModule:current});
  }
  async onChanged() {
    for(const h of this.handlers.values()) await h.changed?.();
    await this.onChange();
  }
}

/**
 * Example of binding to a real slide editor's stable public document API.
 * NOT a claimed Office Werkstatt internal API: supply functions from its editor bridge.
 */
export function slideHandler({exportState,importState,addSlide,addText,setText,deleteElement,refresh}) {
  for(const [name,fn] of Object.entries({exportState,importState,addSlide,addText,setText,deleteElement})) {
    if(typeof fn!=='function')throw new TypeError(`slideHandler needs ${name}`);
  }
  return {
    snapshot: exportState,
    restore: importState,
    changed: refresh,
    async execute({tool,args}) {
      switch(tool) {
        case 'read_document': return exportState();
        case 'add_slide': return addSlide({title:args.title,layout:args.layout??'title-and-content'});
        case 'add_text': return addText(args);
        case 'set_text': return setText(args);
        case 'delete_element': return deleteElement(args);
        default: throw new AgentError('UNSUPPORTED_SLIDE_TOOL',tool);
      }
    }
  };
}
