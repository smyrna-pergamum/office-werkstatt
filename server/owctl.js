#!/usr/bin/env node
/* Office Werkstatt – server control from the command line (no dependencies)
 *   node server/owctl.js doctor [--json] [--fix]        check the installation (exit code 1 when something fails)
 *   node server/owctl.js status [--url http://host:8080] is a server running? (uses OW_USER/OW_PASS for the login)
 *   node server/owctl.js user list
 *   node server/owctl.js user add <name> [--role admin|editor|viewer]   password is asked (or from stdin / OW_NEW_PASS)
 *   node server/owctl.js user passwd <name>
 *   node server/owctl.js user role <name> <role>
 *   node server/owctl.js user disable|enable|remove <name>
 *   node server/owctl.js backup [list]                  create a backup now / list backups
 *   node server/owctl.js restore <file|name> [--replace] restore (a safety backup is made first)
 *   node server/owctl.js trash empty [--older-than 30]
 *   node server/owctl.js repair                         move unreadable files to quarantine, remove left-over .tmp files
 *   node server/owctl.js logs [--day YYYY-MM-DD] [--level warn] [--cat sharing|access|admin|http|errors] [-n 50] [--grep text]
 * Uses the same DATA_DIR / HOST / PORT / OW_* environment variables as the server.
 * Works while the server runs: the server notices new or changed accounts by itself. */
'use strict';
const fs = require('fs'), path = require('path'), readline = require('readline');

const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const ROOT = path.resolve(__dirname, '..', 'public');
const VERSION = (() => { try { return require(path.join(__dirname, '..', 'package.json')).version; } catch { return ''; } })();
const argv = process.argv.slice(2);
const flag = (n, def) => { const i = argv.indexOf(n); if (i < 0) return def; const v = argv[i + 1]; argv.splice(i, v === undefined || v.startsWith('-') ? 1 : 2); return v === undefined || v.startsWith('-') ? true : v; };
const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => tty ? `\x1b[${code}m${s}\x1b[0m` : s;
const ICON = { ok: c(32, '✔'), info: c(36, 'ℹ'), warn: c(33, '⚠'), fail: c(31, '✖') };
const die = (msg, code = 1) => { console.error(c(31, 'error: ') + msg); process.exit(code); };
const date = t => t ? new Date(t).toLocaleString() : '–';
const size = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' kB';

const quietLog = () => require('./log.js')({ DATA, quiet: true });
const getUsers = () => require('./users.js')({ DATA, envUser: process.env.OW_USER || '', envPass: process.env.OW_PASS || '' });
const getMaint = () => require('./maintenance.js')({ DATA, VERSION, log: quietLog() });

