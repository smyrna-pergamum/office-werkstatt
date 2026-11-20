#!/usr/bin/env node
/* Office Werkstatt – zero-dependency server
 * Serves the web app and stores documents in ./data so a team can use it from any browser.
 *   node server/server.js                → http://localhost:8080
 *   PORT=9000 DATA_DIR=/srv/ow node server/server.js
 *   HOST=0.0.0.0 OW_USER=team OW_PASS=secret node server/server.js   (share in the network – login required)
 * By default the server only listens on 127.0.0.1 (this computer). Listening on a network address
 * without OW_USER/OW_PASS is refused, because everybody who can reach it could read/change/delete
 * all documents. In a network, put it behind HTTPS (reverse proxy) – basic auth is sent in clear text.
 * Works fully offline / in an intranet – no external requests. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', 'public');
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const PORT = +process.env.PORT || 8080, HOST = process.env.HOST || '127.0.0.1';
const USER = process.env.OW_USER || '', PASS = process.env.OW_PASS || '';
const AUTH = !!(USER || PASS);
const isLoopback = h => /^(127\.\d+\.\d+\.\d+|localhost|::1|\[::1\])$/i.test(String(h || ''));
const VERSION = process.env.OW_VERSION || (() => { try { return require(path.join(__dirname, '..', 'package.json')).version; } catch { return 'unknown'; } })();
const MAX_BODY = (+process.env.MAX_MB || 150) * 1024 * 1024;
fs.mkdirSync(path.join(DATA, 'files'), { recursive: true });
fs.mkdirSync(path.join(DATA, 'forms'), { recursive: true });
const FORM = require(path.join(ROOT, 'js', 'form-core.js')); // Formular Werkzeug: shared validation + Excel table builder

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };

process.on('SIGINT', () => process.exit()); process.on('SIGTERM', () => process.exit());

const safeId = id => /^[a-zA-Z0-9_-]{1,64}$/.test(id) ? id : null;
const fileOf = id => path.join(DATA, 'files', id + '.json');
const send = (res, code, body, type = 'application/json') => {
  if (res.headersSent || res.writableEnded || res.destroyed) { res.destroy(); return; }
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };

function authorized(req) {
  if (!AUTH) return true;
  const h = req.headers.authorization || '';
  if (!/^Basic /i.test(h)) return false;
  const dec = Buffer.from(h.replace(/^Basic /i, ''), 'base64').toString(), i = dec.indexOf(':');
  if (i < 0) return false;
  const u = dec.slice(0, i), p = dec.slice(i + 1);
  const eq = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  return eq(u, USER) && eq(p, PASS);
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
  try { syncFormExcel(id); } catch (e) { console.error('excel sync', e); }
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

const aiApi = require('./ai.js')({ send, readBody, VERSION });
const convertApi = require('./convert.js')({ send, DATA });
const llmApi = require('./llm.js')({ send, readBody, DATA, VERSION });   // built-in AI engine (llama.cpp) + model manager   // LibreOffice (bundled or installed): .ppt/.pps/.pot, OpenDocument, .doc, .xls …   // AI Werkzeug: model proxy, web search, page reader

async function api(req, res, parts) {
  if (parts[1] === 'health') return send(res, 200, { ok: true, name: 'office-werkstatt', version: VERSION });
  if (parts[1] === 'engines') { const o = {}; for (const t of ['word', 'excel', 'slide', 'pdf']) o[t] = fs.existsSync(path.join(ROOT, 'engines', t, 'index.html')); return send(res, 200, o); }
  if (parts[1] === 'stock') return stockApi(req, res, parts[2], new URL(req.url, 'http://x'));
  if (parts[1] === 'ai') return aiApi(req, res, parts[2], new URL(req.url, 'http://x'));
  if (parts[1] === 'llm') return llmApi(req, res, parts[2], new URL(req.url, 'http://x'));
  if (parts[1] === 'convert' && !parts[2]) return convertApi(req, res, new URL(req.url, 'http://x'));
  if (parts[1] === 'forms') { const fid = safeId(decodeURIComponent(parts[2] || '')); return fid && ['responses', 'publish'].includes(parts[3]) && !parts[4] ? formsApi(req, res, fid, parts[3]) : send(res, 404, { error: 'not found' }); }
  if (parts[1] !== 'files') return send(res, 404, { error: 'not found' });
  const id = parts[2] ? safeId(decodeURIComponent(parts[2])) : null;
  if (parts[2] && !id) return send(res, 400, { error: 'bad id' });
  if (!id && req.method === 'GET') {
    const list = [];
    for (const f of fs.readdirSync(path.join(DATA, 'files'))) {
      if (!f.endsWith('.json')) continue;
      try { const o = JSON.parse(fs.readFileSync(path.join(DATA, 'files', f), 'utf8')); delete o.content; list.push(o); } catch { /* skip broken */ }
    }
    return send(res, 200, list);
  }
  if (id && req.method === 'GET') return fs.existsSync(fileOf(id)) ? send(res, 200, fs.readFileSync(fileOf(id))) : send(res, 404, { error: 'not found' });
  if (id && req.method === 'PUT') {
    try { const body = await readBody(req); const o = JSON.parse(body); o.id = id; const tmp = fileOf(id) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(o)); fs.renameSync(tmp, fileOf(id)); return send(res, 200, { ok: true }); }
    catch (e) { return send(res, 400, { error: String(e.message || e) }); }
  }
  if (id && req.method === 'DELETE') { try { fs.unlinkSync(fileOf(id)); } catch { /* already gone */ } return send(res, 200, { ok: true }); }
  send(res, 405, { error: 'method not allowed' });
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
const server = http.createServer(async (req, res) => {
  if (!hostAllowed(req)) { res.writeHead(421, { 'Content-Type': 'text/plain' }); return res.end('misdirected request'); }
  let urlPath; try { urlPath = new URL(req.url, 'http://x').pathname; } catch { return send(res, 400, 'bad request', 'text/plain'); }
  const parts = urlPath.split('/').filter(Boolean);
  /* public, no password: published forms (/f/<id>) and sending an answer to them */
  try {
    if (parts[0] === 'f' && parts.length === 2 && req.method === 'GET') { const fid = safeId(decodeURIComponent(parts[1])); return fid ? formPage(req, res, fid) : send(res, 404, 'not found', 'text/plain'); }
    if (parts[0] === 'api' && parts[1] === 'forms' && parts[3] === 'responses' && parts.length === 4 && (req.method === 'POST' || req.method === 'OPTIONS')) { const fid = safeId(decodeURIComponent(parts[2])); return fid ? await formsPublic(req, res, fid) : sendC(res, 404, { error: 'not found' }); }
  } catch (e) { console.error(e); return send(res, 500, { error: 'server error' }); }
  if (!authorized(req)) { res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Office Werkstatt"' }); return res.end('auth required'); }
  try { if (parts[0] === 'api') return await api(req, res, parts); serveStatic(req, res, urlPath); }
  catch (e) { console.error(e); send(res, 500, { error: 'server error' }); }
});

server.on('upgrade', (_req, socket) => socket.destroy());   // no websockets are used

function checkExposure(host) {
  if ((USER && !PASS) || (PASS && !USER)) throw new Error('Set both OW_USER and OW_PASS (or neither).');
  if (!isLoopback(host) && !AUTH && process.env.OW_INSECURE_NO_AUTH !== '1')
    throw new Error(`Refusing to listen on ${host} without a login: anyone on the network could read, change and delete all documents.\n` +
      'Set OW_USER and OW_PASS (and use HTTPS via a reverse proxy), or HOST=127.0.0.1 for this computer only.');
  LOCAL_ONLY = isLoopback(host) && process.env.OW_ALLOW_ANY_HOST !== '1';
}
const start = async (port = 0, host = '127.0.0.1') => {
  checkExposure(host);
  return new Promise((r, j) => { server.once('error', j); const s = server.listen(port, host, () => r(s.address().port)); });
};
/* stop: close all open connections so nothing keeps the process alive */
const stop = () => new Promise(r => {
  try { llmApi.stop(); } catch { /* not running */ }
  if (server.closeAllConnections) server.closeAllConnections();
  server.close(() => r()); setTimeout(r, 1000);
});
if (require.main === module) start(PORT, HOST)
  .then(p => console.log(`Office Werkstatt → http://${isLoopback(HOST) ? 'localhost' : HOST}:${p}  (data: ${DATA}${AUTH ? ', login required' : ''})`))
  .catch(e => { console.error('Office Werkstatt: ' + e.message); process.exit(1); });
module.exports = { server, start, stop };
