/* Office Werkstatt – stock media providers (shared by the Design Werkzeug and the server)
 * Each provider turns a search into an HTTP request and the answer into a common item list:
 *   { id, kind, title, thumb, src, w, h, duration, author, authorUrl, license, sourceUrl, provider, track }
 * Keys are kept on the Office Werkstatt server (or, without a server, in this browser).
 * Openverse and Iconify work without a key. */
(function (root) {
  const OW = root.OW = root.OW || {};
  const q = o => Object.keys(o).filter(k => o[k] !== undefined && o[k] !== '').map(k => k + '=' + encodeURIComponent(o[k])).join('&');
  const PER = 30;
  const P = {
    openverse: {
      name: 'Openverse', site: 'https://openverse.org', kinds: ['photo', 'illustration', 'audio'], key: false,
      license: 'CC / Public Domain',
      request(kind, query, page) {
        if (kind === 'audio') return { url: 'https://api.openverse.org/v1/audio/?' + q({ q: query, page, page_size: PER }) };
        return { url: 'https://api.openverse.org/v1/images/?' + q({ q: query, page, page_size: PER, category: kind === 'illustration' ? 'illustration,digitized_artwork' : 'photograph' }) };
      },
      parse(j, kind) {
        return (j.results || []).map(r => ({ id: 'ov-' + r.id, kind, title: r.title || '', thumb: r.thumbnail || r.url, src: kind === 'audio' ? r.url : (r.thumbnail ? r.thumbnail.replace(/\/thumb\/?$/, '/thumb/') + '?full_size=true' : r.url),
          original: r.url, w: r.width, h: r.height, duration: r.duration ? r.duration / 1000 : undefined, author: r.creator || '', authorUrl: r.creator_url || '',
          license: ((r.license || '').toUpperCase() + ' ' + (r.license_version || '')).trim(), sourceUrl: r.foreign_landing_url || '', provider: 'openverse' }));
      },
    },
    iconify: {
      name: 'Iconify', site: 'https://iconify.design', kinds: ['icon'], key: false, license: 'Open Source (MIT / Apache / CC)',
      request(kind, query, page) { return { url: 'https://api.iconify.design/search?' + q({ query, limit: 96, start: (page - 1) * 96 }) }; },
      parse(j) {
        return (j.icons || []).map(n => { const [pre, name] = n.split(':'); const src = `https://api.iconify.design/${pre}/${name}.svg`;
          return { id: 'ic-' + n, kind: 'icon', title: name.replace(/-/g, ' '), thumb: src, src, svg: true, author: (j.collections && j.collections[pre] && j.collections[pre].name) || pre,
            license: (j.collections && j.collections[pre] && j.collections[pre].license && j.collections[pre].license.title) || 'Open Source', sourceUrl: `https://icon-sets.iconify.design/${pre}/${name}/`, provider: 'iconify' }; });
      },
    },
    pexels: {
      name: 'Pexels', site: 'https://www.pexels.com/api/', kinds: ['photo'], key: true, license: 'Pexels License',
      request(kind, query, page, key) { return { url: 'https://api.pexels.com/v1/search?' + q({ query, page, per_page: PER }), headers: { Authorization: key } }; },
      parse(j) {
        return (j.photos || []).map(p => ({ id: 'px-' + p.id, kind: 'photo', title: p.alt || '', thumb: p.src.medium, src: p.src.large2x || p.src.large, w: p.width, h: p.height,
          author: p.photographer, authorUrl: p.photographer_url, license: 'Pexels License', sourceUrl: p.url, provider: 'pexels' }));
      },
    },
    pixabay: {
      name: 'Pixabay', site: 'https://pixabay.com/api/docs/', kinds: ['photo', 'illustration'], key: true, license: 'Pixabay Content License',
      request(kind, query, page, key) { return { url: 'https://pixabay.com/api/?' + q({ key, q: query, page, per_page: PER, image_type: kind === 'illustration' ? 'illustration' : 'photo', safesearch: 'true' }) }; },
      parse(j, kind) {
        return (j.hits || []).map(h => ({ id: 'pb-' + h.id, kind, title: h.tags || '', thumb: h.webformatURL || h.previewURL, src: h.largeImageURL || h.webformatURL, w: h.imageWidth, h: h.imageHeight,
          author: h.user, authorUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`, license: 'Pixabay Content License', sourceUrl: h.pageURL, provider: 'pixabay' }));
      },
    },
    unsplash: {
      name: 'Unsplash', site: 'https://unsplash.com/developers', kinds: ['photo'], key: true, license: 'Unsplash License',
      request(kind, query, page, key) { return { url: 'https://api.unsplash.com/search/photos?' + q({ query, page, per_page: PER }), headers: { Authorization: 'Client-ID ' + key } }; },
      parse(j) {
        return (j.results || []).map(p => ({ id: 'us-' + p.id, kind: 'photo', title: p.alt_description || p.description || '', thumb: p.urls.small, src: p.urls.regular, w: p.width, h: p.height,
          author: p.user && p.user.name, authorUrl: p.user && p.user.links && p.user.links.html + '?utm_source=office_werkstatt&utm_medium=referral', license: 'Unsplash License',
          sourceUrl: p.links && p.links.html, provider: 'unsplash', track: p.links && p.links.download_location }));
      },
    },
    freesound: {
      name: 'Freesound', site: 'https://freesound.org/apiv2/apply/', kinds: ['audio'], key: true, license: 'CC',
      request(kind, query, page, key) { return { url: 'https://freesound.org/apiv2/search/text/?' + q({ query, page, page_size: PER, token: key, fields: 'id,name,username,license,duration,url,previews' }) }; },
      parse(j) {
        return (j.results || []).map(s => ({ id: 'fs-' + s.id, kind: 'audio', title: s.name, src: s.previews && (s.previews['preview-hq-mp3'] || s.previews['preview-lq-mp3']), duration: s.duration,
          author: s.username, authorUrl: 'https://freesound.org/people/' + encodeURIComponent(s.username) + '/', license: (s.license || '').replace(/^https?:\/\/creativecommons\.org\/(licenses|publicdomain)\//, 'CC ').replace(/\/$/, ''),
          sourceUrl: s.url, provider: 'freesound' }));
      },
    },
    jamendo: {
      name: 'Jamendo', site: 'https://devportal.jamendo.com/', kinds: ['audio'], key: true, license: 'CC',
      request(kind, query, page, key) { return { url: 'https://api.jamendo.com/v3.0/tracks/?' + q({ client_id: key, format: 'json', limit: PER, offset: (page - 1) * PER, search: query, audioformat: 'mp32', include: 'licenses' }) }; },
      parse(j) {
        return (j.results || []).map(t => ({ id: 'jm-' + t.id, kind: 'audio', music: true, title: t.name, thumb: t.image, src: t.audio, duration: t.duration, author: t.artist_name,
          authorUrl: t.shareurl, license: (t.license_ccurl || '').replace(/^https?:\/\/creativecommons\.org\/licenses\//, 'CC ').replace(/\/$/, ''), sourceUrl: t.shareurl, provider: 'jamendo' }));
      },
    },
  };
  const KINDS = ['photo', 'illustration', 'icon', 'audio'];
  const forKind = kind => Object.keys(P).filter(id => P[id].kinds.includes(kind));
  /* hosts the media proxy may fetch from (images / audio of the providers above) */
  const MEDIA_HOSTS = [/(^|\.)openverse\.org$/, /(^|\.)iconify\.design$/, /(^|\.)pexels\.com$/, /(^|\.)pixabay\.com$/, /(^|\.)unsplash\.com$/, /(^|\.)freesound\.org$/,
    /(^|\.)jamendo\.com$/, /(^|\.)flickr\.com$/, /(^|\.)staticflickr\.com$/, /(^|\.)wikimedia\.org$/, /(^|\.)wikipedia\.org$/, /(^|\.)ccmixter\.org$/, /(^|\.)archive\.org$/];
  const credit = it => [it.title, it.author && ('© ' + it.author), it.license, it.provider && P[it.provider] ? P[it.provider].name : ''].filter(Boolean).join(' · ');

  OW.stock = { PROVIDERS: P, KINDS, forKind, MEDIA_HOSTS, credit };
  if (typeof module === 'object' && module.exports) module.exports = OW.stock;
})(typeof window !== 'undefined' ? window : globalThis);
