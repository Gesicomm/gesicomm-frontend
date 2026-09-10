import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Link2, Loader2, Check, AlertTriangle, Sparkles, Unlink, CheckCircle2, Megaphone, ArrowUpDown,
} from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import {
  formatPYG, formatNum, formatFecha, formatPct, sugerirCampanas,
  useBusquedaDebounced, FILAS_POR_PAGINA,
} from './adsShared';
import { EncabezadoSeccion, EstadoVacio, CampoBusqueda, Paginacion } from './adsUI';

/**
 * Vista "Relaciones": el único lugar donde se conecta un dato de Meta con
 * una campaña de Gesicomm.
 *
 * Antes esto era un <select> dentro de cada fila de una tabla de 18
 * columnas, lo que hacía la tabla ilegible y la tarea invisible. Acá la
 * tarea es la pantalla.
 *
 * El vínculo automático (por el código [GSC-XXXX] en el nombre de la
 * campaña de Meta) no cambió. Lo que se agrega son sugerencias por
 * parecido de nombre, calculadas en el navegador, que solo ORDENAN las
 * opciones: nada se relaciona sin que el usuario lo confirme.
 */

const ORDEN_RELACIONES = [
  { campo: 'importe_gastado', label: 'Más gasto primero', direccion: 'DESC' },
  { campo: 'fecha_inicio', label: 'Más reciente primero', direccion: 'DESC' },
  { campo: 'nombre_campana_meta', label: 'Nombre de la campaña', direccion: 'ASC' },
  { campo: 'compras', label: 'Más compras primero', direccion: 'DESC' },
];

