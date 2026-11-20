/* Formular Werkzeug – drag & drop form builder · preview / kiosk · responses → Excel Werkzeug
 * "Erstellen" turns the form into one self-contained HTML page (see js/form-core.js) that
 *   – sends answers to the Office Werkstatt server (link + QR code), or
 *   – keeps them on the device (kiosk / tablet, export file), with an optional e-mail fallback.
 * All answers are collected in an Excel Werkzeug table. */
OW.addStrings(`
# ---------- Formular Werkzeug ----------
tool.form.name | Form Werkzeug | Formular Werkzeug | Form Werkzeug | Formulario Werkzeug | Formulaire Werkzeug
tool.form.desc | Build forms by drag & drop, share them and collect the answers in Excel. | Formulare per Drag & Drop bauen, teilen und Antworten in Excel sammeln. | Sürükle-bırak ile form oluşturun, paylaşın, yanıtları Excel'de toplayın. | Crea formularios arrastrando, compártelos y reúne las respuestas en Excel. | Créez des formulaires par glisser-déposer, partagez-les et collectez les réponses dans Excel.
type.form | Form | Formular | Form | Formulario | Formulaire
create.form | New form | Neues Formular | Yeni form | Nuevo formulario | Nouveau formulaire
untitled.form | Untitled form | Unbenanntes Formular | Adsız form | Formulario sin título | Formulaire sans titre
form.untitledTitle | Untitled form | Unbenanntes Formular | Adsız form | Formulario sin título | Formulaire sans titre
form.option | Option | Option | Seçenek | Opción | Option
form.sample.name | Name | Name | Ad Soyad | Nombre | Nom
form.sample.email | E-mail | E-Mail | E-posta | Correo electrónico | E-mail
form.type.short | Short answer | Kurzantwort | Kısa yanıt | Respuesta corta | Réponse courte
form.type.long | Paragraph | Absatz | Uzun yanıt | Párrafo | Paragraphe
form.type.single | Single choice | Einfachauswahl | Tek seçim | Opción única | Choix unique
form.type.multi | Checkboxes | Mehrfachauswahl | Çoklu seçim | Casillas | Cases à cocher
form.type.dropdown | Dropdown | Dropdown | Açılır liste | Desplegable | Liste déroulante
form.type.number | Number | Zahl | Sayı | Número | Nombre
form.type.date | Date | Datum | Tarih | Fecha | Date
form.type.email | E-mail | E-Mail | E-posta | Correo | E-mail
form.type.phone | Phone | Telefon | Telefon | Teléfono | Téléphone
form.type.rating | Rating (stars) | Bewertung (Sterne) | Puanlama (yıldız) | Valoración (estrellas) | Note (étoiles)
form.type.scale | Linear scale | Skala | Ölçek | Escala lineal | Échelle linéaire
form.type.yesno | Yes / No | Ja / Nein | Evet / Hayır | Sí / No | Oui / Non
form.type.section | Section heading | Abschnitt | Bölüm başlığı | Sección | Section
form.tab.questions | Questions | Fragen | Sorular | Preguntas | Questions
form.tab.preview | Preview | Vorschau | Önizleme | Vista previa | Aperçu
form.tab.responses | Responses | Antworten | Yanıtlar | Respuestas | Réponses
form.type.calendar | Calendar (pick a day) | Kalender (Tag wählen) | Takvim (gün seçimi) | Calendario (elegir día) | Calendrier (choisir un jour)
form.type.text | Text block | Textblock | Metin bloğu | Bloque de texto | Bloc de texte
form.type.image | Image | Bild | Resim | Imagen | Image
form.addImage | Add image | Bild hinzufügen | Resim ekle | Añadir imagen | Ajouter une image
form.changeImage | Change image | Bild ändern | Resmi değiştir | Cambiar imagen | Changer l’image
form.removeImage | Remove image | Bild entfernen | Resmi kaldır | Quitar imagen | Retirer l’image
form.headerImage | Header image | Titelbild | Başlık resmi | Imagen de cabecera | Image d’en-tête
form.captionPh | Caption (optional) | Bildunterschrift (optional) | Resim altı yazısı (isteğe bağlı) | Pie de foto (opcional) | Légende (facultatif)
form.textTitlePh | Title (optional) | Überschrift (optional) | Başlık (isteğe bağlı) | Título (opcional) | Titre (facultatif)
form.textPh | Write your text here … | Ihr Text … | Metninizi buraya yazın … | Escribe tu texto … | Votre texte …
form.design | Appearance | Gestaltung | Görünüm | Apariencia | Apparence
form.bg | Page background | Seitenhintergrund | Sayfa arka planı | Fondo de página | Arrière-plan de la page
form.frame | Frame colour | Rahmenfarbe | Çerçeve rengi | Color del marco | Couleur du cadre
form.frameW | Frame width | Rahmenstärke | Çerçeve kalınlığı | Grosor del marco | Épaisseur du cadre
form.default | Default | Standard | Varsayılan | Predeterminado | Par défaut
form.cover | Welcome screen | Begrüßungsseite | Karşılama ekranı | Pantalla de bienvenida | Écran d’accueil
form.coverOn | Show a welcome screen first | Zuerst eine Begrüßungsseite zeigen | Önce karşılama ekranı göster | Mostrar primero una bienvenida | Afficher d’abord un écran d’accueil
form.coverTitle | Title | Titel | Başlık | Título | Titre
form.coverText | Welcome text | Begrüßungstext | Karşılama metni | Texto de bienvenida | Texte d’accueil
form.coverBtn | Button text | Button-Text | Buton yazısı | Texto del botón | Texte du bouton
form.coverBtnPh | Start | Los geht’s | Başla | Empezar | Commencer
form.cal.multi | Several days can be chosen | Mehrere Tage wählbar | Birden fazla gün seçilebilir | Se pueden elegir varios días | Plusieurs jours possibles
form.cal.future | Only days from today on | Nur Tage ab heute | Sadece bugünden sonraki günler | Solo a partir de hoy | Seulement à partir d’aujourd’hui
form.cal.days | Available weekdays | Verfügbare Wochentage | Seçilebilir günler | Días disponibles | Jours disponibles
form.cal.from | From | Ab | Başlangıç | Desde | Du
form.cal.to | Until | Bis | Bitiş | Hasta | Au
form.cal.slots | Times (optional) | Uhrzeiten (optional) | Saatler (isteğe bağlı) | Horas (opcional) | Heures (facultatif)
form.cal.slotsPh | e.g. 09:00, 11:00, 14:30 | z. B. 09:00, 11:00, 14:30 | örn. 09:00, 11:00, 14:30 | p. ej. 09:00, 11:00, 14:30 | ex. 09:00, 11:00, 14:30
form.cal.slotsMulti | Times are offered when only one day can be chosen. | Uhrzeiten gibt es, wenn nur ein Tag wählbar ist. | Saat seçimi, tek gün seçilebildiğinde sunulur. | Las horas se ofrecen si solo se elige un día. | Les heures sont proposées si un seul jour est choisi.
form.tpl.whichDay | Which day will you come? | An welchem Tag kommen Sie? | Hangi gün geleceksiniz? | ¿Qué día vendrás? | Quel jour viendrez-vous ?
form.palette | Question types | Fragetypen | Soru türleri | Tipos de pregunta | Types de questions
form.paletteHint | Drag onto the form – or click to add. | Auf das Formular ziehen – oder anklicken. | Forma sürükleyin – ya da tıklayın. | Arrastra al formulario o haz clic. | Glissez sur le formulaire – ou cliquez.
form.titlePh | Form title | Formulartitel | Form başlığı | Título del formulario | Titre du formulaire
form.descPh | Description (optional) | Beschreibung (optional) | Açıklama (isteğe bağlı) | Descripción (opcional) | Description (facultatif)
form.qPh | Question | Frage | Soru | Pregunta | Question
form.helpPh | Help text (optional) | Hilfetext (optional) | Yardım metni (isteğe bağlı) | Texto de ayuda (opcional) | Texte d’aide (facultatif)
form.required | Required | Pflichtfeld | Zorunlu | Obligatoria | Obligatoire
form.addOption | Add option | Option hinzufügen | Seçenek ekle | Añadir opción | Ajouter une option
form.min | From | Von | En az | Desde | De
form.max | To | Bis | En çok | Hasta | À
form.minLabel | Label left | Beschriftung links | Sol etiket | Etiqueta izquierda | Libellé gauche
form.maxLabel | Label right | Beschriftung rechts | Sağ etiket | Etiqueta derecha | Libellé droit
form.answerPreview | Answer field | Antwortfeld | Yanıt alanı | Campo de respuesta | Champ de réponse
form.empty | Drag question types here | Fragetypen hierher ziehen | Soru türlerini buraya sürükleyin | Arrastra tipos de pregunta aquí | Glissez des types de questions ici
form.moveUp | Move up | Nach oben | Yukarı taşı | Subir | Monter
form.moveDown | Move down | Nach unten | Aşağı taşı | Bajar | Descendre
form.settings | Form settings | Formular-Einstellungen | Form ayarları | Ajustes del formulario | Paramètres du formulaire
form.accent | Colour | Farbe | Renk | Color | Couleur
form.pageLang | Page language (fallback) | Seitensprache (Standard) | Sayfa dili (varsayılan) | Idioma de la página | Langue de la page
form.thanks | Thank-you message | Dankesnachricht | Teşekkür mesajı | Mensaje de agradecimiento | Message de remerciement
form.thanksPh | Thank you! Your answer has been recorded. | Vielen Dank! Ihre Antwort wurde gespeichert. | Teşekkürler! Yanıtınız kaydedildi. | ¡Gracias! Tu respuesta se ha registrado. | Merci ! Votre réponse a été enregistrée.
form.delivery | Where do the answers go? | Wohin gehen die Antworten? | Yanıtlar nereye gidecek? | ¿Adónde van las respuestas? | Où vont les réponses ?
form.serverUrl | Server address | Server-Adresse | Sunucu adresi | Dirección del servidor | Adresse du serveur
form.serverHint | The Office Werkstatt server that collects the answers, e.g. https://office.smyrna-pergamum.org/ – leave empty if there is none. | Der Office-Werkstatt-Server, der die Antworten sammelt, z. B. https://office.smyrna-pergamum.org/ – leer lassen, wenn es keinen gibt. | Yanıtları toplayan Office Werkstatt sunucusu, örn. https://office.smyrna-pergamum.org/ – yoksa boş bırakın. | El servidor de Office Werkstatt que recoge las respuestas – déjalo vacío si no hay. | Le serveur Office Werkstatt qui collecte les réponses – laissez vide s’il n’y en a pas.
form.emailFallback | E-mail for answers (fallback) | E-Mail für Antworten (Ersatzweg) | Yanıtlar için e-posta (yedek) | Correo para respuestas (alternativa) | E-mail pour les réponses (secours)
form.emailHint | If no server can be reached, people can send their answer to this address. | Wenn kein Server erreichbar ist, können die Antworten an diese Adresse geschickt werden. | Sunucuya ulaşılamazsa kişiler yanıtlarını bu adrese gönderebilir. | Si no hay servidor, las respuestas pueden enviarse a esta dirección. | Sans serveur, les réponses peuvent être envoyées à cette adresse.
form.kiosk | Kiosk mode (one device, many people) | Kiosk-Modus (ein Gerät, viele Personen) | Kiosk modu (tek cihaz, çok kişi) | Modo quiosco (un dispositivo, muchas personas) | Mode kiosque (un appareil, plusieurs personnes)
form.kioskHint | For a tablet at the entrance: answers stay on the device, the form resets itself, “Export answers” at the bottom. | Für ein Tablet am Eingang: Antworten bleiben auf dem Gerät, das Formular setzt sich zurück, unten „Antworten exportieren“. | Girişteki tablet için: yanıtlar cihazda kalır, form kendini sıfırlar, altta “Yanıtları dışa aktar”. | Para una tableta en la entrada: las respuestas quedan en el dispositivo. | Pour une tablette à l’entrée : les réponses restent sur l’appareil.
form.accepting | Accepting responses | Nimmt Antworten an | Yanıt kabul ediliyor | Acepta respuestas | Accepte les réponses
form.create | Create | Erstellen | Oluştur | Crear | Créer
form.createTitle | Create the form page | Formularseite erstellen | Form sayfasını oluştur | Crear la página del formulario | Créer la page du formulaire
form.onServer | Publish on this server | Auf diesem Server veröffentlichen | Bu sunucuda yayınla | Publicar en este servidor | Publier sur ce serveur
form.onServerHint | You get a link and a QR code. Anyone with the link can fill in the form – no password needed; they only see this form. | Sie erhalten einen Link und einen QR-Code. Jeder mit dem Link kann ausfüllen – ohne Passwort; man sieht nur dieses Formular. | Bir link ve QR kod alırsınız. Linki olan herkes formu doldurabilir – şifre gerekmez; sadece bu formu görürler. | Obtienes un enlace y un código QR. Cualquiera con el enlace puede responder, sin contraseña. | Vous obtenez un lien et un QR code. Toute personne ayant le lien peut répondre, sans mot de passe.
form.publish | Publish | Veröffentlichen | Yayınla | Publicar | Publier
form.update | Update page | Seite aktualisieren | Sayfayı güncelle | Actualizar página | Mettre à jour la page
form.published | Published | Veröffentlicht | Yayında | Publicado | Publié
form.notPublished | Not published yet | Noch nicht veröffentlicht | Henüz yayınlanmadı | Aún no publicado | Pas encore publié
form.closed | Closed | Geschlossen | Kapalı | Cerrado | Fermé
form.copyLink | Copy link | Link kopieren | Linki kopyala | Copiar enlace | Copier le lien
form.linkCopied | Link copied | Link kopiert | Link kopyalandı | Enlace copiado | Lien copié
form.qr | QR code | QR-Code | QR kod | Código QR | QR code
form.downloadQR | Download QR code | QR-Code herunterladen | QR kodu indir | Descargar código QR | Télécharger le QR code
form.localhostWarn | This server only runs on this computer, so the link works only here. For others: run the server on your network/Internet – or download the HTML page (kiosk / e-mail). | Dieser Server läuft nur auf diesem Computer – der Link funktioniert nur hier. Für andere: Server im Netzwerk/Internet betreiben – oder die HTML-Seite herunterladen (Kiosk / E-Mail). | Bu sunucu yalnızca bu bilgisayarda çalışıyor; link sadece burada açılır. Başkaları için: sunucuyu ağda/internette çalıştırın – ya da HTML sayfasını indirin (kiosk / e-posta). | Este servidor solo funciona en este ordenador. Para otros: usa un servidor en red o descarga la página HTML. | Ce serveur ne tourne que sur cet ordinateur. Pour d’autres : utilisez un serveur en réseau ou téléchargez la page HTML.
form.noServerMode | No Office Werkstatt server is connected – download the HTML page instead. | Kein Office-Werkstatt-Server verbunden – laden Sie stattdessen die HTML-Seite herunter. | Bağlı bir Office Werkstatt sunucusu yok – bunun yerine HTML sayfasını indirin. | No hay servidor conectado: descarga la página HTML. | Aucun serveur connecté : téléchargez la page HTML.
form.asFile | Download as HTML page | Als HTML-Seite herunterladen | HTML sayfası olarak indir | Descargar como página HTML | Télécharger la page HTML
form.asFileHint | One file you can put on your website, a USB stick or a tablet. | Eine Datei für Ihre Website, einen USB-Stick oder ein Tablet. | Web sitenize, USB belleğe ya da tablete koyabileceğiniz tek dosya. | Un archivo para tu web, un USB o una tableta. | Un fichier pour votre site, une clé USB ou une tablette.
form.dest.server | Answers are sent to {url} | Antworten gehen an {url} | Yanıtlar {url} adresine gönderilir | Las respuestas se envían a {url} | Les réponses sont envoyées à {url}
form.dest.local | Answers are saved on the device that shows the page (export at the bottom). | Antworten werden auf dem Gerät gespeichert, das die Seite zeigt (Export unten). | Yanıtlar sayfayı gösteren cihaza kaydedilir (altta dışa aktar). | Las respuestas se guardan en el dispositivo (exportar abajo). | Les réponses sont enregistrées sur l’appareil (export en bas).
form.dest.mail | Without a server people can also send their answer to {mail}. | Ohne Server kann die Antwort auch an {mail} geschickt werden. | Sunucu yoksa yanıt {mail} adresine de gönderilebilir. | Sin servidor la respuesta también puede enviarse a {mail}. | Sans serveur, la réponse peut aussi être envoyée à {mail}.
form.dest.edit | Change in Publish → Settings | Ändern unter Veröffentlichen → Einstellungen | Yayınla → Ayarlar'dan değiştirin | Cambiar en Publicar → Ajustes | Modifier dans Publier → Paramètres
form.republish | After changing questions, click “Create” again so the page is updated. | Nach Änderungen an den Fragen erneut „Erstellen“ klicken, damit die Seite aktualisiert wird. | Soruları değiştirdikten sonra sayfanın güncellenmesi için tekrar “Oluştur”a tıklayın. | Tras cambiar preguntas, pulsa «Crear» de nuevo. | Après modification, cliquez à nouveau sur « Créer ».
form.previewHint | Test the form here. Answers sent from this preview are stored in this file. | Testen Sie das Formular hier. Antworten aus dieser Vorschau werden in dieser Datei gespeichert. | Formu burada test edin. Bu önizlemeden gönderilen yanıtlar bu dosyaya kaydedilir. | Prueba el formulario aquí. Las respuestas se guardan en este archivo. | Testez le formulaire ici. Les réponses sont enregistrées dans ce fichier.
form.gotResponse | Answer saved | Antwort gespeichert | Yanıt kaydedildi | Respuesta guardada | Réponse enregistrée
form.responsesN | {n} responses | {n} Antworten | {n} yanıt | {n} respuestas | {n} réponses
form.questionsN | {n} questions | {n} Fragen | {n} soru | {n} preguntas | {n} questions
form.noResponses | No answers yet. Share the form via “Create”. | Noch keine Antworten. Teilen Sie das Formular über „Erstellen“. | Henüz yanıt yok. Formu “Oluştur” ile paylaşın. | Aún no hay respuestas. Comparte el formulario con «Crear». | Pas encore de réponses. Partagez via « Créer ».
form.refresh | Refresh | Aktualisieren | Yenile | Actualizar | Actualiser
form.toExcel | Update Excel table | Excel-Tabelle aktualisieren | Excel tablosunu güncelle | Actualizar tabla Excel | Mettre à jour le tableau Excel
form.excelUpdated | Excel table updated | Excel-Tabelle aktualisiert | Excel tablosu güncellendi | Tabla Excel actualizada | Tableau Excel mis à jour
form.openExcel | Open in Excel Werkzeug | In Excel Werkzeug öffnen | Excel Werkzeug'da aç | Abrir en Excel Werkzeug | Ouvrir dans Excel Werkzeug
form.import | Import answers | Antworten importieren | Yanıtları içe aktar | Importar respuestas | Importer des réponses
form.importHint | Choose an exported kiosk file (.json) – or paste e-mails that contain answers. | Exportierte Kiosk-Datei (.json) wählen – oder E-Mails mit Antworten einfügen. | Dışa aktarılmış kiosk dosyasını (.json) seçin – ya da yanıt içeren e-postaları yapıştırın. | Elige un archivo de quiosco (.json) o pega correos con respuestas. | Choisissez un fichier kiosque (.json) ou collez des e-mails contenant des réponses.
form.pastePh | Paste e-mail text here … | E-Mail-Text hier einfügen … | E-posta metnini buraya yapıştırın … | Pega aquí el texto del correo … | Collez le texte de l’e-mail ici …
form.chooseFile | Choose file | Datei wählen | Dosya seç | Elegir archivo | Choisir un fichier
form.imported | {n} new answers imported | {n} neue Antworten importiert | {n} yeni yanıt içe aktarıldı | {n} respuestas nuevas importadas | {n} nouvelles réponses importées
form.clear | Delete all answers | Alle Antworten löschen | Tüm yanıtları sil | Eliminar todas las respuestas | Supprimer toutes les réponses
form.clearConfirm | Delete all answers of this form? This cannot be undone. | Alle Antworten dieses Formulars löschen? Das kann nicht rückgängig gemacht werden. | Bu formun tüm yanıtları silinsin mi? Geri alınamaz. | ¿Eliminar todas las respuestas? No se puede deshacer. | Supprimer toutes les réponses ? Action irréversible.
form.summary | Summary | Zusammenfassung | Özet | Resumen | Résumé
form.table | Table | Tabelle | Tablo | Tabla | Tableau
form.avg | Average | Durchschnitt | Ortalama | Media | Moyenne
form.answered | {n} answered | {n} beantwortet | {n} yanıtladı | {n} respondieron | {n} réponses
form.col.time | Time | Zeitpunkt | Zaman | Fecha | Date
form.col.source | Source | Quelle | Kaynak | Origen | Source
form.sheet | Responses | Antworten | Yanıtlar | Respuestas | Réponses
form.src.web | Web | Web | Web | Web | Web
form.src.kiosk | Kiosk | Kiosk | Kiosk | Quiosco | Kiosque
form.src.mail | E-mail | E-Mail | E-posta | Correo | E-mail
form.src.preview | Preview | Vorschau | Önizleme | Vista previa | Aperçu
form.noQuestions | Add at least one question first. | Fügen Sie zuerst mindestens eine Frage hinzu. | Önce en az bir soru ekleyin. | Añade primero al menos una pregunta. | Ajoutez d’abord au moins une question.
form.publishFailed | Could not publish on the server. | Veröffentlichen auf dem Server fehlgeschlagen. | Sunucuda yayınlanamadı. | No se pudo publicar en el servidor. | Échec de la publication sur le serveur.
form.excelHint | All answers are collected in this Excel table: | Alle Antworten werden in dieser Excel-Tabelle gesammelt: | Tüm yanıtlar bu Excel tablosunda toplanır: | Todas las respuestas se reúnen en esta tabla Excel: | Toutes les réponses sont rassemblées dans ce tableau Excel :
form.excelAuto | On the server the table updates itself with every new answer. | Auf dem Server aktualisiert sich die Tabelle bei jeder neuen Antwort selbst. | Sunucuda tablo her yeni yanıtla kendini günceller. | En el servidor la tabla se actualiza con cada respuesta. | Sur le serveur, le tableau se met à jour à chaque réponse.
form.tpl.registration | Course registration | Kursanmeldung | Kurs kaydı | Inscripción al curso | Inscription au cours
form.tpl.feedback | Course feedback | Kurs-Feedback | Kurs geri bildirimi | Opinión del curso | Avis sur le cours
form.tpl.event | Event registration | Veranstaltungsanmeldung | Etkinlik kaydı | Inscripción a evento | Inscription à l’événement
form.tpl.regDesc | Please fill in the form – we will contact you. | Bitte füllen Sie das Formular aus – wir melden uns bei Ihnen. | Lütfen formu doldurun – sizinle iletişime geçeceğiz. | Rellena el formulario y te contactaremos. | Remplissez le formulaire – nous vous contacterons.
form.tpl.level | Your German level | Ihr Deutschniveau | Almanca seviyeniz | Tu nivel de alemán | Votre niveau d’allemand
form.tpl.beginner | Beginner (no knowledge) | Anfänger (keine Kenntnisse) | Başlangıç (hiç bilmiyorum) | Principiante (sin conocimientos) | Débutant (aucune connaissance)
form.tpl.unsure | I don't know | Weiß ich nicht | Bilmiyorum | No lo sé | Je ne sais pas
form.tpl.days | Which days suit you? | Welche Tage passen Ihnen? | Hangi günler size uygun? | ¿Qué días te vienen bien? | Quels jours vous conviennent ?
form.tpl.time | Preferred time | Bevorzugte Uhrzeit | Tercih edilen saat | Horario preferido | Horaire préféré
form.tpl.morning | Morning | Vormittag | Sabah | Mañana | Matin
form.tpl.afternoon | Afternoon | Nachmittag | Öğleden sonra | Tarde | Après-midi
form.tpl.evening | Evening | Abend | Akşam | Noche | Soir
form.tpl.heard | How did you hear about us? | Wie haben Sie von uns erfahren? | Bizi nereden duydunuz? | ¿Cómo nos conociste? | Comment nous avez-vous connus ?
form.tpl.notes | Anything else we should know? | Möchten Sie uns noch etwas mitteilen? | Bilmemiz gereken başka bir şey var mı? | ¿Algo más que debamos saber? | Autre chose à nous dire ?
form.tpl.privacy | Data protection | Datenschutz | Veri koruma | Protección de datos | Protection des données
form.tpl.consent | I agree that my data is stored for the course organisation. | Ich bin einverstanden, dass meine Daten für die Kursorganisation gespeichert werden. | Verilerimin kurs organizasyonu için saklanmasını kabul ediyorum. | Acepto que mis datos se guarden para organizar el curso. | J’accepte que mes données soient conservées pour l’organisation du cours.
form.tpl.overall | How satisfied are you with the course? | Wie zufrieden sind Sie mit dem Kurs? | Kurstan ne kadar memnunsunuz? | ¿Qué tan satisfecho estás con el curso? | Êtes-vous satisfait du cours ?
form.tpl.recommend | Would you recommend the course? | Würden Sie den Kurs weiterempfehlen? | Kursu tavsiye eder misiniz? | ¿Recomendarías el curso? | Recommanderiez-vous le cours ?
form.tpl.unlikely | not at all | auf keinen Fall | kesinlikle hayır | en absoluto | pas du tout
form.tpl.likely | absolutely | auf jeden Fall | kesinlikle evet | totalmente | absolument
form.tpl.pace | The pace of the course was … | Das Tempo des Kurses war … | Kursun temposu … | El ritmo del curso fue … | Le rythme du cours était …
form.tpl.slow | too slow | zu langsam | çok yavaş | demasiado lento | trop lent
form.tpl.right | just right | genau richtig | tam uygun | adecuado | parfait
form.tpl.fast | too fast | zu schnell | çok hızlı | demasiado rápido | trop rapide
form.tpl.liked | What did you like? | Was hat Ihnen gefallen? | Neyi beğendiniz? | ¿Qué te gustó? | Qu’avez-vous aimé ?
form.tpl.improve | What could we do better? | Was können wir besser machen? | Neyi daha iyi yapabiliriz? | ¿Qué podemos mejorar? | Que pourrions-nous améliorer ?
form.tpl.persons | Number of people | Anzahl Personen | Kişi sayısı | Número de personas | Nombre de personnes
form.tpl.phone | Phone | Telefon | Telefon | Teléfono | Téléphone
`);

