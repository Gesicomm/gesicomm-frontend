import { useEffect } from 'react';
import { getMediaUrl } from '../services/api';

function setMeta(attr, valor, contenido) {
  if (!contenido) return;
  let el = document.querySelector(`meta[${attr}="${valor}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, valor);
    document.head.appendChild(el);
  }
  el.setAttribute('content', contenido);
}

function setLink(rel, href) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const SELECTOR_ICONOS_ESTATICOS = 'link[rel="icon"], link[rel="shortcut icon"]';

function normalizarSeo(seo, descripcionLegacy = '') {
  if (!seo) return null;
  if (typeof seo === 'string') return { titulo: seo, descripcion: descripcionLegacy || '' };
  return seo;
}

/**
 * Reemplaza los <link rel="icon"> de Gesicom (index.html trae varios: svg +
 * png en distintos tamaños + ico) por uno solo apuntando al logo de la
 * tienda, y devuelve una función para restaurar los originales al
 * desmontar. Pisa el set entero en vez del href de uno solo porque el
 * navegador elige entre TODOS los <link rel="icon"> presentes (prefiere el
 * svg); dejar los png/ico estáticos al lado hacía que algunos navegadores
 * siguieran mostrando el logo de Gesicom.
 */
function setFavicon(href) {
  if (!href) return null;
  const existentes = Array.from(document.querySelectorAll(SELECTOR_ICONOS_ESTATICOS));
  const originales = existentes.map((el) => el.cloneNode(true));
  existentes.forEach((el) => el.remove());

  const nuevo = document.createElement('link');
  nuevo.setAttribute('rel', 'icon');
  nuevo.setAttribute('href', href);
  document.head.appendChild(nuevo);

  return () => {
    nuevo.remove();
    originales.forEach((el) => document.head.appendChild(el));
  };
}

/**
 * Ícono de la pestaña para una página pública de la tienda: el favicon
 * cargado en Mi Tienda manda; sin favicon, el logo de la landing y después
 * el de la tienda (lo que se usaba antes). Mismo orden en el HTML para bots
 * (routes/landingHtml.js del backend).
 */
export function faviconDeLanding(data) {
  return data?.tienda?.favicon_imagen || data?.logo_imagen || data?.tienda?.logo_imagen || null;
}

/**
 * Setea title/meta/OG/Twitter del documento para la landing pública
 * actual, y los deshace al desmontar (para no dejar metadata de una
 * landing pegada si el usuario navega a otra ruta de la SPA sin recargar).
 *
 * LÍMITE CONOCIDO: esta app es un SPA sin SSR — estas etiquetas las
 * escribe React ya en el navegador. Sirven para la pestaña del navegador
 * y para crawlers que ejecutan JS (Googlebot lo hace). NO sirven para el
 * preview de link de WhatsApp/Facebook/Twitter: esos bots piden el HTML
 * crudo del servidor y no ejecutan React, así que van a seguir viendo el
 * <title>/meta genérico de index.html hasta que la app tenga SSR o
 * prerendering para estas rutas.
 */
export function useDocumentSeo(seo, urlActual) {
  useEffect(() => {
    const seoNormalizado = normalizarSeo(seo, typeof urlActual === 'string' && !/^https?:\/\//i.test(urlActual) ? urlActual : '');
    const urlFinal = typeof urlActual === 'string' && /^https?:\/\//i.test(urlActual) ? urlActual : undefined;
    if (!seoNormalizado) return;
    const tituloAnterior = document.title;
    if (seoNormalizado.titulo) document.title = seoNormalizado.titulo;

    setMeta('name', 'description', seoNormalizado.descripcion);
    setMeta('name', 'keywords', seoNormalizado.keywords);
    setMeta('property', 'og:title', seoNormalizado.titulo);
    setMeta('property', 'og:description', seoNormalizado.descripcion);
    setMeta('property', 'og:image', seoNormalizado.og_imagen ? getMediaUrl(seoNormalizado.og_imagen) : undefined);
    setMeta('property', 'og:url', urlFinal);
    setMeta('property', 'og:type', 'website');
    setMeta('name', 'twitter:card', seoNormalizado.og_imagen ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', seoNormalizado.titulo);
    setMeta('name', 'twitter:description', seoNormalizado.descripcion);
    setLink('canonical', urlFinal);
    const restaurarFavicon = seoNormalizado.favicon ? setFavicon(getMediaUrl(seoNormalizado.favicon)) : null;

    return () => {
      document.title = tituloAnterior;
      if (restaurarFavicon) restaurarFavicon();
    };
  }, [seo, urlActual]);
}
