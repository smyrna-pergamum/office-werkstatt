/* Office Werkstatt – users and roles
 * <data>/users.json (mode 0600): { version: 1, users: [{ name, role, hash, disabled, created, modified, lastLogin }] }
 *   role: admin  – everything, including the admin panel (/api/admin)
 *         editor – create, change and delete documents and forms
 *         viewer – read only (open documents, use AI and conversion, change own password)
 *   hash: scrypt$<N>$<r>$<p>$<salt b64>$<key b64>
 * OW_USER / OW_PASS (environment) still work: that account is always an admin and cannot be changed here.
 * The login is required as soon as OW_USER/OW_PASS are set OR users.json contains at least one user.
 * The file is re-read when it changes on disk (e.g. after `node server/owctl.js user add …`). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ROLES = ['admin', 'editor', 'viewer'];
const NAME_RE = /^[a-zA-Z0-9._@-]{1,64}$/;
const MIN_PASS = 8;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(pw), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}
function checkHash(pw, hash) {
  return new Promise(resolve => {
    const p = String(hash || '').split('$');
    if (p.length !== 6 || p[0] !== 'scrypt') return resolve(false);
    const [N, r, pp] = [+p[1], +p[2], +p[3]], salt = Buffer.from(p[4], 'base64'), want = Buffer.from(p[5], 'base64');
    if (!(N > 1 && r > 0 && pp > 0) || !want.length) return resolve(false);
    crypto.scrypt(String(pw), salt, want.length, { N, r, p: pp, maxmem: 256 * 1024 * 1024 }, (err, key) => resolve(!err && crypto.timingSafeEqual(key, want)));
  });
}
const eq = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const userError = (code, msg) => Object.assign(new Error(msg), { code, status: code === 'not_found' ? 404 : code === 'locked' ? 409 : 400 });

module.exports = function makeUsers({ DATA, envUser = '', envPass = '', readOnly = false } = {}) {
  const FILE = path.join(DATA, 'users.json');
  let db = { version: 1, users: [] }, mtime = -1, checked = 0, loadError = '';
  const cache = new Map();          // sha256(header) → { user, exp }  (scrypt is slow on purpose)

  function load(force) {
    const now = Date.now();
    if (!force && now - checked < 1500) return;
    checked = now;
    let st; try { st = fs.statSync(FILE); } catch { if (mtime !== 0) { db = { version: 1, users: [] }; mtime = 0; cache.clear(); } loadError = ''; return; }
    if (!force && st.mtimeMs === mtime) return;
    try {
      const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      db = { version: 1, users: Array.isArray(j.users) ? j.users.filter(u => u && NAME_RE.test(u.name) && ROLES.includes(u.role)) : [] };
      loadError = '';
    } catch (e) { loadError = String(e.message || e); /* keep the last good copy – never fall back to "no login" */ }
    mtime = st.mtimeMs; cache.clear();
  }
  function save() {
    if (readOnly) throw userError('locked', 'user management is not available here');
    fs.mkdirSync(DATA, { recursive: true });
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 1), { mode: 0o600 }); fs.renameSync(tmp, FILE);
    try { fs.chmodSync(FILE, 0o600); } catch { /* windows */ }
    mtime = fs.statSync(FILE).mtimeMs; checked = Date.now(); cache.clear();
  }
  const find = name => db.users.find(u => u.name.toLowerCase() === String(name || '').toLowerCase());
  const pub = u => ({ name: u.name, role: u.role, disabled: !!u.disabled, created: u.created || 0, modified: u.modified || 0, lastLogin: u.lastLogin || 0, source: 'file' });
  const hasEnv = () => !!(envUser && envPass);
  const activeAdmins = () => db.users.filter(u => u.role === 'admin' && !u.disabled).length + (hasEnv() ? 1 : 0);
  function validPassword(pw) { if (typeof pw !== 'string' || pw.length < MIN_PASS) throw userError('weak_password', `password needs at least ${MIN_PASS} characters`); if (pw.length > 1024) throw userError('weak_password', 'password too long'); }

  const api = {
    ROLES, MIN_PASS, FILE,
    get loadError() { load(); return loadError; },
    /* a login is required when there is any account */
    enabled() { load(); return hasEnv() || db.users.length > 0 || !!loadError; },
    count() { load(); return db.users.length; },
    list() {
      load();
      const a = db.users.map(pub);
      if (hasEnv()) a.unshift({ name: envUser, role: 'admin', disabled: false, created: 0, modified: 0, lastLogin: 0, source: 'env' });
      return a;
    },
    /* → { name, role, source } or null */
    async verify(name, pass) {
      load();
      const key = crypto.createHash('sha256').update(name + '\0' + pass).digest('hex');
      const c = cache.get(key); if (c && c.exp > Date.now()) return c.user;
      let user = null;
      if (hasEnv() && eq(name, envUser) && eq(pass, envPass)) user = { name: envUser, role: 'admin', source: 'env' };
      else {
        const u = find(name);
        if (u && !u.disabled && !(hasEnv() && u.name.toLowerCase() === envUser.toLowerCase()) && await checkHash(pass, u.hash)) {
          user = { name: u.name, role: u.role, source: 'file' };
          if (!readOnly && Date.now() - (u.lastLogin || 0) > 600000) { u.lastLogin = Date.now(); try { save(); } catch { /* read-only disk */ } }
        }
      }
      if (user) { if (cache.size > 500) cache.clear(); cache.set(key, { user, exp: Date.now() + 5 * 60000 }); }
      return user;
    },
    add({ name, password, role = 'editor' }) {
      load(true);
      if (!NAME_RE.test(String(name || ''))) throw userError('bad_name', 'name: 1–64 characters a-z 0-9 . _ @ -');
      if (!ROLES.includes(role)) throw userError('bad_role', 'role: ' + ROLES.join(' | '));
      if (find(name) || (hasEnv() && name.toLowerCase() === envUser.toLowerCase())) throw userError('exists', 'user exists');
      validPassword(password);
      const now = Date.now();
      db.users.push({ name, role, hash: hashPassword(password), disabled: false, created: now, modified: now, lastLogin: 0 });
      save(); return pub(find(name));
    },
    update(name, { role, password, disabled } = {}) {
      load(true);
      if (hasEnv() && String(name).toLowerCase() === envUser.toLowerCase()) throw userError('locked', 'this account is set by OW_USER/OW_PASS');
      const u = find(name); if (!u) throw userError('not_found', 'no such user');
      if (role !== undefined && !ROLES.includes(role)) throw userError('bad_role', 'role: ' + ROLES.join(' | '));
      const losesAdmin = u.role === 'admin' && !u.disabled && ((role !== undefined && role !== 'admin') || disabled === true);
      if (losesAdmin && activeAdmins() <= 1) throw userError('last_admin', 'at least one active admin is needed');
      if (password !== undefined) { validPassword(password); u.hash = hashPassword(password); }
      if (role !== undefined) u.role = role;
      if (disabled !== undefined) u.disabled = !!disabled;
      u.modified = Date.now(); save(); return pub(u);
    },
    remove(name) {
      load(true);
      if (hasEnv() && String(name).toLowerCase() === envUser.toLowerCase()) throw userError('locked', 'this account is set by OW_USER/OW_PASS');
      const u = find(name); if (!u) throw userError('not_found', 'no such user');
      if (u.role === 'admin' && !u.disabled && activeAdmins() <= 1) throw userError('last_admin', 'at least one active admin is needed');
      db.users = db.users.filter(x => x !== u); save(); return { ok: true };
    },
    /* own password: the current one must be given */
    async changeOwn(name, current, password) {
      load(true);
      const u = find(name); if (!u) throw userError('locked', 'this account cannot be changed here');
      if (!(await checkHash(current, u.hash))) throw userError('wrong_password', 'current password is wrong');
      validPassword(password); u.hash = hashPassword(password); u.modified = Date.now(); save(); return { ok: true };
    },
  };
  load(true);
  return api;
};
module.exports.ROLES = ROLES;
module.exports.hashPassword = hashPassword;
module.exports.checkHash = checkHash;
