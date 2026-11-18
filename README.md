<p align="center">
  <img src="public/assets/logo.svg" width="112" alt="Office Werkstatt">
</p>

<h1 align="center">Office Werkstatt</h1>

<p align="center">
  <b>Bütünleşik, internetsiz çalışan ofis paketi</b> – tarayıcıda, masaüstünde ve kendi sunucunuzda.<br>
  Word · Excel · Slide · Note · Draw · PDF Werkzeug — tek pencerede.
</p>

<p align="center">
  <a href="https://github.com/smyrna-pergamum/office-werkstatt/releases/latest"><b>⬇ Windows kurulum dosyası (çevrimdışı)</b></a>
  &nbsp;·&nbsp; <a href="#hızlı-başlangıç">Hızlı başlangıç</a>
  &nbsp;·&nbsp; <a href="#özellikler">Özellikler</a>
  &nbsp;·&nbsp; <a href="#english">English</a>
  &nbsp;·&nbsp; <a href="#deutsch">Deutsch</a>
</p>

<p align="center">
  <img alt="Offline" src="https://img.shields.io/badge/çalışır-internetsiz-6B5CF0?style=flat-square">
  <img alt="Diller" src="https://img.shields.io/badge/diller-TR%20·%20DE%20·%20EN%20·%20ES%20·%20FR-2F6BEA?style=flat-square">
  <img alt="Platformlar" src="https://img.shields.io/badge/platform-Web%20·%20Windows%20·%20Linux%20·%20macOS%20·%20Sunucu-1E9E5A?style=flat-square">
  <img alt="Lisans" src="https://img.shields.io/badge/lisans-MIT-555?style=flat-square">
</p>

![Office Werkstatt ana sayfa](docs/dashboard.png)

## Özellikler

| Araç | Düzenleyici |
|---|---|
| **Word Werkzeug** | **Word Werkzeug Pro** (tam motor) — belgeler `.docx` olarak kitaplıkta saklanır |
| **Excel Werkzeug** | **Excel Werkzeug Pro** (tam motor) — `.xlsx`, çoklu sayfa, formüller |
| **Slide Werkzeug** | **Slide Werkzeug Pro** (tam motor) — `.pptx` içe aktarma, sunum |
| **Note Werkzeug** | OneNote tarzı: defter → bölüm → sayfa, etiketler, kalem/mürekkep, toplantı şablonu, **takvim** (ay görünümü, etkinlik ↔ sayfa bağlantısı, `.ics` içe/dışa aktarma) |
| **Draw Werkzeug** | El çizimi tarzı beyaz tahta, şekiller, oklar, metin, `.excalidraw` içe/dışa aktarma, PNG / SVG |
| **PDF Werkzeug** | **PDF Werkstatt** (kırmızı sürüm): düzenleme, OCR, imzalama, koruma, dönüştürme |

Pro motorlar kurulu olduğunda Word / Excel / Slide doğrudan bu motorlarda açılır (ayrı bir “basit görünüm” yoktur).
Motorun Kaydet komutu (Ctrl+S) belgeyi Office Werkstatt kitaplığına yazar; kapatırken, dil değişirken ve düzenlemeye ara
verildiğinde otomatik kaydedilir. Motor yoksa yerleşik düzenleyiciler kullanılır.

- **Office tarzı arayüz:** başlık çubuğu, sekmeler (Datei / Start / Einfügen …), şerit, Kommentare, Aufholen, Bearbeiten / Anzeigen, Teilen, Datei arka planı, otomatik kayıt, Alt+M komut araması.
- **Ana sayfa:** karşılama alanı, oluşturma butonları, son dosyalar, hızlı başlangıç, sürükle-bırak yükleme, Ctrl+K arama.
- **Kitaplık:** Dosyalarım, şablon galerisi, Paylaşılanlar, Favoriler, Çöp kutusu (geri yükleme), yedekleme / geri yükleme.
- **5 dil:** Türkçe, Deutsch, English, Español, Français — dil seçimi editör menülerini ve tam motorları da değiştirir.
- **Açık / koyu tema**, responsive tasarım (masaüstü, tablet, mobil).
- **Eigene App:** kendi web uygulamanızı *Ayarlar → Eigene App* altına ekleyin.
- **Tamamen çevrimdışı:** hiçbir CDN veya harici istek yok. Yalnızca *Diktieren* (sesle yazdırma) tarayıcının çevrimiçi hizmetini kullanır; butonun yanında uyarı vardır.

<table>
<tr><td><img src="docs/excel-werkzeug-pro.png" alt="Excel Werkzeug Pro"></td><td><img src="docs/pdf-werkzeug.png" alt="PDF Werkzeug"></td></tr>
<tr><td><img src="docs/draw-werkzeug.png" alt="Draw Werkzeug"></td><td><img src="docs/note-werkzeug.png" alt="Note Werkzeug"></td></tr>
<tr><td><img src="docs/slide-werkzeug.png" alt="Slide Werkzeug"></td><td><img src="docs/dashboard-dark.png" alt="Koyu tema"></td></tr>
</table>

## Hızlı başlangıç

