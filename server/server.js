#!/usr/bin/env node
/* Office Werkstatt – zero-dependency server
 * Serves the web app and stores documents in ./data so a team can use it from any browser.
 *   node server/server.js                → http://localhost:8080
 *   PORT=9000 DATA_DIR=/srv/ow node server/server.js
 *   HOST=0.0.0.0 OW_USER=team OW_PASS=secret node server/server.js   (share in the network – login required)
 * By default the server only listens on 127.0.0.1 (this computer). Listening on a network address
 * without OW_USER/OW_PASS is refused, because everybody who can reach it could read/change/delete
 * all documents. In a network, put it behind HTTPS (reverse proxy) – basic auth is sent in clear text.
 * Several accounts with roles (admin / editor / viewer): data/users.json – admin panel (#/admin) or
 *   node server/owctl.js user add <name> --role admin      (see server/users.js, server/admin.js, server/owctl.js)
 * Works fully offline / in an intranet – no external requests. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..', 'public');
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const PORT = +process.env.PORT || 8080, HOST = process.env.HOST || '127.0.0.1';
const USER = process.env.OW_USER || '', PASS = process.env.OW_PASS || '';
const DESKTOP = process.env.OW_DESKTOP === '1';
const isLoopback = h => /^(127\.\d+\.\d+\.\d+|localhost|::1|\[::1\])$/i.test(String(h || ''));
const VERSION = process.env.OW_VERSION || (() => { try { return require(path.join(__dirname, '..', 'package.json')).version; } catch { return 'unknown'; } })();
const MAX_BODY = (+process.env.MAX_MB || 150) * 1024 * 1024;
fs.mkdirSync(path.join(DATA, 'files'), { recursive: true });
fs.mkdirSync(path.join(DATA, 'forms'), { recursive: true });
const FORM = require(path.join(ROOT, 'js', 'form-core.js')); // Formular Werkzeug: shared validation + Excel table builder

/* ---------- control: log, accounts, maintenance ---------- */
const log = require('./log.js')({ DATA });
const users = require('./users.js')({ DATA, envUser: USER, envPass: PASS, readOnly: DESKTOP });
const maint = require('./maintenance.js')({ DATA, VERSION, log });
const sessions = require('./admin.js').makeSessions();
const stats = {
  started: Date.now(), requests: { total: 0, api: 0, errors: 0, denied: 0 }, recent: [],
  count(s, api) { this.requests.total++; if (api) this.requests.api++; if (s >= 500) this.requests.errors++; if (s === 401 || s === 403 || s === 429) this.requests.denied++;
    this.recent.push(Date.now()); if (this.recent.length > 20000) this.recent.splice(0, 10000); },
  perMinute() { const t = Date.now() - 60000; let n = 0; for (let i = this.recent.length - 1; i >= 0 && this.recent[i] >= t; i--) n++; return n; },
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };

process.on('SIGINT', () => process.exit()); process.on('SIGTERM', () => process.exit());

const safeId = id => /^[a-zA-Z0-9_-]{1,64}$/.test(id) ? id : null;
const fileOf = id => path.join(DATA, 'files', id + '.json');
const send = (res, code, body, type = 'application/json') => {
  if (res.headersSent || res.writableEnded || res.destroyed) { res.destroy(); return; }
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };

/* → { ok, user } – user is null when no login is configured (this computer only: full rights).
 * Wrong passwords are counted per address: after OW_LOGIN_FAILS (10) in 15 minutes the address waits. */
