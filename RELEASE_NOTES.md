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
