import { useEffect } from 'react';

export const SITIO = 'https://gesicomm.com';
export const NOMBRE_SITIO = 'Gesicomm';
export const IMAGEN_OG = `${SITIO}/og-image.png`;

/**
 * Metadatos de una página del sitio público: title, description, canonical,
 * robots, Open Graph, Twitter Cards y JSON-LD de Schema.org.
 *
 * Todo lo que inserta lleva data-seo="publico" y se limpia al desmontar, para
 * que al navegar entre rutas de la SPA no queden etiquetas de la página
 * anterior pegadas en el <head>.
 *
 * LÍMITE CONOCIDO (el mismo que documenta src/hooks/useDocumentSeo.js): esta
 * app es un SPA sin SSR. Estas etiquetas las escribe React ya en el
 * navegador, así que sirven para la pestaña y para los crawlers que ejecutan
 * JavaScript (Googlebot lo hace), pero NO para el preview de enlaces de
 * WhatsApp, Facebook o Twitter, que leen el HTML crudo del servidor. Por eso
 * index.html trae los metadatos de la portada escritos de forma estática: es
 * lo que ven esos bots. Si en algún momento hace falta que cada página legal
 * tenga su propio preview de enlace, la solución es prerenderizar esas rutas
 * en el build, no cambiar este componente.
 */
export default function Seo({
  titulo,
  descripcion,
  ruta = '/',
  imagen = IMAGEN_OG,
  tipo = 'website',
  noIndex = false,
  schema = null,
}) {
  const tituloCompleto = titulo.includes(NOMBRE_SITIO) ? titulo : `${titulo} · ${NOMBRE_SITIO}`;
  const url = `${SITIO}${ruta}`;
  // Las páginas pasan el schema como objeto literal, que es una referencia
  // nueva en cada render. Serializarlo evita que el efecto se vuelva a
  // ejecutar y reescriba el <head> en cada render del padre.
  const schemaSerializado = schema ? JSON.stringify(schema) : null;

  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = tituloCompleto;

    const insertados = [];

    const meta = (clave, valor, contenido) => {
      if (!contenido) return;
      const el = document.createElement('meta');
      el.setAttribute(clave, valor);
      el.setAttribute('content', contenido);
      el.setAttribute('data-seo', 'publico');
      document.head.appendChild(el);
      insertados.push(el);
    };

    // Los metadatos estáticos de index.html se retiran mientras esta página
    // está montada. Si no, quedarían dos de cada uno y tanto los crawlers
    // como los depuradores de enlaces se quedan con la PRIMERA aparición,
    // que sería siempre la de la portada — de modo que /privacy compartido
    // en WhatsApp mostraría el título y la descripción del home.
    //
    // Se reponen en el cleanup porque son las que tienen que ver los bots
    // que no ejecutan JavaScript.
    const estaticos = Array.from(
      document.head.querySelectorAll(
        [
          'link[rel="canonical"]',
          'meta[name="description"]',
          'meta[name="robots"]',
          'meta[property^="og:"]',
          'meta[name^="twitter:"]',
        ]
          .map((selector) => `${selector}:not([data-seo])`)
          .join(', ')
      )
    );
    estaticos.forEach((el) => el.remove());

    meta('name', 'description', descripcion);
    meta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

    meta('property', 'og:site_name', NOMBRE_SITIO);
    meta('property', 'og:type', tipo);
    meta('property', 'og:title', tituloCompleto);
    meta('property', 'og:description', descripcion);
    meta('property', 'og:url', url);
    meta('property', 'og:image', imagen);
    meta('property', 'og:image:width', '1200');
    meta('property', 'og:image:height', '630');
    meta('property', 'og:locale', 'es_ES');

    meta('name', 'twitter:card', 'summary_large_image');
    meta('name', 'twitter:title', tituloCompleto);
    meta('name', 'twitter:description', descripcion);
    meta('name', 'twitter:image', imagen);

    const canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', url);
    canonical.setAttribute('data-seo', 'publico');
    document.head.appendChild(canonical);
    insertados.push(canonical);

    if (schemaSerializado) {
      const ld = document.createElement('script');
      ld.setAttribute('type', 'application/ld+json');
      ld.setAttribute('data-seo', 'publico');
      ld.textContent = schemaSerializado;
      document.head.appendChild(ld);
      insertados.push(ld);
    }

    return () => {
      document.title = tituloAnterior;
      insertados.forEach((el) => el.remove());
      estaticos.forEach((el) => document.head.appendChild(el));
    };
  }, [tituloCompleto, descripcion, url, imagen, tipo, noIndex, schemaSerializado]);

  return null;
}

/** Datos de la organización, reutilizados por varias páginas. */
export const SCHEMA_ORGANIZACION = {
  '@type': 'Organization',
  '@id': `${SITIO}/#organizacion`,
  name: NOMBRE_SITIO,
  url: SITIO,
  logo: `${SITIO}/icons/icon-512.png`,
  description:
    'Plataforma SaaS de gestión de eCommerce: productos, pedidos, inventario, clientes, logística, CRM y campañas en un solo panel.',
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@gesicomm.com',
      availableLanguage: ['Spanish', 'English'],
    },
    {
      '@type': 'ContactPoint',
      contactType: 'privacy',
      email: 'privacy@gesicomm.com',
      availableLanguage: ['Spanish', 'English'],
    },
    {
      '@type': 'ContactPoint',
      contactType: 'legal',
      email: 'legal@gesicomm.com',
      availableLanguage: ['Spanish', 'English'],
    },
  ],
};

/** Migas de pan en formato Schema.org, para el breadcrumb de las páginas internas. */
export function schemaMigas(migas) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: migas.map((miga, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      name: miga.etiqueta,
      item: `${SITIO}${miga.href}`,
    })),
  };
}