const fails = new Map();
const failCount = ip => { const t = Date.now() - 15 * 60000, a = (fails.get(ip) || []).filter(x => x > t); if (a.length) fails.set(ip, a); else fails.delete(ip); return a.length; };
async function authenticate(req) {
  if (!users.enabled()) return { ok: true, user: null };
  const ip = req.socket.remoteAddress || '?';
  if (failCount(ip) >= (+process.env.OW_LOGIN_FAILS || 10)) return { ok: false, locked: true };
  const h = req.headers.authorization || '';
  if (!/^Basic /i.test(h)) return { ok: false };
  const dec = Buffer.from(h.replace(/^Basic /i, ''), 'base64').toString(), i = dec.indexOf(':');
  const user = i < 0 ? null : await users.verify(dec.slice(0, i), dec.slice(i + 1));
  if (user) return { ok: true, user };
  const a = fails.get(ip) || []; a.push(Date.now()); fails.set(ip, a); if (fails.size > 10000) fails.clear();
  log.warn('auth.failed', { user: i < 0 ? '' : dec.slice(0, i).slice(0, 64), ip });
  return { ok: false };
}
/* roles: admin – everything · editor – everything but server settings and /api/admin · viewer – read only */
function permitted(user, req, parts) {
  const role = user ? user.role : 'admin';
  if (role === 'admin' || parts[0] !== 'api') return true;
  if (parts[1] === 'admin') return false;
  const m = req.method;
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS' || parts[1] === 'me') return true;
  if (parts[1] === 'stock' && parts[2] === 'keys') return false;                                  // server-wide API keys
  if (parts[1] === 'llm' && ['download', 'cancel', 'model'].includes(parts[2])) return false;     // disk space on the server
  if (role === 'editor') return true;
  return parts[1] === 'ai' || parts[1] === 'convert' || (parts[1] === 'llm' && parts[2] === 'ensure') || (parts[1] === 'stock' && parts[2] === 'track');
}
/* changing admin requests must come from this app (custom header + same origin) */
function sameApp(req) {
  if (req.headers['x-ow-request'] !== '1') return false;
  const o = req.headers.origin; if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}

function readBody(req, max = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > max) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject);
  });
}


/* ---------- Formular Werkzeug ----------
 * data/forms/<id>.html            published page (public: /f/<id>)
 * data/forms/<id>.json            { accepting, publishedAt, labels }
 * data/forms/<id>.responses.jsonl one answer per line (public POST, team GET/DELETE)
 * Every new answer also refreshes the linked Excel Werkzeug table (content.excelId of the form file). */
const formPath = (id, ext) => path.join(DATA, 'forms', id + ext);
const readJSON = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const readResponses = id => { try { return fs.readFileSync(formPath(id, '.responses.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
const sendC = (res, code, body) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, CORS)); res.end(JSON.stringify(body)); };
const hits = new Map(); // tiny per-IP rate limit for the public endpoint
function limited(req) {
  const ip = req.socket.remoteAddress || '?', now = Date.now(), h = (hits.get(ip) || []).filter(x => now - x < 60000);
  h.push(now); hits.set(ip, h); if (hits.size > 5000) hits.clear();
  return h.length > (+process.env.OW_FORM_RATE || 30);
}
function syncFormExcel(id) {
  const file = readJSON(fileOf(id)); if (!file || !file.content || !file.content.excelId) return;
  const xid = safeId(file.content.excelId); if (!xid) return;
  const x = readJSON(fileOf(xid)); if (!x || x.trashed) return;
  const meta = readJSON(formPath(id, '.json')) || {}, labels = meta.labels || {};
  const src = r => Object.assign({}, r, { src: r.src && labels['src.' + r.src] ? labels['src.' + r.src] : r.src || '' });
  const all = FORM.mergeResponses(file.content.responses, readResponses(id)).map(src);
  x.content = FORM.syncExcelContent(x.content, file.content, id, all, labels); x.modified = Date.now(); delete x.proExt; delete x.size;
  const tmp = fileOf(xid) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(x)); fs.renameSync(tmp, fileOf(xid));
}
async function formsPublic(req, res, id) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (req.method !== 'POST') return sendC(res, 405, { error: 'method not allowed' });
  const meta = readJSON(formPath(id, '.json')), file = readJSON(fileOf(id));
  if (!meta || !file || !file.content || file.trashed) return sendC(res, 404, { error: 'not found' });
  if (meta.accepting === false || file.content.accepting === false) return sendC(res, 410, { error: 'closed' });
  if (limited(req)) return sendC(res, 429, { error: 'too many requests' });
  let body; try { body = JSON.parse(await readBody(req, 64 * 1024)); } catch { return sendC(res, 400, { error: 'bad request' }); }
  const v = FORM.validate(file.content, body && body.answers);
  if (v.errors.length) return sendC(res, 422, { error: 'invalid', fields: v.errors });
  const rid = typeof body.id === 'string' && /^[a-z0-9]{6,24}$/i.test(body.id) ? body.id : FORM.uid() + FORM.uid();
  if (readResponses(id).some(r => r.id === rid)) return sendC(res, 200, { ok: true, duplicate: true });
  const rec = { id: rid, at: Date.now(), answers: v.answers, src: body.src === 'kiosk' ? 'kiosk' : 'web' };
  fs.appendFileSync(formPath(id, '.responses.jsonl'), JSON.stringify(rec) + '\n');
  try { syncFormExcel(id); } catch (e) { log.error('form.excelSync', { form: id, msg: String(e.message || e) }); }
  sendC(res, 200, { ok: true });
}
async function formsApi(req, res, id, what) {
  if (what === 'responses') {
    if (req.method === 'GET') return send(res, 200, readResponses(id));
    if (req.method === 'DELETE') { try { fs.unlinkSync(formPath(id, '.responses.jsonl')); } catch { /* none */ } try { syncFormExcel(id); } catch { /* ignore */ } return send(res, 200, { ok: true }); }
  }
  if (what === 'publish') {
    if (req.method === 'GET') { const m = readJSON(formPath(id, '.json')); return send(res, 200, m && fs.existsSync(formPath(id, '.html')) ? m : null); }
    if (req.method === 'PUT') {
      try {
        const b = JSON.parse(await readBody(req, 40 * 1024 * 1024)); // pages may contain images
        if (typeof b.html !== 'string' || !/^<!DOCTYPE html>/i.test(b.html)) return send(res, 400, { error: 'bad page' });
        const meta = { accepting: b.accepting !== false, publishedAt: Date.now(), labels: b.labels && typeof b.labels === 'object' ? b.labels : {} };
        fs.writeFileSync(formPath(id, '.html'), b.html); fs.writeFileSync(formPath(id, '.json'), JSON.stringify(meta));
        try { syncFormExcel(id); } catch { /* ignore */ }
        return send(res, 200, meta);
      } catch (e) { return send(res, 400, { error: String(e.message || e) }); }
    }
    if (req.method === 'DELETE') { for (const x of ['.html', '.json']) { try { fs.unlinkSync(formPath(id, x)); } catch { /* none */ } } return send(res, 200, { ok: true }); }
  }
  send(res, 405, { error: 'method not allowed' });
}
function formPage(req, res, id) {
  const meta = readJSON(formPath(id, '.json')), file = readJSON(fileOf(id)), p = formPath(id, '.html');
  const page = (code, html) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); res.end(html); };
  if (!meta || !file || file.trashed || !fs.existsSync(p)) return page(404, '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;text-align:center;padding:60px">404</body>');
  page(200, fs.readFileSync(p));
}