export default function AdsRelaciones({ campanas, onCambio, refrescoExterno }) {
  const [vista, setVista] = useState('pendientes');
  const [datos, setDatos] = useState({ filas: [], total: 0, pagina: 1, total_paginas: 1 });
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState(ORDEN_RELACIONES[0]);
  const [busqueda, setBusqueda, busquedaAplicada] = useBusquedaDebounced();
  const [guardandoId, setGuardandoId] = useState(null);
  const [guardandoLote, setGuardandoLote] = useState(false);
  const [elegidas, setElegidas] = useState({}); // fila.id -> campana.id

  const cargar = useCallback(() => {
    setCargando(true);
    // `estado_vinculo` lo filtra el backend: antes esta vista traía una
    // página mezclada y descartaba a mano las que seguían sin vincular, y
    // el total que mostraba era el de las dos cosas juntas.
    return metaReportesService.listarFilas({
      pagina,
      limite: FILAS_POR_PAGINA,
      estado_vinculo: vista === 'pendientes' ? 'sin_vincular' : 'vinculadas',
      ...(busquedaAplicada ? { busqueda: busquedaAplicada } : {}),
      orden: { campo: orden.campo, direccion: orden.direccion },
    })
      .then(setDatos)
      .catch(() => setDatos({ filas: [], total: 0, pagina: 1, total_paginas: 1 }))
      .finally(() => setCargando(false));
  }, [vista, pagina, busquedaAplicada, orden]);

  useEffect(() => { cargar(); }, [cargar, refrescoExterno]);
  useEffect(() => { setPagina(1); setElegidas({}); }, [vista, busquedaAplicada, orden]);

  const campanasVigentes = useMemo(
    () => campanas.filter((c) => c.estado !== 'archivada'),
    [campanas],
  );

  // Sugerencia por fila, memorizada: recalcularla en cada render haría
  // trabajo de más por cada tecla que se toque en la pantalla.
  const sugerencias = useMemo(() => {
    const mapa = new Map();
    if (vista !== 'pendientes') return mapa;
    for (const fila of datos.filas) {
      mapa.set(fila.id, sugerirCampanas(fila.nombre_campana_meta, campanasVigentes));
    }
    return mapa;
  }, [datos.filas, campanasVigentes, vista]);

  const relacionar = async (filaId, campanaId) => {
    setGuardandoId(filaId);
    try {
      await metaReportesService.vincularFila(filaId, campanaId || null);
      setElegidas((prev) => { const { [filaId]: _descartada, ...resto } = prev; return resto; });
      // No se recarga acá: onCambio sube el contador de refresco del shell
      // y eso ya dispara la recarga de esta lista (si no, van dos pedidos).
      onCambio();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'No se pudo relacionar.');
    } finally {
      setGuardandoId(null);
    }
  };

  /** Aplica de una vez todas las elecciones pendientes de la página. */
  const relacionarLote = async () => {
    const pares = Object.entries(elegidas).filter(([, campanaId]) => campanaId);
    if (pares.length === 0) return;
    setGuardandoLote(true);
    const fallidas = [];
    for (const [filaId, campanaId] of pares) {
      try {
        // Secuencial a propósito: son pocas y así un error no deja la
        // pantalla a medio actualizar sin saber cuáles entraron.
        // eslint-disable-next-line no-await-in-loop
        await metaReportesService.vincularFila(Number(filaId), campanaId);
      } catch {
        fallidas.push(filaId);
      }
    }
    setElegidas({});
    setGuardandoLote(false);
    onCambio();
    if (fallidas.length > 0) {
      alert(`${fallidas.length} de ${pares.length} no se pudieron relacionar. Probá de nuevo con esas.`);
    }
  };

  const cantidadElegidas = Object.values(elegidas).filter(Boolean).length;

  const aplicarTodasLasSugerencias = () => {
    const siguiente = { ...elegidas };
    for (const fila of datos.filas) {
      const mejor = (sugerencias.get(fila.id) || [])[0];
      if (mejor && mejor.puntaje >= 0.4) siguiente[fila.id] = String(mejor.campana.id);
    }
    setElegidas(siguiente);
  };

  const haySugerenciasFuertes = datos.filas.some((f) => {
    const mejor = (sugerencias.get(f.id) || [])[0];
    return mejor && mejor.puntaje >= 0.4;
  });

  return (
    <div className="flex flex-col gap-3">
      <EncabezadoSeccion
        titulo="Relaciones"
        descripcion="Cada dato que viene de Meta tiene que apuntar a una campaña de Gesicomm para que su gasto llegue a un producto. Los que traen el código [GSC-…] en el nombre se relacionan solos; el resto se resuelve acá."
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5">
            {[
              { id: 'pendientes', label: 'Pendientes', icono: AlertTriangle },
              { id: 'relacionadas', label: 'Relacionadas', icono: CheckCircle2 },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVista(v.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  vista === v.id
                    ? 'border-primary bg-primary/15 font-semibold text-primary-text'
                    : 'border-border text-fg-muted hover:border-border-strong hover:text-fg'
                }`}
              >
                <v.icono size={13} /> {v.label}
                {vista === v.id && !cargando && (
                  <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.65rem]">{formatNum(datos.total)}</span>
                )}
              </button>
            ))}
          </div>

          <CampoBusqueda valor={busqueda} onChange={setBusqueda} placeholder="Buscar campaña de Meta..." />

          <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted" title="Ordenar">
            <ArrowUpDown size={13} />
            <select
              className="filter-input"
              style={{ maxWidth: '200px' }}
              value={orden.campo}
              onChange={(e) => setOrden(ORDEN_RELACIONES.find((o) => o.campo === e.target.value) || ORDEN_RELACIONES[0])}
            >
              {ORDEN_RELACIONES.map((o) => <option key={o.campo} value={o.campo}>{o.label}</option>)}
            </select>
          </label>
        </div>

        {vista === 'pendientes' && datos.filas.length > 0 && (
          <div className="flex items-center gap-2">
            {haySugerenciasFuertes && (
              <button type="button" className="btn-secondary" onClick={aplicarTodasLasSugerencias} disabled={guardandoLote}>
                <Sparkles size={14} style={{ marginRight: '0.3rem' }} /> Usar sugerencias
              </button>
            )}
            <button type="button" className="btn-primary" onClick={relacionarLote} disabled={cantidadElegidas === 0 || guardandoLote}>
              {guardandoLote
                ? <Loader2 size={14} className="animate-spin" style={{ marginRight: '0.3rem' }} />
                : <Link2 size={14} style={{ marginRight: '0.3rem' }} />}
              Relacionar {cantidadElegidas > 0 ? `(${cantidadElegidas})` : ''}
            </button>
          </div>
        )}
      </div>

      {campanasVigentes.length === 0 && !cargando && (
        <p className="m-0 flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          <AlertTriangle size={14} /> No tenés campañas activas para relacionar. Creá una en Campañas primero.
        </p>
      )}

      {cargando ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-row" style={{ height: '68px' }} />)}
        </div>
      ) : datos.filas.length === 0 ? (
        <EstadoVacio
          icono={vista === 'pendientes' ? CheckCircle2 : Megaphone}
          titulo={busquedaAplicada
            ? 'Ningún dato coincide con la búsqueda'
            : (vista === 'pendientes' ? 'No hay nada pendiente' : 'Todavía no hay datos relacionados')}
          descripcion={busquedaAplicada
            ? 'Probá con otro texto.'
            : (vista === 'pendientes'
              ? 'Todos los datos importados están relacionados con una campaña.'
              : 'Cuando relaciones datos de Meta con tus campañas, van a aparecer acá.')}
        />
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {datos.filas.map((fila) => (
              <FilaRelacion
                key={fila.id}
                fila={fila}
                campanas={campanasVigentes}
                sugerencias={sugerencias.get(fila.id) || []}
                elegida={elegidas[fila.id] || ''}
                onElegir={(campanaId) => setElegidas((prev) => ({ ...prev, [fila.id]: campanaId }))}
                onRelacionar={relacionar}
                guardando={guardandoId === fila.id}
                modo={vista}
              />
            ))}
          </ul>

          <div className="data-table-wrapper">
            <Paginacion
              pagina={datos.pagina || 1}
              totalPaginas={datos.total_paginas || 1}
              etiqueta={`${formatNum(datos.total)} ${datos.total === 1 ? 'dato' : 'datos'}`}
              cargando={cargando}
              onCambio={setPagina}
            />
          </div>
        </>
      )}
    </div>
  );
}

function FilaRelacion({ fila, campanas, sugerencias, elegida, onElegir, onRelacionar, guardando, modo }) {
  const esPendiente = modo === 'pendientes';
  const mejor = sugerencias[0];

  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Lado Meta */}
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[0.7rem] uppercase tracking-wide text-fg-subtle">Meta</p>
          <p className="m-0 mt-0.5 break-words text-sm font-medium text-fg">{fila.nombre_campana_meta}</p>
          <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.72rem] text-fg-subtle">
            <span>{formatFecha(fila.fecha_inicio)} → {formatFecha(fila.fecha_fin)}</span>
            <span>Gasto {formatPYG(fila.importe_gastado)}</span>
            {fila.compras > 0 && <span>{formatNum(fila.compras)} compras</span>}
          </p>
        </div>

        {/* Lado Gesicomm */}
        <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-80">
          <p className="m-0 text-[0.7rem] uppercase tracking-wide text-fg-subtle">Gesicomm</p>
          <div className="flex items-center gap-2">
            <select
              className="filter-input"
              style={{ flex: 1 }}
              value={esPendiente ? elegida : (fila.meta_campana_interna_id || '')}
              disabled={guardando}
              onChange={(e) => {
                const valor = e.target.value;
                if (esPendiente) onElegir(valor);
                else onRelacionar(fila.id, valor || null);
              }}
            >
              <option value="">{esPendiente ? 'Elegir campaña...' : 'Sin relacionar'}</option>
              {campanas.map((c) => <option key={c.id} value={c.id}>{c.nombre_display}</option>)}
            </select>

            {esPendiente ? (
              <button
                type="button"
                className="btn-secondary"
                disabled={!elegida || guardando}
                onClick={() => onRelacionar(fila.id, elegida)}
                title="Relacionar este dato"
              >
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
            ) : (
              <button
                type="button"
                className="btn-icon danger"
                disabled={guardando}
                onClick={() => onRelacionar(fila.id, null)}
                title="Quitar la relación"
              >
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={15} />}
              </button>
            )}
          </div>

          {esPendiente && sugerencias.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[0.68rem] text-fg-subtle">
                <Sparkles size={11} /> Sugerencias:
              </span>
              {sugerencias.map(({ campana, puntaje }) => (
                <button
                  key={campana.id}
                  type="button"
                  onClick={() => onElegir(String(campana.id))}
                  className={`rounded-md border px-1.5 py-0.5 text-[0.68rem] transition-colors ${
                    String(elegida) === String(campana.id)
                      ? 'border-primary bg-primary/15 text-primary-text'
                      : 'border-border text-fg-muted hover:border-border-strong hover:text-fg'
                  }`}
                  title={`Parecido de nombre: ${formatPct(puntaje * 100, 0)}`}
                >
                  {campana.nombre_display} · {formatPct(puntaje * 100, 0)}
                </button>
              ))}
            </div>
          )}

          {esPendiente && sugerencias.length === 0 && campanas.length > 0 && (
            <p className="m-0 text-[0.68rem] text-fg-subtle">
              Sin sugerencias: el nombre no se parece a ninguna campaña. Elegila a mano.
            </p>
          )}

          {esPendiente && mejor && mejor.puntaje < 0.4 && (
            <p className="m-0 text-[0.68rem] text-warning">Parecido bajo — revisá antes de confirmar.</p>
          )}
        </div>
      </div>
    </li>
  );
}
