import React from 'react';

/**
 * El estado de una página, un funnel o un proyecto, de un vistazo.
 *
 * El cuarto estado —"Borrador con cambios"— no existe en la base: es
 * `tiene_cambios_sin_publicar`, que el backend deriva de
 * draft_version_id !== published_version_id. Se muestra aparte porque es
 * la pregunta que más se hace el comercio: "¿lo que estoy viendo es lo
 * que está publicado?".
 */

const ESTILOS = {
  draft: { texto: 'Borrador', color: 'var(--color-fg-muted)' },
  published: { texto: 'Publicada', color: 'var(--color-success)' },
  unpublished: { texto: 'Despublicada', color: 'var(--color-danger)' },
  pendiente: { texto: 'Borrador con cambios', color: 'var(--color-warning)' },
};

export default function EstadoBadge({ estado, tieneCambios = false, className = '' }) {
  const clave = tieneCambios && estado === 'published' ? 'pendiente' : (estado || 'draft');
  const { texto, color } = ESTILOS[clave] || ESTILOS.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}
      style={{ color }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 7, height: 7, borderRadius: '50%',
          background: color, display: 'inline-block', flexShrink: 0,
        }}
      />
      {texto}
    </span>
  );
}
