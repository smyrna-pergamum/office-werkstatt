/* Note Werkzeug – calendar (month view + agenda), stored in the notebook itself (content.events).
 * Events can be linked to a page; "meeting notes" creates such a page. Pages appear on the day they
 * were created. .ics export/import for other calendar apps. Works offline like everything else. */
window.OW = window.OW || {};
OW.noteCalendar = function ({ ctx, nb, el, openPage, createPage }) {
  const t = ctx.t, I = OW.icon, E = OW.escape;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const COLORS = ['#7C4DDB', '#2F6BEA', '#1E9E5A', '#EA6A2A', '#E0457B', '#E3A21A', '#0FA3B1', '#5C6370'];
  nb.events = Array.isArray(nb.events) ? nb.events : [];
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const todayIso = () => iso(new Date());
  let month = new Date(); month.setDate(1);
  let selected = todayIso();

  const fmtMonth = d => d.toLocaleDateString(OW.lang, { month: 'long', year: 'numeric' });
  const fmtDay = s => parse(s).toLocaleDateString(OW.lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const weekdays = () => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(OW.lang, { weekday: 'short' }));  // 1 Jan 2024 = Monday
  const sortEv = (a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || ''));
  const eventsOn = d => nb.events.filter(e => e.date === d).sort(sortEv);
  const allPages = () => nb.sections.flatMap(s => s.pages.map(p => ({ p, s })));
  const pagesOn = d => allPages().filter(({ p }) => p.created && iso(new Date(p.created)) === d);
  const changed = () => { ctx.markDirty(); render(); };

  function render() {
    if (el.hidden) return;
    const first = new Date(month), startOffset = (first.getDay() + 6) % 7;     // Monday first
    const gridStart = new Date(first); gridStart.setDate(1 - startOffset);
    const cells = [];
    for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); cells.push(d); }
    const today = todayIso();
    el.innerHTML = `
      <div class="cal-main">
        <div class="cal-head">
          <button class="icon-btn cal-prev" title="${t('cal.prev')}">${I('chevronLeft', 18)}</button>
          <button class="icon-btn cal-next" title="${t('cal.next')}">${I('chevronRight', 18)}</button>
          <h2>${E(fmtMonth(month))}</h2>
          <button class="btn sm ghost cal-today">${t('cal.today')}</button>
          <span class="cal-sp"></span>
          <button class="btn sm primary cal-new">${I('plus', 16)}<span>${t('cal.newEvent')}</span></button>
        </div>
        <div class="cal-grid">
          ${weekdays().map(w => `<div class="cal-wd">${E(w)}</div>`).join('')}
          ${cells.map(d => {
            const s = iso(d), evs = eventsOn(s), pages = pagesOn(s);
            const cls = ['cal-day', d.getMonth() !== month.getMonth() ? 'out' : '', s === today ? 'today' : '', s === selected ? 'sel' : ''].join(' ');
            return `<div class="${cls}" data-d="${s}" tabindex="0">
              <div class="cal-dn"><span>${d.getDate()}</span>${pages.length ? `<i class="cal-pg" title="${E(t('cal.pagesThatDay'))}: ${pages.length}">${I('note', 12)}${pages.length}</i>` : ''}</div>
              ${evs.slice(0, 3).map(e => `<button class="cal-ev" data-e="${E(e.id)}" style="--ec:${E(e.color || COLORS[0])}">${e.start ? `<b>${E(e.start)}</b> ` : ''}${E(e.title || t('cal.untitled'))}</button>`).join('')}
              ${evs.length > 3 ? `<div class="cal-more">+${evs.length - 3}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>
      <aside class="cal-side">${sideHTML()}</aside>`;
    el.querySelector('.cal-prev').onclick = () => { month.setMonth(month.getMonth() - 1); render(); };
    el.querySelector('.cal-next').onclick = () => { month.setMonth(month.getMonth() + 1); render(); };
    el.querySelector('.cal-today').onclick = () => goToday();
    el.querySelector('.cal-new').onclick = () => editEvent(null, selected);
    el.querySelectorAll('.cal-day').forEach(c => {
      c.onclick = e => { if (e.target.closest('.cal-ev')) return; selected = c.dataset.d; render(); };
      c.ondblclick = e => { if (!e.target.closest('.cal-ev')) editEvent(null, c.dataset.d); };
      c.onkeydown = e => { if (e.key === 'Enter') editEvent(null, c.dataset.d); };
    });
    el.querySelectorAll('[data-e]').forEach(b => b.onclick = e => { e.stopPropagation(); const ev = nb.events.find(x => x.id === b.dataset.e); if (ev) editEvent(ev); });
    el.querySelectorAll('[data-page]').forEach(b => b.onclick = () => openPage(b.dataset.page));
    const add = el.querySelector('.cal-addday'); if (add) add.onclick = () => editEvent(null, selected);
  }

  function sideHTML() {
    const evs = eventsOn(selected), pages = pagesOn(selected), today = todayIso();
    const upcoming = nb.events.filter(e => e.date >= today).sort(sortEv).slice(0, 8);
    const evRow = e => `<button class="cal-row" data-e="${E(e.id)}" style="--ec:${E(e.color || COLORS[0])}"><i></i><span><b>${E(e.title || t('cal.untitled'))}</b><small>${e.start ? E(e.start + (e.end ? '–' + e.end : '')) : t('cal.allDay')}${e.pageId ? ' · ' + I('note', 11) : ''}</small></span></button>`;
    return `
      <h3>${E(fmtDay(selected))}</h3>
      ${evs.length ? evs.map(evRow).join('') : `<p class="muted small">${t('cal.noEvents')}</p>`}
      <button class="btn sm ghost cal-addday">${I('plus', 14)}<span>${t('cal.addThisDay')}</span></button>
      ${pages.length ? `<h4>${t('cal.pagesThatDay')}</h4>${pages.map(({ p, s }) => `<button class="cal-row page" data-page="${E(p.id)}"><i style="background:${E(s.color)}"></i><span><b>${E(p.title || t('note.untitled'))}</b><small>${E(s.name)}</small></span></button>`).join('')}` : ''}
      <h4>${t('cal.upcoming')}</h4>
      ${upcoming.length ? upcoming.map(e => `<div class="cal-up"><small>${E(parse(e.date).toLocaleDateString(OW.lang, { weekday: 'short', day: 'numeric', month: 'short' }))}</small>${evRow(e)}</div>`).join('') : `<p class="muted small">${t('cal.noUpcoming')}</p>`}`;
  }

  function editEvent(ev, date) {
    const isNew = !ev;
    const e = ev ? Object.assign({}, ev) : { id: uid(), title: '', date: date || selected, start: '', end: '', color: COLORS[0], notes: '', pageId: '' };
    const pageOpts = allPages().map(({ p, s }) => `<option value="${E(p.id)}" ${p.id === e.pageId ? 'selected' : ''}>${E(s.name)} › ${E(p.title || t('note.untitled'))}</option>`).join('');
    return OW.modal(`<form class="dlg cal-dlg">
        <h3>${isNew ? t('cal.newEvent') : t('cal.editEvent')}</h3>
        <label>${t('cal.title')}<input class="inp" name="title" value="${E(e.title)}" required></label>
        <div class="cal-dlg-row">
          <label>${t('cal.date')}<input class="inp" type="date" name="date" value="${E(e.date)}" required></label>
          <label>${t('cal.start')}<input class="inp" type="time" name="start" value="${E(e.start || '')}"></label>
          <label>${t('cal.end')}<input class="inp" type="time" name="end" value="${E(e.end || '')}"></label>
        </div>
        <div class="cal-colors">${COLORS.map(c => `<label style="--ec:${c}"><input type="radio" name="color" value="${c}" ${c === e.color ? 'checked' : ''}><i></i></label>`).join('')}</div>
        <label>${t('cal.notes')}<textarea class="inp" name="notes" rows="3">${E(e.notes || '')}</textarea></label>
        <label>${t('cal.linkPage')}<select class="inp" name="pageId"><option value="">${t('cal.noLink')}</option>${pageOpts}</select></label>
        <div class="dlg-btns">
          ${isNew ? '' : `<button type="button" class="btn ghost danger" data-del>${I('trash', 16)}<span>${t('delete')}</span></button>`}
          <button type="button" class="btn ghost" data-meet>${I('note', 16)}<span>${e.pageId ? t('cal.openPage') : t('cal.meetingPage')}</span></button>
          <span class="cal-sp"></span>
          <button type="button" class="btn ghost" data-x>${t('cancel')}</button>
          <button class="btn primary">${t('ok')}</button>
        </div></form>`, (c, close) => {
      const f = c.querySelector('form');
      setTimeout(() => f.title.focus());
      const read = () => { e.title = f.title.value.trim(); e.date = f.date.value || e.date; e.start = f.start.value; e.end = f.end.value; e.color = (f.querySelector('[name=color]:checked') || {}).value || e.color; e.notes = f.notes.value; e.pageId = f.pageId.value; };
      const store = () => { const i = nb.events.findIndex(x => x.id === e.id); if (i < 0) nb.events.push(e); else nb.events[i] = e; selected = e.date; const d = parse(e.date); month = new Date(d.getFullYear(), d.getMonth(), 1); };
      f.onsubmit = x => { x.preventDefault(); read(); if (!e.title) return; store(); close(true); changed(); };
      c.querySelector('[data-x]').onclick = () => close(false);
      const del = c.querySelector('[data-del]'); if (del) del.onclick = () => { nb.events = nb.events.filter(x => x.id !== e.id); close(true); changed(); };
      c.querySelector('[data-meet]').onclick = () => {
        read(); if (!e.title) e.title = t('note.meeting');
        if (!e.pageId) {
          const when = parse(e.date).toLocaleDateString(OW.lang, { dateStyle: 'full' }) + (e.start ? ' · ' + e.start + (e.end ? '–' + e.end : '') : '');
          const p = createPage(e.title, `<h3>${E(e.title)}</h3><p><b>${t('cal.when')}:</b> ${E(when)}</p>${e.notes ? `<p>${E(e.notes)}</p>` : ''}<p><b>${t('note.participants')}:</b> </p><h3>${t('note.agenda')}</h3><ul><li><br></li></ul><h3>${t('note.actions')}</h3><ul class="checks"><li>☐ </li></ul>`);
          e.pageId = p.id;
        }
        store(); close(true); ctx.markDirty(); openPage(e.pageId);
      };
    });
  }

  /* ---------- .ics ---------- */
  const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
  const icsUnesc = s => String(s || '').replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
  function toIcs() {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Office Werkstatt//Note Werkzeug//EN', 'CALSCALE:GREGORIAN'];
    for (const e of nb.events) {
      const d = e.date.replace(/-/g, '');
      lines.push('BEGIN:VEVENT', `UID:${e.id}@office-werkstatt`, `DTSTAMP:${stamp}`);
      if (e.start) { lines.push(`DTSTART:${d}T${e.start.replace(':', '')}00`); if (e.end) lines.push(`DTEND:${d}T${e.end.replace(':', '')}00`); }
      else { const n = parse(e.date); n.setDate(n.getDate() + 1); lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${iso(n).replace(/-/g, '')}`); }
      lines.push(`SUMMARY:${icsEsc(e.title)}`); if (e.notes) lines.push(`DESCRIPTION:${icsEsc(e.notes)}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }
  function fromIcs(text) {
    const raw = String(text).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    let cur = null, n = 0;
    for (const line of raw) {
      if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
      if (line === 'END:VEVENT') {
        if (cur && cur.date) { nb.events.push({ id: uid(), title: cur.title || t('cal.untitled'), date: cur.date, start: cur.start || '', end: cur.end || '', color: COLORS[n % COLORS.length], notes: cur.notes || '', pageId: '' }); n++; }
        cur = null; continue;
      }
      if (!cur) continue;
      const i = line.indexOf(':'); if (i < 0) continue;
      const key = line.slice(0, i).split(';')[0].toUpperCase(), val = line.slice(i + 1);
      const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(val);
      if (key === 'SUMMARY') cur.title = icsUnesc(val).slice(0, 200);
      else if (key === 'DESCRIPTION') cur.notes = icsUnesc(val).slice(0, 4000);
      else if (key === 'DTSTART' && m) { cur.date = `${m[1]}-${m[2]}-${m[3]}`; if (m[4]) cur.start = `${m[4]}:${m[5]}`; }
      else if (key === 'DTEND' && m && m[4]) cur.end = `${m[4]}:${m[5]}`;
    }
    return n;
  }
  function importIcs() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.ics,text/calendar';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const n = fromIcs(await f.text()); OW.toast(t('cal.imported', { n })); changed(); };
    inp.click();
  }
  function goToday() { month = new Date(); month.setDate(1); selected = todayIso(); render(); }

  return {
    render, goToday,
    newEvent: () => editEvent(null, selected),
    prev: () => { month.setMonth(month.getMonth() - 1); render(); },
    next: () => { month.setMonth(month.getMonth() + 1); render(); },
    exportIcs: () => OW.download(new Blob([toIcs()], { type: 'text/calendar' }), OW.safeName(ctx.file.name) + '.ics'),
    importIcs,
  };
};