function ask(q, hidden) {
  return new Promise(resolve => {
    if (!process.stdin.isTTY) {          // piped: first line
      let buf = ''; process.stdin.setEncoding('utf8');
      process.stdin.on('data', d => { buf += d; }); process.stdin.on('end', () => resolve(buf.split(/\r?\n/)[0]));
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = s => { if (/\n|\r/.test(s)) rl.output.write('\n'); else if (!s.startsWith(q)) rl.output.write(''); else rl.output.write(q); };
    rl.question(q, a => { rl.close(); resolve(a); });
  });
}
async function newPassword() {
  if (process.env.OW_NEW_PASS) return process.env.OW_NEW_PASS;
  const a = await ask('Password: ', true);
  if (process.stdin.isTTY) { const b = await ask('Repeat:   ', true); if (a !== b) die('the passwords are not the same'); }
  return a;
}

const cmds = {
  async doctor() {
    const json = flag('--json'), fix = flag('--fix');
    const { runChecks, summary } = require('./doctor-core.js');
    const users = getUsers(), maint = getMaint(), log = quietLog();
    const ctx = { DATA, ROOT, HOST: process.env.HOST || '127.0.0.1', PORT: +process.env.PORT || 8080, users, maint, log, probePort: true };
    let checks = await runChecks(ctx);
    if (fix) {
      const want = new Set(checks.filter(x => x.fix && x.level !== 'ok').map(x => x.fix));
      if (want.has('repair')) { const r = maint.repair(); if (!json) console.log(`repair: ${r.broken} unreadable → quarantine, ${r.tmp} .tmp removed, ${r.orphans} orphaned form files → quarantine`); }
      if (want.has('emptyTrash')) { const r = maint.emptyTrash({ olderThanDays: 30 }); if (!json) console.log(`trash: ${r.removed} documents older than 30 days removed`); }
      if (want.has('backup')) { const r = maint.createBackup({ label: 'doctor' }); if (!json) console.log(`backup: ${r.name} (${r.files} documents)`); }
      if (want.size) checks = await runChecks(ctx);
    }
    const s = summary(checks);
    if (json) { console.log(JSON.stringify({ version: VERSION, dataDir: DATA, summary: s, checks }, null, 2)); }
    else {
      console.log(c(1, `Office Werkstatt ${VERSION} – doctor`) + c(2, `  (data: ${DATA})`));
      const w = Math.max(...checks.map(x => x.id.length));
      for (const x of checks) console.log(` ${ICON[x.level]} ${x.id.padEnd(w)}  ${x.level === 'ok' || x.level === 'info' ? c(2, x.detail) : x.detail}${x.fix && x.level !== 'ok' && !fix ? c(2, '  (--fix)') : ''}`);
      console.log(`\n ${s.ok} ok · ${s.info} info · ${c(33, s.warn + ' warnings')} · ${c(31, s.fail + ' failed')}`);
    }
    log.close();
    process.exitCode = s.fail ? 1 : 0;
  },

  async status() {
    const url = String(flag('--url', `http://127.0.0.1:${+process.env.PORT || 8080}`)).replace(/\/+$/, '');
    const headers = { 'X-OW-Request': '1' };
    if (process.env.OW_USER) headers.Authorization = 'Basic ' + Buffer.from(`${process.env.OW_USER}:${process.env.OW_PASS || ''}`).toString('base64');
    let h; try { h = await (await fetch(url + '/api/health', { headers, signal: AbortSignal.timeout(4000) })).json(); } catch (e) { die(`no server at ${url} (${e.cause ? e.cause.code : e.message})`); }
    console.log(`${ICON.ok} ${url}: ${h.name} ${h.version || ''}`);
    const r = await fetch(url + '/api/admin/status', { headers, signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!r || !r.ok) { console.log(c(2, `   (details need an admin login: OW_USER/OW_PASS${r ? ' – HTTP ' + r.status : ''})`)); return; }
    const s = await r.json();
    console.log(`   up ${Math.round(s.server.uptime / 60)} min · ${s.library.documents} documents · ${s.library.trashed} in trash · data ${size(s.usage.total.bytes)}${s.usage.disk ? ' · disk free ' + size(s.usage.disk.free) : ''}`);
    console.log(`   requests ${s.requests.total} (${s.requests.perMinute}/min) · errors 24 h: ${s.problems.error} · warnings 24 h: ${s.problems.warn} · active users ${s.activeSessions}`);
  },

  async user() {
    const sub = argv.shift(), name = argv.shift(), users = getUsers();
    try {
      if (!sub || sub === 'list') {
        const a = users.list(); if (!a.length) return console.log('no accounts – the server is open on this computer only (127.0.0.1)');
        for (const u of a) console.log(`${u.disabled ? c(2, '○') : c(32, '●')} ${u.name.padEnd(20)} ${u.role.padEnd(7)} ${u.source === 'env' ? c(2, '(OW_USER)') : c(2, 'last login ' + date(u.lastLogin))}`);
        return;
      }
      if (!name) die(`usage: user ${sub} <name>`);
      if (sub === 'add') { const role = String(flag('--role', 'editor')); const u = users.add({ name, role, password: await newPassword() }); return console.log(`${ICON.ok} ${u.name} added (${u.role})`); }
      if (sub === 'passwd') { users.update(name, { password: await newPassword() }); return console.log(`${ICON.ok} password of ${name} changed`); }
      if (sub === 'role') { const u = users.update(name, { role: argv.shift() }); return console.log(`${ICON.ok} ${u.name} is now ${u.role}`); }
      if (sub === 'disable' || sub === 'enable') { users.update(name, { disabled: sub === 'disable' }); return console.log(`${ICON.ok} ${name} ${sub}d`); }
      if (sub === 'remove') { users.remove(name); return console.log(`${ICON.ok} ${name} removed`); }
      die('unknown: user ' + sub);
    } catch (e) { die(e.message); }
  },

  async backup() {
    const m = getMaint();
    if (argv[0] === 'list') { const a = m.listBackups(); if (!a.length) return console.log('no backups'); for (const b of a) console.log(`${b.name.padEnd(48)} ${size(b.size).padStart(9)}  ${date(b.created)}`); return console.log(c(2, `\n${m.BACKUPS}`)); }
    const r = m.createBackup({ label: argv[0] || 'manual' });
    console.log(`${ICON.ok} ${r.name}: ${r.files} documents, ${r.forms} forms, ${size(r.size)}\n   ${path.join(m.BACKUPS, r.name)}`);
  },

  async restore() {
    const replace = flag('--replace'), src = argv.shift(); if (!src) die('usage: restore <backup file or name> [--replace]');
    const m = getMaint();
    try {
      let r;
      if (m.backupPath(src) && fs.existsSync(m.backupPath(src))) r = m.restoreFile(src, { mode: replace ? 'replace' : 'merge' });
      else { const o = JSON.parse(fs.readFileSync(path.resolve(src), 'utf8')); r = m.restore(o, { mode: replace ? 'replace' : 'merge', source: path.basename(src) }); }
      console.log(`${ICON.ok} ${r.written} documents restored (${r.mode})${r.removed ? `, ${r.removed} removed` : ''}, ${r.forms} forms\n   safety backup before: ${r.safety}`);
    } catch (e) { die(e.message); }
  },

  async trash() {
    if (argv.shift() !== 'empty') die('usage: trash empty [--older-than <days>]');
    const r = getMaint().emptyTrash({ olderThanDays: +flag('--older-than', 0) || 0 });
    console.log(`${ICON.ok} ${r.removed} documents deleted from the trash`);
  },

  async repair() {
    const r = getMaint().repair();
    console.log(`${ICON.ok} ${r.broken} unreadable documents and ${r.orphans} orphaned form files moved${r.quarantine ? ' to ' + path.join(DATA, r.quarantine) : ''}, ${r.tmp} .tmp files removed`);
  },

  async logs() {
    const log = quietLog();
    const day = flag('--day'), level = flag('--level'), n = +flag('-n', 50) || 50, q = flag('--grep'), cat = flag('--cat');
    const list = log.query({ day: day || undefined, fromFile: true, level: level || undefined, cat: cat || undefined, limit: n, q: q || undefined });
    const col = { error: 31, warn: 33, info: 0, debug: 2 };
    for (const e of list.slice().reverse()) {
      const { t, level: lv, ev, ...rest } = e;
      console.log(`${c(2, new Date(t).toISOString().replace('T', ' ').slice(0, 19))} ${c(col[lv] || 0, lv.padEnd(5))} ${ev.padEnd(16)} ${Object.entries(rest).map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`).join(' ')}`);
    }
    if (!list.length) console.log(c(2, 'no entries' + (log.enabled ? '' : ' (log files are off: OW_LOG_DAYS=0)')));
    log.close();
  },

  async help() {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 16).map(l => l.replace(/^\/?\s?\*\/?\s?/, '').replace(/\s*\*\/$/, '')).join('\n'));
  },
};

const cmd = argv.shift() || 'help';
Promise.resolve().then(cmds[cmd] || (() => die(`unknown command "${cmd}" – try: node server/owctl.js help`))).catch(e => die(e.stack || e.message));
