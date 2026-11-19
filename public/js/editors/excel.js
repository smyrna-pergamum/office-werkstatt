/* Excel Werkzeug – spreadsheets with a formula engine (classic ribbon like Excel for the web) */
OW.editors.excel = async function (ctx) {
  const t = ctx.t, I = OW.icon;
  let COLS = 26, ROWS = 200; // the grid grows with the data (no fixed column/row limit)
  const colName = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const colIdx = s => s.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const raw = ctx.file.content && ctx.file.content.sheets ? ctx.file.content : { sheets: [{ name: t('excel.sheet') + '1', cells: (ctx.file.content && ctx.file.content.cells) || {} }], active: 0 };
  const book = raw; book.sheets.forEach(s => { s.cells = s.cells || {}; s.colW = s.colW || {}; s.charts = s.charts || []; });
  let sh = book.sheets[book.active || 0];
  let sel = { r: 0, c: 0, r2: 0, c2: 0 }, editing = null, showFormulas = false, zoom = 100, gridlines = true, freeze = false, filterOn = false;
  let gridEl, tableEl, fxInput, nameBox, wrapEl, sheetTabs;
  const undoStack = [], redoStack = [];

  /* ======== formula engine (safe parser, no eval) ======== */
  const FN = {
    SUM: a => flat(a).filter(isNum).reduce((x, y) => x + +y, 0),
    AVERAGE: a => { const n = flat(a).filter(isNum); if (!n.length) throw '#DIV/0!'; return n.reduce((x, y) => x + +y, 0) / n.length; },
    MIN: a => Math.min(...flat(a).filter(isNum).map(Number)), MAX: a => Math.max(...flat(a).filter(isNum).map(Number)),
    COUNT: a => flat(a).filter(isNum).length, COUNTA: a => flat(a).filter(v => v !== '' && v != null).length,
    PRODUCT: a => flat(a).filter(isNum).reduce((x, y) => x * y, 1),
    MEDIAN: a => { const n = flat(a).filter(isNum).map(Number).sort((x, y) => x - y); const m = n.length >> 1; return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2; },
    IF: a => (truthy(a[0]) ? a[1] : (a.length > 2 ? a[2] : false)),
    AND: a => flat(a).every(truthy), OR: a => flat(a).some(truthy), NOT: a => !truthy(a[0]),
    ROUND: a => { const p = Math.pow(10, +a[1] || 0); return Math.round(+a[0] * p) / p; },
    ABS: a => Math.abs(+a[0]), SQRT: a => Math.sqrt(+a[0]), POWER: a => Math.pow(+a[0], +a[1]), MOD: a => +a[0] % +a[1], INT: a => Math.floor(+a[0]),
    CONCAT: a => flat(a).join(''), LEN: a => String(a[0]).length, UPPER: a => String(a[0]).toUpperCase(), LOWER: a => String(a[0]).toLowerCase(),
    TODAY: () => new Date().toLocaleDateString(OW.lang), NOW: () => new Date().toLocaleString(OW.lang),
    SUMIF: a => { const rng = flat([a[0]]), sum = a.length > 2 ? flat([a[2]]) : rng; return rng.reduce((s, v, i) => s + (matchCrit(v, a[1]) && isNum(sum[i]) ? +sum[i] : 0), 0); },
    COUNTIF: a => flat([a[0]]).filter(v => matchCrit(v, a[1])).length,
  };
  // German / Turkish / Spanish / French aliases so users can type formulas in their own language
  Object.assign(FN, { SUMME: FN.SUM, MITTELWERT: FN.AVERAGE, ANZAHL: FN.COUNT, ANZAHL2: FN.COUNTA, WENN: FN.IF, RUNDEN: FN.ROUND, UND: FN.AND, ODER: FN.OR, NICHT: FN.NOT, HEUTE: FN.TODAY, JETZT: FN.NOW, SUMMEWENN: FN.SUMIF, ZÄHLENWENN: FN.COUNTIF,
    TOPLA: FN.SUM, ORTALAMA: FN.AVERAGE, EĞER: FN.IF, YUVARLA: FN.ROUND, BUGÜN: FN.TODAY, SAY: FN.COUNT,
    SUMA: FN.SUM, PROMEDIO: FN.AVERAGE, SI: FN.IF, REDONDEAR: FN.ROUND, HOY: FN.TODAY, CONTAR: FN.COUNT,
    SOMME: FN.SUM, MOYENNE: FN.AVERAGE, ARRONDI: FN.ROUND, AUJOURDHUI: FN.TODAY, NB: FN.COUNT });
  function matchCrit(v, c) { const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(String(c)); const op = m[1] || '=', x = m[2]; const a = isNum(v) && isNum(x) ? +v : String(v).toLowerCase(), b = isNum(v) && isNum(x) ? +x : x.toLowerCase(); return { '=': a == b, '<>': a != b, '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b }[op]; }
  const isNum = v => v !== '' && v !== null && v !== true && v !== false && !isNaN(+v);
  const truthy = v => v === true || (isNum(v) && +v !== 0) || (typeof v === 'string' && v.toUpperCase() === 'TRUE');
  const flat = a => a.flat(Infinity);

  function tokenize(s) {
    const out = []; let i = 0;
    const re = /\s*(?:(\d+(?:[.,]\d+)?(?:e[+-]?\d+)?%?)|("(?:[^"]|"")*")|(\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?(?![A-Za-z0-9_(]))|([A-ZÄÖÜİĞŞÇa-zäöüığşç][A-ZÄÖÜİĞŞÇa-zäöüığşç0-9.]*)(?=\s*\()|(<=|>=|<>|[-+*/^&=<>(),;:]))/y;
    while (i < s.length) {
      re.lastIndex = i; const m = re.exec(s);
      if (!m) { if (/\s/.test(s[i])) { i++; continue; } throw '#NAME?'; }
      i = re.lastIndex;
      if (m[1]) out.push({ k: 'n', v: m[1].endsWith('%') ? parseFloat(m[1].replace(',', '.')) / 100 : parseFloat(m[1].replace(',', '.')) });
      else if (m[2]) out.push({ k: 's', v: m[2].slice(1, -1).replace(/""/g, '"') });
      else if (m[3]) out.push({ k: 'r', v: m[3].replace(/\$/g, '') });
      else if (m[4]) out.push({ k: 'f', v: m[4].toUpperCase() });
      else out.push({ k: 'o', v: m[5] === ';' ? ',' : m[5] });
    }
    return out;
  }
  function evaluate(src, stack) {
    const tk = tokenize(src); let p = 0;
    const peek = () => tk[p], next = () => tk[p++];
    const expect = v => { const x = next(); if (!x || x.v !== v) throw '#ERROR!'; };
    function cmp() { let a = cat(); while (peek() && ['=', '<>', '<', '>', '<=', '>='].includes(peek().v)) { const o = next().v, b = cat(); a = { '=': a == b, '<>': a != b, '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b }[o]; } return a; }
    function cat() { let a = add(); while (peek() && peek().v === '&') { next(); a = String(a) + String(add()); } return a; }
    function add() { let a = mul(); while (peek() && (peek().v === '+' || peek().v === '-')) { const o = next().v, b = mul(); a = o === '+' ? num(a) + num(b) : num(a) - num(b); } return a; }
    function mul() { let a = pow(); while (peek() && (peek().v === '*' || peek().v === '/')) { const o = next().v, b = pow(); if (o === '/' && num(b) === 0) throw '#DIV/0!'; a = o === '*' ? num(a) * num(b) : num(a) / num(b); } return a; }
    function pow() { let a = unary(); while (peek() && peek().v === '^') { next(); a = Math.pow(num(a), num(unary())); } return a; }
    function unary() { if (peek() && peek().v === '-') { next(); return -num(unary()); } if (peek() && peek().v === '+') { next(); return num(unary()); } return prim(); }
    function prim() {
      const x = next(); if (!x) throw '#ERROR!';
      if (x.k === 'n' || x.k === 's') return x.v;
      if (x.k === 'r') { if (x.v.includes(':')) return range(x.v, stack); return cellValue(x.v, stack); }
      if (x.k === 'f') {
        expect('('); const args = [];
        if (peek() && peek().v !== ')') { do { args.push(cmp()); } while (peek() && peek().v === ',' && next()); }
        expect(')');
        const f = FN[x.v]; if (!f) throw '#NAME?';
        return f(args);
      }
      if (x.v === '(') { const v = cmp(); expect(')'); return v; }
      throw '#ERROR!';
    }
    const num = v => { if (v === '' || v == null) return 0; if (v === true) return 1; if (v === false) return 0; if (isNaN(+v)) throw '#VALUE!'; return +v; };
    const v = cmp(); if (p < tk.length) throw '#ERROR!'; return v;
  }
  function range(ref, stack) {
    const [a, b] = ref.split(':'); const ra = parseRef(a), rb = parseRef(b); const out = [];
    for (let r = Math.min(ra.r, rb.r); r <= Math.max(ra.r, rb.r); r++) { const row = []; for (let c = Math.min(ra.c, rb.c); c <= Math.max(ra.c, rb.c); c++) row.push(cellValue(colName(c) + (r + 1), stack)); out.push(row); }
    return out;
  }
  const parseRef = ref => { const m = /^([A-Z]{1,3})(\d+)$/.exec(ref); if (!m) throw '#REF!'; return { c: colIdx(m[1]), r: +m[2] - 1 }; };
  function cellValue(ref, stack = []) {
    const cell = sh.cells[ref]; if (!cell || cell.v === undefined || cell.v === '') return '';
    const v = String(cell.v);
    if (!v.startsWith('=')) return isNum(v) && !(cell.s && cell.s.text) ? +v : v;
    if (stack.includes(ref)) throw '#CIRC!';
    return evaluate(v.slice(1), stack.concat(ref));
  }
  function display(ref) {
    const cell = sh.cells[ref]; if (!cell || cell.v === undefined || cell.v === '') return '';
    if (showFormulas) return String(cell.v);
    let v; try { v = cellValue(ref); } catch (e) { return typeof e === 'string' ? e : '#ERROR!'; }
    if (v === true || v === false) return v ? 'TRUE' : 'FALSE';
    const s = cell.s || {};
    if (isNum(v) && v !== '') {
      const n = +(+v).toPrecision(12), frac = String(n).split('.')[1];
      const d = s.dec !== undefined ? s.dec : s.fmt === 'currency' ? 2 : s.fmt === 'percent' ? (frac && frac.length > 2 ? 1 : 0) : Math.min(6, frac ? frac.length : 0);
      const o = { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: !!s.group || s.fmt === 'currency' };
      if (s.fmt === 'currency') return n.toLocaleString(OW.lang, Object.assign(o, { style: 'currency', currency: 'EUR' }));
      if (s.fmt === 'percent') return (n * 100).toLocaleString(OW.lang, o) + ' %';
      if (s.fmt === 'date') { const dt = new Date(Math.round((n - 25569) * 864e5)); return isNaN(dt) ? String(n) : dt.toLocaleDateString(OW.lang); }
      return n.toLocaleString(OW.lang, o);
    }
    return String(v);
  }

  /* ======== grid rendering ======== */
  const ref = (r, c) => colName(c) + (r + 1);
  const range4 = () => ({ r1: Math.min(sel.r, sel.r2), r2: Math.max(sel.r, sel.r2), c1: Math.min(sel.c, sel.c2), c2: Math.max(sel.c, sel.c2) });
  const eachSel = fn => { const g = range4(); for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) fn(ref(r, c), r, c); };

  function buildGrid() {
    let mr = 0, mc = 0; Object.keys(sh.cells || {}).forEach(k => { const m = /^([A-Z]{1,3})(\d+)$/.exec(k); if (m) { mr = Math.max(mr, +m[2]); mc = Math.max(mc, colIdx(m[1]) + 1); } });
    ROWS = Math.max(200, mr + 50); COLS = Math.max(26, mc + 5);
    let html = '<table class="xl-grid"><thead><tr><th class="corner"></th>';
    for (let c = 0; c < COLS; c++) html += `<th class="ch" data-c="${c}" style="width:${sh.colW[c] || 92}px">${colName(c)}<span class="rs" data-c="${c}"></span></th>`;
    html += '</tr></thead><tbody>';
    for (let r = 0; r < ROWS; r++) { html += `<tr data-r="${r}"><th class="rh">${r + 1}</th>`; for (let c = 0; c < COLS; c++) html += `<td data-r="${r}" data-c="${c}"></td>`; html += '</tr>'; }
    tableEl.innerHTML = html + '</tbody></table>';
    paintAll();
  }
  function paintCell(td) {
    const r = +td.dataset.r, c = +td.dataset.c, k = ref(r, c), cell = sh.cells[k], s = (cell && cell.s) || {};
    const txt = display(k); td.textContent = txt;
    const st = td.style; st.fontWeight = s.b ? '700' : ''; st.fontStyle = s.i ? 'italic' : ''; st.textDecoration = [s.u ? 'underline' : '', s.st ? 'line-through' : ''].join(' ').trim();
    st.color = s.color || ''; st.background = s.bg || ''; st.fontFamily = s.font || ''; st.fontSize = s.size ? s.size + 'pt' : '';
    const numeric = txt !== '' && !isNaN(parseFloat(String(txt).replace(/[^\d.,-]/g, '').replace(',', '.'))) && /^[-\d.,\s€%]+$/.test(txt);
    st.textAlign = s.align || (numeric ? 'right' : ''); st.verticalAlign = s.valign || ''; st.whiteSpace = s.wrap ? 'normal' : '';
    td.classList.toggle('err', /^#/.test(txt)); td.classList.toggle('bordered', !!s.border);
    td.colSpan = s.span || 1; td.hidden = !!s.hiddenBy;
    td.classList.toggle('cf', !!s.cfHit);
  }
  function paintAll() {
    applyCF();
    tableEl.querySelectorAll('td').forEach(paintCell);
    tableEl.classList.toggle('nogrid', !gridlines); tableEl.classList.toggle('freeze', freeze);
    wrapEl.style.setProperty('--zoom', zoom / 100);
    paintSel(); drawCharts(); applyFilter();
  }
  function paintSel() {
    tableEl.querySelectorAll('.sel,.act').forEach(x => x.classList.remove('sel', 'act'));
    tableEl.querySelectorAll('th.hl').forEach(x => x.classList.remove('hl'));
    const g = range4();
    eachSel((k, r, c) => { const td = cellEl(r, c); if (td) td.classList.add('sel'); });
    const a = cellEl(sel.r, sel.c); if (a) { a.classList.add('act'); a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    for (let c = g.c1; c <= g.c2; c++) tableEl.querySelector(`th.ch[data-c="${c}"]`).classList.add('hl');
    for (let r = g.r1; r <= g.r2; r++) tableEl.querySelectorAll('tbody tr')[r].firstElementChild.classList.add('hl');
    nameBox.value = g.r1 === g.r2 && g.c1 === g.c2 ? ref(sel.r, sel.c) : ref(g.r1, g.c1) + ':' + ref(g.r2, g.c2);
    const cell = sh.cells[ref(sel.r, sel.c)]; if (document.activeElement !== fxInput) fxInput.value = cell ? cell.v : '';
    ctx.refresh();
  }
  const cellEl = (r, c) => tableEl.querySelector(`td[data-r="${r}"][data-c="${c}"]`);

  /* ======== mutations with undo ======== */
  function snapshot() { undoStack.push(JSON.stringify(sh)); if (undoStack.length > 80) undoStack.shift(); redoStack.length = 0; }
  function restore(json) { const o = JSON.parse(json); Object.keys(sh).forEach(k => delete sh[k]); Object.assign(sh, o); buildGrid(); ctx.markDirty(); }
  function setVal(k, v) { if (v === '' || v == null) { if (sh.cells[k]) { delete sh.cells[k].v; if (!sh.cells[k].s) delete sh.cells[k]; } } else (sh.cells[k] = sh.cells[k] || {}).v = v; }
  function styleSel(fn) { snapshot(); eachSel(k => { const c = sh.cells[k] = sh.cells[k] || {}; c.s = c.s || {}; fn(c.s, k); }); paintAll(); ctx.markDirty(); }
  const curStyle = () => ((sh.cells[ref(sel.r, sel.c)] || {}).s || {});
  const toggle = key => { const on = !curStyle()[key]; styleSel(s => { s[key] = on; }); };

  function commit(v) { snapshot(); setVal(ref(sel.r, sel.c), v); paintAll(); ctx.markDirty(); }
  function startEdit(initial) {
    if (ctx.readOnly) return;
    const td = cellEl(sel.r, sel.c); if (!td) return;
    const k = ref(sel.r, sel.c), cell = sh.cells[k];
    const inp = document.createElement('input'); inp.className = 'xl-edit';
    inp.value = initial !== undefined ? initial : (cell ? cell.v : '');
    const rc = td.getBoundingClientRect(), wr = wrapEl.getBoundingClientRect();
    Object.assign(inp.style, { left: (rc.left - wr.left + wrapEl.scrollLeft) / (zoom / 100) + 'px', top: (rc.top - wr.top + wrapEl.scrollTop) / (zoom / 100) + 'px', width: Math.max(rc.width / (zoom / 100), 120) + 'px', height: rc.height / (zoom / 100) + 'px' });
    gridEl.appendChild(inp); inp.focus(); editing = inp;
    inp.addEventListener('input', () => fxInput.value = inp.value);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); endEdit(true); move(e.key === 'Tab' ? 0 : (e.shiftKey ? -1 : 1), e.key === 'Tab' ? (e.shiftKey ? -1 : 1) : 0); }
      else if (e.key === 'Escape') endEdit(false);
      e.stopPropagation();
    });
    inp.addEventListener('blur', () => editing === inp && endEdit(true));
  }
  function endEdit(save) { const inp = editing; if (!inp) return; editing = null; if (save) commit(inp.value.trim()); inp.remove(); gridEl.focus(); }
  function move(dr, dc, extend) {
    if (extend) { sel.r2 = clamp(sel.r2 + dr, ROWS); sel.c2 = clamp(sel.c2 + dc, COLS); }
    else { sel.r = clamp(sel.r + dr, ROWS); sel.c = clamp(sel.c + dc, COLS); sel.r2 = sel.r; sel.c2 = sel.c; }
    paintSel();
  }
  const clamp = (v, max) => Math.max(0, Math.min(max - 1, v));

  /* ======== features ======== */
  function autoSum(fn = 'SUM') {
    const g = range4();
    if (g.r1 !== g.r2 || g.c1 !== g.c2) { const target = ref(g.r2 + 1, g.c1); if (g.r2 + 1 < ROWS) { snapshot(); for (let c = g.c1; c <= g.c2; c++) setVal(ref(g.r2 + 1, c), `=${fn}(${ref(g.r1, c)}:${ref(g.r2, c)})`); sel = { r: g.r2 + 1, c: g.c1, r2: g.r2 + 1, c2: g.c1 }; paintAll(); ctx.markDirty(); } return target; }
    let r = sel.r - 1; while (r >= 0 && isNum(safe(ref(r, sel.c)))) r--;
    if (r === sel.r - 1) return startEdit(`=${fn}()`);
    commit(`=${fn}(${ref(r + 1, sel.c)}:${ref(sel.r - 1, sel.c)})`);
  }
  const safe = k => { try { return cellValue(k); } catch { return ''; } };
  function sortSel(dir) {
    const g = range4(); let r1 = g.r1, r2 = g.r2;
    if (r1 === r2) { r1 = hasHeader() ? 1 : 0; r2 = Math.max(0, ...Object.keys(sh.cells).filter(k => sh.cells[k].v !== undefined).map(k => +k.slice(1) - 1)); }
    snapshot();
    const c1 = g.r1 === g.r2 ? 0 : g.c1, c2 = g.r1 === g.r2 ? COLS - 1 : g.c2;
    const rows = []; for (let r = r1; r <= r2; r++) { const row = []; for (let c = c1; c <= c2; c++) row.push(sh.cells[ref(r, c)]); rows.push(row); }
    const key = sel.c - c1;
    rows.sort((a, b) => { const x = a[key] ? a[key].v : '', y = b[key] ? b[key].v : ''; if (x === '' || x == null) return 1; if (y === '' || y == null) return -1; return (isNum(x) && isNum(y) ? x - y : String(x).localeCompare(String(y), OW.lang)) * dir; });
    rows.forEach((row, i) => row.forEach((cell, j) => { const k = ref(r1 + i, c1 + j); if (cell) sh.cells[k] = cell; else delete sh.cells[k]; }));
    paintAll(); ctx.markDirty();
  }
  const hasHeader = () => { const v = (sh.cells['A1'] || {}).v; return v && !isNum(v); };
  function applyFilter() {
    const header = tableEl.querySelector('tbody tr'); if (!header) return;
    tableEl.querySelectorAll('tbody tr').forEach(tr => tr.hidden = false);
    tableEl.querySelectorAll('.flt').forEach(x => x.remove());
    if (!filterOn || !sh.filter) return;
    for (let c = 0; c < COLS; c++) { const td = cellEl(0, c); if (td && td.textContent) { const b = document.createElement('span'); b.className = 'flt'; b.innerHTML = I('filter', 11); td.appendChild(b); } }
    const f = sh.filter;
    if (f.value) tableEl.querySelectorAll('tbody tr').forEach((tr, r) => { if (r > 0 && display(ref(r, f.c)) !== f.value) tr.hidden = true; });
  }
  function filterMenu(c, anchor) {
    const vals = new Set(); for (let r = 1; r < ROWS; r++) { const v = display(ref(r, c)); if (v) vals.add(v); }
    OW.popover(anchor, [{ label: t('excel.showAll'), onClick: () => { sh.filter = { c }; applyFilter(); } }, '-', ...Array.from(vals).slice(0, 30).map(v => ({ label: v, checked: sh.filter && sh.filter.value === v && sh.filter.c === c, onClick: () => { sh.filter = { c, value: v }; applyFilter(); } }))]);
  }
  function applyCF() {
    Object.values(sh.cells).forEach(cell => { if (cell.s) delete cell.s.cfHit; });
    (sh.cf || []).forEach(rule => {
      const [a, b] = rule.range.split(':'); const ra = parseRef(a), rb = parseRef(b || a);
      for (let r = ra.r; r <= rb.r; r++) for (let c = ra.c; c <= rb.c; c++) { const k = ref(r, c), v = safe(k); if (isNum(v) && (rule.op === '>' ? +v > rule.x : +v < rule.x)) { const cell = sh.cells[k]; cell.s = cell.s || {}; cell.s.cfHit = true; } }
    });
  }
  function addCF(op) {
    const g = range4(); const rangeRef = ref(g.r1, g.c1) + ':' + ref(g.r2, g.c2);
    OW.prompt(op === '>' ? t('excel.cfGreater') : t('excel.cfLess'), '0').then(v => { if (v === null || !isNum(v)) return; sh.cf = (sh.cf || []).concat([{ range: rangeRef, op, x: +v }]); paintAll(); ctx.markDirty(); });
  }
  function formatAsTable() {
    const g = range4(); if (g.r1 === g.r2) return OW.toast(t('excel.selectRange'));
    snapshot();
    for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) { const cell = sh.cells[ref(r, c)] = sh.cells[ref(r, c)] || {}; cell.s = cell.s || {}; cell.s.border = true; if (r === g.r1) { cell.s.bg = '#1E9E5A'; cell.s.color = '#ffffff'; cell.s.b = true; } else cell.s.bg = (r - g.r1) % 2 ? '#e8f5ee' : ''; }
    paintAll(); ctx.markDirty();
  }
  function mergeCenter() {
    const g = range4(); snapshot();
    const first = sh.cells[ref(g.r1, g.c1)] = sh.cells[ref(g.r1, g.c1)] || {}; first.s = first.s || {};
    if (first.s.span > 1) { for (let c = g.c1 + 1; c < g.c1 + first.s.span; c++) { const x = sh.cells[ref(g.r1, c)]; if (x && x.s) delete x.s.hiddenBy; } delete first.s.span; }
    else if (g.c2 > g.c1) { first.s.span = g.c2 - g.c1 + 1; first.s.align = 'center'; for (let c = g.c1 + 1; c <= g.c2; c++) { const x = sh.cells[ref(g.r1, c)] = sh.cells[ref(g.r1, c)] || {}; x.s = x.s || {}; x.s.hiddenBy = ref(g.r1, g.c1); } }
    paintAll(); ctx.markDirty();
  }
  function insertRow(del) {
    snapshot(); const at = sel.r, nc = {};
    Object.entries(sh.cells).forEach(([k, v]) => { const m = /^([A-Z]{1,3})(\d+)$/.exec(k); const r = +m[2] - 1; if (del && r === at) return; nc[m[1] + (r > at || (!del && r === at) ? r + (del ? 0 : 2) : r + 1)] = v; });
    sh.cells = nc; paintAll(); ctx.markDirty();
  }
  function clearSel(what) { snapshot(); eachSel(k => { const c = sh.cells[k]; if (!c) return; if (what !== 'format') delete c.v; if (what !== 'content') delete c.s; if (c.v === undefined && !c.s) delete sh.cells[k]; }); paintAll(); ctx.markDirty(); }
  function insertChart(kind) {
    const g = range4(); if (g.r1 === g.r2 && g.c1 === g.c2) return OW.toast(t('excel.selectRange'));
    sh.charts.push({ range: ref(g.r1, g.c1) + ':' + ref(g.r2, g.c2), kind, x: 520, y: 40 }); drawCharts(); ctx.markDirty();
  }
  function drawCharts() {
    gridEl.querySelectorAll('.xl-chart').forEach(x => x.remove());
    sh.charts.forEach((ch, idx) => {
      let data; try { data = range(ch.range, []); } catch { return; }
      const labels = data.map(r => r.length > 1 ? r[0] : ''), vals = data.map(r => +(r.length > 1 ? r[1] : r[0]) || 0);
      const max = Math.max(1, ...vals), W = 360, H = 220, bw = (W - 50) / vals.length;
      const pal = ['#1E9E5A', '#2F6BEA', '#EA6A2A', '#7C4DDB', '#E3A21A', '#D93A32'];
      let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><line x1="40" y1="10" x2="40" y2="${H - 30}" stroke="currentColor" opacity=".3"/><line x1="40" y1="${H - 30}" x2="${W - 5}" y2="${H - 30}" stroke="currentColor" opacity=".3"/>`;
      if (ch.kind === 'line') svg += `<polyline fill="none" stroke="${pal[0]}" stroke-width="2.5" points="${vals.map((v, i) => `${45 + i * bw + bw / 2},${H - 30 - v / max * (H - 50)}`).join(' ')}"/>` + vals.map((v, i) => `<circle cx="${45 + i * bw + bw / 2}" cy="${H - 30 - v / max * (H - 50)}" r="3.5" fill="${pal[0]}"/>`).join('');
      else vals.forEach((v, i) => { const hh = v / max * (H - 50); svg += `<rect x="${45 + i * bw + 4}" y="${H - 30 - hh}" width="${Math.max(4, bw - 8)}" height="${hh}" rx="3" fill="${pal[i % pal.length]}"/>`; });
      labels.forEach((l, i) => svg += `<text x="${45 + i * bw + bw / 2}" y="${H - 12}" font-size="10" text-anchor="middle" fill="currentColor">${OW.escape(String(l).slice(0, 10))}</text>`);
      svg += `<text x="34" y="16" font-size="10" text-anchor="end" fill="currentColor">${max.toLocaleString(OW.lang)}</text></svg>`;
      const el = document.createElement('div'); el.className = 'xl-chart'; el.style.left = ch.x + 'px'; el.style.top = ch.y + 'px';
      el.innerHTML = `<div class="xc-h"><span>${t('excel.chart')} · ${OW.escape(ch.range)}</span><button title="${t('delete')}">${I('x', 14)}</button></div>${svg}`;
      el.querySelector('button').onclick = () => { sh.charts.splice(idx, 1); drawCharts(); ctx.markDirty(); };
      el.querySelector('.xc-h').onpointerdown = e => { const sx = e.clientX - ch.x, sy = e.clientY - ch.y; const mv = ev => { ch.x = ev.clientX - sx; ch.y = ev.clientY - sy; el.style.left = ch.x + 'px'; el.style.top = ch.y + 'px'; }; const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); ctx.markDirty(); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); };
      gridEl.appendChild(el);
    });
  }
  function toCSV() { let maxR = 0, maxC = 0; Object.keys(sh.cells).forEach(k => { const p = parseRef(k); if (sh.cells[k].v !== undefined) { maxR = Math.max(maxR, p.r); maxC = Math.max(maxC, p.c); } }); const lines = []; for (let r = 0; r <= maxR; r++) { const row = []; for (let c = 0; c <= maxC; c++) { let v = safe(ref(r, c)); v = String(v); row.push(/[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v); } lines.push(row.join(',')); } return lines.join('\n'); }
  function renderSheetTabs() {
    sheetTabs.innerHTML = '';
    book.sheets.forEach((s, i) => { const b = document.createElement('button'); b.className = 'sheet-tab' + (s === sh ? ' on' : ''); b.textContent = s.name; b.onclick = () => { sh = s; book.active = i; sel = { r: 0, c: 0, r2: 0, c2: 0 }; buildGrid(); renderSheetTabs(); }; b.ondblclick = () => OW.prompt(t('rename'), s.name).then(n => { if (n) { s.name = n; renderSheetTabs(); ctx.markDirty(); } }); sheetTabs.appendChild(b); });
    const add = document.createElement('button'); add.className = 'sheet-add'; add.innerHTML = I('plus', 16); add.title = t('excel.addSheet');
    add.onclick = () => { book.sheets.push({ name: t('excel.sheet') + (book.sheets.length + 1), cells: {}, colW: {}, charts: [] }); sh = book.sheets[book.sheets.length - 1]; book.active = book.sheets.length - 1; buildGrid(); renderSheetTabs(); ctx.markDirty(); };
    sheetTabs.appendChild(add);
  }
  function fnMenu() { return ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'IF', 'ROUND', 'SUMIF', 'COUNTIF', 'CONCAT', 'TODAY'].map(f => ({ label: f, onClick: () => ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT'].includes(f) ? autoSum(f) : startEdit(`=${f}(`) })); }

  /* ======== ribbon ======== */
  const fmtOpts = [{ v: '', l: t('excel.general') }, { v: 'number', l: t('excel.number') }, { v: 'currency', l: t('excel.currency') }, { v: 'percent', l: t('excel.percent') }, { v: 'date', l: t('date') }];
  const R = [
    { id: 'start', label: t('tab.home'), groups: [
      { label: t('undo'), items: [{ t: 'stack', items: [{ icon: 'undo', title: t('undo'), onClick: () => undoStack.length && (redoStack.push(JSON.stringify(sh)), restore(undoStack.pop())) }, { icon: 'redo', title: t('redo'), onClick: () => redoStack.length && (undoStack.push(JSON.stringify(sh)), restore(redoStack.pop())) }] }] },
      { label: t('clipboard'), items: [{ icon: 'clipboard', big: true, label: t('paste'), onClick: () => pasteText() },
        { t: 'stack', items: [{ icon: 'scissors', label: t('cut'), onClick: () => { copySel(); clearSel('content'); } }, { icon: 'copy', label: t('copy'), onClick: copySel }, { icon: 'brush', label: t('formatPainter'), onClick: () => { const s = Object.assign({}, curStyle()); OW.toast(t('excel.painterHint')); pendingPaint = s; } }] }] },
      { label: t('font'), items: [{ t: 'rows', rows: [
        [{ t: 'select', editable: true, w: 132, options: ['Arial', 'Aptos', 'Calibri', 'Georgia', 'Courier New', 'Verdana'], get: () => curStyle().font || 'Arial', onChange: v => styleSel(s => s.font = v) },
          { t: 'select', editable: true, w: 68, options: ['8', '9', '10', '11', '12', '14', '16', '18', '24', '36'], get: () => String(curStyle().size || 10), onChange: v => styleSel(s => s.size = +v) },
          { icon: 'grow', title: t('fontGrow'), onClick: () => styleSel(s => s.size = (s.size || 10) + 1) }, { icon: 'shrink', title: t('fontShrink'), onClick: () => styleSel(s => s.size = Math.max(6, (s.size || 10) - 1)) }],
        [{ icon: 'bold', title: t('bold'), active: () => curStyle().b, onClick: () => toggle('b') }, { icon: 'italic', title: t('italic'), active: () => curStyle().i, onClick: () => toggle('i') },
          { icon: 'underline', title: t('underline'), active: () => curStyle().u, onClick: () => toggle('u') }, { icon: 'strike', title: t('strike'), active: () => curStyle().st, onClick: () => toggle('st') },
          { icon: 'border', title: t('excel.borders'), active: () => curStyle().border, onClick: () => toggle('border') },
          { t: 'color', icon: 'fill', title: t('fillColor'), value: '#fff3a6', onChange: v => styleSel(s => s.bg = v) },
          { t: 'color', icon: 'fontColor', title: t('fontColor'), value: '#e03131', onChange: v => styleSel(s => s.color = v) }]] }] },
      { label: t('alignment'), items: [{ t: 'rows', rows: [
        [{ icon: 'alignJ', title: t('excel.top'), active: () => curStyle().valign === 'top', onClick: () => styleSel(s => s.valign = 'top') }, { icon: 'alignC', title: t('excel.middle'), active: () => curStyle().valign === 'middle', onClick: () => styleSel(s => s.valign = 'middle') }, { icon: 'alignJ', title: t('excel.bottom'), active: () => curStyle().valign === 'bottom', onClick: () => styleSel(s => s.valign = 'bottom') }, { icon: 'wrap', label: t('excel.wrap'), active: () => curStyle().wrap, onClick: () => toggle('wrap') }],
        [{ icon: 'alignL', title: t('alignLeft'), active: () => curStyle().align === 'left', onClick: () => styleSel(s => s.align = 'left') }, { icon: 'alignC', title: t('alignCenter'), active: () => curStyle().align === 'center', onClick: () => styleSel(s => s.align = 'center') }, { icon: 'alignR', title: t('alignRight'), active: () => curStyle().align === 'right', onClick: () => styleSel(s => s.align = 'right') }, { icon: 'merge', label: t('excel.merge'), onClick: mergeCenter }]] }] },
      { label: t('excel.number'), items: [{ t: 'rows', rows: [
        [{ t: 'select', w: 128, options: fmtOpts, get: () => curStyle().fmt || '', onChange: v => styleSel(s => s.fmt = v) }],
        [{ icon: 'sigma', title: t('excel.currency'), onClick: () => styleSel(s => s.fmt = 'currency') }, { icon: 'percent', title: t('excel.percent'), onClick: () => styleSel(s => s.fmt = 'percent') },
          { icon: 'list', title: t('excel.thousands'), onClick: () => styleSel(s => s.group = !s.group) }, { icon: 'plus', title: t('excel.decInc'), onClick: () => styleSel(s => s.dec = Math.min(8, (s.dec || 0) + 1)) }, { icon: 'hr', title: t('excel.decDec'), onClick: () => styleSel(s => s.dec = Math.max(0, (s.dec || 1) - 1)) }]] }] },
      { label: t('excel.styles'), items: [
        { t: 'menu', icon: 'layers', label: t('excel.cf'), items: [{ label: t('excel.cfGreater'), onClick: () => addCF('>') }, { label: t('excel.cfLess'), onClick: () => addCF('<') }, '-', { label: t('excel.cfClear'), onClick: () => { sh.cf = []; paintAll(); ctx.markDirty(); } }] },
        { icon: 'table', label: t('excel.asTable'), onClick: formatAsTable },
        { t: 'menu', icon: 'palette', label: t('excel.cellStyles'), items: [
          { label: t('excel.good'), onClick: () => styleSel(s => { s.bg = '#c6efce'; s.color = '#006100'; }) }, { label: t('excel.bad'), onClick: () => styleSel(s => { s.bg = '#ffc7ce'; s.color = '#9c0006'; }) },
          { label: t('excel.neutral'), onClick: () => styleSel(s => { s.bg = '#ffeb9c'; s.color = '#9c5700'; }) }, { label: t('excel.heading'), onClick: () => styleSel(s => { s.b = true; s.size = 14; s.color = '#1E9E5A'; }) }] }] },
      { label: t('excel.cells'), items: [{ icon: 'insertRow', label: t('excel.insertRow'), onClick: () => insertRow(false) }, { icon: 'deleteRow', label: t('excel.deleteRow'), onClick: () => insertRow(true) },
        { t: 'menu', icon: 'layout', label: t('excel.format'), items: [{ label: t('excel.colWidth'), onClick: () => OW.prompt(t('excel.colWidth'), String(sh.colW[sel.c] || 92)).then(v => { if (+v) { sh.colW[sel.c] = +v; buildGrid(); ctx.markDirty(); } }) }, { label: t('excel.autofit'), onClick: () => { delete sh.colW[sel.c]; buildGrid(); ctx.markDirty(); } }] }] },
      { label: t('editing'), items: [{ t: 'rows', rows: [
        [{ t: 'menu', icon: 'sigma', label: t('excel.autosum'), items: fnMenu }],
        [{ t: 'menu', icon: 'eraser', label: t('clear'), items: [{ label: t('excel.clearAll'), onClick: () => clearSel('all') }, { label: t('excel.clearFormats'), onClick: () => clearSel('format') }, { label: t('excel.clearContents'), onClick: () => clearSel('content') }] }]] },
        { t: 'menu', icon: 'sortAZ', label: t('excel.sortFilter'), items: () => [{ label: t('excel.sortAsc'), onClick: () => sortSel(1) }, { label: t('excel.sortDesc'), onClick: () => sortSel(-1) }, '-', { label: t('excel.filter'), checked: filterOn, onClick: () => { filterOn = !filterOn; sh.filter = filterOn ? (sh.filter || { c: 0 }) : null; applyFilter(); } }] },
        { icon: 'search', label: t('excel.findSelect'), onClick: findCell }] },
    ] },
    { id: 'insert', label: t('tab.insert'), groups: [
      { label: t('excel.charts'), items: [{ icon: 'grid', big: true, label: t('excel.bar'), onClick: () => insertChart('bar') }, { icon: 'activity', big: true, label: t('excel.line'), onClick: () => insertChart('line') }] },
      { label: t('excel.functions'), items: [{ t: 'menu', icon: 'sigma', label: t('excel.function'), items: fnMenu }, { icon: 'calendar', label: t('date'), onClick: () => commit(new Date().toLocaleDateString(OW.lang)) }] },
    ] },
    { id: 'pagelayout', label: t('tab.pageLayout'), groups: [{ label: t('excel.sheetOptions'), items: [{ icon: 'grid', label: t('excel.gridlines'), active: () => gridlines, onClick: () => { gridlines = !gridlines; paintAll(); } }, { icon: 'print', label: t('bs.print'), onClick: () => window.print() }] }] },
    { id: 'formulas', label: t('tab.formulas'), groups: [{ label: t('excel.functions'), items: [{ t: 'menu', icon: 'sigma', big: true, label: t('excel.autosum'), items: fnMenu }, { icon: 'eye', big: true, label: t('excel.showFormulas'), active: () => showFormulas, onClick: () => { showFormulas = !showFormulas; paintAll(); } }] }] },
    { id: 'data', label: t('tab.data'), groups: [
      { label: t('excel.sortFilter'), items: [{ icon: 'sortAZ', big: true, label: t('excel.sortAsc'), onClick: () => sortSel(1) }, { icon: 'sortAZ', big: true, label: t('excel.sortDesc'), onClick: () => sortSel(-1) }, { icon: 'filter', big: true, label: t('excel.filter'), active: () => filterOn, onClick: () => { filterOn = !filterOn; sh.filter = filterOn ? { c: 0 } : null; applyFilter(); } }] },
      { label: 'CSV', items: [{ icon: 'upload', big: true, label: t('excel.importCsv'), onClick: importCSV }, { icon: 'download', big: true, label: t('excel.exportCsv'), onClick: () => OW.download(new Blob([toCSV()], { type: 'text/csv' }), OW.safeName(ctx.file.name) + '.csv') }] },
    ] },
    { id: 'review', label: t('tab.review'), groups: [{ label: t('editor.comments'), items: [{ icon: 'comment', big: true, label: t('editor.comments'), onClick: () => ctx.root.querySelector('.ed-comments').click() }] }] },
    { id: 'view', label: t('tab.view'), groups: [
      { label: t('excel.window'), items: [{ icon: 'layout', big: true, label: t('excel.freeze'), active: () => freeze, onClick: () => { freeze = !freeze; paintAll(); } }, { icon: 'grid', big: true, label: t('excel.gridlines'), active: () => gridlines, onClick: () => { gridlines = !gridlines; paintAll(); } }] },
      { label: 'Zoom', items: [{ icon: 'zoomOut', big: true, label: t('zoomOut'), onClick: () => { zoom = Math.max(50, zoom - 10); paintAll(); } }, { icon: 'zoomIn', big: true, label: t('zoomIn'), onClick: () => { zoom = Math.min(200, zoom + 10); paintAll(); } }] },
    ] },
    { id: 'help', label: t('tab.help'), groups: [{ label: t('tab.help'), items: [{ icon: 'sparkle', big: true, label: t('help.shortcuts'), onClick: () => OW.alert(t('help.shortcuts'), t('excel.shortcuts')) }, { icon: 'app', big: true, label: t('help.about'), onClick: () => OW.about() }] }] },
  ];
  let pendingPaint = null;

  function findCell() { OW.prompt(t('find.find'), '').then(v => { if (!v) return; const k = Object.keys(sh.cells).find(k => String(display(k)).toLowerCase().includes(v.toLowerCase())); if (!k) return OW.toast(t('find.none')); const p = parseRef(k); sel = { r: p.r, c: p.c, r2: p.r, c2: p.c }; paintSel(); }); }
  function copySel() { const g = range4(); const lines = []; for (let r = g.r1; r <= g.r2; r++) { const row = []; for (let c = g.c1; c <= g.c2; c++) row.push((sh.cells[ref(r, c)] || {}).v || ''); lines.push(row.join('\t')); } const txt = lines.join('\n'); clip = txt; navigator.clipboard && navigator.clipboard.writeText(txt).catch(() => {}); }
  let clip = '';
  async function pasteText(txt) {
    if (txt === undefined) { try { txt = await navigator.clipboard.readText(); } catch { txt = clip; } }
    if (!txt) return; snapshot();
    txt.replace(/\r/g, '').split('\n').forEach((line, i) => line.split('\t').forEach((v, j) => { if (sel.r + i < ROWS && sel.c + j < COLS) setVal(ref(sel.r + i, sel.c + j), v); }));
    paintAll(); ctx.markDirty();
  }
  function importCSV() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; snapshot(); OW.parseCSV(await f.text()).forEach((row, r) => row.forEach((v, c) => { if (r < ROWS && c < COLS) setVal(ref(r, c), v); })); paintAll(); ctx.markDirty(); };
    inp.click();
  }

  ctx.exports = [
    { label: 'Excel (.xlsx)', hint: t('export.xlsxHint'), fn: () => OW.download(OW.ooxml.cellsToXlsx(sh.cells, sh.name), OW.safeName(ctx.file.name) + '.xlsx') },
    { label: 'CSV (.csv)', fn: () => OW.download(new Blob([toCSV()], { type: 'text/csv' }), OW.safeName(ctx.file.name) + '.csv') },
    { label: 'PDF', hint: t('export.pdfHint'), fn: () => window.print() },
  ];

  return {
    ribbonMode: 'classic',
    ribbon: () => R,
    mount(body) {
      body.innerHTML = `<div class="xl">
        <div class="xl-fx"><input class="xl-name" spellcheck="false"><span class="xl-fxbtns">${I('x', 14)}${I('check', 14)}<i>fx</i></span><input class="xl-formula" spellcheck="false"></div>
        <div class="xl-wrap" tabindex="-1"><div class="xl-gridbox" tabindex="0"><div class="xl-table"></div></div></div>
        <div class="xl-sheets"></div></div>`;
      nameBox = body.querySelector('.xl-name'); fxInput = body.querySelector('.xl-formula');
      wrapEl = body.querySelector('.xl-wrap'); gridEl = body.querySelector('.xl-gridbox'); tableEl = body.querySelector('.xl-table'); sheetTabs = body.querySelector('.xl-sheets');
      buildGrid(); renderSheetTabs();

      let dragging = false;
      tableEl.addEventListener('mousedown', e => {
        const flt = e.target.closest('.flt'); if (flt) { e.preventDefault(); return filterMenu(+flt.parentElement.dataset.c, flt); }
        const rs = e.target.closest('.rs');
        if (rs) { e.preventDefault(); const c = +rs.dataset.c, th = rs.parentElement, sx = e.clientX, w0 = th.offsetWidth; const mv = ev => { th.style.width = Math.max(30, w0 + ev.clientX - sx) + 'px'; }; const up = () => { sh.colW[c] = th.offsetWidth; removeEventListener('mousemove', mv); removeEventListener('mouseup', up); ctx.markDirty(); }; addEventListener('mousemove', mv); addEventListener('mouseup', up); return; }
        const ch = e.target.closest('th.ch'); if (ch) { const c = +ch.dataset.c; sel = { r: 0, c, r2: ROWS - 1, c2: c }; paintSel(); return; }
        const rh = e.target.closest('th.rh'); if (rh) { const r = +rh.parentElement.dataset.r; sel = { r, c: 0, r2: r, c2: COLS - 1 }; paintSel(); return; }
        const td = e.target.closest('td'); if (!td) return;
        if (editing) endEdit(true);
        const r = +td.dataset.r, c = +td.dataset.c;
        if (fxInput === document.activeElement && fxInput.value.startsWith('=')) { e.preventDefault(); fxInput.value += ref(r, c); return; }
        if (e.shiftKey) { sel.r2 = r; sel.c2 = c; } else sel = { r, c, r2: r, c2: c };
        dragging = true; paintSel(); gridEl.focus({ preventScroll: true });
        if (pendingPaint) { const p = pendingPaint; pendingPaint = null; styleSel(s => Object.assign(s, p)); }
      });
      tableEl.addEventListener('mouseover', e => { if (!dragging) return; const td = e.target.closest('td'); if (td) { sel.r2 = +td.dataset.r; sel.c2 = +td.dataset.c; paintSel(); } });
      addEventListener('mouseup', () => dragging = false);
      tableEl.addEventListener('dblclick', e => { if (e.target.closest('td')) startEdit(); });
      gridEl.addEventListener('keydown', e => {
        if (editing) return;
        const k = e.key, mod = e.ctrlKey || e.metaKey;
        const nav = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Enter: [1, 0], Tab: [0, 1] }[k];
        if (nav) { e.preventDefault(); return move(e.shiftKey && k === 'Tab' ? 0 : nav[0], e.shiftKey && k === 'Tab' ? -1 : nav[1], e.shiftKey && k.startsWith('Arrow')); }
        if (mod && k.toLowerCase() === 'c') { copySel(); return; }
        if (mod && k.toLowerCase() === 'x') { copySel(); clearSel('content'); return; }
        if (mod && k.toLowerCase() === 'b') { e.preventDefault(); return toggle('b'); }
        if (mod && k.toLowerCase() === 'i') { e.preventDefault(); return toggle('i'); }
        if (mod && k.toLowerCase() === 'u') { e.preventDefault(); return toggle('u'); }
        if (mod && k.toLowerCase() === 'z') { e.preventDefault(); return R[0].groups[0].items[0].items[0].onClick(); }
        if (mod && k.toLowerCase() === 'y') { e.preventDefault(); return R[0].groups[0].items[0].items[1].onClick(); }
        if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return clearSel('content'); }
        if (k === 'F2') { e.preventDefault(); return startEdit(); }
        if (k.length === 1 && !mod && !ctx.readOnly) { e.preventDefault(); startEdit(k); }
      });
      gridEl.addEventListener('paste', e => { if (editing) return; e.preventDefault(); pasteText(e.clipboardData.getData('text/plain')); });
      fxInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(fxInput.value.trim()); gridEl.focus(); move(1, 0); } if (e.key === 'Escape') { fxInput.blur(); paintSel(); } });
      nameBox.addEventListener('keydown', e => { if (e.key === 'Enter') { try { const [a, b] = nameBox.value.toUpperCase().split(':'); const p = parseRef(a), q = parseRef(b || a); sel = { r: p.r, c: p.c, r2: q.r, c2: q.c }; paintSel(); gridEl.focus(); } catch { OW.toast('#REF!'); } } });
      gridEl.focus();
    },
    getContent: () => { book.active = book.sheets.indexOf(sh); return book; },
    status() {
      const nums = []; eachSel(k => { const v = safe(k); if (isNum(v) && v !== '') nums.push(+v); });
      if (nums.length < 2) return { left: t('excel.ready'), right: zoom + ' %' };
      const sum = nums.reduce((a, b) => a + b, 0), f = n => n.toLocaleString(OW.lang, { maximumFractionDigits: 4 });
      return { left: `${t('excel.average')}: ${f(sum / nums.length)} &nbsp; ${t('excel.count')}: ${nums.length} &nbsp; ${t('excel.sum')}: ${f(sum)}`, right: zoom + ' %' };
    },
    setReadOnly() {},
  };
};

/* small CSV parser shared with the importer */
OW.parseCSV = function (text) {
  const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
};
