/* Office Werkstatt – template gallery */
window.OW = window.OW || {};
OW.templates = function () {
  const t = OW.t, d = new Date().toLocaleDateString(OW.lang, { dateStyle: 'long' });
  const cells = rows => { const c = {}; rows.forEach((r, i) => r.forEach((v, j) => { if (v === '' || v == null) return; const o = typeof v === 'object' ? v : { v }; c[String.fromCharCode(65 + j) + (i + 1)] = o; })); return c; };
  const H = v => ({ v, s: { b: true, bg: '#1E9E5A', color: '#ffffff', border: true } });
  const B = v => ({ v, s: { b: true } });
  return [
    /* ---------- Word ---------- */
    { type: 'word', id: 'blank', name: t('tpl.blankDoc'), content: { html: '<p><br></p>' } },
    { type: 'word', id: 'letter', name: t('tpl.letter'), content: { html: `<p>${t('tpl.letter.sender')}</p><p><br></p><p>${t('tpl.letter.recipient')}</p><p><br></p><p style="text-align:right">${d}</p><h2>${t('tpl.letter.subject')}</h2><p>${t('tpl.letter.salutation')}</p><p>${t('tpl.lorem')}</p><p>${t('tpl.letter.closing')}</p><p><br></p><p>${t('tpl.letter.name')}</p>` } },
    { type: 'word', id: 'report', name: t('tpl.report'), content: { html: `<h1 class="title">${t('tpl.report')}</h1><p><i>${d}</i></p><h1>1. ${t('tpl.report.summary')}</h1><p>${t('tpl.lorem')}</p><h1>2. ${t('tpl.report.goals')}</h1><ul><li>${t('tpl.point')} 1</li><li>${t('tpl.point')} 2</li><li>${t('tpl.point')} 3</li></ul><h1>3. ${t('tpl.report.results')}</h1><table class="doc-table"><tbody><tr><td><b>${t('tpl.metric')}</b></td><td><b>${t('tpl.value')}</b></td></tr><tr><td>A</td><td>42</td></tr><tr><td>B</td><td>17</td></tr></tbody></table><h1>4. ${t('tpl.report.next')}</h1><p>${t('tpl.lorem')}</p>` } },
    { type: 'word', id: 'minutes', name: t('tpl.minutes'), content: { html: `<h1>${t('tpl.minutes')}</h1><p><b>${t('date')}:</b> ${d}<br><b>${t('note.participants')}:</b> </p><h2>${t('note.agenda')}</h2><ol><li>${t('tpl.point')}</li><li>${t('tpl.point')}</li></ol><h2>${t('tpl.decisions')}</h2><p><br></p><h2>${t('note.actions')}</h2><ul class="checks"><li>☐ ${t('tpl.task')}</li><li>☐ ${t('tpl.task')}</li></ul>` } },
    { type: 'word', id: 'cv', name: t('tpl.cv'), content: { html: `<h1 class="title">${t('tpl.cv.name')}</h1><p>✉ name@example.org · ☎ +49 000 000 · Darmstadt</p><h2>${t('tpl.cv.profile')}</h2><p>${t('tpl.lorem')}</p><h2>${t('tpl.cv.experience')}</h2><p><b>2022 – ${t('tpl.cv.today')}</b> · ${t('tpl.cv.role')}</p><ul><li>${t('tpl.point')}</li></ul><h2>${t('tpl.cv.education')}</h2><p><b>2018 – 2022</b> · ${t('tpl.cv.degree')}</p><h2>${t('tpl.cv.skills')}</h2><p>Office · ${t('tpl.cv.languages')}</p>` } },

    /* ---------- Excel ---------- */
    { type: 'excel', id: 'blank', name: t('tpl.blankSheet'), content: null },
    { type: 'excel', id: 'budget', name: t('tpl.budget'), content: { sheets: [{ name: t('tpl.budget'), colW: { 0: 180, 1: 110, 2: 110, 3: 110 }, cells: cells([
      [{ v: t('tpl.budget'), s: { b: true, size: 16, color: '#1E9E5A' } }],
      [],
      [H(t('tpl.category')), H(t('tpl.planned')), H(t('tpl.actual')), H(t('tpl.diff'))],
      [t('tpl.rent'), 900, 900, '=B4-C4'], [t('tpl.food'), 400, 452.3, '=B5-C5'], [t('tpl.transport'), 120, 98, '=B6-C6'], [t('tpl.leisure'), 150, 210, '=B7-C7'], [t('tpl.other'), 100, 64.5, '=B8-C8'],
      [B(t('excel.sum')), { v: '=SUM(B4:B8)', s: { b: true, fmt: 'currency' } }, { v: '=SUM(C4:C8)', s: { b: true, fmt: 'currency' } }, { v: '=B9-C9', s: { b: true, fmt: 'currency' } }],
    ]), cf: [{ range: 'D4:D8', op: '<', x: 0 }], charts: [{ range: "A4:B8", kind: "bar", x: 600, y: 30 }] }], active: 0 } },
    { type: 'excel', id: 'timeline', name: t('tpl.timeline'), content: { sheets: [{ name: t('tpl.timeline'), colW: { 0: 220, 1: 120, 2: 110, 3: 110, 4: 110 }, cells: cells([
      [H(t('tpl.task')), H(t('tpl.owner')), H(t('tpl.start')), H(t('tpl.end')), H(t('tpl.status'))],
      [t('tpl.tl.1'), 'Süleyman', '01.12.', '15.12.', '✓'], [t('tpl.tl.2'), 'Team', '10.12.', '20.12.', '…'], [t('tpl.tl.3'), 'Team', '05.01.', '31.01.', ''], [t('tpl.tl.4'), 'Partner', '01.02.', '28.02.', ''],
      [], [B(t('tpl.progress')), { v: '=COUNTIF(E2:E5,"✓")/COUNTA(A2:A5)', s: { fmt: 'percent', b: true } }],
    ]) }], active: 0 } },
    { type: 'excel', id: 'invoice', name: t('tpl.invoice'), content: { sheets: [{ name: t('tpl.invoice'), colW: { 0: 220, 1: 80, 2: 110, 3: 120 }, cells: cells([
      [{ v: t('tpl.invoice').toUpperCase(), s: { b: true, size: 18 } }], [t('date') + ': ' + d], [],
      [H(t('tpl.item')), H(t('tpl.qty')), H(t('tpl.price')), H(t('tpl.total'))],
      [t('tpl.item') + ' 1', 2, { v: 49.9, s: { fmt: 'currency' } }, { v: '=B5*C5', s: { fmt: 'currency' } }], [t('tpl.item') + ' 2', 1, { v: 120, s: { fmt: 'currency' } }, { v: '=B6*C6', s: { fmt: 'currency' } }], [t('tpl.item') + ' 3', 5, { v: 9.5, s: { fmt: 'currency' } }, { v: '=B7*C7', s: { fmt: 'currency' } }],
      [], ['', '', B(t('tpl.net')), { v: '=SUM(D5:D7)', s: { fmt: 'currency' } }], ['', '', B(t('tpl.vat') + ' 19 %'), { v: '=ROUND(D9*0.19,2)', s: { fmt: 'currency' } }], ['', '', B(t('tpl.gross')), { v: '=D9+D10', s: { fmt: 'currency', b: true } }],
    ]) }], active: 0 } },

    /* ---------- Slides ---------- */
    { type: 'slide', id: 'blank', name: t('tpl.blankDeck'), content: null },
    { type: 'slide', id: 'pitch', name: t('tpl.pitch'), content: { theme: 'werkstatt', slides: [
      { layout: 'title', title: t('tpl.pitch.title'), body: t('tpl.pitch.sub') }, { layout: 'title-content', title: t('tpl.pitch.problem'), body: `${t('tpl.point')} 1\n${t('tpl.point')} 2` },
      { layout: 'title-content', title: t('tpl.pitch.solution'), body: `${t('tpl.point')} 1\n${t('tpl.point')} 2\n${t('tpl.point')} 3` }, { layout: 'two', title: t('tpl.pitch.market') }, { layout: 'section', title: t('tpl.pitch.thanks') }] } },
    { type: 'slide', id: 'project', name: t('tpl.projectDeck'), content: { theme: 'forest', slides: [
      { layout: 'title', title: t('tpl.project.title'), body: 'Erasmus+ · ' + d }, { layout: 'title-content', title: t('tpl.report.goals'), body: `${t('tpl.point')} 1\n${t('tpl.point')} 2\n${t('tpl.point')} 3` },
      { layout: 'title-content', title: t('tpl.timeline'), body: `${t('tpl.tl.1')}\n${t('tpl.tl.2')}\n${t('tpl.tl.3')}` }, { layout: 'section', title: t('tpl.pitch.thanks') }] } },
    { type: 'slide', id: 'workshop', name: t('tpl.workshop'), content: { theme: 'sunset', slides: [
      { layout: 'title', title: t('tpl.workshop'), body: d }, { layout: 'title-content', title: t('note.agenda'), body: `09:00 ${t('tpl.welcome')}\n10:00 ${t('tpl.session')} 1\n11:30 ${t('tpl.session')} 2\n13:00 ${t('tpl.lunch')}` }, { layout: 'two', title: t('tpl.groupwork') }] } },

    /* ---------- Notes ---------- */
    { type: 'note', id: 'blank', name: t('tpl.blankNotebook'), content: null },
    { type: 'note', id: 'school', name: t('tpl.school'), content: { sections: [
      { id: 's1', name: t('tpl.school.course'), color: '#2F6BEA', pages: [{ id: 'p1', title: t('tpl.school.lesson') + ' 1', created: Date.now(), html: `<h2>${t('tpl.school.vocab')}</h2><ul><li>der Tisch – table</li><li>die Tür – door</li></ul><h2>${t('tpl.school.grammar')}</h2><p>${t('tpl.lorem')}</p>`, ink: [] }, { id: 'p2', title: t('tpl.school.homework'), created: Date.now(), html: '<ul class="checks"><li>☐ Übung 1</li><li>☐ Übung 2</li></ul>', ink: [] }] },
      { id: 's2', name: t('tpl.school.ideas'), color: '#E3A21A', pages: [{ id: 'p3', title: t('draw.lib.idea'), created: Date.now(), html: '<p><span class="tag tag-idea">💡</span> </p>', ink: [] }] }] } },
    { type: 'note', id: 'meetings', name: t('tpl.meetingNotes'), content: { sections: [{ id: 'm1', name: t('note.meeting'), color: '#7C4DDB', pages: [{ id: 'mp1', title: t('note.meeting') + ' · ' + d, created: Date.now(), html: `<p><b>${t('note.participants')}:</b> </p><p><b>${t('note.agenda')}:</b></p><ul><li><br></li></ul><p><b>${t('note.actions')}:</b></p><ul class="checks"><li>☐ </li></ul>`, ink: [] }] }] } },

    /* ---------- Draw ---------- */
    { type: 'draw', id: 'blank', name: t('tpl.blankBoard'), content: null },
    ...['brainstorm', 'mind', 'kanban', 'retro', 'flow'].map(k => ({ type: 'draw', id: k, name: t('board.tpl.' + k), content: { board: 2, elements: OW.boardTemplate(k, t).map((e, i) => Object.assign({ id: k[0] + i }, e)), view: { x: 0, y: 0, z: 0 } } })),
  ].concat(OW.designTemplates ? OW.designTemplates(t) : [], OW.formTemplates ? OW.formTemplates(t) : []);
};
