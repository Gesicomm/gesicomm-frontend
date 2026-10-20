import React from 'react';
const campo = 'mt-1 w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg';
const area = 'mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg';
export default function EditorOfertaTiempoLimitado({ item, onCambiar, visibleBloque, cambiarBloque }) {
  const val = clave => item[clave] ?? '';
  const DEFAULTS_PRESENTACION = { urgencia_horas: 1, urgencia_minutos: 59, urgencia_segundos: 58 };
  return (<div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-xs text-fg-muted">Encabezado de la oferta<input className={campo} value={val('urgencia_kicker')} maxLength={60} placeholder="Vacío: no se muestra" onChange={e => onCambiar('urgencia_kicker', e.target.value)} /></label>
              <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_encabezado')} onChange={e => cambiarBloque('oferta_encabezado', e.target.checked)} /> Mostrar encabezado</label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-xs text-fg-muted">Nombre de la oferta<input className={campo} value={val('urgencia_titulo')} maxLength={90} placeholder="Vacío: no se muestra" onChange={e => onCambiar('urgencia_titulo', e.target.value)} /></label>
              <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_nombre')} onChange={e => cambiarBloque('oferta_nombre', e.target.checked)} /> Mostrar nombre</label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-xs text-fg-muted">Texto de la oferta<textarea className={area} rows={2} value={val('urgencia_texto')} maxLength={180} placeholder="Vacío: no se muestra" onChange={e => onCambiar('urgencia_texto', e.target.value)} /></label>
              <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_texto')} onChange={e => cambiarBloque('oferta_texto', e.target.checked)} /> Mostrar texto</label>
            </div>
            <fieldset className="rounded-lg border border-border bg-surface px-3 py-3">
              <legend className="px-1 text-sm font-semibold text-fg">Duración del contador</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <label className="block text-xs text-fg-muted">Horas<input className={campo} type="number" min="0" max="99" value={val('urgencia_horas')} placeholder={String(DEFAULTS_PRESENTACION.urgencia_horas)} onChange={e => onCambiar('urgencia_horas', e.target.value)} /></label>
                <label className="block text-xs text-fg-muted">Minutos<input className={campo} type="number" min="0" max="59" value={val('urgencia_minutos')} placeholder={String(DEFAULTS_PRESENTACION.urgencia_minutos)} onChange={e => onCambiar('urgencia_minutos', e.target.value)} /></label>
                <label className="block text-xs text-fg-muted">Segundos<input className={campo} type="number" min="0" max="59" value={val('urgencia_segundos')} placeholder={String(DEFAULTS_PRESENTACION.urgencia_segundos)} onChange={e => onCambiar('urgencia_segundos', e.target.value)} /></label>
                <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_duracion')} onChange={e => cambiarBloque('oferta_duracion', e.target.checked)} /> Mostrar contador</label>
              </div>
            </fieldset>
          </div>);
}
