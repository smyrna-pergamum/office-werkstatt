/* Office Werkstatt – HTML sanitizer (allow-list).
 * Every piece of document HTML that comes from a file, an import or the server goes through
 * OW.sanitizeHTML() before it is put into the page, so a crafted .html/.owdoc/.docx or a document
 * saved by someone else on a shared server cannot run code (no scripts, no on* handlers,
 * no javascript: URLs, no frames/forms/embeds).
 *   OW.sanitizeHTML(html)               rich text (Word / Note)
 *   OW.sanitizeHTML(html, { svg: true }) also simple SVG shapes (slides, ink) */
window.OW = window.OW || {};
(function () {
  const TEXT = 'a abbr address article aside b bdi bdo big blockquote br caption center cite code col colgroup dd del details dfn div dl dt em figcaption figure font footer h1 h2 h3 h4 h5 h6 header hr i img ins kbd label li main mark nav ol p pre q rp rt ruby s samp section small span strike strong sub summary sup table tbody td tfoot th thead time tr tt u ul var wbr';
  const SVG = 'svg g path rect circle ellipse line polyline polygon text tspan defs lineargradient radialgradient stop';
  const ALLOWED = new Set(TEXT.split(' ')), ALLOWED_SVG = new Set(SVG.split(' '));
  // dropped together with their content
  const DROP = new Set('script style iframe frame frameset object embed applet form input button textarea select option link meta base template noscript noembed noframes math audio video source track canvas portal xmp plaintext title head'.split(' '));
  const ATTRS = new Set(('align alt bgcolor border cellpadding cellspacing class color colspan cols contenteditable dir face headers height href hreflang lang ' +
    'rowspan rows scope size span src start style summary title type valign width value datetime cite reversed open').split(' '));
  const SVG_ATTRS = new Set(('viewbox width height x y x1 y1 x2 y2 cx cy r rx ry d points fill stroke stroke-width stroke-linecap stroke-linejoin stroke-dasharray ' +
    'opacity fill-opacity stroke-opacity transform font-size font-family font-weight text-anchor dominant-baseline offset stop-color stop-opacity class style preserveaspectratio xmlns').split(' '));
  const SAFE_URL = /^(?:https?:|mailto:|tel:|#|\/|\.{0,2}\/|[^:]*$)/i;          // relative or harmless schemes
  const SAFE_IMG = /^(?:data:image\/(?:png|jpe?g|gif|webp|bmp|avif|svg\+xml);|blob:|https?:|\/|\.{0,2}\/|[^:]*$)/i;
  const BAD_CSS = /expression\s*\(|javascript:|vbscript:|@import|behavior\s*:|-moz-binding|url\s*\(\s*['"]?\s*(?!data:image\/)/i;

  function cleanAttrs(el, svg) {
    const tag = el.localName.toLowerCase();
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase(), v = a.value;
      let ok = n.startsWith('data-') ? /^data-[a-z0-9_.-]+$/.test(n) : (svg ? SVG_ATTRS.has(n) : ATTRS.has(n));
      if (ok && n === 'href') ok = SAFE_URL.test(v.replace(/[\u0000- ]/g, ''));
      if (ok && n === 'src') ok = tag === 'img' && SAFE_IMG.test(v.replace(/[\u0000- ]/g, ''));
      if (ok && n === 'style') ok = !BAD_CSS.test(v);
      if (ok && (svg || tag !== 'a') && /^\s*(?:javascript|vbscript|data):/i.test(v) && n !== 'src') ok = false;
      if (!ok) el.removeAttribute(a.name);
    }
    if (tag === 'a' && el.hasAttribute('href')) { el.setAttribute('rel', 'noopener noreferrer'); el.removeAttribute('target'); }
  }

  function walk(node, opt, inSvg) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 8) { child.remove(); continue; }            // comments
      if (child.nodeType !== 1) continue;
      const tag = child.localName.toLowerCase();
      const svgCtx = inSvg || tag === 'svg';
      if (DROP.has(tag) || tag === 'foreignobject' || tag === 'use' || tag === 'animate' || tag === 'set' || (svgCtx && !opt.svg)) { child.remove(); continue; }
      if (svgCtx ? !ALLOWED_SVG.has(tag) : !ALLOWED.has(tag)) {           // unknown element: keep its text, drop the tag
        walk(child, opt, svgCtx);
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      cleanAttrs(child, svgCtx);
      walk(child, opt, svgCtx);
    }
  }

  OW.sanitizeHTML = function (html, opt = {}) {
    if (html == null || html === '') return '';
    // <template> content is inert: nothing loads or runs while we clean it
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html);
    walk(tpl.content, opt, false);
    return tpl.innerHTML;
  };
})();