/* ---------- stock media (Design Werkzeug) ----------
 * The API keys stay on this server (data/stock-keys.json); the browser only sees results.
 * /api/stock/media fetches images / audio from the providers' hosts so they can be embedded
 * in a design (no tainted canvas, works the same for every user). */
const STOCK = require(path.join(ROOT, 'js', 'stock-core.js'));
const stockKeysFile = path.join(DATA, 'stock-keys.json');
const stockKeys = () => { try { return JSON.parse(fs.readFileSync(stockKeysFile, 'utf8')); } catch { return {}; } };
async function stockApi(req, res, what, url) {
  const P = STOCK.PROVIDERS;
  if (what === 'config' && req.method === 'GET') { const k = stockKeys(), o = {}; for (const id of Object.keys(P)) o[id] = { key: !P[id].key || !!k[id], needsKey: P[id].key, kinds: P[id].kinds, site: P[id].site }; return send(res, 200, o); }
  if (what === 'keys' && req.method === 'PUT') {
    try { const b = JSON.parse(await readBody(req, 16 * 1024)), k = stockKeys(); for (const id of Object.keys(P)) if (typeof b[id] === 'string') { if (b[id].trim()) k[id] = b[id].trim().slice(0, 200); else delete k[id]; }
      fs.writeFileSync(stockKeysFile, JSON.stringify(k), { mode: 0o600 }); return send(res, 200, { ok: true }); } catch { return send(res, 400, { error: 'bad request' }); }
  }
  if (what === 'search' && req.method === 'GET') {
    const id = url.searchParams.get('provider'), kind = url.searchParams.get('kind'), q = (url.searchParams.get('q') || '').slice(0, 100), page = Math.max(1, Math.min(50, +url.searchParams.get('page') || 1));
    const p = P[id]; if (!p || !p.kinds.includes(kind)) return send(res, 400, { error: 'bad provider' });
    const key = stockKeys()[id]; if (p.key && !key) return send(res, 412, { error: 'no key' });
    try {
      const r0 = p.request(kind, q, page, key), r = await fetch(r0.url, { headers: Object.assign({ 'User-Agent': 'OfficeWerkstatt/' + VERSION }, r0.headers || {}), signal: AbortSignal.timeout(15000) });
      if (!r.ok) return send(res, 502, { error: 'provider ' + r.status });
      return send(res, 200, p.parse(await r.json(), kind));
    } catch (e) { return send(res, 504, { error: 'offline' }); }
  }
  if (what === 'media' && req.method === 'GET') {
    let u = url.searchParams.get('url') || '';
    try {
      for (let hop = 0; hop < 4; hop++) {
        const x = new URL(u); if (x.protocol !== 'https:' || !STOCK.MEDIA_HOSTS.some(re => re.test(x.hostname))) return send(res, 403, { error: 'host not allowed' });
        const r = await fetch(x, { redirect: 'manual', headers: { 'User-Agent': 'OfficeWerkstatt/' + VERSION }, signal: AbortSignal.timeout(30000) });
        if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = new URL(r.headers.get('location'), x).href; continue; }
        if (!r.ok) return send(res, 502, { error: 'provider ' + r.status });
        const type = (r.headers.get('content-type') || '').split(';')[0];
        if (!/^(image\/(png|jpe?g|gif|webp|svg\+xml)|audio\/[\w.+-]+|application\/octet-stream)$/.test(type)) return send(res, 415, { error: 'type' });
        if (+r.headers.get('content-length') > 40 * 1024 * 1024) return send(res, 413, { error: 'too large' });
        const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 40 * 1024 * 1024) return send(res, 413, { error: 'too large' });
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': buf.length, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" });
        return res.end(buf);
      }
      return send(res, 508, { error: 'too many redirects' });
    } catch { return send(res, 504, { error: 'offline' }); }
  }
  if (what === 'track' && req.method === 'POST') { // Unsplash asks to report downloads
    try { const b = JSON.parse(await readBody(req, 4096)), x = new URL(b.url), key = stockKeys().unsplash;
      if (x.protocol === 'https:' && x.hostname === 'api.unsplash.com' && key) await fetch(x, { headers: { Authorization: 'Client-ID ' + key }, signal: AbortSignal.timeout(10000) }).catch(() => {});
    } catch { /* ignore */ }
    return send(res, 200, { ok: true });
  }
  send(res, 404, { error: 'not found' });
}

