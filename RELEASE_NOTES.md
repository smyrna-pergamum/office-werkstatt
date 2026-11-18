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
