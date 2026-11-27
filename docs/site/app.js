/* Office Werkstatt – project site. No dependencies, works offline. */
(function () {
  "use strict";

  /* ---------- translations ---------- */
  var T = {
    en: {},
    de: {
      "nav.download": "Download",
      "hero.title": "Das ist Office Werkstatt",
      "hero.sub": "Eine Office-Suite, die komplett offline funktioniert",
      "belief.a": "Weil wir glauben:",
      "belief.b": "Gute Arbeit",
      "belief.c": "beginnt in der",
      "belief.d": "eigenen Werkstatt",
      "belief.e": "So funktioniert’s:",
      "tools.title": "Neun Werkzeuge",
      "tools.sub": "Word · Excel · Slide · Note · Draw · PDF · Design · Form · AI — in einem Fenster",
      "write.title": "Schreiben &amp; Rechnen",
      "write.sub": "Volle Engines für .docx, .xlsx und .pptx — OpenDocument inklusive",
      "write.doc": "Quartalsbericht",
      "design.title": "Gestalten &amp; Präsentieren",
      "design.sub": "Plakate, Social-Media-Posts, Flyer und Folien — 17 Vorlagen, Brand-Kit, Video-Export",
      "design.doc": "Frühlingskampagne",
      "ai.title": "Frag den Agenten",
      "ai.sub": "Eingebaute KI in jedem Werkzeug — lokale Engine, Ollama oder jede OpenAI-kompatible API",
      "ai.bubble": "Ich habe deine Besprechungsnotizen zusammengefasst und eine Aufgabenliste in den Bericht eingefügt. Änderungen übernehmen?",
      "off.doc": "Deine Dokumente",
      "off.stamp": "bleiben auf deinem Rechner",
      "off.title": "Kein Internet?",
      "off.sub": "Kein Problem. Kein CDN, keine Cloud — deine Dateien verlassen nie deinen Computer.",
      "plat.title": "Läuft überall",
      "plat.sub": "Eine Suite, vier Wege sie zu nutzen",
      "plat.soon": "Bald verfügbar",
      "plat.andt": "Eine native App für Smartphone und Tablet — deine Werkzeuge immer dabei.",
      "plat.web": "Browser",
      "plat.webt": "In jedem modernen Browser — als App installierbar, auch auf Tablet und Handy.",
      "plat.desk": "Desktop",
      "plat.deskt": "Offline-Installer für Windows, dazu Linux und macOS — mit eingebauter KI-Engine.",
      "plat.srv": "Server",
      "plat.srvt": "Docker-Image, Ersteinrichtung im Browser, Benutzer &amp; Rollen, Admin-Panel und Logs.",
      "get.cover": "Open-Source-Office-Suite",
      "get.title": "Bau dir jetzt dein eigenes Office",
      "get.p1": "Kostenlos und <b>Open Source</b> (MIT)",
      "get.p2": "<b>5 Sprachen</b>: EN · DE · TR · ES · FR",
      "get.p3": "Web · Windows · Linux · macOS · Server · <b>Android</b> (bald)",
      "get.band": "Neueste Version herunterladen",
      "get.bandsub": "Desktop- und Server-Downloads auf einer Release-Seite.",
      "get.win": "Windows-Installer",
      "get.docker": "Server / Docker",
      "foot.rel": "Releases",
      "foot.docs": "Dokumentation",
      "foot.lic": "Lizenz"
    },
    tr: {
      "nav.download": "İndir",
      "hero.title": "Karşınızda Office Werkstatt",
      "hero.sub": "Tamamen çevrimdışı çalışan bir ofis paketi",
      "belief.a": "Çünkü inanıyoruz ki",
      "belief.b": "Güzel işler",
      "belief.c": "kendi",
      "belief.d": "atölyenizde başlar",
      "belief.e": "Nasıl çalıştığına bakın:",
      "tools.title": "Dokuz Werkzeug",
      "tools.sub": "Word · Excel · Slide · Note · Draw · PDF · Design · Form · AI — tek pencerede",
      "write.title": "Yaz &amp; Hesapla",
      "write.sub": ".docx, .xlsx ve .pptx için tam motorlar — OpenDocument dahil",
      "write.doc": "Çeyrek Raporu",
      "design.title": "Tasarla &amp; Sun",
      "design.sub": "Afiş, sosyal medya gönderisi, broşür ve slaytlar — 17 şablon, marka kiti, video dışa aktarma",
      "design.doc": "Bahar Kampanyası",
      "ai.title": "Ajana Sor",
      "ai.sub": "Her Werkzeug’da yerleşik yapay zekâ — yerel motor, Ollama ya da OpenAI uyumlu her API",
      "ai.bubble": "Toplantı notlarını özetledim ve rapora bir görev listesi ekledim. Değişiklikler uygulansın mı?",
      "off.doc": "Belgeleriniz",
      "off.stamp": "bilgisayarınızda kalır",
      "off.title": "İnternet yok mu?",
      "off.sub": "Sorun değil. CDN yok, bulut yok — dosyalarınız bilgisayarınızdan çıkmaz.",
      "plat.title": "Her yerde çalışır",
      "plat.sub": "Tek paket, dört kullanım şekli",
      "plat.soon": "Yakında",
      "plat.andt": "Telefon ve tablet için yerel mobil uygulama — Werkzeug’larınız cebinizde.",
      "plat.web": "Tarayıcı",
      "plat.webt": "Her modern tarayıcıda açılır — uygulama olarak kurulabilir, tablet ve telefonda da.",
      "plat.desk": "Masaüstü",
      "plat.deskt": "Windows için çevrimdışı kurulum, ayrıca Linux ve macOS — yerleşik yapay zekâ motoruyla.",
      "plat.srv": "Sunucu",
      "plat.srvt": "Docker imajı, tarayıcıda ilk kurulum, kullanıcılar &amp; roller, yönetim paneli ve kayıtlar.",
      "get.cover": "Açık kaynak ofis paketi",
      "get.title": "Kendi ofisinizi şimdi kurun",
      "get.p1": "Ücretsiz ve <b>açık kaynak</b> (MIT)",
      "get.p2": "<b>5 dil</b>: EN · DE · TR · ES · FR",
      "get.p3": "Web · Windows · Linux · macOS · Sunucu · <b>Android</b> (yakında)",
      "get.band": "Son sürümü indirin",
      "get.bandsub": "Masaüstü ve sunucu indirmeleri tek sürüm sayfasında.",
      "get.win": "Windows kurulumu",
      "get.docker": "Sunucu / Docker",
      "foot.rel": "Sürümler",
      "foot.docs": "Belgeler",
      "foot.lic": "Lisans"
    }
  };
  var nodes = document.querySelectorAll("[data-i18n]");
  nodes.forEach(function (n) { T.en[n.dataset.i18n] = n.innerHTML; });

  function setLang(l) {
    if (!T[l]) l = "en";
    nodes.forEach(function (n) { var v = T[l][n.dataset.i18n]; n.innerHTML = v != null ? v : T.en[n.dataset.i18n]; });
    document.documentElement.lang = l;
    document.querySelectorAll(".lang button").forEach(function (b) { b.classList.toggle("on", b.dataset.lang === l); });
    try { localStorage.setItem("ow-lang", l); } catch (e) {}
    bubbleText = document.querySelector(".typed").textContent;
  }
  var saved = null;
  try { saved = localStorage.getItem("ow-lang"); } catch (e) {}
  var nav = (navigator.language || "en").slice(0, 2);
  var bubbleText = "";
  setLang(saved || (T[nav] ? nav : "en"));
  document.querySelectorAll(".lang button").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.dataset.lang); });
  });

  /* ---------- floating outline shapes ---------- */
  var SHAPES = {
    tri: '<svg viewBox="0 0 100 100"><path d="M50 10 L92 86 L8 86 Z"/></svg>',
    sq: '<svg viewBox="0 0 100 100"><rect x="14" y="14" width="72" height="72"/></svg>',
    ci: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="36"/></svg>',
    arc: '<svg viewBox="0 0 100 100"><path d="M14 50 A36 36 0 0 0 86 50"/></svg>',
    ln: '<svg viewBox="0 0 100 100"><path d="M20 80 L80 20"/></svg>'
  };
  var LAYOUT = [
    ["tri", 8, 12, 90, -10], ["sq", 62, 9, 60, 14], ["arc", 13, 6, 70, 40], ["tri", 70, 42, 110, 30],
    ["sq", 12, 70, 70, -18], ["tri", 22, 56, 100, -30], ["ci", 85, 78, 60, 0], ["tri", 3, 88, 80, 20],
    ["arc", 82, 22, 70, 200], ["ln", 46, 84, 50, 0]
  ];
  document.querySelectorAll(".shapes").forEach(function (box, bi) {
    var html = "";
    LAYOUT.forEach(function (s, i) {
      var size = box.classList.contains("cover-shapes") ? s[3] * 0.55 : s[3];
      html += SHAPES[s[0]].replace("<svg", '<svg style="left:' + s[1] + "%;top:" + s[2] + "%;width:" + size + "px;height:" + size +
        "px;rotate:" + s[4] + "deg;animation-delay:-" + ((i * 1.7 + bi) % 9) + "s;--dx:" + ((i % 3) - 1) * 18 + "px;--dy:" + (i % 2 ? 20 : -24) + 'px"');
    });
    box.innerHTML = html;
  });

  /* ---------- typing effect for the agent bubble ---------- */
  var typer;
  function typeBubble() {
    var el = document.querySelector(".typed"), i = 0;
    clearInterval(typer);
    el.textContent = "";
    el.classList.add("typing");
    setTimeout(function () {
      typer = setInterval(function () {
        el.textContent = bubbleText.slice(0, ++i);
        if (i >= bubbleText.length) { clearInterval(typer); el.classList.remove("typing"); }
      }, 22);
    }, 1300);
  }

  /* ---------- slide engine ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var dots = document.querySelector(".dots");
  var flow = window.matchMedia("(max-width:860px),(max-height:560px)");
  var cur = -1, lock = false;

  slides.forEach(function (s, i) {
    var b = document.createElement("button");
    b.setAttribute("aria-label", "Section " + (i + 1));
    b.addEventListener("click", function () { go(i); });
    dots.appendChild(b);
  });

  function go(i) {
    if (flow.matches) { slides[i].scrollIntoView({ behavior: "smooth" }); return; }
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur) return;
    if (cur >= 0) slides[cur].classList.remove("on");
    cur = i;
    slides[i].classList.add("on");
    document.body.dataset.theme = slides[i].dataset.theme;
    dots.querySelectorAll("button").forEach(function (b, k) { b.classList.toggle("on", k === i); });
    if (slides[i].classList.contains("s-ai")) typeBubble();
    lock = true;
    setTimeout(function () { lock = false; }, 1000);
  }

  window.addEventListener("wheel", function (e) {
    if (flow.matches) return;
    e.preventDefault();
    if (lock || Math.abs(e.deltaY) < 12) return;
    go(cur + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  window.addEventListener("keydown", function (e) {
    if (flow.matches) return;
    var k = e.key;
    if (k === "ArrowDown" || k === "PageDown" || k === " ") { e.preventDefault(); go(cur + 1); }
    else if (k === "ArrowUp" || k === "PageUp") { e.preventDefault(); go(cur - 1); }
    else if (k === "Home") go(0);
    else if (k === "End") go(slides.length - 1);
  });

  var ty = null;
  window.addEventListener("touchstart", function (e) { ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchend", function (e) {
    if (flow.matches || ty == null) return;
    var d = ty - e.changedTouches[0].clientY;
    if (Math.abs(d) > 50) go(cur + (d > 0 ? 1 : -1));
    ty = null;
  });

  document.querySelectorAll('a[href="#download"], [data-goto]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      go(a.dataset.goto != null ? +a.dataset.goto : slides.length - 1);
    });
  });

  /* small screens: normal scrolling, reveal on view */
  var io = null;
  function setupFlow() {
    if (flow.matches) {
      slides.forEach(function (s) { s.classList.add("on"); });
      io = io || new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { typeBubble(); io.disconnect(); } });
      }, { threshold: 0.4 });
      io.observe(document.querySelector(".s-ai"));
      document.body.dataset.theme = "light";
    } else {
      if (io) { io.disconnect(); }
      slides.forEach(function (s) { s.classList.remove("on"); });
      var start = cur < 0 ? 0 : cur; cur = -1; go(start);
    }
  }
  if (flow.addEventListener) flow.addEventListener("change", setupFlow);

  /* intro */
  window.addEventListener("load", function () {
    setTimeout(function () { document.body.classList.remove("is-loading"); setupFlow(); }, 1500);
  });
})();
