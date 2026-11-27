/* PDF Werkzeug – integrates PDF Werkstatt (github.com/smyrna-pergamum/PDF-Werkstatt) in red tones.
 * engines/pdf/index.html = the offline single-file build of PDF Werkstatt (patched to red by scripts/fetch-engines).
 * At runtime the red palette is injected as well, so even an unpatched copy turns red.
 * Without the engine a built-in viewer (the browser's own PDF renderer, works offline) is used. */
OW.PDF_RED_CSS = `#languageSelect,#themeBtn{display:none!important}
:root,html{--cobalt:#C62828!important;--cobalt-strong:#8E1B1B!important;--cobalt-wash:#FDECEA!important}
html[data-theme="dark"]{--cobalt:#F28B82!important;--cobalt-strong:#F6AEA9!important;--cobalt-wash:#3A1D1B!important}`;

/* the PDF Werkzeug ribbon (Office Werkstatt's own menu, like Note / Draw / Design) */
OW.addStrings(`
pdfr.edit | Edit | Bearbeiten | Düzenle | Editar | Modifier
pdfr.comment | Comment | Kommentieren | Yorum | Comentar | Commentaire
pdfr.forms | Forms | Formulare | Formlar | Formularios | Formulaires
pdfr.protect | Protect | Schützen | Koru | Proteger | Protéger
pdfr.convert | Convert | Konvertieren | Dönüştür | Convertir | Convertir
pdfr.open | Open | Öffnen | Aç | Abrir | Ouvrir
pdfr.save | Save | Speichern | Kaydet | Guardar | Enregistrer
pdfr.saveAs | Save as | Speichern unter | Farklı kaydet | Guardar como | Enregistrer sous
pdfr.print | Print | Drucken | Yazdır | Imprimir | Imprimer
pdfr.select | Select | Auswählen | Seç | Seleccionar | Sélectionner
pdfr.editText | Edit text | Text bearbeiten | Metni düzenle | Editar texto | Modifier le texte
pdfr.addText | Add text | Text hinzufügen | Metin ekle | Añadir texto | Ajouter du texte
pdfr.image | Image | Bild | Resim | Imagen | Image
pdfr.sign | Signature | Unterschrift | İmza | Firma | Signature
pdfr.highlight | Highlight | Markieren | Vurgula | Resaltar | Surligner
pdfr.ink | Pen | Stift | Kalem | Lápiz | Stylo
pdfr.note | Sticky note | Haftnotiz | Yapışkan not | Nota adhesiva | Note adhésive
pdfr.rect | Rectangle | Rechteck | Dikdörtgen | Rectángulo | Rectangle
pdfr.whiteout | Cover with white | Weiß abdecken | Beyazla ört | Cubrir con blanco | Masquer en blanc
pdfr.stamp | Stamp | Stempel | Damga | Sello | Tampon
pdfr.date | Date | Datum | Tarih | Fecha | Date
pdfr.check | Check mark | Häkchen | Onay işareti | Marca de verificación | Coche
pdfr.cross | Cross | Kreuz | Çarpı | Aspa | Croix
pdfr.link | Link | Link | Bağlantı | Enlace | Lien
pdfr.decor | Watermark and numbers | Wasserzeichen und Nummern | Filigran ve numara | Marca de agua y números | Filigrane et numéros
pdfr.pages | Pages | Seiten | Sayfalar | Páginas | Pages
pdfr.rotL | Rotate left | Nach links drehen | Sola döndür | Girar a la izquierda | Faire pivoter à gauche
pdfr.rotR | Rotate right | Nach rechts drehen | Sağa döndür | Girar a la derecha | Faire pivoter à droite
pdfr.delPage | Delete page | Seite löschen | Sayfayı sil | Eliminar página | Supprimer la page
pdfr.blank | Blank page | Leere Seite | Boş sayfa | Página en blanco | Page blanche
pdfr.fromFile | Pages from file | Seiten aus Datei | Dosyadan sayfa | Páginas de archivo | Pages d’un fichier
pdfr.extract | Extract pages | Seiten extrahieren | Sayfaları ayıkla | Extraer páginas | Extraire des pages
pdfr.split | Split | Teilen | Böl | Dividir | Diviser
pdfr.combine | Combine | Zusammenführen | Birleştir | Combinar | Combiner
pdfr.comments | Comments | Kommentare | Yorumlar | Comentarios | Commentaires
pdfr.delSel | Delete selection | Auswahl löschen | Seçileni sil | Eliminar selección | Supprimer la sélection
pdfr.fill | Fill and sign | Ausfüllen und unterschreiben | Doldur ve İmzala | Rellenar y firmar | Remplir et signer
pdfr.signCreate | Create signature | Unterschrift erstellen | İmza oluştur | Crear firma | Créer une signature
pdfr.protectPw | Protect with password | Mit Kennwort schützen | Parola ile koru | Proteger con contraseña | Protéger par mot de passe
pdfr.redact | Redact | Schwärzen | Karart | Censurar | Caviarder
pdfr.props | Document properties | Dokumenteigenschaften | Belge özellikleri | Propiedades del documento | Propriétés du document
pdfr.ocr | Text recognition (OCR) | Texterkennung (OCR) | Metin tanıma (OCR) | Reconocimiento de texto (OCR) | Reconnaissance de texte (OCR)
pdfr.fontinfo | Identify text format | Textformat erkennen | Yazı biçimini tanı | Identificar formato | Identifier le format
pdfr.toTxt | Plain text | Nur-Text | Düz metin | Texto sin formato | Texte brut
pdfr.toPng | Image (PNG) | Bild (PNG) | Resim (PNG) | Imagen (PNG) | Image (PNG)
pdfr.toJpg | Image (JPEG) | Bild (JPEG) | Resim (JPEG) | Imagen (JPEG) | Image (JPEG)
pdfr.export | More formats | Weitere Formate | Diğer biçimler | Más formatos | Autres formats
pdfr.create | PDF from images | PDF aus Bildern | Görsellerden PDF | PDF a partir de imágenes | PDF à partir d’images
pdfr.thumbs | Thumbnails | Miniaturen | Küçük resimler | Miniaturas | Miniatures
pdfr.pane | Tools pane | Werkzeugbereich | Araç paneli | Panel de herramientas | Panneau des outils
pdfr.fitW | Fit width | An Breite anpassen | Genişliğe sığdır | Ajustar al ancho | Ajuster à la largeur
pdfr.fitP | Fit page | An Seite anpassen | Sayfaya sığdır | Ajustar a la página | Ajuster à la page
pdfr.prev | Previous page | Vorherige Seite | Önceki sayfa | Página anterior | Page précédente
pdfr.next | Next page | Nächste Seite | Sonraki sayfa | Página siguiente | Page suivante
pdfr.tools | All tools | Alle Werkzeuge | Tüm araçlar | Todas las herramientas | Tous les outils
pdfr.openUrl | Open from URL | Von URL öffnen | URL’den aç | Abrir desde URL | Ouvrir depuis une URL
pdfr.guide | User guide | Bedienungsanleitung | Kullanım kılavuzu | Guía de uso | Guide d’utilisation
pdfr.search | Search document | Im Dokument suchen | Belgede ara | Buscar en el documento | Rechercher dans le document
`);

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
          fetch(this.href).then(r => r.blob()).then(async b => { blob = b; ctx.file.content = b; ctx.file.size = b.size; if (await ctx.save()) OW.toast(t('pdf.savedToLibrary')); }).catch(e => console.error(e));
        }
        return orig.apply(this, arguments);
      };
    } catch { /* cross-origin (file://) */ }
  }
  function mountEngine() {
    try { localStorage.setItem('pdf-workshop.language', ['tr', 'de', 'en', 'fr', 'es'].includes(OW.lang) ? OW.lang : 'en'); } catch {}
    holder.innerHTML = '<iframe class="pdf-engine" title="PDF Werkstatt"></iframe>';
    frame = holder.querySelector('iframe');
    let started = false;
    function engineReady() {
      if (started || !frame.isConnected) return; started = true;
      themeFrame(); hookSaves();
      try { const p = frame.contentWindow.__pdfWorkshop; p.onState = onState; if (p.ribbon) p.ribbon.embed(true); if (p.ui) onState(p.ui.state()); } catch { /* file:// */ }
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
  // print the document (not the PDF Werkstatt interface): use the engine's own print view
  function printPdf() {
    try {
      const W = frame && frame.contentWindow, P = W && W.__pdfWorkshop;
      if (P && P.printDoc) { if (!P.S || !P.S.doc) return OW.toast(t('pdf.openFirst')); return P.printDoc().catch(e => OW.toast(OW.escape(e && e.message || t('print.failed')), 'warn')); }
      const f = holder.querySelector('iframe'); if (f) f.contentWindow.print(); else OW.toast(t('pdf.noFile'));
    } catch { OW.toast(t('unsupported')); }
  }
  function pick() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf,.pdf';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; blob = f; ctx.file.content = f; ctx.file.size = f.size; if (/^(Unbenannt|Untitled|Adsız|Sin título|Sans titre)/.test(ctx.file.name)) { ctx.file.name = f.name.replace(/\.pdf$/i, ''); ctx.root.querySelector('.ed-name').value = ctx.file.name; } await ctx.save(); hasEngine ? sendFile(f, f.name) : mountViewer(); };
    inp.click();
  }

  /* with PDF Werkstatt: the same title bar, tabs and ribbon as Note / Draw / Design; the buttons run the engine's commands */
  let st = {};
  const P = () => { try { return frame && frame.contentWindow && frame.contentWindow.__pdfWorkshop; } catch { return null; } };
  const run = (name, ...a) => () => { const p = P(); if (p && p.ui) p.ui.cmd(name, ...a); else OW.toast(t('pdf.openFirst')); };
  const B = (icon, key, cmd, o = {}) => Object.assign({ icon, label: o.noLabel ? undefined : t('pdfr.' + key), title: t('pdfr.' + key), onClick: run(cmd) }, o.active ? { active: o.active } : {});
  const Mode = m => () => st.mode === m && !st.organize;
  const zoomPct = () => st.fit === 'width' ? t('pdfr.fitW') : st.fit === 'page' ? t('pdfr.fitP') : Math.round((st.zoom || 1) * 100) + ' %';
  const RE = [
    { id: 'start', label: t('tab.home'), groups: [
      { items: [B('undo', 'undo', 'undo', { noLabel: true }), B('redo', 'redo', 'redo', { noLabel: true })] },
      { items: [B('upload', 'open', 'open'), B('save', 'save', 'save'), B('print', 'print', 'print', { noLabel: true })] },
      { items: [B('pointer', 'select', 'select', { active: Mode('select') }), B('text', 'editText', 'editText', { active: Mode('native') }), B('plus', 'addText', 'addText', { active: Mode('text') }), B('image', 'image', 'image'), B('signature', 'sign', 'sign', { active: Mode('sign') })] },
      { items: [B('highlight', 'highlight', 'highlight', { active: Mode('highlight') }), B('pen', 'ink', 'ink', { active: Mode('ink') }), B('note', 'note', 'note', { active: Mode('note') })] },
      { items: [B('pages', 'pages', 'organize', { active: () => st.organize }), { t: 'menu', icon: 'rotate', title: t('pdfr.rotR'), items: () => [{ icon: 'rotate', label: t('pdfr.rotL'), onClick: run('rotL') }, { icon: 'rotate', label: t('pdfr.rotR'), onClick: run('rotR') }] }, B('trash', 'delPage', 'delPage', { noLabel: true })] },
      { items: [B('grid', 'tools', 'tools')] },
    ] },
    { id: 'insert', label: t('tab.insert'), groups: [
      { items: [B('plus', 'addText', 'addText', { active: Mode('text') }), B('image', 'image', 'image'), B('signature', 'sign', 'sign', { active: Mode('sign') })] },
      { items: [B('stamp', 'stamp', 'stamp'), B('calendar', 'date', 'date', { active: Mode('date') }), B('check', 'check', 'check', { active: Mode('check'), noLabel: true }), B('x', 'cross', 'cross', { active: Mode('cross'), noLabel: true })] },
      { items: [B('note', 'note', 'note', { active: Mode('note') }), B('square', 'rect', 'rect', { active: Mode('rect') }), B('link', 'link', 'link')] },
      { items: [B('filePlus', 'blank', 'blank'), B('upload', 'fromFile', 'fromFile'), B('layers', 'decor', 'decor')] },
    ] },
    { id: 'edit', label: t('pdfr.edit'), groups: [
      { items: [B('text', 'editText', 'editText', { active: Mode('native') }), B('plus', 'addText', 'addText', { active: Mode('text') }), B('image', 'image', 'image'), B('eraserFmt', 'whiteout', 'whiteout', { active: Mode('whiteout') }), B('paragraph', 'fontinfo', 'fontinfo')] },
      { items: [B('pages', 'pages', 'organize', { active: () => st.organize }), { t: 'menu', icon: 'rotate', label: t('pdfr.rotR'), items: () => [{ icon: 'rotate', label: t('pdfr.rotL'), onClick: run('rotL') }, { icon: 'rotate', label: t('pdfr.rotR'), onClick: run('rotR') }] }, B('trash', 'delPage', 'delPage'), B('filePlus', 'blank', 'blank')] },
      { items: [B('download', 'extract', 'extract'), B('scissors', 'split', 'split'), B('merge', 'combine', 'combine')] },
    ] },
    { id: 'comment', label: t('pdfr.comment'), groups: [
      { items: [B('highlight', 'highlight', 'highlight', { active: Mode('highlight') }), B('pen', 'ink', 'ink', { active: Mode('ink') }), B('note', 'note', 'note', { active: Mode('note') }), B('square', 'rect', 'rect', { active: Mode('rect') }), B('stamp', 'stamp', 'stamp')] },
      { items: [B('comment', 'comments', 'comments'), B('trash', 'delSel', 'delSel')] },
    ] },
    { id: 'forms', label: t('pdfr.forms'), groups: [
      { items: [B('checklist', 'fill', 'fill'), B('signature', 'signCreate', 'sign')] },
      { items: [B('plus', 'addText', 'addText', { active: Mode('text') }), B('calendar', 'date', 'date', { active: Mode('date') }), B('check', 'check', 'check', { active: Mode('check') }), B('x', 'cross', 'cross', { active: Mode('cross') })] },
    ] },
    { id: 'protect', label: t('pdfr.protect'), groups: [
      { items: [B('lock', 'protectPw', 'protect'), B('eye', 'redact', 'redact', { active: Mode('redact') }), B('hash', 'props', 'props')] },
    ] },
    { id: 'convert', label: t('pdfr.convert'), groups: [
      { items: [B('ocr', 'ocr', 'ocr')] },
      { items: [{ icon: 'file', label: 'Word', title: 'Word (.docx)', onClick: run('toDocx') }, { icon: 'table', label: 'Excel', title: 'Excel (.xlsx)', onClick: run('toXlsx') }, B('paragraph', 'toTxt', 'toTxt'), B('image', 'toPng', 'toPng'), B('image', 'toJpg', 'toJpg')] },
      { items: [B('download', 'export', 'export'), B('filePlus', 'create', 'create')] },
    ] },
    { id: 'view', label: t('tab.view'), groups: [
      { items: [B('sidebar', 'thumbs', 'thumbs', { active: () => st.thumbs }), B('layout', 'pane', 'pane', { active: () => st.pane })] },
      { items: [{ icon: 'zoomOut', title: t('zoomOut'), onClick: run('zoomOut') }, { t: 'menu', icon: 'search', label: zoomPct(), items: () => [{ label: t('pdfr.fitW'), noPad: true, checked: st.fit === 'width', onClick: run('fitW') }, { label: t('pdfr.fitP'), noPad: true, checked: st.fit === 'page', onClick: run('fitP') }, '-'].concat([0.5, 0.75, 1, 1.25, 1.5, 2, 3].map(z => ({ label: Math.round(z * 100) + ' %', noPad: true, checked: !st.fit && st.zoom === z, onClick: run('zoom', z) }))) }, { icon: 'zoomIn', title: t('zoomIn'), onClick: run('zoomIn') }] },
      { items: [{ icon: 'arrowUp', title: t('pdfr.prev'), onClick: run('prev') }, { t: 'custom', html: '<span class="pdf-pno"><input aria-label="Page"><span></span></span>', init: el => { const i = el.querySelector('input'); el._sync = () => { if (document.activeElement !== i) i.value = st.page || ''; el.lastChild.textContent = '/ ' + (st.pages || 0); }; el._sync(); i.addEventListener('keydown', e => { if (e.key === 'Enter') { run('page', i.value)(); i.blur(); } }); pno.add(el); } }, { icon: 'arrowDown', title: t('pdfr.next'), onClick: run('next') }] },
      { items: [B('expand', 'focus', 'focus', { noLabel: true })] },
    ] },
    { id: 'help', label: t('tab.help'), groups: [{ items: [B('sparkle', 'guide', 'help')] }] },
  ];
  const pno = new Set();
  RE[RE.length - 2].groups[3].items[0] = { icon: 'expand', label: t('focusMode'), onClick: () => ctx.root.classList.toggle('focus') };
  RE[0].groups[0].items.forEach(x => { x.title = x.title.replace(/^pdfr\./, ''); });
  RE[0].groups[0].items[0].title = t('undo') + ' (Ctrl+Z)'; RE[0].groups[0].items[1].title = t('redo') + ' (Ctrl+Y)';
  // the engine reports every change: active buttons, zoom and page number follow it
  function onState(s) { st = s || {};
    if (OW.pdfIntent && st.doc) { const c = OW.pdfIntent; OW.pdfIntent = null; setTimeout(run(c), 400); }   // a quick tool chosen on the PDF start screen
    pno.forEach(el => el.isConnected ? el._sync() : pno.delete(el)); try { ctx.refresh(); } catch { /* closing */ } }

  const R = [
    { id: 'start', label: t('tab.home'), groups: [
      { items: [{ icon: 'upload', label: t('pdf.choose'), onClick: pick }, { icon: 'download', label: t('download'), onClick: () => blob ? OW.download(blob, OW.safeName(ctx.file.name) + '.pdf') : OW.toast(t('pdf.noFile')) }, { icon: 'print', label: t('bs.print'), onClick: printPdf }] },
      ...(hasEngine ? [] : [{ items: [{ icon: 'sparkle', label: t('pdf.getEngine'), onClick: () => OW.alert(t('pdf.getEngine'), t('pdf.engineHowto')) }] }]),
      { items: [{ icon: 'expand', label: t('focusMode'), onClick: () => ctx.root.classList.toggle('focus') }] },
    ] },
  ];
  ctx.exports = [{ label: 'PDF (.pdf)', fn: () => blob ? OW.download(blob, OW.safeName(ctx.file.name) + '.pdf') : OW.toast(t('pdf.noFile')) }];

  return {
    ribbonMode: 'simplified',
    ribbon: () => hasEngine ? RE : R,
    mount(body) { body.innerHTML = '<div class="pdf-host"></div>'; holder = body.querySelector('.pdf-host'); hasEngine ? mountEngine() : mountViewer(); },
    getContent: () => blob,
    status: () => ({ left: hasEngine ? 'PDF Werkstatt · ' + t('pdf.engineActive') : t('pdf.builtinViewer'), right: blob ? (blob.size / 1048576).toFixed(2) + ' MB' : '' }),
    onTheme: themeFrame,
    setLanguage(l) {
      try { localStorage.setItem('pdf-workshop.language', ['tr', 'de', 'en', 'fr', 'es'].includes(l) ? l : 'en'); const P = frame && frame.contentWindow.__pdfWorkshop; if (P && P.applyLanguage) { P.applyLanguage(['tr', 'de', 'en', 'fr', 'es'].includes(l) ? l : 'en'); return true; } } catch { /* reload instead */ }
      return false;
    },
    destroy() { if (url) URL.revokeObjectURL(url); },
  };
};
