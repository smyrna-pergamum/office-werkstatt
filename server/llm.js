/* Office Werkstatt – built-in AI engine (llama.cpp "llama-server", MIT licence)
 * No Ollama needed: the desktop installer ships llama-server (Vulkan build: uses the graphics card when it can,
 * otherwise the processor). Models are GGUF files in <data>/models, downloaded from Hugging Face in Settings › AI.
 *   GET    /api/llm                     → { available, running, model, base, gpu, models[], catalog[], downloads{}, error }
 *   POST   /api/llm/ensure   {model}    → starts the engine with that model (if needed) → { base }  (OpenAI API: base/chat/completions)
 *   POST   /api/llm/download {id | url} → starts a download in the background (progress in GET /api/llm)
 *   POST   /api/llm/cancel   {file}     → stops a download
 *   POST   /api/llm/stop                → stops the engine
 *   DELETE /api/llm/model?file=…        → deletes a downloaded model
 * The engine listens on 127.0.0.1 only and stops after 20 idle minutes (frees the memory). */
'use strict';
const fs = require('fs'), path = require('path'), net = require('net');
const { spawn } = require('child_process');

const CATALOG = [
  { id: 'qwen2.5-1.5b', name: 'Qwen 2.5 · 1.5B', size: 0.99e9, ram: 4, license: 'Apache-2.0', repo: 'bartowski/Qwen2.5-1.5B-Instruct-GGUF', file: 'Qwen2.5-1.5B-Instruct-Q4_K_M.gguf', note: 'fast' },
  { id: 'llama3.2-3b', name: 'Llama 3.2 · 3B', size: 2.02e9, ram: 6, license: 'Llama 3.2 Community License', repo: 'bartowski/Llama-3.2-3B-Instruct-GGUF', file: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf', note: 'small' },
  { id: 'qwen2.5-7b', name: 'Qwen 2.5 · 7B', size: 4.68e9, ram: 8, license: 'Apache-2.0', repo: 'bartowski/Qwen2.5-7B-Instruct-GGUF', file: 'Qwen2.5-7B-Instruct-Q4_K_M.gguf', note: 'recommended' },
  { id: 'qwen2.5-14b', name: 'Qwen 2.5 · 14B', size: 8.99e9, ram: 16, license: 'Apache-2.0', repo: 'bartowski/Qwen2.5-14B-Instruct-GGUF', file: 'Qwen2.5-14B-Instruct-Q4_K_M.gguf', note: 'strong' },
];
const hfURL = m => `https://huggingface.co/${m.repo}/resolve/main/${m.file}?download=true`;

module.exports = function makeLLM({ send, readBody, DATA, VERSION }) {
  const MODELS = path.join(DATA, 'models'); fs.mkdirSync(MODELS, { recursive: true });
  const exe = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
  function binary() {
    const c = [];
    if (process.env.OW_LLAMA_SERVER) c.push(process.env.OW_LLAMA_SERVER);
    if (process.env.OW_LLM_DIR) c.push(path.join(process.env.OW_LLM_DIR, exe));
    c.push(path.join(__dirname, '..', 'desktop', 'build', 'llm', exe));
    for (const d of String(process.env.PATH || '').split(path.delimiter)) if (d) c.push(path.join(d, exe));
    return c.find(p => { try { return fs.statSync(p).isFile(); } catch { return false; } }) || null;
  }
  const models = () => fs.readdirSync(MODELS).filter(f => /\.gguf$/i.test(f)).map(f => ({ file: f, size: fs.statSync(path.join(MODELS, f)).size, name: (CATALOG.find(c => c.file === f) || {}).name || f.replace(/\.gguf$/i, '') }));

  /* ---------- the engine process ---------- */
  let proc = null, port = 0, current = null, gpu = null, starting = null, lastUse = 0, lastError = '', logTail = [];
  const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.unref(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  async function healthy(p) { try { const r = await fetch(`http://127.0.0.1:${p}/health`, { signal: AbortSignal.timeout(2000) }); return r.ok; } catch { return false; } }
  function stop() { if (proc) { try { proc.kill(); } catch { /* gone */ } } proc = null; current = null; port = 0; }
  async function launch(file, layers) {
    const bin = binary(); if (!bin) throw new Error('engine not installed');
    const p = await freePort();
    const args = ['-m', path.join(MODELS, file), '--host', '127.0.0.1', '--port', String(p), '--jinja', '-c', '8192', '-ngl', String(layers)];
    logTail = [];
    const child = spawn(bin, args, { cwd: path.dirname(bin), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const keep = d => { logTail.push(...String(d).split(/\r?\n/).filter(Boolean)); if (logTail.length > 60) logTail = logTail.slice(-60); };
    child.stdout.on('data', keep); child.stderr.on('data', keep);
    let exited = false; child.on('exit', () => { exited = true; if (proc === child) { proc = null; current = null; port = 0; } });
    const t0 = Date.now();
    while (Date.now() - t0 < 240000) {                // large models need a while to load
      if (exited) throw new Error(logTail.slice(-6).join(' | ') || 'engine stopped');
      if (await healthy(p)) { proc = child; port = p; current = file; gpu = layers > 0; return; }
      await new Promise(r => setTimeout(r, 500));
    }
    try { child.kill(); } catch { /* ignore */ }
    throw new Error('engine did not start in time');
  }
  async function ensure(file) {
    lastUse = Date.now();
    if (!file) { const m = models(); if (!m.length) throw new Error('no model downloaded'); file = m[0].file; }
    if (!fs.existsSync(path.join(MODELS, path.basename(file)))) throw new Error('model not found');
    file = path.basename(file);
    if (proc && current === file && await healthy(port)) return `http://127.0.0.1:${port}/v1`;
    if (starting) { await starting.catch(() => {}); if (proc && current === file) return `http://127.0.0.1:${port}/v1`; }
    stop();
    starting = (async () => {
      lastError = '';
      try { await launch(file, 999); }                      // graphics card (Vulkan) where possible …
      catch (e1) { try { await launch(file, 0); } catch (e2) { lastError = String(e2.message || e2); throw e2; } }   // … otherwise the processor
    })();
    try { await starting; } finally { starting = null; }
    return `http://127.0.0.1:${port}/v1`;
  }
  setInterval(() => { if (proc && Date.now() - lastUse > 20 * 60000) stop(); }, 60000).unref();
  process.on('exit', stop);

  /* ---------- downloads (resumable) ---------- */
  const downloads = {};      // file → { got, total, done, error, ctrl }
  async function download(url, file) {
    if (downloads[file] && !downloads[file].done && !downloads[file].error) return;
    const d = downloads[file] = { got: 0, total: 0, done: false, error: '', ctrl: new AbortController() };
    const part = path.join(MODELS, file + '.part');
    try {
      let have = 0; try { have = fs.statSync(part).size; } catch { /* new */ }
      const r = await fetch(url, { headers: Object.assign({ 'User-Agent': 'OfficeWerkstatt/' + VERSION }, have ? { Range: `bytes=${have}-` } : {}), signal: d.ctrl.signal, redirect: 'follow' });
      if (!r.ok && r.status !== 206) throw new Error('HTTP ' + r.status);
      if (r.status !== 206) have = 0;
      d.got = have; d.total = have + (+r.headers.get('content-length') || 0);
      const out = fs.createWriteStream(part, { flags: have ? 'a' : 'w' });
      for await (const chunk of r.body) { if (!out.write(chunk)) await new Promise(res => out.once('drain', res)); d.got += chunk.length; }
      await new Promise((res, rej) => out.end(err => err ? rej(err) : res()));
      const head = Buffer.alloc(4); const fd = fs.openSync(part, 'r'); fs.readSync(fd, head, 0, 4, 0); fs.closeSync(fd);
      if (head.toString('latin1') !== 'GGUF') { fs.rmSync(part, { force: true }); throw new Error('not a GGUF model file'); }
      fs.renameSync(part, path.join(MODELS, file)); d.done = true;
    } catch (e) { d.error = d.ctrl.signal.aborted ? 'cancelled' : String(e.message || e); }
  }

  const status = () => ({
    available: !!binary(), running: !!proc, model: current, base: proc ? `http://127.0.0.1:${port}/v1` : null, gpu, error: lastError,
    models: models(), catalog: CATALOG.map(c => Object.assign({}, c, { url: hfURL(c) })),
    downloads: Object.fromEntries(Object.entries(downloads).map(([k, v]) => [k, { got: v.got, total: v.total, done: v.done, error: v.error }])),
  });

  async function llmApi(req, res, what, url) {
    try {
      if (!what && req.method === 'GET') return send(res, 200, status());
      if (what === 'ensure' && req.method === 'POST') { const o = JSON.parse(await readBody(req, 4096) || '{}'); return send(res, 200, { base: await ensure(o.model) }); }
      if (what === 'stop' && req.method === 'POST') { stop(); return send(res, 200, { ok: true }); }
      if (what === 'download' && req.method === 'POST') {
        const o = JSON.parse(await readBody(req, 8192) || '{}');
        let link, file;
        const c = CATALOG.find(x => x.id === o.id);
        if (c) { link = hfURL(c); file = c.file; }
        else {
          const u = new URL(String(o.url || ''));
          if (u.protocol !== 'https:' || !/\.gguf$/i.test(u.pathname)) return send(res, 400, { error: 'a https link to a .gguf file' });
          link = u.toString(); file = path.basename(decodeURIComponent(u.pathname));
        }
        if (!/^[\w.+-]{1,160}\.gguf$/i.test(file)) return send(res, 400, { error: 'bad file name' });
        download(link, file);
        return send(res, 200, { started: file });
      }
      if (what === 'cancel' && req.method === 'POST') { const o = JSON.parse(await readBody(req, 4096) || '{}'); const d = downloads[o.file]; if (d) d.ctrl.abort(); return send(res, 200, { ok: true }); }
      if (what === 'model' && req.method === 'DELETE') {
        const f = path.basename(String(url.searchParams.get('file') || ''));
        if (!/\.gguf$/i.test(f)) return send(res, 400, { error: 'bad file' });
        if (current === f) stop();
        fs.rmSync(path.join(MODELS, f), { force: true }); fs.rmSync(path.join(MODELS, f + '.part'), { force: true }); delete downloads[f];
        return send(res, 200, { ok: true });
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) { return send(res, 500, { error: String((e && e.message) || e) }); }
  }
  llmApi.stop = stop;
  llmApi.status = status;
  return llmApi;
};
