#!/usr/bin/env node
/* Office Werkstatt – zero-dependency server
 * Serves the web app and stores documents in ./data so a team can use it from any browser.
 *   node server/server.js                → http://localhost:8080
 *   PORT=9000 DATA_DIR=/srv/ow node server/server.js
 *   OW_USER=team OW_PASS=secret node server/server.js   (optional HTTP basic auth)
 * Works fully offline / in an intranet – no external requests. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), net = require('net'), { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', 'public');
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const PORT = +process.env.PORT || 8080, HOST = process.env.HOST || '0.0.0.0';
const USER = process.env.OW_USER, PASS = process.env.OW_PASS;
const MAX_BODY = (+process.env.MAX_MB || 150) * 1024 * 1024;
fs.mkdirSync(path.join(DATA, 'files'), { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };

/* ---------- built-in note engine: SilverBullet (engines-bin/silverbullet/<platform>/) ----------
 * Started as a child process on 127.0.0.1 and served under /sb/ through this server, so the
 * browser, the desktop app and the PWA all reach it on the same origin – no internet needed. */
const BIN = path.resolve(process.env.OW_BIN_DIR || path.join(__dirname, '..', 'engines-bin'));
const SB_PORT = +process.env.OW_SB_PORT || 0;
let sb = { port: 0, proc: null, ready: false };
function sbBinary() {
  const exe = process.platform === 'win32' ? 'silverbullet.exe' : 'silverbullet';
  const p = path.join(BIN, 'silverbullet', `${process.platform}-${process.arch}`, exe);
  return fs.existsSync(p) ? p : null;
}
function freePort() { return new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); }); }
async function startSilverBullet() {
  const bin = sbBinary(); if (!bin || process.env.OW_NO_SB) return;
  const space = path.join(DATA, 'notes'); fs.mkdirSync(space, { recursive: true });
  if (!fs.readdirSync(space).some(f => f.endsWith('.md'))) fs.writeFileSync(path.join(space, 'index.md'),
    '# Office Werkstatt · Notes\n\nWillkommen! · Hoş geldiniz! · Welcome!\n\n- [[Ideen]]\n- [[Besprechungen]]\n- [ ] Erste Aufgabe\n\n> Diese Notizen sind Markdown-Dateien in `data/notes` und funktionieren komplett offline.\n');
  sb.port = SB_PORT || await freePort();
  sb.proc = spawn(bin, [space, '--single', '-L', '127.0.0.1', '-p', String(sb.port)], { env: Object.assign({}, process.env, { SB_URL_PREFIX: '/sb' }), stdio: 'ignore', windowsHide: true });
  sb.proc.on('exit', () => { sb.ready = false; sb.proc = null; });
  for (let i = 0; i < 50 && !sb.ready; i++) { await new Promise(r => setTimeout(r, 200)); sb.ready = await new Promise(r => { const q = http.get({ host: '127.0.0.1', port: sb.port, path: '/sb/' }, res => { res.resume(); r(res.statusCode < 500); }); q.on('error', () => r(false)); }); }
  console.log(sb.ready ? `SilverBullet (note engine) → /sb/` : 'SilverBullet could not be started');
}
const stopSilverBullet = () => { try { sb.proc && sb.proc.kill(); } catch { /* ignore */ } };
process.on('exit', stopSilverBullet); process.on('SIGINT', () => process.exit()); process.on('SIGTERM', () => process.exit());
function proxySB(req, res) {
  if (!sb.ready) return send(res, 503, 'note engine not running', 'text/plain');
  const up = http.request({ host: '127.0.0.1', port: sb.port, method: req.method, path: req.url, headers: Object.assign({}, req.headers, { host: `127.0.0.1:${sb.port}` }) }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on('error', () => send(res, 502, 'note engine error', 'text/plain'));
  req.pipe(up);
}

const safeId = id => /^[a-zA-Z0-9_-]{1,64}$/.test(id) ? id : null;
const fileOf = id => path.join(DATA, 'files', id + '.json');
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };

function authorized(req) {
  if (!USER) return true;
  const h = req.headers.authorization || '';
  const [u, p] = Buffer.from(h.replace(/^Basic /, ''), 'base64').toString().split(':');
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
  if (parts[1] === 'health') return send(res, 200, { ok: true, name: 'office-werkstatt', version: '1.0.0' });
  if (parts[1] === 'engines') { const o = {}; for (const t of ['word', 'excel', 'slide', 'draw', 'pdf']) o[t] = fs.existsSync(path.join(ROOT, 'engines', t, 'index.html')); o.note = sb.ready; return send(res, 200, o); }
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
  let p = decodeURIComponent(urlPath); if (p.endsWith('/')) p += 'index.html';
  const full = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!full.startsWith(ROOT)) return send(res, 403, 'forbidden', 'text/plain');
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'not found', 'text/plain');
    const type = MIME[path.extname(full).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': p.endsWith('sw.js') ? 'no-cache' : 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(full).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  if (!authorized(req)) { res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Office Werkstatt"' }); return res.end('auth required'); }
  const urlPath = new URL(req.url, 'http://x').pathname;
  const parts = urlPath.split('/').filter(Boolean);
  try { if (parts[0] === 'sb') return proxySB(req, res); if (parts[0] === 'api') return await api(req, res, parts); serveStatic(req, res, urlPath); }
  catch (e) { console.error(e); send(res, 500, { error: 'server error' }); }
});

// websockets (SilverBullet live updates) are tunnelled to the engine as raw sockets
server.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/sb/') || !sb.ready || !authorized(req)) return socket.destroy();
  const up = net.connect(sb.port, '127.0.0.1', () => {
    up.write(`${req.method} ${req.url} HTTP/1.1\r\n` + Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n');
    if (head && head.length) up.write(head);
    socket.pipe(up).pipe(socket);
  });
  up.on('error', () => socket.destroy()); socket.on('error', () => up.destroy());
});

const start = async (port = 0, host = '127.0.0.1') => { await startSilverBullet(); return new Promise(r => { const s = server.listen(port, host, () => r(s.address().port)); }); };
if (require.main === module) start(PORT, HOST).then(p => console.log(`Office Werkstatt → http://localhost:${p}  (data: ${DATA})`));
module.exports = { server, start, stop: stopSilverBullet };
