/* Note Werkzeug – notebooks · sections · pages with ink (layout modelled on OneNote) */
OW.editors.note = async function (ctx) {
  const t = ctx.t, I = OW.icon;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const COLORS = ['#2F6BEA', '#E0457B', '#C9A27A', '#1E9E5A', '#EA6A2A', '#7C4DDB', '#E3A21A', '#0FA3B1'];
  const nb = ctx.file.content && ctx.file.content.sections ? ctx.file.content : {
    sections: [{ id: uid(), name: t('note.quickNotes'), color: COLORS[0], pages: [{ id: uid(), title: t('note.untitled'), html: '<p><br></p>', created: Date.now(), ink: [] }] }],
  };
  let sec = nb.sections[0], pg = sec.pages[0], sort = 'manual';
  let secEl, pagesEl, pageTitle, pageDate, pageBody, inkSvg, savedRange = null;
  let pen = { on: false, color: '#7C4DDB', width: 3, eraser: false };

  const exec = (c, v = null) => { restore(); document.execCommand(c, false, v); pageBody.focus(); sync(); ctx.refresh(); };
  const q = c => { try { return document.queryCommandState(c); } catch { return false; } };
  function saveSel() { const s = getSelection(); if (s.rangeCount && pageBody.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
  function restore() { if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); } }
  ctx.saveSel = saveSel;
  function sync() { if (!pg) return; pg.html = pageBody.innerHTML; pg.title = pageTitle.value; renderPages(); ctx.markDirty(); }

  function renderSections() {
    secEl.innerHTML = `<div class="nt-nb"><span>${I('chevronDown', 14)}</span>${OW.appGlyph('note', 18)}<b>${OW.escape(ctx.file.name)}</b></div>`;
    nb.sections.forEach(s => {
      const b = document.createElement('button'); b.className = 'nt-sec' + (s === sec ? ' on' : '');
      b.innerHTML = `<i style="background:${s.color}"></i><span>${OW.escape(s.name)}</span>`;
      b.onclick = () => { sec = s; pg = s.pages[0] || null; renderAll(); };
      b.oncontextmenu = e => { e.preventDefault(); OW.popover(b, [
        { icon: 'pen', label: t('rename'), onClick: () => OW.prompt(t('rename'), s.name).then(n => { if (n) { s.name = n; renderSections(); ctx.markDirty(); } }) },
        { icon: 'palette', label: t('note.color'), onClick: () => { s.color = COLORS[(COLORS.indexOf(s.color) + 1) % COLORS.length]; renderSections(); ctx.markDirty(); } },
        { icon: 'trash', label: t('delete'), danger: true, onClick: () => { if (nb.sections.length < 2) return; nb.sections = nb.sections.filter(x => x !== s); sec = nb.sections[0]; pg = sec.pages[0]; renderAll(); ctx.markDirty(); } }]); };
      secEl.appendChild(b);
    });
    const add = document.createElement('button'); add.className = 'nt-add'; add.innerHTML = I('plus', 14) + `<span>${t('note.newSection')}</span>`;
    add.onclick = () => { const s = { id: uid(), name: t('note.section') + ' ' + (nb.sections.length + 1), color: COLORS[nb.sections.length % COLORS.length], pages: [] }; nb.sections.push(s); sec = s; newPage(); };
    secEl.appendChild(add);
  }
  function renderPages() {
    const list = sec.pages.slice(); if (sort === 'alpha') list.sort((a, b) => (a.title || '').localeCompare(b.title || '', OW.lang)); if (sort === 'date') list.sort((a, b) => b.created - a.created);
    pagesEl.innerHTML = `<div class="nt-ph"><button class="nt-addpage">${I('filePlus', 16)}<span>${t('note.addPage')}</span></button><button class="icon-btn sm nt-sort" title="${t('note.sort')}">${I('sortAZ', 16)}</button></div>`;
    list.forEach(p => {
      const b = document.createElement('button'); b.className = 'nt-page' + (p === pg ? ' on' : '');
      b.innerHTML = `<span>${OW.escape(p.title || t('note.untitled'))}</span>`;
      b.onclick = () => { pg = p; renderPage(); renderPages(); };
      b.oncontextmenu = e => { e.preventDefault(); OW.popover(b, [{ icon: 'copy', label: t('duplicate'), onClick: () => { const c = JSON.parse(JSON.stringify(p)); c.id = uid(); c.title += ' (2)'; sec.pages.push(c); renderPages(); ctx.markDirty(); } }, { icon: 'trash', label: t('delete'), danger: true, onClick: () => { sec.pages = sec.pages.filter(x => x !== p); pg = sec.pages[0] || null; renderAll(); ctx.markDirty(); } }]); };
      pagesEl.appendChild(b);
    });
    pagesEl.querySelector('.nt-addpage').onclick = newPage;
    pagesEl.querySelector('.nt-sort').onclick = e => OW.popover(e.currentTarget, [['manual', t('note.sortManual')], ['alpha', t('note.sortAlpha')], ['date', t('note.sortDate')]].map(([k, l]) => ({ label: l, checked: sort === k, onClick: () => { sort = k; renderPages(); } })));
  }
  function newPage() { const p = { id: uid(), title: '', html: '<p><br></p>', created: Date.now(), ink: [] }; sec.pages.push(p); pg = p; renderAll(); pageTitle.focus(); ctx.markDirty(); }
  function renderPage() {
    const has = !!pg; pageTitle.parentElement.parentElement.classList.toggle('empty', !has);
    if (!has) return;
    pageTitle.value = pg.title || ''; pageBody.innerHTML = pg.html || '<p><br></p>';
    pageDate.textContent = new Date(pg.created).toLocaleString(OW.lang, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    drawInk();
  }
  function renderAll() { renderSections(); renderPages(); renderPage(); ctx.refresh(); }

  /* ---------- ink layer (Draw tab) ---------- */
  function drawInk() {
    const box = pageBody.parentElement; inkSvg.setAttribute('width', box.scrollWidth); inkSvg.setAttribute('height', box.scrollHeight);
    inkSvg.innerHTML = (pg.ink || []).map(s => `<path d="${s.d}" stroke="${s.c}" stroke-width="${s.w}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${s.hl ? 'opacity=".35"' : ''}/>`).join('');
    inkSvg.classList.toggle('active', pen.on);
  }
  function bindInk() {
    inkSvg.addEventListener('pointerdown', e => {
      if (!pen.on || ctx.readOnly) return; e.preventDefault();
      const r = inkSvg.getBoundingClientRect(); const pt = ev => `${Math.round(ev.clientX - r.left)} ${Math.round(ev.clientY - r.top)}`;
      if (pen.eraser) { const hit = ev => { const el = document.elementFromPoint(ev.clientX, ev.clientY); if (el && el.tagName === 'path' && inkSvg.contains(el)) { const i = Array.from(inkSvg.children).indexOf(el); pg.ink.splice(i, 1); drawInk(); ctx.markDirty(); } }; hit(e); const mv = ev => hit(ev); const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); return; }
      const stroke = { d: 'M' + pt(e), c: pen.color, w: pen.width, hl: pen.hl }; pg.ink = pg.ink || []; pg.ink.push(stroke);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('stroke', stroke.c); path.setAttribute('stroke-width', stroke.w); path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round'); if (pen.hl) path.setAttribute('opacity', '.35'); inkSvg.appendChild(path);
      const mv = ev => { stroke.d += ' L' + pt(ev); path.setAttribute('d', stroke.d); };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); ctx.markDirty(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
  }
  const setPen = (o) => { Object.assign(pen, { on: true, eraser: false, hl: false }, o); drawInk(); ctx.refresh(); };

  const tagMenu = [['todo', '☐', t('note.tag.todo')], ['important', '⭐', t('note.tag.important')], ['question', '❓', t('note.tag.question')], ['idea', '💡', t('note.tag.idea')]].map(([k, sym, l]) => ({ label: `${sym}  ${l}`, onClick: () => exec('insertHTML', `<span class="tag tag-${k}" contenteditable="false">${sym}</span>&nbsp;`) }));
  const R = [
    { id: 'start', label: t('tab.home'), groups: [
      { items: [{ icon: 'undo', title: t('undo'), onClick: () => exec('undo') }, { icon: 'redo', title: t('redo'), onClick: () => exec('redo') }, { icon: 'brush', title: t('formatPainter'), onClick: () => exec('removeFormat') }] },
      { items: [{ t: 'select', editable: true, w: 104, options: ['Calibri', 'Aptos', 'Arial', 'Georgia', 'Segoe UI', 'Verdana'], value: 'Calibri', onChange: v => exec('fontName', v) },
        { t: 'select', editable: true, w: 64, options: ['9', '10', '11', '12', '14', '16', '20', '24', '32'], value: '11', onChange: v => { restore(); document.execCommand('fontSize', false, 7); pageBody.querySelectorAll('font[size="7"]').forEach(f => { const s = document.createElement('span'); s.style.fontSize = v + 'pt'; s.innerHTML = f.innerHTML; f.replaceWith(s); }); sync(); } }] },
      { items: [{ icon: 'bold', title: t('bold'), active: () => q('bold'), onClick: () => exec('bold') }, { icon: 'italic', title: t('italic'), active: () => q('italic'), onClick: () => exec('italic') }, { icon: 'underline', title: t('underline'), active: () => q('underline'), onClick: () => exec('underline') }, { icon: 'strike', title: t('strike'), active: () => q('strikeThrough'), onClick: () => exec('strikeThrough') },
        { t: 'color', icon: 'fontColor', title: t('fontColor'), value: '#e03131', onChange: v => exec('foreColor', v) }, { t: 'color', icon: 'highlight', title: t('highlight'), value: '#fff3a6', onChange: v => exec('hiliteColor', v) }] },
      { items: [{ icon: 'list', title: t('bullets'), onClick: () => exec('insertUnorderedList') }, { icon: 'olist', title: t('numbering'), onClick: () => exec('insertOrderedList') }, { icon: 'outdent', title: t('outdent'), onClick: () => exec('outdent') }, { icon: 'indent', title: t('indent'), onClick: () => exec('indent') },
        { t: 'menu', icon: 'alignL', title: t('align'), items: [{ icon: 'alignL', label: t('alignLeft'), onClick: () => exec('justifyLeft') }, { icon: 'alignC', label: t('alignCenter'), onClick: () => exec('justifyCenter') }, { icon: 'alignR', label: t('alignRight'), onClick: () => exec('justifyRight') }] }] },
      { items: [{ t: 'menu', icon: 'checklist', label: '', title: t('note.tags'), items: tagMenu },
        { t: 'menu', icon: 'text', label: t('note.styles'), items: [['h1', t('word.st.h1')], ['h2', t('word.st.h2')], ['h3', t('word.st.h3')], ['p', t('word.st.normal')], ['blockquote', t('word.st.quote')], ['pre', t('word.st.code')]].map(([k, l]) => ({ label: l, onClick: () => exec('formatBlock', k) })) }] },
      { items: [{ icon: 'mail', label: t('note.emailPage'), onClick: () => { location.href = `mailto:?subject=${encodeURIComponent(pg.title || '')}&body=${encodeURIComponent(pageBody.innerText)}`; } },
        { t: 'menu', icon: 'calendar', label: t('note.meeting'), items: [{ label: t('note.meetingInsert'), onClick: () => exec('insertHTML', `<h3>${t('note.meeting')} · ${new Date().toLocaleDateString(OW.lang, { dateStyle: 'full' })}</h3><p><b>${t('note.participants')}:</b> </p><p><b>${t('note.agenda')}:</b></p><ul><li><br></li></ul><p><b>${t('note.actions')}:</b></p><ul class="checks"><li>☐ </li></ul>`) }] }] },
    ] },
    { id: 'insert', label: t('tab.insert'), groups: [{ items: [
      { icon: 'table', label: t('table'), onClick: () => exec('insertHTML', '<table class="doc-table"><tr><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td></tr></table><p><br></p>') },
      { icon: 'image', label: t('image'), onClick: () => { saveSel(); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = () => { const r = new FileReader(); r.onload = () => exec('insertHTML', `<img src="${r.result}" style="max-width:100%">`); r.readAsDataURL(inp.files[0]); }; inp.click(); } },
      { icon: 'link', label: t('link'), onClick: () => { saveSel(); OW.prompt(t('link.url'), 'https://').then(u => u && exec('createLink', u)); } },
      { icon: 'calendar', label: t('date'), onClick: () => exec('insertHTML', new Date().toLocaleString(OW.lang)) },
      { icon: 'checklist', label: t('note.tag.todo'), onClick: () => exec('insertHTML', '<ul class="checks"><li>☐ </li></ul>') },
      { icon: 'filePlus', label: t('note.addPage'), onClick: newPage }] }] },
    { id: 'draw', label: t('tab.draw'), groups: [
      { items: [{ icon: 'pointer', label: t('note.typeMode'), active: () => !pen.on, onClick: () => { pen.on = false; drawInk(); } }] },
      { items: ['#1f2430', '#7C4DDB', '#2F6BEA', '#E03131', '#1E9E5A'].map(c => ({ t: 'custom', html: `<button class="pen-chip" title="${t('note.pen')}" style="--pc:${c}">${I('pen', 18)}</button>`, init: el => el.addEventListener('click', () => { setPen({ color: c, width: 3 }); document.querySelectorAll('.pen-chip').forEach(x => x.classList.toggle('on', x === el)); }) }))
        .concat([{ icon: 'highlight', label: t('highlight'), onClick: () => setPen({ color: '#ffd43b', width: 16, hl: true }) }, { icon: 'eraser', label: t('eraser'), active: () => pen.on && pen.eraser, onClick: () => setPen({ eraser: true }) }]) },
      { items: [{ icon: 'trash', label: t('note.clearInk'), onClick: () => { pg.ink = []; drawInk(); ctx.markDirty(); } }] },
    ] },
    { id: 'history', label: t('tab.history'), groups: [{ items: [{ icon: 'activity', label: t('editor.catchup'), onClick: () => ctx.root.querySelector('.ed-catchup').click() }, { icon: 'clock', label: t('note.recentEdits'), onClick: () => OW.alert(t('note.recentEdits'), nb.sections.flatMap(s => s.pages.map(p => `• ${OW.escape(p.title || t('note.untitled'))} — ${OW.escape(s.name)}`)).join('<br>')) }] }] },
    { id: 'review', label: t('tab.review'), groups: [{ items: [{ icon: 'mic', label: t('word.readAloud'), onClick: () => { if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(pageBody.innerText); u.lang = OW.lang; speechSynthesis.speak(u); } }, { icon: 'sigma', label: t('word.wordCount'), onClick: () => OW.toast(`${(pageBody.innerText.match(/\S+/g) || []).length} ${t('word.words')}`) }] }] },
    { id: 'view', label: t('tab.view'), groups: [{ items: [{ icon: 'sidebar', label: t('note.navigation'), onClick: () => ctx.root.querySelector('.nt').classList.toggle('nav-hidden') }, { icon: 'expand', label: t('focusMode'), onClick: () => ctx.root.classList.toggle('focus') }] }] },
    { id: 'help', label: t('tab.help'), groups: [{ items: [{ icon: 'app', label: t('help.about'), onClick: () => OW.about() }] }] },
  ];

  ctx.exports = [
    { label: 'HTML (.html)', hint: t('export.noteHint'), fn: () => OW.download(new Blob([`<!DOCTYPE html><meta charset="utf-8"><title>${OW.escape(ctx.file.name)}</title><body style="font-family:Calibri,sans-serif;max-width:860px;margin:40px auto">` + nb.sections.map(s => `<h1 style="color:${s.color}">${OW.escape(s.name)}</h1>` + s.pages.map(p => `<h2>${OW.escape(p.title || '')}</h2>${p.html}`).join('')).join('<hr>') + '</body>'], { type: 'text/html' }), OW.safeName(ctx.file.name) + '.html') },
    { label: 'Markdown (.md)', fn: () => OW.download(new Blob([nb.sections.map(s => `# ${s.name}\n\n` + s.pages.map(p => { const d = document.createElement('div'); d.innerHTML = p.html; return `## ${p.title || ''}\n\n${d.innerText}\n`; }).join('\n')).join('\n')], { type: 'text/markdown' }), OW.safeName(ctx.file.name) + '.md') },
    { label: 'Word (.docx)', fn: () => OW.download(OW.ooxml.htmlToDocx(`<h1>${OW.escape(pg.title || '')}</h1>` + pg.html), OW.safeName(pg.title || ctx.file.name) + '.docx') },
  ];

  return {
    ribbonMode: 'simplified',
    ribbon: () => R,
    mount(body) {
      body.innerHTML = `<div class="nt"><aside class="nt-secs"></aside><aside class="nt-pages"></aside><section class="nt-canvas"><div class="nt-paper">
        <input class="nt-title" placeholder="${t('note.titlePh')}"><div class="nt-date"></div>
        <div class="nt-bodybox"><div class="nt-body" contenteditable="true"></div><svg class="nt-ink"></svg></div>
        <div class="nt-empty">${I('note', 40)}<p>${t('note.noPage')}</p></div></div></section></div>`;
      secEl = body.querySelector('.nt-secs'); pagesEl = body.querySelector('.nt-pages'); pageTitle = body.querySelector('.nt-title'); pageDate = body.querySelector('.nt-date'); pageBody = body.querySelector('.nt-body'); inkSvg = body.querySelector('.nt-ink');
      pageTitle.addEventListener('input', sync);
      pageTitle.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pageBody.focus(); } });
      pageBody.addEventListener('input', sync);
      ['keyup', 'mouseup'].forEach(ev => pageBody.addEventListener(ev, () => { saveSel(); ctx.refresh(); }));
      pageBody.addEventListener('click', e => { const li = e.target.closest('ul.checks li'); if (li && e.offsetX < 22) { li.firstChild && (li.firstChild.nodeValue = li.textContent.startsWith('☑') ? li.firstChild.nodeValue.replace('☑', '☐') : li.firstChild.nodeValue.replace('☐', '☑')); li.classList.toggle('done'); sync(); } });
      bindInk(); renderAll();
    },
    focus() { pageTitle.focus(); },
    getContent: () => nb,
    setReadOnly(v) { pageBody.contentEditable = !v; pageTitle.readOnly = v; },
    status: () => ({ left: `${sec.name} · ${sec.pages.length} ${t('note.pages')}`, right: '' }),
  };
};
