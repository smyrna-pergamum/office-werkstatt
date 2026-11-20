/* Office Werkstatt – format converter (LibreOffice, headless)
 * Writes and opens the formats the Werkzeug engines cannot: PowerPoint 97–2003 (.ppt/.pps/.pot), OpenDocument
 * (.odp/.otp/.odg/.fodp, .ods/.ots/.fods), UOF (.uop), Word 97–2003 (.doc), Excel 97–2003 (.xls/.xlt) …
 *   GET  /api/convert                       → { available, version }
 *   POST /api/convert?from=pptx&to=ppt      → body: the file, answer: the converted file
 * LibreOffice is looked for in this order: OW_SOFFICE (a program path), OW_CONVERTER (the folder the Windows installer
 * ships: <resources>/converter), then the usual install places (Windows, macOS, Linux) and the PATH.
 * LibreOffice is free software (MPL-2.0) by The Document Foundation – https://www.libreoffice.org */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

/* output filter per target extension (LibreOffice filter names) */
const FILTERS = {
  // presentations
  ppt: 'ppt:MS PowerPoint 97', pps: 'pps:MS PowerPoint 97 AutoPlay', pot: 'pot:MS PowerPoint 97 Vorlage',
  odp: 'odp:impress8', otp: 'otp:impress8_template', odg: 'odg:impress8_draw', fodp: 'fodp:OpenDocument Presentation Flat XML', uop: 'uop:UOF presentation',
  pptx: 'pptx:Impress MS PowerPoint 2007 XML',
  // spreadsheets
  xls: 'xls:MS Excel 97', xlt: 'xlt:MS Excel 97 Vorlage/Template', ods: 'ods:calc8', ots: 'ots:calc8_template', fods: 'fods:OpenDocument Spreadsheet Flat XML', uos: 'uos:UOF spreadsheet',
  xlsx: 'xlsx:Calc MS Excel 2007 XML',
  // text
  doc: 'doc:MS Word 97', dot: 'dot:MS Word 97 Vorlage', uot: 'uot:UOF text', docx: 'docx:MS Word 2007 XML',
};
const IN = /^(pptx|pptm|ppsx|ppsm|potx|potm|ppt|pps|pot|odp|otp|odg|fodp|uop|sxi|key|xlsx|xlsm|xls|xlt|xlsb|ods|ots|fods|uos|docx|docm|doc|dot|odt|ott|fodt|uot|rtf|wps|wpd)$/;

function candidates() {
  const c = [];
  if (process.env.OW_SOFFICE) c.push(process.env.OW_SOFFICE);
  const exe = process.platform === 'win32' ? 'soffice.exe' : 'soffice';
  if (process.env.OW_CONVERTER) c.push(path.join(process.env.OW_CONVERTER, 'program', exe), path.join(process.env.OW_CONVERTER, 'LibreOffice', 'program', exe));
  if (process.platform === 'win32') {
    for (const pf of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files', 'C:\\Program Files (x86)']) if (pf) c.push(path.join(pf, 'LibreOffice', 'program', 'soffice.exe'));
  } else if (process.platform === 'darwin') c.push('/Applications/LibreOffice.app/Contents/MacOS/soffice');
  else c.push('/usr/bin/soffice', '/usr/lib/libreoffice/program/soffice', '/opt/libreoffice/program/soffice', '/snap/bin/libreoffice');
  for (const d of String(process.env.PATH || '').split(path.delimiter)) if (d) c.push(path.join(d, exe));
  return c;
}
let found;
function soffice() {
  if (found !== undefined) return found;
  found = candidates().find(p => { try { return fs.statSync(p).isFile(); } catch { return false; } }) || null;
  return found;
}

let chain = Promise.resolve();             // one conversion at a time (LibreOffice locks its profile)
function run(file, args, ms) {
  return new Promise((res, rej) => execFile(file, args, { timeout: ms, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, so, se) => err ? rej(Object.assign(err, { stderr: String(se || so || '') })) : res(String(so || ''))));
}

async function convert(buf, from, to, dataDir) {
  const bin = soffice(); if (!bin) throw new Error('converter not installed');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ow-conv-'));
  const input = path.join(tmp, 'document.' + from); fs.writeFileSync(input, buf);
  const profile = path.join(dataDir || os.tmpdir(), '.converter-profile');
  const args = ['--headless', '--invisible', '--norestore', '--nolockcheck', '--nodefault', '--nofirststartwizard',
    '-env:UserInstallation=' + pathToFileURL(profile).href, '--convert-to', FILTERS[to] || to, '--outdir', tmp, input];
  try {
    await run(bin, args, 180000);
    const out = fs.readdirSync(tmp).find(f => f !== path.basename(input) && f.toLowerCase().endsWith('.' + to));
    if (!out) throw new Error('conversion produced no file');
    return fs.readFileSync(path.join(tmp, out));
  } finally { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ } }
}

function readRaw(req, max) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > max) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject);
  });
}

module.exports = function makeConvert({ send, DATA }) {
  return async function convertApi(req, res, url) {
    if (req.method === 'GET') return send(res, 200, { available: !!soffice(), formats: Object.keys(FILTERS) });
    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
    const from = String(url.searchParams.get('from') || '').toLowerCase(), to = String(url.searchParams.get('to') || '').toLowerCase();
    if (!IN.test(from) || !FILTERS[to]) return send(res, 400, { error: 'format not supported' });
    if (!soffice()) return send(res, 501, { error: 'converter not installed' });
    try {
      const buf = await readRaw(req, 300 * 1024 * 1024);
      const job = chain.then(() => convert(buf, from, to, DATA)); chain = job.catch(() => {});
      const out = await job;
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': out.length, 'Cache-Control': 'no-store' });
      res.end(out);
    } catch (e) { send(res, 500, { error: String((e && (e.stderr || e.message)) || e).slice(0, 500) }); }
  };
};
module.exports.soffice = soffice;
