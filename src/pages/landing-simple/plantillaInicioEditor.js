/**
 * Lee/escribe las partes editables de INICIO_HTML (plantillasBaseCodigo.js,
 * PLANTILLA_INICIO) sin tocar el resto del documento. El storage sigue
 * siendo el mismo `codigo.html` de siempre (Landing.content.codigo): el
 * sanitizador del backend, el runtime del iframe, el carrito y la landing
 * pública no se enteran de que existe esta capa de edición por bloques —
 * solo ven HTML, como siempre. Por eso esto NO agrega ningún campo nuevo
 * al modelo ni al guardado: la pestaña "Secciones" del editor (ver
 * panels/SeccionesPanel.jsx) llama a estas funciones y guarda el resultado
 * con el mismo `escribir('html', nuevoHtml)` que usa la pestaña HTML.
 *
 * Toda la lectura/escritura pasa por DOMParser, nunca regex sobre el string
 * completo: mucho más robusto ante HTML tocado a mano o por el Asistente IA.
 * Si el comercio editó tanto el HTML que estos selectores ya no calzan
 * (borró el hero, le cambió las clases), las funciones devuelven `null`/el
 * HTML intacto — nunca rompen ni corrompen el documento.
 */

function parsear(html) {
  return new DOMParser().parseFromString(html || '', 'text/html');
}

// No XMLSerializer: cierra tags vacíos como <img/>, y sanitize-html
// (backend) espera HTML normal. construirDocumentoCodigo ya envuelve esto
// con su propio <html>/<head>, así que alcanza con el innerHTML del body.
function serializar(doc) {
  return doc.body.innerHTML;
}

function texto(el, selector) {
  return el?.querySelector(selector)?.textContent?.trim() || '';
}

// ─── Hero ────────────────────────────────────────────────────────────────

export function leerHero(html) {
  const doc = parsear(html);
  const hero = doc.querySelector('section#inicio');
  if (!hero) return null;
  const h1 = hero.querySelector('h1');
  const em = h1?.querySelector('em');
  const tituloPrincipal = em
    ? (h1.textContent || '').replace(em.textContent || '', '').trim()
    : (h1?.textContent || '').trim();
  const cta = hero.querySelector('.hero-actions .button-primary');
  return {
    eyebrow: texto(hero, '.eyebrow'),
    titulo: tituloPrincipal,
    tituloEnfasis: em?.textContent?.trim() || '',
    subtitulo: texto(hero, '.hero-copy'),
    ctaTexto: (cta?.childNodes[0]?.textContent || cta?.textContent || '').trim(),
    ctaHref: cta?.getAttribute('href') || '',
  };
}

export function escribirHero(html, cambios) {
  const doc = parsear(html);
  const hero = doc.querySelector('section#inicio');
  if (!hero) return html;

  const eyebrowEl = hero.querySelector('.eyebrow');
  if (eyebrowEl && cambios.eyebrow !== undefined) eyebrowEl.textContent = cambios.eyebrow;

  const h1 = hero.querySelector('h1');
  if (h1 && (cambios.titulo !== undefined || cambios.tituloEnfasis !== undefined)) {
    const actual = leerHero(html);
    const titulo = cambios.titulo !== undefined ? cambios.titulo : actual.titulo;
    const enfasis = cambios.tituloEnfasis !== undefined ? cambios.tituloEnfasis : actual.tituloEnfasis;
    h1.textContent = '';
    h1.append(titulo ? `${titulo} ` : '');
    const em = doc.createElement('em');
    em.textContent = enfasis;
    h1.append(em);
  }

  const copyEl = hero.querySelector('.hero-copy');
  if (copyEl && cambios.subtitulo !== undefined) copyEl.textContent = cambios.subtitulo;

  const cta = hero.querySelector('.hero-actions .button-primary');
  if (cta) {
    if (cambios.ctaTexto !== undefined) {
      const flecha = cta.querySelector('span[aria-hidden]');
      cta.textContent = `${cambios.ctaTexto} `;
      if (flecha) cta.append(flecha);
    }
    if (cambios.ctaHref !== undefined) cta.setAttribute('href', cambios.ctaHref || '#destacados');
  }
  return serializar(doc);
}

// ─── Banner / promo-band ───────────────────────────────────────────────

