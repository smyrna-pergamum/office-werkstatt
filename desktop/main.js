/* Office Werkstatt – desktop shell (Electron)
 * Starts the built-in server on 127.0.0.1 (random port, no internet needed), stores documents in the
 * user's app-data folder and opens files passed by the OS (double-click / "Open with"). */
const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron');
const path = require('path'), fs = require('fs');

const base = app.isPackaged ? path.join(process.resourcesPath, 'app') : path.join(__dirname, '..');
process.env.DATA_DIR = path.join(app.getPath('userData'), 'documents');
process.env.OW_VERSION = app.getVersion();
process.env.OW_DESKTOP = '1';   // one person on this computer: no accounts; the admin panel shows status, checks, maintenance and logs
if (app.isPackaged) process.env.OW_CONVERTER = path.join(process.resourcesPath, 'converter');
if (app.isPackaged) process.env.OW_LLM_DIR = path.join(process.resourcesPath, 'llm');            // built-in AI engine (llama.cpp)   // LibreOffice shipped with the installer (format converter)
const server = require(path.join(base, 'server', 'server.js'));

/* errors in the main process are logged instead of popping up a dialog (e.g. while shutting down) */
const logFile = path.join(app.getPath('userData'), 'office-werkstatt.log');
function logError(kind, err) {
  try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${kind}: ${err && err.stack || err}\n`); } catch { /* ignore */ }
  console.error(kind, err);
}
process.on('uncaughtException', e => logError('uncaughtException', e));
process.on('unhandledRejection', e => logError('unhandledRejection', e));

let win = null, port = 0, uiLang = 'en';
const pending = [];
const isDoc = p => /\.(docx|docm|dotx|dotm|doc|dot|odt|ott|fodt|rtf|xlsx|xlsm|xltx|xltm|xls|xlsb|ods|csv|tsv|pptx|pptm|ppsx|ppsm|potx|potm|ppt|werkzeug|pdf|txt|md|excalidraw|owdoc|json)$/i.test(p || '') && fs.existsSync(p);
function queue(paths) {
  const files = paths.filter(isDoc).map(p => ({ name: path.basename(p), data: fs.readFileSync(p) }));
  if (!files.length) return;
  if (win && win.webContents && !win.webContents.isLoading()) win.webContents.send('open-files', files); else pending.push(...files);
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
}

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', (_e, argv) => queue(argv.slice(1)));
app.on('open-file', (e, p) => { e.preventDefault(); queue([p]); }); // macOS

const CLOSE_TEXT = {
  tr: ['Kaydedilmemiş değişiklikler var', 'Açık belgede kaydedilmemiş değişiklikler var. Yine de kapatılsın mı?', 'Kapat', 'Vazgeç'],
  de: ['Ungespeicherte Änderungen', 'Das geöffnete Dokument enthält ungespeicherte Änderungen. Trotzdem schließen?', 'Schließen', 'Abbrechen'],
  en: ['Unsaved changes', 'The open document has unsaved changes. Close anyway?', 'Close', 'Cancel'],
  es: ['Cambios sin guardar', 'El documento abierto tiene cambios sin guardar. ¿Cerrar de todos modos?', 'Cerrar', 'Cancelar'],
  fr: ['Modifications non enregistrées', 'Le document ouvert contient des modifications non enregistrées. Fermer quand même ?', 'Fermer', 'Annuler'],
};

async function createWindow() {
  port = port || await server.start(0, '127.0.0.1');
  const origin = `http://127.0.0.1:${port}`;
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 380, minHeight: 500, title: 'Office Werkstatt',
    icon: path.join(base, 'public', 'assets', 'icon-512.png'), backgroundColor: '#F5F6FC', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false },   // engines keep answering (autosave) while the window is hidden
  });
  win.loadURL(`${origin}/index.html`);
  win.webContents.on('did-finish-load', () => { if (pending.length) win.webContents.send('open-files', pending.splice(0)); });
  // external links (help pages etc.) open in the system browser – only web/mail links
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin + '/')) return { action: 'allow' };
    if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origin + '/')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });

  /* Closing: an engine (e.g. PDF Werkstatt with an unsaved PDF) may veto the unload with "beforeunload".
   * Electron then silently keeps the window open – the app seemed impossible to close. Ask instead. */
  win.webContents.on('will-prevent-unload', e => {
    const [title, msg, ok, cancel] = CLOSE_TEXT[uiLang] || CLOSE_TEXT.en;
    const choice = dialog.showMessageBoxSync(win, { type: 'warning', title: 'Office Werkstatt', message: title, detail: msg, buttons: [ok, cancel], defaultId: 1, cancelId: 1, noLink: true });
    if (choice === 0) e.preventDefault();   // ignore the veto → close
  });
  // a hanging page must never keep the window from closing
  let hung = false;
  win.webContents.on('unresponsive', () => { hung = true; });
  win.webContents.on('responsive', () => { hung = false; });
  win.webContents.on('render-process-gone', () => { hung = true; });
  win.on('close', e => { if (hung && !win.isDestroyed()) { e.preventDefault(); win.destroy(); } });
  // the main window closing ends the app – also when hidden helper windows (a print job) are still open
  win.on('closed', () => {
    win = null;
    for (const w of BrowserWindow.getAllWindows()) { try { w.destroy(); } catch { /* ignore */ } }
    if (process.platform !== 'darwin') app.quit();
  });
}