OW.formTemplates = function (t) {
  const F = OW.form, q = (type, label, extra = {}) => Object.assign(F.newQuestion(type, t), { label }, extra);
  const days = [1, 2, 3, 4, 5, 6].map(d => new Date(2024, 0, d).toLocaleDateString(OW.lang, { weekday: 'long' }));
  const base = title => Object.assign(F.newForm(t), { title, questions: [] });
  const reg = Object.assign(base(t('form.tpl.registration')), { desc: t('form.tpl.regDesc'), questions: [
    q('short', t('form.sample.name'), { required: true }), q('email', t('form.sample.email'), { required: true }), q('phone', t('form.tpl.phone')),
    q('single', t('form.tpl.level'), { required: true, options: [t('form.tpl.beginner'), 'A1', 'A2', 'B1', 'B2', 'C1', t('form.tpl.unsure')] }),
    q('multi', t('form.tpl.days'), { options: days }), q('single', t('form.tpl.time'), { options: [t('form.tpl.morning'), t('form.tpl.afternoon'), t('form.tpl.evening')] }),
    q('short', t('form.tpl.heard')), q('long', t('form.tpl.notes')), q('multi', t('form.tpl.privacy'), { required: true, options: [t('form.tpl.consent')] }),
  ] });
  const fb = Object.assign(base(t('form.tpl.feedback')), { accent: '#7C4DDB', questions: [
    q('rating', t('form.tpl.overall'), { required: true }), q('single', t('form.tpl.pace'), { options: [t('form.tpl.slow'), t('form.tpl.right'), t('form.tpl.fast')] }),
    q('scale', t('form.tpl.recommend'), { min: 0, max: 10, minLabel: t('form.tpl.unlikely'), maxLabel: t('form.tpl.likely') }),
    q('long', t('form.tpl.liked')), q('long', t('form.tpl.improve')),
  ] });
  const ev = Object.assign(base(t('form.tpl.event')), { accent: '#EA6A2A', questions: [
    q('short', t('form.sample.name'), { required: true }), q('email', t('form.sample.email'), { required: true }),
    q('calendar', t('form.tpl.whichDay'), { required: true, weekdays: [1, 2, 3, 4, 5, 6], slots: '10:00, 14:00, 17:00' }),
    q('number', t('form.tpl.persons'), { required: true, min: 1, max: 10 }), q('long', t('form.tpl.notes')),
  ] });
  return [
    { type: 'form', id: 'blank', name: t('untitled.form'), content: null },
    { type: 'form', id: 'registration', name: t('form.tpl.registration'), content: reg },
    { type: 'form', id: 'feedback', name: t('form.tpl.feedback'), content: fb },
    { type: 'form', id: 'event', name: t('form.tpl.event'), content: ev },
  ];
};

