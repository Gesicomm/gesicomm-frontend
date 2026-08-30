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
 * @returns {{plataforma, id, embed, miniatura, url, incrustable}|null}
 */
export function analizarVideo(url) {
  const limpio = String(url || '').trim();
  if (!limpio) return null;

  let u;
  try {
    // Sin esquema, `new URL` falla: el comercio pega "youtube.com/watch?v=…"
    // tanto como la URL completa.
    u = new URL(/^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, '').toLowerCase();

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
      };
    }
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
  };
}

/** Nombre para mostrar de cada plataforma reconocida. */
export const NOMBRE_PLATAFORMA = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  facebook: 'Facebook',
  enlace: 'Enlace',
};
