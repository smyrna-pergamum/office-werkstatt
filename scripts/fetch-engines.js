#!/usr/bin/env node
/* Office Werkstatt – install the full reference engines into public/engines/<type>/
 * Needs internet ONCE (for the download). Afterwards everything runs offline.
 *
 *   node scripts/fetch-engines.js            → pdf + draw (+ word/excel/slide if Rust & trunk are installed)
 *   node scripts/fetch-engines.js pdf draw   → only these
 *   node scripts/fetch-engines.js --pdf-file C:\path\PDF-Werkstatt\index.html   (use a local copy)
 *
 * Engines
 *   pdf   PDF Werkstatt   github.com/smyrna-pergamum/PDF-Werkstatt   (single offline HTML, recoloured red)
 *   draw  Excalidraw      npm @excalidraw/excalidraw (UMD build + React)  → offline host page
 *   word  Word Werkzeug Pro   github.com/storytold/wordcraft   apps/wordcraft-web  (Rust → WebAssembly, cargo + wasm-bindgen)
 *   excel Excel Werkzeug Pro  github.com/storytold/gridcraft   apps/gridcraft-web
 *   slide Slide Werkzeug Pro  github.com/storytold/deckcraft   apps/deckcraft-web
 *   note  SilverBullet    github.com/silverbulletmd/silverbullet  (server binary, started by server.js under /sb/)
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

async function draw() {
  const out = path.join(ENG, 'draw'); fs.mkdirSync(out, { recursive: true });
  log('draw', 'downloading Excalidraw + React from the npm registry …');
  const pkgs = [['react', '18.3.1', 'umd/react.production.min.js'], ['react-dom', '18.3.1', 'umd/react-dom.production.min.js'], ['@excalidraw/excalidraw', '0.17.6', null]];
  for (const [name, ver, file] of pkgs) {
    const tgz = path.join(tmp, name.replace(/[@/]/g, '_') + '.tgz');
    const reg = await (await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}/${ver}`)).json();
    await download(reg.dist.tarball, tgz);
    const dir = path.join(tmp, name.replace(/[@/]/g, '_')); fs.mkdirSync(dir, { recursive: true });
    run(`tar -xzf "${tgz}" -C "${dir}"`);
    if (file) fs.copyFileSync(path.join(dir, 'package', file), path.join(out, path.basename(file)));
    else {
      fs.cpSync(path.join(dir, 'package', 'dist'), path.join(out, 'excalidraw'), { recursive: true });
      for (const f of fs.readdirSync(path.join(out, 'excalidraw'))) if (/development|preact|assets-dev/.test(f)) fs.rmSync(path.join(out, 'excalidraw', f), { recursive: true, force: true });
    }
  }
  fs.writeFileSync(path.join(out, 'index.html'), `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Excalidraw · Office Werkstatt</title>
<style>html,body,#root{margin:0;height:100%} a[href*="discord"]{display:none!important}</style>
<script>window.EXCALIDRAW_ASSET_PATH = "./excalidraw/";</script>
<script src="react.production.min.js"></script><script src="react-dom.production.min.js"></script>
<script src="excalidraw/excalidraw.production.min.js"></script></head>
<body><div id="root"></div><script>
  const KEY = 'ow-excalidraw-scene';
  let initial = null; try { initial = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  const dark = (() => { try { return parent.document.documentElement.dataset.theme === 'dark'; } catch (e) { return false; } })();
  const lang = (() => { try { return { de: 'de-DE', tr: 'tr-TR', es: 'es-ES', fr: 'fr-FR' }[localStorage.getItem('ow-lang')] || 'en'; } catch (e) { return 'en'; } })();
  const App = () => React.createElement(ExcalidrawLib.Excalidraw, { initialData: initial && Object.assign({ scrollToContent: true }, initial), theme: dark ? 'dark' : 'light', langCode: lang,
    onChange: (els, st) => { try { localStorage.setItem(KEY, JSON.stringify({ elements: els, appState: { viewBackgroundColor: st.viewBackgroundColor } })); } catch (e) {} } },
    /* own main menu: the default one links to external community sites */
    React.createElement(M, null, React.createElement(D.LoadScene), React.createElement(D.SaveToActiveFile), React.createElement(D.Export), React.createElement(D.SaveAsImage),
      React.createElement(D.Help), React.createElement(D.ClearCanvas), React.createElement(M.Separator), React.createElement(D.ToggleTheme), React.createElement(D.ChangeCanvasBackground)));
  const M = ExcalidrawLib.MainMenu, D = M.DefaultItems;
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
</script></body></html>`);
  log('draw', 'installed → public/engines/draw/index.html');
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

async function note() {
  // SilverBullet (github.com/silverbulletmd/silverbullet): single binary, started by server/server.js under /sb/
  const ver = process.env.SB_VERSION || '2.12.1';
  for (const [plat, asset, exe] of [['win32-x64', 'windows-x86_64', 'silverbullet.exe'], ['linux-x64', 'linux-x86_64', 'silverbullet'], ['darwin-arm64', 'darwin-aarch64', 'silverbullet'], ['darwin-x64', 'darwin-x86_64', 'silverbullet']]) {
    const dest = path.join(ROOT, 'engines-bin', 'silverbullet', plat); if (fs.existsSync(path.join(dest, exe))) continue;
    try {
      const zip = path.join(tmp, `sb-${plat}.zip`);
      await download(`https://github.com/silverbulletmd/silverbullet/releases/download/${ver}/silverbullet-server-${asset}.zip`, zip);
      fs.mkdirSync(dest, { recursive: true }); run(process.platform === 'win32' ? `tar -xf "${zip}" -C "${dest}"` : `unzip -o -q "${zip}" -d "${dest}"`);
      log('note', `SilverBullet ${ver} → engines-bin/silverbullet/${plat}`);
    } catch (e) { log('note', `${plat}: ${e.message}`); }
  }
  return true;
}

(async () => {
  fs.mkdirSync(ENG, { recursive: true });
  const ok = {};
  const steps = { pdf, draw, word: () => craft('word', 'wordcraft', 'wordcraft-web'), excel: () => craft('excel', 'gridcraft', 'gridcraft-web'), slide: () => craft('slide', 'deckcraft', 'deckcraft-web'), note };
  for (const [t, fn] of Object.entries(steps)) {
    if (!sel(t)) continue;
    try { ok[t] = await fn(); } catch (e) { log(t, 'failed: ' + e.message); ok[t] = false; }
  }
  // registry used when the app is opened via file://
  const reg = {}; for (const t of ['word', 'excel', 'slide', 'note', 'draw', 'pdf']) reg[t] = fs.existsSync(path.join(ENG, t, 'index.html'));
  fs.writeFileSync(path.join(ENG, 'engines.js'), `/* generated by scripts/fetch-engines.js */\nwindow.OW_ENGINES = ${JSON.stringify(reg)};\n`);
  console.log('\nInstalled engines:', reg);
  fs.rmSync(tmp, { recursive: true, force: true });
})();
