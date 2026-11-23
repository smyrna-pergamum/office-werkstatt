/* Office Werkstatt – server log
 * One JSON object per line in <data>/logs/YYYY-MM-DD.jsonl (kept OW_LOG_DAYS days, default 14; 0 = no files)
 * plus a ring buffer of the latest entries in memory (admin panel › Logs).
 *   entry: { t, level: debug|info|warn|error, ev, msg?, ...fields }
 * Passwords, keys and document contents are never logged. */
'use strict';
const fs = require('fs'), path = require('path');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
/* categories for the admin panel: event name prefixes */
const CATS = {
  sharing: ['share.', 'owner.', 'file.'],
  access: ['auth.', 'user.'],
  admin: ['admin.', 'backup.', 'trash.', 'repair', 'server.'],
  http: ['http'],
  errors: [],
};
const day = t => new Date(t).toISOString().slice(0, 10);

module.exports = function makeLog({ DATA, days = +(process.env.OW_LOG_DAYS ?? 14), ring = 2000, level = process.env.OW_LOG_LEVEL || 'info', quiet = false } = {}) {
  const DIR = path.join(DATA, 'logs');
  const toFile = days > 0;
  if (toFile) { try { fs.mkdirSync(DIR, { recursive: true }); } catch { /* checked by doctor */ } }
  const min = LEVELS[level] || LEVELS.info;
  const buf = [];
  let fileDay = '', broken = false;

  function prune() {
    if (!toFile) return;
    const keep = day(Date.now() - (days - 1) * 86400000);
    try { for (const f of fs.readdirSync(DIR)) { const m = /^(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(f); if (m && m[1] < keep) fs.rmSync(path.join(DIR, f), { force: true }); } } catch { /* ignore */ }
  }
  /* appended synchronously: a line is on disk before the answer goes out (and the admin panel reads the file) */
  function out(e) {
    if (!toFile || broken) return;
    const d = day(e.t);
    if (d !== fileDay) { fileDay = d; prune(); }
    try { fs.appendFileSync(path.join(DIR, d + '.jsonl'), JSON.stringify(e) + '\n', { mode: 0o600 }); }
    catch { broken = true; setTimeout(() => { broken = false; }, 60000).unref(); }        // disk full / no rights: retry in a minute
  }
  function write(lv, ev, fields) {
    if ((LEVELS[lv] || 0) < min) return null;
    const e = Object.assign({ t: Date.now(), level: lv, ev: String(ev || '') }, fields || {});
    buf.push(e); if (buf.length > ring) buf.splice(0, buf.length - ring);
    out(e);
    if (!quiet && LEVELS[lv] >= LEVELS.warn) (lv === 'error' ? console.error : console.warn)(`[${lv}] ${e.ev}${e.msg ? ': ' + e.msg : ''}`);
    return e;
  }
  const inCat = (e, c) => !c || !CATS[c] || (c === 'errors' ? LEVELS[e.level] >= LEVELS.warn : CATS[c].some(p => e.ev === p || e.ev.startsWith(p)));
  const match = (e, o) => (!o.level || (LEVELS[e.level] || 0) >= (LEVELS[o.level] || 0))
    && inCat(e, o.cat)
    && (!o.since || e.t >= o.since)
    && (!o.q || JSON.stringify(e).toLowerCase().includes(o.q));

  const log = {
    DIR,
    debug: (ev, f) => write('debug', ev, f), info: (ev, f) => write('info', ev, f),
    warn: (ev, f) => write('warn', ev, f), error: (ev, f) => write('error', ev, f),
    /* newest first. o: { level, q, limit, since, day } – with day the file of that day is read */
    query(o = {}) {
      const opts = { level: o.level, cat: o.cat, since: +o.since || 0, q: String(o.q || '').toLowerCase().slice(0, 200) };
      const limit = Math.max(1, Math.min(5000, +o.limit || 300));
      let src = buf;
      if ((o.day && o.day !== day(Date.now())) || o.fromFile) {      // fromFile: the command line tool (its own buffer is empty)
        o.day = o.day || day(Date.now());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(o.day)) return [];
        try { src = fs.readFileSync(path.join(DIR, o.day + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; }
      }
      const r = [];
      for (let i = src.length - 1; i >= 0 && r.length < limit; i--) if (match(src[i], opts)) r.push(src[i]);
      return r;
    },
    days() {
      if (!toFile) return [];
      try { return fs.readdirSync(DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort().reverse().map(f => ({ day: f.slice(0, 10), size: fs.statSync(path.join(DIR, f)).size })); } catch { return []; }
    },
    file(d) { return /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? path.join(DIR, d + '.jsonl') : null; },
    counts(sinceMs = 86400000) {
      const since = Date.now() - sinceMs, c = { warn: 0, error: 0 };
      for (let i = buf.length - 1; i >= 0 && buf[i].t >= since; i--) if (c[buf[i].level] !== undefined) c[buf[i].level]++;
      return c;
    },
    close() { fileDay = ''; },
    enabled: toFile, keepDays: days,
  };
  return log;
};
module.exports.LEVELS = LEVELS;
module.exports.CATS = Object.keys(CATS);
