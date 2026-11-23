## Office Werkstatt 1.5.1

### Kolay sunucu kurulumu
- **Hazır Docker imajı:** her sürümde otomatik yayınlanır (`ghcr.io/smyrna-pergamum/office-werkstatt`, Intel/AMD ve ARM – Raspberry Pi, NAS). Kurulum tek komut: `docker run -d -p 8080:8080 -v office-werkstatt:/data ghcr.io/smyrna-pergamum/office-werkstatt`.
- **İlk açılışta kurulum sihirbazı:** ağda hesapsız başlatılan sunucu artık başlamayı reddetmez; tarayıcıda bir kurulum sayfası açar (5 dil). Konsolda (`docker logs`) ve `data/SETUP-CODE.txt` dosyasında gösterilen tek kullanımlık kurulum koduyla ilk yönetici oluşturulur. Kurulum bitene kadar başka hiçbir sayfa veya veri açılmaz. `OW_USER`/`OW_PASS` gerekmez.
- **İnternet için HTTPS hazır:** `deploy/docker-compose.https.yml` – `.env` dosyasına alan adını yazın, sertifikayı Caddy kendisi alır.
- `docker-compose.yml` artık hazır imajı ve adlandırılmış bir birim kullanır (klasör izni ayarı gerekmez).

## Office Werkstatt 1.5.0

### Yeni: Kontrol merkezi (sunucu yönetimi)
- **Kontrol merkezi** (kenar çubuğu, yalnızca yöneticiler; 5 dil): Genel bakış · Kontroller · Kullanıcılar · Bakım · Kayıtlar · Oturumlar.
- **Genel bakış:** sunucu durumu, çalışma süresi, belge sayısı, veri boyutu ve boş disk alanı, dakikadaki istek, son 24 saatin hata/uyarıları, etkin kullanıcılar, son yedek, yerleşik YZ motoru.
- **Kontroller (doctor):** Node sürümü, veri klasörü, disk, okunamayan belgeler, yarım kalan kayıtlar, sahipsiz form verileri, eski çöp, yedekler, giriş ve ağdan erişim, dosya izinleri, motorlar, dönüştürücü, bellek – tek tıkla onarım.
- **Kullanıcılar ve roller:** birden çok hesap (`data/users.json`, scrypt); **Yönetici**, **Düzenleyici**, **Görüntüleyici** (salt okunur). Ekle, rol değiştir, parola belirle, devre dışı bırak, sil; herkes kendi parolasını kullanıcı menüsünden değiştirebilir. `OW_USER/OW_PASS` çalışmaya devam eder (her zaman yönetici). 15 dakikada 10 hatalı girişten sonra adres bekletilir.
- **Bakım:** yedek oluştur / indir / yükle / geri yükle (*ekle ve üzerine yaz* veya *her şeyi değiştir*; önce her zaman güvenlik yedeği), otomatik yedek (`OW_BACKUP_HOURS`, varsayılan 24 saat), tüm kullanıcıların çöp kutusunu boşaltma, onarım (bozuk dosyalar `data/quarantine/` klasörüne taşınır, hiçbir şey silinmez).
- **Kayıtlar:** `data/logs/` içinde günlük dosyalar (`OW_LOG_DAYS`, varsayılan 14 gün); düzey filtresi, arama, canlı görünüm, gün indirme. Parolalar ve belge içerikleri asla kaydedilmez.
- **Kullanıcılar arası paylaşım:** hesaplar varken yeni belge onu oluşturanındır ve **özeldir**. Dosya menüsünde (ve düzenleyicideki *Paylaş* düğmesinde) *Kişilerle paylaş…*: kişi bazında *görüntüleyebilir* / *düzenleyebilir* ya da sunucudaki herkes. Paylaşılan belgeler "Paylaşılanlar" altında ("ali paylaştı") görünür; görüntüleme yetkisiyle salt okunur açılır; yalnızca sahibi paylaşabilir, taşıyabilir, çöpe atabilir, silebilir; herkes *Kendi kopyamı oluştur* diyebilir. Hesaplardan önceki belgelerin sahibi yoktur, yönetici sahip atayana kadar herkese görünür.
- **Kontrol merkezi › Paylaşımlar:** tüm belgeler sahibi ve paylaşıldığı kişilerle; kişi başına sahip olduğu / paylaştığı / aldığı belgeler. Her paylaşımı değiştirme, sahibi değiştirme, bir kişinin tüm belgelerini devretme, bir kişiyle tüm paylaşımları durdurma, sahipsiz belgelere sahip atama.
- **Kayıtlarda paylaşım:** paylaşım ve sahiplik değişiklikleri, belge oluşturma / yeniden adlandırma / silme ve başkasının belgesinin her açılışı ve düzenlenişi kaydedilir; kayıtlarda kategori filtresi (Dosyalar ve paylaşım, Girişler ve hesaplar, Yönetim, İstekler, Yalnızca sorunlar).
- **Oturumlar:** son 24 saatte kim, hangi adresten, hangi tarayıcıyla bağlandı.
- **Komut satırı:** `node server/owctl.js doctor | user | backup | restore | trash | repair | logs | status` – ör. ağda ilk yöneticiyi oluşturmak için `owctl.js user add anna --role admin`.
- **Güvenlik:** yönetici istekleri için CSRF koruması (`X-OW-Request` başlığı + aynı köken); `/api/health` izleme için girişsiz yanıt verir, Docker imajında `HEALTHCHECK`.

