import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export const controlOperacion = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
export const botonOperacion = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50';
export const botonPrincipal = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

export const ESTADOS_ENVIO = {
  solicitada: ['Solicitada', 'bg-info/10 text-info-text border-info/20'],
  observada: ['Con observaciones', 'bg-warning/10 text-warning-text border-warning/20'],
  aceptada: ['Aceptada para coordinar', 'bg-success/10 text-success-text border-success/20'],
  preparado: ['Preparado', 'bg-info/10 text-info-text border-info/20'],
  enviado: ['Enviado', 'bg-warning/10 text-warning-text border-warning/20'],
  recibido: ['Recibido', 'bg-success/10 text-success-text border-success/20'],
  rechazada: ['Rechazada', 'bg-danger/10 text-danger-text border-danger/20'],
  cancelada: ['Cancelada', 'bg-surface-2 text-fg-muted border-border'],
};

export function EstadoEnvio({ estado }) {
  const [label, color] = ESTADOS_ENVIO[estado] || [estado, 'bg-surface-2 text-fg-muted border-border'];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>{label}</span>;
}

export function mensajeError(error) {
  return error?.response?.data?.message || error?.response?.data?.error || 'No pudimos completar la operación. Intentá nuevamente.';
}

export function useConsultaOperacion(cargar) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let activo = true;
    setLoading(true);
    setError('');
    Promise.resolve().then(cargar).then(respuesta => { if (activo) setData(respuesta); })
      .catch(fallo => { if (activo) setError(mensajeError(fallo)); })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, [cargar, revision]);
  return { data, loading, error, reintentar: () => setRevision(valor => valor + 1) };
}

export function ResultadoConsulta({ consulta, vacio, children }) {
  if (consulta.loading) return <div role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-fg-muted"><RefreshCw size={17} className="animate-spin" /> Cargando…</div>;
  if (consulta.error) return <div role="alert" className="rounded-xl border border-danger/20 bg-danger/5 p-5 text-sm text-danger-text"><p className="mt-0">{consulta.error}</p><button type="button" className={botonOperacion} onClick={consulta.reintentar}>Reintentar</button></div>;
  if (vacio) return <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center text-sm text-fg-muted">Todavía no hay registros para estos filtros.</div>;
  return children;
}

export function PaginacionOperacion({ data, page, limit, cambiarPagina, cambiarLimite, loading }) {
  const paginas = data?.totalPaginas || 1;
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-fg-muted">
    <label className="flex items-center gap-2">Mostrar<select value={limit} onChange={event => cambiarLimite(Number(event.target.value))} className="rounded-md border border-border bg-surface px-2 py-1.5 text-fg">{[10, 20, 50, 100].map(valor => <option key={valor} value={valor}>{valor}</option>)}</select>por página</label>
    <span>{data?.total || 0} {data?.total === 1 ? 'registro' : 'registros'} · Página {page} de {paginas}</span>
    <nav aria-label="Paginación de operaciones" className="flex gap-2"><button type="button" aria-label="Página anterior" className={botonOperacion} disabled={loading || page <= 1} onClick={() => cambiarPagina(page - 1)}><ChevronLeft size={15} /></button><button type="button" aria-label="Página siguiente" className={botonOperacion} disabled={loading || page >= paginas} onClick={() => cambiarPagina(page + 1)}><ChevronRight size={15} /></button></nav>
  </div>;
}
