/* Office Werkstatt – Android (Capacitor shell)
 * The same app runs inside the Android APK (mobile/). This file only acts there (window.Capacitor native):
 *  · OW.device.llm  – the built-in AI engine on the phone: llama.cpp through @cantoo/capacitor-llama (MIT).
 *                     GGUF models are downloaded once from Hugging Face into the app's data folder.
 *                     Tool calls are emulated in the prompt (<tool_call>{"name", "arguments"}</tool_call>, the Qwen/Hermes
 *                     format), so the agent works the same way as on the desktop.
 *  · OW.device.web  – web_search / fetch_page without the Office Werkstatt server (native HTTP, no CORS)
 *  · downloads      – a WebView cannot download blob: links: files are written to Documents/Office Werkstatt
 *                     and offered in the share sheet
 *  · "open with"    – documents opened from other apps land in the library
 *  · back button    – closes dialogs and the open document before leaving the app */
window.OW = window.OW || {};

/* Phones and tablets (also in the browser): the Pro engines (Word / Excel / Slide, canvas apps) apply the screen's
   pixel ratio twice on high-density screens – everything looks 2–3× too big. Their canvas is laid out at device
   pixels and scaled back with CSS: sharp text, the right size, and taps still land where the finger is. */
(function () {
  const d = window.devicePixelRatio || 1;
  if (d <= 1 || !matchMedia('(pointer: coarse)').matches) return;
  function fix(f) {
    let w; try { w = f.contentWindow; } catch { return; }
    if (!w || !/\/engines\/(word|excel|slide)\//.test(w.location.pathname)) return;
    const doc = w.document; if (!doc.head || doc.getElementById('ow-dpr-fix')) return;
    const st = doc.createElement('style'); st.id = 'ow-dpr-fix';
    const set = () => { st.textContent = `body > canvas { width: ${w.innerWidth * d}px !important; height: ${w.innerHeight * d}px !important; right: auto !important; bottom: auto !important; transform: scale(${1 / d}); transform-origin: 0 0; }`; };
    set(); w.addEventListener('resize', set); doc.head.appendChild(st);
  }
  function watch(f) {
    if (f.__owDpr) return; f.__owDpr = 1;
    let n = 0; const tick = () => { if (!f.isConnected) return; fix(f); if (++n < 600) setTimeout(tick, n < 100 ? 50 : 500); };
    f.addEventListener('load', () => { n = 0; tick(); }); tick();
  }
  const scan = () => document.querySelectorAll('iframe').forEach(watch);
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();

(function () {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  const P = C.Plugins, FS = P.Filesystem, LL = P.CapacitorLlama, HTTP = P.CapacitorHttp;
  const t = (k, v) => (OW.t ? OW.t(k, v) : k);
  document.documentElement.classList.add('ow-native', 'ow-' + C.getPlatform());

  OW.addStrings && OW.addStrings(`
ai.note.phoneTiny | Tiny and very fast – short answers, simple tasks | Winzig und sehr schnell – kurze Antworten, einfache Aufgaben | Çok küçük ve çok hızlı – kısa cevaplar, basit işler | Diminuto y muy rápido: respuestas cortas, tareas sencillas | Minuscule et très rapide – réponses courtes, tâches simples
ai.note.phoneSmall | Small, good with languages | Klein, gut mit Sprachen | Küçük, dillerde iyi | Pequeño, bueno con idiomas | Petit, bon avec les langues
ai.note.phoneRec | Recommended for phones – writing and agent work | Empfohlen für Handys – Schreiben und Agent-Arbeit | Telefonlar için önerilen – yazma ve ajan işleri | Recomendado para móviles: redacción y trabajo de agente | Recommandé pour les téléphones – rédaction et travail d’agent
ai.note.phoneStrong | Strongest – needs a fast phone with 6 GB RAM or more | Am stärksten – braucht ein schnelles Handy mit 6 GB RAM oder mehr | En güçlüsü – 6 GB veya daha fazla RAM'li hızlı bir telefon ister | El más potente: necesita un móvil rápido con 6 GB de RAM o más | Le plus puissant – nécessite un téléphone rapide avec 6 Go de RAM ou plus
ai.builtinPhone | Built-in engine on this phone (llama.cpp) – it starts by itself when you ask something. | Eingebaute Engine auf diesem Handy (llama.cpp) – sie startet von selbst, sobald Sie etwas fragen. | Bu telefondaki yerleşik motor (llama.cpp) – bir şey sorduğunuzda kendiliğinden başlar. | Motor integrado en este móvil (llama.cpp): se inicia solo cuando preguntas algo. | Moteur intégré sur ce téléphone (llama.cpp) – il démarre tout seul quand vous posez une question.
ai.builtinPhoneHint | Models are downloaded once from Hugging Face (Wi-Fi recommended) and then work without internet, on the phone's processor. Ollama on your computer or any OpenAI-compatible API work too. | Modelle werden einmal von Hugging Face geladen (WLAN empfohlen) und laufen dann ohne Internet auf dem Prozessor des Handys. Ollama auf Ihrem Computer oder jede OpenAI-kompatible API gehen ebenso. | Modeller Hugging Face'ten bir kez indirilir (Wi-Fi önerilir), sonra internetsiz telefonun işlemcisinde çalışır. Bilgisayarınızdaki Ollama ya da OpenAI uyumlu her API de kullanılabilir. | Los modelos se descargan una vez de Hugging Face (mejor con Wi-Fi) y luego funcionan sin internet en el procesador del móvil. También sirven Ollama en tu ordenador o cualquier API compatible con OpenAI. | Les modèles sont téléchargés une fois depuis Hugging Face (Wi-Fi conseillé) puis fonctionnent sans Internet sur le processeur du téléphone. Ollama sur votre ordinateur ou toute API compatible OpenAI fonctionnent aussi.
ai.loadingModel | Loading the model … | Modell wird geladen … | Model yükleniyor … | Cargando el modelo … | Chargement du modèle …
mob.saved | Saved in Documents › Office Werkstatt: {n} | Gespeichert unter Dokumente › Office Werkstatt: {n} | Belgeler › Office Werkstatt klasörüne kaydedildi: {n} | Guardado en Documentos › Office Werkstatt: {n} | Enregistré dans Documents › Office Werkstatt : {n}
mob.saveFailed | Could not save the file: | Die Datei konnte nicht gespeichert werden: | Dosya kaydedilemedi: | No se pudo guardar el archivo: | Impossible d’enregistrer le fichier :
mob.exit | Press back again to close Office Werkstatt | Nochmals Zurück drücken, um Office Werkstatt zu schließen | Office Werkstatt'ı kapatmak için tekrar geri tuşuna basın | Pulsa atrás otra vez para cerrar Office Werkstatt | Appuyez encore sur retour pour fermer Office Werkstatt
`);

  /* ---------- native HTTP (no CORS) ---------- */
  async function http(url, o = {}) {
    const r = await HTTP.request({ url, method: o.method || 'GET', headers: o.headers || {}, data: o.data, responseType: 'text', connectTimeout: 15000, readTimeout: 20000 });
    const text = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    const h = {}; Object.keys(r.headers || {}).forEach(k => { h[k.toLowerCase()] = r.headers[k]; });
    return { status: r.status, text, url: r.url || url, headers: h };
  }

  /* ---------- web tools (the same engines as server/ai.js) ---------- */
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
  const decode = s => String(s || '').replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => { try { return e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] || m); } catch { return m; } });
  const strip = h => decode(String(h || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  function htmlToText(html) {
    const title = strip((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1]);
    let b = String(html).replace(/<head[\s\S]*?<\/head>/i, ' ')
      .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe|template)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
    const main = /<(main|article)[\s\S]*?<\/\1>/i.exec(b); if (main && main[0].length > 800) b = main[0];
    b = b.replace(/<(h[1-6])[^>]*>/gi, '\n\n## ').replace(/<\/(h[1-6])>/gi, '\n').replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<(br|\/p|\/div|\/tr|\/li|\/section|\/table)[^>]*>/gi, '\n').replace(/<td[^>]*>/gi, ' | ').replace(/<[^>]+>/g, ' ');
    return { title, text: decode(b).replace(/[ \t\f\v]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim() };
  }
  /* the assistant must not reach into the local network (a web page could ask it to "fetch" a LAN address) */
  function publicURL(raw) {
    const u = new URL(String(raw || '').trim());
    if (!/^https?:$/.test(u.protocol)) throw new Error('only http(s) pages');
    const h = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
    const priv = v4 ? (a => a[0] === 10 || a[0] === 127 || a[0] === 0 || (a[0] === 169 && a[1] === 254) || (a[0] === 172 && a[1] >= 16 && a[1] <= 31) || (a[0] === 192 && a[1] === 168) || (a[0] === 100 && a[1] >= 64 && a[1] <= 127) || a[0] >= 224)(v4.slice(1).map(Number))
      : h.includes(':') ? (h === '::1' || h === '::' || /^(fc|fd|fe80)/.test(h) || h.startsWith('::ffff:')) : /^(localhost|.*\.local|.*\.internal|.*\.lan|.*\.home)$/.test(h) || !h.includes('.');
    if (priv) throw new Error('local addresses are not allowed');
    return u.toString();
  }
  const BROWSER_UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
  const unwrap = raw => {
    let url = decode(raw || ''); const ud = /[?&]uddg=([^&]+)/.exec(url); if (ud) url = decodeURIComponent(ud[1]);
    if (url.startsWith('//')) url = 'https:' + url;
    return /^https?:/.test(url) && !/duckduckgo\.com\/(y\.js|l\/)/.test(url) ? url : '';
  };
  const ENGINES = {
    async searxng(q, o) {
      const u = new URL(o.searxng.replace(/\/+$/, '') + '/search'); u.search = new URLSearchParams({ q, format: 'json', language: o.lang || 'all' }).toString();
      const r = await http(u.toString(), { headers: { Accept: 'application/json' } }); if (r.status >= 400) throw new Error('SearXNG HTTP ' + r.status);
      return (JSON.parse(r.text).results || []).map(x => ({ title: strip(x.title), url: unwrap(x.url), snippet: strip(x.content) }));
    },
    async bing(q, o) {
      const mkt = { tr: 'tr-TR', de: 'de-DE', en: 'en-GB', es: 'es-ES', fr: 'fr-FR' }[String(o.lang || '').slice(0, 2)] || '';
      const r = await http('https://www.bing.com/search?format=rss&count=10&q=' + encodeURIComponent(q) + (mkt ? '&setmkt=' + mkt : ''), { headers: { 'User-Agent': BROWSER_UA, Accept: 'application/rss+xml,text/xml;q=0.9,*/*;q=0.5', 'Accept-Language': o.lang || 'en' } });
      const out = [];
      for (const m of r.text.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const g = tag => strip(((new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>')).exec(m[1]) || [])[1]);
        out.push({ title: g('title'), url: unwrap(g('link')), snippet: g('description') });
      }
      return out;
    },
    async ddgLite(q, o) {
      const r = await http('https://lite.duckduckgo.com/lite/', { method: 'POST', data: new URLSearchParams({ q }).toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': BROWSER_UA, 'Accept-Language': o.lang || 'en' } });
      const h = r.text, out = [];
      const links = [...h.matchAll(/<a[^>]*href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>|<a[^>]*class=['"]result-link['"][^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
      const snips = [...h.matchAll(/<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g)].map(m => strip(m[1]));
      links.forEach((m, i) => out.push({ title: strip(m[2] || m[4]), url: unwrap(m[1] || m[3]), snippet: snips[i] || '' }));
      return out;
    },
    async wikipedia(q, o) {
      const l = /^(tr|de|en|es|fr)/.exec(String(o.lang || 'en')), w = l ? l[1] : 'en';
      const r = await http(`https://${w}.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=8&srsearch=` + encodeURIComponent(q));
      const d = JSON.parse(r.text);
      return ((d.query && d.query.search) || []).map(x => ({ title: x.title, url: `https://${w}.wikipedia.org/wiki/` + encodeURIComponent(x.title.replace(/ /g, '_')), snippet: strip(x.snippet) }));
    },
  };
  const web = {
    async search(q, lang, searxng) {
      q = String(q || '').slice(0, 400).trim(); if (!q) return { error: 'empty query' };
      const o = { lang, searxng }, errors = [];
      for (const name of (searxng ? ['searxng'] : []).concat(['bing', 'ddgLite', 'wikipedia'])) {
        try {
          const seen = new Set(), res = (await ENGINES[name](q, o)).filter(x => x.url && x.title && !seen.has(x.url) && seen.add(x.url)).slice(0, 8);
          if (res.length) return { results: res, engine: name };
          errors.push(name + ': no results');
        } catch (e) { errors.push(name + ': ' + ((e && e.message) || e)); }
      }
      return { results: [], engine: '', errors };
    },
    async fetch(url, lang) {
      try {
        const r = await http(publicURL(url), { headers: { Accept: 'text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.5', 'User-Agent': BROWSER_UA, 'Accept-Language': lang || 'en' } });
        publicURL(r.url);
        const type = r.headers['content-type'] || '';
        if (type && !/text|html|xml|json/.test(type)) return { url: r.url, status: r.status, title: '', text: `(${type} – not a text page)` };
        const p = /html|xml/.test(type) || /^\s*</.test(r.text) ? htmlToText(r.text.slice(0, 4 * 1024 * 1024)) : { title: '', text: r.text };
        return { url: r.url, status: r.status, title: p.title, text: p.text.slice(0, 40000) };
      } catch (e) { return { error: String((e && e.message) || e) }; }
    },
  };

  /* ---------- the built-in AI engine on the phone ---------- */
  const CATALOG = [
    { id: 'qwen2.5-0.5b', name: 'Qwen 2.5 · 0.5B', size: 0.40e9, ram: 2, license: 'Apache-2.0', repo: 'bartowski/Qwen2.5-0.5B-Instruct-GGUF', file: 'Qwen2.5-0.5B-Instruct-Q4_K_M.gguf', note: 'phoneTiny' },
    { id: 'llama3.2-1b', name: 'Llama 3.2 · 1B', size: 0.81e9, ram: 3, license: 'Llama 3.2 Community License', repo: 'bartowski/Llama-3.2-1B-Instruct-GGUF', file: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf', note: 'phoneSmall' },
    { id: 'qwen2.5-1.5b', name: 'Qwen 2.5 · 1.5B', size: 0.99e9, ram: 4, license: 'Apache-2.0', repo: 'bartowski/Qwen2.5-1.5B-Instruct-GGUF', file: 'Qwen2.5-1.5B-Instruct-Q4_K_M.gguf', note: 'phoneRec' },
    { id: 'llama3.2-3b', name: 'Llama 3.2 · 3B', size: 2.02e9, ram: 6, license: 'Llama 3.2 Community License', repo: 'bartowski/Llama-3.2-3B-Instruct-GGUF', file: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf', note: 'phoneStrong' },
  ];
  const hfURL = m => `https://huggingface.co/${m.repo}/resolve/main/${m.file}?download=true`;
  const DIR = 'DATA', MDIR = 'models';
  const downloads = {};               // file → { got, total, done, error }
  let ctx = null, ctxModel = '', loading = null, nextId = 1, lastError = '';

  async function models() {
    try {
      const r = await FS.readdir({ path: MDIR, directory: DIR });
      return (r.files || []).filter(f => f && /\.gguf$/i.test(f.name || ''))
        .map(f => ({ file: f.name, size: f.size || 0, name: (CATALOG.find(c => c.file === f.name) || {}).name || f.name.replace(/\.gguf$/i, '') }));
    } catch { return []; }
  }
  async function modelPath(file) { const u = await FS.getUri({ path: MDIR + '/' + file, directory: DIR }); return decodeURIComponent(String(u.uri).replace(/^file:\/\//, '')); }
  async function release() { if (ctx !== null) { const id = ctx; ctx = null; ctxModel = ''; try { await LL.releaseContext({ id }); } catch { /* gone */ } } }
  async function ensure(file) {
    if (!file) { const m = await models(); if (!m.length) throw new Error(t('ai.noBuiltinModel')); file = m[0].file; }
    if (ctx !== null && ctxModel === file) return ctx;
    if (loading) { await loading.catch(() => {}); if (ctx !== null && ctxModel === file) return ctx; }
    loading = (async () => {
      await release();
      const id = nextId++, threads = Math.max(2, Math.min(4, (navigator.hardwareConcurrency || 4) - 2));
      try {
        await LL.initContext({ id, model: await modelPath(file), n_ctx: 8192, n_batch: 512, n_threads: threads, use_mlock: false, use_mmap: true });
      } catch (e) { lastError = (e && e.message) || String(e); throw new Error(lastError); }
      ctx = id; ctxModel = file; lastError = '';
    })();
    try { await loading; } finally { loading = null; }
    return ctx;
  }

  /* OpenAI messages + tools → a prompt the small model understands (tools in the system prompt, results as <tool_response>) */
  function toolBlock(tools) {
    const lines = tools.map(x => JSON.stringify({ name: x.function.name, description: String(x.function.description || '').slice(0, 400), parameters: x.function.parameters || { type: 'object', properties: {} } }));
    return '\n\n# Tools\n\nYou may call one or more functions to assist with the user query. You are provided with function signatures within <tools></tools> XML tags:\n<tools>\n' + lines.join('\n') +
      '\n</tools>\n\nFor each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\n<tool_call>\n{"name": <function-name>, "arguments": <args-json-object>}\n</tool_call>\nAfter a call, stop and wait: the result comes back inside <tool_response></tool_response>. When no tool is needed, answer normally.';
  }
  function toPrompt(messages, tools) {
    const out = [];
    const add = (role, content) => { const last = out[out.length - 1]; if (last && last.role === role && role !== 'system') last.content += '\n\n' + content; else out.push({ role, content }); };
    let sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    if (tools && tools.length) sys += toolBlock(tools);
    if (sys) out.push({ role: 'system', content: sys });
    for (const m of messages) {
      if (m.role === 'system') continue;
      if (m.role === 'tool') { add('user', '<tool_response>\n' + (m.name ? `{"name": ${JSON.stringify(m.name)}, "content": ` : '') + String(m.content || '') + (m.name ? '}' : '') + '\n</tool_response>'); continue; }
      if (m.role === 'assistant') {
        let s = String(m.content || '');
        (m.tool_calls || []).forEach(c => { let a = c.function.arguments; try { a = JSON.parse(a); } catch { /* keep */ } s += (s ? '\n' : '') + '<tool_call>\n' + JSON.stringify({ name: c.function.name, arguments: a }) + '\n</tool_call>'; });
        add('assistant', s || '…'); continue;
      }
      add('user', typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
    }
    if (out[out.length - 1] && out[out.length - 1].role === 'assistant') out.push({ role: 'user', content: 'Continue.' });
    return out;
  }
  /* the first complete JSON object in a string (models sometimes add text around it) */
  function firstJSON(s) {
    const i = s.indexOf('{'); if (i < 0) return null;
    let depth = 0, str = false, esc = false;
    for (let k = i; k < s.length; k++) {
      const ch = s[k];
      if (str) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') str = false; continue; }
      if (ch === '"') str = true; else if (ch === '{') depth++; else if (ch === '}' && --depth === 0) { try { return JSON.parse(s.slice(i, k + 1)); } catch { return null; } }
    }
    return null;
  }
  function parseCalls(text, tools) {
    const names = new Set((tools || []).map(x => x.function.name)), calls = [];
    let rest = String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '');
    rest = rest.replace(/<tool_call>([\s\S]*?)(<\/tool_call>|$)/g, (m, body) => {
      const j = firstJSON(body); if (j && (j.name || (j.function && j.function.name))) calls.push(j); return '';
    });
    if (!calls.length && names.size) {        // a bare JSON call without the tags
      const j = firstJSON(rest);
      if (j && names.has(j.name) && (j.arguments || j.parameters)) { calls.push(j); rest = ''; }
    }
    const tc = calls.map((j, i) => {
      const name = j.name || j.function.name; let a = j.arguments !== undefined ? j.arguments : j.parameters !== undefined ? j.parameters : (j.function && j.function.arguments) || {};
      if (typeof a === 'string') { try { a = JSON.parse(a); } catch { a = {}; } }
      return { id: 'call_' + Date.now().toString(36) + '_' + i, type: 'function', function: { name, arguments: JSON.stringify(a || {}) } };
    }).filter(c => !names.size || names.has(c.function.name));
    return { content: rest.replace(/<\|im_end\|>|<\|eot_id\|>/g, '').trim(), tool_calls: tc };
  }
  async function chat(messages, tools, o = {}) {
    const id = await ensure(o.model);
    const signal = o.signal, stop = () => LL.stopCompletion({ id }).catch(() => {});
    if (signal) { if (signal.aborted) throw new DOMException('stopped', 'AbortError'); signal.addEventListener('abort', stop, { once: true }); }
    let r;
    try {
      r = await LL.completion({ id, params: { messages: toPrompt(messages, tools), n_predict: 1536, temperature: o.temperature || 0.4, top_p: 0.9, penalty_repeat: 1.08, stop: ['<|im_end|>', '<|eot_id|>', '<|end_of_text|>', '</s>', '<tool_response>', '<|endoftext|>'] } });
    } finally { if (signal) signal.removeEventListener('abort', stop); }
    if (signal && signal.aborted) throw new DOMException('stopped', 'AbortError');
    const text = (r && (r.text || r.content)) || '';
    const p = parseCalls(text, tools);
    const msg = { role: 'assistant', content: p.content };
    if (p.tool_calls.length) msg.tool_calls = p.tool_calls;
    else if (r && Array.isArray(r.tool_calls) && r.tool_calls.length) msg.tool_calls = r.tool_calls;
    return msg;
  }

  let listening = false;
  async function download(o) {
    const m = o.id ? CATALOG.find(x => x.id === o.id) : null;
    const url = m ? hfURL(m) : String(o.url || '').trim();
    if (!/^https:\/\/.+\.gguf(\?.*)?$/i.test(url)) throw new Error('a https://… .gguf address is needed');
    const file = m ? m.file : decodeURIComponent(new URL(url).pathname.split('/').pop());
    if (downloads[file] && !downloads[file].done && !downloads[file].error) return { file };
    if (!listening) {
      listening = true;
      await FS.addListener('progress', p => { const f = Object.keys(downloads).find(k => downloads[k].url === p.url); if (f && !downloads[f].done) { downloads[f].got = p.bytes; downloads[f].total = p.contentLength || downloads[f].total; } });
    }
    const d = downloads[file] = { url, got: 0, total: m ? m.size : 0, done: false, error: '' };
    FS.mkdir({ path: MDIR, directory: DIR, recursive: true }).catch(() => {})
      .then(() => FS.downloadFile({ url, path: MDIR + '/' + file + '.part', directory: DIR, progress: true, recursive: true }))
      .then(async () => {
        if (d.error === 'cancelled') { await FS.deleteFile({ path: MDIR + '/' + file + '.part', directory: DIR }).catch(() => {}); return; }
        await FS.rename({ from: MDIR + '/' + file + '.part', to: MDIR + '/' + file, directory: DIR, toDirectory: DIR });
        d.done = true;
      })
      .catch(e => { d.error = d.error || (e && e.message) || String(e); FS.deleteFile({ path: MDIR + '/' + file + '.part', directory: DIR }).catch(() => {}); });
    return { file };
  }
  async function status() {
    const ms = await models();
    return { available: true, running: ctx !== null, model: ctxModel, gpu: false, models: ms.filter(x => !/\.part$/.test(x.file)), catalog: CATALOG.map(c => Object.assign({ url: hfURL(c) }, c)), downloads: JSON.parse(JSON.stringify(downloads)), error: lastError, phone: true };
  }
  const llm = {
    status, ensure, chat, download,
    cancel(file) { const d = downloads[file]; if (d && !d.done) d.error = 'cancelled'; },
    async remove(file) { if (ctxModel === file) await release(); await FS.deleteFile({ path: MDIR + '/' + file, directory: DIR }); delete downloads[file]; },
    stop: release,
  };
  OW.device = { platform: C.getPlatform(), llm, web };

  /* ---------- downloads → Documents/Office Werkstatt + share sheet ---------- */
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).replace(/^data:[^,]*,/, '')); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  async function saveBlob(blob, name) {
    name = (OW.safeName ? OW.safeName(name) : String(name || 'file')) || 'file';
    const data = await b64(blob);
    let uri;
    try { uri = (await FS.writeFile({ path: 'Office Werkstatt/' + name, data, directory: 'DOCUMENTS', recursive: true })).uri; OW.toast && OW.toast(t('mob.saved', { n: OW.escape ? OW.escape(name) : name })); }
    catch (e) { uri = (await FS.writeFile({ path: 'share/' + name, data, directory: 'CACHE', recursive: true })).uri; }
    if (P.Share) P.Share.share({ title: name, files: [uri] }).catch(() => {});
    return uri;
  }
  OW.saveToDevice = saveBlob;
  async function hrefBlob(win, href) { return (await (win.fetch || fetch)(href)).blob(); }
  function grab(win, a) {
    const href = a.href || '';
    if (!a.hasAttribute('download') || !/^(blob:|data:)/.test(href)) return false;
    const name = a.getAttribute('download') || 'file';
    hrefBlob(win, href).then(b => saveBlob(b, name)).catch(e => OW.toast && OW.toast(t('mob.saveFailed') + ' ' + ((e && e.message) || e), 'warn'));
    return true;
  }
  function patchWindow(win) {
    try {
      if (!win || win.__owMobile) return; win.__owMobile = true;
      // anchors in the page: the click event (after any app wrapper of a.click() decided to let it through)
      win.addEventListener('click', e => { const a = e.target && e.target.closest && e.target.closest('a[download]'); if (a && grab(win, a)) e.preventDefault(); }, true);
      // anchors that are never attached to the page
      const A = win.HTMLAnchorElement.prototype, orig = A.click;
      A.click = function () { if (!this.isConnected && grab(win, this)) return; return orig.apply(this, arguments); };
      // nested frames (the engines run in same-origin iframes)
      const hook = f => { try { f.addEventListener('load', () => patchWindow(f.contentWindow)); patchWindow(f.contentWindow); } catch { /* cross-origin */ } };
      win.document.querySelectorAll('iframe').forEach(hook);
      new win.MutationObserver(list => list.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.tagName === 'IFRAME') hook(n); else if (n.querySelectorAll) n.querySelectorAll('iframe').forEach(hook); }))).observe(win.document.documentElement, { childList: true, subtree: true });
    } catch { /* not reachable */ }
  }
  patchWindow(window);
  const wrapDownload = () => { if (OW.download && !OW.download.__mobile) { const d = (blob, name) => { saveBlob(blob, name).catch(e => OW.toast(t('mob.saveFailed') + ' ' + ((e && e.message) || e), 'warn')); }; d.__mobile = true; OW.download = d; } };

  /* ---------- "open with" Office Werkstatt ---------- */
  const MIME = { 'application/pdf': 'pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx', 'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx', 'application/vnd.ms-powerpoint': 'ppt', 'application/vnd.oasis.opendocument.text': 'odt', 'application/vnd.oasis.opendocument.spreadsheet': 'ods', 'application/vnd.oasis.opendocument.presentation': 'odp', 'text/csv': 'csv', 'text/plain': 'txt', 'text/markdown': 'md', 'application/rtf': 'rtf' };
  async function openUri(url) {
    if (!url || !/^(content|file):/.test(url)) return;
    try {
      const r = await FS.readFile({ path: url });
      let name = decodeURIComponent(url.split('/').pop().split('?')[0] || 'Document');
      if (name.includes(':')) name = name.split(':').pop();
      const bin = atob(r.data), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      if (!/\.[a-z0-9]{2,5}$/i.test(name)) { const ext = r.mimeType && MIME[r.mimeType]; name += '.' + (ext || sniff(u8)); }
      const go = () => OW.importFiles ? OW.importFiles([new File([u8], name)]) : setTimeout(go, 300);
      go();
    } catch (e) { OW.toast && OW.toast(OW.escape ? OW.escape((e && e.message) || String(e)) : String(e), 'warn'); }
  }
  const sniff = u8 => u8[0] === 0x25 && u8[1] === 0x50 ? 'pdf' : u8[0] === 0x50 && u8[1] === 0x4b ? 'docx' : u8[0] === 0xd0 && u8[1] === 0xcf ? 'doc' : 'txt';

  /* ---------- back button ---------- */
  let lastBack = 0;
  function back() {
    const pop = document.querySelector('.popover');
    if (pop) { pop.remove(); return; }
    const m = document.getElementById('modal');
    if (m && !m.hidden) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return; }
    const host = document.getElementById('editorHost');
    if (host && !host.hidden && OW.closeEditor) { OW.closeEditor(); return; }
    if (!/^#\/(home)?$/.test(location.hash || '#/')) { location.hash = '#/home'; return; }
    if (Date.now() - lastBack < 2000) { P.App && P.App.exitApp(); return; }
    lastBack = Date.now(); OW.toast && OW.toast(t('mob.exit'));
  }

  function start() {
    wrapDownload();
    if (P.App) {
      P.App.addListener('backButton', back);
      P.App.addListener('appUrlOpen', e => openUri(e && e.url));
      P.App.getLaunchUrl().then(r => r && openUri(r.url)).catch(() => {});
      P.App.addListener('pause', () => { /* the model stays loaded; Android frees it when it needs the memory */ });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('load', wrapDownload);
})();
