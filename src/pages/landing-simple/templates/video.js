/**
 * Reconoce un enlace de video y devuelve con qué dibujarlo.
 *
 * El comercio pega la URL que tiene a mano — la de la barra del navegador,
 * la de "Compartir", un youtu.be, un Short, un Reel — y no tiene por qué
 * saber cuál de todas sirve para incrustar. Acá se traducen todas a la
 * forma que el navegador puede reproducir.
 *
 * Lo que NO se reconoce no es un error: se trata como un enlace común que
 * se abre en otra pestaña. Instagram, TikTok y X no permiten incrustar sin
 * su script (y ese script rastrea al visitante), así que se enlazan.
 *
 * @returns {{plataforma, id, embed, miniatura, url, incrustable, tipo}|null}
 */
export function analizarVideo(url) {
  let limpio = String(url || '').trim();
  if (!limpio) return null;

  if (limpio.includes('<iframe') && limpio.includes('src=')) {
    const src = limpio.match(/src=["']([^"']+)["']/i)?.[1];
    if (src) limpio = src;
  }

  let u;
  try {
    // Sin esquema, `new URL` falla: el comercio pega "youtube.com/watch?v=…"
    // tanto como la URL completa.
    u = new URL(/^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, '').toLowerCase();

  // `new URL` acepta cualquier cosa como host: "sdfsdf" se vuelve
  // "https://sdfsdf" sin fallar. Sin este corte, un título mal pegado en el
  // campo de link se dibujaba como un enlace roto que no lleva a ningún
  // lado. Un dominio de verdad tiene al menos un punto.
  if (!host.includes('.')) return null;

  // ── YouTube ────────────────────────────────────────────────────────
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    if (id) return youtube(id, u);
  }
  if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
    const id = u.searchParams.get('v')
      || u.pathname.match(/\/(?:embed|v|shorts|live)\/([^/?#]+)/)?.[1];
    if (id) return youtube(id, u);
  }

  // ── Vimeo ──────────────────────────────────────────────────────────
  if (host.endsWith('vimeo.com')) {
    const id = u.pathname.split('/').filter(Boolean).find(p => /^\d+$/.test(p));
    if (id) {
      return {
        plataforma: 'vimeo',
        id,
        // Vimeo no expone una miniatura por URL directa (hace falta su API),
        // así que la portada la pone el comercio con el campo de imagen.
        embed: `https://player.vimeo.com/video/${id}`,
        miniatura: null,
        url: u.href,
        incrustable: true,
        tipo: 'iframe',
      };
    }
  }

  // ── Google Drive ───────────────────────────────────────────────────
  if (host === 'drive.google.com') {
    const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1]
      || u.searchParams.get('id');
    if (id) {
      return {
        plataforma: 'drive',
        id,
        embed: `https://drive.google.com/file/d/${id}/preview`,
        miniatura: null,
        url: u.href,
        incrustable: true,
        tipo: 'iframe',
      };
    }
  }

  // ── Loom ───────────────────────────────────────────────────────────
  if (host.endsWith('loom.com')) {
    const id = u.pathname.match(/\/(?:share|embed)\/([a-zA-Z0-9]+)/)?.[1];
    if (id) {
      return {
        plataforma: 'loom',
        id,
        embed: `https://www.loom.com/embed/${id}`,
        miniatura: null,
        url: u.href,
        incrustable: true,
        tipo: 'iframe',
      };
    }
  }

  // ── Wistia ─────────────────────────────────────────────────────────
  if (host.includes('wistia.')) {
    const id = u.pathname.match(/\/(?:medias|embed\/iframe)\/([a-zA-Z0-9]+)/)?.[1];
    if (id) {
      return {
        plataforma: 'wistia',
        id,
        embed: `https://fast.wistia.net/embed/iframe/${id}`,
        miniatura: null,
        url: u.href,
        incrustable: true,
        tipo: 'iframe',
      };
    }
  }

  // ── Archivo directo ────────────────────────────────────────────────
  if (/\.(mp4|webm|ogg)(?:$|[?#])/i.test(u.pathname + u.search)) {
    return {
      plataforma: 'directo',
      id: null,
      embed: u.href,
      miniatura: null,
      url: u.href,
      incrustable: true,
      tipo: 'video',
    };
  }

  const plataformas = {
    'instagram.com': 'instagram',
    'tiktok.com': 'tiktok',
    'x.com': 'x',
    'twitter.com': 'x',
    'facebook.com': 'facebook',
    'fb.watch': 'facebook',
  };
  const plataforma = Object.keys(plataformas).find(d => host === d || host.endsWith(`.${d}`));

  return {
    plataforma: plataforma ? plataformas[plataforma] : 'enlace',
    id: null,
    embed: null,
    miniatura: null,
    url: u.href,
    incrustable: false,
    tipo: 'link',
  };
}

function youtube(id, u) {
  const limpio = id.split('?')[0];
  return {
    plataforma: 'youtube',
    id: limpio,
    // nocookie: no deja cookies de seguimiento hasta que el visitante le da
    // play. Es el mismo video.
    embed: `https://www.youtube-nocookie.com/embed/${limpio}?rel=0`,
    // hqdefault existe para todo video; maxres no siempre.
    miniatura: `https://i.ytimg.com/vi/${limpio}/hqdefault.jpg`,
    url: u.href,
    incrustable: true,
    tipo: 'iframe',
  };
}

/** Nombre para mostrar de cada plataforma reconocida. */
export const NOMBRE_PLATAFORMA = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  drive: 'Google Drive',
  loom: 'Loom',
  wistia: 'Wistia',
  directo: 'Video',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  facebook: 'Facebook',
  enlace: 'Enlace',
};
