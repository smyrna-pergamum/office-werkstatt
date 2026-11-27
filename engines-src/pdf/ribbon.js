/* ow-ribbon: Office Werkstatt menu for PDF Werkstatt – quick access bar, tabs and ribbon like the other Werkzeuge
   (Word / Excel / Slide), and a File backstage. Injected into public/engines/pdf/index.html by
   engines-src/pdf/apply-ribbon.mjs (inside the engine's main script, so it can use S, setMode, openTool …). */
(function owRibbon() {
  /* new interface texts: Turkish key → en | de | fr | es */
  const RT = {
    'Dosya': ['File', 'Datei', 'Fichier', 'Archivo'],
    'Giriş': ['Home', 'Start', 'Accueil', 'Inicio'],
    'Ekle': ['Insert', 'Einfügen', 'Insertion', 'Insertar'],
    'Düzenle': ['Edit', 'Bearbeiten', 'Modifier', 'Editar'],
    'Yorum': ['Comment', 'Kommentieren', 'Commentaire', 'Comentar'],
    'Formlar': ['Forms', 'Formulare', 'Formulaires', 'Formularios'],
    'Koru': ['Protect', 'Schützen', 'Protéger', 'Proteger'],
    'Dönüştür': ['Convert', 'Konvertieren', 'Convertir', 'Convertir'],
    'Görünüm': ['View', 'Ansicht', 'Affichage', 'Vista'],
    'Aç': ['Open', 'Öffnen', 'Ouvrir', 'Abrir'],
    'Kaydet': ['Save', 'Speichern', 'Enregistrer', 'Guardar'],
    'Farklı kaydet': ['Save as', 'Speichern unter', 'Enregistrer sous', 'Guardar como'],
    'Yazdır': ['Print', 'Drucken', 'Imprimer', 'Imprimir'],
    'Geri al': ['Undo', 'Rückgängig', 'Annuler', 'Deshacer'],
    'Yinele': ['Redo', 'Wiederholen', 'Rétablir', 'Rehacer'],
    'Seç': ['Select', 'Auswählen', 'Sélectionner', 'Seleccionar'],
    'Metni düzenle': ['Edit text', 'Text bearbeiten', 'Modifier le texte', 'Editar texto'],
    'Metin ekle': ['Add text', 'Text hinzufügen', 'Ajouter du texte', 'Añadir texto'],
    'Metin kutusu': ['Text box', 'Textfeld', 'Zone de texte', 'Cuadro de texto'],
    'Resim': ['Image', 'Bild', 'Image', 'Imagen'],
    'Resim ekle': ['Add image', 'Bild hinzufügen', 'Ajouter une image', 'Añadir imagen'],
    'İmza': ['Signature', 'Unterschrift', 'Signature', 'Firma'],
    'İmza oluştur': ['Create signature', 'Unterschrift erstellen', 'Créer une signature', 'Crear firma'],
    'Vurgula': ['Highlight', 'Markieren', 'Surligner', 'Resaltar'],
    'Kalem': ['Pen', 'Stift', 'Stylo', 'Lápiz'],
    'Yapışkan not': ['Sticky note', 'Haftnotiz', 'Note adhésive', 'Nota adhesiva'],
    'Dikdörtgen': ['Rectangle', 'Rechteck', 'Rectangle', 'Rectángulo'],
    'Beyazla ört': ['Cover with white', 'Weiß abdecken', 'Masquer en blanc', 'Cubrir con blanco'],
    'Sayfalar': ['Pages', 'Seiten', 'Pages', 'Páginas'],
    'Sola döndür': ['Rotate left', 'Nach links drehen', 'Faire pivoter à gauche', 'Girar a la izquierda'],
    'Sağa döndür': ['Rotate right', 'Nach rechts drehen', 'Faire pivoter à droite', 'Girar a la derecha'],
    'Sayfayı sil': ['Delete page', 'Seite löschen', 'Supprimer la page', 'Eliminar página'],
    'Boş sayfa': ['Blank page', 'Leere Seite', 'Page blanche', 'Página en blanco'],
    'Dosyadan sayfa': ['Pages from file', 'Seiten aus Datei', 'Pages d’un fichier', 'Páginas de archivo'],
    'Sayfaları ayıkla': ['Extract pages', 'Seiten extrahieren', 'Extraire des pages', 'Extraer páginas'],
    'Böl': ['Split', 'Teilen', 'Diviser', 'Dividir'],
    'Birleştir': ['Combine', 'Zusammenführen', 'Combiner', 'Combinar'],
    'Tarih': ['Date', 'Datum', 'Date', 'Fecha'],
    'Onay işareti': ['Check mark', 'Häkchen', 'Coche', 'Marca de verificación'],
    'Çarpı': ['Cross', 'Kreuz', 'Croix', 'Aspa'],
    'Bağlantı': ['Link', 'Link', 'Lien', 'Enlace'],
    'Damga': ['Stamp', 'Stempel', 'Tampon', 'Sello'],
    'Filigran ve numara': ['Watermark and numbers', 'Wasserzeichen und Nummern', 'Filigrane et numéros', 'Marca de agua y números'],
    'Yorumlar': ['Comments', 'Kommentare', 'Commentaires', 'Comentarios'],
    'Seçileni sil': ['Delete selection', 'Auswahl löschen', 'Supprimer la sélection', 'Eliminar selección'],
    'Doldur ve İmzala': ['Fill and sign', 'Ausfüllen und unterschreiben', 'Remplir et signer', 'Rellenar y firmar'],
    'Parola ile koru': ['Protect with password', 'Mit Kennwort schützen', 'Protéger par mot de passe', 'Proteger con contraseña'],
    'Karart': ['Redact', 'Schwärzen', 'Caviarder', 'Censurar'],
    'Belge özellikleri': ['Document properties', 'Dokumenteigenschaften', 'Propriétés du document', 'Propiedades del documento'],
    'Metin tanıma (OCR)': ['Text recognition (OCR)', 'Texterkennung (OCR)', 'Reconnaissance de texte (OCR)', 'Reconocimiento de texto (OCR)'],
    'Word': ['Word', 'Word', 'Word', 'Word'],
    'Excel': ['Excel', 'Excel', 'Excel', 'Excel'],
    'Düz metin': ['Plain text', 'Nur-Text', 'Texte brut', 'Texto sin formato'],
    'Resim (PNG)': ['Image (PNG)', 'Bild (PNG)', 'Image (PNG)', 'Imagen (PNG)'],
    'Resim (JPEG)': ['Image (JPEG)', 'Bild (JPEG)', 'Image (JPEG)', 'Imagen (JPEG)'],
    'Diğer biçimler': ['More formats', 'Weitere Formate', 'Autres formats', 'Más formatos'],
    'Yazı biçimini tanı': ['Identify text format', 'Textformat erkennen', 'Identifier le format du texte', 'Identificar el formato del texto'],
    'Küçük resimler': ['Thumbnails', 'Miniaturen', 'Miniatures', 'Miniaturas'],
    'Araç paneli': ['Tools pane', 'Werkzeugbereich', 'Panneau des outils', 'Panel de herramientas'],
    'Yakınlaştır': ['Zoom in', 'Vergrößern', 'Zoom avant', 'Acercar'],
    'Uzaklaştır': ['Zoom out', 'Verkleinern', 'Zoom arrière', 'Alejar'],
    'Genişliğe sığdır': ['Fit width', 'An Breite anpassen', 'Ajuster à la largeur', 'Ajustar al ancho'],
    'Sayfaya sığdır': ['Fit page', 'An Seite anpassen', 'Ajuster à la page', 'Ajustar a la página'],
    'Önceki sayfa': ['Previous page', 'Vorherige Seite', 'Page précédente', 'Página anterior'],
    'Sonraki sayfa': ['Next page', 'Nächste Seite', 'Page suivante', 'Página siguiente'],
    'Tüm araçlar': ['All tools', 'Alle Werkzeuge', 'Tous les outils', 'Todas las herramientas'],
    'Belgede ara': ['Search document', 'Im Dokument suchen', 'Rechercher dans le document', 'Buscar en el documento'],
    'Yeni': ['New', 'Neu', 'Nouveau', 'Nuevo'],
    'Görsellerden PDF': ['PDF from images', 'PDF aus Bildern', 'PDF à partir d’images', 'PDF a partir de imágenes'],
    'URL’den aç': ['Open from URL', 'Von URL öffnen', 'Ouvrir depuis une URL', 'Abrir desde URL'],
    'Dışa aktar': ['Export', 'Exportieren', 'Exporter', 'Exportar'],
    'Kapat': ['Close', 'Schließen', 'Fermer', 'Cerrar'],
    'Yardım': ['Help', 'Hilfe', 'Aide', 'Ayuda'],
    'Kullanım kılavuzu': ['User guide', 'Bedienungsanleitung', 'Guide d’utilisation', 'Guía de uso'],
    'Geri': ['Back', 'Zurück', 'Retour', 'Atrás'],
    'Başlangıç': ['Start', 'Start', 'Démarrer', 'Inicio'],
    'Önce bir PDF açın.': ['Open a PDF first.', 'Öffnen Sie zuerst ein PDF.', 'Ouvrez d’abord un PDF.', 'Abra primero un PDF.'],
    'Kaydedilmemiş değişiklikler': ['Unsaved changes', 'Ungespeicherte Änderungen', 'Modifications non enregistrées', 'Cambios sin guardar'],
  };
  for (const [k, [en, de, fr, es]] of Object.entries(RT)) {
    const o = UI_TEXT[k];
    if (!o) { UI_TEXT[k] = { en, de, fr, es }; continue; }
    if (!o.fr) o.fr = fr; if (!o.es) o.es = es;
  }

  const app = $('#app'), main = $('main');
  const rb = h('div', { class: 'owr', id: 'owRibbon' });
  app.insertBefore(rb, main);
  const bs = h('nav', { class: 'owr-bs', id: 'owBackstage', 'aria-label': 'Dosya' });
  main.prepend(bs);
  let tab = 'home', backstage = !S.doc;

  const need = fn => () => { if (!S.doc) { toast(tr('Önce bir PDF açın.')); return; } return guard(fn); };
  const docOff = () => !S.doc;
  const curPages = () => !S.doc ? [] : S.organize && S.orgSel.size ? S.doc.pages.filter(p => S.orgSel.has(p.id)) : [S.doc.pages[S.cur]].filter(Boolean);
  const mode = (tool, m) => need(() => { if (S.view !== 'doc') show('doc'); quickMode(tool, m); });
  const tool = id => need(() => { if (S.view !== 'doc') show('doc'); openTool(id); });
  const open = () => guard(async () => { const f = await pickFiles(ACCEPT_ALL); if (f.length) { setBackstage(false); await openFiles(f); } });

  /* button kinds: big (icon over label), small (icon + label, three per column) */
  function big(icon, label, fn, o = {}) {
    return h('button', { class: 'owr-big', type: 'button', title: o.tip || label, onclick: fn, disabled: !!o.off, 'aria-pressed': o.on == null ? null : String(!!o.on) }, I(icon, 24, 1.6), h('span', null, label));
  }
  function small(icon, label, fn, o = {}) {
    return h('button', { class: 'owr-sm', type: 'button', title: o.tip || label, onclick: fn, disabled: !!o.off, 'aria-pressed': o.on == null ? null : String(!!o.on) }, I(icon, 16, 1.8), h('span', null, label));
  }
  const col = (...b) => h('div', { class: 'owr-col' }, ...b);
  const grp = (...b) => h('div', { class: 'owr-grp' }, ...b);
  const M = m => S.doc && S.mode === m && !S.organize;

  /* every ribbon action as a named command – used by this ribbon and by Office Werkstatt's own ribbon (embedded) */
  const sign = need(() => { show('doc'); openTool('fill'); signatureDialog(); });
  const pagesTool = need(() => { show('doc'); S.organize ? closeOrganize() : openTool('organize'); });
  const CMD = {
    open, openUrl: () => guard(openUrlDialog), save: need(saveDoc), saveAs: need(savePdfAs), print: need(printDoc), close: () => guard(closeDoc),
    undo: need(undo), redo: need(redo), help: () => usageGuideDialog(),
    select: need(() => { show('doc'); setMode('select'); }), editText: mode('edit', 'native'), addText: mode('edit', 'text'), image: tool('edit'), sign,
    highlight: mode('comment', 'highlight'), ink: mode('comment', 'ink'), note: mode('comment', 'note'), rect: mode('comment', 'rect'), whiteout: mode('edit', 'whiteout'),
    stamp: tool('stamp'), date: mode('fill', 'date'), check: mode('fill', 'check'), cross: mode('fill', 'cross'), link: tool('links'), decor: tool('decor'),
    blank: need(() => { show('doc'); insertBlank(); }), fromFile: need(insertFromFile), organize: pagesTool,
    rotL: need(() => rotatePages(curPages(), -90)), rotR: need(() => rotatePages(curPages(), 90)), delPage: need(() => deletePages(curPages())), extract: need(() => extractPages(curPages())),
    split: tool('split'), combine: () => guard(() => combineDialog(S.doc ? 'append' : 'combine')), create: () => guard(() => combineDialog('create')),
    comments: tool('comment'), delSel: need(deleteSelected), fill: tool('fill'), protect: tool('protect'), redact: mode('redact', 'redact'), props: tool('props'),
    fontinfo: tool('fontinfo'), ocr: tool('ocr'), export: tool('export'),
    toDocx: need(() => exportDocx('text')), toXlsx: need(exportXlsx), toTxt: need(exportText), toPng: need(() => exportImages(150, 'png')), toJpg: need(() => exportImages(150, 'jpeg')),
    thumbs: need(() => { S.showThumbs = !S.showThumbs; $('#thumbs').classList.toggle('off', !S.showThumbs || S.organize); renderToolbar(); }),
    pane: need(() => { S.showPane = !S.showPane; $('#pane').classList.toggle('off', !S.showPane); renderToolbar(); }),
    zoomIn: need(() => setZoom(S.zoom * 1.2)), zoomOut: need(() => setZoom(S.zoom / 1.2)), fitW: need(() => fitWidth()), fitP: need(fitPage),
    zoom: z => need(() => setZoom(+z))(), prev: need(() => goPage(S.cur - 1)), next: need(() => goPage(S.cur + 1)), page: n => need(() => goPage(+n - 1))(),
    tools: () => { setBackstage(false); show(S.doc ? 'doc' : 'tools'); if (S.doc) { S.tool = null; S.showPane = true; $('#pane').classList.remove('off'); renderPane(); renderToolbar(); } },
    home: () => show('home'),
    search: (q, dir) => need(() => { show('doc'); runSearch(String(q || ''), dir || 1); })(),
  };
  const state = () => ({ doc: !!S.doc, name: S.doc ? S.doc.name : '', dirty: !!(S.doc && S.doc.dirty), mode: S.doc ? S.mode : '', organize: !!(S.doc && S.organize),
    thumbs: !!(S.doc && S.showThumbs && !S.organize), pane: !!(S.doc && S.showPane), fit: S.doc ? S.fit || '' : '', zoom: S.zoom, undo: !!(S.doc && S.undo.length), redo: !!(S.doc && S.redo.length),
    sel: !!(S.doc && S.sel), page: S.doc ? S.cur + 1 : 0, pages: S.doc ? S.doc.pages.length : 0, view: S.view });

  const TABS = [
    ['home', 'Giriş', () => [
      grp(big('folder-open', 'Aç', open), big('save', 'Kaydet', need(saveDoc), { off: docOff() }), col(small('file-down', 'Farklı kaydet', need(savePdfAs), { off: docOff() }), small('printer', 'Yazdır', need(printDoc), { off: docOff() }))),
      grp(big('mouse-pointer-2', 'Seç', need(() => { show('doc'); setMode('select'); }), { off: docOff(), on: M('select') }), big('file-pen-line', 'Metni düzenle', mode('edit', 'native'), { off: docOff(), on: M('native') }),
        col(small('type', 'Metin ekle', mode('edit', 'text'), { off: docOff(), on: M('text') }), small('image-plus', 'Resim ekle', tool('edit'), { off: docOff() }), small('signature', 'İmza', need(() => { show('doc'); openTool('fill'); signatureDialog(); }), { off: docOff(), on: M('sign') }))),
      grp(col(small('highlighter', 'Vurgula', mode('comment', 'highlight'), { off: docOff(), on: M('highlight') }), small('pen-line', 'Kalem', mode('comment', 'ink'), { off: docOff(), on: M('ink') }), small('sticky-note', 'Yapışkan not', mode('comment', 'note'), { off: docOff(), on: M('note') }))),
      grp(big('layout-grid', 'Sayfalar', need(() => { show('doc'); S.organize ? closeOrganize() : openTool('organize'); }), { off: docOff(), on: !!(S.doc && S.organize) }),
        col(small('rotate-ccw', 'Sola döndür', need(() => rotatePages(curPages(), -90)), { off: docOff() }), small('rotate-cw', 'Sağa döndür', need(() => rotatePages(curPages(), 90)), { off: docOff() }), small('trash-2', 'Sayfayı sil', need(() => deletePages(curPages())), { off: docOff() }))),
      grp(big('wrench', 'Tüm araçlar', () => { setBackstage(false); show('tools'); })),
      searchBox(),
    ]],
    ['insert', 'Ekle', () => [
      grp(big('type', 'Metin kutusu', mode('edit', 'text'), { off: docOff(), on: M('text') }), big('image-plus', 'Resim', tool('edit'), { off: docOff() }), big('signature', 'İmza', need(() => { show('doc'); openTool('fill'); signatureDialog(); }), { off: docOff() })),
      grp(col(small('stamp', 'Damga', tool('stamp'), { off: docOff() }), small('clock', 'Tarih', mode('fill', 'date'), { off: docOff(), on: M('date') }), small('check', 'Onay işareti', mode('fill', 'check'), { off: docOff(), on: M('check') })),
        col(small('x', 'Çarpı', mode('fill', 'cross'), { off: docOff(), on: M('cross') }), small('sticky-note', 'Yapışkan not', mode('comment', 'note'), { off: docOff(), on: M('note') }), small('rectangle-horizontal', 'Dikdörtgen', mode('comment', 'rect'), { off: docOff(), on: M('rect') }))),
      grp(big('link', 'Bağlantı', tool('links'), { off: docOff() })),
      grp(big('plus', 'Boş sayfa', need(() => { show('doc'); insertBlank(); }), { off: docOff() }), col(small('file-input', 'Dosyadan sayfa', need(insertFromFile), { off: docOff() }), small('layers', 'Filigran ve numara', tool('decor'), { off: docOff() }))),
    ]],
    ['edit', 'Düzenle', () => [
      grp(big('file-pen-line', 'Metni düzenle', mode('edit', 'native'), { off: docOff(), on: M('native') }), big('type', 'Metin ekle', mode('edit', 'text'), { off: docOff(), on: M('text') }),
        col(small('image-plus', 'Resim ekle', tool('edit'), { off: docOff() }), small('eraser', 'Beyazla ört', mode('edit', 'whiteout'), { off: docOff(), on: M('whiteout') }), small('info', 'Yazı biçimini tanı', tool('fontinfo'), { off: docOff() }))),
      grp(big('layout-grid', 'Sayfalar', need(() => { show('doc'); S.organize ? closeOrganize() : openTool('organize'); }), { off: docOff(), on: !!(S.doc && S.organize) }),
        col(small('rotate-ccw', 'Sola döndür', need(() => rotatePages(curPages(), -90)), { off: docOff() }), small('rotate-cw', 'Sağa döndür', need(() => rotatePages(curPages(), 90)), { off: docOff() }), small('trash-2', 'Sayfayı sil', need(() => deletePages(curPages())), { off: docOff() })),
        col(small('plus', 'Boş sayfa', need(() => { show('doc'); insertBlank(); }), { off: docOff() }), small('file-output', 'Sayfaları ayıkla', need(() => extractPages(curPages())), { off: docOff() }), small('file-input', 'Dosyadan sayfa', need(insertFromFile), { off: docOff() }))),
      grp(big('scissors', 'Böl', tool('split'), { off: docOff() }), big('files', 'Birleştir', () => guard(() => combineDialog(S.doc ? 'append' : 'combine')))),
      grp(big('undo-2', 'Geri al', need(undo), { off: !(S.doc && S.undo.length) }), big('redo-2', 'Yinele', need(redo), { off: !(S.doc && S.redo.length) })),
    ]],
    ['comment', 'Yorum', () => [
      grp(big('highlighter', 'Vurgula', mode('comment', 'highlight'), { off: docOff(), on: M('highlight') }), big('pen-line', 'Kalem', mode('comment', 'ink'), { off: docOff(), on: M('ink') }), big('sticky-note', 'Yapışkan not', mode('comment', 'note'), { off: docOff(), on: M('note') })),
      grp(col(small('rectangle-horizontal', 'Dikdörtgen', mode('comment', 'rect'), { off: docOff(), on: M('rect') }), small('stamp', 'Damga', tool('stamp'), { off: docOff() }), small('trash-2', 'Seçileni sil', need(deleteSelected), { off: !(S.doc && S.sel) }))),
      grp(big('message-square-text', 'Yorumlar', tool('comment'), { off: docOff() })),
    ]],
    ['forms', 'Formlar', () => [
      grp(big('list-checks', 'Doldur ve İmzala', tool('fill'), { off: docOff() }), big('signature', 'İmza oluştur', need(() => { show('doc'); openTool('fill'); signatureDialog(); }), { off: docOff() })),
      grp(col(small('type', 'Metin ekle', mode('edit', 'text'), { off: docOff(), on: M('text') }), small('clock', 'Tarih', mode('fill', 'date'), { off: docOff(), on: M('date') }), small('check', 'Onay işareti', mode('fill', 'check'), { off: docOff(), on: M('check') })),
        col(small('x', 'Çarpı', mode('fill', 'cross'), { off: docOff(), on: M('cross') }))),
    ]],
    ['protect', 'Koru', () => [
      grp(big('file-lock-2', 'Parola ile koru', tool('protect'), { off: docOff() }), big('eye-off', 'Karart', mode('redact', 'redact'), { off: docOff(), on: M('redact') }), big('tag', 'Belge özellikleri', tool('props'), { off: docOff() })),
    ]],
    ['convert', 'Dönüştür', () => [
      grp(big('scan-text', 'Metin tanıma (OCR)', tool('ocr'), { off: docOff() })),
      grp(big('file-text', 'Word', need(() => exportDocx('text')), { off: docOff(), tip: 'Word (DOCX)' }), big('layout-grid', 'Excel', need(exportXlsx), { off: docOff(), tip: 'Excel (XLSX)' }),
        col(small('file-text', 'Düz metin', need(exportText), { off: docOff() }), small('image', 'Resim (PNG)', need(() => exportImages(150, 'png')), { off: docOff() }), small('image', 'Resim (JPEG)', need(() => exportImages(150, 'jpeg')), { off: docOff() }))),
      grp(big('file-output', 'Diğer biçimler', tool('export'), { off: docOff() }), big('files', 'Görsellerden PDF', () => guard(() => combineDialog('create')))),
    ]],
    ['view', 'Görünüm', () => [
      grp(big('panel-left', 'Küçük resimler', need(() => { S.showThumbs = !S.showThumbs; $('#thumbs').classList.toggle('off', !S.showThumbs || S.organize); renderToolbar(); }), { off: docOff(), on: !!(S.doc && S.showThumbs && !S.organize) }),
        big('panel-right', 'Araç paneli', need(() => { S.showPane = !S.showPane; $('#pane').classList.toggle('off', !S.showPane); renderToolbar(); }), { off: docOff(), on: !!(S.doc && S.showPane) })),
      grp(col(small('zoom-in', 'Yakınlaştır', need(() => setZoom(S.zoom * 1.2)), { off: docOff() }), small('zoom-out', 'Uzaklaştır', need(() => setZoom(S.zoom / 1.2)), { off: docOff() }), zoomSel()),
        col(small('arrow-up-down', 'Genişliğe sığdır', need(() => fitWidth()), { off: docOff(), on: !!(S.doc && S.fit === 'width') }), small('maximize-2', 'Sayfaya sığdır', need(fitPage), { off: docOff(), on: !!(S.doc && S.fit === 'page') }))),
      grp(pageNav()),
      grp(big('wrench', 'Tüm araçlar', () => { setBackstage(false); show('tools'); })),
    ]],
  ];

  function zoomSel() {
    const zs = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
    const s = h('select', { class: 'owr-zoom', 'aria-label': 'Yakınlaştırma', disabled: docOff(), onchange: e => { const v = e.target.value; if (v === 'w') fitWidth(); else if (v === 'p') fitPage(); else setZoom(+v); } },
      h('option', { value: 'w' }, 'Genişliğe sığdır'), h('option', { value: 'p' }, 'Sayfaya sığdır'), zs.map(z => h('option', { value: String(z) }, `%${Math.round(z * 100)}`)),
      S.doc && !zs.includes(S.zoom) && !S.fit ? h('option', { value: String(S.zoom) }, `%${Math.round(S.zoom * 100)}`) : null);
    if (S.doc) s.value = S.fit === 'width' ? 'w' : S.fit === 'page' ? 'p' : String(S.zoom);
    return s;
  }
  function pageNav() {
    const n = S.doc ? S.doc.pages.length : 0;
    const pin = h('input', { class: 'owr-pin', 'aria-label': 'Sayfa numarası', value: S.doc ? String(S.cur + 1) : '', inputmode: 'numeric', disabled: docOff(),
      onkeydown: e => { if (e.key === 'Enter') { const v = parseInt(e.target.value, 10); if (v >= 1 && v <= n) goPage(v - 1); else e.target.value = String(S.cur + 1); } } });
    return h('div', { class: 'owr-pages' },
      small('chevron-up', 'Önceki sayfa', need(() => goPage(S.cur - 1)), { off: !S.doc || S.cur <= 0 || S.organize }),
      h('div', { class: 'owr-pno' }, pin, h('span', { noI18n: true }, '/ ' + n)),
      small('chevron-down', 'Sonraki sayfa', need(() => goPage(S.cur + 1)), { off: !S.doc || S.cur >= n - 1 || S.organize }));
  }
  function searchBox() {
    const q = h('input', { 'aria-label': 'Belgede ara', placeholder: 'Belgede ara', disabled: docOff(), value: S.search ? S.search.q : '',
      onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); show('doc'); runSearch(e.target.value, e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.target.value = ''; clearSearch(); } } });
    return h('div', { class: 'owr-grp owr-search' }, h('label', { class: 'owr-q' }, I('search', 15), q,
      h('span', { class: 'cnt', noI18n: true }, S.search && S.search.hits.length ? `${S.search.i + 1}/${S.search.hits.length}` : '')));
  }

  function render() {
    notify();
    if (embedded) { if (backstage) { backstage = false; app.classList.remove('owr-bs-on'); } return; }
    const act = document.activeElement, keep = act && rb.contains(act) && act.tagName === 'INPUT' ? act.getAttribute('aria-label') : null;
    const qat = h('div', { class: 'owr-qat' },
      h('div', { class: 'owr-qa' },
        h('button', { class: 'owr-qb', type: 'button', title: 'Aç', 'aria-label': 'Aç', onclick: open }, I('folder-open', 17)),
        h('button', { class: 'owr-qb', type: 'button', title: 'Kaydet', 'aria-label': 'Kaydet', disabled: docOff(), onclick: need(saveDoc) }, I('save', 17)),
        h('button', { class: 'owr-qb', type: 'button', title: 'Geri al', 'aria-label': 'Geri al', disabled: !(S.doc && S.undo.length), onclick: need(undo) }, I('undo-2', 17)),
        h('button', { class: 'owr-qb', type: 'button', title: 'Yinele', 'aria-label': 'Yinele', disabled: !(S.doc && S.redo.length), onclick: need(redo) }, I('redo-2', 17)),
        h('button', { class: 'owr-qb', type: 'button', title: 'Yazdır', 'aria-label': 'Yazdır', disabled: docOff(), onclick: need(printDoc) }, I('printer', 17))),
      h('div', { class: 'owr-name' }, S.doc ? [S.doc.dirty ? h('span', { class: 'dot', title: 'Kaydedilmemiş değişiklikler' }) : null, h('span', { noI18n: true }, S.doc.name)] : h('span', null, 'PDF Werkstatt')),
      h('div', { class: 'owr-qa r' }, h('button', { class: 'owr-qb', type: 'button', title: 'Kullanım kılavuzu', 'aria-label': 'Yardım', onclick: () => usageGuideDialog() }, I('circle-help', 17))));
    const tabs = h('div', { class: 'owr-tabs', role: 'tablist' },
      h('button', { class: 'owr-tab file', role: 'tab', 'aria-selected': String(backstage), type: 'button', onclick: () => setBackstage(!backstage) }, 'Dosya'),
      TABS.map(([id, label]) => h('button', { class: 'owr-tab', role: 'tab', type: 'button', 'aria-selected': String(!backstage && tab === id), onclick: () => { tab = id; setBackstage(false); } }, label)));
    const t = TABS.find(x => x[0] === tab) || TABS[0];
    const band = h('div', { class: 'owr-band', role: 'toolbar', 'aria-label': t[1] }, h('div', { class: 'owr-row' }, t[2]()));
    rb.replaceChildren(...[qat, tabs, backstage ? null : band].filter(Boolean));
    if (keep) { const i = rb.querySelector(`input[aria-label="${tr(keep)}"]`); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    renderBackstage();
  }
  function renderBackstage() {
    const it = (icon, label, fn, off) => h('button', { class: 'owr-bi', type: 'button', disabled: !!off, onclick: async () => { const r = await fn(); return r; } }, I(icon, 18), h('span', null, label));
    const close = () => setBackstage(false);
    bs.replaceChildren(
      h('button', { class: 'owr-bi back', type: 'button', title: 'Geri', 'aria-label': 'Geri', disabled: !S.doc, onclick: close }, I('chevron-left', 22)),
      it('house', 'Başlangıç', () => show('home')),
      it('file-plus-2', 'Yeni', () => { close(); return guard(() => combineDialog('create')); }),
      it('folder-open', 'Aç', open),
      it('link', 'URL’den aç', () => guard(openUrlDialog)),
      h('div', { class: 'owr-bsep' }),
      it('save', 'Kaydet', () => { close(); return need(saveDoc)(); }, docOff()),
      it('file-down', 'Farklı kaydet', () => { close(); return need(savePdfAs)(); }, docOff()),
      it('printer', 'Yazdır', () => { close(); return need(printDoc)(); }, docOff()),
      it('file-output', 'Dışa aktar', () => { close(); return tool('export')(); }, docOff()),
      it('file-lock-2', 'Koru', () => { close(); return tool('protect')(); }, docOff()),
      it('tag', 'Belge özellikleri', () => { close(); return tool('props')(); }, docOff()),
      it('x', 'Kapat', () => guard(closeDoc), docOff()),
      h('div', { style: { flex: '1' } }),
      it('circle-help', 'Kullanım kılavuzu', () => usageGuideDialog()));
  }
  function setBackstage(on) {
    backstage = embedded ? false : !!on || !S.doc;
    app.classList.toggle('owr-bs-on', backstage);
    if (backstage) { if (S.view === 'doc' || S.view == null) show('home'); }
    else if (S.doc && S.view !== 'doc' && S.view !== 'tools') show('doc');
    else render();
  }
  // follow the engine: views, documents, modes, selection, zoom, language
  const _renderTabs = renderTabs;
  renderTabs = function () { _renderTabs(); if (embedded) return render(); if (S.doc && S.view === 'doc' && backstage) { backstage = false; app.classList.remove('owr-bs-on'); } if (!S.doc && !backstage) { backstage = true; app.classList.add('owr-bs-on'); } render(); };
  const _renderToolbar = renderToolbar;
  renderToolbar = function () { _renderToolbar(); render(); };
  const _applyZoom = typeof applyZoom === 'function' ? applyZoom : null;
  if (_applyZoom) applyZoom = function () { const r = _applyZoom.apply(this, arguments); render(); return r; };
  const _goPage = goPage;
  goPage = function () { const r = _goPage.apply(this, arguments); render(); return r; };
  const _applyLanguage = applyLanguage;
  applyLanguage = function () { const r = _applyLanguage.apply(this, arguments); render(); return r; };
  window.__pdfWorkshop.applyLanguage = applyLanguage;
  let embedded = false, notifyT = 0;
  const notify = () => { clearTimeout(notifyT); notifyT = setTimeout(() => { const f = window.__pdfWorkshop.onState; if (f) try { f(state()); } catch (e) { /* host gone */ } }, 30); };
  window.__pdfWorkshop.ribbon = { render, setBackstage, tab: id => { tab = id; setBackstage(false); },
    // Office Werkstatt shows its own menu: this ribbon and the File column stay hidden
    embed(on) { embedded = !!on; app.classList.toggle('owr-embedded', embedded); if (embedded) { backstage = false; app.classList.remove('owr-bs-on'); } render(); } };
  window.__pdfWorkshop.ui = { cmd: (name, ...a) => CMD[name] && CMD[name](...a), state, commands: Object.keys(CMD) };
  // selection on the page (enables “Delete selection” and friends)
  document.addEventListener('pointerup', e => { if (S.doc && !rb.contains(e.target)) setTimeout(render, 0); }, true);
  app.classList.add('owr-on');
  app.classList.toggle('owr-bs-on', backstage);
  render();
})();
