/* Office Werkstatt – puts the built-in AI engine (llama.cpp llama-server, MIT) into build/llm for the Windows installer.
 * Vulkan build: uses the graphics card where Vulkan drivers exist and falls back to the CPU backends it contains.
 *   node build/fetch-llm.mjs            (LLAMA_TAG=b12500 to choose another llama.cpp release) */
import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, 'llm');
const TAG = process.env.LLAMA_TAG || 'b12500';
if (fs.existsSync(path.join(out, 'llama-server.exe'))) { console.log('✓ llama-server already in build/llm'); process.exit(0); }
const url = `https://github.com/ggml-org/llama.cpp/releases/download/${TAG}/llama-${TAG}-bin-win-vulkan-x64.zip`;
const tmp = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || process.env.TEMP || '/tmp'), 'ow-llm-')), zip = path.join(tmp, 'llama.zip');
console.log('↓', url);
const r = await fetch(url); if (!r.ok) { console.warn('! llama.cpp download failed (HTTP ' + r.status + ') – installer without built-in AI engine'); process.exit(0); }
fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
const ex = path.join(tmp, 'x'); fs.mkdirSync(ex);
if (process.platform === 'win32') execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zip}' -DestinationPath '${ex}' -Force"`, { stdio: 'inherit' });
else execSync(`unzip -q -o "${zip}" -d "${ex}"`, { stdio: 'inherit' });
// keep the server and the libraries it loads; drop the other command line tools
const keep = f => /^llama-server(\.exe|-impl\.dll)$/i.test(f) || /\.dll$/i.test(f) && !/-impl\.dll$/i.test(f) || /^LICENSE/i.test(f);
fs.mkdirSync(out, { recursive: true });
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let n = 0; for (const f of walk(ex)) if (keep(path.basename(f))) { fs.copyFileSync(f, path.join(out, path.basename(f))); n++; }
try { const lic = await fetch('https://raw.githubusercontent.com/ggml-org/llama.cpp/master/LICENSE'); if (lic.ok) fs.writeFileSync(path.join(out, 'LICENSE-llama.cpp.txt'), await lic.text()); } catch { /* the README names the licence */ }
fs.writeFileSync(path.join(out, 'README.txt'), `llama.cpp ${TAG} (https://github.com/ggml-org/llama.cpp) – MIT licence, see LICENSE files.\r\nUsed by Office Werkstatt as its built-in AI engine.\r\n`);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`✓ built-in AI engine: ${n} files → build/llm`);
