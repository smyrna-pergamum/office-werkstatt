/* Office Werkstatt – AI Werkzeug, server side (no dependencies)
 *   POST /api/ai/chat    {base, key, body}  → forwards an OpenAI-style /chat/completions request
 *                                             (Ollama, OpenAI or any compatible API; the browser may not reach them because of CORS)
 *   GET  /api/ai/models  ?base=&key=        → the model ids of that API (/models)
 *   GET  /api/ai/ollama  ?base=             → installed Ollama models (/api/tags)
 *   POST /api/ai/pull    {base, name}       → Ollama downloads a model; progress is streamed as JSON lines
 *   POST /api/ai/search  {q, lang, searxng?}  → web search (own SearXNG, Bing, DuckDuckGo, Wikipedia) → {results:[{title, url, snippet}], engine}
 *   POST /api/ai/fetch   {url}               → readable text of a web page (public internet only)
 * The API key is sent by the browser with each request and never stored here. */
'use strict';
const dns = require('dns').promises;
const net = require('net');

const UA = v => `Mozilla/5.0 (compatible; OfficeWerkstatt/${v}; +https://github.com/smyrna-pergamum/office-werkstatt)`;

function cleanBase(b) {
  const u = new URL(String(b || '').trim());
  if (!/^https?:$/.test(u.protocol)) throw new Error('only http(s) APIs');
  return u.toString().replace(/\/+$/, '');
}

