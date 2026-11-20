/* Office Werkstatt – Windows offline installer
 * 1) electron-builder --dir  → dist/win-unpacked (Electron + app + all engines + SilverBullet.exe)
 * 2) resedit (pure JS)       → icon + version info in Office Werkstatt.exe (no Wine needed)
 * 3) makensis (native)       → dist/Office-Werkstatt-Setup-<version>.exe
 * The resulting setup contains everything; installing it needs NO internet.
 *   node build/win-pack.mjs        (Linux, macOS or Windows with NSIS installed)               */
import { execSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as ResEdit from 'resedit';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const run = c => execSync(c, { cwd: root, stdio: 'inherit' });

// built-in AI engine (llama.cpp): fetched once into build/llm
fs.mkdirSync(path.join(here, 'llm'), { recursive: true });
if (!process.env.OW_SKIP_LLM) run('node build/fetch-llm.mjs');
run('npx electron-builder --win --x64 --dir');
const exe = path.join(root, 'dist', 'win-unpacked', 'Office Werkstatt.exe');
const ico = path.join(here, 'icon.ico');

const data = fs.readFileSync(exe);
const pe = ResEdit.NtExecutable.from(data, { ignoreCert: true });
const res = ResEdit.NtExecutableResource.from(pe);
if (fs.existsSync(ico)) {
  const icon = ResEdit.Data.IconFile.from(fs.readFileSync(ico));
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1033, icon.icons.map(i => i.data));
}
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] || ResEdit.Resource.VersionInfo.createEmpty();
const [a, b, c] = pkg.version.split('.').map(Number);
vi.setFileVersion(a, b, c, 0, 1033); vi.setProductVersion(a, b, c, 0, 1033);
vi.setStringValues({ lang: 1033, codepage: 1200 }, { FileDescription: 'Office Werkstatt', ProductName: 'Office Werkstatt', CompanyName: 'smyrna-pergamum', LegalCopyright: '© smyrna-pergamum', OriginalFilename: 'Office Werkstatt.exe', InternalName: 'Office Werkstatt' });
vi.outputToResourceEntries(res.entries);
res.outputResource(pe);
fs.writeFileSync(exe, Buffer.from(pe.generate()));
console.log('✓ icon + version info set');

const out = path.join(root, 'dist', `Office-Werkstatt-Setup-${pkg.version}.exe`);
run(`makensis -V2 -DVERSION=${pkg.version} -DSRC="${path.join(root, 'dist', 'win-unpacked')}" -DICON="${ico}" -DOUTFILE="${out}" "${path.join(here, 'installer.nsi')}"`);
console.log('✓ offline installer →', out);
