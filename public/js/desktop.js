/* Office Werkstatt – desktop app (Electron) integration for printing.
 *
 * In the desktop app window.print() hangs the whole window (Electron + the Windows 11 print dialog):
 * no dialog appears and the app can no longer be used or closed. So inside the desktop app every
 * print() call – of the app itself, of the PDF Werkstatt engine and of the Werkzeug Pro engines,
 * including their hidden print iframes – is redirected: the content that is to be printed is copied
 * at that moment and printed by the main process from a hidden window, which opens the normal
 * system print dialog and never blocks the page.
 * In a normal browser this file does nothing. */
window.OW = window.OW || {};
(function () {
  const D = window.owDesktop;
  if (!D || typeof D.printHTML !== 'function') return;
  const t = k => (OW.t ? OW.t(k) : k);
  const toast = (m, k) => { try { OW.toast && OW.toast(m, k); } catch { /* app not ready */ } };
  let lastPrint = 0;   // guards against double clicks only – a lost print job must never block printing

  const blobToDataURL = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });
  const fire = (win, type) => { try { win.dispatchEvent(new win.Event(type)); } catch { /* ignore */ } };

  /* a static copy of what the window shows, including canvases and blob: images */
  async function snapshot(win) {
    const doc = win.document, root = doc.documentElement.cloneNode(true);
    const live = doc.querySelectorAll('canvas'), copies = root.querySelectorAll('canvas');
    live.forEach((c, i) => {
      const cp = copies[i]; if (!cp) return;
      try {
        const img = doc.createElement('img'); img.className = cp.className;
        img.setAttribute('style', cp.getAttribute('style') || '');
        if (!img.style.width) img.style.width = (c.clientWidth || c.width) + 'px';
        if (!img.style.height) img.style.height = (c.clientHeight || c.height) + 'px';
        img.src = c.toDataURL('image/png'); cp.replaceWith(img);
      } catch { cp.remove(); }
    });
    // form fields: the current values are not attributes
    const liveIn = doc.querySelectorAll('input,textarea,select'), copyIn = root.querySelectorAll('input,textarea,select');
    liveIn.forEach((el, i) => { const cp = copyIn[i]; if (!cp) return; if (el.localName === 'textarea') cp.textContent = el.value; else if (el.localName === 'select') { const o = cp.options[el.selectedIndex]; if (o) o.setAttribute('selected', ''); } else if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) cp.setAttribute('checked', ''); } else cp.setAttribute('value', el.value); });
    root.querySelectorAll('script,noscript,iframe,object,embed').forEach(n => n.remove());
    await Promise.all(Array.from(root.querySelectorAll('img[src^="blob:"]')).map(async img => {
      try { img.setAttribute('src', await blobToDataURL(await (await win.fetch(img.getAttribute('src'))).blob())); } catch { /* leave it */ }
    }));
    // styles added from JavaScript (insertRule / adoptedStyleSheets) are not in the markup
    let extra = '';
    try { for (const sh of [...doc.styleSheets, ...(doc.adoptedStyleSheets || [])]) { if (sh.ownerNode && sh.ownerNode.localName === 'link') continue; const txt = sh.ownerNode ? sh.ownerNode.textContent : ''; const rules = Array.from(sh.cssRules || []).map(r => r.cssText).join('\n'); if (rules && rules.length > txt.length + 20) extra += rules + '\n'; } } catch { /* cross-origin sheet */ }
    let head = root.querySelector('head'); if (!head) { head = doc.createElement('head'); root.prepend(head); }
    root.querySelectorAll('base').forEach(b => b.remove());
    const base = doc.createElement('base'); base.href = doc.baseURI; head.prepend(base);
    if (extra) { const st = doc.createElement('style'); st.textContent = extra; head.appendChild(st); }
    return '<!doctype html>\n' + root.outerHTML;
  }

  async function printWindow(win) {
    if (Date.now() - lastPrint < 1500) return;
    lastPrint = Date.now(); fire(win, 'beforeprint');
    try {
      const html = await snapshot(win);
      toast(t('print.opening'));
      const r = await D.printHTML(html);
      if (r && r.ok === false && r.why && !/cancel/i.test(r.why)) toast(t('print.failed') + ': ' + r.why, 'warn');
    } catch (e) { console.error(e); toast(t('print.failed'), 'warn'); }
    finally { fire(win, 'afterprint'); }
  }

  /* replace print() in this window and in every same-origin iframe, now and later */
  const hooked = new WeakSet();
  function patch(win) {
    let doc; try { doc = win && win.document; } catch { return; /* cross-origin */ }
    if (!doc) return;
    try { Object.defineProperty(win, 'print', { configurable: true, writable: true, value: function () { printWindow(win); } }); } catch { /* ignore */ }
    if (hooked.has(doc)) return; hooked.add(doc);
    const hook = f => { f.addEventListener('load', () => patch(f.contentWindow)); patch(f.contentWindow); };
    doc.querySelectorAll('iframe').forEach(hook);
    try {
      new win.MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType !== 1) continue; if (n.localName === 'iframe') hook(n); else if (n.querySelectorAll) n.querySelectorAll('iframe').forEach(hook); } })
        .observe(doc, { childList: true, subtree: true });
    } catch { /* ignore */ }
  }
  patch(window);
  OW.printWindow = printWindow;
})();