### 1 · Windows masaüstü uygulaması
[Releases](https://github.com/smyrna-pergamum/office-werkstatt/releases/latest) sayfasından `Office-Werkstatt-Setup-<sürüm>.exe` dosyasını indirip çalıştırın.
Kurulum **internet ve yönetici hakkı gerektirmez**; masaüstü kısayolu, başlat menüsü kaydı ve
`.docx .xlsx .pptx .pdf .csv .md .excalidraw` için “Birlikte aç → Office Werkstatt” ekler. Belgeler `%APPDATA%\Office Werkstatt` içinde saklanır.

### 2 · Sunucu (ekip / intranet) — Node.js 18+, bağımlılık yok
```bash
node server/server.js                 # http://localhost:8080 — yalnızca bu bilgisayar (127.0.0.1)
# Windows: start-windows.bat   ·   Linux/macOS: ./start.sh
HOST=0.0.0.0 OW_USER=ekip OW_PASS=gizli node server/server.js      # ağda paylaşım: giriş zorunlu
OW_USER=ekip OW_PASS=gizli docker compose up -d                     # veriler ./data içinde
```
**Güvenlik:** Sunucu varsayılan olarak yalnızca `127.0.0.1` adresinde dinler. Ağ adresinde (`HOST=0.0.0.0` vb.) `OW_USER` / `OW_PASS`
olmadan **başlamaz** — aksi hâlde ağdaki herkes tüm belgeleri okuyup değiştirebilirdi. Ağda mutlaka bir HTTPS ters vekil
(Caddy, nginx, Traefik) arkasında çalıştırın; temel kimlik doğrulama şifreyi açık metin gönderir. Yerel modda başka sitelerin
`127.0.0.1`'e yönlendirilmiş alan adlarıyla (DNS rebinding) erişimi engellenir. Belgelerdeki HTML her gösterimde temizlenir
(betik, olay işleyici, `javascript:` bağlantısı çalışmaz).
Sunucu modunda herkes aynı dosyaları görür.
Tarayıcıda adres çubuğundaki **Yükle** simgesiyle uygulama olarak (PWA) kurulabilir.

### 3 · Kurulumsuz
`public/index.html` dosyasına çift tıklayın — belgeler tarayıcıda (IndexedDB) saklanır.

## Derleme

```bash
cd desktop && npm install
npm start                 # geliştirme
npm run dist:win          # → dist/Office-Werkstatt-Setup-<sürüm>.exe (yerel NSIS, Wine gerekmez)
npm run dist:linux        # AppImage    ·    npm run dist:mac → .dmg
```

Tam motorlar `public/engines/` içinde derlenmiş olarak gelir. Yeniden derlemek için (Rust ≥ 1.95, `wasm32-unknown-unknown`, `wasm-bindgen-cli 0.2.129`):
```bash
node scripts/fetch-engines.js            # tüm motorlar
node scripts/fetch-engines.js word pdf   # yalnızca seçilenler
```

## Klasör yapısı
```
public/              web uygulaması (index.html, css/, js/, assets/, manifest, service worker)
  js/editors/        word · excel · slide · note · draw · pdf
  js/zip.js          OOXML motoru (.docx/.xlsx/.pptx okuma, .docx/.xlsx/.pptx yazma)
  js/i18n.js         5 dilli sözlük
  js/editors/pro.js  Word/Excel/Slide Werkzeug Pro köprüsü (açma, kaydetme, otomatik kayıt)
  js/sanitize.js     HTML temizleyici (belge içeriği)
  js/desktop.js      masaüstü: yazdırma yönlendirmesi
  engines/           tam motorlar + engines.js + apps.js (Eigene App)
server/server.js     bağımlılıksız Node sunucusu + REST API (/api/files, /api/engines)
desktop/             Electron kabuğu, yazdırma önizlemesi, çevrimdışı NSIS kurulum betiği
scripts/             motor kurulum / derleme betikleri
```

---

## English
**Office Werkstatt** is an integrated, fully offline office suite for the browser, the desktop (Windows/macOS/Linux) and your own server:
Word, Excel, Slide, Note, Draw and PDF tools with an Office-style ribbon, 5 interface languages (TR/DE/EN/ES/FR), light/dark theme and
responsive layout. Download the offline Windows installer from **Releases**, or run `node server/server.js`.

## Deutsch
**Office Werkstatt** ist eine integrierte Office-Suite, die komplett ohne Internet läuft – im Browser, auf dem Desktop und auf dem eigenen Server:
Word-, Excel-, Slide-, Note-, Draw- und PDF-Werkzeug mit Menüband im Office-Stil, 5 Sprachen, hellem/dunklem Design und responsivem Layout.
Den Offline-Installer für Windows gibt es unter **Releases**; Server-Start mit `node server/server.js`.

## Lisans
Office Werkstatt: [MIT](LICENSE) © Süleyman Akbulut.
Yerleşik motorlar kendi lisanslarını korur; lisans metinleri ilgili klasörlerdedir:
`public/engines/word|excel|slide/LICENSE-*` (MIT veya Apache-2.0), `public/engines/pdf/LICENSE` (AGPL-3.0).
PDF Werkstatt içindeki bileşenler (PDF.js, pdf-lib, MuPDF, Tesseract.js …) için `public/engines/pdf/LICENSE`.