OW.editors.form = async function (ctx) {
  const t = ctx.t, I = OW.icon, F0 = OW.form, esc = OW.escape;
  const id = ctx.file.id;
  const F = ctx.file.content && ctx.file.content.questions ? ctx.file.content : Object.assign(F0.newForm(t), { title: ctx.file.name });
  F.responses = F.responses || [];
  F.cover = Object.assign({ on: false, title: '', text: '', image: '', button: '' }, F.cover || {});
  let view = 'build', selId = (F.questions[0] || {}).id || null, drag = null, serverResp = [], pubInfo = null, bodyEl, canvas, msgHandler;
  const isServer = OW.store.mode === 'server';
  const base = () => location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
  const isLocalHost = () => /^(localhost|127\.|\[?::1\]?$)/.test(location.hostname);
  /* images are embedded (data: URL), scaled down so the page stays light and works offline */
  function pickImage(maxW = 1600) {
    return new Promise(res => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => { const f = inp.files[0]; if (!f) return res(null); try { res(await shrink(f, maxW)); } catch { OW.toast(t('import.failed'), 'warn'); res(null); } };
      inp.click();
    });
  }
  const readURL = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(b); });
  async function shrink(file, maxW) {
    if (/svg|gif/.test(file.type) && file.size < 1.5e6) return readURL(file);
    const url = URL.createObjectURL(file);
    try {
      const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const k = Math.min(1, maxW / im.naturalWidth), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      return file.type === 'image/png' && c.width * c.height < 600000 ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85);
    } finally { URL.revokeObjectURL(url); }
  }
  const BGS = ['#F4F6FA', '#FFFFFF', '#EEF7F8', '#FFF8EC', '#F3EEFF', '#EAF1FF', '#FDF0EE', '#EEF6EE'];
  const COLORS = ['#0FA3B1', '#2F6BEA', '#1E9E5A', '#7C4DDB', '#EA6A2A', '#D93A32', '#E3A21A', '#1B1F3B'];
  const labels = () => ({ time: t('form.col.time'), source: t('form.col.source'), sheet: t('form.sheet'), 'src.web': t('form.src.web'), 'src.kiosk': t('form.src.kiosk'), 'src.mail': t('form.src.mail'), 'src.preview': t('form.src.preview') });
  const srcName = r => Object.assign({}, r, { src: r.src ? t('form.src.' + r.src) : '' });
  const allResponses = () => F0.mergeResponses(F.responses, serverResp);
  const changed = () => { ctx.markDirty(); ctx.refresh(); };
  const qIndex = qid => F.questions.findIndex(q => q.id === qid);
  const sel = () => F.questions.find(q => q.id === selId) || null;

  /* ---------- question operations ---------- */
  function addQuestion(type, at) {
    const q = F0.newQuestion(type, t);
    const i = at != null ? at : (selId ? qIndex(selId) + 1 : F.questions.length);
    F.questions.splice(Math.max(0, Math.min(i, F.questions.length)), 0, q);
    selId = q.id; setView('build'); renderCanvas(); changed();
    setTimeout(() => { const el = canvas.querySelector(`[data-id="${q.id}"] .fm-ql`); if (el) { el.focus(); el.select(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } });
  }
  function moveQ(qid, d) { const i = qIndex(qid), j = i + d; if (i < 0 || j < 0 || j >= F.questions.length) return; const [q] = F.questions.splice(i, 1); F.questions.splice(j, 0, q); renderCanvas(); changed(); }
  function dupQ(qid) { const i = qIndex(qid); if (i < 0) return; const c = JSON.parse(JSON.stringify(F.questions[i])); c.id = 'q' + F0.uid(); F.questions.splice(i + 1, 0, c); selId = c.id; renderCanvas(); changed(); }
  function delQ(qid) { const i = qIndex(qid); if (i < 0) return; F.questions.splice(i, 1); selId = (F.questions[i] || F.questions[i - 1] || {}).id || null; renderCanvas(); changed(); }
  function setType(q, type) {
    q.type = type;
    if (F0.WITH_OPTIONS.includes(type) && !(q.options && q.options.length)) q.options = [t('form.option') + ' 1', t('form.option') + ' 2'];
    if (type === 'scale') { q.min = q.min === '' || q.min == null ? 1 : q.min; q.max = q.max === '' || q.max == null ? 10 : q.max; }
    if (type === 'calendar' && !q.weekdays) Object.assign(q, { multi: false, weekdays: [1, 2, 3, 4, 5], from: '', to: '', slots: '', future: true });
    if (F0.NO_ANSWER.includes(type)) q.required = false;
    renderCanvas(); changed();
  }

  /* ---------- builder ---------- */
  function renderPalette(el) {
    el.innerHTML = `<h3>${t('form.palette')}</h3><p class="muted small">${t('form.paletteHint')}</p><div class="fm-pal-list">${F0.TYPES.map(x => `<button class="fm-pal-item" draggable="true" data-type="${x.type}">${I(x.icon, 18)}<span>${t('form.type.' + x.type)}</span></button>`).join('')}</div>`;
    el.querySelectorAll('.fm-pal-item').forEach(b => {
      b.addEventListener('click', () => addQuestion(b.dataset.type));
      b.addEventListener('dragstart', e => { drag = { kind: 'new', type: b.dataset.type }; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', b.dataset.type); });
      b.addEventListener('dragend', endDrag);
    });
  }
  function typeOptions(cur) { return F0.TYPES.map(x => `<option value="${x.type}" ${x.type === cur ? 'selected' : ''}>${t('form.type.' + x.type)}</option>`).join(''); }
  function qBody(q) {
    if (F0.WITH_OPTIONS.includes(q.type)) {
      const mark = q.type === 'single' ? '<i class="fm-mk rd"></i>' : q.type === 'multi' ? '<i class="fm-mk cb"></i>' : '';
      return `<div class="fm-opts">${(q.options || []).map((o, i) => `<div class="fm-opt">${mark || `<span class="fm-num">${i + 1}.</span>`}<input data-k="opt" data-i="${i}" value="${esc(o)}"><button class="icon-btn sm" data-act="optdel" data-i="${i}" title="${t('delete')}">${I('x', 14)}</button></div>`).join('')}
        <button class="fm-addopt" data-act="optadd">${I('plus', 14)}<span>${t('form.addOption')}</span></button></div>`;
    }
    if (q.type === 'scale') {
      const nums = (a, b, v) => { let o = ''; for (let i = a; i <= b; i++) o += `<option ${+v === i ? 'selected' : ''}>${i}</option>`; return o; };
      return `<div class="fm-scale"><label>${t('form.min')} <select data-k="min">${nums(0, 1, q.min)}</select></label><label>${t('form.max')} <select data-k="max">${nums(2, 10, q.max)}</select></label></div>
        <div class="fm-scale"><input data-k="minLabel" placeholder="${t('form.minLabel')}" value="${esc(q.minLabel || '')}"><input data-k="maxLabel" placeholder="${t('form.maxLabel')}" value="${esc(q.maxLabel || '')}"></div>
        <div class="fm-pv pills">${Array.from({ length: (+q.max || 10) - (+q.min || 0) + 1 }, (_, i) => `<span>${(+q.min || 0) + i}</span>`).join('')}</div>`;
    }
    if (q.type === 'number') return `<div class="fm-scale"><label>${t('form.min')} <input type="number" data-k="min" value="${esc(q.min)}"></label><label>${t('form.max')} <input type="number" data-k="max" value="${esc(q.max)}"></label></div>`;
    if (q.type === 'rating') return '<div class="fm-pv stars">★★★★★</div>';
    if (q.type === 'yesno') return `<div class="fm-pv pills">${t('form.type.yesno').split('/').map(x => `<span>${esc(x.trim())}</span>`).join('')}</div>`;
    if (q.type === 'section') return '';
    if (q.type === 'text') return `<textarea class="fm-text" data-k="text" rows="3" placeholder="${t('form.textPh')}">${esc(q.text || '')}</textarea>`;
    if (q.type === 'image') return q.image ? '' : `<button class="fm-drop-img" data-act="img">${I('image', 26)}<span>${t('form.addImage')}</span></button>`;
    if (q.type === 'calendar') {
      const wd = q.weekdays || [], days = [1, 2, 3, 4, 5, 6, 0];
      return `<div class="fm-cal">
        <div class="fm-calrow"><label class="fm-check"><input type="checkbox" data-k="multi" ${q.multi ? 'checked' : ''}><span class="tg"></span>${t('form.cal.multi')}</label>
          <label class="fm-check"><input type="checkbox" data-k="future" ${q.future !== false ? 'checked' : ''}><span class="tg"></span>${t('form.cal.future')}</label></div>
        <div class="fm-calrow"><span class="fm-cl">${t('form.cal.days')}</span><span class="fm-wds">${days.map(d => `<button class="fm-wd ${wd.includes(d) ? 'on' : ''}" data-act="wd" data-d="${d}">${esc(new Date(2024, 0, d === 0 ? 7 : d).toLocaleDateString(OW.lang, { weekday: 'short' }))}</button>`).join('')}</span></div>
        <div class="fm-calrow"><label>${t('form.cal.from')} <input type="date" data-k="from" value="${esc(q.from || '')}"></label><label>${t('form.cal.to')} <input type="date" data-k="to" value="${esc(q.to || '')}"></label></div>
        <div class="fm-calrow">${q.multi ? `<small class="muted">${t('form.cal.slotsMulti')}</small>` : `<label class="grow">${t('form.cal.slots')} <input data-k="slots" placeholder="${t('form.cal.slotsPh')}" value="${esc(q.slots || '')}"></label>`}</div></div>`;
    }
    return `<div class="fm-pv line ${q.type === 'long' ? 'long' : ''}">${I(F0.TYPES.find(x => x.type === q.type).icon, 14)}<span>${t('form.type.' + q.type)}</span></div>`;
  }
  function imgBox(src, act, big) {
    return `<div class="fm-imgbox ${big ? 'big' : ''}"><img src="${esc(src)}" alt=""><span class="fm-imgacts"><button class="icon-btn sm" data-act="${act}" title="${t('form.changeImage')}">${I('image', 16)}</button><button class="icon-btn sm" data-act="${act}del" title="${t('form.removeImage')}">${I('trash', 16)}</button></span></div>`;
  }
  function qCard(q, n) {
    const s = q.id === selId, noAns = F0.NO_ANSWER.includes(q.type), icon = F0.TYPES.find(x => x.type === q.type).icon;
    const labelPh = q.type === 'section' ? t('form.type.section') : q.type === 'text' ? t('form.textTitlePh') : q.type === 'image' ? t('form.captionPh') : t('form.qPh');
    return `<div class="fm-card fm-q ${s ? 'sel' : ''} ${q.type === 'section' ? 'is-sec' : ''} t-${q.type}" data-id="${q.id}">
      <div class="fm-grip" draggable="true" title="${t('form.moveUp')} / ${t('form.moveDown')}">${I('grip', 16)}</div>
      ${q.type === 'image' && q.image ? imgBox(q.image, 'img', true) : ''}
      <div class="fm-qrow"><span class="fm-qn">${noAns ? I(icon, 16) : n + '.'}</span><input class="fm-ql" data-k="label" placeholder="${labelPh}" value="${esc(q.label)}">
        <label class="fm-qt">${I(icon, 16)}<select data-k="type">${typeOptions(q.type)}</select></label></div>
      ${['text', 'image'].includes(q.type) ? '' : `<input class="fm-qh" data-k="help" placeholder="${t('form.helpPh')}" value="${esc(q.help || '')}">`}
      ${q.image && q.type !== 'image' ? `<div class="fm-qimg">${imgBox(q.image, 'img')}</div>` : ''}
      <div class="fm-qbody">${qBody(q)}</div>
      <div class="fm-qfoot">
        ${!noAns ? `<label class="fm-switch-req"><input type="checkbox" data-k="required" ${q.required ? 'checked' : ''}><span class="tg"></span>${t('form.required')}</label>` : '<span></span>'}
        <span class="fm-qacts">${q.type !== 'image' && q.type !== 'section' && !q.image ? `<button class="icon-btn sm" data-act="img" title="${t('form.addImage')}">${I('image', 16)}</button><span class="fm-vsep"></span>` : ''}<button class="icon-btn sm" data-act="up" title="${t('form.moveUp')}">${I('arrowUp', 16)}</button><button class="icon-btn sm" data-act="down" title="${t('form.moveDown')}">${I('arrowDown', 16)}</button><button class="icon-btn sm" data-act="dup" title="${t('duplicate')}">${I('copy', 16)}</button><button class="icon-btn sm" data-act="del" title="${t('delete')}">${I('trash', 16)}</button></span>
      </div></div>`;
  }
  function renderCanvas() {
    if (!canvas) return;
    let n = 0;
    canvas.style.setProperty('--fa', F.accent || '#0FA3B1');
    canvas.style.setProperty('--fbg', F.bg || ''); canvas.style.setProperty('--ffr', F.frame || ''); canvas.style.setProperty('--ffw', (+F.frameW || 1) + 'px');
    canvas.classList.toggle('custom-bg', !!F.bg); canvas.classList.toggle('custom-frame', !!F.frame || +F.frameW > 1);
    canvas.innerHTML = `${F.cover.on ? `<div class="fm-card fm-coverprev" data-act-cover>${F.cover.image ? `<img src="${esc(F.cover.image)}" alt="">` : ''}<b>${esc(F.cover.title || F.title)}</b><small>${esc(F.cover.text || '')}</small><span class="fm-cbtn">${esc(F.cover.button || t('form.coverBtnPh'))}</span><em>${t('form.cover')}</em></div>` : ''}
      <div class="fm-card fm-head ${F.headerImage ? 'has-img' : ''}">${F.headerImage ? imgBox(F.headerImage, 'himg', true) : `<button class="fm-addhimg" data-hact="himg">${I('image', 16)}<span>${t('form.headerImage')}</span></button>`}<input class="fm-title" data-hk="title" placeholder="${t('form.titlePh')}" value="${esc(F.title)}"><textarea class="fm-desc" data-hk="desc" rows="2" placeholder="${t('form.descPh')}">${esc(F.desc)}</textarea></div>
      ${F.questions.map(q => qCard(q, q.type === 'section' ? n : ++n)).join('')}
      ${F.questions.length ? '' : `<div class="fm-empty">${I('plus', 28)}<p>${t('form.empty')}</p></div>`}`;
    canvas.querySelectorAll('.fm-desc, .fm-text').forEach(autoGrow);
  }
  const autoGrow = ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  function bindCanvas() {
    canvas.addEventListener('input', e => {
      const el = e.target, hk = el.dataset.hk;
      if (hk) { F[hk] = el.value; if (hk === 'desc') autoGrow(el); return changed(); }
      const card = el.closest('.fm-q'); if (!card) return; const q = F.questions[qIndex(card.dataset.id)], k = el.dataset.k; if (!q || !k) return;
      if (['label', 'help', 'minLabel', 'maxLabel', 'text', 'from', 'to', 'slots'].includes(k)) { q[k] = el.value; if (k === 'text') autoGrow(el); }
      else if (k === 'multi' || k === 'future') { q[k] = el.checked; if (k === 'multi') { card.querySelector('.fm-qbody').innerHTML = qBody(q); } }
      else if (k === 'opt') q.options[+el.dataset.i] = el.value;
      else if (k === 'min' || k === 'max') { q[k] = el.value === '' ? '' : +el.value; if (q.type === 'scale') { const old = card.querySelector('.fm-qbody'); old.innerHTML = qBody(q); } }
      else if (k === 'required') q.required = el.checked;
      else return;
      changed();
    });
    canvas.addEventListener('change', e => { const el = e.target; if (el.dataset.k !== 'type') return; const q = F.questions[qIndex(el.closest('.fm-q').dataset.id)]; setType(q, el.value); });
    canvas.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.target.dataset.k !== 'opt') return; e.preventDefault();
      const q = F.questions[qIndex(e.target.closest('.fm-q').dataset.id)], i = +e.target.dataset.i;
      q.options.splice(i + 1, 0, ''); renderCanvas(); changed();
      setTimeout(() => { const n = canvas.querySelector(`[data-id="${q.id}"] [data-k="opt"][data-i="${i + 1}"]`); n && n.focus(); });
    });
    canvas.addEventListener('mousedown', e => { const card = e.target.closest('.fm-q'); if (card && card.dataset.id !== selId) { selId = card.dataset.id; canvas.querySelectorAll('.fm-q').forEach(c => c.classList.toggle('sel', c === card)); ctx.refresh(); } });
    canvas.addEventListener('focusin', e => { const card = e.target.closest('.fm-q'); if (card && card.dataset.id !== selId) { selId = card.dataset.id; canvas.querySelectorAll('.fm-q').forEach(c => c.classList.toggle('sel', c === card)); } });
    canvas.addEventListener('click', async e => {
      const hb = e.target.closest('[data-hact], .fm-head [data-act], [data-act-cover]');
      if (hb) {
        if (hb.matches('[data-act-cover]')) return openSettings();
        const a = hb.dataset.hact || hb.dataset.act;
        if (a === 'himg') { const src = await pickImage(1600); if (src) { F.headerImage = src; renderCanvas(); changed(); } }
        if (a === 'himgdel') { F.headerImage = ''; renderCanvas(); changed(); }
        return;
      }
      const b = e.target.closest('[data-act]'); if (!b) return; const qid = b.closest('.fm-q').dataset.id, q = F.questions[qIndex(qid)];
      const a = b.dataset.act;
      if (a === 'img') { const src = await pickImage(q.type === 'image' ? 1600 : 1200); if (src) { q.image = src; renderCanvas(); changed(); } return; }
      if (a === 'imgdel') { q.image = ''; renderCanvas(); changed(); return; }
      if (a === 'wd') { const d = +b.dataset.d, w = q.weekdays = q.weekdays || []; const i = w.indexOf(d); if (i >= 0) w.splice(i, 1); else w.push(d); b.classList.toggle('on', i < 0); changed(); return; }
      if (a === 'up') moveQ(qid, -1); if (a === 'down') moveQ(qid, 1); if (a === 'dup') dupQ(qid); if (a === 'del') delQ(qid);
      if (a === 'optadd') { q.options.push(t('form.option') + ' ' + (q.options.length + 1)); renderCanvas(); changed(); setTimeout(() => { const ins = canvas.querySelectorAll(`[data-id="${qid}"] [data-k="opt"]`); const l = ins[ins.length - 1]; l && (l.focus(), l.select()); }); }
      if (a === 'optdel') { if (q.options.length > 1) { q.options.splice(+b.dataset.i, 1); renderCanvas(); changed(); } }
    });
    /* drag & drop: new questions from the palette, re-ordering by the grip */
    canvas.addEventListener('dragstart', e => {
      const g = e.target.closest && e.target.closest('.fm-grip'); if (!g) return;
      const card = g.closest('.fm-q'); drag = { kind: 'move', id: card.dataset.id };
      e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', card.dataset.id);
      try { e.dataTransfer.setDragImage(card, 24, 24); } catch { /* old browsers */ }
      setTimeout(() => card.classList.add('dragging'));
    });
    canvas.addEventListener('dragend', endDrag);
    canvas.addEventListener('dragover', e => {
      if (!drag) return; e.preventDefault(); e.dataTransfer.dropEffect = drag.kind === 'new' ? 'copy' : 'move';
      const idx = dropIndex(e.clientY); let ph = canvas.querySelector('.fm-drop');
      if (!ph) { ph = document.createElement('div'); ph.className = 'fm-drop'; }
      const cards = Array.from(canvas.querySelectorAll('.fm-q:not(.dragging)'));
      const ref = cards[idx]; if (ref) { if (ph.nextElementSibling !== ref) canvas.insertBefore(ph, ref); } else { const last = cards[cards.length - 1]; const after = last ? last.nextSibling : canvas.querySelector('.fm-head').nextSibling; if (ph.previousElementSibling !== last || !ph.parentNode) canvas.insertBefore(ph, after); }
    });
    canvas.addEventListener('drop', e => {
      if (!drag) return; e.preventDefault();
      const idx = dropIndex(e.clientY), d = drag; endDrag();
      if (d.kind === 'new') return addQuestion(d.type, idx);
      const from = qIndex(d.id); if (from < 0) return; const [q] = F.questions.splice(from, 1); F.questions.splice(idx, 0, q); selId = q.id; renderCanvas(); changed();
    });
  }
  function dropIndex(y) { const cards = Array.from(canvas.querySelectorAll('.fm-q:not(.dragging)')); const i = cards.findIndex(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; }); return i < 0 ? cards.length : i; }
  function endDrag() { drag = null; canvas && canvas.querySelectorAll('.fm-drop').forEach(x => x.remove()); canvas && canvas.querySelectorAll('.dragging').forEach(x => x.classList.remove('dragging')); }

  /* ---------- settings panel ---------- */
  function renderSettings(el) {
    const defServer = isServer && !isLocalHost() ? base() : '';
    el.innerHTML = `<h3>${t('form.settings')}</h3>
      <div class="fm-field"><span>${t('form.accent')}</span><div class="fm-colors">${COLORS.map(c => `<button class="fm-col ${F.accent === c ? 'on' : ''}" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')}<label class="fm-col custom" title="${t('form.accent')}"><input type="color" value="${esc(F.accent)}"></label></div></div>
      <label class="fm-field"><span>${t('form.thanks')}</span><textarea rows="2" data-s="thanks" placeholder="${t('form.thanksPh')}">${esc(F.thanks)}</textarea></label>
      <label class="fm-field"><span>${t('form.pageLang')}</span><select data-s="lang">${OW.LANGS.map(l => `<option value="${l.code}" ${F.lang === l.code ? 'selected' : ''}>${l.flag} ${l.name}</option>`).join('')}</select></label>
      <label class="fm-check"><input type="checkbox" data-s="accepting" ${F.accepting !== false ? 'checked' : ''}><span class="tg"></span>${t('form.accepting')}</label>
      <h3 class="mt">${t('form.design')}</h3>
      <div class="fm-field"><span>${t('form.bg')}</span><div class="fm-colors">${swatches('bg', [''].concat(BGS))}</div></div>
      <div class="fm-field"><span>${t('form.frame')}</span><div class="fm-colors">${swatches('frame', [''].concat(COLORS))}</div></div>
      <label class="fm-field"><span>${t('form.frameW')}</span><select data-s="frameW">${[1, 2, 3, 4, 6].map(w => `<option value="${w}" ${(+F.frameW || 1) === w ? 'selected' : ''}>${w} px</option>`).join('')}</select></label>
      <h3 class="mt">${t('form.cover')}</h3>
      <label class="fm-check"><input type="checkbox" data-cv="on" ${F.cover.on ? 'checked' : ''}><span class="tg"></span>${t('form.coverOn')}</label>
      <div class="fm-coverset" ${F.cover.on ? '' : 'hidden'}>
        <div class="fm-field"><span>${t('image')}</span>${F.cover.image ? `<div class="fm-imgbox"><img src="${esc(F.cover.image)}" alt=""><span class="fm-imgacts"><button class="icon-btn sm" data-cvimg="1" title="${t('form.changeImage')}">${I('image', 16)}</button><button class="icon-btn sm" data-cvimg="0" title="${t('form.removeImage')}">${I('trash', 16)}</button></span></div>` : `<button class="btn sm" data-cvimg="1">${I('image', 16)}<span>${t('form.addImage')}</span></button>`}</div>
        <label class="fm-field"><span>${t('form.coverTitle')}</span><input data-cv="title" placeholder="${esc(F.title)}" value="${esc(F.cover.title)}"></label>
        <label class="fm-field"><span>${t('form.coverText')}</span><textarea rows="4" data-cv="text">${esc(F.cover.text)}</textarea></label>
        <label class="fm-field"><span>${t('form.coverBtn')}</span><input data-cv="button" placeholder="${t('form.coverBtnPh')}" value="${esc(F.cover.button)}"></label>
      </div>
      <h3 class="mt">${t('form.delivery')}</h3>
      <label class="fm-field"><span>${t('form.serverUrl')}</span><input data-s="server" placeholder="${esc(defServer || 'https://…/')}" value="${esc(F.server)}"><small>${t('form.serverHint')}</small></label>
      <label class="fm-field"><span>${t('form.emailFallback')}</span><input type="email" data-s="email" placeholder="info@…" value="${esc(F.email)}"><small>${t('form.emailHint')}</small></label>
      <label class="fm-check"><input type="checkbox" data-s="kiosk" ${F.kiosk ? 'checked' : ''}><span class="tg"></span>${t('form.kiosk')}</label><small class="muted fm-small">${t('form.kioskHint')}</small>
      <button class="btn primary fm-create">${I('sparkle', 16)}<span>${t('form.create')}</span></button>`;
    el.querySelectorAll('.fm-col[data-c]').forEach(b => b.onclick = () => { F.accent = b.dataset.c; renderSettings(el); renderCanvas(); changed(); });
    el.querySelector('input[type=color]').onchange = e => { F.accent = e.target.value; renderSettings(el); renderCanvas(); changed(); };
    el.querySelectorAll('[data-s]').forEach(i => i.addEventListener(i.type === 'checkbox' || i.tagName === 'SELECT' ? 'change' : 'input', () => { F[i.dataset.s] = i.type === 'checkbox' ? i.checked : i.dataset.s === 'frameW' ? +i.value : i.value.trim(); if (i.dataset.s === 'frameW') renderCanvas(); changed(); }));
    el.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { F[b.dataset.sw] = b.dataset.v; renderSettings(el); renderCanvas(); changed(); });
    el.querySelectorAll('.fm-colors input[data-swc]').forEach(i => i.onchange = () => { F[i.dataset.swc] = i.value; renderSettings(el); renderCanvas(); changed(); });
    el.querySelectorAll('[data-cv]').forEach(i => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', () => { F.cover[i.dataset.cv] = i.type === 'checkbox' ? i.checked : i.value; if (i.type === 'checkbox') renderSettings(el); renderCanvas(); changed(); }));
    el.querySelectorAll('[data-cvimg]').forEach(b => b.onclick = async () => { const src = b.dataset.cvimg === '1' ? await pickImage(1600) : ''; if (src === null) return; F.cover.image = src; renderSettings(el); renderCanvas(); changed(); });
    el.querySelector('.fm-create').onclick = createDialog;
  }

  function swatches(key, list) {
    return list.map(c => `<button class="fm-col ${c ? '' : 'none'} ${(F[key] || '') === c ? 'on' : ''}" data-sw="${key}" data-v="${c}" style="${c ? 'background:' + c : ''}" title="${c || t('form.default')}"></button>`).join('')
      + `<label class="fm-col custom" title="${t('form.default')}"><input type="color" data-swc="${key}" value="${esc(F[key] || '#ffffff')}"></label>`;
  }
  function openSettings() { setView('build'); const s = bodyEl.querySelector('.fm-set'); s.classList.add('flash'); s.scrollIntoView({ behavior: 'smooth' }); const cv = s.querySelector('[data-cv="on"]'); if (cv) cv.closest('label').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => s.classList.remove('flash'), 900); }

  /* ---------- preview (= the real page, answers go into this file) ---------- */
  function renderPreview(el) {
    el.innerHTML = `<p class="fm-hint">${I('eye', 16)}<span>${t('form.previewHint')}</span></p><iframe class="fm-frame" sandbox="allow-scripts allow-forms" title="${t('form.tab.preview')}"></iframe>`;
    const fr = el.querySelector('iframe');
    fr.srcdoc = F0.pageHTML(Object.assign({}, F, { accepting: true }), id, { embedded: true, lang: OW.lang });
    if (msgHandler) removeEventListener('message', msgHandler);
    msgHandler = e => {
      if (e.source !== fr.contentWindow || !e.data || e.data.owForm !== 'response' || e.data.form !== id) return;
      const v = F0.validate(F, e.data.response.answers);
      F.responses.push({ id: e.data.response.id, at: Date.now(), answers: v.answers, src: 'preview' });
      changed(); OW.toast(t('form.gotResponse'));
    };
    addEventListener('message', msgHandler);
  }

  /* ---------- responses ---------- */
  async function loadServer() {
    if (!isServer) return;
    try { const r = await fetch('api/forms/' + encodeURIComponent(id) + '/responses', { cache: 'no-store' }); serverResp = r.ok ? await r.json() : []; } catch { serverResp = []; }
    try { const r = await fetch('api/forms/' + encodeURIComponent(id) + '/publish', { cache: 'no-store' }); pubInfo = r.ok ? await r.json() : null; } catch { pubInfo = null; }
  }
  function summaryHTML(all) {
    return F0.answerable(F).map(q => {
      const vals = all.map(r => (r.answers || {})[q.id]).filter(v => v != null && v !== '' && !(Array.isArray(v) && !v.length));
      let inner = '';
      const bars = (keys, counts) => { const tot = all.length || 1; return `<div class="fm-bars">${keys.map(k => { const c = counts[k] || 0, p = Math.round(c / tot * 100); return `<div class="fm-bar"><span class="fm-bl" title="${esc(k)}">${esc(k)}</span><span class="fm-bt"><i style="width:${p}%"></i></span><b>${c}</b><small>${p}%</small></div>`; }).join('')}</div>`; };
      if (q.type === 'calendar') {
        const counts = {}; vals.forEach(v => (Array.isArray(v) ? v : [v]).forEach(x => counts[x] = (counts[x] || 0) + 1));
        inner = bars(Object.keys(counts).sort().slice(0, 30), counts);
      } else if (F0.WITH_OPTIONS.includes(q.type) || q.type === 'yesno') {
        const counts = {}; vals.forEach(v => (Array.isArray(v) ? v : [v]).forEach(x => counts[x] = (counts[x] || 0) + 1));
        const keys = q.type === 'yesno' ? Object.keys(counts) : Array.from(new Set((q.options || []).concat(Object.keys(counts))));
        inner = bars(keys, counts);
      } else if (q.type === 'rating' || q.type === 'scale' || q.type === 'number') {
        const nums = vals.map(Number).filter(n => !isNaN(n)), avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        inner = `<div class="fm-avg"><b>${nums.length ? avg.toLocaleString(OW.lang, { maximumFractionDigits: 1 }) : '–'}</b><span>${t('form.avg')}${q.type === 'rating' ? ' · ★ 1–5' : ''}${nums.length && q.type === 'number' ? ` · min ${Math.min(...nums)} · max ${Math.max(...nums)}` : ''}</span></div>`;
        if (q.type !== 'number') { const lo = q.type === 'rating' ? 1 : +q.min || 0, hi = q.type === 'rating' ? 5 : +q.max || 10, counts = {}; nums.forEach(n => counts[n] = (counts[n] || 0) + 1); inner += bars(Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i)), counts); }
      } else {
        inner = `<ul class="fm-texts">${vals.slice(-6).reverse().map(v => `<li>${esc(v)}</li>`).join('')}</ul>${vals.length > 6 ? `<small class="muted">+ ${vals.length - 6}</small>` : ''}`;
      }
      return `<div class="fm-card fm-sum"><h4>${esc(q.label || '?')}</h4><small class="muted">${t('form.answered', { n: vals.length })}</small>${inner}</div>`;
    }).join('');
  }
  async function renderResponses(el, reload = true) {
    if (reload) await loadServer();
    const all = allResponses(), r = F0.rows(F, all.map(srcName), labels());
    el.innerHTML = `<div class="fm-rbar"><h2>${t('form.responsesN', { n: all.length })}</h2><span class="grow"></span>
        ${isServer ? `<button class="btn" data-r="refresh">${I('restore', 16)}<span>${t('form.refresh')}</span></button>` : ''}
        <button class="btn primary" data-r="excel">${OW.appGlyph('excel', 18)}<span>${t('form.toExcel')}</span></button>
        <button class="btn" data-r="xlsx">${I('download', 16)}<span>.xlsx</span></button><button class="btn" data-r="csv">${I('download', 16)}<span>.csv</span></button>
        <button class="btn" data-r="import">${I('upload', 16)}<span>${t('form.import')}</span></button>
        <button class="icon-btn" data-r="clear" title="${t('form.clear')}">${I('trash', 18)}</button></div>
      ${!all.length ? `<div class="fm-card fm-none">${I('list', 36)}<p>${t('form.noResponses')}</p><button class="btn primary" data-r="create">${I('sparkle', 16)}<span>${t('form.create')}</span></button></div>` : `
      <div class="fm-rtabs"><button class="on" data-rt="sum">${t('form.summary')}</button><button data-rt="tab">${t('form.table')}</button></div>
      <div class="fm-rsum">${summaryHTML(all)}</div>
      <div class="fm-rtab" hidden><div class="fm-tablewrap"><table class="fm-table"><thead><tr>${r.header.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${r.rows.slice().reverse().slice(0, 500).map(row => `<tr>${row.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`}`;
    el.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { el.querySelectorAll('[data-rt]').forEach(x => x.classList.toggle('on', x === b)); el.querySelector('.fm-rsum').hidden = b.dataset.rt !== 'sum'; el.querySelector('.fm-rtab').hidden = b.dataset.rt !== 'tab'; });
    el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => ({ refresh: () => renderResponses(el), excel: toExcel, xlsx: dlXlsx, csv: dlCsv, import: importDialog, clear: clearAll, create: createDialog })[b.dataset.r]());
    ctx.refresh();
  }
  async function ensureExcel(silent) {
    if (!F0.answerable(F).length) return null;
    let x = F.excelId ? await OW.store.get(F.excelId) : null;
    if (x && x.trashed) x = null;
    const all = allResponses().map(srcName), name = `${F.title || ctx.file.name} – ${t('form.sheet')}`;
    if (!x) { x = await OW.createFile('excel', { name, content: F0.syncExcelContent(null, F, id, all, labels()), noOpen: true }); F.excelId = x.id; ctx.markDirty(); await ctx.save(); }
    else { x.content = F0.syncExcelContent(x.content instanceof Blob ? null : x.content, F, id, all, labels()); delete x.proExt; delete x.size; await OW.store.put(x); }
    return x;
  }
  async function toExcel() {
    if (isServer) await loadServer();
    const x = await ensureExcel(); if (!x) return OW.toast(t('form.noQuestions'), 'warn');
    OW.toast(`${t('form.excelUpdated')} <button class="link" onclick="OW._formOpenExcel('${x.id}')">${t('form.openExcel')}</button>`);
  }
  OW._formOpenExcel = async xid => { await OW.closeEditor(); OW.openFile(xid); };
  async function dlXlsx() { if (isServer) await loadServer(); const { cells } = F0.cells(F, allResponses().map(srcName), labels()); OW.download(OW.ooxml.cellsToXlsx(cells, t('form.sheet')), OW.safeName(F.title || ctx.file.name) + '.xlsx'); }
  async function dlCsv() { if (isServer) await loadServer(); OW.download(new Blob([F0.toCSV(F, allResponses().map(srcName), labels(), OW.lang === 'en' ? ',' : ';')], { type: 'text/csv;charset=utf-8' }), OW.safeName(F.title || ctx.file.name) + '.csv'); }
  function importDialog() {
    let pasted = '';
    OW.alert(t('form.import'), `<div class="fm-dlg-imp"><p class="muted">${t('form.importHint')}</p><label class="btn">${I('upload', 16)}<span>${t('form.chooseFile')}</span><input type="file" accept=".json,.txt,.eml" multiple hidden></label><textarea class="inp fm-paste" rows="6" placeholder="${t('form.pastePh')}"></textarea></div>`).then(ok => { if (ok && pasted.trim()) addImported(F0.parseImport(pasted, id)); });
    const card = document.getElementById('modalCard');
    card.querySelector('.fm-paste').addEventListener('input', e => { pasted = e.target.value; });
    card.querySelector('input[type=file]').onchange = async e => { let got = []; for (const f of e.target.files) got = got.concat(F0.parseImport(await f.text(), id)); pasted = ''; card.querySelector('[data-x]').click(); addImported(got); };
  }
  function addImported(list) {
    const have = new Set(allResponses().map(r => r.id)), fresh = list.filter(r => !have.has(r.id)).map(r => Object.assign({}, r, { answers: F0.validate(F, r.answers).answers }));
    F.responses = F.responses.concat(fresh); changed(); OW.toast(t('form.imported', { n: fresh.length }));
    if (view === 'responses') renderResponses(bodyEl.querySelector('.fm-resp'), false);
    if (fresh.length && F.excelId) ensureExcel(true);
  }
  async function clearAll() {
    if (!await OW.confirm(t('form.clearConfirm'))) return;
    F.responses = []; serverResp = [];
    if (isServer) { try { await fetch('api/forms/' + encodeURIComponent(id) + '/responses', { method: 'DELETE' }); } catch { /* offline */ } }
    changed(); if (F.excelId) await ensureExcel(true); renderResponses(bodyEl.querySelector('.fm-resp'), false);
  }

  /* ---------- "Erstellen": publish on the server / download the HTML page ---------- */
  const qrSVG = (text, cell = 6) => { try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true }); } catch { return ''; } };
  const pageEndpoint = () => { const s = (F.server || '').trim(); if (s) return s.endsWith('/') ? s : s + '/'; return isServer && !isLocalHost() ? base() : null; };
  async function publish() {
    await ensureExcel(true);
    const html = F0.pageHTML(F, id, { endpoint: base(), email: F.email, kiosk: F.kiosk });
    const r = await fetch('api/forms/' + encodeURIComponent(id) + '/publish', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, accepting: F.accepting !== false, labels: labels() }) });
    if (!r.ok) throw new Error('publish ' + r.status);
    pubInfo = await r.json(); F.publishedAt = pubInfo.publishedAt; ctx.markDirty(); return pubInfo;
  }
  function downloadPage() {
    const html = F0.pageHTML(F, id, { endpoint: pageEndpoint(), email: F.email, kiosk: F.kiosk });
    OW.download(new Blob([html], { type: 'text/html;charset=utf-8' }), OW.safeName(F.title || ctx.file.name) + '.html');
    if (!F.excelId) ensureExcel(true);
  }
  async function createDialog() {
    if (!F0.answerable(F).length) return OW.toast(t('form.noQuestions'), 'warn');
    await ctx.save(); if (isServer) await loadServer();
    const link = base() + 'f/' + encodeURIComponent(id), ep = pageEndpoint(), x = F.excelId ? await OW.store.get(F.excelId) : null;
    const serverBlock = !isServer ? `<p class="muted">${I('server', 16)} ${t('form.noServerMode')}</p>` : `
      <div class="fm-pub">
        <div class="fm-pub-main"><h4>${I('server', 18)}${t('form.onServer')} <em class="fm-state ${pubInfo ? (pubInfo.accepting ? 'ok' : 'off') : ''}">${pubInfo ? (pubInfo.accepting ? t('form.published') : t('form.closed')) : t('form.notPublished')}</em></h4>
          <p class="muted small">${t('form.onServerHint')}</p>
          ${isLocalHost() ? `<p class="fm-warn">${I('wifiOff', 16)}<span>${t('form.localhostWarn')}</span></p>` : ''}
          <div class="fm-link" ${pubInfo ? '' : 'hidden'}><input class="inp" readonly value="${esc(link)}"><button class="btn" data-p="copy">${I('copy', 16)}<span>${t('form.copyLink')}</span></button></div>
          <div class="btn-row"><button class="btn primary" data-p="publish">${I('share', 16)}<span>${pubInfo ? t('form.update') : t('form.publish')}</span></button>
          ${pubInfo ? `<button class="btn" data-p="qr">${I('download', 16)}<span>${t('form.downloadQR')}</span></button>` : ''}</div></div>
        <div class="fm-qr" ${pubInfo ? '' : 'hidden'}>${pubInfo ? qrSVG(link) : ''}</div>
      </div>`;
    OW.alert(t('form.createTitle'), `<div class="fm-dlg">${serverBlock}
      <div class="fm-pub"><div class="fm-pub-main"><h4>${I('download', 18)}${t('form.asFile')}</h4><p class="muted small">${t('form.asFileHint')}</p>
        <ul class="fm-dest">${ep ? `<li>${I('server', 14)}${t('form.dest.server', { url: esc(ep) })}</li>` : `<li>${I('monitor', 14)}${t('form.dest.local')}</li>`}${F.email ? `<li>${I('mail', 14)}${t('form.dest.mail', { mail: esc(F.email) })}</li>` : ''}${F.kiosk ? `<li>${I('lock', 14)}${t('form.kiosk')}</li>` : ''}<li class="muted">${I('settings', 14)}${t('form.dest.edit')}</li></ul>
        <button class="btn" data-p="html">${I('download', 16)}<span>${t('form.asFile')}</span></button></div></div>
      <p class="muted small">${OW.appGlyph('excel', 16)} ${t('form.excelHint')} <b>${esc(x ? x.name : `${F.title} – ${t('form.sheet')}`)}</b>${isServer ? ' · ' + t('form.excelAuto') : ''}</p>
      <p class="muted small">${t('form.republish')}</p></div>`);
    const card = document.getElementById('modalCard');
    const on = (k, fn) => { const b = card.querySelector(`[data-p="${k}"]`); if (b) b.onclick = fn; };
    on('copy', () => { const v = card.querySelector('.fm-link input').value; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => OW.toast(t('form.linkCopied'))).catch(() => { card.querySelector('.fm-link input').select(); }); });
    on('qr', () => OW.download(new Blob([qrSVG(link, 10).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')], { type: 'image/svg+xml' }), OW.safeName(F.title) + '-QR.svg'));
    on('html', downloadPage);
    on('publish', async e => {
      const b = e.currentTarget; b.disabled = true;
      try { await publish(); card.querySelector('[data-x]').click(); OW.toast(t('form.published')); createDialog(); }
      catch { b.disabled = false; OW.toast(t('form.publishFailed'), 'warn'); }
    });
  }

  /* ---------- views ---------- */
  function setView(v) {
    view = v; if (!bodyEl) return;
    bodyEl.querySelectorAll('.fm-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    bodyEl.querySelector('.fm-build').hidden = v !== 'build'; bodyEl.querySelector('.fm-prev').hidden = v !== 'preview'; bodyEl.querySelector('.fm-resp').hidden = v !== 'responses';
    if (v === 'preview') renderPreview(bodyEl.querySelector('.fm-prev'));
    if (v === 'responses') renderResponses(bodyEl.querySelector('.fm-resp'));
    ctx.refresh();
  }

  const R = [
    { id: 'questions', label: t('form.tab.questions'), groups: [
      { label: t('tab.insert'), items: F0.TYPES.map(x => ({ icon: x.icon, label: t('form.type.' + x.type), onClick: () => addQuestion(x.type) })) },
      { label: t('form.tab.questions'), items: [
        { icon: 'arrowUp', title: t('form.moveUp'), onClick: () => selId && moveQ(selId, -1) }, { icon: 'arrowDown', title: t('form.moveDown'), onClick: () => selId && moveQ(selId, 1) },
        { icon: 'copy', title: t('duplicate'), onClick: () => selId && dupQ(selId) }, { icon: 'trash', title: t('delete'), onClick: () => selId && delQ(selId) },
        { icon: 'check', label: t('form.required'), active: () => !!(sel() && sel().required), onClick: () => { const q = sel(); if (q && q.type !== 'section') { q.required = !q.required; renderCanvas(); changed(); } } }] }] },
    { id: 'design', label: t('tab.design'), groups: [
      { label: t('form.accent'), items: COLORS.map(c => ({ t: 'custom', html: `<button class="fm-col rb" style="background:${c}" title="${c}"></button>`, init: el => el.addEventListener('click', () => { F.accent = c; renderCanvas(); renderSettings(bodyEl.querySelector('.fm-set')); changed(); }) })) },
      { items: [{ icon: 'image', label: t('form.headerImage'), onClick: async () => { const src = await pickImage(1600); if (src) { F.headerImage = src; renderCanvas(); changed(); } } },
        { icon: 'present', label: t('form.cover'), active: () => F.cover.on, onClick: () => { F.cover.on = !F.cover.on; renderSettings(bodyEl.querySelector('.fm-set')); renderCanvas(); changed(); if (F.cover.on) openSettings(); } },
        { icon: 'settings', label: t('form.design'), onClick: openSettings },
        { icon: 'eye', label: t('form.tab.preview'), onClick: () => setView('preview') }] }] },
    { id: 'publish', label: t('form.publish'), groups: [{ items: [
      { icon: 'sparkle', label: t('form.create'), big: true, primary: true, onClick: createDialog },
      { icon: 'download', label: t('form.asFile'), onClick: downloadPage },
      { icon: 'check', label: t('form.accepting'), active: () => F.accepting !== false, onClick: async () => { F.accepting = F.accepting === false; renderSettings(bodyEl.querySelector('.fm-set')); changed(); if (isServer && pubInfo) { try { await publish(); } catch { /* offline */ } } } },
      { icon: 'settings', label: t('form.settings'), onClick: () => { setView('build'); const s = bodyEl.querySelector('.fm-set'); s.classList.add('flash'); s.scrollIntoView({ behavior: 'smooth' }); setTimeout(() => s.classList.remove('flash'), 900); } }] }] },
    { id: 'responses', label: t('form.tab.responses'), groups: [{ items: [
      { icon: 'list', label: t('form.tab.responses'), onClick: () => setView('responses') },
      { icon: 'table', label: t('form.toExcel'), onClick: toExcel }, { icon: 'download', label: '.xlsx', onClick: dlXlsx }, { icon: 'download', label: '.csv', onClick: dlCsv },
      { icon: 'upload', label: t('form.import'), onClick: importDialog }, { icon: 'trash', label: t('form.clear'), onClick: clearAll }] }] },
  ];

  ctx.exports = [
    { label: t('form.asFile') + ' (.html)', hint: t('form.asFileHint'), fn: downloadPage },
    { label: 'Excel (.xlsx) – ' + t('form.tab.responses'), fn: dlXlsx },
    { label: 'CSV (.csv) – ' + t('form.tab.responses'), fn: dlCsv },
  ];

  /* AI Werkzeug: build the form */
  const AIT = OW.aiTool;
  const aiAdapter = {
    label: t('type.form') + ' (Formular Werkzeug)',
    suggestions: [t('ai.f.s1'), t('ai.f.s2'), t('ai.f.s3')],
    describe: () => JSON.stringify({ title: F.title, description: F.desc, thanks: F.thanks, questions: F.questions.map(q => ({ id: q.id, type: q.type, label: q.label, options: q.options, required: q.required })) }).slice(0, 12000),
    tools: [
      AIT('read_form', 'Read the form: title, description and all questions (with ids).'),
      AIT('set_form_info', 'Set the title, the description shown on top and/or the thank-you text.', { title: { type: 'string' }, description: { type: 'string' }, thanks: { type: 'string' } }),
      AIT('add_questions', 'Add questions at the end (or after a question id). types: short, long, single, multi, dropdown, number, date, email, phone, rating, scale, yesno, section (heading), text (info text).', { questions: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, label: { type: 'string' }, options: { type: 'array', items: { type: 'string' } }, required: { type: 'boolean' }, description: { type: 'string' } } } }, after: { type: 'string' } }, ['questions']),
      AIT('update_question', 'Change a question by id.', { id: { type: 'string' }, label: { type: 'string' }, options: { type: 'array', items: { type: 'string' } }, required: { type: 'boolean' } }, ['id']),
      AIT('delete_question', 'Delete a question by id.', { id: { type: 'string' } }, ['id']),
    ],
    async run(n, a) {
      if (n === 'read_form') return aiAdapter.describe();
      if (n === 'set_form_info') { if (a.title != null) F.title = String(a.title); if (a.description != null) F.desc = String(a.description); if (a.thanks != null) F.thanks = String(a.thanks); renderCanvas(); changed(); return { ok: true }; }
      if (n === 'add_questions') { const qs = OW.aiFormQuestions(a.questions); const i = a.after ? qIndex(a.after) + 1 : F.questions.length; F.questions.splice(i > 0 ? i : F.questions.length, 0, ...qs); setView('build'); renderCanvas(); changed(); return { added: qs.map(q => q.id) }; }
      if (n === 'update_question') { const q = F.questions[qIndex(a.id)]; if (!q) return { error: 'no such question' }; if (a.label != null) q.label = String(a.label); if (Array.isArray(a.options)) q.options = a.options.map(String); if (a.required != null) q.required = !!a.required; renderCanvas(); changed(); return { ok: true }; }
      if (n === 'delete_question') { delQ(a.id); return { ok: true }; }
    },
    async insert(m) { const lines = m.split('\n').map(x => x.replace(/^\s*([-*•]|\d+[.)])\s+/, '').replace(/[*_#`]/g, '').trim()).filter(Boolean); F.questions.push(...OW.aiFormQuestions(lines.map(l => ({ type: 'short', label: l })))); setView('build'); renderCanvas(); changed(); },
  };

  return {
    ai: aiAdapter,
    ribbonMode: 'simplified',
    ribbon: () => R,
    mount(body) {
      bodyEl = body;
      body.innerHTML = `<div class="fm"><div class="fm-top"><div class="fm-seg" role="tablist">
          <button data-v="build" class="on">${I('pen', 16)}<span>${t('form.tab.questions')}</span></button>
          <button data-v="preview">${I('eye', 16)}<span>${t('form.tab.preview')}</span></button>
          <button data-v="responses">${I('list', 16)}<span>${t('form.tab.responses')}</span><em class="fm-count"></em></button></div></div>
        <div class="fm-build"><aside class="fm-pal"></aside><section class="fm-canvas"></section><aside class="fm-set"></aside></div>
        <div class="fm-prev" hidden></div><div class="fm-resp" hidden></div></div>`;
      body.querySelectorAll('.fm-seg button').forEach(b => b.onclick = () => setView(b.dataset.v));
      canvas = body.querySelector('.fm-canvas');
      renderPalette(body.querySelector('.fm-pal')); renderCanvas(); bindCanvas(); renderSettings(body.querySelector('.fm-set'));
      if (isServer) loadServer().then(() => ctx.refresh());
    },
    focus() { const el = canvas && canvas.querySelector('.fm-title'); if (el) { el.focus(); el.select(); } },
    getContent: () => F,
    setReadOnly(v) { bodyEl && bodyEl.querySelector('.fm').classList.toggle('ro', v); },
    destroy() { if (msgHandler) removeEventListener('message', msgHandler); },
    status: () => {
      const n = allResponses().length; const c = bodyEl && bodyEl.querySelector('.fm-count'); if (c) c.textContent = n || '';
      return { left: `${t('form.questionsN', { n: F0.answerable(F).length })} · ${t('form.responsesN', { n })}`, right: isServer ? (pubInfo ? (pubInfo.accepting ? '● ' + t('form.published') : t('form.closed')) : t('form.notPublished')) : '' };
    },
  };
};
