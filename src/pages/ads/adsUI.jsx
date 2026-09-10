import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, Columns3, Check, Minus, Search, X,
  ChevronsUpDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { PRESETS_PERIODO, variacion, formatPct } from './adsShared';

/**
 * Piezas de UI compartidas por las vistas de Ads & Campañas.
 * Mantienen el look actual del panel (oscuro, bordes sutiles, tokens de
 * Tailwind ya declarados en index.css) — acá no se cambia identidad
 * visual, solo jerarquía y densidad.
 */

/** Encabezado de sección: título, bajada opcional y acciones a la derecha. */
export function EncabezadoSeccion({ titulo, descripcion, children }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="m-0 text-base font-semibold text-fg">{titulo}</h2>
        {descripcion && <p className="m-0 mt-1 max-w-2xl text-xs text-fg-muted">{descripcion}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Estado vacío consistente: ícono, mensaje y una acción opcional. */
export function EstadoVacio({ icono: Icono, titulo, descripcion, children }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface/40 px-8 py-12 text-center">
      {Icono && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary-text">
          <Icono size={20} />
        </div>
      )}
      <p className="m-0 text-sm font-medium text-fg">{titulo}</p>
      {descripcion && <p className="m-0 max-w-md text-xs text-fg-muted">{descripcion}</p>}
      {children}
    </div>
  );
}

/**
 * Tarjeta de KPI. `delta` es la variación en % contra el período anterior
 * (null = no hay con qué comparar y no se muestra nada, en vez de un
 * "+100%" que solo significaría "antes no había datos").
 *
 * `menosEsMejor` invierte el color, no el signo: en CPA bajar es bueno.
 */
export function TarjetaKpi({ label, valor, delta = null, hint = null, menosEsMejor = false, cargando = false }) {
  const sube = delta != null && delta > 0.05;
  const baja = delta != null && delta < -0.05;
  const bueno = menosEsMejor ? baja : sube;
  const malo = menosEsMejor ? sube : baja;

  const colorDelta = bueno ? 'text-success' : malo ? 'text-danger' : 'text-fg-muted';
  const Flecha = sube ? ArrowUp : baja ? ArrowDown : Minus;

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
      <p className="m-0 text-[0.7rem] font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
      {cargando ? (
        <div className="skeleton-row mt-2" style={{ width: '70%', height: '22px' }} />
      ) : (
        <p className="m-0 mt-1.5 font-mono text-xl font-semibold leading-none text-fg">{valor}</p>
      )}
      <div className="mt-2 flex h-4 items-center gap-1.5">
        {!cargando && delta != null && (
          <span className={`inline-flex items-center gap-0.5 text-[0.72rem] font-medium ${colorDelta}`}>
            <Flecha size={12} /> {formatPct(Math.abs(delta))}
          </span>
        )}
        {hint && <span className="truncate text-[0.7rem] text-fg-subtle">{hint}</span>}
      </div>
    </div>
  );
}

/** Atajo: arma la tarjeta a partir de los totales actual/anterior. */
export function TarjetaKpiComparada({ label, actual, anterior, formato, ...resto }) {
  return (
    <TarjetaKpi
      label={label}
      valor={formato(actual)}
      delta={variacion(actual, anterior)}
      {...resto}
    />
  );
}

/**
 * Selector de período. Chips con los presets + rango manual cuando se
 * elige "Personalizado". El valor vive en el shell de Ads y se guarda en
 * sessionStorage — nunca en la URL.
 */
