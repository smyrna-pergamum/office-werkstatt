/* AI Werkzeug – a full-page assistant; each chat is a document in the library (type "ai") */
OW.editors.ai = async function (ctx) {
  const t = ctx.t;
  let chat = ctx.file.content && Array.isArray(ctx.file.content.items) ? ctx.file.content : null, panel = null;
  return {
    chrome: 'engine',                       // its own interface: only the title bar of Office Werkstatt
    ribbon: () => [{ id: 'start', label: t('tab.home'), groups: [] }],
    mount(body) {
      body.innerHTML = '<div class="ai-wz"><div></div></div>';
      panel = OW.aiPanel(body.firstChild.firstChild, {
        page: true,
        store: {
          load: () => chat,
          save: c => {
            chat = c; ctx.markDirty();
            // the first question names a new chat
            const n = ctx.root.querySelector('.ed-name');
            if (c.title && n && n.value.startsWith(t('untitled.ai'))) { n.value = c.title.slice(0, 60); n.dispatchEvent(new Event('input')); }
          },
        },
      });
      setTimeout(() => panel.focus(), 50);
      if (OW.aiPending) { const q = OW.aiPending; OW.aiPending = null; setTimeout(() => panel.ask(q), 150); }   // asked on the AI start screen
    },
    getContent: () => chat || { items: [], api: [], mode: 'chat' },
    status: () => ({ left: OW.ai.cfg().provider === 'ollama' ? 'Ollama' : t('ai.api'), right: '' }),
    onTheme() {},
  };
};
