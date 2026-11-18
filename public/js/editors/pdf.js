/* PDF Werkzeug – integrates PDF Werkstatt (github.com/smyrna-pergamum/PDF-Werkstatt) in red tones.
 * engines/pdf/index.html = the offline single-file build of PDF Werkstatt (patched to red by scripts/fetch-engines).
 * At runtime the red palette is injected as well, so even an unpatched copy turns red.
 * Without the engine a built-in viewer (the browser's own PDF renderer, works offline) is used. */
OW.PDF_RED_CSS = `:root,html{--cobalt:#C62828!important;--cobalt-strong:#8E1B1B!important;--cobalt-wash:#FDECEA!important}
html[data-theme="dark"]{--cobalt:#F28B82!important;--cobalt-strong:#F6AEA9!important;--cobalt-wash:#3A1D1B!important}`;

OW.editors.pdf = async function (ctx) {
  const t = ctx.t, I = OW.icon;
  let blob = ctx.file.content instanceof Blob ? ctx.file.content : null;
  const hasEngine = !!(OW.engines && OW.engines.pdf);
  let frame, holder, url;

  function themeFrame() {
    try {
      const d = frame.contentDocument; if (!d) return;
      if (!d.getElementById('ow-red')) { const s = d.createElement('style'); s.id = 'ow-red'; s.textContent = OW.PDF_RED_CSS; d.head.appendChild(s); }
      d.documentElement.setAttribute('data-theme', document.documentElement.dataset.theme);
    } catch { /* file:// – engine copy is already patched red */ }
  }
  function sendFile(b, name) {
    try {
      const f = new File([b], name.endsWith('.pdf') ? name : name + '.pdf', { type: 'application/pdf' });
      const dt = new DataTransfer(); dt.items.add(f);
      frame.contentWindow.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    } catch { OW.toast(t('pdf.dropManually')); }
  }
  function hookSaves() {
    // when PDF Werkstatt saves/exports a PDF, keep a copy in the Office Werkstatt library
    try {
      const W = frame.contentWindow, orig = W.HTMLAnchorElement.prototype.click;
      W.HTMLAnchorElement.prototype.click = function () {
        if (this.download && /\.pdf$/i.test(this.download) && /^blob:/.test(this.href)) {
          fetch(this.href).then(r => r.blob()).then(async b => { blob = b; ctx.file.content = b; ctx.file.size = b.size; await ctx.save(); OW.toast(t('pdf.savedToLibrary')); });
        }
        return orig.apply(this, arguments);
      };
    } catch { /* cross-origin (file://) */ }
  }
  function mountEngine() {
    try { localStorage.setItem('pdf-workshop.language', ['tr', 'de', 'en'].includes(OW.lang) ? OW.lang : 'en'); } catch {}
    holder.innerHTML = '<iframe class="pdf-engine" title="PDF Werkstatt"></iframe>';
    frame = holder.querySelector('iframe');
    let started = false;
    function engineReady() {
      if (started || !frame.isConnected) return; started = true;
      themeFrame(); hookSaves();
      if (blob) sendFile(blob, ctx.file.name);
    }
    // Start as soon as PDF Werkstatt has set itself up. Do not wait for the iframe's load event:
    // that one also waits for the engine's background downloads (extra fonts).
    (function poll(n) {
      if (started || !frame.isConnected) return;
      try { const w = frame.contentWindow; if (w.__pdfWorkshop && /\/engines\/pdf\/index\.html$/.test(w.location.pathname)) return engineReady(); }
      catch { return; /* file:// – cannot look inside, the load event below takes over */ }
      if (n < 1200) setTimeout(() => poll(n + 1), 25);
    })(0);
    frame.addEventListener('load', () => { if (started) themeFrame(); else setTimeout(engineReady, 400); });
    frame.src = 'engines/pdf/index.html';
  }
  function mountViewer() {
    if (!blob) {
      holder.innerHTML = `<div class="pdf-empty">${OW.appGlyph('pdf', 64)}<h2>${t('pdf.openTitle')}</h2><p>${t('pdf.openHint')}</p><button class="btn primary pdf-open">${I('upload', 18)}<span>${t('pdf.choose')}</span></button><p class="muted small">${t('pdf.engineMissing')}</p></div>`;
      holder.querySelector('.pdf-open').onclick = pick;
      return;
    }
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    holder.innerHTML = `<iframe class="pdf-native" title="PDF" src="${url}#toolbar=1&view=FitH"></iframe>`;
  }
  function pick() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf,.pdf';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; blob = f; ctx.file.content = f; ctx.file.size = f.size; if (/^(Unbenannt|Untitled|Adsız|Sin título|Sans titre)/.test(ctx.file.name)) { ctx.file.name = f.name.replace(/\.pdf$/i, ''); ctx.root.querySelector('.ed-name').value = ctx.file.name; } await ctx.save(); hasEngine ? sendFile(f, f.name) : mountViewer(); };
    inp.click();
  }

  const R = [
    { id: 'start', label: t('tab.home'), groups: [
      { items: [{ icon: 'upload', label: t('pdf.choose'), onClick: pick }, { icon: 'download', label: t('download'), onClick: () => blob ? OW.download(blob, OW.safeName(ctx.file.name) + '.pdf') : OW.toast(t('pdf.noFile')) }, { icon: 'print', label: t('bs.print'), onClick: () => { try { frame ? frame.contentWindow.print() : holder.querySelector('iframe').contentWindow.print(); } catch { OW.toast(t('unsupported')); } } }] },
      ...(hasEngine ? [] : [{ items: [{ icon: 'sparkle', label: t('pdf.getEngine'), onClick: () => OW.alert(t('pdf.getEngine'), t('pdf.engineHowto')) }] }]),
      { items: [{ icon: 'expand', label: t('focusMode'), onClick: () => ctx.root.classList.toggle('focus') }] },
    ] },
  ];
  ctx.exports = [{ label: 'PDF (.pdf)', fn: () => blob ? OW.download(blob, OW.safeName(ctx.file.name) + '.pdf') : OW.toast(t('pdf.noFile')) }];

  return {
    ribbonMode: 'simplified',
    ribbon: () => R,
    mount(body) { body.innerHTML = '<div class="pdf-host"></div>'; holder = body.querySelector('.pdf-host'); hasEngine ? mountEngine() : mountViewer(); },
    getContent: () => blob,
    status: () => ({ left: hasEngine ? 'PDF Werkstatt · ' + t('pdf.engineActive') : t('pdf.builtinViewer'), right: blob ? (blob.size / 1048576).toFixed(2) + ' MB' : '' }),
    onTheme: themeFrame,
    destroy() { if (url) URL.revokeObjectURL(url); },
  };
};
