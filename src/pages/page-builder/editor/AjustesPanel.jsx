import React from 'react';

/**
 * Ajustes de la página: nombre, slug y SEO/Open Graph.
 *
 * No están acá `og_imagen` ni `favicon_url` a propósito: esos campos solo
 * los escribe el endpoint de subida de archivos, nunca el PUT de texto
 * (misma regla que Landing.banner_imagen). Si se pudieran escribir a
 * mano, se podría apuntar el preview de un link a cualquier archivo del
 * servidor.
 */

function Campo({ etiqueta, ayuda, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-fg">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-[11px] text-fg-subtle">{ayuda}</span>}
    </label>
  );
}

const INPUT = 'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-fg outline-none focus:border-primary';

/**
 * Los tokens que se pueden escribir en el HTML para navegar entre pasos
 * de un funnel sin escribir la URL a mano. El servidor los reemplaza al
 * renderizar, así que renombrar un slug o reordenar el funnel no obliga a
 * tocar las páginas que lo enlazan.
 */
const TOKENS = [
  ['{{siguiente}}', 'El paso siguiente del funnel'],
  ['{{anterior}}', 'El paso anterior'],
  ['{{inicio}}', 'La página de entrada del funnel'],
  ['{{pagina:slug}}', 'Un paso concreto, por su slug'],
];

export default function AjustesPanel({ ajustes, onCambio, pathPublico }) {
  const set = (clave) => (e) => onCambio({ ...ajustes, [clave]: e.target.value });

  return (
    <div className="h-full space-y-5 overflow-y-auto p-4">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Página</h3>

        <Campo etiqueta="Nombre">
          <input className={INPUT} value={ajustes.nombre || ''} onChange={set('nombre')} />
        </Campo>

        <Campo
          etiqueta="Slug"
          ayuda={pathPublico ? `Dirección actual: ${pathPublico}` : 'Minúsculas, números y guiones.'}
        >
          <input
            className={`${INPUT} font-mono`}
            value={ajustes.slug || ''}
            onChange={set('slug')}
            spellCheck={false}
          />
        </Campo>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          Buscadores
        </h3>

        <Campo etiqueta="Título SEO" ayuda="Lo que se lee en la pestaña del navegador y en Google.">
          <input
            className={INPUT}
            value={ajustes.seo_titulo || ''}
            onChange={set('seo_titulo')}
            maxLength={160}
          />
        </Campo>

        <Campo etiqueta="Descripción SEO">
          <textarea
            className={`${INPUT} min-h-[70px] resize-y`}
            value={ajustes.seo_descripcion || ''}
            onChange={set('seo_descripcion')}
            maxLength={320}
          />
        </Campo>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          Al compartir el link
        </h3>
        <p className="text-[11px] text-fg-subtle">
          Lo que muestran WhatsApp, Facebook e Instagram. Si lo dejás vacío, usan lo de
          buscadores.
        </p>

        <Campo etiqueta="Título">
          <input
            className={INPUT}
            value={ajustes.og_titulo || ''}
            onChange={set('og_titulo')}
            maxLength={160}
          />
        </Campo>

        <Campo etiqueta="Descripción">
          <textarea
            className={`${INPUT} min-h-[70px] resize-y`}
            value={ajustes.og_descripcion || ''}
            onChange={set('og_descripcion')}
            maxLength={320}
          />
        </Campo>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          Enlaces entre pasos
        </h3>
        <p className="text-[11px] text-fg-subtle">
          Escribilos como <code>href</code> y el sistema los reemplaza por la dirección
          correcta al publicar. Si cambiás un slug o reordenás el funnel, los enlaces
          siguen funcionando solos.
        </p>

        <div className="overflow-hidden rounded-lg border border-border">
          {TOKENS.map(([token, que], i) => (
            <div
              key={token}
              className={`flex flex-wrap items-baseline gap-2 px-3 py-2 text-[11px] ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <code className="font-mono text-fg">{token}</code>
              <span className="text-fg-subtle">{que}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-fg-subtle">
          Ejemplo: <code className="font-mono">{'<a href="{{siguiente}}">Comprar</a>'}</code>
        </p>
      </section>
    </div>
  );
}
