/* Office Werkstatt – file ownership and sharing between users
 * Every document / folder (data/files/<id>.json) may carry:
 *   owner        account name of the person who created it (set by the server, never by the browser)
 *   shares       [{ user, perm: 'view' | 'edit', by, at }]   shared with single people
 *   shared       true = shared with everybody, sharedPerm: 'view' | 'edit' (default edit, as before 1.5)
 * Who sees a file:  the owner · people in shares · everybody when shared · everybody when it has no owner
 *                   (documents from before 1.5 – an admin can give them an owner in the control center).
 * Admins can open every file through the API and manage all shares in the control center (#/admin › Sharing),
 * but their own library only lists what is theirs or shared with them.
 * Without a login (this computer / desktop app) there is one person: everything is theirs.
 *   PUT /api/files/<id>/share  { shared, sharedPerm, shares: [{user, perm}] }   owner or admin
 *   GET /api/directory                                                         names to share with
 * Every change of sharing, ownership, deletion and access by other people is written to the log. */
'use strict';
const fs = require('fs'), path = require('path');

const PERMS = ['view', 'edit'];
const lc = s => String(s || '').toLowerCase();
const RANK = { view: 1, edit: 2, owner: 3 };

/* → 'owner' | 'edit' | 'view' | null */
function access(user, f) {
  if (!user || !f) return f ? 'owner' : null;
  if (!f.owner) return user.role === 'admin' ? 'owner' : 'edit';      // older documents: the whole team
  if (lc(f.owner) === lc(user.name)) return 'owner';
  if (user.role === 'admin') return 'owner';
  const s = (f.shares || []).find(x => lc(x.user) === lc(user.name));
  let a = s ? s.perm : null;
  if (f.shared) { const e = f.sharedPerm === 'view' ? 'view' : 'edit'; if (!a || RANK[e] > RANK[a]) a = e; }
  return a;
}
/* own = owner by name (admins included): decides what appears in the library as "mine" */
const isOwn = (user, f) => !user || !f.owner || lc(f.owner) === lc(user.name);
const visibleInLibrary = (user, f) => isOwn(user, f) || (f.shares || []).some(x => lc(x.user) === lc(user.name)) || !!f.shared;

/* what another person (not the owner) gets to see of a file */
function present(user, f, a) {
  const o = Object.assign({}, f, { access: a });
  if (user && f.owner && lc(f.owner) !== lc(user.name)) { o.folder = null; o.favorite = false; o.sharedWithMe = true; }
  return o;
}