const sharing = require('./sharing.js')({ DATA, users, log, send, readBody });   // owners and sharing between users
const aiApi = require('./ai.js')({ send, readBody, VERSION });
const convertApi = require('./convert.js')({ send, DATA });
const llmApi = require('./llm.js')({ send, readBody, DATA, VERSION });   // built-in AI engine (llama.cpp) + model manager   // LibreOffice (bundled or installed): .ppt/.pps/.pot, OpenDocument, .doc, .xls …   // AI Werkzeug: model proxy, web search, page reader
const adminApi = require('./admin.js')({ send, readBody, log, users, maint, sharing, VERSION, DATA, ROOT, stats, sessions, desktop: DESKTOP,
  host: () => (server.address() || {}).address || HOST, port: () => (server.address() || {}).port || PORT, llmStatus: () => llmApi.status() });   // control: admin panel + /api/me

async function api(req, res, parts) {
  if (parts[1] === 'health') return send(res, 200, { ok: true, name: 'office-werkstatt', version: VERSION });
  if (parts[1] === 'admin') return adminApi.adminApi(req, res, parts, new URL(req.url, 'http://x'));
  if (parts[1] === 'me') return adminApi.meApi(req, res, parts);
  if (parts[1] === 'engines') { const o = {}; for (const t of ['word', 'excel', 'slide', 'pdf']) o[t] = fs.existsSync(path.join(ROOT, 'engines', t, 'index.html')); return send(res, 200, o); }
  if (parts[1] === 'stock') return stockApi(req, res, parts[2], new URL(req.url, 'http://x'));
  if (parts[1] === 'ai') return aiApi(req, res, parts[2], new URL(req.url, 'http://x'));
  if (parts[1] === 'llm') return llmApi(req, res, parts[2], new URL(req.url, 'http://x'));
  if (parts[1] === 'convert' && !parts[2]) return convertApi(req, res, new URL(req.url, 'http://x'));
  if (parts[1] === 'forms') {
    const fid = safeId(decodeURIComponent(parts[2] || '')); if (!fid || !['responses', 'publish'].includes(parts[3]) || parts[4]) return send(res, 404, { error: 'not found' });
    const fa = sharing.access(req.owUser, sharing.readFile(fid)); if (!fa) return send(res, 404, { error: 'not found' });   // answers belong to whoever may see the form
    if (req.method !== 'GET' && fa === 'view') return send(res, 403, { error: 'read only', code: 'read_only' });
    return formsApi(req, res, fid, parts[3]);
  }
  if (parts[1] === 'directory' && req.method === 'GET') return sharing.directory(req, res);
  if (parts[1] !== 'files') return send(res, 404, { error: 'not found' });
  const id = parts[2] ? safeId(decodeURIComponent(parts[2])) : null;
  if (parts[2] && !id) return send(res, 400, { error: 'bad id' });
  if (id && parts[3] === 'share' && !parts[4]) return sharing.shareApi(req, res, id);
  if (parts[3]) return send(res, 404, { error: 'not found' });
  return sharing.filesApi(req, res, id);
}

