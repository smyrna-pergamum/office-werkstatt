// Creates and customizes the native Android project (mobile/android) – it is generated, not kept in git.
//   node scripts/prepare-android.mjs    (npm run android:prepare; the GitHub workflow runs it)
// Steps: web app → www/, `cap add android` (first time), manifest / gradle / icons / signing, `cap sync android`.
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url'; import { execSync } from 'node:child_process';
const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const A = path.join(root, 'android'), APP = path.join(A, 'app');
const run = c => execSync(c, { cwd: root, stdio: 'inherit' });
const edit = (f, fn) => { const p = path.join(APP, f), s = fs.readFileSync(p, 'utf8'), n = fn(s); if (n !== s) fs.writeFileSync(p, n); };

run('node scripts/copy-web.mjs');
if (!fs.existsSync(path.join(APP, 'build.gradle'))) run('npx cap add android');

/* manifest: big heap (documents, AI), cleartext for Ollama in the home network, "open with" for documents */
const MIMES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation', 'application/rtf', 'text/csv', 'text/markdown'];
edit('src/main/AndroidManifest.xml', s => {
  if (!s.includes('android:largeHeap')) s = s.replace('android:theme="@style/AppTheme">', 'android:theme="@style/AppTheme"\n        android:largeHeap="true"\n        android:usesCleartextTraffic="true">');
  if (!s.includes('ow-open-with')) s = s.replace(/(<category android:name="android.intent.category.LAUNCHER" \/>\s*<\/intent-filter>)/, `$1

            <!-- ow-open-with: documents from other apps (Files, mail, browser downloads) -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="content" />
                <data android:scheme="file" />
${MIMES.map(m => `                <data android:mimeType="${m}" />`).join('\n')}
            </intent-filter>`);
  return s;
});

/* gradle: version from package.json, release signing (secrets or the project's public development key) */
edit('build.gradle', s => {
  if (!s.includes('owVersionName')) s = s.replace("apply plugin: 'com.android.application'\n", `apply plugin: 'com.android.application'

// Office Werkstatt: the version follows the Office Werkstatt package.json in the repository root
def owVersionName() { new groovy.json.JsonSlurper().parse(file('../../../package.json')).version }
def owVersionCode() { def p = owVersionName().tokenize('.').collect { it.replaceAll(/\\D.*/, '') as int }; p[0] * 10000 + p[1] * 100 + p[2] }
`);
  s = s.replace(/versionCode \d+\n(\s*)versionName "[^"]*"/, 'versionCode owVersionCode()\n$1versionName owVersionName()');
  if (!s.includes('signingConfigs')) s = s.replace(/    buildTypes \{\n        release \{\n/, `    signingConfigs {
        // the release key comes from the environment (GitHub secrets); without it the project's public
        // development key is used, so every build installs and updates over the previous one
        release {
            storeFile file(System.getenv('OW_KEYSTORE') ?: 'ow-dev.keystore')
            storePassword System.getenv('OW_KEYSTORE_PASSWORD') ?: 'officewerkstatt'
            keyAlias System.getenv('OW_KEY_ALIAS') ?: 'officewerkstatt'
            keyPassword System.getenv('OW_KEY_PASSWORD') ?: (System.getenv('OW_KEYSTORE_PASSWORD') ?: 'officewerkstatt')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
`);
  return s;
});
const ks = path.join(APP, 'ow-dev.keystore');
if (!fs.existsSync(ks)) fs.writeFileSync(ks, Buffer.from(fs.readFileSync(path.join(root, 'ow-dev.keystore.b64'), 'utf8').replace(/\s+/g, ''), 'base64'));

/* icons and splash from public/assets */
edit('src/main/res/values/ic_launcher_background.xml', s => s.replace(/#[0-9A-Fa-f]{6}/, '#6B5CF0'));
try { run(`python3 scripts/icons.py "${path.join(root, '../public/assets')}" "${path.join(APP, 'src/main/res')}"`); }
catch { console.warn('icons: python3 with Pillow is needed (pip install pillow) – the default Capacitor icons stay'); }

run('npx cap sync android');
try { fs.chmodSync(path.join(A, 'gradlew'), 0o755); } catch { /* windows */ }
console.log('android project ready: cd android && ./gradlew assembleRelease');