/* ---------- printing (see public/js/desktop.js) ----------
 * The page sends a static HTML copy of what is to be printed. Office Werkstatt shows its own print
 * preview (real pages, made with printToPDF) with printer, copies, pages, orientation, paper and colour,
 * and prints straight to the chosen printer. The Windows print dialog (PrintDialog.exe) is not used:
 * it shows no preview, opens slowly, and a print job it loses keeps Electron from ever quitting. */
const fromApp = e => !!(win && !win.isDestroyed() && e.sender === win.webContents && port && e.senderFrame && e.senderFrame.url.startsWith(`http://127.0.0.1:${port}/`));
const prefsFile = path.join(app.getPath('userData'), 'print.json');
const readPrefs = () => { try { return JSON.parse(fs.readFileSync(prefsFile, 'utf8')); } catch { return {}; } };
const PAPER = { A3: 'A3', A4: 'A4', A5: 'A5', Letter: 'Letter', Legal: 'Legal' };
let job = null;   // the one open print preview

function parseRange(r, max) {
  if (!r) return [];
  const out = [];
  for (const part of r.split(',')) {
    const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(part); if (!m) throw new Error('range');
    const a = Math.max(1, +m[1]), b = Math.min(max || 9999, m[2] ? +m[2] : a);
    if (b >= a) out.push({ from: a - 1, to: b - 1 });
  }
  return out;
}
function closeJob(result) {
  const j = job; if (!j) return; job = null;
  for (const w of [j.preview, j.pw]) if (w && !w.isDestroyed()) w.destroy();
  for (const f of j.files) fs.rm(f, { force: true }, () => {});
  j.resolve(result);
}
ipcMain.handle('ow:print-html', async (e, html) => {
  if (!fromApp(e) || typeof html !== 'string') return { ok: false, why: 'denied' };
  if (html.length > 400 * 1024 * 1024) return { ok: false, why: 'too large' };
  if (job) { if (!job.preview.isDestroyed()) job.preview.focus(); return { ok: false, why: 'busy' }; }
  const stem = path.join(app.getPath('temp'), `office-werkstatt-print-${process.pid}-${Date.now()}`);
  const htmlFile = stem + '.html'; fs.writeFileSync(htmlFile, html);
  const pw = new BrowserWindow({ show: false, width: 1000, height: 1300, webPreferences: { javascript: false, sandbox: true, contextIsolation: true } });
  const preview = new BrowserWindow({
    parent: win, modal: true, show: false, width: 1180, height: 860, minWidth: 760, minHeight: 520, title: 'Office Werkstatt', autoHideMenuBar: true,
    backgroundColor: '#525659', icon: path.join(base, 'public', 'assets', 'icon-512.png'),
    webPreferences: { preload: path.join(__dirname, 'print-preload.js'), contextIsolation: true, sandbox: true, plugins: true },   // plugins: the built-in PDF viewer shows the pages
  });
  preview.setMenu(null);
  return new Promise(resolve => {
    job = { pw, preview, files: [htmlFile], resolve, pdf: null, pages: 0, n: 0, stem };
    preview.on('closed', () => closeJob({ ok: false, why: 'cancelled' }));
    preview.webContents.on('will-navigate', ev => ev.preventDefault());
    preview.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    pw.loadFile(htmlFile).then(() => {
      if (!job || job.preview !== preview) return;
      preview.loadFile(path.join(__dirname, 'print-preview.html'), { query: { lang: uiLang } });
      preview.once('ready-to-show', () => preview.show());
    }).catch(err => { logError('print', err); closeJob({ ok: false, why: String(err && err.message || err) }); });
  });
});
const fromPreview = e => !!(job && !job.preview.isDestroyed() && e.sender === job.preview.webContents);
ipcMain.handle('ow:pp-printers', async e => {
  if (!fromPreview(e)) return [];
  let list = []; try { list = await job.pw.webContents.getPrintersAsync(); } catch (err) { logError('printers', err); }
  const last = readPrefs().printer;
  const isDef = p => p.isDefault || (p.options && (p.options['is-default'] === 'true' || p.options.isDefault === 'true'));
  const pick = (list.find(p => p.name === last) || list.find(isDef) || list.find(p => !/fax|onenote/i.test(p.name)) || list[0] || {}).name;
  return list.map(p => ({ name: p.name, displayName: p.displayName || p.name, selected: p.name === pick }));
});
ipcMain.handle('ow:pp-render', async (e, o = {}) => {
  if (!fromPreview(e)) throw new Error('denied');
  const opt = { printBackground: true, landscape: !!o.landscape, margins: { marginType: 'default' } };
  if (PAPER[o.pageSize]) opt.pageSize = PAPER[o.pageSize]; else opt.preferCSSPageSize = true;
  const buf = await job.pw.webContents.printToPDF(opt);
  const file = `${job.stem}-${++job.n}.pdf`; fs.writeFileSync(file, buf); job.files.push(file);
  job.pdf = buf; job.opt = o;
  job.pages = (buf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length || 1;
  return { url: require('url').pathToFileURL(file).href, pages: job.pages };
});
ipcMain.handle('ow:pp-print', async (e, o = {}) => {
  if (!fromPreview(e)) return { ok: false, why: 'denied' };
  let pageRanges; try { pageRanges = parseRange(o.range, job.pages); } catch { return { ok: false, why: 'range' }; }
  const opt = { silent: true, printBackground: true, deviceName: String(o.deviceName || ''), copies: Math.max(1, Math.min(99, +o.copies || 1)), color: o.color !== false, landscape: !!o.landscape, margins: { marginType: 'default' } };
  if (PAPER[o.pageSize]) opt.pageSize = PAPER[o.pageSize];
  if (pageRanges.length) opt.pageRanges = pageRanges;
  try { fs.writeFileSync(prefsFile, JSON.stringify(Object.assign(readPrefs(), { printer: opt.deviceName }))); } catch { /* ignore */ }
  return new Promise(r => {
    const t = setTimeout(() => r({ ok: false, why: 'timeout' }), 120000);
    job.pw.webContents.print(opt, (ok, why) => { clearTimeout(t); r({ ok, why: why || '' }); });
  });
});
ipcMain.handle('ow:pp-save', async e => {
  if (!fromPreview(e) || !job.pdf) return { ok: false };
  const r = await dialog.showSaveDialog(job.preview, { defaultPath: path.join(app.getPath('documents'), 'Office Werkstatt.pdf'), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled || !r.filePath) return { ok: false };
  fs.writeFileSync(r.filePath, job.pdf); return { ok: true };
});
ipcMain.on('ow:pp-close', (e, printed) => { if (fromPreview(e)) closeJob(printed ? { ok: true } : { ok: false, why: 'cancelled' }); });
ipcMain.on('ow:lang', (e, l) => { if (fromApp(e) && typeof l === 'string' && CLOSE_TEXT[l]) uiLang = l; });
ipcMain.handle('ow:version', () => app.getVersion());

app.whenReady().then(() => {
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }]) : null);
  uiLang = (app.getLocale() || 'en').slice(0, 2);
  queue(process.argv.slice(app.isPackaged ? 1 : 2));
  createWindow().catch(e => { logError('start', e); dialog.showErrorBox('Office Werkstatt', String(e && e.message || e)); app.exit(1); });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
/* shut the built-in server and the note engine down cleanly before the process exits */
let stopped = false;
app.on('will-quit', e => {
  if (stopped) return;
  stopped = true; e.preventDefault();
  const done = () => app.exit(0);
  setTimeout(done, 2500);                      // never hang while quitting
  Promise.resolve().then(() => server.stop && server.stop()).catch(err => logError('stop', err)).finally(done);
});
