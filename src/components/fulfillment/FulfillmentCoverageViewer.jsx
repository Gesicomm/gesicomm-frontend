import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, MapPin, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { formatGs, etiquetaTiempo } from './vocabulario';

const METODO = {
  ANTICIPADO: 'Pago anticipado',
  AL_RECIBIR: 'Pago contra entrega',
};

/**
 * Cobertura de Gesicomm, vista por el comercio.
 *
 * Es SOLO CONSULTA y a propósito no dice qué proveedor entrega: quién hace
 * la última milla es decisión operativa de Gesicomm, no parte de lo que el
 * comercio contrata. Los precios vienen resueltos por el mismo motor que
 * cotiza el checkout, así que lo que se ve acá es lo que se cobra.
 */
export default function FulfillmentCoverageViewer({ open, onClose }) {
  const [cobertura, setCobertura] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    setCargando(true);
    api.get('/mi-tienda/fulfillment/cobertura')
      .then((r) => { if (!cancelado) { setCobertura(r.data || []); setError(null); } })
      .catch((err) => {
        if (!cancelado) setError(err.response?.data?.message || 'No se pudo cargar la cobertura.');
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [open]);

  const grupos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtradas = texto
      ? cobertura.filter((c) => String(c.ciudad || '').toLowerCase().includes(texto)
        || String(c.departamento || '').toLowerCase().includes(texto))
      : cobertura;

    const mapa = new Map();
    for (const c of filtradas) {
      const clave = c.departamento || 'Sin departamento';
      const grupo = mapa.get(clave) || { departamento: clave, ciudades: [] };
      grupo.ciudades.push(c);
      mapa.set(clave, grupo);
    }
    return [...mapa.values()];
  }, [cobertura, busqueda]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-surface shadow-xl">
        <header className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="m-0 text-lg font-semibold text-fg">Cobertura y precios de Gesicomm</h2>
            <p className="m-0 mt-0.5 text-[13px] text-fg-muted">
              A dónde llega la red y cuánto cuesta cada entrega. Los precios ya incluyen el servicio completo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-shrink-0 border-b border-border px-5 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar ciudad o departamento…"
              className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cargando ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-surface-2" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p className="m-0">{error}</p>
            </div>
          ) : grupos.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
                <MapPin size={20} />
              </div>
              <p className="m-0 text-sm text-fg-muted">
                {cobertura.length === 0
                  ? 'Gesicomm todavía no publicó su cobertura.'
                  : 'Ninguna ciudad coincide con la búsqueda.'}
              </p>
            </div>
          ) : (
            grupos.map((g) => (
              <section key={g.departamento} className="mb-5 last:mb-0">
                <h3 className="m-0 mb-2 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
                  {g.departamento}
                </h3>
                <ul className="m-0 list-none overflow-hidden rounded-lg border border-border p-0">
                  {g.ciudades.map((c) => {
                    const tiempo = etiquetaTiempo(c.tiempoMinHs, c.tiempoMaxHs);
                    const precio = c.desde === c.hasta
                      ? formatGs(c.desde)
                      : `${formatGs(c.desde)} – ${formatGs(c.hasta)}`;
                    return (
                      <li
                        key={`${g.departamento}-${c.ciudad}`}
                        className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                      >
                        <span className="flex-1 text-sm text-fg">{c.ciudad}</span>
                        <span className="hidden text-[12px] text-fg-muted sm:block">
                          {(c.metodosPago || []).map((m) => METODO[m] || m).join(' · ')}
                        </span>
                        {tiempo && <span className="text-[12px] text-fg-muted">{tiempo}</span>}
                        <span className="text-sm font-semibold text-fg">{precio}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
