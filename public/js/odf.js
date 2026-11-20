/* Office Werkstatt – presentations in OpenDocument format, written and read natively (no LibreOffice, no extra download)
 *   .odp  ODF presentation          .otp  ODF presentation template
 *   .fodp Flat XML ODF presentation .odg  ODF drawing (one drawing page per slide)
 * Route: Slide Werkzeug Pro (.pptx) ⇄ a small slide model ⇄ ODF.
 *   OW.odf.fromPptx(arrayBuffer, 'odp'|'otp'|'fodp'|'odg') → Blob
 *   OW.odf.toPptx(arrayBuffer)                              → Blob (.pptx, for the engine)
 * The model (EMU units, 1 cm = 360000):
 *   { w, h, slides: [{ bg: 'RRGGBB'|null, items: [
 *       { kind: 'shape'|'text'|'image'|'line'|'table', x, y, w, h, rot (deg, clockwise), flipH, flipV,
 *         geom: 'rect'|'ellipse'|…, fill: 'RRGGBB'|null, line: { color, w (EMU) }|null, anchor: 't'|'ctr'|'b',
 *         paras: [{ align: 'l'|'ctr'|'r'|'just', level, bullet: { char }|{ num }|null, runs: [{ t, b, i, u, sz (pt), color, font }] }],
 *         img: { data: Uint8Array, ext }, cols: [EMU], rows: [{ h, cells: [{ paras, fill }] }] }] }] } */
