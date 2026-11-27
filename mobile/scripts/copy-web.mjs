// Copies the Office Werkstatt web app (../public) into www/ for the Android shell.
// The app is the same as on the desktop and the server; it notices Android at runtime (window.Capacitor).
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const here = path.dirname(url.fileURLToPath(import.meta.url));
const src = path.join(here, '../../public'), dst = path.join(here, '../www');
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
// the service worker is not needed inside the app (the files are in the APK) and would only cache twice
fs.writeFileSync(path.join(dst, 'sw.js'), "self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', e => e.waitUntil(self.registration.unregister()));\n");
const n = (function count(d) { return fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0); })(dst);
console.log(`www: ${n} files from public/`);
