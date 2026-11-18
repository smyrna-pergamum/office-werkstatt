/* Office Werkstatt – application shell: dashboard, file library, templates, settings */
(function () {
  const t = (k, v) => OW.t(k, v), I = OW.icon;
  const $ = s => document.querySelector(s);
  OW.escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  OW.TYPES = {
    word: { ext: 'docx', engine: 'Word Werkzeug Pro' }, excel: { ext: 'xlsx', engine: 'Excel Werkzeug Pro' }, slide: { ext: 'pptx', engine: 'Slide Werkzeug Pro' },
    note: { ext: 'note', engine: 'SilverBullet' }, draw: { ext: 'excalidraw', engine: 'Excalidraw' }, pdf: { ext: 'pdf', engine: 'PDF Werkstatt' },
  };
  const S = OW.settings = Object.assign({ theme: 'system', density: 'comfortable', view: 'grid', userName: '' }, JSON.parse(localStorage.getItem('ow-settings') || '{}'));
  const saveSettings = () => localStorage.setItem('ow-settings', JSON.stringify(S));
  let files = [], route = 'home', filter = 'all', query = '', tplType = 'all';
  OW.engines = {};

  /* ---------- theme ---------- */
  const mq = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const dark = S.theme === 'dark' || (S.theme === 'system' && mq.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('ow-theme', S.theme);
    $('#btnTheme').innerHTML = I(dark ? 'sun' : 'moon');
    document.querySelector('meta[name=theme-color]').content = dark ? '#121522' : '#6B5CF0';
  }
  OW.toggleTheme = () => { S.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; saveSettings(); applyTheme(); if (route === 'settings') renderSettings(); };
  mq.addEventListener && mq.addEventListener('change', applyTheme);

  /* ---------- UI helpers ---------- */
  OW.toast = (msg, kind = '') => { const el = document.createElement('div'); el.className = 'toast ' + kind; el.innerHTML = msg; $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 2800); setTimeout(() => el.remove(), 3200); };
  function modal(html, onMount) {
    const m = $('#modal'), card = $('#modalCard'); card.innerHTML = html; m.hidden = false;
    const close = v => { m.hidden = true; card.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', esc); res(v); };
    const esc = e => { if (e.key === 'Escape') close(null); };
    let res; const p = new Promise(r => res = r);
    m.onclick = e => { if (e.target === m) close(null); };
    document.addEventListener('keydown', esc);
    onMount && onMount(card, close);
    return p;
  }
  OW.prompt = (label, value = '') => modal(`<form class="dlg"><h3>${label}</h3><input class="inp" value="${OW.escape(value)}"><div class="dlg-btns"><button type="button" class="btn ghost" data-x>${t('cancel')}</button><button class="btn primary">${t('ok')}</button></div></form>`, (c, close) => {
    const i = c.querySelector('input'); setTimeout(() => { i.focus(); i.select(); });
    c.querySelector('form').onsubmit = e => { e.preventDefault(); close(i.value); }; c.querySelector('[data-x]').onclick = () => close(null);
  });
  OW.confirm = (msg) => modal(`<div class="dlg"><h3>${msg}</h3><div class="dlg-btns"><button class="btn ghost" data-x>${t('cancel')}</button><button class="btn danger" data-ok>${t('ok')}</button></div></div>`, (c, close) => { c.querySelector('[data-x]').onclick = () => close(false); c.querySelector('[data-ok]').onclick = () => close(true); });
  OW.alert = (title, html) => modal(`<div class="dlg"><h3>${title}</h3><div class="dlg-body">${html}</div><div class="dlg-btns"><button class="btn primary" data-x>${t('ok')}</button></div></div>`, (c, close) => c.querySelector('[data-x]').onclick = () => close(true));
  OW.about = () => OW.alert('Office Werkstatt', `<div class="about"><img src="assets/logo.svg" width="72" height="72" alt=""><div><b>Office Werkstatt 1.1</b><p>${t('about.text')}</p><p class="muted small">Word Werkzeug · Excel Werkzeug · Slide Werkzeug · Note Werkzeug · Draw Werkzeug · PDF Werkzeug</p><p class="muted small">${t('about.engines')}: Word Werkzeug Pro · Excel Werkzeug Pro · Slide Werkzeug Pro · SilverBullet · Excalidraw · PDF Werkstatt</p></div></div>`);

  /* command palette (Ctrl+K) */
  OW.palette = function ({ placeholder, items }) {
    modal(`<div class="palette"><div class="pal-in">${I('search')}<input placeholder="${placeholder}"><kbd>Esc</kbd></div><div class="pal-list"></div></div>`, (c, close) => {
      const inp = c.querySelector('input'), list = c.querySelector('.pal-list'); let idx = 0, cur = [];
      const draw = () => {
        cur = items(inp.value.trim()); idx = Math.min(idx, Math.max(0, cur.length - 1));
        list.innerHTML = cur.length ? cur.map((x, i) => `<button class="pal-item ${i === idx ? 'on' : ''}" data-i="${i}">${x.glyph ? OW.appGlyph(x.glyph, 22) : I(x.icon || 'file')}<span>${OW.escape(x.label)}</span>${x.hint ? `<small>${OW.escape(x.hint)}</small>` : ''}</button>`).join('') : `<p class="muted pal-empty">${t('search.none')}</p>`;
        list.querySelectorAll('.pal-item').forEach(b => b.onclick = () => { close(); cur[+b.dataset.i].onClick(); });
      };
      inp.oninput = () => { idx = 0; draw(); };
      inp.onkeydown = e => { if (e.key === 'ArrowDown') { idx = Math.min(cur.length - 1, idx + 1); draw(); e.preventDefault(); } if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); draw(); e.preventDefault(); } if (e.key === 'Enter' && cur[idx]) { close(); cur[idx].onClick(); } };
      draw(); setTimeout(() => inp.focus());
    });
  };
  function globalSearch() {
    OW.palette({ placeholder: t('search.placeholder'), items: q => {
      const ql = q.toLowerCase();
      const fs = files.filter(f => !f.trashed && f.name.toLowerCase().includes(ql)).sort((a, b) => b.modified - a.modified).slice(0, 8).map(f => ({ glyph: f.type, label: f.name, hint: t('type.' + f.type), onClick: () => openFile(f.id) }));
      const cmds = [...Object.keys(OW.TYPES).map(ty => ({ glyph: ty, label: t('create.' + ty), hint: t('command'), onClick: () => OW.createFile(ty) })),
        { icon: 'upload', label: t('quick.open'), hint: t('command'), onClick: () => $('#filePicker').click() },
        { icon: 'grid', label: t('nav.templates'), hint: t('command'), onClick: () => go('templates') },
        { icon: document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', label: t('theme.toggle'), hint: t('command'), onClick: OW.toggleTheme },
        { icon: 'settings', label: t('nav.settings'), hint: t('command'), onClick: () => go('settings') }].filter(c => c.label.toLowerCase().includes(ql));
      return fs.concat(cmds);
    } });
  }

  /* ---------- dates ---------- */
  function when(ts) {
    const d = new Date(ts), now = new Date(), day = 864e5;
    const sod = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((sod(now) - sod(d)) / day), time = d.toLocaleTimeString(OW.lang, { hour: '2-digit', minute: '2-digit' });
    if (diff === 0 || diff === 1) { const rel = new Intl.RelativeTimeFormat(OW.lang, { numeric: 'auto' }).format(-diff, 'day'); return rel.charAt(0).toUpperCase() + rel.slice(1) + ', ' + time; }
    return d.toLocaleDateString(OW.lang, { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const fmtSize = b => !b ? '' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  /* ---------- files ---------- */
  async function load() { files = await OW.store.list(); $('#trashCount').textContent = files.filter(f => f.trashed).length || ''; }
  OW.refresh = async () => { await load(); render(); };
  function untitled(type) { const base = t('untitled.' + type); const n = files.filter(f => f.name.startsWith(base)).length; return n ? `${base} ${n + 1}` : base; }
  OW.createFile = async function (type, opts = {}) {
    const f = { id: OW.store.uid(), type, name: opts.name || untitled(type), content: opts.content !== undefined ? JSON.parse(JSON.stringify(opts.content)) : null, created: Date.now(), modified: Date.now(), favorite: false, shared: false, trashed: false };
    if (opts.blob) { f.content = opts.blob; f.size = opts.blob.size; }
    await OW.store.put(f); await load();
    if (opts.noOpen) return f;
    openFile(f.id, true); return f;
  };
  async function openFile(id, fresh) {
    const f = await OW.store.get(id); if (!f) return OW.toast(t('file.notFound'));
    if (f.trashed) return OW.toast(t('file.inTrash'));
    OW.lastRoute = route; history.replaceState(null, '', '#/edit/' + id);
    OW.openEditor(f, { fresh });
  }
  async function update(id, patch) { const f = await OW.store.get(id); Object.assign(f, patch); await OW.store.put(f); await OW.refresh(); }
  async function duplicate(id) { const f = await OW.store.get(id); const c = Object.assign({}, f, { id: OW.store.uid(), name: f.name + ' – ' + t('copySuffix'), created: Date.now(), favorite: false, comments: [], history: [] }); await OW.store.put(c); OW.toast(t('file.duplicated')); OW.refresh(); }
  async function downloadFile(id) {
    const f = await OW.store.get(id);
    if (f.type === 'pdf' && f.content instanceof Blob) return OW.download(f.content, OW.safeName(f.name) + '.pdf');
    if (f.type === 'word' && f.content) return OW.download(OW.ooxml.htmlToDocx(f.content.html || ''), OW.safeName(f.name) + '.docx');
    if (f.type === 'excel' && f.content && f.content.sheets) return OW.download(OW.ooxml.cellsToXlsx(f.content.sheets[0].cells, f.content.sheets[0].name), OW.safeName(f.name) + '.xlsx');
    OW.download(new Blob([JSON.stringify({ format: 'office-werkstatt', version: 1, file: Object.assign({}, f, { content: f.content }) })], { type: 'application/json' }), OW.safeName(f.name) + '.owdoc');
  }
  function fileMenu(f, anchor) {
    const items = f.trashed ? [
      { icon: 'restore', label: t('trash.restore'), onClick: () => update(f.id, { trashed: false }).then(() => OW.toast(t('trash.restored'))) },
      { icon: 'trash', label: t('trash.deleteForever'), danger: true, onClick: () => OW.confirm(t('trash.confirmOne')).then(ok => ok && OW.store.remove(f.id).then(OW.refresh)) },
    ] : [
      { icon: 'arrowRight', label: t('open'), onClick: () => openFile(f.id) },
      { icon: 'pen', label: t('rename'), onClick: () => OW.prompt(t('rename'), f.name).then(n => n && update(f.id, { name: n.trim() })) },
      { icon: 'copy', label: t('duplicate'), onClick: () => duplicate(f.id) },
      { icon: 'star', label: f.favorite ? t('fav.remove') : t('fav.add'), onClick: () => update(f.id, { favorite: !f.favorite }) },
      { icon: 'users', label: f.shared ? t('share.unshare') : t('share.markShared'), onClick: () => update(f.id, { shared: !f.shared }) },
      { icon: 'download', label: t('download'), onClick: () => downloadFile(f.id) },
      '-',
      { icon: 'trash', label: t('trash.move'), danger: true, onClick: () => update(f.id, { trashed: true, trashedAt: Date.now() }).then(() => OW.toast(t('trash.moved') + ` <button class="link" onclick="OW._undoTrash('${f.id}')">${t('undo')}</button>`)) },
    ];
    OW.popover(anchor, items, { alignRight: true });
  }
  OW._undoTrash = id => update(id, { trashed: false });

  /* ---------- import (drag & drop / file picker / OS file handlers) ---------- */
  async function importFiles(fileList) {
    const list = Array.from(fileList || []); let last = null;
    for (const file of list) {
      const ext = (file.name.split('.').pop() || '').toLowerCase(), name = file.name.replace(/\.[^.]+$/, '');
      try {
        if (ext === 'pdf') last = await OW.createFile('pdf', { name, blob: file, noOpen: true });
        else if (ext === 'docx') last = await OW.createFile('word', { name, content: { html: await OW.ooxml.docxToHtml(await file.arrayBuffer()) }, noOpen: true });
        else if (['txt', 'md'].includes(ext)) last = await OW.createFile('word', { name, content: { html: (await file.text()).split(/\n/).map(l => { const m = /^(#{1,3})\s+(.*)/.exec(l); return m ? `<h${m[1].length}>${OW.escape(m[2])}</h${m[1].length}>` : `<p>${OW.escape(l) || '<br>'}</p>`; }).join('') }, noOpen: true });
        else if (['html', 'htm'].includes(ext)) { const d = new DOMParser().parseFromString(await file.text(), 'text/html'); d.querySelectorAll('script,style').forEach(x => x.remove()); last = await OW.createFile('word', { name, content: { html: d.body.innerHTML }, noOpen: true }); }
        else if (ext === 'xlsx') last = await OW.createFile('excel', { name, content: { sheets: [{ name: 'Sheet1', cells: await OW.ooxml.xlsxToCells(await file.arrayBuffer()) }], active: 0 }, noOpen: true });
        else if (ext === 'csv') { const cells = {}; OW.parseCSV(await file.text()).forEach((r, i) => r.forEach((v, j) => { if (v !== '' && j < 26) cells[String.fromCharCode(65 + j) + (i + 1)] = { v }; })); last = await OW.createFile('excel', { name, content: { sheets: [{ name, cells }], active: 0 }, noOpen: true }); }
        else if (ext === 'pptx') last = await OW.createFile('slide', { name, content: { theme: 'office', slides: await OW.ooxml.pptxToSlides(await file.arrayBuffer()) }, noOpen: true });
        else if (ext === 'excalidraw' || (ext === 'json' && /excalidraw/.test(await file.slice(0, 200).text()))) last = await OW.createFile('draw', { name, content: { elements: OW.excalidrawToElements(JSON.parse(await file.text())), view: { x: 0, y: 0, z: 1 } }, noOpen: true });
        else if (ext === 'owdoc') { const o = JSON.parse(await file.text()).file; last = await OW.createFile(o.type, { name: o.name, content: o.content, noOpen: true }); }
        else if (file.type.startsWith('image/')) { const src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); }); last = await OW.createFile('draw', { name, content: { elements: [{ id: 'img', type: 'image', src, x: 0, y: 0, w: 480, h: 320, opacity: 100 }], view: { x: 80, y: 80, z: 1 } }, noOpen: true }); }
        else { OW.toast(t('import.unsupported', { name: OW.escape(file.name) }), 'warn'); continue; }
        OW.toast(t('import.ok', { name: OW.escape(file.name) }));
      } catch (e) { console.error(e); OW.toast(t('import.failed') + ': ' + OW.escape(file.name), 'warn'); }
    }
    await OW.refresh();
    if (last && list.length === 1) openFile(last.id);
  }
  OW.importFiles = importFiles;

  /* ---------- router ---------- */
  function go(r) { location.hash = '#/' + r; }
  function onHash() {
    const h = location.hash.replace(/^#\/?/, '') || 'home';
    if (h.startsWith('edit/')) { if ($('#editorHost').hidden) openFile(h.slice(5)); return; }
    if (!$('#editorHost').hidden && OW.closeEditor) OW.closeEditor();
    route = h.split('?')[0]; query = ''; render(); closeSidebar();
  }
  function render() {
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === route));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    if (route === 'home') { renderHome(); $('#view-home').classList.add('on'); }
    else if (route === 'templates') { renderTemplates(); $('#view-templates').classList.add('on'); }
    else if (route === 'settings') { renderSettings(); $('#view-settings').classList.add('on'); }
    else { renderList(); $('#view-list').classList.add('on'); }
    $('#views').scrollTop = 0;
  }

  /* ---------- Home ---------- */
  const TOOLCARDS = ['word', 'excel', 'slide', 'note', 'draw', 'pdf'];
  const toolArt = {
    word: '<div class="art art-doc"><i></i><i></i><i></i><i></i><i></i></div>',
    excel: '<div class="art art-sheet">' + '<i></i>'.repeat(12) + '</div>',
    slide: '<div class="art art-easel"><div class="board"><span class="pie"></span><span class="ln"></span><span class="ln s"></span></div><i class="leg l"></i><i class="leg r"></i></div>',
    note: '<div class="art art-note"><div class="rings"><i></i><i></i><i></i><i></i></div><div class="pg"><i></i><i></i><i></i></div><b class="tab a"></b><b class="tab b"></b><b class="tab c"></b></div>',
    draw: '<div class="art art-draw"><svg viewBox="0 0 120 100"><rect x="10" y="12" width="100" height="78" rx="12" fill="#fff" stroke="#3a2f2a" stroke-width="3"/><rect x="48" y="22" width="30" height="20" rx="3" fill="#b9a7ff" stroke="#3a2f2a" stroke-width="2.5"/><rect x="22" y="58" width="26" height="18" rx="3" fill="#9fe0a9" stroke="#3a2f2a" stroke-width="2.5"/><path d="M84 58l10 10-10 10-10-10z" fill="#ffc46b" stroke="#3a2f2a" stroke-width="2.5"/><path d="M58 44L38 58M70 44l12 12" stroke="#3a2f2a" stroke-width="2.5" fill="none"/><path d="M96 86l14-30 6 3-14 30z" fill="#7C4DDB" stroke="#3a2f2a" stroke-width="2"/></svg><i class="spark"></i></div>',
    pdf: '<div class="art art-pdf"><i></i><i></i><i></i><b>PDF</b></div>',
  };
  function renderHome() {
    const recent = files.filter(f => !f.trashed).sort((a, b) => b.modified - a.modified).slice(0, 6);
    const hour = new Date().getHours(), greet = hour < 11 ? t('greet.morning') : hour < 18 ? t('greet.day') : t('greet.evening');
    $('#view-home').innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <div class="eyebrow">OFFICE WERKSTATT</div>
          <h1>${t('home.welcome')} <span class="swoosh">Office Werkstatt</span><i class="sparks"></i></h1>
          <p>${greet}${S.userName ? ', ' + OW.escape(S.userName) : ''}! ${t('home.subtitle')}</p>
          <div class="hero-actions">
            ${['word', 'excel', 'slide'].map(ty => `<button class="cta cta-${ty}" data-new="${ty}">${OW.appGlyph(ty, 22)}<span>${t('create.' + ty)}</span></button>`).join('')}
            <button class="cta cta-more" id="ctaMore">${I('plus', 18)}<span>${t('more')}</span></button>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="cloud c1"></div><div class="cloud c2"></div>
          <div class="laptop"><div class="scr"><i></i><i></i><i></i><i></i></div><div class="base"></div></div>
          <div class="plant"><i></i><i></i><i></i><b></b></div>
          <div class="float f-word">${OW.appGlyph('word', 30)}</div><div class="float f-excel">${OW.appGlyph('excel', 30)}</div><div class="float f-pdf">${OW.appGlyph('pdf', 30)}</div>
        </div>
      </section>
      <section class="tools">
        ${TOOLCARDS.map(ty => `<button class="tool tool-${ty}" data-new="${ty}"><div class="tool-text"><h3>${t('tool.' + ty + '.name').replace(' ', '<br>')}</h3><p>${t('tool.' + ty + '.desc')}</p></div>${toolArt[ty]}<span class="go">${I('arrowRight', 18)}</span>${OW.engines[ty] ? `<span class="eng" title="${OW.TYPES[ty].engine}">${I('bolt', 12)}${OW.TYPES[ty].engine}</span>` : ''}</button>`).join('')}
      </section>
      <section class="home-bottom">
        <div class="card recent">
          <div class="card-h"><h2>${I('clock', 22)}${t('home.recent')}</h2><a href="#/recent">${t('home.showAll')} ${I('arrowRight', 16)}</a></div>
          ${recent.length ? `<div class="rows">${recent.map(rowHTML).join('')}</div>` : `<div class="empty-mini">${I('folder', 36)}<p>${t('home.noRecent')}</p></div>`}
        </div>
        <div class="card quick">
          <h2>${I('bolt', 22)}${t('home.quickstart')}</h2>
          <button class="qs" id="qsNew"><span class="qi qi-new">${I('plus', 20)}</span><span>${t('quick.new')}</span>${I('chevronRight', 18)}</button>
          <button class="qs" id="qsOpen"><span class="qi qi-open">${I('folder', 20)}</span><span>${t('quick.open')}</span>${I('chevronRight', 18)}</button>
          <button class="qs" id="qsTpl"><span class="qi qi-tpl">${I('grid', 20)}</span><span>${t('quick.template')}</span>${I('chevronRight', 18)}</button>
          <div class="dropzone" id="dropzone">${I('upload', 22)}<span>${t('drop.zone')}</span></div>
        </div>
      </section>`;
    bindCommon($('#view-home'));
    $('#ctaMore').onclick = e => createMenu(e.currentTarget);
    $('#qsNew').onclick = e => createMenu(e.currentTarget);
    $('#qsOpen').onclick = () => $('#filePicker').click();
    $('#qsTpl').onclick = () => go('templates');
    $('#dropzone').onclick = () => $('#filePicker').click();
  }
  function rowHTML(f) {
    const loc = (f.shared ? t('nav.shared') : t('nav.files')) + ' / ' + t('type.' + f.type);
    return `<div class="row" data-open="${f.id}">${OW.appGlyph(f.type, 30)}<div class="rn"><b>${OW.escape(f.name)}<small class="ext">.${OW.TYPES[f.type].ext}</small></b><small>${loc}</small></div>
      ${f.favorite ? `<span class="fav on">${I('star', 16)}</span>` : ''}<span class="rd">${when(f.trashed ? f.trashedAt || f.modified : f.modified)}</span><button class="icon-btn sm more" data-menu="${f.id}" aria-label="${t('more')}">${I('more')}</button></div>`;
  }
  function bindCommon(root) {
    root.querySelectorAll('[data-new]').forEach(b => b.onclick = () => OW.createFile(b.dataset.new));
    root.querySelectorAll('[data-open]').forEach(r => r.onclick = e => { if (e.target.closest('[data-menu],.fav-t')) return; openFile(r.dataset.open); });
    root.querySelectorAll('[data-menu]').forEach(b => b.onclick = e => { e.stopPropagation(); fileMenu(files.find(f => f.id === b.dataset.menu), b); });
    root.querySelectorAll('.fav-t').forEach(b => b.onclick = e => { e.stopPropagation(); const f = files.find(x => x.id === b.dataset.id); update(f.id, { favorite: !f.favorite }); });
  }
  function createMenu(anchor) { OW.popover(anchor, Object.keys(OW.TYPES).map(ty => ({ glyph: ty, label: t('create.' + ty), onClick: () => OW.createFile(ty) })).concat(['-', { icon: 'upload', label: t('quick.open'), onClick: () => $('#filePicker').click() }, { icon: 'grid', label: t('quick.template'), onClick: () => go('templates') }])); }

  /* ---------- File lists (recent / files / shared / favorites / trash) ---------- */
  function renderList() {
    const titles = { recent: ['clock', t('nav.recent')], files: ['folder', t('nav.files')], shared: ['users', t('nav.shared')], favorites: ['star', t('nav.favorites')], trash: ['trash', t('nav.trash')] };
    const [ic, title] = titles[route] || titles.files;
    let list = files.filter(f => route === 'trash' ? f.trashed : !f.trashed);
    if (route === 'shared') list = list.filter(f => f.shared);
    if (route === 'favorites') list = list.filter(f => f.favorite);
    if (filter !== 'all') list = list.filter(f => f.type === filter);
    if (query) list = list.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
    const sortBy = S.sort || 'modified';
    list.sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name, OW.lang) : sortBy === 'type' ? a.type.localeCompare(b.type) : b.modified - a.modified);
    if (route === 'recent') list = list.slice(0, 30);
    const emptyMsg = { trash: t('empty.trash'), shared: t('empty.shared'), favorites: t('empty.favorites') }[route] || t('empty.files');
    $('#view-list').innerHTML = `
      <div class="page-h"><h1>${I(ic, 28)}${title}</h1>
        <div class="page-acts">
          ${route === 'trash' ? `<button class="btn danger" id="emptyTrash" ${list.length ? '' : 'disabled'}>${I('trash', 16)}<span>${t('trash.empty')}</span></button>` : `<button class="btn" id="btnUpload">${I('upload', 16)}<span>${t('upload')}</span></button><button class="btn primary" id="btnNew2">${I('plus', 16)}<span>${t('new')}</span></button>`}
        </div></div>
      <div class="list-tools">
        <div class="chips">${['all', ...Object.keys(OW.TYPES)].map(ty => `<button class="chip ${filter === ty ? 'on' : ''}" data-f="${ty}">${ty === 'all' ? t('filter.all') : OW.appGlyph(ty, 16) + t('type.' + ty)}</button>`).join('')}</div>
        <div class="lt-right">
          <label class="mini-search">${I('search', 16)}<input id="listQ" placeholder="${t('search.files')}" value="${OW.escape(query)}"></label>
          <label class="sel-sort"><select id="sortSel">${[['modified', t('sort.modified')], ['name', t('sort.name')], ['type', t('sort.type')]].map(([v, l]) => `<option value="${v}" ${sortBy === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <div class="seg"><button data-v="grid" class="${S.view === 'grid' ? 'on' : ''}" title="${t('view.grid')}">${I('grid', 16)}</button><button data-v="list" class="${S.view === 'list' ? 'on' : ''}" title="${t('view.list')}">${I('list', 16)}</button></div>
        </div></div>
      ${route === 'trash' && list.length ? `<p class="muted note-trash">${I('trash', 14)} ${t('trash.hint')}</p>` : ''}
      ${list.length ? (S.view === 'grid'
        ? `<div class="file-grid">${list.map(f => `<div class="fcard fc-${f.type}" data-open="${f.id}"><div class="fthumb">${OW.appGlyph(f.type, 44)}<span class="fext">.${OW.TYPES[f.type].ext}</span>${f.shared ? `<span class="badge">${I('users', 12)}</span>` : ''}</div><div class="fmeta"><b title="${OW.escape(f.name)}">${OW.escape(f.name)}</b><small>${when(f.trashed ? f.trashedAt || f.modified : f.modified)}${f.size ? ' · ' + fmtSize(f.size) : ''}</small></div>${route !== 'trash' ? `<button class="fav-t ${f.favorite ? 'on' : ''}" data-id="${f.id}" title="${t('fav.add')}">${I('star', 16)}</button>` : ''}<button class="icon-btn sm more" data-menu="${f.id}">${I('more')}</button></div>`).join('')}</div>`
        : `<div class="card"><div class="rows">${list.map(rowHTML).join('')}</div></div>`)
        : `<div class="empty">${I(ic, 48)}<h3>${emptyMsg}</h3>${route !== 'trash' ? `<button class="btn primary" id="emptyNew">${I('plus', 16)}<span>${t('new')}</span></button>` : ''}</div>`}`;
    bindCommon($('#view-list'));
    document.querySelectorAll('#view-list .chip').forEach(c => c.onclick = () => { filter = c.dataset.f; renderList(); });
    document.querySelectorAll('#view-list .seg button').forEach(b => b.onclick = () => { S.view = b.dataset.v; saveSettings(); renderList(); });
    $('#sortSel').onchange = e => { S.sort = e.target.value; saveSettings(); renderList(); };
    const q = $('#listQ'); q.oninput = () => { query = q.value; const pos = q.selectionStart; renderList(); const n = $('#listQ'); n.focus(); n.setSelectionRange(pos, pos); };
    if ($('#btnUpload')) $('#btnUpload').onclick = () => $('#filePicker').click();
    if ($('#btnNew2')) $('#btnNew2').onclick = e => createMenu(e.currentTarget);
    if ($('#emptyNew')) $('#emptyNew').onclick = e => createMenu(e.currentTarget);
    if ($('#emptyTrash')) $('#emptyTrash').onclick = () => OW.confirm(t('trash.confirmAll')).then(async ok => { if (!ok) return; for (const f of files.filter(x => x.trashed)) await OW.store.remove(f.id); OW.refresh(); OW.toast(t('trash.emptied')); });
  }

  /* ---------- Templates ---------- */
  function tplThumb(tp) {
    const k = tp.type, c = tp.content;
    if (k === 'word') return `<div class="tt tt-word"><div class="pg">${tp.id === 'blank' ? '' : '<b></b><i></i><i></i><i class="s"></i><i></i><i class="s"></i>'}</div></div>`;
    if (k === 'excel') return `<div class="tt tt-excel"><div class="sh">${tp.id === 'blank' ? '<i></i>'.repeat(16) : '<i class="h"></i>'.repeat(4) + '<i></i>'.repeat(12)}</div></div>`;
    if (k === 'slide') { const bg = { werkstatt: 'linear-gradient(135deg,#f3f0ff,#e6ecff)', forest: 'linear-gradient(135deg,#4caf50,#2e7d32)', sunset: 'linear-gradient(135deg,#fff1e6,#ffd9c2)' }[c && c.theme] || '#fff'; return `<div class="tt tt-slide"><div class="sl" style="background:${bg}">${tp.id === 'blank' ? '<b class="ph"></b>' : '<b></b><i></i>'}</div></div>`; }
    if (k === 'note') return `<div class="tt tt-note"><div class="nb"><span></span><span></span><span></span><div><b></b><i></i><i></i></div></div></div>`;
    if (k === 'draw') return `<div class="tt tt-draw">${tp.id === 'blank' ? '' : tp.id === 'flow' ? '<i class="o"></i><i class="r"></i><i class="d"></i>' : tp.id === 'mind' ? '<i class="o big"></i><i class="r a"></i><i class="r b"></i>' : '<i class="col"></i><i class="col"></i><i class="col"></i>'}</div>`;
    return '';
  }
  function renderTemplates() {
    const all = OW.templates().filter(tp => tplType === 'all' || tp.type === tplType);
    $('#view-templates').innerHTML = `
      <div class="page-h"><h1>${I('grid', 28)}${t('nav.templates')}</h1></div>
      <p class="muted lead">${t('tpl.lead')}</p>
      <div class="chips">${['all', 'word', 'excel', 'slide', 'note', 'draw'].map(ty => `<button class="chip ${tplType === ty ? 'on' : ''}" data-f="${ty}">${ty === 'all' ? t('filter.all') : OW.appGlyph(ty, 16) + t('type.' + ty)}</button>`).join('')}</div>
      <div class="tpl-grid">${all.map((tp, i) => `<button class="tpl tpl-${tp.type}" data-i="${i}">${tplThumb(tp)}<div class="tpl-meta">${OW.appGlyph(tp.type, 20)}<span>${tp.name}</span></div></button>`).join('')}</div>`;
    document.querySelectorAll('#view-templates .chip').forEach(c => c.onclick = () => { tplType = c.dataset.f; renderTemplates(); });
    document.querySelectorAll('#view-templates .tpl').forEach(b => b.onclick = () => { const tp = all[+b.dataset.i]; OW.createFile(tp.type, { name: tp.id === 'blank' ? undefined : tp.name, content: tp.content }); });
  }

  /* ---------- Settings ---------- */
  function renderSettings() {
    const eng = Object.keys(OW.TYPES).map(ty => `<li>${OW.appGlyph(ty, 22)}<span><b>${t('tool.' + ty + '.name')}</b><small>${OW.TYPES[ty].engine}</small></span><em class="${OW.engines[ty] ? 'ok' : ''}">${OW.engines[ty] ? t('engine.installed') : t('engine.builtin')}</em></li>`).join('');
    $('#view-settings').innerHTML = `
      <div class="page-h"><h1>${I('settings', 28)}${t('nav.settings')}</h1></div>
      <div class="set-grid">
        <div class="card set">
          <h2>${I('palette', 20)}${t('set.appearance')}</h2>
          <label>${t('set.theme')}</label>
          <div class="seg big" id="themeSeg">${[['light', 'sun', t('theme.light')], ['dark', 'moon', t('theme.dark')], ['system', 'monitor', t('theme.system')]].map(([v, ic, l]) => `<button data-v="${v}" class="${S.theme === v ? 'on' : ''}">${I(ic, 16)}<span>${l}</span></button>`).join('')}</div>
          <label>${t('set.density')}</label>
          <div class="seg big" id="densSeg">${[['comfortable', t('set.comfortable')], ['compact', t('set.compact')]].map(([v, l]) => `<button data-v="${v}" class="${S.density === v ? 'on' : ''}"><span>${l}</span></button>`).join('')}</div>
          <label>${t('set.fileView')}</label>
          <div class="seg big" id="viewSeg">${[['grid', 'grid', t('view.grid')], ['list', 'list', t('view.list')]].map(([v, ic, l]) => `<button data-v="${v}" class="${S.view === v ? 'on' : ''}">${I(ic, 16)}<span>${l}</span></button>`).join('')}</div>
        </div>
        <div class="card set">
          <h2>${I('globe', 20)}${t('set.language')}</h2>
          <div class="lang-list">${OW.LANGS.map(l => `<button data-l="${l.code}" class="${OW.lang === l.code ? 'on' : ''}"><span class="flag">${l.flag}</span><span>${l.name}</span>${OW.lang === l.code ? I('check', 16) : ''}</button>`).join('')}</div>
          <label>${t('set.name')}</label>
          <input class="inp" id="userName" value="${OW.escape(S.userName)}" placeholder="${t('user.guest')}">
        </div>
        <div class="card set">
          <h2>${I('server', 20)}${t('set.storage')}</h2>
          <p class="kv"><span>${t('set.mode')}</span><b>${OW.store.mode === 'server' ? t('storage.server') : t('storage.local')}</b></p>
          <p class="kv"><span>${t('set.files')}</span><b>${files.filter(f => !f.trashed).length}</b></p>
          <p class="kv"><span>${t('set.offline')}</span><b>${'serviceWorker' in navigator && location.protocol.startsWith('http') ? t('set.offlineReady') : t('set.offlineFile')}</b></p>
          <div class="btn-row"><button class="btn" id="exportAll">${I('download', 16)}<span>${t('set.backup')}</span></button><label class="btn">${I('upload', 16)}<span>${t('set.restore')}</span><input type="file" id="restoreInp" accept=".json" hidden></label></div>
        </div>
        <div class="card set">
          <h2>${I('monitor', 20)}${t('set.install')}</h2>
          <p class="muted">${t('set.installText')}</p>
          <div class="btn-row"><button class="btn primary" id="installBtn" ${deferredInstall ? '' : 'disabled'}>${I('download', 16)}<span>${t('set.installBtn')}</span></button></div>
          <p class="muted small">${deferredInstall ? '' : t('set.installHint')}</p>
        </div>
        <div class="card set wide ownapp">
          <div class="ownapp-art art-cubes" aria-hidden="true"><i class="c1"></i><i class="c2"></i><i class="c3"></i><b>${I('plus', 22)}</b></div>
          <h2>${I('app', 20)}${t('tool.app.name')}</h2>
          <p class="muted">${t('tool.app.desc')}</p>
          <ul class="eng-list">${(window.OW_APPS || []).map((a, i) => `<li>${OW.appGlyph('app', 22)}<span><b>${OW.escape(a.name)}</b><small>${OW.escape(a.url)}</small></span><button class="btn sm" data-app="${i}">${t('open')}</button></li>`).join('') || `<li class="muted">${t('ownapp.none')}</li>`}</ul>
          <details class="howto"><summary>${t('ownapp.howtoTitle')}</summary><p>${t('tool.app.howto')}</p></details>
        </div>
        <div class="card set wide">
          <h2>${I('app', 20)}${t('set.engines')}</h2>
          <p class="muted">${t('set.enginesText')}</p>
          <ul class="eng-list">${eng}</ul>
        </div>
      </div>`;
    document.querySelectorAll('[data-app]').forEach(b => b.onclick = () => openOwnApp(window.OW_APPS[+b.dataset.app]));
    document.querySelectorAll('#themeSeg button').forEach(b => b.onclick = () => { S.theme = b.dataset.v; saveSettings(); applyTheme(); renderSettings(); });
    document.querySelectorAll('#densSeg button').forEach(b => b.onclick = () => { S.density = b.dataset.v; saveSettings(); document.body.dataset.density = S.density; renderSettings(); });
    document.querySelectorAll('#viewSeg button').forEach(b => b.onclick = () => { S.view = b.dataset.v; saveSettings(); renderSettings(); });
    document.querySelectorAll('.lang-list button').forEach(b => b.onclick = () => OW.setLang(b.dataset.l));
    $('#userName').onchange = e => { S.userName = e.target.value.trim(); saveSettings(); OW.toast(t('saved')); };
    $('#installBtn').onclick = async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; renderSettings(); };
    $('#exportAll').onclick = async () => { const all = []; for (const f of files) { const full = await OW.store.get(f.id); if (full.content instanceof Blob) full.content = { __blob: await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(full.content); }) }; all.push(full); } OW.download(new Blob([JSON.stringify({ format: 'office-werkstatt-backup', version: 1, files: all })], { type: 'application/json' }), 'office-werkstatt-backup-' + new Date().toISOString().slice(0, 10) + '.json'); };
    $('#restoreInp').onchange = async e => { try { const o = JSON.parse(await e.target.files[0].text()); for (const f of o.files || []) { if (f.content && f.content.__blob) f.content = await (await fetch(f.content.__blob)).blob(); await OW.store.put(f); } OW.toast(t('set.restored', { n: (o.files || []).length })); OW.refresh(); } catch { OW.toast(t('import.failed'), 'warn'); } };
  }

  /* own apps (registered in engines/apps.js) open in a full-window frame */
  function openOwnApp(a) {
    const host = $('#editorHost'); host.hidden = false; document.body.classList.add('editing');
    host.innerHTML = `<div class="ed" style="--tool:var(--c-app)"><div class="ed-title"><button class="ed-back" title="${t('editor.back')}">${I('arrowLeft', 18)}</button>${OW.appGlyph('app', 22)}<b class="ed-name">${OW.escape(a.name)}</b></div><div class="ed-main"><iframe class="engine-frame" src="${OW.escape(a.url)}" title="${OW.escape(a.name)}"></iframe></div></div>`;
    host.querySelector('.ed-back').onclick = () => { host.hidden = true; host.innerHTML = ''; document.body.classList.remove('editing'); };
  }

  /* ---------- top bar ---------- */
  function renderLang() {
    const box = $('#langSwitch');
    box.innerHTML = `<span class="globe">${I('globe', 18)}</span>` + ['tr', 'de', 'en'].map(c => `<button data-l="${c}" class="${OW.lang === c ? 'on' : ''}">${c.toUpperCase()}</button>`).join('') + `<button class="more-l ${['es', 'fr'].includes(OW.lang) ? 'on' : ''}" title="${t('set.language')}">${['es', 'fr'].includes(OW.lang) ? OW.lang.toUpperCase() : I('chevronDown', 14)}</button>`;
    box.querySelectorAll('[data-l]').forEach(b => b.onclick = () => OW.setLang(b.dataset.l));
    box.querySelector('.more-l').onclick = e => OW.popover(e.currentTarget, OW.LANGS.map(l => ({ label: `${l.flag}  ${l.name}`, checked: OW.lang === l.code, onClick: () => OW.setLang(l.code) })), { alignRight: true });
  }
  OW.onLang = async () => {
    OW.applyI18n(document); renderLang(); netPill(); storagePill();
    if (!$('#editorHost').hidden && OW.currentFile && OW.closeEditor) { const id = OW.currentFile; const back = OW.lastRoute; await OW.closeEditor(); OW.lastRoute = back; await openFile(id); return; }
    render();
  };
  function netPill() { const on = navigator.onLine; $('#netPill').innerHTML = `${I(on ? 'cloudOk' : 'wifiOff', 14)}<span>${on ? t('net.online') : t('net.offline')}</span>`; $('#netPill').classList.toggle('off', !on); }
  function storagePill() { $('#storagePill').innerHTML = `${I(OW.store.mode === 'server' ? 'server' : 'lock', 14)}<span>${OW.store.mode === 'server' ? t('storage.server') : t('storage.local')}</span>`; }

  const closeSidebar = () => { document.body.classList.remove('nav-open'); };
  let deferredInstall = null;

  /* ---------- engines detection (engines/<type>/index.html) ---------- */
  async function detectEngines() {
    // 1) Office Werkstatt server / desktop app: ask the server which engines/<type>/index.html exist
    if (OW.store.mode === 'server') { try { OW.engines = await (await fetch('api/engines', { cache: 'no-store' })).json(); return; } catch { /* fall through */ } }
    // 2) static hosting or file:// – read the registry written by scripts/fetch-engines
    return new Promise(res => { const s = document.createElement('script'); s.src = 'engines/engines.js'; s.onload = () => { OW.engines = window.OW_ENGINES || {}; res(); }; s.onerror = () => res(); document.head.appendChild(s); });
  }

  /* ---------- boot ---------- */
  async function boot() {
    document.querySelectorAll('[data-icon]').forEach(e => e.innerHTML = I(e.dataset.icon));
    document.body.dataset.density = S.density;
    applyTheme(); OW.applyI18n(document); renderLang();
    await OW.store.init(); storagePill(); netPill();
    await detectEngines();
    await new Promise(res => { const s = document.createElement('script'); s.src = 'engines/apps.js'; s.onload = s.onerror = res; document.head.appendChild(s); });
    await load();
    if (!files.length && !localStorage.getItem('ow-seeded')) {
      localStorage.setItem('ow-seeded', '1');
      const tp = OW.templates();
      for (const [ty, id] of [['word', 'report'], ['excel', 'budget'], ['slide', 'project'], ['note', 'school'], ['draw', 'flow']]) { const x = tp.find(a => a.type === ty && a.id === id); await OW.createFile(ty, { name: x.name, content: x.content, noOpen: true }); }
      await load();
    }
    onHash();
    addEventListener('hashchange', onHash);
    addEventListener('online', netPill); addEventListener('offline', netPill);

    $('#btnCreate').onclick = e => createMenu(e.currentTarget);
    $('#btnSearch').onclick = globalSearch;
    $('#btnTheme').onclick = OW.toggleTheme;
    $('#btnMenu').onclick = () => document.body.classList.toggle('nav-open');
    $('#scrim').onclick = closeSidebar;
    $('#btnBell').onclick = e => { e.currentTarget.classList.remove('has-dot'); OW.popover(e.currentTarget, [{ header: t('notifications') }, { icon: 'sparkle', label: t('notif.welcome') }, { icon: navigator.onLine ? 'cloudOk' : 'wifiOff', label: t('notif.offline') }, { icon: 'upload', label: t('notif.drop') }], { alignRight: true }); };
    $('#btnUser').onclick = e => OW.popover(e.currentTarget, [{ header: OW.escape(S.userName || t('user.guest')) }, { icon: 'pen', label: t('set.name'), onClick: () => OW.prompt(t('set.name'), S.userName).then(n => { if (n !== null) { S.userName = n.trim(); saveSettings(); render(); } }) }, { icon: 'settings', label: t('nav.settings'), onClick: () => go('settings') }, { icon: 'app', label: t('help.about'), onClick: OW.about }], { alignRight: true });
    $('#filePicker').onchange = e => { importFiles(e.target.files); e.target.value = ''; };
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && $('#editorHost').hidden) { e.preventDefault(); globalSearch(); } });

    // drag & drop anywhere on the dashboard
    let depth = 0; const ov = $('#dropOverlay');
    const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    addEventListener('dragenter', e => { if (!hasFiles(e) || !$('#editorHost').hidden) return; depth++; ov.hidden = false; });
    addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; ov.hidden = true; } });
    addEventListener('dragover', e => { if (hasFiles(e) && $('#editorHost').hidden) e.preventDefault(); });
    addEventListener('drop', e => { if (!hasFiles(e) || !$('#editorHost').hidden) return; e.preventDefault(); depth = 0; ov.hidden = true; importFiles(e.dataTransfer.files); });

    // installable app (PWA) + offline cache
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (route === 'settings') renderSettings(); });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
    // files opened from the operating system (PWA file handlers)
    if ('launchQueue' in window) launchQueue.setConsumer(async p => { if (p.files && p.files.length) importFiles(await Promise.all(p.files.map(h => h.getFile()))); });
    // files opened from the desktop app (double-click / "Open with")
    if (window.owDesktop) window.owDesktop.onOpenFiles(list => importFiles(list.map(x => new File([x.data], x.name))));
    // ?new=word shortcuts from the manifest
    const nw = new URLSearchParams(location.search).get('new'); if (nw && OW.TYPES[nw]) OW.createFile(nw);
  }
  boot();
})();
