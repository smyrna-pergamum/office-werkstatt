/* Office Werkstatt – desktop shell (Electron)
 * Starts the built-in server on 127.0.0.1 (random port, no internet needed), stores documents in the
 * user's app-data folder and opens files passed by the OS (double-click / "Open with"). */
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path'), fs = require('fs');

const base = app.isPackaged ? path.join(process.resourcesPath, 'app') : path.join(__dirname, '..');
process.env.DATA_DIR = path.join(app.getPath('userData'), 'documents');
process.env.OW_VERSION = app.getVersion();
const { start } = require(path.join(base, 'server', 'server.js'));

let win = null, port = 0;
const pending = [];
const isDoc = p => /\.(docx|xlsx|pptx|pdf|csv|txt|md|excalidraw|owdoc|json)$/i.test(p || '') && fs.existsSync(p);
function queue(paths) {
  const files = paths.filter(isDoc).map(p => ({ name: path.basename(p), data: fs.readFileSync(p) }));
  if (!files.length) return;
  if (win && win.webContents && !win.webContents.isLoading()) win.webContents.send('open-files', files); else pending.push(...files);
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
}

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', (_e, argv) => queue(argv.slice(1)));
app.on('open-file', (e, p) => { e.preventDefault(); queue([p]); }); // macOS

async function createWindow() {
  port = port || await start(0, '127.0.0.1');
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 380, minHeight: 500, title: 'Office Werkstatt',
    icon: path.join(base, 'public', 'assets', 'icon-512.png'), backgroundColor: '#F5F6FC', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.loadURL(`http://127.0.0.1:${port}/index.html`);
  win.webContents.on('did-finish-load', () => { if (pending.length) win.webContents.send('open-files', pending.splice(0)); });
  // external links (help pages etc.) open in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (!url.startsWith(`http://127.0.0.1:${port}`)) { shell.openExternal(url); return { action: 'deny' }; } return { action: 'allow' }; });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }]) : null);
  queue(process.argv.slice(app.isPackaged ? 1 : 2));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
ipcMain.handle('ow:version', () => app.getVersion());
