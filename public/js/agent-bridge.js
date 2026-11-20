/* Office Werkstatt – Agent Bridge (from the V1–V4 design: agent-bridge/ in the repository)
 *
 *   user request → model (local llama.cpp, Ollama or API) → JSON plan of whitelisted Office tools
 *   → validation → preview → approval → one transaction on the real editor → undo
 *
 * The model never changes a document directly. Every change is an action of a plan:
 *   { description, actions: [ { module, tool, args } ] }
 * Allowed tools come from the Office Tool Registry: the write tools of the open Werkzeug (its editor
 * adapter) plus the library tools. Arguments are checked against each tool's schema, before and again
 * after "$result:N.path" references to earlier results are filled in. Before applying, the document's
 * identity and revision are compared with the preview: a document changed in between is not touched.
 * A failing action rolls the whole plan back (snapshot / restore); a finished plan can be undone as one step.
 * No eval, no shell, no file access outside the library. */
(function () {
  'use strict';
  const MAX_ACTIONS = 50;
  const READ_RX = /^(read|list|find|get)_/;

  class AgentError extends Error { constructor(code, message) { super(message); this.name = 'AgentError'; this.code = code; } }
  const fail = (code, msg) => { throw new AgentError(code, msg); };
  const copy = x => { try { return structuredClone(x); } catch { return JSON.parse(JSON.stringify(x)); } };

  /* ---------- schema check of one tool call ---------- */
  function checkArgs(def, a) {
    const p = (def && def.function && def.function.parameters) || {}, props = p.properties || {};
    if (!a || typeof a !== 'object' || Array.isArray(a)) return 'arguments must be a JSON object';
    for (const k of p.required || []) if (a[k] === undefined || a[k] === null || a[k] === '') return `missing argument "${k}"`;
    for (const [k, v] of Object.entries(a)) {
      const sch = props[k]; if (!sch || v === undefined || v === null) continue;
      const ty = sch.type, ok = !ty || (ty === 'string' ? typeof v === 'string' : ty === 'number' ? typeof v === 'number' && isFinite(v) : ty === 'integer' ? Number.isInteger(v)
        : ty === 'boolean' ? typeof v === 'boolean' : ty === 'array' ? Array.isArray(v) : ty === 'object' ? typeof v === 'object' && !Array.isArray(v) : true);
      if (!ok) return `argument "${k}" must be ${ty}`;
      if (sch.enum && !sch.enum.includes(v)) return `argument "${k}" must be one of ${sch.enum.join(', ')}`;
      if (typeof v === 'string' && v.length > 60000) return `argument "${k}" is too long`;
    }
    return null;
  }

  /* ---------- Office Tool Registry ---------- */
  class ToolRegistry {
    constructor() { this.mods = new Map(); }
    add(module, defs) { const m = this.mods.get(module) || new Map(); defs.forEach(d => m.set(d.function.name, d)); this.mods.set(module, m); return this; }
    get(module, tool) { const m = this.mods.get(module); return m && m.get(tool); }
    find(tool) { for (const [module, m] of this.mods) if (m.has(tool)) return { module, def: m.get(tool) }; return null; }
    describe() { const out = []; for (const [module, m] of this.mods) for (const d of m.values()) out.push({ module, tool: d.function.name, description: d.function.description, args: (d.function.parameters || {}).properties || {} }); return out; }
    get size() { let n = 0; for (const m of this.mods.values()) n += m.size; return n; }
  }

  function validateAction(reg, a) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) fail('INVALID_ARGUMENT', 'An action must be an object');
    if (typeof a.tool !== 'string') fail('UNSUPPORTED_TOOL', 'Action without tool');
    if (!a.module) { const f = reg.find(a.tool); if (f) a.module = f.module; }
    const def = reg.get(a.module, a.tool);
    if (!def) fail('UNSUPPORTED_TOOL', `Unknown tool ${a.module || '?'}/${a.tool}`);
    if (a.args === undefined) a.args = {};
    const bad = checkArgs(def, a.args, true);
    if (bad) fail('INVALID_ARGUMENT', `${a.tool}: ${bad}`);
  }
  function validatePlan(reg, plan, { refs = true } = {}) {
    if (!plan || typeof plan !== 'object') fail('INVALID_PLAN', 'The plan must be an object');
    if (!Array.isArray(plan.actions) || !plan.actions.length || plan.actions.length > MAX_ACTIONS) fail('INVALID_PLAN', `A plan needs 1–${MAX_ACTIONS} actions`);
    const actions = plan.actions.map(x => copy(x));
    actions.forEach((a, i) => {
      if (refs) scanRefs(a.args, i);
      validateAction(reg, refs ? Object.assign({}, a, { args: placeholderArgs(reg, a) }) : a);
      if (!a.module) a.module = reg.find(a.tool).module;
    });
    return { description: String(plan.description || '').slice(0, 500), actions };
  }
  /* references may only point backwards */
  function scanRefs(v, i) {
    if (typeof v === 'string' && v.startsWith('$result:')) { const m = REF.exec(v); if (!m) fail('INVALID_REFERENCE', 'Unrecognized result reference ' + v); if (+m[1] >= i) fail('FUTURE_REFERENCE', 'A reference must point to an earlier action'); }
    else if (Array.isArray(v)) v.forEach(x => scanRefs(x, i));
    else if (v && typeof v === 'object') Object.values(v).forEach(x => scanRefs(x, i));
  }
  /* for the first check, a reference stands for a value of the type the schema wants */
  function placeholderArgs(reg, a) {
    const def = reg.get(a.module, a.tool) || (reg.find(a.tool) || {}).def, props = (def && def.function.parameters && def.function.parameters.properties) || {};
    const out = {};
    for (const [k, v] of Object.entries(a.args || {})) out[k] = typeof v === 'string' && v.startsWith('$result:') ? ({ number: 1, integer: 1, boolean: true, array: [], object: {} }[(props[k] || {}).type] ?? 'ref') : v;
    return out;
  }
  const REF = /^\$result:(\d+)((?:\.[A-Za-z_]\w*|\.\d+){1,4})$/;
  function resolveReferences(value, results) {
    if (typeof value === 'string') {
      if (!value.startsWith('$result:')) return value;
      const m = REF.exec(value); if (!m) fail('INVALID_REFERENCE', 'Unrecognized result reference');
      const i = +m[1]; if (!Number.isSafeInteger(i) || i >= results.length) fail('FUTURE_REFERENCE', 'Tool result not available');
      let v = results[i];
      for (const k of m[2].slice(1).split('.')) v = v == null ? undefined : v[k];
      if (!(typeof v === 'string' && v) && !(typeof v === 'number' && isFinite(v))) fail('MISSING_REFERENCE', 'Referenced field is absent: ' + value);
      return v;
    }
    if (Array.isArray(value)) return value.map(x => resolveReferences(x, results));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveReferences(v, results)]));
    return value;
  }

  /* ---------- the transaction on the real editor ----------
   * editor: { readIdentity() → {documentId, revision}, snapshot(), restore(s), execute(action), onChanged?() } */
  class TransactionalOfficeAgent {
    constructor(editor, reg, { maxHistory = 25 } = {}) {
      for (const n of ['readIdentity', 'snapshot', 'restore', 'execute']) if (typeof (editor && editor[n]) !== 'function') fail('ADAPTER_INVALID', 'Missing ' + n);
      this.editor = editor; this.reg = reg; this.maxHistory = maxHistory;
      this.pending = new Map(); this.undoStack = []; this.busy = false; this.seq = 0;
    }
    async preview(raw) {
      const plan = validatePlan(this.reg, raw);
      const identity = await this.editor.readIdentity();
      if (!identity || !identity.documentId || !['number', 'string'].includes(typeof identity.revision)) fail('DOCUMENT_IDENTITY', 'Missing document identity or revision');
      const id = 'plan-' + (++this.seq);
      this.pending.clear();                       // an older preview can't be applied after a newer one
      this.pending.set(id, { plan, identity: copy(identity) });
      return { id, documentId: identity.documentId, revision: identity.revision, description: plan.description, actions: copy(plan.actions), requiresApproval: true };
    }
    cancel(id) { return this.pending.delete(id); }
    async approve(id) {
      if (this.busy) fail('BUSY', 'Another agent transaction is in progress');
      const item = this.pending.get(id); if (!item) fail('NOT_PENDING', 'The preview no longer exists or was already applied');
      this.busy = true; this.pending.delete(id);
      try {
        const cur = await this.editor.readIdentity();
        if (cur.documentId !== item.identity.documentId || cur.revision !== item.identity.revision) fail('STALE_PREVIEW', 'The document changed after the preview; nothing was applied');
        const before = await this.editor.snapshot(), results = [];
        try {
          for (const raw of item.plan.actions) {
            const action = Object.assign({}, raw, { args: resolveReferences(raw.args, results) });
            validateAction(this.reg, action);                                   // checked again with the real values
            const r = await this.editor.execute(copy(action));
            if (r && r.error) throw new Error(`${action.tool}: ${r.error}`);
            results.push(r === undefined ? { ok: true } : copy(r));
          }
        } catch (e) {
          try { await this.editor.restore(before); await (this.editor.onChanged && this.editor.onChanged()); }
          catch (re) { fail('ROLLBACK_FAILED', `${e.message}; rollback: ${re.message}`); }
          fail('EXECUTION_FAILED', `Rolled back: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 400));                            // editors report their change a moment later
        this.undoStack.push({ before, documentId: item.identity.documentId, after: await this.editor.readIdentity() });
        if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
        await (this.editor.onChanged && this.editor.onChanged());
        return { success: true, results, documentId: item.identity.documentId };
      } finally { this.busy = false; }
    }
    canUndo() { return this.undoStack.length > 0; }
    async conflict() { const last = this.undoStack.at(-1); if (!last) return false; const cur = await this.editor.readIdentity(); return cur.documentId !== last.documentId || cur.revision !== last.after.revision; }
    async undo({ force = false } = {}) {
      if (this.busy) fail('BUSY', 'Another agent transaction is in progress');
      const last = this.undoStack.at(-1); if (!last) fail('NOTHING_TO_UNDO', 'No agent change to undo');
      if (!force && await this.conflict()) fail('UNDO_CONFLICT', 'The document changed after the agent; use the editor’s Undo instead');
      this.busy = true;
      try { this.undoStack.pop(); this.pending.clear(); await this.editor.restore(last.before); await (this.editor.onChanged && this.editor.onChanged()); return { success: true }; }
      finally { this.busy = false; }
    }
  }

  /* ---------- Editor Adapter: the open Werkzeug + the library ----------
   * werkzeug: instance.ai seen through the editor shell (label, tools, run, describe, revision, snapshot, restore, docId) */
  function editorAdapter(werkzeug, lib) {
    const module = werkzeug ? werkzeug.module || 'document' : null;
    const created = [];
    return {
      module,
      async readIdentity() { return { documentId: werkzeug ? werkzeug.docId || 'document' : 'library', revision: werkzeug && werkzeug.revision ? werkzeug.revision() : 0 }; },
      async snapshot() { return { doc: werkzeug && werkzeug.snapshot ? await werkzeug.snapshot() : null, created: created.length }; },
      async restore(s) {
        // documents the plan created go to the trash (they can be brought back from there)
        for (const id of created.splice(s.created)) { try { const f = await OW.store.get(id); if (f) { f.trashed = true; f.trashedAt = Date.now(); await OW.store.put(f); } } catch { /* gone */ } }
        if (s.doc !== null && werkzeug && werkzeug.restore) await werkzeug.restore(s.doc);
      },
      async execute(a) {
        if (a.module === 'library') { const r = await lib(a.tool, a.args); if (r && r.id && r.created) created.push(r.id); return r; }
        if (!werkzeug || a.module !== module) fail('MODULE_NOT_CONNECTED', a.module + ' is not open');
        return werkzeug.run(a.tool, a.args);
      },
      async onChanged() { try { OW.refresh && OW.refresh(); } catch { /* ignore */ } },
    };
  }

  OW.agentBridge = { MAX_ACTIONS, READ_RX, AgentError, ToolRegistry, checkArgs, validatePlan, resolveReferences, TransactionalOfficeAgent, editorAdapter };
})();