/* the web tools must not become a way into the local network (a web page could ask the assistant to "fetch" a LAN address) */
function privateIP(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const x = ip.toLowerCase();
  if (x.startsWith('::ffff:')) return privateIP(x.slice(7));
  return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80');
}
async function publicURL(raw) {
  const u = new URL(String(raw || '').trim());
  if (!/^https?:$/.test(u.protocol)) throw new Error('only http(s) pages');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(u.hostname)) throw new Error('local addresses are not allowed');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some(a => privateIP(a.address))) throw new Error('local addresses are not allowed');
  return u;
}
async function getPublic(url, opts = {}, hops = 5) {
  let u = await publicURL(url);
  for (let i = 0; i < hops; i++) {
    const r = await fetch(u, Object.assign({ redirect: 'manual', signal: AbortSignal.timeout(20000) }, opts, { headers: Object.assign({ 'User-Agent': UA(opts.version || ''), 'Accept-Language': opts.lang || 'en' }, opts.headers || {}) }));
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = await publicURL(new URL(r.headers.get('location'), u).toString()); continue; }
    return { r, url: u.toString() };
  }
  throw new Error('too many redirects');
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => String(s || '').replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] || m));
const strip = h => decode(String(h || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function htmlToText(html) {
  const title = strip((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1]);
  let b = String(html)
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const main = /<(main|article)[\s\S]*?<\/\1>/i.exec(b); if (main && main[0].length > 800) b = main[0];
  b = b.replace(/<(h[1-6])[^>]*>/gi, '\n\n## ').replace(/<\/(h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ').replace(/<(br|\/p|\/div|\/tr|\/li|\/section|\/table)[^>]*>/gi, '\n')
    .replace(/<td[^>]*>/gi, ' | ').replace(/<[^>]+>/g, ' ');
  const text = decode(b).replace(/[ \t\f\v]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { title, text };
}

/* web search: several engines, the first that answers wins (they block or change their pages now and then).
   An own SearXNG instance (Settings › AI) is asked first when one is set. */
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const unwrap = raw => {
  let url = decode(raw || '');
  const ud = /[?&]uddg=([^&]+)/.exec(url); if (ud) url = decodeURIComponent(ud[1]);
  if (url.startsWith('//')) url = 'https:' + url;
  return /^https?:/.test(url) && !/duckduckgo\.com\/(y\.js|l\/)/.test(url) ? url : '';
};
const ENGINES = {
  async searxng(q, o) {
    const u = new URL(o.searxng.replace(/\/+$/, '') + '/search'); u.search = new URLSearchParams({ q, format: 'json', language: o.lang || 'all' }).toString();
    if (!/^https?:$/.test(u.protocol)) throw new Error('bad SearXNG address');
    const r = await fetch(u, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('SearXNG HTTP ' + r.status);
    const d = await r.json();
    return (d.results || []).map(x => ({ title: strip(x.title), url: unwrap(x.url), snippet: strip(x.content) }));
  },
  async bing(q, o) {
    const mkt = { tr: 'tr-TR', de: 'de-DE', en: 'en-GB', es: 'es-ES', fr: 'fr-FR' }[String(o.lang || '').slice(0, 2)] || '';
    const { r } = await getPublic('https://www.bing.com/search?format=rss&count=10&q=' + encodeURIComponent(q) + (mkt ? '&setmkt=' + mkt : ''), { lang: o.lang, headers: { 'User-Agent': BROWSER_UA, Accept: 'application/rss+xml,text/xml;q=0.9,*/*;q=0.5' } });
    const x = await r.text(), out = [];
    for (const m of x.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const g = t => strip(((new RegExp('<' + t + '>([\\s\\S]*?)</' + t + '>')).exec(m[1]) || [])[1]);
      out.push({ title: g('title'), url: unwrap(g('link')), snippet: g('description') });
    }
    return out;
  },
  async ddgLite(q, o) {
    const { r } = await getPublic('https://lite.duckduckgo.com/lite/', { method: 'POST', body: new URLSearchParams({ q }).toString(), lang: o.lang, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': BROWSER_UA } });
    const h = await r.text(), out = [];
    const links = [...h.matchAll(/<a[^>]*href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>|<a[^>]*class=['"]result-link['"][^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    const snips = [...h.matchAll(/<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g)].map(m => strip(m[1]));
    links.forEach((m, i) => out.push({ title: strip(m[2] || m[4]), url: unwrap(m[1] || m[3]), snippet: snips[i] || '' }));
    return out;
  },
  async ddgHtml(q, o) {
    const { r } = await getPublic('https://html.duckduckgo.com/html/', { method: 'POST', body: new URLSearchParams({ q, kl: '' }).toString(), lang: o.lang, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': BROWSER_UA } });
    const html = await r.text(), out = [];
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, hits = [];
    let m;
    while ((m = re.exec(html))) hits.push({ i: m.index, end: re.lastIndex, href: m[1], title: m[2] });
    hits.forEach((h, k) => {
      const seg = html.slice(h.end, k + 1 < hits.length ? hits[k + 1].i : h.end + 4000);
      const sn = /class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div|td)>/.exec(seg);
      out.push({ title: strip(h.title), url: unwrap(h.href), snippet: strip(sn && sn[1]) });
    });
    return out;
  },
  async wikipedia(q, o) {
    const l = /^(tr|de|en|es|fr)/.exec(String(o.lang || 'en')); const w = l ? l[1] : 'en';
    const { r } = await getPublic(`https://${w}.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=8&srsearch=` + encodeURIComponent(q), { lang: o.lang, version: o.version });
    const d = await r.json();
    return ((d.query && d.query.search) || []).map(x => ({ title: x.title, url: `https://${w}.wikipedia.org/wiki/` + encodeURIComponent(x.title.replace(/ /g, '_')), snippet: strip(x.snippet) }));
  },
};
async function search(q, lang, version, searxng) {
  const o = { lang, version, searxng }, errors = [];
  for (const name of (searxng ? ['searxng'] : []).concat(['bing', 'ddgLite', 'ddgHtml', 'wikipedia'])) {
    try {
      const seen = new Set(), res = (await ENGINES[name](q, o)).filter(x => x.url && x.title && !seen.has(x.url) && seen.add(x.url)).slice(0, 8);
      if (res.length) return { results: res, engine: name };
      errors.push(name + ': no results');
    } catch (e) { errors.push(name + ': ' + ((e && e.message) || e)); }
  }
  return { results: [], engine: '', errors };
}

async function relay(res, r) {
  res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' });
  if (!r.body) return res.end();
  for await (const chunk of r.body) res.write(chunk);
  res.end();
}

module.exports = function makeAI({ send, readBody, VERSION }) {
  return async function aiApi(req, res, what, url) {
    try {
      if (what === 'chat' && req.method === 'POST') {
        const o = JSON.parse(await readBody(req, 30 * 1024 * 1024));
        const base = cleanBase(o.base);
        const r = await fetch(base + '/chat/completions', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, o.key ? { Authorization: 'Bearer ' + o.key } : {}), body: JSON.stringify(o.body || {}), signal: AbortSignal.timeout(600000) });
        return relay(res, r);
      }
      if (what === 'models' && req.method === 'GET') {
        const base = cleanBase(url.searchParams.get('base')), key = url.searchParams.get('key') || req.headers['x-ai-key'] || '';
        const r = await fetch(base + '/models', { headers: key ? { Authorization: 'Bearer ' + key } : {}, signal: AbortSignal.timeout(15000) });
        return relay(res, r);
      }
      if (what === 'ollama' && req.method === 'GET') {
        const base = cleanBase(url.searchParams.get('base') || 'http://127.0.0.1:11434');
        const r = await fetch(base + '/api/tags', { signal: AbortSignal.timeout(5000) });
        return relay(res, r);
      }
      if (what === 'pull' && req.method === 'POST') {
        const o = JSON.parse(await readBody(req, 64 * 1024));
        const base = cleanBase(o.base || 'http://127.0.0.1:11434');
        if (!/^[\w.:/-]{1,120}$/.test(o.name || '')) return send(res, 400, { error: 'bad model name' });
        const r = await fetch(base + '/api/pull', { method: 'POST', body: JSON.stringify({ name: o.name, stream: true }), signal: AbortSignal.timeout(6 * 3600 * 1000) });
        return relay(res, r);
      }
      if (what === 'search' && req.method === 'POST') {
        const o = JSON.parse(await readBody(req, 64 * 1024));
        const q = String(o.q || '').slice(0, 400).trim(); if (!q) return send(res, 400, { error: 'empty query' });
        return send(res, 200, await search(q, o.lang, VERSION, typeof o.searxng === 'string' && o.searxng.trim() ? o.searxng.trim() : ''));
      }
      if (what === 'fetch' && req.method === 'POST') {
        const o = JSON.parse(await readBody(req, 64 * 1024));
        const { r, url: final } = await getPublic(o.url, { lang: o.lang, version: VERSION, headers: { Accept: 'text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.5' } });
        const type = r.headers.get('content-type') || '';
        if (!/text|html|xml|json/.test(type)) return send(res, 200, { url: final, status: r.status, title: '', text: `(${type || 'binary'} – not a text page)` });
        const buf = Buffer.from(await r.arrayBuffer()); const raw = buf.subarray(0, 4 * 1024 * 1024).toString('utf8');
        const p = /html|xml/.test(type) ? htmlToText(raw) : { title: '', text: raw };
        return send(res, 200, { url: final, status: r.status, title: p.title, text: p.text.slice(0, 40000) });
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) {
      return send(res, 502, { error: String((e && e.message) || e) });
    }
  };
};
