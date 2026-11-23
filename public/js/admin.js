/* Office Werkstatt – control center (#/admin): server status, health checks, accounts, maintenance, logs, sessions.
 * Talks to /api/admin/* and /api/me (server/admin.js). Shown in the sidebar for admins of a server
 * (and in the desktop app / a local server without login, where this computer's user is the admin). */
window.OW = window.OW || {};
(function () {
  const t = (k, v) => OW.t(k, v), I = (n, s) => OW.icon(n, s), E = s => OW.escape(s);

  OW.addStrings(`
# ---------- control center ----------
nav.admin | Control center | Kontrollzentrum | Kontrol merkezi | Centro de control | Centre de contrôle
adm.tab.overview | Overview | Übersicht | Genel bakış | Resumen | Vue d'ensemble
adm.tab.checks | Checks | Prüfungen | Kontroller | Comprobaciones | Vérifications
adm.tab.users | Users | Benutzer | Kullanıcılar | Usuarios | Utilisateurs
adm.tab.maint | Maintenance | Wartung | Bakım | Mantenimiento | Maintenance
adm.tab.logs | Logs | Protokolle | Kayıtlar | Registros | Journaux
adm.tab.sessions | Sessions | Sitzungen | Oturumlar | Sesiones | Sessions
adm.refresh | Refresh | Aktualisieren | Yenile | Actualizar | Actualiser
adm.noAccess | Only administrators can open the control center. | Nur Administratoren können das Kontrollzentrum öffnen. | Kontrol merkezini yalnızca yöneticiler açabilir. | Solo los administradores pueden abrir el centro de control. | Seuls les administrateurs peuvent ouvrir le centre de contrôle.
adm.noServer | The control center needs the Office Werkstatt server (desktop app or node server/server.js). | Das Kontrollzentrum braucht den Office-Werkstatt-Server (Desktop-App oder node server/server.js). | Kontrol merkezi için Office Werkstatt sunucusu gerekir (masaüstü uygulaması veya node server/server.js). | El centro de control necesita el servidor de Office Werkstatt (aplicación de escritorio o node server/server.js). | Le centre de contrôle nécessite le serveur Office Werkstatt (application de bureau ou node server/server.js).
adm.error | Could not load: {msg} | Konnte nicht geladen werden: {msg} | Yüklenemedi: {msg} | No se pudo cargar: {msg} | Chargement impossible : {msg}
adm.done | Done | Erledigt | Tamamlandı | Hecho | Terminé
# overview
adm.status | Server | Server | Sunucu | Servidor | Serveur
adm.running | Running | Läuft | Çalışıyor | En marcha | En marche
adm.uptime | Up for {d} | Läuft seit {d} | {d} süredir açık | Activo desde hace {d} | Actif depuis {d}
adm.documents | Documents | Dokumente | Belgeler | Documentos | Documents
adm.inTrash | {n} in the trash | {n} im Papierkorb | {n} çöp kutusunda | {n} en la papelera | {n} dans la corbeille
adm.storage | Storage | Speicher | Depolama | Almacenamiento | Stockage
adm.diskFree | {free} free on the disk | {free} frei auf dem Datenträger | Diskte {free} boş | {free} libres en el disco | {free} libres sur le disque
adm.requests | Requests | Anfragen | İstekler | Solicitudes | Requêtes
adm.perMin | {n} per minute | {n} pro Minute | Dakikada {n} | {n} por minuto | {n} par minute
adm.reqSub | {n} since start · {e} server errors | {n} seit Start · {e} Serverfehler | Başlangıçtan beri {n} · {e} sunucu hatası | {n} desde el inicio · {e} errores del servidor | {n} depuis le démarrage · {e} erreurs serveur
adm.problems | Problems (24 h) | Probleme (24 h) | Sorunlar (24 sa) | Problemas (24 h) | Problèmes (24 h)
adm.errWarn | {e} errors · {w} warnings | {e} Fehler · {w} Warnungen | {e} hata · {w} uyarı | {e} errores · {w} avisos | {e} erreurs · {w} avertissements
adm.activeUsers | Active now | Jetzt aktiv | Şu an etkin | Activos ahora | Actifs maintenant
adm.lastBackup | Last backup | Letzte Sicherung | Son yedek | Última copia | Dernière sauvegarde
adm.never | never | nie | hiç | nunca | jamais
adm.aiEngine | Built-in AI engine | Eingebaute KI | Yerleşik yapay zekâ | IA integrada | IA intégrée
adm.aiRunning | running: {m} | läuft: {m} | çalışıyor: {m} | en marcha: {m} | en marche : {m}
adm.aiIdle | idle · {n} models | bereit · {n} Modelle | beklemede · {n} model | en espera · {n} modelos | en veille · {n} modèles
adm.aiNone | not installed | nicht installiert | kurulu değil | no instalada | non installée
adm.details | Server details | Serverdetails | Sunucu ayrıntıları | Detalles del servidor | Détails du serveur
adm.version | Version | Version | Sürüm | Versión | Version
adm.address | Address | Adresse | Adres | Dirección | Adresse
adm.dataDir | Data folder | Datenordner | Veri klasörü | Carpeta de datos | Dossier de données
adm.system | System | System | Sistem | Sistema | Système
adm.memory | Memory | Arbeitsspeicher | Bellek | Memoria | Mémoire
adm.login | Login | Anmeldung | Giriş | Inicio de sesión | Connexion
adm.loginOn | required · {n} accounts | erforderlich · {n} Konten | gerekli · {n} hesap | obligatorio · {n} cuentas | obligatoire · {n} comptes
adm.loginOff | off – this computer only | aus – nur dieser Computer | kapalı – yalnızca bu bilgisayar | desactivado – solo este equipo | désactivée – cet ordinateur uniquement
adm.autoBackup | Automatic backup | Automatische Sicherung | Otomatik yedek | Copia automática | Sauvegarde automatique
adm.everyH | every {n} h | alle {n} h | {n} saatte bir | cada {n} h | toutes les {n} h
adm.off | off | aus | kapalı | desactivado | désactivé
adm.usage | Data usage | Datennutzung | Veri kullanımı | Uso de datos | Utilisation des données
adm.part.files | Documents | Dokumente | Belgeler | Documentos | Documents
adm.part.forms | Forms | Formulare | Formlar | Formularios | Formulaires
adm.part.models | AI models | KI-Modelle | YZ modelleri | Modelos de IA | Modèles d'IA
adm.part.backups | Backups | Sicherungen | Yedekler | Copias de seguridad | Sauvegardes
adm.part.logs | Logs | Protokolle | Kayıtlar | Registros | Journaux
adm.part.quarantine | Quarantine | Quarantäne | Karantina | Cuarentena | Quarantaine
adm.byType | Documents by type | Dokumente nach Art | Türe göre belgeler | Documentos por tipo | Documents par type
adm.formsInfo | {n} published forms · {r} answers | {n} veröffentlichte Formulare · {r} Antworten | {n} yayınlanmış form · {r} yanıt | {n} formularios publicados · {r} respuestas | {n} formulaires publiés · {r} réponses
# checks
adm.runChecks | Run checks | Prüfung starten | Kontrolleri çalıştır | Comprobar | Lancer la vérification
adm.checkedAt | Checked {time} | Geprüft {time} | Kontrol: {time} | Comprobado {time} | Vérifié {time}
adm.lvl.ok | OK | OK | Tamam | Correcto | OK
adm.lvl.info | Note | Hinweis | Bilgi | Nota | Info
adm.lvl.warn | Warning | Warnung | Uyarı | Aviso | Avertissement
adm.lvl.fail | Problem | Problem | Sorun | Problema | Problème
adm.fix.repair | Repair | Reparieren | Onar | Reparar | Réparer
adm.fix.emptyTrash | Empty old trash | Alten Papierkorb leeren | Eski çöpü boşalt | Vaciar papelera antigua | Vider l'ancienne corbeille
adm.fix.backup | Back up now | Jetzt sichern | Şimdi yedekle | Copiar ahora | Sauvegarder maintenant
adm.chk.node | Node.js version | Node.js-Version | Node.js sürümü | Versión de Node.js | Version de Node.js
adm.chk.dataDir | Data folder can be written | Datenordner beschreibbar | Veri klasörü yazılabilir | Carpeta de datos con escritura | Dossier de données accessible en écriture
adm.chk.disk | Free disk space | Freier Speicherplatz | Boş disk alanı | Espacio libre en disco | Espace disque libre
adm.chk.documents | Documents can be read | Dokumente lesbar | Belgeler okunabiliyor | Documentos legibles | Documents lisibles
adm.chk.tempFiles | Interrupted saves | Abgebrochene Speichervorgänge | Yarım kalan kayıtlar | Guardados interrumpidos | Enregistrements interrompus
adm.chk.orphanForms | Orphaned form data | Verwaiste Formulardaten | Sahipsiz form verileri | Datos de formularios huérfanos | Données de formulaire orphelines
adm.chk.trash | Trash | Papierkorb | Çöp kutusu | Papelera | Corbeille
adm.chk.backup | Backups | Sicherungen | Yedekler | Copias de seguridad | Sauvegardes
adm.chk.envLogin | Login from the environment (OW_USER) | Anmeldung aus der Umgebung (OW_USER) | Ortam değişkeninden giriş (OW_USER) | Inicio de sesión del entorno (OW_USER) | Connexion depuis l'environnement (OW_USER)
adm.chk.usersFile | User accounts | Benutzerkonten | Kullanıcı hesapları | Cuentas de usuario | Comptes utilisateur
adm.chk.exposure | Network exposure | Erreichbarkeit im Netz | Ağdan erişim | Exposición en la red | Exposition réseau
adm.chk.port | Port | Port | Port | Puerto | Port
adm.chk.stockKeys | Stock media API keys | API-Schlüssel für Stockmedien | Stok medya API anahtarları | Claves API de medios de stock | Clés API des médias
adm.chk.logs | Log files | Protokolldateien | Kayıt dosyaları | Archivos de registro | Fichiers journaux
adm.chk.engines | Pro engines | Pro-Engines | Pro motorlar | Motores Pro | Moteurs Pro
adm.chk.converter | Format converter (LibreOffice) | Formatkonverter (LibreOffice) | Biçim dönüştürücü (LibreOffice) | Conversor de formatos (LibreOffice) | Convertisseur de formats (LibreOffice)
adm.chk.aiModels | AI models | KI-Modelle | YZ modelleri | Modelos de IA | Modèles d'IA
adm.chk.memory | Free memory | Freier Arbeitsspeicher | Boş bellek | Memoria libre | Mémoire libre
# users
adm.users.add | Add user | Benutzer hinzufügen | Kullanıcı ekle | Añadir usuario | Ajouter un utilisateur
adm.users.name | Name | Name | Ad | Nombre | Nom
adm.users.password | Password | Passwort | Parola | Contraseña | Mot de passe
adm.users.passwordHint | At least {n} characters | Mindestens {n} Zeichen | En az {n} karakter | Al menos {n} caracteres | Au moins {n} caractères
adm.users.role | Role | Rolle | Rol | Rol | Rôle
adm.users.state | Status | Status | Durum | Estado | Statut
adm.users.lastLogin | Last login | Letzte Anmeldung | Son giriş | Último acceso | Dernière connexion
adm.users.active | active | aktiv | etkin | activo | actif
adm.users.disabled | disabled | gesperrt | devre dışı | desactivado | désactivé
adm.users.env | set by OW_USER / OW_PASS | festgelegt durch OW_USER / OW_PASS | OW_USER / OW_PASS ile ayarlı | definido por OW_USER / OW_PASS | défini par OW_USER / OW_PASS
adm.users.you | you | du | siz | tú | vous
adm.users.setPassword | Set password | Passwort festlegen | Parola belirle | Establecer contraseña | Définir le mot de passe
adm.users.disable | Disable | Sperren | Devre dışı bırak | Desactivar | Désactiver
adm.users.enable | Enable | Entsperren | Etkinleştir | Activar | Activer
adm.users.remove | Delete user | Benutzer löschen | Kullanıcıyı sil | Eliminar usuario | Supprimer l'utilisateur
adm.users.confirmRemove | Delete the account "{n}"? Their documents stay in the library. | Konto „{n}" löschen? Die Dokumente bleiben in der Bibliothek. | "{n}" hesabı silinsin mi? Belgeleri kitaplıkta kalır. | ¿Eliminar la cuenta «{n}»? Sus documentos se quedan en la biblioteca. | Supprimer le compte « {n} » ? Ses documents restent dans la bibliothèque.
adm.users.none | No accounts yet. Without accounts the server can only be used on this computer. | Noch keine Konten. Ohne Konten kann der Server nur auf diesem Computer genutzt werden. | Henüz hesap yok. Hesap olmadan sunucu yalnızca bu bilgisayarda kullanılabilir. | Aún no hay cuentas. Sin cuentas, el servidor solo se puede usar en este equipo. | Aucun compte pour l'instant. Sans compte, le serveur n'est utilisable que sur cet ordinateur.
adm.users.firstHint | The first account should be an administrator. From then on everybody has to sign in – also on this computer. | Das erste Konto sollte ein Administrator sein. Danach müssen sich alle anmelden – auch an diesem Computer. | İlk hesap yönetici olmalıdır. Bundan sonra herkes – bu bilgisayarda da – giriş yapmak zorundadır. | La primera cuenta debe ser de administrador. A partir de entonces todos deben iniciar sesión, también en este equipo. | Le premier compte doit être administrateur. Ensuite, tout le monde doit se connecter – y compris sur cet ordinateur.
adm.users.desktop | The desktop app is used by one person on this computer, so it has no accounts. Accounts and roles are for the server version (team / intranet). | Die Desktop-App nutzt eine Person an diesem Computer, daher gibt es keine Konten. Konten und Rollen sind für die Server-Version (Team / Intranet). | Masaüstü uygulamasını bu bilgisayarda tek kişi kullanır, bu yüzden hesap yoktur. Hesaplar ve roller sunucu sürümü içindir (ekip / intranet). | La aplicación de escritorio la usa una sola persona en este equipo, por eso no tiene cuentas. Las cuentas y los roles son para la versión de servidor (equipo / intranet). | L'application de bureau est utilisée par une seule personne sur cet ordinateur, elle n'a donc pas de comptes. Les comptes et les rôles sont destinés à la version serveur (équipe / intranet).
adm.role.admin | Administrator | Administrator | Yönetici | Administrador | Administrateur
adm.role.editor | Editor | Bearbeiter | Düzenleyici | Editor | Éditeur
adm.role.viewer | Viewer | Betrachter | Görüntüleyici | Lector | Lecteur
adm.role.admin.d | everything, including this control center | alles, auch dieses Kontrollzentrum | her şey, bu kontrol merkezi dahil | todo, incluido este centro de control | tout, y compris ce centre de contrôle
adm.role.editor.d | create, change and delete documents and forms | Dokumente und Formulare erstellen, ändern, löschen | belge ve form oluşturur, değiştirir, siler | crear, cambiar y eliminar documentos y formularios | créer, modifier et supprimer documents et formulaires
adm.role.viewer.d | open and read documents only | Dokumente nur öffnen und lesen | belgeleri yalnızca açar ve okur | solo abrir y leer documentos | uniquement ouvrir et lire les documents
adm.e.weak_password | The password is too short. | Das Passwort ist zu kurz. | Parola çok kısa. | La contraseña es demasiado corta. | Le mot de passe est trop court.
adm.e.exists | This name is already taken. | Dieser Name ist schon vergeben. | Bu ad zaten kullanılıyor. | Este nombre ya existe. | Ce nom est déjà pris.
adm.e.bad_name | Name: letters, digits and . _ @ - only (max. 64). | Name: nur Buchstaben, Ziffern und . _ @ - (max. 64). | Ad: yalnızca harf, rakam ve . _ @ - (en çok 64). | Nombre: solo letras, cifras y . _ @ - (máx. 64). | Nom : lettres, chiffres et . _ @ - uniquement (64 max.).
adm.e.last_admin | At least one active administrator is needed. | Mindestens ein aktiver Administrator wird benötigt. | En az bir etkin yönetici gerekir. | Se necesita al menos un administrador activo. | Au moins un administrateur actif est nécessaire.
adm.e.locked | This account is set on the server (OW_USER / OW_PASS) and cannot be changed here. | Dieses Konto ist auf dem Server festgelegt (OW_USER / OW_PASS) und kann hier nicht geändert werden. | Bu hesap sunucuda ayarlanmıştır (OW_USER / OW_PASS), burada değiştirilemez. | Esta cuenta está definida en el servidor (OW_USER / OW_PASS) y no se puede cambiar aquí. | Ce compte est défini sur le serveur (OW_USER / OW_PASS) et ne peut pas être modifié ici.
adm.e.wrong_password | The current password is wrong. | Das aktuelle Passwort ist falsch. | Mevcut parola yanlış. | La contraseña actual es incorrecta. | Le mot de passe actuel est incorrect.
adm.e.self | You cannot delete your own account. | Du kannst dein eigenes Konto nicht löschen. | Kendi hesabınızı silemezsiniz. | No puedes eliminar tu propia cuenta. | Vous ne pouvez pas supprimer votre propre compte.
adm.e.desktop | Accounts are only used by the server version. | Konten werden nur von der Server-Version genutzt. | Hesaplar yalnızca sunucu sürümünde kullanılır. | Las cuentas solo se usan en la versión de servidor. | Les comptes ne sont utilisés que par la version serveur.
# maintenance
adm.backups | Backups | Sicherungen | Yedekler | Copias de seguridad | Sauvegardes
adm.backups.text | A backup contains all documents, folders and forms with their answers. It is stored in the data folder on the server. | Eine Sicherung enthält alle Dokumente, Ordner und Formulare mit Antworten. Sie liegt im Datenordner auf dem Server. | Yedek tüm belgeleri, klasörleri ve yanıtlarıyla formları içerir; sunucudaki veri klasöründe saklanır. | Una copia contiene todos los documentos, carpetas y formularios con sus respuestas. Se guarda en la carpeta de datos del servidor. | Une sauvegarde contient tous les documents, dossiers et formulaires avec leurs réponses. Elle est stockée dans le dossier de données du serveur.
adm.backups.create | Back up now | Jetzt sichern | Şimdi yedekle | Copiar ahora | Sauvegarder maintenant
adm.backups.upload | Upload a backup | Sicherung hochladen | Yedek yükle | Subir una copia | Téléverser une sauvegarde
adm.backups.none | No backups yet. | Noch keine Sicherungen. | Henüz yedek yok. | Aún no hay copias. | Aucune sauvegarde pour l'instant.
adm.backups.auto | automatic | automatisch | otomatik | automática | automatique
adm.backups.safety | before restore | vor Wiederherstellung | geri yükleme öncesi | antes de restaurar | avant restauration
adm.backups.restore | Restore | Wiederherstellen | Geri yükle | Restaurar | Restaurer
adm.backups.restoreTitle | Restore "{n}" | „{n}" wiederherstellen | "{n}" geri yükle | Restaurar «{n}» | Restaurer « {n} »
adm.backups.merge | Add and overwrite | Hinzufügen und überschreiben | Ekle ve üzerine yaz | Añadir y sobrescribir | Ajouter et remplacer
adm.backups.merge.d | Documents from the backup replace those with the same id; all other documents stay. | Dokumente aus der Sicherung ersetzen gleiche; alle anderen bleiben. | Yedekteki belgeler aynı kimlikli olanların yerine geçer; diğer belgeler kalır. | Los documentos de la copia sustituyen a los del mismo id; los demás se quedan. | Les documents de la sauvegarde remplacent ceux de même id ; les autres restent.
adm.backups.replace | Replace everything | Alles ersetzen | Her şeyi değiştir | Reemplazar todo | Tout remplacer
adm.backups.replace.d | The library becomes exactly the backup – documents created later are removed. | Die Bibliothek wird genau die Sicherung – später erstellte Dokumente werden entfernt. | Kitaplık tam olarak yedek olur – sonradan oluşturulan belgeler kaldırılır. | La biblioteca será exactamente la copia: se eliminan los documentos creados después. | La bibliothèque devient exactement la sauvegarde – les documents créés ensuite sont supprimés.
adm.backups.safetyNote | A safety backup of the current state is made first. | Vorher wird automatisch eine Sicherung des aktuellen Stands angelegt. | Önce mevcut durumun güvenlik yedeği alınır. | Antes se crea una copia de seguridad del estado actual. | Une sauvegarde de sécurité de l'état actuel est d'abord créée.
adm.backups.restored | {n} documents restored | {n} Dokumente wiederhergestellt | {n} belge geri yüklendi | {n} documentos restaurados | {n} documents restaurés
adm.backups.confirmDelete | Delete the backup "{n}"? | Sicherung „{n}" löschen? | "{n}" yedeği silinsin mi? | ¿Eliminar la copia «{n}»? | Supprimer la sauvegarde « {n} » ?
adm.backups.created | Backup created: {n} documents | Sicherung erstellt: {n} Dokumente | Yedek alındı: {n} belge | Copia creada: {n} documentos | Sauvegarde créée : {n} documents
adm.trash.title | Trash | Papierkorb | Çöp kutusu | Papelera | Corbeille
adm.trash.text | {n} documents in the trash of all users, {o} of them older than 30 days. | {n} Dokumente im Papierkorb aller Benutzer, davon {o} älter als 30 Tage. | Tüm kullanıcıların çöp kutusunda {n} belge, {o} tanesi 30 günden eski. | {n} documentos en la papelera de todos los usuarios, {o} con más de 30 días. | {n} documents dans la corbeille de tous les utilisateurs, dont {o} de plus de 30 jours.
adm.trash.old | Empty older than 30 days | Älter als 30 Tage leeren | 30 günden eskileri boşalt | Vaciar los de más de 30 días | Vider ceux de plus de 30 jours
adm.trash.all | Empty all | Alles leeren | Tümünü boşalt | Vaciar todo | Tout vider
adm.trash.confirm | Delete {n} documents from the trash for good? | {n} Dokumente endgültig aus dem Papierkorb löschen? | {n} belge çöp kutusundan kalıcı olarak silinsin mi? | ¿Eliminar definitivamente {n} documentos de la papelera? | Supprimer définitivement {n} documents de la corbeille ?
adm.trash.removed | {n} documents deleted | {n} Dokumente gelöscht | {n} belge silindi | {n} documentos eliminados | {n} documents supprimés
adm.repair.title | Repair | Reparatur | Onarım | Reparación | Réparation
adm.repair.text | Moves unreadable documents and form data without a document to the quarantine folder (nothing is deleted) and removes left-overs of interrupted saves. | Verschiebt unlesbare Dokumente und Formulardaten ohne Dokument in den Quarantäne-Ordner (nichts wird gelöscht) und entfernt Reste abgebrochener Speichervorgänge. | Okunamayan belgeleri ve belgesi olmayan form verilerini karantina klasörüne taşır (hiçbir şey silinmez), yarım kalan kayıtların artıklarını kaldırır. | Mueve los documentos ilegibles y los datos de formularios sin documento a la carpeta de cuarentena (no se elimina nada) y quita restos de guardados interrumpidos. | Déplace les documents illisibles et les données de formulaire sans document vers la quarantaine (rien n'est supprimé) et retire les restes d'enregistrements interrompus.
adm.repair.run | Repair now | Jetzt reparieren | Şimdi onar | Reparar ahora | Réparer maintenant
adm.repair.result | {b} unreadable, {o} orphaned, {t} temporary files handled | {b} unlesbar, {o} verwaist, {t} temporäre Dateien bearbeitet | {b} okunamayan, {o} sahipsiz, {t} geçici dosya işlendi | {b} ilegibles, {o} huérfanos, {t} temporales tratados | {b} illisibles, {o} orphelins, {t} fichiers temporaires traités
adm.cli | Command line | Kommandozeile | Komut satırı | Línea de comandos | Ligne de commande
adm.cli.text | The same tools work on the server without a browser: | Dieselben Werkzeuge gibt es auf dem Server auch ohne Browser: | Aynı araçlar sunucuda tarayıcı olmadan da çalışır: | Las mismas herramientas funcionan en el servidor sin navegador: | Les mêmes outils fonctionnent sur le serveur sans navigateur :
# logs
adm.logs.level | Level | Stufe | Düzey | Nivel | Niveau
adm.logs.all | All | Alle | Tümü | Todos | Tous
adm.cat.all | All events | Alle Ereignisse | Tüm olaylar | Todos los eventos | Tous les événements
adm.cat.sharing | Files & sharing | Dateien & Freigaben | Dosyalar ve paylaşım | Archivos y uso compartido | Fichiers et partages
adm.cat.access | Logins & accounts | Anmeldungen & Konten | Girişler ve hesaplar | Accesos y cuentas | Connexions et comptes
adm.cat.admin | Administration | Verwaltung | Yönetim | Administración | Administration
adm.cat.http | Requests | Anfragen | İstekler | Solicitudes | Requêtes
adm.cat.errors | Problems only | Nur Probleme | Yalnızca sorunlar | Solo problemas | Problèmes uniquement
adm.logs.search | Search the logs… | Protokolle durchsuchen… | Kayıtlarda ara… | Buscar en los registros… | Rechercher dans les journaux…
adm.logs.live | Live | Live | Canlı | En directo | En direct
adm.logs.today | Today | Heute | Bugün | Hoy | Aujourd'hui
adm.logs.download | Download day | Tag herunterladen | Günü indir | Descargar día | Télécharger le jour
adm.logs.time | Time | Zeit | Zaman | Hora | Heure
adm.logs.event | Event | Ereignis | Olay | Evento | Événement
adm.logs.details | Details | Details | Ayrıntılar | Detalles | Détails
adm.logs.none | No entries. | Keine Einträge. | Kayıt yok. | Sin entradas. | Aucune entrée.
adm.logs.filesOff | Log files are off (OW_LOG_DAYS=0) – only entries since the last start are shown. | Protokolldateien sind aus (OW_LOG_DAYS=0) – nur Einträge seit dem letzten Start. | Kayıt dosyaları kapalı (OW_LOG_DAYS=0) – yalnızca son başlatmadan bu yana kayıtlar. | Los archivos de registro están desactivados (OW_LOG_DAYS=0): solo entradas desde el último inicio. | Les fichiers journaux sont désactivés (OW_LOG_DAYS=0) – seules les entrées depuis le dernier démarrage.
# sessions
adm.sess.user | User | Benutzer | Kullanıcı | Usuario | Utilisateur
adm.sess.ip | Address | Adresse | Adres | Dirección | Adresse
adm.sess.client | Browser | Browser | Tarayıcı | Navegador | Navigateur
adm.sess.first | First seen | Zuerst | İlk | Primera vez | Première fois
adm.sess.last | Last active | Zuletzt aktiv | Son etkinlik | Última actividad | Dernière activité
adm.sess.requests | Requests | Anfragen | İstek | Solicitudes | Requêtes
adm.sess.text | Who used the server in the last 24 hours (since the last start). | Wer den Server in den letzten 24 Stunden benutzt hat (seit dem letzten Start). | Son 24 saatte (son başlatmadan bu yana) sunucuyu kimler kullandı. | Quién usó el servidor en las últimas 24 horas (desde el último inicio). | Qui a utilisé le serveur au cours des dernières 24 heures (depuis le dernier démarrage).
adm.sess.none | Nobody yet. | Noch niemand. | Henüz kimse yok. | Nadie todavía. | Personne pour l'instant.
# sharing between users
share.people | Share with people… | Mit Personen teilen… | Kişilerle paylaş… | Compartir con personas… | Partager avec des personnes…
share.title | Share "{n}" | „{n}" teilen | "{n}" paylaş | Compartir «{n}» | Partager « {n} »
share.from | from {n} | von {n} | {n} paylaştı | de {n} | de {n}
share.canView | can view | darf ansehen | görüntüleyebilir | puede ver | peut consulter
share.canEdit | can edit | darf bearbeiten | düzenleyebilir | puede editar | peut modifier
share.notShared | not shared | nicht geteilt | paylaşılmadı | sin compartir | non partagé
share.everyone | Everybody on this server | Alle auf diesem Server | Bu sunucudaki herkes | Todos en este servidor | Tout le monde sur ce serveur
share.copyToMine | Make my own copy | Eigene Kopie erstellen | Kendi kopyamı oluştur | Hacer mi propia copia | Créer ma propre copie
share.saved | Sharing saved | Freigabe gespeichert | Paylaşım kaydedildi | Uso compartido guardado | Partage enregistré
share.noPeople | There are no other accounts yet. An administrator can add them in the control center. | Es gibt noch keine weiteren Konten. Ein Administrator kann sie im Kontrollzentrum anlegen. | Henüz başka hesap yok. Yönetici bunları kontrol merkezinden ekleyebilir. | Aún no hay otras cuentas. Un administrador puede añadirlas en el centro de control. | Il n'y a pas encore d'autres comptes. Un administrateur peut les ajouter dans le centre de contrôle.
share.hint | Documents are private until you share them. People you share with find them under "Shared". | Dokumente sind privat, bis du sie teilst. Wer sie bekommt, findet sie unter „Geteilt". | Belgeler paylaşana kadar özeldir. Paylaştığınız kişiler onları "Paylaşılanlar" altında bulur. | Los documentos son privados hasta que los compartes. Quien los recibe los encuentra en «Compartidos». | Les documents sont privés jusqu'à ce que vous les partagiez. Les destinataires les trouvent sous « Partagés ».
share.search | Find a person… | Person suchen… | Kişi ara… | Buscar una persona… | Rechercher une personne…
adm.tab.sharing | Sharing | Freigaben | Paylaşımlar | Compartidos | Partages
adm.sh.people | People | Personen | Kişiler | Personas | Personnes
adm.sh.owned | Owns | Besitzt | Sahibi | Posee | Possède
adm.sh.out | Shares | Teilt | Paylaşıyor | Comparte | Partage
adm.sh.in | Receives | Erhält | Alıyor | Recibe | Reçoit
adm.sh.files | Documents and their sharing | Dokumente und ihre Freigaben | Belgeler ve paylaşımları | Documentos y su uso compartido | Documents et leurs partages
adm.sh.owner | Owner | Besitzer | Sahip | Propietario | Propriétaire
adm.sh.with | Shared with | Geteilt mit | Paylaşılan | Compartido con | Partagé avec
adm.sh.team | team (no owner) | Team (ohne Besitzer) | ekip (sahipsiz) | equipo (sin propietario) | équipe (sans propriétaire)
adm.sh.allOwners | All owners | Alle Besitzer | Tüm sahipler | Todos los propietarios | Tous les propriétaires
adm.sh.onlyShared | Only shared | Nur geteilte | Yalnızca paylaşılanlar | Solo compartidos | Partagés uniquement
adm.sh.search | Find a document… | Dokument suchen… | Belge ara… | Buscar un documento… | Rechercher un document…
adm.sh.edit | Change sharing | Freigabe ändern | Paylaşımı değiştir | Cambiar uso compartido | Modifier le partage
adm.sh.transfer | Change owner | Besitzer ändern | Sahibi değiştir | Cambiar propietario | Changer de propriétaire
adm.sh.transferTitle | New owner for "{n}" | Neuer Besitzer für „{n}" | "{n}" için yeni sahip | Nuevo propietario de «{n}» | Nouveau propriétaire de « {n} »
adm.sh.transferAll | Give all documents of {n} to… | Alle Dokumente von {n} übergeben an… | {n} kişisinin tüm belgelerini devret… | Pasar todos los documentos de {n} a… | Transférer tous les documents de {n} à…
adm.sh.revoke | Stop all shares with {n} | Alle Freigaben für {n} beenden | {n} ile tüm paylaşımları durdur | Dejar de compartir todo con {n} | Arrêter tous les partages avec {n}
adm.sh.revokeConfirm | Stop sharing every document with {n}? | Keine Dokumente mehr mit {n} teilen? | {n} ile hiçbir belge paylaşılmasın mı? | ¿Dejar de compartir todos los documentos con {n}? | Ne plus partager aucun document avec {n} ?
adm.sh.unowned | {n} documents from before accounts existed have no owner – everybody sees them. | {n} Dokumente aus der Zeit vor den Konten haben keinen Besitzer – alle sehen sie. | Hesaplardan önceki {n} belgenin sahibi yok – herkes görüyor. | {n} documentos anteriores a las cuentas no tienen propietario: todos los ven. | {n} documents antérieurs aux comptes n'ont pas de propriétaire – tout le monde les voit.
adm.sh.assign | Give them an owner… | Besitzer zuweisen… | Sahip ata… | Asignar propietario… | Attribuer un propriétaire…
adm.sh.changed | {n} documents changed | {n} Dokumente geändert | {n} belge değişti | {n} documentos cambiados | {n} documents modifiés
adm.sh.missing | account deleted | Konto gelöscht | hesap silindi | cuenta eliminada | compte supprimé
adm.sh.noAuth | Sharing between people needs accounts (Users tab). Without them everybody on this computer sees every document. | Teilen zwischen Personen braucht Konten (Reiter Benutzer). Ohne Konten sieht jeder an diesem Computer alle Dokumente. | Kişiler arası paylaşım için hesap gerekir (Kullanıcılar sekmesi). Hesap yoksa bu bilgisayardaki herkes tüm belgeleri görür. | Compartir entre personas requiere cuentas (pestaña Usuarios). Sin ellas, todos en este equipo ven todos los documentos. | Le partage entre personnes nécessite des comptes (onglet Utilisateurs). Sans eux, tout le monde sur cet ordinateur voit tous les documents.
adm.sh.logHint | Every change of sharing and ownership, and every time someone opens or edits another person's document, is in the log. | Jede Änderung von Freigaben und Besitz sowie jedes Öffnen oder Bearbeiten fremder Dokumente steht im Protokoll. | Paylaşım ve sahiplikteki her değişiklik ile başkasının belgesinin her açılışı veya düzenlenişi kayıtlara yazılır. | Cada cambio de uso compartido y propiedad, y cada vez que alguien abre o edita un documento ajeno, queda en el registro. | Chaque modification de partage et de propriété, et chaque ouverture ou modification du document d'une autre personne, figure dans le journal.
adm.sh.showLog | Show sharing in the log | Freigaben im Protokoll zeigen | Paylaşımları kayıtlarda göster | Ver uso compartido en el registro | Voir les partages dans le journal
# account menu
me.role | Role: {r} | Rolle: {r} | Rol: {r} | Rol: {r} | Rôle : {r}
me.password | Change password | Passwort ändern | Parolayı değiştir | Cambiar contraseña | Changer le mot de passe
me.current | Current password | Aktuelles Passwort | Mevcut parola | Contraseña actual | Mot de passe actuel
me.new | New password | Neues Passwort | Yeni parola | Nueva contraseña | Nouveau mot de passe
me.repeat | Repeat new password | Neues Passwort wiederholen | Yeni parolayı tekrarla | Repetir la nueva contraseña | Répéter le nouveau mot de passe
me.mismatch | The new passwords are not the same. | Die neuen Passwörter stimmen nicht überein. | Yeni parolalar aynı değil. | Las nuevas contraseñas no coinciden. | Les nouveaux mots de passe ne correspondent pas.
me.changed | Password changed – the browser will ask for it again. | Passwort geändert – der Browser fragt gleich erneut danach. | Parola değişti – tarayıcı yeniden soracak. | Contraseña cambiada: el navegador la volverá a pedir. | Mot de passe modifié – le navigateur va le redemander.
me.readOnly | Read only – your role cannot change documents. | Nur lesen – deine Rolle kann keine Dokumente ändern. | Salt okunur – rolünüz belgeleri değiştiremez. | Solo lectura: tu rol no puede cambiar documentos. | Lecture seule – votre rôle ne peut pas modifier les documents.
`);

  /* ---------- API ---------- */
  async function api(method, url, body, raw) {
    const o = { method, headers: { 'X-OW-Request': '1' }, cache: 'no-store' };
    if (raw) o.body = raw; else if (body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    const r = await fetch('api/' + url, o);
    let j = null; try { j = await r.json(); } catch { /* not json */ }
    if (!r.ok) { const e = new Error((j && j.error) || 'HTTP ' + r.status); e.code = j && j.code; e.status = r.status; throw e; }
    return j;
  }
  const errText = e => (e.code && OW.t('adm.e.' + e.code) !== 'adm.e.' + e.code) ? t('adm.e.' + e.code) : E(e.message);
  const fail = e => OW.toast(errText(e), 'warn');

  /* ---------- formatting ---------- */
  const loc = () => ({ tr: 'tr-TR', de: 'de-DE', en: 'en-GB', es: 'es-ES', fr: 'fr-FR' }[OW.lang] || OW.lang);
  const size = b => { b = +b || 0; const u = ['B', 'kB', 'MB', 'GB', 'TB']; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return (i ? b.toFixed(b < 10 ? 1 : 0) : b) + ' ' + u[i]; };
  const when = ts => ts ? new Date(ts).toLocaleString(loc(), { dateStyle: 'short', timeStyle: 'short' }) : '–';
  const clock = ts => new Date(ts).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ago = ts => { const s = Math.round((Date.now() - ts) / 1000); try { const f = new Intl.RelativeTimeFormat(loc(), { numeric: 'auto' }); return s < 60 ? f.format(-s, 'second') : s < 3600 ? f.format(-Math.round(s / 60), 'minute') : s < 86400 ? f.format(-Math.round(s / 3600), 'hour') : f.format(-Math.round(s / 86400), 'day'); } catch { return when(ts); } };
  const dur = s => { const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`; };
  const roleName = r => t('adm.role.' + r);
  const lvl = l => `<span class="adm-lvl ${l}">${t('adm.lvl.' + l)}</span>`;
  const bar = (part, total, cls = '') => `<div class="adm-bar ${cls}"><i style="width:${total ? Math.min(100, Math.max(part ? 1.5 : 0, part / total * 100)).toFixed(1) : 0}%"></i></div>`;

  /* ---------- who am I ---------- */
  OW.me = null;
  OW.loadMe = async function () {
    OW.me = null;
    if (OW.store.mode !== 'server') return null;
    try { const r = await fetch('api/me', { cache: 'no-store' }); if (r.ok) OW.me = await r.json(); } catch { /* old server */ }
    const nav = document.getElementById('navAdmin'); if (nav) nav.hidden = !(OW.me && OW.me.role === 'admin');
    document.body.classList.toggle('role-viewer', !!(OW.me && OW.me.role === 'viewer'));
    return OW.me;
  };
  OW.changePassword = () => OW.modal(`<form class="dlg" autocomplete="off"><h3>${t('me.password')}</h3>
      <label class="adm-f"><span>${t('me.current')}</span><input class="inp" type="password" name="cur" autocomplete="current-password" required></label>
      <label class="adm-f"><span>${t('me.new')}</span><input class="inp" type="password" name="pw" autocomplete="new-password" minlength="8" required></label>
      <label class="adm-f"><span>${t('me.repeat')}</span><input class="inp" type="password" name="pw2" autocomplete="new-password" minlength="8" required></label>
      <p class="adm-err" hidden></p>
      <div class="dlg-btns"><button type="button" class="btn ghost" data-x>${t('cancel')}</button><button class="btn primary">${t('ok')}</button></div></form>`, (c, close) => {
    const f = c.querySelector('form'), err = c.querySelector('.adm-err'), show = m => { err.textContent = m; err.hidden = false; };
    c.querySelector('[data-x]').onclick = () => close(false);
    f.cur.focus();
    f.onsubmit = async e => {
      e.preventDefault();
      if (f.pw.value !== f.pw2.value) return show(t('me.mismatch'));
      try { await api('PUT', 'me/password', { current: f.cur.value, password: f.pw.value }); close(true); OW.toast(t('me.changed')); setTimeout(() => location.reload(), 1500); }
      catch (x) { err.innerHTML = errText(x); err.hidden = false; }
    };
  });

  /* ---------- sharing between people ---------- */
  OW.canShareWithPeople = () => OW.store.mode === 'server' && !!(OW.me && OW.me.auth);
  const permSel = (cur, cls = '') => `<select class="inp adm-sel ${cls}"><option value="">${t('share.notShared')}</option><option value="view" ${cur === 'view' ? 'selected' : ''}>${t('share.canView')}</option><option value="edit" ${cur === 'edit' ? 'selected' : ''}>${t('share.canEdit')}</option></select>`;
  /* file: { id, name, owner, shares, shared, sharedPerm } · admin: use the admin API (any file) → resolves with the new state or null */
  OW.shareDialog = async function (file, { admin = false } = {}) {
    let dir = []; try { dir = (await api('GET', 'directory')).users; } catch (e) { fail(e); return null; }
    const me = (OW.me && OW.me.name || '').toLowerCase(), owner = String(file.owner || (admin ? '' : me)).toLowerCase();
    const people = dir.filter(u => u.name.toLowerCase() !== owner && (admin || u.name.toLowerCase() !== me));
    const cur = new Map((file.shares || []).map(s => [s.user.toLowerCase(), s.perm]));
    return OW.modal(`<form class="dlg adm-share"><h3>${I('share', 18)} ${t('share.title', { n: E(file.name) })}</h3>
        <p class="muted small">${t('share.hint')}</p>
        <div class="adm-share-row everyone"><span>${I('globe', 18)}<b>${t('share.everyone')}</b></span>${permSel(file.shared ? (file.sharedPerm || 'edit') : '', 'sh-all')}</div>
        ${people.length > 6 ? `<label class="mini-search">${I('search', 16)}<input class="sh-q" placeholder="${t('share.search')}"></label>` : ''}
        <div class="adm-share-list">${people.map(u => `<div class="adm-share-row" data-user="${E(u.name)}"><span><i class="adm-ava">${E(u.name.slice(0, 1).toUpperCase())}</i><b>${E(u.name)}</b><small class="muted">${roleName(u.role)}</small></span>${permSel(cur.get(u.name.toLowerCase()) || '')}</div>`).join('') || `<p class="muted">${t('share.noPeople')}</p>`}</div>
        <div class="dlg-btns"><button type="button" class="btn ghost" data-x>${t('cancel')}</button><button class="btn primary">${t('ok')}</button></div></form>`, (c, close) => {
      const f = c.querySelector('form'); c.querySelector('[data-x]').onclick = () => close(null);
      const q = c.querySelector('.sh-q'); if (q) q.oninput = () => c.querySelectorAll('.adm-share-list [data-user]').forEach(r => { r.hidden = !r.dataset.user.toLowerCase().includes(q.value.toLowerCase()); });
      f.onsubmit = async e => {
        e.preventDefault();
        const shares = [...c.querySelectorAll('[data-user]')].map(r => ({ user: r.dataset.user, perm: r.querySelector('select').value })).filter(s => s.perm);
        // keep shares with people not in the list (e.g. deleted accounts are dropped only by the admin)
        for (const s of file.shares || []) if (!people.some(u => u.name.toLowerCase() === s.user.toLowerCase()) && s.user.toLowerCase() !== me && dir.some(u => u.name.toLowerCase() === s.user.toLowerCase())) shares.push({ user: s.user, perm: s.perm });
        const all = c.querySelector('.sh-all').value;
        try {
          const r = await api('PUT', admin ? 'admin/shares/' + encodeURIComponent(file.id) : 'files/' + encodeURIComponent(file.id) + '/share', { shares, shared: !!all, sharedPerm: all || file.sharedPerm || 'edit' });
          close(r); OW.toast(t('share.saved'));
        } catch (x) { fail(x); }
      };
    });
  };
  const pickUser = (title, list) => OW.modal(`<form class="dlg"><h3>${title}</h3><select class="inp" name="u">${list.map(u => `<option value="${E(u.name)}">${E(u.name)} · ${roleName(u.role)}</option>`).join('')}</select>
      <div class="dlg-btns"><button type="button" class="btn ghost" data-x>${t('cancel')}</button><button class="btn primary">${t('ok')}</button></div></form>`, (c, close) => {
    const f = c.querySelector('form'); c.querySelector('[data-x]').onclick = () => close(null); f.onsubmit = e => { e.preventDefault(); close(f.u.value); };
  });

  /* ---------- page ---------- */
  const TABS = [['overview', 'gauge'], ['checks', 'check'], ['users', 'users'], ['sharing', 'share'], ['maint', 'wand'], ['logs', 'list'], ['sessions', 'activity']];
  let tab = 'overview', timer = null, root = null, logState = { level: '', cat: '', q: '', day: '', live: false };
  const stop = () => { if (timer) clearInterval(timer); timer = null; };
  addEventListener('hashchange', () => { if (!/^#\/admin/.test(location.hash)) stop(); });

  OW.renderAdmin = function (el) {
    root = el; stop();
    const m = /[?&]tab=(\w+)/.exec(location.hash); if (m && TABS.some(x => x[0] === m[1])) tab = m[1];
    if (OW.store.mode !== 'server') { el.innerHTML = head() + `<div class="card"><p class="muted">${t('adm.noServer')}</p></div>`; return; }
    if (!OW.me || OW.me.role !== 'admin') { el.innerHTML = head() + `<div class="card"><p class="muted">${I('lock', 16)} ${t('adm.noAccess')}</p></div>`; return; }
    el.innerHTML = head(true) + `<div class="seg big adm-tabs" role="tablist">${TABS.map(([k, ic]) => `<button role="tab" data-tab="${k}" class="${tab === k ? 'on' : ''}">${I(ic, 16)}<span>${t('adm.tab.' + k)}</span></button>`).join('')}</div><div id="admBody" class="adm-body"></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; history.replaceState(null, '', '#/admin?tab=' + tab); OW.renderAdmin(el); });
    el.querySelector('#admRefresh').onclick = () => show();
    show();
  };
  const head = btn => `<div class="page-h"><h1>${I('gauge', 28)}${t('nav.admin')}</h1>${btn ? `<button class="btn" id="admRefresh">${I('rotate', 16)}<span>${t('adm.refresh')}</span></button>` : ''}</div>`;
  const body = () => root && root.querySelector('#admBody');
  async function show() {
    stop();
    const b = body(); if (!b) return;
    try { await ({ overview, checks, users, sharing, maint, logs, sessions })[tab](b); }
    catch (e) { b.innerHTML = `<div class="card"><p class="adm-err">${t('adm.error', { msg: errText(e) })}</p></div>`; }
  }
  const poll = (fn, ms) => { stop(); timer = setInterval(() => { if (document.hidden || !body()) return; fn().catch(() => {}); }, ms); };

  /* ----- overview ----- */
  async function overview(b) {
    const draw = async () => {
      const s = await api('GET', 'admin/status'), L = s.library, U = s.usage, srv = s.server;
      const disk = U.disk;
      const types = Object.entries(L.byType).sort((a, c) => c[1] - a[1]);
      const maxPart = Math.max(1, ...Object.values(U.parts).map(p => p.bytes));
      b.innerHTML = `
        <div class="adm-stats">
          ${stat('server', t('adm.status'), `<span class="adm-dot ok"></span>${t('adm.running')}`, t('adm.uptime', { d: dur(srv.uptime) }))}
          ${stat('file', t('adm.documents'), L.documents, t('adm.inTrash', { n: L.trashed }))}
          ${stat('layers', t('adm.storage'), size(U.total.bytes), disk ? t('adm.diskFree', { free: size(disk.free) }) + bar(disk.total - disk.free, disk.total, disk.free < 1e9 ? 'warn' : '') : '')}
          ${stat('activity', t('adm.requests'), t('adm.perMin', { n: s.requests.perMinute }), t('adm.reqSub', { n: s.requests.total, e: s.requests.errors }))}
          ${stat('bell', t('adm.problems'), `<span class="${s.problems.error ? 'adm-red' : s.problems.warn ? 'adm-amber' : ''}">${s.problems.error + s.problems.warn}</span>`, `<a href="#/admin?tab=logs" data-logs>${t('adm.errWarn', { e: s.problems.error, w: s.problems.warn })}</a>`)}
          ${stat('users', t('adm.activeUsers'), s.activeSessions, srv.auth ? t('adm.loginOn', { n: srv.accounts }) : t('adm.loginOff'))}
          ${stat('save', t('adm.lastBackup'), s.lastBackup ? ago(s.lastBackup.created) : `<span class="adm-amber">${t('adm.never')}</span>`, srv.backupHours > 0 ? `${t('adm.autoBackup')}: ${t('adm.everyH', { n: srv.backupHours })}` : `${t('adm.autoBackup')}: ${t('adm.off')}`)}
          ${stat('sparkle', t('adm.aiEngine'), !s.ai || !s.ai.available ? `<span class="muted">${t('adm.aiNone')}</span>` : s.ai.running ? `<span class="adm-dot ok"></span>${s.ai.gpu ? 'GPU' : 'CPU'}` : `<span class="adm-dot"></span>–`, s.ai && s.ai.available ? (s.ai.running ? t('adm.aiRunning', { m: E(s.ai.model) }) : t('adm.aiIdle', { n: s.ai.models })) : '')}
        </div>
        <div class="set-grid adm-grid">
          <div class="card set">
            <h2>${I('server', 20)}${t('adm.details')}</h2>
            ${kv(t('adm.version'), `Office Werkstatt ${E(srv.version)}`)}
            ${kv(t('adm.address'), `<code>${E(srv.host)}:${srv.port}</code>${srv.desktop ? ' · Desktop' : ''}`)}
            ${kv(t('adm.login'), srv.auth ? t('adm.loginOn', { n: srv.accounts }) : t('adm.loginOff'))}
            ${kv(t('adm.dataDir'), `<code class="adm-path" title="${E(srv.dataDir)}">${E(srv.dataDir)}</code>`)}
            ${kv(t('adm.system'), `${E(srv.platform)} · Node ${E(srv.node)} · ${s.system.cpus} CPU`)}
            ${kv(t('adm.memory'), `${size(s.system.rss)} · ${size(s.system.memTotal - s.system.memFree)} / ${size(s.system.memTotal)}`)}
            ${kv(t('adm.autoBackup'), srv.backupHours > 0 ? t('adm.everyH', { n: srv.backupHours }) : t('adm.off'))}
          </div>
          <div class="card set">
            <h2>${I('layers', 20)}${t('adm.usage')}</h2>
            <ul class="adm-usage">${Object.entries(U.parts).map(([k, p]) => `<li><span>${t('adm.part.' + k)}</span>${bar(p.bytes, maxPart)}<b>${size(p.bytes)}</b></li>`).join('')}</ul>
            <label>${t('adm.byType')}</label>
            <div class="adm-types">${types.map(([ty, n]) => `<span class="chip">${OW.TYPES[ty] ? OW.appGlyph(ty, 18) : ''}${E(OW.TYPES[ty] ? t('tool.' + ty + '.name') : ty)} <b>${n}</b></span>`).join('') || '<span class="muted">–</span>'}</div>
            <p class="muted small">${t('adm.formsInfo', { n: L.forms.published, r: L.forms.responses })}</p>
          </div>
        </div>`;
      b.querySelectorAll('[data-logs]').forEach(a => a.onclick = e => { e.preventDefault(); logState.level = 'warn'; logState.cat = ''; tab = 'logs'; history.replaceState(null, '', '#/admin?tab=logs'); OW.renderAdmin(root); });
    };
    await draw(); poll(draw, 10000);
  }
  const stat = (ic, label, value, sub) => `<div class="card adm-stat"><div class="adm-stat-h">${I(ic, 16)}<span>${label}</span></div><div class="adm-stat-v">${value}</div><div class="adm-stat-s muted small">${sub || ''}</div></div>`;
  const kv = (k, v) => `<p class="kv"><span>${k}</span><b>${v}</b></p>`;

  /* ----- checks ----- */
  async function checks(b) {
    b.innerHTML = `<div class="card adm-wait">${I('rotate', 18)}</div>`;
    const r = await api('GET', 'admin/checks'), S = r.summary;
    b.innerHTML = `
      <div class="adm-toolbar"><div class="adm-sum">${['fail', 'warn', 'info', 'ok'].map(l => `<span class="adm-pill ${l}">${S[l] || 0} ${t('adm.lvl.' + l)}</span>`).join('')}</div>
        <span class="muted small">${t('adm.checkedAt', { time: clock(r.at) })}</span><button class="btn primary" id="admRun">${I('check', 16)}<span>${t('adm.runChecks')}</span></button></div>
      <div class="card adm-checks">${r.checks.sort((a, c) => order(a.level) - order(c.level)).map(c => `
        <div class="adm-check ${c.level}"><span class="adm-dot ${c.level}"></span>
          <div class="adm-check-t"><b>${E(t('adm.chk.' + c.id) !== 'adm.chk.' + c.id ? t('adm.chk.' + c.id) : c.id)}</b><small>${E(c.detail)}</small></div>
          ${lvl(c.level)}${c.fix && c.level !== 'ok' ? `<button class="btn sm" data-fix="${c.fix}">${t('adm.fix.' + c.fix)}</button>` : ''}</div>`).join('')}</div>`;
    b.querySelector('#admRun').onclick = () => checks(b).catch(fail);
    b.querySelectorAll('[data-fix]').forEach(x => x.onclick = async () => {
      x.disabled = true;
      try {
        if (x.dataset.fix === 'repair') { const d = await api('POST', 'admin/repair', {}); OW.toast(t('adm.repair.result', { b: d.broken, o: d.orphans, t: d.tmp })); }
        if (x.dataset.fix === 'emptyTrash') { const d = await api('POST', 'admin/trash/empty', { olderThanDays: 30 }); OW.toast(t('adm.trash.removed', { n: d.removed })); OW.refresh && OW.refresh(); }
        if (x.dataset.fix === 'backup') { const d = await api('POST', 'admin/backups', {}); OW.toast(t('adm.backups.created', { n: d.files })); }
        await checks(b);
      } catch (e) { fail(e); x.disabled = false; }
    });
  }
  const order = l => ({ fail: 0, warn: 1, info: 2, ok: 3 }[l]);

  /* ----- users ----- */
  async function users(b) {
    const r = await api('GET', 'admin/users');
    if (r.readOnly) { b.innerHTML = `<div class="card set"><h2>${I('users', 20)}${t('adm.tab.users')}</h2><p class="muted">${t('adm.users.desktop')}</p></div>`; return; }
    const me = (OW.me && OW.me.name || '').toLowerCase();
    const opt = (cur, dis) => `<select class="inp adm-sel" ${dis ? 'disabled' : ''}>${r.roles.map(x => `<option value="${x}" ${x === cur ? 'selected' : ''}>${roleName(x)}</option>`).join('')}</select>`;
    b.innerHTML = `
      <div class="set-grid adm-grid">
        <div class="card set wide">
          <h2>${I('users', 20)}${t('adm.tab.users')}</h2>
          ${r.users.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${t('adm.users.name')}</th><th>${t('adm.users.role')}</th><th>${t('adm.users.state')}</th><th>${t('adm.users.lastLogin')}</th><th></th></tr></thead><tbody>
          ${r.users.map(u => { const env = u.source === 'env', self = u.name.toLowerCase() === me; return `<tr data-u="${E(u.name)}" class="${u.disabled ? 'off' : ''}">
            <td><b>${E(u.name)}</b>${self ? ` <span class="adm-pill info">${t('adm.users.you')}</span>` : ''}${env ? `<br><small class="muted">${t('adm.users.env')}</small>` : ''}</td>
            <td>${opt(u.role, env)}</td>
            <td><span class="adm-dot ${u.disabled ? '' : 'ok'}"></span>${u.disabled ? t('adm.users.disabled') : t('adm.users.active')}</td>
            <td class="muted">${env ? '–' : (u.lastLogin ? ago(u.lastLogin) : t('adm.never'))}</td>
            <td class="adm-act">${env ? '' : `<button class="icon-btn sm" data-act="pw" title="${t('adm.users.setPassword')}">${I('lock', 16)}</button><button class="icon-btn sm" data-act="toggle" title="${u.disabled ? t('adm.users.enable') : t('adm.users.disable')}">${I(u.disabled ? 'restore' : 'pause', 16)}</button>${self ? '' : `<button class="icon-btn sm danger" data-act="rm" title="${t('adm.users.remove')}">${I('trash', 16)}</button>`}`}</td></tr>`; }).join('')}
          </tbody></table></div>` : `<p class="muted">${t('adm.users.none')}</p>`}
        </div>
        <form class="card set" id="admAdd" autocomplete="off">
          <h2>${I('plus', 20)}${t('adm.users.add')}</h2>
          ${r.users.length ? '' : `<p class="adm-note">${t('adm.users.firstHint')}</p>`}
          <label>${t('adm.users.name')}</label><input class="inp" name="name" required maxlength="64" pattern="[A-Za-z0-9._@\\-]+" autocomplete="off">
          <label>${t('adm.users.password')}</label><input class="inp" name="password" type="password" required minlength="${r.minPassword}" autocomplete="new-password" placeholder="${t('adm.users.passwordHint', { n: r.minPassword })}">
          <label>${t('adm.users.role')}</label>${opt(r.users.length ? 'editor' : 'admin').replace('class="inp adm-sel"', 'class="inp" name="role"')}
          <div class="btn-row"><button class="btn primary">${I('plus', 16)}<span>${t('adm.users.add')}</span></button></div>
        </form>
        <div class="card set">
          <h2>${I('lock', 20)}${t('adm.users.role')}</h2>
          <ul class="adm-roles">${r.roles.map(x => `<li><b>${roleName(x)}</b><span class="muted">${t('adm.role.' + x + '.d')}</span></li>`).join('')}</ul>
        </div>
      </div>`;
    const reload = () => users(b).catch(fail);
    b.querySelector('#admAdd').onsubmit = async e => { e.preventDefault(); const f = e.target; try { await api('POST', 'admin/users', { name: f.name.value.trim(), password: f.password.value, role: f.role.value }); OW.toast(t('adm.done')); if (!r.users.length) location.reload(); else reload(); } catch (x) { fail(x); } };
    b.querySelectorAll('tr[data-u]').forEach(tr => {
      const name = tr.dataset.u, u = r.users.find(x => x.name === name);
      const sel = tr.querySelector('select'); if (sel) sel.onchange = async () => { try { await api('PUT', 'admin/users/' + encodeURIComponent(name), { role: sel.value }); OW.toast(t('adm.done')); } catch (x) { fail(x); } reload(); };
      tr.querySelectorAll('[data-act]').forEach(btn => btn.onclick = async () => {
        const a = btn.dataset.act;
        try {
          if (a === 'pw') { const pw = await askPassword(name, r.minPassword); if (!pw) return; await api('PUT', 'admin/users/' + encodeURIComponent(name), { password: pw }); }
          if (a === 'toggle') await api('PUT', 'admin/users/' + encodeURIComponent(name), { disabled: !u.disabled });
          if (a === 'rm') { if (!(await OW.confirm(t('adm.users.confirmRemove', { n: E(name) })))) return; await api('DELETE', 'admin/users/' + encodeURIComponent(name)); }
          OW.toast(t('adm.done')); reload();
        } catch (x) { fail(x); }
      });
    });
  }
  const askPassword = (name, min) => OW.modal(`<form class="dlg" autocomplete="off"><h3>${t('adm.users.setPassword')} · ${E(name)}</h3>
      <input class="inp" type="password" name="pw" minlength="${min}" required autocomplete="new-password" placeholder="${t('adm.users.passwordHint', { n: min })}">
      <div class="dlg-btns"><button type="button" class="btn ghost" data-x>${t('cancel')}</button><button class="btn primary">${t('ok')}</button></div></form>`, (c, close) => {
    const f = c.querySelector('form'); f.pw.focus(); c.querySelector('[data-x]').onclick = () => close(null); f.onsubmit = e => { e.preventDefault(); close(f.pw.value); };
  });

  /* ----- sharing ----- */
  let shState = { q: '', owner: '', only: false };
  async function sharing(b) {
    const [o, dir] = await Promise.all([api('GET', 'admin/shares'), api('GET', 'directory')]);
    if (!o.auth) { b.innerHTML = `<div class="card set"><h2>${I('share', 20)}${t('adm.tab.sharing')}</h2><p class="muted">${t('adm.sh.noAuth')}</p></div>`; return; }
    const users = dir.users, unowned = o.files.filter(f => !f.owner && f.type !== 'folder').length;
    const reload = () => sharing(b).catch(fail);
    b.innerHTML = `
      ${unowned ? `<div class="adm-note adm-toolbar"><span>${t('adm.sh.unowned', { n: unowned })}</span><button class="btn sm" id="shAssign">${t('adm.sh.assign')}</button></div>` : ''}
      <div class="set-grid adm-grid">
        <div class="card set wide">
          <h2>${I('users', 20)}${t('adm.sh.people')}</h2>
          <div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${t('adm.sess.user')}</th><th>${t('adm.sh.owned')}</th><th>${t('adm.sh.out')}</th><th>${t('adm.sh.in')}</th><th></th></tr></thead><tbody>
          ${o.people.map(p => `<tr data-p="${E(p.name)}"><td><b>${E(p.name)}</b>${p.exists ? '' : ` <span class="adm-pill fail">${t('adm.sh.missing')}</span>`}</td><td>${p.owned}</td><td>${p.sharedOut}</td><td>${p.sharedIn}</td>
            <td class="adm-act">${p.owned ? `<button class="btn sm" data-act="transfer">${t('adm.sh.transferAll', { n: E(p.name) })}</button>` : ''}${p.sharedIn ? ` <button class="btn sm" data-act="revoke">${t('adm.sh.revoke', { n: E(p.name) })}</button>` : ''}</td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div class="card set wide">
          <h2>${I('share', 20)}${t('adm.sh.files')}</h2>
          <div class="adm-toolbar">
            <label class="mini-search">${I('search', 16)}<input id="shQ" value="${E(shState.q)}" placeholder="${t('adm.sh.search')}"></label>
            <select class="inp adm-sel" id="shOwner"><option value="">${t('adm.sh.allOwners')}</option><option value="-" ${shState.owner === '-' ? 'selected' : ''}>${t('adm.sh.team')}</option>${o.people.filter(p => p.owned).map(p => `<option value="${E(p.name)}" ${shState.owner === p.name ? 'selected' : ''}>${E(p.name)}</option>`).join('')}</select>
            <label class="adm-live"><input type="checkbox" id="shOnly" ${shState.only ? 'checked' : ''}><span>${t('adm.sh.onlyShared')}</span></label>
            <a class="btn sm" href="#/admin?tab=logs" id="shLog">${I('list', 16)}<span>${t('adm.sh.showLog')}</span></a>
          </div>
          <div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${t('adm.users.name')}</th><th>${t('adm.sh.owner')}</th><th>${t('adm.sh.with')}</th><th>${t('adm.logs.time')}</th><th></th></tr></thead><tbody id="shRows"></tbody></table></div>
          <p class="muted small">${t('adm.sh.logHint')}</p>
        </div>
      </div>`;
    const rows = b.querySelector('#shRows');
    const draw = () => {
      const q = shState.q.toLowerCase();
      const list = o.files.filter(f => f.type !== 'folder' && (!q || String(f.name || '').toLowerCase().includes(q)) && (!shState.owner || (shState.owner === '-' ? !f.owner : f.owner === shState.owner)) && (!shState.only || f.shared || f.shares.length)).slice(0, 500);
      rows.innerHTML = list.map(f => `<tr data-f="${E(f.id)}" class="${f.trashed ? 'off' : ''}">
        <td>${OW.TYPES[f.type] ? OW.appGlyph(f.type, 20) : ''} <b>${E(f.name || f.id)}</b>${f.trashed ? ` <span class="adm-pill">${t('nav.trash')}</span>` : ''}</td>
        <td>${f.owner ? `${E(f.owner)}${f.ownerMissing ? ` <span class="adm-pill fail">${t('adm.sh.missing')}</span>` : ''}` : `<span class="muted">${t('adm.sh.team')}</span>`}</td>
        <td><div class="adm-chips">${f.shared ? `<span class="adm-pill info">${I('globe', 12)} ${t('share.everyone')} · ${t(f.sharedPerm === 'view' ? 'share.canView' : 'share.canEdit')}</span>` : ''}${f.shares.map(s => `<span class="adm-pill ${s.missing ? 'fail' : s.perm === 'edit' ? 'warn' : ''}" title="${s.by ? E(s.by) + ' · ' + when(s.at) : ''}">${E(s.user)} · ${t(s.perm === 'edit' ? 'share.canEdit' : 'share.canView')}</span>`).join('')}${!f.shared && !f.shares.length ? '<span class="muted">–</span>' : ''}</div></td>
        <td class="muted">${when(f.modified)}</td>
        <td class="adm-act"><button class="icon-btn sm" data-act="share" title="${t('adm.sh.edit')}">${I('share', 16)}</button><button class="icon-btn sm" data-act="owner" title="${t('adm.sh.transfer')}">${I('user', 16)}</button></td></tr>`).join('') || `<tr><td colspan="5" class="muted">${t('adm.logs.none')}</td></tr>`;
      rows.querySelectorAll('tr[data-f]').forEach(tr => {
        const f = o.files.find(x => x.id === tr.dataset.f);
        tr.querySelector('[data-act="share"]').onclick = () => OW.shareDialog(f, { admin: true }).then(r => r && reload());
        tr.querySelector('[data-act="owner"]').onclick = () => pickUser(t('adm.sh.transferTitle', { n: E(f.name) }), users.filter(u => u.name !== f.owner)).then(n => n && api('POST', 'admin/owner', { ids: [f.id], owner: n }).then(() => { OW.toast(t('adm.done')); reload(); }, fail));
      });
    };
    draw();
    let deb; b.querySelector('#shQ').oninput = e => { clearTimeout(deb); deb = setTimeout(() => { shState.q = e.target.value.trim(); draw(); }, 200); };
    b.querySelector('#shOwner').onchange = e => { shState.owner = e.target.value; draw(); };
    b.querySelector('#shOnly').onchange = e => { shState.only = e.target.checked; draw(); };
    b.querySelector('#shLog').onclick = e => { e.preventDefault(); logState.cat = 'sharing'; logState.q = ''; logState.level = ''; tab = 'logs'; history.replaceState(null, '', '#/admin?tab=logs'); OW.renderAdmin(root); };
    const as = b.querySelector('#shAssign'); if (as) as.onclick = () => pickUser(t('adm.sh.assign'), users).then(n => n && api('POST', 'admin/owner', { unowned: true, owner: n }).then(r => { OW.toast(t('adm.sh.changed', { n: r.changed })); reload(); }, fail));
    b.querySelectorAll('tr[data-p]').forEach(tr => {
      const name = tr.dataset.p, tb = tr.querySelector('[data-act="transfer"]'), rb = tr.querySelector('[data-act="revoke"]');
      if (tb) tb.onclick = () => pickUser(t('adm.sh.transferAll', { n: E(name) }), users.filter(u => u.name !== name)).then(n => n && api('POST', 'admin/owner', { from: name, owner: n }).then(r => { OW.toast(t('adm.sh.changed', { n: r.changed })); reload(); }, fail));
      if (rb) rb.onclick = () => OW.confirm(t('adm.sh.revokeConfirm', { n: E(name) })).then(ok => ok && api('POST', 'admin/shares/revoke', { user: name }).then(r => { OW.toast(t('adm.sh.changed', { n: r.changed })); reload(); }, fail));
    });
  }

  /* ----- maintenance ----- */
  async function maint(b) {
    const [bk, st] = await Promise.all([api('GET', 'admin/backups'), api('GET', 'admin/status')]);
    const L = st.library;
    b.innerHTML = `
      <div class="set-grid adm-grid">
        <div class="card set wide">
          <h2>${I('save', 20)}${t('adm.backups')}</h2>
          <p class="muted">${t('adm.backups.text')} ${t('adm.autoBackup')}: <b>${bk.hours > 0 ? t('adm.everyH', { n: bk.hours }) : t('adm.off')}</b>.</p>
          <div class="btn-row"><button class="btn primary" id="admBackup">${I('save', 16)}<span>${t('adm.backups.create')}</span></button>
            <label class="btn">${I('upload', 16)}<span>${t('adm.backups.upload')}</span><input type="file" id="admUpload" accept=".json,application/json" hidden></label></div>
          ${bk.backups.length ? `<div class="adm-table-wrap"><table class="adm-table"><tbody>${bk.backups.map(x => `<tr data-b="${E(x.name)}">
            <td><b class="adm-mono">${E(x.name)}</b>${x.auto ? ` <span class="adm-pill info">${t('adm.backups.auto')}</span>` : ''}${x.safety ? ` <span class="adm-pill warn">${t('adm.backups.safety')}</span>` : ''}</td>
            <td class="muted">${when(x.created)}</td><td class="muted">${size(x.size)}</td>
            <td class="adm-act"><a class="icon-btn sm" href="api/admin/backups/${encodeURIComponent(x.name)}" download title="${t('download')}">${I('download', 16)}</a><button class="icon-btn sm" data-act="restore" title="${t('adm.backups.restore')}">${I('restore', 16)}</button><button class="icon-btn sm danger" data-act="del" title="${t('delete')}">${I('trash', 16)}</button></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${t('adm.backups.none')}</p>`}
        </div>
        <div class="card set">
          <h2>${I('trash', 20)}${t('adm.trash.title')}</h2>
          <p class="muted">${t('adm.trash.text', { n: L.trashed, o: L.trashedOld })}</p>
          <div class="btn-row"><button class="btn" id="admTrashOld" ${L.trashedOld ? '' : 'disabled'}>${t('adm.trash.old')}</button><button class="btn danger" id="admTrashAll" ${L.trashed ? '' : 'disabled'}>${t('adm.trash.all')}</button></div>
        </div>
        <div class="card set">
          <h2>${I('wand', 20)}${t('adm.repair.title')}</h2>
          <p class="muted">${t('adm.repair.text')}</p>
          <div class="btn-row"><button class="btn" id="admRepair">${I('wand', 16)}<span>${t('adm.repair.run')}</span></button></div>
        </div>
        <div class="card set wide">
          <h2>${I('code', 20)}${t('adm.cli')}</h2>
          <p class="muted">${t('adm.cli.text')}</p>
          <pre class="adm-pre">node server/owctl.js doctor --fix
node server/owctl.js user add anna --role admin
node server/owctl.js backup
node server/owctl.js logs --level warn -n 100
node server/owctl.js help</pre>
        </div>
      </div>`;
    const reload = () => maint(b).catch(fail);
    const busy = async (btn, fn) => { btn.disabled = true; try { await fn(); } catch (e) { fail(e); } reload(); };
    b.querySelector('#admBackup').onclick = e => busy(e.currentTarget, async () => { const d = await api('POST', 'admin/backups', {}); OW.toast(t('adm.backups.created', { n: d.files })); });
    b.querySelector('#admUpload').onchange = e => { const f = e.target.files[0]; if (f) busy(e.target, async () => { const d = await api('POST', 'admin/backups/upload', undefined, f); restoreDialog(d.name, reload); }); };
    b.querySelector('#admTrashOld').onclick = e => OW.confirm(t('adm.trash.confirm', { n: L.trashedOld })).then(ok => ok && busy(e.target, async () => { const d = await api('POST', 'admin/trash/empty', { olderThanDays: 30 }); OW.toast(t('adm.trash.removed', { n: d.removed })); OW.refresh && OW.refresh(); }));
    b.querySelector('#admTrashAll').onclick = e => OW.confirm(t('adm.trash.confirm', { n: L.trashed })).then(ok => ok && busy(e.target, async () => { const d = await api('POST', 'admin/trash/empty', {}); OW.toast(t('adm.trash.removed', { n: d.removed })); OW.refresh && OW.refresh(); }));
    b.querySelector('#admRepair').onclick = e => busy(e.currentTarget, async () => { const d = await api('POST', 'admin/repair', {}); OW.toast(t('adm.repair.result', { b: d.broken, o: d.orphans, t: d.tmp })); });
    b.querySelectorAll('tr[data-b]').forEach(tr => {
      const name = tr.dataset.b;
      tr.querySelector('[data-act="restore"]').onclick = () => restoreDialog(name, reload);
      tr.querySelector('[data-act="del"]').onclick = () => OW.confirm(t('adm.backups.confirmDelete', { n: E(name) })).then(ok => ok && api('DELETE', 'admin/backups/' + encodeURIComponent(name)).then(reload, fail));
    });
  }
  const restoreDialog = (name, after) => OW.modal(`<form class="dlg"><h3>${t('adm.backups.restoreTitle', { n: E(name) })}</h3>
      <label class="adm-radio"><input type="radio" name="mode" value="merge" checked><span><b>${t('adm.backups.merge')}</b><small>${t('adm.backups.merge.d')}</small></span></label>
      <label class="adm-radio"><input type="radio" name="mode" value="replace"><span><b>${t('adm.backups.replace')}</b><small>${t('adm.backups.replace.d')}</small></span></label>
      <p class="muted small adm-inline">${I('save', 14)}<span>${t('adm.backups.safetyNote')}</span></p>
      <div class="dlg-btns"><button type="button" class="btn ghost" data-x>${t('cancel')}</button><button class="btn danger">${t('adm.backups.restore')}</button></div></form>`, (c, close) => {
    const f = c.querySelector('form'); c.querySelector('[data-x]').onclick = () => { close(null); after(); };
    f.onsubmit = async e => { e.preventDefault(); f.querySelector('.btn.danger').disabled = true;
      try { const d = await api('POST', `admin/backups/${encodeURIComponent(name)}/restore`, { mode: f.mode.value }); close(d); OW.toast(t('adm.backups.restored', { n: d.written })); OW.refresh && OW.refresh(); } catch (x) { close(null); fail(x); }
      after(); };
  });

  /* ----- logs ----- */
  async function logs(b) {
    const d = await api('GET', 'admin/logs/days');
    const today = new Date().toISOString().slice(0, 10);
    b.innerHTML = `
      <div class="adm-toolbar">
        <select class="inp adm-sel" id="lgDay"><option value="">${t('adm.logs.today')}</option>${d.days.filter(x => x.day !== today).map(x => `<option value="${x.day}" ${logState.day === x.day ? 'selected' : ''}>${x.day} · ${size(x.size)}</option>`).join('')}</select>
        <select class="inp adm-sel" id="lgCat">${['', 'sharing', 'access', 'admin', 'http', 'errors'].map(c => `<option value="${c}" ${logState.cat === c ? 'selected' : ''}>${t('adm.cat.' + (c || 'all'))}</option>`).join('')}</select>
        <select class="inp adm-sel" id="lgLevel">${[['', t('adm.logs.all')], ['debug', 'debug'], ['info', 'info'], ['warn', 'warn'], ['error', 'error']].map(([v, l]) => `<option value="${v}" ${logState.level === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <label class="mini-search">${I('search', 16)}<input id="lgQ" value="${E(logState.q)}" placeholder="${t('adm.logs.search')}"></label>
        <label class="adm-live"><input type="checkbox" id="lgLive" ${logState.live ? 'checked' : ''}><span>${t('adm.logs.live')}</span></label>
        <a class="btn sm" id="lgDl" href="#" download>${I('download', 16)}<span>${t('adm.logs.download')}</span></a>
      </div>
      ${d.enabled ? '' : `<p class="adm-note">${t('adm.logs.filesOff')}</p>`}
      <div class="card adm-logs"><div class="adm-table-wrap"><table class="adm-table adm-mono"><thead><tr><th>${t('adm.logs.time')}</th><th>${t('adm.logs.level')}</th><th>${t('adm.logs.event')}</th><th>${t('adm.logs.details')}</th></tr></thead><tbody id="lgRows"></tbody></table></div></div>`;
    const rows = b.querySelector('#lgRows'), dl = b.querySelector('#lgDl');
    const draw = async () => {
      const p = new URLSearchParams({ limit: '500' }); if (logState.level) p.set('level', logState.level); if (logState.cat) p.set('cat', logState.cat); if (logState.q) p.set('q', logState.q); if (logState.day) p.set('day', logState.day);
      const r = await api('GET', 'admin/logs?' + p);
      rows.innerHTML = r.entries.map(e => `<tr class="lv-${e.level}"><td>${logState.day ? when(e.t) : clock(e.t)}</td><td><span class="adm-lv ${e.level}">${e.level}</span></td><td><b>${E(e.ev)}</b></td><td class="adm-kv">${details(e)}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">${t('adm.logs.none')}</td></tr>`;
      dl.href = 'api/admin/logs/download?day=' + (logState.day || today); dl.hidden = !d.enabled;
    };
    const restart = () => { stop(); draw().catch(fail); if (logState.live && !logState.day) poll(draw, 3000); };
    b.querySelector('#lgDay').onchange = e => { logState.day = e.target.value; restart(); };
    b.querySelector('#lgLevel').onchange = e => { logState.level = e.target.value; restart(); };
    b.querySelector('#lgCat').onchange = e => { logState.cat = e.target.value; restart(); };
    let deb; b.querySelector('#lgQ').oninput = e => { clearTimeout(deb); deb = setTimeout(() => { logState.q = e.target.value.trim(); restart(); }, 300); };
    b.querySelector('#lgLive').onchange = e => { logState.live = e.target.checked; restart(); };
    restart();
  }

  /* one log line: http requests read like "GET /api/files → 200 · 3 ms · anna · 10.0.0.4", others as key value pairs */
  function details(e) {
    const { t: _t, level: _l, ev, ...rest } = e, ip = x => E(String(x || '').replace(/^::ffff:/, ''));
    if (ev === 'http') return `<span><b>${E(rest.m)}</b> ${E(rest.p)} → <b class="${rest.s >= 500 ? 'adm-red' : rest.s >= 400 ? 'adm-amber' : ''}">${rest.s}</b></span><span><i>${rest.ms} ms</i></span>${rest.u ? `<span>${E(rest.u)}</span>` : ''}<span><i>${ip(rest.ip)}</i></span>`;
    return Object.entries(rest).map(([k, v]) => `<span><i>${E(k)}</i> ${k === 'ip' ? ip(v) : E(typeof v === 'string' ? v : JSON.stringify(v))}</span>`).join('');
  }

  /* ----- sessions ----- */
  async function sessions(b) {
    const draw = async () => {
      const r = await api('GET', 'admin/sessions');
      b.innerHTML = `<div class="card set wide"><h2>${I('activity', 20)}${t('adm.tab.sessions')}</h2><p class="muted">${t('adm.sess.text')}</p>
        ${r.sessions.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${t('adm.sess.user')}</th><th>${t('adm.users.role')}</th><th>${t('adm.sess.ip')}</th><th>${t('adm.sess.client')}</th><th>${t('adm.sess.first')}</th><th>${t('adm.sess.last')}</th><th>${t('adm.sess.requests')}</th></tr></thead><tbody>
        ${r.sessions.map(s => `<tr><td><span class="adm-dot ${Date.now() - s.last < 300000 ? 'ok' : ''}"></span><b>${E(s.user)}</b></td><td>${roleName(s.role)}</td><td class="adm-mono">${E(String(s.ip || '').replace(/^::ffff:/, ''))}</td><td>${E(s.client)}</td><td class="muted">${when(s.first)}</td><td>${ago(s.last)}</td><td>${s.requests}</td></tr>`).join('')}
        </tbody></table></div>` : `<p class="muted">${t('adm.sess.none')}</p>`}</div>`;
    };
    await draw(); poll(draw, 15000);
  }
})();
