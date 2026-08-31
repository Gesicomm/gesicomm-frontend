import React from 'react';
import { AlertTriangle, XCircle, X } from 'lucide-react';

/**
 * Lo que el servidor le hizo al código al guardarlo.
 *
 * Dos casos distintos y conviene no mezclarlos:
 *
 *   errores       → NO se guardó nada. El sanitizador rechazó el código
 *                   (JS prohibido, límite de tamaño). Hay que corregir.
 *   advertencias  → SÍ se guardó, pero recortado o repartido: se le
 *                   quitaron los <script> del HTML, se movió el <style> a
 *                   la pestaña CSS, etc.
 *
 * Mostrar las advertencias no es cosmético: después de guardar, el editor
 * reemplaza el borrador con lo que devolvió el servidor. Sin este aviso,
 * el usuario ve desaparecer código sin entender por qué.
 */
export default function AdvertenciasBanner({ errores = [], advertencias = [], onCerrar }) {
  if (!errores.length && !advertencias.length) return null;

  const hayErrores = errores.length > 0;
  const items = hayErrores ? errores : advertencias;
  const color = hayErrores ? 'var(--color-danger)' : 'var(--color-warning)';
  const Icono = hayErrores ? XCircle : AlertTriangle;

  return (
    <div
      role={hayErrores ? 'alert' : 'status'}
      className="flex items-start gap-2 border-b border-border px-4 py-2.5 text-xs"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <Icono size={15} className="mt-0.5 shrink-0" style={{ color }} />

      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">
          {hayErrores
            ? 'No se pudo guardar:'
            : 'Se guardó, con cambios sobre lo que escribiste:'}
        </p>
        <ul className="mt-1 space-y-0.5 text-fg-muted">
          {items.map((texto, i) => <li key={i}>· {texto}</li>)}
        </ul>
      </div>

      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="shrink-0 rounded p-0.5 text-fg-muted hover:text-fg"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
