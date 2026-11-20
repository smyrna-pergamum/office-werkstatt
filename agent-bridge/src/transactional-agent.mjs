import { AgentError, validatePlan } from './core.mjs';

const copy=x=>structuredClone(x);
function error(code,message){return new AgentError(code,message);}

/**
 * V3 execution contract:
 *  editor.readIdentity() => {documentId:string, revision:string|number}
 *  editor.snapshot() => serializable state
 *  editor.restore(snapshot) => void (fallback only; a native history transaction is preferable)
 *  editor.execute(action) => action result
 *  editor.onChanged?() => notify UI
 *
 * The host must bump `revision` for EVERY manual or AI edit. All reads and
 * mutations of editor state must be marshalled onto the same UI event loop.
 */
export class TransactionalOfficeAgent {
  #pending=new Map();
  #undo=[];
  #busy=false;
  #sequence=0;
  constructor(editor,{maxHistory=25}={}) {
    for(const name of ['readIdentity','snapshot','restore','execute'])
      if(typeof editor?.[name]!=='function')throw error('ADAPTER_INVALID',`Missing ${name}`);
    this.editor=editor;
    this.maxHistory=maxHistory;
  }
  async preview(rawPlan){
    const plan=validatePlan(rawPlan);
    const identity=await this.editor.readIdentity();
    if(!identity || typeof identity.documentId!=='string' || !identity.documentId || !['number','string'].includes(typeof identity.revision))
      throw error('DOCUMENT_IDENTITY','Missing document identity or revision');
    const id=`pending-${++this.#sequence}`;
    this.#pending.clear(); // old previews cannot be applied after another plan
    this.#pending.set(id,{plan,identity:copy(identity)});
    return {id,documentId:identity.documentId,revision:identity.revision,
      description:plan.description,actions:copy(plan.actions),requiresApproval:true};
  }
  cancel(id){return this.#pending.delete(id);}
  async approve(id){
    if(this.#busy)throw error('BUSY','Another agent transaction is in progress');
    const item=this.#pending.get(id);
    if(!item)throw error('NOT_PENDING','Preview no longer exists or has been applied');
    this.#busy=true;
    this.#pending.delete(id);
    try {
      const current=await this.editor.readIdentity();
      if(current.documentId!==item.identity.documentId || current.revision!==item.identity.revision)
        throw error('STALE_PREVIEW','Document changed after preview; generate a new preview');
      const before=await this.editor.snapshot();
      const results=[];
      try {
        for(const rawAction of item.plan.actions){
          const action=resolveReferences(rawAction,results);
          // Every action is checked again after resolving previous tool results.
          validatePlan({actions:[action]});
          results.push(copy(await this.editor.execute(action)));
        }
      } catch(e){
        try {await this.editor.restore(before);await this.editor.onChanged?.();}
        catch(restoreError){throw error('ROLLBACK_FAILED',`${e.message}; rollback: ${restoreError.message}`);}
        throw error('EXECUTION_FAILED',`Rolled back: ${e.message}`);
      }
      this.#undo.push({before,documentId:item.identity.documentId,
        after:copy(await this.editor.readIdentity())});
      if(this.#undo.length>this.maxHistory)this.#undo.shift();
      this.#pending.clear();
      await this.editor.onChanged?.();
      return {success:true,results,documentId:item.identity.documentId};
    } finally {this.#busy=false;}
  }
  async undo(){
    if(this.#busy)throw error('BUSY','Another agent transaction is in progress');
    const last=this.#undo.at(-1);
    if(!last)throw error('NOTHING_TO_UNDO','No agent edit to undo');
    const current=await this.editor.readIdentity();
    if(current.documentId!==last.documentId || current.revision!==last.after.revision)
      throw error('UNDO_CONFLICT','Document changed; use editor native Undo instead');
    this.#busy=true;
    try {
      await this.editor.restore(last.before);
      this.#undo.pop();
      this.#pending.clear();
      await this.editor.onChanged?.();
      return {success:true};
    }finally{this.#busy=false;}
  }
}

/** Only allow exact references like "$result:0.id". No expression evaluation. */
export function resolveReferences(value,results){
  if(typeof value==='string') {
    if(!value.startsWith('$result:'))return value;
    const match=/^\$result:(\d+)\.(id|slideId|elementId|sheetId|name)$/.exec(value);
    if(!match)throw error('INVALID_REFERENCE','Unrecognized result reference');
    const index=Number(match[1]);
    if(!Number.isSafeInteger(index)||index>=results.length)throw error('FUTURE_REFERENCE','Tool result not available');
    const resolved=results[index]?.[match[2]];
    if(typeof resolved!=='string'||!resolved)throw error('MISSING_REFERENCE','Referenced field is absent');
    return resolved;
  }
  if(Array.isArray(value))return value.map(x=>resolveReferences(x,results));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolveReferences(v,results)]));
  return value;
}