## Office Werkstatt 1.4.0

### Yeni: AI Werkzeug (KI / YZ)
- **Yerleşik yapay zekâ motoru** (llama.cpp): Ollama gerekmez. Ayarlar › Yapay zeka › Yerleşik: model listesi (Qwen 2.5 1.5B / 7B / 14B, Llama 3.2 3B) tek tıkla indirilir; motor mümkünse ekran kartını, değilse işlemciyi kullanır, ilk soruda kendiliğinden başlar.
- **Yerleşik yapay zekâ:** bu bilgisayardaki **Ollama** ile (ücretsiz, gizli, internetsiz çalışır) ya da **OpenAI standardındaki herhangi bir API** ile (OpenAI, OpenRouter, Mistral, Groq, LM Studio …). Ayarlar › Yapay zeka: adres, API anahtarı, model; Ollama modelleri doğrudan buradan indirilebilir.
- **Her Werkzeug'da YZ düğmesi** (üst çubuk): yanda sohbet paneli açılır – **Sohbet** ve **Ajan** sekmeleri, model seçimi, dosya/belge ekleme, sesli giriş.
- **Ajan modu:** yapay zekâ açık belgede doğrudan çalışır ve yazar:
  - Word: içerik yazar/değiştirir, stil uygular, tüm şerit komutlarını kullanabilir
  - Excel: hücre okur/yazar, formül girer, şerit komutları
  - Slide: slayt ekler, metinleri değiştirir, şerit komutları
  - Note: sayfa okur/yazar, yeni sayfa açar · Draw: yapışkan notlar, not kartları, zihin haritası · Design: metin, arka plan, sayfa · Formular: başlık, açıklama, sorular
- **İnternet araştırması:** web araması ve sayfa okuma, sonuçlar kaynak bağlantılarıyla (yerel ağ adresleri engellenir).
- **Kitaplık:** dosyaları listeleyip okuyabilir, yeni Word / Excel / Slide / Note / Formular belgeleri oluşturabilir.
- **AI Werkzeug** (ana sayfadaki yeni kart): tam sayfa sohbet; her sohbet kitaplıkta bir belge olarak saklanır.

