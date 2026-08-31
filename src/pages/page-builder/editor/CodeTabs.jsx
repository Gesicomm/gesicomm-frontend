import React from 'react';

/**
 * Las pestañas del editor: HTML · CSS · JavaScript · Ajustes.
 *
 * El punto al lado del nombre marca que esa pestaña tiene contenido, para
 * poder ver de un vistazo si el CSS quedó vacío después de importar una
 * página pegada.
 */

export const TABS = [
  { clave: 'html', etiqueta: 'HTML', lenguaje: 'html' },
  { clave: 'css', etiqueta: 'CSS', lenguaje: 'css' },
  { clave: 'js', etiqueta: 'JavaScript', lenguaje: 'javascript' },
  { clave: 'ajustes', etiqueta: 'Ajustes', lenguaje: null },
];

export default function CodeTabs({ activa, onCambiar, codigo }) {
  return (
    <div role="tablist" className="flex items-center gap-0.5 border-b border-border bg-surface px-2">
      {TABS.map(({ clave, etiqueta }) => {
        const esActiva = activa === clave;
        const tieneContenido = clave !== 'ajustes' && !!codigo?.[clave]?.trim();

        return (
          <button
            key={clave}
            role="tab"
            type="button"
            aria-selected={esActiva}
            onClick={() => onCambiar(clave)}
            className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              esActiva ? 'text-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {etiqueta}
            {tieneContenido && (
              <span
                aria-hidden="true"
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--color-primary-text)', display: 'inline-block',
                }}
              />
            )}
            {esActiva && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5"
                style={{ background: 'var(--color-primary)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