function serveStatic(req, res, urlPath) {
  let p; try { p = decodeURIComponent(urlPath); } catch { return send(res, 400, 'bad request', 'text/plain'); }
  if (p.includes('\0')) return send(res, 400, 'bad request', 'text/plain');
  if (p.endsWith('/')) p += 'index.html';
  const full = path.resolve(ROOT, '.' + path.posix.normalize('/' + p.replace(/\\/g, '/')));
  if (!inside(ROOT, full)) return send(res, 403, 'forbidden', 'text/plain');
  fs.realpath(full, (rerr, real) => {
    // also resolve links/junctions: the real file must still be inside public/
    if (rerr) return send(res, 404, 'not found', 'text/plain');
    if (!inside(ROOT_REAL, real)) return send(res, 403, 'forbidden', 'text/plain');
    serveFile(req, res, p, real);
  });
}
const ROOT_REAL = (() => { try { return fs.realpathSync(ROOT); } catch { return ROOT; } })();
// separator-aware containment check ("public2" is NOT inside "public")
function inside(root, file) { const rel = path.relative(root, file); return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)); }
function serveFile(req, res, p, full) {
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'not found', 'text/plain');
    const type = MIME[path.extname(full).toLowerCase()] || 'application/octet-stream';
    // app code is always revalidated (updates apply at once); the large engines may be cached for 5 minutes
    const headers = { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': p.startsWith('/engines/') ? 'public, max-age=300' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
    headers['Last-Modified'] = st.mtime.toUTCString();
    const ims = Date.parse(req.headers['if-modified-since'] || '');
    if (!isNaN(ims) && Math.floor(st.mtimeMs / 1000) * 1000 <= ims) { delete headers['Content-Length']; res.writeHead(304, headers); return res.end(); }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(full).on('error', () => res.destroy()).pipe(res);
  });
}

/* DNS-rebinding guard: on 127.0.0.1 only answer requests addressed to this computer, so a web page
 * of another site cannot read the documents through a domain name that resolves to 127.0.0.1. */
