/* Office Werkstatt – storage layer
 * Offline-first: IndexedDB in the browser (works without internet and from file://).
 * When the app is served by the Office Werkstatt server (/api/health answers), files are
 * stored on the server so several devices/users can share them. */
window.OW = window.OW || {};
(function () {
  const DB = 'office-werkstatt', STORE = 'files';
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('no idb'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(mode, fn) {
    return idb().then(db => new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), s = t.objectStore(STORE);
      const out = fn(s);
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    }));
  }
  /* localStorage fallback (very old browsers / privacy modes) */
  const LS = {
    all() { try { return JSON.parse(localStorage.getItem('ow-files') || '[]'); } catch { return []; } },
    save(a) { localStorage.setItem('ow-files', JSON.stringify(a)); },
  };
  const local = {
    name: 'local',
    async list() {
      try { return await tx('readonly', s => s.getAll()); } catch { return LS.all(); }
    },
    async get(id) {
      try { return await tx('readonly', s => s.get(id)); } catch { return LS.all().find(f => f.id === id); }
    },
    async put(f) {
      try { await tx('readwrite', s => s.put(f)); } catch { const a = LS.all().filter(x => x.id !== f.id); a.push(f); LS.save(a); }
      return f;
    },
    async remove(id) {
      try { await tx('readwrite', s => s.delete(id)); } catch { LS.save(LS.all().filter(x => x.id !== id)); }
    },
  };
  const blobToDataURL = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  /* every server answer is checked: a 401/413/500 must never look like a successful save */
  async function ok(r, what) {
    if (r.ok) return r;
    let msg = ''; try { msg = (await r.json()).error || ''; } catch { /* not json */ }
    const e = new Error(`${what} failed: HTTP ${r.status}${msg ? ' – ' + msg : ''}`); e.status = r.status; throw e;
  }
  const server = {
    name: 'server',
    async list() { const r = await ok(await fetch('api/files', { cache: 'no-store' }), 'list'); const a = await r.json(); if (!Array.isArray(a)) throw new Error('list failed: bad answer'); return a; },
    async get(id) {
      const r = await fetch('api/files/' + encodeURIComponent(id), { cache: 'no-store' }); if (r.status === 404) return null; await ok(r, 'load');
      const f = await r.json();
      if (f && f.content && f.content.__blob) f.content = await (await fetch(f.content.__blob)).blob();
      return f;
    },
    async put(f) {
      const body = Object.assign({}, f);
      if (f.content instanceof Blob) body.content = { __blob: await blobToDataURL(f.content) };
      const r = await ok(await fetch('api/files/' + encodeURIComponent(f.id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), 'save');
      const j = await r.json().catch(() => null); if (!j || !j.ok) throw new Error('save failed: bad answer');
      return f;
    },
    async remove(id) { await ok(await fetch('api/files/' + encodeURIComponent(id), { method: 'DELETE' }), 'delete'); },
  };

  let backend = local;
  OW.store = {
    get mode() { return backend.name; },
    async init() {
      if (location.protocol.startsWith('http')) {
        try {
          const c = new AbortController(); setTimeout(() => c.abort(), 1500);
          const r = await fetch('api/health', { signal: c.signal, cache: 'no-store' });
          if (r.ok && (await r.json()).ok) backend = server;
        } catch { /* offline or static hosting → stay local */ }
      }
      return backend.name;
    },
    async list() {
      const a = await backend.list();
      return a.map(f => { const m = Object.assign({}, f); delete m.content; return m; });
    },
    get: id => backend.get(id),
    put(f) { f.modified = Date.now(); return backend.put(f); },
    remove: id => backend.remove(id),
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  };
})();
