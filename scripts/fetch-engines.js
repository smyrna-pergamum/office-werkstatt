#!/usr/bin/env node
/* Office Werkstatt – install the full reference engines into public/engines/<type>/
 * Needs internet ONCE (for the download). Afterwards everything runs offline.
 *
 *   node scripts/fetch-engines.js            → pdf (+ word/excel/slide if Rust & wasm-bindgen are installed)
 *   node scripts/fetch-engines.js pdf word   → only these
 *   node scripts/fetch-engines.js --pdf-file C:\path\PDF-Werkstatt\index.html   (use a local copy)
 *
 * Engines
 *   pdf   PDF Werkstatt   github.com/smyrna-pergamum/PDF-Werkstatt   (single offline HTML, recoloured red)
 *   word  Word Werkzeug Pro   github.com/storytold/wordcraft   apps/wordcraft-web  (Rust → WebAssembly, cargo + wasm-bindgen)
 *   excel Excel Werkzeug Pro  github.com/storytold/gridcraft   apps/gridcraft-web
 *   slide Slide Werkzeug Pro  github.com/storytold/deckcraft   apps/deckcraft-web
 * Note Werkzeug and Draw Werkzeug use only their built-in editors (no external engine).
 */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execSync, spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), ENG = path.join(ROOT, 'public', 'engines');
const args = process.argv.slice(2);
const pdfFileArg = args.includes('--pdf-file') ? args[args.indexOf('--pdf-file') + 1] : null;
const want = args.filter(a => !a.startsWith('--') && a !== pdfFileArg);
const sel = t => !want.length || want.includes(t);
const has = cmd => spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ow-eng-'));
const log = (t, m) => console.log(`[${t}] ${m}`);
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });

/* blue → red palette of PDF Werkstatt (light + dark) */
const PDF_RED = { '#1F4E9E': '#C62828', '#173D7D': '#8E1B1B', '#E5ECF8': '#FDECEA', '#7EA2E8': '#F28B82', '#A3BEF0': '#F6AEA9', '#1B2943': '#3A1D1B' };
function recolor(html) { for (const [a, b] of Object.entries(PDF_RED)) html = html.replace(new RegExp(a, 'gi'), b); return html.replace('<title>PDF Werkstatt</title>', '<title>PDF Werkstatt · Office Werkstatt</title>'); }

async function download(url, dest) {
  const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer())); return dest;
}

async function pdf() {
  const out = path.join(ENG, 'pdf'); fs.mkdirSync(out, { recursive: true });
  let src = pdfFileArg;
  if (!src) {
    const local = path.join(tmp, 'pdf.html');
    log('pdf', 'downloading PDF Werkstatt …');
    try { await download('https://raw.githubusercontent.com/smyrna-pergamum/PDF-Werkstatt/main/index.html', local); }
    catch { run('git clone --depth 1 https://github.com/smyrna-pergamum/PDF-Werkstatt.git pdfw', tmp); fs.copyFileSync(path.join(tmp, 'pdfw', 'index.html'), local); }
    src = local;
  }
  fs.writeFileSync(path.join(out, 'index.html'), recolor(fs.readFileSync(src, 'utf8')));
  // move the ~63 MB of embedded fonts / OCR / MuPDF data out of the page so the PDF menu appears at once
  require('./split-pdf-engine').split(path.join(out, 'index.html'));
  log('pdf', 'installed (red edition) → public/engines/pdf/index.html');
  return true;
}

function craft(type, repo, app) {
  const out = path.join(ENG, type);
  if (!has('cargo') || !has('wasm-bindgen')) {
    log(type, 'skipped – needs Rust ≥ 1.95 with the wasm32-unknown-unknown target and wasm-bindgen-cli:');
    log(type, '  rustup target add wasm32-unknown-unknown  &&  cargo install wasm-bindgen-cli --version 0.2.129');
    return false;
  }
  log(type, `cloning ${repo} …`);
  run(`git clone --depth 1 https://github.com/storytold/${repo}.git ${repo}`, tmp);
  run(`node "${path.join(__dirname, 'remove-community-links.js')}" "${path.join(tmp, repo)}"`);
  run(`python3 "${path.join(__dirname, 'rebrand-engines.py')}" "${path.join(tmp, repo)}"`);
  const dir = path.join(tmp, repo), target = path.join(tmp, 'target'), env = Object.assign({}, process.env, { CARGO_TARGET_DIR: target });
  // interface translations: storytold/craft-i18n at the pinned revision, else the UI is English only
  const rev = path.join(dir, 'craft-i18n.rev');
  if (fs.existsSync(rev)) {
    const i18n = path.join(tmp, 'craft-i18n');
    if (!fs.existsSync(i18n)) run('git clone https://github.com/storytold/craft-i18n.git craft-i18n', tmp);
    run(`git checkout -q ${fs.readFileSync(rev, 'utf8').trim()}`, i18n);
    run(`python3 "${path.join(__dirname, 'rebrand-engines.py')}" "${i18n}"`);
    env.CRAFT_I18N_DIR = i18n;
  }
  execSync(`cargo build --release --target wasm32-unknown-unknown -p ${app}`, { cwd: dir, stdio: 'inherit', env });
  fs.mkdirSync(out, { recursive: true });
  run(`wasm-bindgen --target web --weak-refs --no-typescript --out-name engine --out-dir "${out}" "${path.join(target, 'wasm32-unknown-unknown', 'release', app + '.wasm')}"`);
  // note: wasm-opt from older binaryen releases breaks the externref table – the wasm is shipped unoptimised
  run(`node "${path.join(__dirname, 'craft-page.js')}" "${path.join(dir, 'apps', app, 'index.html')}" engine "${out}"`);
  log(type, `installed → public/engines/${type}/index.html`);
  return true;
}

(async () => {
  fs.mkdirSync(ENG, { recursive: true });
  const ok = {};
  const steps = { pdf, word: () => craft('word', 'wordcraft', 'wordcraft-web'), excel: () => craft('excel', 'gridcraft', 'gridcraft-web'), slide: () => craft('slide', 'deckcraft', 'deckcraft-web') };
  for (const [t, fn] of Object.entries(steps)) {
    if (!sel(t)) continue;
    try { ok[t] = await fn(); } catch (e) { log(t, 'failed: ' + e.message); ok[t] = false; }
  }
  // registry used when the app is opened via file://
  const reg = {}; for (const t of ['word', 'excel', 'slide', 'pdf']) reg[t] = fs.existsSync(path.join(ENG, t, 'index.html'));
  fs.writeFileSync(path.join(ENG, 'engines.js'), `/* generated by scripts/fetch-engines.js */\nwindow.OW_ENGINES = ${JSON.stringify(reg)};\n`);
  console.log('\nInstalled engines:', reg);
  fs.rmSync(tmp, { recursive: true, force: true });
})();
