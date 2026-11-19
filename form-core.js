/* Office Werkstatt – Formular Werkzeug core
 * Shared by the editor (browser), the published form page and the server (Node: require()).
 *  - question types and the form data model
 *  - turning responses into table rows / Excel Werkzeug cells
 *  - building the self-contained HTML form page ("Erstellen") that works on a server,
 *    in kiosk mode (no internet, answers stay on the device) and with an e-mail fallback.
 * No DOM access at load time, so the server can require this file. */
(function (root) {
  const OW = root.OW = root.OW || {};

  /* ---------- question types ---------- */
  const TYPES = [
    { type: 'short', icon: 'text' }, { type: 'long', icon: 'paragraph' }, { type: 'single', icon: 'radio' },
    { type: 'multi', icon: 'checklist' }, { type: 'dropdown', icon: 'chevronDown' }, { type: 'number', icon: 'hash' },
    { type: 'date', icon: 'calendar' }, { type: 'calendar', icon: 'calGrid' }, { type: 'email', icon: 'mail' }, { type: 'phone', icon: 'phone' },
    { type: 'rating', icon: 'star' }, { type: 'scale', icon: 'gauge' }, { type: 'yesno', icon: 'check' },
    { type: 'section', icon: 'heading', noAnswer: true }, { type: 'text', icon: 'quote', noAnswer: true }, { type: 'image', icon: 'image', noAnswer: true },
  ];
  const NO_ANSWER = ['section', 'text', 'image'];
  const WITH_OPTIONS = ['single', 'multi', 'dropdown'];
  const uid = () => Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);

  function newQuestion(type, t) {
    const q = { id: 'q' + uid(), type, label: '', help: '', required: false };
    if (WITH_OPTIONS.includes(type)) q.options = [t('form.option') + ' 1', t('form.option') + ' 2'];
    if (type === 'scale') { q.min = 1; q.max = 10; }
    if (type === 'number') { q.min = ''; q.max = ''; }
    if (type === 'section') q.label = t('form.type.section');
    if (type === 'text') { q.label = ''; q.text = ''; }
    if (type === 'image') { q.label = ''; q.image = ''; }
    if (type === 'calendar') { q.multi = false; q.weekdays = [1, 2, 3, 4, 5]; q.from = ''; q.to = ''; q.slots = ''; q.future = true; }
    return q;
  }
  function newForm(t) {
    return { version: 1, title: t('form.untitledTitle'), desc: '', lang: OW.lang || 'de', accent: '#0FA3B1', bg: '', frame: '', frameW: 1, headerImage: '',
      cover: { on: false, title: '', text: '', image: '', button: '' },
      thanks: '', email: '', server: '', kiosk: false, accepting: true, excelId: null,
      questions: [Object.assign(newQuestion('short', t), { label: t('form.sample.name'), required: true }), Object.assign(newQuestion('email', t), { label: t('form.sample.email') })],
      responses: [] };
  }

  /* ---------- responses → rows / cells ---------- */
  const answerable = form => (form.questions || []).filter(q => !NO_ANSWER.includes(q.type));
  const pad = n => String(n).padStart(2, '0');
  const fmtTime = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  function fmtAnswer(q, v) {
    if (v == null || v === '') return '';
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  }
  function mergeResponses(...lists) {
    const m = new Map();
    lists.forEach(l => (l || []).forEach(r => { if (r && r.id && !m.has(r.id)) m.set(r.id, r); }));
    return Array.from(m.values()).sort((a, b) => a.at - b.at);
  }
  function rows(form, responses, labels = {}) {
    const qs = answerable(form);
    const header = [labels.time || 'Zeitpunkt'].concat(qs.map(q => q.label || '?'), [labels.source || 'Quelle']);
    const body = (responses || []).map(r => [fmtTime(r.at)].concat(qs.map(q => fmtAnswer(q, (r.answers || {})[q.id])), [r.src || '']));
    return { header, rows: body, questions: qs };
  }
  const colName = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  /* Excel Werkzeug sheet – one column per question, no limit */
  function cells(form, responses, labels = {}, maxCols = Infinity) {
    const r = rows(form, responses, labels), c = {}, colW = {};
    const accent = form.accent || '#0FA3B1';
    r.header.slice(0, maxCols).forEach((h, j) => { c[colName(j) + '1'] = { v: h, s: { b: true, bg: accent, color: '#ffffff', border: true } }; colW[j] = j === 0 ? 140 : Math.min(260, Math.max(110, String(h).length * 8)); });
    r.rows.forEach((row, i) => row.slice(0, maxCols).forEach((v, j) => {
      if (v === '') return;
      const q = r.questions[j - 1], cell = { v };
      if (q && (q.type === 'phone' || /^0\d/.test(v))) cell.s = { text: true }; // keep leading zeros / +49…
      c[colName(j) + (i + 2)] = cell;
    }));
    return { cells: c, colW, truncated: r.header.length > maxCols };
  }
  /* replace (or add) the answers sheet of an Excel Werkzeug file, keeping the user's other sheets */
  function syncExcelContent(excelContent, form, formId, responses, labels = {}) {
    /* a table the Pro engine saved is an .xlsx file: the answers table is managed by the form, so it is rebuilt */
    const x = excelContent && Array.isArray(excelContent.sheets) ? excelContent : { sheets: [], active: 0 };
    const { cells: cs, colW } = cells(form, responses, labels);
    let sh = x.sheets.find(s => s.form === formId);
    if (!sh) { sh = { name: labels.sheet || 'Antworten', form: formId }; x.sheets.unshift(sh); x.active = 0; }
    sh.cells = cs; sh.colW = colW; sh.frozen = { r: 1 };
    return x;
  }
  function toCSV(form, responses, labels = {}, sep = ';') {
    const r = rows(form, responses, labels);
    const q = v => { v = String(v == null ? '' : v); return /["\n\r;,]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return '﻿' + [r.header].concat(r.rows).map(row => row.map(q).join(sep)).join('\r\n');
  }

  /* ---------- validation of a submitted response (server + page) ---------- */
  function validate(form, answers) {
    const out = {}, errs = [];
    answerable(form).forEach(q => {
      let v = answers ? answers[q.id] : undefined;
      if (Array.isArray(v)) v = v.map(x => String(x).slice(0, 500)).filter(Boolean).slice(0, 50);
      else if (v != null) v = String(v).slice(0, q.type === 'long' ? 5000 : 500).trim();
      const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
      if (empty) { if (q.required) errs.push(q.id); return; }
      if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return errs.push(q.id);
      if (q.type === 'calendar' && !(Array.isArray(v) ? v : [v]).every(x => /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(x))) return errs.push(q.id);
      if (WITH_OPTIONS.includes(q.type)) { const ok = (Array.isArray(v) ? v : [v]).every(x => (q.options || []).includes(x)); if (!ok) return errs.push(q.id); }
      out[q.id] = v;
    });
    return { answers: out, errors: errs };
  }

  /* ---------- texts used inside the published page (5 languages) ---------- */
  const PAGE_STR = {
    en: { submit: 'Submit', required: 'Required', reqMsg: 'Please answer this question.', email: 'Please enter a valid e-mail address.', number: 'Please enter a valid number.', choose: 'Please choose', yes: 'Yes', no: 'No', sending: 'Sending…', thanks: 'Thank you! Your answer has been recorded.', another: 'Submit another response', savedHere: 'Your answer was saved on this device.', mailHint: 'To make sure it arrives, please also send it by e-mail:', mail: 'Send by e-mail', closed: 'This form is no longer accepting responses.', export: 'Export answers', exported: 'answers exported', errors: 'Please check the marked questions.', powered: 'Created with Office Werkstatt', start: 'Start', back: 'Back', prev: 'Previous month', next: 'Next month', pickTime: 'Please also choose a time.', selected: 'Selected', time: 'Time', none: 'Nothing selected yet' },
    de: { submit: 'Absenden', required: 'Pflichtfeld', reqMsg: 'Bitte beantworten Sie diese Frage.', email: 'Bitte eine gültige E-Mail-Adresse eingeben.', number: 'Bitte eine gültige Zahl eingeben.', choose: 'Bitte wählen', yes: 'Ja', no: 'Nein', sending: 'Wird gesendet…', thanks: 'Vielen Dank! Ihre Antwort wurde gespeichert.', another: 'Weitere Antwort senden', savedHere: 'Ihre Antwort wurde auf diesem Gerät gespeichert.', mailHint: 'Damit sie sicher ankommt, senden Sie sie bitte auch per E-Mail:', mail: 'Per E-Mail senden', closed: 'Dieses Formular nimmt keine Antworten mehr an.', export: 'Antworten exportieren', exported: 'Antworten exportiert', errors: 'Bitte prüfen Sie die markierten Fragen.', powered: 'Erstellt mit Office Werkstatt', start: 'Los geht’s', back: 'Zurück', prev: 'Vorheriger Monat', next: 'Nächster Monat', pickTime: 'Bitte wählen Sie auch eine Uhrzeit.', selected: 'Ausgewählt', time: 'Uhrzeit', none: 'Noch nichts ausgewählt' },
    tr: { submit: 'Gönder', required: 'Zorunlu', reqMsg: 'Lütfen bu soruyu yanıtlayın.', email: 'Lütfen geçerli bir e-posta adresi girin.', number: 'Lütfen geçerli bir sayı girin.', choose: 'Lütfen seçin', yes: 'Evet', no: 'Hayır', sending: 'Gönderiliyor…', thanks: 'Teşekkürler! Yanıtınız kaydedildi.', another: 'Yeni yanıt gönder', savedHere: 'Yanıtınız bu cihaza kaydedildi.', mailHint: 'Ulaştığından emin olmak için lütfen e-posta ile de gönderin:', mail: 'E-posta ile gönder', closed: 'Bu form artık yanıt kabul etmiyor.', export: 'Yanıtları dışa aktar', exported: 'yanıt dışa aktarıldı', errors: 'Lütfen işaretli soruları kontrol edin.', powered: 'Office Werkstatt ile oluşturuldu', start: 'Başla', back: 'Geri', prev: 'Önceki ay', next: 'Sonraki ay', pickTime: 'Lütfen bir saat de seçin.', selected: 'Seçilen', time: 'Saat', none: 'Henüz seçim yok' },
    es: { submit: 'Enviar', required: 'Obligatorio', reqMsg: 'Responde a esta pregunta.', email: 'Introduce un correo electrónico válido.', number: 'Introduce un número válido.', choose: 'Elige', yes: 'Sí', no: 'No', sending: 'Enviando…', thanks: '¡Gracias! Tu respuesta se ha registrado.', another: 'Enviar otra respuesta', savedHere: 'Tu respuesta se guardó en este dispositivo.', mailHint: 'Para asegurarte de que llegue, envíala también por correo:', mail: 'Enviar por correo', closed: 'Este formulario ya no acepta respuestas.', export: 'Exportar respuestas', exported: 'respuestas exportadas', errors: 'Revisa las preguntas marcadas.', powered: 'Creado con Office Werkstatt', start: 'Empezar', back: 'Atrás', prev: 'Mes anterior', next: 'Mes siguiente', pickTime: 'Elige también una hora.', selected: 'Seleccionado', time: 'Hora', none: 'Nada seleccionado' },
    fr: { submit: 'Envoyer', required: 'Obligatoire', reqMsg: 'Veuillez répondre à cette question.', email: 'Veuillez saisir une adresse e-mail valide.', number: 'Veuillez saisir un nombre valide.', choose: 'Veuillez choisir', yes: 'Oui', no: 'Non', sending: 'Envoi…', thanks: 'Merci ! Votre réponse a été enregistrée.', another: 'Envoyer une autre réponse', savedHere: 'Votre réponse a été enregistrée sur cet appareil.', mailHint: 'Pour être sûr qu’elle arrive, envoyez-la aussi par e-mail :', mail: 'Envoyer par e-mail', closed: 'Ce formulaire n’accepte plus de réponses.', export: 'Exporter les réponses', exported: 'réponses exportées', errors: 'Veuillez vérifier les questions marquées.', powered: 'Créé avec Office Werkstatt', start: 'Commencer', back: 'Retour', prev: 'Mois précédent', next: 'Mois suivant', pickTime: 'Veuillez aussi choisir une heure.', selected: 'Sélection', time: 'Heure', none: 'Rien de sélectionné' },
  };

  /* ---------- the published page ---------- */
  const PAGE_CSS = `:root{--a:#0FA3B1;--bg:#F4F6FA;--card:#fff;--ink:#1B1F3B;--ink2:#5A607F;--line:#DDE1EC;--frame:var(--line);--fw:1px;--err:#D93A32}
@media (prefers-color-scheme:dark){:root{--bg:#12151F;--card:#1C2030;--ink:#EEF0F8;--ink2:#A8AECB;--line:#2E3448}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 "Segoe UI",system-ui,-apple-system,Roboto,sans-serif}
.owf{max-width:720px;margin:0 auto;padding:24px 16px 48px}
.card{background:var(--card);border:var(--fw) solid var(--frame);border-radius:14px;padding:22px 24px;margin-bottom:14px;overflow:hidden}
.head{border-top:10px solid var(--a)}.head.has-img{border-top:0;padding-top:0}.banner{display:block;width:calc(100% + 48px);margin:0 -24px 18px;max-height:260px;object-fit:cover}
h1{margin:0 0 8px;font-size:28px;line-height:1.2}.desc{color:var(--ink2);white-space:pre-wrap;margin:0}
.req-note{color:var(--err);font-size:13px;margin-top:12px}
.q label.ql,.q .ql{display:block;font-weight:600;margin-bottom:4px}.q .req{color:var(--err)}.q .help{color:var(--ink2);font-size:14px;margin:0 0 10px;white-space:pre-wrap}
.qimg{display:block;max-width:100%;max-height:420px;border-radius:10px;margin:6px 0 12px}
.q.err{border-color:var(--err);box-shadow:0 0 0 1px var(--err)}.q .msg{color:var(--err);font-size:14px;margin-top:8px;display:none}.q.err .msg{display:block}
.sec{background:transparent;border:0;padding:12px 4px 0}.sec h2{margin:0;font-size:21px;color:var(--a)}
.txt h3{margin:0 0 6px;font-size:18px}.txt p{margin:0;white-space:pre-wrap;color:var(--ink2)}
.img{padding:0}.img img{display:block;width:100%;height:auto}.img figcaption{padding:10px 18px;color:var(--ink2);font-size:14px}
input[type=text],input[type=email],input[type=tel],input[type=number],input[type=date],textarea,select{width:100%;font:inherit;color:inherit;background:transparent;border:0;border-bottom:2px solid var(--line);padding:8px 2px;outline:none;border-radius:0}
textarea{min-height:90px;resize:vertical;border:2px solid var(--line);border-radius:8px;padding:10px}select{border:2px solid var(--line);border-radius:8px;padding:10px;background:var(--card)}
input:focus,textarea:focus,select:focus{border-color:var(--a)}
.opt{display:flex;align-items:center;gap:10px;padding:7px 4px;cursor:pointer;border-radius:8px}.opt:hover{background:color-mix(in srgb,var(--a) 8%,transparent)}
.opt input{width:20px;height:20px;accent-color:var(--a);margin:0}
.pills{display:flex;flex-wrap:wrap;gap:8px}.pill{position:relative}.pill input{position:absolute;opacity:0;pointer-events:none}
.pill span{display:grid;place-items:center;min-width:44px;height:44px;padding:0 14px;border:2px solid var(--line);border-radius:10px;font-weight:600;cursor:pointer;user-select:none}
.pill input:checked+span{background:var(--a);border-color:var(--a);color:#fff}.pill input:focus-visible+span{outline:2px solid var(--a);outline-offset:2px}
.scale-l{display:flex;justify-content:space-between;color:var(--ink2);font-size:13px;margin-top:6px}
.stars{display:flex;flex-direction:row-reverse;justify-content:flex-end;gap:4px}.stars input{position:absolute;opacity:0;pointer-events:none}
.stars label{font-size:34px;line-height:1;color:var(--line);cursor:pointer;transition:transform .1s}.stars label:hover,.stars label:hover~label,.stars input:checked~label{color:#F5B301}
.stars label:active{transform:scale(.9)}.stars input:focus-visible+label{outline:2px solid var(--a);border-radius:4px}
.cal{max-width:360px;border:2px solid var(--line);border-radius:12px;padding:10px;user-select:none}
.cal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-weight:700;text-transform:capitalize}
.cal-h button{appearance:none;border:0;background:transparent;color:var(--ink);width:36px;height:36px;border-radius:8px;font-size:20px;cursor:pointer}.cal-h button:hover:not(:disabled){background:color-mix(in srgb,var(--a) 12%,transparent)}.cal-h button:disabled{opacity:.25;cursor:default}
.cal-g{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}.cal-g .wd{font-size:12px;color:var(--ink2);padding:4px 0;text-transform:capitalize}
.cal-g button{appearance:none;border:0;background:transparent;color:var(--ink);font:inherit;aspect-ratio:1;border-radius:50%;cursor:pointer;font-size:15px}
.cal-g button:hover:not(:disabled){background:color-mix(in srgb,var(--a) 14%,transparent)}.cal-g button:disabled{color:var(--line);cursor:default;text-decoration:line-through}
.cal-g button.today{box-shadow:inset 0 0 0 2px var(--a)}.cal-g button.on{background:var(--a);color:#fff;font-weight:700}
.cal-slots{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.cal-slots button{appearance:none;border:2px solid var(--line);background:transparent;color:var(--ink);font:inherit;font-weight:600;padding:8px 14px;border-radius:10px;cursor:pointer}
.cal-slots button.on{background:var(--a);border-color:var(--a);color:#fff}.cal-sum{margin-top:10px;font-size:14px;color:var(--ink2)}.cal-sum b{color:var(--ink)}
.actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:6px}
button.btn,a.btn{appearance:none;border:0;background:var(--a);color:#fff;font-family:inherit;font-weight:600;font-size:16px;line-height:1;padding:14px 28px;border-radius:10px;cursor:pointer;text-decoration:none;display:inline-block}
button.btn:disabled{opacity:.6;cursor:wait}.btn.ghost{background:transparent;color:var(--a);border:2px solid var(--a)}
.formerr{color:var(--err);font-weight:600}.done{text-align:center;padding:40px 24px}.done .ok{width:64px;height:64px;border-radius:50%;background:var(--a);color:#fff;display:grid;place-items:center;font-size:34px;margin:0 auto 16px}
.done p{white-space:pre-wrap}.done .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px}
.cover{text-align:center;padding:0 0 34px}.cover img{display:block;width:100%;max-height:340px;object-fit:cover;margin-bottom:26px}.cover.noimg{padding-top:44px;border-top:10px solid var(--a)}
.cover h1{font-size:32px;padding:0 24px}.cover p{white-space:pre-wrap;color:var(--ink2);padding:0 28px;margin:0 auto 26px;max-width:560px;font-size:17px}
.foot{display:flex;justify-content:space-between;color:var(--ink2);font-size:12px;margin-top:18px;padding:0 4px}.foot a{color:var(--ink2)}
@media (max-width:520px){.card{padding:18px 16px}.banner{width:calc(100% + 32px);margin:0 -16px 16px}h1{font-size:24px}.cover h1{font-size:26px}}`;

  /* Runs inside the published page. Must not reference anything outside its arguments. */
  function OWFormRuntime(F, C, S) {
    /* buttons and messages use the language the form was written in, so the page never mixes languages */
    var L = C.lang || F.lang || (navigator.language || '').slice(0, 2).toLowerCase();
    if (!S[L]) L = 'en';
    var s = function (k) { return (S[L] && S[L][k]) || S.en[k] || k; };
    var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var img = function (src, cls) { return /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,|^https?:\/\//i.test(src || '') ? '<img class="' + (cls || '') + '" src="' + esc(src) + '" alt="">' : ''; };
    var NO = ['section', 'text', 'image'];
    var root = document.getElementById('owf'), KEY = 'owform-' + F.id, mem = null, cal = {};
    var de = document.documentElement;
    de.lang = L;
    de.style.setProperty('--a', F.accent || '#0FA3B1');
    if (F.bg) de.style.setProperty('--bg', F.bg);
    if (F.frame) de.style.setProperty('--frame', F.frame);
    if (F.frameW) de.style.setProperty('--fw', (+F.frameW || 1) + 'px');
    var db = function () { try { return JSON.parse(localStorage.getItem(KEY)) || { saved: [], queue: [] }; } catch (e) { return mem || (mem = { saved: [], queue: [] }); } };
    var dbPut = function (o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { mem = o; } };
    var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };
    var api = C.endpoint != null && C.endpoint !== false ? C.endpoint + 'api/forms/' + encodeURIComponent(F.id) + '/responses' : null;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    var fmtDay = function (k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(L, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); };

    function field(q, i) {
      var n = 'f' + i, id = esc(q.id), o = q.options || [];
      switch (q.type) {
        case 'long': return '<textarea id="' + n + '" name="' + id + '"></textarea>';
        case 'single': return o.map(function (x) { return '<label class="opt"><input type="radio" name="' + id + '" value="' + esc(x) + '"><span>' + esc(x) + '</span></label>'; }).join('');
        case 'multi': return o.map(function (x) { return '<label class="opt"><input type="checkbox" name="' + id + '" value="' + esc(x) + '"><span>' + esc(x) + '</span></label>'; }).join('');
        case 'dropdown': return '<select id="' + n + '" name="' + id + '"><option value="">' + esc(s('choose')) + '</option>' + o.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>';
        case 'number': return '<input type="number" step="any" inputmode="decimal" id="' + n + '" name="' + id + '"' + (q.min !== '' && q.min != null ? ' min="' + esc(q.min) + '"' : '') + (q.max !== '' && q.max != null ? ' max="' + esc(q.max) + '"' : '') + '>';
        case 'date': return '<input type="date" id="' + n + '" name="' + id + '">';
        case 'calendar': return '<div class="cal" data-cal="' + id + '"></div><div class="cal-x" data-calx="' + id + '"></div>';
        case 'email': return '<input type="email" id="' + n + '" name="' + id + '" autocomplete="email">';
        case 'phone': return '<input type="tel" id="' + n + '" name="' + id + '" autocomplete="tel">';
        case 'yesno': return '<div class="pills">' + [s('yes'), s('no')].map(function (x) { return '<label class="pill"><input type="radio" name="' + id + '" value="' + esc(x) + '"><span>' + esc(x) + '</span></label>'; }).join('') + '</div>';
        case 'rating': { var h = ''; for (var r = 5; r >= 1; r--) h += '<input type="radio" id="' + n + '_' + r + '" name="' + id + '" value="' + r + '"><label for="' + n + '_' + r + '" title="' + r + '">★</label>'; return '<div class="stars">' + h + '</div>'; }
        case 'scale': { var a = +q.min || 0, b = +q.max || 10, p = ''; if (b < a) b = a; if (b - a > 20) b = a + 20; for (var v = a; v <= b; v++) p += '<label class="pill"><input type="radio" name="' + id + '" value="' + v + '"><span>' + v + '</span></label>'; return '<div class="pills">' + p + '</div>' + (q.minLabel || q.maxLabel ? '<div class="scale-l"><span>' + esc(q.minLabel || '') + '</span><span>' + esc(q.maxLabel || '') + '</span></div>' : ''); }
        default: return '<input type="text" id="' + n + '" name="' + id + '" autocomplete="off">';
      }
    }

    /* ----- calendar: pick a day (or several) from a month view, optionally a time ----- */
    function slotsOf(q) { return q.multi ? [] : String(q.slots || '').split(/[,;\s]+/).filter(function (x) { return /^\d{1,2}:\d{2}$/.test(x); }).map(function (x) { return x.length === 4 ? '0' + x : x; }); }
    function allowed(q, d) {
      var k = iso(d), t = new Date(); t.setHours(0, 0, 0, 0);
      if (q.future !== false && d < t) return false;
      if (q.from && k < q.from) return false; if (q.to && k > q.to) return false;
      if (q.weekdays && q.weekdays.length && q.weekdays.indexOf(d.getDay()) < 0) return false;
      return true;
    }
    function drawCal(q) {
      var st = cal[q.id], box = root.querySelector('[data-cal="' + q.id.replace(/"/g, '') + '"]'), ex = root.querySelector('[data-calx="' + q.id.replace(/"/g, '') + '"]');
      if (!box) return;
      var y = st.y, m = st.m, first = new Date(y, m, 1), shift = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = iso(new Date());
      var minM = q.from ? q.from.slice(0, 7) : (q.future !== false ? today.slice(0, 7) : ''), maxM = q.to ? q.to.slice(0, 7) : '', cur = y + '-' + pad(m + 1);
      var h = '<div class="cal-h"><button type="button" data-nav="-1" aria-label="' + esc(s('prev')) + '"' + (minM && cur <= minM ? ' disabled' : '') + '>‹</button><span>' + esc(first.toLocaleDateString(L, { month: 'long', year: 'numeric' })) + '</span><button type="button" data-nav="1" aria-label="' + esc(s('next')) + '"' + (maxM && cur >= maxM ? ' disabled' : '') + '>›</button></div><div class="cal-g">';
      for (var w = 0; w < 7; w++) h += '<span class="wd">' + esc(new Date(2024, 0, 1 + w).toLocaleDateString(L, { weekday: 'short' })) + '</span>';
      for (var e = 0; e < shift; e++) h += '<span></span>';
      for (var d = 1; d <= days; d++) {
        var dt = new Date(y, m, d), k = iso(dt), ok = allowed(q, dt), on = st.sel.indexOf(k) >= 0;
        h += '<button type="button" data-day="' + k + '" class="' + (on ? 'on ' : '') + (k === today ? 'today' : '') + '"' + (ok ? '' : ' disabled') + ' aria-pressed="' + on + '" aria-label="' + esc(fmtDay(k)) + '">' + d + '</button>';
      }
      box.innerHTML = h + '</div>';
      var sl = slotsOf(q), x = '';
      if (sl.length && st.sel.length) x += '<div class="cal-slots" role="group" aria-label="' + esc(s('time')) + '">' + sl.map(function (t) { return '<button type="button" data-slot="' + t + '" class="' + (st.slot === t ? 'on' : '') + '">' + t + '</button>'; }).join('') + '</div>';
      x += '<div class="cal-sum">' + (st.sel.length ? esc(s('selected')) + ': <b>' + st.sel.slice().sort().map(fmtDay).map(esc).join(' · ') + (st.slot ? ', ' + st.slot : '') + '</b>' : esc(s('none'))) + '</div>';
      ex.innerHTML = x;
    }
    function bindCal(q) {
      var st = cal[q.id] = { sel: [], slot: '' }, start = new Date();
      if (q.from && new Date(q.from + 'T00:00') > start) start = new Date(q.from + 'T00:00');
      st.y = start.getFullYear(); st.m = start.getMonth();
      var card = root.querySelector('[data-q="' + q.id.replace(/"/g, '') + '"]');
      card.addEventListener('click', function (ev) {
        var b = ev.target.closest('button'); if (!b || b.disabled) return;
        if (b.dataset.nav) { st.m += +b.dataset.nav; if (st.m < 0) { st.m = 11; st.y--; } if (st.m > 11) { st.m = 0; st.y++; } }
        else if (b.dataset.day) { var k = b.dataset.day, i = st.sel.indexOf(k); if (q.multi) { if (i >= 0) st.sel.splice(i, 1); else st.sel.push(k); } else { st.sel = i >= 0 ? [] : [k]; st.slot = ''; } card.classList.remove('err'); }
        else if (b.dataset.slot) { st.slot = st.slot === b.dataset.slot ? '' : b.dataset.slot; card.classList.remove('err'); }
        else return;
        drawCal(q);
      });
      drawCal(q);
    }

    function cover() {
      var c = F.cover || {};
      root.innerHTML = '<div class="card cover' + (c.image ? '' : ' noimg') + '">' + img(c.image) + '<h1>' + esc(c.title || F.title) + '</h1>' + (c.text ? '<p>' + esc(c.text) + '</p>' : '') + '<button class="btn" type="button">' + esc(c.button || s('start')) + '</button></div>' + foot();
      root.querySelector('.cover .btn').addEventListener('click', function () { render(); window.scrollTo(0, 0); });
      bindFoot();
    }
    function first() { if (F.cover && F.cover.on) cover(); else render(); }
    function render() {
      var anyReq = F.questions.some(function (q) { return q.required && NO.indexOf(q.type) < 0; });
      var h = '<form novalidate><div class="card head' + (F.headerImage ? ' has-img' : '') + '">' + img(F.headerImage, 'banner') + '<h1>' + esc(F.title) + '</h1>' + (F.desc ? '<p class="desc">' + esc(F.desc) + '</p>' : '') + (anyReq ? '<div class="req-note">* ' + esc(s('required')) + '</div>' : '') + '</div>';
      F.questions.forEach(function (q, i) {
        if (q.type === 'section') { h += '<div class="card sec"><h2>' + esc(q.label) + '</h2>' + (q.help ? '<p class="help">' + esc(q.help) + '</p>' : '') + '</div>'; return; }
        if (q.type === 'text') { if (q.label || q.text) h += '<div class="card txt">' + (q.label ? '<h3>' + esc(q.label) + '</h3>' : '') + (q.text ? '<p>' + esc(q.text) + '</p>' : '') + '</div>'; return; }
        if (q.type === 'image') { if (q.image) h += '<figure class="card img" style="margin:0 0 14px">' + img(q.image) + (q.label ? '<figcaption>' + esc(q.label) + '</figcaption>' : '') + '</figure>'; return; }
        var lab = esc(q.label) + (q.required ? ' <span class="req">*</span>' : '');
        var grp = ['single', 'multi', 'yesno', 'rating', 'scale', 'calendar'].indexOf(q.type) >= 0;
        var labTag = grp ? '<div class="ql" id="l' + i + '">' + lab + '</div>' : '<label class="ql" for="f' + i + '">' + lab + '</label>';
        h += '<div class="card q" data-q="' + esc(q.id) + '"' + (grp ? ' role="group" aria-labelledby="l' + i + '"' : '') + '>' + labTag + (q.help ? '<p class="help">' + esc(q.help) + '</p>' : '') + img(q.image, 'qimg') + field(q, i) + '<div class="msg"></div></div>';
      });
      h += '<div class="actions"><button class="btn" type="submit">' + esc(s('submit')) + '</button>' + (F.cover && F.cover.on ? '<button class="btn ghost" type="button" data-back>' + esc(s('back')) + '</button>' : '') + '<span class="formerr" role="alert"></span></div></form>';
      root.innerHTML = h + foot();
      root.querySelector('form').addEventListener('submit', onSubmit);
      var bk = root.querySelector('[data-back]'); if (bk) bk.addEventListener('click', function () { cover(); window.scrollTo(0, 0); });
      root.querySelectorAll('.q').forEach(function (c) { c.addEventListener('input', function () { c.classList.remove('err'); }); c.addEventListener('change', function () { c.classList.remove('err'); }); });
      F.questions.forEach(function (q) { if (q.type === 'calendar') bindCal(q); });
      bindFoot();
    }
    function foot() {
      var n = db().saved.length;
      return '<div class="foot"><span>' + esc(s('powered')) + '</span>' + ((C.kiosk || n) && !C.embedded ? '<a href="#" class="exp">' + esc(s('export')) + (n ? ' (' + n + ')' : '') + '</a>' : '') + '</div>';
    }
    function bindFoot() {
      var e = root.querySelector('.exp'); if (!e) return;
      e.addEventListener('click', function (ev) {
        ev.preventDefault(); var d = db();
        var blob = new Blob([JSON.stringify({ format: 'office-werkstatt-form-responses', form: F.id, title: F.title, responses: d.saved })], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (F.title || 'form').replace(/[\\/:*?"<>|]+/g, '_') + '-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1000);
        alert(d.saved.length + ' ' + s('exported'));
      });
    }
    function collect() {
      var form = root.querySelector('form'), answers = {}, bad = [];
      F.questions.forEach(function (q) {
        if (NO.indexOf(q.type) >= 0) return;
        var els = form.querySelectorAll('[name="' + q.id.replace(/"/g, '') + '"]'), v, msg = '';
        if (q.type === 'calendar') {
          var st = cal[q.id] || { sel: [] }, sl = slotsOf(q), days = st.sel.slice().sort();
          v = q.multi ? days : (days[0] ? days[0] + (st.slot ? ' ' + st.slot : '') : '');
          if (!q.multi && days[0] && sl.length && !st.slot) msg = s('pickTime');
        }
        else if (q.type === 'multi') { v = []; els.forEach(function (e) { if (e.checked) v.push(e.value); }); }
        else if (['single', 'yesno', 'rating', 'scale'].indexOf(q.type) >= 0) { v = ''; els.forEach(function (e) { if (e.checked) v = e.value; }); }
        else v = els[0] ? els[0].value.trim() : '';
        var empty = v === '' || (Array.isArray(v) && !v.length);
        if (msg) { /* keep */ }
        else if (empty && q.required) msg = s('reqMsg');
        else if (!empty && q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = s('email');
        else if (!empty && q.type === 'number' && (isNaN(+v) || (q.min !== '' && q.min != null && +v < +q.min) || (q.max !== '' && q.max != null && +v > +q.max))) msg = s('number');
        var card = form.querySelector('[data-q="' + q.id.replace(/"/g, '') + '"]');
        card.classList.toggle('err', !!msg); card.querySelector('.msg').textContent = msg;
        if (msg) bad.push(card); else if (!empty) answers[q.id] = v;
      });
      return { answers: answers, bad: bad };
    }
    function post(resp) {
      return fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) }).then(function (r) {
        if (r.status === 410) { var e = new Error('closed'); e.closed = true; throw e; }
        if (!r.ok) throw new Error('http ' + r.status);
      });
    }
    function onSubmit(ev) {
      ev.preventDefault();
      var c = collect(), errEl = root.querySelector('.formerr'), btn = root.querySelector('button[type=submit]');
      if (c.bad.length) { errEl.textContent = s('errors'); c.bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); var f = c.bad[0].querySelector('input,textarea,select,button'); f && f.focus({ preventScroll: true }); return; }
      errEl.textContent = '';
      var resp = { id: uid(), at: Date.now(), answers: c.answers, src: C.embedded ? 'preview' : (api ? 'web' : 'kiosk') };
      if (C.embedded) { parent.postMessage({ owForm: 'response', form: F.id, response: resp }, '*'); return done('ok', resp); }
      if (!api) { var d = db(); d.saved.push(resp); dbPut(d); return done('local', resp); }
      btn.disabled = true; btn.textContent = s('sending');
      post(resp).then(function () { done('ok', resp); }).catch(function (e) {
        if (e.closed) { root.innerHTML = '<div class="card done"><p>' + esc(s('closed')) + '</p></div>'; return; }
        var d = db(); resp.src = 'kiosk'; d.saved.push(resp); d.queue.push(resp.id); dbPut(d); done('local', resp);
      });
    }
    function mailto(resp) {
      var lines = F.questions.filter(function (q) { return NO.indexOf(q.type) < 0; }).map(function (q) { var v = resp.answers[q.id]; return q.label + ': ' + (Array.isArray(v) ? v.join(', ') : (v == null ? '' : v)); });
      var code = btoa(unescape(encodeURIComponent(JSON.stringify({ f: F.id, r: resp }))));
      var body = lines.join('\n') + '\n\n---\nOWFORM:' + code + ':END';
      return 'mailto:' + encodeURIComponent(C.email) + '?subject=' + encodeURIComponent(F.title) + '&body=' + encodeURIComponent(body);
    }
    function done(kind, resp) {
      var h = '<div class="card done"><div class="ok">✓</div><p>' + esc(F.thanks || s('thanks')) + '</p>';
      if (kind === 'local' && !C.kiosk) h += '<p class="desc">' + esc(s('savedHere')) + '</p>';
      if (kind === 'local' && C.email && !C.kiosk) h += '<p class="desc">' + esc(s('mailHint')) + '</p><div class="row"><a class="btn" href="' + esc(mailto(resp)) + '">' + esc(s('mail')) + '</a></div>';
      h += '<div class="row"><button class="btn ghost" type="button">' + esc(s('another')) + '</button></div></div>';
      root.innerHTML = h + foot(); bindFoot();
      root.querySelector('.done .ghost').addEventListener('click', function () { first(); window.scrollTo(0, 0); });
      window.scrollTo(0, 0);
      if (C.kiosk && !C.embedded) setTimeout(function () { if (root.querySelector('.done')) { first(); window.scrollTo(0, 0); } }, 8000);
    }
    /* answers that could not be sent earlier are retried when the page is opened again */
    function flush() {
      if (!api) return; var d = db(); if (!d.queue.length) return;
      var ids = d.queue.slice(), next = function () {
        if (!ids.length) return; var id = ids.shift(), r = d.saved.filter(function (x) { return x.id === id; })[0];
        if (!r) return next(); r.src = 'web';
        post(r).then(function () { var cur = db(); cur.queue = cur.queue.filter(function (x) { return x !== id; }); dbPut(cur); next(); }).catch(function () {});
      };
      next();
    }
    if (F.accepting === false) root.innerHTML = '<div class="card head"><h1>' + esc(F.title) + '</h1></div><div class="card done"><p>' + esc(s('closed')) + '</p></div>';
    else { first(); flush(); }
  }

  const json = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const escHTML = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const QFIELDS = ['id', 'type', 'label', 'help', 'required', 'options', 'min', 'max', 'minLabel', 'maxLabel', 'image', 'text', 'multi', 'weekdays', 'from', 'to', 'slots', 'future'];
  /* cfg: { endpoint: 'https://server/' | null, email, kiosk, embedded, lang } */
  function pageHTML(form, formId, cfg = {}) {
    const cv = form.cover || {};
    const F = { id: formId, title: form.title || '', desc: form.desc || '', lang: form.lang || 'de', accent: form.accent || '#0FA3B1', thanks: form.thanks || '', accepting: form.accepting !== false,
      bg: form.bg || '', frame: form.frame || '', frameW: +form.frameW || 1, headerImage: form.headerImage || '',
      cover: cv.on ? { on: true, title: cv.title || '', text: cv.text || '', image: cv.image || '', button: cv.button || '' } : null,
      questions: (form.questions || []).map(q => { const o = {}; QFIELDS.forEach(k => { if (q[k] !== undefined && q[k] !== '') o[k] = q[k]; }); o.label = q.label || ''; o.required = !!q.required; return o; }) };
    const C = { endpoint: cfg.endpoint == null ? null : cfg.endpoint, email: cfg.email || '', kiosk: !!cfg.kiosk, embedded: !!cfg.embedded, lang: cfg.lang || '' };
    return `<!DOCTYPE html>
<html lang="${escHTML(F.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Office Werkstatt – Formular Werkzeug">
<title>${escHTML(F.title)}</title>
<style>${PAGE_CSS}</style>
</head>
<body>
<main id="owf" class="owf"><noscript>JavaScript is required.</noscript></main>
<script>(${OWFormRuntime.toString()})(${json(F)},${json(C)},${json(PAGE_STR)});</script>
</body>
</html>
`;
  }

  /* answers that came back by e-mail ("OWFORM:…:END") or as an exported kiosk file */
  function parseImport(text, formId) {
    const out = [];
    try {
      const o = JSON.parse(text);
      if (o && o.format === 'office-werkstatt-form-responses' && Array.isArray(o.responses)) return o.responses.filter(r => r && r.id && r.answers).map(r => Object.assign({}, r, { src: r.src || 'kiosk' }));
    } catch { /* not JSON → look for e-mail codes */ }
    const re = /OWFORM:([\sA-Za-z0-9+/=%]+?):END/g; let m;
    while ((m = re.exec(text))) {
      try {
        const raw = m[1].replace(/=\r?\n/g, '').replace(/=3D/g, '=').replace(/\s+/g, '');
        const bin = typeof atob === 'function' ? atob(raw) : Buffer.from(raw, 'base64').toString('binary');
        const o = JSON.parse(decodeURIComponent(escape(bin)));
        if (o && o.r && o.r.id && (!formId || o.f === formId)) out.push(Object.assign({}, o.r, { src: 'mail' }));
      } catch { /* damaged code – skip */ }
    }
    return out;
  }

  OW.form = { TYPES, NO_ANSWER, WITH_OPTIONS, newQuestion, newForm, answerable, rows, cells, syncExcelContent, toCSV, validate, pageHTML, parseImport, mergeResponses, fmtTime, colName, uid };
  if (typeof module === 'object' && module.exports) module.exports = OW.form;
})(typeof window !== 'undefined' ? window : globalThis);