window.OW = window.OW || {};
(function () {
  const EMU_CM = 360000;
  const xesc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const parseXML = s => new DOMParser().parseFromString(s, 'application/xml');
  const kids = (el, name) => el ? Array.from(el.children).filter(c => c.localName === name) : [];
  const kid = (el, name) => el ? Array.from(el.children).find(c => c.localName === name) || null : null;
  const path1 = (el, ...names) => names.reduce((e, n) => kid(e, n), el);
  const deep = (el, name) => el ? el.getElementsByTagNameNS('*', name)[0] || null : null;
  const attr = (el, n) => el ? (el.getAttribute(n) ?? (() => { for (const a of el.attributes) if (a.localName === n) return a.value; return null; })()) : null;
  const cm = emu => (emu / EMU_CM).toFixed(3) + 'cm';
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s.replace(/\s+/g, '')), c => c.charCodeAt(0));
  const extMime = e => ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', bmp: 'image/bmp', emf: 'image/x-emf', wmf: 'image/x-wmf', tif: 'image/tiff', tiff: 'image/tiff' }[e] || 'application/octet-stream');

  /* ---------- colours ---------- */
  function rgb2hsl(h) { let r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0; const L = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; S = L > .5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H /= 6; } return [H, S, L]; }
  function hsl2rgb(H, S, L) { const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; let r, g, b; if (!S) r = g = b = L; else { const q = L < .5 ? L * (1 + S) : L + S - L * S, p = 2 * L - q; r = f(p, q, H + 1 / 3); g = f(p, q, H); b = f(p, q, H - 1 / 3); } return [r, g, b].map(x => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); }
  const PRESET = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080', grey: '808080' };

  /* =================================================================== PPTX → model */
  async function readPptx(ab) {
    const z = await OW.ooxml.readZip(ab);
    const xml = async p => { const s = await z.text(p); return s ? parseXML(s) : null; };
    const relsOf = async p => { const d = p.lastIndexOf('/'), r = await xml(p.slice(0, d) + '/_rels/' + p.slice(d + 1) + '.rels'), m = {}; if (r) for (const e of r.documentElement.children) m[attr(e, 'Id')] = { type: attr(e, 'Type'), target: resolve(p, attr(e, 'Target')), ext: attr(e, 'TargetMode') === 'External' }; return m; };
    const resolve = (from, t) => { if (t.startsWith('/')) return t.slice(1); const parts = from.split('/').slice(0, -1); for (const s of t.split('/')) { if (s === '..') parts.pop(); else if (s !== '.') parts.push(s); } return parts.join('/'); };
    const pres = await xml('ppt/presentation.xml'), presRels = await relsOf('ppt/presentation.xml');
    const sz = deep(pres, 'sldSz'), W = +attr(sz, 'cx') || 12192000, H = +attr(sz, 'cy') || 6858000;
    const slidePaths = kids(deep(pres, 'sldIdLst'), 'sldId').map(s => presRels[attr(s, 'r:id') || attr(s, 'id')]).filter(Boolean).map(r => r.target);
    const cache = {};
    async function partInfo(p) {                     // a slide / layout / master with its rels and its parent
      if (cache[p]) return cache[p];
      const doc = await xml(p), rels = await relsOf(p);
      // slide → its layout → its master (a master links to its layouts too: never go back down)
      const want = /slideLayouts\//.test(p) ? /slideMaster$/ : /slides\//.test(p) ? /slideLayout$/ : null;
      const up = want && Object.values(rels).find(r => want.test(r.type || ''));
      const theme = Object.values(rels).find(r => /theme$/.test(r.type || ''));
      return (cache[p] = { p, doc, rels, parent: up ? up.target : null, theme: theme ? theme.target : null });
    }
    // theme (via the first master)
    let themeColors = {}, majorFont = 'Calibri', minorFont = 'Calibri';
    async function loadTheme(masterPath) {
      const m = await partInfo(masterPath); if (!m.theme) return;
      const t = await xml(m.theme); if (!t) return;
      const cs = deep(t, 'clrScheme'); if (cs) for (const c of cs.children) { const v = c.firstElementChild; themeColors[c.localName] = v ? (attr(v, 'val') && v.localName === 'srgbClr' ? attr(v, 'val') : attr(v, 'lastClr') || attr(v, 'val')) : null; }
      const mj = deep(deep(t, 'majorFont'), 'latin'), mn = deep(deep(t, 'minorFont'), 'latin');
      if (mj) majorFont = attr(mj, 'typeface') || majorFont; if (mn) minorFont = attr(mn, 'typeface') || minorFont;
    }
    const MAPCLR = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' };
    function color(el) {                            // a node that contains a colour choice (solidFill, fontRef …)
      if (!el) return null;
      const c = Array.from(el.children).find(x => /^(srgbClr|schemeClr|sysClr|prstClr|scrgbClr|hslClr)$/.test(x.localName)); if (!c) return null;
      let hex = c.localName === 'srgbClr' ? attr(c, 'val') : c.localName === 'schemeClr' ? themeColors[MAPCLR[attr(c, 'val')] || attr(c, 'val')] : c.localName === 'sysClr' ? attr(c, 'lastClr') || (attr(c, 'val') === 'window' ? 'FFFFFF' : '000000') : c.localName === 'prstClr' ? PRESET[attr(c, 'val')] : null;
      if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return null;
      let [h, s, l] = rgb2hsl(hex), changed = false;
      for (const m of c.children) {
        const v = +attr(m, 'val') / 100000; if (isNaN(v)) continue;
        if (m.localName === 'lumMod') { l *= v; changed = true; } else if (m.localName === 'lumOff') { l += v; changed = true; }
        else if (m.localName === 'tint') { l = l + (1 - l) * (1 - v); changed = true; } else if (m.localName === 'shade') { l *= v; changed = true; }
      }
      return changed ? hsl2rgb(h, s, Math.max(0, Math.min(1, l))) : hex.toUpperCase();
    }
    const fontOf = tf => !tf ? null : tf === '+mj-lt' ? majorFont : tf === '+mn-lt' ? minorFont : tf;

    /* placeholders inherit position and text style from the layout and the master */
    const phOf = sp => { const ph = deep(kid(sp, 'nvSpPr') || kid(sp, 'nvPicPr') || sp, 'ph'); return ph ? { type: attr(ph, 'type') || 'body', idx: attr(ph, 'idx') } : null; };
    const norm = t => ({ ctrTitle: 'title', subTitle: 'body', obj: 'body' }[t] || t);
    function findPh(doc, ph) {
      const all = Array.from(doc.getElementsByTagNameNS('*', 'sp')).filter(s => phOf(s));
      return (ph.idx != null && all.find(s => phOf(s).idx === ph.idx)) || all.find(s => phOf(s).type === ph.type) || all.find(s => norm(phOf(s).type) === norm(ph.type)) || null;
    }
    async function chain(p) { const out = []; let cur = p; while (cur) { const i = await partInfo(cur); out.push(i); cur = i.parent; } return out; }   // slide, layout, master

    function txStyleLvl(master, ph, lvl) {        // master <p:txStyles>
      const ts = deep(master.doc, 'txStyles'); if (!ts) return null;
      const k = !ph ? 'otherStyle' : norm(ph.type) === 'title' ? 'titleStyle' : /^(body)$/.test(norm(ph.type)) ? 'bodyStyle' : 'otherStyle';
      return kid(kid(ts, k), `lvl${lvl + 1}pPr`);
    }
    function lstLvl(sp, lvl) { const b = kid(sp, 'txBody'); return kid(kid(b, 'lstStyle'), `lvl${lvl + 1}pPr`); }

    async function readItems(container, info, ch, off = null) {
      const out = [];
      for (const el of container.children) {
        const n = el.localName;
        if (n === 'grpSp') {
          const x = deep(kid(el, 'grpSpPr'), 'xfrm'); const g = xf(x);
          const choff = kid(x, 'chOff'), chext = kid(x, 'chExt');
          const map = { ox: g.x, oy: g.y, sx: chext && +attr(chext, 'cx') ? g.w / +attr(chext, 'cx') : 1, sy: chext && +attr(chext, 'cy') ? g.h / +attr(chext, 'cy') : 1, cx: choff ? +attr(choff, 'x') : 0, cy: choff ? +attr(choff, 'y') : 0 };
          const sub = await readItems(el, info, ch, map);
          for (const it of sub) out.push(off ? place(it, off) : it);
          continue;
        }
        let it = null;
        if (n === 'sp') it = await readShape(el, info, ch);
        else if (n === 'pic') it = await readPic(el, info, ch);
        else if (n === 'cxnSp') it = readLine(el);
        else if (n === 'graphicFrame') it = readTable(el, ch);
        if (!it) continue;
        out.push(off ? place(it, off) : it);
      }
      return out;
    }
    const place = (it, m) => Object.assign(it, { x: Math.round(m.ox + (it.x - m.cx) * m.sx), y: Math.round(m.oy + (it.y - m.cy) * m.sy), w: Math.round(it.w * m.sx), h: Math.round(it.h * m.sy) });
    function xf(x) { const o = kid(x, 'off'), e = kid(x, 'ext'); return { x: +attr(o, 'x') || 0, y: +attr(o, 'y') || 0, w: +attr(e, 'cx') || 0, h: +attr(e, 'cy') || 0, rot: (+attr(x, 'rot') || 0) / 60000, flipH: attr(x, 'flipH') === '1', flipV: attr(x, 'flipV') === '1' }; }
    async function geometryFor(sp, ch) {           // own xfrm, else the placeholder's in layout / master
      const own = deep(kid(sp, 'spPr'), 'xfrm'); if (own && kid(own, 'off')) return xf(own);
      const ph = phOf(sp); if (!ph) return null;
      for (const p of ch.slice(1)) { const s = findPh(p.doc, ph); const x = s && deep(kid(s, 'spPr'), 'xfrm'); if (x && kid(x, 'off')) return xf(x); }
      return null;
    }
    function lnOf(spPr, style) {
      const ln = kid(spPr, 'ln');
      if (ln && kid(ln, 'noFill')) return null;
      let c = ln ? color(kid(ln, 'solidFill')) : null;
      if (!c && !ln && style) { const r = kid(style, 'lnRef'); if (r && +attr(r, 'idx') > 0) c = color(r); }
      if (!c) return null;
      return { color: c, w: ln && +attr(ln, 'w') || 12700 };
    }
    function fillOf(spPr, style) {
      if (!spPr) return null;
      if (kid(spPr, 'noFill')) return null;
      const sf = kid(spPr, 'solidFill'); if (sf) return color(sf);
      const gf = kid(spPr, 'gradFill'); if (gf) { const gs = deep(gf, 'gs'); return gs ? color(gs) : null; }
      if (style) { const r = kid(style, 'fillRef'); if (r && +attr(r, 'idx') > 0) return color(r); }
      return undefined;                              // not set here
    }
    async function readShape(sp, info, ch) {
      const g = await geometryFor(sp, ch); if (!g) return null;
      const ph = phOf(sp), spPr = kid(sp, 'spPr'), style = kid(sp, 'style');
      const geom = attr(deep(spPr, 'prstGeom'), 'prst') || (deep(spPr, 'custGeom') ? 'rect' : 'rect');
      let fill = fillOf(spPr, style); if (fill === undefined) fill = null;
      const line = lnOf(spPr, style);
      const body = kid(sp, 'txBody'), bp = kid(body, 'bodyPr');
      let anchor = attr(bp, 'anchor');
      if (!anchor && ph) for (const p of ch.slice(1)) { const s = findPh(p.doc, ph); const a = s && attr(kid(kid(s, 'txBody'), 'bodyPr'), 'anchor'); if (a) { anchor = a; break; } }
      const paras = body ? readParas(body, sp, ph, ch, style) : [];
      const hasText = paras.some(p => p.runs.some(r => r.t.trim()));
      if (!hasText && ph) return null;                 // empty placeholder: nothing to show
      return Object.assign(g, { _ph: !!ph, kind: !fill && !line && hasText && geom === 'rect' ? 'text' : 'shape', geom, fill, line, anchor: anchor || (ph && norm(ph.type) === 'title' ? 'ctr' : 't'), paras,
        inset: bp ? [attr(bp, 'lIns'), attr(bp, 'tIns'), attr(bp, 'rIns'), attr(bp, 'bIns')].map((v, i) => v != null ? +v : (i % 2 ? 45720 : 91440)) : [91440, 45720, 91440, 45720] });
    }
    function readParas(body, sp, ph, ch, style) {
      const master = ch[ch.length - 1], layoutSp = ph && ch[1] ? findPh(ch[1].doc, ph) : null, masterSp = ph ? findPh(master.doc, ph) : null;
      const fontRefColor = style ? color(kid(style, 'fontRef')) : null;
      const out = [];
      for (const p of kids(body, 'p')) {
        const pPr = kid(p, 'pPr'), lvl = +attr(pPr, 'lvl') || 0;
        // inherited paragraph properties: own → shape list style → layout ph → master ph → master txStyles
        const srcs = [pPr, lstLvl(sp, lvl), layoutSp && lstLvl(layoutSp, lvl), masterSp && lstLvl(masterSp, lvl), txStyleLvl(master, ph, lvl)].filter(Boolean);
        const pick = f => { for (const s of srcs) { const v = f(s); if (v != null) return v; } return null; };
        const align = pick(s => attr(s, 'algn')) || 'l';
        let bullet = null;
        const bu = pick(s => kid(s, 'buNone') ? { none: 1 } : kid(s, 'buChar') ? { char: attr(kid(s, 'buChar'), 'char') } : kid(s, 'buAutoNum') ? { num: attr(kid(s, 'buAutoNum'), 'type') || 'arabicPeriod' } : null);
        if (bu && !bu.none) bullet = bu;
        const defR = s => kid(s, 'defRPr');
        const dsz = pick(s => { const d = defR(s); return d && attr(d, 'sz') ? +attr(d, 'sz') / 100 : null; }) || 18;
        const ownSrc = [pPr, lstLvl(sp, lvl)].filter(Boolean);
        const ownCol = ownSrc.map(s => { const d = defR(s); return d ? color(kid(d, 'solidFill')) : null; }).find(Boolean);
        const dcol = ownCol || (!ph && fontRefColor) || pick(s => { const d = defR(s); return d ? color(kid(d, 'solidFill')) : null; }) || fontRefColor || themeColors.dk1 || '000000';
        const dfont = pick(s => { const d = defR(s); return d && kid(d, 'latin') ? fontOf(attr(kid(d, 'latin'), 'typeface')) : null; }) || (ph && norm(ph.type) === 'title' ? majorFont : minorFont);
        const db = pick(s => { const d = defR(s); return d && attr(d, 'b') != null ? attr(d, 'b') === '1' : null; });
        const di = pick(s => { const d = defR(s); return d && attr(d, 'i') != null ? attr(d, 'i') === '1' : null; });
        const runs = [];
        for (const r of p.children) {
          if (r.localName === 'br') { runs.push({ t: '\n', sz: dsz }); continue; }
          if (r.localName !== 'r' && r.localName !== 'fld') continue;
          const rp = kid(r, 'rPr'), t = (kid(r, 't') || {}).textContent || '';
          runs.push({ t, b: rp && attr(rp, 'b') != null ? attr(rp, 'b') === '1' : !!db, i: rp && attr(rp, 'i') != null ? attr(rp, 'i') === '1' : !!di, u: !!(rp && attr(rp, 'u') && attr(rp, 'u') !== 'none'),
            sz: rp && attr(rp, 'sz') ? +attr(rp, 'sz') / 100 : dsz, color: (rp && color(kid(rp, 'solidFill'))) || dcol, font: (rp && kid(rp, 'latin') && fontOf(attr(kid(rp, 'latin'), 'typeface'))) || dfont });
        }
        const end = kid(p, 'endParaRPr');
        out.push({ align, level: lvl, bullet: runs.some(r => r.t.trim()) ? bullet : null, runs, sz: end && attr(end, 'sz') ? +attr(end, 'sz') / 100 : dsz });
      }
      return out;
    }
    async function readPic(pic, info, ch) {
      const g = await geometryFor(pic, ch) || (deep(kid(pic, 'spPr'), 'xfrm') ? xf(deep(kid(pic, 'spPr'), 'xfrm')) : null); if (!g) return null;
      const blip = deep(kid(pic, 'blipFill'), 'blip'), rid = attr(blip, 'r:embed') || attr(blip, 'embed'), rel = rid && info.rels[rid];
      if (!rel || rel.ext) return null;
      const data = await z.bytes(rel.target); if (!data) return null;
      return Object.assign(g, { _ph: !!phOf(pic), kind: 'image', img: { data, ext: (rel.target.split('.').pop() || 'png').toLowerCase() } });
    }
    function readLine(el) {
      const x = deep(kid(el, 'spPr'), 'xfrm'); if (!x) return null;
      const g = xf(x), ln = kid(kid(el, 'spPr'), 'ln');
      return Object.assign(g, { kind: 'line', line: { color: (ln && color(kid(ln, 'solidFill'))) || color(kid(kid(el, 'style'), 'lnRef')) || '000000', w: ln && +attr(ln, 'w') || 12700 } });
    }
    function readTable(gf, ch) {
      const tbl = deep(gf, 'tbl'); if (!tbl) return null;
      const g = xf(kid(gf, 'xfrm'));
      const cols = kids(kid(tbl, 'tblGrid'), 'gridCol').map(c => +attr(c, 'w') || 0);
      const rows = kids(tbl, 'tr').map(tr => ({ h: +attr(tr, 'h') || 0, cells: kids(tr, 'tc').map(tc => ({ paras: kid(tc, 'txBody') ? readParas(kid(tc, 'txBody'), tc, null, ch, null) : [], fill: color(kid(kid(tc, 'tcPr'), 'solidFill')), span: +attr(tc, 'gridSpan') || 1, merged: attr(tc, 'hMerge') === '1' || attr(tc, 'vMerge') === '1' })) }));
      // table styles (tableStyleId) are not read: their usual look – a coloured header row, banded rows – is kept
      const tp = kid(tbl, 'tblPr'), acc = themeColors.accent1 || '4472C4';
      if (tp && (attr(tp, 'firstRow') === '1' || attr(tp, 'bandRow') === '1') && !rows.some(r => r.cells.some(c => c.fill))) {
        const [h0, s0] = rgb2hsl(acc), light = hsl2rgb(h0, s0, .9), lighter = hsl2rgb(h0, s0, .95);
        rows.forEach((r, i) => r.cells.forEach(c => {
          if (i === 0 && attr(tp, 'firstRow') === '1') { c.fill = acc; c.paras.forEach(p => p.runs.forEach(x => { x.color = 'FFFFFF'; x.b = true; })); }
          else if (attr(tp, 'bandRow') === '1') c.fill = i % 2 ? light : lighter;
        }));
      }
      return Object.assign(g, { kind: 'table', cols, rows });
    }
    async function background(ch) {
      for (const p of ch) {
        const bg = deep(p.doc, 'bg'); if (!bg) continue;
        const pr = kid(bg, 'bgPr'); if (pr) { const f = kid(pr, 'solidFill') || deep(kid(pr, 'gradFill'), 'gs'); const c = f && color(f); if (c) return c; }
        const ref = kid(bg, 'bgRef'); if (ref) { const c = color(ref); if (c) return c; }
      }
      return 'FFFFFF';
    }

    const model = { w: W, h: H, slides: [] };
    for (const sp of slidePaths) {
      const ch = await chain(sp);
      if (!Object.keys(themeColors).length) await loadTheme(ch[ch.length - 1].p);
      const tree = deep(ch[0].doc, 'spTree');
      // master/layout shapes that are not placeholders (logos, bars) are drawn behind the slide's own shapes
      const behind = [];
      const showMaster = attr(ch[0].doc.documentElement, 'showMasterSp') !== '0';
      if (showMaster) for (const p of ch.slice(1).reverse()) { const t = deep(p.doc, 'spTree'); if (!t) continue; for (const it of await readItems(t, p, [p].concat(ch.slice(ch.indexOf(p) + 1)))) if (!it._ph) behind.push(it); }
      const own = tree ? await readItems(tree, ch[0], ch) : [];
      model.slides.push({ bg: await background(ch), items: behind.concat(own) });
    }
    return model;
  }

  /* =================================================================== model → ODF */
  const ODF_GEOM = { rect: 'rectangle', roundRect: 'round-rectangle', ellipse: 'ellipse', triangle: 'isosceles-triangle', rtTriangle: 'right-triangle', diamond: 'diamond', rightArrow: 'right-arrow', leftArrow: 'left-arrow', upArrow: 'up-arrow', downArrow: 'down-arrow', leftRightArrow: 'left-right-arrow', star5: 'star5', star4: 'star4', star8: 'star8', star24: 'star24', hexagon: 'hexagon', pentagon: 'pentagon', octagon: 'octagon', chevron: 'chevron', homePlate: 'pentagon-right', parallelogram: 'parallelogram', trapezoid: 'trapezoid', cloud: 'cloud', heart: 'heart', plus: 'cross', can: 'can', cube: 'cube', donut: 'ring', smileyFace: 'smiley', sun: 'sun', moon: 'moon', lightningBolt: 'lightning', flowChartProcess: 'flowchart-process', flowChartDecision: 'flowchart-decision', flowChartTerminator: 'flowchart-terminator', flowChartAlternateProcess: 'flowchart-alternate-process', wedgeRectCallout: 'rectangular-callout', wedgeRoundRectCallout: 'round-rectangular-callout', wedgeEllipseCallout: 'round-callout', snip1Rect: 'rectangle', round1Rect: 'round-rectangle', round2SameRect: 'round-rectangle', frame: 'frame' };
  const ALIGN = { l: 'start', ctr: 'center', r: 'end', just: 'justify', dist: 'justify' };
  const VALIGN = { t: 'top', ctr: 'middle', b: 'bottom' };
  const NUMFMT = t => /alphaLc/.test(t) ? 'a' : /alphaUc/.test(t) ? 'A' : /romanLc/.test(t) ? 'i' : /romanUc/.test(t) ? 'I' : '1';

  function writeODF(model, kind) {
    const draw = kind === 'odg', flat = kind === 'fodp';
    const mime = { odp: 'application/vnd.oasis.opendocument.presentation', otp: 'application/vnd.oasis.opendocument.presentation-template', fodp: 'application/vnd.oasis.opendocument.presentation', odg: 'application/vnd.oasis.opendocument.graphics' }[kind];
    const auto = [], seen = new Map(), fonts = new Set(), pics = {};
    const styleFor = (family, prefix, inner) => { const key = family + inner; if (seen.has(key)) return seen.get(key); const name = prefix + (seen.size + 1); seen.set(key, name); auto.push(`<style:style style:name="${name}" style:family="${family}">${inner}</style:style>`); return name; };
    const listFor = (bullet, level) => { const key = 'list' + JSON.stringify(bullet) + level; if (seen.has(key)) return seen.get(key); const name = 'L' + (seen.size + 1); seen.set(key, name);
      let lv = ''; for (let i = 1; i <= 9; i++) lv += bullet.num ? `<text:list-level-style-number text:level="${i}" style:num-format="${NUMFMT(bullet.num)}" style:num-suffix="."><style:list-level-properties text:space-before="${(i - 1) * 0.8}cm" text:min-label-width="0.8cm"/></text:list-level-style-number>` : `<text:list-level-style-bullet text:level="${i}" text:bullet-char="${xesc(bullet.char || '•')}" text:bullet-relative-size="100%"><style:list-level-properties text:space-before="${(i - 1) * 0.8}cm" text:min-label-width="0.6cm"/><style:text-properties fo:font-family="Arial" style:use-window-font-color="true" fo:font-size="100%"/></text:list-level-style-bullet>`;
      auto.push(`<text:list-style style:name="${name}">${lv}</text:list-style>`); return name; };
    const textStyle = r => { if (r.font) fonts.add(r.font); return styleFor('text', 'T', `<style:text-properties fo:font-size="${r.sz || 18}pt" fo:color="#${r.color || '000000'}"${r.b ? ' fo:font-weight="bold"' : ''}${r.i ? ' fo:font-style="italic"' : ''}${r.u ? ' style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"' : ''}${r.font ? ` style:font-name="${xesc(r.font)}"` : ''}/>`); };
    const paraStyle = p => styleFor('paragraph', 'P', `<style:paragraph-properties fo:text-align="${ALIGN[p.align] || 'start'}"/><style:text-properties fo:font-size="${p.sz || (p.runs[0] && p.runs[0].sz) || 18}pt"/>`);
    function runsXml(runs) {
      return runs.map(r => {
        if (r.t === '\n') return '<text:line-break/>';
        const t = xesc(r.t).replace(/\t/g, '<text:tab/>').replace(/ {2,}/g, m => ' ' + `<text:s text:c="${m.length - 1}"/>`).replace(/\n/g, '<text:line-break/>');
        return `<text:span text:style-name="${textStyle(r)}">${t}</text:span>`;
      }).join('');
    }
    function parasXml(paras) {
      let o = '';
      for (const p of paras) {
        const inner = `<text:p text:style-name="${paraStyle(p)}">${runsXml(p.runs)}</text:p>`;
        if (p.bullet) { let x = inner; for (let i = 0; i < p.level; i++) x = `<text:list><text:list-item>${x}</text:list-item></text:list>`; o += `<text:list text:style-name="${listFor(p.bullet, p.level)}"><text:list-item>${x}</text:list-item></text:list>`; }
        else o += inner;
      }
      return o || '<text:p/>';
    }
    const graphic = it => styleFor('graphic', 'gr', `<style:graphic-properties draw:fill="${it.fill ? 'solid' : 'none'}"${it.fill ? ` draw:fill-color="#${it.fill}"` : ''} draw:stroke="${it.line ? 'solid' : 'none'}"${it.line ? ` svg:stroke-color="#${it.line.color}" svg:stroke-width="${cm(it.line.w)}"` : ''} draw:textarea-vertical-align="${VALIGN[it.anchor] || 'top'}" draw:textarea-horizontal-align="justify" draw:auto-grow-height="false" draw:shadow="hidden" fo:padding-left="${cm((it.inset || [])[0] ?? 91440)}" fo:padding-top="${cm((it.inset || [])[1] ?? 45720)}" fo:padding-right="${cm((it.inset || [])[2] ?? 91440)}" fo:padding-bottom="${cm((it.inset || [])[3] ?? 45720)}"${it.kind === 'text' ? ' fo:wrap-option="wrap"' : ''}/>`);
    function frameAttrs(it, style) {
      const s = `draw:style-name="${style}" svg:width="${cm(it.w)}" svg:height="${cm(it.h)}"`;
      if (!it.rot) return `${s} svg:x="${cm(it.x)}" svg:y="${cm(it.y)}"`;
      // ODF turns the shape about its own top-left corner (counter-clockwise, radians), then moves it:
      // the move is chosen so that the centre stays where it is (the slide model turns clockwise about the centre)
      const r = it.rot * Math.PI / 180, cx = it.x + it.w / 2, cy = it.y + it.h / 2;
      const tx = cx - (it.w / 2 * Math.cos(r) - it.h / 2 * Math.sin(r)), ty = cy - (it.w / 2 * Math.sin(r) + it.h / 2 * Math.cos(r));
      return `${s} draw:transform="rotate (${(-r).toFixed(6)}) translate (${cm(tx)} ${cm(ty)})"`;
    }
    let nPic = 0;
    function itemXml(it) {
      if (it.kind === 'image') {
        const ext = it.img.ext === 'jpeg' ? 'jpg' : it.img.ext, name = `Pictures/image${++nPic}.${ext}`;
        const st = styleFor('graphic', 'gr', '<style:graphic-properties draw:fill="none" draw:stroke="none"/>');
        if (flat) return `<draw:frame ${frameAttrs(it, st)}><draw:image><office:binary-data>${b64(it.img.data)}</office:binary-data></draw:image></draw:frame>`;
        pics[name] = it.img.data;
        return `<draw:frame ${frameAttrs(it, st)}><draw:image xlink:href="${name}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
      }
      if (it.kind === 'line') {
        const st = styleFor('graphic', 'gr', `<style:graphic-properties draw:stroke="solid" svg:stroke-color="#${it.line.color}" svg:stroke-width="${cm(it.line.w)}"/>`);
        const x1 = it.flipH ? it.x + it.w : it.x, x2 = it.flipH ? it.x : it.x + it.w, y1 = it.flipV ? it.y + it.h : it.y, y2 = it.flipV ? it.y : it.y + it.h;
        return `<draw:line draw:style-name="${st}" svg:x1="${cm(x1)}" svg:y1="${cm(y1)}" svg:x2="${cm(x2)}" svg:y2="${cm(y2)}"><text:p/></draw:line>`;
      }
      if (it.kind === 'table') {
        const cols = it.cols.map(w => `<table:table-column table:style-name="${styleFor('table-column', 'co', `<style:table-column-properties style:column-width="${cm(w)}"/>`)}"/>`).join('');
        const rows = it.rows.map(r => `<table:table-row table:style-name="${styleFor('table-row', 'ro', `<style:table-row-properties style:row-height="${cm(r.h)}"/>`)}">${r.cells.map(c => c.merged ? '<table:covered-table-cell/>' : `<table:table-cell table:style-name="${styleFor('table-cell', 'ce', `<style:graphic-properties draw:fill="${c.fill ? 'solid' : 'none'}"${c.fill ? ` draw:fill-color="#${c.fill}"` : ''}/><style:paragraph-properties fo:border="0.03cm solid #808080"/>`)}"${c.span > 1 ? ` table:number-columns-spanned="${c.span}"` : ''}>${parasXml(c.paras)}</table:table-cell>`).join('')}</table:table-row>`).join('');
        const st = styleFor('graphic', 'gr', '<style:graphic-properties draw:fill="none" draw:stroke="none"/>');
        return `<draw:frame ${frameAttrs(it, st)}><table:table>${cols}${rows}</table:table></draw:frame>`;
      }
      const st = graphic(it);
      if (it.kind === 'text') return `<draw:frame ${frameAttrs(it, st)}><draw:text-box>${parasXml(it.paras)}</draw:text-box></draw:frame>`;
      const type = ODF_GEOM[it.geom] || 'rectangle';
      const mirror = `${it.flipH ? ' draw:mirror-horizontal="true"' : ''}${it.flipV ? ' draw:mirror-vertical="true"' : ''}`;
      return `<draw:custom-shape ${frameAttrs(it, st)}>${it.paras && it.paras.length ? parasXml(it.paras) : ''}<draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:type="${type}"${mirror}/></draw:custom-shape>`;
    }
    const pagesXml = model.slides.map((s, i) => {
      const dp = styleFor('drawing-page', 'dp', `<style:drawing-page-properties draw:fill="solid" draw:fill-color="#${s.bg || 'FFFFFF'}" draw:background-size="full"${draw ? '' : ' presentation:background-visible="true" presentation:background-objects-visible="true"'}/>`);
      return `<draw:page draw:name="page${i + 1}" draw:style-name="${dp}" draw:master-page-name="Default"${draw ? '' : ' presentation:presentation-page-layout-name="AL0"'}>${s.items.map(itemXml).join('')}</draw:page>`;
    }).join('');
    const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:smil="urn:oasis:names:tc:opendocument:xmlns:smil-compatible:1.0" xmlns:anim="urn:oasis:names:tc:opendocument:xmlns:animation:1.0" office:version="1.3"';
    const fontDecls = `<office:font-face-decls>${[...fonts].map(f => `<style:font-face style:name="${xesc(f)}" svg:font-family="'${xesc(f)}'"/>`).join('')}</office:font-face-decls>`;
    const pageLayout = `<style:page-layout style:name="PM1"><style:page-layout-properties fo:margin-top="0cm" fo:margin-bottom="0cm" fo:margin-left="0cm" fo:margin-right="0cm" fo:page-width="${cm(model.w)}" fo:page-height="${cm(model.h)}" style:print-orientation="${model.w >= model.h ? 'landscape' : 'portrait'}"/></style:page-layout>`;
    const masterAuto = `<style:style style:name="Mdp1" style:family="drawing-page"><style:drawing-page-properties draw:fill="solid" draw:fill-color="#FFFFFF"/></style:style>`;
    const officeStyles = `<office:styles><style:default-style style:family="graphic"><style:graphic-properties draw:shadow="hidden"/><style:paragraph-properties style:writing-mode="lr-tb"/><style:text-properties fo:font-size="18pt" fo:language="${OW.lang || 'de'}"/></style:default-style>${draw ? '' : '<style:presentation-page-layout style:name="AL0"/>'}</office:styles>`;
    const masters = `<office:master-styles><style:master-page style:name="Default" style:page-layout-name="PM1" draw:style-name="Mdp1"/></office:master-styles>`;
    const body = draw ? `<office:drawing>${pagesXml}</office:drawing>` : `<office:presentation>${pagesXml}</office:presentation>`;
    const meta = `<office:meta><meta:generator>Office Werkstatt</meta:generator><meta:creation-date>${new Date().toISOString().slice(0, 19)}</meta:creation-date></office:meta>`;
    const decl = '<?xml version="1.0" encoding="UTF-8"?>\n';
    if (flat) return new Blob([`${decl}<office:document ${NS} office:mimetype="${mime}">${meta}${fontDecls}${officeStyles}<office:automatic-styles>${pageLayout}${masterAuto}${auto.join('')}</office:automatic-styles>${masters}<office:body>${body}</office:body></office:document>`], { type: 'application/xml' });
    const content = `${decl}<office:document-content ${NS}>${fontDecls}<office:automatic-styles>${auto.join('')}</office:automatic-styles><office:body>${body}</office:body></office:document-content>`;
    const styles = `${decl}<office:document-styles ${NS}>${fontDecls}${officeStyles}<office:automatic-styles>${pageLayout}${masterAuto}</office:automatic-styles>${masters}</office:document-styles>`;
    const metaXml = `${decl}<office:document-meta ${NS}>${meta}</office:document-meta>`;
    const manifest = `${decl}<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${mime}"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>${Object.keys(pics).map(p => `<manifest:file-entry manifest:full-path="${p}" manifest:media-type="${extMime(p.split('.').pop())}"/>`).join('')}</manifest:manifest>`;
    const files = { mimetype: mime, 'content.xml': content, 'styles.xml': styles, 'meta.xml': metaXml };
    Object.assign(files, pics); files['META-INF/manifest.xml'] = manifest;
    return new Blob([OW.ooxml.writeZip(files)], { type: mime });
  }

  /* =================================================================== ODF → model */
  function len(v) {                                  // ODF length → EMU
    if (v == null) return 0; const m = /^(-?[\d.]+)\s*(cm|mm|in|pt|pc|px|)$/.exec(String(v).trim()); if (!m) return 0;
    const n = +m[1]; return Math.round(n * ({ cm: EMU_CM, mm: EMU_CM / 10, in: 914400, pt: 12700, pc: 152400, px: 9525, '': EMU_CM }[m[2]]));
  }
  async function readODF(ab) {
    const head = new Uint8Array(ab, 0, 2); let contentDoc, stylesDoc, getPic;
    if (head[0] === 0x50 && head[1] === 0x4b) {        // zipped (odp/otp/odg)
      const z = await OW.ooxml.readZip(ab);
      contentDoc = parseXML(await z.text('content.xml')); const st = await z.text('styles.xml'); stylesDoc = st ? parseXML(st) : null;
      getPic = async href => z.bytes(href.replace(/^\.\//, ''));
    } else {                                           // flat XML (fodp)
      contentDoc = parseXML(new TextDecoder().decode(ab)); stylesDoc = contentDoc; getPic = async () => null;
    }
    const styles = {};                                 // name → { family, parent, props }
    for (const doc of [stylesDoc, contentDoc]) if (doc) for (const s of doc.getElementsByTagNameNS('*', 'style')) {
      if (s.parentElement && /^(styles|automatic-styles)$/.test(s.parentElement.localName)) {
        const props = {}; for (const pp of s.children) for (const a of pp.attributes) props[a.localName] = a.value;
        styles[attr(s, 'name')] = { parent: attr(s, 'parent-style-name'), props, family: attr(s, 'family') };
      }
    }
    const lists = {};
    for (const doc of [stylesDoc, contentDoc]) if (doc) for (const ls of doc.getElementsByTagNameNS('*', 'list-style')) {
      const lv = {}; for (const l of ls.children) lv[+attr(l, 'level') || 1] = l.localName.includes('number') ? { num: attr(l, 'num-format') === 'a' ? 'alphaLcPeriod' : attr(l, 'num-format') === 'A' ? 'alphaUcPeriod' : attr(l, 'num-format') === 'i' ? 'romanLcPeriod' : 'arabicPeriod' } : l.localName.includes('bullet') ? { char: attr(l, 'bullet-char') || '•' } : null;
      lists[attr(ls, 'name')] = lv;
    }
    const prop = (name, k, depth = 0) => { const s = name && styles[name]; if (!s || depth > 10) return null; return s.props[k] != null ? s.props[k] : prop(s.parent, k, depth + 1); };
    const hex = v => v && /^#[0-9a-f]{6}$/i.test(v) ? v.slice(1).toUpperCase() : null;
    // page size
    let W = 10080000, H = 5670000;
    const pl = (stylesDoc || contentDoc).getElementsByTagNameNS('*', 'page-layout-properties')[0];
    if (pl) { W = len(attr(pl, 'page-width')) || W; H = len(attr(pl, 'page-height')) || H; }
    const masterBg = {};
    for (const mp of (stylesDoc || contentDoc).getElementsByTagNameNS('*', 'master-page')) masterBg[attr(mp, 'name')] = hex(prop(attr(mp, 'style-name'), 'fill-color'));

    function runsOf(p, inherited, pres) {
      const runs = [];
      const walk = (node, st) => {
        for (const n of node.childNodes) {
          if (n.nodeType === 3) { if (n.nodeValue) runs.push(mk(n.nodeValue, st)); continue; }
          if (n.nodeType !== 1) continue;
          const ln = n.localName;
          if (ln === 's') { runs.push(mk(' '.repeat(+attr(n, 'c') || 1), st)); continue; }
          if (ln === 'tab') { runs.push(mk('\t', st)); continue; }
          if (ln === 'line-break') { runs.push({ t: '\n', sz: 18 }); continue; }
          if (ln === 'span' || ln === 'a') { walk(n, attr(n, 'style-name') || st); continue; }
          if (ln === 'list' || ln === 'p' || ln === 'h') continue;
        }
      };
      const mk = (t, st) => {
        const g = k => prop(st, k) ?? prop(inherited, k) ?? prop(pres, k);
        return { t, b: /bold|[6-9]00/.test(g('font-weight') || ''), i: g('font-style') === 'italic', u: !!(g('text-underline-style') && g('text-underline-style') !== 'none'),
          sz: parseFloat(g('font-size')) || 18, color: hex(g('color')) || '000000', font: g('font-name') || (g('font-family') || '').replace(/'/g, '') || null };
      };
      walk(p, null);
      return runs;
    }
    function parasOf(container, pres) {
      const out = [];
      const add = (p, level, bullet) => {
        const ps = attr(p, 'style-name');
        const align = { start: 'l', left: 'l', center: 'ctr', end: 'r', right: 'r', justify: 'just' }[prop(ps, 'text-align') || prop(pres, 'text-align')] || 'l';
        const runs = runsOf(p, ps, pres);
        out.push({ align, level, bullet: runs.some(r => r.t.trim()) ? bullet : null, runs, sz: parseFloat(prop(ps, 'font-size') || prop(pres, 'font-size')) || 18 });
      };
      const walk = (node, level, listStyle) => {
        for (const n of node.children) {
          if (n.localName === 'p' || n.localName === 'h') add(n, Math.max(0, level), null);
          else if (n.localName === 'list') { const ls = attr(n, 'style-name') || listStyle; for (const li of kids(n, 'list-item').concat(kids(n, 'list-header'))) walkItem(li, level + 1, ls); }
        }
      };
      const walkItem = (li, level, ls) => {
        for (const n of li.children) {
          if (n.localName === 'p' || n.localName === 'h') add(n, level - 1, (lists[ls] && lists[ls][level]) || { char: '•' });
          else if (n.localName === 'list') { const l2 = attr(n, 'style-name') || ls; for (const x of kids(n, 'list-item')) walkItem(x, level + 1, l2); }
        }
      };
      walk(container, 0, null);
      return out;
    }
    function geomOf(el) {
      const t = attr(kid(el, 'enhanced-geometry'), 'type') || (el.localName === 'ellipse' || el.localName === 'circle' ? 'ellipse' : 'rectangle');
      const back = Object.fromEntries(Object.entries(ODF_GEOM).map(([k, v]) => [v, k]));
      return back[t] || (t.startsWith('ooxml-') ? t.slice(6) : 'rect');
    }
    function box(el) {
      let x = len(attr(el, 'x')), y = len(attr(el, 'y')), w = len(attr(el, 'width')), h = len(attr(el, 'height')), rot = 0;
      const tr = attr(el, 'transform');
      if (tr) {
        const r = /rotate\s*\(\s*(-?[\d.e-]+)\s*\)/.exec(tr), t = /translate\s*\(\s*(-?[\d.]+\w*)\s*[ ,]\s*(-?[\d.]+\w*)\s*\)/.exec(tr);
        const a = -(r ? +r[1] : 0);                    // clockwise
        if (t) { const tx = len(t[1]), ty = len(t[2]); const cx = tx + (w / 2 * Math.cos(a) - h / 2 * Math.sin(a)), cy = ty + (w / 2 * Math.sin(a) + h / 2 * Math.cos(a)); x = Math.round(cx - w / 2); y = Math.round(cy - h / 2); }
        rot = Math.round(a * 180 / Math.PI * 100) / 100;
      }
      return { x, y, w, h, rot: rot ? ((rot % 360) + 360) % 360 : 0 };
    }
    function graphicProps(st, pres) {
      const g = k => prop(st, k) ?? prop(pres, k);
      const fill = g('fill') === 'solid' || (g('fill') == null && g('fill-color')) ? hex(g('fill-color')) : null;
      const line = g('stroke') && g('stroke') !== 'none' ? { color: hex(g('stroke-color')) || '000000', w: len(g('stroke-width')) || 12700 } : null;
      return { fill, line, anchor: { top: 't', middle: 'ctr', bottom: 'b' }[g('textarea-vertical-align')] || 't' };
    }
    async function items(page) {
      const out = [];
      const walk = async node => {
        for (const el of node.children) {
          const n = el.localName, st = attr(el, 'style-name'), pres = attr(el, 'presentation:style-name') || (() => { for (const a of el.attributes) if (a.localName === 'style-name' && a.namespaceURI && a.namespaceURI.includes('presentation')) return a.value; return null; })();
          if (n === 'g') { await walk(el); continue; }
          if (n === 'frame') {
            const b = box(el), img = kid(el, 'image'), tb = kid(el, 'text-box'), tbl = kid(el, 'table');
            if (img) {
              const href = attr(img, 'href'), bin = kid(img, 'binary-data');
              const data = bin ? unb64(bin.textContent) : href ? await getPic(href) : null;
              if (data) out.push(Object.assign(b, { kind: 'image', img: { data, ext: ((href || '').split('.').pop() || 'png').toLowerCase().replace('jpeg', 'jpg') } }));
              continue;
            }
            if (tb) { const gp = graphicProps(st, pres); out.push(Object.assign(b, gp, { kind: gp.fill || gp.line ? 'shape' : 'text', geom: 'rect', paras: parasOf(tb, pres) })); continue; }
            if (tbl) {
              const cols = []; for (const c of kids(tbl, 'table-column')) { const rep = +attr(c, 'number-columns-repeated') || 1; for (let i = 0; i < rep; i++) cols.push(len(prop(attr(c, 'style-name'), 'column-width')) || Math.round(b.w / 3)); }
              const rows = kids(tbl, 'table-row').map(r => ({ h: len(prop(attr(r, 'style-name'), 'row-height')) || 370840, cells: Array.from(r.children).filter(c => /table-cell$/.test(c.localName)).map(c => ({ paras: parasOf(c, null), fill: c.localName === 'covered-table-cell' ? null : hex(prop(attr(c, 'style-name'), 'fill-color')), span: +attr(c, 'number-columns-spanned') || 1, merged: c.localName === 'covered-table-cell' })) }));
              if (!cols.length && rows[0]) rows[0].cells.forEach(() => cols.push(Math.round(b.w / rows[0].cells.length)));
              out.push(Object.assign(b, { kind: 'table', cols, rows })); continue;
            }
            continue;
          }
          if (n === 'custom-shape' || n === 'rect' || n === 'ellipse' || n === 'circle') {
            const b = box(el), eg = kid(el, 'enhanced-geometry');
            out.push(Object.assign(b, graphicProps(st, pres), { kind: 'shape', geom: geomOf(el), flipH: attr(eg, 'mirror-horizontal') === 'true', flipV: attr(eg, 'mirror-vertical') === 'true', paras: parasOf(el, pres) }));
            continue;
          }
          if (n === 'line' || n === 'connector') {
            const x1 = len(attr(el, 'x1')), y1 = len(attr(el, 'y1')), x2 = len(attr(el, 'x2')), y2 = len(attr(el, 'y2'));
            const gp = graphicProps(st, pres);
            out.push({ kind: 'line', x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH: x2 < x1, flipV: y2 < y1, rot: 0, line: gp.line || { color: '000000', w: 12700 } });
          }
        }
      };
      await walk(page);
      return out;
    }
    const model = { w: W, h: H, slides: [] };
    for (const page of contentDoc.getElementsByTagNameNS('*', 'page')) {
      if (page.parentElement && !/^(presentation|drawing)$/.test(page.parentElement.localName)) continue;
      model.slides.push({ bg: hex(prop(attr(page, 'style-name'), 'fill-color')) || masterBg[attr(page, 'master-page-name')] || 'FFFFFF', items: await items(page) });
    }
    return model;
  }

  /* =================================================================== model → PPTX */
  function writePptx(model) {
    const files = {}, ct = [], media = [];
    const rPr = r => `<a:rPr lang="${OW.lang || 'de'}" sz="${Math.round((r.sz || 18) * 100)}"${r.b ? ' b="1"' : ''}${r.i ? ' i="1"' : ''}${r.u ? ' u="sng"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${r.color || '000000'}"/></a:solidFill>${r.font ? `<a:latin typeface="${xesc(r.font)}"/><a:cs typeface="${xesc(r.font)}"/>` : ''}</a:rPr>`;
    const paras = ps => (ps && ps.length ? ps : [{ runs: [] }]).map(p => {
      const bu = p.bullet ? (p.bullet.num ? `<a:buFont typeface="+mj-lt"/><a:buAutoNum type="${p.bullet.num}"/>` : `<a:buFont typeface="Arial"/><a:buChar char="${xesc(p.bullet.char || '•')}"/>`) : '<a:buNone/>';
      const ind = p.bullet ? ` marL="${342900 + (p.level || 0) * 457200}" indent="-342900"` : (p.level ? ` marL="${p.level * 457200}"` : '');
      const runs = (p.runs || []).map(r => r.t === '\n' ? '<a:br/>' : `<a:r>${rPr(r)}<a:t>${xesc(r.t)}</a:t></a:r>`).join('');
      return `<a:p><a:pPr algn="${p.align || 'l'}" lvl="${p.level || 0}"${ind}>${bu}</a:pPr>${runs}<a:endParaRPr lang="${OW.lang || 'de'}" sz="${Math.round((p.sz || 18) * 100)}"/></a:p>`;
    }).join('');
    const xfrm = it => `<a:xfrm${it.rot ? ` rot="${Math.round(it.rot * 60000)}"` : ''}${it.flipH ? ' flipH="1"' : ''}${it.flipV ? ' flipV="1"' : ''}><a:off x="${Math.round(it.x)}" y="${Math.round(it.y)}"/><a:ext cx="${Math.max(0, Math.round(it.w))}" cy="${Math.max(0, Math.round(it.h))}"/></a:xfrm>`;
    const fillX = c => c ? `<a:solidFill><a:srgbClr val="${c}"/></a:solidFill>` : '<a:noFill/>';
    const lineX = l => l ? `<a:ln w="${Math.round(l.w || 12700)}"><a:solidFill><a:srgbClr val="${l.color || '000000'}"/></a:solidFill></a:ln>` : '<a:ln><a:noFill/></a:ln>';
    model.slides.forEach((s, i) => {
      const n = i + 1; let id = 2, rels = '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>', rid = 1, tree = '';
      for (const it of s.items) {
        if (it.kind === 'image') {
          const ext = it.img.ext === 'jpeg' ? 'jpg' : it.img.ext, name = `image${media.length + 1}.${ext}`; media.push(ext); files['ppt/media/' + name] = it.img.data;
          rels += `<Relationship Id="rId${++rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${name}"/>`;
          tree += `<p:pic><p:nvPicPr><p:cNvPr id="${id++}" name="Picture ${id}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(it)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
        } else if (it.kind === 'line') {
          tree += `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id++}" name="Line ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${xfrm(it)}<a:prstGeom prst="line"><a:avLst/></a:prstGeom>${lineX(it.line)}</p:spPr></p:cxnSp>`;
        } else if (it.kind === 'table') {
          const grid = it.cols.map(w => `<a:gridCol w="${Math.round(w)}"/>`).join('');
          const rows = it.rows.map(r => `<a:tr h="${Math.round(r.h)}">${r.cells.map(c => `<a:tc${c.span > 1 ? ` gridSpan="${c.span}"` : ''}${c.merged ? ' hMerge="1"' : ''}><a:txBody><a:bodyPr/><a:lstStyle/>${paras(c.paras)}</a:txBody><a:tcPr>${['lnL', 'lnR', 'lnT', 'lnB'].map(k => `<a:${k} w="12700"><a:solidFill><a:srgbClr val="808080"/></a:solidFill></a:${k}>`).join('')}${c.fill ? fillX(c.fill) : ''}</a:tcPr></a:tc>`).join('')}</a:tr>`).join('');
          tree += `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id++}" name="Table ${id}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${Math.round(it.x)}" y="${Math.round(it.y)}"/><a:ext cx="${Math.round(it.w)}" cy="${Math.round(it.h)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid>${grid}</a:tblGrid>${rows}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
        } else {
          const ins = it.inset || [91440, 45720, 91440, 45720];
          tree += `<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="${it.kind === 'text' ? 'TextBox' : 'Shape'} ${id}"/><p:cNvSpPr${it.kind === 'text' ? ' txBox="1"' : ''}/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(it)}<a:prstGeom prst="${it.geom || 'rect'}"><a:avLst/></a:prstGeom>${fillX(it.fill)}${lineX(it.line)}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="${ins[0]}" tIns="${ins[1]}" rIns="${ins[2]}" bIns="${ins[3]}" anchor="${it.anchor || 't'}"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paras(it.paras)}</p:txBody></p:sp>`;
        }
      }
      files[`ppt/slides/slide${n}.xml`] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${s.bg || 'FFFFFF'}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${tree}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
      files[`ppt/slides/_rels/slide${n}.xml.rels`] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
      ct.push(`<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`);
    });
    const NSP = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
    const emptyTree = '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree>';
    const lvl = k => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<a:lvl${i}pPr marL="${k ? (i - 1) * 457200 : 0}" algn="l"><a:defRPr sz="${k === 'title' ? 4400 : 1800}" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+${k === 'title' ? 'mj' : 'mn'}-lt"/></a:defRPr></a:lvl${i}pPr>`).join('');
    files['ppt/slideMasters/slideMaster1.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${NSP}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>${emptyTree}</p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle>${lvl('title')}</p:titleStyle><p:bodyStyle>${lvl('body')}</p:bodyStyle><p:otherStyle>${lvl('')}</p:otherStyle></p:txStyles></p:sldMaster>`;
    files['ppt/slideMasters/_rels/slideMaster1.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>';
    files['ppt/slideLayouts/slideLayout1.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NSP} type="blank" preserve="1"><p:cSld name="Blank">${emptyTree}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
    files['ppt/slideLayouts/_rels/slideLayout1.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>';
    const clr = (n, v) => `<a:${n}><a:srgbClr val="${v}"/></a:${n}>`;
    files['ppt/theme/theme1.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Werkstatt"><a:themeElements><a:clrScheme name="Office Werkstatt">${clr('dk1', '000000')}${clr('lt1', 'FFFFFF')}${clr('dk2', '44546A')}${clr('lt2', 'E7E6E6')}${clr('accent1', '4472C4')}${clr('accent2', 'ED7D31')}${clr('accent3', 'A5A5A5')}${clr('accent4', 'FFC000')}${clr('accent5', '5B9BD5')}${clr('accent6', '70AD47')}${clr('hlink', '0563C1')}${clr('folHlink', '954F72')}</a:clrScheme><a:fontScheme name="Office Werkstatt"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
    const sldIds = model.slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join('');
    files['ppt/presentation.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NSP} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${sldIds}</p:sldIdLst><p:sldSz cx="${Math.round(model.w)}" cy="${Math.round(model.h)}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;
    files['ppt/_rels/presentation.xml.rels'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>${model.slides.map((_, i) => `<Relationship Id="rId${i + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}</Relationships>`;
    files['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>';
    const exts = [...new Set(media)];
    files['[Content_Types].xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${exts.map(e => `<Default Extension="${e}" ContentType="${extMime(e)}"/>`).join('')}<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${ct.join('')}</Types>`;
    // [Content_Types].xml first, like Office does
    const ordered = { '[Content_Types].xml': files['[Content_Types].xml'] }; for (const k of Object.keys(files)) if (k !== '[Content_Types].xml') ordered[k] = files[k];
    return new Blob([OW.ooxml.writeZip(ordered)], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  }

  OW.odf = {
    KINDS: ['odp', 'otp', 'fodp', 'odg'],
    readPptx, writeODF, readODF, writePptx,
    async fromPptx(ab, kind) { return writeODF(await readPptx(ab), kind); },
    async toPptx(ab) { return writePptx(await readODF(ab)); },
  };
})();