module.exports = function makeSharing({ DATA, users, log, send, readBody }) {
  const FILES = path.join(DATA, 'files');
  const fileOf = id => path.join(FILES, id + '.json');
  const readFile = id => { try { return JSON.parse(fs.readFileSync(fileOf(id), 'utf8')); } catch { return null; } };
  const writeFile = (id, o) => { const tmp = fileOf(id) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(o)); fs.renameSync(tmp, fileOf(id)); };
  const who = req => req.owUser ? req.owUser.name : 'local';
  const ip = req => req.socket.remoteAddress;
  const known = () => new Map(users.list().map(u => [lc(u.name), u]));
  const edits = new Map();      // user|file → last "file.edited" log (autosave would flood the log)

  function cleanShares(list, owner) {
    const k = known(), seen = new Set(), out = [];
    for (const s of Array.isArray(list) ? list : []) {
      const u = k.get(lc(s && s.user)); if (!u) throw Object.assign(new Error('unknown user: ' + (s && s.user)), { status: 400, code: 'unknown_user' });
      if (lc(u.name) === lc(owner) || seen.has(lc(u.name))) continue;
      seen.add(lc(u.name)); out.push({ user: u.name, perm: PERMS.includes(s.perm) ? s.perm : 'view', by: s.by, at: s.at });
    }
    return out;
  }
  /* apply a new sharing state and log the difference */
  function applyShares(f, next, by, ipAddr) {
    const before = new Map((f.shares || []).map(s => [lc(s.user), s]));
    const now = Date.now(), shares = cleanShares(next.shares !== undefined ? next.shares : f.shares, f.owner);
    for (const s of shares) {
      const b = before.get(lc(s.user));
      if (!b) { s.by = by; s.at = now; log.info('share.added', { file: f.id, name: f.name, owner: f.owner, user: s.user, perm: s.perm, by, ip: ipAddr }); }
      else { s.by = b.by; s.at = b.at; if (b.perm !== s.perm) { s.by = by; s.at = now; log.info('share.changed', { file: f.id, name: f.name, owner: f.owner, user: s.user, perm: s.perm, was: b.perm, by, ip: ipAddr }); } }
      before.delete(lc(s.user));
    }
    for (const b of before.values()) log.info('share.removed', { file: f.id, name: f.name, owner: f.owner, user: b.user, by, ip: ipAddr });
    f.shares = shares;
    if (next.shared !== undefined || next.sharedPerm !== undefined) {
      const sh = next.shared !== undefined ? !!next.shared : !!f.shared, perm = next.sharedPerm === 'view' ? 'view' : next.sharedPerm === 'edit' ? 'edit' : (f.sharedPerm || 'edit');
      if (sh !== !!f.shared || (sh && perm !== (f.sharedPerm || 'edit'))) log.info(sh ? 'share.everyone' : 'share.everyoneOff', { file: f.id, name: f.name, owner: f.owner, perm: sh ? perm : undefined, by, ip: ipAddr });
      f.shared = sh; f.sharedPerm = perm;
    }
    return f;
  }

  /* ---------- /api/files ---------- */
  async function filesApi(req, res, id) {
    const user = req.owUser, M = req.method;
    if (!id && M === 'GET') {
      const list = [];
      for (const f of fs.readdirSync(FILES)) {
        if (!f.endsWith('.json')) continue;
        let o; try { o = JSON.parse(fs.readFileSync(path.join(FILES, f), 'utf8')); } catch { continue; }
        delete o.content;
        const a = access(user, o);
        if (a && (!user || visibleInLibrary(user, o))) list.push(present(user, o, a));
      }
      return send(res, 200, list);
    }
    if (!id) return send(res, 405, { error: 'method not allowed' });
    const cur = readFile(id), a = cur ? access(user, cur) : null;

    if (M === 'GET') {
      if (!cur || !a) return send(res, 404, { error: 'not found' });        // others' private files do not exist for you
      if (user && cur.owner && lc(cur.owner) !== lc(user.name)) log.info('file.opened', { file: id, name: cur.name, owner: cur.owner, by: user.name, access: a, ip: ip(req) });
      return send(res, 200, present(user, cur, a));
    }
    if (M === 'PUT') {
      let o; try { o = JSON.parse(await readBody(req)); } catch (e) { return send(res, 400, { error: String(e.message || e) }); }
      if (!o || typeof o !== 'object' || Array.isArray(o)) return send(res, 400, { error: 'bad document' });
      o.id = id;
      if (!cur) {                                                             // new document: it belongs to whoever creates it
        if (user) o.owner = user.name; else delete o.owner;
        o.shares = []; o.shared = !!o.shared; o.sharedPerm = o.sharedPerm === 'view' ? 'view' : 'edit';
        delete o.access; delete o.sharedWithMe;
        writeFile(id, o);
        if (user) log.info('file.created', { file: id, name: o.name, type: o.type, owner: o.owner, ip: ip(req) });
        return send(res, 200, { ok: true });
      }
      if (!a) return send(res, 404, { error: 'not found' });
      if (RANK[a] < RANK.edit) return send(res, 403, { error: 'read only – shared with you to view', code: 'read_only' });
      const mine = a === 'owner';
      // fields only the server / the owner decide
      o.owner = cur.owner; o.shares = cur.shares || [];
      if (!o.owner) delete o.owner;                                           // older documents stay team documents
      o.sharedPerm = cur.sharedPerm;
      if (!mine) { o.shared = cur.shared; o.folder = cur.folder; o.favorite = cur.favorite; o.trashed = cur.trashed; o.trashedAt = cur.trashedAt; }
      else if (!!o.shared !== !!cur.shared) log.info(o.shared ? 'share.everyone' : 'share.everyoneOff', { file: id, name: cur.name, owner: cur.owner, by: who(req), ip: ip(req) });
      if (mine && !!o.trashed !== !!cur.trashed) log.info(o.trashed ? 'file.trashed' : 'file.restored', { file: id, name: cur.name, owner: cur.owner, by: who(req), ip: ip(req) });
      if (o.name !== cur.name && user) log.info('file.renamed', { file: id, name: o.name, was: cur.name, owner: cur.owner, by: who(req), ip: ip(req) });
      delete o.access; delete o.sharedWithMe;
      writeFile(id, o);
      if (!mine && user && cur.owner) {
        const k = lc(user.name) + '|' + id, last = edits.get(k) || 0;
        if (Date.now() - last > 600000) { edits.set(k, Date.now()); if (edits.size > 5000) edits.clear(); log.info('file.edited', { file: id, name: cur.name, owner: cur.owner, by: user.name, ip: ip(req) }); }
      }
      return send(res, 200, { ok: true });
    }
    if (M === 'DELETE') {
      if (!cur) return send(res, 200, { ok: true });
      if (a !== 'owner') return send(res, a ? 403 : 404, { error: a ? 'only the owner can delete' : 'not found', code: a ? 'not_owner' : undefined });
      try { fs.unlinkSync(fileOf(id)); } catch { /* already gone */ }
      if (user) log.info('file.deleted', { file: id, name: cur.name, owner: cur.owner, by: who(req), ip: ip(req) });
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method not allowed' });
  }

  /* PUT /api/files/<id>/share */
  async function shareApi(req, res, id) {
    if (req.method !== 'PUT') return send(res, 405, { error: 'method not allowed' });
    const cur = readFile(id), a = cur ? access(req.owUser, cur) : null;
    if (!cur || !a) return send(res, 404, { error: 'not found' });
    if (a !== 'owner') return send(res, 403, { error: 'only the owner can share', code: 'not_owner' });
    let b; try { b = JSON.parse(await readBody(req, 64 * 1024) || '{}'); } catch { return send(res, 400, { error: 'bad request' }); }
    try { applyShares(cur, b, who(req), ip(req)); } catch (e) { return send(res, e.status || 400, { error: e.message, code: e.code }); }
    writeFile(id, cur);
    return send(res, 200, { shares: cur.shares, shared: cur.shared, sharedPerm: cur.sharedPerm, owner: cur.owner || null });
  }

  /* the people one can share with (every signed-in user) */
  function directory(req, res) {
    if (!users.enabled()) return send(res, 200, { users: [] });
    return send(res, 200, { users: users.list().filter(u => !u.disabled).map(u => ({ name: u.name, role: u.role })) });
  }

  /* ---------- admin: all files with owners and shares ---------- */
  function overview() {
    const k = known(), files = [], people = {};
    const P = n => (people[lc(n)] = people[lc(n)] || { name: n, owned: 0, sharedOut: 0, sharedIn: 0, exists: k.has(lc(n)) });
    for (const f of fs.readdirSync(FILES)) {
      if (!f.endsWith('.json')) continue;
      let o; try { o = JSON.parse(fs.readFileSync(path.join(FILES, f), 'utf8')); } catch { continue; }
      const sh = o.shares || [];
      files.push({ id: o.id || f.slice(0, -5), name: o.name, type: o.type, owner: o.owner || null, ownerMissing: !!o.owner && !k.has(lc(o.owner)), shares: sh.map(s => ({ user: s.user, perm: s.perm, by: s.by, at: s.at, missing: !k.has(lc(s.user)) })), shared: !!o.shared, sharedPerm: o.sharedPerm || 'edit', trashed: !!o.trashed, modified: o.modified || 0 });
      if (o.owner) { const p = P(o.owner); p.owned++; if (sh.length || o.shared) p.sharedOut++; }
      for (const s of sh) P(s.user).sharedIn++;
    }
    for (const u of k.values()) P(u.name);
    files.sort((a, b) => (b.modified || 0) - (a.modified || 0));
    return { files, people: Object.values(people).sort((a, b) => a.name.localeCompare(b.name)) };
  }
  /* admin: give files a new owner (one, several, or all files without an owner) */
  function setOwner({ ids, unowned, from, owner }, by, ipAddr) {
    const u = known().get(lc(owner)); if (!u) throw Object.assign(new Error('unknown user: ' + owner), { status: 400, code: 'unknown_user' });
    const want = new Set(Array.isArray(ids) ? ids : []); let n = 0;
    for (const f of fs.readdirSync(FILES)) {
      if (!f.endsWith('.json')) continue;
      const id = f.slice(0, -5), o = readFile(id); if (!o) continue;
      const hit = want.has(id) || (unowned && !o.owner) || (from && lc(o.owner) === lc(from));
      if (!hit || lc(o.owner) === lc(u.name)) continue;
      const was = o.owner || null; o.owner = u.name; o.shares = (o.shares || []).filter(s => lc(s.user) !== lc(u.name));
      writeFile(id, o); n++;
      log.info('owner.changed', { file: id, name: o.name, owner: u.name, was, by, ip: ipAddr });
    }
    return { changed: n };
  }
  /* admin: change sharing of any file */
  function adminShare(id, body, by, ipAddr) {
    const cur = readFile(id); if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
    applyShares(cur, body, by, ipAddr); writeFile(id, cur);
    return { shares: cur.shares, shared: cur.shared, sharedPerm: cur.sharedPerm };
  }
  /* admin: stop every share of a person (e.g. someone leaves the team) */
  function revokeUser(name, by, ipAddr) {
    let n = 0;
    for (const f of fs.readdirSync(FILES)) {
      if (!f.endsWith('.json')) continue;
      const id = f.slice(0, -5), o = readFile(id); if (!o || !(o.shares || []).some(s => lc(s.user) === lc(name))) continue;
      applyShares(o, { shares: o.shares.filter(s => lc(s.user) !== lc(name)) }, by, ipAddr); writeFile(id, o); n++;
    }
    return { changed: n };
  }

  return { access, filesApi, shareApi, directory, overview, setOwner, adminShare, revokeUser, readFile };
};
module.exports.access = access;
