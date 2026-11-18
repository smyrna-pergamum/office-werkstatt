/* Office Werkstatt – tiny offline OOXML engine (no dependencies)
 * Reads .docx/.xlsx/.pptx (text level) and writes .docx/.xlsx.
 * Uses the browser's built-in DecompressionStream, so it works without internet. */
window.OW = window.OW || {};
(function () {
  const td = new TextDecoder(), te = new TextEncoder();

  async function inflateRaw(u8) {
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([u8]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function readZip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Not a zip file');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let n = 0; n < count; n++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nlen));
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      files[name] = { method, data: u8.subarray(start, start + csize) };
      p += 46 + nlen + xlen + clen;
    }
    return {
      names: Object.keys(files),
      async text(name) {
        const f = files[name]; if (!f) return null;
        return td.decode(f.method === 0 ? f.data : await inflateRaw(f.data));
      },
    };
  }

  /* CRC32 + stored ZIP writer */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function writeZip(entries) { // entries: {name: string content}
    const parts = [], central = []; let offset = 0;
    for (const [name, content] of Object.entries(entries)) {
      const nb = te.encode(name), data = content instanceof Uint8Array ? content : te.encode(content), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), nb);
      offset += 30 + nb.length + data.length;
    }
    const csize = central.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, central.length / 2, true); e.setUint16(10, central.length / 2, true);
    e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)]);
  }

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const parseXML = s => new DOMParser().parseFromString(s, 'application/xml');
  const byTag = (el, tag) => Array.from(el.getElementsByTagName(tag));

  /* ---------- Import ---------- */
  async function docxToHtml(buf) {
    const z = await readZip(buf);
    const doc = parseXML(await z.text('word/document.xml'));
    let html = '';
    for (const p of byTag(doc, 'w:p')) {
      const style = (p.getElementsByTagName('w:pStyle')[0] || { getAttribute: () => '' }).getAttribute('w:val') || '';
      let inner = '';
      for (const r of byTag(p, 'w:r')) {
        let t = byTag(r, 'w:t').map(x => esc(x.textContent)).join('');
        if (byTag(r, 'w:br').length) t += '<br>';
        if (!t) continue;
        if (r.getElementsByTagName('w:b').length) t = `<b>${t}</b>`;
        if (r.getElementsByTagName('w:i').length) t = `<i>${t}</i>`;
        if (r.getElementsByTagName('w:u').length) t = `<u>${t}</u>`;
        inner += t;
      }
      const m = /Heading(\d)|berschrift(\d)|Title/i.exec(style);
      const tag = m ? (m[1] || m[2] ? 'h' + Math.min(3, +(m[1] || m[2])) : 'h1') : 'p';
      html += `<${tag}>${inner || '<br>'}</${tag}>`;
    }
    return html;
  }
  async function xlsxToCells(buf) {
    const z = await readZip(buf);
    const ss = await z.text('xl/sharedStrings.xml');
    const strings = ss ? byTag(parseXML(ss), 'si').map(si => byTag(si, 't').map(t => t.textContent).join('')) : [];
    const sheet = parseXML(await z.text('xl/worksheets/sheet1.xml'));
    const cells = {};
    for (const c of byTag(sheet, 'c')) {
      const ref = c.getAttribute('r'), t = c.getAttribute('t');
      const f = c.getElementsByTagName('f')[0], v = c.getElementsByTagName('v')[0];
      let val = v ? v.textContent : '';
      if (t === 's') val = strings[+val] || '';
      if (t === 'inlineStr') val = byTag(c, 't').map(x => x.textContent).join('');
      if (f && f.textContent) val = '=' + f.textContent;
      if (val !== '') cells[ref] = { v: val };
    }
    return cells;
  }
  async function pptxToSlides(buf) {
    const z = await readZip(buf);
    const names = z.names.filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
    const slides = [];
    for (const n of names) {
      const x = parseXML(await z.text(n));
      const paras = byTag(x, 'a:p').map(p => byTag(p, 'a:t').map(t => t.textContent).join('')).filter(Boolean);
      slides.push({ title: paras[0] || '', body: paras.slice(1).join('\n'), layout: 'title-content', bg: '' });
    }
    return slides;
  }

  /* ---------- Export ---------- */
  function htmlToDocx(html) {
    const root = document.createElement('div'); root.innerHTML = html;
    const runs = (node, fmt = {}) => {
      let out = '';
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          if (!n.textContent) return;
          const rp = (fmt.b ? '<w:b/>' : '') + (fmt.i ? '<w:i/>' : '') + (fmt.u ? '<w:u w:val="single"/>' : '') + (fmt.s ? '<w:strike/>' : '');
          out += `<w:r>${rp ? '<w:rPr>' + rp + '</w:rPr>' : ''}<w:t xml:space="preserve">${esc(n.textContent)}</w:t></w:r>`;
        } else if (n.nodeType === 1) {
          const t = n.tagName;
          if (t === 'BR') { out += '<w:r><w:br/></w:r>'; return; }
          const f = Object.assign({}, fmt);
          if (t === 'B' || t === 'STRONG') f.b = 1; if (t === 'I' || t === 'EM') f.i = 1; if (t === 'U') f.u = 1; if (t === 'S' || t === 'STRIKE') f.s = 1;
          const st = n.style || {}; if (st.fontWeight === 'bold' || +st.fontWeight >= 600) f.b = 1; if (st.fontStyle === 'italic') f.i = 1;
          const td = (st.textDecoration || '') + ' ' + (st.textDecorationLine || ''); if (td.includes('underline')) f.u = 1; if (td.includes('line-through')) f.s = 1;
          out += runs(n, f);
        }
      });
      return out;
    };
    let body = '';
    const block = (el) => {
      const t = el.tagName;
      if (t === 'UL' || t === 'OL') { Array.from(el.children).forEach((li, i) => { body += `<w:p><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:r><w:t xml:space="preserve">${t === 'OL' ? (i + 1) + '. ' : '• '}</w:t></w:r>${runs(li)}</w:p>`; }); return; }
      if (t === 'TABLE') {
        body += '<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>';
        el.querySelectorAll('tr').forEach(tr => { body += '<w:tr>'; tr.querySelectorAll('td,th').forEach(td => body += `<w:tc><w:p>${runs(td)}</w:p></w:tc>`); body += '</w:tr>'; });
        body += '</w:tbl>'; return;
      }
      const h = /^H([1-6])$/.exec(t);
      const align = el.style && el.style.textAlign ? `<w:jc w:val="${{ center: 'center', right: 'right', justify: 'both' }[el.style.textAlign] || 'left'}"/>` : '';
      const ppr = (h ? `<w:pStyle w:val="Heading${Math.min(3, +h[1])}"/>` : '') + align;
      body += `<w:p>${ppr ? '<w:pPr>' + ppr + '</w:pPr>' : ''}${runs(el)}</w:p>`;
    };
    Array.from(root.childNodes).forEach(n => { if (n.nodeType === 1) block(n); else if (n.textContent.trim()) { const p = document.createElement('p'); p.textContent = n.textContent; block(p); } });
    const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    const heading = (n, sz) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${sz}"/></w:rPr></w:style>`;
    return writeZip({
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      'word/_rels/document.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'word/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120"/></w:pPr></w:style>${heading(1, 36)}${heading(2, 30)}${heading(3, 26)}</w:styles>`,
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1134" w:left="1417"/></w:sectPr></w:body></w:document>`,
    });
  }
  function sheetXml(cells) {
    const rows = {};
    for (const [ref, c] of Object.entries(cells || {})) {
      const m = /^([A-Z]+)(\d+)$/.exec(ref); if (!m || !c || c.v === '' || c.v == null) continue;
      (rows[m[2]] = rows[m[2]] || []).push([ref, c]);
    }
    const colNum = s => s.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
    let sd = '';
    Object.keys(rows).map(Number).sort((a, b) => a - b).forEach(r => {
      sd += `<row r="${r}">`;
      rows[r].sort((a, b) => colNum(a[0].replace(/\d/g, '')) - colNum(b[0].replace(/\d/g, ''))).forEach(([ref, c]) => {
        const v = String(c.v);
        if (v.startsWith('=')) sd += `<c r="${ref}"><f>${esc(v.slice(1))}</f></c>`;
        else if (v.trim() !== '' && !isNaN(+v)) sd += `<c r="${ref}"><v>${+v}</v></c>`;
        else sd += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
      });
      sd += '</row>';
    });
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sd}</sheetData></worksheet>`;
  }
  /* all sheets of a workbook; includes a minimal styles part (required by strict readers) */
  function sheetsToXlsx(sheets) {
    sheets = (sheets && sheets.length ? sheets : [{ name: 'Sheet1', cells: {} }]);
    const used = new Set();
    const names = sheets.map((sh, i) => { let n = String(sh.name || 'Sheet' + (i + 1)).replace(/[\/?*[\]:]/g, '_').slice(0, 31) || 'Sheet' + (i + 1); while (used.has(n.toLowerCase())) n = (n.slice(0, 28) + '_' + i); used.add(n.toLowerCase()); return n; });
    const files = {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
      'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    };
    sheets.forEach((sh, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(sh.cells); });
    return writeZip(files);
  }
  function cellsToXlsx(cells, sheetName = 'Sheet1') { return sheetsToXlsx([{ name: sheetName, cells }]); }

  /* ---------- PPTX writer (slides from Slide Werkzeug) ---------- */
  function slidesToPptx(deck, themes) {
    const EMU = 12700, W = 960, H = 540; // 1px = 12700 EMU → 12192000 × 6858000 (16:9)
    const hex = c => { if (!c) return null; const m = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(c); if (!m) { const r = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); return r ? [r[1], r[2], r[3]].map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase() : null; } let h = m[1]; if (h.length === 3) h = h.split('').map(x => x + x).join(''); return h.toUpperCase(); };
    const th = themes[deck.theme] || themes.office;
    const ink = hex(th.ink) || '1F2430', accent = hex(th.accent) || 'EA6A2A';
    const files = {}, media = [];
    const sldIds = [], presRels = [], ctSlides = [];
    const paraXml = (html, st) => {
      const box = document.createElement('div'); box.innerHTML = html || '';
      const sz = Math.round((st.fontSize || 24) * 100); // slide px = pt (1px = 12700 EMU)
      const col = hex(st.color) || ink;
      const algn = { center: 'ctr', right: 'r' }[st.align] || 'l';
      const runs = (node, f = {}) => { let o = ''; node.childNodes.forEach(n => {
        if (n.nodeType === 3) { if (!n.textContent) return; o += `<a:r><a:rPr lang="de-DE" sz="${sz}" ${f.b ? 'b="1"' : ''} ${f.i ? 'i="1"' : ''} ${f.u ? 'u="sng"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${f.c || col}"/></a:solidFill>${st.font ? `<a:latin typeface="${esc(st.font.split(',')[0].replace(/["']/g, ''))}"/>` : ''}</a:rPr><a:t>${esc(n.textContent)}</a:t></a:r>`; return; }
        if (n.nodeType !== 1 || /^(UL|OL|LI|P|DIV|H\d|TABLE)$/.test(n.tagName)) return;
        const g = Object.assign({}, f), t = n.tagName, s2 = n.style || {};
        if (t === 'B' || t === 'STRONG' || s2.fontWeight === 'bold' || +s2.fontWeight >= 600) g.b = 1; if (t === 'I' || t === 'EM' || s2.fontStyle === 'italic') g.i = 1; if (t === 'U' || (s2.textDecoration || '').includes('underline')) g.u = 1;
        if (s2.color) g.c = hex(s2.color) || g.c; if (t === 'FONT' && n.color) g.c = hex(n.color) || g.c;
        if (t === 'BR') { o += '<a:br/>'; return; }
        o += runs(n, g); }); return o; };
      const paras = [];
      const walk = node => node.childNodes.forEach(n => {
        if (n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL')) { Array.from(n.children).forEach((li, i) => paras.push(`<a:p><a:pPr marL="342900" indent="-342900" algn="${algn}">${n.tagName === 'OL' ? '<a:buFont typeface="+mj-lt"/><a:buAutoNum type="arabicPeriod"/>' : '<a:buFont typeface="Arial"/><a:buChar char="•"/>'}</a:pPr>${runs(li) || `<a:endParaRPr lang="de-DE" sz="${sz}"/>`}</a:p>`)); return; }
        if (n.nodeType === 1 && n.tagName === 'TABLE') { n.querySelectorAll('tr').forEach(tr => paras.push(`<a:p><a:pPr algn="${algn}"/><a:r><a:rPr lang="de-DE" sz="${sz}"><a:solidFill><a:srgbClr val="${col}"/></a:solidFill></a:rPr><a:t>${esc(Array.from(tr.children).map(c => c.textContent).join('    '))}</a:t></a:r></a:p>`)); return; }
        if (n.nodeType === 1 && /^(P|DIV|H\d)$/.test(n.tagName)) { walk(n); if (!n.querySelector('ul,ol,p,div')) paras.push(`<a:p><a:pPr algn="${algn}"/>${runs(n)}</a:p>`); return; }
      });
      walk(box);
      const inline = runs(box);
      if (inline) paras.unshift(`<a:p><a:pPr algn="${algn}"/>${inline}</a:p>`);
      return paras.join('') || `<a:p><a:endParaRPr lang="de-DE" sz="${sz}"/></a:p>`;
    };
    const geom = { rect: 'roundRect', ellipse: 'ellipse', triangle: 'triangle', arrow: 'rightArrow', star: 'star5' };
    deck.slides.forEach((sl, i) => {
      const n = i + 1; let id = 2, rels = '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>';
      const bgHex = hex(sl.bg) || hex(th.bg) || 'FFFFFF';
      let sp = '';
      if (th.deco === 'bar') sp += `<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="Deco"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${18 * EMU}" cy="${H * EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${accent}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
      (sl.els || []).forEach(e => {
        const st = e.style || {}, off = `<a:xfrm><a:off x="${Math.round(e.x * EMU)}" y="${Math.round(e.y * EMU)}"/><a:ext cx="${Math.round(e.w * EMU)}" cy="${Math.round(e.h * EMU)}"/></a:xfrm>`;
        if (e.type === 'image' && e.src) {
          const m = /^data:image\/(png|jpe?g|gif);base64,(.*)$/.exec(e.src); if (!m) return;
          const ext = m[1] === 'jpeg' ? 'jpg' : m[1], bin = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
          const name = `image${media.length + 1}.${ext}`; media.push(ext); files['ppt/media/' + name] = bin;
          const rid = 'rId' + (rels.match(/Relationship /g).length + 1);
          rels += `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${name}"/>`;
          sp += `<p:pic><p:nvPicPr><p:cNvPr id="${id++}" name="${name}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${off}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
          return;
        }
        if (e.type === 'shape') {
          const fill = st.fill === 'accent' || !st.fill ? accent : (hex(st.fill) || accent);
          const ln = st.stroke && st.stroke !== 'none' ? `<a:ln w="38100"><a:solidFill><a:srgbClr val="${hex(st.stroke)}"/></a:solidFill></a:ln>` : '<a:ln><a:noFill/></a:ln>';
          sp += `<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${off}<a:prstGeom prst="${geom[st.shape || 'rect']}"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>${ln}</p:spPr><p:txBody><a:bodyPr anchor="ctr" rtlCol="0"/><a:lstStyle/>${paraXml(e.html, Object.assign({ align: 'center', color: '#FFFFFF', fontSize: 22 }, st))}</p:txBody></p:sp>`;
          return;
        }
        const fill = st.fill ? `<a:solidFill><a:srgbClr val="${hex(st.fill) || 'FFFFFF'}"/></a:solidFill>` : '<a:noFill/>';
        sp += `<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${off}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="76200" tIns="50800" rIns="76200" bIns="50800" rtlCol="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paraXml(e.html, st)}</p:txBody></p:sp>`;
      });
      const transition = { fade: '<p:transition spd="med"><p:fade/></p:transition>', push: '<p:transition spd="med"><p:push dir="l"/></p:transition>', zoom: '<p:transition spd="med"><p:zoom/></p:transition>', flip: '<p:transition spd="med"><p:wipe dir="r"/></p:transition>' }[sl.transition] || '';
      files[`ppt/slides/slide${n}.xml`] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"${sl.hidden ? ' show="0"' : ''}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bgHex}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${sp}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>${transition}</p:sld>`;
      if (sl.notes) {
        rels += `<Relationship Id="rIdN" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${n}.xml"/>`;
        files[`ppt/notesSlides/notesSlide${n}.xml`] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${sl.notes.split('\n').map(l => `<a:p><a:r><a:rPr lang="de-DE"/><a:t>${esc(l)}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp></p:spTree></p:cSld></p:notes>`;
        files[`ppt/notesSlides/_rels/notesSlide${n}.xml.rels`] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="../notesMasters/notesMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${n}.xml"/></Relationships>`;
      }
      files[`ppt/slides/_rels/slide${n}.xml.rels`] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
      sldIds.push(`<p:sldId id="${255 + n}" r:id="rId${n + 10}"/>`);
      presRels.push(`<Relationship Id="rId${n + 10}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n}.xml"/>`);
      ctSlides.push(`<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>` + (sl.notes ? `<Override PartName="/ppt/notesSlides/notesSlide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>` : ''));
    });
    const hasNotes = deck.slides.some(s => s.notes);
    const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
    const font = (th.font || 'Aptos').split(',')[0].replace(/["']/g, '');
    const theme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Werkstatt"><a:themeElements><a:clrScheme name="OW"><a:dk1><a:srgbClr val="${ink}"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F2430"/></a:dk2><a:lt2><a:srgbClr val="F3F2F1"/></a:lt2><a:accent1><a:srgbClr val="${accent}"/></a:accent1><a:accent2><a:srgbClr val="2F6BEA"/></a:accent2><a:accent3><a:srgbClr val="1E9E5A"/></a:accent3><a:accent4><a:srgbClr val="7C4DDB"/></a:accent4><a:accent5><a:srgbClr val="E3A21A"/></a:accent5><a:accent6><a:srgbClr val="D93A32"/></a:accent6><a:hlink><a:srgbClr val="2F6BEA"/></a:hlink><a:folHlink><a:srgbClr val="7C4DDB"/></a:folHlink></a:clrScheme><a:fontScheme name="OW"><a:majorFont><a:latin typeface="${esc(font)}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${esc(font)}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="OW"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
    const spTreeEmpty = '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>';
    Object.assign(files, {
      '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${hasNotes ? '<Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/><Override PartName="/ppt/theme/theme2.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' : ''}${ctSlides.join('')}</Types>`,
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>',
      'ppt/presentation.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>${hasNotes ? '<p:notesMasterIdLst><p:notesMasterId r:id="rId3"/></p:notesMasterIdLst>' : ''}<p:sldIdLst>${sldIds.join('')}</p:sldIdLst><p:sldSz cx="${W * EMU}" cy="${H * EMU}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
      'ppt/_rels/presentation.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>${hasNotes ? '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="notesMasters/notesMaster1.xml"/>' : ''}${presRels.join('')}</Relationships>`,
      'ppt/slideMasters/slideMaster1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>${spTreeEmpty}</p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="2400"/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`,
      'ppt/slideMasters/_rels/slideMaster1.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>',
      'ppt/slideLayouts/slideLayout1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank">${spTreeEmpty}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
      'ppt/slideLayouts/_rels/slideLayout1.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>',
      'ppt/theme/theme1.xml': theme,
    });
    if (hasNotes) {
      files['ppt/theme/theme2.xml'] = theme;
      files['ppt/notesMasters/notesMaster1.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notesMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>${spTreeEmpty}</p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:notesMaster>`;
      files['ppt/notesMasters/_rels/notesMaster1.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme2.xml"/></Relationships>';
    }
    return writeZip(files);
  }

  OW.ooxml = { readZip, writeZip, docxToHtml, xlsxToCells, pptxToSlides, htmlToDocx, cellsToXlsx, sheetsToXlsx, slidesToPptx, esc };
})();
