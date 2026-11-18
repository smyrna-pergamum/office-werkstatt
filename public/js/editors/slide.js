/* Slide Werkzeug – presentations (ribbon modelled on PowerPoint for the web) */
/* slide themes – also used to convert older slide documents to .pptx for Slide Werkzeug Pro */
OW.SLIDE_THEMES = {
    office: { bg: '#ffffff', ink: '#1f2430', accent: '#EA6A2A', font: 'Aptos, Calibri, sans-serif', deco: 'none' },
    werkstatt: { bg: 'linear-gradient(135deg,#f3f0ff,#e6ecff)', ink: '#221d4f', accent: '#6B5CF0', font: 'Aptos, Calibri, sans-serif', deco: 'blob' },
    ocean: { bg: 'linear-gradient(160deg,#0b3d91,#1b6fd6)', ink: '#ffffff', accent: '#7fd3ff', font: 'Segoe UI, sans-serif', deco: 'wave' },
    sunset: { bg: 'linear-gradient(135deg,#fff1e6,#ffd9c2)', ink: '#4a1d0a', accent: '#EA6A2A', font: 'Georgia, serif', deco: 'bar' },
    forest: { bg: 'linear-gradient(135deg,#4caf50,#2e7d32)', ink: '#ffffff', accent: '#d7ff7a', font: 'Trebuchet MS, sans-serif', deco: 'bar' },
    night: { bg: '#141826', ink: '#e8ecf6', accent: '#ff8a5c', font: 'Segoe UI, sans-serif', deco: 'blob' },
  };
