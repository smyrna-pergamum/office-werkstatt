#!/usr/bin/env node
/* Office Werkstatt – make the PDF Werkstatt engine start fast.
 *
 * The upstream PDF Werkstatt build is ONE ~67 MB HTML file: MuPDF, the Tesseract OCR core, 14 OCR languages
 * (≈53 MB) and 32 font files (≈10 MB) are embedded as base64 *before* the code that draws the interface.
 * The browser therefore had to download, parse and compile all of it before the PDF menu appeared.
 *
 * This script moves the embedded data out of index.html:
 *   fonts-extra.js           all fonts except the three needed at start (loaded right after the UI is shown)
 *   assets/<name>.js         MuPDF / OCR files, each loaded only when that feature is first used
 * Plain <script src> files are used (not fetch) so the engine still works from file://.
 *
 *   node scripts/split-pdf-engine.js [public/engines/pdf/index.html]
 * Safe to run more than once (an already split file is left alone).
 */
'use strict';
const fs = require('fs'), path = require('path');

const CORE_FONTS = ['reg', 'semi', 'script'];
const assetFile = name => name.replace(/[^A-Za-z0-9._-]/g, '__') + '.js';

function patch(src, from, to, label) {
  if (!src.includes(from)) throw new Error(`split-pdf-engine: pattern not found (${label}) – PDF Werkstatt changed, update this script`);
  return src.replace(from, to);
}

function split(htmlPath) {
  const dir = path.dirname(htmlPath);
  let html = fs.readFileSync(htmlPath, 'utf8');
  if (html.includes('/* ow-split */')) { console.log('[pdf] engine is already split'); return false; }

  const lines = html.split('\n');
  const find = prefix => { const i = lines.findIndex(l => l.startsWith(prefix)); if (i < 0) throw new Error('split-pdf-engine: ' + prefix + ' not found'); return i; };
  const parseObj = (i, prefix) => { const l = lines[i]; return JSON.parse(l.slice(prefix.length, l.lastIndexOf('}') + 1)); };

  /* fonts: keep the three start-up fonts inline, the rest goes to fonts-extra.js */
  const fi = find('const FONT_DATA = '), fonts = parseObj(fi, 'const FONT_DATA = ');
  const core = {}, extra = {};
  for (const [k, v] of Object.entries(fonts)) (CORE_FONTS.includes(k) ? core : extra)[k] = v;
  fs.writeFileSync(path.join(dir, 'fonts-extra.js'), `/* PDF Werkstatt fonts (see LICENSE) – loaded after start-up by Office Werkstatt */\nObject.assign(FONT_DATA, ${JSON.stringify(extra)});\n`);
  lines[fi] = `const FONT_DATA = ${JSON.stringify(core)};`;

  /* engine assets: one file per asset, loaded on first use */
  const ai = find('const ASSET_DATA = '), assets = parseObj(ai, 'const ASSET_DATA = ');
  const adir = path.join(dir, 'assets');
  fs.rmSync(adir, { recursive: true, force: true }); fs.mkdirSync(adir, { recursive: true });
  for (const [k, v] of Object.entries(assets)) fs.writeFileSync(path.join(adir, assetFile(k)), `ASSET_DATA[${JSON.stringify(k)}]=${JSON.stringify(v)};\n`);
  lines[ai] = `/* ow-split */ const ASSET_DATA = {};
function owLoadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => { s.remove(); res(); }; s.onerror = () => { s.remove(); rej(new Error('missing ' + src)); }; document.head.appendChild(s); }); }
const owAssetLoads = {};
function needAssets(names) { return Promise.all(names.map(n => ASSET_DATA[n] ? null : (owAssetLoads[n] = owAssetLoads[n] || owLoadScript('assets/' + n.replace(/[^A-Za-z0-9._-]/g, '__') + '.js').catch(e => { delete owAssetLoads[n]; throw e; })))); }
let owExtraFonts = null;
function needExtraFonts() { return owExtraFonts = owExtraFonts || owLoadScript('fonts-extra.js').catch(e => { owExtraFonts = null; throw e; }); }`;
  html = lines.join('\n');

  /* code: wait for the data where it is used */
  html = patch(html, "if (!mupdfPromise) mupdfPromise = (async () => {\n",
    "if (!mupdfPromise) mupdfPromise = (async () => {\n    await needAssets(['mupdf/mupdf.js', 'mupdf/mupdf-wasm.js', 'mupdf/mupdf-wasm.wasm']);\n", 'getMuPDF');
  html = patch(html, "  const workerURL = scriptUrl(initLanguages",
    "  await needAssets(['ocr/tesseract-core-lstm.wasm.js', 'ocr/worker.min.js', ...language.split('+').map(code => `ocr/${code}.traineddata.gz`)]);\n  const workerURL = scriptUrl(initLanguages", 'getOcrWorker');
  html = patch(html, "const extraFontsReady=(async()=>{\n",
    "const extraFontsReady=(async()=>{\n  await new Promise(r=>setTimeout(r,0));await needExtraFonts();\n", 'extraFontsReady');
  // until fonts-extra.js has arrived, a font that is not loaded yet falls back to Inter (never cached)
  html = patch(html, "function fontBytes(key) { if (!FONT[key])",
    "const owHasFont = key => !!(FONT[key] || FONT_DATA[key]);\nfunction fontBytes(key) { if (!owHasFont(key)) return FONT.reg; if (!FONT[key])", 'fontBytes');
  html = patch(html, "function fontObject(key) { ",
    "function fontObject(key) { if (!owHasFont(key)) key = 'reg'; ", 'fontObject');
  html = patch(html, "const key=resolvedFontKey(it);if(!fontMetrics.has(key)){",
    "const key=owHasFont(resolvedFontKey(it))?resolvedFontKey(it):'reg';if(!fontMetrics.has(key)){", 'metricsFor');
  html = patch(html, "async function embedDocumentFonts(out,pages){\n",
    "async function embedDocumentFonts(out,pages){\n  await extraFontsReady;\n", 'embedDocumentFonts');

  fs.writeFileSync(htmlPath, html);
  const mb = n => (n / 1048576).toFixed(1) + ' MB';
  console.log(`[pdf] engine split: index.html ${mb(fs.statSync(htmlPath).size)}, fonts-extra.js + ${Object.keys(assets).length} lazy assets`);
  return true;
}

module.exports = { split };
if (require.main === module) split(path.resolve(process.argv[2] || path.join(__dirname, '..', 'public', 'engines', 'pdf', 'index.html')));