export function SelectorPeriodo({ periodo, onChange }) {
  const esPersonalizado = periodo.preset === 'custom';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS_PERIODO.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange({ preset: p.id, ...p.rango() })}
          className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
            periodo.preset === p.id
              ? 'border-primary bg-primary/15 font-semibold text-primary-text'
              : 'border-border text-fg-muted hover:border-border-strong hover:text-fg'
          }`}
        >
          {p.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...periodo, preset: 'custom' })}
        className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
          esPersonalizado
            ? 'border-primary bg-primary/15 font-semibold text-primary-text'
            : 'border-border text-fg-muted hover:border-border-strong hover:text-fg'
        }`}
      >
        Personalizado
      </button>

      {esPersonalizado && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            className="filter-input"
            style={{ maxWidth: '150px' }}
            value={periodo.desde || ''}
            onChange={(e) => onChange({ ...periodo, preset: 'custom', desde: e.target.value })}
            title="Desde"
          />
          <span className="text-xs text-fg-subtle">→</span>
          <input
            type="date"
            className="filter-input"
            style={{ maxWidth: '150px' }}
            value={periodo.hasta || ''}
            onChange={(e) => onChange({ ...periodo, preset: 'custom', hasta: e.target.value })}
            title="Hasta"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Selector de columnas visibles. Las columnas marcadas como `fija` no se
 * pueden ocultar (la identificación de la fila tiene que quedar siempre).
 * La preferencia la persiste quien llama, vía usePreferenciaLocal.
 */
export function SelectorColumnas({ columnas, visibles, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alClickAfuera = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false);
    };
    const alEscape = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', alClickAfuera);
    document.addEventListener('keydown', alEscape);
    return () => {
      document.removeEventListener('mousedown', alClickAfuera);
      document.removeEventListener('keydown', alEscape);
    };
  }, [abierto]);

  const alternar = (id) => {
    onChange(visibles.includes(id) ? visibles.filter((c) => c !== id) : [...visibles, id]);
  };

  const opcionales = columnas.filter((c) => !c.fija);
  const activas = opcionales.filter((c) => visibles.includes(c.id)).length;

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        <Columns3 size={14} /> Columnas
        <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.65rem] text-fg-muted">
          {activas}/{opcionales.length}
        </span>
      </button>

      {abierto && (
        <div className="absolute right-0 z-20 mt-1.5 max-h-80 w-60 overflow-y-auto rounded-xl border border-border bg-surface-2 p-1.5 shadow-xl">
          <p className="m-0 px-2 py-1.5 text-[0.68rem] font-medium uppercase tracking-wide text-fg-subtle">
            Mostrar columnas
          </p>
          {opcionales.map((col) => {
            const activa = visibles.includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => alternar(col.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                  activa ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong'
                }`}>
                  {activa && <Check size={10} strokeWidth={3} />}
                </span>
                {col.label}
              </button>
            );
          })}
          <div className="mt-1 flex gap-1 border-t border-border pt-1">
            <button
              type="button"
              onClick={() => onChange(opcionales.map((c) => c.id))}
              className="flex-1 rounded-lg px-2 py-1.5 text-[0.7rem] text-fg-muted hover:bg-surface-3 hover:text-fg"
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex-1 rounded-lg px-2 py-1.5 text-[0.7rem] text-fg-muted hover:bg-surface-3 hover:text-fg"
            >
              Ninguna
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Punto de color + texto, para estados de fila y de sincronización. */
export function Punto({ color, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

/** Input de búsqueda con ícono y botón de limpiar. */
export function CampoBusqueda({ valor, onChange, placeholder = 'Buscar...', ancho = '240px' }) {
  return (
    <div className="relative">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
      <input
        className="filter-input"
        style={{ maxWidth: ancho, paddingLeft: '2rem', paddingRight: valor ? '1.9rem' : undefined }}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0 text-fg-subtle hover:text-fg"
          title="Limpiar"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

/**
 * Tabla dirigida por una lista de columnas + las visibles.
 *
 * Las columnas que declaran `ordenable` (el nombre del campo que entiende
 * el backend) se vuelven un botón en el encabezado. El orden lo resuelve
 * el backend, no el navegador: la tabla está paginada, así que ordenar
 * solo la página que se ve daría un resultado equivocado.
 */
export function TablaColumnas({
  columnas, visibles, filas, cargando, claveFila, vacio,
  orden = null, onOrdenar = null,
}) {
  const activas = columnas.filter((c) => c.fija || visibles.includes(c.id));

  return (
    <div className="table-scroll-container">
      <table className="escalafy-table">
        <thead>
          <tr>
            {activas.map((c) => {
              const esOrdenable = Boolean(onOrdenar && c.ordenable);
              // `Boolean(orden) &&` primero: si `orden` es null y la columna
              // no es ordenable (las dos comparaciones dan `undefined`),
              // `undefined === undefined` daba `true` y después reventaba
              // leyendo `orden.direccion` sobre null — pasaba en el primer
              // render, antes de que llegara la respuesta del backend.
              const activa = Boolean(orden) && orden.campo === c.ordenable;
              const Icono = !activa ? ChevronsUpDown : (orden.direccion === 'ASC' ? ArrowUp : ArrowDown);

              return (
                <th key={c.id} className={c.clase ? 'text-right' : undefined}>
                  {esOrdenable ? (
                    <button
                      type="button"
                      onClick={() => onOrdenar(c.ordenable, c.direccionInicial)}
                      className={`inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-inherit ${
                        c.clase ? 'flex-row-reverse' : ''
                      } ${activa ? 'text-fg' : 'hover:text-fg'}`}
                      title={`Ordenar por ${c.label}`}
                    >
                      {c.label}
                      <Icono size={11} className={activa ? '' : 'opacity-40'} />
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={`sk-${i}`}><td colSpan={activas.length} style={{ padding: '1rem' }}><div className="skeleton-row" style={{ width: '100%' }} /></td></tr>
            ))
          ) : filas.length === 0 ? (
            <tr><td colSpan={activas.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-fg-muted)' }}>{vacio}</td></tr>
          ) : (
            filas.map((fila) => (
              <tr key={claveFila(fila)}>
                {activas.map((c) => <td key={c.id} className={c.clase}>{c.render(fila)}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Pie de paginación. `etiqueta` describe el total (ej. "42 productos"). */
export function Paginacion({ pagina, totalPaginas, etiqueta, cargando, onCambio }) {
  return (
    <div className="pagination-controls">
      <button onClick={() => onCambio(pagina - 1)} disabled={pagina <= 1 || cargando}>
        <ChevronLeft size={16} /> Anterior
      </button>
      <span style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)', fontWeight: 600 }}>
        {cargando ? 'Cargando...' : `Página ${pagina} de ${Math.max(1, totalPaginas)}${etiqueta ? ` · ${etiqueta}` : ''}`}
      </span>
      <button onClick={() => onCambio(pagina + 1)} disabled={pagina >= totalPaginas || cargando}>
        Siguiente <ChevronRight size={16} />
      </button>
    </div>
  );
}
