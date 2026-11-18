/* Word Werkzeug – rich-text documents (ribbon modelled on the Word web app) */
OW.editors.word = async function (ctx) {
  const t = ctx.t, I = OW.icon;
  const c = typeof ctx.file.content === 'object' && ctx.file.content ? ctx.file.content : { html: ctx.file.content || '' };
  const page = Object.assign({ margin: 'normal', orient: 'portrait', size: 'a4', cols: 1, zoom: 100, spell: true }, c.page || {});
  let pageEl, wrap, savedRange = null, findBar;

  const exec = (cmd, val = null) => { restoreSel(); document.execCommand(cmd, false, val); pageEl.focus(); ctx.markDirty(); ctx.refresh(); };
  const q = cmd => { try { return document.queryCommandState(cmd); } catch { return false; } };
  function saveSel() { const s = getSelection(); if (s.rangeCount && pageEl.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
  function restoreSel() { if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); } }
  ctx.saveSel = saveSel;

  function setFontSize(pt) {
    restoreSel(); document.execCommand('fontSize', false, 7);
    pageEl.querySelectorAll('font[size="7"]').forEach(f => { const s = document.createElement('span'); s.style.fontSize = pt + 'pt'; s.innerHTML = f.innerHTML; f.replaceWith(s); });
    ctx.markDirty();
  }
  function curFontSize() {
    const s = getSelection(); if (!s.rangeCount || !pageEl.contains(s.anchorNode)) return '11';
    const el = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement;
    return String(Math.round(parseFloat(getComputedStyle(el).fontSize) * 0.75));
  }
  function curFont() {
    const s = getSelection(); if (!s.rangeCount || !pageEl.contains(s.anchorNode)) return 'Aptos';
    const el = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement;
    return getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '');
  }
  function curBlock() {
    const s = getSelection(); if (!s.rangeCount || !pageEl.contains(s.anchorNode)) return 'p';
    let el = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement;
    while (el && el !== pageEl) { const tg = el.tagName.toLowerCase(); if (/^(h1|h2|h3|blockquote|pre|p)$/.test(tg)) return el.classList.contains('title') ? 'title' : tg; el = el.parentElement; }
    return 'p';
  }
  function setBlock(v) {
    if (v === 'title') { exec('formatBlock', 'h1'); const s = getSelection(); let el = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement); el = el && el.closest('h1'); if (el) el.classList.add('title'); return; }
    exec('formatBlock', v);
  }
  const insertHTML = html => exec('insertHTML', html);

  function pickImage() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => insertHTML(`<img src="${r.result}" style="max-width:100%">`); r.readAsDataURL(f); };
    saveSel(); inp.click();
  }
  function tableMenu() {
    const sizes = [[2, 2], [3, 3], [4, 3], [5, 4], [6, 5]];
    return sizes.map(([cc, rr]) => ({ icon: 'table', label: `${cc} × ${rr}`, onClick: () => {
      let html = '<table class="doc-table"><tbody>';
      for (let r = 0; r < rr; r++) { html += '<tr>'; for (let k = 0; k < cc; k++) html += '<td><br></td>'; html += '</tr>'; }
      insertHTML(html + '</tbody></table><p><br></p>');
    } }));
  }
  function toc() {
    const hs = Array.from(pageEl.querySelectorAll('h1,h2,h3')).filter(x => !x.closest('.toc'));
    if (!hs.length) return OW.toast(t('word.noHeadings'));
    hs.forEach((x, i) => x.id = x.id || 'h-' + i);
    const html = `<div class="toc" contenteditable="false"><b>${t('word.toc')}</b>${hs.map(x => `<a href="#${x.id}" class="toc-${x.tagName.toLowerCase()}">${OW.escape(x.textContent)}</a>`).join('')}</div><p><br></p>`;
    const old = pageEl.querySelector('.toc'); if (old) { old.outerHTML = html; ctx.markDirty(); } else insertHTML(html);
  }
  function footnote() {
    const n = pageEl.querySelectorAll('sup.fn').length + 1;
    insertHTML(`<sup class="fn">${n}</sup>`);
    let list = pageEl.querySelector('.footnotes');
    if (!list) { list = document.createElement('div'); list.className = 'footnotes'; pageEl.appendChild(list); }
    const p = document.createElement('p'); p.innerHTML = `<sup>${n}</sup> ${t('word.footnoteText')}`; list.appendChild(p); ctx.markDirty();
  }
  function stats() {
    const txt = pageEl.innerText || '';
    return { words: (txt.match(/\S+/g) || []).length, chars: txt.replace(/\n/g, '').length, paras: pageEl.querySelectorAll('p,h1,h2,h3,li').length };
  }
  function applyPage() {
    const m = { narrow: '12.7mm', normal: '25mm', wide: '38mm' }[page.margin];
    const w = page.size === 'letter' ? 216 : 210, hh = page.size === 'letter' ? 279 : 297;
    const W = page.orient === 'portrait' ? w : hh, H = page.orient === 'portrait' ? hh : w;
    pageEl.style.width = W + 'mm'; pageEl.style.minHeight = H + 'mm'; pageEl.style.padding = m;
    pageEl.style.columnCount = page.cols; pageEl.spellcheck = page.spell;
    const avail = wrap.parentElement.clientWidth - 12, fitZ = avail > 0 ? avail / (W * 3.7795) : 1;
    wrap.style.setProperty('--zoom', Math.min(page.zoom / 100, fitZ));
    wrap.style.setProperty('--page-h', H + 'mm');
  }
  function toggleFind() {
    if (findBar) { findBar.remove(); findBar = null; return; }
    findBar = document.createElement('div'); findBar.className = 'findbar';
    findBar.innerHTML = `${I('search', 16)}<input class="f" placeholder="${t('find.find')}"><input class="r" placeholder="${t('find.replace')}"><button class="btn sm nx">${t('find.next')}</button><button class="btn sm ra">${t('find.replaceAll')}</button><button class="icon-btn sm cl">${I('x', 14)}</button>`;
    wrap.parentElement.prepend(findBar);
    const f = findBar.querySelector('.f'), r = findBar.querySelector('.r');
    f.focus();
    findBar.querySelector('.nx').onclick = () => { if (f.value && !window.find(f.value, false, false, true)) OW.toast(t('find.none')); };
    f.onkeydown = e => { if (e.key === 'Enter') findBar.querySelector('.nx').click(); };
    findBar.querySelector('.ra').onclick = () => {
      if (!f.value) return; let n = 0;
      const walker = document.createTreeWalker(pageEl, NodeFilter.SHOW_TEXT);
      const re = new RegExp(f.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      while (walker.nextNode()) { const nd = walker.currentNode; const v = nd.nodeValue.replace(re, () => { n++; return r.value; }); if (v !== nd.nodeValue) nd.nodeValue = v; }
      OW.toast(t('find.replaced', { n })); ctx.markDirty();
    };
    findBar.querySelector('.cl').onclick = toggleFind;
  }
  function speak() {
    if (!('speechSynthesis' in window)) return OW.toast(t('unsupported'));
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
    const u = new SpeechSynthesisUtterance(getSelection().toString() || pageEl.innerText); u.lang = OW.lang; speechSynthesis.speak(u);
  }
  function dictate() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return OW.toast(t('unsupported'));
    if (!navigator.onLine) return OW.toast(t('word.dictateOffline'));
    const rec = new SR(); rec.lang = OW.lang; rec.onresult = e => insertHTML(OW.escape(e.results[0][0].transcript) + ' '); rec.start(); OW.toast(t('word.listening'));
  }

  const fonts = ['Aptos', 'Calibri', 'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New', 'Segoe UI'];
  const sizes = ['8', '9', '10', '10.5', '11', '12', '14', '16', '18', '20', '24', '28', '36', '48', '72'];
  const styles = [{ v: 'p', l: t('word.st.normal') }, { v: 'title', l: t('word.st.title') }, { v: 'h1', l: t('word.st.h1') }, { v: 'h2', l: t('word.st.h2') }, { v: 'h3', l: t('word.st.h3') }, { v: 'blockquote', l: t('word.st.quote') }, { v: 'pre', l: t('word.st.code') }];
  let painter = null;

  const R = [
    { id: 'start', label: t('tab.home'), groups: [
      { items: [{ icon: 'undo', title: t('undo'), onClick: () => exec('undo') }, { icon: 'redo', title: t('redo'), onClick: () => exec('redo') }] },
      { items: [
        { t: 'menu', icon: 'clipboard', title: t('paste'), items: () => [
          { icon: 'clipboard', label: t('paste'), onClick: async () => { try { const tx = await navigator.clipboard.readText(); insertHTML(OW.escape(tx).replace(/\n/g, '<br>')); } catch { OW.toast(t('paste.hint')); } } },
          { icon: 'copy', label: t('copy'), onClick: () => exec('copy') }, { icon: 'scissors', label: t('cut'), onClick: () => exec('cut') }] },
        { icon: 'brush', title: t('formatPainter'), active: () => !!painter, onClick: () => {
          if (painter) { painter = null; return; }
          painter = { b: q('bold'), i: q('italic'), u: q('underline'), size: curFontSize(), font: curFont() }; OW.toast(t('word.painterHint'));
        } }] },
      { items: [
        { t: 'select', editable: true, w: 132, options: fonts, get: curFont, onChange: v => exec('fontName', v) },
        { t: 'select', editable: true, w: 62, options: sizes, get: curFontSize, onChange: v => setFontSize(v) },
        { icon: 'grow', title: t('fontGrow'), onClick: () => { saveSel(); setFontSize(Math.min(96, +curFontSize() + 2)); } },
        { icon: 'shrink', title: t('fontShrink'), onClick: () => { saveSel(); setFontSize(Math.max(6, +curFontSize() - 2)); } }] },
      { items: [
        { icon: 'bold', title: t('bold') + ' (Ctrl+B)', active: () => q('bold'), onClick: () => exec('bold') },
        { icon: 'italic', title: t('italic') + ' (Ctrl+I)', active: () => q('italic'), onClick: () => exec('italic') },
        { icon: 'underline', title: t('underline') + ' (Ctrl+U)', active: () => q('underline'), onClick: () => exec('underline') },
        { icon: 'strike', title: t('strike'), active: () => q('strikeThrough'), onClick: () => exec('strikeThrough') },
        { t: 'color', icon: 'highlight', title: t('highlight'), value: '#fff3a6', onChange: v => exec('hiliteColor', v) },
        { t: 'color', icon: 'fontColor', title: t('fontColor'), value: '#e03131', onChange: v => exec('foreColor', v) },
        { icon: 'eraserFmt', title: t('clearFormat'), onClick: () => { exec('removeFormat'); exec('formatBlock', 'p'); } }] },
      { items: [
        { icon: 'list', title: t('bullets'), active: () => q('insertUnorderedList'), onClick: () => exec('insertUnorderedList') },
        { icon: 'olist', title: t('numbering'), active: () => q('insertOrderedList'), onClick: () => exec('insertOrderedList') },
        { icon: 'checklist', title: t('checklist'), onClick: () => insertHTML('<ul class="checks"><li>☐ </li></ul>') },
        { icon: 'outdent', title: t('outdent'), onClick: () => exec('outdent') },
        { icon: 'indent', title: t('indent'), onClick: () => exec('indent') },
        { t: 'menu', icon: 'alignL', title: t('align'), items: [
          { icon: 'alignL', label: t('alignLeft'), onClick: () => exec('justifyLeft') }, { icon: 'alignC', label: t('alignCenter'), onClick: () => exec('justifyCenter') },
          { icon: 'alignR', label: t('alignRight'), onClick: () => exec('justifyRight') }, { icon: 'alignJ', label: t('justify'), onClick: () => exec('justifyFull') }] },
        { t: 'menu', icon: 'table', title: t('table'), items: tableMenu },
        { t: 'color', icon: 'fill', title: t('shading'), value: '#e7f0ff', onChange: v => { restoreSel(); const s = getSelection(); let el = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement); el = el && el.closest('p,h1,h2,h3,li,td,blockquote'); if (el) { el.style.background = v; ctx.markDirty(); } } }] },
      { items: [
        { t: 'select', w: 128, options: styles, get: curBlock, onChange: setBlock },
        { icon: 'search', title: t('find.find'), onClick: toggleFind },
        { icon: 'mic', label: t('dictate'), onClick: dictate },
        { t: 'custom', html: `<span class="rb-warn ${navigator.onLine ? '' : 'off'}" title="${t('word.dictateOffline')}">⚠ ${t('dictate.online')}</span>` },
        { icon: 'pen', title: t('word.editor'), active: () => page.spell, onClick: () => { page.spell = !page.spell; applyPage(); ctx.markDirty(); OW.toast(page.spell ? t('word.spellOn') : t('word.spellOff')); } }] },
    ] },
    { id: 'insert', label: t('tab.insert'), groups: [
      { items: [{ icon: 'pageBreak', label: t('word.pageBreak'), onClick: () => insertHTML('<div class="pagebreak" contenteditable="false"></div><p><br></p>') }] },
      { items: [{ t: 'menu', icon: 'table', label: t('table'), items: tableMenu }, { icon: 'image', label: t('image'), onClick: pickImage },
        { icon: 'link', label: t('link'), onClick: () => { saveSel(); OW.prompt(t('link.url'), 'https://').then(u => u && exec('createLink', u)); } },
        { icon: 'hr', label: t('word.hr'), onClick: () => exec('insertHorizontalRule') }] },
      { items: [{ icon: 'calendar', label: t('date'), onClick: () => insertHTML(new Date().toLocaleDateString(OW.lang, { dateStyle: 'long' })) },
        { t: 'menu', icon: 'sparkle', label: t('symbol'), items: ['©', '®', '™', '€', '£', '§', '°', '±', '×', '÷', '→', '✓', '•', '…', '–', '«', '»'].map(s => ({ label: s, onClick: () => insertHTML(s) })) },
        { icon: 'quote', label: t('word.st.quote'), onClick: () => exec('formatBlock', 'blockquote') },
        { icon: 'comment', label: t('comment'), onClick: () => ctx.root.querySelector('.ed-comments').click() }] },
    ] },
    { id: 'layout', label: t('tab.layout'), groups: [
      { items: [{ t: 'menu', icon: 'layout', label: t('word.margins'), items: () => ['narrow', 'normal', 'wide'].map(m => ({ label: t('word.m.' + m), checked: page.margin === m, onClick: () => { page.margin = m; applyPage(); ctx.markDirty(); } })) },
        { t: 'menu', icon: 'rotate', label: t('word.orientation'), items: () => ['portrait', 'landscape'].map(o => ({ label: t('word.o.' + o), checked: page.orient === o, onClick: () => { page.orient = o; applyPage(); ctx.markDirty(); } })) },
        { t: 'menu', icon: 'file', label: t('word.size'), items: () => [['a4', 'A4'], ['letter', 'Letter']].map(([k, l]) => ({ label: l, checked: page.size === k, onClick: () => { page.size = k; applyPage(); ctx.markDirty(); } })) },
        { t: 'menu', icon: 'split', label: t('word.columns'), items: () => [1, 2, 3].map(n => ({ label: String(n), checked: page.cols === n, onClick: () => { page.cols = n; applyPage(); ctx.markDirty(); } })) }] },
      { items: [{ icon: 'indent', label: t('indent'), onClick: () => exec('indent') }, { icon: 'outdent', label: t('outdent'), onClick: () => exec('outdent') }] },
    ] },
    { id: 'refs', label: t('tab.references'), groups: [
      { items: [{ icon: 'list', label: t('word.toc'), onClick: toc }, { icon: 'text', label: t('word.footnote'), onClick: footnote }] },
    ] },
    { id: 'review', label: t('tab.review'), groups: [
      { items: [{ icon: 'check', label: t('word.spelling'), active: () => page.spell, onClick: () => { page.spell = !page.spell; applyPage(); ctx.markDirty(); } },
        { icon: 'sigma', label: t('word.wordCount'), onClick: () => { const s = stats(); OW.alert(t('word.wordCount'), `${t('word.words')}: <b>${s.words}</b><br>${t('word.chars')}: <b>${s.chars}</b><br>${t('word.paras')}: <b>${s.paras}</b>`); } },
        { icon: 'mic', label: t('word.readAloud'), onClick: speak }] },
      { items: [{ icon: 'comment', label: t('editor.comments'), onClick: () => ctx.root.querySelector('.ed-comments').click() }, { icon: 'activity', label: t('editor.catchup'), onClick: () => ctx.root.querySelector('.ed-catchup').click() }] },
    ] },
    { id: 'view', label: t('tab.view'), groups: [
      { items: [{ icon: 'zoomOut', title: t('zoomOut'), onClick: () => { page.zoom = Math.max(50, page.zoom - 10); applyPage(); } },
        { t: 'select', w: 78, options: ['50', '75', '90', '100', '110', '125', '150', '200'].map(v => ({ v, l: v + ' %' })), get: () => String(page.zoom), onChange: v => { page.zoom = +v; applyPage(); } },
        { icon: 'zoomIn', title: t('zoomIn'), onClick: () => { page.zoom = Math.min(200, page.zoom + 10); applyPage(); } }] },
      { items: [{ icon: 'expand', label: t('focusMode'), onClick: () => ctx.root.classList.toggle('focus') }, { icon: 'print', label: t('bs.print'), onClick: () => window.print() }] },
    ] },
    { id: 'help', label: t('tab.help'), groups: [{ items: [{ icon: 'sparkle', label: t('help.shortcuts'), onClick: () => OW.alert(t('help.shortcuts'), 'Ctrl+B / I / U · Ctrl+Z / Y · Ctrl+S · Alt+M') }, { icon: 'app', label: t('help.about'), onClick: () => OW.about() }] }] },
  ];

  ctx.exports = [
    { label: 'Word (.docx)', hint: t('export.docxHint'), fn: () => OW.download(OW.ooxml.htmlToDocx(pageEl.innerHTML), OW.safeName(ctx.file.name) + '.docx') },
    { label: 'PDF', hint: t('export.pdfHint'), fn: () => window.print() },
    { label: 'HTML (.html)', fn: () => OW.download(new Blob([`<!DOCTYPE html><meta charset="utf-8"><title>${OW.escape(ctx.file.name)}</title><body style="font-family:Aptos,Calibri,sans-serif;max-width:800px;margin:40px auto">${pageEl.innerHTML}</body>`], { type: 'text/html' }), OW.safeName(ctx.file.name) + '.html') },
    { label: 'Text (.txt)', fn: () => OW.download(new Blob([pageEl.innerText], { type: 'text/plain' }), OW.safeName(ctx.file.name) + '.txt') },
  ];

  return {
    ribbonMode: 'simplified',
    ribbon: () => R,
    mount(body) {
      body.innerHTML = '<div class="doc-canvas"><div class="doc-wrap"><div class="doc-page" contenteditable="true"></div></div></div>';
      wrap = body.querySelector('.doc-wrap'); pageEl = body.querySelector('.doc-page');
      pageEl.innerHTML = OW.sanitizeHTML(c.html) || '<p><br></p>';   // file content is untrusted (imports, .owdoc, shared server)
      applyPage(); requestAnimationFrame(applyPage); addEventListener('resize', applyPage);
      pageEl.addEventListener('input', () => ctx.markDirty());
      ['keyup', 'mouseup'].forEach(ev => pageEl.addEventListener(ev, () => { saveSel(); ctx.refresh();
        if (painter && ev === 'mouseup' && !getSelection().isCollapsed) {
          const p = painter; painter = null;
          if (p.b !== q('bold')) document.execCommand('bold'); if (p.i !== q('italic')) document.execCommand('italic'); if (p.u !== q('underline')) document.execCommand('underline');
          document.execCommand('fontName', false, p.font); saveSel(); setFontSize(p.size); ctx.refresh();
        } }));
      pageEl.addEventListener('click', e => { const li = e.target.closest('ul.checks li'); if (li && e.offsetX < 22) { li.textContent = li.textContent.startsWith('☑') ? li.textContent.replace('☑', '☐') : li.textContent.replace('☐', '☑'); ctx.markDirty(); } });
      document.execCommand('styleWithCSS', false, true);
    },
    focus() { pageEl.focus(); },
    getContent: () => ({ html: pageEl.innerHTML, page }),
    setReadOnly(v) { pageEl.contentEditable = !v; },
    destroy() { removeEventListener('resize', applyPage); },
    status() {
      const s = stats();
      const r = (page.size === 'letter' ? 279 / 216 : 297 / 210), ratio = page.orient === 'portrait' ? r : 1 / r;
      const pages = Math.max(1, Math.ceil(pageEl.scrollHeight / (pageEl.offsetWidth * ratio) - 0.02));
      return { left: `${t('word.page')} 1 ${t('of')} ${pages} &nbsp;·&nbsp; ${s.words} ${t('word.words')} &nbsp;·&nbsp; ${OW.langName(OW.lang)}`, right: `${page.zoom} %` };
    },
  };
};
