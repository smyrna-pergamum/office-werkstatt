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
    if (type === 'slide') return X.slidesToPptx({ theme: (c && c.theme) || 'office', slides: (c && c.slides && c.slides.length) ? c.slides : [{ els: [] }] }, OW.SLIDE_THEMES);
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
    const items = cfg.write.map(f => ({ id: f.id || f.ext, f }));
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
      /* follow the Office Werkstatt light / dark theme (the engines have their own setting) */
      let themeCmd;
      async function syncTheme() {
        try {
          if (themeCmd === undefined) {
            const c = await api().commands(), list = Array.isArray(c) ? c : (c.commands || c);
            const pick = re => list.find(x => re.test(x.id));
            themeCmd = (pick(/^view\.interfaceTheme$/) || pick(/^view\.theme$/) || pick(/^view\.dark$/) || pick(/^(app|ui)\.(interfaceTheme|theme|appearance|colorScheme)$/i) || {}).id || null;
          }
          const isDark = document.documentElement.dataset.theme === 'dark';
          if (themeCmd) await exec(themeCmd, themeCmd === 'view.dark' ? { on: isDark } : { value: isDark ? 'dark' : 'light' });
          nudge();
        } catch (e) { console.warn('theme', e); }
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
        if (type === 'slide' && ext === 'ppt') { blob = OW.pptToPptx(await blob.arrayBuffer()); ext = 'pptx'; }
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
            if (ready) { syncTheme(); setupRibbon(); try { await handOver(); } catch (e) { console.error(e); OW.toast(t('pro.openFailed'), 'warn'); } }
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
        onTheme: () => { if (ready) syncTheme(); },
        print() { exec('file.print').catch(() => OW.toast(t('unsupported'))); },
        saveAs: () => saveAsFlow(),
        destroy() { auto.splice(0).forEach(j => j.rej && j.rej(new Error('closed'))); },
      };
    };
  }
})();
