/* Office Werkstatt – maintenance: backups, restore, trash, repair
 * Backups: <data>/backups/ow-backup-YYYYMMDD-HHMMSS[-label].json
 *   { format: 'office-werkstatt-backup', version: 1, server: { version, created, label }, files: [...], forms: { id: { meta, html, responses } } }
 *   The same format as Settings › Backup in the app, so a server backup can also be restored in the browser and vice versa.
 *   Written as a stream (one document at a time) – large libraries do not have to fit into memory.
 * Automatic backups: every OW_BACKUP_HOURS hours (default 24, 0 = off), the newest OW_BACKUP_KEEP are kept (default 10).
 * Repair: unreadable documents and orphaned form data are moved to <data>/quarantine/<date>/, never deleted. */
'use strict';
const fs = require('fs'), path = require('path');

const pad = n => String(n).padStart(2, '0');
const stamp = (d = new Date()) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const BACKUP_RE = /^ow-backup-\d{8}-\d{6}(-[a-z0-9-]{1,40})?\.json$/;
const safeId = id => /^[a-zA-Z0-9_-]{1,64}$/.test(id) ? id : null;
const readJSON = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

module.exports = function makeMaintenance({ DATA, VERSION = '', log = null, onChange = () => {} }) {
  const FILES = path.join(DATA, 'files'), FORMS = path.join(DATA, 'forms'), BACKUPS = path.join(DATA, 'backups'), QUAR = path.join(DATA, 'quarantine');
  const ev = (lv, e, f) => log && log[lv](e, f);
  const ensure = d => fs.mkdirSync(d, { recursive: true });
  const ls = d => { try { return fs.readdirSync(d); } catch { return []; } };
  const quarantineDir = () => { const d = path.join(QUAR, stamp()); ensure(d); return d; };
  const moveTo = (src, dir) => { let dst = path.join(dir, path.basename(src)), i = 1; while (fs.existsSync(dst)) dst = path.join(dir, `${i++}-${path.basename(src)}`); fs.renameSync(src, dst); };
  function dirSize(d) {
    let n = 0, c = 0;
    const walk = p => { for (const e of ls(p)) { const f = path.join(p, e); let st; try { st = fs.lstatSync(f); } catch { continue; } if (st.isDirectory()) walk(f); else if (st.isFile()) { n += st.size; c++; } } };
    walk(d); return { bytes: n, files: c };
  }

  /* ---------- library overview ---------- */
  function library() {
    const o = { documents: 0, folders: 0, trashed: 0, trashedOld: 0, broken: 0, bytes: 0, byType: {}, newest: 0 };
    const old = Date.now() - 30 * 86400000;
    for (const f of ls(FILES)) {
      if (!f.endsWith('.json')) continue;
      const p = path.join(FILES, f); let st; try { st = fs.statSync(p); } catch { continue; }
      o.bytes += st.size;
      const j = readJSON(p); if (!j) { o.broken++; continue; }
      if (j.type === 'folder') { o.folders++; continue; }
      if (j.trashed) { o.trashed++; if ((j.trashedAt || j.modified || 0) < old) o.trashedOld++; continue; }
      o.documents++; o.byType[j.type] = (o.byType[j.type] || 0) + 1;
      if ((j.modified || 0) > o.newest) o.newest = j.modified;
    }
    const forms = ls(FORMS).filter(f => f.endsWith('.json') && !f.endsWith('.responses.json'));
    let responses = 0;
    for (const f of ls(FORMS)) if (f.endsWith('.responses.jsonl')) { try { responses += fs.readFileSync(path.join(FORMS, f), 'utf8').split('\n').filter(Boolean).length; } catch { /* ignore */ } }
    o.forms = { published: forms.length, responses };
    return o;
  }
  function usage() {
    const parts = {};
    for (const d of ['files', 'forms', 'models', 'backups', 'logs', 'quarantine']) parts[d] = dirSize(path.join(DATA, d));
    const total = dirSize(DATA);
    let disk = null;
    try { const s = fs.statfsSync(DATA); disk = { free: s.bavail * s.bsize, total: s.blocks * s.bsize }; } catch { /* node < 18.15 */ }
    return { total, parts, disk };
  }

  /* ---------- trash ---------- */
  function removeFormData(id) { for (const x of ['.html', '.json', '.responses.jsonl']) fs.rmSync(path.join(FORMS, id + x), { force: true }); }
  function emptyTrash({ olderThanDays = 0 } = {}) {
    const limit = Date.now() - Math.max(0, +olderThanDays || 0) * 86400000;
    const removed = [];
    for (const f of ls(FILES)) {
      if (!f.endsWith('.json')) continue;
      const j = readJSON(path.join(FILES, f)); if (!j || !j.trashed) continue;
      if (olderThanDays > 0 && (j.trashedAt || j.modified || 0) > limit) continue;
      const id = f.slice(0, -5);
      fs.rmSync(path.join(FILES, f), { force: true }); removeFormData(id);
      removed.push({ id, name: j.name || id });
    }
    ev('info', 'trash.emptied', { count: removed.length, olderThanDays: +olderThanDays || 0 });
    if (removed.length) onChange();
    return { removed: removed.length, items: removed.slice(0, 200) };
  }

  /* ---------- repair ---------- */
  function scan() {
    const fileIds = new Set(), broken = [], tmp = [], orphans = [];
    const now = Date.now();
    for (const f of ls(FILES)) {
      const p = path.join(FILES, f);
      if (f.endsWith('.tmp')) { try { if (now - fs.statSync(p).mtimeMs > 60000) tmp.push(f); } catch { /* gone */ } continue; }
      if (!f.endsWith('.json')) continue;
      if (readJSON(p)) fileIds.add(f.slice(0, -5)); else broken.push(f);
    }
    for (const f of ls(FORMS)) {
      const m = /^([a-zA-Z0-9_-]{1,64})\.(html|json|responses\.jsonl)$/.exec(f);
      if (m && !fileIds.has(m[1])) orphans.push(f);
    }
    return { broken, tmp, orphans };
  }
  function repair({ broken = true, tmp = true, orphans = true } = {}) {
    const s = scan(), done = { broken: 0, tmp: 0, orphans: 0, quarantine: null };
    let q = null; const qd = () => (q = q || quarantineDir());
    if (broken) for (const f of s.broken) { moveTo(path.join(FILES, f), qd()); done.broken++; }
    if (tmp) for (const f of s.tmp) { fs.rmSync(path.join(FILES, f), { force: true }); done.tmp++; }
    if (orphans) for (const f of s.orphans) { const d = path.join(qd(), 'forms'); ensure(d); moveTo(path.join(FORMS, f), d); done.orphans++; }
    done.quarantine = q ? path.relative(DATA, q) : null;
    ev('info', 'repair', done);
    if (done.broken || done.orphans) onChange();
    return done;
  }

  /* ---------- backups ---------- */
  function listBackups() {
    return ls(BACKUPS).filter(f => BACKUP_RE.test(f)).map(f => { const st = fs.statSync(path.join(BACKUPS, f)); return { name: f, size: st.size, created: st.mtimeMs, auto: /-auto\.json$/.test(f), safety: /-before-restore\.json$/.test(f) }; }).sort((a, b) => b.created - a.created);
  }
  const backupPath = name => BACKUP_RE.test(String(name || '')) ? path.join(BACKUPS, name) : null;

  function createBackup({ label = '' } = {}) {
    ensure(BACKUPS);
    label = String(label || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    let name = `ow-backup-${stamp()}${label ? '-' + label : ''}.json`, i = 1;
    while (fs.existsSync(path.join(BACKUPS, name))) name = `ow-backup-${stamp(new Date(Date.now() + 1000 * i++))}${label ? '-' + label : ''}.json`;
    const final = path.join(BACKUPS, name), tmp = final + '.part';
    const fd = fs.openSync(tmp, 'w', 0o600);
    let count = 0, forms = 0;
    try {
      fs.writeSync(fd, `{"format":"office-werkstatt-backup","version":1,"server":${JSON.stringify({ version: VERSION, created: Date.now(), label })},"files":[`);
      let first = true;
      for (const f of ls(FILES)) {
        if (!f.endsWith('.json')) continue;
        let s; try { s = fs.readFileSync(path.join(FILES, f), 'utf8'); JSON.parse(s); } catch { continue; }   // broken files are skipped (see repair)
        fs.writeSync(fd, (first ? '' : ',') + s); first = false; count++;
      }
      fs.writeSync(fd, '],"forms":{');
      first = true;
      for (const f of ls(FORMS)) {
        const m = /^([a-zA-Z0-9_-]{1,64})\.json$/.exec(f); if (!m) continue;
        const id = m[1], o = { meta: readJSON(path.join(FORMS, f)), html: null, responses: [] };
        try { o.html = fs.readFileSync(path.join(FORMS, id + '.html'), 'utf8'); } catch { /* none */ }
        try { o.responses = fs.readFileSync(path.join(FORMS, id + '.responses.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { /* none */ }
        fs.writeSync(fd, (first ? '' : ',') + JSON.stringify(id) + ':' + JSON.stringify(o)); first = false; forms++;
      }
      fs.writeSync(fd, '}}');
    } catch (e) { fs.closeSync(fd); fs.rmSync(tmp, { force: true }); throw e; }
    fs.closeSync(fd); fs.renameSync(tmp, final);
    const size = fs.statSync(final).size;
    ev('info', 'backup.created', { name, files: count, forms, size });
    return { name, files: count, forms, size };
  }
  function pruneBackups(keep = +(process.env.OW_BACKUP_KEEP || 10)) {
    const auto = listBackups().filter(b => b.auto);
    for (const b of auto.slice(Math.max(1, keep))) fs.rmSync(path.join(BACKUPS, b.name), { force: true });
  }
  function deleteBackup(name) {
    const p = backupPath(name); if (!p || !fs.existsSync(p)) throw Object.assign(new Error('no such backup'), { status: 404 });
    fs.rmSync(p, { force: true }); ev('info', 'backup.deleted', { name }); return { ok: true };
  }
  /* mode: 'merge' (default – documents in the backup overwrite those with the same id, others stay)
   *       'replace' (the library becomes exactly the backup). A safety backup is always made first. */
  function restore(obj, { mode = 'merge', source = '' } = {}) {
    if (!obj || obj.format !== 'office-werkstatt-backup' || !Array.isArray(obj.files)) throw Object.assign(new Error('not an Office Werkstatt backup'), { status: 400 });
    const safety = createBackup({ label: 'before-restore' });
    ensure(FILES); ensure(FORMS);
    const ids = new Set(); let written = 0, skipped = 0;
    for (const f of obj.files) {
      const id = f && safeId(String(f.id || '')); if (!id) { skipped++; continue; }
      ids.add(id);
      const tmp = path.join(FILES, id + '.json.tmp'); fs.writeFileSync(tmp, JSON.stringify(f)); fs.renameSync(tmp, path.join(FILES, id + '.json')); written++;
    }
    let removed = 0;
    if (mode === 'replace') {
      for (const f of ls(FILES)) if (f.endsWith('.json') && !ids.has(f.slice(0, -5))) { fs.rmSync(path.join(FILES, f), { force: true }); removeFormData(f.slice(0, -5)); removed++; }
    }
    let forms = 0;
    for (const [fid, o] of Object.entries(obj.forms && typeof obj.forms === 'object' ? obj.forms : {})) {
      const id = safeId(fid); if (!id || !o) continue;
      if (o.meta) fs.writeFileSync(path.join(FORMS, id + '.json'), JSON.stringify(o.meta));
      if (typeof o.html === 'string' && /^<!DOCTYPE html>/i.test(o.html)) fs.writeFileSync(path.join(FORMS, id + '.html'), o.html);
      if (Array.isArray(o.responses)) fs.writeFileSync(path.join(FORMS, id + '.responses.jsonl'), o.responses.map(r => JSON.stringify(r) + '\n').join(''));
      forms++;
    }
    const r = { mode, written, skipped, removed, forms, safety: safety.name };
    ev('warn', 'backup.restored', Object.assign({ source }, r));
    onChange();
    return r;
  }
  function restoreFile(name, opts) {
    const p = backupPath(name); if (!p || !fs.existsSync(p)) throw Object.assign(new Error('no such backup'), { status: 404 });
    let obj; try { obj = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { throw Object.assign(new Error('backup file is damaged'), { status: 400 }); }
    return restore(obj, Object.assign({ source: name }, opts));
  }
  /* an uploaded backup is stored next to the others first (stream to disk), then restored */
  function importUpload(req, max) {
    ensure(BACKUPS);
    const name = `ow-backup-${stamp()}-upload.json`, p = path.join(BACKUPS, name), tmp = p + '.part';
    return new Promise((resolve, reject) => {
      let size = 0; const out = fs.createWriteStream(tmp, { mode: 0o600 });
      req.on('data', c => { size += c.length; if (size > max) { req.destroy(); out.destroy(); fs.rmSync(tmp, { force: true }); reject(Object.assign(new Error('too large'), { status: 413 })); } });
      req.on('error', e => { out.destroy(); fs.rmSync(tmp, { force: true }); reject(e); });
      req.pipe(out);
      out.on('finish', () => {
        try { const o = JSON.parse(fs.readFileSync(tmp, 'utf8')); if (!o || o.format !== 'office-werkstatt-backup' || !Array.isArray(o.files)) throw new Error(); }
        catch { fs.rmSync(tmp, { force: true }); return reject(Object.assign(new Error('not an Office Werkstatt backup'), { status: 400 })); }
        fs.renameSync(tmp, p); ev('info', 'backup.uploaded', { name, size }); resolve(name);
      });
    });
  }

  /* ---------- automatic backups ---------- */
  let timer = null;
  function autoBackupTick(hours = +(process.env.OW_BACKUP_HOURS ?? 24)) {
    if (!(hours > 0)) return null;
    const last = listBackups().find(b => !b.safety);
    if (last && Date.now() - last.created < hours * 3600000) return null;
    if (!ls(FILES).some(f => f.endsWith('.json'))) return null;           // nothing to save yet
    try { const r = createBackup({ label: 'auto' }); pruneBackups(); return r; } catch (e) { ev('error', 'backup.auto', { msg: String(e.message || e) }); return null; }
  }
  function startAuto() {
    const hours = +(process.env.OW_BACKUP_HOURS ?? 24);
    if (!(hours > 0) || timer) return;
    setTimeout(() => autoBackupTick(hours), 30000).unref();
    timer = setInterval(() => autoBackupTick(hours), 3600000); timer.unref();
  }
  const stopAuto = () => { if (timer) clearInterval(timer); timer = null; };

  return { library, usage, emptyTrash, scan, repair, listBackups, backupPath, createBackup, deleteBackup, restore, restoreFile, importUpload, pruneBackups, autoBackupTick, startAuto, stopAuto, BACKUPS };
};
