/* Office Werkstatt – Design Werkzeug core (no DOM access at load time)
 *  - format catalogue: social media (px) and print (mm, with bleed, fold lines and named pages)
 *  - ready-made templates (element specs in relative units, so they fit their format)
 *  - a small PDF writer for "PDF Standard" and "PDF Druck" (bleed + crop marks), no dependencies */
(function (root) {
  const OW = root.OW = root.OW || {};
  const MM = 96 / 25.4; // design units are CSS pixels (96 dpi); print sizes are given in mm

  /* ---------- formats ---------- */
  // cat: social | print | video ; unit: px | mm ; folds: x positions in mm from the left trim edge ; pages: page names (keys)
  const F = (id, cat, w, h, unit, extra = {}) => Object.assign({ id, cat, w, h, unit, bleed: unit === 'mm' ? 3 : 0 }, extra);
  const FORMATS = [
    F('ig-post', 'social', 1080, 1080, 'px'), F('ig-portrait', 'social', 1080, 1350, 'px'), F('ig-story', 'social', 1080, 1920, 'px'),
    F('fb-post', 'social', 1200, 630, 'px'), F('fb-cover', 'social', 1640, 624, 'px'), F('li-post', 'social', 1200, 627, 'px'),
    F('x-post', 'social', 1600, 900, 'px'), F('yt-thumb', 'social', 1280, 720, 'px'), F('pinterest', 'social', 1000, 1500, 'px'),
    F('poster-a3', 'print', 297, 420, 'mm'), F('poster-a2', 'print', 420, 594, 'mm'), F('poster-a1', 'print', 594, 841, 'mm'),
    F('flyer-a4', 'print', 210, 297, 'mm'), F('flyer-a5', 'print', 148, 210, 'mm'), F('flyer-a6', 'print', 105, 148, 'mm'),
    F('magazine', 'print', 210, 297, 'mm', { pages: ['cover', 'page', 'page', 'back'] }),
    F('book-front', 'print', 152, 229, 'mm'),
    F('book-wrap', 'print', 319, 229, 'mm', { folds: [152, 167], panels: ['back', 'spine', 'front'], spine: 15 }),
    F('bifold', 'print', 297, 210, 'mm', { folds: [148.5], pages: ['outside', 'inside'], panels: ['panel', 'panel'] }),
    F('zfold', 'print', 297, 210, 'mm', { folds: [99, 198], pages: ['outside', 'inside'], panels: ['panel', 'panel', 'panel'] }),
    F('rollfold', 'print', 297, 210, 'mm', { folds: [97, 197], pages: ['outside', 'inside'], panels: ['panel', 'panel', 'panel'] }),
    F('invitation-a6', 'print', 105, 148, 'mm', { pages: ['front', 'back'] }), F('invitation-5x7', 'print', 127, 178, 'mm', { pages: ['front', 'back'] }),
    F('card-folded', 'print', 297, 210, 'mm', { folds: [148.5], pages: ['outside', 'inside'] }),
    F('postcard', 'print', 148, 105, 'mm', { pages: ['front', 'back'] }),
    F('bizcard', 'print', 85, 55, 'mm', { pages: ['front', 'back'] }),
    F('sticker-round', 'print', 76, 76, 'mm', { shape: 'circle' }), F('sticker-square', 'print', 76, 76, 'mm'), F('sticker-rect', 'print', 100, 70, 'mm'),
    F('certificate', 'print', 297, 210, 'mm'),
    F('video-hd', 'video', 1920, 1080, 'px'), F('video-vertical', 'video', 1080, 1920, 'px'),
  ];
  const CATS = ['social', 'print', 'video'];
  const fmt = id => FORMATS.find(f => f.id === id);
  /* everything the editor needs in pixels */
  function geom(format) {
    const k = format.unit === 'mm' ? MM : 1, b = (format.bleed || 0) * k;
    return { k, bleed: b, w: format.w * k, h: format.h * k, W: format.w * k + 2 * b, H: format.h * k + 2 * b, folds: (format.folds || []).map(x => b + x * k) };
  }
  const sizeLabel = f => f.unit === 'mm' ? `${f.w} × ${f.h} mm` : `${f.w} × ${f.h} px`;

  /* ---------- templates ----------
   * element specs: x/y/w/h in fractions of the trim width/height, s (font size) in fractions of the trim width.
   * text values that start with '@' are translation keys (filled in by the editor). */
  const T = (id, format, pages, extra = {}) => Object.assign({ id, format, pages }, extra);
  const tx = (text, x, y, w, s, o = {}) => Object.assign({ t: 'text', text, x, y, w, s }, o);
  const rc = (x, y, w, h, fill, o = {}) => Object.assign({ t: 'rect', x, y, w, h, fill }, o);
  const ci = (x, y, d, fill, o = {}) => Object.assign({ t: 'circle', x, y, d, fill }, o);
  const fr = (x, y, w, h, o = {}) => Object.assign({ t: 'frame', x, y, w, h }, o);
  const grad = (a, b, angle = 135) => ({ type: 'linear', colors: [a, b], angle });
  const TEMPLATES = [
    T('course-post', 'ig-post', [{ bg: grad('#0FA3B1', '#2F6BEA'), els: [
      ci(.78, -.12, .55, '#ffffff', { opacity: .12 }), ci(-.15, .7, .5, '#ffffff', { opacity: .1 }),
      tx('@dz.tpl.newCourse', .08, .1, .84, .045, { font: 'Montserrat', weight: 700, color: '#ffffff', ls: 200, upper: true }),
      tx('@dz.tpl.germanForAll', .08, .2, .84, .11, { font: 'Montserrat', weight: 700, color: '#ffffff', lh: 1.05 }),
      rc(.08, .52, .5, .085, '#FFD43B', { rx: .04 }), tx('A1 · A2 · B1', .08, .535, .5, .045, { font: 'Montserrat', weight: 700, color: '#1B1F3B', align: 'center' }),
      tx('@dz.tpl.registerNow', .08, .78, .84, .04, { font: 'Inter', color: '#ffffff' }), tx('www.smyrna-pergamum.org', .08, .85, .84, .045, { font: 'Inter', weight: 700, color: '#ffffff' }),
    ] }], { cat: 'social' }),
    T('quote-post', 'ig-post', [{ bg: '#FFF8EC', els: [
      tx('“', .08, .02, .3, .35, { font: 'Playfair Display', weight: 700, color: '#EA6A2A' }),
      tx('@dz.tpl.quote', .1, .3, .8, .07, { font: 'Playfair Display', color: '#1B1F3B', lh: 1.2 }),
      rc(.1, .74, .12, .006, '#EA6A2A'), tx('@dz.tpl.quoteAuthor', .1, .77, .8, .04, { font: 'Inter', weight: 700, color: '#5A607F', ls: 100, upper: true }),
    ] }], { cat: 'social' }),
    T('event-story', 'ig-story', [{ bg: grad('#1B1F3B', '#7C4DDB', 160), els: [
      ci(.2, .06, .9, '#EA6A2A', { opacity: .35 }), fr(.1, .14, .8, .36, { shape: 'rounded' }),
      tx('@dz.tpl.event', .1, .55, .8, .12, { font: 'Bebas Neue', color: '#ffffff', lh: .95 }),
      tx('@dz.tpl.dateLine', .1, .7, .8, .05, { font: 'Inter', weight: 700, color: '#FFD43B' }),
      tx('@dz.tpl.placeLine', .1, .76, .8, .04, { font: 'Inter', color: '#ffffff' }),
      rc(.1, .86, .8, .06, '#ffffff', { rx: .03 }), tx('@dz.tpl.registerNow', .1, .873, .8, .04, { font: 'Montserrat', weight: 700, color: '#7C4DDB', align: 'center' }),
    ] }], { cat: 'social' }),
    T('yt-thumb', 'yt-thumb', [{ bg: '#FFD43B', els: [
      fr(.55, 0, .45, 1, { shape: 'rect' }), rc(0, 0, .58, 1, '#FFD43B'),
      tx('@dz.tpl.ytTitle', .05, .14, .5, .1, { font: 'Bebas Neue', color: '#1B1F3B', lh: .9 }),
      rc(.05, .74, .3, .12, '#D93A32', { rx: .02 }), tx('@dz.tpl.ytEpisode', .05, .76, .3, .045, { font: 'Montserrat', weight: 700, color: '#ffffff', align: 'center' }),
    ] }], { cat: 'social' }),
    T('event-poster', 'poster-a3', [{ bg: '#1B1F3B', els: [
      fr(0, 0, 1, .52, { shape: 'rect' }), rc(0, .5, 1, .5, '#1B1F3B'), rc(.08, .55, .2, .008, '#FFD43B'),
      tx('@dz.tpl.event', .08, .58, .84, .14, { font: 'Bebas Neue', color: '#ffffff', lh: .9 }),
      tx('@dz.tpl.posterText', .08, .73, .84, .03, { font: 'Inter', color: '#C9CEE6', lh: 1.4 }),
      tx('@dz.tpl.dateLine', .08, .85, .55, .04, { font: 'Montserrat', weight: 700, color: '#FFD43B' }),
      tx('@dz.tpl.placeLine', .08, .9, .55, .028, { font: 'Inter', color: '#ffffff' }),
      { t: 'qr', x: .74, y: .83, w: .18, text: 'https://www.smyrna-pergamum.org' },
    ] }], { cat: 'print' }),
    T('course-flyer', 'flyer-a5', [{ bg: '#ffffff', els: [
      rc(0, 0, 1, .38, '#0FA3B1'), ci(.75, -.15, .6, '#ffffff', { opacity: .12 }),
      tx('@dz.tpl.newCourse', .08, .07, .84, .04, { font: 'Montserrat', weight: 700, color: '#ffffff', ls: 200, upper: true }),
      tx('@dz.tpl.germanForAll', .08, .13, .84, .1, { font: 'Montserrat', weight: 700, color: '#ffffff', lh: 1.05 }),
      fr(.08, .42, .84, .25, { shape: 'rounded' }),
      tx('@dz.tpl.flyerList', .08, .7, .84, .038, { font: 'Inter', color: '#1B1F3B', lh: 1.6 }),
      rc(0, .9, 1, .1, '#1B1F3B'), tx('www.smyrna-pergamum.org', .08, .925, .84, .04, { font: 'Inter', weight: 700, color: '#ffffff', align: 'center' }),
    ] }], { cat: 'print' }),
    T('magazine-cover', 'magazine', [{ bg: '#ffffff', els: [
      fr(0, 0, 1, 1, { shape: 'rect' }),
      tx('@dz.tpl.magName', .05, .03, .9, .2, { font: 'Abril Fatface', color: '#D93A32', align: 'center', lh: .9 }),
      tx('@dz.tpl.magIssue', .05, .25, .9, .025, { font: 'Inter', weight: 700, color: '#ffffff', align: 'center', ls: 300, upper: true }),
      tx('@dz.tpl.magHeadline', .06, .66, .6, .075, { font: 'Playfair Display', weight: 700, color: '#ffffff', lh: 1 }),
      tx('@dz.tpl.magTeaser', .06, .86, .6, .028, { font: 'Inter', color: '#ffffff', lh: 1.4 }),
    ] }], { cat: 'print' }),
    T('book-cover', 'book-front', [{ bg: grad('#12343B', '#0FA3B1', 180), els: [
      ci(.5, .38, .7, '#FFD43B', { opacity: .9 }),
      tx('@dz.tpl.bookTitle', .08, .1, .84, .12, { font: 'Playfair Display', weight: 700, color: '#ffffff', align: 'center', lh: 1.05 }),
      tx('@dz.tpl.bookSub', .08, .74, .84, .045, { font: 'Lora', color: '#E2F7F8', align: 'center' }),
      tx('@dz.tpl.author', .08, .88, .84, .055, { font: 'Montserrat', weight: 700, color: '#ffffff', align: 'center', ls: 200, upper: true }),
    ] }], { cat: 'print' }),
    T('zfold-brochure', 'zfold', [
      { bg: '#ffffff', els: [
        rc(0, 0, 1 / 3, 1, '#F4F6FA'), tx('@dz.tpl.contact', .03, .1, .27, .02, { font: 'Montserrat', weight: 700, color: '#0FA3B1', upper: true, ls: 150 }),
        tx('@dz.tpl.contactText', .03, .16, .27, .015, { font: 'Inter', color: '#1B1F3B', lh: 1.6 }),
        tx('@dz.tpl.aboutUs', .37, .1, .27, .02, { font: 'Montserrat', weight: 700, color: '#0FA3B1', upper: true, ls: 150 }),
        tx('@dz.tpl.lorem', .37, .16, .27, .014, { font: 'Inter', color: '#1B1F3B', lh: 1.6 }),
        rc(2 / 3, 0, 1 / 3, 1, '#0FA3B1'), fr(.7, .1, .27, .4, { shape: 'rounded' }),
        tx('@dz.tpl.germanForAll', .7, .56, .27, .04, { font: 'Montserrat', weight: 700, color: '#ffffff', lh: 1.05 }),
        tx('www.smyrna-pergamum.org', .7, .88, .27, .016, { font: 'Inter', weight: 700, color: '#ffffff' }),
      ] },
      { bg: '#ffffff', els: [
        tx('@dz.tpl.panel1', .03, .08, .27, .025, { font: 'Montserrat', weight: 700, color: '#1B1F3B' }), tx('@dz.tpl.lorem', .03, .16, .27, .014, { font: 'Inter', color: '#5A607F', lh: 1.6 }),
        fr(.37, .08, .27, .35, { shape: 'rounded' }), tx('@dz.tpl.panel2', .37, .47, .27, .025, { font: 'Montserrat', weight: 700, color: '#1B1F3B' }), tx('@dz.tpl.lorem', .37, .54, .27, .014, { font: 'Inter', color: '#5A607F', lh: 1.6 }),
        tx('@dz.tpl.panel3', .7, .08, .27, .025, { font: 'Montserrat', weight: 700, color: '#1B1F3B' }), tx('@dz.tpl.flyerList', .7, .16, .27, .016, { font: 'Inter', color: '#5A607F', lh: 1.7 }),
      ] },
    ], { cat: 'print' }),
    T('bifold-brochure', 'bifold', [
      { bg: '#ffffff', els: [rc(.5, 0, .5, 1, '#7C4DDB'), tx('@dz.tpl.germanForAll', .55, .3, .4, .06, { font: 'Montserrat', weight: 700, color: '#ffffff', lh: 1.05 }), tx('@dz.tpl.contactText', .05, .6, .4, .018, { font: 'Inter', color: '#1B1F3B', lh: 1.6 })] },
      { bg: '#ffffff', els: [tx('@dz.tpl.aboutUs', .05, .08, .4, .03, { font: 'Montserrat', weight: 700, color: '#7C4DDB' }), tx('@dz.tpl.lorem', .05, .16, .4, .016, { font: 'Inter', color: '#1B1F3B', lh: 1.6 }), fr(.55, .08, .4, .84, { shape: 'rounded' })] },
    ], { cat: 'print' }),
    T('invitation', 'invitation-a6', [
      { bg: '#FFF8EC', els: [
        rc(.06, .04, .88, .92, null, { stroke: '#C9A27A', sw: .006 }), tx('@dz.tpl.invite', .1, .12, .8, .06, { font: 'Montserrat', weight: 700, color: '#C9A27A', align: 'center', ls: 300, upper: true }),
        tx('@dz.tpl.inviteTitle', .1, .25, .8, .13, { font: 'Dancing Script', weight: 700, color: '#1B1F3B', align: 'center', lh: 1 }),
        tx('@dz.tpl.dateLine', .1, .62, .8, .05, { font: 'Inter', weight: 700, color: '#1B1F3B', align: 'center' }), tx('@dz.tpl.placeLine', .1, .7, .8, .04, { font: 'Inter', color: '#5A607F', align: 'center' }),
      ] },
      { bg: '#FFF8EC', els: [tx('@dz.tpl.rsvp', .1, .4, .8, .045, { font: 'Inter', color: '#1B1F3B', align: 'center', lh: 1.5 }), { t: 'qr', x: .35, y: .6, w: .3, text: 'https://www.smyrna-pergamum.org' }] },
    ], { cat: 'print' }),
    T('bizcard', 'bizcard', [
      { bg: '#1B1F3B', els: [tx('smyrna-pergamum', .1, .3, .8, .12, { font: 'Montserrat', weight: 700, color: '#ffffff', align: 'center' }), rc(.42, .6, .16, .012, '#0FA3B1'), tx('www.smyrna-pergamum.org', .1, .68, .8, .045, { font: 'Inter', color: '#C9CEE6', align: 'center' })] },
      { bg: '#ffffff', els: [rc(0, 0, .03, 1, '#0FA3B1'), tx('@dz.tpl.cardName', .1, .14, .8, .075, { font: 'Montserrat', weight: 700, color: '#1B1F3B' }), tx('@dz.tpl.cardRole', .1, .3, .8, .045, { font: 'Inter', color: '#0FA3B1' }), tx('@dz.tpl.cardContact', .1, .55, .8, .04, { font: 'Inter', color: '#1B1F3B', lh: 1.5 })] },
    ], { cat: 'print' }),
    T('newyear-card', 'postcard', [
      { bg: grad('#0B1D3A', '#1B3B6F', 160), els: [
        ci(.1, .15, .02, '#FFD43B'), ci(.85, .2, .015, '#ffffff'), ci(.7, .1, .01, '#FFD43B'), ci(.3, .08, .012, '#ffffff'), ci(.92, .7, .02, '#FFD43B'),
        tx('@dz.tpl.happyNewYear', .08, .25, .84, .1, { font: 'Dancing Script', weight: 700, color: '#FFD43B', align: 'center', lh: 1 }),
        tx(String(new Date().getFullYear() + 1), .08, .5, .84, .16, { font: 'Bebas Neue', color: '#ffffff', align: 'center' }),
        tx('@dz.tpl.newYearWish', .08, .8, .84, .03, { font: 'Inter', color: '#C9CEE6', align: 'center' }),
      ] },
      { bg: '#ffffff', els: [rc(.5, .08, .002, .84, '#C9CEE6'), tx('@dz.tpl.cardBack', .05, .1, .4, .03, { font: 'Caveat', color: '#1B1F3B', lh: 1.4 })] },
    ], { cat: 'print' }),
    T('birthday-card', 'postcard', [{ bg: '#FFF1F5', els: [
      ci(.08, .15, .12, '#FF8FB1', { opacity: .8 }), ci(.9, .25, .1, '#FFD43B', { opacity: .8 }), ci(.85, .85, .14, '#7C4DDB', { opacity: .5 }), ci(.12, .85, .08, '#0FA3B1', { opacity: .6 }),
      tx('@dz.tpl.happyBirthday', .1, .28, .8, .1, { font: 'Pacifico', color: '#D6338A', align: 'center', lh: 1.1 }),
      tx('@dz.tpl.birthdayWish', .15, .68, .7, .035, { font: 'Nunito', weight: 700, color: '#1B1F3B', align: 'center' }),
    ] }], { cat: 'print' }),
    T('congrats-card', 'postcard', [{ bg: '#EEF6EE', els: [
      rc(.04, .06, .92, .88, null, { stroke: '#1E9E5A', sw: .004, rx: .03 }),
      tx('@dz.tpl.congrats', .1, .3, .8, .09, { font: 'Lobster', color: '#1E9E5A', align: 'center' }),
      tx('@dz.tpl.congratsWish', .15, .58, .7, .035, { font: 'Lora', color: '#1B1F3B', align: 'center', lh: 1.4 }),
    ] }], { cat: 'print' }),
    T('sticker', 'sticker-round', [{ bg: '#FFD43B', els: [
      ci(.5, .5, .86, '#1B1F3B'), tx('@dz.tpl.sticker', .15, .32, .7, .13, { font: 'Bebas Neue', color: '#FFD43B', align: 'center', lh: .95 }), tx('smyrna-pergamum', .15, .66, .7, .07, { font: 'Montserrat', weight: 700, color: '#ffffff', align: 'center' }),
    ] }], { cat: 'print' }),
    T('certificate', 'certificate', [{ bg: '#ffffff', els: [
      rc(.03, .04, .94, .92, null, { stroke: '#0FA3B1', sw: .004 }), rc(.045, .065, .91, .87, null, { stroke: '#C9A27A', sw: .0015 }),
      tx('@dz.tpl.certificate', .1, .12, .8, .06, { font: 'Playfair Display', weight: 700, color: '#1B1F3B', align: 'center', ls: 200, upper: true }),
      tx('@dz.tpl.certFor', .1, .3, .8, .02, { font: 'Inter', color: '#5A607F', align: 'center' }),
      tx('@dz.tpl.cardName', .1, .36, .8, .055, { font: 'Dancing Script', weight: 700, color: '#0FA3B1', align: 'center' }),
      tx('@dz.tpl.certText', .15, .52, .7, .018, { font: 'Inter', color: '#1B1F3B', align: 'center', lh: 1.5 }),
      rc(.15, .8, .25, .002, '#1B1F3B'), tx('@dz.tpl.signature', .15, .82, .25, .014, { font: 'Inter', color: '#5A607F', align: 'center' }),
      rc(.6, .8, .25, .002, '#1B1F3B'), tx('@dz.tpl.date', .6, .82, .25, .014, { font: 'Inter', color: '#5A607F', align: 'center' }),
    ] }], { cat: 'print' }),
  ];

  /* ---------- PDF writer ----------
   * pages: [{ jpeg: Uint8Array, px: [w,h], size: [wPt,hPt], img: [x,y,w,h] (pt, from bottom-left), trim: [x,y,w,h], bleed: [x,y,w,h], lines: [[x1,y1,x2,y2]] }] */
  function pdf(pages, title = 'Office Werkstatt') {
    const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
    const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); if (Array.isArray(body)) body.forEach(push); else push(body); push('\nendobj\n'); };
    const n = (v) => (Math.round(v * 100) / 100).toString();
    const esc = s => String(s).replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, '?');
    push('%PDF-1.4\n'); push(new Uint8Array([37, 226, 227, 207, 211, 10])); // header + binary marker
    const kids = pages.map((_, i) => 4 + i * 3);
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Count ${pages.length} /Kids [${kids.map(k => k + ' 0 R').join(' ')}] >>`);
    const u16 = s => '<FEFF' + Array.from(String(s)).map(ch => { const c = ch.codePointAt(0); return c > 0xffff ? [0xd800 + ((c - 0x10000) >> 10), 0xdc00 + ((c - 0x10000) & 0x3ff)] : [c]; }).flat().map(c => c.toString(16).padStart(4, '0')).join('') + '>';
    obj(3, `<< /Producer (Office Werkstatt - Design Werkzeug) /Title ${u16(title)} >>`);
    pages.forEach((p, i) => {
      const pn = 4 + i * 3, cn = pn + 1, im = pn + 2;
      const box = b => b ? `[${b.map((v, j) => n(j < 2 ? v : v + b[j - 2])).join(' ')}]` : null;
      let stream = `q ${n(p.img[2])} 0 0 ${n(p.img[3])} ${n(p.img[0])} ${n(p.img[1])} cm /Im0 Do Q\n`;
      if (p.lines && p.lines.length) stream += '0.25 w 0 0 0 RG\n' + p.lines.map(l => `${n(l[0])} ${n(l[1])} m ${n(l[2])} ${n(l[3])} l S`).join('\n') + '\n';
      obj(pn, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(p.size[0])} ${n(p.size[1])}]${p.trim ? ' /TrimBox ' + box(p.trim) : ''}${p.bleed ? ' /BleedBox ' + box(p.bleed) : ''} /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${cn} 0 R >>`);
      const sb = enc.encode(stream);
      obj(cn, [`<< /Length ${sb.length} >>\nstream\n`, sb, '\nendstream']);
      obj(im, [`<< /Type /XObject /Subtype /Image /Width ${p.px[0]} /Height ${p.px[1]} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, '\nendstream']);
    });
    const xref = len, count = 4 + pages.length * 3;
    let x = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (let i = 1; i < count; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }
  /* crop marks around a trim box (pt): 4 corners × 2 lines, kept out of the bleed */
  function cropMarks(tx, ty, tw, th, bleed, len) {
    const o = bleed + 2, L = [];
    [[tx, ty], [tx + tw, ty], [tx, ty + th], [tx + tw, ty + th]].forEach(([x, y], i) => {
      const sx = i % 2 ? 1 : -1, sy = i < 2 ? -1 : 1;
      L.push([x + sx * o, y, x + sx * (o + len), y], [x, y + sy * o, x, y + sy * (o + len)]);
    });
    return L;
  }

  OW.design = { MM, FORMATS, CATS, TEMPLATES, fmt, geom, sizeLabel, pdf, cropMarks };
  if (typeof module === 'object' && module.exports) module.exports = OW.design;
})(typeof window !== 'undefined' ? window : globalThis);
