/* Office Werkstatt – tests for the server control tools: accounts & roles, admin API, CSRF guard,
 * login limit, logs, backups/restore, trash, repair, doctor.     node --test server/test/ */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ow-control-'));
Object.assign(process.env, { DATA_DIR: DATA, OW_USER: 'root', OW_PASS: 'root-secret-1', OW_LOGIN_FAILS: '5', OW_BACKUP_HOURS: '0' });
const ow = require('../server.js');
let base;
const auth = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
const ROOT = auth('root', 'root-secret-1');
async function call(method, p, { as = ROOT, body, raw, headers = {} } = {}) {
  const h = Object.assign({ 'X-OW-Request': '1' }, headers); if (as) h.Authorization = as;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(base + p, { method, headers: h, body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* text */ }
  return { s: r.status, j, t, h: r.headers };
}
const putFile = (id, o, as) => call('PUT', '/api/files/' + id, { as, body: Object.assign({ id, type: 'word', name: id, content: { html: '<p>x</p>' }, modified: Date.now() }, o) });

test.before(async () => { base = 'http://127.0.0.1:' + await ow.start(0, '127.0.0.1'); });
test.after(async () => { await ow.stop(); fs.rmSync(DATA, { recursive: true, force: true }); });

test('login: health is public, everything else needs a login', async () => {
  const h = await call('GET', '/api/health', { as: null });
  assert.equal(h.s, 200); assert.equal(h.j.ok, true); assert.equal(h.j.version, undefined);
  assert.equal((await call('GET', '/api/files', { as: null })).s, 401);
  assert.equal((await call('GET', '/index.html', { as: null })).s, 401);
  const me = await call('GET', '/api/me');
  assert.deepEqual([me.j.name, me.j.role, me.j.auth, me.j.canChangePassword], ['root', 'admin', true, false]);
});

test('accounts and roles', async () => {
  assert.equal((await call('POST', '/api/admin/users', { body: { name: 'eda', password: 'eda-pass-1', role: 'editor' } })).s, 200);
  assert.equal((await call('POST', '/api/admin/users', { body: { name: 'vio', password: 'vio-pass-1', role: 'viewer' } })).s, 200);
  const weak = await call('POST', '/api/admin/users', { body: { name: 'x', password: 'short', role: 'viewer' } });
  assert.equal(weak.s, 400); assert.equal(weak.j.code, 'weak_password');
  assert.equal((await call('POST', '/api/admin/users', { body: { name: 'eda', password: 'whatever-1', role: 'viewer' } })).j.code, 'exists');
  assert.equal((await call('POST', '/api/admin/users', { body: { name: 'bad name', password: 'whatever-1' } })).j.code, 'bad_name');
  const list = (await call('GET', '/api/admin/users')).j.users.map(u => `${u.name}:${u.role}:${u.source}`);
  assert.deepEqual(list, ['root:admin:env', 'eda:editor:file', 'vio:viewer:file']);
  assert.equal(fs.statSync(path.join(DATA, 'users.json')).mode & 0o777, 0o600);

  const EDA = auth('eda', 'eda-pass-1'), VIO = auth('vio', 'vio-pass-1');
  assert.equal((await putFile('doc1', {}, EDA)).s, 200);                       // editor writes
  assert.equal((await call('GET', '/api/files/doc1', { as: VIO })).s, 404);     // private until shared
  assert.equal((await call('PUT', '/api/files/doc1/share', { as: EDA, body: { shares: [{ user: 'vio', perm: 'edit' }] } })).s, 200);
  assert.equal((await call('GET', '/api/files/doc1', { as: VIO })).s, 200);     // viewer reads
  assert.equal((await putFile('doc1', {}, VIO)).s, 403);                        // … but cannot write
  assert.equal((await call('DELETE', '/api/files/doc1', { as: VIO })).s, 403);
  assert.equal((await call('GET', '/api/admin/status', { as: EDA })).s, 403);   // only admins
  assert.equal((await call('PUT', '/api/stock/keys', { as: EDA, body: {} })).s, 403);
  assert.equal((await call('GET', '/api/me', { as: VIO })).j.role, 'viewer');

  // own password
  assert.equal((await call('PUT', '/api/me/password', { as: VIO, body: { current: 'wrong', password: 'vio-pass-2' } })).j.code, 'wrong_password');
  assert.equal((await call('PUT', '/api/me/password', { as: VIO, body: { current: 'vio-pass-1', password: 'vio-pass-2' } })).s, 200);
  assert.equal((await call('GET', '/api/me', { as: VIO })).s, 401);
  assert.equal((await call('GET', '/api/me', { as: auth('vio', 'vio-pass-2') })).s, 200);

  // disable → no access at once; env account cannot be changed
  assert.equal((await call('PUT', '/api/admin/users/eda', { body: { disabled: true } })).s, 200);
  assert.equal((await call('GET', '/api/files', { as: EDA })).s, 401);
  assert.equal((await call('PUT', '/api/admin/users/root', { body: { role: 'viewer' } })).j.code, 'locked');
  assert.equal((await call('DELETE', '/api/admin/users/eda')).s, 200);
});

test('last admin cannot be removed (file accounts only)', () => {
  const u = require('../users.js')({ DATA: fs.mkdtempSync(path.join(os.tmpdir(), 'ow-u-')) });
  u.add({ name: 'a', password: 'aaaaaaaa', role: 'admin' }); u.add({ name: 'b', password: 'bbbbbbbb', role: 'editor' });
  assert.throws(() => u.update('a', { role: 'viewer' }), /active admin/);
  assert.throws(() => u.update('a', { disabled: true }), /active admin/);
  assert.throws(() => u.remove('a'), /active admin/);
  u.update('b', { role: 'admin' }); u.remove('a');
  assert.deepEqual(u.list().map(x => x.name), ['b']);
});

test('CSRF guard on admin changes', async () => {
  assert.equal((await call('POST', '/api/admin/backups', { body: {}, headers: { 'X-OW-Request': '0' } })).s, 403);
  assert.equal((await call('POST', '/api/admin/backups', { body: {}, headers: { Origin: 'https://evil.example' } })).s, 403);
  assert.equal((await call('GET', '/api/admin/backups', { headers: { 'X-OW-Request': '' } })).s, 200);   // reading is fine
});

test('trash, backup, restore, repair', async () => {
  await putFile('keep', {}); await putFile('old', { trashed: true, trashedAt: Date.now() - 40 * 86400000 }); await putFile('new', { trashed: true, trashedAt: Date.now() });
  let st = (await call('GET', '/api/admin/status')).j;
  assert.equal(st.library.trashed, 2); assert.equal(st.library.trashedOld, 1);
  assert.equal((await call('POST', '/api/admin/trash/empty', { body: { olderThanDays: 30 } })).j.removed, 1);
  assert.equal((await call('POST', '/api/admin/trash/empty', { body: {} })).j.removed, 1);

  const b = (await call('POST', '/api/admin/backups', { body: { label: 'Test 1' } })).j;
  assert.match(b.name, /^ow-backup-\d{8}-\d{6}-test-1\.json$/); assert.equal(b.files, 2);
  const dl = await call('GET', '/api/admin/backups/' + b.name);
  assert.equal(dl.j.format, 'office-werkstatt-backup'); assert.equal(dl.j.files.length, 2);
  assert.match(dl.h.get('content-disposition'), /attachment/);
  assert.equal((await call('GET', '/api/admin/backups/..%2Fusers.json')).s, 404);           // no path tricks

  await putFile('later', {});
  const r = (await call('POST', `/api/admin/backups/${b.name}/restore`, { body: { mode: 'replace' } })).j;
  assert.equal(r.written, 2); assert.equal(r.removed, 1); assert.match(r.safety, /before-restore/);
  assert.deepEqual((await call('GET', '/api/files')).j.map(f => f.id).sort(), ['keep']);          // doc1 belongs to eda
  assert.deepEqual((await call('GET', '/api/admin/shares')).j.files.map(f => f.id).sort(), ['doc1', 'keep']);

  const up = await call('POST', '/api/admin/backups/upload', { raw: JSON.stringify({ format: 'office-werkstatt-backup', version: 1, files: [{ id: 'fromapp', type: 'note', name: 'n' }] }) });
  assert.equal(up.s, 200);
  assert.equal((await call('POST', `/api/admin/backups/${up.j.name}/restore`, { body: {} })).j.written, 1);
  assert.equal((await call('POST', '/api/admin/backups/upload', { raw: '{"hello":1}' })).s, 400);

  fs.writeFileSync(path.join(DATA, 'files', 'broken.json'), '{nope');
  fs.writeFileSync(path.join(DATA, 'forms', 'ghost.json'), '{}');
  const chk = (await call('GET', '/api/admin/checks')).j.checks;
  assert.equal(chk.find(c => c.id === 'documents').level, 'warn');
  assert.equal(chk.find(c => c.id === 'orphanForms').fix, 'repair');
  const rep = (await call('POST', '/api/admin/repair', { body: {} })).j;
  assert.equal(rep.broken, 1); assert.equal(rep.orphans, 1);
  assert.ok(fs.existsSync(path.join(DATA, rep.quarantine, 'broken.json')));
  assert.equal((await call('GET', '/api/admin/checks')).j.checks.find(c => c.id === 'documents').level, 'ok');
});

test('sharing between users', async () => {
  for (const [n, r] of [['ali', 'editor'], ['ben', 'editor'], ['cem', 'viewer']]) await call('POST', '/api/admin/users', { body: { name: n, password: n + '-pass-123', role: r } });
  const ALI = auth('ali', 'ali-pass-123'), BEN = auth('ben', 'ben-pass-123'), CEM = auth('cem', 'cem-pass-123');
  const ids = as => call('GET', '/api/files', { as }).then(r => r.j.map(f => f.id).sort());
  assert.equal((await putFile('plan', { folder: 'f1', owner: 'ben', shares: [{ user: 'ben', perm: 'edit' }] }, ALI)).s, 200);
  let f = (await call('GET', '/api/files/plan', { as: ALI })).j;
  assert.equal(f.owner, 'ali'); assert.deepEqual(f.shares, []); assert.equal(f.access, 'owner');   // owner/shares cannot be forged
  assert.ok(!(await ids(BEN)).includes('plan'));
  assert.equal((await putFile('plan', {}, BEN)).s, 404);                                         // cannot overwrite what is not visible
  assert.equal((await call('PUT', '/api/files/plan/share', { as: ALI, body: { shares: [{ user: 'ben', perm: 'view' }, { user: 'nobody' }] } })).j.code, 'unknown_user');
  assert.equal((await call('PUT', '/api/files/plan/share', { as: ALI, body: { shares: [{ user: 'ben', perm: 'view' }, { user: 'cem', perm: 'edit' }] } })).s, 200);
  f = (await call('GET', '/api/files', { as: BEN })).j.find(x => x.id === 'plan');
  assert.deepEqual([f.access, f.sharedWithMe, f.folder], ['view', true, null]);                 // the owner's folders stay private
  assert.equal((await putFile('plan', { name: 'x' }, BEN)).j.code, 'read_only');
  assert.equal((await call('PUT', '/api/files/plan/share', { as: BEN, body: { shares: [] } })).j.code, 'not_owner');
  assert.equal((await putFile('plan', {}, CEM)).s, 403);                                         // role viewer beats share "edit"
  await call('PUT', '/api/files/plan/share', { as: ALI, body: { shares: [{ user: 'ben', perm: 'edit' }] } });
  assert.equal((await putFile('plan', { name: 'Plan v2', folder: null, trashed: true }, BEN)).s, 200);
  f = (await call('GET', '/api/files/plan', { as: ALI })).j;
  assert.deepEqual([f.name, f.folder, !!f.trashed], ['Plan v2', 'f1', false]);                   // editors change content, not the owner's place
  assert.equal((await call('DELETE', '/api/files/plan', { as: BEN })).j.code, 'not_owner');
  assert.ok(!(await ids(CEM)).includes('plan'));                                                 // cem's share was removed
  await call('PUT', '/api/files/plan/share', { as: ALI, body: { shared: true, sharedPerm: 'view' } });
  assert.ok((await ids(CEM)).includes('plan'));

  // admin: overview, change shares, transfer, revoke
  let o = (await call('GET', '/api/admin/shares')).j;
  const row = o.files.find(x => x.id === 'plan');
  assert.deepEqual([row.owner, row.shared, row.shares.map(s => s.user + ':' + s.perm + ':' + s.by)], ['ali', true, ['ben:edit:ali']]);
  assert.equal(o.people.find(p => p.name === 'ali').sharedOut, 1); assert.equal(o.people.find(p => p.name === 'ben').sharedIn, 1);
  assert.equal((await call('GET', '/api/admin/shares', { as: ALI })).s, 403);
  await call('PUT', '/api/admin/shares/plan', { body: { shared: false, shares: [{ user: 'ben', perm: 'edit' }, { user: 'cem', perm: 'view' }] } });
  assert.equal((await call('POST', '/api/admin/shares/revoke', { body: { user: 'ben' } })).j.changed, 1);
  assert.ok(!(await ids(BEN)).includes('plan'));
  assert.equal((await call('POST', '/api/admin/owner', { body: { from: 'ali', owner: 'ben' } })).j.changed, 1);
  assert.ok((await ids(BEN)).includes('plan')); assert.ok(!(await ids(ALI)).includes('plan'));
  assert.equal((await call('POST', '/api/admin/owner', { body: { unowned: true, owner: 'ali' } })).j.changed >= 1, true);
  assert.ok((await ids(ALI)).includes('fromapp'));

  // everything shows up in the log
  const ev = (await call('GET', '/api/admin/logs?cat=sharing&limit=5000')).j.entries.map(e => e.ev);
  assert.ok(!ev.includes('http') && !ev.includes('user.added'));
  for (const e of ['file.created', 'share.added', 'share.changed', 'share.removed', 'share.everyone', 'share.everyoneOff', 'file.opened', 'file.edited', 'file.renamed', 'owner.changed'])
    assert.ok(ev.includes(e), 'log has ' + e);
});

test('logs and sessions', async () => {
  const l = (await call('GET', '/api/admin/logs?q=user.added&limit=10')).j.entries;
  assert.ok(l.some(e => e.user === 'vio' && e.by === 'root'));
  assert.ok(!JSON.stringify((await call('GET', '/api/admin/logs?limit=5000')).j).includes('vio-pass'));   // never passwords
  const days = (await call('GET', '/api/admin/logs/days')).j.days;
  assert.equal(days.length, 1);
  assert.equal((await call('GET', '/api/admin/logs/download?day=' + days[0].day)).s, 200);
  const s = (await call('GET', '/api/admin/sessions')).j.sessions;
  assert.ok(s.some(x => x.user === 'root' && x.requests > 5));
});

test('failed logins are limited per address', async () => {
  // two wrong logins happened above already (old password, disabled account); the limit is 5
  const before = ow.log.query({ q: 'auth.failed', limit: 50 }).length;
  for (let i = before; i < 5; i++) assert.equal((await call('GET', '/api/files', { as: auth('root', 'nope' + i) })).s, 401);
  const r = await call('GET', '/api/files');                          // even the right password waits now
  assert.equal(r.s, 429); assert.equal(r.h.get('retry-after'), '900');
  const w = ow.log.query({ q: 'auth.failed', limit: 50 });
  assert.equal(w.length, 5); assert.ok(w.every(e => e.level === 'warn' && !JSON.stringify(e).includes('nope')));
});
