/* Office Werkstatt – service worker: caches the whole app so it runs without internet */
const CACHE = 'office-werkstatt-v1.1';
const CORE = ['./', './index.html', './manifest.webmanifest', './css/app.css', './css/editors.css',
  './js/icons.js', './js/i18n.js', './js/store.js', './js/zip.js', './js/templates.js', './js/editor-shell.js', './js/app.js',
  './js/editors/word.js', './js/editors/excel.js', './js/editors/slide.js', './js/editors/note.js', './js/editors/draw.js', './js/editors/pdf.js',
  './assets/logo.svg', './assets/icon-192.png', './assets/icon-512.png', './engines/engines.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  // engines are large: cache on first use; app shell: cache first, refresh in background
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
