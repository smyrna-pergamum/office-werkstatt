/* Office Werkstatt – admin API (role "admin" only; the app's admin panel: #/admin)
 *   GET    /api/admin/status                  server, library, disk, AI engine, requests, recent problems
 *   GET    /api/admin/checks                  health checks (see doctor-core.js)
 *   POST   /api/admin/repair      {broken,tmp,orphans}
 *   GET    /api/admin/users                   accounts
 *   POST   /api/admin/users       {name,password,role}
 *   PUT    /api/admin/users/<name> {role?,password?,disabled?}
 *   DELETE /api/admin/users/<name>
 *   GET    /api/admin/sessions                who used the server (last 24 h)
 *   GET    /api/admin/shares                  every file with owner and shares + per person totals
 *   PUT    /api/admin/shares/<id>  {shared?,sharedPerm?,shares?}   change sharing of any file
 *   POST   /api/admin/owner        {owner, ids? | unowned? | from?}  give files a new owner
 *   POST   /api/admin/shares/revoke {user}            stop every share with this person
 *   GET    /api/admin/logs?level=&cat=&q=&limit=&day=&since=   cat: sharing | access | admin | http | errors
 *   GET    /api/admin/logs/days
 *   GET    /api/admin/logs/download?day=YYYY-MM-DD
 *   POST   /api/admin/trash/empty {olderThanDays}
 *   GET    /api/admin/backups
 *   POST   /api/admin/backups      {label}            create now
 *   POST   /api/admin/backups/upload                  body: backup JSON (also from Settings › Backup)
 *   GET    /api/admin/backups/<name>                  download
 *   POST   /api/admin/backups/<name>/restore {mode: merge|replace}
 *   DELETE /api/admin/backups/<name>
 * Signed-in user (every role):
 *   GET    /api/me                            { name, role, auth, desktop, canChangePassword }
 *   PUT    /api/me/password       {current,password}
 * Changing requests (everything but GET) must send the header "X-OW-Request: 1" and – when the browser sends
 * an Origin – come from this server's own origin. A web page of another site cannot do that (CSRF guard). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { runChecks, summary } = require('./doctor-core.js');

module.exports = function makeAdmin(d) {
  const { send, readBody, log, users, maint, sharing, VERSION, DATA, ROOT, stats, sessions } = d;
  const json = async (req, max = 64 * 1024) => { const s = await readBody(req, max); return s ? JSON.parse(s) : {}; };
  const fail = (res, e) => send(res, e.status || (e instanceof SyntaxError ? 400 : 500), { error: String(e.message || e), code: e.code || undefined });
  const audit = (req, ev, f) => log.info(ev, Object.assign({ by: req.owUser && req.owUser.name, ip: req.socket.remoteAddress }, f));

  function status() {
    const mem = process.memoryUsage(), lib = maint.library(), use = maint.usage();
    let llm = null; try { llm = d.llmStatus ? d.llmStatus() : null; } catch { /* ignore */ }
    return {
      server: {
        name: 'office-werkstatt', version: VERSION, node: process.versions.node, platform: `${os.type()} ${os.release()} (${process.arch})`, hostname: os.hostname(),
        pid: process.pid, started: stats.started, uptime: Math.round(process.uptime()), host: d.host(), port: d.port(), dataDir: DATA,
        auth: users.enabled(), accounts: users.list().length, desktop: d.desktop,
        backupHours: +(process.env.OW_BACKUP_HOURS ?? 24), logDays: log.keepDays,
      },
      system: { load: os.loadavg(), cpus: os.cpus().length, memFree: os.freemem(), memTotal: os.totalmem(), rss: mem.rss, heap: mem.heapUsed },
      library: lib, usage: use,
      engines: Object.fromEntries(['word', 'excel', 'slide', 'pdf'].map(t => [t, fs.existsSync(path.join(ROOT, 'engines', t, 'index.html'))])),
      ai: llm ? { available: llm.available, running: llm.running, model: llm.model, gpu: llm.gpu, models: (llm.models || []).length, error: llm.error || '' } : null,
      requests: Object.assign({}, stats.requests, { perMinute: stats.perMinute() }),
      problems: log.counts(86400000),
      activeSessions: sessions.list().filter(s => Date.now() - s.last < 5 * 60000).length,
      lastBackup: (maint.listBackups().filter(b => !b.safety)[0]) || null,
    };
  }

  async function adminApi(req, res, parts, url) {
    const what = parts[2], arg = parts[3] ? decodeURIComponent(parts[3]) : '', sub = parts[4], M = req.method;
    try {
      if (what === 'status' && M === 'GET') return send(res, 200, status());
      if (what === 'checks' && M === 'GET') { const c = await runChecks({ DATA, ROOT, HOST: d.host(), PORT: d.port(), users, maint, log }); return send(res, 200, { checks: c, summary: summary(c), at: Date.now() }); }
      if (what === 'repair' && M === 'POST') { const b = await json(req); const r = maint.repair({ broken: b.broken !== false, tmp: b.tmp !== false, orphans: b.orphans !== false }); audit(req, 'admin.repair', r); return send(res, 200, r); }

      if (what === 'users') {
        if (!arg && M === 'GET') return send(res, 200, { users: users.list(), roles: users.ROLES, minPassword: users.MIN_PASS, readOnly: d.desktop });
        if (d.desktop && M !== 'GET') return send(res, 409, { error: 'user accounts are only used by the server version', code: 'desktop' });
        if (!arg && M === 'POST') { const b = await json(req); const u = users.add({ name: b.name, password: b.password, role: b.role }); audit(req, 'user.added', { user: u.name, role: u.role }); return send(res, 200, u); }
        if (arg && M === 'PUT') {
          const b = await json(req), p = {};
          if (b.role !== undefined) p.role = b.role; if (b.password !== undefined) p.password = b.password; if (b.disabled !== undefined) p.disabled = !!b.disabled;
          const u = users.update(arg, p); audit(req, 'user.changed', { user: u.name, role: p.role, disabled: p.disabled, password: p.password !== undefined || undefined });
          if (p.disabled || p.password !== undefined || p.role) sessions.forget(u.name);
          return send(res, 200, u);
        }
        if (arg && M === 'DELETE') { if (req.owUser && arg.toLowerCase() === req.owUser.name.toLowerCase()) return send(res, 400, { error: 'you cannot delete your own account', code: 'self' }); users.remove(arg); sessions.forget(arg); audit(req, 'user.removed', { user: arg }); return send(res, 200, { ok: true }); }
      }

      if (what === 'sessions' && M === 'GET') return send(res, 200, { sessions: sessions.list() });

      if (what === 'shares') {
        const by = req.owUser ? req.owUser.name : 'local', ip = req.socket.remoteAddress;
        if (!arg && M === 'GET') return send(res, 200, Object.assign(sharing.overview(), { auth: users.enabled() }));
        if (arg === 'revoke' && M === 'POST') { const b = await json(req); return send(res, 200, sharing.revokeUser(String(b.user || ''), by, ip)); }
        if (arg && M === 'PUT') { const b = await json(req); return send(res, 200, sharing.adminShare(arg, b, by, ip)); }
      }
      if (what === 'owner' && M === 'POST') { const b = await json(req); return send(res, 200, sharing.setOwner(b, req.owUser ? req.owUser.name : 'local', req.socket.remoteAddress)); }

      if (what === 'logs' && M === 'GET') {
        if (arg === 'days') return send(res, 200, { days: log.days(), enabled: log.enabled });
        if (arg === 'download') {
          const f = log.file(url.searchParams.get('day')); if (!f || !fs.existsSync(f)) return send(res, 404, { error: 'not found' });
          res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Content-Disposition': `attachment; filename="office-werkstatt-${path.basename(f)}"`, 'Cache-Control': 'no-store' });
          return fs.createReadStream(f).pipe(res);
        }
        const q = Object.fromEntries(['level', 'q', 'limit', 'day', 'since', 'cat'].map(k => [k, url.searchParams.get(k) || undefined]));
        q.fromFile = log.enabled;          // today's file also holds the entries from before the last restart
        return send(res, 200, { entries: log.query(q) });
      }

      if (what === 'trash' && arg === 'empty' && M === 'POST') { const b = await json(req); const r = maint.emptyTrash({ olderThanDays: +b.olderThanDays || 0 }); audit(req, 'admin.emptyTrash', { removed: r.removed, olderThanDays: +b.olderThanDays || 0 }); return send(res, 200, r); }

      if (what === 'backups') {
        if (!arg && M === 'GET') return send(res, 200, { backups: maint.listBackups(), hours: +(process.env.OW_BACKUP_HOURS ?? 24), keep: +(process.env.OW_BACKUP_KEEP || 10) });
        if (!arg && M === 'POST') { const b = await json(req); const r = maint.createBackup({ label: b.label }); audit(req, 'admin.backup', { name: r.name }); return send(res, 200, r); }
        if (arg === 'upload' && M === 'POST') { const name = await maint.importUpload(req, (+process.env.OW_RESTORE_MB || 2048) * 1024 * 1024); audit(req, 'admin.backupUpload', { name }); return send(res, 200, { name }); }
        if (arg && !sub && M === 'GET') {
          const p = maint.backupPath(arg); if (!p || !fs.existsSync(p)) return send(res, 404, { error: 'not found' });
          const st = fs.statSync(p);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': st.size, 'Content-Disposition': `attachment; filename="${arg}"`, 'Cache-Control': 'no-store' });
          audit(req, 'admin.backupDownload', { name: arg });
          return fs.createReadStream(p).pipe(res);
        }
        if (arg && sub === 'restore' && M === 'POST') { const b = await json(req); const r = maint.restoreFile(arg, { mode: b.mode === 'replace' ? 'replace' : 'merge' }); audit(req, 'admin.restore', Object.assign({ name: arg }, r)); return send(res, 200, r); }
        if (arg && !sub && M === 'DELETE') { maint.deleteBackup(arg); audit(req, 'admin.backupDelete', { name: arg }); return send(res, 200, { ok: true }); }
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) {
      if (!e.status && !(e instanceof SyntaxError) && !e.code) log.error('admin', { msg: String(e.stack || e).slice(0, 2000), path: url.pathname });
      return fail(res, e);
    }
  }

  async function meApi(req, res, parts) {
    const u = req.owUser || { name: 'local', role: 'admin', source: 'local' };
    try {
      if (!parts[2] && req.method === 'GET') return send(res, 200, { name: u.name, role: u.role, auth: users.enabled(), desktop: d.desktop, canChangePassword: u.source === 'file' });
      if (parts[2] === 'password' && req.method === 'PUT') {
        if (u.source !== 'file') return send(res, 409, { error: 'this account cannot be changed here', code: 'locked' });
        const b = await json(req);
        await users.changeOwn(u.name, String(b.current || ''), b.password);
        log.info('user.ownPassword', { user: u.name, ip: req.socket.remoteAddress });
        return send(res, 200, { ok: true });
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) { return fail(res, e); }
  }

  return { adminApi, meApi, status };
};

/* who used the server: one entry per user + address + browser, kept 24 h */
module.exports.makeSessions = function makeSessions() {
  const m = new Map();
  const browser = ua => { ua = String(ua || ''); const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Electron\//.test(ua) ? 'Desktop app' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /curl|node|undici/i.test(ua) ? 'Script' : 'Other';
    const o = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''; return o ? `${b} · ${o}` : b; };
  return {
    touch(user, ip, ua) {
      const now = Date.now(), name = user ? user.name : 'local', key = `${name}|${ip}|${ua || ''}`;
      const s = m.get(key) || { user: name, role: user ? user.role : 'admin', ip, client: browser(ua), first: now, last: now, requests: 0 };
      s.last = now; s.requests++; if (user) s.role = user.role; m.set(key, s);
      if (m.size > 2000) for (const [k, v] of m) if (now - v.last > 86400000 || m.size > 2000) m.delete(k);
    },
    list() { const now = Date.now(); for (const [k, v] of m) if (now - v.last > 86400000) m.delete(k); return [...m.values()].sort((a, b) => b.last - a.last); },
    forget(name) { for (const [k, v] of m) if (v.user.toLowerCase() === String(name).toLowerCase()) m.delete(k); },
  };
};
