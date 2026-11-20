/**
 * Office Werkstatt Agent Bridge - application-owned document operations.
 * No network, no eval, no arbitrary filesystem access. Node and browser compatible.
 * The adapter is the sole authority for reading or editing document data.
 */
export const MODULES = Object.freeze(['word','excel','slide','note','draw','pdf','design','form']);
export const OPERATIONS = Object.freeze([
  'read_document','add_slide','set_text','add_text','add_shape','delete_element',
  'add_sheet','set_cell','append_paragraph','add_note','add_node','add_pdf_annotation',
  'add_design_text','add_form_question',
]);
export class AgentError extends Error {
  constructor(code, message) { super(message); this.name='AgentError'; this.code=code; }
}
function assert(b, code, msg) { if (!b) throw new AgentError(code,msg); }
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const clone=x=>structuredClone(x);
const MAX_ACTIONS=50;
function validateString(x, field, max=10000) {
  assert(typeof x==='string' && x.trim() && x.length<=max,'INVALID_ARGUMENT',`Invalid ${field}`);
}
function validateAction(a) {
  assert(a && typeof a==='object' && !Array.isArray(a),'INVALID_ARGUMENT','Action must be an object');
  assert(OPERATIONS.includes(a.tool),'UNSUPPORTED_TOOL',`Unknown tool: ${a.tool}`);
  assert(MODULES.includes(a.module),'UNSUPPORTED_MODULE',`Unknown module: ${a.module}`);
  assert(a.args && typeof a.args==='object' && !Array.isArray(a.args),'INVALID_ARGUMENT','Missing args');
  const read=a.tool==='read_document';
  if (read) return;
  const match={add_slide:'slide',set_text:'slide',add_text:'slide',add_shape:'slide',delete_element:'slide',
    add_sheet:'excel',set_cell:'excel',append_paragraph:'word',add_note:'note',add_node:'draw',
    add_pdf_annotation:'pdf',add_design_text:'design',add_form_question:'form'};
  assert(match[a.tool]===a.module,'WRONG_MODULE',`${a.tool} cannot modify ${a.module}`);
  switch(a.tool) {
    case 'add_slide': validateString(a.args.title,'title',200); break;
    case 'set_text': validateString(a.args.elementId,'elementId',128); validateString(a.args.text,'text'); break;
    case 'add_text': validateString(a.args.text,'text'); break;
    case 'add_shape': validateString(a.args.shape,'shape',64); break;
    case 'delete_element': validateString(a.args.elementId,'elementId',128); break;
    case 'add_sheet': validateString(a.args.name,'name',100); break;
    case 'set_cell': validateString(a.args.address,'address',32); assert(/^[A-Z]{1,3}[1-9][0-9]{0,6}$/.test(a.args.address),'INVALID_ARGUMENT','Invalid cell address');
      assert(['number','string','boolean'].includes(typeof a.args.value) && (typeof a.args.value!=='string'||a.args.value.length<=10000),'INVALID_ARGUMENT','Invalid cell value'); break;
    case 'append_paragraph': validateString(a.args.text,'text'); break;
    case 'add_note': validateString(a.args.text,'text'); break;
    case 'add_node': validateString(a.args.label,'label',1000); break;
    case 'add_pdf_annotation': validateString(a.args.text,'text'); break;
    case 'add_design_text': validateString(a.args.text,'text'); break;
    case 'add_form_question': validateString(a.args.label,'label',1000); break;
  }
}
export function validatePlan(plan) {
  assert(plan && typeof plan==='object','INVALID_PLAN','Plan must be an object');
  assert(Array.isArray(plan.actions) && plan.actions.length>0 && plan.actions.length<=MAX_ACTIONS,'INVALID_PLAN','Plan needs 1-50 actions');
  for(const a of plan.actions) validateAction(a);
  return clone({description: String(plan.description||'Office edit').slice(0,500), actions:plan.actions});
}
/**
 * adapter implements snapshot(), restore(snapshot), execute(action), optional onChanged().
 * Plan generation is intentionally decoupled from inference engine.
 */
export class AgentBridge {
  constructor(adapter, {allowRead=true}={}) {
    assert(adapter && ['snapshot','restore','execute'].every(k=>typeof adapter[k]==='function'),'BAD_ADAPTER','Adapter methods missing');
    this.adapter=adapter; this.allowRead=allowRead;
    this.pending=new Map(); this.history=[]; this.counter=0;
  }
  preview(plan) {
    const validated=validatePlan(plan);
    // do not allow direct writes without explicit confirmation; tokens are single-use
    const id=`plan-${++this.counter}`;
    this.pending.set(id,validated);
    return {id, description:validated.description, actions:clone(validated.actions), requiresApproval:true};
  }
  async approve(id) {
    assert(this.pending.has(id),'UNKNOWN_PLAN','Plan is missing or already used');
    const plan=this.pending.get(id); this.pending.delete(id);
    const before=await this.adapter.snapshot();
    try {
      const output=[];
      for(const action of plan.actions) output.push(await this.adapter.execute(clone(action)));
      this.history.push(before);
      if(this.history.length>50) this.history.shift();
      await this.adapter.onChanged?.();
      return {success:true,results:output};
    } catch(error) {
      await this.adapter.restore(before);
      await this.adapter.onChanged?.();
      throw new AgentError('EXECUTION_FAILED',`Operation rolled back: ${error.message}`);
    }
  }
  cancel(id) { return this.pending.delete(id); }
  async undo() {
    assert(this.history.length>0,'NO_HISTORY','Nothing to undo');
    const before=this.history.pop();
    await this.adapter.restore(before); await this.adapter.onChanged?.();
    return {success:true};
  }
  async read(module) {
    assert(this.allowRead,'READ_FORBIDDEN','Reading is disabled');
    assert(MODULES.includes(module),'UNSUPPORTED_MODULE','Unknown module');
    return this.adapter.execute({module,tool:'read_document',args:{}});
  }
}
