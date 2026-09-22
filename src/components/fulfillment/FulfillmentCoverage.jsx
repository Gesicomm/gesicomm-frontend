import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import FulfillmentCoverageCity from './FulfillmentCoverageCity';
import { formatGs } from './vocabulario';

/**
 * Cobertura de la red agrupada por departamento.
 *
 * Con 253 destinos posibles una lista plana es ilegible, así que se agrupa y
 * se colapsa. El buscador filtra por ciudad o departamento y abre los grupos
 * que tienen resultados: buscar y después tener que abrir a mano sería un
 * paso de más.
 */
export default function FulfillmentCoverage({ grupos = [], proveedores = [] }) {
  const [busqueda, setBusqueda] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [abiertos, setAbiertos] = useState(() => new Set());

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const courier = proveedorId ? Number(proveedorId) : null;

    return grupos
      .map((g) => {
        const ciudades = g.ciudades.filter((c) => {
          if (courier && c.courier_id !== courier) return false;
          if (!texto) return true;
          return String(c.ciudad || '').toLowerCase().includes(texto)
            || String(g.departamento || '').toLowerCase().includes(texto);
        });
        return { ...g, ciudades };
      })
      .filter((g) => g.ciudades.length > 0);
  }, [grupos, busqueda, proveedorId]);

  const hayFiltro = busqueda.trim() !== '' || proveedorId !== '';

  const alternar = (departamento) => {
    setAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(departamento)) siguiente.delete(departamento);
      else siguiente.add(departamento);
      return siguiente;
    });
  };

  if (grupos.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
          <MapPin size={20} />
        </div>
        <p className="m-0 text-sm font-medium text-fg">Todavía no hay cobertura configurada</p>
        <p className="m-0 mt-1 text-[13px] text-fg-muted">
          Sumá un proveedor logístico y definí a qué ciudades llega para que la red pueda cotizar entregas.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar ciudad o departamento…"
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle"
          />
        </div>
        {proveedores.length > 1 && (
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
          >
            <option value="">Todos los proveedores</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-fg-muted">
          Ninguna ciudad coincide con la búsqueda.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {filtrados.map((g) => {
            const abierto = hayFiltro || abiertos.has(g.departamento);
            const desde = Math.min(...g.ciudades.map((c) => Number(c.costo) || 0));
            return (
              <div key={g.departamento} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => alternar(g.departamento)}
                  className="flex w-full cursor-pointer items-center gap-3 border-none bg-surface-2/40 px-4 py-2.5 text-left hover:bg-surface-2"
                >
                  <span className="text-fg-subtle">
                    {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-fg">{g.departamento}</span>
                  <span className="text-[12px] text-fg-muted">
                    {g.ciudades.length} ciudad{g.ciudades.length === 1 ? '' : 'es'} · desde {formatGs(desde)}
                  </span>
                </button>
                {abierto && (
                  <ul className="m-0 list-none p-0">
                    {g.ciudades.map((c) => (
                      <FulfillmentCoverageCity key={`${c.ciudad_id ?? c.ciudad}-${c.courier_id}`} opcion={c} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