### Slide: OpenDocument biçimleri (yerleşik)
- **.odp, .otp, .fodp, .odg** olarak kaydetme ve açma – ek program gerekmez (metin, biçimlendirme, madde işaretleri, şekiller, döndürme, resimler, çizgiler, tablolar, arka planlar).
- Slide şablonları Slide Werkzeug Pro'da artık içerikleriyle açılır (önceden boş açılıyordu).
- Bilgisayarda LibreOffice kuruluysa ayrıca .ppt / .pps / .pot / .uop ile Excel .xls / .ods ve Word .doc da kaydedilebilir.

### Diğer
- **Slide / Excel:** motorun kendi *Dosya › Farklı Kaydet* sayfası yerine Office Werkstatt'ın Farklı Kaydet penceresi açılır – "Kaydet" ile aynı tüm biçimler; *.deckcraft artık görünmez.
- **PDF Werkstatt:** arayüz Fransızca ve İspanyolca da kullanılabilir.
- **Slide Werkzeug Pro:** arayüz artık Türkçe, Almanca, Fransızca ve İspanyolca (önceden yalnızca İngilizce).
- **YZ Ajanı – Agent Bridge (V1–V4 tasarımı):** Sohbet/Ajan ayrımı kaldırıldı, panel tek bir ajandır. Ajan belgeyi, kitaplığı ve interneti kendisi okur; değişiklikleri bir **plan** olarak hazırlar (yalnızca izin verilen araçlar, parametreler şemaya göre denetlenir, `$result:N` ile önceki adımların sonuçları kullanılır). Plan önizlenir ve onaylanınca **tek işlem** olarak uygulanır: bir adım başarısız olursa her şey geri alınır, önizlemeden sonra belge elle değiştirildiyse uygulanmaz, bitmiş bir plan tek tıkla geri alınır. Ayarlar'dan önizleme kapatılabilir. Başvuru paketi depoda `agent-bridge/` klasöründe.
- **İnternet araştırması:** ajan gerektiğinde kendiliğinden arar ve sayfaları okur (varsayılan olarak açık). Arama artık birden çok motorla çalışır (Bing, DuckDuckGo, Wikipedia; isteğe bağlı kendi SearXNG sunucunuz) – biri yanıt vermezse sıradaki denenir.

## Office Werkstatt 1.3.3

### Değişiklikler
- **Word / Excel:** "Otomatik Kaydet" düğmesi gizlendi; Office Werkstatt her zaman kendisi kaydeder (düzenlemeden kısa süre sonra ve kapatırken).
- **Dil seçimi:** üst çubukta tek düğme (🌐 + geçerli dil); tıklayınca tüm diller açılır.
- **Slide:** motorun kendi Kaydet / Farklı Kaydet düğmesi artık ".deckcraft" indirmez; Office Werkstatt'ın Farklı Kaydet penceresi açılır (.werkzeug ve tüm PowerPoint biçimleri, PDF, PNG, JPEG …).

### Düzeltmeler
- Ana sayfa: araç kartlarındaki yazılar (Form, Draw, PDF, Note …) dar pencerelerde artık resimlerin altında kalmaz.

## Office Werkstatt 1.3.2

### Yenilikler
- **Dosyalarım'da klasörler:** yeni klasör, iç içe klasörler, yol çubuğu, sürükle-bırak ve "Klasöre taşı…" ile taşıma, yeniden adlandırma, silme (içerik bir üst klasöre geçer).
- **Word / Excel / Slide:** üst çubukta diğer Werkzeug'lar gibi arama (Alt + M); motorun kendi komutlarını bulur ve çalıştırır. Word'ün kendi arama kutusu kaldırıldı (tek arama).

### Düzeltmeler
- Tek tema düğmesi: Excel ve Slide motorlarının kendi açık/koyu düğmesi kaldırıldı; Office Werkstatt'ın düğmesi motorları da değiştirir.
- Slide / Excel temaya artık doğru uyar (önceden ters dönebiliyordu).

## Office Werkstatt 1.3.1

