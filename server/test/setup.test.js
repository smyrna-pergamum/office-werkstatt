/* Office Werkstatt – first-run setup on a network address without accounts.   node --test server/test/ */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ow-setup-'));
Object.assign(process.env, { DATA_DIR: DATA, OW_SETUP_CODE: 'ABCD-2345', OW_BACKUP_HOURS: '0' });
delete process.env.OW_USER; delete process.env.OW_PASS;
const ow = require('../server.js');
let base;
const call = async (method, p, { body, headers = {}, auth } = {}) => {
  const h = Object.assign({}, headers); if (body !== undefined) h['Content-Type'] = 'application/json';
  if (auth) h.Authorization = 'Basic ' + Buffer.from(auth).toString('base64');
  const r = await fetch(base + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* html */ }
  return { s: r.status, j, t, h: r.headers };
};
const H = { 'X-OW-Request': '1' };

test.before(async () => { const p = await ow.start(0, '0.0.0.0'); base = 'http://127.0.0.1:' + p; });
test.after(async () => { await ow.stop(); fs.rmSync(DATA, { recursive: true, force: true }); });

test('a network server without accounts waits for the setup instead of being open', async () => {
  assert.equal(ow.setup.active, true);
  assert.match(fs.readFileSync(path.join(DATA, 'SETUP-CODE.txt'), 'utf8'), /ABCD-2345/);
  const home = await call('GET', '/index.html');
  assert.equal(home.s, 302); assert.equal(home.h.get('location'), '/setup');
  assert.equal((await call('GET', '/api/files')).s, 503);
  assert.equal((await call('PUT', '/api/files/x', { body: {} })).s, 503);
  assert.equal((await call('GET', '/api/admin/status')).s, 503);
  assert.equal((await call('GET', '/f/abc')).s, 302);
  assert.equal((await call('GET', '/api/health')).j.ok, true);
  const page = await call('GET', '/setup');
  assert.equal(page.s, 200); assert.match(page.t, /Kurulum kodu/); assert.match(page.t, /Einrichtungscode/);
});

test('the setup code is checked, then the first admin is created', async () => {
  assert.equal((await call('POST', '/api/setup', { body: { code: 'ABCD-2345', name: 'chef', password: 'chef-pass-1' } })).s, 403);   // no X-OW-Request
  assert.equal((await call('POST', '/api/setup', { headers: H, body: { code: 'WRONG-0000', name: 'chef', password: 'chef-pass-1' } })).j.code, 'wrong_code');
  assert.equal((await call('POST', '/api/setup', { headers: H, body: { code: 'abcd 2345', name: 'chef', password: 'short' } })).j.code, 'weak_password');
  assert.equal(ow.setup.active, true);
  const ok = await call('POST', '/api/setup', { headers: H, body: { code: 'abcd-2345', name: 'chef', password: 'chef-pass-1' } });
  assert.equal(ok.s, 200);
  assert.equal(ow.setup.active, false);
  assert.ok(!fs.existsSync(path.join(DATA, 'SETUP-CODE.txt')));
  assert.equal((await call('GET', '/api/files')).s, 401);                           // now a login is needed
  assert.equal((await call('GET', '/setup')).s, 401);                               // the setup page is gone
  const me = await call('GET', '/api/me', { auth: 'chef:chef-pass-1' });
  assert.deepEqual([me.j.name, me.j.role], ['chef', 'admin']);
  assert.ok(ow.log.query({ q: 'setup.done' }).length === 1);
});

test('setup codes are easy to read (no 0/O, 1/I)', () => {
  const s = require('../setup.js')({ DATA, users: { count: () => 0 }, log: { warn() {} }, readBody: null, send: null });
  assert.match(require('../setup.js').newCode(), /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(s.active, false);
});
