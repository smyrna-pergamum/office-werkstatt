/* Draw Werkzeug – hand-drawn whiteboard & diagrams (inspired by Excalidraw, .excalidraw import/export) */
OW.editors.draw = async function (ctx) {
  const t = ctx.t, I = OW.icon;
  const data = ctx.file.content && ctx.file.content.elements ? ctx.file.content : { elements: [], view: { x: 0, y: 0, z: 1 } };
  let els = data.elements, view = data.view || { x: 0, y: 0, z: 1 };
  let tool = 'select', selIds = new Set(), canvas, g, wrap, props, textBox = null;
  const style = { stroke: '#1e1e1e', bg: 'transparent', fill: 'hachure', sw: 2, ss: 'solid', rough: 1, opacity: 100, fs: 24 };
  const undo = [], redo = [];
  const uid = () => Math.random().toString(36).slice(2, 10);
  const snap = () => { undo.push(JSON.stringify(els)); if (undo.length > 100) undo.shift(); redo.length = 0; };
  const dark = () => document.documentElement.dataset.theme === 'dark';

  /* ---------- seeded "rough" rendering ---------- */
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  function rline(x1, y1, x2, y2, r, R) {
    const len = Math.hypot(x2 - x1, y2 - y1), off = Math.min(len * 0.04, 2.2) * r;
    for (let pass = 0; pass < (r ? 2 : 1); pass++) {
      const j = () => (R() - 0.5) * 2 * off;
      g.beginPath(); g.moveTo(x1 + j(), y1 + j());
      g.quadraticCurveTo((x1 + x2) / 2 + j() * 1.5, (y1 + y2) / 2 + j() * 1.5, x2 + j(), y2 + j()); g.stroke();
    }
  }
  function shapePath(e) {
    const p = new Path2D(), x = e.x, y = e.y, w = e.w, h = e.h;
    if (e.type === 'rectangle') p.rect(x, y, w, h);
    else if (e.type === 'ellipse') p.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    else if (e.type === 'diamond') { p.moveTo(x + w / 2, y); p.lineTo(x + w, y + h / 2); p.lineTo(x + w / 2, y + h); p.lineTo(x, y + h / 2); p.closePath(); }
    return p;
  }
  function drawEl(e) {
    const R = rng(e.seed || 1), r = e.rough;
    g.save(); g.globalAlpha = (e.opacity || 100) / 100;
    let stroke = e.stroke; if (dark() && (stroke === '#1e1e1e' || stroke === '#000000')) stroke = '#e8e8e8';
    g.strokeStyle = stroke; g.lineWidth = e.sw; g.lineCap = 'round'; g.lineJoin = 'round';
    g.setLineDash(e.ss === 'dashed' ? [10, 8] : e.ss === 'dotted' ? [2, 7] : []);
    if (['rectangle', 'ellipse', 'diamond'].includes(e.type)) {
      if (e.bg && e.bg !== 'transparent') {
        const p = shapePath(e);
        if (e.fill === 'solid') { g.fillStyle = e.bg; g.fill(p); }
        else { g.save(); g.clip(p); g.strokeStyle = e.bg; g.lineWidth = Math.max(1, e.sw / 2); g.setLineDash([]); const gap = 8 + e.sw * 2; for (let d = -Math.abs(e.h); d < Math.abs(e.w) + Math.abs(e.h); d += gap) { g.beginPath(); g.moveTo(Math.min(e.x, e.x + e.w) + d, Math.min(e.y, e.y + e.h)); g.lineTo(Math.min(e.x, e.x + e.w) + d - Math.abs(e.h), Math.max(e.y, e.y + e.h)); g.stroke(); } g.restore(); }
      }
      if (e.type === 'rectangle') { const x = e.x, y = e.y, w = e.w, h = e.h; rline(x, y, x + w, y, r, R); rline(x + w, y, x + w, y + h, r, R); rline(x + w, y + h, x, y + h, r, R); rline(x, y + h, x, y, r, R); }
      else if (e.type === 'diamond') { const x = e.x, y = e.y, w = e.w, h = e.h; rline(x + w / 2, y, x + w, y + h / 2, r, R); rline(x + w, y + h / 2, x + w / 2, y + h, r, R); rline(x + w / 2, y + h, x, y + h / 2, r, R); rline(x, y + h / 2, x + w / 2, y, r, R); }
      else { for (let pass = 0; pass < (r ? 2 : 1); pass++) { const j = () => (R() - .5) * 3 * r; g.beginPath(); g.ellipse(e.x + e.w / 2 + j(), e.y + e.h / 2 + j(), Math.abs(e.w / 2) + j(), Math.abs(e.h / 2) + j(), (R() - .5) * .05 * r, 0, Math.PI * 2); g.stroke(); } }
      if (e.text && !e._editing) label(e, stroke);
    } else if (e.type === 'line' || e.type === 'arrow') {
      const pts = e.points.map(([px, py]) => [e.x + px, e.y + py]);
      for (let i = 1; i < pts.length; i++) rline(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], r, R);
      if (e.type === 'arrow' && pts.length > 1) { const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]]; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 14 + e.sw * 2; g.setLineDash([]); rline(b[0], b[1], b[0] - L * Math.cos(ang - .45), b[1] - L * Math.sin(ang - .45), r, R); rline(b[0], b[1], b[0] - L * Math.cos(ang + .45), b[1] - L * Math.sin(ang + .45), r, R); }
    } else if (e.type === 'freedraw') {
      g.setLineDash([]); g.beginPath(); e.points.forEach(([px, py], i) => i ? g.lineTo(e.x + px, e.y + py) : g.moveTo(e.x + px, e.y + py)); g.stroke();
    } else if (e.type === 'text') {
      if (e._editing) { g.restore(); return; }
      g.fillStyle = stroke; g.font = `${e.fs}px "Segoe Print","Comic Sans MS","Bradley Hand",cursive`; g.textBaseline = 'top';
      (e.text || '').split('\n').forEach((ln, i) => g.fillText(ln, e.x, e.y + i * e.fs * 1.25));
    } else if (e.type === 'image' && e.src) {
      let img = imgCache[e.id]; if (!img) { img = imgCache[e.id] = new Image(); img.onload = draw; img.src = e.src; }
      if (img.complete) g.drawImage(img, e.x, e.y, e.w, e.h);
    }
    g.restore();
  }
  const imgCache = {};
  function label(e, color) { g.fillStyle = color; g.font = `${e.fs || 20}px "Segoe Print","Comic Sans MS",cursive`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.setLineDash([]); const ls = e.text.split('\n'); ls.forEach((ln, i) => g.fillText(ln, e.x + e.w / 2, e.y + e.h / 2 + (i - (ls.length - 1) / 2) * (e.fs || 20) * 1.2)); g.textAlign = 'left'; }
  function measure(e) { if (e.type !== 'text') return; g.font = `${e.fs}px "Segoe Print","Comic Sans MS",cursive`; const ls = (e.text || '').split('\n'); e.w = Math.max(20, ...ls.map(l => g.measureText(l).width)); e.h = ls.length * e.fs * 1.25; }
  function bbox(e) { if (e.points) { const xs = e.points.map(p => p[0]), ys = e.points.map(p => p[1]); return { x: e.x + Math.min(...xs), y: e.y + Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; } return { x: Math.min(e.x, e.x + e.w), y: Math.min(e.y, e.y + e.h), w: Math.abs(e.w), h: Math.abs(e.h) }; }

  function draw() {
    const dpr = devicePixelRatio || 1, W = wrap.clientWidth, H = wrap.clientHeight;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    // dotted grid
    g.fillStyle = dark() ? '#2c2f3a' : '#dfe3ea'; const step = 24 * view.z, ox = view.x % step, oy = view.y % step;
    for (let x = ox; x < W; x += step) for (let y = oy; y < H; y += step) g.fillRect(x, y, 1.4, 1.4);
    g.setTransform(dpr * view.z, 0, 0, dpr * view.z, dpr * view.x, dpr * view.y);
    els.forEach(drawEl);
    // selection
    g.setLineDash([5, 4]); g.strokeStyle = '#6B5CF0'; g.lineWidth = 1 / view.z;
    els.filter(e => selIds.has(e.id)).forEach(e => { const b = bbox(e), p = 6 / view.z; g.strokeRect(b.x - p, b.y - p, b.w + 2 * p, b.h + 2 * p); g.setLineDash([]); g.fillStyle = '#fff'; if (selIds.size === 1) [[b.x - p, b.y - p], [b.x + b.w + p, b.y - p], [b.x - p, b.y + b.h + p], [b.x + b.w + p, b.y + b.h + p]].forEach(([hx, hy]) => { const s = 8 / view.z; g.fillRect(hx - s / 2, hy - s / 2, s, s); g.strokeRect(hx - s / 2, hy - s / 2, s, s); }); g.setLineDash([5, 4]); });
    if (marquee) { g.setLineDash([]); g.fillStyle = 'rgba(107,92,240,.08)'; g.fillRect(marquee.x, marquee.y, marquee.w, marquee.h); g.strokeRect(marquee.x, marquee.y, marquee.w, marquee.h); }
    renderProps();
  }
  let marquee = null;

  /* ---------- hit testing ---------- */
  const toWorld = (cx, cy) => { const r = canvas.getBoundingClientRect(); return [(cx - r.left - view.x) / view.z, (cy - r.top - view.y) / view.z]; };
  const segDist = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let tt = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; tt = Math.max(0, Math.min(1, tt)); return Math.hypot(px - x1 - tt * dx, py - y1 - tt * dy); };
  function hit(px, py) {
    const tol = 8 / view.z;
    for (let i = els.length - 1; i >= 0; i--) {
      const e = els[i];
      if (e.points) { const pts = e.points.map(([a, b]) => [e.x + a, e.y + b]); for (let k = 1; k < pts.length; k++) if (segDist(px, py, ...pts[k - 1], ...pts[k]) < tol + e.sw) return e; if (pts.length === 1 && Math.hypot(px - pts[0][0], py - pts[0][1]) < tol) return e; continue; }
      const b = bbox(e);
      const filled = (e.bg && e.bg !== 'transparent') || e.type === 'text' || e.type === 'image' || e.text;
      const inside = px >= b.x - tol && px <= b.x + b.w + tol && py >= b.y - tol && py <= b.y + b.h + tol;
      if (!inside) continue;
      if (filled) return e;
      const nearEdge = px < b.x + tol || px > b.x + b.w - tol || py < b.y + tol || py > b.y + b.h - tol;
      if (nearEdge || e.type === 'ellipse' || e.type === 'diamond') return e;
    }
    return null;
  }
  function handleAt(px, py) { if (selIds.size !== 1) return null; const e = els.find(x => selIds.has(x.id)); if (!e || e.points) return null; const b = bbox(e), p = 6 / view.z, s = 8 / view.z; const hs = { nw: [b.x - p, b.y - p], ne: [b.x + b.w + p, b.y - p], sw: [b.x - p, b.y + b.h + p], se: [b.x + b.w + p, b.y + b.h + p] }; for (const [k, [hx, hy]] of Object.entries(hs)) if (Math.abs(px - hx) < s && Math.abs(py - hy) < s) return { k, e }; return null; }

  /* ---------- pointer logic ---------- */
  let action = null, spaceDown = false;
  function onDown(ev) {
    if (textBox) commitText();
    canvas.setPointerCapture(ev.pointerId);
    const [px, py] = toWorld(ev.clientX, ev.clientY);
    if (tool === 'hand' || spaceDown || ev.button === 1) { action = { type: 'pan', sx: ev.clientX, sy: ev.clientY, vx: view.x, vy: view.y }; return; }
    if (ctx.readOnly) return;
    if (tool === 'select') {
      const hdl = handleAt(px, py);
      if (hdl) { snap(); action = { type: 'resize', k: hdl.k, e: hdl.e, o: Object.assign({}, hdl.e), px, py }; return; }
      const e = hit(px, py);
      if (e) { if (!selIds.has(e.id)) { if (!ev.shiftKey) selIds.clear(); selIds.add(e.id); } snap(); action = { type: 'move', px, py, orig: els.filter(x => selIds.has(x.id)).map(x => [x, x.x, x.y]), moved: false }; }
      else { selIds.clear(); action = { type: 'marquee', px, py }; }
      draw(); return;
    }
    if (tool === 'eraser') { snap(); action = { type: 'erase' }; eraseAt(px, py); return; }
    if (tool === 'text') { openText(px, py); return; }
    snap();
    const e = Object.assign({ id: uid(), seed: Math.floor(Math.random() * 1e9), x: px, y: py, w: 0, h: 0 }, { type: tool, stroke: style.stroke, bg: style.bg, fill: style.fill, sw: style.sw, ss: style.ss, rough: style.rough, opacity: style.opacity, fs: style.fs });
    if (tool === 'line' || tool === 'arrow' || tool === 'freedraw') e.points = [[0, 0]];
    els.push(e); action = { type: 'create', e, px, py };
  }
  function onMove(ev) {
    if (!action) { if (tool === 'select') { const [px, py] = toWorld(ev.clientX, ev.clientY); const hd = handleAt(px, py); canvas.style.cursor = hd ? (hd.k === 'nw' || hd.k === 'se' ? 'nwse-resize' : 'nesw-resize') : hit(px, py) ? 'move' : 'default'; } return; }
    const [px, py] = toWorld(ev.clientX, ev.clientY);
    if (action.type === 'pan') { view.x = action.vx + ev.clientX - action.sx; view.y = action.vy + ev.clientY - action.sy; }
    else if (action.type === 'move') { action.moved = true; action.orig.forEach(([e, ox, oy]) => { e.x = ox + px - action.px; e.y = oy + py - action.py; }); }
    else if (action.type === 'resize') { const { e, o, k } = action, dx = px - action.px, dy = py - action.py; if (k.includes('e')) e.w = o.w + dx; if (k.includes('s')) e.h = o.h + dy; if (k.includes('w')) { e.x = o.x + dx; e.w = o.w - dx; } if (k.includes('n')) { e.y = o.y + dy; e.h = o.h - dy; } if (e.type === 'text') { e.fs = Math.max(8, Math.round(o.fs * Math.abs(e.h) / Math.max(1, o.h))); measure(e); } }
    else if (action.type === 'marquee') { marquee = { x: Math.min(px, action.px), y: Math.min(py, action.py), w: Math.abs(px - action.px), h: Math.abs(py - action.py) }; selIds = new Set(els.filter(e => { const b = bbox(e); return b.x >= marquee.x && b.y >= marquee.y && b.x + b.w <= marquee.x + marquee.w && b.y + b.h <= marquee.y + marquee.h; }).map(e => e.id)); }
    else if (action.type === 'erase') eraseAt(px, py);
    else if (action.type === 'create') {
      const e = action.e;
      if (e.type === 'freedraw') e.points.push([px - e.x, py - e.y]);
      else if (e.points) { let dx = px - e.x, dy = py - e.y; if (ev.shiftKey) { const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4, l = Math.hypot(dx, dy); dx = l * Math.cos(a); dy = l * Math.sin(a); } e.points[1] = [dx, dy]; }
      else { e.w = px - action.px; e.h = py - action.py; if (ev.shiftKey) { const s = Math.max(Math.abs(e.w), Math.abs(e.h)); e.w = Math.sign(e.w || 1) * s; e.h = Math.sign(e.h || 1) * s; } }
    }
    draw();
  }
  function onUp() {
    if (!action) return;
    if (action.type === 'create') {
      const e = action.e;
      if (!e.points) { if (e.w < 0) { e.x += e.w; e.w = -e.w; } if (e.h < 0) { e.y += e.h; e.h = -e.h; } if (e.w < 4 && e.h < 4) { els.pop(); undo.pop(); } }
      else if (e.points.length < 2 || (e.type !== 'freedraw' && Math.hypot(...e.points[1]) < 4)) { els.pop(); undo.pop(); }
      if (els.includes(e)) { selIds = new Set([e.id]); if (e.type !== 'freedraw' && !lockTool) setTool('select'); }
      ctx.markDirty();
    } else if (action.type === 'resize') { const e = action.e; if (e.w < 0) { e.x += e.w; e.w = -e.w; } if (e.h < 0) { e.y += e.h; e.h = -e.h; } ctx.markDirty(); }
    else if (action.type === 'move') { if (action.moved) ctx.markDirty(); else undo.pop(); }
    else if (action.type === 'erase') ctx.markDirty();
    else if (action.type === 'pan') data.view = view;
    action = null; marquee = null; draw();
  }
  function eraseAt(px, py) { const e = hit(px, py); if (e) { els.splice(els.indexOf(e), 1); draw(); } }
  function onWheel(ev) {
    ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey) { const r = canvas.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top; const nz = Math.min(5, Math.max(.1, view.z * (ev.deltaY < 0 ? 1.1 : 1 / 1.1))); view.x = mx - (mx - view.x) * nz / view.z; view.y = my - (my - view.y) * nz / view.z; view.z = nz; }
    else { view.x -= ev.deltaX; view.y -= ev.deltaY; }
    draw(); ctx.refresh();
  }
  function setZoom(z) { const W = wrap.clientWidth / 2, H = wrap.clientHeight / 2; view.x = W - (W - view.x) * z / view.z; view.y = H - (H - view.y) * z / view.z; view.z = z; draw(); ctx.refresh(); }

  /* ---------- text ---------- */
  function openText(px, py, existing) {
    textBox = document.createElement('textarea'); textBox.className = 'dr-text';
    const e = existing || { id: uid(), type: 'text', x: px, y: py, w: 0, h: 0, text: '', stroke: style.stroke, fs: style.fs, opacity: style.opacity, seed: 1, rough: 0, sw: 1 };
    textBox._el = e; textBox._new = !existing;
    const container = existing && existing.type !== 'text';
    const fs = e.fs || 20;
    Object.assign(textBox.style, { left: e.x * view.z + view.x + 'px', top: (container ? e.y + e.h / 2 - fs * 0.75 : e.y) * view.z + view.y + 'px', fontSize: fs * view.z + 'px', color: e.stroke, width: container ? e.w * view.z + 'px' : '', textAlign: container ? 'center' : 'left' });
    textBox.value = existing ? (existing.text || '') : '';
    wrap.appendChild(textBox); setTimeout(() => textBox.focus());
    textBox.addEventListener('keydown', ev => { if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey))) commitText(); ev.stopPropagation(); });
    textBox.addEventListener('blur', () => setTimeout(commitText));
    if (existing) { existing._editing = true; draw(); }
  }
  function commitText() {
    if (!textBox) return; const tb = textBox; textBox = null; const e = tb._el, v = tb.value;
    delete e._editing;
    if (tb._new) { if (v.trim()) { snap(); e.text = v; measure(e); els.push(e); selIds = new Set([e.id]); } }
    else { snap(); e.text = v; if (e.type === 'text') { if (!v.trim()) els.splice(els.indexOf(e), 1); else measure(e); } }
    tb.remove(); if (!lockTool) setTool('select'); draw(); ctx.markDirty();
  }

  /* ---------- properties panel (Excalidraw style) ---------- */
  const selected = () => els.filter(e => selIds.has(e.id));
  function setProp(k, v) { style[k] = v; const s = selected(); if (s.length) { snap(); s.forEach(e => { e[k] = v; if (k === 'fs') measure(e); }); ctx.markDirty(); } draw(); }
  const strokeColors = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#7C4DDB'];
  const bgColors = ['transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99', '#e5dbff'];
  function renderProps() {
    const s = selected(); const show = s.length || !['select', 'hand', 'eraser'].includes(tool);
    props.hidden = !show; if (!show) return;
    const cur = s[0] || style;
    const sw = (k, arr, lbl) => `<div class="pp-row"><label>${lbl}</label><div class="pp-sw">${arr.map(c => `<button data-k="${k}" data-v="${c}" class="${cur[k] === c ? 'on' : ''}" style="--c:${c === 'transparent' ? 'transparent' : c}" title="${c}"></button>`).join('')}<label class="pp-custom"><input type="color" data-k="${k}" value="${cur[k] && cur[k] !== 'transparent' ? cur[k] : '#ffffff'}"></label></div></div>`;
    const seg = (k, opts, lbl) => `<div class="pp-row"><label>${lbl}</label><div class="pp-seg">${opts.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${String(cur[k]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
    props.innerHTML = sw('stroke', strokeColors, t('draw.stroke')) + sw('bg', bgColors, t('draw.background')) +
      seg('fill', [['hachure', '▨'], ['solid', '■']], t('draw.fill')) + seg('sw', [[1, '—'], [2, '━'], [4, '▬']], t('draw.width')) +
      seg('ss', [['solid', '——'], ['dashed', '- - -'], ['dotted', '· · ·']], t('draw.strokeStyle')) + seg('rough', [[0, '⌒'], [1, '〜'], [2, '≋']], t('draw.sloppiness')) +
      seg('fs', [[16, 'S'], [24, 'M'], [32, 'L'], [48, 'XL']], t('draw.fontSize')) +
      `<div class="pp-row"><label>${t('draw.opacity')}</label><input type="range" min="10" max="100" step="10" data-k="opacity" value="${cur.opacity || 100}"></div>` +
      (s.length ? `<div class="pp-row"><label>${t('draw.actions')}</label><div class="pp-seg"><button data-a="back" title="${t('toBack')}">${I('layers', 15)}</button><button data-a="front" title="${t('toFront')}">${I('layers', 15)}</button><button data-a="dup" title="${t('duplicate')}">${I('copy', 15)}</button><button data-a="del" title="${t('delete')}">${I('trash', 15)}</button></div></div>` : '');
    props.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => setProp(b.dataset.k, isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v));
    props.querySelectorAll('input[data-k]').forEach(i => i.oninput = () => setProp(i.dataset.k, i.type === 'range' ? +i.value : i.value));
    props.querySelectorAll('button[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
  }
  function act(a) {
    const s = selected(); if (!s.length) return; snap();
    if (a === 'del') { els = data.elements = els.filter(e => !selIds.has(e.id)); selIds.clear(); }
    if (a === 'dup') { const c = s.map(e => Object.assign(JSON.parse(JSON.stringify(e)), { id: uid(), x: e.x + 20, y: e.y + 20 })); els.push(...c); selIds = new Set(c.map(e => e.id)); }
    if (a === 'front') { els = data.elements = els.filter(e => !selIds.has(e.id)).concat(s); }
    if (a === 'back') { els = data.elements = s.concat(els.filter(e => !selIds.has(e.id))); }
    draw(); ctx.markDirty();
  }

  /* ---------- export / import ---------- */
  function exportSVG() {
    const b = els.map(bbox); if (!b.length) return '';
    const x0 = Math.min(...b.map(x => x.x)) - 20, y0 = Math.min(...b.map(x => x.y)) - 20, x1 = Math.max(...b.map(x => x.x + x.w)) + 20, y1 = Math.max(...b.map(x => x.y + x.h)) + 20;
    const E = OW.ooxml.esc;
    const body = els.map(e => {
      const st = `stroke="${e.stroke}" stroke-width="${e.sw}" ${e.ss === 'dashed' ? 'stroke-dasharray="10 8"' : e.ss === 'dotted' ? 'stroke-dasharray="2 7"' : ''} opacity="${(e.opacity || 100) / 100}" stroke-linecap="round" stroke-linejoin="round"`;
      const fill = e.bg && e.bg !== 'transparent' ? `fill="${e.bg}" fill-opacity="${e.fill === 'solid' ? 1 : .5}"` : 'fill="none"';
      if (e.type === 'rectangle') return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" ${fill} ${st}/>` + (e.text ? `<text x="${e.x + e.w / 2}" y="${e.y + e.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${e.fs}" fill="${e.stroke}">${E(e.text)}</text>` : '');
      if (e.type === 'ellipse') return `<ellipse cx="${e.x + e.w / 2}" cy="${e.y + e.h / 2}" rx="${e.w / 2}" ry="${e.h / 2}" ${fill} ${st}/>`;
      if (e.type === 'diamond') return `<polygon points="${e.x + e.w / 2},${e.y} ${e.x + e.w},${e.y + e.h / 2} ${e.x + e.w / 2},${e.y + e.h} ${e.x},${e.y + e.h / 2}" ${fill} ${st}/>`;
      if (e.points) return `<polyline points="${e.points.map(([a, c]) => `${e.x + a},${e.y + c}`).join(' ')}" fill="none" ${st} ${e.type === 'arrow' ? 'marker-end="url(#ah)"' : ''}/>`;
      if (e.type === 'text') return `<text x="${e.x}" y="${e.y}" font-size="${e.fs}" fill="${e.stroke}" dominant-baseline="hanging" font-family="Segoe Print, Comic Sans MS, cursive">${(e.text || '').split('\n').map((l, i) => `<tspan x="${e.x}" dy="${i ? e.fs * 1.25 : 0}">${E(l)}</tspan>`).join('')}</text>`;
      if (e.type === 'image') return `<image href="${e.src}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}"/>`;
      return '';
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" width="${x1 - x0}" height="${y1 - y0}"><defs><marker id="ah" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10" fill="none" stroke="#1e1e1e"/></marker></defs><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#fff"/>${body}</svg>`;
  }
  function exportPNG() { const svg = exportSVG(); if (!svg) return OW.toast(t('draw.empty')); const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.width * 2; c.height = img.height * 2; const cx = c.getContext('2d'); cx.scale(2, 2); cx.drawImage(img, 0, 0); c.toBlob(b => OW.download(b, OW.safeName(ctx.file.name) + '.png')); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  function toExcalidraw() {
    return JSON.stringify({ type: 'excalidraw', version: 2, source: 'office-werkstatt', elements: els.map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y, width: e.w || bbox(e).w, height: e.h || bbox(e).h, angle: 0, strokeColor: e.stroke, backgroundColor: e.bg, fillStyle: e.fill, strokeWidth: e.sw, strokeStyle: e.ss, roughness: e.rough, opacity: e.opacity, seed: e.seed, points: e.points, text: e.text, fontSize: e.fs, isDeleted: false, version: 1 })), appState: { viewBackgroundColor: '#ffffff' } }, null, 2);
  }
  OW.excalidrawToElements = json => (json.elements || []).filter(e => !e.isDeleted).map(e => ({ id: e.id || uid(), type: e.type === 'image' ? 'rectangle' : e.type, x: e.x, y: e.y, w: e.width, h: e.height, points: e.points, text: e.text, fs: e.fontSize || 20, stroke: e.strokeColor || '#1e1e1e', bg: e.backgroundColor || 'transparent', fill: e.fillStyle === 'solid' ? 'solid' : 'hachure', sw: e.strokeWidth || 2, ss: e.strokeStyle || 'solid', rough: e.roughness ?? 1, opacity: e.opacity || 100, seed: e.seed || 1 }));
  function addImage() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = () => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { snap(); const sc = Math.min(1, 400 / im.width); const [cx, cy] = toWorld(wrap.getBoundingClientRect().left + wrap.clientWidth / 2, wrap.getBoundingClientRect().top + wrap.clientHeight / 2); const e = { id: uid(), type: 'image', src: r.result, x: cx - im.width * sc / 2, y: cy - im.height * sc / 2, w: im.width * sc, h: im.height * sc, opacity: 100 }; els.push(e); selIds = new Set([e.id]); draw(); ctx.markDirty(); }; im.src = r.result; }; r.readAsDataURL(inp.files[0]); }; inp.click(); }

  /* ---------- ribbon ---------- */
  let lockTool = false;
  const TOOLS = [['hand', 'hand', 'H'], ['select', 'pointer', 'V'], ['rectangle', 'square', 'R'], ['diamond', 'diamond', 'D'], ['ellipse', 'circle', 'O'], ['arrow', 'arrow', 'A'], ['line', 'line', 'L'], ['freedraw', 'pencil', 'P'], ['text', 'text', 'T'], ['eraser', 'eraser', 'E']];
  function setTool(k) { tool = k; if (k !== 'select') selIds.clear(); canvas && (canvas.style.cursor = k === 'hand' ? 'grab' : k === 'select' ? 'default' : 'crosshair'); ctx.refresh(); draw(); }
  const doUndo = () => { if (!undo.length) return; redo.push(JSON.stringify(els)); els = data.elements = JSON.parse(undo.pop()); selIds.clear(); draw(); ctx.markDirty(); };
  const doRedo = () => { if (!redo.length) return; undo.push(JSON.stringify(els)); els = data.elements = JSON.parse(redo.pop()); draw(); ctx.markDirty(); };
  const R = [
    { id: 'start', label: t('tab.home'), groups: [
      { items: [{ icon: 'undo', title: t('undo') + ' (Ctrl+Z)', onClick: doUndo }, { icon: 'redo', title: t('redo') + ' (Ctrl+Y)', onClick: doRedo }] },
      { items: [{ icon: 'lock', title: t('draw.lock'), active: () => lockTool, onClick: () => lockTool = !lockTool }].concat(TOOLS.map(([k, ic, key], i) => ({ icon: ic, title: `${t('draw.t.' + k)} — ${key} / ${i}`, active: () => tool === k, onClick: () => setTool(k) }))) },
      { items: [{ icon: 'image', title: t('image'), onClick: addImage }, { icon: 'copy', title: t('duplicate'), onClick: () => act('dup') }, { icon: 'trash', title: t('delete'), onClick: () => act('del') }] },
      { items: [{ icon: 'zoomOut', title: t('zoomOut'), onClick: () => setZoom(Math.max(.1, view.z / 1.2)) }, { t: 'custom', html: '<button class="rb-btn wl zoomlbl"><span>100 %</span></button>', init: el => { el.onclick = () => { view = data.view = { x: 0, y: 0, z: 1 }; draw(); ctx.refresh(); }; zoomLbl = el.querySelector('span'); } }, { icon: 'zoomIn', title: t('zoomIn'), onClick: () => setZoom(Math.min(5, view.z * 1.2)) },
        { icon: 'expand', title: t('draw.fit'), onClick: fitAll }] },
      { items: [{ t: 'menu', icon: 'download', label: t('bs.export'), items: () => ctx.exports.map(x => ({ label: x.label, onClick: x.fn })) }] },
    ] },
    { id: 'insert', label: t('tab.insert'), groups: [{ items: [
      { icon: 'image', label: t('image'), onClick: addImage },
      { t: 'menu', icon: 'layers', label: t('draw.library'), items: [
        { label: t('draw.lib.flow'), onClick: () => insertTemplate('flow') }, { label: t('draw.lib.mind'), onClick: () => insertTemplate('mind') }, { label: t('draw.lib.kanban'), onClick: () => insertTemplate('kanban') }] },
      { icon: 'upload', label: t('draw.importExcalidraw'), onClick: () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.excalidraw,.json'; inp.onchange = async () => { try { snap(); els.push(...OW.excalidrawToElements(JSON.parse(await inp.files[0].text()))); draw(); ctx.markDirty(); } catch { OW.toast(t('import.failed')); } }; inp.click(); } }] }] },
    { id: 'view', label: t('tab.view'), groups: [{ items: [{ icon: 'grid', label: t('draw.fit'), onClick: fitAll }, { icon: 'expand', label: t('focusMode'), onClick: () => ctx.root.classList.toggle('focus') }, { icon: 'trash', label: t('draw.clear'), onClick: () => OW.confirm(t('draw.clearConfirm')).then(ok => { if (ok) { snap(); els = data.elements = []; selIds.clear(); draw(); ctx.markDirty(); } }) }] }] },
    { id: 'help', label: t('tab.help'), groups: [{ items: [{ icon: 'sparkle', label: t('help.shortcuts'), onClick: () => OW.alert(t('help.shortcuts'), t('draw.shortcuts')) }, { icon: 'app', label: t('help.about'), onClick: () => OW.about() }] }] },
  ];
  let zoomLbl = null;
  function fitAll() { if (!els.length) return; const b = els.map(bbox); const x0 = Math.min(...b.map(x => x.x)), y0 = Math.min(...b.map(x => x.y)), x1 = Math.max(...b.map(x => x.x + x.w)), y1 = Math.max(...b.map(x => x.y + x.h)); const z = Math.min(2, (wrap.clientWidth - 120) / (x1 - x0 || 1), (wrap.clientHeight - 120) / (y1 - y0 || 1)); view.z = z; view.x = (wrap.clientWidth - (x1 - x0) * z) / 2 - x0 * z; view.y = (wrap.clientHeight - (y1 - y0) * z) / 2 - y0 * z; draw(); ctx.refresh(); }
  function insertTemplate(kind) {
    snap(); const [cx, cy] = toWorld(wrap.getBoundingClientRect().left + 120, wrap.getBoundingClientRect().top + 80);
    OW.drawTemplate(kind, t).forEach(e => { e.id = uid(); e.seed = Math.floor(Math.random() * 1e9); e.x += cx; e.y += cy; els.push(Object.assign({ stroke: '#1e1e1e', bg: 'transparent', fill: 'hachure', sw: 2, ss: 'solid', rough: 1, opacity: 100, fs: 20 }, e)); });
    draw(); ctx.markDirty();
  }

  ctx.exports = [
    { label: 'PNG (.png)', fn: exportPNG }, { label: 'SVG (.svg)', fn: () => { const s = exportSVG(); if (!s) return OW.toast(t('draw.empty')); OW.download(new Blob([s], { type: 'image/svg+xml' }), OW.safeName(ctx.file.name) + '.svg'); } },
    { label: 'Excalidraw (.excalidraw)', hint: t('export.excalidrawHint'), fn: () => OW.download(new Blob([toExcalidraw()], { type: 'application/json' }), OW.safeName(ctx.file.name) + '.excalidraw') },
  ];

  const keys = ev => {
    if (textBox || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || !document.body.contains(canvas)) return;
    const k = ev.key.toLowerCase(), mod = ev.ctrlKey || ev.metaKey;
    if (mod && k === 'z') { ev.preventDefault(); ev.shiftKey ? doRedo() : doUndo(); return; }
    if (mod && k === 'y') { ev.preventDefault(); doRedo(); return; }
    if (mod && k === 'd') { ev.preventDefault(); act('dup'); return; }
    if (mod && k === 'a') { ev.preventDefault(); selIds = new Set(els.map(e => e.id)); setTool('select'); return; }
    if (k === 'delete' || k === 'backspace') { act('del'); return; }
    if (k === ' ') { spaceDown = true; canvas.style.cursor = 'grab'; return; }
    if (mod) return;
    const byNum = TOOLS[+k]; if (/^[0-9]$/.test(k) && byNum) return setTool(byNum[0]);
    const byKey = TOOLS.find(x => x[2].toLowerCase() === k); if (byKey) setTool(byKey[0]);
    if (k === 'escape') { selIds.clear(); setTool('select'); }
  };
  const keyUp = ev => { if (ev.key === ' ') { spaceDown = false; setTool(tool); } };
  const onResize = () => draw();

  return {
    ribbonMode: 'simplified',
    ribbon: () => R,
    mount(body) {
      body.innerHTML = `<div class="dr"><div class="dr-wrap"><canvas></canvas><div class="dr-props"></div><div class="dr-hint">${t('draw.hint')}</div></div></div>`;
      wrap = body.querySelector('.dr-wrap'); canvas = body.querySelector('canvas'); g = canvas.getContext('2d'); props = body.querySelector('.dr-props');
      canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('dblclick', ev => { if (ctx.readOnly) return; const [px, py] = toWorld(ev.clientX, ev.clientY); const e = hit(px, py); if (e && (e.type === 'text' || ['rectangle', 'ellipse', 'diamond'].includes(e.type))) { if (e.type !== 'text') e.fs = e.fs || 20; openText(px, py, e); } else openText(px, py); });
      addEventListener('keydown', keys); addEventListener('keyup', keyUp); addEventListener('resize', onResize);
      setTimeout(() => { draw(); if (els.length) fitAll(); }, 30);
      wrap.querySelector('.dr-hint').hidden = els.length > 0;
    },
    getContent: () => { data.elements = els; data.view = view; return data; },
    status: () => { if (zoomLbl) zoomLbl.textContent = Math.round(view.z * 100) + ' %'; if (wrap) wrap.querySelector('.dr-hint').hidden = els.length > 0; return { left: `${els.length} ${t('draw.elements')} · ${t('draw.t.' + tool)}`, right: Math.round(view.z * 100) + ' %' }; },
    onTheme: () => draw(),
    // hand the drawing to the full Excalidraw engine and take it back when it is closed
    engineIn() {
      const json = JSON.parse(toExcalidraw());
      els.filter(e => e.text && e.type !== 'text').forEach(e => { const tw = Math.max(...e.text.split('\n').map(l => l.length)) * (e.fs || 20) * 0.55; json.elements.push({ id: e.id + '-t', type: 'text', x: e.x + (e.w - tw) / 2, y: e.y + e.h / 2 - (e.fs || 20) * .6, width: tw, height: (e.fs || 20) * 1.25, text: e.text, originalText: e.text, fontSize: e.fs || 20, fontFamily: 1, textAlign: 'center', verticalAlign: 'middle', strokeColor: e.stroke, backgroundColor: 'transparent', seed: 1 }); });
      json.elements.forEach(x => { if (x.type !== 'text') delete x.text; if (x.type === 'text') { x.originalText = x.originalText || x.text; x.fontFamily = x.fontFamily || 1; } });
      try { localStorage.setItem('ow-excalidraw-scene', JSON.stringify({ elements: json.elements, appState: { viewBackgroundColor: '#ffffff' } })); } catch {}
    },
    engineOut() {
      try { const sc = JSON.parse(localStorage.getItem('ow-excalidraw-scene')); if (sc && sc.elements) { snap(); els = data.elements = OW.excalidrawToElements(sc); selIds.clear(); draw(); ctx.markDirty(); } } catch {}
    },
    setReadOnly() { setTool('hand'); },
    destroy() { removeEventListener('keydown', keys); removeEventListener('keyup', keyUp); removeEventListener('resize', onResize); },
  };
};

/* tiny diagram library used by templates and the Insert tab */
OW.drawTemplate = function (kind, t) {
  if (kind === 'flow') return [
    { type: 'ellipse', x: 0, y: 0, w: 160, h: 70, text: t('draw.lib.start'), bg: '#b2f2bb' }, { type: 'arrow', x: 80, y: 70, points: [[0, 0], [0, 60]] },
    { type: 'rectangle', x: -10, y: 130, w: 180, h: 80, text: t('draw.lib.step'), bg: '#a5d8ff' }, { type: 'arrow', x: 80, y: 210, points: [[0, 0], [0, 60]] },
    { type: 'diamond', x: -10, y: 270, w: 180, h: 120, text: t('draw.lib.decision'), bg: '#ffec99' }, { type: 'arrow', x: 170, y: 330, points: [[0, 0], [110, 0]] },
    { type: 'rectangle', x: 280, y: 290, w: 170, h: 80, text: t('draw.lib.end'), bg: '#ffc9c9' }];
  if (kind === 'mind') return [
    { type: 'ellipse', x: 200, y: 150, w: 200, h: 100, text: t('draw.lib.idea'), bg: '#e5dbff', fill: 'solid' },
    ...[[0, 0], [430, 0], [0, 320], [430, 320]].flatMap(([x, y], i) => [{ type: 'rectangle', x, y, w: 170, h: 70, text: t('draw.lib.topic') + ' ' + (i + 1), bg: ['#a5d8ff', '#b2f2bb', '#ffec99', '#ffc9c9'][i] }, { type: 'line', x: 300, y: 200, points: [[0, 0], [x + 85 - 300, y + 35 - 200]] }])];
  if (kind === 'kanban') return ['todo', 'doing', 'done'].flatMap((k, i) => [
    { type: 'rectangle', x: i * 240, y: 0, w: 220, h: 360, bg: ['#ffec99', '#a5d8ff', '#b2f2bb'][i], fill: 'hachure' },
    { type: 'text', x: i * 240 + 16, y: 14, w: 120, h: 30, text: t('draw.lib.' + k), fs: 24, rough: 0 },
    { type: 'rectangle', x: i * 240 + 16, y: 70, w: 188, h: 64, text: t('draw.lib.card'), bg: '#ffffff', fill: 'solid', fs: 18 }]);
  return [];
};