### Düzeltmeler
- Word / Excel / Slide: üst çubuk artık diğer Werkzeug'larla aynı düzende (dil, tema ve kullanıcı sağda).

## Office Werkstatt 1.3.0

### Draw Werkzeug – not ve beyin fırtınası panosu
- Sonsuz tuval: not kartları (zengin metin), yapışkan notlar, metin, şekiller, öğelere yapışan bağlantılar, kalem/vurgulayıcı,
  çerçeveler, resimler ve **zihin haritası** (Tab = alt konu, Enter = sonraki konu).
- Klasik Office şeridi (Giriş · Ekle · Çiz · Görünüm · Yardım), seçimin üstünde mini biçim çubuğu.
- Şablonlar: beyin fırtınası, zihin haritası, kanban, retrospektif, SWOT, akış şeması. PNG / SVG / .excalidraw dışa aktarma.
- Eski çizimler ve `.excalidraw` dosyaları otomatik dönüştürülür.

### Word / Excel / Slide Werkzeug Pro
- **Farklı Kaydet** (Ctrl+Shift+S ve motorun kendi Farklı Kaydet / Dışa Aktar sayfaları) motorun yazabildiği **tüm biçimleri** listeler:
  - Word: DOCX, DOCM, DOTX, DOTM, DOC (RTF), ODT, OTT, FODT, RTF, Word XML, Word 2003 XML, PDF, HTML, Markdown, LaTeX, TXT, PNG
  - Excel: XLSX, XLSM, XLTX, XLTM, CSV, TSV, TXT, JSON, HTML, PDF
  - Slide: PPTX, PPTM, PPSX, PPSM, POTX, POTM, PDF, PNG, JPEG (çok slaytta ZIP), RTF / TXT ana hat, `.werkzeug`
