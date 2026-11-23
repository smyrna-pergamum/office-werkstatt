/* Office Werkstatt – health checks ("doctor")
 * Used by the admin panel (GET /api/admin/checks) and the command line (node server/owctl.js doctor).
 * Every check → { id, level: ok | info | warn | fail, detail, fix? }
 *   id      stable name; the app translates it (adm.chk.<id>)
 *   detail  short technical text (English, not translated: paths, numbers, versions)
 *   fix     a repair the admin panel / `doctor --fix` can run: 'repair' | 'emptyTrash' | 'backup' */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), net = require('net');

const isLoopback = h => /^(127\.\d+\.\d+\.\d+|localhost|::1|\[::1\])$/i.test(String(h || ''));
const fmt = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' kB';

function portState(port, host) {
  return new Promise(res => {
    const s = net.createServer(); s.unref();
    s.once('error', e => res(e.code === 'EADDRINUSE' ? 'busy' : e.code === 'EACCES' ? 'denied' : 'error:' + e.code));
    s.listen(port, host, () => s.close(() => res('free')));
  });
}

/* ctx: { DATA, ROOT, HOST, PORT, env, users, maint, log, probePort, running } */
async function runChecks(ctx) {
  const { DATA, ROOT, env = process.env } = ctx;
  const out = [], add = (id, level, detail, fix) => out.push(fix ? { id, level, detail, fix } : { id, level, detail });

  // runtime
  const major = +process.versions.node.split('.')[0];
  add('node', major < 18 ? 'fail' : major < 20 ? 'warn' : 'ok', `Node.js ${process.versions.node}${major < 20 ? ' – version 20 or newer is recommended' : ''}`);

  // data folder
  try {
    fs.mkdirSync(DATA, { recursive: true });
    const probe = path.join(DATA, `.write-test-${process.pid}`); fs.writeFileSync(probe, 'x'); fs.rmSync(probe);
    add('dataDir', 'ok', DATA);
  } catch (e) { add('dataDir', 'fail', `${DATA}: ${e.code || e.message}`); }

  // disk space
  try {
    const s = fs.statfsSync(DATA), free = s.bavail * s.bsize;
    add('disk', free < 200e6 ? 'fail' : free < 1e9 ? 'warn' : 'ok', `${fmt(free)} free of ${fmt(s.blocks * s.bsize)}`);
  } catch { add('disk', 'info', 'free space cannot be read on this system'); }

  // documents
  if (ctx.maint) {
    const s = ctx.maint.scan();
    add('documents', s.broken.length ? 'warn' : 'ok', s.broken.length ? `${s.broken.length} unreadable: ${s.broken.slice(0, 5).join(', ')}${s.broken.length > 5 ? ' …' : ''}` : 'all documents can be read', s.broken.length ? 'repair' : undefined);
    add('tempFiles', s.tmp.length ? 'warn' : 'ok', s.tmp.length ? `${s.tmp.length} left-over .tmp files (interrupted saves)` : 'none', s.tmp.length ? 'repair' : undefined);
    add('orphanForms', s.orphans.length ? 'warn' : 'ok', s.orphans.length ? `${s.orphans.length} form files without a document` : 'none', s.orphans.length ? 'repair' : undefined);
    const lib = ctx.maint.library();
    add('trash', lib.trashedOld ? 'info' : 'ok', `${lib.trashed} in the trash${lib.trashedOld ? `, ${lib.trashedOld} older than 30 days` : ''}`, lib.trashedOld ? 'emptyTrash' : undefined);
    const b = ctx.maint.listBackups().filter(x => !x.safety)[0];
    const hours = +(env.OW_BACKUP_HOURS ?? 24);
    if (!b) add('backup', lib.documents ? 'warn' : 'info', `no backup yet${hours > 0 ? ` – automatic every ${hours} h` : ' – automatic backups are off (OW_BACKUP_HOURS=0)'}`, 'backup');
    else { const age = (Date.now() - b.created) / 86400000, h = age * 24; add('backup', age > 7 ? 'warn' : 'ok', `last: ${b.name} (${h < 1 ? Math.max(1, Math.round(h * 60)) + ' min' : h < 24 ? Math.round(h) + ' h' : Math.round(age) + ' d'} ago)`, age > 7 ? 'backup' : undefined); }
  }

  // login & exposure
  const HOST = ctx.HOST || env.HOST || '127.0.0.1';
  const envU = env.OW_USER || '', envP = env.OW_PASS || '';
  const accounts = ctx.users ? ctx.users.count() : 0, auth = !!(envU && envP) || accounts > 0;
  if ((envU && !envP) || (envP && !envU)) add('envLogin', 'fail', 'set both OW_USER and OW_PASS (or neither)');
  else if (envP && envP.length < 10) add('envLogin', 'warn', 'OW_PASS is short – use at least 10 characters');
  else add('envLogin', envU ? 'ok' : 'info', envU ? `admin account "${envU}" from the environment` : 'OW_USER/OW_PASS not set');
  if (ctx.users && ctx.users.loadError) add('usersFile', 'fail', `users.json cannot be read: ${ctx.users.loadError}`);
  else if (ctx.users) {
    let mode = ''; try { if (process.platform !== 'win32' && accounts) { const m = fs.statSync(ctx.users.FILE).mode & 0o777; if (m & 0o077) mode = ` – permissions ${m.toString(8)}, should be 600`; } } catch { /* none */ }
    const admins = ctx.users.list().filter(u => u.role === 'admin' && !u.disabled).length;
    add('usersFile', mode ? 'warn' : accounts && !admins ? 'warn' : 'ok', `${accounts} account(s) in users.json${accounts && !admins ? ' – no active admin' : ''}${mode}`);
  }
  if (!isLoopback(HOST)) {
    if (!auth && env.OW_INSECURE_NO_AUTH !== '1') add('exposure', 'fail', `listens on ${HOST} without a login – the server refuses to start`);
    else if (!auth) add('exposure', 'fail', `OW_INSECURE_NO_AUTH=1: everybody on the network can read and delete all documents`);
    else add('exposure', 'warn', `listens on ${HOST} – put it behind HTTPS (reverse proxy); the login is sent in clear text otherwise`);
  } else add('exposure', 'ok', `this computer only (${HOST})${env.OW_ALLOW_ANY_HOST === '1' ? ' – OW_ALLOW_ANY_HOST=1 turns off the DNS-rebinding guard' : ''}`);

  // port (only when the server is not the one asking)
  if (ctx.probePort) {
    const PORT = +ctx.PORT || 8080, st = await portState(PORT, HOST);
    if (st === 'free') add('port', 'ok', `${HOST}:${PORT} is free`);
    else if (st === 'busy') {
      let ours = null; try { const r = await fetch(`http://${isLoopback(HOST) || HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}/api/health`, { signal: AbortSignal.timeout(2000) }); ours = r.ok ? await r.json() : null; } catch { /* not http */ }
      add('port', ours && ours.name === 'office-werkstatt' ? 'info' : 'fail', ours && ours.name === 'office-werkstatt' ? `Office Werkstatt ${ours.version} is running on ${PORT}` : `port ${PORT} is used by another program`);
    } else add('port', 'fail', `${HOST}:${PORT}: ${st}`);
  }

  // stock keys stay on the server
  const sk = path.join(DATA, 'stock-keys.json');
  if (fs.existsSync(sk) && process.platform !== 'win32') { const m = fs.statSync(sk).mode & 0o777; add('stockKeys', m & 0o077 ? 'warn' : 'ok', m & 0o077 ? `stock-keys.json permissions ${m.toString(8)}, should be 600` : 'API keys protected'); }

  // logs
  if (ctx.log) add('logs', ctx.log.enabled ? 'ok' : 'info', ctx.log.enabled ? `${ctx.log.DIR} (kept ${ctx.log.keepDays} days)` : 'log files are off (OW_LOG_DAYS=0)');

  // engines & optional programs
  const eng = ['word', 'excel', 'slide', 'pdf'].filter(t => fs.existsSync(path.join(ROOT, 'engines', t, 'index.html')));
  add('engines', eng.length === 4 ? 'ok' : 'info', eng.length ? `installed: ${eng.join(', ')}${eng.length < 4 ? ' – others use the built-in editors (npm run engines)' : ''}` : 'none – built-in editors are used (npm run engines)');
  try { const bin = require('./convert.js').soffice(); add('converter', bin ? 'ok' : 'info', bin || 'LibreOffice not found – .ppt/.doc/.xls export is not available (optional)'); } catch { /* ignore */ }
  try {
    const models = fs.readdirSync(path.join(DATA, 'models')).filter(f => /\.gguf$/i.test(f));
    add('aiModels', 'info', models.length ? models.join(', ') : 'no built-in AI model downloaded (optional)');
  } catch { add('aiModels', 'info', 'no built-in AI model downloaded (optional)'); }

  // memory of this machine
  const freeMem = os.freemem();
  add('memory', freeMem < 256e6 ? 'warn' : 'ok', `${fmt(freeMem)} free of ${fmt(os.totalmem())}`);

  return out;
}
const summary = checks => checks.reduce((o, c) => (o[c.level] = (o[c.level] || 0) + 1, o), { ok: 0, info: 0, warn: 0, fail: 0 });

module.exports = { runChecks, summary, portState, isLoopback, fmt };
