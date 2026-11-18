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
const boot = `<script type="module">
  import init from './${bin}.js';
  init({ module_or_path: './${bin}_bg.wasm' }).catch(function (e) { console.error(e); var l = document.querySelector('[id$="_loading"]'); if (l) l.textContent = 'Engine error: ' + e; });
</script>`;
html = html.replace(/<head>/i, '<head>\n  ' + lang).replace(/<\/body>/i, boot + '\n</body>');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('host page →', path.join(out, 'index.html'));
