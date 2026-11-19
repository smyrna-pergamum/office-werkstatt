#!/usr/bin/env node
/* Builds the host page for a Word/Excel/Slide Werkzeug Pro WebAssembly build (no trunk needed).
 *   node scripts/craft-page.js <repo>/apps/<app>-web/index.html <app>-web <outDir>
 * - removes trunk's <link data-trunk> tags and loads the wasm-bindgen output directly
 * - makes the engine follow the Office Werkstatt interface language (ow-lang)          */
'use strict';
const fs = require('fs'), path = require('path');
const [src, bin, out] = process.argv.slice(2);
let html = fs.readFileSync(src, 'utf8').replace(/^\s*<link data-trunk[^>]*>\s*$/gm, '');
const lang = `<script>
  /* follow the Office Werkstatt language: the craft apps read navigator.languages */
  (function () { try { var l = localStorage.getItem('ow-lang'); var map = { de: 'de-DE', tr: 'tr-TR', en: 'en-GB', es: 'es-ES', fr: 'fr-FR' };
    if (l && map[l]) { var tags = [map[l], l]; Object.defineProperty(navigator, 'languages', { get: function () { return tags; } });
      Object.defineProperty(navigator, 'language', { get: function () { return tags[0]; } }); document.documentElement.lang = l; } } catch (e) {} })();
</script>`;
/* inside Office Werkstatt the library keeps the files: without the File System Access API the engines
 * save through a download, which Office Werkstatt takes over (public/js/editors/pro.js) */
const noDiskAccess = `<script>
  (function () { if (window.parent === window) return; ['showSaveFilePicker', 'showOpenFilePicker', 'showDirectoryPicker'].forEach(function (n) { try { delete window[n]; } catch (e) {} }); })();
</script>`;
const followTheme = `<script>
  /* inside Office Werkstatt the "system" theme is the Office Werkstatt theme (light / dark) */
  (function () { var P; try { P = window.parent; if (P === window || !P.document) return; } catch (e) { return; }
    var om = window.matchMedia.bind(window), lists = [];
    var dark = function () { try { return P.document.documentElement.getAttribute('data-theme') === 'dark'; } catch (e) { return false; } };
    window.matchMedia = function (q) {
      if (!/prefers-color-scheme/.test(q)) return om(q);
      var want = /dark/.test(q), real = om(q), l = Object.create(real), ls = [];
      var def = function (k, v) { Object.defineProperty(l, k, { value: v, configurable: true, writable: true }); };
      Object.defineProperty(l, 'matches', { get: function () { return dark() === want; }, configurable: true });
      def('media', q); def('onchange', null);
      def('addListener', function (f) { ls.push(f); }); def('removeListener', function (f) { var i = ls.indexOf(f); if (i >= 0) ls.splice(i, 1); });
      def('addEventListener', function (t, f) { if (t === 'change') ls.push(f); }); def('removeEventListener', function (t, f) { var i = ls.indexOf(f); if (i >= 0) ls.splice(i, 1); });
      l._fire = function () { var ev = new Event('change'); try { Object.defineProperty(ev, 'matches', { value: l.matches }); Object.defineProperty(ev, 'media', { value: q }); } catch (e) {} ls.slice().forEach(function (f) { try { typeof f === 'function' ? f.call(l, ev) : f.handleEvent(ev); } catch (e) {} }); if (typeof l.onchange === 'function') l.onchange(ev); };
      lists.push(l); return l;
    };
    try { new P.MutationObserver(function () { lists.forEach(function (l) { l._fire(); }); }).observe(P.document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) {}
  })();
</script>`;
const boot = `<script type="module">
  import init from './${bin}.js';
  init({ module_or_path: './${bin}_bg.wasm' }).catch(function (e) { console.error(e); var l = document.querySelector('[id$="_loading"]'); if (l) l.textContent = 'Engine error: ' + e; });
</script>`;
html = html.replace(/<head>/i, '<head>\n  ' + lang + '\n  ' + noDiskAccess + '\n  ' + followTheme).replace(/<\/body>/i, boot + '\n</body>');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('host page →', path.join(out, 'index.html'));