export function leerPromo(html) {
  const doc = parsear(html);
  const promo = doc.querySelector('section.promo-band');
  if (!promo) return null;
  const cta = promo.querySelector('a.button-primary');
  return {
    eyebrow: texto(promo, '.eyebrow'),
    titulo: texto(promo, 'h2'),
    subtitulo: texto(promo, 'p:not(.eyebrow)'),
    ctaTexto: cta?.textContent?.trim() || '',
    ctaHref: cta?.getAttribute('href') || '',
  };
}

export function escribirPromo(html, cambios) {
  const doc = parsear(html);
  const promo = doc.querySelector('section.promo-band');
  if (!promo) return html;

  const eyebrowEl = promo.querySelector('.eyebrow');
  if (eyebrowEl && cambios.eyebrow !== undefined) eyebrowEl.textContent = cambios.eyebrow;

  const h2 = promo.querySelector('h2');
  if (h2 && cambios.titulo !== undefined) h2.textContent = cambios.titulo;

  const p = promo.querySelector('p:not(.eyebrow)');
  if (p && cambios.subtitulo !== undefined) p.textContent = cambios.subtitulo;

  const cta = promo.querySelector('a.button-primary');
  if (cta) {
    if (cambios.ctaTexto !== undefined) cta.textContent = cambios.ctaTexto;
    if (cambios.ctaHref !== undefined) cta.setAttribute('href', cambios.ctaHref || '#productos');
  }
  return serializar(doc);
}

// ─── Categorías curadas ─────────────────────────────────────────────────
// null = automático (el runtime arma la grilla con TODAS las categorías
// que tengan productos, ver runtimeGesicomm.js categoriasDeProductos()).
// Un array = curaduría manual: solo esas categorías, en ese orden, con
// imagen propia si se cargó una (si no, el runtime sigue completando con
// la primera foto de un producto de esa categoría).

export function leerCategoriasCuradas(html) {
  const doc = parsear(html);
  const grid = doc.querySelector('#categorias .category-grid');
  const raw = grid?.getAttribute('data-gesicomm-categorias-curadas');
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

export function escribirCategoriasCuradas(html, categorias) {
  const doc = parsear(html);
  const grid = doc.querySelector('#categorias .category-grid');
  if (!grid) return html;
  if (!categorias || !categorias.length) {
    grid.removeAttribute('data-gesicomm-categorias-curadas');
  } else {
    grid.setAttribute('data-gesicomm-categorias-curadas', JSON.stringify(
      categorias.map(c => (c.imagen ? { nombre: c.nombre, imagen: c.imagen } : { nombre: c.nombre })),
    ));
  }
  return serializar(doc);
}

// ─── Estructura: orden y visibilidad de las secciones ──────────────────
// Identidad POSICIONAL, no por id persistido: se recalcula desde el HTML
// actual en cada render, así que no hay nada que migrar si el comercio
// edita el HTML a mano entre medio.

function etiquetaSeccion(section) {
  const eyebrow = section.querySelector('.eyebrow');
  if (eyebrow?.textContent?.trim()) return eyebrow.textContent.trim();
  if (section.getAttribute('aria-label')) return section.getAttribute('aria-label');
  if (section.id === 'inicio') return 'Hero';
  return 'Sección';
}

function seccionesDe(doc) {
  const main = doc.querySelector('main');
  if (!main) return [];
  return Array.from(main.children).filter(el => el.tagName === 'SECTION');
}

export function leerSecciones(html) {
  const doc = parsear(html);
  return seccionesDe(doc).map((section, indice) => ({
    indice,
    etiqueta: etiquetaSeccion(section),
    oculta: section.hasAttribute('hidden'),
    esHero: section.id === 'inicio',
  }));
}

export function moverSeccion(html, indice, delta) {
  const doc = parsear(html);
  const secciones = seccionesDe(doc);
  const destino = indice + delta;
  if (destino < 0 || destino >= secciones.length) return html;
  const main = secciones[0].parentElement;
  const a = secciones[indice];
  const b = secciones[destino];
  if (delta > 0) main.insertBefore(b, a);
  else main.insertBefore(a, b);
  return serializar(doc);
}

export function alternarVisibilidad(html, indice) {
  const doc = parsear(html);
  const secciones = seccionesDe(doc);
  const section = secciones[indice];
  if (!section || section.id === 'inicio') return html; // el hero no se oculta
  if (section.hasAttribute('hidden')) section.removeAttribute('hidden');
  else section.setAttribute('hidden', '');
  return serializar(doc);
}
