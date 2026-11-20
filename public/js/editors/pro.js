/* Word / Excel / Slide Werkzeug Pro – the full engines are THE editors (no separate simple view).
 *
 * The engines (engines/<type>/index.html, WebAssembly) are complete office apps. Each one puts a command
 * API on its page (window.wordcraft / gridcraft / deckcraft: execute(id, params)). Office Werkstatt uses it:
 *   open   – file.open / file.openBytes with the stored file (older built-in content is converted first)
 *   save   – Excel/Slide: file.saveBytes; Word: file.saveAs into a captured file handle → library
 *   Ctrl+S – saves into the library (no download)
 *   Save As / Export – an Office-style dialog with every format the engine can write; the engine writes it
 *            through a file handle that Office Werkstatt provides (window.showSaveFilePicker), then it is
 *            downloaded – or stored in the library when it is the working format (.docx/.xlsx/.pptx)
 * The engines' own format is called ".werkzeug" (Office Werkstatt file).
 * Without an installed engine the built-in editors are used (OW.editors.<type>). */
window.OW = window.OW || {};
OW.proEditors = OW.proEditors || {};
(function () {
  /* ---------- formats ---------- */
  // ext: file extension · label · how the engine writes it:
  //   ['saveAs', path-ext, extra params] · ['export', format] (slide) · ['bytes', format] · ['csv'|'html'|'pdf'] (excel)
  const F = (ext, label, how, opts = {}) => Object.assign({ ext, label, how }, opts);
  const CFG = {
    word: {
      app: 'wordcraft', ext: 'docx', craft: null, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      open: ['docx', 'docm', 'dotx', 'dotm', 'doc', 'dot', 'odt', 'ott', 'fodt', 'rtf', 'htm', 'html', 'md', 'markdown', 'txt', 'xml'],
      write: [
        F('docx', 'Word-Dokument', ['saveAs', 'docx']),
        F('doc', 'Word 97–2003 (RTF)', ['saveAs', 'rtf'], { rename: true }),
        F('docm', 'Word-Dokument mit Makros', ['retype', 'application/vnd.ms-word.document.macroEnabled.main+xml']),
        F('dotx', 'Word-Vorlage', ['retype', 'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml']),
        F('dotm', 'Word-Vorlage mit Makros', ['retype', 'application/vnd.ms-word.template.macroEnabledTemplate.main+xml']),
        F('odt', 'OpenDocument-Text', ['saveAs', 'odt']),
        F('ott', 'OpenDocument-Textvorlage', ['saveAs', 'ott']),
        F('fodt', 'Flat OpenDocument-Text', ['saveAs', 'fodt']),
        F('rtf', 'Rich Text Format', ['saveAs', 'rtf']),
        F('xml', 'Word-XML-Dokument', ['saveAs', 'xml', { format: 'flatopc' }]),
        F('xml', 'Word 2003 XML', ['saveAs', 'xml', { format: 'wordml2003' }], { id: 'xml2003' }),
        F('pdf', 'PDF', ['saveAs', 'pdf']),
        F('html', 'Webseite (HTML)', ['saveAs', 'html']),
        F('md', 'Markdown', ['saveAs', 'md']),
        F('tex', 'LaTeX', ['saveAs', 'tex']),
        F('txt', 'Nur Text', ['saveAs', 'txt']),
        F('png', 'Seitenbild (PNG)', ['saveAs', 'png']),
      ],
    },
    excel: {
      app: 'gridcraft', ext: 'xlsx', craft: null, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      open: ['xlsx', 'xlsm', 'xltx', 'xltm', 'xls', 'xlsb', 'ods', 'csv', 'tsv'],
      write: [
        F('xlsx', 'Excel-Arbeitsmappe', ['bytes', 'xlsx']),
        F('xlsm', 'Excel-Arbeitsmappe mit Makros', ['retype', 'application/vnd.ms-excel.sheet.macroEnabled.main+xml']),
        F('xltx', 'Excel-Vorlage', ['retype', 'application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml']),
        F('xltm', 'Excel-Vorlage mit Makros', ['retype', 'application/vnd.ms-excel.template.macroEnabled.main+xml']),
        F('csv', 'CSV (Trennzeichen)', ['bytes', 'csv']),
        F('tsv', 'Text (Tabstopp-getrennt)', ['bytes', 'tsv']),
        F('txt', 'Text (Tabstopp-getrennt, .txt)', ['bytes', 'tsv'], { rename: true }),
        F('json', 'JSON', ['bytes', 'json']),
        F('html', 'Webseite (HTML)', ['bytes', 'html']),
        F('pdf', 'PDF', ['pdf']),
      ],
    },
    slide: {
      app: 'deckcraft', ext: 'pptx', craft: 'deckcraft', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      open: ['pptx', 'pptm', 'ppsx', 'ppsm', 'potx', 'potm', 'ppt', 'deckcraft', 'werkzeug'],
      write: [
        F('pptx', 'PowerPoint-Präsentation', ['bytes', 'pptx']),
        F('pptm', 'PowerPoint-Präsentation mit Makros', ['retype', 'application/vnd.ms-powerpoint.presentation.macroEnabled.main+xml']),
        F('ppsx', 'PowerPoint-Bildschirmpräsentation', ['retype', 'application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml']),
        F('ppsm', 'PowerPoint-Bildschirmpräsentation mit Makros', ['retype', 'application/vnd.ms-powerpoint.slideshow.macroEnabled.main+xml']),
        F('potx', 'PowerPoint-Vorlage', ['retype', 'application/vnd.openxmlformats-officedocument.presentationml.template.main+xml']),
        F('potm', 'PowerPoint-Vorlage mit Makros', ['retype', 'application/vnd.ms-powerpoint.template.macroEnabled.main+xml']),
        F('pdf', 'PDF', ['slidePdf']),
        F('png', 'PNG-Bilder', ['slideImages', 'png']),
        F('jpg', 'JPEG-Bilder', ['slideImages', 'jpeg']),
        F('rtf', 'Gliederung (RTF)', ['outline', 'rtf']),
        F('txt', 'Gliederung (Text)', ['outline', 'txt']),
        F('werkzeug', 'Office Werkstatt (Slide)', ['bytes', 'deckcraft']),
      ],
    },
  };
  /* formats written by the format converter (LibreOffice, shipped with the desktop installer; server: installed LibreOffice) */
  const C = (ext, label, opts = {}) => F(ext, label, ['convert', ext], Object.assign({ conv: true }, opts));
  CFG.slide.write.splice(CFG.slide.write.length - 1, 0,
    // OpenDocument: written natively (js/odf.js), no converter needed
    F('odp', 'ODF-Präsentation', ['odf', 'odp']), F('otp', 'ODF-Präsentationsvorlage', ['odf', 'otp']), F('odg', 'ODF-Zeichnung (Impress)', ['odf', 'odg']), F('fodp', 'Flat XML ODF-Präsentation', ['odf', 'fodp']),
    C('ppt', 'PowerPoint 97–2003'), C('pps', 'PowerPoint 97–2003 AutoPlay'), C('pot', 'PowerPoint 97–2003 Vorlage'), C('uop', 'Unified Office Format Präsentation'));
  CFG.excel.write.push(C('xls', 'Excel 97–2003'), C('xlt', 'Excel 97–2003 Vorlage'), C('ods', 'ODF-Tabellendokument'), C('ots', 'ODF-Tabellenvorlage'), C('fods', 'Flat XML ODF-Tabelle'), C('uos', 'Unified Office Format Tabelle'));
  CFG.word.write.splice(2, 0, C('doc', 'Word 97–2003', { id: 'doc97' }), C('dot', 'Word 97–2003 Vorlage'), C('uot', 'Unified Office Format Text'));
  /* opened through the converter (→ the engine's working format) */
  OW.NATIVE_OPEN = { slide: ['odp', 'otp', 'odg', 'fodp'] };   // read natively (js/odf.js)
  OW.CONV_OPEN = { slide: ['ppt', 'pps', 'pot', 'uop', 'sxi', 'key'], excel: ['xlt', 'ots', 'fods', 'uos'], word: ['uot', 'wps', 'wpd'] };
  CFG.slide.open.push('pps', 'pot', 'odp', 'otp', 'odg', 'fodp', 'uop'); CFG.excel.open.push('xlt', 'ots', 'fods', 'uos'); CFG.word.open.push('uot', 'wps');
  OW.converter = null;    // true / false once asked
  OW.checkConverter = async () => { if (OW.converter !== null) return OW.converter; try { const r = await fetch('api/convert', { cache: 'no-store' }); OW.converter = r.ok && !!(await r.json()).available; } catch { OW.converter = false; } return OW.converter; };
  OW.convert = async function (blob, from, to) {
    const r = await fetch(`api/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { method: 'POST', body: blob, headers: { 'Content-Type': 'application/octet-stream' } });
    if (!r.ok) { let m = 'HTTP ' + r.status; try { m = (await r.json()).error || m; } catch { /* binary */ } throw new Error(m); }
    return r.blob();
  };
  OW.PRO_CFG = CFG;
  OW.proOpenTypes = type => CFG[type] ? CFG[type].open : [];

  const toB64 = async blob => { const b = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = (b64, mime) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Blob([u], { type: mime || 'application/octet-stream' }); };

  /* a PDF with one picture per page (JPEG, DCTDecode) – used for slide PDFs */
  async function imagesToPdf(jpegs, pw, ph) {
    const te = new TextEncoder(), parts = [], offs = [];
    let len = 0; const push = x => { const b = typeof x === 'string' ? te.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
    push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
    const n = jpegs.length, pageIds = [];
    for (let i = 0; i < n; i++) pageIds.push(3 + i * 3);
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${pageIds.map(id => id + ' 0 R').join(' ')}] >>`));
    for (let i = 0; i < n; i++) {
      const bytes = new Uint8Array(await jpegs[i].arrayBuffer());
      const bmp = await createImageBitmap(jpegs[i]); const iw = bmp.width, ih = bmp.height; bmp.close && bmp.close();
      const p0 = 3 + i * 3, content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
      obj(p0, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${p0 + 2} 0 R >> >> /Contents ${p0 + 1} 0 R >>`));
      obj(p0 + 1, () => { push(`<< /Length ${content.length} >>\nstream\n`); push(content); push('\nendstream'); });
      obj(p0 + 2, () => { push(`<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`); push(bytes); push('\nendstream'); });
    }
    const total = 3 + n * 3, xref = len;
    let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let k = 1; k < total; k++) x += String(offs[k]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }
  const pngToJpeg = async png => { const bmp = await createImageBitmap(png); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0); return new Promise(r => c.toBlob(r, 'image/jpeg', 0.92)); };

  /* older (built-in editor) content → engine file */
  function legacyToFile(type, c) {
    const X = OW.ooxml;
    if (type === 'word') return X.htmlToDocx(OW.sanitizeHTML((c && c.html) || '<p></p>'));
    if (type === 'excel') return X.sheetsToXlsx((c && c.sheets && c.sheets.length) ? c.sheets : [{ name: 'Sheet1', cells: {} }]);
    if (type === 'slide') return X.slidesToPptx({ theme: (c && c.theme) || 'office', slides: (c && c.slides && c.slides.length) ? c.slides.map(sl => sl.els ? sl : Object.assign({}, sl, { els: OW.slideLayoutEls ? OW.slideLayoutEls(sl.layout || 'title-content', sl.title || '', sl.body || '') : [] })) : [{ els: [] }] }, OW.SLIDE_THEMES);
    return null;
  }
  OW.proFileOf = function (file) {
    const cfg = CFG[file.type];
    if (file.content instanceof Blob) {
      let ext = (file.proExt || cfg.ext).replace(/^\./, '').toLowerCase();
      if (ext === 'werkzeug' && cfg.craft) ext = cfg.craft;
      return { blob: file.content, ext };
    }
    return { blob: legacyToFile(file.type, file.content), ext: cfg.ext };
  };
  /* which app a .werkzeug file belongs to (they are the engines' own formats) */
  OW.werkzeugType = async function (blob) {
    const head = new Uint8Array(await blob.slice(0, 65536).arrayBuffer());
    let s = ''; for (const b of head) s += b >= 32 && b < 127 ? String.fromCharCode(b) : ' ';
    if (/deckcraft|presentation|slides?\b/i.test(s)) return 'slide';
    if (/gridcraft|workbook|worksheet|sheets?\b/i.test(s)) return 'excel';
    if (/wordcraft|document|paragraph/i.test(s)) return 'word';
    return null;
  };

  const fmtLabel = (t, cfg, f) => { const k = 'fmt.' + cfg.app + '.' + (f.id || f.ext), v = t(k); return v === k ? f.label : v; };

  /* ---------- the Office-style "Save As" dialog ---------- */
  function saveAsDialog(t, cfg, defName, defId) {
    const E = OW.escape;
    // with the converter: real Word 97–2003 .doc instead of RTF named .doc; without it: no converter formats
    const items = cfg.write.filter(f => OW.converter ? !(f.rename && f.ext === 'doc') : !f.conv).map(f => ({ id: f.id || f.ext, f }));
    const sel = items.find(x => x.id === defId) || items[0];
    return OW.modal(`<form class="dlg sa-dlg">
        <h3>${t('pro.saveAs')}</h3>
        <label>${t('pro.fileName')}<input class="inp" name="n" value="${E(defName)}" spellcheck="false"></label>
        <label>${t('pro.fileType')}<select class="inp" name="ty">${items.map(x => `<option value="${E(x.id)}" ${x === sel ? 'selected' : ''}>${E(fmtLabel(t, cfg, x.f))} (*.${E(x.f.ext)})</option>`).join('')}</select></label>
        <p class="muted small sa-hint"></p>
        <div class="dlg-btns"><button type="button" class="btn ghost" data-x>${t('cancel')}</button><button class="btn primary">${t('pro.save')}</button></div>
      </form>`, (c, close) => {
      const f = c.querySelector('form'), hint = c.querySelector('.sa-hint');
      const upd = () => { const it = items.find(x => x.id === f.ty.value); hint.textContent = it.f.ext === cfg.ext ? t('pro.hintLibrary') : t('pro.hintDownload'); };
      f.ty.onchange = upd; upd();
      setTimeout(() => { f.n.focus(); f.n.select(); });
      f.onsubmit = e => { e.preventDefault(); const n = f.n.value.trim().replace(/\.[a-z0-9]{1,8}$/i, '') || defName; close({ name: OW.safeName(n), item: items.find(x => x.id === f.ty.value).f }); };
      c.querySelector('[data-x]').onclick = () => close(null);
    });
  }

  for (const type of Object.keys(CFG)) {
    OW.proEditors[type] = async function (ctx) {
      const t = ctx.t, cfg = CFG[type], file = ctx.file;
      let frame = null, W = null, ready = false, lastSaveAt = 0, busy = Promise.resolve();
      const auto = [];        // file handles Office Werkstatt itself asked the engine to write
      let exporting = null, refusedAt = 0;   // while an export runs, further engine writes (e.g. one PNG per slide) are taken as part of it
      const api = () => W && W[cfg.app];
      const base = () => OW.safeName(file.name);
      const exec = async (id, params) => { const a = api(); if (!a) throw new Error('engine not ready'); return a.execute(id, params || {}); };

      /* a FileSystemFileHandle the engine can write into (made in the engine's own window, as it checks) */
      function makeHandle(name, onDone) {
        const chunks = [];
        const w = Object.create(W.FileSystemWritableFileStream.prototype);
        const d = (o, k, v) => Object.defineProperty(o, k, { value: v, configurable: true });
        const ok = v => W.Promise.resolve(v);
        let pos = 0;
        d(w, 'write', x => ok().then(() => {
          if (x && x.type === 'seek') { pos = x.position; return; }
          if (x && x.type === 'truncate') return;
          if (x && x.type === 'write') x = x.data;
          chunks.push(x); pos++;
        }));
        d(w, 'seek', () => ok()); d(w, 'truncate', () => ok()); d(w, 'abort', () => ok());
        d(w, 'close', () => ok().then(async () => { const parts = []; for (const p of chunks) parts.push(p instanceof W.Blob || p instanceof Blob ? await p.arrayBuffer() : typeof p === 'string' ? p : (p.buffer ? new Uint8Array(p.buffer, p.byteOffset || 0, p.byteLength) : p)); onDone(new Blob(parts)); }));
        const h = Object.create(W.FileSystemFileHandle.prototype);
        d(h, 'kind', 'file'); d(h, 'name', name);
        d(h, 'getFile', () => ok(new W.File([], name))); d(h, 'queryPermission', () => ok('granted')); d(h, 'requestPermission', () => ok('granted'));
        d(h, 'isSameEntry', x => ok(x === h)); d(h, 'createWritable', () => ok(w));
        return h;
      }
      /* run one engine write and get its bytes */
      function capture(run, timeout = 30000) {
        return new Promise((res, rej) => {
          const job = { res, rej };
          auto.push(job);
          const timer = setTimeout(() => { const i = auto.indexOf(job); if (i >= 0) auto.splice(i, 1); rej(new Error('engine did not write')); }, timeout);
          job.done = b => { clearTimeout(timer); res(b); };
          Promise.resolve().then(run).then(r => {
            // some commands answer with the bytes or write via a download instead of the handle
            if (r && (r.base64 || r.data) && auto.includes(job)) { auto.splice(auto.indexOf(job), 1); clearTimeout(timer); res(fromB64(r.base64 || r.data)); }
          }).catch(e => { const i = auto.indexOf(job); if (i >= 0) auto.splice(i, 1); clearTimeout(timer); rej(e); });
        });
      }
      /* bytes of the document in format f */
      async function produce(f) {
        const [how, a, extra] = f.how;
        if (how === 'bytes') { const r = await exec('file.saveBytes', { format: a }); return fromB64(r.base64 || r.data); }
        if (how === 'saveAs') return capture(() => exec('file.saveAs', Object.assign({ path: base() + '.' + a }, extra || {})));
        if (how === 'retype') return OW.ooxml.retype(await produce(working()), a);   // template / macro / show variant of the package
        if (how === 'slidePdf') return imagesToPdf(await renderSlides('jpeg', 2), 960, 540);
        if (how === 'slideImages') { const imgs = await renderSlides(a, 2); if (imgs.length === 1) return imgs[0]; const ext = a === 'jpeg' ? 'jpg' : a, files = {}; for (let i = 0; i < imgs.length; i++) files[`${base()} – ${i + 1}.${ext}`] = new Uint8Array(await imgs[i].arrayBuffer()); f.zipped = true; return OW.ooxml.writeZip(files); }
        if (how === 'outline') return outline(a);
        if (how === 'convert') { const src = await produce(working()); return OW.convert(src, cfg.ext, a); }
        if (how === 'odf') { const src = await produce(working()); return OW.odf.fromPptx(await src.arrayBuffer(), a); }
        if (how === 'export') return capture(() => exec('file.export', { path: base() + '.' + (a === 'outline' ? 'txt' : a === 'jpeg' ? 'jpg' : a), format: a, all: true }));
        if (how === 'csv') return capture(() => exec('file.exportCsv', { path: base() + '.csv' }));
        if (how === 'pdf') { const r = await exec('file.exportPdf', { sheets: 'all' }); if (r && r.base64) return fromB64(r.base64, 'application/pdf'); return capture(() => exec('file.exportPdf', { path: base() + '.pdf', sheets: 'all' })); }
        throw new Error('format');
      }
      const working = () => cfg.write.find(f => f.ext === cfg.ext);
      /* every slide as a picture (the engine renders, Office Werkstatt assembles) */
      async function renderSlides(kind, scale) {
        const info = await exec('file.info', {}), n = Math.max(1, info && info.slides || 1), out = [];
        for (let i = 0; i < n; i++) { const r = await exec('file.render', { slide: i, scale }); const png = fromB64(r.png, 'image/png'); out.push(kind === 'jpeg' ? await pngToJpeg(png) : png); }
        return out;
      }
      /* the slide texts as an outline (.txt / .rtf) */
      async function outline(kind) {
        const pptx = await produce(working()), slides = await OW.ooxml.pptxToSlides(await pptx.arrayBuffer());
        const items = slides.map((sl, i) => ({ title: (sl.title || '').trim() || (t('slide.slide') !== 'slide.slide' ? t('slide.slide') : 'Slide') + ' ' + (i + 1), body: String(sl.body || '').split('\n').map(x => x.trim()).filter(Boolean) }));
        if (kind === 'txt') return new Blob([items.map(x => x.title + '\r\n' + x.body.map(l => '\t' + l).join('\r\n')).join('\r\n\r\n') + '\r\n'], { type: 'text/plain' });
        const esc = v => v.replace(/[\\{}]/g, m => '\\' + m).replace(/[\u0080-\uffff]/g, c => '\\u' + (c.charCodeAt(0) > 32767 ? c.charCodeAt(0) - 65536 : c.charCodeAt(0)) + '?');
        return new Blob(['{\\rtf1\\ansi\\uc1\\deff0{\\fonttbl{\\f0 Calibri;}}\\f0 ' + items.map(x => '{\\b\\fs32 ' + esc(x.title) + '}\\par ' + x.body.map(l => '\\fs24\\li360 ' + esc(l) + '\\par ').join('') + '\\li0\\par ').join('') + '}'], { type: 'application/rtf' });
      }
      /* save the document into the library (working format) */
      async function librarySave() {
        const blob = await produce(working());
        // Word: saveAs moved the engine's document to <name>.docx – that is the library file, so nothing to undo
        file.content = new Blob([await blob.arrayBuffer()], { type: cfg.mime }); file.proExt = cfg.ext; file.size = blob.size; lastSaveAt = Date.now();
        return file.content;
      }
      /* write a copy in another format and hand it to the user */
      async function exportAs(name, f) {
        exporting = { name, f, extra: [] };
        try {
          const old = file.name; file.name = name;     // the engine names the output after the document
          let blob;
          try { blob = await produce(f); } finally { file.name = old; }
          const zipped = f.zipped, outExt = zipped ? 'zip' : f.ext; f.zipped = false;
          const outName = zipped ? `${name} (${f.ext.toUpperCase()}).zip` : name + '.' + outExt;
          OW.download(new Blob([await blob.arrayBuffer()], { type: blob.type || 'application/octet-stream' }), outName);
          await new Promise(r => setTimeout(r, 300));
          for (const x of exporting.extra) if (x.name !== name + '.' + outExt && x.name !== name + '.' + f.ext) OW.download(x.blob, x.name);   // e.g. one image per slide
          OW.toast(t('pro.exported', { name: OW.escape(outName) }));
          // Word's saveAs switched the open document to that file: switch it back to the library file
          if (f.how[0] === 'saveAs') { try { await librarySave(); } catch (e) { console.warn(e); } }
        } finally { exporting = null; }
      }
      async function saveAsFlow(defId) {
        const ch = await saveAsDialog(t, cfg, base(), defId || cfg.ext);
        if (!ch) return;
        busy = busy.then(async () => {
          try {
            if (ch.item.ext === cfg.ext) {   // working format → the library (renamed when the name changed)
              if (ch.name !== base()) { file.name = ch.name; const n = ctx.root.querySelector('.ed-name'); if (n) n.value = ch.name; }
              await librarySave(); if (await ctx.save()) OW.toast(t('pro.saved'));
            } else await exportAs(ch.name, ch.item);
          } catch (e) { console.error(e); OW.toast(t('pro.writeFailed') + ' ' + OW.escape(e.message || ''), 'warn'); }
        });
        return busy;
      }

      function hookEngine() {
        // the engine's own Save / Save As / Export ask for a file handle: Office Werkstatt answers
        W.showSaveFilePicker = function (opts) {
          return new W.Promise((resolve, reject) => {
            const sug = (opts && opts.suggestedName) || base() + '.' + cfg.ext;
            const job = auto.shift();
            if (job) return resolve(makeHandle(sug, b => job.done(b)));
            if (exporting) return resolve(makeHandle(sug, b => exporting && exporting.extra.push({ name: sug, blob: new Blob([b]) })));
            // started in the engine's UI (Save As › Browse, Export): our dialog, preset to the asked format
            const m = /\.([a-z0-9]+)$/i.exec(sug), asked = m ? m[1].toLowerCase() : cfg.ext;
            refusedAt = Date.now();
            reject(new W.DOMException('Office Werkstatt', 'AbortError'));
            saveAsFlow(cfg.craft && asked === cfg.craft ? 'werkzeug' : asked);
          });
        };
        // an engine "download" of a whole file → our dialog / library instead
        const A = W.HTMLAnchorElement.prototype, orig = A.click;
        A.click = function () {
          // a write Office Werkstatt asked for comes first, then further files of a running export
          const job = /^blob:/.test(this.href) && auto.shift();
          if (job) { W.fetch(this.href).then(r => r.blob()).then(b => job.done(b)); return; }
          if (exporting && /^blob:/.test(this.href)) { const href = this.href, n = this.download; W.fetch(href).then(r => r.blob()).then(async b => exporting && exporting.extra.push({ name: n, blob: new Blob([await b.arrayBuffer()]) })); return; }
          if (/^blob:/.test(this.href) && Date.now() - refusedAt < 3000) return;   // the engine's fallback after our dialog took over
          // the engine's own Save / Save As / Export (no file picker in the app): never a raw download such as
          // "<name>.deckcraft" – Office Werkstatt's Save As dialog opens instead (all formats, own format as .werkzeug)
          if (/^blob:/.test(this.href) && this.download) {
            const m = /\.([a-z0-9]+)$/i.exec(this.download), asked = m ? m[1].toLowerCase() : cfg.ext;
            refusedAt = Date.now();
            saveAsFlow(cfg.craft && asked === cfg.craft ? 'werkzeug' : asked);
            return;
          }
          return orig.apply(this, arguments);
        };
        const origOpen = W.open;
        W.open = function (url) {
          if (/release|update|download|storytold|getartcraft/i.test(String(url || ''))) { OW.checkUpdates(); return null; }
          return origOpen.apply(W, arguments);
        };
        // Ctrl+S → library, Ctrl+Shift+S → Save As dialog (the engine does not get these keys)
        W.addEventListener('keydown', e => {
          if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS') && e.isTrusted) {
            e.preventDefault(); e.stopImmediatePropagation();
            if (e.shiftKey) saveAsFlow();
            else ctx.save().then(ok => { if (ok) OW.toast(t('pro.saved')); });
          }
        }, true);
        // any real edit marks the document as changed (autosave after a pause)
        const dirty = e => { if (e.isTrusted) ctx.markDirty(); };
        W.addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey) || e.key.length === 1) dirty(e); }, true);
        W.addEventListener('pointerup', dirty, true);
        W.addEventListener('drop', dirty, true);
        // the engine draws only when something happens: keep it fresh when the pointer comes in
        frame.addEventListener('mouseenter', nudge); frame.addEventListener('focus', nudge);
      }
      function canvas() { try { return W.document.querySelector('canvas'); } catch { return null; } }
      function nudge() { const cv = canvas(); if (!cv) return; try { const r = cv.getBoundingClientRect(); cv.dispatchEvent(new W.PointerEvent('pointermove', { bubbles: true, clientX: r.width / 2, clientY: r.height / 2, pointerType: 'mouse' })); W.dispatchEvent(new W.Event('resize')); } catch { /* ignore */ } }
      async function waitLoaded() {
        const t0 = Date.now();
        while (Date.now() - t0 < 30000) {
          try { const l = W.document.querySelector('[id$="_loading"]'), cv = W.document.querySelector('canvas'); if (cv && api() && (!l || !l.isConnected || W.getComputedStyle(l).display === 'none')) return true; } catch { return false; }
          await new Promise(r => setTimeout(r, 80));
        }
        return false;
      }
      /* follow the Office Werkstatt light / dark theme. Slide's view.dark and Excel's view.darkMode only toggle
         (the `on` value is ignored), so the current state is read first */
      const parse = x => typeof x === 'string' ? JSON.parse(x) : x;
      async function syncTheme() {
        try {
          const on = document.documentElement.dataset.theme === 'dark';
          if (type === 'word') await exec('view.interfaceTheme', { value: on ? 'dark' : 'light' });
          else {
            const ui = (parse(await api().uiInspect()) || {}).ui || {};
            if (type === 'slide' && (ui.brightness === 'dark') !== on) await exec('view.dark');
            if (type === 'excel' && (ui.systemTheme || !!ui.dark !== on)) { const r = parse(await exec('view.darkMode')); if (r && r.on !== on) await exec('view.darkMode'); }
          }
          nudge();
        } catch (e) { console.warn('theme', e); }
        recover(400);
      }
      /* The engines draw a few title-bar controls that Office Werkstatt already has, or that must not be switched off:
           - Excel / Slide: their own light/dark switch – Office Werkstatt has one switch (top right) that drives the engines
           - Word: its own search box – Office Werkstatt's search (Alt+M) lists the engine's commands
           - Word / Excel: the AutoSave toggle – Office Werkstatt always saves on its own (after a pause, on close)
         They are painted into the canvas (no DOM element): find them in a screenshot of the title bar and lay a patch of
         title-bar colour over each that also swallows the clicks.
         from: count controls from that side; nth: which one (0 = outermost); min/max: plausible width (CSS px);
         gap: blank px that separate two controls; thr: colour difference that counts as "drawn" */
      const TARGETS = {
        excel: [{ from: 'right', nth: 3, min: 8, max: 44 }, { from: 'left', nth: 0, min: 40, max: 260, gap: 12 }],   // switch · comments · Share · search | AutoSave
        slide: [{ from: 'right', nth: 3, min: 8, max: 44 }],                                                       // switch · comments · Present · search
        word: [{ from: 'right', nth: 1, min: 120, max: 460, thr: 18 }, { from: 'left', nth: 0, min: 40, max: 260, gap: 12, thr: 24 }],   // search box (filled a shade lighter) · avatar | AutoSave (pale, greyed)
      }[type] || [];
      const HAS_SWITCH = TARGETS.length > 0;
      let covers = [], coverAt = null, coverTimer = 0, watch = 0, lastTry = 0;
      async function locateControls() {
        const a = api(); if (!a || !a.screenshot) return [];
        const shot = parse(await a.screenshot()), b64 = shot && (shot.data || shot.base64 || (typeof shot === 'string' ? shot : null));
        if (!b64) return [];
        const img = new Image(); img.src = 'data:image/png;base64,' + b64.replace(/^data:[^,]*,/, ''); await img.decode();
        const w = img.width, k = w / W.innerWidth, y0 = Math.round(6 * k), y1 = Math.round(30 * k);
        const c = document.createElement('canvas'); c.width = w; c.height = y1;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, y0, w, y1 - y0).data, rows = y1 - y0, px = (x, y) => (y * w + x) * 4;
        const bi = px(w - Math.max(2, Math.round(3 * k)), 0), bg = [d[bi], d[bi + 1], d[bi + 2]];
        const ink = (x, thr) => { for (let y = 0; y < rows; y++) { const i = px(x, y); if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > thr) return true; } return false; };
        const found = [];
        for (const T of TARGETS) {
          const gap = Math.round((T.gap || 9) * k), thr = T.thr || 60, parts = [], rtl = T.from === 'right';
          const x0 = rtl ? w - 1 : 0, x1 = rtl ? Math.round(w * 0.5) : Math.round(w * 0.4), step = rtl ? -1 : 1;
          let a0 = -1, a1 = -1, blank = 0;
          for (let x = x0; rtl ? x >= x1 : x <= x1; x += step) {
            if (parts.length > T.nth) break;
            if (ink(x, thr)) { if (a0 < 0) a0 = x; a1 = x; blank = 0; }
            else if (a0 >= 0 && ++blank >= gap) { parts.push([Math.min(a0, a1), Math.max(a0, a1)]); a0 = -1; }
          }
          if (a0 >= 0 && parts.length <= T.nth) parts.push([Math.min(a0, a1), Math.max(a0, a1)]);
          const p = parts[T.nth]; if (!p) continue;
          const wd = (p[1] - p[0] + 1) / k; if (wd < T.min || wd > T.max) continue;   // not what we look for: leave the bar alone
          found.push({ left: p[0] / k, right: (p[1] + 1) / k, bg: `rgb(${bg.join(',')})` });
        }
        return found;
      }
      function makeCover() {
        const el = W.document.createElement('div'); el.className = 'ow-cover';
        el.style.cssText = 'position:fixed;top:2px;height:34px;z-index:5;cursor:default;';
        ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'contextmenu', 'wheel', 'touchstart', 'touchend']
          .forEach(ev => el.addEventListener(ev, e => { e.stopPropagation(); if (!/move$/.test(ev)) e.preventDefault(); }, { passive: false }));
        W.document.body.appendChild(el); return el;
      }
      async function coverSwitch() {
        if (!HAS_SWITCH || !ready || !api()) return;
        let at = []; try { at = await locateControls(); } catch (e) { console.warn('title bar', e); }
        covers = covers.filter(el => el.isConnected);
        while (covers.length < at.length) covers.push(makeCover());
        covers.forEach((el, i) => {
          const r = at[i];
          if (!r) { el.style.display = 'none'; return; }
          Object.assign(el.style, { left: (r.left - 4) + 'px', width: (r.right - r.left + 8) + 'px', background: r.bg, display: '' });
        });
        coverAt = at.length ? at : null;
      }
      const coversMissing = () => covers.filter(el => el.isConnected && el.style.display !== 'none').length < TARGETS.length;
      function recover(ms = 350) { if (!HAS_SWITCH) return; clearTimeout(coverTimer); coverTimer = setTimeout(coverSwitch, ms); }
      /* no title bar during a slide show or on the File screen: the patch must not cover anything there */
      /* the engine's own File > Save As page offers only its few formats (and .deckcraft): Office Werkstatt's Save As dialog takes over */
      const BS_CLOSE = { slide: () => exec('app.backstage', { on: false }), excel: () => exec('ui.backstage', { page: '' }) };
      let bsBusy = false;
      async function takeOverSaveAs(st) {
        if (bsBusy || !BS_CLOSE[type] || !st || st.backstage !== 'saveAs') return false;
        bsBusy = true;
        try { await BS_CLOSE[type](); } catch (e) { console.warn(e); }
        try { await saveAsFlow(); } finally { bsBusy = false; }
        return true;
      }
      function watchScreens() {
        if (HAS_SWITCH) W.addEventListener('resize', () => recover());
        clearInterval(watch);
        watch = setInterval(async () => {
          if (!api() || !frame.isConnected) return;
          let st = null; try { st = parse(await api().uiInspect()); } catch { return; }
          if (await takeOverSaveAs(st)) return;
          if (!HAS_SWITCH) return;
          const away = !!(st && (st.backstage || st.showing || st.animPreview || (st.ui && st.ui.backstage === true)));
          if (away) { covers.forEach(el => { el.style.display = 'none'; }); return; }
          // back on the normal view, or not all found yet (e.g. Word starts on its File screen): look again, at most every 3 s
          if (coversMissing() && Date.now() - lastTry > 3000) { lastTry = Date.now(); recover(0); }
        }, 500);
      }
      /* Word: no "Developer" tab – an "Advanced" tab instead, which also holds the Zotero / citation tools */
      const ADV = { tr: ['Gelişmiş', 'Denetimler'], de: ['Erweitert', 'Steuerelemente'], en: ['Advanced', 'Controls'], es: ['Avanzado', 'Controles'], fr: ['Avancé', 'Contrôles'] };
      const ADV_NAMES = Object.values(ADV).map(x => x[0]);
      const DEV_CMDS = ['developer.richText', 'developer.plainText', 'developer.checkBox', 'developer.comboBox', 'developer.dropDown', 'developer.datePicker', 'developer.picture', 'developer.buildingBlock', 'developer.repeatingSection', 'developer.designMode', 'developer.properties'];
      const ZOT_CMDS = ['references.citation', 'references.bibliography', 'references.sources', 'references.citationStyle', 'caret.pastCitation'];
      async function setupRibbon() {
        if (type !== 'word') return;
        // only changing calls: reading the layout without parameters would open the engine's dialog
        const R = p => exec('tools.customizeRibbon', p);
        const [tabName, grpName] = ADV[OW.lang] || ADV.en;
        const KEY = 'ow-word-advanced-tab';
        let st = null; try { st = JSON.parse(localStorage.getItem(KEY)); } catch { /* none */ }
        try {
          if (!st) {
            const lay = await R({ newTab: { name: tabName, after: 'View' } });
            const mine = ((lay && lay.tabs) || []).find(x => x.custom && x.name === tabName);
            const g0 = mine && mine.groups && mine.groups[0] && mine.groups[0].name;
            if (g0 && g0 !== grpName) await R({ rename: { tab: tabName, group: g0, to: grpName } });
            else if (!g0) await R({ newGroup: { tab: tabName, name: grpName } });
            await R({ newGroup: { tab: tabName, name: 'Zotero' } });
            for (const c of DEV_CMDS) await R({ add: { tab: tabName, group: grpName, command: c } }).catch(e => console.warn('ribbon', c, e));
            for (const c of ZOT_CMDS) await R({ add: { tab: tabName, group: 'Zotero', command: c } }).catch(e => console.warn('ribbon', c, e));
            for (const t0 of ['Developer', 'Zotero']) await R({ hide: t0 }).catch(() => {});
            localStorage.setItem(KEY, JSON.stringify({ tab: tabName, group: grpName }));
          } else if (st.tab !== tabName) {   // interface language changed
            await R({ rename: { tab: st.tab, to: tabName } });
            await R({ rename: { tab: tabName, group: st.group, to: grpName } }).catch(() => {});
            localStorage.setItem(KEY, JSON.stringify({ tab: tabName, group: grpName }));
          }
        } catch (e) { console.warn('ribbon', e); }
      }
      /* open the library file in the engine */
      async function handOver() {
        let { blob, ext } = OW.proFileOf(file);
        if (!blob) return;
        if ((OW.NATIVE_OPEN[type] || []).includes(ext)) { blob = await OW.odf.toPptx(await blob.arrayBuffer()); ext = cfg.ext; }
        else if ((OW.CONV_OPEN[type] || []).includes(ext) && await OW.checkConverter()) { blob = await OW.convert(blob, ext, cfg.ext); ext = cfg.ext; }
        else if (type === 'slide' && ext === 'ppt') { blob = OW.pptToPptx(await blob.arrayBuffer()); ext = 'pptx'; }
        const name = base() + '.' + ext, b64 = await toB64(blob);
        const tries = type === 'word' ? [['file.open', { path: name, data: b64 }]]
          : type === 'excel' ? [['file.open', { name, base64: b64 }]]
          : [['file.openBytes', { name, data: b64 }], ['file.openBytes', { name, base64: b64 }]];
        let opened = false;
        for (const [id, p] of tries) { try { await exec(id, p); opened = true; break; } catch (e) { console.warn(id, e); } }
        if (!opened) dropFile(blob, name);   // older engine builds: drag & drop
        [60, 300, 800, 1500].forEach(ms => setTimeout(nudge, ms));
      }
      function dropFile(blob, name) {
        const cv = canvas(); if (!cv) return;
        const f = new W.File([blob], name), dt = new W.DataTransfer(); dt.items.add(f);
        const r = cv.getBoundingClientRect(), o = { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.width / 2, clientY: r.height / 2 };
        ['dragenter', 'dragover', 'drop'].forEach(k => cv.dispatchEvent(new W.DragEvent(k, o)));
      }

      /* ---- AI Werkzeug: the assistant works in the engine through its command API ---- */
      const T = OW.aiTool, J = x => { try { return typeof x === 'string' ? JSON.parse(x) : x; } catch { return x; } }, cut = (x, n = 14000) => { const s2 = typeof x === 'string' ? x : JSON.stringify(x); return s2.length > n ? s2.slice(0, n) + ' …(truncated)' : s2; };
      async function findCommands(q) {
        let list = J(await api().commands()); list = Array.isArray(list) ? list : (list.commands || []);
        const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
        return list.filter(c => c && c.id && words.every(w => (c.id + ' ' + c.label + ' ' + (c.menu || []).join(' ') + ' ' + (c.location || '')).toLowerCase().includes(w)))
          .slice(0, 30).map(c => ({ id: c.id, label: c.label, params: c.params || '', enabled: c.enabled !== false }));
      }
      const GENERIC = [
        T('find_commands', `Search the ${OW.TYPES[type].engine} command list (every ribbon command: formatting, styles, tables, charts, layout …). Returns ids and their parameters.`, { query: { type: 'string', description: 'words such as "bold", "table insert", "chart"' } }, ['query']),
        T('run_command', 'Run one engine command by id with its parameters (see find_commands).', { id: { type: 'string' }, params: { type: 'object' } }, ['id']),
      ];
      const plain = m => { const d = document.createElement('div'); d.innerHTML = OW.mdToHtml(m); return d.innerText; };
      const mdRows = m => { const rows = String(m).split('\n').filter(l => /^\s*\|.*\|\s*$/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => { const v = c.trim(); return v !== '' && !isNaN(+v.replace(',', '.')) && /^-?[\d.,]+$/.test(v) ? +v.replace(',', '.') : v; })); return rows.length ? rows : String(m).split('\n').filter(Boolean).map(l => [l]); };
      const AIS = {
        word: {
          label: t('type.word') + ' (Word Werkzeug)',
          suggestions: [t('ai.w.s1'), t('ai.w.s2'), t('ai.w.s3')],
          describe: async () => 'Text of the document:\n' + cut(J(await exec('document.text')), 10000),
          tools: [
            T('read_document', 'Read the whole text of the document.'),
            T('read_selection', 'Read the text the user has selected.'),
            T('insert_content', 'Write formatted content (Markdown: headings, lists, bold, tables, links) into the document.', { markdown: { type: 'string' }, position: { type: 'string', enum: ['cursor', 'end', 'start'], description: 'default: end' } }, ['markdown']),
            T('replace_document', 'Replace the WHOLE document with new content (Markdown). Only when the user asks to rewrite everything.', { markdown: { type: 'string' } }, ['markdown']),
            T('apply_style', 'Apply a paragraph style (e.g. "Heading 1", "Title", "Normal") to the paragraph at the cursor.', { style: { type: 'string' } }, ['style']),
          ].concat(GENERIC),
          async run(n, a) {
            if (n === 'read_document') return cut(J(await exec('document.text')), 30000);
            if (n === 'read_selection') return cut(J(await exec('document.selection')), 20000);
            if (n === 'insert_content' || n === 'replace_document') {
              if (n === 'replace_document') { await exec('caret.docStart'); await exec('caret.docEnd', { extend: true }); }
              else if (a.position === 'start') await exec('caret.docStart');
              else if (a.position !== 'cursor') await exec('caret.docEnd');
              await exec('edit.paste', { html: OW.mdToHtml(a.markdown || ''), text: plain(a.markdown || '') }); ctx.markDirty(); nudge(); return { ok: true };
            }
            if (n === 'apply_style') { await exec('styles.apply', { style: a.style }); ctx.markDirty(); return { ok: true }; }
            if (n === 'find_commands') return findCommands(a.query);
            if (n === 'run_command') { const r = await exec(a.id, a.params || {}); ctx.markDirty(); nudge(); return cut(J(r) === undefined ? { ok: true } : J(r)); }
          },
          async insert(m) { await exec('edit.paste', { html: OW.mdToHtml(m), text: plain(m) }); ctx.markDirty(); nudge(); },
        },
        excel: {
          label: t('type.excel') + ' (Excel Werkzeug)',
          suggestions: [t('ai.x.s1'), t('ai.x.s2'), t('ai.x.s3')],
          describe: async () => 'Used range of the active sheet (rows):\n' + cut(J(await exec('sheet.read', {})), 10000),
          tools: [
            T('read_sheet', 'Read cells as rows of values. Without range: the used range of the active sheet.', { range: { type: 'string', description: 'e.g. A1:F40' }, sheet: { type: 'string' }, formulas: { type: 'boolean' } }),
            T('write_cells', 'Write a block of values starting at a cell. Strings starting with = are formulas (English function names, comma separators).', { start: { type: 'string', description: 'top-left cell, e.g. A1' }, rows: { type: 'array', items: { type: 'array', items: {} } }, sheet: { type: 'string' } }, ['start', 'rows']),
            T('set_cell', 'Enter one value or formula into a cell.', { cell: { type: 'string' }, input: { type: 'string' }, sheet: { type: 'string' } }, ['cell', 'input']),
          ].concat(GENERIC),
          async run(n, a) {
            if (n === 'read_sheet') return cut(J(await exec('sheet.read', Object.assign({}, a.range ? { range: a.range } : {}, a.sheet ? { sheet: a.sheet } : {}, a.formulas ? { formulas: true } : {}))), 30000);
            if (n === 'write_cells') { await exec('range.setValues', Object.assign({ range: a.start || 'A1', values: a.rows || [] }, a.sheet ? { sheet: a.sheet } : {})); ctx.markDirty(); nudge(); return { ok: true }; }
            if (n === 'set_cell') { await exec('cell.set', Object.assign({ cell: a.cell, input: String(a.input) }, a.sheet ? { sheet: a.sheet } : {})); ctx.markDirty(); nudge(); return { ok: true }; }
            if (n === 'find_commands') return findCommands(a.query);
            if (n === 'run_command') { const r = await exec(a.id, a.params || {}); ctx.markDirty(); nudge(); return cut(J(r) === undefined ? { ok: true } : J(r)); }
          },
          async insert(m) { await exec('range.setValues', { values: mdRows(m) }); ctx.markDirty(); nudge(); },
        },
        slide: {
          label: t('type.slide') + ' (Slide Werkzeug)',
          suggestions: [t('ai.p.s1'), t('ai.p.s2'), t('ai.p.s3')],
          describe: async () => 'Presentation: ' + cut(J(await exec('file.info', {})), 2000) + '\nContent:\n' + cut(J(await api().docInspect()), 9000),
          tools: [
            T('read_presentation', 'Read the slides with their shapes (ids) and texts.'),
            T('add_slide', 'Add a slide with a title and bullet points.', { title: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } }, layout: { type: 'string', description: 'title, titleAndContent (default), sectionHeader, twoContent, comparison, titleOnly, blank' }, at: { type: 'integer', description: '0-based position (default: after the current slide)' } }, ['title']),
            T('set_text', 'Replace the text of a shape (id from read_presentation); \\n starts a new paragraph.', { id: { type: ['string', 'integer'] }, text: { type: 'string' } }, ['id', 'text']),
          ].concat(GENERIC),
          async run(n, a) {
            if (n === 'read_presentation') return cut(J(await api().docInspect()), 30000);
            if (n === 'add_slide') {
              // layout kinds differ between themes: try the kind, its usual name, then the theme's default layout
              const kind = a.layout || ((a.bullets && a.bullets.length) ? 'titleAndContent' : 'title'), NAMES = { title: 'Title Slide', titleAndContent: 'Title and Content', sectionHeader: 'Section Header', twoContent: 'Two Content', comparison: 'Comparison', titleOnly: 'Title Only', blank: 'Blank' };
              const p0 = Object.assign({ title: a.title || '', body: (a.bullets || []).join('\n') }, a.at != null ? { at: a.at } : {});
              let made = null;
              for (const lay of [kind, NAMES[kind], null]) { try { made = J(await exec('slide.new', lay ? Object.assign({ layout: lay }, p0) : p0)); break; } catch (e) { if (lay === null) throw e; } }
              // a deck without placeholder layouts (e.g. converted from an older file): put the texts in text boxes
              try {
                const info = J(await api().docInspect()), sl = (info.slides || []).find(x => made && x.id === made.id), [W2, H2] = info.slideSize || [960, 540];
                if (sl && !sl.shapes) {
                  if (a.title) await exec('insert.textBox', { rect: [48, 36, W2 - 96, 90], text: a.title });
                  if (a.bullets && a.bullets.length) await exec('insert.textBox', { rect: [48, 140, W2 - 96, H2 - 180], text: a.bullets.map(x => '• ' + x).join('\n') });
                }
              } catch (e) { console.warn('add_slide', e); }
              ctx.markDirty(); nudge(); return { ok: true, slide: made };
            }
            if (n === 'set_text') { await exec('text.set', { id: a.id, text: a.text }); ctx.markDirty(); nudge(); return { ok: true }; }
            if (n === 'find_commands') return findCommands(a.query);
            if (n === 'run_command') { const r = await exec(a.id, a.params || {}); ctx.markDirty(); nudge(); return cut(J(r) === undefined ? { ok: true } : J(r)); }
          },
          async insert(m) { const lines = plain(m).split('\n').map(x => x.trim()).filter(Boolean); await AIS.slide.run('add_slide', { title: lines[0] || '', bullets: lines.slice(1) }); },
        },
      }, AI = AIS[type];

      ctx.exports = cfg.write.filter(f => f.ext !== cfg.ext).map(f => ({ label: `${fmtLabel(t, cfg, f)} (.${f.ext})`, fn: () => { busy = busy.then(() => exportAs(base(), f).catch(e => OW.toast(t('pro.writeFailed') + ' ' + OW.escape(e.message || ''), 'warn'))); } }));

      return {
        chrome: 'engine',
        ribbonMode: 'simplified',
        saveDelay: 20000,                                    // autosave 20 s after the last edit
        ribbon: () => [{ id: 'start', label: t('tab.home'), groups: [] }],
        mount(body) {
          body.innerHTML = `<div class="pro-host"><iframe class="engine-frame pro-frame" title="${OW.escape(OW.TYPES[type].engine)}"></iframe><div class="pro-loading">${OW.appGlyph(type, 48)}<span>${OW.escape(OW.TYPES[type].engine)} …</span></div></div>`;
          frame = body.querySelector('iframe');
          frame.addEventListener('load', async () => {
            try { W = frame.contentWindow; W.document; } catch { W = null; }
            if (!W) return;
            hookEngine();
            ready = await waitLoaded();
            if (ready) { syncTheme(); watchScreens(); setupRibbon(); try { await handOver(); } catch (e) { console.error(e); OW.toast(t('pro.openFailed'), 'warn'); } }
            const l = body.querySelector('.pro-loading'); if (l) l.remove();
            try { frame.focus(); } catch { /* ignore */ }
          }, { once: true });
          frame.src = `engines/${type}/index.html`;
        },
        async getContent() {
          if (ready && Date.now() - lastSaveAt > 400) await (busy = busy.then(() => librarySave()));
          return file.content;
        },
        status: () => ({ left: OW.TYPES[type].engine, right: '' }),
        get ai() { return ready ? AI : null; },
        /* the title-bar search (Alt+M) lists the engine's own commands */
        async commands() {
          let list = []; try { list = parse(await api().commands()); list = Array.isArray(list) ? list : (list.commands || []); } catch { return []; }
          return list.filter(c => c && c.id && c.label && c.enabled !== false && ((c.menu && c.menu.length) || c.location))
            .map(c => ({ label: c.label, hint: c.location || c.menu.join(' › '), icon: 'bolt',
              onClick: () => { try { frame.focus(); } catch { /* ignore */ } exec(c.id).then(nudge).catch(e => OW.toast(OW.escape(c.label) + ': ' + OW.escape(String((e && e.message) || e)), 'warn')); } }));
        },
        onTheme: () => { if (ready) syncTheme(); },
        print() { exec('file.print').catch(() => OW.toast(t('unsupported'))); },
        saveAs: () => saveAsFlow(),
        destroy() { clearInterval(watch); clearTimeout(coverTimer); auto.splice(0).forEach(j => j.rej && j.rej(new Error('closed'))); },
      };
    };
  }
})();
