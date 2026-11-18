/* Word / Excel / Slide Werkzeug Pro – the full engines are THE editors (no separate simple view).
 *
 * The engines (engines/<type>/index.html, WebAssembly) are complete office apps with their own menus.
 * Office Werkstatt connects them to its library:
 *   open  – the document is handed to the engine as a file (drag & drop event): the stored engine file,
 *           or – for older documents / templates – a .docx / .xlsx / .pptx made from the old content
 *   save  – when the engine saves (Ctrl+S, its Save button) it produces a download; that file is taken
 *           into the library instead. Office Werkstatt also asks the engine to save on its own while
 *           closing, when the language changes and after editing pauses (autosave).
 * Without an installed engine the built-in editors are used as before (OW.editors.<type>). */
window.OW = window.OW || {};
OW.proEditors = OW.proEditors || {};
(function () {
  const CFG = {
    word: { ext: 'docx', native: ['docx', 'wordcraft'], mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    excel: { ext: 'xlsx', native: ['xlsx', 'gridcraft'], mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    slide: { ext: 'pptx', native: ['pptx', 'deckcraft'], mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  };
  OW.PRO_CFG = CFG;

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
      const ext = (file.proExt || cfg.ext).replace(/^\./, '');
      return { blob: file.content, ext };
    }
    return { blob: legacyToFile(file.type, file.content), ext: cfg.ext };
  };

  for (const type of Object.keys(CFG)) {
    OW.proEditors[type] = async function (ctx) {
      const t = ctx.t, cfg = CFG[type], file = ctx.file;
      let frame = null, W = null, ready = false, waiters = [], lastSaveAt = 0;

      const nativeExt = name => { const m = /\.([a-z0-9]+)$/i.exec(name || ''); return m && cfg.native.includes(m[1].toLowerCase()) ? m[1].toLowerCase() : null; };

      async function capture(blob, ext) {
        // the engine's Blob belongs to the iframe: copy it into this window, otherwise
        // "instanceof Blob" fails and the library would store an empty object
        blob = new Blob([await blob.arrayBuffer()], { type: ext === cfg.ext ? cfg.mime : 'application/octet-stream' });
        lastSaveAt = Date.now();
        file.content = blob; file.proExt = ext; file.size = blob.size;
        const w = waiters; waiters = []; w.forEach(r => r(blob));
        return blob;
      }
      function hookEngine() {
        // the engine "downloads" its file when it saves → keep it in the library instead
        const A = W.HTMLAnchorElement.prototype, orig = A.click;
        A.click = function () {
          const ext = this.download && nativeExt(this.download);
          if (ext && /^blob:/.test(this.href)) {
            const href = this.href, requested = waiters.length > 0;   // requested = Office Werkstatt asked for it (autosave/close)
            W.fetch(href).then(r => r.blob()).then(b => capture(b, ext))
              .then(() => requested ? null : ctx.save().then(ok => { if (ok) OW.toast(t('pro.saved')); }))
              .catch(e => console.error(e));
            return;                                          // no file download
          }
          return orig.apply(this, arguments);                // exports (PDF, CSV, …) download as usual
        };
        // any edit marks the document as changed (autosave after a pause)
        // only real user input counts (our own drop / Ctrl+S are synthetic and must not mark it changed)
        const dirty = e => { if (e.isTrusted) ctx.markDirty(); };
        W.addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey) || e.key.length === 1) dirty(e); }, true);
        W.addEventListener('pointerup', dirty, true);
        W.addEventListener('drop', dirty, true);
      }
      function canvas() { try { return W.document.querySelector('canvas'); } catch { return null; } }
      /* ask the engine to save (same as pressing Ctrl+S in it) and wait for the file */
      function requestSave(timeout = 5000) {
        const cv = canvas(); if (!ready || !cv) return Promise.resolve(null);
        return new Promise(res => {
          const timer = setTimeout(() => { waiters = waiters.filter(x => x !== done); res(null); }, timeout);
          function done(b) { clearTimeout(timer); res(b); }
          waiters.push(done);
          // the engine takes keys only while it has the focus (then from its hidden text field):
          // focus it first, then send Ctrl+S to whatever it focused
          try { frame.focus(); cv.focus(); } catch { /* ignore */ }
          setTimeout(() => {
            const ae = W.document.activeElement, target = ae && ae !== W.document.body && ae !== W.document.documentElement ? ae : cv;
            // a complete key sequence – the Ctrl key must be released again, otherwise the engine
            // keeps treating every following key as a shortcut and typing stops working
            const k = (type, key, code, keyCode, ctrl) => target.dispatchEvent(new W.KeyboardEvent(type, { key, code, keyCode, which: keyCode, ctrlKey: ctrl, bubbles: true, cancelable: true }));
            k('keydown', 'Control', 'ControlLeft', 17, true);
            k('keydown', 's', 'KeyS', 83, true);
            setTimeout(() => { k('keyup', 's', 'KeyS', 83, true); k('keyup', 'Control', 'ControlLeft', 17, false); }, 40);
          }, 120);
        });
      }
      async function waitLoaded() {
        const t0 = Date.now();
        while (Date.now() - t0 < 30000) {
          try { const l = W.document.querySelector('[id$="_loading"]'), cv = W.document.querySelector('canvas'); if (cv && (!l || !l.isConnected || W.getComputedStyle(l).display === 'none')) return true; } catch { return false; }
          await new Promise(r => setTimeout(r, 80));
        }
        return false;
      }
      async function handOver() {
        const { blob, ext } = OW.proFileOf(file);
        if (!blob) return;
        const cv = canvas(); if (!cv) return;
        const name = OW.safeName(file.name) + '.' + ext;
        const f = new W.File([blob], name, { type: ext === cfg.ext ? cfg.mime : 'application/octet-stream' });
        const dt = new W.DataTransfer(); dt.items.add(f);
        const r = cv.getBoundingClientRect(), o = { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.width / 2, clientY: r.height / 2 };
        cv.dispatchEvent(new W.DragEvent('dragenter', o)); cv.dispatchEvent(new W.DragEvent('dragover', o)); cv.dispatchEvent(new W.DragEvent('drop', o));
        // the engine repaints on input only: nudge it so the opened document shows at once
        const nudge = () => { try { cv.dispatchEvent(new W.PointerEvent('pointermove', { bubbles: true, clientX: o.clientX, clientY: o.clientY, pointerType: 'mouse' })); cv.dispatchEvent(new W.MouseEvent('mousemove', { bubbles: true, clientX: o.clientX, clientY: o.clientY })); W.dispatchEvent(new W.Event('resize')); } catch { /* ignore */ } };
        [50, 250, 600, 1200].forEach(ms => setTimeout(nudge, ms));
      }

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
            if (ready) { await new Promise(r => setTimeout(r, 150)); await handOver(); }
            const l = body.querySelector('.pro-loading'); if (l) l.remove();
            try { frame.focus(); } catch { /* ignore */ }
          }, { once: true });
          frame.src = `engines/${type}/index.html`;
        },
        async getContent() {
          if (Date.now() - lastSaveAt > 400 && ready) {
            const b = await requestSave();
            // edits that could not be fetched from the engine must not be reported as saved
            if (!b) throw new Error(OW.TYPES[type].engine + ': no file');
          }
          return file.content;
        },
        status: () => ({ left: OW.TYPES[type].engine, right: '' }),
        print() { try { W && W.print(); } catch { OW.toast(t('unsupported')); } },
        destroy() { waiters.forEach(r => r(null)); waiters = []; },
      };
    };
  }
})();
