// Injects the Office Werkstatt ribbon into the PDF Werkstatt engine (idempotent):
//   node engines-src/pdf/apply-ribbon.mjs [public/engines/pdf/index.html]
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const here = path.dirname(url.fileURLToPath(import.meta.url));
const file = process.argv[2] || path.join(here, '../../public/engines/pdf/index.html');
let html = fs.readFileSync(file, 'utf8');
const css = fs.readFileSync(path.join(here, 'ribbon.css'), 'utf8'), js = fs.readFileSync(path.join(here, 'ribbon.js'), 'utf8');
const put = (s, a, b, body, anchor) => {
  const i = s.indexOf(a), j = s.indexOf(b);
  if (i >= 0 && j > i) return s.slice(0, i) + a + '\n' + body + '\n' + s.slice(j);
  const k = s.lastIndexOf(anchor); if (k < 0) throw new Error('anchor not found: ' + anchor);
  return s.slice(0, k) + a + '\n' + body + '\n' + b + '\n' + s.slice(k);
};
html = put(html, '/* ow-ribbon-css:start */', '/* ow-ribbon-css:end */', css, '</style>');
// inside the engine's main script, after its last setup step
html = put(html, '/* ow-ribbon-js:start */', '/* ow-ribbon-js:end */', js, '})();\n\n</script>\n</body>');
fs.writeFileSync(file, html);
console.log('ribbon applied to', file);
