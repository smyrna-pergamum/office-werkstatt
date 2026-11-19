/* Design Werkzeug – Canva-style design studio (Fabric.js, MIT)
 *  classic ribbon on top · side rail (templates, elements, text, photos, illustrations, icons, audio, uploads, brand, layers, sources)
 *  · context toolbar · pages · print guides (bleed, safe area, folds) · PNG / JPG / PDF / PDF print / SVG / video export
 *  Everything works offline; stock search (Openverse, Iconify, Pexels, Pixabay, Unsplash, Freesound, Jamendo) needs internet. */
(function () {
  let libP = null;
  const loadLib = () => libP || (libP = new Promise((res, rej) => {
    if (!document.getElementById('ow-fonts')) { const l = document.createElement('link'); l.id = 'ow-fonts'; l.rel = 'stylesheet'; l.href = 'fonts/fonts.css'; document.head.appendChild(l); }
    if (window.fabric) return res();
    const s = document.createElement('script'); s.src = 'js/fabric.min.js'; s.onload = () => res(); s.onerror = rej; document.head.appendChild(s);
  }));
  const FONTS = ['Inter', 'Montserrat', 'Poppins', 'Raleway', 'Nunito', 'Oswald', 'Bebas Neue', 'Playfair Display', 'Lora', 'Merriweather', 'Roboto Slab', 'Abril Fatface', 'Lobster', 'Pacifico', 'Dancing Script', 'Caveat', 'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New'];
  const BUNDLED = FONTS.slice(0, 16);
  const PALETTE = ['#000000', '#3A3F58', '#7A809C', '#C9CEE6', '#FFFFFF', '#D93A32', '#EA6A2A', '#FFD43B', '#1E9E5A', '#0FA3B1', '#2F6BEA', '#7C4DDB', '#D6338A', '#FF8FB1', '#C9A27A', '#12343B', '#FFF8EC', '#E2F7F8'];
  const COMBOS = [['Playfair Display', 'Inter'], ['Bebas Neue', 'Montserrat'], ['Montserrat', 'Lora'], ['Pacifico', 'Nunito'], ['Abril Fatface', 'Raleway'], ['Oswald', 'Merriweather'], ['Dancing Script', 'Poppins'], ['Roboto Slab', 'Inter']];
  const PROPS = ['ow', 'name', 'selectable', 'evented', 'hasControls', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'visible'];
  const uid = () => Math.random().toString(36).slice(2, 9);
  const nl = s => String(s).replace(/\\n/g, '\n');

  OW.designTemplates = t => (OW.design ? OW.design.TEMPLATES : []).map(tp => ({ type: 'design', id: tp.id, name: t('dz.t.' + tp.id), content: { template: tp.id } }))
    .concat([{ type: 'design', id: 'blank', name: t('untitled.design'), content: null }]);

  OW.editors.design = async function (ctx) {
    const t = ctx.t, I = OW.icon, esc = OW.escape, DC = OW.design;
    const S = OW.settings; S.brand = S.brand || { colors: ['#0FA3B1', '#1B1F3B', '#FFD43B', '#EA6A2A'], heading: 'Montserrat', body: 'Inter', logos: [] };
    const saveSettings = () => localStorage.setItem('ow-settings', JSON.stringify(S));
    let D = ctx.file.content && ctx.file.content.pages ? ctx.file.content : null;
    const pendingTpl = ctx.file.content && ctx.file.content.template;
    let cv = null, G = null, cur = 0, root, stage, rail = 'templates', loading = false, showGuides = true, zoom = 1, clip = null;
    let undo = [], redo = [], snap = null, snapTimer = null, stockState = {}, tplThumbs = {};

    /* ================= helpers ================= */
    const fmt = () => D.format;
    const pageName = (p, i) => p.name ? t('dz.p.' + p.name) + (p.name === 'page' ? ' ' + i : '') : String(i + 1);
    const dataURLtoBytes = d => { const b = atob(d.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
    const blobToURL = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(b); });
    const isServer = OW.store.mode === 'server';
    async function fontsReady(objs) {
      const fams = new Set(); (objs || []).forEach(function w(o) { if (o.fontFamily) fams.add((o.fontWeight || 400) + ' 40px "' + o.fontFamily + '"'); (o.objects || o._objects || []).forEach(w); });
      try { await Promise.all([...fams].map(f => document.fonts.load(f))); } catch { /* system fonts */ }
    }
    function newDesign(format, pagesN) {
      const names = format.pages || [null];
      return { version: 1, format: JSON.parse(JSON.stringify(format)), pages: names.map(n => ({ id: uid(), name: n, json: null, anim: 'fade', dur: 4 })), audio: null, credits: [] };
    }
    function bgRect(fill, g = G) { const gx = () => g;
      const r = new fabric.Rect({ left: 0, top: 0, width: gx().W, height: gx().H, fill: fill || '#ffffff', selectable: false, evented: false, hasControls: false });
      r.ow = { kind: 'bg' }; r.name = 'bg'; return r;
    }
    function gradient(spec, w, h) {
      const a = (spec.angle || 135) * Math.PI / 180, cx = w / 2, cy = h / 2, r = Math.hypot(w, h) / 2;
      return new fabric.Gradient({ type: 'linear', gradientUnits: 'pixels', coords: { x1: cx - Math.sin(a) * r, y1: cy + Math.cos(a) * r, x2: cx + Math.sin(a) * r, y2: cy - Math.cos(a) * r }, colorStops: [{ offset: 0, color: spec.colors[0] }, { offset: 1, color: spec.colors[1] }] });
    }
    const getBg = () => cv.getObjects().find(o => o.ow && o.ow.kind === 'bg');

    /* ================= object factories ================= */
    function textbox(text, o = {}, g = G) { const gx = () => g;
      const tb = new fabric.Textbox(text, Object.assign({ left: gx().bleed + gx().w * .1, top: gx().bleed + gx().h * .1, width: gx().w * .8, fontSize: Math.round(gx().w * .06), fontFamily: S.brand.body || 'Inter', fill: '#1B1F3B', lineHeight: 1.2, splitByGrapheme: false, editingBorderColor: '#D6338A', cursorColor: '#D6338A' }, o));
      tb.ow = { kind: 'text' }; return tb;
    }
    function shape(kind, o = {}) { const gx = () => G;
      const s = Math.min(gx().w, gx().h) * .3, fill = o.fill || S.brand.colors[0] || '#0FA3B1';
      let ob;
      const star = (n, R, r) => Array.from({ length: n * 2 }, (_, i) => { const a = Math.PI / n * i - Math.PI / 2, rr = i % 2 ? r : R; return { x: Math.cos(a) * rr, y: Math.sin(a) * rr }; });
      const poly = n => Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI / n * i - Math.PI / 2; return { x: Math.cos(a) * s / 2, y: Math.sin(a) * s / 2 }; });
      switch (kind) {
        case 'rect': ob = new fabric.Rect({ width: s, height: s, fill }); break;
        case 'rounded': ob = new fabric.Rect({ width: s, height: s, rx: s * .15, ry: s * .15, fill }); break;
        case 'circle': ob = new fabric.Circle({ radius: s / 2, fill }); break;
        case 'triangle': ob = new fabric.Triangle({ width: s, height: s * .87, fill }); break;
        case 'star': ob = new fabric.Polygon(star(5, s / 2, s / 4.6), { fill }); break;
        case 'hexagon': ob = new fabric.Polygon(poly(6), { fill }); break;
        case 'pentagon': ob = new fabric.Polygon(poly(5), { fill }); break;
        case 'heart': ob = new fabric.Path('M50 88 C20 65 0 48 0 28 C0 12 12 0 27 0 C37 0 46 6 50 15 C54 6 63 0 73 0 C88 0 100 12 100 28 C100 48 80 65 50 88 Z', { fill, scaleX: s / 100, scaleY: s / 100 }); break;
        case 'bubble': ob = new fabric.Path('M10 0 H90 Q100 0 100 10 V60 Q100 70 90 70 H40 L20 90 L25 70 H10 Q0 70 0 60 V10 Q0 0 10 0 Z', { fill, scaleX: s / 100, scaleY: s / 100 }); break;
        case 'arrow': ob = new fabric.Path('M0 35 H70 V15 L100 50 L70 85 V65 H0 Z', { fill, scaleX: s / 100, scaleY: s * .6 / 100 }); break;
        case 'blob': ob = new fabric.Path('M54 2 C74 4 96 18 98 42 C100 66 82 92 56 96 C30 100 6 84 2 58 C-2 32 22 0 54 2 Z', { fill, scaleX: s / 100, scaleY: s / 100 }); break;
        case 'line': ob = new fabric.Line([0, 0, s * 1.5, 0], { stroke: o.stroke || '#1B1F3B', strokeWidth: Math.max(2, gx().w * .004) }); break;
        case 'dashed': ob = new fabric.Line([0, 0, s * 1.5, 0], { stroke: o.stroke || '#1B1F3B', strokeWidth: Math.max(2, gx().w * .004), strokeDashArray: [gx().w * .015, gx().w * .01] }); break;
        case 'dotted': ob = new fabric.Line([0, 0, s * 1.5, 0], { stroke: o.stroke || '#1B1F3B', strokeWidth: Math.max(3, gx().w * .006), strokeDashArray: [0.1, gx().w * .015], strokeLineCap: 'round' }); break;
      }
      ob.set(Object.assign({ originX: 'center', originY: 'center', left: gx().W / 2, top: gx().H / 2 }, o.pos || {}));
      ob.ow = { kind: 'shape', shape: kind }; return ob;
    }
    function frame(kind, o = {}, g = G) { const gx = () => g;
      const s = Math.min(gx().w, gx().h) * .45;
      const ob = kind === 'circle' ? new fabric.Circle({ radius: s / 2 }) : new fabric.Rect({ width: o.w || s, height: o.h || s, rx: kind === 'rounded' ? s * .08 : 0, ry: kind === 'rounded' ? s * .08 : 0 });
      ob.set(Object.assign({ fill: '#E6E9F2', stroke: '#9AA3BF', strokeWidth: Math.max(1.5, gx().w * .002), strokeDashArray: [gx().w * .01, gx().w * .007], strokeUniform: true, originX: 'center', originY: 'center', left: gx().W / 2, top: gx().H / 2 }, o.pos || {}));
      ob.ow = { kind: 'frame', shape: kind }; return ob;
    }
    async function qrObject(text, w, g = G) { const gx = () => g;
      const q = qrcode(0, 'M'); q.addData(text); q.make();
      const svg = q.createSvgTag({ cellSize: 8, margin: 1, scalable: true });
      return new Promise(res => fabric.loadSVGFromString(svg, (objs, opts) => { const g = fabric.util.groupSVGElements(objs, opts); g.scaleToWidth(w || gx().w * .25); g.ow = { kind: 'qr', text }; res(g); }));
    }
    function imageFromURL(src) { return new Promise((res, rej) => fabric.Image.fromURL(src, img => img && img.width ? res(img) : rej(new Error('img')), { crossOrigin: 'anonymous' })); }
    function svgFromURL(src) { return new Promise(res => fabric.loadSVGFromURL(src, (objs, opts) => { const g = fabric.util.groupSVGElements(objs, opts); res(g); })); }

    /* ================= templates ================= */
    async function buildTemplatePage(spec, g = G) {
      const objs = [], w = g.w, h = g.h, b = g.bleed;
      const bg = bgRect(typeof spec.bg === 'string' ? spec.bg : '#ffffff', g); if (spec.bg && spec.bg.type) bg.set('fill', gradient(spec.bg, g.W, g.H)); objs.push(bg);
      for (const e of spec.els || []) {
        const X = b + e.x * w, Y = b + e.y * h;
        if (e.t === 'text') {
          let txt = e.text.startsWith('@') ? nl(t(e.text.slice(1))) : e.text; if (e.upper) txt = txt.toUpperCase();
          objs.push(textbox(txt, { left: X, top: Y, width: e.w * w, fontSize: e.s * w, fontFamily: e.font || 'Inter', fontWeight: e.weight || 400, fill: e.color || '#1B1F3B', textAlign: e.align || 'left', charSpacing: e.ls || 0, lineHeight: e.lh || 1.2, opacity: e.opacity == null ? 1 : e.opacity }, g));
        } else if (e.t === 'rect') {
          const r = new fabric.Rect({ left: X, top: Y, width: e.w * w, height: e.h * h, fill: e.fill || 'transparent', rx: (e.rx || 0) * w, ry: (e.rx || 0) * w, opacity: e.opacity == null ? 1 : e.opacity, stroke: e.stroke || null, strokeWidth: e.sw ? e.sw * w : 0, strokeUniform: true });
          r.ow = { kind: 'shape', shape: e.rx ? 'rounded' : 'rect' }; objs.push(r);
        } else if (e.t === 'circle') {
          const c = new fabric.Circle({ left: X, top: Y, radius: e.d * w / 2, originX: 'center', originY: 'center', fill: e.fill, opacity: e.opacity == null ? 1 : e.opacity }); c.ow = { kind: 'shape', shape: 'circle' }; objs.push(c);
        } else if (e.t === 'frame') {
          objs.push(frame(e.shape === 'circle' ? 'circle' : e.shape, { w: e.w * w, h: e.h * h, pos: { left: X + e.w * w / 2, top: Y + e.h * h / 2 } }, g));
        } else if (e.t === 'qr') {
          const q = await qrObject(e.text, e.w * w, g); q.set({ left: X, top: Y }); objs.push(q);
        }
      }
      return objs;
    }
    async function applyTemplate(id, wholeDesign) {
      const tp = DC.TEMPLATES.find(x => x.id === id); if (!tp) return;
      if (wholeDesign || tp.format !== fmt().id) {
        D = newDesign(DC.fmt(tp.format)); G = DC.geom(D.format);
        if (tp.pages.length > D.pages.length) for (let i = D.pages.length; i < tp.pages.length; i++) D.pages.push({ id: uid(), name: null, json: null, anim: 'fade', dur: 4 });
        for (let i = 0; i < tp.pages.length; i++) D.pages[i].json = await pageJSON(await buildTemplatePage(tp.pages[i]));
        cur = 0; await mountCanvas(); await loadPage(0); renderAll(); changed(); return;
      }
      cv.clear(); (await buildTemplatePage(tp.pages[0])).forEach(o => cv.add(o)); afterLoad(); pushUndo(true); changed();
    }
    async function pageJSON(objs) {
      const sc = new fabric.StaticCanvas(null, { width: G.W, height: G.H }); objs.forEach(o => sc.add(o));
      const j = sc.toJSON(PROPS); sc.dispose(); return j;
    }

    /* ================= canvas ================= */
    async function mountCanvas() {
      if (cv) { cv.dispose(); cv = null; }
      G = DC.geom(D.format);
      stage.innerHTML = '<div class="dz-paper"><canvas></canvas></div>';
      cv = new fabric.Canvas(stage.querySelector('canvas'), { preserveObjectStacking: true, selectionColor: 'rgba(214,51,138,.08)', selectionBorderColor: '#D6338A', fireRightClick: true, stopContextMenu: true });
      fabric.Object.prototype.set({ borderColor: '#D6338A', cornerColor: '#ffffff', cornerStrokeColor: '#D6338A', cornerStyle: 'circle', transparentCorners: false, cornerSize: 11, borderScaleFactor: 1.5, padding: 2 });
      cv.on('after:render', drawGuides);
      cv.on('selection:created', onSel); cv.on('selection:updated', onSel); cv.on('selection:cleared', onSel);
      ['object:modified', 'object:added', 'object:removed', 'text:changed'].forEach(ev => cv.on(ev, () => { if (!loading) { pushUndo(); changed(); } }));
      cv.on('object:moving', snapMove); cv.on('mouse:up', () => { snap = null; cv.requestRenderAll(); });
      cv.on('mouse:dblclick', e => { if (e.target && e.target.ow && e.target.ow.kind === 'frame') { setRail('photos'); } });
      fit();
    }
    async function loadPage(i) {
      cur = i; loading = true;
      const p = D.pages[i];
      await new Promise(res => { if (p.json) cv.loadFromJSON(p.json, res); else { cv.clear(); cv.add(bgRect('#ffffff')); res(); } });
      await fontsReady(cv.getObjects()); cv.getObjects().forEach(o => { if (o.initDimensions) o.initDimensions(); });
      afterLoad(); loading = false; undo = [JSON.stringify(cv.toJSON(PROPS))]; redo = [];
      renderPages(); onSel();
    }
    function afterLoad() {
      let bg = getBg(); if (!bg) { bg = bgRect('#ffffff'); cv.insertAt(bg, 0); }
      bg.set({ selectable: false, evented: false, width: G.W, height: G.H, left: 0, top: 0 });
      cv.getObjects().forEach(o => { if (o.ow && o.ow.locked) o.set({ lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hasControls: false }); });
      cv.requestRenderAll();
    }
    function syncPage() { if (!cv || !D || !cv.lowerCanvasEl) return; const p = D.pages[cur]; p.json = cv.toJSON(PROPS); exporting = true; try { p.thumb = cv.toDataURL({ format: 'jpeg', quality: .6, multiplier: 180 / Math.max(G.W, G.H) / cv.getZoom() }); } catch { /* tainted */ } exporting = false; cv.requestRenderAll(); }
    function fit() {
      if (!cv || !cv.lowerCanvasEl || !stage.isConnected) return;
      const W = stage.clientWidth - 60, H = stage.clientHeight - 60;
      setZoom(Math.max(.05, Math.min(W / G.W, H / G.H)));
    }
    function setZoom(z) {
      zoom = z; cv.setDimensions({ width: Math.round(G.W * z), height: Math.round(G.H * z) }); cv.setZoom(z);
      const zl = root.querySelector('.dz-zoomval'); if (zl) zl.textContent = Math.round(z * 100) + ' %';
      cv.requestRenderAll();
    }
    let exporting = false;
    function drawGuides(opt) {
      if (exporting || !showGuides || !G || !cv || !cv.lowerCanvasEl) return;
      const c = cv.lowerCanvasEl.getContext('2d'), z = cv.getZoom(), f = fmt();
      if (opt && opt.ctx && opt.ctx !== c) return; // thumbnails / exports render without guides
      const rs = cv.getRetinaScaling ? cv.getRetinaScaling() : 1; c.save(); c.setTransform(z * rs, 0, 0, z * rs, 0, 0);
      if (G.bleed) {
        c.fillStyle = 'rgba(217,58,50,.10)'; c.fillRect(0, 0, G.W, G.bleed); c.fillRect(0, G.H - G.bleed, G.W, G.bleed); c.fillRect(0, G.bleed, G.bleed, G.H - 2 * G.bleed); c.fillRect(G.W - G.bleed, G.bleed, G.bleed, G.H - 2 * G.bleed);
        c.strokeStyle = '#D93A32'; c.lineWidth = 1 / z; c.setLineDash([]); c.strokeRect(G.bleed, G.bleed, G.w, G.h);
        const sa = 5 * G.k; c.strokeStyle = 'rgba(47,107,234,.7)'; c.setLineDash([6 / z, 4 / z]); c.strokeRect(G.bleed + sa, G.bleed + sa, G.w - 2 * sa, G.h - 2 * sa);
      }
      if (G.folds.length) { c.strokeStyle = '#7C4DDB'; c.setLineDash([10 / z, 5 / z]); c.lineWidth = 1.5 / z; G.folds.forEach(x => { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, G.H); c.stroke(); }); }
      if (f.shape === 'circle') { c.strokeStyle = '#D93A32'; c.setLineDash([6 / z, 4 / z]); c.beginPath(); c.arc(G.W / 2, G.H / 2, G.w / 2, 0, Math.PI * 2); c.stroke(); }
      c.setLineDash([]);
      cv.getObjects().forEach(o => { if (o.ow && o.ow.kind === 'frame') { const p = o.getCenterPoint(); c.fillStyle = '#7A809C'; c.font = `600 ${Math.max(12, G.w * .025)}px Inter, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('＋ ' + t('dz.dropPhoto'), p.x, p.y); } });
      if (snap) { c.strokeStyle = '#D6338A'; c.lineWidth = 1 / z; snap.forEach(l => { c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); }); }
      c.restore();
    }
    function snapMove(e) {
      const o = e.target, tol = 6 / cv.getZoom(), c = o.getCenterPoint(), lines = [];
      const tx = [G.W / 2].concat(G.folds), ty = [G.H / 2];
      tx.forEach(x => { if (Math.abs(c.x - x) < tol) { o.setPositionByOrigin(new fabric.Point(x, c.y), 'center', 'center'); lines.push([x, 0, x, G.H]); } });
      const c2 = o.getCenterPoint(); ty.forEach(y => { if (Math.abs(c2.y - y) < tol) { o.setPositionByOrigin(new fabric.Point(c2.x, y), 'center', 'center'); lines.push([0, y, G.W, y]); } });
      snap = lines.length ? lines : null;
    }
    function pushUndo(force) {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => { const s = JSON.stringify(cv.toJSON(PROPS)); if (force || s !== undo[undo.length - 1]) { undo.push(s); if (undo.length > 60) undo.shift(); redo = []; } }, force ? 0 : 200);
    }
    async function restore(s) { loading = true; await new Promise(r => cv.loadFromJSON(JSON.parse(s), r)); afterLoad(); loading = false; onSel(); changed(); }
    function doUndo() { if (undo.length < 2) return; redo.push(undo.pop()); restore(undo[undo.length - 1]); }
    function doRedo() { if (!redo.length) return; const s = redo.pop(); undo.push(s); restore(s); }
    let thumbTimer = null;
    function changed() { ctx.markDirty(); clearTimeout(thumbTimer); thumbTimer = setTimeout(() => { syncPage(); renderPages(); }, 600); }

    /* ================= adding things ================= */
    function add(o, select = true) {
      if (o.originX !== 'center' && o.left == null) o.set({ left: G.W / 2 - o.getScaledWidth() / 2, top: G.H / 2 - o.getScaledHeight() / 2 });
      cv.add(o); if (select) cv.setActiveObject(o); cv.requestRenderAll(); return o;
    }
    async function addImage(src, meta = {}) {
      const img = meta.svg ? await svgFromURL(src) : await imageFromURL(src);
      const a = cv.getActiveObject();
      if (a && a.ow && a.ow.kind === 'frame') return fillFrame(a, img, meta);
      const k = Math.min(G.w * .6 / img.width, G.h * .6 / img.height, meta.svg ? 99 : 1.5);
      img.set({ scaleX: k, scaleY: k, originX: 'center', originY: 'center', left: G.W / 2, top: G.H / 2 });
      img.ow = { kind: meta.svg ? 'icon' : 'image', credit: meta.credit || null };
      if (meta.svg && img.getObjects) img.getObjects().forEach(x => { if (!x.fill || x.fill === 'currentColor' || x.fill === 'rgb(0,0,0)') x.set('fill', '#1B1F3B'); });
      if (meta.credit) addCredit(meta.credit);
      return add(img);
    }
    function fillFrame(fr, img, meta = {}) {
      const fw = fr.getScaledWidth(), fh = fr.getScaledHeight(), c = fr.getCenterPoint();
      const k = Math.max(fw / img.width, fh / img.height);
      img.set({ scaleX: k, scaleY: k, originX: 'center', originY: 'center', left: c.x, top: c.y, angle: fr.angle });
      const shape = fr.ow.shape;
      img.clipPath = shape === 'circle' ? new fabric.Circle({ radius: Math.min(fw, fh) / 2 / k, originX: 'center', originY: 'center' })
        : new fabric.Rect({ width: fw / k, height: fh / k, rx: shape === 'rounded' ? Math.min(fw, fh) * .08 / k : 0, ry: shape === 'rounded' ? Math.min(fw, fh) * .08 / k : 0, originX: 'center', originY: 'center' });
      img.ow = { kind: 'image', mask: shape, credit: meta.credit || null };
      const idx = cv.getObjects().indexOf(fr); cv.remove(fr); cv.insertAt(img, idx); cv.setActiveObject(img); cv.requestRenderAll();
      if (meta.credit) addCredit(meta.credit);
      return img;
    }
    function setMask(img, shape) {
      const w = img.width, h = img.height, m = Math.min(w, h);
      img.clipPath = shape === 'none' ? null : shape === 'circle' ? new fabric.Circle({ radius: m / 2, originX: 'center', originY: 'center' })
        : new fabric.Rect({ width: w, height: h, rx: m * .1, ry: m * .1, originX: 'center', originY: 'center' });
      img.ow = Object.assign(img.ow || {}, { mask: shape }); img.dirty = true; cv.requestRenderAll(); pushUndo(); changed();
    }
    function addCredit(c) { D.credits = D.credits || []; if (!D.credits.some(x => x.id === c.id)) D.credits.push(c); }
    async function setBackgroundImage(img) {
      const bg = getBg(), k = Math.max(G.W / img.width, G.H / img.height);
      const el = img.getElement ? img.getElement() : null; if (!el) return;
      const nimg = new fabric.Image(el, { left: G.W / 2, top: G.H / 2, originX: 'center', originY: 'center', scaleX: k, scaleY: k, selectable: false, evented: false, filters: img.filters });
      nimg.applyFilters && nimg.applyFilters();
      nimg.ow = { kind: 'bg', image: true, credit: img.ow && img.ow.credit }; nimg.name = 'bg';
      cv.remove(img); if (bg) cv.remove(bg); cv.insertAt(nimg, 0); cv.discardActiveObject(); cv.requestRenderAll(); pushUndo(); changed();
    }
    function setBgColor(c) {
      let bg = getBg();
      if (!bg || bg.type === 'image') { if (bg) cv.remove(bg); bg = bgRect(c); cv.insertAt(bg, 0); }
      bg.set('fill', c && c.type ? gradient(c, G.W, G.H) : c); cv.requestRenderAll(); pushUndo(); changed();
    }
    async function addText(kind) {
      const B = S.brand, base = { heading: { text: t('dz.headingText'), fontSize: G.w * .09, fontWeight: 700, fontFamily: B.heading }, sub: { text: t('dz.subText'), fontSize: G.w * .055, fontWeight: 700, fontFamily: B.heading }, body: { text: t('dz.bodyText'), fontSize: G.w * .035, fontWeight: 400, fontFamily: B.body } }[kind];
      await fontsReady([base]);
      const tb = textbox(base.text, Object.assign(base, { textAlign: 'center' })); tb.set({ left: G.W / 2 - tb.width / 2, top: G.H / 2 - tb.height / 2 });
      add(tb); tb.enterEditing(); tb.selectAll();
    }
    async function addCombo(h, b) {
      await fontsReady([{ fontFamily: h, fontWeight: 700 }, { fontFamily: b }]);
      const t1 = textbox(t('dz.headingText'), { fontFamily: h, fontWeight: 700, fontSize: G.w * .08, textAlign: 'center', top: G.H * .38 }), t2 = textbox(t('dz.bodyText'), { fontFamily: b, fontSize: G.w * .035, textAlign: 'center', top: G.H * .38 + G.w * .12 });
      [t1, t2].forEach(x => x.set({ left: G.W / 2 - x.width / 2 }));
      cv.add(t1); cv.add(t2); cv.setActiveObject(new fabric.ActiveSelection([t1, t2], { canvas: cv })); cv.requestRenderAll();
    }
    async function addQR() {
      const forms = (await OW.store.list()).filter(f => f.type === 'form' && !f.trashed), base = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
      const items = forms.map(f => ({ glyph: 'form', label: f.name, onClick: async () => add(await qrObject(base + 'f/' + f.id)) }));
      const ask = async () => { const v = await OW.prompt(t('dz.qrPrompt'), 'https://'); if (v) add(await qrObject(v)); };
      if (!items.length) return ask();
      OW.popover(root.querySelector('.dz-ctx') || root, [{ icon: 'link', label: t('dz.qrPrompt'), onClick: ask }, '-', { header: t('dz.qrForms') }].concat(items));
    }

    /* ================= selection & context toolbar ================= */
    const act = () => cv && cv.getActiveObject();
    const isText = o => o && (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text');
    const isImg = o => o && o.type === 'image';
    function onSel() { renderCtx(); if (rail === 'layers') renderPanel(); ctx.refresh(); }
    function setProp(k, v, all) {
      const o = act(); if (!o) return;
      const apply = x => { if (isText(x) && x.isEditing && x.getSelectionStyles && x.selectionStart !== x.selectionEnd && ['fill', 'fontWeight', 'fontStyle', 'underline', 'fontFamily', 'fontSize'].includes(k)) x.setSelectionStyles({ [k]: v }); else x.set(k, v); if (x.initDimensions) x.initDimensions(); x.setCoords(); };
      if (o.type === 'activeSelection' && !all) o.getObjects().forEach(apply); else if (o.type === 'group' && ['fill'].includes(k)) o.getObjects().forEach(apply); else apply(o);
      cv.requestRenderAll(); pushUndo(); changed(); renderCtx();
    }
    async function setFont(f) { await fontsReady([{ fontFamily: f, fontWeight: 400 }, { fontFamily: f, fontWeight: 700 }]); setProp('fontFamily', f); }
    function colorPop(anchor, current, onPick, opts = {}) {
      const doc = new Set(); cv.getObjects().forEach(o => { if (typeof o.fill === 'string' && /^#/.test(o.fill)) doc.add(o.fill.toUpperCase()); });
      const sw = (list) => list.map(c => `<button class="dz-sw" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('');
      const html = `<div class="dz-colorpop">${opts.none ? `<button class="dz-sw none" data-c="" title="—"></button>` : ''}
        <h5>${t('dz.brandColors')}</h5><div class="dz-sws">${sw(S.brand.colors)}</div>
        ${doc.size ? `<h5>${t('dz.color')}</h5><div class="dz-sws">${sw([...doc].slice(0, 12))}</div>` : ''}
        <h5>&nbsp;</h5><div class="dz-sws">${sw(PALETTE)}</div>
        <label class="dz-custom">${I('palette', 16)}<input type="color" value="${typeof current === 'string' && /^#[0-9a-f]{6}$/i.test(current) ? current : '#0FA3B1'}"></label>
        ${opts.gradient ? `<div class="dz-sws">${[['#0FA3B1', '#2F6BEA'], ['#7C4DDB', '#D6338A'], ['#FFD43B', '#EA6A2A'], ['#1B1F3B', '#7C4DDB'], ['#E2F7F8', '#FFF8EC'], ['#12343B', '#0FA3B1']].map(g => `<button class="dz-sw" data-g="${g.join(',')}" style="background:linear-gradient(135deg,${g[0]},${g[1]})"></button>`).join('')}</div>` : ''}</div>`;
      const pop = OW.popover(anchor, [{ html, init: el => {
        el.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { onPick(b.dataset.c || null); pop.remove(); }));
        el.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { onPick({ type: 'linear', colors: b.dataset.g.split(','), angle: 135 }); pop.remove(); }));
        el.querySelector('input').addEventListener('input', e => onPick(e.target.value));
      } }]);
    }
    function slider(label, val, min, max, step, on) { return { label, val, min, max, step, on }; }
    function sliderPop(anchor, items) {
      const pop = OW.popover(anchor, [{ html: `<div class="dz-sliders">${items.map((s, i) => `<label><span>${s.label}</span><input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.val}" data-i="${i}"><output>${s.val}</output></label>`).join('')}</div>`, init: el => {
        el.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { inp.nextElementSibling.textContent = inp.value; items[+inp.dataset.i].on(+inp.value); }));
      } }]);
      return pop;
    }
    function renderCtx() {
      const bar = root && root.querySelector('.dz-ctx'); if (!bar) return;
      const o = act(), b = (id, icon, title, on = false, label = '') => `<button class="dz-cb ${on ? 'on' : ''}" data-c="${id}" title="${esc(title)}">${icon ? I(icon, 17) : ''}${label ? `<span>${esc(label)}</span>` : ''}</button>`;
      const sep = '<span class="dz-csep"></span>';
      let h = '';
      if (!o) {
        const bg = getBg(), f = bg && bg.fill;
        h = `<button class="dz-cb dz-chip" data-c="bg" title="${t('dz.pageBg')}"><i style="background:${typeof f === 'string' ? f : f && f.colorStops ? `linear-gradient(135deg,${f.colorStops[0].color},${f.colorStops[1].color})` : '#fff'}"></i><span>${t('dz.pageBg')}</span></button>${sep}
          <label class="dz-csel">${I('activity', 16)}<select data-c="anim">${['none', 'fade', 'slide', 'zoom'].map(a => `<option value="${a}" ${D.pages[cur].anim === a ? 'selected' : ''}>${t('dz.anim.' + a)}</option>`).join('')}</select></label>
          <label class="dz-csel">${I('clock', 16)}<input type="number" min="1" max="60" step="0.5" value="${D.pages[cur].dur || 4}" data-c="dur" title="${t('dz.duration')}"></label>${sep}
          <span class="dz-fmt">${esc(t('dz.f.' + fmt().id) !== 'dz.f.' + fmt().id ? t('dz.f.' + fmt().id) : t('dz.f.custom'))} · ${DC.sizeLabel(fmt())}</span>
          ${b('resize', 'expand', t('dz.resize'), false, t('dz.resize'))}`;
      } else {
        const multi = o.type === 'activeSelection';
        if (isText(o)) {
          h += `<label class="dz-csel dz-font"><select data-c="font">${FONTS.map(f => `<option ${o.fontFamily === f ? 'selected' : ''} style="font-family:'${f}'">${f}</option>`).join('')}</select></label>
            <span class="dz-num">${b('fs-', 'shrink', '−')}<input type="number" data-c="fs" value="${Math.round(o.fontSize)}" min="4" max="2000">${b('fs+', 'grow', '+')}</span>
            <button class="dz-cb dz-chip" data-c="fill" title="${t('dz.color')}"><i class="txt" style="border-color:${typeof o.fill === 'string' ? o.fill : '#000'}">A</i></button>
            ${b('bold', 'bold', 'B', o.fontWeight === 700 || o.fontWeight === 'bold')}${b('italic', 'italic', 'I', o.fontStyle === 'italic')}${b('underline', 'underline', 'U', o.underline)}
            ${b('align', { left: 'alignL', center: 'alignC', right: 'alignR', justify: 'alignJ' }[o.textAlign] || 'alignL', t('dz.align'))}${b('upper', 'heading', t('dz.upper'))}${b('spacing', 'list', t('dz.spacing'))}${b('effects', 'sparkle', t('dz.effects'), false, t('dz.effects'))}`;
        } else if (isImg(o)) {
          h += `${b('filters', 'palette', t('dz.filters'), false, t('dz.filters'))}${b('mask', 'circle', t('dz.mask'), false, t('dz.mask'))}${b('flipX', 'transition', t('dz.flipH'))}${b('flipY', 'rotate', t('dz.flipV'))}${b('replace', 'image', t('dz.replace'))}${b('setbg', 'layers', t('dz.setBg'), false, t('dz.setBg'))}`;
        } else if (!multi) {
          const hasFill = o.type !== 'line' && !(o.ow && o.ow.kind === 'frame');
          if (hasFill) h += `<button class="dz-cb dz-chip" data-c="fill" title="${t('dz.fill')}"><i style="background:${typeof o.fill === 'string' ? o.fill : o.fill && o.fill.colorStops ? o.fill.colorStops[0].color : '#ccc'}"></i></button>`;
          h += `<button class="dz-cb dz-chip" data-c="stroke" title="${t('dz.stroke')}"><i class="ring" style="border-color:${o.stroke || '#C9CEE6'}"></i></button>${b('strokew', 'border', t('dz.stroke'))}`;
          if (o.type === 'rect') h += b('radius', 'square', t('dz.radius'));
        } else {
          h += ['alignLeft:alignL', 'alignCenter:alignC', 'alignRight:alignR', 'alignTop:arrowUp', 'alignMiddle:hr', 'alignBottom:arrowDown'].map(x => { const [k, ic] = x.split(':'); return b('al-' + k, ic, t('dz.' + k)); }).join('') + b('group', 'layers', t('dz.group'), false, t('dz.group'));
        }
        if (o.type === 'group' && !multi && !(o.ow && o.ow.kind === 'qr')) h += b('ungroup', 'layers', t('dz.ungroup'), false, t('dz.ungroup'));
        const locked = o.ow && o.ow.locked;
        h += `<span class="grow"></span>${b('opacity', 'eye', t('dz.opacity'))}${b('position', 'layers', t('dz.position'), false, t('dz.position'))}${b('pagealign', 'alignC', t('dz.align'))}${b('lock', 'lock', locked ? t('dz.unlock') : t('dz.lock'), locked)}${b('dup', 'copy', t('duplicate'))}${b('del', 'trash', t('delete'))}`;
      }
      bar.innerHTML = h;
      bar.querySelectorAll('[data-c]').forEach(el => {
        const k = el.dataset.c;
        if (el.tagName === 'SELECT' || el.tagName === 'INPUT') { el.addEventListener('change', () => ctxAction(k, el.value, el)); return; }
        el.addEventListener('mousedown', e => e.preventDefault());
        el.addEventListener('click', e => ctxAction(k, null, e.currentTarget));
      });
    }
    function ctxAction(k, v, el) {
      const o = act();
      switch (k) {
        case 'bg': return colorPop(el, '#fff', c => setBgColor(c || '#ffffff'), { gradient: true });
        case 'anim': D.pages[cur].anim = v; return changed();
        case 'dur': D.pages[cur].dur = Math.max(1, Math.min(60, +v || 4)); return changed();
        case 'resize': return resizeDialog();
        case 'font': return setFont(v);
        case 'fs': return setProp('fontSize', Math.max(4, +v));
        case 'fs-': return setProp('fontSize', Math.max(4, Math.round(o.fontSize * .9)));
        case 'fs+': return setProp('fontSize', Math.round(o.fontSize * 1.1) + 1);
        case 'fill': return colorPop(el, o.fill, c => { if (c && c.type) setProp('fill', gradient(c, o.width, o.height)); else setProp('fill', c || 'transparent'); }, { gradient: !isText(o), none: !isText(o) });
        case 'stroke': return colorPop(el, o.stroke, c => { setProp('stroke', c); if (c && !o.strokeWidth) setProp('strokeWidth', Math.max(2, G.w * .004)); }, { none: true });
        case 'strokew': return sliderPop(el, [slider(t('dz.stroke'), Math.round(o.strokeWidth || 0), 0, Math.round(G.w * .05), 1, x => { o.set({ strokeWidth: x, strokeUniform: true }); cv.requestRenderAll(); changed(); })]);
        case 'radius': return sliderPop(el, [slider(t('dz.radius'), Math.round(o.rx || 0), 0, Math.round(Math.min(o.width, o.height) / 2), 1, x => { o.set({ rx: x, ry: x }); cv.requestRenderAll(); changed(); })]);
        case 'bold': return fontsReady([{ fontFamily: o.fontFamily, fontWeight: 700 }]).then(() => setProp('fontWeight', o.fontWeight === 700 || o.fontWeight === 'bold' ? 400 : 700));
        case 'italic': return setProp('fontStyle', o.fontStyle === 'italic' ? 'normal' : 'italic');
        case 'underline': return setProp('underline', !o.underline);
        case 'align': { const n = ['left', 'center', 'right', 'justify']; return setProp('textAlign', n[(n.indexOf(o.textAlign) + 1) % 4]); }
        case 'upper': { const tx = o.text, up = tx.toLocaleUpperCase(OW.lang); return setProp('text', tx === up ? tx.toLocaleLowerCase(OW.lang) : up); }
        case 'spacing': return sliderPop(el, [slider(t('dz.letter'), o.charSpacing || 0, -100, 800, 10, x => { o.set('charSpacing', x); o.initDimensions(); cv.requestRenderAll(); changed(); }), slider(t('dz.lineH'), o.lineHeight || 1.2, .6, 3, .05, x => { o.set('lineHeight', x); o.initDimensions(); cv.requestRenderAll(); changed(); })]);
        case 'effects': {
          const sh = o.shadow, pop = OW.popover(el, [{ html: `<div class="dz-effects"><label class="dz-chk"><input type="checkbox" data-e="shadow" ${sh ? 'checked' : ''}>${t('dz.shadow')}</label><label class="dz-chk"><input type="checkbox" data-e="outline" ${o.stroke ? 'checked' : ''}>${t('dz.outline')}</label><label class="dz-chk"><input type="checkbox" data-e="hl" ${o.textBackgroundColor ? 'checked' : ''}>${t('dz.highlight')}</label></div>`, init: x => x.querySelectorAll('input').forEach(i => i.addEventListener('change', () => {
            if (i.dataset.e === 'shadow') o.set('shadow', i.checked ? new fabric.Shadow({ color: 'rgba(0,0,0,.35)', blur: o.fontSize * .15, offsetX: o.fontSize * .05, offsetY: o.fontSize * .05 }) : null);
            if (i.dataset.e === 'outline') o.set({ stroke: i.checked ? '#1B1F3B' : null, strokeWidth: i.checked ? Math.max(1, o.fontSize * .03) : 0, paintFirst: 'stroke' });
            if (i.dataset.e === 'hl') o.set('textBackgroundColor', i.checked ? '#FFD43B' : '');
            cv.requestRenderAll(); pushUndo(); changed();
          })) }]); return pop;
        }
        case 'filters': {
          const F = fabric.Image.filters, cur0 = o.ow && o.ow.f || { brightness: 0, contrast: 0, saturation: 0, blur: 0, gray: 0, sepia: 0 };
          const apply = () => { o.filters = []; if (cur0.brightness) o.filters.push(new F.Brightness({ brightness: cur0.brightness })); if (cur0.contrast) o.filters.push(new F.Contrast({ contrast: cur0.contrast })); if (cur0.saturation) o.filters.push(new F.Saturation({ saturation: cur0.saturation })); if (cur0.blur) o.filters.push(new F.Blur({ blur: cur0.blur })); if (cur0.gray) o.filters.push(new F.Grayscale()); if (cur0.sepia) o.filters.push(new F.Sepia()); o.applyFilters(); o.ow = Object.assign(o.ow || {}, { f: cur0 }); cv.requestRenderAll(); changed(); };
          const pop = sliderPop(el, [slider(t('dz.brightness'), cur0.brightness, -.6, .6, .02, x => { cur0.brightness = x; apply(); }), slider(t('dz.contrast'), cur0.contrast, -.6, .6, .02, x => { cur0.contrast = x; apply(); }), slider(t('dz.saturation'), cur0.saturation, -1, 1, .05, x => { cur0.saturation = x; apply(); }), slider(t('dz.blur'), cur0.blur, 0, .5, .01, x => { cur0.blur = x; apply(); })]);
          pop.insertAdjacentHTML('beforeend', `<div class="dz-effects"><label class="dz-chk"><input type="checkbox" data-x="gray" ${cur0.gray ? 'checked' : ''}>${t('dz.grayscale')}</label><label class="dz-chk"><input type="checkbox" data-x="sepia" ${cur0.sepia ? 'checked' : ''}>${t('dz.sepia')}</label></div>`);
          pop.querySelectorAll('[data-x]').forEach(i => i.addEventListener('change', () => { cur0[i.dataset.x] = i.checked ? 1 : 0; apply(); }));
          return;
        }
        case 'mask': return OW.popover(el, [['none', 'maskNone', 'square'], ['rounded', 'maskRounded', 'square'], ['circle', 'maskCircle', 'circle']].map(([s, l, ic]) => ({ icon: ic, label: t('dz.' + l), checked: ((o.ow && o.ow.mask) || 'none') === s, onClick: () => setMask(o, s) })));
        case 'flipX': return setProp('flipX', !o.flipX);
        case 'flipY': return setProp('flipY', !o.flipY);
        case 'replace': return pickFiles('image/*', false).then(async fs => { if (!fs[0]) return; const src = await blobToURL(fs[0]); o.setSrc(src, () => { cv.requestRenderAll(); pushUndo(); changed(); }); });
        case 'setbg': return setBackgroundImage(o);
        case 'opacity': return sliderPop(el, [slider(t('dz.opacity'), Math.round((o.opacity == null ? 1 : o.opacity) * 100), 0, 100, 1, x => { o.set('opacity', x / 100); cv.requestRenderAll(); changed(); })]);
        case 'position': return OW.popover(el, [['toFront', 'bringToFront'], ['forward', 'bringForward'], ['backward', 'sendBackwards'], ['toBack', 'sendToBack']].map(([l, m]) => ({ label: t('dz.' + l), onClick: () => { o[m](); const bg = getBg(); if (bg) bg.sendToBack(); cv.requestRenderAll(); pushUndo(); changed(); } })));
        case 'pagealign': return OW.popover(el, ['alignLeft', 'alignCenter', 'alignRight', 'alignTop', 'alignMiddle', 'alignBottom'].map(a => ({ label: t('dz.' + a), onClick: () => alignToPage(o, a) })));
        case 'lock': { const l = !(o.ow && o.ow.locked); o.ow = Object.assign(o.ow || {}, { locked: l }); o.set({ lockMovementX: l, lockMovementY: l, lockScalingX: l, lockScalingY: l, lockRotation: l, hasControls: !l }); cv.requestRenderAll(); changed(); return renderCtx(); }
        case 'dup': return duplicate();
        case 'del': return removeSel();
        case 'group': return group();
        case 'ungroup': return ungroup();
        default: if (k.startsWith('al-')) return alignSel(k.slice(3));
      }
    }
    function alignToPage(o, a) {
      const r = o.getBoundingRect(true), x0 = G.bleed, y0 = G.bleed;
      const dx = { alignLeft: x0 - r.left, alignCenter: G.W / 2 - (r.left + r.width / 2), alignRight: x0 + G.w - (r.left + r.width) }[a] || 0;
      const dy = { alignTop: y0 - r.top, alignMiddle: G.H / 2 - (r.top + r.height / 2), alignBottom: y0 + G.h - (r.top + r.height) }[a] || 0;
      o.set({ left: o.left + dx, top: o.top + dy }); o.setCoords(); cv.requestRenderAll(); pushUndo(); changed();
    }
    function alignSel(a) {
      const sel = act(); if (!sel || sel.type !== 'activeSelection') return;
      const objs = sel.getObjects(); cv.discardActiveObject();
      const rs = objs.map(o => o.getBoundingRect(true)), L = Math.min(...rs.map(r => r.left)), T = Math.min(...rs.map(r => r.top)), R = Math.max(...rs.map(r => r.left + r.width)), B = Math.max(...rs.map(r => r.top + r.height));
      objs.forEach((o, i) => { const r = rs[i]; const dx = { alignLeft: L - r.left, alignCenter: (L + R) / 2 - (r.left + r.width / 2), alignRight: R - (r.left + r.width) }[a] || 0, dy = { alignTop: T - r.top, alignMiddle: (T + B) / 2 - (r.top + r.height / 2), alignBottom: B - (r.top + r.height) }[a] || 0; o.set({ left: o.left + dx, top: o.top + dy }); o.setCoords(); });
      cv.setActiveObject(new fabric.ActiveSelection(objs, { canvas: cv })); cv.requestRenderAll(); pushUndo(); changed();
    }
    function duplicate() { const o = act(); if (!o) return; o.clone(c => { c.set({ left: c.left + G.w * .03, top: c.top + G.w * .03 }); c.ow = JSON.parse(JSON.stringify(o.ow || {})); if (c.type === 'activeSelection') { c.canvas = cv; c.forEachObject(x => cv.add(x)); c.setCoords(); } else cv.add(c); cv.setActiveObject(c); cv.requestRenderAll(); }, PROPS); }
    function removeSel() { const o = act(); if (!o || (isText(o) && o.isEditing)) return; (o.type === 'activeSelection' ? o.getObjects() : [o]).forEach(x => { if (!(x.ow && x.ow.kind === 'bg')) cv.remove(x); }); cv.discardActiveObject(); cv.requestRenderAll(); }
    function group() { const o = act(); if (!o || o.type !== 'activeSelection') return; const g = o.toGroup(); g.ow = { kind: 'group' }; cv.requestRenderAll(); pushUndo(); changed(); renderCtx(); }
    function ungroup() { const o = act(); if (!o || o.type !== 'group') return; o.toActiveSelection(); cv.requestRenderAll(); pushUndo(); changed(); renderCtx(); }

    /* ================= side panels ================= */
    const RAIL = [['templates', 'grid'], ['elements', 'shapes'], ['text', 'text'], ['photos', 'image'], ['graphics', 'palette'], ['icons', 'star'], ['audio', 'mic'], ['uploads', 'upload'], ['brand', 'sparkle'], ['layers', 'layers'], ['credits', 'link']];
    function setRail(r) { rail = r; root.querySelectorAll('.dz-rail button').forEach(b => b.classList.toggle('on', b.dataset.r === r)); root.querySelector('.dz-side').classList.remove('closed'); renderPanel(); }
    function renderPanel() {
      const P = root.querySelector('.dz-panel'); if (!P) return;
      const head = `<div class="dz-ph"><b>${t('dz.r.' + rail)}</b><button class="icon-btn sm dz-close" title="${t('ribbon.collapse')}">${I('x', 16)}</button></div>`;
      if (rail === 'templates') {
        const list = DC.TEMPLATES.filter(tp => tp.format === fmt().id).concat(DC.TEMPLATES.filter(tp => tp.format !== fmt().id));
        P.innerHTML = head + `<div class="dz-tpls">${list.map(tp => `<button class="dz-tpl ${tp.format === fmt().id ? 'fit' : ''}" data-tpl="${tp.id}" title="${esc(t('dz.t.' + tp.id))}"><img alt="" data-th="${tp.id}"${tplThumbs[tp.id] ? ` src="${tplThumbs[tp.id]}"` : ''}><span>${esc(t('dz.t.' + tp.id))}</span><small>${esc(t('dz.f.' + tp.format))}</small></button>`).join('')}</div>`;
        P.querySelectorAll('[data-tpl]').forEach(b => b.onclick = async () => { const other = DC.TEMPLATES.find(x => x.id === b.dataset.tpl).format !== fmt().id; if (other && cv.getObjects().length > 1 && !await OW.confirm(t('dz.tplReplace'))) return; applyTemplate(b.dataset.tpl, other); });
        renderTplThumbs(P);
      } else if (rail === 'elements') {
        const sh = ['rect', 'rounded', 'circle', 'triangle', 'star', 'pentagon', 'hexagon', 'heart', 'bubble', 'arrow', 'blob'];
        const svg = { rect: '<rect x="4" y="4" width="32" height="32"/>', rounded: '<rect x="4" y="4" width="32" height="32" rx="7"/>', circle: '<circle cx="20" cy="20" r="16"/>', triangle: '<path d="M20 4 36 34H4z"/>', star: '<path d="M20 3l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/>', pentagon: '<path d="M20 3 37 15 31 36H9L3 15z"/>', hexagon: '<path d="M20 3 35 11v18L20 37 5 29V11z"/>', heart: '<path d="M20 35C10 27 3 21 3 13a8 8 0 0 1 17-3 8 8 0 0 1 17 3c0 8-7 14-17 22z"/>', bubble: '<path d="M6 5h28a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H16l-8 7 2-7H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z"/>', arrow: '<path d="M3 15h24V7l11 13-11 13v-8H3z"/>', blob: '<path d="M22 3c9 1 16 8 15 18s-9 17-19 16S2 30 3 19 13 2 22 3z"/>' };
        P.innerHTML = head + `<h4>${t('dz.shapes')}</h4><div class="dz-grid">${sh.map(s => `<button class="dz-el" data-sh="${s}" title="${s}"><svg viewBox="0 0 40 40">${svg[s]}</svg></button>`).join('')}</div>
          <h4>${t('dz.lines')}</h4><div class="dz-grid">${['line', 'dashed', 'dotted'].map(s => `<button class="dz-el" data-sh="${s}"><svg viewBox="0 0 40 40"><line x1="4" y1="20" x2="36" y2="20" stroke-width="3" ${s === 'dashed' ? 'stroke-dasharray="6 4"' : s === 'dotted' ? 'stroke-dasharray="0.1 6" stroke-linecap="round" stroke-width="4"' : ''}/></svg></button>`).join('')}</div>
          <h4>${t('dz.frames')}</h4><p class="muted small">${t('dz.frameHint')}</p><div class="dz-grid">${['rect', 'rounded', 'circle'].map(s => `<button class="dz-el frame" data-fr="${s}"><svg viewBox="0 0 40 40">${s === 'circle' ? '<circle cx="20" cy="20" r="16"/>' : `<rect x="4" y="8" width="32" height="24" rx="${s === 'rounded' ? 6 : 0}"/>`}</svg></button>`).join('')}</div>
          <h4>${t('dz.qr')}</h4><button class="btn dz-wide" data-qr>${I('grid', 16)}<span>${t('dz.qr')}</span></button>`;
        P.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => add(shape(b.dataset.sh)));
        P.querySelectorAll('[data-fr]').forEach(b => b.onclick = () => add(frame(b.dataset.fr)));
        P.querySelector('[data-qr]').onclick = addQR;
      } else if (rail === 'text') {
        P.innerHTML = head + `<button class="dz-tbtn h" data-tx="heading" style="font-family:'${S.brand.heading}'">${t('dz.addHeading')}</button><button class="dz-tbtn s" data-tx="sub" style="font-family:'${S.brand.heading}'">${t('dz.addSub')}</button><button class="dz-tbtn b" data-tx="body" style="font-family:'${S.brand.body}'">${t('dz.addBody')}</button>
          <h4>${t('dz.combos')}</h4><div class="dz-combos">${COMBOS.map(([h, b], i) => `<button class="dz-combo" data-cb="${i}"><b style="font-family:'${h}'">${esc(h)}</b><small style="font-family:'${b}'">${esc(b)}</small></button>`).join('')}</div>`;
        P.querySelectorAll('[data-tx]').forEach(b => b.onclick = () => addText(b.dataset.tx));
        P.querySelectorAll('[data-cb]').forEach(b => b.onclick = () => addCombo(...COMBOS[+b.dataset.cb]));
      } else if (['photos', 'graphics', 'icons', 'audio'].includes(rail)) {
        renderStock(P, head, { photos: 'photo', graphics: 'illustration', icons: 'icon', audio: 'audio' }[rail]);
      } else if (rail === 'uploads') {
        const ups = D.uploads || [];
        P.innerHTML = head + `<button class="btn primary dz-wide" data-up>${I('upload', 16)}<span>${t('dz.upload')}</span></button><p class="muted small">${t('dz.uploadHint')}</p>
          <div class="dz-res">${ups.filter(u => u.kind === 'image').map((u, i) => `<button class="dz-it" data-ui="${i}"><img src="${u.src}" alt=""></button>`).join('')}</div>`;
        P.querySelector('[data-up]').onclick = () => pickFiles('image/*,audio/*', true).then(addFiles);
        P.querySelectorAll('[data-ui]').forEach(b => b.onclick = () => addImage(ups.filter(u => u.kind === 'image')[+b.dataset.ui].src));
      } else if (rail === 'brand') {
        const B = S.brand, fsel = (k) => `<select data-bf="${k}">${FONTS.map(f => `<option ${B[k] === f ? 'selected' : ''}>${f}</option>`).join('')}</select>`;
        P.innerHTML = head + `<h4>${t('dz.brandColors')}</h4><div class="dz-sws big">${B.colors.map((c, i) => `<button class="dz-sw" style="background:${c}" data-bc="${i}" title="${c} – ${t('delete')}"></button>`).join('')}<label class="dz-sw add" title="${t('dz.addColor')}">${I('plus', 14)}<input type="color" data-bcadd></label></div>
          <h4>${t('dz.brandFonts')}</h4><label class="dz-field"><span>${t('dz.headingFont')}</span>${fsel('heading')}</label><label class="dz-field"><span>${t('dz.bodyFont')}</span>${fsel('body')}</label>
          <h4>${t('dz.brandLogos')}</h4><div class="dz-res">${(B.logos || []).map((l, i) => `<button class="dz-it logo" data-bl="${i}"><img src="${l}" alt=""><i data-bldel="${i}">${I('x', 12)}</i></button>`).join('')}<button class="dz-it add" data-bladd>${I('plus', 18)}<span>${t('dz.addLogo')}</span></button></div>
          <button class="btn dz-wide" data-bapply>${I('wand', 16)}<span>${t('dz.applyBrand')}</span></button>`;
        P.querySelectorAll('[data-bc]').forEach(b => b.onclick = () => { B.colors.splice(+b.dataset.bc, 1); saveSettings(); renderPanel(); });
        P.querySelector('[data-bcadd]').onchange = e => { B.colors.push(e.target.value.toUpperCase()); saveSettings(); renderPanel(); };
        P.querySelectorAll('[data-bf]').forEach(s => s.onchange = () => { B[s.dataset.bf] = s.value; saveSettings(); });
        P.querySelectorAll('[data-bl]').forEach(b => b.onclick = e => { if (e.target.closest('[data-bldel]')) { B.logos.splice(+b.dataset.bl, 1); saveSettings(); return renderPanel(); } addImage(B.logos[+b.dataset.bl]); });
        P.querySelector('[data-bladd]').onclick = () => pickFiles('image/*', false).then(async fs => { if (!fs[0]) return; const src = await shrinkImage(fs[0], 600); B.logos = (B.logos || []).concat([src]); try { saveSettings(); } catch { B.logos.pop(); OW.toast(t('dz.insertFailed'), 'warn'); } renderPanel(); });
        P.querySelector('[data-bapply]').onclick = () => applyBrand();
      } else if (rail === 'layers') {
        const objs = cv.getObjects().slice().reverse(), a = act(), sel = a ? (a.type === 'activeSelection' ? a.getObjects() : [a]) : [];
        const label = o => o.ow && o.ow.kind === 'bg' ? t('dz.pageBg') : isText(o) ? (o.text || '').slice(0, 28) : o.ow && o.ow.kind === 'frame' ? t('dz.frames') : o.ow && o.ow.kind === 'qr' ? t('dz.qr') : isImg(o) ? t('image') : t('dz.shapes');
        P.innerHTML = head + (objs.length > 1 ? `<div class="dz-layers">${objs.map((o, i) => `<div class="dz-layer ${sel.includes(o) ? 'on' : ''} ${o.visible === false ? 'hid' : ''}" data-li="${objs.length - 1 - i}"><span class="dz-lic">${I(isText(o) ? 'text' : isImg(o) ? 'image' : o.ow && o.ow.kind === 'bg' ? 'square' : 'shapes', 15)}</span><span class="dz-lname">${esc(label(o))}</span>${o.ow && o.ow.kind === 'bg' ? '' : `<button class="icon-btn sm" data-lv title="${t('editor.viewing')}">${I('eye', 14)}</button><button class="icon-btn sm" data-lu title="${t('dz.forward')}">${I('arrowUp', 14)}</button><button class="icon-btn sm" data-ld title="${t('dz.backward')}">${I('arrowDown', 14)}</button>`}</div>`).join('')}</div>` : `<p class="muted">${t('dz.noLayers')}</p>`);
        P.querySelectorAll('[data-li]').forEach(row => row.onclick = e => {
          const o = cv.getObjects()[+row.dataset.li]; if (!o || (o.ow && o.ow.kind === 'bg')) return;
          if (e.target.closest('[data-lv]')) { o.visible = o.visible === false; cv.discardActiveObject(); }
          else if (e.target.closest('[data-lu]')) o.bringForward();
          else if (e.target.closest('[data-ld]')) { o.sendBackwards(); const bg = getBg(); if (bg) bg.sendToBack(); }
          else cv.setActiveObject(o);
          cv.requestRenderAll(); changed(); renderPanel(); renderCtx();
        });
      } else if (rail === 'credits') {
        const cr = (D.credits || []).concat(D.audio && D.audio.credit ? [D.audio.credit] : []);
        P.innerHTML = head + `<p class="muted small">${t('dz.credits')}</p>` + (cr.length ? `<ul class="dz-credits">${cr.map(c => `<li><b>${esc(c.title || c.provider)}</b><small>${esc([c.author && '© ' + c.author, c.license, c.providerName].filter(Boolean).join(' · '))}</small>${c.sourceUrl ? `<a href="${esc(c.sourceUrl)}" target="_blank" rel="noopener">${esc(c.sourceUrl.replace(/^https?:\/\//, '').slice(0, 40))}</a>` : ''}</li>`).join('')}</ul>
          <button class="btn dz-wide" data-cc>${I('copy', 16)}<span>${t('dz.copyCredits')}</span></button><button class="btn dz-wide" data-ca>${I('text', 16)}<span>${t('dz.addCredit')}</span></button>` : `<p class="muted">${t('dz.noCredits')}</p>`);
        const txt = () => cr.map(c => OW.stock.credit(c)).join('\n');
        const cc = P.querySelector('[data-cc]'); if (cc) cc.onclick = () => navigator.clipboard && navigator.clipboard.writeText(txt()).then(() => OW.toast(t('share.linkCopied')));
        const ca = P.querySelector('[data-ca]'); if (ca) ca.onclick = () => { const tb = textbox(txt(), { fontSize: G.w * .014, fill: '#5A607F', top: G.bleed + G.h * .93, left: G.bleed + G.w * .05, width: G.w * .9 }); add(tb); };
      }
      const cl = P.querySelector('.dz-close'); if (cl) cl.onclick = () => { root.querySelector('.dz-side').classList.add('closed'); root.querySelectorAll('.dz-rail button').forEach(b => b.classList.remove('on')); setTimeout(fit, 220); };
    }
    let thumbsRunning = null;
    function renderTplThumbs(P) { thumbsRunning = (thumbsRunning || Promise.resolve()).then(() => renderTplThumbs0(P)); return thumbsRunning; }
    async function renderTplThumbs0(P) {
      for (const tp of DC.TEMPLATES) {
        if (tplThumbs[tp.id]) continue;
        try {
          const g = DC.geom(DC.fmt(tp.format)); const objs = await buildTemplatePage(tp.pages[0], g); await fontsReady(objs); objs.forEach(o => o.initDimensions && o.initDimensions());
          const sc = new fabric.StaticCanvas(null, { width: g.W, height: g.H, enableRetinaScaling: false }); objs.forEach(o => sc.add(o));
          tplThumbs[tp.id] = sc.toDataURL({ format: 'jpeg', quality: .7, multiplier: 220 / Math.max(g.W, g.H) }); sc.dispose();
        } catch (e) { console.warn(e); }
        if (!root || !root.isConnected) return;
      }
      for (const tp of DC.TEMPLATES) { const im = (root || P).querySelector(`[data-th="${tp.id}"]`); if (im && tplThumbs[tp.id]) im.src = tplThumbs[tp.id];
      }
    }
    function applyBrand() {
      const B = S.brand, c = B.colors;
      cv.getObjects().forEach(o => {
        if (isText(o)) o.set('fontFamily', (o.fontSize > G.w * .05 ? B.heading : B.body));
        else if (o.ow && o.ow.kind === 'shape' && typeof o.fill === 'string' && c.length) o.set('fill', c[Math.abs([...o.fill].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % c.length]);
      });
      fontsReady(cv.getObjects()).then(() => { cv.getObjects().forEach(o => o.initDimensions && o.initDimensions()); cv.requestRenderAll(); pushUndo(); changed(); });
    }

    /* ================= stock ================= */
    const LS_KEYS = 'ow-stock-keys';
    const localKeys = () => { try { return JSON.parse(localStorage.getItem(LS_KEYS) || '{}'); } catch { return {}; } };
    let stockCfg = null;
    async function loadStockCfg() {
      const P = OW.stock.PROVIDERS;
      if (isServer) { try { stockCfg = await (await fetch('api/stock/config', { cache: 'no-store' })).json(); return; } catch { /* fall back */ } }
      const k = localKeys(); stockCfg = {}; Object.keys(P).forEach(id => stockCfg[id] = { key: !P[id].key || !!k[id], needsKey: P[id].key, kinds: P[id].kinds, site: P[id].site });
    }
    async function stockSearch(provider, kind, q, page) {
      if (isServer) { const r = await fetch('api/stock/search?' + new URLSearchParams({ provider, kind, q, page })); if (r.status === 412) throw Object.assign(new Error('key'), { key: true }); if (!r.ok) throw new Error('offline'); return r.json(); }
      const p = OW.stock.PROVIDERS[provider], key = localKeys()[provider]; if (p.key && !key) throw Object.assign(new Error('key'), { key: true });
      const rq = p.request(kind, q, page, key), r = await fetch(rq.url, { headers: rq.headers || {} }); if (!r.ok) throw new Error('offline'); return p.parse(await r.json(), kind);
    }
    async function stockMedia(url) {
      const r = await fetch(isServer ? 'api/stock/media?url=' + encodeURIComponent(url) : url); if (!r.ok) throw new Error('media');
      return blobToURL(await r.blob());
    }
    function renderStock(P, head, kind) {
      const st = stockState[kind] = stockState[kind] || { provider: null, q: '', page: 1, items: [], busy: false };
      const provs = OW.stock.forKind(kind); if (!st.provider) st.provider = provs[0];
      const audioSec = kind === 'audio' ? `<div class="dz-track">${D.audio ? `<div class="dz-trk"><button class="icon-btn" data-ap>${I('play', 18)}</button><span><b>${esc(D.audio.name || '')}</b><small>${esc(D.audio.credit ? OW.stock.credit(D.audio.credit) : '')}</small></span><button class="icon-btn sm" data-arm title="${t('dz.removeAudio')}">${I('trash', 15)}</button></div><label class="dz-field"><span>${t('dz.volume')}</span><input type="range" min="0" max="1" step=".05" value="${D.audio.volume == null ? 1 : D.audio.volume}" data-avol></label>` : `<p class="muted small">${t('dz.noAudio')}</p>`}<p class="muted small">${t('dz.audioHint')}</p></div>` : '';
      P.innerHTML = head + audioSec + `<form class="dz-search"><span>${I('search', 16)}</span><input value="${esc(st.q)}" placeholder="${t('dz.search')}"></form>
        <div class="dz-provs">${provs.map(p => `<button class="dz-prov ${p === st.provider ? 'on' : ''} ${stockCfg && stockCfg[p] && !stockCfg[p].key ? 'nokey' : ''}" data-p="${p}">${OW.stock.PROVIDERS[p].name}</button>`).join('')}<button class="icon-btn sm" data-keys title="${t('dz.keys')}">${I('settings', 15)}</button></div>
        <div class="dz-res ${kind}"></div><div class="dz-resfoot"></div>`;
      const res = P.querySelector('.dz-res'), foot = P.querySelector('.dz-resfoot');
      const draw = () => {
        if (kind === 'audio') res.innerHTML = st.items.map((it, i) => `<div class="dz-aud"><button class="icon-btn" data-pl="${i}">${I('play', 16)}</button><span><b>${esc(it.title)}</b><small>${esc([it.author, it.duration ? Math.round(it.duration) + ' s' : '', it.license].filter(Boolean).join(' · '))}</small></span><button class="btn sm" data-use="${i}">${t('dz.useAudio')}</button></div>`).join('');
        else res.innerHTML = st.items.map((it, i) => `<button class="dz-it ${kind}" data-it="${i}" title="${esc(OW.stock.credit(it))}"><img loading="lazy" src="${esc(it.thumb)}" alt="${esc(it.title)}"></button>`).join('');
        foot.innerHTML = st.items.length && st.items.length % 30 === 0 ? `<button class="btn dz-wide" data-more>${t('dz.more')}</button>` : (st.done && !st.items.length ? `<p class="muted">${t('dz.noResults')}</p>` : '');
        const m = foot.querySelector('[data-more]'); if (m) m.onclick = () => run(st.page + 1);
        res.querySelectorAll('[data-it]').forEach(b => b.onclick = () => insertStock(st.items[+b.dataset.it], b));
        res.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => previewAudio(st.items[+b.dataset.pl].src, b));
        res.querySelectorAll('[data-use]').forEach(b => b.onclick = () => useAudio(st.items[+b.dataset.use], b));
      };
      const run = async (page = 1) => {
        if (!st.q.trim() && kind !== 'icon') { st.q = { photo: 'nature', illustration: 'flowers', audio: 'piano' }[kind] || ''; P.querySelector('.dz-search input').value = st.q; }
        if (!st.q.trim()) return;
        foot.innerHTML = `<p class="muted">${t('dz.inserting').replace('…', '')} …</p>`;
        try { const items = await stockSearch(st.provider, kind, st.q, page); st.items = page === 1 ? items : st.items.concat(items); st.page = page; st.done = true; draw(); }
        catch (e) { foot.innerHTML = `<p class="muted">${e.key ? t('dz.needKey', { p: OW.stock.PROVIDERS[st.provider].name }) + ` <button class="link" data-keys2>${t('dz.keys')}</button>` : t('dz.offline')}</p>`; const k2 = foot.querySelector('[data-keys2]'); if (k2) k2.onclick = keysDialog; }
      };
      P.querySelector('form').onsubmit = e => { e.preventDefault(); st.q = P.querySelector('.dz-search input').value; run(1); };
      P.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { st.provider = b.dataset.p; st.items = []; st.done = false; renderStock(P, head, kind); run(1); });
      P.querySelector('[data-keys]').onclick = keysDialog;
      if (kind === 'audio' && D.audio) {
        P.querySelector('[data-ap]').onclick = e => previewAudio(D.audio.src, e.currentTarget);
        P.querySelector('[data-arm]').onclick = () => { D.audio = null; changed(); renderPanel(); };
        P.querySelector('[data-avol]').oninput = e => { D.audio.volume = +e.target.value; changed(); };
      }
      if (st.items.length) draw(); else if (navigator.onLine !== false) run(1);
      P.querySelector('.dz-close').onclick = () => { root.querySelector('.dz-side').classList.add('closed'); setTimeout(fit, 220); };
    }
    async function insertStock(it, btn) {
      btn && btn.classList.add('busy'); OW.toast(t('dz.inserting'));
      try {
        const src = await stockMedia(it.src);
        const credit = { id: it.id, title: it.title, author: it.author, authorUrl: it.authorUrl, license: it.license, sourceUrl: it.sourceUrl, provider: it.provider, providerName: OW.stock.PROVIDERS[it.provider].name };
        await addImage(src, { svg: it.kind === 'icon', credit });
        if (it.track) { if (isServer) fetch('api/stock/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: it.track }) }).catch(() => {}); else { const k = localKeys().unsplash; if (k) fetch(it.track, { headers: { Authorization: 'Client-ID ' + k } }).catch(() => {}); } }
      } catch (e) { console.warn(e); OW.toast(t('dz.insertFailed'), 'warn'); }
      btn && btn.classList.remove('busy');
    }
    let previewEl = null;
    function previewAudio(src, btn) {
      if (previewEl && !previewEl.paused && previewEl.dataset.src === src) { previewEl.pause(); btn.innerHTML = I('play', 16); return; }
      if (previewEl) previewEl.pause(); previewEl = new Audio(src); previewEl.dataset.src = src; previewEl.play().catch(() => OW.toast(t('dz.offline'), 'warn'));
      root.querySelectorAll('[data-pl],[data-ap]').forEach(b => b.innerHTML = I('play', 16)); btn.innerHTML = I('pause', 16) || '❚❚';
      previewEl.onended = () => btn.innerHTML = I('play', 16);
    }
    async function useAudio(it, btn) {
      btn.disabled = true; OW.toast(t('dz.inserting'));
      try {
        const src = await stockMedia(it.src);
        D.audio = { src, name: it.title, volume: 1, credit: { id: it.id, title: it.title, author: it.author, license: it.license, sourceUrl: it.sourceUrl, provider: it.provider, providerName: OW.stock.PROVIDERS[it.provider].name } };
        changed(); renderPanel();
      } catch { OW.toast(t('dz.insertFailed'), 'warn'); }
      btn.disabled = false;
    }
    async function keysDialog() {
      await loadStockCfg();
      const P = OW.stock.PROVIDERS, keyed = Object.keys(P).filter(id => P[id].key), lk = localKeys();
      OW.alert(t('dz.keys'), `<div class="dz-keys"><p class="muted small">${t('dz.keysHint')}</p><p class="muted small"><b>${isServer ? t('dz.keysServer') : t('dz.keysLocal')}</b></p>
        ${keyed.map(id => `<label class="dz-field"><span>${P[id].name} <a href="${P[id].site}" target="_blank" rel="noopener">${t('dz.getKey')}</a> ${stockCfg[id] && stockCfg[id].key ? '✓' : ''}</span><input type="password" autocomplete="off" data-k="${id}" placeholder="${stockCfg[id] && stockCfg[id].key ? '••••••••' : ''}" value="${isServer ? '' : esc(lk[id] || '')}"></label>`).join('')}
        <button class="btn primary" data-save>${t('bs.save')}</button></div>`);
      const card = document.getElementById('modalCard');
      card.querySelector('[data-save]').onclick = async () => {
        const vals = {}; card.querySelectorAll('[data-k]').forEach(i => { if (i.value.trim() || !isServer) vals[i.dataset.k] = i.value.trim(); });
        if (isServer) await fetch('api/stock/keys', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vals) });
        else localStorage.setItem(LS_KEYS, JSON.stringify(Object.assign(localKeys(), vals)));
        await loadStockCfg(); card.querySelector('[data-x]').click(); OW.toast(t('dz.keySaved')); stockState = {}; renderPanel();
      };
    }

    /* ================= files ================= */
    function pickFiles(accept, multiple) { return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple; i.onchange = () => res(Array.from(i.files || [])); i.click(); }); }
    async function shrinkImage(file, maxW = 2400) {
      if (/svg|gif/.test(file.type)) return blobToURL(file);
      const url = URL.createObjectURL(file);
      try { const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; }); const k = Math.min(1, maxW / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return file.type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .9); }
      finally { URL.revokeObjectURL(url); }
    }
    async function addFiles(files) {
      for (const f of files) {
        if (f.type.startsWith('image/')) { const src = await shrinkImage(f); D.uploads = (D.uploads || []).concat([{ kind: 'image', name: f.name, src }]).slice(-30); await addImage(src); }
        else if (f.type.startsWith('audio/')) { if (f.size > 20e6) { OW.toast(t('dz.insertFailed'), 'warn'); continue; } D.audio = { src: await blobToURL(f), name: f.name.replace(/\.[^.]+$/, ''), volume: 1, credit: null }; OW.toast(t('dz.audioTrack') + ': ' + f.name); }
      }
      changed(); if (rail === 'uploads' || rail === 'audio') renderPanel();
    }

    /* ================= pages ================= */
    function renderPages() {
      const el = root && root.querySelector('.dz-pagelist'); if (!el || !D) return;
      el.innerHTML = D.pages.map((p, i) => `<button class="dz-pg ${i === cur ? 'on' : ''}" data-pg="${i}" style="aspect-ratio:${G.W}/${G.H}">${p.thumb ? `<img src="${p.thumb}" alt="">` : ''}<span>${esc(pageName(p, i))}</span></button>`).join('') + `<button class="dz-pg add" data-addpg title="${t('dz.addPage')}" style="aspect-ratio:${G.W}/${G.H}">${I('plus', 20)}</button>`;
      el.querySelectorAll('[data-pg]').forEach(b => {
        b.onclick = () => goPage(+b.dataset.pg);
        b.oncontextmenu = e => { e.preventDefault(); const i = +b.dataset.pg; OW.popover(b, [{ icon: 'copy', label: t('dz.dupPage'), onClick: () => dupPage(i) }, { icon: 'arrowLeft', label: t('dz.movePrev'), onClick: () => movePage(i, -1) }, { icon: 'arrowRight', label: t('dz.moveNext'), onClick: () => movePage(i, 1) }, { icon: 'trash', label: t('dz.delPage'), danger: true, onClick: () => delPage(i) }]); };
      });
      el.querySelector('[data-addpg]').onclick = () => addPage();
      const n = root.querySelector('.dz-pgnum'); if (n) n.textContent = `${cur + 1} / ${D.pages.length}`;
    }
    async function goPage(i) { if (i === cur || i < 0 || i >= D.pages.length) return; syncPage(); await loadPage(i); }
    async function addPage() { syncPage(); D.pages.splice(cur + 1, 0, { id: uid(), name: D.format.pages ? 'page' : null, json: null, anim: 'fade', dur: 4 }); await loadPage(cur + 1); changed(); }
    async function dupPage(i) { syncPage(); const c = JSON.parse(JSON.stringify(D.pages[i])); c.id = uid(); D.pages.splice(i + 1, 0, c); await loadPage(i + 1); changed(); }
    async function delPage(i) { if (D.pages.length < 2) return; syncPage(); D.pages.splice(i, 1); await loadPage(Math.max(0, Math.min(i, D.pages.length - 1))); changed(); }
    function movePage(i, d) { const j = i + d; if (j < 0 || j >= D.pages.length) return; syncPage(); const [p] = D.pages.splice(i, 1); D.pages.splice(j, 0, p); cur = j; renderPages(); changed(); }

    /* ================= resize ================= */
    function resizeDialog() {
      const opts = DC.FORMATS.map(f => `<option value="${f.id}" ${f.id === fmt().id ? 'selected' : ''}>${esc(t('dz.f.' + f.id))} – ${DC.sizeLabel(f)}</option>`).join('');
      OW.alert(t('dz.resize'), `<div class="dz-resize"><label class="dz-field"><span>${t('dz.cat.templates')}</span><select data-rf>${opts}<option value="custom">${t('dz.custom')}</option></select></label>
        <div class="dz-row" data-rc hidden><input type="number" data-rw value="${fmt().w}"><span>×</span><input type="number" data-rh value="${fmt().h}"><select data-ru><option value="px" ${fmt().unit === 'px' ? 'selected' : ''}>px</option><option value="mm" ${fmt().unit === 'mm' ? 'selected' : ''}>mm</option></select></div>
        <p class="muted small">${t('dz.resizeHint')}</p><button class="btn primary" data-go>${t('dz.resize')}</button></div>`);
      const c = document.getElementById('modalCard'), sel = c.querySelector('[data-rf]');
      sel.onchange = () => c.querySelector('[data-rc]').hidden = sel.value !== 'custom';
      c.querySelector('[data-go]').onclick = async () => {
        const nf = sel.value === 'custom' ? { id: 'custom', cat: 'custom', w: Math.max(10, +c.querySelector('[data-rw]').value), h: Math.max(10, +c.querySelector('[data-rh]').value), unit: c.querySelector('[data-ru]').value, bleed: c.querySelector('[data-ru]').value === 'mm' ? 3 : 0 } : JSON.parse(JSON.stringify(DC.fmt(sel.value)));
        c.querySelector('[data-x]').click(); await resizeTo(nf);
      };
    }
    async function resizeTo(nf) {
      syncPage(); const og = G, ng = DC.geom(nf);
      const k = Math.min(ng.w / og.w, ng.h / og.h), ox = ng.W / 2 - og.W / 2 * k, oy = ng.H / 2 - og.H / 2 * k;
      for (const p of D.pages) {
        if (!p.json) continue;
        const sc = new fabric.StaticCanvas(null, { width: ng.W, height: ng.H });
        await new Promise(r => sc.loadFromJSON(p.json, r));
        sc.getObjects().forEach(o => {
          if (o.ow && o.ow.kind === 'bg') { if (o.type === 'image') { const s = Math.max(ng.W / o.width, ng.H / o.height); o.set({ scaleX: s, scaleY: s, left: ng.W / 2, top: ng.H / 2 }); } else o.set({ width: ng.W, height: ng.H, left: 0, top: 0 }); return; }
          o.set({ left: o.left * k + ox, top: o.top * k + oy, scaleX: (o.scaleX || 1) * k, scaleY: (o.scaleY || 1) * k }); o.setCoords();
        });
        p.json = sc.toJSON(PROPS); sc.dispose();
      }
      D.format = nf; await mountCanvas(); await loadPage(Math.min(cur, D.pages.length - 1)); renderCtx(); changed();
    }

    /* ================= export ================= */
    async function renderPageCanvas(i, mult, withBleed) {
      if (i === cur) syncPage();
      const sc = new fabric.StaticCanvas(null, { width: G.W, height: G.H, enableRetinaScaling: false });
      await new Promise(r => sc.loadFromJSON(D.pages[i].json || { objects: [] }, r));
      await fontsReady(sc.getObjects()); sc.getObjects().forEach(o => { if (o.initDimensions) o.initDimensions(); if (o.ow && o.ow.kind === 'frame') o.visible = false; });
      const area = withBleed ? { left: 0, top: 0, width: G.W, height: G.H } : { left: G.bleed, top: G.bleed, width: G.w, height: G.h };
      const el = sc.toCanvasElement(mult, area); sc.dispose(); return el;
    }
    function multFor(kind) { // 300 dpi for print, original size for px; keep canvases below ~ 9000 px
      if (fmt().unit === 'mm') { const want = (kind === 'print' ? 300 : 200) / 96; return Math.min(want, 9000 / Math.max(G.W, G.H)); }
      return Math.min(2, 9000 / Math.max(G.W, G.H)) >= 1 ? 1 : 9000 / Math.max(G.W, G.H);
    }
    const busy = msg => { const d = document.createElement('div'); d.className = 'dz-busy'; d.innerHTML = `<div><span class="dz-spin"></span><b>${msg}</b></div>`; root.appendChild(d); return { set: m => d.querySelector('b').textContent = m, close: () => d.remove() }; };
    async function exportImages(type) {
      const pages = D.pages.length > 1 ? await askPages() : [cur]; if (!pages) return;
      const b = busy(t('dz.exporting'));
      try {
        for (const i of pages) {
          const el = await renderPageCanvas(i, multFor('img'), false);
          const blob = await new Promise(r => el.toBlob(r, type === 'jpg' ? 'image/jpeg' : 'image/png', .92));
          OW.download(blob, OW.safeName(ctx.file.name) + (pages.length > 1 ? '-' + (i + 1) : '') + '.' + type);
        }
      } catch (e) { console.error(e); OW.toast(t('dz.insertFailed'), 'warn'); }
      b.close();
    }
    function askPages() {
      return new Promise(res => {
        let picked = null;
        OW.popover(root.querySelector('.dz-pagebar'), [{ icon: 'pages', label: t('dz.allPages') + ` (${D.pages.length})`, onClick: () => { picked = D.pages.map((_, i) => i); res(picked); } }, { icon: 'file', label: t('dz.thisPage'), onClick: () => { picked = [cur]; res(picked); } }]);
        setTimeout(() => { const off = () => { if (!picked) { picked = false; res(null); } document.removeEventListener('mousedown', off2); }; const off2 = e => { if (!e.target.closest('.popover')) setTimeout(off, 50); }; document.addEventListener('mousedown', off2); });
      });
    }
    async function exportPDF(print) {
      const b = busy(t('dz.exporting')), f = fmt(), ptPerPx = f.unit === 'mm' ? 72 / 96 : .75;
      try {
        const out = [], mm = 72 / 25.4, bleedPt = G.bleed * ptPerPx, mark = print && f.unit === 'mm' ? 8 * mm : 0;
        for (let i = 0; i < D.pages.length; i++) {
          const withBleed = print && G.bleed > 0, el = await renderPageCanvas(i, multFor(print ? 'print' : 'img'), withBleed);
          const jpeg = dataURLtoBytes(el.toDataURL('image/jpeg', print ? .95 : .9));
          const wPt = (withBleed ? G.W : G.w) * ptPerPx, hPt = (withBleed ? G.H : G.h) * ptPerPx;
          const W = wPt + 2 * mark, H = hPt + 2 * mark, tx = mark + (withBleed ? bleedPt : 0), ty = mark + (withBleed ? bleedPt : 0), tw = G.w * ptPerPx, th = G.h * ptPerPx;
          out.push({ jpeg, px: [el.width, el.height], size: [W, H], img: [mark, mark, wPt, hPt], trim: [tx, ty, tw, th], bleed: withBleed ? [mark, mark, wPt, hPt] : null, lines: mark ? DC.cropMarks(tx, ty, tw, th, bleedPt, 5 * mm) : [] });
        }
        OW.download(DC.pdf(out, ctx.file.name), OW.safeName(ctx.file.name) + (print ? '-print' : '') + '.pdf');
      } catch (e) { console.error(e); OW.toast(t('dz.insertFailed'), 'warn'); }
      b.close();
    }
    function exportSVG() {
      exporting = true; const svg = cv.toSVG({ viewBox: { x: G.bleed, y: G.bleed, width: G.w, height: G.h }, width: G.w, height: G.h }); exporting = false;
      OW.download(new Blob([svg], { type: 'image/svg+xml' }), OW.safeName(ctx.file.name) + '.svg');
    }
    /* slideshow renderer shared by preview and video export */
    async function slideshow(target, onProgress) {
      const maxSide = 1920, k = Math.min(maxSide / G.w, maxSide / G.h, 2), frames = [];
      for (let i = 0; i < D.pages.length; i++) frames.push(await renderPageCanvas(i, k, false));
      const W = frames[0].width - frames[0].width % 2, H = frames[0].height - frames[0].height % 2;
      target.width = W; target.height = H; const c = target.getContext('2d');
      const total = D.pages.reduce((a, p) => a + (p.dur || 4), 0) * 1000;
      let audio = null;
      if (D.audio && D.audio.src) { audio = new Audio(D.audio.src); audio.volume = D.audio.volume == null ? 1 : D.audio.volume; }
      return { W, H, total, audio, draw(ms) {
        let acc = 0, i = 0; while (i < D.pages.length - 1 && ms >= acc + (D.pages[i].dur || 4) * 1000) { acc += (D.pages[i].dur || 4) * 1000; i++; }
        const p = D.pages[i], local = ms - acc, tr = Math.min(1, local / 600), d = (p.dur || 4) * 1000;
        c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
        if (i > 0 && tr < 1 && p.anim !== 'none') c.drawImage(frames[i - 1], 0, 0, W, H);
        c.save();
        if (p.anim === 'fade') c.globalAlpha = i === 0 ? Math.min(1, local / 600) : tr;
        if (p.anim === 'slide') c.translate((1 - easeOut(tr)) * W, 0);
        if (p.anim === 'zoom') { const s = 1 + .08 * (local / d); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); c.globalAlpha = tr; }
        c.drawImage(frames[i], 0, 0, W, H); c.restore();
        if (audio && ms > total - 1200) audio.volume = Math.max(0, (D.audio.volume == null ? 1 : D.audio.volume) * (total - ms) / 1200);
        onProgress && onProgress(ms / total);
      } };
    }
    const easeOut = x => 1 - Math.pow(1 - x, 3);
    async function preview() {
      syncPage();
      const ov = document.createElement('div'); ov.className = 'dz-show'; ov.innerHTML = `<canvas></canvas><button class="dz-showx">${I('x', 22)}</button>`; document.body.appendChild(ov);
      const s = await slideshow(ov.querySelector('canvas')); let raf, t0 = performance.now(), stop = false;
      const end = () => { stop = true; cancelAnimationFrame(raf); if (s.audio) s.audio.pause(); ov.remove(); document.removeEventListener('keydown', key); };
      const key = e => { if (e.key === 'Escape') end(); };
      document.addEventListener('keydown', key); ov.querySelector('.dz-showx').onclick = end;
      if (s.audio) s.audio.play().catch(() => {});
      const loop = now => { if (stop) return; const ms = now - t0; if (ms >= s.total) { s.draw(s.total - 1); return setTimeout(end, 600); } s.draw(ms); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    async function exportVideo() {
      if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return OW.toast(t('dz.noVideo'), 'warn');
      syncPage();
      const b = busy(t('dz.exporting')), cnv = document.createElement('canvas');
      try {
        const s = await slideshow(cnv, p => b.set(t('dz.recording', { p: Math.round(p * 100) })));
        const stream = cnv.captureStream(30); let ac = null;
        if (s.audio) { ac = new AudioContext(); const src = ac.createMediaElementSource(s.audio), dst = ac.createMediaStreamDestination(); src.connect(dst); dst.stream.getAudioTracks().forEach(tr => stream.addTrack(tr)); }
        const types = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'], type = types.find(x => MediaRecorder.isTypeSupported(x)) || '';
        const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8e6 }), chunks = [];
        rec.ondataavailable = e => e.data.size && chunks.push(e.data);
        const done = new Promise(r => rec.onstop = r);
        rec.start(500); if (s.audio) await s.audio.play().catch(() => {});
        const t0 = performance.now();
        await new Promise(r => { const tick = () => { const ms = performance.now() - t0; if (ms >= s.total) { s.draw(s.total - 1); return r(); } s.draw(ms); requestAnimationFrame(tick); }; tick(); });
        rec.stop(); if (s.audio) s.audio.pause(); await done; if (ac) ac.close();
        const ext = /mp4/.test(type) ? 'mp4' : 'webm';
        OW.download(new Blob(chunks, { type: type.split(';')[0] || 'video/webm' }), OW.safeName(ctx.file.name) + '.' + ext);
      } catch (e) { console.error(e); OW.toast(t('dz.noVideo'), 'warn'); }
      b.close();
    }

    /* ================= format picker (new design) ================= */
    function picker(body) {
      const card = f => { const k = 80 / Math.max(f.w, f.h); return `<button class="dz-fcard" data-f="${f.id}"><span class="dz-fbox"><i style="width:${Math.max(14, f.w * k)}px;height:${Math.max(14, f.h * k)}px"></i></span><b>${esc(t('dz.f.' + f.id))}</b><small>${DC.sizeLabel(f)}</small></button>`; };
      body.innerHTML = `<div class="dz-pick"><h1>${t('dz.pick')}</h1>
        ${DC.CATS.map(c => `<h3>${t('dz.cat.' + c)}</h3><div class="dz-fgrid">${DC.FORMATS.filter(f => f.cat === c).map(card).join('')}</div>`).join('')}
        <h3>${t('dz.custom')}</h3><form class="dz-row dz-customf"><label>${t('dz.width')} <input type="number" name="w" value="1080" min="10"></label><label>${t('dz.height')} <input type="number" name="h" value="1080" min="10"></label><select name="u"><option>px</option><option>mm</option></select><button class="btn primary">${t('dz.create')}</button></form>
        <h3>${t('dz.cat.templates')}</h3><div class="dz-tpls wide">${DC.TEMPLATES.map(tp => `<button class="dz-tpl" data-tpl="${tp.id}"><img alt="" data-th="${tp.id}"><span>${esc(t('dz.t.' + tp.id))}</span><small>${esc(t('dz.f.' + tp.format))}</small></button>`).join('')}</div></div>`;
      const start = async (format, tplId) => { D = newDesign(format); G = DC.geom(D.format); mountEditor(body); if (tplId) await applyTemplate(tplId, true); else { await mountCanvas(); await loadPage(0); } renderAll(); changed(); };
      body.querySelectorAll('[data-f]').forEach(b => b.onclick = () => start(JSON.parse(JSON.stringify(DC.fmt(b.dataset.f)))));
      body.querySelector('.dz-customf').onsubmit = e => { e.preventDefault(); const fd = new FormData(e.target), u = fd.get('u'); start({ id: 'custom', cat: 'custom', w: Math.max(10, +fd.get('w')), h: Math.max(10, +fd.get('h')), unit: u, bleed: u === 'mm' ? 3 : 0 }); };
      body.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => start(JSON.parse(JSON.stringify(DC.fmt(DC.TEMPLATES.find(x => x.id === b.dataset.tpl).format))), b.dataset.tpl));
      root = body; renderTplThumbs(body);
    }

    /* ================= layout ================= */
    function mountEditor(body) {
      body.innerHTML = `<div class="dz">
        <nav class="dz-rail">${RAIL.map(([r, ic]) => `<button data-r="${r}" class="${r === rail ? 'on' : ''}">${I(ic, 20)}<span>${t('dz.r.' + r)}</span></button>`).join('')}</nav>
        <aside class="dz-side"><div class="dz-panel"></div></aside>
        <section class="dz-work"><div class="dz-ctx"></div><div class="dz-stage"></div>
          <div class="dz-pagebar"><div class="dz-pagelist"></div><span class="grow"></span><span class="dz-pgnum"></span>
            <button class="icon-btn sm" data-z="-">${I('zoomOut', 16)}</button><span class="dz-zoomval">100 %</span><button class="icon-btn sm" data-z="+">${I('zoomIn', 16)}</button><button class="btn sm" data-z="fit">${t('dz.zoomFit')}</button></div></section></div>`;
      root = body.querySelector('.dz'); stage = root.querySelector('.dz-stage');
      root.querySelectorAll('.dz-rail button').forEach(b => b.onclick = () => { if (rail === b.dataset.r && !root.querySelector('.dz-side').classList.contains('closed')) { root.querySelector('.dz-side').classList.add('closed'); b.classList.remove('on'); setTimeout(fit, 220); return; } setRail(b.dataset.r); setTimeout(fit, 220); });
      root.querySelectorAll('[data-z]').forEach(b => b.onclick = () => b.dataset.z === 'fit' ? fit() : setZoom(zoom * (b.dataset.z === '+' ? 1.2 : 1 / 1.2)));
      stage.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(Math.max(.05, Math.min(8, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))); }, { passive: false });
      stage.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); stage.classList.add('drop'); } });
      stage.addEventListener('dragleave', () => stage.classList.remove('drop'));
      stage.addEventListener('drop', e => { stage.classList.remove('drop'); if (!e.dataTransfer.files.length) return; e.preventDefault(); e.stopPropagation(); addFiles([...e.dataTransfer.files]); });
      new ResizeObserver(() => fit()).observe(stage);
    }
    function renderAll() { renderPanel(); renderCtx(); renderPages(); ctx.rebuildRibbon && ctx.rebuildRibbon(); }

    /* ================= keyboard & clipboard ================= */
    function keys(e) {
      if (!cv || !root || !root.isConnected || document.querySelector('.modal:not([hidden]), .backstage')) return;
      const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) { if (!(e.target.closest && e.target.closest('.canvas-container'))) return; }
      const o = act(), editing = o && o.isEditing, mod = e.ctrlKey || e.metaKey;
      if (editing) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && o) { e.preventDefault(); removeSel(); }
      else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); }
      else if (mod && e.key.toLowerCase() === 'c' && o) { o.clone(c => clip = c, PROPS); }
      else if (mod && e.key.toLowerCase() === 'v' && clip) { e.preventDefault(); clip.clone(c => { c.set({ left: c.left + 20, top: c.top + 20 }); if (c.type === 'activeSelection') { c.canvas = cv; c.forEachObject(x => cv.add(x)); } else cv.add(c); cv.setActiveObject(c); cv.requestRenderAll(); }, PROPS); }
      else if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); e.shiftKey ? ungroup() : group(); }
      else if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); const objs = cv.getObjects().filter(x => x.selectable !== false); cv.setActiveObject(new fabric.ActiveSelection(objs, { canvas: cv })); cv.requestRenderAll(); }
      else if (o && e.key.startsWith('Arrow')) { e.preventDefault(); const d = e.shiftKey ? 10 : 1; o.set({ left: o.left + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0), top: o.top + (e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0) }); o.setCoords(); cv.requestRenderAll(); pushUndo(); changed(); }
      else if (e.key === 'Escape' && o) cv.discardActiveObject().requestRenderAll();
    }
    async function onPaste(e) {
      if (!cv || !root || !root.isConnected) return; const o = act(); if (o && o.isEditing) return;
      const files = [...(e.clipboardData && e.clipboardData.files || [])].filter(f => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); addFiles(files); }
    }
    document.addEventListener('keydown', keys); document.addEventListener('paste', onPaste);

    /* ================= ribbon (classic, like the other Werkzeuge) ================= */
    const R = () => [
      { id: 'start', label: t('tab.home'), groups: [
        { label: t('undo'), items: [{ icon: 'undo', label: t('undo'), big: true, onClick: doUndo }, { t: 'stack', items: [{ icon: 'redo', label: t('redo'), onClick: doRedo }] }] },
        { label: t('dz.r.elements'), items: [{ icon: 'copy', label: t('duplicate'), big: true, onClick: duplicate }, { t: 'stack', items: [{ icon: 'trash', label: t('delete'), onClick: removeSel }, { icon: 'layers', label: t('dz.group'), onClick: group }, { icon: 'layers', label: t('dz.ungroup'), onClick: ungroup }] }] },
        { label: t('dz.position'), items: [{ t: 'stack', items: [{ icon: 'arrowUp', label: t('dz.toFront'), onClick: () => ctxAct('position-front') }, { icon: 'arrowDown', label: t('dz.toBack'), onClick: () => ctxAct('position-back') }] },
          { t: 'stack', items: [{ icon: 'alignL', label: t('dz.alignLeft'), onClick: () => ctxAct('al', 'alignLeft') }, { icon: 'alignC', label: t('dz.alignCenter'), onClick: () => ctxAct('al', 'alignCenter') }, { icon: 'alignR', label: t('dz.alignRight'), onClick: () => ctxAct('al', 'alignRight') }] },
          { t: 'stack', items: [{ icon: 'arrowUp', label: t('dz.alignTop'), onClick: () => ctxAct('al', 'alignTop') }, { icon: 'hr', label: t('dz.alignMiddle'), onClick: () => ctxAct('al', 'alignMiddle') }, { icon: 'arrowDown', label: t('dz.alignBottom'), onClick: () => ctxAct('al', 'alignBottom') }] }] },
        { label: t('dz.r.text'), items: [{ icon: 'heading', label: t('dz.addHeading'), big: true, onClick: () => addText('heading') }, { t: 'stack', items: [{ icon: 'text', label: t('dz.addSub'), onClick: () => addText('sub') }, { icon: 'paragraph', label: t('dz.addBody'), onClick: () => addText('body') }] }] },
      ] },
      { id: 'insert', label: t('tab.insert'), groups: [
        { label: t('dz.r.elements'), items: [{ icon: 'image', label: t('dz.upload'), big: true, onClick: () => pickFiles('image/*,audio/*', true).then(addFiles) },
          { t: 'menu', icon: 'shapes', label: t('dz.shapes'), items: () => ['rect', 'rounded', 'circle', 'triangle', 'star', 'hexagon', 'heart', 'bubble', 'arrow', 'blob', 'line', 'dashed'].map(s => ({ label: s, onClick: () => add(shape(s)) })) },
          { t: 'menu', icon: 'square', label: t('dz.frames'), items: () => ['rect', 'rounded', 'circle'].map(s => ({ label: t({ rect: 'dz.maskNone', rounded: 'dz.maskRounded', circle: 'dz.maskCircle' }[s]), onClick: () => add(frame(s)) })) },
          { icon: 'grid', label: t('dz.qr'), onClick: addQR }] },
        { label: 'Stock', items: [{ icon: 'image', label: t('dz.r.photos'), big: true, onClick: () => setRail('photos') }, { t: 'stack', items: [{ icon: 'palette', label: t('dz.r.graphics'), onClick: () => setRail('graphics') }, { icon: 'star', label: t('dz.r.icons'), onClick: () => setRail('icons') }, { icon: 'mic', label: t('dz.r.audio'), onClick: () => setRail('audio') }] }, { icon: 'settings', label: t('dz.keys'), onClick: keysDialog }] },
        { label: t('dz.pages'), items: [{ icon: 'filePlus', label: t('dz.addPage'), big: true, onClick: addPage }, { t: 'stack', items: [{ icon: 'copy', label: t('dz.dupPage'), onClick: () => dupPage(cur) }, { icon: 'trash', label: t('dz.delPage'), onClick: () => delPage(cur) }] }] },
      ] },
      { id: 'design', label: t('tab.design'), groups: [
        { label: t('dz.r.templates'), items: [{ icon: 'grid', label: t('dz.r.templates'), big: true, onClick: () => setRail('templates') }, { icon: 'sparkle', label: t('dz.r.brand'), big: true, onClick: () => setRail('brand') }] },
        { label: t('dz.pageBg'), items: [{ t: 'custom', html: `<button class="rb-btn big"><svg class="ic" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/></svg><span>${t('dz.pageBg')}</span></button>`, init: el => el.addEventListener('click', () => colorPop(el, '#fff', c => setBgColor(c || '#ffffff'), { gradient: true })) }] },
        { label: t('dz.resize'), items: [{ icon: 'expand', label: t('dz.resize'), big: true, onClick: resizeDialog }, { icon: 'ocr', label: t('dz.guides'), active: () => showGuides, onClick: () => { showGuides = !showGuides; cv.requestRenderAll(); if (showGuides && G.bleed) OW.toast(t('dz.guidesHint')); } }] },
      ] },
      { id: 'animate', label: t('dz.animation'), groups: [
        { label: t('dz.animation'), items: ['none', 'fade', 'slide', 'zoom'].map(a => ({ icon: { none: 'x', fade: 'eye', slide: 'transition', zoom: 'zoomIn' }[a], label: t('dz.anim.' + a), active: () => D && D.pages[cur].anim === a, onClick: () => { D.pages[cur].anim = a; changed(); renderCtx(); } })) },
        { label: t('dz.audioTrack'), items: [{ icon: 'mic', label: t('dz.music'), big: true, onClick: () => setRail('audio') }] },
        { label: t('dz.play'), items: [{ icon: 'play', label: t('dz.play'), big: true, primary: true, onClick: preview }] },
      ] },
      { id: 'export', label: t('bs.export'), groups: [
        { label: t('image'), items: [{ icon: 'image', label: t('dz.png'), big: true, onClick: () => exportImages('png') }, { t: 'stack', items: [{ icon: 'image', label: t('dz.jpg'), onClick: () => exportImages('jpg') }, { icon: 'shapes', label: t('dz.svg'), onClick: exportSVG }] }] },
        { label: 'PDF', items: [{ icon: 'file', label: t('dz.pdfStd'), big: true, onClick: () => exportPDF(false) }, { icon: 'print', label: t('dz.pdfPrint'), big: true, onClick: () => exportPDF(true) }] },
        { label: t('dz.cat.video'), items: [{ icon: 'play', label: t('dz.video'), big: true, onClick: exportVideo }] },
      ] },
    ];
    function ctxAct(k, v) {
      const o = act(); if (!o) return;
      if (k === 'position-front') { o.bringToFront(); } else if (k === 'position-back') { o.sendToBack(); const bg = getBg(); if (bg) bg.sendToBack(); }
      else if (k === 'al') { if (o.type === 'activeSelection') alignSel(v); else alignToPage(o, v); return; }
      cv.requestRenderAll(); pushUndo(); changed();
    }
    ctx.exports = [
      { label: t('dz.png'), fn: () => exportImages('png') }, { label: t('dz.jpg'), fn: () => exportImages('jpg') },
      { label: t('dz.pdfStd'), fn: () => exportPDF(false) }, { label: t('dz.pdfPrint'), hint: t('dz.guidesHint'), fn: () => exportPDF(true) },
      { label: t('dz.svg'), fn: exportSVG }, { label: t('dz.video'), hint: t('dz.audioHint'), fn: exportVideo },
    ];

    return {
      ribbonMode: 'classic',
      ribbon: () => R(),
      async mount(body) {
        body.innerHTML = `<div class="dz-load">${OW.appGlyph('design', 48)}<span>${t('dz.loading')}</span></div>`;
        await loadLib(); await loadStockCfg();
        if (!D && pendingTpl) { const tp = DC.TEMPLATES.find(x => x.id === pendingTpl); D = newDesign(DC.fmt(tp ? tp.format : 'ig-post')); G = DC.geom(D.format); mountEditor(body); if (tp) await applyTemplate(tp.id, true); else { await mountCanvas(); await loadPage(0); } renderAll(); changed(); return; }
        if (!D) return picker(body);
        G = DC.geom(D.format); mountEditor(body); await mountCanvas(); await loadPage(D.active || 0); renderAll();
      },
      getContent: () => { if (cv && D) { syncPage(); D.active = cur; } return D; },
      setReadOnly(v) { if (cv) { cv.selection = !v; cv.getObjects().forEach(o => { if (!(o.ow && o.ow.kind === 'bg')) o.selectable = !v; }); cv.discardActiveObject().requestRenderAll(); } },
      status: () => D ? { left: `${t('dz.f.' + fmt().id) !== 'dz.f.' + fmt().id ? t('dz.f.' + fmt().id) : t('dz.f.custom')} · ${DC.sizeLabel(fmt())}`, right: `${t('dz.pages')}: ${D.pages.length}` } : { left: '', right: '' },
      print() { exportPDF(false); },
      destroy() { document.removeEventListener('keydown', keys); document.removeEventListener('paste', onPaste); if (previewEl) previewEl.pause(); if (cv) cv.dispose(); },
    };
  };
})();