OW.editors.slide = async function (ctx) {
  const t = ctx.t, I = OW.icon;
  const W = 960, H = 540;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const THEMES = OW.SLIDE_THEMES;

  const content = ctx.file.content && ctx.file.content.slides ? ctx.file.content : { theme: 'office', slides: [] };
  if (!content.slides.length) content.slides.push(makeSlide('title', t('slide.clickTitle'), t('slide.clickSubtitle')));
  content.slides.forEach(s => { if (!s.els) { const n = makeSlide(s.layout || 'title-content', s.title, s.body); s.els = n.els; s.id = s.id || uid(); } });
  let cur = 0, selId = null, editingEl = null, savedRange = null;
  let stage, stageWrap, thumbs, notesEl;

  function makeSlide(layout, title = '', body = '') {
    const T = (y, h, size, html, extra = {}) => Object.assign({ id: uid(), type: 'text', x: 70, y, w: 820, h, html, style: { fontSize: size } }, extra);
    const els = [];
    if (layout === 'title') { els.push(T(170, 110, 52, `<b>${OW.escape(title)}</b>`, { style: { fontSize: 52, align: 'center' } })); els.push(T(300, 60, 24, OW.escape(body), { style: { fontSize: 24, align: 'center', opacity: .8 } })); }
    else if (layout === 'section') { els.push(T(200, 90, 44, `<b>${OW.escape(title)}</b>`, { style: { fontSize: 44 } })); els.push({ id: uid(), type: 'shape', x: 70, y: 300, w: 160, h: 8, style: { shape: 'rect', fill: 'accent' } }); }
    else if (layout === 'two') { els.push(T(40, 80, 36, `<b>${OW.escape(title)}</b>`)); els.push(T(140, 340, 22, '<ul><li>' + t('slide.point') + '</li></ul>', { w: 400 })); els.push(T(140, 340, 22, '<ul><li>' + t('slide.point') + '</li></ul>', { x: 490, w: 400 })); }
    else if (layout === 'blank') { /* nothing */ }
    else { els.push(T(40, 80, 36, `<b>${OW.escape(title)}</b>`)); els.push(T(140, 350, 24, body ? '<ul>' + body.split('\n').map(l => `<li>${OW.escape(l)}</li>`).join('') + '</ul>' : `<ul><li>${t('slide.point')}</li></ul>`)); }
    return { id: uid(), layout, els, notes: '', transition: 'fade', hidden: false };
  }
  const slide = () => content.slides[cur];
  const theme = () => THEMES[content.theme] || THEMES.office;
  const elById = id => slide().els.find(e => e.id === id);

  /* ---------- render ---------- */
  function decoHTML(th) {
    if (th.deco === 'blob') return `<div class="deco" style="position:absolute;right:-80px;top:-80px;width:320px;height:320px;border-radius:50%;background:${th.accent};opacity:.15"></div>`;
    if (th.deco === 'wave') return `<svg class="deco" style="position:absolute;left:0;bottom:0" width="960" height="120" viewBox="0 0 960 120"><path d="M0 60 Q240 0 480 60 T960 60 V120 H0z" fill="${th.accent}" opacity=".25"/></svg>`;
    if (th.deco === 'bar') return `<div class="deco" style="position:absolute;left:0;top:0;width:18px;height:100%;background:${th.accent}"></div>`;
    return '';
  }
  function renderSlide(s, target, interactive) {
    const th = theme();
    target.style.background = s.bg || th.bg; target.style.color = th.ink; target.style.fontFamily = th.font;
    let html = decoHTML(th);
    s.els.forEach(e => {
      const st = e.style || {};
      const base = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;`;
      if (e.type === 'text') html += `<div class="sl-el sl-text ${interactive && e.id === selId ? 'selected' : ''}" data-id="${e.id}" style="${base}font-size:${st.fontSize || 24}px;text-align:${st.align || 'left'};opacity:${st.opacity || 1};${st.color ? 'color:' + st.color + ';' : ''}${st.font ? 'font-family:' + st.font + ';' : ''}${st.fill ? 'background:' + st.fill + ';' : ''}">${e.html}</div>`;
      else if (e.type === 'image') html += `<div class="sl-el sl-img ${interactive && e.id === selId ? 'selected' : ''}" data-id="${e.id}" style="${base}"><img src="${e.src}" draggable="false"></div>`;
      else {
        const fill = st.fill === 'accent' || !st.fill ? th.accent : st.fill, stroke = st.stroke || 'none';
        const shp = { rect: `<rect x="2" y="2" width="${e.w - 4}" height="${e.h - 4}" rx="${st.rx || 6}"/>`, ellipse: `<ellipse cx="${e.w / 2}" cy="${e.h / 2}" rx="${e.w / 2 - 2}" ry="${e.h / 2 - 2}"/>`, triangle: `<polygon points="${e.w / 2},2 ${e.w - 2},${e.h - 2} 2,${e.h - 2}"/>`, arrow: `<polygon points="2,${e.h * .3} ${e.w * .65},${e.h * .3} ${e.w * .65},2 ${e.w - 2},${e.h / 2} ${e.w * .65},${e.h - 2} ${e.w * .65},${e.h * .7} 2,${e.h * .7}"/>`, star: `<polygon points="${starPts(e.w, e.h)}"/>` }[st.shape || 'rect'];
        html += `<div class="sl-el sl-shape ${interactive && e.id === selId ? 'selected' : ''}" data-id="${e.id}" style="${base}"><svg width="${e.w}" height="${e.h}" fill="${fill}" stroke="${stroke}" stroke-width="3">${shp}</svg>${e.html ? `<div class="sh-txt">${e.html}</div>` : ''}</div>`;
      }
    });
    target.innerHTML = OW.sanitizeHTML(html, { svg: true });   // slide data comes from files / the server
    if (interactive && selId) { const el = target.querySelector(`[data-id="${selId}"]`); if (el) el.insertAdjacentHTML('beforeend', '<i class="hdl nw"></i><i class="hdl ne"></i><i class="hdl sw"></i><i class="hdl se"></i>'); }
  }
  function starPts(w, h) { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.4 : 1; p.push(`${w / 2 + Math.cos(a) * r * (w / 2 - 2)},${h / 2 + Math.sin(a) * r * (h / 2 - 2)}`); } return p.join(' '); }
  function renderThumbs() {
    thumbs.innerHTML = '';
    content.slides.forEach((s, i) => {
      const d = document.createElement('div'); d.className = 'sl-thumb' + (i === cur ? ' on' : '') + (s.hidden ? ' hid' : ''); d.draggable = true;
      d.innerHTML = `<span class="num">${i + 1}</span><div class="mini"><div class="mini-stage"></div></div>`;
      renderSlide(s, d.querySelector('.mini-stage'), false);
      d.onclick = () => { finishEdit(); cur = i; selId = null; render(); };
      d.ondragstart = e => e.dataTransfer.setData('text/slide', i);
      d.ondragover = e => e.preventDefault();
      d.ondrop = e => { e.preventDefault(); const from = +e.dataTransfer.getData('text/slide'); if (isNaN(from)) return; const [m] = content.slides.splice(from, 1); content.slides.splice(i, 0, m); cur = i; render(); ctx.markDirty(); };
      thumbs.appendChild(d);
    });
  }
  function fit() { if (!stageWrap) return; const r = stageWrap.getBoundingClientRect(); const sc = Math.min((r.width - 48) / W, (r.height - 40) / H); stage.style.transform = `scale(${Math.max(.2, sc)})`; stage.parentElement.style.width = W * sc + 'px'; stage.parentElement.style.height = H * sc + 'px'; scale = sc; }
  let scale = 1;
  function render() { renderSlide(slide(), stage, true); renderThumbs(); notesEl.value = slide().notes || ''; fit(); ctx.refresh(); }
  const changed = () => { renderThumbs(); ctx.markDirty(); };

  /* ---------- interactions ---------- */
  function finishEdit() {
    if (!editingEl) return;
    const e = elById(editingEl.dataset.id); if (e) e.html = editingEl.innerHTML;
    editingEl.contentEditable = false; editingEl.classList.remove('editing'); editingEl = null; changed();
  }
  function bindStage() {
    stage.addEventListener('pointerdown', ev => {
      const elx = ev.target.closest('.sl-el');
      if (editingEl && elx === editingEl) return;
      finishEdit();
      if (!elx) { selId = null; renderSlide(slide(), stage, true); ctx.refresh(); return; }
      selId = elx.dataset.id; const e = elById(selId);
      renderSlide(slide(), stage, true); ctx.refresh();
      if (ctx.readOnly) return;
      const hdl = ev.target.classList.contains('hdl') ? ev.target.className.split(' ')[1] : null;
      const sx = ev.clientX, sy = ev.clientY, o = { x: e.x, y: e.y, w: e.w, h: e.h }; let movedAny = false;
      const mv = m => {
        const dx = (m.clientX - sx) / scale, dy = (m.clientY - sy) / scale; if (Math.abs(dx) + Math.abs(dy) > 2) movedAny = true;
        if (!hdl) { e.x = Math.round(o.x + dx); e.y = Math.round(o.y + dy); }
        else { if (hdl.includes('e')) e.w = Math.max(20, Math.round(o.w + dx)); if (hdl.includes('s')) e.h = Math.max(20, Math.round(o.h + dy)); if (hdl.includes('w')) { e.x = Math.round(o.x + dx); e.w = Math.max(20, Math.round(o.w - dx)); } if (hdl.includes('n')) { e.y = Math.round(o.y + dy); e.h = Math.max(20, Math.round(o.h - dy)); } }
        renderSlide(slide(), stage, true);
      };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (movedAny) changed(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
    stage.addEventListener('dblclick', ev => {
      if (ctx.readOnly) return;
      const elx = ev.target.closest('.sl-text, .sl-shape'); if (!elx) return;
      const e = elById(elx.dataset.id);
      let target = elx;
      if (e.type === 'shape') { if (!elx.querySelector('.sh-txt')) elx.insertAdjacentHTML('beforeend', '<div class="sh-txt"></div>'); target = elx.querySelector('.sh-txt'); target.dataset.id = e.id; }
      elx.querySelectorAll('.hdl').forEach(h => h.remove());
      target.contentEditable = true; target.classList.add('editing'); target.focus(); editingEl = target;
      const r = document.createRange(); r.selectNodeContents(target); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    stage.addEventListener('keyup', () => saveSel()); stage.addEventListener('mouseup', () => saveSel());
    stage.addEventListener('input', () => ctx.markDirty());
  }
  function saveSel() { const s = getSelection(); if (editingEl && s.rangeCount && editingEl.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
  ctx.saveSel = saveSel;
  function fmt(cmd, val, styleKey, styleVal) {
    if (editingEl && (styleKey === 'fontSize' || styleKey === 'font')) finishEdit();
    if (editingEl) { if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); } document.execCommand(cmd, false, val); ctx.markDirty(); return; }
    const e = selId && elById(selId); if (!e) return OW.toast(t('slide.selectFirst'));
    if (styleKey) { e.style = e.style || {}; e.style[styleKey] = styleVal; }
    else { e.html = `<span style="${{ bold: 'font-weight:700', italic: 'font-style:italic', underline: 'text-decoration:underline' }[cmd] || ''}">${e.html}</span>`; }
    renderSlide(slide(), stage, true); changed();
  }
  function addEl(e) { if (ctx.readOnly) return; slide().els.push(e); selId = e.id; render(); ctx.markDirty(); }
  const addShape = shape => addEl({ id: uid(), type: 'shape', x: 380, y: 190, w: 200, h: shape === 'arrow' ? 110 : 160, html: '', style: { shape, fill: 'accent' } });
  function addImage() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const sc = Math.min(1, 500 / img.width, 360 / img.height); addEl({ id: uid(), type: 'image', src: r.result, x: 230, y: 90, w: Math.round(img.width * sc), h: Math.round(img.height * sc) }); }; img.src = r.result; }; r.readAsDataURL(f); }; inp.click(); }
  function deleteSel() { if (selId) { slide().els = slide().els.filter(e => e.id !== selId); selId = null; render(); ctx.markDirty(); } else if (content.slides.length > 1) { content.slides.splice(cur, 1); cur = Math.max(0, cur - 1); render(); ctx.markDirty(); } }
  function newSlide(layout = 'title-content') { content.slides.splice(cur + 1, 0, makeSlide(layout, layout === 'title' ? t('slide.clickTitle') : t('slide.newTitle'), '')); cur++; selId = null; render(); ctx.markDirty(); }
  function designIdea() { const keys = Object.keys(THEMES); content.theme = keys[(keys.indexOf(content.theme) + 1) % keys.length]; render(); ctx.markDirty(); OW.toast(t('slide.designApplied', { name: content.theme })); }

  /* ---------- presenter ---------- */
  function present(from = 0) {
    finishEdit();
    const list = content.slides.map((s, i) => ({ s, i })).filter(x => !x.s.hidden);
    let idx = Math.max(0, list.findIndex(x => x.i >= from));
    const ov = document.createElement('div'); ov.className = 'presenter';
    ov.innerHTML = `<div class="pr-stage-box"><div class="pr-stage"></div></div><div class="pr-bar"><button class="pv">${I('arrowLeft', 18)}</button><span class="pc"></span><button class="nx">${I('arrowRight', 18)}</button><button class="ex">${I('x', 18)}</button></div>`;
    document.body.appendChild(ov);
    const st = ov.querySelector('.pr-stage');
    const show = (dir = 1) => {
      const sl = list[idx].s; renderSlide(sl, st, false);
      const sc = Math.min(innerWidth / W, innerHeight / H); st.style.transform = `scale(${sc})`;
      st.className = 'pr-stage tr-' + (sl.transition || 'fade') + (dir < 0 ? ' back' : ''); void st.offsetWidth; st.classList.add('in');
      ov.querySelector('.pc').textContent = `${idx + 1} / ${list.length}`;
    };
    const go = d => { const n = idx + d; if (n < 0) return; if (n >= list.length) return exit(); idx = n; show(d); };
    const key = e => { if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) go(1); else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) go(-1); else if (e.key === 'Escape') exit(); };
    function exit() { removeEventListener('keydown', key); removeEventListener('resize', rs); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); ov.remove(); }
    const rs = () => show(0);
    addEventListener('keydown', key); addEventListener('resize', rs);
    ov.querySelector('.pv').onclick = e => { e.stopPropagation(); go(-1); }; ov.querySelector('.nx').onclick = e => { e.stopPropagation(); go(1); }; ov.querySelector('.ex').onclick = e => { e.stopPropagation(); exit(); };
    ov.querySelector('.pr-stage-box').onclick = () => go(1);
    if (ov.requestFullscreen) ov.requestFullscreen().catch(() => {});
    show(1);
  }

  const shapesMenu = [['rect', 'square', t('shape.rect')], ['ellipse', 'circle', t('shape.ellipse')], ['triangle', 'shapes', t('shape.triangle')], ['arrow', 'arrowRight', t('shape.arrow')], ['star', 'star', t('shape.star')]].map(([s, ic, l]) => ({ icon: ic, label: l, onClick: () => addShape(s) }));
  const layoutsMenu = () => [['title', t('slide.l.title')], ['title-content', t('slide.l.content')], ['two', t('slide.l.two')], ['section', t('slide.l.section')], ['blank', t('slide.l.blank')]];
  const selStyle = () => { const e = selId && elById(selId); return (e && e.style) || {}; };
  const R = [
    { id: 'start', label: t('tab.home'), groups: [
      { items: [{ icon: 'undo', title: t('undo'), onClick: () => document.execCommand('undo') }] },
      { items: [{ t: 'menu', icon: 'clipboard', title: t('paste'), items: () => [{ icon: 'copy', label: t('slide.duplicate'), onClick: () => { const c = JSON.parse(JSON.stringify(slide())); c.id = uid(); c.els.forEach(e => e.id = uid()); content.slides.splice(cur + 1, 0, c); cur++; render(); ctx.markDirty(); } }] },
        { icon: 'brush', title: t('formatPainter'), onClick: () => OW.toast(t('slide.selectFirst')) }, { icon: 'trash', title: t('delete'), onClick: deleteSel }] },
      { items: [{ t: 'menu', icon: 'plus', label: t('slide.new'), items: () => layoutsMenu().map(([k, l]) => ({ icon: 'layout', label: l, onClick: () => newSlide(k) })) },
        { t: 'menu', icon: 'layout', title: t('slide.layout'), items: () => layoutsMenu().map(([k, l]) => ({ label: l, onClick: () => { const n = makeSlide(k, (slide().els[0] && slide().els[0].html.replace(/<[^>]+>/g, '')) || '', ''); slide().els = n.els; slide().layout = k; render(); ctx.markDirty(); } })) },
        { icon: 'eye', title: t('slide.hide'), active: () => slide().hidden, onClick: () => { slide().hidden = !slide().hidden; changed(); } }] },
      { items: [{ t: 'select', editable: true, w: 120, options: ['Aptos', 'Calibri', 'Arial', 'Georgia', 'Segoe UI', 'Trebuchet MS', 'Verdana'], get: () => selStyle().font || '', onChange: v => fmt('fontName', v, 'font', v) },
        { t: 'select', editable: true, w: 66, options: ['12', '14', '18', '20', '24', '28', '32', '36', '44', '54', '66', '80'], get: () => String(selStyle().fontSize || ''), onChange: v => fmt('fontSize', 7, 'fontSize', +v) },
        { icon: 'grow', title: t('fontGrow'), onClick: () => fmt('increaseFontSize', null, 'fontSize', (selStyle().fontSize || 24) + 4) }, { icon: 'shrink', title: t('fontShrink'), onClick: () => fmt('decreaseFontSize', null, 'fontSize', Math.max(8, (selStyle().fontSize || 24) - 4)) }] },
      { items: [{ icon: 'bold', title: t('bold'), onClick: () => fmt('bold') }, { icon: 'italic', title: t('italic'), onClick: () => fmt('italic') }, { icon: 'underline', title: t('underline'), onClick: () => fmt('underline') },
        { t: 'color', icon: 'highlight', title: t('highlight'), value: '#fff3a6', onChange: v => fmt('hiliteColor', v, 'fill', v) }, { t: 'color', icon: 'fontColor', title: t('fontColor'), value: '#e03131', onChange: v => fmt('foreColor', v, 'color', v) }] },
      { items: [{ icon: 'list', title: t('bullets'), onClick: () => fmt('insertUnorderedList') }, { icon: 'olist', title: t('numbering'), onClick: () => fmt('insertOrderedList') },
        { t: 'menu', icon: 'alignL', title: t('align'), items: [['left', 'alignL', t('alignLeft')], ['center', 'alignC', t('alignCenter')], ['right', 'alignR', t('alignRight')]].map(([a, ic, l]) => ({ icon: ic, label: l, onClick: () => fmt('justify' + a[0].toUpperCase() + a.slice(1), null, 'align', a) })) },
        { icon: 'outdent', title: t('outdent'), onClick: () => fmt('outdent') }, { icon: 'indent', title: t('indent'), onClick: () => fmt('indent') }] },
      { items: [{ t: 'menu', icon: 'shapes', label: t('shapes'), items: shapesMenu },
        { t: 'color', icon: 'fill', title: t('fillColor'), value: '#EA6A2A', onChange: v => { const e = selId && elById(selId); if (!e) return OW.toast(t('slide.selectFirst')); e.style = e.style || {}; e.style.fill = v; render(); ctx.markDirty(); } },
        { t: 'color', icon: 'pen', title: t('outline'), value: '#1f2430', onChange: v => { const e = selId && elById(selId); if (!e) return; e.style.stroke = v; render(); ctx.markDirty(); } },
        { t: 'menu', icon: 'layers', title: t('arrange'), items: [{ label: t('toFront'), onClick: () => { const e = elById(selId); if (!e) return; slide().els = slide().els.filter(x => x !== e).concat([e]); render(); ctx.markDirty(); } }, { label: t('toBack'), onClick: () => { const e = elById(selId); if (!e) return; slide().els = [e].concat(slide().els.filter(x => x !== e)); render(); ctx.markDirty(); } }] }] },
      { items: [{ icon: 'search', title: t('find.find'), onClick: () => ctx.root.querySelector('.ed-search').click() }, { icon: 'wand', label: t('slide.designer'), onClick: designIdea }] },
    ] },
    { id: 'insert', label: t('tab.insert'), groups: [
      { items: [{ t: 'menu', icon: 'plus', label: t('slide.new'), items: () => layoutsMenu().map(([k, l]) => ({ icon: 'layout', label: l, onClick: () => newSlide(k) })) }] },
      { items: [{ icon: 'text', label: t('slide.textbox'), onClick: () => addEl({ id: uid(), type: 'text', x: 280, y: 220, w: 400, h: 80, html: t('slide.typeHere'), style: { fontSize: 28 } }) },
        { icon: 'image', label: t('image'), onClick: addImage }, { t: 'menu', icon: 'shapes', label: t('shapes'), items: shapesMenu },
        { icon: 'table', label: t('table'), onClick: () => addEl({ id: uid(), type: 'text', x: 120, y: 160, w: 720, h: 220, html: '<table class="sl-table"><tr><th>A</th><th>B</th><th>C</th></tr><tr><td>1</td><td>2</td><td>3</td></tr><tr><td>4</td><td>5</td><td>6</td></tr></table>', style: { fontSize: 22 } }) }] },
    ] },
    { id: 'draw', label: t('tab.draw'), groups: [{ items: [{ icon: 'pencil', label: t('slide.openDraw'), onClick: () => OW.createFile('draw') }] }] },
    { id: 'design', label: t('tab.design'), groups: [
      { items: Object.keys(THEMES).map(k => ({ t: 'custom', html: `<button class="theme-chip ${content.theme === k ? 'on' : ''}" title="${k}" style="background:${THEMES[k].bg};color:${THEMES[k].ink}"><b style="background:${THEMES[k].accent}"></b>Aa</button>`, init: el => { el.addEventListener('click', () => { content.theme = k; render(); ctx.markDirty(); ctx.rebuildRibbon(); }); } })) },
      { items: [{ t: 'color', icon: 'fill', title: t('slide.background'), value: '#ffffff', onChange: v => { slide().bg = v; render(); ctx.markDirty(); } }, { icon: 'wand', label: t('slide.designer'), onClick: designIdea }] },
    ] },
    { id: 'transitions', label: t('tab.transitions'), groups: [{ items: ['none', 'fade', 'push', 'zoom', 'flip'].map(tr => ({ icon: 'transition', label: t('slide.tr.' + tr), active: () => (slide().transition || 'fade') === tr, onClick: () => { slide().transition = tr; ctx.markDirty(); } })).concat([{ t: 'sep' }, { icon: 'check', label: t('slide.applyAll'), onClick: () => { content.slides.forEach(s => s.transition = slide().transition); ctx.markDirty(); OW.toast(t('slide.applied')); } }]) }] },
    { id: 'anim', label: t('tab.animations'), groups: [{ items: [{ icon: 'play', label: t('slide.preview'), onClick: () => present(cur) }] }] },
    { id: 'show', label: t('tab.slideshow'), groups: [{ items: [{ icon: 'present', label: t('slide.fromStart'), onClick: () => present(0) }, { icon: 'play', label: t('slide.fromCurrent'), onClick: () => present(cur) }, { icon: 'eye', label: t('slide.hide'), active: () => slide().hidden, onClick: () => { slide().hidden = !slide().hidden; changed(); } }] }] },
    { id: 'review', label: t('tab.review'), groups: [{ items: [{ icon: 'comment', label: t('editor.comments'), onClick: () => ctx.root.querySelector('.ed-comments').click() }] }] },
    { id: 'view', label: t('tab.view'), groups: [{ items: [{ icon: 'note', label: t('slide.notes'), active: () => !notesEl.hidden, onClick: () => { notesEl.hidden = !notesEl.hidden; fit(); } }, { icon: 'sidebar', label: t('slide.thumbs'), active: () => !thumbs.hidden, onClick: () => { thumbs.hidden = !thumbs.hidden; fit(); } }] }] },
    { id: 'help', label: t('tab.help'), groups: [{ items: [{ icon: 'sparkle', label: t('help.shortcuts'), onClick: () => OW.alert(t('help.shortcuts'), t('slide.shortcuts')) }, { icon: 'app', label: t('help.about'), onClick: () => OW.about() }] }] },
  ];

  ctx.exports = [
    { label: 'PowerPoint (.pptx)', hint: t('export.pptxHint'), fn: () => { finishEdit(); OW.download(OW.ooxml.slidesToPptx(content, THEMES), OW.safeName(ctx.file.name) + '.pptx'); } },
    { label: 'PDF', hint: t('export.slidesPdfHint'), fn: () => printSlides() },
    { label: 'HTML (.html)', hint: t('export.slidesHtmlHint'), fn: () => { const box = document.createElement('div'); const parts = content.slides.map(s => { renderSlide(s, box, false); return `<section style="position:relative;width:${W}px;height:${H}px;margin:20px auto;overflow:hidden;box-shadow:0 4px 20px #0003;background:${box.style.background};color:${box.style.color};font-family:${box.style.fontFamily}">${box.innerHTML}</section>`; }); OW.download(new Blob([`<!DOCTYPE html><meta charset="utf-8"><title>${OW.escape(ctx.file.name)}</title><style>.sl-el{position:absolute}.sl-img img{width:100%;height:100%;object-fit:contain}.sh-txt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff}</style><body style="background:#ddd">${parts.join('')}</body>`], { type: 'text/html' }), OW.safeName(ctx.file.name) + '.html'); } },
  ];
  function printSlides() {
    const box = document.createElement('div'); box.className = 'print-slides';
    content.slides.forEach(s => { const p = document.createElement('div'); p.className = 'print-slide'; renderSlide(s, p, false); box.appendChild(p); });
    document.body.appendChild(box); document.body.classList.add('printing-slides'); window.print();
    setTimeout(() => { box.remove(); document.body.classList.remove('printing-slides'); }, 500);
  }

  const onResize = () => fit();
  return {
    ribbonMode: 'simplified',
    ribbon: () => R,
    mount(body) {
      body.innerHTML = `<div class="sl"><div class="sl-thumbs"></div><div class="sl-center"><div class="sl-stage-wrap"><div class="sl-stage-box"><div class="sl-stage"></div></div></div><textarea class="sl-notes" placeholder="${t('slide.notesPh')}"></textarea></div></div>`;
      thumbs = body.querySelector('.sl-thumbs'); stage = body.querySelector('.sl-stage'); stageWrap = body.querySelector('.sl-stage-wrap'); notesEl = body.querySelector('.sl-notes');
      notesEl.addEventListener('input', () => { slide().notes = notesEl.value; ctx.markDirty(); });
      bindStage(); render();
      addEventListener('resize', onResize); setTimeout(fit, 50);
      // present button next to "Teilen" like PowerPoint
      const b = document.createElement('button'); b.className = 'pill-btn'; b.innerHTML = I('present', 16) + `<span>${t('slide.present')}</span>`; b.onclick = () => present(cur);
      ctx.root.querySelector('.ed-tabacts').insertBefore(b, ctx.root.querySelector('.ed-mode'));
      ctx.root.addEventListener('keydown', e => { if ((e.key === 'Delete') && !editingEl && selId && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') deleteSel(); if (e.key === 'F5') { e.preventDefault(); present(0); } });
    },
    getContent: () => { finishEdit(); return content; },
    status: () => ({ left: `${t('slide.slide')} ${cur + 1} ${t('of')} ${content.slides.length} &nbsp;·&nbsp; ${OW.langName(OW.lang)}`, right: Math.round(scale * 100) + ' %' }),
    destroy() { removeEventListener('resize', onResize); },
    print: printSlides,
  };
};
