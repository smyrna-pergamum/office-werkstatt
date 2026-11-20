/* Office Werkstatt – shared editor frame
 * Title bar · tab bar (Datei/Start/…) · ribbon (simplified or classic) · body · status bar.
 * Every editor plugs into this frame, so all tools look and behave the same. */
window.OW = window.OW || {};
OW.editors = OW.editors || {};
(function () {
  const t = (k, v) => OW.t(k, v);
  const I = OW.icon;
  const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };

  /* ---------- ribbon renderer ---------- */
  function renderItem(it, ctx) {
    let el;
    switch (it.t) {
      case 'sep': return h('<span class="rb-sep"></span>');
      case 'select': {
        el = h(`<label class="rb-select ${it.editable ? 'editable' : ''}" style="width:${it.w || 120}px" title="${it.title || ''}"></label>`);
        if (it.editable) {
          const id = 'dl' + Math.random().toString(36).slice(2);
          el.innerHTML = `<input list="${id}"><datalist id="${id}">${it.options.map(o => `<option value="${typeof o === 'object' ? o.v : o}">`).join('')}</datalist><span class="chev">${I('chevronDown', 14)}</span>`;
          const inp = el.querySelector('input');
          inp.addEventListener('change', () => it.onChange(inp.value));
          inp.addEventListener('mousedown', () => ctx.saveSel && ctx.saveSel());
          it._set = v => { if (document.activeElement !== inp) inp.value = v; };
        } else {
          el.innerHTML = `<select>${it.options.map(o => typeof o === 'object' ? `<option value="${o.v}">${o.l}</option>` : `<option>${o}</option>`).join('')}</select><span class="chev">${I('chevronDown', 14)}</span>`;
          const sel = el.querySelector('select');
          sel.addEventListener('mousedown', () => ctx.saveSel && ctx.saveSel());
          sel.addEventListener('change', () => it.onChange(sel.value));
          it._set = v => { sel.value = v; };
        }
        if (it.value !== undefined) it._set(it.value);
        return el;
      }
      case 'color': {
        el = h(`<span class="rb-split" title="${it.title || ''}"><button class="rb-btn">${I(it.icon)}<i class="cbar-ind"></i></button><label class="rb-drop">${I('chevronDown', 12)}<input type="color"></label></span>`);
        const ind = el.querySelector('.cbar-ind'), inp = el.querySelector('input');
        let cur = it.value || '#e03131'; ind.style.background = cur; inp.value = cur;
        el.querySelector('button').addEventListener('mousedown', e => e.preventDefault());
        el.querySelector('button').addEventListener('click', () => it.onChange(cur));
        inp.addEventListener('mousedown', () => ctx.saveSel && ctx.saveSel());
        inp.addEventListener('input', () => { cur = inp.value; ind.style.background = cur; });
        inp.addEventListener('change', () => it.onChange(cur));
        return el;
      }
      case 'menu': {
        el = h(`<span class="rb-menu"><button class="rb-btn ${it.label ? 'wl' : ''}" title="${it.title || it.label || ''}">${it.icon ? I(it.icon) : ''}${it.label ? `<span>${it.label}</span>` : ''}${I('chevronDown', 12, 'dd')}</button></span>`);
        const b = el.querySelector('button');
        b.addEventListener('mousedown', e => { e.preventDefault(); ctx.saveSel && ctx.saveSel(); });
        b.addEventListener('click', e => { e.stopPropagation(); OW.popover(b, (typeof it.items === 'function' ? it.items() : it.items)); });
        return el;
      }
      case 'stack': {
        el = h('<span class="rb-stack"></span>');
        it.items.forEach(x => { x.small = true; el.appendChild(renderItem(x, ctx)); });
        return el;
      }
      case 'rows': {
        el = h('<span class="rb-rows"></span>');
        it.rows.forEach(row => { const r = h('<span class="rb-row"></span>'); row.forEach(x => r.appendChild(renderItem(x, ctx))); el.appendChild(r); });
        return el;
      }
      case 'custom': el = h(it.html); it.init && it.init(el); return el;
      default: { // btn
        const cls = ['rb-btn']; if (it.big) cls.push('big'); if (it.label && !it.big) cls.push('wl'); if (it.small) cls.push('small'); if (it.primary) cls.push('primary');
        el = h(`<button class="${cls.join(' ')}" title="${it.title || it.label || ''}">${I(it.icon, it.big ? 26 : 18)}${it.label ? `<span>${it.label}</span>` : ''}</button>`);
        el.addEventListener('mousedown', e => e.preventDefault()); // keep text selection in editors
        el.addEventListener('click', () => { it.onClick && it.onClick(); ctx.refresh(); });
        it._el = el;
        return el;
      }
    }
  }

  function renderRibbon(container, tab, mode, ctx) {
    container.innerHTML = '';
    container.className = 'ribbon ' + mode;
    const inner = h('<div class="ribbon-inner"></div>');
    container.appendChild(inner);
    tab.groups.forEach((g, gi) => {
      if (mode === 'simplified') {
        if (gi) inner.appendChild(h('<span class="rb-sep"></span>'));
        g.items.forEach(it => inner.appendChild(renderItem(it, ctx)));
      } else {
        const ge = h(`<div class="rb-group"><div class="rb-items"></div><div class="rb-label">${g.label || ''}</div></div>`);
        g.items.forEach(it => ge.firstElementChild.appendChild(renderItem(it, ctx)));
        inner.appendChild(ge);
      }
    });
    const collapse = h(`<button class="rb-collapse" title="${t('ribbon.collapse')}">${I('chevronDown', 16)}</button>`);
    collapse.addEventListener('click', () => container.classList.toggle('collapsed'));
    container.appendChild(collapse);
  }

  /* ---------- popover helper (used by ribbon menus and the dashboard) ---------- */
  OW.popover = function (anchor, items, opts = {}) {
    document.querySelectorAll('.popover').forEach(p => p.remove());
    const pop = h('<div class="popover" role="menu"></div>');
    items.forEach(it => {
      if (it === '-') { pop.appendChild(h('<div class="pop-sep"></div>')); return; }
      if (it.header) { pop.appendChild(h(`<div class="pop-head">${it.header}</div>`)); return; }
      if (it.html) { const x = h(it.html); pop.appendChild(x); it.init && it.init(x); return; }
      const b = h(`<button class="pop-item ${it.danger ? 'danger' : ''} ${it.checked ? 'checked' : ''}">${it.icon ? I(it.icon, 16) : (it.glyph ? OW.appGlyph(it.glyph, 18) : (it.noPad ? '' : '<span class="pi-pad"></span>'))}<span>${it.label}</span>${it.checked ? I('check', 14, 'ck') : ''}${it.hint ? `<kbd>${it.hint}</kbd>` : ''}</button>`);
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', () => { pop.remove(); it.onClick && it.onClick(); });
      pop.appendChild(b);
    });
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = opts.alignRight ? r.right - pw : r.left, y = r.bottom + 6;
    x = Math.max(8, Math.min(x, innerWidth - pw - 8));
    if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 6);
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
    setTimeout(() => {
      const close = e => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('mousedown', close); } };
      document.addEventListener('mousedown', close);
    });
    return pop;
  };

  /* ---------- download helper ---------- */
  OW.download = function (blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  OW.safeName = n => (n || 'Untitled').replace(/[\\/:*?"<>|]+/g, '_');

  /* a document saved by a Pro engine, opened where only the built-in editor exists */
  OW.blobToBuiltin = async function (file) {
    const buf = await file.content.arrayBuffer(), X = OW.ooxml, ext = (file.proExt || '').toLowerCase();
    if (file.type === 'word' && (!ext || ext === 'docx')) return { html: OW.sanitizeHTML(await X.docxToHtml(buf)) };
    if (file.type === 'excel' && (!ext || ext === 'xlsx')) return { sheets: [{ name: 'Sheet1', cells: await X.xlsxToCells(buf) }], active: 0 };
    if (file.type === 'slide' && (!ext || ext === 'pptx')) return { theme: 'office', slides: await X.pptxToSlides(buf) };
    throw new Error('needs the Werkzeug Pro engine: .' + ext);
  };

  /* ---------- the editor frame ---------- */
  OW.openEditor = async function (file, opts = {}) {
    const host = document.getElementById('editorHost');
    // Word / Excel / Slide: the full Werkzeug Pro engine is the editor whenever it is installed
    const pro = !!(OW.proEditors && OW.proEditors[file.type] && OW.engines && OW.engines[file.type]);
    const factory = pro ? OW.proEditors[file.type] : OW.editors[file.type];
    if (!factory) return;
    if (!pro && file.type !== 'pdf' && file.content instanceof Blob) {
      // saved by a Pro engine, but the engine is not available here → read it with the built-in editor
      try { file.content = await OW.blobToBuiltin(file); } catch (e) { console.error(e); return OW.toast(t('unsupported'), 'warn'); }
    }
    const T = OW.TYPES[file.type];
    host.hidden = false; host.innerHTML = '';
    document.body.classList.add('editing');

    const root = h(`<div class="ed ed-${file.type}" style="--tool:var(--c-${file.type})"></div>`);
    root.innerHTML = `
      <div class="ed-title">
        <button class="ed-back" title="${t('editor.back')}">${I('arrowLeft', 18)}</button>
        ${OW.appGlyph(file.type, 22)}
        <input class="ed-name" value="" spellcheck="false" aria-label="${t('editor.name')}">
        <span class="ed-saved" title="${t('editor.saved')}">${I('cloudOk', 18)}</span>
        <button class="ed-search">${I('search', 16)}<span>${t('editor.search')}</span><kbd>Alt + M</kbd></button>
        <div class="ed-tright">
          ${file.type !== 'ai' ? `<button class="ed-aibtn" title="${t('ai.open')}">${I('sparkle', 16)}<span>${t('ai.button')}</span></button>` : ''}
 <button class="ed-lang" title="${t('set.language')}">${I('globe', 16)}<span>${OW.lang.toUpperCase()}</span></button>
          <button class="icon-btn ed-theme" title="${t('theme.toggle')}">${I(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 18)}</button>
          <span class="ed-user">${OW.escape(OW.settings.userName || t('user.guest'))}</span>
        </div>
      </div>
      <div class="ed-tabs">
        <div class="ed-tablist" role="tablist"></div>
        <div class="ed-tabacts">
          <button class="pill-btn ed-comments">${I('comment', 16)}<span>${t('editor.comments')}</span></button>
          <button class="pill-btn ed-catchup">${I('activity', 16)}<span>${t('editor.catchup')}</span></button>
          <button class="pill-btn ed-mode">${I('pen', 16)}<span>${t('editor.editing')}</span>${I('chevronDown', 12)}</button>
          <button class="pill-btn share ed-share">${I('share', 16)}<span>${t('editor.share')}</span>${I('chevronDown', 12)}</button>
        </div>
      </div>
      <div class="ribbon"></div>
      <div class="ed-main"><div class="ed-body"></div><aside class="ed-side" hidden></aside></div>
      <div class="ed-status"><span class="st-left"></span><span class="st-right"></span></div>`;
    host.appendChild(root);

    const $ = s => root.querySelector(s);
    const nameInput = $('.ed-name'); nameInput.value = file.name;
    let dirty = false, saveTimer = null, readOnly = false, activeTab = 'start', instance;
    let revision = 0;   // every change of the document counts up (the AI agent checks it before applying and undoing)

    const ctx = {
      file, t, root,
      markDirty() {
        dirty = true; revision++; $('.ed-saved').classList.add('pending');
        clearTimeout(saveTimer); saveTimer = setTimeout(save, (instance && instance.saveDelay) || 700);
      },
      refresh() {
        if (!instance || !instance.ribbon) return;
        instance.ribbon().forEach(tab => tab.groups.forEach(g => g.items.forEach(walk)));
        function walk(it) {
          if (it.t === 'stack') return it.items.forEach(walk);
          if (it.t === 'rows') return it.rows.forEach(r => r.forEach(walk));
          if (it.active && it._el) it._el.classList.toggle('on', !!it.active());
          if (it.get && it._set) it._set(it.get());
        }
        if (instance.status) { const s = instance.status(); $('.st-left').innerHTML = s.left || ''; if (s.right !== undefined) $('.st-right').innerHTML = s.right; }
      },
      setStatus(l, r) { $('.st-left').innerHTML = l || ''; if (r !== undefined) $('.st-right').innerHTML = r; },
      toast: OW.toast,
      get readOnly() { return readOnly; },
      saveSel: null,
      exports: [],
    };

    let saveFailed = false;
    async function save() {
      if (!dirty || !instance) return true;
      dirty = false;                       // edits made while saving set it again
      try {
        file.content = await instance.getContent();
        file.name = nameInput.value.trim() || file.name;
        file.history = (file.history || []).concat([{ at: Date.now(), by: OW.settings.userName || t('user.guest') }]).slice(-20);
        await OW.store.put(file);
        if (!dirty) $('.ed-saved').classList.remove('pending', 'failed');
        if (saveFailed) { saveFailed = false; OW.toast(t('save.recovered')); }
        return true;
      } catch (e) {
        // keep the changes in memory, show it, and try again a bit later
        console.error(e); dirty = true; $('.ed-saved').classList.add('pending', 'failed');
        if (!saveFailed) OW.toast(t('save.failed') + (e.status === 401 ? ' (401)' : e.status ? ` (HTTP ${e.status})` : ''), 'warn');
        saveFailed = true; clearTimeout(saveTimer); saveTimer = setTimeout(save, 5000);
        return false;
      }
    }
    ctx.save = async () => { dirty = true; return save(); };

    instance = await factory(ctx);
    // every Help tab gets "Check for updates" (opens the releases page of the project)
    if (instance.ribbon) {
      const origRibbon = instance.ribbon.bind(instance);
      const upd = { icon: 'download', label: t('help.updates'), owUpdates: true, onClick: OW.checkUpdates };
      instance.ribbon = () => {
        const tabs = origRibbon();
        if (instance.chrome !== 'engine' && !tabs.some(x => x.id === 'help')) tabs.push({ id: 'help', label: t('tab.help'), groups: [{ items: [{ icon: 'app', label: t('help.about'), onClick: () => OW.about() }] }] });
        return tabs.map(tab => tab.id !== 'help' || tab.groups.some(g => g.items.some(i => i.owUpdates)) ? tab : Object.assign({}, tab, { groups: tab.groups.concat([{ items: [upd] }]) }));
      };
    }
    // full engines bring their own menus: no second ribbon / tab row / status bar
    if (instance.chrome === 'engine') root.classList.add('ed-engine');
    let ribbonTabs = instance.ribbon();
    const mode = instance.ribbonMode || 'simplified';

    /* tabs: "Datei" opens the backstage, the rest switch the ribbon */
    const tabs = [{ id: 'file', label: t('tab.file') }].concat(ribbonTabs.map(x => ({ id: x.id, label: x.label })));
    const tl = $('.ed-tablist');
    tabs.forEach(tb => {
      const b = h(`<button role="tab" data-tab="${tb.id}">${tb.label}</button>`);
      b.addEventListener('click', () => tb.id === 'file' ? backstage() : selectTab(tb.id));
      tl.appendChild(b);
    });
    function selectTab(id) {
      activeTab = id;
      tl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
      ribbonTabs = instance.ribbon();
      renderRibbon($('.ribbon'), ribbonTabs.find(x => x.id === id) || ribbonTabs[0], mode, ctx);
      ctx.refresh();
    }
    ctx.rebuildRibbon = () => selectTab(activeTab);

    instance.mount($('.ed-body'));
    selectTab(ribbonTabs[0].id);

    /* Word/Excel/Slide/PDF with an installed engine open directly in it (instance.chrome === 'engine'); there is no second view */
    if (opts.fresh && instance.focus) instance.focus();

    /* ----- title bar ----- */
    nameInput.addEventListener('input', () => ctx.markDirty());
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') nameInput.blur(); });
    $('.ed-back').addEventListener('click', close);
    $('.ed-theme').addEventListener('click', () => { OW.toggleTheme(); $('.ed-theme').innerHTML = I(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 18); instance.onTheme && instance.onTheme(); });
    $('.ed-search').addEventListener('click', () => commandSearch());
    /* the AI agent sees the Werkzeug's tools plus the document's revision and a whole-document snapshot / restore
       (restore reopens the editor with the earlier content: one undo for everything an agent run changed) */
    function aiAdapter() {
      const base = instance && instance.ai; if (!base) return null;
      const a = Object.create(base);
      a.module = file.type; a.docId = file.id;
      if (!base.revision) a.revision = () => revision;
      if (!base.snapshot) a.snapshot = async () => { const c = await instance.getContent(); return c instanceof Blob ? c : structuredClone(c); };
      if (!base.restore) a.restore = async snap => {
        clearTimeout(saveTimer); dirty = false;
        file.content = snap; file.history = (file.history || []).concat([{ at: Date.now(), by: 'AI ↺' }]).slice(-20);
        await OW.store.put(file);
        instance.destroy && instance.destroy();
        document.removeEventListener('keydown', keys);
        return OW.openEditor(file, { relocalize: true });
      };
      return a;
    }
    if ($('.ed-aibtn')) $('.ed-aibtn').addEventListener('click', () => OW.aiDock(root, aiAdapter));
    $('.ed-lang').addEventListener('click', e => OW.popover(e.currentTarget, OW.LANGS.map(l => ({ label: OW.escape(l.name), noPad: true, checked: OW.lang === l.code, onClick: () => OW.setLang(l.code) })), { alignRight: true }));
    OW.currentFile = file.id;

    /* ----- right-hand actions ----- */
    $('.ed-comments').addEventListener('click', () => sidePanel('comments'));
    $('.ed-catchup').addEventListener('click', () => sidePanel('catchup'));
    $('.ed-mode').addEventListener('click', e => OW.popover(e.currentTarget, [
      { icon: 'pen', label: t('editor.editing'), checked: !readOnly, onClick: () => setRO(false) },
      { icon: 'eye', label: t('editor.viewing'), checked: readOnly, onClick: () => setRO(true) },
    ], { alignRight: true }));
    $('.ed-share').addEventListener('click', e => OW.popover(e.currentTarget, [
      { icon: 'users', label: file.shared ? t('share.unshare') : t('share.markShared'), onClick: async () => { file.shared = !file.shared; await OW.store.put(file); OW.toast(file.shared ? t('share.sharedOk') : t('share.unsharedOk')); } },
      { icon: 'link', label: t('share.copyLink'), onClick: () => {
          const url = location.href.split('#')[0] + '#/edit/' + file.id;
          (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => OW.toast(t('share.linkCopied'))).catch(() => OW.toast(url));
          if (OW.store.mode !== 'server') OW.toast(t('share.localHint'));
        } },
      '-',
      ...ctx.exports.map(x => ({ icon: 'download', label: x.label, onClick: x.fn })),
    ], { alignRight: true }));

    function setRO(v) {
      readOnly = v; root.classList.toggle('readonly', v);
      $('.ed-mode span').textContent = v ? t('editor.viewing') : t('editor.editing');
      instance.setReadOnly && instance.setReadOnly(v);
    }

    function sidePanel(kind) {
      const side = $('.ed-side');
      if (!side.hidden && side.dataset.kind === kind) { side.hidden = true; return; }
      side.hidden = false; side.dataset.kind = kind;
      const fmt = ts => new Date(ts).toLocaleString(OW.lang);
      if (kind === 'comments') {
        const list = (file.comments || []).map((c, i) => `<div class="cm"><div class="cm-h"><b>${OW.escape(c.by)}</b><small>${fmt(c.at)}</small><button data-del="${i}" title="${t('delete')}">${I('x', 14)}</button></div><p>${OW.escape(c.text)}</p></div>`).join('') || `<p class="muted">${t('comments.empty')}</p>`;
        side.innerHTML = `<div class="side-h"><b>${t('editor.comments')}</b><button class="icon-btn sm">${I('x', 16)}</button></div><div class="cm-list">${list}</div><form class="cm-form"><textarea required placeholder="${t('comments.placeholder')}"></textarea><button class="btn primary">${t('comments.add')}</button></form>`;
        side.querySelector('form').addEventListener('submit', async e => {
          e.preventDefault(); const v = side.querySelector('textarea').value.trim(); if (!v) return;
          file.comments = (file.comments || []).concat([{ text: v, by: OW.settings.userName || t('user.guest'), at: Date.now() }]);
          await ctx.save(); side.hidden = true; sidePanel('comments');
        });
        side.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { file.comments.splice(+b.dataset.del, 1); await ctx.save(); side.hidden = true; sidePanel('comments'); }));
      } else {
        const hist = (file.history || []).slice().reverse().map(x => `<div class="cm"><div class="cm-h"><b>${OW.escape(x.by)}</b><small>${fmt(x.at)}</small></div><p>${t('catchup.saved')}</p></div>`).join('') || `<p class="muted">${t('catchup.empty')}</p>`;
        side.innerHTML = `<div class="side-h"><b>${t('editor.catchup')}</b><button class="icon-btn sm">${I('x', 16)}</button></div><div class="cm-list"><div class="cm"><div class="cm-h"><b>${t('catchup.created')}</b><small>${fmt(file.created)}</small></div></div>${hist}</div>`;
      }
      side.querySelector('.side-h button').addEventListener('click', () => side.hidden = true);
    }

    /* ----- backstage (Datei) ----- */
    function backstage() {
      const bs = h(`<div class="backstage"><nav><button class="bs-back">${I('arrowLeft', 18)}<span>${t('editor.back')}</span></button>
        <button data-k="info" class="on">${I('file', 18)}<span>${t('bs.info')}</span></button>
        <button data-k="new">${I('filePlus', 18)}<span>${t('new')}</span></button>
        <button data-k="save">${I('save', 18)}<span>${t('bs.save')}</span></button>
        <button data-k="export">${I('download', 18)}<span>${t('bs.export')}</span></button>
        <button data-k="print">${I('print', 18)}<span>${t('bs.print')}</span></button>
        <div class="grow"></div>
        <button data-k="close">${I('x', 18)}<span>${t('bs.close')}</span></button></nav><div class="bs-body"></div></div>`);
      root.appendChild(bs);
      const body = bs.querySelector('.bs-body');
      const show = k => {
        bs.querySelectorAll('nav [data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === k));
        if (k === 'info') body.innerHTML = `<h1>${t('bs.info')}</h1><div class="bs-info"><div>${OW.appGlyph(file.type, 64)}</div><dl>
          <dt>${t('field.name')}</dt><dd>${OW.escape(nameInput.value)}</dd><dt>${t('field.type')}</dt><dd>${t('type.' + file.type)}</dd>
          <dt>${t('field.created')}</dt><dd>${new Date(file.created).toLocaleString(OW.lang)}</dd><dt>${t('field.modified')}</dt><dd>${new Date(file.modified || file.created).toLocaleString(OW.lang)}</dd>
          <dt>${t('field.storage')}</dt><dd>${OW.store.mode === 'server' ? t('storage.server') : t('storage.local')}</dd></dl></div>`;
        if (k === 'new') { body.innerHTML = `<h1>${t('new')}</h1><div class="bs-new"></div>`; Object.keys(OW.TYPES).forEach(ty => { const b = h(`<button class="bs-tile">${OW.appGlyph(ty, 40)}<span>${t('type.' + ty)}</span></button>`); b.addEventListener('click', async () => { await close(); OW.createFile(ty); }); body.firstElementChild.nextElementSibling.appendChild(b); }); }
        if (k === 'save') { ctx.save().then(ok => ok && OW.toast(t('editor.savedNow'))); show('info'); }
        if (k === 'export') { body.innerHTML = `<h1>${t('bs.export')}</h1><div class="bs-list"></div>`; ctx.exports.forEach(x => { const b = h(`<button class="bs-row">${I('download', 20)}<span><b>${x.label}</b><small>${x.hint || ''}</small></span></button>`); b.addEventListener('click', x.fn); body.querySelector('.bs-list').appendChild(b); }); }
        if (k === 'print') { bs.remove(); (instance.print || (() => window.print()))(); }
        if (k === 'close') { bs.remove(); close(); }
      };
      bs.querySelector('.bs-back').addEventListener('click', () => bs.remove());
      bs.querySelectorAll('nav [data-k]').forEach(b => b.addEventListener('click', () => show(b.dataset.k)));
      show('info');
    }

    async function commandSearch() {
      // full engines (Word/Excel/Slide Pro) list their own commands
      if (instance.commands) { const cmds = await instance.commands(); return OW.palette({ placeholder: t('editor.searchTools'), items: q => cmds.filter(x => (x.label + ' ' + x.hint).toLowerCase().includes(q.toLowerCase())).slice(0, 14) }); }
      const all = [];
      instance.ribbon().forEach(tab => tab.groups.forEach(g => g.items.forEach(function w(it) { if (it.t === 'stack') return it.items.forEach(w); if (it.t === 'rows') return it.rows.forEach(r => r.forEach(w)); if ((it.label || it.title) && it.onClick) all.push({ label: it.label || it.title, icon: it.icon, tab: tab.label, onClick: it.onClick }); })));
      OW.palette({ placeholder: t('editor.searchTools'), items: q => all.filter(x => x.label.toLowerCase().includes(q.toLowerCase())).slice(0, 12).map(x => ({ icon: x.icon, label: x.label, hint: x.tab, onClick: () => { x.onClick(); ctx.refresh(); } })) });
    }

    async function close() {
      clearTimeout(saveTimer);
      if (!(await save()) && !(await OW.confirm(t('save.closeAnyway')))) { saveTimer = setTimeout(save, 5000); return; }
      instance.destroy && instance.destroy();
      host.hidden = true; host.innerHTML = ''; document.body.classList.remove('editing'); OW.currentFile = null;
      document.removeEventListener('keydown', keys);
      if (location.hash.startsWith('#/edit/')) history.replaceState(null, '', '#/' + (OW.lastRoute || 'home'));
      OW.refresh();
    }
    OW.closeEditor = close;
    /* language change: rebuild this editor in place (no detour over the dashboard) */
    OW.relocalizeEditor = async function () {
      if (instance.setLanguage && instance.setLanguage(OW.lang)) return rebuildChrome();
      clearTimeout(saveTimer);
      if (!(await save())) return rebuildChrome();
      instance.destroy && instance.destroy();
      document.removeEventListener('keydown', keys);
      const fresh = (await OW.store.get(file.id)) || file;
      return OW.openEditor(fresh, { relocalize: true });
    };
    function rebuildChrome() {
      // texts of the shell only (used when the content must not be reloaded, e.g. an unsaved PDF)
      ribbonTabs = instance.ribbon();
      tl.querySelectorAll('button').forEach(b => { const tb = b.dataset.tab === 'file' ? { label: t('tab.file') } : ribbonTabs.find(x => x.id === b.dataset.tab); if (tb) b.textContent = tb.label; });
      selectTab(activeTab);
      $('.ed-lang span').textContent = OW.lang.toUpperCase();
      $('.ed-back').title = t('editor.back'); $('.ed-search span').textContent = t('editor.search');
    }

    function keys(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); ctx.save().then(ok => ok && OW.toast(t('editor.savedNow'))); }
      if (e.altKey && e.key.toLowerCase() === 'm') { e.preventDefault(); commandSearch(); }
      if (e.key === 'Escape' && document.querySelector('.backstage')) document.querySelector('.backstage').remove();
    }
    document.addEventListener('keydown', keys);
    return ctx;
  };
})();
