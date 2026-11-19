/* Draw Werkzeug – an "edgeless" whiteboard for notes and brainstorming.
 * Infinite canvas · note cards with rich text · sticky notes · text · shapes · connectors that follow the
 * elements · pen & highlighter · frames · images · mind maps (Tab = child, Enter = sibling) · templates.
 * Classic Office ribbon (Start / Insert / View / Help), a mini toolbar above the selection, zoom at the bottom right.
 * Data: content = { board: 2, elements: [...], view: { x, y, z } }. Older drawings (and .excalidraw files)
 * are converted when they are opened. Export: PNG, SVG, .excalidraw. Everything works offline. */
window.OW = window.OW || {};
(function () {
  const uid = () => Math.random().toString(36).slice(2, 10);
  /* colours: soft fills that read well in light and dark themes; text on them is always dark */
  const PAL = [
    { k: 'white', fill: '#FFFFFF', stroke: '#2B2F3A' }, { k: 'yellow', fill: '#FFF1B8', stroke: '#E8A400' },
    { k: 'orange', fill: '#FFE1C7', stroke: '#F0760A' }, { k: 'red', fill: '#FFD8D8', stroke: '#E03131' },
    { k: 'pink', fill: '#FFD9EA', stroke: '#D6336C' }, { k: 'purple', fill: '#E6DCFF', stroke: '#7048E8' },
    { k: 'blue', fill: '#D3E9FF', stroke: '#1C7ED6' }, { k: 'teal', fill: '#C8F5E6', stroke: '#0CA678' },
    { k: 'green', fill: '#D8F5D2', stroke: '#2F9E44' }, { k: 'gray', fill: '#E9ECEF', stroke: '#495057' },
  ];
  const pal = k => PAL.find(p => p.k === k) || PAL[0];
  OW.BOARD_PALETTE = PAL;
  const TEXT_TYPES = ['note', 'sticky', 'text', 'shape', 'mind'];
  const BOX_TYPES = ['note', 'sticky', 'text', 'shape', 'mind', 'frame', 'image'];

  /* ---------- older drawings (Excalidraw-style elements) → board ---------- */
  const HEX2K = { '#b2f2bb': 'green', '#a5d8ff': 'blue', '#ffec99': 'yellow', '#ffc9c9': 'red', '#e5dbff': 'purple', '#ffffff': 'white', '#ffd8a8': 'orange', '#fcc2d7': 'pink', '#96f2d7': 'teal', '#e9ecef': 'gray' };
  const hexKey = (h, dflt) => HEX2K[String(h || '').toLowerCase()] || dflt;
  const escHTML = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/\n/g, '<br>');
  OW.drawMigrate = function (content) {
    if (content && content.board === 2) return { board: 2, elements: Array.isArray(content.elements) ? content.elements : [], view: content.view || { x: 0, y: 0, z: 1 } };
    const out = [];
    for (const e of (content && content.elements) || []) {
      if (!e || e.isDeleted) continue;
      let x = +e.x || 0, y = +e.y || 0, w = +e.w || 0, h = +e.h || 0;
      if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
      if (['rectangle', 'ellipse', 'diamond'].includes(e.type)) {
        const filled = e.bg && e.bg !== 'transparent';
        out.push({ id: e.id || uid(), type: 'shape', kind: e.type === 'rectangle' ? 'rect' : e.type, x, y, w: w || 120, h: h || 80, color: filled ? hexKey(e.bg, 'blue') : 'none', html: e.text ? escHTML(e.text) : '', fs: e.fs || 18 });
      } else if ((e.type === 'arrow' || e.type === 'line') && Array.isArray(e.points) && e.points.length > 1) {
        const a = e.points[0], b = e.points[e.points.length - 1];
        out.push({ id: e.id || uid(), type: 'connector', x1: x + a[0], y1: y + a[1], x2: x + b[0], y2: y + b[1], arrow: e.type === 'arrow', mode: 'straight', color: 'ink', sw: e.sw || 2 });
      } else if (e.type === 'freedraw' && Array.isArray(e.points)) {
        out.push({ id: e.id || uid(), type: 'draw', points: e.points.map(([px, py]) => [x + px, y + py]), color: 'ink', sw: e.sw || 2 });
      } else if (e.type === 'text') {
        out.push({ id: e.id || uid(), type: 'text', x, y, w: w || 200, h: h || 30, html: escHTML(e.text), fs: e.fs || 20, color: 'ink' });
      } else if (e.type === 'image' && e.src) {
        out.push({ id: e.id || uid(), type: 'image', x, y, w: w || 320, h: h || 200, src: e.src });
      }
    }
    return { board: 2, elements: out, view: (content && content.view) || { x: 0, y: 0, z: 1 } };
  };

  /* ---------- board templates ---------- */
  OW.boardTemplate = function (kind, t) {
    const S = (x, y, color, text, w = 200, h = 200) => ({ type: 'sticky', x, y, w, h, color, html: escHTML(text), fs: 18 });
    const F = (x, y, w, h, title, color) => ({ type: 'frame', x, y, w, h, title, color });
    const N = (x, y, html, w = 340, color = 'white') => ({ type: 'note', x, y, w, h: 120, html, color, fs: 15 });
    if (kind === 'brainstorm') {
      const c = N(320, 230, `<h2>${escHTML(t('board.tpl.question'))}</h2><p>${escHTML(t('board.tpl.questionHint'))}</p>`, 340, 'purple');
      const st = [[40, 20, 'yellow'], [620, 20, 'blue'], [40, 470, 'green'], [620, 470, 'pink'], [-20, 245, 'orange'], [700, 245, 'teal']].map(([x, y, col], i) => S(x, y, col, t('board.tpl.idea') + ' ' + (i + 1)));
      return [c, ...st];
    }
    if (kind === 'kanban') return ['todo', 'doing', 'done'].flatMap((k, i) => [F(i * 300, 0, 280, 560, t('draw.lib.' + k), ['yellow', 'blue', 'green'][i]), S(i * 300 + 40, 60, ['yellow', 'blue', 'green'][i], t('draw.lib.card'), 200, 140)]);
    if (kind === 'retro') return [['board.tpl.good', 'green'], ['board.tpl.improve', 'orange'], ['board.tpl.actions', 'blue']].flatMap(([k, col], i) => [F(i * 340, 0, 320, 520, t(k), col), S(i * 340 + 60, 70, col, '…', 200, 160)]);
    if (kind === 'swot') return [['board.tpl.s', 'green'], ['board.tpl.w', 'red'], ['board.tpl.o', 'blue'], ['board.tpl.t', 'orange']].flatMap(([k, col], i) => [F((i % 2) * 420, Math.floor(i / 2) * 340, 400, 320, t(k), col), S((i % 2) * 420 + 30, Math.floor(i / 2) * 340 + 60, col, '…', 160, 130)]);
    if (kind === 'flow') {
      const a = { id: 'a', type: 'shape', kind: 'roundRect', x: 0, y: 0, w: 180, h: 70, color: 'green', html: escHTML(t('draw.lib.start')), fs: 18 };
      const b = { id: 'b', type: 'shape', kind: 'rect', x: 0, y: 150, w: 180, h: 80, color: 'blue', html: escHTML(t('draw.lib.step')), fs: 18 };
      const c = { id: 'c', type: 'shape', kind: 'diamond', x: -10, y: 310, w: 200, h: 130, color: 'yellow', html: escHTML(t('draw.lib.decision')), fs: 18 };
      const d = { id: 'd', type: 'shape', kind: 'roundRect', x: 320, y: 335, w: 180, h: 80, color: 'red', html: escHTML(t('draw.lib.end')), fs: 18 };
      const C = (f, to) => ({ type: 'connector', from: f, to, arrow: true, mode: 'curve', color: 'ink', sw: 2 });
      return [a, b, c, d, C('a', 'b'), C('b', 'c'), C('c', 'd')];
    }
    if (kind === 'mind') {
      const root = { id: 'r', type: 'mind', x: 0, y: 200, w: 180, h: 52, html: escHTML(t('draw.lib.idea')), color: 'purple', root: true };
      const kids = [1, 2, 3, 4].map(i => ({ id: 'k' + i, type: 'mind', x: 0, y: 0, w: 150, h: 40, html: escHTML(t('draw.lib.topic') + ' ' + i), color: ['blue', 'green', 'orange', 'pink'][i - 1], parent: 'r' }));
      return [root, ...kids];
    }
    return [];
  };
  /* turn template elements into fresh elements at a position (new ids, links kept) */
  function instantiate(list, ox, oy) {
    const map = {};
    for (const e of list) map[e.id || (e.id = uid())] = uid();
    return list.map(e => {
      const c = JSON.parse(JSON.stringify(e)); c.id = map[e.id];
      if (c.x !== undefined) { c.x += ox; c.y += oy; }
      if (c.x1 !== undefined) { c.x1 += ox; c.y1 += oy; c.x2 += ox; c.y2 += oy; }
      if (c.points) c.points = c.points.map(([x, y]) => [x + ox, y + oy]);
      if (c.from) c.from = map[c.from] || c.from; if (c.to) c.to = map[c.to] || c.to; if (c.parent) c.parent = map[c.parent] || c.parent;
      return c;
    });
  }

  OW.editors.draw = async function (ctx) {
    const t = ctx.t, I = OW.icon, E = OW.escape;
    const data = OW.drawMigrate(ctx.file.content);
    let els = data.elements, view = data.view;
    let vp, world, svgEl, selLayer, ctxBar, hintEl, zoomLbl, marqueeEl;
    let tool = 'select', lockTool = false, shapeKind = 'rect', penColor = 'ink', penWidth = 3;
    let sel = new Set(), editing = null, readOnly = false, spaceDown = false, drag = null;
    const nodes = new Map();
    const undo = [], redo = [];
    const snap = () => { undo.push(JSON.stringify(els)); if (undo.length > 120) undo.shift(); redo.length = 0; };
    const changed = () => { ctx.markDirty(); render(); };
    const byId = id => els.find(e => e.id === id);

    /* ---------- geometry ---------- */
    function bbox(e) {
      if (e.type === 'draw') { if (!e.points.length) return { x: 0, y: 0, w: 0, h: 0 }; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of e.points) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } const p = (e.sw || 2); return { x: x0 - p, y: y0 - p, w: x1 - x0 + 2 * p, h: y1 - y0 + 2 * p }; }
      if (e.type === 'connector') { const [a, b] = connEnds(e); return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]) || 1, h: Math.abs(a[1] - b[1]) || 1 }; }
      return { x: e.x, y: e.y, w: e.w || 0, h: e.h || 0 };
    }
    const center = b => [b.x + b.w / 2, b.y + b.h / 2];
    // point on the border of box b in the direction of point p
    function edgePoint(b, p) {
      const [cx, cy] = center(b), dx = p[0] - cx, dy = p[1] - cy;
      if (!dx && !dy) return [cx, cy];
      const sx = (b.w / 2 + 6) / Math.abs(dx || 1e-9), sy = (b.h / 2 + 6) / Math.abs(dy || 1e-9), s = Math.min(sx, sy);
      return [cx + dx * s, cy + dy * s];
    }
    function connEnds(e) {
      const A = e.from && byId(e.from), B = e.to && byId(e.to);
      const ab = A && bbox(A), bb = B && bbox(B);
      const pa = ab ? center(ab) : [e.x1, e.y1], pb = bb ? center(bb) : [e.x2, e.y2];
      return [ab ? edgePoint(ab, pb) : pa, bb ? edgePoint(bb, pa) : pb];
    }
    function connPath(e) {
      const [a, b] = connEnds(e);
      if (e.mode === 'curve') {
        const dx = b[0] - a[0], dy = b[1] - a[1], h = Math.abs(dx) >= Math.abs(dy);
        const c1 = h ? [a[0] + dx / 2, a[1]] : [a[0], a[1] + dy / 2], c2 = h ? [b[0] - dx / 2, b[1]] : [b[0], b[1] - dy / 2];
        return { d: `M${a[0]} ${a[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${b[0]} ${b[1]}`, end: b, dir: [b[0] - c2[0], b[1] - c2[1]] };
      }
      if (e.mode === 'elbow') { const mx = (a[0] + b[0]) / 2; return { d: `M${a[0]} ${a[1]} H${mx} V${b[1]} H${b[0]}`, end: b, dir: [b[0] - mx || 1, 0] }; }
      return { d: `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`, end: b, dir: [b[0] - a[0], b[1] - a[1]] };
    }
    function arrowHead(end, dir, sw) {
      const L = 10 + sw * 2, ang = Math.atan2(dir[1], dir[0]), a1 = ang + Math.PI * 0.85, a2 = ang - Math.PI * 0.85;
      return `M${end[0] + Math.cos(a1) * L} ${end[1] + Math.sin(a1) * L} L${end[0]} ${end[1]} L${end[0] + Math.cos(a2) * L} ${end[1] + Math.sin(a2) * L}`;
    }
    function smoothPath(pts) {
      if (!pts.length) return '';
      if (pts.length < 3) return `M${pts[0][0]} ${pts[0][1]} ` + pts.map(p => `L${p[0]} ${p[1]}`).join(' ');
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; d += ` Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`; }
      const l = pts[pts.length - 1]; return d + ` L${l[0]} ${l[1]}`;
    }
    const strokeOf = k => k === 'ink' || !k ? 'var(--bd-ink)' : pal(k).stroke;
    function shapeSVG(e) {
      const w = e.w, h = e.h, p = e.color === 'none' ? null : pal(e.color);
      const fill = p ? p.fill : 'transparent', st = p ? p.stroke : 'var(--bd-ink)';
      const a = `fill="${fill}" stroke="${st}" stroke-width="2" vector-effect="non-scaling-stroke"`;
      let s;
      if (e.kind === 'ellipse') s = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${Math.max(1, w / 2 - 1)}" ry="${Math.max(1, h / 2 - 1)}" ${a}/>`;
      else if (e.kind === 'diamond') s = `<path d="M${w / 2} 1 L${w - 1} ${h / 2} L${w / 2} ${h - 1} L1 ${h / 2}Z" ${a}/>`;
      else if (e.kind === 'triangle') s = `<path d="M${w / 2} 1 L${w - 1} ${h - 1} L1 ${h - 1}Z" ${a}/>`;
      else s = `<rect x="1" y="1" width="${Math.max(1, w - 2)}" height="${Math.max(1, h - 2)}" rx="${e.kind === 'roundRect' ? Math.min(24, h / 2) : 4}" ${a}/>`;
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
    }

    /* ---------- coordinates ---------- */
    const toWorld = (cx, cy) => { const r = vp.getBoundingClientRect(); return [(cx - r.left - view.x) / view.z, (cy - r.top - view.y) / view.z]; };
    const toScreen = (x, y) => [x * view.z + view.x, y * view.z + view.y];
    function applyView() {
      world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
      world.style.setProperty('--z', view.z);
      const g = 24 * view.z;
      vp.style.backgroundSize = `${g}px ${g}px`; vp.style.backgroundPosition = `${view.x}px ${view.y}px`;
      if (zoomLbl) zoomLbl.textContent = Math.round(view.z * 100) + '%';
      if (ctx.root) { const r = ctx.root.querySelector('.st-right'); if (r) r.textContent = Math.round(view.z * 100) + ' %'; }
      placeCtxBar();
    }
    function zoomAt(z, cx, cy) {
      z = Math.min(4, Math.max(0.1, z));
      const r = vp.getBoundingClientRect(); cx = cx ?? r.left + r.width / 2; cy = cy ?? r.top + r.height / 2;
      const [wx, wy] = toWorld(cx, cy);
      view.z = z; view.x = cx - r.left - wx * z; view.y = cy - r.top - wy * z; applyView();
    }
    function fitAll(list = els) {
      if (!list.length) { view.x = vp.clientWidth / 2; view.y = vp.clientHeight / 2.5; view.z = 1; return applyView(); }
      const bs = list.map(bbox), x0 = Math.min(...bs.map(b => b.x)), y0 = Math.min(...bs.map(b => b.y)), x1 = Math.max(...bs.map(b => b.x + b.w)), y1 = Math.max(...bs.map(b => b.y + b.h));
      const z = Math.min(1.5, (vp.clientWidth - 160) / Math.max(1, x1 - x0), (vp.clientHeight - 200) / Math.max(1, y1 - y0));
      view.z = Math.max(0.1, z); view.x = (vp.clientWidth - (x1 - x0) * view.z) / 2 - x0 * view.z; view.y = (vp.clientHeight - (y1 - y0) * view.z) / 2 - y0 * view.z - 20;
      applyView();
    }

    /* ---------- rendering ---------- */
    function nodeHTML(e) {
      if (e.type === 'shape') return shapeSVG(e) + `<div class="bd-txt">${OW.sanitizeHTML(e.html || '')}</div>`;
      if (e.type === 'image') return `<img src="${E(e.src)}" draggable="false" alt="">`;
      if (e.type === 'frame') return `<div class="bd-ftitle">${E(e.title || t('board.frame'))}</div>`;
      return `<div class="bd-txt">${OW.sanitizeHTML(e.html || '')}</div>`;
    }
    function syncNode(e, z) {
      let n = nodes.get(e.id);
      const key = JSON.stringify([e.type, e.kind, e.color, e.html, e.src, e.title, e.type === 'shape' ? [e.w, e.h] : 0]);
      if (!n) { n = document.createElement('div'); n.dataset.id = e.id; world.appendChild(n); nodes.set(e.id, n); n._key = null; }
      if (n._key !== key && editing !== e.id) { n.innerHTML = nodeHTML(e); n._key = key; }
      n.className = `bd-el bd-${e.type}${e.kind ? ' k-' + e.kind : ''}${e.root ? ' root' : ''}${sel.has(e.id) ? ' sel' : ''}${editing === e.id ? ' editing' : ''}`;
      const s = n.style;
      s.left = e.x + 'px'; s.top = e.y + 'px'; s.zIndex = z;
      if (e.type === 'note' || e.type === 'mind' || e.type === 'text') { s.width = (e.type === 'text' && e.autoW) || e.type === 'mind' ? 'auto' : e.w + 'px'; s.height = 'auto'; s.minHeight = e.type === 'note' ? '60px' : ''; }
      else { s.width = e.w + 'px'; s.height = e.h + 'px'; }
      if (e.fs) s.fontSize = e.fs + 'px'; else s.fontSize = '';
      const p = pal(e.color);
      if (e.type === 'note' || e.type === 'sticky' || e.type === 'mind') { s.setProperty('--fill', p.fill); s.setProperty('--accent', p.stroke); }
      if (e.type === 'frame') { s.setProperty('--accent', p.stroke); s.setProperty('--fill', p.fill); }
      if (e.type === 'text') s.color = e.color && e.color !== 'ink' ? pal(e.color).stroke : '';
    }
    function measure() {
      // notes / mind nodes / text grow with their content: keep the model size in step (not an edit)
      for (const e of els) if (e.type === 'note' || e.type === 'mind' || e.type === 'text') { const n = nodes.get(e.id); if (n) { e.h = n.offsetHeight || e.h; if ((e.type === 'text' && e.autoW) || e.type === 'mind') e.w = n.offsetWidth || e.w; } }
    }
    function render() {
      if (!world) return;
      const order = els.filter(e => e.type === 'frame').concat(els.filter(e => e.type !== 'frame' && e.type !== 'draw' && e.type !== 'connector'));
      const seen = new Set();
      order.forEach((e, i) => { syncNode(e, i + 2); seen.add(e.id); });
      for (const [id, n] of nodes) if (!seen.has(id)) { n.remove(); nodes.delete(id); }
      measure();
      layoutAllMinds();
      order.forEach(e => { const n = nodes.get(e.id); if (n) { n.style.left = e.x + 'px'; n.style.top = e.y + 'px'; } });
      // vector layer: mind-map edges, connectors, pen strokes
      let v = '';
      for (const e of els) if (e.type === 'mind' && e.parent) {
        const P = byId(e.parent); if (!P) continue;
        const left = e.x + e.w / 2 < P.x + P.w / 2;
        const a = [left ? P.x : P.x + P.w, P.y + P.h / 2], b = [left ? e.x + e.w : e.x, e.y + e.h / 2], mx = (a[0] + b[0]) / 2;
        v += `<path class="bd-medge" d="M${a[0]} ${a[1]} C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}" stroke="${pal(e.color).stroke}"/>`;
      }
      for (const e of els) if (e.type === 'draw') {
        const d = smoothPath(e.points), st = strokeOf(e.color);
        v += `<g data-id="${e.id}" class="bd-v${sel.has(e.id) ? ' sel' : ''}"><path class="hit" d="${d}"/><path d="${d}" stroke="${st}" stroke-width="${e.sw || 3}" ${e.hl ? 'opacity=".35" stroke-linecap="butt"' : ''} class="ink"/></g>`;
      }
      for (const e of els) if (e.type === 'connector') {
        const c = connPath(e), st = strokeOf(e.color), sw = e.sw || 2;
        v += `<g data-id="${e.id}" class="bd-v${sel.has(e.id) ? ' sel' : ''}"><path class="hit" d="${c.d}"/><path d="${c.d}" stroke="${st}" stroke-width="${sw}" class="ink"${e.dashed ? ' stroke-dasharray="8 6"' : ''}/>${e.arrow !== false ? `<path d="${arrowHead(c.end, c.dir, sw)}" stroke="${st}" stroke-width="${sw}" class="ink"/>` : ''}</g>`;
      }
      if (drag && drag.preview) v += drag.preview;
      svgEl.innerHTML = v;
      renderSelection();
      hintEl.hidden = els.length > 0;
    }
    function renderSelection() {
      let h = '';
      const list = [...sel].map(byId).filter(Boolean);
      for (const e of list) {
        if (e.type === 'connector') { const [a, b] = connEnds(e); h += `<i class="bd-cend" data-end="1" data-id="${e.id}" style="left:${a[0]}px;top:${a[1]}px"></i><i class="bd-cend" data-end="2" data-id="${e.id}" style="left:${b[0]}px;top:${b[1]}px"></i>`; continue; }
        const b = bbox(e);
        h += `<div class="bd-selbox" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px">`;
        if (list.length === 1 && !readOnly && !editing) {
          if (['shape', 'sticky', 'frame', 'image'].includes(e.type)) h += ['nw', 'ne', 'sw', 'se'].map(k => `<i class="bd-h ${k}" data-h="${k}"></i>`).join('');
          else if (e.type === 'note' || e.type === 'text') h += ['w', 'e'].map(k => `<i class="bd-h ${k}" data-h="${k}"></i>`).join('');
          if (BOX_TYPES.includes(e.type)) h += ['n', 'e', 's', 'w'].map(k => `<b class="bd-port ${k}" data-port="${k}" title="${E(t('board.t.connector'))}"></b>`).join('');
        }
        h += '</div>';
      }
      selLayer.innerHTML = h;
      placeCtxBar();
    }

    /* ---------- mind maps: automatic layout to the right of the root ---------- */
    function kidsOf(id) { return els.filter(e => e.type === 'mind' && e.parent === id); }
    function rootOf(e) { let r = e, guard = 0; while (r && r.parent && guard++ < 200) r = byId(r.parent) || r; return r; }
    function treeOf(root) { const out = [root]; for (let i = 0; i < out.length; i++) out.push(...kidsOf(out[i].id)); return out; }
    function layoutAllMinds() { for (const r of els.filter(e => e.type === 'mind' && !e.parent)) layoutMind(r); }
    function layoutMind(root) {
      const GAPX = 64, GAPY = 18;
      const height = n => { const k = kidsOf(n.id); if (!k.length) return n.h; return Math.max(n.h, k.reduce((s, c) => s + height(c), 0) + GAPY * (k.length - 1)); };
      const place = (n) => {
        const k = kidsOf(n.id); if (!k.length) return;
        let y = n.y + n.h / 2 - (k.reduce((s, c) => s + height(c), 0) + GAPY * (k.length - 1)) / 2;
        for (const c of k) { const hc = height(c); c.x = n.x + n.w + GAPX; c.y = y + hc / 2 - c.h / 2; y += hc + GAPY; place(c); }
      };
      place(root);
    }
    function addMind(parentId, asSibling) {
      const base = byId(parentId); if (!base) return;
      const parent = asSibling ? (base.parent ? byId(base.parent) : null) : base;
      if (!parent) return;   // the root has no siblings
      snap();
      const BR = ['blue', 'green', 'orange', 'pink', 'teal', 'yellow', 'red'];
      const color = parent.parent ? parent.color : BR[kidsOf(parent.id).length % BR.length];
      const n = { id: uid(), type: 'mind', x: parent.x + parent.w + 64, y: parent.y, w: 150, h: 40, html: '', color, parent: parent.id };
      els.push(n); sel = new Set([n.id]); changed(); startEdit(n.id, true);
    }

    /* ---------- creating elements ---------- */
    function addEl(e, edit, keepTool) { snap(); e.id = e.id || uid(); els.push(e); sel = keepTool ? new Set() : new Set([e.id]); if (!lockTool && !keepTool) setTool('select'); changed(); if (edit) startEdit(e.id, true); return e; }
    const mk = {
      note: (x, y) => ({ type: 'note', x: x - 20, y: y - 20, w: 320, h: 80, html: '', color: 'white', fs: 15 }),
      sticky: (x, y) => ({ type: 'sticky', x: x - 100, y: y - 100, w: 200, h: 200, html: '', color: ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'][els.filter(e => e.type === 'sticky').length % 6], fs: 18 }),
      text: (x, y) => ({ type: 'text', x, y: y - 14, w: 60, h: 30, html: '', fs: 22, color: 'ink', autoW: true }),
      mind: (x, y) => ({ type: 'mind', x: x - 90, y: y - 26, w: 180, h: 52, html: '', color: 'purple', root: true }),
    };

    /* ---------- text editing ---------- */
    function startEdit(id, isNew) {
      const e = byId(id); if (!e || readOnly || !TEXT_TYPES.includes(e.type)) return;
      if (editing && editing !== id) endEdit();
      editing = id; sel = new Set([id]); render();
      const n = nodes.get(id), txt = n && n.querySelector('.bd-txt'); if (!txt) return;
      txt.contentEditable = 'true'; txt.spellcheck = true; txt.focus();
      const r = document.createRange(); r.selectNodeContents(txt); if (!isNew) r.collapse(false);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      n._before = e.html || ''; n._isNew = !!isNew;
      txt.oninput = () => { if (e.type === 'text' || e.type === 'note' || e.type === 'mind') { measure(); renderSelection(); } };
      txt.onkeydown = ev => {
        if (ev.key === 'Escape') { ev.preventDefault(); endEdit(); }
        else if (e.type === 'mind' && ev.key === 'Tab') { ev.preventDefault(); const pid = e.id; endEdit(); addMind(pid, false); }
        else if (e.type === 'mind' && ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); const pid = e.id; endEdit(); if (byId(pid) && byId(pid).parent) addMind(pid, true); }
        ev.stopPropagation();
      };
      txt.onblur = () => setTimeout(() => { if (editing === id && !(ctxBar && ctxBar.contains(document.activeElement))) endEdit(); }, 0);
    }
    function endEdit() {
      const id = editing; if (!id) return;
      const e = byId(id), n = nodes.get(id), txt = n && n.querySelector('.bd-txt');
      editing = null;
      if (txt) { txt.contentEditable = 'false'; txt.oninput = txt.onkeydown = txt.onblur = null; }
      if (e && txt) {
        const html = OW.sanitizeHTML(txt.innerHTML).replace(/^(<br>)+$/, '');
        const empty = !txt.textContent.trim() && !/<img/i.test(html);
        if (e.type === 'text' && empty) { if (!n._isNew) snap(); els = data.elements = els.filter(x => x.id !== id); sel.delete(id); }
        else if (html !== (n._before || '')) { if (!n._isNew) snap(); e.html = html; }
      }
      if (n) n._key = null;
      changed();
    }

    /* ---------- selection helpers ---------- */
    function hitAt(cx, cy) {
      const el = document.elementFromPoint(cx, cy);
      const h = el && el.closest('[data-id]');
      return h && vp.contains(h) && !h.classList.contains('bd-cend') ? byId(h.dataset.id) : null;
    }
    function insideFrame(f) { const fb = bbox(f); return els.filter(e => e !== f && e.type !== 'frame' && (() => { const b = bbox(e); return b.x >= fb.x && b.y >= fb.y && b.x + b.w <= fb.x + fb.w && b.y + b.h <= fb.y + fb.h; })()); }
    function moveEl(e, dx, dy) {
      if (e.type === 'draw') e.points = e.points.map(([x, y]) => [x + dx, y + dy]);
      else if (e.type === 'connector') { if (!e.from) { e.x1 += dx; e.y1 += dy; } if (!e.to) { e.x2 += dx; e.y2 += dy; } }
      else { e.x += dx; e.y += dy; }
    }
    function deleteSel() {
      if (!sel.size) return; snap();
      const gone = new Set(sel);
      // a mind node takes its branch with it
      for (const id of [...gone]) { const e = byId(id); if (e && e.type === 'mind') treeOf(e).forEach(x => gone.add(x.id)); }
      els = data.elements = els.filter(e => !gone.has(e.id));
      // connectors that lose an end keep that end where it was
      for (const c of els) if (c.type === 'connector') { const [a, b] = connEnds(c); if (c.from && gone.has(c.from)) { c.from = null; c.x1 = a[0]; c.y1 = a[1]; } if (c.to && gone.has(c.to)) { c.to = null; c.x2 = b[0]; c.y2 = b[1]; } }
      // a connector whose ends were deleted keeps its last position
      for (const c of els) if (c.type === 'connector') { if (c.from && !byId(c.from)) c.from = null; if (c.to && !byId(c.to)) c.to = null; }
      sel.clear(); changed();
    }
    function copySel() {
      const list = [...sel].map(byId).filter(Boolean);
      const extra = list.flatMap(e => e.type === 'frame' ? insideFrame(e) : e.type === 'mind' ? treeOf(e) : []);
      const all = [...new Set([...list, ...extra])];
      OW._boardClip = JSON.stringify(all);
      return all;
    }
    function pasteClip(offset = 32) {
      if (!OW._boardClip) return; snap();
      let list = JSON.parse(OW._boardClip);
      const ids = new Set(list.map(e => e.id));
      list.forEach(e => { if (e.type === 'connector') { if (e.from && !ids.has(e.from)) { const [a] = connEnds(e); e.from = null; e.x1 = a[0]; e.y1 = a[1]; } if (e.to && !ids.has(e.to)) { const [, b] = connEnds(e); e.to = null; e.x2 = b[0]; e.y2 = b[1]; } } if (e.type === 'mind' && e.parent && !ids.has(e.parent)) { delete e.parent; e.root = true; } });
      list = instantiate(list, offset, offset);
      els.push(...list); sel = new Set(list.map(e => e.id)); changed();
      OW._boardClip = JSON.stringify(list);
    }
    function zOrder(front) {
      if (!sel.size) return; snap();
      const s = els.filter(e => sel.has(e.id)), r = els.filter(e => !sel.has(e.id));
      els = data.elements = front ? r.concat(s) : s.concat(r); changed();
    }

    /* ---------- tools ---------- */
    const TOOLS = [
      ['select', 'pointer', 'V'], ['hand', 'hand', 'H'], '|', ['note', 'noteCard', 'N'], ['sticky', 'sticky', 'S'], ['text', 'text', 'T'],
      ['shape', 'shapes', 'R'], ['connector', 'connector', 'C'], ['pen', 'pencil', 'P'], ['eraser', 'eraser', 'E'], '|', ['frame', 'frame', 'F'], ['mind', 'mindmap', 'M'], ['image', 'image', 'I'],
    ];
    function setTool(k) {
      if (k === 'image') { pickImage(); return; }
      if (editing) endEdit();
      tool = k; if (k !== 'select') { sel.clear(); renderSelection(); }
      vp.dataset.tool = k;
      ctx.refresh();
      placeCtxBar();
    }
    function pickImage(at) {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
      inp.onchange = () => Array.from(inp.files).forEach((f, i) => addImageFile(f, at ? at[0] + i * 30 : null, at ? at[1] + i * 30 : null));
      inp.click();
    }
    function addImageFile(file, x, y) {
      if (!file || !/^image\//.test(file.type)) return;
      const r = new FileReader();
      r.onload = () => { const im = new Image(); im.onload = () => {
        const sc = Math.min(1, 480 / im.width, 480 / im.height), w = Math.round(im.width * sc), h = Math.round(im.height * sc);
        if (x == null) { const rc = vp.getBoundingClientRect(); [x, y] = toWorld(rc.left + rc.width / 2, rc.top + rc.height / 2); x -= w / 2; y -= h / 2; }
        addEl({ type: 'image', x, y, w, h, src: r.result });
      }; im.src = r.result; };
      r.readAsDataURL(file);
    }

    /* ---------- pointer handling ---------- */
    function onDown(ev) {
      if (ev.button === 2) return;
      if (editing) { const n = nodes.get(editing); if (n && n.contains(ev.target)) return; endEdit(); }
      vp.focus({ preventScroll: true });
      const [wx, wy] = toWorld(ev.clientX, ev.clientY);
      // panning: hand tool, space, middle button
      if (tool === 'hand' || spaceDown || ev.button === 1) { ev.preventDefault(); drag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, vx: view.x, vy: view.y }; vp.classList.add('panning'); return capture(ev); }
      if (readOnly) return;
      const handle = ev.target.closest('.bd-h'), cend = ev.target.closest('.bd-cend'), port = ev.target.closest('.bd-port');
      if (handle) { const e = byId([...sel][0]); snap(); drag = { kind: 'resize', h: handle.dataset.h, e, b0: bbox(e), sx: wx, sy: wy }; return capture(ev); }
      if (cend) { const e = byId(cend.dataset.id); snap(); drag = { kind: 'cend', e, end: cend.dataset.end }; return capture(ev); }
      if (port) { const src = byId([...sel][0]); drag = { kind: 'connect', from: src, sx: wx, sy: wy, x: wx, y: wy }; return capture(ev); }
      const hit = hitAt(ev.clientX, ev.clientY);
      if (tool === 'eraser') { snap(); drag = { kind: 'erase', removed: 0 }; eraseAt(ev.clientX, ev.clientY); return capture(ev); }
      if (tool === 'pen') { drag = { kind: 'pen', pts: [[wx, wy]] }; return capture(ev); }
      if (tool === 'note' || tool === 'sticky' || tool === 'text' || tool === 'mind') { ev.preventDefault(); const e = mk[tool](wx, wy); addEl(e, true); return; }
      if (tool === 'shape' || tool === 'frame') { drag = { kind: 'create', what: tool, sx: wx, sy: wy, x: wx, y: wy }; return capture(ev); }
      if (tool === 'connector') { drag = { kind: 'connect', from: hit && hit.type !== 'connector' && hit.type !== 'draw' ? hit : null, sx: wx, sy: wy, x: wx, y: wy }; return capture(ev); }
      // select tool
      if (hit) {
        if (ev.shiftKey) { sel.has(hit.id) ? sel.delete(hit.id) : sel.add(hit.id); render(); return; }
        if (!sel.has(hit.id)) { sel = new Set([hit.id]); render(); }
        const moving = new Set(sel);
        for (const id of sel) { const e = byId(id); if (!e) continue; if (e.type === 'frame') insideFrame(e).forEach(x => moving.add(x.id)); if (e.type === 'mind') treeOf(rootOf(e)).forEach(x => moving.add(x.id)); }
        drag = { kind: 'move', ids: [...moving], lx: wx, ly: wy, moved: false };
        return capture(ev);
      }
      if (!ev.shiftKey) sel.clear();
      drag = { kind: 'marquee', sx: wx, sy: wy, x: wx, y: wy, base: new Set(sel) };
      render(); capture(ev);
    }
    function capture(ev) { try { vp.setPointerCapture(ev.pointerId); } catch { /* ignore */ } }
    function eraseAt(cx, cy) {
      const e = hitAt(cx, cy); if (!e) return;
      const before = els.length; sel = new Set([e.id]); const u = undo.length; deleteSel(); if (undo.length > u) undo.pop();   // one undo step for the whole stroke
      drag.removed += before - els.length;
    }
    function onMove(ev) {
      if (!drag) return;
      const [wx, wy] = toWorld(ev.clientX, ev.clientY);
      if (drag.kind === 'pan') { view.x = drag.vx + ev.clientX - drag.sx; view.y = drag.vy + ev.clientY - drag.sy; applyView(); return; }
      if (drag.kind === 'move') {
        const dx = wx - drag.lx, dy = wy - drag.ly; if (!dx && !dy) return;
        if (!drag.moved) { snap(); drag.moved = true; }
        drag.ids.forEach(id => { const e = byId(id); if (e) moveEl(e, dx, dy); });
        drag.lx = wx; drag.ly = wy; render(); return;
      }
      if (drag.kind === 'resize') {
        const { e, b0, h } = drag, dx = wx - drag.sx, dy = wy - drag.sy;
        let x = b0.x, y = b0.y, w = b0.w, hh = b0.h;
        if (h.includes('e')) w = Math.max(40, b0.w + dx); if (h.includes('w')) { w = Math.max(40, b0.w - dx); x = b0.x + b0.w - w; }
        if (h.includes('s')) hh = Math.max(30, b0.h + dy); if (h.includes('n')) { hh = Math.max(30, b0.h - dy); y = b0.y + b0.h - hh; }
        if (e.type === 'image' || (e.type === 'sticky' && !ev.shiftKey && false)) { const r = b0.w / b0.h; if (w / hh > r) w = hh * r; else hh = w / r; if (h.includes('w')) x = b0.x + b0.w - w; if (h.includes('n')) y = b0.y + b0.h - hh; }
        e.x = x; e.y = y; e.w = w; if (e.type !== 'note' && e.type !== 'text') e.h = hh; if (e.type === 'text') e.autoW = false;
        render(); return;
      }
      if (drag.kind === 'cend') {
        const t2 = hitAt(ev.clientX, ev.clientY), ok = t2 && t2 !== drag.e && t2.type !== 'connector' && t2.type !== 'draw';
        if (drag.end === '1') { drag.e.from = ok ? t2.id : null; drag.e.x1 = wx; drag.e.y1 = wy; } else { drag.e.to = ok ? t2.id : null; drag.e.x2 = wx; drag.e.y2 = wy; }
        render(); return;
      }
      if (drag.kind === 'pen') { const l = drag.pts[drag.pts.length - 1]; if (Math.hypot(wx - l[0], wy - l[1]) * view.z < 2) return; drag.pts.push([wx, wy]); drag.preview = `<path d="${smoothPath(drag.pts)}" stroke="${strokeOf(penColor)}" stroke-width="${penWidth}" class="ink"${penWidth > 10 ? ' opacity=".35"' : ''}/>`; render(); return; }
      if (drag.kind === 'erase') { eraseAt(ev.clientX, ev.clientY); return; }
      if (drag.kind === 'create' || drag.kind === 'marquee') {
        drag.x = wx; drag.y = wy;
        const x0 = Math.min(drag.sx, wx), y0 = Math.min(drag.sy, wy), w = Math.abs(wx - drag.sx), h = Math.abs(wy - drag.sy);
        if (drag.kind === 'marquee') {
          const [sx, sy] = toScreen(x0, y0); Object.assign(marqueeEl.style, { display: 'block', left: sx + 'px', top: sy + 'px', width: w * view.z + 'px', height: h * view.z + 'px' });
          sel = new Set(drag.base);
          for (const e of els) { const b = bbox(e); if (b.x >= x0 && b.y >= y0 && b.x + b.w <= x0 + w && b.y + b.h <= y0 + h) sel.add(e.id); }
          render();
        } else { drag.preview = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="6" class="bd-ghost"/>`; render(); }
        return;
      }
      if (drag.kind === 'connect') {
        drag.x = wx; drag.y = wy;
        const tgt = hitAt(ev.clientX, ev.clientY), ok = tgt && tgt !== drag.from && tgt.type !== 'connector' && tgt.type !== 'draw';
        const a = drag.from ? edgePoint(bbox(drag.from), [wx, wy]) : [drag.sx, drag.sy], b = ok ? edgePoint(bbox(tgt), a) : [wx, wy];
        drag.preview = `<path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}" class="ink bd-ghostline"/>` + (ok ? `<rect x="${tgt.x - 4}" y="${tgt.y - 4}" width="${(tgt.w || 0) + 8}" height="${(tgt.h || 0) + 8}" rx="8" class="bd-target"/>` : '');
        render();
      }
    }
    function onUp(ev) {
      const d = drag; drag = null; vp.classList.remove('panning');
      if (!d) return;
      marqueeEl.style.display = 'none';
      if (d.kind === 'pan') { if (d.sx === ev.clientX && d.sy === ev.clientY && tool === 'hand') { /* click */ } ctx.markDirty(); return; }
      if (d.kind === 'move') { if (d.moved) ctx.markDirty(); render(); return; }
      if (d.kind === 'resize' || d.kind === 'cend') { ctx.markDirty(); render(); return; }
      if (d.kind === 'erase') { if (!d.removed) undo.pop(); render(); return; }
      if (d.kind === 'pen') { if (d.pts.length > 1) addEl({ type: 'draw', points: d.pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]), color: penColor, sw: penWidth, hl: penWidth > 10 }, false, true); else render(); return; }
      if (d.kind === 'create') {
        let x0 = Math.min(d.sx, d.x), y0 = Math.min(d.sy, d.y), w = Math.abs(d.x - d.sx), h = Math.abs(d.y - d.sy);
        const small = w * view.z < 8 && h * view.z < 8;
        if (d.what === 'shape') { if (small) { w = 160; h = 100; x0 -= 80; y0 -= 50; } addEl({ type: 'shape', kind: shapeKind, x: x0, y: y0, w, h, color: 'blue', html: '', fs: 18 }); }
        else { if (small) { w = 640; h = 420; x0 -= 40; y0 -= 40; } const f = addEl({ type: 'frame', x: x0, y: y0, w, h, title: t('board.frame') + ' ' + (els.filter(e => e.type === 'frame').length + 1), color: 'gray' }); els = data.elements = [f].concat(els.filter(e => e !== f)); render(); }
        return;
      }
      if (d.kind === 'connect') {
        const tgt = hitAt(ev.clientX, ev.clientY), ok = tgt && tgt !== d.from && tgt.type !== 'connector' && tgt.type !== 'draw';
        if (!d.from && !ok && Math.hypot(d.x - d.sx, d.y - d.sy) * view.z < 8) { render(); return; }
        addEl({ type: 'connector', from: d.from ? d.from.id : null, to: ok ? tgt.id : null, x1: d.sx, y1: d.sy, x2: d.x, y2: d.y, arrow: true, mode: 'curve', color: 'ink', sw: 2 });
        return;
      }
      if (d.kind === 'marquee') render();
    }
    function onWheel(ev) {
      ev.preventDefault();
      if (ev.ctrlKey || ev.metaKey) zoomAt(view.z * Math.pow(1.0018, -ev.deltaY), ev.clientX, ev.clientY);
      else { view.x -= ev.shiftKey && !ev.deltaX ? ev.deltaY : ev.deltaX; view.y -= ev.shiftKey && !ev.deltaX ? 0 : ev.deltaY; applyView(); }
    }
    function onDbl(ev) {
      if (readOnly) return;
      const hit = hitAt(ev.clientX, ev.clientY);
      if (hit && TEXT_TYPES.includes(hit.type)) { startEdit(hit.id); return; }
      if (hit && hit.type === 'frame') { OW.prompt(t('board.frameTitle'), hit.title || '').then(v => { if (v != null) { snap(); hit.title = v; changed(); } }); return; }
      if (!hit && (tool === 'select' || tool === 'hand')) { const [wx, wy] = toWorld(ev.clientX, ev.clientY); addEl(mk.note(wx, wy), true); }
    }

    /* ---------- context toolbar ---------- */
    function placeCtxBar() {
      if (!ctxBar) return;
      const list = [...sel].map(byId).filter(Boolean);
      if (!list.length || drag && drag.kind !== 'pan' || readOnly) { ctxBar.hidden = true; return; }
      const bs = list.map(bbox), x0 = Math.min(...bs.map(b => b.x)), y0 = Math.min(...bs.map(b => b.y)), x1 = Math.max(...bs.map(b => b.x + b.w));
      const [sx, sy] = toScreen((x0 + x1) / 2, y0);
      ctxBar.hidden = false;
      const w = ctxBar.offsetWidth, h = ctxBar.offsetHeight;
      ctxBar.style.left = Math.max(8, Math.min(vp.clientWidth - w - 8, sx - w / 2)) + 'px';
      ctxBar.style.top = Math.max(8, sy - h - 18) + 'px';
    }
    function buildCtxBar() {
      const list = [...sel].map(byId).filter(Boolean);
      if (!list.length) { ctxBar.hidden = true; ctxBar.innerHTML = ''; return; }
      const types = new Set(list.map(e => e.type)), one = list.length === 1 ? list[0] : null;
      const B = (act, icon, title, on) => `<button data-act="${act}" class="${on ? 'on' : ''}" title="${E(title)}">${I(icon, 17)}</button>`;
      let h = '';
      if (editing) {
        h += B('bold', 'bold', t('bold')) + B('italic', 'italic', t('italic')) + B('underline', 'underline', t('underline')) + B('strike', 'strike', t('strike')) + '<span class="sep"></span>' + B('ul', 'list', t('bullets')) + B('ol', 'olist', t('numbering')) + B('check', 'checklist', t('note.tag.todo'));
        if (types.has('note')) h += B('h2', 'heading', t('word.st.h2'));
        h += '<span class="sep"></span>';
      }
      const colorable = [...types].some(x => x !== 'image');
      if (colorable) {
        const cur = one ? one.color : null;
        h += `<button data-act="colors" class="swatch" title="${E(t('board.color'))}" style="--sw:${cur && cur !== 'ink' && cur !== 'none' ? pal(cur).fill : 'transparent'};--sb:${cur && cur !== 'ink' && cur !== 'none' ? pal(cur).stroke : 'var(--bd-ink)'}"><i></i></button>`;
      }
      if (one && one.type === 'shape') h += B('kind', { rect: 'square', roundRect: 'roundRect', ellipse: 'circle', diamond: 'diamond', triangle: 'triangle' }[one.kind] || 'square', t('board.shapeKind'));
      if ([...types].some(x => ['note', 'sticky', 'text', 'shape', 'mind'].includes(x))) h += `<button data-act="font" class="wl" title="${E(t('draw.fontSize'))}">${one && one.fs ? one.fs : '–'}</button>`;
      if (types.has('connector')) { const c = one && one.type === 'connector' ? one : null; h += B('mode-straight', 'line', t('board.straight'), c && c.mode === 'straight') + B('mode-curve', 'curve', t('board.curve'), c && c.mode === 'curve') + B('mode-elbow', 'elbow', t('board.elbow'), c && c.mode === 'elbow') + B('arrow', 'arrowEnd', t('board.arrowHead'), c && c.arrow !== false); }
      if (types.has('connector') || types.has('draw')) h += B('width', 'line', t('draw.width'));
      if (one && one.type === 'mind') h += '<span class="sep"></span>' + B('mchild', 'plus', t('board.addChild') + ' (Tab)') + (one.parent ? B('msib', 'filePlus', t('board.addSibling') + ' (Enter)') : '');
      if (one && one.type === 'frame') h += B('ftitle', 'text', t('board.frameTitle')) + B('fzoom', 'expand', t('board.focusFrame'));
      h += '<span class="sep"></span>' + B('front', 'front', t('board.front')) + B('back', 'back', t('board.back')) + B('dup', 'copy', t('duplicate') + ' (Ctrl+D)') + B('del', 'trash', t('delete'));
      ctxBar.innerHTML = h;
      placeCtxBar();
    }
    function ctxAction(act, btn) {
      const list = [...sel].map(byId).filter(Boolean), one = list.length === 1 ? list[0] : null;
      const cmd = c => { document.execCommand(c, false, null); };
      switch (act) {
        case 'bold': return cmd('bold'); case 'italic': return cmd('italic'); case 'underline': return cmd('underline'); case 'strike': return cmd('strikeThrough');
        case 'ul': return cmd('insertUnorderedList'); case 'ol': return cmd('insertOrderedList');
        case 'check': return document.execCommand('insertHTML', false, '<ul class="checks"><li>☐ </li></ul>');
        case 'h2': return document.execCommand('formatBlock', false, 'h2');
        case 'colors': {
          const withInk = list.some(e => ['text', 'connector', 'draw'].includes(e.type)), withNone = list.some(e => e.type === 'shape');
          const keys = (withInk ? ['ink'] : []).concat(withNone ? ['none'] : []).concat(PAL.map(p => p.k));
          OW.popover(btn, [{ html: `<div class="bd-pal">${keys.map(k => `<button data-c="${k}" title="${E(t('board.c.' + k))}" style="--sw:${k === 'ink' ? 'var(--bd-ink)' : k === 'none' ? 'transparent' : pal(k).fill};--sb:${k === 'ink' ? 'var(--bd-ink)' : k === 'none' ? 'var(--ink-3)' : pal(k).stroke}"></button>`).join('')}</div>`,
            init: el => el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { snap(); list.forEach(e => { if (b.dataset.c === 'none' && e.type !== 'shape') return; if (b.dataset.c === 'ink' && !['text', 'connector', 'draw'].includes(e.type)) return; e.color = b.dataset.c; }); document.querySelectorAll('.popover').forEach(p => p.remove()); changed(); buildCtxBar(); }) }]);
          return;
        }
        case 'kind': return OW.popover(btn, [['rect', 'square'], ['roundRect', 'roundRect'], ['ellipse', 'circle'], ['diamond', 'diamond'], ['triangle', 'triangle']].map(([k, ic]) => ({ icon: ic, label: t('board.k.' + k), checked: one.kind === k, onClick: () => { snap(); one.kind = k; changed(); buildCtxBar(); } })));
        case 'font': return OW.popover(btn, [12, 14, 15, 16, 18, 20, 24, 28, 32, 40, 48, 64].map(s => ({ label: s + ' px', noPad: true, checked: one && one.fs === s, onClick: () => { snap(); list.forEach(e => { if (TEXT_TYPES.includes(e.type)) e.fs = s; }); changed(); buildCtxBar(); } })));
        case 'mode-straight': case 'mode-curve': case 'mode-elbow': snap(); list.forEach(e => { if (e.type === 'connector') e.mode = act.slice(5); }); changed(); return buildCtxBar();
        case 'arrow': snap(); list.forEach(e => { if (e.type === 'connector') e.arrow = e.arrow === false; }); changed(); return buildCtxBar();
        case 'width': return OW.popover(btn, [[1, 'S'], [2, 'M'], [4, 'L'], [8, 'XL']].map(([w, l]) => ({ label: `${l} · ${w}px`, noPad: true, onClick: () => { snap(); list.forEach(e => { if (e.type === 'connector' || e.type === 'draw') e.sw = w * (e.hl ? 4 : 1); }); changed(); } })));
        case 'mchild': return addMind(one.id, false);
        case 'msib': return addMind(one.id, true);
        case 'ftitle': return OW.prompt(t('board.frameTitle'), one.title || '').then(v => { if (v != null) { snap(); one.title = v; changed(); } });
        case 'fzoom': return fitAll([one]);
        case 'front': return zOrder(true); case 'back': return zOrder(false);
        case 'dup': copySel(); return pasteClip(24);
        case 'del': return deleteSel();
      }
    }

    /* ---------- export ---------- */
    function plainLines(html) { const d = document.createElement('div'); d.innerHTML = OW.sanitizeHTML(html || '').replace(/<\/(p|div|h\d|li)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n'); return d.textContent.replace(/\n{3,}/g, '\n\n').trim().split('\n'); }
    const meas = document.createElement('canvas').getContext('2d');
    function wrap(lines, width, fs) {
      meas.font = `${fs}px "Segoe UI", system-ui, sans-serif`;
      const out = [];
      for (const line of lines) { let cur = ''; for (const w of line.split(/\s+/)) { const tryL = cur ? cur + ' ' + w : w; if (meas.measureText(tryL).width > width && cur) { out.push(cur); cur = w; } else cur = tryL; } out.push(cur); }
      return out;
    }
    function exportSVG() {
      if (!els.length) return null;
      const bs = els.map(bbox), x0 = Math.min(...bs.map(b => b.x)) - 40, y0 = Math.min(...bs.map(b => b.y)) - 60, x1 = Math.max(...bs.map(b => b.x + b.w)) + 40, y1 = Math.max(...bs.map(b => b.y + b.h)) + 40;
      const ink = '#2B2F3A', st = k => k === 'ink' || !k ? ink : pal(k).stroke;
      const txt = (e, x, y, width, fs, color, centerV, h) => {
        const lines = wrap(plainLines(e.html), width, fs), lh = fs * 1.35;
        const top = centerV ? y + (h - lines.length * lh) / 2 : y;
        return `<text font-family="Segoe UI, sans-serif" font-size="${fs}" fill="${color}">${lines.map((l, i) => `<tspan x="${centerV ? x + width / 2 : x}" y="${top + lh * (i + 0.8)}"${centerV ? ' text-anchor="middle"' : ''}>${E(l)}</tspan>`).join('')}</text>`;
      };
      let out = '';
      const order = els.filter(e => e.type === 'frame').concat(els.filter(e => e.type !== 'frame'));
      for (const e of els) if (e.type === 'mind' && e.parent) { const P = byId(e.parent); if (!P) continue; const a = [P.x + P.w, P.y + P.h / 2], b = [e.x, e.y + e.h / 2], mx = (a[0] + b[0]) / 2; out += `<path d="M${a[0]} ${a[1]} C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}" fill="none" stroke="${pal(e.color).stroke}" stroke-width="2.5"/>`; }
      for (const e of order) {
        const p = pal(e.color);
        if (e.type === 'frame') out += `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="12" fill="${p.fill}" fill-opacity=".35" stroke="${p.stroke}" stroke-dasharray="6 5"/><text x="${e.x + 4}" y="${e.y - 10}" font-family="Segoe UI, sans-serif" font-size="15" font-weight="600" fill="${p.stroke}">${E(e.title || '')}</text>`;
        else if (e.type === 'note') out += `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="10" fill="${p.fill}" stroke="#D5D9E2"/>` + txt(e, e.x + 18, e.y + 14, e.w - 36, e.fs || 15, ink);
        else if (e.type === 'sticky') out += `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="4" fill="${p.fill}" stroke="${p.stroke}" stroke-opacity=".35"/>` + txt(e, e.x + 16, e.y + 14, e.w - 32, e.fs || 18, ink);
        else if (e.type === 'mind') out += `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${e.h / 2}" fill="${e.root ? p.stroke : p.fill}" stroke="${p.stroke}" stroke-width="2"/>` + txt(e, e.x + 12, e.y, e.w - 24, e.fs || 15, e.root ? '#fff' : ink, true, e.h);
        else if (e.type === 'text') out += txt(e, e.x, e.y, Math.max(e.w, 40), e.fs || 22, st(e.color));
        else if (e.type === 'shape') out += `<g transform="translate(${e.x} ${e.y})">${shapeSVG(e).replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/var\(--bd-ink\)/g, ink)}</g>` + txt(e, e.x + 10, e.y, e.w - 20, e.fs || 18, ink, true, e.h);
        else if (e.type === 'image') out += `<image href="${E(e.src)}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" preserveAspectRatio="none"/>`;
        else if (e.type === 'draw') out += `<path d="${smoothPath(e.points)}" fill="none" stroke="${st(e.color)}" stroke-width="${e.sw || 3}" stroke-linecap="round" stroke-linejoin="round"${e.hl ? ' opacity=".35"' : ''}/>`;
        else if (e.type === 'connector') { const c = connPath(e), sw = e.sw || 2; out += `<path d="${c.d}" fill="none" stroke="${st(e.color)}" stroke-width="${sw}" stroke-linecap="round"/>` + (e.arrow !== false ? `<path d="${arrowHead(c.end, c.dir, sw)}" fill="none" stroke="${st(e.color)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>` : ''); }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" width="${Math.round(x1 - x0)}" height="${Math.round(y1 - y0)}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#ffffff"/>${out}</svg>`;
    }
    function exportPNG() {
      const s = exportSVG(); if (!s) return OW.toast(t('draw.empty'));
      const img = new Image();
      img.onload = () => { const sc = Math.min(2, 8000 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * sc; c.height = img.height * sc; const g = c.getContext('2d'); g.scale(sc, sc); g.drawImage(img, 0, 0); c.toBlob(b => OW.download(b, OW.safeName(ctx.file.name) + '.png'), 'image/png'); };
      img.onerror = () => OW.toast(t('unsupported'), 'warn');
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    }
    function toExcalidraw() {
      const out = [];
      for (const e of els) {
        const base = { id: e.id, angle: 0, strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid', roughness: 1, opacity: 100, seed: 1, isDeleted: false, version: 1 };
        const p = pal(e.color);
        if (['note', 'sticky', 'shape', 'mind', 'frame'].includes(e.type)) {
          out.push(Object.assign({}, base, { type: e.type === 'shape' && (e.kind === 'ellipse' || e.kind === 'diamond') ? e.kind : 'rectangle', x: e.x, y: e.y, width: e.w, height: e.h, backgroundColor: e.color === 'none' ? 'transparent' : p.fill, strokeColor: e.type === 'frame' ? p.stroke : '#1e1e1e', strokeStyle: e.type === 'frame' ? 'dashed' : 'solid' }));
          const text = e.type === 'frame' ? e.title : plainLines(e.html).join('\n');
          if (text) out.push(Object.assign({}, base, { id: e.id + '-t', type: 'text', x: e.x + 12, y: e.type === 'frame' ? e.y - 28 : e.y + 12, width: e.w - 24, height: 24, text, originalText: text, fontSize: e.fs || 18, fontFamily: 2 }));
        } else if (e.type === 'text') { const text = plainLines(e.html).join('\n'); out.push(Object.assign({}, base, { type: 'text', x: e.x, y: e.y, width: e.w, height: e.h, text, originalText: text, fontSize: e.fs || 20, fontFamily: 2 })); }
        else if (e.type === 'connector') { const [a, b] = connEnds(e); out.push(Object.assign({}, base, { type: e.arrow !== false ? 'arrow' : 'line', x: a[0], y: a[1], width: Math.abs(b[0] - a[0]), height: Math.abs(b[1] - a[1]), points: [[0, 0], [b[0] - a[0], b[1] - a[1]]] })); }
        else if (e.type === 'draw' && e.points.length) { const [ox, oy] = e.points[0]; out.push(Object.assign({}, base, { type: 'freedraw', x: ox, y: oy, width: 1, height: 1, points: e.points.map(([x, y]) => [x - ox, y - oy]), strokeWidth: e.sw || 2 })); }
      }
      return JSON.stringify({ type: 'excalidraw', version: 2, source: 'office-werkstatt', elements: out, appState: { viewBackgroundColor: '#ffffff' } }, null, 2);
    }
    function importExcalidraw() {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.excalidraw,.json';
      inp.onchange = async () => { try { const b = OW.drawMigrate({ elements: OW.excalidrawToElements(JSON.parse(await inp.files[0].text())) }); snap(); els.push(...b.elements); changed(); fitAll(); } catch { OW.toast(t('unsupported'), 'warn'); } };
      inp.click();
    }
    function insertTemplate(kind) {
      const rc = vp.getBoundingClientRect(); const [cx, cy] = toWorld(rc.left + rc.width / 2, rc.top + rc.height / 2);
      const list = OW.boardTemplate(kind, t), bs = list.filter(e => e.x !== undefined), x0 = Math.min(...bs.map(e => e.x)), y0 = Math.min(...bs.map(e => e.y)), x1 = Math.max(...bs.map(e => e.x + e.w)), y1 = Math.max(...bs.map(e => e.y + e.h));
      const fresh = instantiate(list, cx - (x0 + x1) / 2, cy - (y0 + y1) / 2);
      snap(); els.push(...fresh);
      els = data.elements = els.filter(e => e.type === 'frame').concat(els.filter(e => e.type !== 'frame'));
      sel = new Set(fresh.map(e => e.id)); changed(); setTimeout(() => fitAll(fresh), 30);
    }
    /* ---------- keyboard / clipboard ---------- */
    const active = () => vp && document.body.contains(vp) && document.getElementById('modal').hidden;
    const typing = () => { const a = document.activeElement; return a && (a.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName)); };
    const keys = ev => {
      if (!active() || editing || typing()) return;
      const k = ev.key, low = k.toLowerCase(), mod = ev.ctrlKey || ev.metaKey;
      if (k === ' ' && !spaceDown) { spaceDown = true; vp.classList.add('space'); ev.preventDefault(); return; }
      if (mod && low === 'z') { ev.preventDefault(); return ev.shiftKey ? doRedo() : doUndo(); }
      if (mod && low === 'y') { ev.preventDefault(); return doRedo(); }
      if (readOnly) return;
      if (mod && low === 'a') { ev.preventDefault(); sel = new Set(els.map(e => e.id)); setTool('select'); return render(); }
      if (mod && low === 'd') { ev.preventDefault(); copySel(); return pasteClip(24); }
      if (mod && (low === 'c' || low === 'x')) return;   // handled by the copy / cut events below
      if (mod && (k === '+' || k === '=')) { ev.preventDefault(); return zoomAt(view.z * 1.2); }
      if (mod && k === '-') { ev.preventDefault(); return zoomAt(view.z / 1.2); }
      if (mod && k === '0') { ev.preventDefault(); return zoomAt(1); }
      if (mod) return;
      if (k === '!' || (ev.shiftKey && k === '1')) return fitAll();
      if (k === 'Delete' || k === 'Backspace') { ev.preventDefault(); return deleteSel(); }
      if (k === 'Escape') { sel.clear(); setTool('select'); return render(); }
      const one = sel.size === 1 ? byId([...sel][0]) : null;
      if (one && one.type === 'mind' && k === 'Tab') { ev.preventDefault(); return addMind(one.id, false); }
      if (one && one.type === 'mind' && k === 'Enter' && one.parent) { ev.preventDefault(); return addMind(one.id, true); }
      if (one && k === 'Enter' && TEXT_TYPES.includes(one.type)) { ev.preventDefault(); return startEdit(one.id); }
      if (k.startsWith('Arrow') && sel.size) { ev.preventDefault(); snap(); const s = ev.shiftKey ? 10 : 1, dx = k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0, dy = k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0; [...sel].forEach(id => { const e = byId(id); if (e) moveEl(e, dx, dy); }); return changed(); }
      const tl = TOOLS.find(x => x !== '|' && x[2].toLowerCase() === low); if (tl) { ev.preventDefault(); setTool(tl[0]); }
    };
    const keyUp = ev => { if (ev.key === ' ') { spaceDown = false; vp && vp.classList.remove('space'); } };
    const CLIP = 'application/x-office-werkstatt-board';
    const onCopy = ev => {
      if (!active() || editing || typing() || !sel.size || !ev.clipboardData) return;
      const list = copySel();
      ev.clipboardData.setData(CLIP, OW._boardClip);
      ev.clipboardData.setData('text/plain', list.map(e => e.type === 'frame' ? e.title || '' : plainLines(e.html).join(String.fromCharCode(10))).filter(Boolean).join(String.fromCharCode(10, 10)));
      ev.preventDefault();
      if (ev.type === 'cut' && !readOnly) deleteSel();
    };
    const onPaste = ev => {
      if (!active() || editing || typing() || readOnly) return;
      const cd = ev.clipboardData; if (!cd) return;
      const board = cd.getData(CLIP);
      if (board) { ev.preventDefault(); OW._boardClip = board; return pasteClip(); }
      const img = Array.from(cd.items || []).find(i => i.type.startsWith('image/'));
      if (img) { ev.preventDefault(); return addImageFile(img.getAsFile()); }
      const text = cd.getData('text/plain');
      if (text && text.trim()) { ev.preventDefault(); const rc = vp.getBoundingClientRect(); const [x, y] = toWorld(rc.left + rc.width / 2, rc.top + rc.height / 2); addEl(Object.assign(mk.note(x, y), { html: escHTML(text.slice(0, 20000)) })); }
    };
    function doUndo() { if (!undo.length) return; if (editing) endEdit(); redo.push(JSON.stringify(els)); els = data.elements = JSON.parse(undo.pop()); sel.clear(); changed(); }
    function doRedo() { if (!redo.length) return; undo.push(JSON.stringify(els)); els = data.elements = JSON.parse(redo.pop()); sel.clear(); changed(); }

    /* ---------- ribbon (classic Office layout) ---------- */
    const toolDef = k => TOOLS.find(x => x !== '|' && x[0] === k);
    const short = k => t('board.t.' + k).replace(/\s*\(.*\)\s*$/, '');
    const toolItem = (k, big) => ({ icon: toolDef(k)[1], label: big === false ? undefined : short(k), title: `${t('board.t.' + k)} · ${toolDef(k)[2]}`, active: () => tool === k, onClick: () => setTool(k) });
    const SHAPES = [['rect', 'square'], ['roundRect', 'roundRect'], ['ellipse', 'circle'], ['diamond', 'diamond'], ['triangle', 'triangle']];
    const shapeMenu = () => ({ t: 'menu', icon: 'shapes', label: short('shape'), title: t('board.t.shape') + ' · R', active: () => tool === 'shape',
      items: () => SHAPES.map(([k, ic]) => ({ icon: ic, label: t('board.k.' + k), checked: tool === 'shape' && shapeKind === k, onClick: () => { shapeKind = k; setTool('shape'); } })) });
    const PEN_COLORS = ['ink', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
    const penMenu = () => ({ t: 'menu', icon: 'pencil', label: short('pen'), title: t('board.t.pen') + ' · P', active: () => tool === 'pen',
      items: () => [{ html: `<div class="bd-pal">${PEN_COLORS.map(k => `<button data-c="${k}" class="${penColor === k ? 'on' : ''}" title="${E(t('board.c.' + k))}" style="--sw:${k === 'ink' ? 'var(--ink)' : pal(k).stroke};--sb:${k === 'ink' ? 'var(--ink)' : pal(k).stroke}"></button>`).join('')}</div>`,
        init: el => el.querySelectorAll('[data-c]').forEach(x => x.onclick = () => { penColor = x.dataset.c; document.querySelectorAll('.popover').forEach(p => p.remove()); setTool('pen'); }) },
        '-', ...[[2, t('board.pen.fine')], [3, t('board.pen.normal')], [6, t('board.pen.bold')], [18, t('highlight')]].map(([w, l]) => ({ label: l, checked: penWidth === w, onClick: () => { penWidth = w; setTool('pen'); } }))] });
    const TPL = ['brainstorm', 'mind', 'kanban', 'retro', 'swot', 'flow'], TPL_ICON = { brainstorm: 'sticky', mind: 'mindmap', kanban: 'frame', retro: 'layers', swot: 'grid', flow: 'shapes' };
    const tplMenu = () => ({ t: 'menu', icon: 'layers', label: t('board.templates'), items: () => TPL.map(k => ({ icon: TPL_ICON[k], label: t('board.tpl.' + k), onClick: () => insertTemplate(k) })) });
    const clearAll = () => OW.confirm(t('draw.clearConfirm')).then(ok => { if (ok) { snap(); els = data.elements = []; sel.clear(); changed(); } });
    const R = [
      { id: 'start', label: t('tab.home'), groups: [
        { items: [{ icon: 'undo', title: t('undo') + ' (Ctrl+Z)', onClick: () => doUndo() }, { icon: 'redo', title: t('redo') + ' (Ctrl+Y)', onClick: () => doRedo() }] },
        { items: [toolItem('select'), toolItem('hand')] },
        { items: [toolItem('note'), toolItem('sticky'), toolItem('text')] },
        { items: [shapeMenu(), toolItem('connector'), penMenu(), toolItem('eraser')] },
        { items: [toolItem('frame'), toolItem('mind'), { icon: 'image', label: t('image'), title: t('board.t.image') + ' · I', onClick: () => pickImage() }] },
        { items: [{ icon: 'copy', title: t('duplicate') + ' (Ctrl+D)', onClick: () => { copySel(); pasteClip(24); } }, { icon: 'front', title: t('board.front'), onClick: () => zOrder(true) }, { icon: 'back', title: t('board.back'), onClick: () => zOrder(false) }, { icon: 'trash', title: t('delete') + ' (Del)', onClick: () => deleteSel() }] },
        { items: [{ icon: 'lock', title: t('draw.lock'), active: () => lockTool, onClick: () => { lockTool = !lockTool; ctx.refresh(); } }] },
      ] },
      { id: 'insert', label: t('tab.insert'), groups: [
        { items: [toolItem('note'), toolItem('sticky'), toolItem('text'), shapeMenu(), toolItem('connector')] },
        { items: [{ icon: 'image', label: t('image'), onClick: () => pickImage() }, toolItem('frame'), toolItem('mind')] },
        { items: [tplMenu()] },
        { items: [{ icon: 'upload', label: t('draw.importExcalidraw'), onClick: importExcalidraw }] },
      ] },
      { id: 'draw', label: t('tab.draw'), groups: [
        { items: [toolItem('select'), toolItem('hand')] },
        { items: PEN_COLORS.map(k => ({ t: 'custom', html: `<button class="pen-chip" title="${E(t('board.c.' + k))}" style="--pc:${k === 'ink' ? 'var(--ink)' : pal(k).stroke}">${I('pen', 18)}</button>`, init: el => el.addEventListener('click', () => { penColor = k; if (penWidth > 10) penWidth = 3; setTool('pen'); }) }))
          .concat([{ icon: 'highlight', label: t('highlight'), active: () => tool === 'pen' && penWidth > 10, onClick: () => { penWidth = 18; if (penColor === 'ink') penColor = 'yellow'; setTool('pen'); } }, toolItem('eraser')]) },
      ] },
      { id: 'view', label: t('tab.view'), groups: [
        { items: [{ icon: 'zoomOut', title: t('zoomOut'), onClick: () => zoomAt(view.z / 1.25) }, { icon: 'search', label: '100 %', onClick: () => zoomAt(1) }, { icon: 'zoomIn', title: t('zoomIn'), onClick: () => zoomAt(view.z * 1.25) }, { icon: 'expand', label: t('draw.fit'), title: t('draw.fit') + ' (Shift+1)', onClick: () => fitAll() }] },
        { items: [{ icon: 'sidebar', label: t('focusMode'), onClick: () => ctx.root.classList.toggle('focus') }] },
        { items: [{ icon: 'trash', label: t('draw.clear'), onClick: clearAll }] },
      ] },
      { id: 'help', label: t('tab.help'), groups: [{ items: [{ icon: 'sparkle', label: t('help.shortcuts'), onClick: () => OW.alert(t('help.shortcuts'), `<div class="bd-keys">${t('board.shortcuts')}</div>`) }, { icon: 'app', label: t('help.about'), onClick: () => OW.about() }] }] },
    ];
    const saveSVG = () => { const s2 = exportSVG(); if (!s2) return OW.toast(t('draw.empty')); OW.download(new Blob([s2], { type: 'image/svg+xml' }), OW.safeName(ctx.file.name) + '.svg'); };
    ctx.exports = [
      { label: 'PNG (.png)', fn: exportPNG }, { label: 'SVG (.svg)', fn: saveSVG },
      { label: 'Excalidraw (.excalidraw)', hint: t('export.excalidrawHint'), fn: () => OW.download(new Blob([toExcalidraw()], { type: 'application/json' }), OW.safeName(ctx.file.name) + '.excalidraw') },
    ];

    return {
      ribbonMode: 'simplified',
      ribbon: () => R,
      mount(body) {
        body.innerHTML = `<div class="bd" tabindex="-1">
          <div class="bd-world"><svg class="bd-svg"></svg><div class="bd-sel"></div></div>
          <div class="bd-marquee"></div>
          <div class="bd-hint"><b>${t('board.hintTitle')}</b><span>${t('board.hint')}</span></div>
          <div class="bd-ctx" hidden></div>
          <div class="bd-zoom"><button data-z="out" title="${E(t('zoomOut'))}">${I('zoomOut', 18)}</button><button class="lbl" data-z="reset" title="100%">100%</button><button data-z="in" title="${E(t('zoomIn'))}">${I('zoomIn', 18)}</button><button data-z="fit" title="${E(t('draw.fit'))}">${I('expand', 17)}</button></div>
        </div>`;
        vp = body.querySelector('.bd'); world = vp.querySelector('.bd-world'); svgEl = vp.querySelector('.bd-svg'); selLayer = vp.querySelector('.bd-sel');
        ctxBar = vp.querySelector('.bd-ctx'); hintEl = vp.querySelector('.bd-hint'); marqueeEl = vp.querySelector('.bd-marquee');
        zoomLbl = vp.querySelector('.bd-zoom .lbl');
        vp.addEventListener('pointerdown', ev => { if (ev.target.closest('.bd-zoom,.bd-ctx')) return; onDown(ev); });
        vp.addEventListener('pointermove', onMove); vp.addEventListener('pointerup', onUp); vp.addEventListener('pointercancel', onUp);
        vp.addEventListener('wheel', onWheel, { passive: false });
        vp.addEventListener('dblclick', ev => { if (ev.target.closest('.bd-zoom,.bd-ctx')) return; onDbl(ev); });
        vp.addEventListener('contextmenu', ev => ev.preventDefault());
        vp.addEventListener('dragover', ev => { if ([...(ev.dataTransfer && ev.dataTransfer.items || [])].some(i => i.kind === 'file')) { ev.preventDefault(); ev.stopPropagation(); } });
        vp.addEventListener('drop', ev => { const fs = [...(ev.dataTransfer && ev.dataTransfer.files || [])].filter(f => /^image\//.test(f.type)); if (!fs.length) return; ev.preventDefault(); ev.stopPropagation(); const [x, y] = toWorld(ev.clientX, ev.clientY); fs.forEach((f, i) => addImageFile(f, x + i * 30, y + i * 30)); });
        ctxBar.addEventListener('pointerdown', ev => { if (editing) ev.preventDefault(); });   // keep the text selection while formatting
        ctxBar.addEventListener('click', ev => { const b = ev.target.closest('[data-act]'); if (b) ctxAction(b.dataset.act, b); });
        vp.querySelector('.bd-zoom').onclick = ev => { const b = ev.target.closest('[data-z]'); if (!b) return; const z = b.dataset.z; if (z === 'in') zoomAt(view.z * 1.25); else if (z === 'out') zoomAt(view.z / 1.25); else if (z === 'reset') zoomAt(1); else fitAll(); };
        addEventListener('keydown', keys); addEventListener('keyup', keyUp); addEventListener('paste', onPaste); addEventListener('copy', onCopy); addEventListener('cut', onCopy);
        // the context bar follows the selection
        const origRender = renderSelection; renderSelection = function () { origRender(); buildCtxBar(); };
        setTool('select');
        render();
        requestAnimationFrame(() => { if (data.view && data.view.z && (data.view.x || data.view.y)) applyView(); else fitAll(); render(); });
      },
      getContent: () => { data.elements = els; data.view = { x: Math.round(view.x), y: Math.round(view.y), z: Math.round(view.z * 1000) / 1000 }; return data; },
      status: () => ({ left: `${els.length} ${t('draw.elements')} · ${short(tool)}`, right: Math.round(view.z * 100) + ' %' }),
      onTheme: () => render(),
      setReadOnly(v) { readOnly = !!v; if (readOnly) { endEdit(); setTool('hand'); } render(); },
      print() { const s = exportSVG(); if (!s) return OW.toast(t('draw.empty')); const w = document.createElement('iframe'); w.style.cssText = 'position:fixed;left:-9999px;width:10px;height:10px'; document.body.appendChild(w); w.contentDocument.open(); w.contentDocument.write(`<!doctype html><title>${E(ctx.file.name)}</title><style>@page{margin:10mm}html,body{margin:0}svg{width:100%;height:auto}</style>${s}`); w.contentDocument.close(); setTimeout(() => { w.contentWindow.print(); setTimeout(() => w.remove(), 60000); }, 200); },
      destroy() { if (editing) endEdit(); removeEventListener('keydown', keys); removeEventListener('keyup', keyUp); removeEventListener('paste', onPaste); removeEventListener('copy', onCopy); removeEventListener('cut', onCopy); },
    };
  };

  /* ---------- kept for templates and imports (older element format) ---------- */
  OW.excalidrawToElements = json => (json.elements || []).filter(e => !e.isDeleted).map(e => ({ id: e.id || uid(), type: e.type === 'image' ? 'rectangle' : e.type, x: e.x, y: e.y, w: e.width, h: e.height, points: e.points, text: e.text, fs: e.fontSize || 20, stroke: e.strokeColor || '#1e1e1e', bg: e.backgroundColor || 'transparent', fill: e.fillStyle === 'solid' ? 'solid' : 'hachure', sw: e.strokeWidth || 2, ss: e.strokeStyle || 'solid', rough: e.roughness ?? 1, opacity: e.opacity || 100, seed: e.seed || 1 }));

  /* tiny diagram library (older format, still used by the template gallery; converted on open) */
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
})();