- Slide'ın kendi biçimi artık **`.werkzeug`** adıyla görünür (eski adı `.deckcraft`).
- **Eski ve diğer biçimler açılır:** `.doc`, `.xls`, `.ppt` (PPT: slayt metinleri aktarılır), DOCM, DOTX, ODT, RTF, Markdown, XLSM, XLSB, ODS, CSV, PPSX, POTX …
- Belgeler motorların komut API'siyle açılır ve kaydedilir; Ctrl+S doğrudan kitaplığa kaydeder.
- Word / Excel / Slide, Office Werkstatt'ın **açık / koyu temasına** uyar.
- Word: “Geliştirici” sekmesi yerine **“Gelişmiş”**; Zotero / atıf araçları bu sekmenin altında.
- Yardım menüsünde **Güncellemeleri denetle** → GitHub Releases (tüm yerleşik Werkzeug'larda).

### Yeni araçlar
- **Design Werkzeug** – Canva tarzı tasarım stüdyosu (şablonlar, marka kiti, QR kod, stok medya, baskı PDF'i, video).
- **Formular Werkzeug** – sürükle-bırak form oluşturucu, yayınlama + QR kod, yanıtlar → Excel.

## Office Werkstatt 1.2.0

### Yazdırma ve kapatma (masaüstü)
- **Yazdırma artık çalışıyor ve önizleme var.** `window.print()` masaüstü uygulamasını tamamen donduruyordu (Windows 11 yazdırma
  penceresi açılmıyor, uygulama kapatılamıyordu). Artık Office Werkstatt'ın kendi **yazdırma önizlemesi** açılır: gerçek sayfalar,
  yazıcı, kopya, sayfa aralığı, yön, kâğıt boyutu, renk, *PDF olarak kaydet*. Word/Excel/Slide Pro ve PDF Werkstatt da bunu kullanır.
- **Kapatma:** Kaydedilmemiş bir PDF varken pencere sessizce açık kalıyordu; artık “Kaydedilmemiş değişiklikler – yine de kapat?” sorulur.
  Takılan bir sayfa veya yazdırma işi uygulamanın kapanmasını engellemez.
- Kapanışta görülen *“Cannot write headers after they are sent”* hatası giderildi.

### Güvenlik
- Sunucu varsayılan olarak yalnızca `127.0.0.1` adresinde dinler; ağda **giriş zorunlu** (aksi hâlde başlamaz). DNS-rebinding koruması.
- Belgelerdeki HTML (içe aktarma, `.owdoc`, paylaşılan sunucu) her gösterimde temizlenir — betik/olay işleyici çalışmaz.
- Kayıt hataları (401, 413, 500 …) artık fark edilir: değişiklikler korunur, yeniden denenir, kapatmadan önce uyarılır.
- Statik dosya yolları ayraç duyarlı ve gerçek yol üzerinden denetlenir.

### Düzenleyiciler
- **Word / Excel / Slide** doğrudan **Werkzeug Pro** motorunda açılır; ayrı “basit görünüm” ve Pro düğmesi kaldırıldı.
  Belgeler motorun kendi biçiminde (`.docx` / `.xlsx` / `.pptx`) kitaplıkta saklanır, içe aktarılan dosyalar kayıpsız korunur.
- **PDF Werkzeug:** çift menüler kaldırıldı (tek menü: PDF Werkstatt).
- **Note Werkzeug:** SilverBullet kaldırıldı; OneNote tarzı görünüme **takvim** eklendi (ay görünümü, yaklaşanlar,
  etkinlikten toplantı notu, `.ics` içe/dışa aktarma).
- **Draw Werkzeug:** Excalidraw düğmesi kaldırıldı.
- Dil değiştirirken ana sayfaya dönülmez; dil menüsündeki boşluklar kaldırıldı.
- `.xlsx` dışa aktarma tüm sayfaları ve stil bölümünü içerir.

## Office Werkstatt 1.1.1

### Düzeltmeler
- **PDF Werkzeug artık anında açılıyor.** PDF Werkstatt motoru 67 MB'lık tek bir HTML dosyasıydı; MuPDF, OCR dilleri ve 32 yazı tipi
  arayüzden *önce* yükleniyordu. Bu veriler ayrı dosyalara taşındı (`public/engines/pdf/fonts-extra.js`, `public/engines/pdf/assets/`)
  ve yalnızca gerektiğinde yükleniyor: sayfa 67 MB → 3,8 MB, menü ~1,4 sn yerine ~0,2 sn'de görünüyor.
- Açılan PDF, motor hazır olur olmaz aktarılıyor (sabit 400 ms bekleme ve yazı tiplerinin yüklenmesini bekleme kaldırıldı).
- Service worker, büyük motor dosyalarını her açılışta arka planda yeniden indirmiyor; eski 67 MB'lık önbellek siliniyor.
- `/api/health` doğru sürümü bildiriyor.
- `scripts/fetch-engines.js` PDF motorunu indirdikten sonra otomatik olarak böler (`scripts/split-pdf-engine.js`).

## Office Werkstatt 1.1.0

**Windows kurulum dosyası – internetsiz kurulur** (yönetici hakkı gerekmez, 5 dilli kurulum sihirbazı).

### Yenilikler
- Tam motorlar yerleşik: **Word / Excel / Slide Werkzeug Pro**, **SilverBullet** (Note), **Excalidraw** (Draw), **PDF Werkstatt** (kırmızı sürüm)
- Dil seçimi editör menülerini ve motorları da değiştirir (TR · DE · EN · ES · FR)
- Sunumlar `.pptx` olarak dışa aktarılabilir
- *Eigene App* Ayarlar'a taşındı
- *Diktieren* butonunun yanında “internet gerekir” uyarısı
- `.docx .xlsx .pptx .pdf .csv .md .excalidraw` için “Birlikte aç” kaydı

### Kurulum
`Office-Werkstatt-Setup-1.1.0.exe` dosyasını indirip çalıştırın. Belgeler `%APPDATA%\Office Werkstatt` içinde saklanır.
