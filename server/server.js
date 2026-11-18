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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject);
  });
}

async function api(req, res, parts) {
  if (parts[1] === 'health') return send(res, 200, { ok: true, name: 'office-werkstatt', version: VERSION });
  if (parts[1] === 'engines') { const o = {}; for (const t of ['word', 'excel', 'slide', 'pdf']) o[t] = fs.existsSync(path.join(ROOT, 'engines', t, 'index.html')); return send(res, 200, o); }
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
  if (!authorized(req)) { res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Office Werkstatt"' }); return res.end('auth required'); }
  let urlPath; try { urlPath = new URL(req.url, 'http://x').pathname; } catch { return send(res, 400, 'bad request', 'text/plain'); }
  const parts = urlPath.split('/').filter(Boolean);
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
  if (server.closeAllConnections) server.closeAllConnections();
  server.close(() => r()); setTimeout(r, 1000);
});
if (require.main === module) start(PORT, HOST)
  .then(p => console.log(`Office Werkstatt → http://${isLoopback(HOST) ? 'localhost' : HOST}:${p}  (data: ${DATA}${AUTH ? ', login required' : ''})`))
  .catch(e => { console.error('Office Werkstatt: ' + e.message); process.exit(1); });
module.exports = { server, start, stop };
