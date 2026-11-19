/* Office Werkstatt – read old PowerPoint 97-2003 files (.ppt).
 * Slide Werkzeug Pro reads .pptx only, so a .ppt is converted on import: the slide texts (titles, bodies,
 * text boxes) are taken from the binary file and written into a new .pptx. Layout, pictures and
 * animations of the old file are not carried over.
 *   OW.pptSlides(arrayBuffer) → [{ title, body: [lines] }]
 *   OW.pptToPptx(arrayBuffer) → Blob (.pptx) */
window.OW = window.OW || {};
(function () {
  /* ---------- Compound File Binary (OLE2) reader ---------- */
  function cfbStream(buf, wanted) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    const sig = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
    if (u8.length < 512 || sig.some((b, i) => u8[i] !== b)) throw new Error('not a PowerPoint 97-2003 file');
    const ss = 1 << dv.getUint16(0x1E, true), mss = 1 << dv.getUint16(0x20, true);
    const nFat = dv.getUint32(0x2C, true), dirStart = dv.getUint32(0x30, true), cutoff = dv.getUint32(0x38, true);
    const miniFatStart = dv.getUint32(0x3C, true), difatStart = dv.getUint32(0x44, true), nDifat = dv.getUint32(0x48, true);
    const off = s => (s + 1) * ss;
    const fatSectors = [];
    for (let i = 0; i < 109 && fatSectors.length < nFat; i++) fatSectors.push(dv.getUint32(0x4C + i * 4, true));
    for (let d = difatStart, k = 0; k < nDifat && d < 0xFFFFFFFA; k++) {
      for (let i = 0; i < ss / 4 - 1 && fatSectors.length < nFat; i++) fatSectors.push(dv.getUint32(off(d) + i * 4, true));
      d = dv.getUint32(off(d) + ss - 4, true);
    }
    const fat = []; for (const s of fatSectors) for (let i = 0; i < ss / 4; i++) fat.push(off(s) + i * 4 + 4 <= u8.length ? dv.getUint32(off(s) + i * 4, true) : 0xFFFFFFFE);
    const chain = (start, table) => { const out = []; for (let s = start, guard = 0; s < 0xFFFFFFFA && guard < 1e6; guard++) { out.push(s); s = table[s]; if (s === undefined) break; } return out; };
    const readChain = (start, size) => { const parts = chain(start, fat); const out = new Uint8Array(parts.length * ss); parts.forEach((s, i) => out.set(u8.subarray(off(s), off(s) + ss), i * ss)); return size != null ? out.subarray(0, size) : out; };
    const dir = readChain(dirStart), ddv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
    const entries = [];
    for (let p = 0; p + 128 <= dir.length; p += 128) {
      const nl = ddv.getUint16(p + 0x40, true); let name = '';
      for (let i = 0; i < Math.max(0, nl / 2 - 1); i++) name += String.fromCharCode(ddv.getUint16(p + i * 2, true));
      entries.push({ name, type: dir[p + 0x42], start: ddv.getUint32(p + 0x74, true), size: ddv.getUint32(p + 0x78, true) });
    }
    const e = entries.find(x => x.type === 2 && x.name === wanted);
    if (!e) throw new Error('no "' + wanted + '" stream');
    if (e.size >= cutoff) return readChain(e.start, e.size);
    const root = entries[0], mini = readChain(root.start, root.size);
    const miniFat = []; { const mf = readChain(miniFatStart), mdv = new DataView(mf.buffer, mf.byteOffset, mf.byteLength); for (let i = 0; i + 4 <= mf.length; i += 4) miniFat.push(mdv.getUint32(i, true)); }
    const parts = chain(e.start, miniFat), out = new Uint8Array(parts.length * mss);
    parts.forEach((s, i) => out.set(mini.subarray(s * mss, s * mss + mss), i * mss));
    return out.subarray(0, e.size);
  }

  /* ---------- PowerPoint binary records ---------- */
  const RT = { SlideContainer: 0x03EE, SlideListWithText: 0x0FF0, SlidePersistAtom: 0x03F3, TextHeaderAtom: 0x0F9F, TextCharsAtom: 0x0FA0, TextBytesAtom: 0x0FA8, MainMaster: 0x03F8, Notes: 0x03F0 };
  OW.pptSlides = function (buf) {
    const s = cfbStream(buf, 'PowerPoint Document'), dv = new DataView(s.buffer, s.byteOffset, s.byteLength);
    const listSlides = [], drawnSlides = [];
    let curList = null, curDrawn = null, lastType = 1;
    const dec16 = (p, n) => { let t = ''; for (let i = 0; i + 1 < n; i += 2) t += String.fromCharCode(dv.getUint16(p + i, true)); return t; };
    const dec8 = (p, n) => { let t = ''; for (let i = 0; i < n; i++) t += String.fromCharCode(s[p + i]); return t; };
    function text(t, into) { if (!into) return; t = t.replace(/\u000b/g, '\n').replace(/\r/g, '\n').replace(/[\u0000-\u0008\u000e-\u001f]/g, ''); if (t.trim() && t.trim() !== '*') into.push({ type: lastType, text: t }); }
    function walk(p, end, ctx) {
      while (p + 8 <= end) {
        const vi = dv.getUint16(p, true), type = dv.getUint16(p + 2, true), len = dv.getUint32(p + 4, true), body = p + 8;
        if (len > end - body) break;
        const container = (vi & 0x0F) === 0x0F, inst = vi >> 4;
        if (container) {
          if (type === RT.SlideListWithText) { const c = { list: inst === 0 }; walk(body, body + len, c); curList = null; }
          else if (type === RT.SlideContainer) { curDrawn = []; drawnSlides.push(curDrawn); walk(body, body + len, Object.assign({}, ctx, { drawn: true })); curDrawn = null; }
          else if (type === RT.MainMaster || type === RT.Notes) { /* skip masters and notes */ }
          else walk(body, body + len, ctx);
        } else if (ctx && ctx.list && type === RT.SlidePersistAtom) { curList = []; listSlides.push(curList); }
        else if (type === RT.TextHeaderAtom && len >= 4) lastType = dv.getUint32(body, true);
        else if (type === RT.TextCharsAtom) text(dec16(body, len), ctx && ctx.list ? curList : ctx && ctx.drawn ? curDrawn : null);
        else if (type === RT.TextBytesAtom) text(dec8(body, len), ctx && ctx.list ? curList : ctx && ctx.drawn ? curDrawn : null);
        p = body + len;
      }
    }
    walk(0, s.length, {});
    const n = Math.max(listSlides.length, drawnSlides.length), slides = [];
    for (let i = 0; i < n; i++) {
      const items = (listSlides[i] || []).slice();
      for (const d of drawnSlides[i] || []) if (!items.some(x => x.text === d.text)) items.push(d);
      const titleIdx = items.findIndex(x => x.type === 0 || x.type === 6);
      const title = titleIdx >= 0 ? items.splice(titleIdx, 1)[0].text : (items.length ? items.shift().text : '');
      slides.push({ title: title.trim(), body: items.flatMap(x => x.text.split('\n')).map(l => l.trim()).filter(Boolean) });
    }
    return slides;
  };
  OW.pptToPptx = function (buf) {
    const slides = OW.pptSlides(buf);
    if (!slides.length) throw new Error('no slides found');
    const E = OW.escape;
    const deck = { theme: 'office', slides: slides.map((sl, i) => ({ els: [
      { id: 't' + i, type: 'text', x: 60, y: sl.body.length ? 40 : 200, w: 840, h: 100, html: E(sl.title || ''), style: { fontSize: sl.body.length ? 36 : 44, align: sl.body.length ? 'left' : 'center' } },
      ...(sl.body.length ? [{ id: 'b' + i, type: 'text', x: 60, y: 160, w: 840, h: 340, html: sl.body.length > 1 ? `<ul>${sl.body.map(l => `<li>${E(l)}</li>`).join('')}</ul>` : `<p>${E(sl.body[0])}</p>`, style: { fontSize: 22 } }] : []),
    ] })) };
    return OW.ooxml.slidesToPptx(deck, OW.SLIDE_THEMES);
  };
})();