let LOCAL_ONLY = true;
function hostAllowed(req) {
  if (!LOCAL_ONLY) return true;
  return isLoopback(String(req.headers.host || '').replace(/:\d+$/, ''));
}
/* access log: API calls and failures (polling of status pages only at debug level) */
const QUIET = /^\/api\/(health|me|engines|llm|admin\/(status|logs|sessions))(\/|$)/;
function track(req, res, urlPath) {
  const t0 = Date.now();
  res.on('finish', () => {
    const s = res.statusCode, apiCall = urlPath.startsWith('/api/');
    stats.count(s, apiCall);
    if (!apiCall && s < 400) return;
    if (s === 401 && !req.headers.authorization) return;                     // the browser's first request before the login dialog
    const lv = s >= 500 ? 'error' : s === 403 || s === 429 ? 'warn' : req.method === 'GET' && QUIET.test(urlPath) ? 'debug' : 'info';
    log[lv]('http', { m: req.method, p: urlPath.slice(0, 200), s, ms: Date.now() - t0, u: req.owUser ? req.owUser.name : undefined, ip: req.socket.remoteAddress });
  });
}
const server = http.createServer(async (req, res) => {
  if (!hostAllowed(req)) { res.writeHead(421, { 'Content-Type': 'text/plain' }); return res.end('misdirected request'); }
  let urlPath; try { urlPath = new URL(req.url, 'http://x').pathname; } catch { return send(res, 400, 'bad request', 'text/plain'); }
  track(req, res, urlPath);
  const parts = urlPath.split('/').filter(Boolean);
  /* public, no password: published forms (/f/<id>) and sending an answer to them */
  try {
    if (parts[0] === 'f' && parts.length === 2 && req.method === 'GET') { const fid = safeId(decodeURIComponent(parts[1])); return fid ? formPage(req, res, fid) : send(res, 404, 'not found', 'text/plain'); }
    if (parts[0] === 'api' && parts[1] === 'forms' && parts[3] === 'responses' && parts.length === 4 && (req.method === 'POST' || req.method === 'OPTIONS')) { const fid = safeId(decodeURIComponent(parts[2])); return fid ? await formsPublic(req, res, fid) : sendC(res, 404, { error: 'not found' }); }
    if (urlPath === '/api/health' && !req.headers.authorization && users.enabled()) return send(res, 200, { ok: true, name: 'office-werkstatt' });   // monitoring / Docker HEALTHCHECK (version only after login)
  } catch (e) { log.error('server', { msg: String(e.stack || e).slice(0, 2000), p: urlPath }); return send(res, 500, { error: 'server error' }); }
  const a = await authenticate(req);
  if (!a.ok) {
    if (a.locked) { res.writeHead(429, { 'Content-Type': 'text/plain', 'Retry-After': '900' }); return res.end('too many failed logins – try again later'); }
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Office Werkstatt"' }); return res.end('auth required');
  }
  req.owUser = a.user;
  if (parts[0] === 'api') sessions.touch(a.user, req.socket.remoteAddress, req.headers['user-agent']);
  if (!permitted(a.user, req, parts)) return send(res, 403, { error: 'not allowed for your role', role: a.user && a.user.role });
  if (parts[0] === 'api' && (parts[1] === 'admin' || parts[1] === 'me') && !['GET', 'HEAD'].includes(req.method) && !sameApp(req)) return send(res, 403, { error: 'missing X-OW-Request header or foreign origin' });
  try { if (parts[0] === 'api') return await api(req, res, parts); serveStatic(req, res, urlPath); }
  catch (e) { log.error('server', { msg: String(e.stack || e).slice(0, 2000), p: urlPath }); send(res, 500, { error: 'server error' }); }
});

server.on('upgrade', (_req, socket) => socket.destroy());   // no websockets are used

function checkExposure(host) {
  if ((USER && !PASS) || (PASS && !USER)) throw new Error('Set both OW_USER and OW_PASS (or neither).');
  if (!isLoopback(host) && !users.enabled() && process.env.OW_INSECURE_NO_AUTH !== '1')
    throw new Error(`Refusing to listen on ${host} without a login: anyone on the network could read, change and delete all documents.\n` +
      'Set OW_USER and OW_PASS or add an admin (node server/owctl.js user add <name> --role admin), use HTTPS via a reverse proxy, or HOST=127.0.0.1 for this computer only.');
  LOCAL_ONLY = isLoopback(host) && process.env.OW_ALLOW_ANY_HOST !== '1';
}
const start = async (port = 0, host = '127.0.0.1') => {
  checkExposure(host);
  const p = await new Promise((r, j) => { server.once('error', j); const s = server.listen(port, host, () => r(s.address().port)); });
  log.info('server.start', { version: VERSION, host, port: p, auth: users.enabled(), accounts: users.list().length, desktop: DESKTOP });
  maint.startAuto();
  return p;
};
/* stop: close all open connections so nothing keeps the process alive */
const stop = () => new Promise(r => {
  try { llmApi.stop(); } catch { /* not running */ }
  maint.stopAuto(); log.info('server.stop'); log.close();
  if (server.closeAllConnections) server.closeAllConnections();
  server.close(() => r()); setTimeout(r, 1000);
});
if (require.main === module) start(PORT, HOST)
  .then(p => console.log(`Office Werkstatt → http://${isLoopback(HOST) ? 'localhost' : HOST}:${p}  (data: ${DATA}${users.enabled() ? ', login required' : ''})`))
  .catch(e => { console.error('Office Werkstatt: ' + e.message); process.exit(1); });
module.exports = { server, start, stop, log, users, maint };
