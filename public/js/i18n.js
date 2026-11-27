/* Office Werkstatt – i18n (English · Deutsch · Türkçe · Español · Français)
 * Dictionary format: key | en | de | tr | es | fr   (one line per key)
 * Missing translations fall back to English. */
window.OW = window.OW || {};
(function () {
  OW.LANGS = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' }, { code: 'de', name: 'Deutsch', flag: '🇩🇪' }, { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }, { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];
  const ORDER = ['en', 'de', 'tr', 'es', 'fr'];
  const D = { en: {}, de: {}, tr: {}, es: {}, fr: {} };
  OW.addStrings = function (table) {
    table.split('\n').forEach(line => {
      line = line.trim(); if (!line || line.startsWith('#')) return;
      const p = line.split('|').map(s => s.trim()); const key = p[0];
      ORDER.forEach((l, i) => { if (p[i + 1]) D[l][key] = p[i + 1]; });
    });
  };
  const saved = localStorage.getItem('ow-lang');
  const nav = (navigator.language || 'en').slice(0, 2);
  OW.lang = saved || (ORDER.includes(nav) ? nav : 'de');
  OW.t = function (k, vars) {
    let s = (D[OW.lang] && D[OW.lang][k]) || D.en[k] || k;
    if (vars) Object.keys(vars).forEach(v => { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  };
  OW.langName = c => (OW.LANGS.find(l => l.code === c) || {}).name || c;
  OW.applyI18n = function (root) {
    document.documentElement.lang = OW.lang;
    root.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = OW.t(e.dataset.i18n); });
    root.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = OW.t(e.dataset.i18nTitle); e.setAttribute('aria-label', e.title); });
  };
  OW.setLang = function (l) { OW.lang = l; localStorage.setItem('ow-lang', l); OW.onLang && OW.onLang(); };

  OW.addStrings(`
# ---------- general ----------
new | New | Neu | Yeni | Nuevo | Nouveau
more | More | Mehr | Daha fazla | Más | Plus
open | Open | Öffnen | Aç | Abrir | Ouvrir
ok | OK | OK | Tamam | Aceptar | OK
cancel | Cancel | Abbrechen | İptal | Cancelar | Annuler
delete | Delete | Löschen | Sil | Eliminar | Supprimer
rename | Rename | Umbenennen | Yeniden adlandır | Cambiar nombre | Renommer
duplicate | Duplicate | Duplizieren | Çoğalt | Duplicar | Dupliquer
download | Download | Herunterladen | İndir | Descargar | Télécharger
upload | Upload | Hochladen | Yükle | Subir | Importer
saved | Saved | Gespeichert | Kaydedildi | Guardado | Enregistré
command | Command | Befehl | Komut | Comando | Commande
copySuffix | Copy | Kopie | Kopya | Copia | Copie
unsupported | Not supported in this browser | In diesem Browser nicht unterstützt | Bu tarayıcıda desteklenmiyor | No compatible con este navegador | Non pris en charge par ce navigateur
of | of | von | / | de | sur
date | Date | Datum | Tarih | Fecha | Date
clear | Clear | Löschen | Temizle | Borrar | Effacer
editing | Editing | Bearbeiten | Düzenleme | Edición | Édition
notifications | Notifications | Benachrichtigungen | Bildirimler | Notificaciones | Notifications
user.guest | Guest | Gast | Misafir | Invitado | Invité
# ---------- navigation ----------
nav.dashboard | Dashboard | Dashboard | Ana sayfa | Inicio | Tableau de bord
nav.recent | Recent files | Zuletzt verwendet | Son dosyalar | Recientes | Récents
nav.files | My files | Meine Dateien | Dosyalarım | Mis archivos | Mes fichiers
nav.templates | Templates | Vorlagen | Şablonlar | Plantillas | Modèles
nav.shared | Shared | Geteilt | Paylaşılanlar | Compartidos | Partagés
nav.favorites | Favorites | Favoriten | Favoriler | Favoritos | Favoris
nav.trash | Trash | Papierkorb | Çöp kutusu | Papelera | Corbeille
nav.settings | Settings | Einstellungen | Ayarlar | Configuración | Paramètres
search.placeholder | Search files, templates or tools… | Dateien, Vorlagen oder Werkzeuge suchen… | Dosya, şablon veya araç ara… | Buscar archivos, plantillas o herramientas… | Rechercher fichiers, modèles ou outils…
search.none | Nothing found | Nichts gefunden | Sonuç bulunamadı | Sin resultados | Aucun résultat
search.files | Filter files… | Dateien filtern… | Dosyaları filtrele… | Filtrar archivos… | Filtrer les fichiers…
theme.toggle | Light / dark mode | Hell / Dunkel | Açık / koyu tema | Modo claro / oscuro | Mode clair / sombre
theme.light | Light | Hell | Açık | Claro | Clair
theme.dark | Dark | Dunkel | Koyu | Oscuro | Sombre
theme.system | System | System | Sistem | Sistema | Système
net.online | Online | Online | Çevrimiçi | En línea | En ligne
net.offline | Offline – everything works | Offline – alles funktioniert | Çevrimdışı – her şey çalışır | Sin conexión – todo funciona | Hors ligne – tout fonctionne
storage.local | Stored on this device | Auf diesem Gerät gespeichert | Bu cihazda saklanıyor | Guardado en este dispositivo | Stocké sur cet appareil
storage.server | Stored on the server | Auf dem Server gespeichert | Sunucuda saklanıyor | Guardado en el servidor | Stocké sur le serveur
# ---------- home ----------
home.welcome | Welcome to | Willkommen bei | Hoş geldiniz: | Bienvenido a | Bienvenue dans
home.subtitle | Your office suite for documents, spreadsheets, presentations, notes, drawings and PDFs – in the browser, on the desktop and fully offline. | Ihre Office-Suite für Dokumente, Tabellen, Präsentationen, Notizen, Diagramme und PDFs – im Browser, auf dem Desktop und komplett offline. | Belgeler, tablolar, sunumlar, notlar, çizimler ve PDF'ler için ofis paketiniz – tarayıcıda, masaüstünde ve tamamen çevrimdışı. | Tu suite ofimática para documentos, hojas de cálculo, presentaciones, notas, dibujos y PDF – en el navegador, en el escritorio y totalmente sin conexión. | Votre suite bureautique pour documents, tableurs, présentations, notes, dessins et PDF – dans le navigateur, sur le bureau et entièrement hors ligne.
greet.morning | Good morning | Guten Morgen | Günaydın | Buenos días | Bonjour
greet.day | Hello | Hallo | Merhaba | Hola | Bonjour
greet.evening | Good evening | Guten Abend | İyi akşamlar | Buenas tardes | Bonsoir
home.recent | Recently used files | Zuletzt verwendete Dateien | Son kullanılan dosyalar | Archivos usados recientemente | Fichiers récents
home.showAll | Show all | Alle anzeigen | Tümünü göster | Ver todo | Tout afficher
home.noRecent | No files yet – create one or drop a file here. | Noch keine Dateien – erstellen Sie eine oder ziehen Sie eine Datei hierher. | Henüz dosya yok – yeni oluşturun veya buraya bir dosya sürükleyin. | Aún no hay archivos: crea uno o arrastra un archivo aquí. | Aucun fichier – créez-en un ou déposez un fichier ici.
home.quickstart | Quick start | Schnellstart | Hızlı başlangıç | Inicio rápido | Démarrage rapide
quick.new | Create new document | Neues Dokument erstellen | Yeni belge oluştur | Crear documento nuevo | Créer un document
quick.open | Open file | Datei öffnen | Dosya aç | Abrir archivo | Ouvrir un fichier
quick.template | Use template | Vorlage verwenden | Şablon kullan | Usar plantilla | Utiliser un modèle
drop.zone | Drag files here or click | Dateien hierher ziehen oder klicken | Dosyaları buraya sürükleyin veya tıklayın | Arrastra archivos aquí o haz clic | Glissez des fichiers ici ou cliquez
drop.title | Drop to import | Zum Importieren loslassen | İçe aktarmak için bırakın | Suelta para importar | Déposez pour importer
drop.hint | DOCX, DOC, XLSX, XLS, PPTX, PPT, PDF, CSV, TXT, Markdown, Excalidraw, images | DOCX, DOC, XLSX, XLS, PPTX, PPT, PDF, CSV, TXT, Markdown, Excalidraw, Bilder | DOCX, DOC, XLSX, XLS, PPTX, PPT, PDF, CSV, TXT, Markdown, Excalidraw, resimler | DOCX, DOC, XLSX, XLS, PPTX, PPT, PDF, CSV, TXT, Markdown, Excalidraw, imágenes | DOCX, DOC, XLSX, XLS, PPTX, PPT, PDF, CSV, TXT, Markdown, Excalidraw, images
import.pptTextOnly | Old PowerPoint file (.ppt): the slide texts were taken over – layout and pictures are not. | Alte PowerPoint-Datei (.ppt): Die Folientexte wurden übernommen – Layout und Bilder nicht. | Eski PowerPoint dosyası (.ppt): slayt metinleri aktarıldı – düzen ve resimler aktarılmadı. | Archivo antiguo de PowerPoint (.ppt): se importaron los textos, no el diseño ni las imágenes. | Ancien fichier PowerPoint (.ppt) : les textes ont été repris – pas la mise en page ni les images.
import.needsPro | {name} needs Word / Excel Werkzeug Pro | {name} benötigt Word / Excel Werkzeug Pro | {name} için Word / Excel Werkzeug Pro gerekir | {name} requiere Word / Excel Werkzeug Pro | {name} nécessite Word / Excel Werkzeug Pro
# ---------- tools / types ----------
tool.word.name | Word Werkzeug | Word Werkzeug | Word Werkzeug | Word Werkzeug | Word Werkzeug
tool.word.desc | Create, edit and design texts. | Texte erstellen, bearbeiten und gestalten. | Metin oluşturun, düzenleyin ve tasarlayın. | Crea, edita y diseña textos. | Créez, modifiez et mettez en forme vos textes.
tool.excel.name | Excel Werkzeug | Excel Werkzeug | Excel Werkzeug | Excel Werkzeug | Excel Werkzeug
tool.excel.desc | Tables, analyses and calculations. | Tabellen, Analysen und Berechnungen. | Tablolar, analizler ve hesaplamalar. | Tablas, análisis y cálculos. | Tableaux, analyses et calculs.
tool.slide.name | Slide Werkzeug | Slide Werkzeug | Slide Werkzeug | Slide Werkzeug | Slide Werkzeug
tool.slide.desc | Create and share presentations. | Präsentationen erstellen und teilen. | Sunum oluşturun ve paylaşın. | Crea y comparte presentaciones. | Créez et partagez des présentations.
tool.note.name | Note Werkzeug | Note Werkzeug | Note Werkzeug | Note Werkzeug | Note Werkzeug
tool.note.desc | Digital notes, notebooks and sections. | Digitale Notizen, Notizbücher und Abschnitte. | Dijital notlar, defterler ve bölümler. | Notas digitales, cuadernos y secciones. | Notes numériques, blocs-notes et sections.
tool.draw.name | Draw Werkzeug | Draw Werkzeug | Draw Werkzeug | Draw Werkzeug | Draw Werkzeug
tool.draw.desc | Sketches, whiteboards and diagrams. | Skizzen, Whiteboards und Diagramme. | Eskizler, beyaz tahtalar ve diyagramlar. | Bocetos, pizarras y diagramas. | Croquis, tableaux blancs et diagrammes.
tool.pdf.name | PDF Werkzeug | PDF Werkzeug | PDF Werkzeug | PDF Werkzeug | PDF Werkzeug
tool.pdf.desc | View, edit, convert and manage PDF files. | PDF-Dateien anzeigen, bearbeiten, konvertieren und verwalten. | PDF dosyalarını görüntüleyin, düzenleyin, dönüştürün ve yönetin. | Ver, editar, convertir y gestionar PDF. | Afficher, modifier, convertir et gérer des PDF.
tool.app.name | Own app | Eigene App | Kendi uygulamanız | App propia | Votre app
tool.app.desc | Your individual program – flexibly integrated. | Ihr individuelles Programm – flexibel integriert. | Size özel program – esnek şekilde entegre. | Tu programa individual, integrado con flexibilidad. | Votre programme sur mesure, intégré avec souplesse.
tool.app.howto | Copy any offline web app into <code>public/engines/&lt;name&gt;/</code> and register it in <code>public/engines/apps.js</code>, e.g. <code>window.OW_APPS = [{ name: 'Vokabeltrainer', url: 'engines/vokabel/index.html' }]</code>. It then appears here and opens inside Office Werkstatt. | Kopieren Sie eine beliebige Offline-Web-App nach <code>public/engines/&lt;name&gt;/</code> und tragen Sie sie in <code>public/engines/apps.js</code> ein, z. B. <code>window.OW_APPS = [{ name: 'Vokabeltrainer', url: 'engines/vokabel/index.html' }]</code>. Sie erscheint dann hier und öffnet sich in Office Werkstatt. | Herhangi bir çevrimdışı web uygulamasını <code>public/engines/&lt;ad&gt;/</code> klasörüne kopyalayın ve <code>public/engines/apps.js</code> dosyasına ekleyin, ör. <code>window.OW_APPS = [{ name: 'Kelime', url: 'engines/kelime/index.html' }]</code>. Burada görünür ve Office Werkstatt içinde açılır. | Copia cualquier app web sin conexión en <code>public/engines/&lt;nombre&gt;/</code> y regístrala en <code>public/engines/apps.js</code>, p. ej. <code>window.OW_APPS = [{ name: 'Vocabulario', url: 'engines/vocab/index.html' }]</code>. Aparecerá aquí y se abrirá dentro de Office Werkstatt. | Copiez une app web hors ligne dans <code>public/engines/&lt;nom&gt;/</code> et déclarez-la dans <code>public/engines/apps.js</code>, par ex. <code>window.OW_APPS = [{ name: 'Vocabulaire', url: 'engines/vocab/index.html' }]</code>. Elle apparaît ici et s'ouvre dans Office Werkstatt.
type.word | Document | Dokument | Belge | Documento | Document
type.excel | Spreadsheet | Tabelle | Tablo | Hoja de cálculo | Tableur
type.slide | Presentation | Präsentation | Sunum | Presentación | Présentation
type.note | Notebook | Notizbuch | Not defteri | Cuaderno | Bloc-notes
type.draw | Drawing | Zeichnung | Çizim | Dibujo | Dessin
type.pdf | PDF | PDF | PDF | PDF | PDF
create.word | New document | Neues Dokument | Yeni belge | Nuevo documento | Nouveau document
create.excel | New spreadsheet | Neue Tabelle | Yeni tablo | Nueva hoja | Nouveau tableur
create.slide | New presentation | Neue Präsentation | Yeni sunum | Nueva presentación | Nouvelle présentation
create.note | New notebook | Neues Notizbuch | Yeni not defteri | Nuevo cuaderno | Nouveau bloc-notes
create.draw | New drawing | Neue Zeichnung | Yeni çizim | Nuevo dibujo | Nouveau dessin
create.pdf | Open PDF | PDF öffnen | PDF aç | Abrir PDF | Ouvrir un PDF
untitled.word | Untitled document | Unbenanntes Dokument | Adsız belge | Documento sin título | Document sans titre
untitled.excel | Untitled spreadsheet | Unbenannte Tabelle | Adsız tablo | Hoja sin título | Tableur sans titre
untitled.slide | Untitled presentation | Unbenannte Präsentation | Adsız sunum | Presentación sin título | Présentation sans titre
untitled.note | Untitled notebook | Unbenanntes Notizbuch | Adsız not defteri | Cuaderno sin título | Bloc-notes sans titre
untitled.draw | Untitled drawing | Unbenannte Zeichnung | Adsız çizim | Dibujo sin título | Dessin sans titre
untitled.pdf | Untitled PDF | Unbenanntes PDF | Adsız PDF | PDF sin título | PDF sans titre
# ---------- lists ----------
filter.all | All | Alle | Tümü | Todos | Tous
sort.modified | Last modified | Zuletzt geändert | Son değişiklik | Última modificación | Dernière modification
sort.name | Name | Name | Ad | Nombre | Nom
sort.type | Type | Typ | Tür | Tipo | Type
view.grid | Grid | Kacheln | Izgara | Cuadrícula | Grille
view.list | List | Liste | Liste | Lista | Liste
empty.files | No files here yet | Hier gibt es noch keine Dateien | Burada henüz dosya yok | Aún no hay archivos | Aucun fichier pour l'instant
empty.trash | The trash is empty | Der Papierkorb ist leer | Çöp kutusu boş | La papelera está vacía | La corbeille est vide
empty.shared | No shared files | Keine geteilten Dateien | Paylaşılan dosya yok | No hay archivos compartidos | Aucun fichier partagé
empty.favorites | Mark files with ★ to see them here | Markieren Sie Dateien mit ★, um sie hier zu sehen | Burada görmek için dosyaları ★ ile işaretleyin | Marca archivos con ★ para verlos aquí | Marquez des fichiers avec ★ pour les voir ici
folder.new | New folder | Neuer Ordner | Yeni klasör | Nueva carpeta | Nouveau dossier
folder.untitled | New folder | Neuer Ordner | Yeni klasör | Nueva carpeta | Nouveau dossier
folder.created | Folder created | Ordner erstellt | Klasör oluşturuldu | Carpeta creada | Dossier créé
folder.moveTo | Move to folder… | In Ordner verschieben… | Klasöre taşı… | Mover a carpeta… | Déplacer vers un dossier…
folder.moved | Moved to “{name}” | Nach „{name}“ verschoben | “{name}” klasörüne taşındı | Movido a «{name}» | Déplacé vers « {name} »
folder.cantMove | A folder cannot be moved into itself | Ein Ordner kann nicht in sich selbst verschoben werden | Klasör kendi içine taşınamaz | Una carpeta no puede moverse dentro de sí misma | Un dossier ne peut pas être déplacé dans lui-même
folder.delete | Delete folder | Ordner löschen | Klasörü sil | Eliminar carpeta | Supprimer le dossier
folder.confirmDelete | Delete the folder “{name}”? Its contents move up one level. | Ordner „{name}“ löschen? Der Inhalt wird eine Ebene nach oben verschoben. | “{name}” klasörü silinsin mi? İçindekiler bir üst klasöre taşınır. | ¿Eliminar la carpeta «{name}»? Su contenido sube un nivel. | Supprimer le dossier « {name} » ? Son contenu remonte d’un niveau.
folder.deleted | Folder deleted | Ordner gelöscht | Klasör silindi | Carpeta eliminada | Dossier supprimé
folder.empty | This folder is empty | Dieser Ordner ist leer | Bu klasör boş | Esta carpeta está vacía | Ce dossier est vide
folder.items | {n} items | {n} Elemente | {n} öğe | {n} elementos | {n} éléments
folder.noneYet | No folders yet – create one with “New folder”. | Noch keine Ordner – erstellen Sie einen mit „Neuer Ordner“. | Henüz klasör yok – “Yeni klasör” ile oluşturun. | Aún no hay carpetas: crea una con «Nueva carpeta». | Aucun dossier – créez-en un avec « Nouveau dossier ».
fav.add | Add to favorites | Zu Favoriten | Favorilere ekle | Añadir a favoritos | Ajouter aux favoris
fav.remove | Remove from favorites | Aus Favoriten entfernen | Favorilerden çıkar | Quitar de favoritos | Retirer des favoris
trash.move | Move to trash | In den Papierkorb | Çöp kutusuna taşı | Mover a la papelera | Mettre à la corbeille
trash.moved | Moved to trash. | In den Papierkorb verschoben. | Çöp kutusuna taşındı. | Movido a la papelera. | Mis à la corbeille.
trash.restore | Restore | Wiederherstellen | Geri yükle | Restaurar | Restaurer
trash.restored | Restored | Wiederhergestellt | Geri yüklendi | Restaurado | Restauré
trash.deleteForever | Delete permanently | Endgültig löschen | Kalıcı olarak sil | Eliminar definitivamente | Supprimer définitivement
trash.empty | Empty trash | Papierkorb leeren | Çöpü boşalt | Vaciar papelera | Vider la corbeille
trash.emptied | Trash emptied | Papierkorb geleert | Çöp kutusu boşaltıldı | Papelera vaciada | Corbeille vidée
trash.confirmOne | Delete this file permanently? | Diese Datei endgültig löschen? | Bu dosya kalıcı olarak silinsin mi? | ¿Eliminar este archivo definitivamente? | Supprimer définitivement ce fichier ?
trash.confirmAll | Delete all files in the trash permanently? | Alle Dateien im Papierkorb endgültig löschen? | Çöp kutusundaki tüm dosyalar kalıcı olarak silinsin mi? | ¿Eliminar definitivamente todo lo de la papelera? | Supprimer définitivement tout le contenu de la corbeille ?
trash.hint | Files in the trash can be restored at any time. | Dateien im Papierkorb können jederzeit wiederhergestellt werden. | Çöp kutusundaki dosyalar her zaman geri yüklenebilir. | Los archivos de la papelera se pueden restaurar en cualquier momento. | Les fichiers de la corbeille peuvent être restaurés à tout moment.
file.notFound | File not found | Datei nicht gefunden | Dosya bulunamadı | Archivo no encontrado | Fichier introuvable
file.inTrash | This file is in the trash | Diese Datei liegt im Papierkorb | Bu dosya çöp kutusunda | Este archivo está en la papelera | Ce fichier est dans la corbeille
file.duplicated | Copy created | Kopie erstellt | Kopya oluşturuldu | Copia creada | Copie créée
import.ok | “{name}” imported | „{name}“ importiert | “{name}” içe aktarıldı | «{name}» importado | « {name} » importé
import.failed | Import failed | Import fehlgeschlagen | İçe aktarma başarısız | Error al importar | Échec de l'import
import.unsupported | “{name}”: format not supported | „{name}“: Format nicht unterstützt | “{name}”: biçim desteklenmiyor | «{name}»: formato no compatible | « {name} » : format non pris en charge
# ---------- share ----------
share.markShared | Share with team | Mit Team teilen | Ekiple paylaş | Compartir con el equipo | Partager avec l'équipe
share.unshare | Stop sharing | Freigabe beenden | Paylaşımı durdur | Dejar de compartir | Arrêter le partage
share.sharedOk | Now visible under “Shared” | Jetzt unter „Geteilt“ sichtbar | Artık “Paylaşılanlar” altında | Ahora visible en «Compartidos» | Visible dans « Partagés »
share.unsharedOk | Sharing stopped | Freigabe beendet | Paylaşım durduruldu | Se dejó de compartir | Partage arrêté
share.copyLink | Copy link | Link kopieren | Bağlantıyı kopyala | Copiar enlace | Copier le lien
share.linkCopied | Link copied | Link kopiert | Bağlantı kopyalandı | Enlace copiado | Lien copié
share.localHint | Links work for others when Office Werkstatt runs on a server. | Links funktionieren für andere, wenn Office Werkstatt auf einem Server läuft. | Bağlantılar, Office Werkstatt bir sunucuda çalıştığında başkaları için de çalışır. | Los enlaces funcionan para otros cuando Office Werkstatt se ejecuta en un servidor. | Les liens fonctionnent pour d'autres quand Office Werkstatt tourne sur un serveur.
# ---------- templates ----------
tpl.lead | Start faster with a ready-made layout. Every template works offline. | Schneller starten mit fertigen Layouts. Alle Vorlagen funktionieren offline. | Hazır düzenlerle daha hızlı başlayın. Tüm şablonlar çevrimdışı çalışır. | Empieza más rápido con un diseño listo. Todas las plantillas funcionan sin conexión. | Démarrez plus vite avec une mise en page prête. Tous les modèles fonctionnent hors ligne.
tpl.blankDoc | Blank document | Leeres Dokument | Boş belge | Documento en blanco | Document vierge
tpl.blankSheet | Blank workbook | Leere Arbeitsmappe | Boş çalışma kitabı | Libro en blanco | Classeur vierge
tpl.blankDeck | Blank presentation | Leere Präsentation | Boş sunum | Presentación en blanco | Présentation vierge
tpl.blankNotebook | Blank notebook | Leeres Notizbuch | Boş not defteri | Cuaderno en blanco | Bloc-notes vierge
tpl.blankBoard | Blank whiteboard | Leeres Whiteboard | Boş beyaz tahta | Pizarra en blanco | Tableau blanc vierge
tpl.letter | Letter | Brief | Mektup | Carta | Lettre
tpl.letter.sender | smyrna-pergamum e.V. · Street 1 · 64283 Darmstadt | smyrna-pergamum e.V. · Straße 1 · 64283 Darmstadt | smyrna-pergamum e.V. · Cadde 1 · 64283 Darmstadt | smyrna-pergamum e.V. · Calle 1 · 64283 Darmstadt | smyrna-pergamum e.V. · Rue 1 · 64283 Darmstadt
tpl.letter.recipient | Recipient name<br>Street<br>Postcode City | Name Empfänger<br>Straße<br>PLZ Ort | Alıcı adı<br>Adres<br>Posta kodu Şehir | Nombre del destinatario<br>Calle<br>CP Ciudad | Nom du destinataire<br>Rue<br>CP Ville
tpl.letter.subject | Subject | Betreff | Konu | Asunto | Objet
tpl.letter.salutation | Dear Sir or Madam, | Sehr geehrte Damen und Herren, | Sayın ilgili, | Estimados señores: | Madame, Monsieur,
tpl.letter.closing | Kind regards | Mit freundlichen Grüßen | Saygılarımla | Atentamente | Cordialement
tpl.letter.name | First name Last name | Vorname Nachname | Ad Soyad | Nombre Apellido | Prénom Nom
tpl.lorem | Write your text here. Use the ribbon above to format headings, lists, tables and images. | Schreiben Sie hier Ihren Text. Mit dem Menüband oben formatieren Sie Überschriften, Listen, Tabellen und Bilder. | Metninizi buraya yazın. Başlık, liste, tablo ve görselleri yukarıdaki şeritle biçimlendirin. | Escribe aquí tu texto. Usa la cinta de arriba para dar formato a títulos, listas, tablas e imágenes. | Écrivez votre texte ici. Utilisez le ruban ci-dessus pour mettre en forme titres, listes, tableaux et images.
tpl.report | Project report | Projektbericht | Proje raporu | Informe de proyecto | Rapport de projet
tpl.report.summary | Summary | Zusammenfassung | Özet | Resumen | Résumé
tpl.report.goals | Goals | Ziele | Hedefler | Objetivos | Objectifs
tpl.report.results | Results | Ergebnisse | Sonuçlar | Resultados | Résultats
tpl.report.next | Next steps | Nächste Schritte | Sonraki adımlar | Próximos pasos | Prochaines étapes
tpl.point | Point | Punkt | Madde | Punto | Point
tpl.metric | Metric | Kennzahl | Gösterge | Indicador | Indicateur
tpl.value | Value | Wert | Değer | Valor | Valeur
tpl.minutes | Meeting minutes | Protokoll | Toplantı tutanağı | Acta de reunión | Compte rendu
tpl.decisions | Decisions | Beschlüsse | Kararlar | Decisiones | Décisions
tpl.task | Task | Aufgabe | Görev | Tarea | Tâche
tpl.cv | CV | Lebenslauf | Özgeçmiş | Currículum | CV
tpl.cv.name | First name Last name | Vorname Nachname | Ad Soyad | Nombre Apellido | Prénom Nom
tpl.cv.profile | Profile | Profil | Profil | Perfil | Profil
tpl.cv.experience | Experience | Berufserfahrung | Deneyim | Experiencia | Expérience
tpl.cv.today | today | heute | bugün | hoy | aujourd'hui
tpl.cv.role | Position, Company | Position, Firma | Pozisyon, Şirket | Puesto, Empresa | Poste, Entreprise
tpl.cv.education | Education | Ausbildung | Eğitim | Formación | Formation
tpl.cv.degree | Degree, University | Abschluss, Hochschule | Derece, Üniversite | Título, Universidad | Diplôme, Université
tpl.cv.skills | Skills | Kenntnisse | Beceriler | Habilidades | Compétences
tpl.cv.languages | Languages | Sprachen | Diller | Idiomas | Langues
tpl.budget | Household budget | Haushaltsbuch | Ev bütçesi | Presupuesto familiar | Budget du foyer
tpl.category | Category | Kategorie | Kategori | Categoría | Catégorie
tpl.planned | Planned | Geplant | Planlanan | Previsto | Prévu
tpl.actual | Actual | Ist | Gerçekleşen | Real | Réel
tpl.diff | Difference | Differenz | Fark | Diferencia | Écart
tpl.rent | Rent | Miete | Kira | Alquiler | Loyer
tpl.food | Food | Lebensmittel | Gıda | Comida | Alimentation
tpl.transport | Transport | Mobilität | Ulaşım | Transporte | Transport
tpl.leisure | Leisure | Freizeit | Eğlence | Ocio | Loisirs
tpl.other | Other | Sonstiges | Diğer | Otros | Autres
tpl.timeline | Timeline & checklist | Zeitplan & Checkliste | Zaman çizelgesi & kontrol listesi | Cronograma y lista | Calendrier & checklist
tpl.owner | Owner | Verantwortlich | Sorumlu | Responsable | Responsable
tpl.start | Start | Beginn | Başlangıç | Inicio | Début
tpl.end | End | Ende | Bitiş | Fin | Fin
tpl.status | Status | Status | Durum | Estado | Statut
tpl.progress | Progress | Fortschritt | İlerleme | Progreso | Avancement
tpl.tl.1 | Kick-off meeting | Auftakttreffen | Başlangıç toplantısı | Reunión inicial | Réunion de lancement
tpl.tl.2 | Website & social media | Website & Social Media | Web sitesi & sosyal medya | Web y redes sociales | Site web & réseaux sociaux
tpl.tl.3 | Workshops | Workshops | Atölyeler | Talleres | Ateliers
tpl.tl.4 | Evaluation & report | Auswertung & Bericht | Değerlendirme & rapor | Evaluación e informe | Évaluation & rapport
tpl.invoice | Invoice | Rechnung | Fatura | Factura | Facture
tpl.item | Item | Position | Kalem | Concepto | Article
tpl.qty | Qty | Menge | Adet | Cant. | Qté
tpl.price | Unit price | Einzelpreis | Birim fiyat | Precio unitario | Prix unitaire
tpl.total | Total | Gesamt | Toplam | Total | Total
tpl.net | Net | Netto | Net | Neto | HT
tpl.vat | VAT | MwSt. | KDV | IVA | TVA
tpl.gross | Gross | Brutto | Brüt | Bruto | TTC
tpl.pitch | Pitch deck | Pitch-Deck | Sunum dosyası | Pitch deck | Pitch deck
tpl.pitch.title | Our idea | Unsere Idee | Fikrimiz | Nuestra idea | Notre idée
tpl.pitch.sub | In one sentence: what we do and why | In einem Satz: was wir tun und warum | Tek cümleyle: ne yapıyoruz ve neden | En una frase: qué hacemos y por qué | En une phrase : ce que nous faisons et pourquoi
tpl.pitch.problem | The problem | Das Problem | Sorun | El problema | Le problème
tpl.pitch.solution | Our solution | Unsere Lösung | Çözümümüz | Nuestra solución | Notre solution
tpl.pitch.market | Market & target group | Markt & Zielgruppe | Pazar & hedef kitle | Mercado y público | Marché & public cible
tpl.pitch.thanks | Thank you! | Vielen Dank! | Teşekkürler! | ¡Gracias! | Merci !
tpl.projectDeck | Project presentation | Projektpräsentation | Proje sunumu | Presentación de proyecto | Présentation de projet
tpl.project.title | EU in a nutshell | EU in a nutshell | Kısaca AB | La UE en pocas palabras | L'UE en bref
tpl.workshop | Workshop | Workshop | Atölye | Taller | Atelier
tpl.welcome | Welcome | Begrüßung | Karşılama | Bienvenida | Accueil
tpl.session | Session | Einheit | Oturum | Sesión | Session
tpl.lunch | Lunch | Mittagspause | Öğle arası | Almuerzo | Déjeuner
tpl.groupwork | Group work | Gruppenarbeit | Grup çalışması | Trabajo en grupo | Travail de groupe
tpl.school | Course notebook | Kursnotizbuch | Kurs defteri | Cuaderno del curso | Cahier de cours
tpl.school.course | German course A1 | Deutschkurs A1 | Almanca kursu A1 | Curso de alemán A1 | Cours d'allemand A1
tpl.school.lesson | Lesson | Lektion | Ders | Lección | Leçon
tpl.school.vocab | Vocabulary | Wortschatz | Kelimeler | Vocabulario | Vocabulaire
tpl.school.grammar | Grammar | Grammatik | Dilbilgisi | Gramática | Grammaire
tpl.school.homework | Homework | Hausaufgaben | Ödevler | Deberes | Devoirs
tpl.school.ideas | Ideas | Ideen | Fikirler | Ideas | Idées
tpl.meetingNotes | Meeting notebook | Besprechungsnotizen | Toplantı notları | Notas de reuniones | Notes de réunion
# ---------- settings ----------
set.appearance | Appearance | Darstellung | Görünüm | Apariencia | Apparence
set.theme | Theme | Design | Tema | Tema | Thème
set.density | Density | Dichte | Yoğunluk | Densidad | Densité
set.comfortable | Comfortable | Komfortabel | Ferah | Cómoda | Confortable
set.compact | Compact | Kompakt | Sıkışık | Compacta | Compacte
set.fileView | File view | Dateiansicht | Dosya görünümü | Vista de archivos | Affichage des fichiers
set.language | Language | Sprache | Dil | Idioma | Langue
set.name | Your name | Ihr Name | Adınız | Tu nombre | Votre nom
set.storage | Storage & offline | Speicher & Offline | Depolama & çevrimdışı | Almacenamiento y sin conexión | Stockage & hors ligne
set.mode | Storage | Speicherort | Depolama | Almacenamiento | Stockage
set.files | Files | Dateien | Dosyalar | Archivos | Fichiers
set.offline | Offline mode | Offline-Modus | Çevrimdışı mod | Modo sin conexión | Mode hors ligne
set.offlineReady | Ready (cached) | Bereit (zwischengespeichert) | Hazır (önbellekte) | Listo (en caché) | Prêt (en cache)
set.offlineFile | Running from local files | Läuft aus lokalen Dateien | Yerel dosyalardan çalışıyor | Ejecutando desde archivos locales | Exécution depuis des fichiers locaux
set.backup | Back up all files | Alle Dateien sichern | Tüm dosyaları yedekle | Copia de seguridad | Sauvegarder tout
set.restore | Restore backup | Sicherung laden | Yedeği geri yükle | Restaurar copia | Restaurer la sauvegarde
set.restored | {n} files restored | {n} Dateien wiederhergestellt | {n} dosya geri yüklendi | {n} archivos restaurados | {n} fichiers restaurés
set.install | Desktop app | Desktop-App | Masaüstü uygulaması | App de escritorio | Application de bureau
set.installText | Install Office Werkstatt as an app: it gets its own window, a desktop icon and opens DOCX, XLSX, PPTX and PDF files from your file manager. | Installieren Sie Office Werkstatt als App: eigenes Fenster, Desktop-Symbol und DOCX-, XLSX-, PPTX- und PDF-Dateien direkt aus dem Datei-Explorer öffnen. | Office Werkstatt'ı uygulama olarak kurun: kendi penceresi, masaüstü simgesi olur ve DOCX, XLSX, PPTX ve PDF dosyalarını dosya gezgininden açar. | Instala Office Werkstatt como app: tendrá su propia ventana, un icono en el escritorio y abrirá DOCX, XLSX, PPTX y PDF desde el explorador. | Installez Office Werkstatt comme application : fenêtre dédiée, icône sur le bureau et ouverture des DOCX, XLSX, PPTX et PDF depuis l'explorateur.
set.installBtn | Install app | App installieren | Uygulamayı yükle | Instalar app | Installer l'app
set.installHint | Use the install icon in the browser's address bar, or the Windows/macOS/Linux installer from the “desktop” folder. | Nutzen Sie das Installieren-Symbol in der Adressleiste oder den Windows/macOS/Linux-Installer aus dem Ordner „desktop“. | Adres çubuğundaki yükle simgesini veya “desktop” klasöründeki Windows/macOS/Linux kurulumunu kullanın. | Usa el icono de instalar en la barra de direcciones o el instalador de Windows/macOS/Linux de la carpeta «desktop». | Utilisez l'icône d'installation de la barre d'adresse ou l'installateur Windows/macOS/Linux du dossier « desktop ».
set.engines | Office engines | Office-Engines | Ofis motorları | Motores de Office | Moteurs Office
set.enginesText | All engines are built in and work offline. Each tool opens its built-in editor; the full engine opens with the button at the top right of the editor. | Alle Engines sind eingebaut und funktionieren offline. Jedes Werkzeug startet mit dem eingebauten Editor; die vollständige Engine öffnet sich über die Schaltfläche oben rechts im Editor. | Tüm motorlar yerleşiktir ve çevrimdışı çalışır. Her araç yerleşik düzenleyiciyle açılır; tam motor, düzenleyicinin sağ üstündeki butonla açılır. | Todos los motores están integrados y funcionan sin conexión. Cada herramienta abre su editor integrado; el motor completo se abre con el botón de arriba a la derecha. | Tous les moteurs sont intégrés et fonctionnent hors ligne. Chaque outil ouvre son éditeur intégré ; le moteur complet s'ouvre avec le bouton en haut à droite.
engine.installed | Full engine installed | Vollständige Engine installiert | Tam motor kurulu | Motor completo instalado | Moteur complet installé
engine.builtin | Built-in editor | Eingebauter Editor | Yerleşik düzenleyici | Editor integrado | Éditeur intégré
engine.tooltip | Open the full {name} engine | Vollständige {name}-Engine öffnen | Tam {name} motorunu aç | Abrir el motor completo {name} | Ouvrir le moteur complet {name}
about.text | Integrated offline office suite for the browser, the desktop and your own server. | Integrierte Offline-Office-Suite für Browser, Desktop und eigenen Server. | Tarayıcı, masaüstü ve kendi sunucunuz için entegre çevrimdışı ofis paketi. | Suite ofimática integrada y sin conexión para navegador, escritorio y servidor propio. | Suite bureautique intégrée hors ligne pour navigateur, bureau et serveur.
about.engines | Reference engines | Referenz-Engines | Referans motorlar | Motores de referencia | Moteurs de référence
notif.welcome | Welcome! Sample files were created for you. | Willkommen! Beispieldateien wurden angelegt. | Hoş geldiniz! Örnek dosyalar oluşturuldu. | ¡Bienvenido! Se crearon archivos de ejemplo. | Bienvenue ! Des fichiers d'exemple ont été créés.
notif.offline | Office Werkstatt works without internet. | Office Werkstatt funktioniert ohne Internet. | Office Werkstatt internetsiz çalışır. | Office Werkstatt funciona sin internet. | Office Werkstatt fonctionne sans internet.
notif.drop | Tip: drag files anywhere to import them. | Tipp: Dateien einfach hineinziehen, um sie zu importieren. | İpucu: içe aktarmak için dosyaları herhangi bir yere sürükleyin. | Consejo: arrastra archivos para importarlos. | Astuce : glissez des fichiers n'importe où pour les importer.
# ---------- editor frame ----------
editor.back | Back to dashboard | Zurück zum Dashboard | Ana sayfaya dön | Volver al inicio | Retour au tableau de bord
editor.name | Document name | Dokumentname | Belge adı | Nombre del documento | Nom du document
editor.saved | All changes saved | Alle Änderungen gespeichert | Tüm değişiklikler kaydedildi | Todos los cambios guardados | Toutes les modifications enregistrées
editor.savedNow | Saved | Gespeichert | Kaydedildi | Guardado | Enregistré
save.failed | Could not save – your changes are kept and saving is retried | Speichern fehlgeschlagen – Änderungen bleiben erhalten, neuer Versuch folgt | Kaydedilemedi – değişiklikler korunuyor, yeniden denenecek | No se pudo guardar – los cambios se conservan y se reintentará | Échec de l'enregistrement – modifications conservées, nouvel essai
save.recovered | Saved again | Wieder gespeichert | Yeniden kaydedildi | Guardado de nuevo | Enregistré à nouveau
save.closeAnyway | Your latest changes could not be saved. Close anyway and lose them? | Die letzten Änderungen konnten nicht gespeichert werden. Trotzdem schließen und verwerfen? | Son değişiklikler kaydedilemedi. Yine de kapatılsın ve kaybolsun mu? | No se pudieron guardar los últimos cambios. ¿Cerrar de todos modos y perderlos? | Les dernières modifications n'ont pas pu être enregistrées. Fermer quand même et les perdre ?
print.opening | Opening the print dialog… | Druckdialog wird geöffnet … | Yazdırma penceresi açılıyor… | Abriendo el cuadro de impresión… | Ouverture de la boîte d'impression…
pro.saveAs | Save As | Speichern unter | Farklı Kaydet | Guardar como | Enregistrer sous
pro.fileName | File name | Dateiname | Dosya adı | Nombre de archivo | Nom du fichier
pro.fileType | Save as type | Dateityp | Kayıt türü | Tipo | Type
pro.save | Save | Speichern | Kaydet | Guardar | Enregistrer
pro.hintLibrary | Saved in Office Werkstatt (library). | Wird in Office Werkstatt (Bibliothek) gespeichert. | Office Werkstatt'a (kitaplık) kaydedilir. | Se guarda en Office Werkstatt (biblioteca). | Enregistré dans Office Werkstatt (bibliothèque).
pro.hintDownload | A copy in this format is saved to your computer; the document stays in the library. | Eine Kopie in diesem Format wird auf dem Computer gespeichert; das Dokument bleibt in der Bibliothek. | Bu biçimde bir kopya bilgisayarınıza kaydedilir; belge kitaplıkta kalır. | Se guarda una copia en este formato en el equipo; el documento sigue en la biblioteca. | Une copie dans ce format est enregistrée sur l'ordinateur ; le document reste dans la bibliothèque.
pro.exported | {name} saved | {name} gespeichert | {name} kaydedildi | {name} guardado | {name} enregistré
pro.writeFailed | Could not write the file. | Datei konnte nicht geschrieben werden. | Dosya yazılamadı. | No se pudo escribir el archivo. | Impossible d'écrire le fichier.
pro.openFailed | The document could not be opened in the engine. | Das Dokument konnte nicht geöffnet werden. | Belge motorda açılamadı. | No se pudo abrir el documento. | Le document n'a pas pu être ouvert.
fmt.wordcraft.docx | Word Document | Word-Dokument | Word Belgesi | Documento de Word | Document Word
fmt.wordcraft.doc | Word 97–2003 Document (RTF) | Word 97–2003-Dokument (RTF) | Word 97–2003 Belgesi (RTF) | Documento de Word 97–2003 (RTF) | Document Word 97–2003 (RTF)
fmt.wordcraft.dotx | Word Template | Word-Vorlage | Word Şablonu | Plantilla de Word | Modèle Word
fmt.wordcraft.odt | OpenDocument Text | OpenDocument-Text | OpenDocument Metni | Texto OpenDocument | Texte OpenDocument
fmt.wordcraft.ott | OpenDocument Text Template | OpenDocument-Textvorlage | OpenDocument Metin Şablonu | Plantilla de texto OpenDocument | Modèle de texte OpenDocument
fmt.wordcraft.fodt | Flat OpenDocument Text | Flat-OpenDocument-Text | Düz OpenDocument Metni | Texto OpenDocument plano | Texte OpenDocument plat
fmt.wordcraft.rtf | Rich Text Format | Rich Text Format | Zengin Metin Biçimi | Formato de texto enriquecido | Texte mis en forme (RTF)
fmt.wordcraft.xml | Word XML Document | Word-XML-Dokument | Word XML Belgesi | Documento XML de Word | Document XML Word
fmt.wordcraft.xml2003 | Word 2003 XML Document | Word 2003-XML-Dokument | Word 2003 XML Belgesi | Documento XML de Word 2003 | Document XML Word 2003
fmt.wordcraft.pdf | PDF | PDF | PDF | PDF | PDF
fmt.wordcraft.html | Web Page | Webseite | Web Sayfası | Página web | Page web
fmt.wordcraft.md | Markdown | Markdown | Markdown | Markdown | Markdown
fmt.wordcraft.tex | LaTeX | LaTeX | LaTeX | LaTeX | LaTeX
fmt.wordcraft.txt | Plain Text | Nur Text | Düz Metin | Texto sin formato | Texte brut
fmt.wordcraft.png | Page Image | Seitenbild | Sayfa Görüntüsü | Imagen de página | Image de page
fmt.wordcraft.werkzeug | Office Werkstatt Document | Office Werkstatt-Dokument | Office Werkstatt Belgesi | Documento de Office Werkstatt | Document Office Werkstatt
fmt.gridcraft.xlsx | Excel Workbook | Excel-Arbeitsmappe | Excel Çalışma Kitabı | Libro de Excel | Classeur Excel
fmt.gridcraft.xlsm | Excel Macro-Enabled Workbook | Excel-Arbeitsmappe mit Makros | Excel Makro İçerebilen Çalışma Kitabı | Libro de Excel habilitado para macros | Classeur Excel prenant en charge les macros
fmt.gridcraft.xlsb | Excel Binary Workbook | Excel-Binärarbeitsmappe | Excel İkili Çalışma Kitabı | Libro binario de Excel | Classeur Excel binaire
fmt.gridcraft.ods | OpenDocument Spreadsheet | OpenDocument-Tabelle | OpenDocument Hesap Tablosu | Hoja de cálculo OpenDocument | Classeur OpenDocument
fmt.gridcraft.csv | CSV (Comma delimited) | CSV (Trennzeichen-getrennt) | CSV (virgülle ayrılmış) | CSV (delimitado por comas) | CSV (séparateur : virgule)
fmt.gridcraft.tsv | Text (Tab delimited) | Text (Tabstopp-getrennt) | Metin (sekmeyle ayrılmış) | Texto (delimitado por tabulaciones) | Texte (séparateur : tabulation)
fmt.gridcraft.txt | Text (Tab delimited, .txt) | Text (Tabstopp-getrennt, .txt) | Metin (sekmeyle ayrılmış, .txt) | Texto (tabulaciones, .txt) | Texte (tabulation, .txt)
fmt.gridcraft.json | JSON | JSON | JSON | JSON | JSON
fmt.gridcraft.html | Web Page | Webseite | Web Sayfası | Página web | Page web
fmt.gridcraft.pdf | PDF | PDF | PDF | PDF | PDF
fmt.gridcraft.werkzeug | Office Werkstatt Workbook | Office Werkstatt-Arbeitsmappe | Office Werkstatt Çalışma Kitabı | Libro de Office Werkstatt | Classeur Office Werkstatt
fmt.deckcraft.pptx | PowerPoint Presentation | PowerPoint-Präsentation | PowerPoint Sunusu | Presentación de PowerPoint | Présentation PowerPoint
fmt.deckcraft.pdf | PDF | PDF | PDF | PDF | PDF
fmt.deckcraft.png | PNG Images | PNG-Bilder | PNG Resimleri | Imágenes PNG | Images PNG
fmt.deckcraft.jpg | JPEG Images | JPEG-Bilder | JPEG Resimleri | Imágenes JPEG | Images JPEG
fmt.deckcraft.gif | Animated GIF | Animiertes GIF | Hareketli GIF | GIF animado | GIF animé
fmt.deckcraft.rtf | Outline (RTF) | Gliederung (RTF) | Ana Hat (RTF) | Esquema (RTF) | Plan (RTF)
fmt.deckcraft.txt | Outline (Text) | Gliederung (Text) | Ana Hat (Metin) | Esquema (texto) | Plan (texte)
fmt.deckcraft.werkzeug | Office Werkstatt Presentation | Office Werkstatt-Präsentation | Office Werkstatt Sunusu | Presentación de Office Werkstatt | Présentation Office Werkstatt
fmt.wordcraft.docm | Word Macro-Enabled Document | Word-Dokument mit Makros | Word Makro İçerebilen Belge | Documento de Word habilitado para macros | Document Word prenant en charge les macros
fmt.wordcraft.dotm | Word Macro-Enabled Template | Word-Vorlage mit Makros | Word Makro İçerebilen Şablon | Plantilla de Word habilitada para macros | Modèle Word prenant en charge les macros
fmt.gridcraft.xltx | Excel Template | Excel-Vorlage | Excel Şablonu | Plantilla de Excel | Modèle Excel
fmt.gridcraft.xltm | Excel Macro-Enabled Template | Excel-Vorlage mit Makros | Excel Makro İçerebilen Şablon | Plantilla de Excel habilitada para macros | Modèle Excel prenant en charge les macros
fmt.deckcraft.pptm | PowerPoint Macro-Enabled Presentation | PowerPoint-Präsentation mit Makros | PowerPoint Makro İçerebilen Sunu | Presentación habilitada para macros | Présentation prenant en charge les macros
fmt.deckcraft.ppsx | PowerPoint Show | PowerPoint-Bildschirmpräsentation | PowerPoint Gösterisi | Presentación con diapositivas de PowerPoint | Diaporama PowerPoint
fmt.deckcraft.ppsm | PowerPoint Macro-Enabled Show | PowerPoint-Bildschirmpräsentation mit Makros | PowerPoint Makro İçerebilen Gösteri | Presentación con macros | Diaporama prenant en charge les macros
fmt.deckcraft.potx | PowerPoint Template | PowerPoint-Vorlage | PowerPoint Şablonu | Plantilla de PowerPoint | Modèle PowerPoint
fmt.deckcraft.potm | PowerPoint Macro-Enabled Template | PowerPoint-Vorlage mit Makros | PowerPoint Makro İçerebilen Şablon | Plantilla de PowerPoint habilitada para macros | Modèle PowerPoint prenant en charge les macros
help.updates | Check for updates | Nach Updates suchen | Güncellemeleri denetle | Buscar actualizaciones | Rechercher des mises à jour
pro.saved | Saved to Office Werkstatt | In Office Werkstatt gespeichert | Office Werkstatt'a kaydedildi | Guardado en Office Werkstatt | Enregistré dans Office Werkstatt
print.failed | Printing failed | Drucken fehlgeschlagen | Yazdırma başarısız | Error al imprimir | Échec de l'impression
pdf.openFirst | Open a PDF first | Zuerst ein PDF öffnen | Önce bir PDF açın | Abra primero un PDF | Ouvrez d'abord un PDF
editor.search | Search for tools, help and more | Nach Tools, Hilfe und mehr suchen | Araç, yardım ve daha fazlasını ara | Buscar herramientas, ayuda y más | Rechercher outils, aide et plus
m.more | More | Mehr | Daha fazla | Más | Plus
m.allCommands | All commands | Alle Befehle | Tüm komutlar | Todos los comandos | Toutes les commandes
bn.home | Home | Start | Ana Sayfa | Inicio | Accueil
bn.menu | Menu | Menü | Menü | Menú | Menu
th.word.tag | Turn your ideas into documents | Aus Ideen werden Dokumente | Fikirlerini belgeye dönüştür | Convierte tus ideas en documentos | Transformez vos idées en documents
th.excel.tag | Organise your data and analyse it easily | Daten ordnen und einfach auswerten | Verilerini düzenle, kolayca analiz et | Organiza tus datos y analízalos fácilmente | Organisez vos données et analysez-les facilement
th.slide.tag | Turn your story into presentations that stick | Aus Ihrer Geschichte werden packende Präsentationen | Hikâyeni etkileyici sunumlara dönüştür | Convierte tu historia en presentaciones que impactan | Transformez votre histoire en présentations marquantes
th.note.tag | A place for your thoughts | Ein Ort für Ihre Gedanken | Düşüncelerine bir yer aç | Un lugar para tus ideas | Un espace pour vos idées
th.draw.tag | Bring your ideas together on one board | Ideen auf einem Board zusammenbringen | Fikirlerini aynı panoda buluştur | Reúne tus ideas en un mismo tablero | Réunissez vos idées sur un même tableau
th.pdf.tag | One workspace for your PDF files | Ein Arbeitsplatz für Ihre PDF-Dateien | PDF dosyaların için tek çalışma alanı | Un espacio de trabajo para tus PDF | Un espace de travail pour vos PDF
th.design.tag | Got an idea? Turn it into a design. | Eine Idee? Machen Sie ein Design daraus. | Bir fikrin var. Tasarıma dönüştür. | ¿Tienes una idea? Conviértela en diseño. | Une idée ? Faites-en un design.
th.form.tag | Ask your questions, bring the answers together | Fragen stellen, Antworten zusammenführen | Sorularını sor, yanıtları bir araya getir | Haz tus preguntas y reúne las respuestas | Posez vos questions, rassemblez les réponses
th.ai.tag | What shall we prepare together? | Was bereiten wir gemeinsam vor? | Birlikte ne hazırlayalım? | ¿Qué preparamos juntos? | Que préparons-nous ensemble ?
th.search.word | Search your documents | In Ihren Dokumenten suchen | Belgelerinde ara | Buscar en tus documentos | Rechercher dans vos documents
th.search.excel | Search your spreadsheets | In Ihren Tabellen suchen | Tablolarında ara | Buscar en tus hojas de cálculo | Rechercher dans vos classeurs
th.search.slide | Search your presentations | In Ihren Präsentationen suchen | Sunumlarında ara | Buscar en tus presentaciones | Rechercher dans vos présentations
th.search.note | Search your notes | In Ihren Notizen suchen | Notlarında ara | Buscar en tus notas | Rechercher dans vos notes
th.search.draw | Search your boards | In Ihren Boards suchen | Panolarında ara | Buscar en tus tableros | Rechercher dans vos tableaux
th.search.pdf | Search your PDF files | In Ihren PDF-Dateien suchen | PDF dosyalarında ara | Buscar en tus PDF | Rechercher dans vos PDF
th.search.design | Search your designs | In Ihren Designs suchen | Tasarımlarında ara | Buscar en tus diseños | Rechercher dans vos designs
th.search.form | Search your forms | In Ihren Formularen suchen | Formlarında ara | Buscar en tus formularios | Rechercher dans vos formulaires
th.search.ai | Search your chats | In Ihren Chats suchen | Sohbetlerinde ara | Buscar en tus chats | Rechercher dans vos discussions
th.new.word | New document | Neues Dokument | Yeni belge | Nuevo documento | Nouveau document
th.new.excel | New workbook | Neue Arbeitsmappe | Yeni çalışma kitabı | Nuevo libro | Nouveau classeur
th.new.slide | New presentation | Neue Präsentation | Yeni sunum | Nueva presentación | Nouvelle présentation
th.new.note | New note | Neue Notiz | Yeni not | Nueva nota | Nouvelle note
th.new.draw | New board | Neues Board | Yeni pano | Nuevo tablero | Nouveau tableau
th.new.pdf | Open a PDF file | PDF-Datei öffnen | PDF dosyası aç | Abrir un archivo PDF | Ouvrir un fichier PDF
th.new.design | New design | Neues Design | Yeni tasarım | Nuevo diseño | Nouveau design
th.new.form | New form | Neues Formular | Yeni form | Nuevo formulario | Nouveau formulaire
th.new.ai | New chat | Neuer Chat | Yeni sohbet | Nuevo chat | Nouvelle discussion
th.recent.word | Recent documents | Letzte Dokumente | Son belgeler | Documentos recientes | Documents récents
th.recent.excel | Recent spreadsheets | Letzte Tabellen | Son tablolar | Hojas recientes | Classeurs récents
th.recent.slide | Recent presentations | Letzte Präsentationen | Son sunumlar | Presentaciones recientes | Présentations récentes
th.recent.note | Recent notes | Letzte Notizen | Son notlar | Notas recientes | Notes récentes
th.recent.draw | Recent boards | Letzte Boards | Son panolar | Tableros recientes | Tableaux récents
th.recent.pdf | Recent PDFs | Letzte PDFs | Son PDF'ler | PDF recientes | PDF récents
th.recent.design | Recent designs | Letzte Designs | Son tasarımlar | Diseños recientes | Designs récents
th.recent.form | My forms | Meine Formulare | Formlarım | Mis formularios | Mes formulaires
th.recent.ai | Recent chats | Letzte Chats | Son sohbetler | Chats recientes | Discussions récentes
th.startTpl | Start with a template | Mit einer Vorlage beginnen | Şablonla başla | Empezar con una plantilla | Commencer avec un modèle
th.openFile | Open file | Datei öffnen | Dosya aç | Abrir archivo | Ouvrir un fichier
th.importCsv | Import CSV | CSV importieren | CSV içe aktar | Importar CSV | Importer un CSV
th.importPptx | Import PPTX | PPTX importieren | PPTX içe aktar | Importar PPTX | Importer un PPTX
th.import | Import | Importieren | İçe aktar | Importar | Importer
th.onDevice | Saved on this device | Auf diesem Gerät gespeichert | Cihazda kayıtlı | Guardado en este dispositivo | Enregistré sur cet appareil
th.onServer | Saved on the server | Auf dem Server gespeichert | Sunucuda kayıtlı | Guardado en el servidor | Enregistré sur le serveur
th.quickTools | Quick tools | Schnellwerkzeuge | Hızlı araçlar | Herramientas rápidas | Outils rapides
th.pdf.edit | Edit | Bearbeiten | Düzenle | Editar | Modifier
th.pdf.ocr | Recognise text (OCR) | Text erkennen (OCR) | Metni tanı (OCR) | Reconocer texto (OCR) | Reconnaître le texte (OCR)
th.pdf.sign | Sign | Unterschreiben | İmzala | Firmar | Signer
th.pdf.convert | Convert | Umwandeln | Dönüştür | Convertir | Convertir
th.ai.ask | What would you like to do? | Was möchten Sie tun? | Ne yapmak istersin? | ¿Qué quieres hacer? | Que voulez-vous faire ?
th.ai.noModel | No model chosen | Kein Modell gewählt | Model seçilmedi | Ningún modelo elegido | Aucun modèle choisi
th.ai.s1 | Prepare a document | Ein Dokument vorbereiten | Bir belge hazırla | Preparar un documento | Préparer un document
th.ai.s2 | Summarise my data | Meine Daten zusammenfassen | Verilerimi özetle | Resumir mis datos | Résumer mes données
th.ai.s3 | Draft a presentation | Präsentation entwerfen | Sunum taslağı oluştur | Crear un borrador de presentación | Ébaucher une présentation
th.ai.s4 | Write form questions | Formularfragen schreiben | Form soruları yaz | Escribir preguntas de formulario | Rédiger des questions de formulaire
th.all | All | Alle | Tümü | Todo | Tout
th.empty | Nothing here yet | Noch nichts da | Henüz bir şey yok | Aún no hay nada | Rien pour l’instant
editor.searchTools | Search a command… | Befehl suchen… | Komut ara… | Buscar un comando… | Rechercher une commande…
editor.comments | Comments | Kommentare | Yorumlar | Comentarios | Commentaires
editor.catchup | Catch up | Aufholen | Güncel kal | Ponerse al día | Rattraper
editor.editing | Editing | Bearbeiten | Düzenleme | Edición | Modification
editor.viewing | Viewing | Anzeigen | Görüntüleme | Lectura | Lecture
editor.share | Share | Teilen | Paylaş | Compartir | Partager
comments.empty | No comments yet. | Noch keine Kommentare. | Henüz yorum yok. | Aún no hay comentarios. | Pas encore de commentaires.
comments.placeholder | Write a comment… | Kommentar schreiben… | Yorum yazın… | Escribe un comentario… | Écrire un commentaire…
comments.add | Add comment | Kommentar hinzufügen | Yorum ekle | Añadir comentario | Ajouter
catchup.empty | No changes recorded yet. | Noch keine Änderungen. | Henüz değişiklik yok. | Aún no hay cambios. | Aucune modification.
catchup.saved | saved changes | hat Änderungen gespeichert | değişiklikleri kaydetti | guardó cambios | a enregistré des modifications
catchup.created | Created | Erstellt | Oluşturuldu | Creado | Créé
ribbon.collapse | Collapse ribbon | Menüband reduzieren | Şeridi daralt | Contraer cinta | Réduire le ruban
bs.info | Info | Informationen | Bilgi | Información | Informations
bs.save | Save | Speichern | Kaydet | Guardar | Enregistrer
bs.export | Export | Exportieren | Dışa aktar | Exportar | Exporter
bs.print | Print | Drucken | Yazdır | Imprimir | Imprimer
bs.close | Close | Schließen | Kapat | Cerrar | Fermer
field.name | Name | Name | Ad | Nombre | Nom
field.type | Type | Typ | Tür | Tipo | Type
field.created | Created | Erstellt | Oluşturulma | Creado | Créé
field.modified | Modified | Geändert | Değiştirilme | Modificado | Modifié
field.storage | Storage | Speicherort | Depolama | Almacenamiento | Stockage
export.docxHint | Opens in Word, LibreOffice and Word Werkzeug Pro | Öffnet in Word, LibreOffice und Word Werkzeug Pro | Word, LibreOffice ve Word Werkzeug Pro'ta açılır | Se abre en Word, LibreOffice y Word Werkzeug Pro | S'ouvre dans Word, LibreOffice et Word Werkzeug Pro
export.xlsxHint | Opens in Excel, LibreOffice and Excel Werkzeug Pro | Öffnet in Excel, LibreOffice und Excel Werkzeug Pro | Excel, LibreOffice ve Excel Werkzeug Pro'ta açılır | Se abre en Excel, LibreOffice y Excel Werkzeug Pro | S'ouvre dans Excel, LibreOffice et Excel Werkzeug Pro
export.pdfHint | Via the print dialog → “Save as PDF” | Über den Druckdialog → „Als PDF speichern“ | Yazdırma penceresi → “PDF olarak kaydet” | Desde imprimir → «Guardar como PDF» | Via l'impression → « Enregistrer en PDF »
export.slidesPdfHint | One slide per page | Eine Folie pro Seite | Sayfa başına bir slayt | Una diapositiva por página | Une diapositive par page
export.slidesHtmlHint | Self-contained web page | Eigenständige Webseite | Bağımsız web sayfası | Página web independiente | Page web autonome
export.noteHint | Whole notebook | Ganzes Notizbuch | Tüm not defteri | Cuaderno completo | Bloc-notes complet
export.excalidrawHint | Opens in excalidraw.com | Öffnet in excalidraw.com | excalidraw.com'da açılır | Se abre en excalidraw.com | S'ouvre dans excalidraw.com
# ---------- ribbon tabs ----------
tab.file | File | Datei | Dosya | Archivo | Fichier
tab.home | Home | Start | Giriş | Inicio | Accueil
tab.insert | Insert | Einfügen | Ekle | Insertar | Insertion
tab.layout | Layout | Layout | Düzen | Disposición | Mise en page
tab.references | References | Verweise | Başvurular | Referencias | Références
tab.review | Review | Überprüfen | Gözden geçir | Revisar | Révision
tab.view | View | Ansicht | Görünüm | Vista | Affichage
tab.help | Help | Hilfe | Yardım | Ayuda | Aide
tab.pageLayout | Page layout | Seitenlayout | Sayfa düzeni | Diseño de página | Mise en page
tab.formulas | Formulas | Formeln | Formüller | Fórmulas | Formules
tab.data | Data | Daten | Veri | Datos | Données
tab.draw | Draw | Zeichnen | Çiz | Dibujar | Dessin
tab.design | Design | Entwurf | Tasarım | Diseño | Création
tab.transitions | Transitions | Übergänge | Geçişler | Transiciones | Transitions
tab.animations | Animations | Animationen | Animasyonlar | Animaciones | Animations
tab.slideshow | Slide show | Bildschirmpräsentation | Slayt gösterisi | Presentación | Diaporama
tab.history | History | Verlauf | Geçmiş | Historial | Historique
# ---------- common formatting ----------
undo | Undo | Rückgängig | Geri al | Deshacer | Annuler
redo | Redo | Wiederholen | Yinele | Rehacer | Rétablir
paste | Paste | Einfügen | Yapıştır | Pegar | Coller
paste.hint | Use Ctrl+V to paste | Mit Strg+V einfügen | Yapıştırmak için Ctrl+V | Usa Ctrl+V para pegar | Utilisez Ctrl+V pour coller
copy | Copy | Kopieren | Kopyala | Copiar | Copier
cut | Cut | Ausschneiden | Kes | Cortar | Couper
clipboard | Clipboard | Zwischenablage | Pano | Portapapeles | Presse-papiers
formatPainter | Format painter | Format übertragen | Biçim boyacısı | Copiar formato | Reproduire la mise en forme
font | Font | Schrift | Yazı tipi | Fuente | Police
fontGrow | Increase font size | Schrift vergrößern | Yazı tipini büyüt | Aumentar tamaño | Agrandir la police
fontShrink | Decrease font size | Schrift verkleinern | Yazı tipini küçült | Reducir tamaño | Réduire la police
bold | Bold | Fett | Kalın | Negrita | Gras
italic | Italic | Kursiv | İtalik | Cursiva | Italique
underline | Underline | Unterstrichen | Altı çizili | Subrayado | Souligné
strike | Strikethrough | Durchgestrichen | Üstü çizili | Tachado | Barré
highlight | Highlight | Hervorheben | Vurgula | Resaltar | Surligner
fontColor | Font color | Schriftfarbe | Yazı rengi | Color de fuente | Couleur de police
fillColor | Fill color | Füllfarbe | Dolgu rengi | Color de relleno | Couleur de remplissage
clearFormat | Clear formatting | Formatierung löschen | Biçimlendirmeyi temizle | Borrar formato | Effacer la mise en forme
bullets | Bullets | Aufzählung | Madde işaretleri | Viñetas | Puces
numbering | Numbering | Nummerierung | Numaralandırma | Numeración | Numérotation
checklist | Checklist | Checkliste | Kontrol listesi | Lista de control | Liste de contrôle
outdent | Decrease indent | Einzug verkleinern | Girintiyi azalt | Reducir sangría | Diminuer le retrait
indent | Increase indent | Einzug vergrößern | Girintiyi artır | Aumentar sangría | Augmenter le retrait
align | Alignment | Ausrichtung | Hizalama | Alineación | Alignement
alignment | Alignment | Ausrichtung | Hizalama | Alineación | Alignement
alignLeft | Align left | Linksbündig | Sola hizala | Alinear a la izquierda | Aligner à gauche
alignCenter | Center | Zentriert | Ortala | Centrar | Centrer
alignRight | Align right | Rechtsbündig | Sağa hizala | Alinear a la derecha | Aligner à droite
justify | Justify | Blocksatz | İki yana yasla | Justificar | Justifier
table | Table | Tabelle | Tablo | Tabla | Tableau
image | Picture | Bild | Resim | Imagen | Image
link | Link | Link | Bağlantı | Vínculo | Lien
link.url | Link address | Linkadresse | Bağlantı adresi | Dirección del vínculo | Adresse du lien
shading | Shading | Schattierung | Gölgelendirme | Sombreado | Trame de fond
symbol | Symbol | Symbol | Simge | Símbolo | Symbole
comment | Comment | Kommentar | Yorum | Comentario | Commentaire
dictate | Dictate | Diktieren | Dikte et | Dictar | Dicter
zoomIn | Zoom in | Vergrößern | Yakınlaştır | Acercar | Zoom avant
zoomOut | Zoom out | Verkleinern | Uzaklaştır | Alejar | Zoom arrière
focusMode | Focus mode | Fokusmodus | Odak modu | Modo enfoque | Mode focus
help.shortcuts | Keyboard shortcuts | Tastenkombinationen | Klavye kısayolları | Atajos de teclado | Raccourcis clavier
help.about | About Office Werkstatt | Über Office Werkstatt | Office Werkstatt hakkında | Acerca de Office Werkstatt | À propos d'Office Werkstatt
shapes | Shapes | Formen | Şekiller | Formas | Formes
outline | Outline | Kontur | Anahat | Contorno | Contour
arrange | Arrange | Anordnen | Yerleştir | Organizar | Organiser
toFront | Bring to front | In den Vordergrund | Öne getir | Traer al frente | Premier plan
toBack | Send to back | In den Hintergrund | Arkaya gönder | Enviar al fondo | Arrière-plan
eraser | Eraser | Radierer | Silgi | Borrador | Gomme
shape.rect | Rectangle | Rechteck | Dikdörtgen | Rectángulo | Rectangle
shape.ellipse | Ellipse | Ellipse | Elips | Elipse | Ellipse
shape.triangle | Triangle | Dreieck | Üçgen | Triángulo | Triangle
shape.arrow | Arrow | Pfeil | Ok | Flecha | Flèche
shape.star | Star | Stern | Yıldız | Estrella | Étoile
find.find | Find | Suchen | Bul | Buscar | Rechercher
find.replace | Replace with | Ersetzen durch | Şununla değiştir | Reemplazar con | Remplacer par
find.next | Next | Weiter | Sonraki | Siguiente | Suivant
find.replaceAll | Replace all | Alle ersetzen | Tümünü değiştir | Reemplazar todo | Tout remplacer
find.none | Not found | Nicht gefunden | Bulunamadı | No encontrado | Introuvable
find.replaced | {n} replaced | {n} ersetzt | {n} değiştirildi | {n} reemplazados | {n} remplacés
# ---------- word ----------
word.st.normal | Normal | Standard | Normal | Normal | Normal
word.st.title | Title | Titel | Başlık | Título | Titre
word.st.h1 | Heading 1 | Überschrift 1 | Başlık 1 | Título 1 | Titre 1
word.st.h2 | Heading 2 | Überschrift 2 | Başlık 2 | Título 2 | Titre 2
word.st.h3 | Heading 3 | Überschrift 3 | Başlık 3 | Título 3 | Titre 3
word.st.quote | Quote | Zitat | Alıntı | Cita | Citation
word.st.code | Code | Code | Kod | Código | Code
word.editor | Editor | Editor | Düzenleyici | Editor | Éditeur
word.spellOn | Spelling check on | Rechtschreibprüfung an | Yazım denetimi açık | Ortografía activada | Orthographe activée
word.spellOff | Spelling check off | Rechtschreibprüfung aus | Yazım denetimi kapalı | Ortografía desactivada | Orthographe désactivée
word.painterHint | Select the text that should get this format | Markieren Sie den Text, der das Format erhalten soll | Bu biçimi alacak metni seçin | Selecciona el texto que recibirá el formato | Sélectionnez le texte à mettre en forme
word.pageBreak | Page break | Seitenumbruch | Sayfa sonu | Salto de página | Saut de page
word.hr | Horizontal line | Horizontale Linie | Yatay çizgi | Línea horizontal | Ligne horizontale
word.margins | Margins | Seitenränder | Kenar boşlukları | Márgenes | Marges
word.m.narrow | Narrow | Schmal | Dar | Estrecho | Étroites
word.m.normal | Normal | Normal | Normal | Normal | Normales
word.m.wide | Wide | Breit | Geniş | Ancho | Larges
word.orientation | Orientation | Ausrichtung | Yönlendirme | Orientación | Orientation
word.o.portrait | Portrait | Hochformat | Dikey | Vertical | Portrait
word.o.landscape | Landscape | Querformat | Yatay | Horizontal | Paysage
word.size | Size | Format | Boyut | Tamaño | Taille
word.columns | Columns | Spalten | Sütunlar | Columnas | Colonnes
word.toc | Table of contents | Inhaltsverzeichnis | İçindekiler | Tabla de contenido | Table des matières
word.noHeadings | Add headings first (Heading 1–3) | Fügen Sie zuerst Überschriften ein (Überschrift 1–3) | Önce başlık ekleyin (Başlık 1–3) | Primero añade títulos (Título 1–3) | Ajoutez d'abord des titres (Titre 1–3)
word.footnote | Footnote | Fußnote | Dipnot | Nota al pie | Note de bas de page
word.footnoteText | Footnote text | Fußnotentext | Dipnot metni | Texto de la nota | Texte de la note
word.spelling | Spelling | Rechtschreibung | Yazım | Ortografía | Orthographe
word.wordCount | Word count | Wörter zählen | Sözcük sayısı | Contar palabras | Statistiques
word.words | words | Wörter | sözcük | palabras | mots
word.chars | Characters | Zeichen | Karakter | Caracteres | Caractères
word.paras | Paragraphs | Absätze | Paragraf | Párrafos | Paragraphes
word.readAloud | Read aloud | Vorlesen | Sesli oku | Leer en voz alta | Lecture à voix haute
word.page | Page | Seite | Sayfa | Página | Page
word.dictateOffline | Dictation needs an internet connection – everything else works offline. | Diktieren braucht eine Internetverbindung – alles andere funktioniert offline. | Dikte için internet gerekir – diğer her şey çevrimdışı çalışır. | El dictado necesita internet; todo lo demás funciona sin conexión. | La dictée nécessite internet – tout le reste fonctionne hors ligne.
word.listening | Listening… | Ich höre zu… | Dinleniyor… | Escuchando… | À l'écoute…
# ---------- excel ----------
excel.sheet | Sheet | Tabelle | Sayfa | Hoja | Feuille
excel.addSheet | New sheet | Neues Blatt | Yeni sayfa | Nueva hoja | Nouvelle feuille
excel.general | General | Allgemein | Genel | General | Standard
excel.number | Number | Zahl | Sayı | Número | Nombre
excel.currency | Currency | Währung | Para birimi | Moneda | Monétaire
excel.percent | Percent | Prozent | Yüzde | Porcentaje | Pourcentage
excel.thousands | Thousands separator | Tausendertrennzeichen | Binlik ayırıcı | Separador de miles | Séparateur de milliers
excel.decInc | Increase decimals | Dezimalstelle hinzufügen | Ondalık artır | Aumentar decimales | Ajouter une décimale
excel.decDec | Decrease decimals | Dezimalstelle entfernen | Ondalık azalt | Disminuir decimales | Réduire les décimales
excel.borders | Borders | Rahmenlinien | Kenarlıklar | Bordes | Bordures
excel.top | Top align | Oben ausrichten | Üste hizala | Alinear arriba | Aligner en haut
excel.middle | Middle align | Zentriert ausrichten | Ortaya hizala | Alinear al centro | Aligner au milieu
excel.bottom | Bottom align | Unten ausrichten | Alta hizala | Alinear abajo | Aligner en bas
excel.wrap | Wrap text | Textumbruch | Metni kaydır | Ajustar texto | Renvoyer à la ligne
excel.merge | Merge & center | Verbinden und zentrieren | Birleştir ve ortala | Combinar y centrar | Fusionner et centrer
excel.styles | Styles | Formatvorlagen | Stiller | Estilos | Styles
excel.cf | Conditional formatting | Bedingte Formatierung | Koşullu biçimlendirme | Formato condicional | Mise en forme conditionnelle
excel.cfGreater | Highlight values greater than… | Werte hervorheben größer als… | Şundan büyük değerleri vurgula… | Resaltar valores mayores que… | Surligner les valeurs supérieures à…
excel.cfLess | Highlight values less than… | Werte hervorheben kleiner als… | Şundan küçük değerleri vurgula… | Resaltar valores menores que… | Surligner les valeurs inférieures à…
excel.cfClear | Clear rules | Regeln löschen | Kuralları temizle | Borrar reglas | Effacer les règles
excel.asTable | Format as table | Als Tabelle formatieren | Tablo olarak biçimlendir | Dar formato como tabla | Mettre sous forme de tableau
excel.cellStyles | Cell styles | Zellenformate | Hücre stilleri | Estilos de celda | Styles de cellule
excel.good | Good | Gut | İyi | Bueno | Satisfaisant
excel.bad | Bad | Schlecht | Kötü | Malo | Insatisfaisant
excel.neutral | Neutral | Neutral | Nötr | Neutral | Neutre
excel.heading | Heading | Überschrift | Başlık | Encabezado | Titre
excel.cells | Cells | Zellen | Hücreler | Celdas | Cellules
excel.insertRow | Insert row | Zeile einfügen | Satır ekle | Insertar fila | Insérer une ligne
excel.deleteRow | Delete row | Zeile löschen | Satır sil | Eliminar fila | Supprimer la ligne
excel.format | Format | Format | Biçim | Formato | Format
excel.colWidth | Column width | Spaltenbreite | Sütun genişliği | Ancho de columna | Largeur de colonne
excel.autofit | Default width | Standardbreite | Varsayılan genişlik | Ancho predeterminado | Largeur par défaut
excel.autosum | AutoSum | AutoSumme | Otomatik Toplam | Autosuma | Somme automatique
excel.clearAll | Clear all | Alle löschen | Tümünü temizle | Borrar todo | Tout effacer
excel.clearFormats | Clear formats | Formate löschen | Biçimleri temizle | Borrar formatos | Effacer les formats
excel.clearContents | Clear contents | Inhalte löschen | İçeriği temizle | Borrar contenido | Effacer le contenu
excel.sortFilter | Sort & filter | Sortieren und Filtern | Sırala ve filtrele | Ordenar y filtrar | Trier et filtrer
excel.sortAsc | Sort A → Z | Von A bis Z sortieren | A → Z sırala | Ordenar A → Z | Trier de A à Z
excel.sortDesc | Sort Z → A | Von Z bis A sortieren | Z → A sırala | Ordenar Z → A | Trier de Z à A
excel.filter | Filter | Filtern | Filtre | Filtro | Filtrer
excel.showAll | Show all | Alle anzeigen | Tümünü göster | Mostrar todo | Tout afficher
excel.findSelect | Find & select | Suchen und auswählen | Bul ve seç | Buscar y seleccionar | Rechercher et sélectionner
excel.charts | Charts | Diagramme | Grafikler | Gráficos | Graphiques
excel.chart | Chart | Diagramm | Grafik | Gráfico | Graphique
excel.bar | Column chart | Säulendiagramm | Sütun grafik | Columnas | Histogramme
excel.line | Line chart | Liniendiagramm | Çizgi grafik | Líneas | Courbes
excel.functions | Functions | Funktionen | İşlevler | Funciones | Fonctions
excel.function | Insert function | Funktion einfügen | İşlev ekle | Insertar función | Insérer une fonction
excel.sheetOptions | Sheet options | Blattoptionen | Sayfa seçenekleri | Opciones de hoja | Options de feuille
excel.gridlines | Gridlines | Gitternetzlinien | Kılavuz çizgileri | Líneas de cuadrícula | Quadrillage
excel.showFormulas | Show formulas | Formeln anzeigen | Formülleri göster | Mostrar fórmulas | Afficher les formules
excel.importCsv | Import CSV | CSV importieren | CSV içe aktar | Importar CSV | Importer CSV
excel.exportCsv | Export CSV | CSV exportieren | CSV dışa aktar | Exportar CSV | Exporter CSV
excel.window | Window | Fenster | Pencere | Ventana | Fenêtre
excel.freeze | Freeze top row | Oberste Zeile fixieren | Üst satırı dondur | Inmovilizar fila superior | Figer la ligne supérieure
excel.ready | Ready | Bereit | Hazır | Listo | Prêt
excel.average | Average | Mittelwert | Ortalama | Promedio | Moyenne
excel.count | Count | Anzahl | Sayım | Recuento | Nombre
excel.sum | Sum | Summe | Toplam | Suma | Somme
excel.selectRange | Select a range of cells first | Markieren Sie zuerst einen Zellbereich | Önce bir hücre aralığı seçin | Selecciona primero un rango de celdas | Sélectionnez d'abord une plage de cellules
excel.painterHint | Click the target cell | Klicken Sie auf die Zielzelle | Hedef hücreye tıklayın | Haz clic en la celda de destino | Cliquez sur la cellule cible
excel.shortcuts | Arrows / Tab / Enter: move · F2: edit · Ctrl+C / V / X · Ctrl+B / I / U · Ctrl+Z / Y · Delete: clear · Formulas: =SUM(A1:A5), =AVERAGE(), =IF(), =ROUND() … (also SUMME, TOPLA, SUMA, SOMME) | Pfeile / Tab / Enter: bewegen · F2: bearbeiten · Strg+C / V / X · Strg+B / I / U · Strg+Z / Y · Entf: löschen · Formeln: =SUMME(A1:A5), =MITTELWERT(), =WENN(), =RUNDEN() … | Oklar / Tab / Enter: hareket · F2: düzenle · Ctrl+C / V / X · Ctrl+B / I / U · Ctrl+Z / Y · Delete: temizle · Formüller: =TOPLA(A1:A5), =ORTALAMA(), =EĞER(), =YUVARLA() … | Flechas / Tab / Intro: mover · F2: editar · Ctrl+C / V / X · Ctrl+B / I / U · Ctrl+Z / Y · Supr: borrar · Fórmulas: =SUMA(A1:A5), =PROMEDIO(), =SI(), =REDONDEAR() … | Flèches / Tab / Entrée : déplacer · F2 : modifier · Ctrl+C / V / X · Ctrl+B / I / U · Ctrl+Z / Y · Suppr : effacer · Formules : =SOMME(A1:A5), =MOYENNE(), =SI(), =ARRONDI() …
# ---------- slides ----------
slide.clickTitle | Click to add title | Titel durch Klicken hinzufügen | Başlık eklemek için tıklayın | Haz clic para agregar título | Cliquez pour ajouter un titre
slide.clickSubtitle | Click to add subtitle | Untertitel durch Klicken hinzufügen | Alt başlık eklemek için tıklayın | Haz clic para agregar subtítulo | Cliquez pour ajouter un sous-titre
slide.newTitle | New slide | Neue Folie | Yeni slayt | Nueva diapositiva | Nouvelle diapositive
slide.point | Add text | Text hinzufügen | Metin ekleyin | Agregar texto | Ajouter du texte
slide.new | New slide | Neue Folie | Yeni slayt | Nueva diapositiva | Nouvelle diapositive
slide.layout | Layout | Layout | Düzen | Diseño | Disposition
slide.l.title | Title slide | Titelfolie | Başlık slaytı | Diapositiva de título | Diapositive de titre
slide.l.content | Title and content | Titel und Inhalt | Başlık ve içerik | Título y contenido | Titre et contenu
slide.l.two | Two content | Zwei Inhalte | İki içerik | Dos contenidos | Deux contenus
slide.l.section | Section header | Abschnittsüberschrift | Bölüm başlığı | Encabezado de sección | En-tête de section
slide.l.blank | Blank | Leer | Boş | En blanco | Vide
slide.hide | Hide slide | Folie ausblenden | Slaytı gizle | Ocultar diapositiva | Masquer la diapositive
slide.duplicate | Duplicate slide | Folie duplizieren | Slaytı çoğalt | Duplicar diapositiva | Dupliquer la diapositive
slide.designer | Designer | Designer | Tasarımcı | Diseñador | Concepteur
slide.designApplied | Design “{name}” applied | Design „{name}“ angewendet | “{name}” tasarımı uygulandı | Diseño «{name}» aplicado | Thème « {name} » appliqué
slide.selectFirst | Select an object on the slide first | Wählen Sie zuerst ein Objekt auf der Folie aus | Önce slayttaki bir nesneyi seçin | Selecciona primero un objeto | Sélectionnez d'abord un objet
slide.textbox | Text box | Textfeld | Metin kutusu | Cuadro de texto | Zone de texte
slide.typeHere | Type here | Hier tippen | Buraya yazın | Escribe aquí | Saisissez ici
slide.openDraw | Open Draw Werkzeug | Draw Werkzeug öffnen | Draw Werkzeug'u aç | Abrir Draw Werkzeug | Ouvrir Draw Werkzeug
slide.background | Background | Hintergrund | Arka plan | Fondo | Arrière-plan
slide.tr.none | None | Ohne | Yok | Ninguna | Aucune
slide.tr.fade | Fade | Verblassen | Soldur | Desvanecer | Fondu
slide.tr.push | Push | Schieben | İt | Empujar | Pousser
slide.tr.zoom | Zoom | Zoom | Yakınlaş | Zoom | Zoom
slide.tr.flip | Flip | Drehen | Çevir | Voltear | Retourner
slide.applyAll | Apply to all | Für alle übernehmen | Tümüne uygula | Aplicar a todas | Appliquer à tout
slide.applied | Applied to all slides | Auf alle Folien angewendet | Tüm slaytlara uygulandı | Aplicado a todas | Appliqué à toutes les diapositives
slide.preview | Preview | Vorschau | Önizleme | Vista previa | Aperçu
slide.fromStart | From beginning | Von Beginn an | Baştan başlat | Desde el principio | À partir du début
slide.fromCurrent | From current slide | Ab aktueller Folie | Geçerli slayttan | Desde la actual | À partir de la diapositive actuelle
slide.notes | Notes | Notizen | Notlar | Notas | Commentaires
slide.notesPh | Click to add speaker notes | Klicken, um Notizen hinzuzufügen | Konuşmacı notları eklemek için tıklayın | Haz clic para agregar notas | Cliquez pour ajouter des commentaires
slide.thumbs | Slide thumbnails | Folienminiaturen | Slayt küçük resimleri | Miniaturas | Miniatures
slide.present | Present | Präsentieren | Sun | Presentar | Présenter
slide.slide | Slide | Folie | Slayt | Diapositiva | Diapositive
slide.shortcuts | F5: start show · → / Space: next · ←: back · Esc: end · Double-click: edit text · Del: delete object | F5: Präsentation starten · → / Leertaste: weiter · ←: zurück · Esc: beenden · Doppelklick: Text bearbeiten · Entf: Objekt löschen | F5: gösteriyi başlat · → / Boşluk: ileri · ←: geri · Esc: bitir · Çift tık: metni düzenle · Del: nesneyi sil | F5: iniciar · → / Espacio: siguiente · ←: atrás · Esc: salir · Doble clic: editar texto · Supr: eliminar objeto | F5 : lancer · → / Espace : suivant · ← : précédent · Échap : terminer · Double-clic : modifier le texte · Suppr : supprimer l'objet
# ---------- notes ----------
note.quickNotes | Quick notes | Schnelle Notizen | Hızlı notlar | Notas rápidas | Notes rapides
note.untitled | Untitled page | Unbenannte Seite | Adsız sayfa | Página sin título | Page sans titre
note.newSection | New section | Neuer Abschnitt | Yeni bölüm | Nueva sección | Nouvelle section
note.section | Section | Abschnitt | Bölüm | Sección | Section
note.addPage | Add page | Seite hinzufügen | Sayfa ekle | Agregar página | Ajouter une page
note.sort | Sort pages | Seiten sortieren | Sayfaları sırala | Ordenar páginas | Trier les pages
note.sortManual | Manual | Manuell | Elle | Manual | Manuel
note.sortAlpha | Alphabetical | Alphabetisch | Alfabetik | Alfabético | Alphabétique
note.sortDate | Date created | Erstelldatum | Oluşturma tarihi | Fecha de creación | Date de création
note.color | Change color | Farbe ändern | Rengi değiştir | Cambiar color | Changer la couleur
note.titlePh | Page title | Seitentitel | Sayfa başlığı | Título de la página | Titre de la page
note.noPage | Add a page to start writing | Fügen Sie eine Seite hinzu, um zu schreiben | Yazmaya başlamak için sayfa ekleyin | Agrega una página para empezar | Ajoutez une page pour écrire
note.tags | Tags | Kategorien | Etiketler | Etiquetas | Indicateurs
note.tag.todo | To do | Aufgabe | Yapılacak | Tarea | À faire
note.tag.important | Important | Wichtig | Önemli | Importante | Important
note.tag.question | Question | Frage | Soru | Pregunta | Question
note.tag.idea | Idea | Idee | Fikir | Idea | Idée
note.styles | Styles | Formatvorlagen | Stiller | Estilos | Styles
note.emailPage | Email page | Seite per E-Mail | Sayfayı e-postala | Enviar página | Envoyer la page
note.meeting | Meeting details | Besprechungsdetails | Toplantı ayrıntıları | Detalles de reunión | Détails de la réunion
note.meetingInsert | Insert meeting template | Besprechungsvorlage einfügen | Toplantı şablonu ekle | Insertar plantilla | Insérer le modèle de réunion
note.calendar | Calendar | Kalender | Takvim | Calendario | Calendrier
cal.today | Today | Heute | Bugün | Hoy | Aujourd'hui
cal.prev | Previous month | Vorheriger Monat | Önceki ay | Mes anterior | Mois précédent
cal.next | Next month | Nächster Monat | Sonraki ay | Mes siguiente | Mois suivant
cal.newEvent | New event | Neuer Termin | Yeni etkinlik | Nuevo evento | Nouvel événement
cal.editEvent | Edit event | Termin bearbeiten | Etkinliği düzenle | Editar evento | Modifier l'événement
cal.title | Title | Titel | Başlık | Título | Titre
cal.date | Date | Datum | Tarih | Fecha | Date
cal.start | Start | Beginn | Başlangıç | Inicio | Début
cal.end | End | Ende | Bitiş | Fin | Fin
cal.allDay | All day | Ganztägig | Tüm gün | Todo el día | Toute la journée
cal.notes | Notes | Notizen | Notlar | Notas | Notes
cal.linkPage | Linked page | Verknüpfte Seite | Bağlı sayfa | Página vinculada | Page liée
cal.noLink | – none – | – keine – | – yok – | – ninguna – | – aucune –
cal.meetingPage | Create meeting notes | Besprechungsnotizen anlegen | Toplantı notu oluştur | Crear notas de reunión | Créer des notes de réunion
cal.openPage | Open page | Seite öffnen | Sayfayı aç | Abrir página | Ouvrir la page
cal.when | When | Wann | Zaman | Cuándo | Quand
cal.untitled | (no title) | (ohne Titel) | (başlıksız) | (sin título) | (sans titre)
cal.noEvents | No events on this day. | Keine Termine an diesem Tag. | Bu günde etkinlik yok. | No hay eventos este día. | Aucun événement ce jour-là.
cal.addThisDay | Add event | Termin hinzufügen | Etkinlik ekle | Añadir evento | Ajouter un événement
cal.pagesThatDay | Pages from this day | Seiten von diesem Tag | Bu günün sayfaları | Páginas de este día | Pages de ce jour
cal.upcoming | Upcoming | Demnächst | Yaklaşanlar | Próximos | À venir
cal.noUpcoming | Nothing planned. | Nichts geplant. | Planlanmış bir şey yok. | Nada planificado. | Rien de prévu.
cal.events | events | Termine | etkinlik | eventos | événements
cal.exportIcs | Export calendar (.ics) | Kalender exportieren (.ics) | Takvimi dışa aktar (.ics) | Exportar calendario (.ics) | Exporter le calendrier (.ics)
cal.importIcs | Import calendar (.ics) | Kalender importieren (.ics) | Takvim içe aktar (.ics) | Importar calendario (.ics) | Importer un calendrier (.ics)
cal.exportHint | For Outlook, Google Calendar, Thunderbird … | Für Outlook, Google Kalender, Thunderbird … | Outlook, Google Takvim, Thunderbird … için | Para Outlook, Google Calendar, Thunderbird … | Pour Outlook, Google Agenda, Thunderbird …
cal.imported | {n} events imported | {n} Termine importiert | {n} etkinlik içe aktarıldı | {n} eventos importados | {n} événements importés
note.participants | Participants | Teilnehmende | Katılımcılar | Participantes | Participants
note.agenda | Agenda | Tagesordnung | Gündem | Orden del día | Ordre du jour
note.actions | Action items | Aufgaben | Eylem maddeleri | Tareas | Actions
note.typeMode | Type | Tippen | Yaz | Escribir | Saisie
note.pen | Pen | Stift | Kalem | Bolígrafo | Stylo
note.clearInk | Clear ink | Freihand löschen | Mürekkebi temizle | Borrar trazos | Effacer l'encre
note.recentEdits | Recent edits | Letzte Änderungen | Son düzenlemeler | Ediciones recientes | Modifications récentes
note.navigation | Navigation | Navigation | Gezinti | Navegación | Navigation
note.pages | pages | Seiten | sayfa | páginas | pages
# ---------- draw ----------
board.menu | Menu | Menü | Menü | Menú | Menu
board.hintTitle | Your board is empty | Dein Board ist leer | Pano boş | Tu pizarra está vacía | Votre tableau est vide
board.hint | Double-click anywhere for a note · tools on the Home tab · templates on the Insert tab | Doppelklick irgendwo für eine Notiz · Werkzeuge im Reiter Start · Vorlagen im Reiter Einfügen | Not için herhangi bir yere çift tıklayın · araçlar Giriş sekmesinde · şablonlar Ekle sekmesinde | Doble clic para una nota · herramientas en Inicio · plantillas en Insertar | Double-clic pour une note · outils dans Accueil · modèles dans Insertion
board.t.select | Select | Auswählen | Seç | Seleccionar | Sélectionner
board.t.hand | Hand (move the view) | Hand (Ansicht verschieben) | El (görünümü kaydır) | Mano (mover la vista) | Main (déplacer la vue)
board.t.note | Note | Notiz | Not | Nota | Note
board.t.sticky | Sticky note | Haftnotiz | Yapışkan not | Nota adhesiva | Note adhésive
board.t.text | Text | Text | Metin | Texto | Texte
board.t.shape | Shape (double-click: choose) | Form (Doppelklick: wählen) | Şekil (çift tık: seç) | Forma (doble clic: elegir) | Forme (double-clic : choisir)
board.t.connector | Connector | Verbinder | Bağlantı | Conector | Connecteur
board.t.pen | Pen (double-click: colour) | Stift (Doppelklick: Farbe) | Kalem (çift tık: renk) | Lápiz (doble clic: color) | Stylo (double-clic : couleur)
board.t.eraser | Eraser | Radierer | Silgi | Borrador | Gomme
board.t.frame | Frame | Rahmen | Çerçeve | Marco | Cadre
board.t.mind | Mind map | Mindmap | Zihin haritası | Mapa mental | Carte mentale
board.t.image | Image | Bild | Resim | Imagen | Image
board.frame | Frame | Rahmen | Çerçeve | Marco | Cadre
board.frameTitle | Frame title | Rahmentitel | Çerçeve başlığı | Título del marco | Titre du cadre
board.focusFrame | Zoom to frame | Auf Rahmen zoomen | Çerçeveye yakınlaş | Ampliar al marco | Zoomer sur le cadre
board.color | Colour | Farbe | Renk | Color | Couleur
board.shapeKind | Shape | Form | Şekil | Forma | Forme
board.k.rect | Rectangle | Rechteck | Dikdörtgen | Rectángulo | Rectangle
board.k.roundRect | Rounded rectangle | Abgerundetes Rechteck | Yuvarlak dikdörtgen | Rectángulo redondeado | Rectangle arrondi
board.k.ellipse | Ellipse | Ellipse | Elips | Elipse | Ellipse
board.k.diamond | Diamond | Raute | Eşkenar dörtgen | Rombo | Losange
board.k.triangle | Triangle | Dreieck | Üçgen | Triángulo | Triangle
board.straight | Straight | Gerade | Düz | Recto | Droit
board.curve | Curved | Gebogen | Eğri | Curvo | Courbe
board.elbow | Elbow | Gewinkelt | Köşeli | En ángulo | Coudé
board.arrowHead | Arrow head | Pfeilspitze | Ok ucu | Punta de flecha | Pointe de flèche
board.addChild | Add sub-topic | Unterthema hinzufügen | Alt konu ekle | Añadir subtema | Ajouter un sous-thème
board.addSibling | Add topic | Thema hinzufügen | Konu ekle | Añadir tema | Ajouter un thème
board.front | Bring to front | Nach vorne | Öne getir | Traer al frente | Premier plan
board.back | Send to back | Nach hinten | Arkaya gönder | Enviar al fondo | Arrière-plan
board.pen.fine | Fine | Fein | İnce | Fino | Fin
board.pen.normal | Normal | Normal | Normal | Normal | Normal
board.pen.bold | Bold | Kräftig | Kalın | Grueso | Épais
board.templates | Templates | Vorlagen | Şablonlar | Plantillas | Modèles
board.tpl.brainstorm | Brainstorming | Brainstorming | Beyin fırtınası | Lluvia de ideas | Brainstorming
board.tpl.mind | Mind map | Mindmap | Zihin haritası | Mapa mental | Carte mentale
board.tpl.kanban | Kanban board | Kanban-Board | Kanban panosu | Tablero Kanban | Tableau Kanban
board.tpl.retro | Retrospective | Retrospektive | Retrospektif | Retrospectiva | Rétrospective
board.tpl.swot | SWOT analysis | SWOT-Analyse | SWOT analizi | Análisis DAFO | Analyse SWOT
board.tpl.flow | Flowchart | Flussdiagramm | Akış şeması | Diagrama de flujo | Organigramme
board.tpl.question | Our question | Unsere Frage | Sorumuz | Nuestra pregunta | Notre question
board.tpl.questionHint | Collect ideas around it – one per sticky note. | Sammelt Ideen drumherum – eine pro Haftnotiz. | Etrafına fikir toplayın – her yapışkan nota bir fikir. | Reunid ideas alrededor: una por nota. | Rassemblez des idées autour – une par note.
board.tpl.idea | Idea | Idee | Fikir | Idea | Idée
board.tpl.good | What went well | Was lief gut | İyi giden | Qué fue bien | Ce qui a bien marché
board.tpl.improve | What to improve | Was verbessern | Geliştirilecek | Qué mejorar | À améliorer
board.tpl.actions | Action items | Maßnahmen | Aksiyonlar | Acciones | Actions
board.tpl.s | Strengths | Stärken | Güçlü yönler | Fortalezas | Forces
board.tpl.w | Weaknesses | Schwächen | Zayıf yönler | Debilidades | Faiblesses
board.tpl.o | Opportunities | Chancen | Fırsatlar | Oportunidades | Opportunités
board.tpl.t | Threats | Risiken | Tehditler | Amenazas | Menaces
board.c.ink | Default | Standard | Varsayılan | Predeterminado | Par défaut
board.c.none | No fill | Keine Füllung | Dolgu yok | Sin relleno | Sans remplissage
board.c.white | White | Weiß | Beyaz | Blanco | Blanc
board.c.yellow | Yellow | Gelb | Sarı | Amarillo | Jaune
board.c.orange | Orange | Orange | Turuncu | Naranja | Orange
board.c.red | Red | Rot | Kırmızı | Rojo | Rouge
board.c.pink | Pink | Rosa | Pembe | Rosa | Rose
board.c.purple | Purple | Lila | Mor | Morado | Violet
board.c.blue | Blue | Blau | Mavi | Azul | Bleu
board.c.teal | Teal | Türkis | Turkuaz | Turquesa | Turquoise
board.c.green | Green | Grün | Yeşil | Verde | Vert
board.c.gray | Grey | Grau | Gri | Gris | Gris
board.shortcuts | V select · H hand · N note · S sticky note · T text · R shape · C connector · P pen · E eraser · F frame · M mind map · I image<br>Double-click empty space: new note · Double-click an element: edit · Enter: edit selection · Esc: done<br>Mind map: Tab = sub-topic · Enter = next topic<br>Space + drag / middle mouse / scroll: move · Ctrl + scroll: zoom · Shift+1: show all<br>Ctrl+C / X / V · Ctrl+D duplicate · Ctrl+Z / Y · Delete · arrow keys move | V Auswählen · H Hand · N Notiz · S Haftnotiz · T Text · R Form · C Verbinder · P Stift · E Radierer · F Rahmen · M Mindmap · I Bild<br>Doppelklick auf leere Fläche: neue Notiz · Doppelklick auf Element: bearbeiten · Enter: Auswahl bearbeiten · Esc: fertig<br>Mindmap: Tab = Unterthema · Enter = nächstes Thema<br>Leertaste + Ziehen / mittlere Maustaste / Scrollen: verschieben · Strg + Scrollen: Zoom · Umschalt+1: alles zeigen<br>Strg+C / X / V · Strg+D duplizieren · Strg+Z / Y · Entf · Pfeiltasten verschieben | V seç · H el · N not · S yapışkan not · T metin · R şekil · C bağlantı · P kalem · E silgi · F çerçeve · M zihin haritası · I resim<br>Boş alana çift tık: yeni not · Öğeye çift tık: düzenle · Enter: seçileni düzenle · Esc: bitir<br>Zihin haritası: Tab = alt konu · Enter = sonraki konu<br>Boşluk + sürükle / orta tuş / kaydırma: görünümü taşı · Ctrl + kaydırma: yakınlaştır · Shift+1: tümünü göster<br>Ctrl+C / X / V · Ctrl+D çoğalt · Ctrl+Z / Y · Delete · ok tuşları taşır | V seleccionar · H mano · N nota · S nota adhesiva · T texto · R forma · C conector · P lápiz · E borrador · F marco · M mapa mental · I imagen<br>Doble clic en vacío: nueva nota · Doble clic en elemento: editar · Enter: editar · Esc: terminar<br>Mapa mental: Tab = subtema · Enter = siguiente tema<br>Espacio + arrastrar / botón central / desplazar: mover · Ctrl + desplazar: zoom · Mayús+1: ver todo<br>Ctrl+C / X / V · Ctrl+D duplicar · Ctrl+Z / Y · Supr · flechas mueven | V sélectionner · H main · N note · S note adhésive · T texte · R forme · C connecteur · P stylo · E gomme · F cadre · M carte mentale · I image<br>Double-clic sur le vide : nouvelle note · Double-clic sur un élément : modifier · Entrée : modifier · Échap : terminer<br>Carte mentale : Tab = sous-thème · Entrée = thème suivant<br>Espace + glisser / bouton du milieu / défilement : déplacer · Ctrl + défilement : zoom · Maj+1 : tout afficher<br>Ctrl+C / X / V · Ctrl+D dupliquer · Ctrl+Z / Y · Suppr · flèches déplacent
draw.t.hand | Hand (pan) | Hand (verschieben) | El (kaydır) | Mano (desplazar) | Main (déplacer)
draw.t.select | Selection | Auswahl | Seçim | Selección | Sélection
draw.t.rectangle | Rectangle | Rechteck | Dikdörtgen | Rectángulo | Rectangle
draw.t.diamond | Diamond | Raute | Eşkenar dörtgen | Rombo | Losange
draw.t.ellipse | Ellipse | Ellipse | Elips | Elipse | Ellipse
draw.t.arrow | Arrow | Pfeil | Ok | Flecha | Flèche
draw.t.line | Line | Linie | Çizgi | Línea | Ligne
draw.t.freedraw | Draw | Zeichnen | Serbest çizim | Dibujar | Dessiner
draw.t.text | Text | Text | Metin | Texto | Texte
draw.t.eraser | Eraser | Radierer | Silgi | Borrador | Gomme
draw.lock | Keep selected tool active | Werkzeug beibehalten | Seçili aracı kilitle | Mantener herramienta | Garder l'outil actif
draw.stroke | Stroke | Strich | Çizgi rengi | Trazo | Trait
draw.background | Background | Hintergrund | Arka plan | Fondo | Arrière-plan
draw.fill | Fill | Füllung | Dolgu | Relleno | Remplissage
draw.width | Stroke width | Strichstärke | Çizgi kalınlığı | Grosor | Épaisseur
draw.strokeStyle | Stroke style | Strichart | Çizgi stili | Estilo de trazo | Style de trait
draw.sloppiness | Sloppiness | Skizzenhaftigkeit | Elle çizim etkisi | Trazo a mano | Style crayonné
draw.fontSize | Font size | Schriftgröße | Yazı boyutu | Tamaño de fuente | Taille de police
draw.opacity | Opacity | Deckkraft | Opaklık | Opacidad | Opacité
draw.actions | Actions | Aktionen | Eylemler | Acciones | Actions
draw.fit | Zoom to fit | Alles anzeigen | Sığdır | Ajustar | Tout afficher
draw.library | Library | Bibliothek | Kitaplık | Biblioteca | Bibliothèque
draw.lib.flow | Flowchart | Flussdiagramm | Akış şeması | Diagrama de flujo | Organigramme
draw.lib.mind | Mind map | Mindmap | Zihin haritası | Mapa mental | Carte mentale
draw.lib.kanban | Kanban board | Kanban-Board | Kanban panosu | Tablero Kanban | Tableau Kanban
draw.lib.start | Start | Start | Başla | Inicio | Début
draw.lib.step | Step | Schritt | Adım | Paso | Étape
draw.lib.decision | Decision? | Entscheidung? | Karar? | ¿Decisión? | Décision ?
draw.lib.end | End | Ende | Bitiş | Fin | Fin
draw.lib.idea | Main idea | Hauptidee | Ana fikir | Idea principal | Idée principale
draw.lib.topic | Topic | Thema | Konu | Tema | Thème
draw.lib.todo | To do | Zu erledigen | Yapılacak | Pendiente | À faire
draw.lib.doing | In progress | In Arbeit | Devam eden | En curso | En cours
draw.lib.done | Done | Erledigt | Tamamlandı | Hecho | Terminé
draw.lib.card | Task card | Aufgabenkarte | Görev kartı | Tarjeta | Carte
draw.importExcalidraw | Import .excalidraw | .excalidraw importieren | .excalidraw içe aktar | Importar .excalidraw | Importer .excalidraw
draw.clear | Clear canvas | Zeichenfläche leeren | Tuvali temizle | Limpiar lienzo | Effacer le canevas
draw.clearConfirm | Remove all elements? | Alle Elemente entfernen? | Tüm öğeler silinsin mi? | ¿Eliminar todos los elementos? | Supprimer tous les éléments ?
draw.empty | The canvas is empty | Die Zeichenfläche ist leer | Tuval boş | El lienzo está vacío | Le canevas est vide
draw.elements | elements | Elemente | öğe | elementos | éléments
draw.hint | Pick a tool above (or press 1–9) and start drawing. Double-click to write text. | Wählen Sie oben ein Werkzeug (oder Taste 1–9) und legen Sie los. Doppelklick schreibt Text. | Yukarıdan bir araç seçin (veya 1–9 tuşları) ve çizmeye başlayın. Metin için çift tıklayın. | Elige una herramienta arriba (o pulsa 1–9) y empieza a dibujar. Doble clic para escribir. | Choisissez un outil ci-dessus (ou touches 1–9) et dessinez. Double-clic pour écrire.
draw.shortcuts | 0 Hand · 1 Select · 2 Rectangle · 3 Diamond · 4 Ellipse · 5 Arrow · 6 Line · 7 Draw · 8 Text · 9 Eraser · Space+drag: pan · Ctrl+wheel: zoom · Shift: straight / square · Ctrl+D duplicate · Del delete | 0 Hand · 1 Auswahl · 2 Rechteck · 3 Raute · 4 Ellipse · 5 Pfeil · 6 Linie · 7 Zeichnen · 8 Text · 9 Radierer · Leertaste+Ziehen: verschieben · Strg+Mausrad: Zoom · Umschalt: gerade / quadratisch · Strg+D duplizieren · Entf löschen | 0 El · 1 Seçim · 2 Dikdörtgen · 3 Eşkenar · 4 Elips · 5 Ok · 6 Çizgi · 7 Çiz · 8 Metin · 9 Silgi · Boşluk+sürükle: kaydır · Ctrl+tekerlek: yakınlaştır · Shift: düz / kare · Ctrl+D çoğalt · Del sil | 0 Mano · 1 Selección · 2 Rectángulo · 3 Rombo · 4 Elipse · 5 Flecha · 6 Línea · 7 Dibujar · 8 Texto · 9 Borrador · Espacio+arrastrar: desplazar · Ctrl+rueda: zoom · Mayús: recto / cuadrado · Ctrl+D duplicar · Supr eliminar | 0 Main · 1 Sélection · 2 Rectangle · 3 Losange · 4 Ellipse · 5 Flèche · 6 Ligne · 7 Dessin · 8 Texte · 9 Gomme · Espace+glisser : déplacer · Ctrl+molette : zoom · Maj : droit / carré · Ctrl+D dupliquer · Suppr supprimer
# ---------- pdf ----------
pdf.openTitle | Open a PDF | PDF öffnen | Bir PDF açın | Abrir un PDF | Ouvrir un PDF
pdf.openHint | Your PDF stays on this device – nothing is uploaded. | Ihr PDF bleibt auf diesem Gerät – nichts wird hochgeladen. | PDF'iniz bu cihazda kalır – hiçbir şey yüklenmez. | Tu PDF se queda en este dispositivo: no se sube nada. | Votre PDF reste sur cet appareil – rien n'est envoyé.
pdf.choose | Choose PDF | PDF auswählen | PDF seç | Elegir PDF | Choisir un PDF
pdf.noFile | No PDF loaded | Kein PDF geladen | PDF yüklenmedi | No hay PDF cargado | Aucun PDF chargé
pdf.edit | Edit text | Text bearbeiten | Metni düzenle | Editar texto | Modifier le texte
pdf.sign | Sign | Unterschreiben | İmzala | Firmar | Signer
pdf.protect | Protect | Schützen | Koru | Proteger | Protéger
pdf.engineHint | Use the tools in the PDF Werkstatt panel below. | Nutzen Sie die Werkzeuge im PDF-Werkstatt-Bereich unten. | Aşağıdaki PDF Werkstatt panelindeki araçları kullanın. | Usa las herramientas del panel de PDF Werkstatt. | Utilisez les outils du panneau PDF Werkstatt ci-dessous.
pdf.engineActive | full engine (red edition) | vollständige Engine (rote Edition) | tam motor (kırmızı sürüm) | motor completo (edición roja) | moteur complet (édition rouge)
pdf.builtinViewer | Built-in PDF viewer | Eingebauter PDF-Viewer | Yerleşik PDF görüntüleyici | Visor PDF integrado | Visionneuse PDF intégrée
pdf.engineMissing | Install the full PDF Werkstatt engine for editing, OCR, signing and conversion. | Installieren Sie die vollständige PDF-Werkstatt-Engine für Bearbeiten, OCR, Signieren und Konvertieren. | Düzenleme, OCR, imzalama ve dönüştürme için tam PDF Werkstatt motorunu kurun. | Instala el motor completo de PDF Werkstatt para editar, OCR, firmar y convertir. | Installez le moteur complet PDF Werkstatt pour modifier, OCR, signer et convertir.
pdf.getEngine | Get PDF Werkstatt | PDF Werkstatt holen | PDF Werkstatt'ı edin | Obtener PDF Werkstatt | Obtenir PDF Werkstatt
pdf.engineHowto | Run <code>scripts/fetch-engines</code> once (needs internet only for the download) – or copy the offline <code>index.html</code> from the PDF Werkstatt release to <code>public/engines/pdf/index.html</code>. It is recoloured to red automatically. | Führen Sie einmal <code>scripts/fetch-engines</code> aus (Internet nur für den Download) – oder kopieren Sie die Offline-<code>index.html</code> aus dem PDF-Werkstatt-Release nach <code>public/engines/pdf/index.html</code>. Sie wird automatisch rot eingefärbt. | Bir kez <code>scripts/fetch-engines</code> çalıştırın (internet yalnızca indirme için) – veya PDF Werkstatt sürümündeki çevrimdışı <code>index.html</code> dosyasını <code>public/engines/pdf/index.html</code> konumuna kopyalayın. Otomatik olarak kırmızıya boyanır. | Ejecuta una vez <code>scripts/fetch-engines</code> (internet solo para descargar) o copia el <code>index.html</code> sin conexión de PDF Werkstatt en <code>public/engines/pdf/index.html</code>. Se colorea en rojo automáticamente. | Lancez une fois <code>scripts/fetch-engines</code> (internet uniquement pour le téléchargement) ou copiez l'<code>index.html</code> hors ligne de PDF Werkstatt dans <code>public/engines/pdf/index.html</code>. Il est recoloré en rouge automatiquement.
pdf.dropManually | Drag the PDF into the PDF Werkstatt window | Ziehen Sie das PDF in das PDF-Werkstatt-Fenster | PDF'i PDF Werkstatt penceresine sürükleyin | Arrastra el PDF a la ventana de PDF Werkstatt | Glissez le PDF dans la fenêtre PDF Werkstatt
pdf.savedToLibrary | Saved to Office Werkstatt | In Office Werkstatt gespeichert | Office Werkstatt'a kaydedildi | Guardado en Office Werkstatt | Enregistré dans Office Werkstatt
# ---------- v1.1 ----------
export.pptxHint | Opens in PowerPoint, Keynote, LibreOffice and Slide Werkzeug Pro | Öffnet in PowerPoint, Keynote, LibreOffice und Slide Werkzeug Pro | PowerPoint, Keynote, LibreOffice ve Slide Werkzeug Pro'ta açılır | Se abre en PowerPoint, Keynote, LibreOffice y Slide Werkzeug Pro | S'ouvre dans PowerPoint, Keynote, LibreOffice et Slide Werkzeug Pro
dictate.online | needs internet | braucht Internet | internet gerekir | requiere internet | nécessite internet
ownapp.none | No own apps registered yet. | Noch keine eigenen Apps eingetragen. | Henüz kayıtlı uygulama yok. | Aún no hay apps propias. | Aucune app enregistrée.
ownapp.howtoTitle | How to add your own app | So fügen Sie eine eigene App hinzu | Kendi uygulamanızı nasıl eklersiniz | Cómo añadir tu propia app | Ajouter votre propre app
`);
})();
