/* Office Werkstatt – service worker: caches the whole app so it runs without internet */
const CACHE = 'office-werkstatt-v1.5.1-2';
const CORE = ['./', './index.html', './manifest.webmanifest', './css/app.css', './css/editors.css',
  './js/icons.js', './js/i18n.js', './js/store.js', './js/sanitize.js', './js/desktop.js', './js/zip.js', './js/legacy-ppt.js', './js/odf.js', './js/templates.js', './js/editor-shell.js', './js/app.js',
  './js/editors/word.js', './js/editors/excel.js', './js/editors/slide.js', './js/editors/note.js', './js/editors/note-calendar.js', './js/editors/draw.js', './js/editors/pdf.js', './js/editors/pro.js',
  './js/qrcode.js', './js/form-core.js', './js/editors/form.js',
  './js/design-core.js', './js/stock-core.js', './js/editors/design-strings.js', './js/editors/design.js', './js/ai-strings.js', './js/agent-bridge.js', './js/ai.js', './js/editors/ai.js', './js/admin.js', './js/fabric.min.js', './fonts/fonts.css',
  './assets/logo.svg', './assets/icon-192.png', './assets/icon-512.png', './engines/engines.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/') || /\/f\/[^/]+$/.test(u.pathname)) return;
  // engines are large and only change with an app update (new CACHE name): cache on first use, never re-download.
  // app shell: cache first, refresh in background.
  const engine = u.pathname.includes('/engines/');
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit && engine) return hit;
    const net = fetch(e.request).then(r => { if (r.ok && r.status === 200) c.put(e.request, r.clone()); return r; }).catch(() => hit || Response.error());
    return hit || net;
  }));
});
