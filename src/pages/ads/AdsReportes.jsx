import { useState, useEffect, useCallback } from 'react';
import {
  FileText, ArrowLeft, Trash2, Link2, Upload, AlertTriangle, CheckCircle2, Eye, ArrowUpDown,
} from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import {
  formatPYG, formatPYGCorto, formatNum, formatPct, formatROAS, formatFecha,
  formatFechaHora, usePreferenciaLocal, useBusquedaDebounced, alternarOrden, FILAS_POR_PAGINA,
} from './adsShared';
import {
  EncabezadoSeccion, EstadoVacio, SelectorColumnas, TarjetaKpi, Punto,
  CampoBusqueda, TablaColumnas, Paginacion,
} from './adsUI';
import {
  COLUMNAS_PRODUCTO, VISIBLES_PRODUCTO_INICIAL,
  COLUMNAS_FILA, VISIBLES_FILA_INICIAL,
} from './adsColumnas';

/**
 * Vista "Reportes": historial de reportes importados (tarjetas) y, al
 * abrir uno, su detalle con el rendimiento por producto y los datos que
 * trajo ese archivo.
 *
 * Todos los filtros y el orden los resuelve el backend, por POST: las
 * listas están paginadas de 10 en 10, así que buscar u ordenar solo la
 * página que se ve daría un resultado equivocado.
 */

const ORDEN_HISTORIAL = [
  { campo: 'created_at', label: 'Importación más reciente', direccion: 'DESC' },
  { campo: 'fecha_inicio_reporte', label: 'Período del informe', direccion: 'DESC' },
  { campo: 'filas_totales', label: 'Más datos', direccion: 'DESC' },
  { campo: 'filas_sin_match', label: 'Más pendientes', direccion: 'DESC' },
  { campo: 'nombre_archivo', label: 'Nombre del archivo', direccion: 'ASC' },
];

export default function AdsReportes({ irA, onImportar, refrescoExterno }) {
  const [datos, setDatos] = useState({ importaciones: [], total: 0, pagina: 1, total_paginas: 1 });
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(null); // importación seleccionada

  const [busqueda, setBusqueda, busquedaAplicada] = useBusquedaDebounced();
  const [estado, setEstado] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState(ORDEN_HISTORIAL[0]);

  const cargar = useCallback(() => {
    setCargando(true);
    return metaReportesService.listarImportaciones({
      pagina,
      limite: FILAS_POR_PAGINA,
      ...(busquedaAplicada ? { busqueda: busquedaAplicada } : {}),
      ...(estado !== 'todos' ? { estado } : {}),
      orden: { campo: orden.campo, direccion: orden.direccion },
    })
      .then(setDatos)
      .catch(() => setDatos({ importaciones: [], total: 0, pagina: 1, total_paginas: 1 }))
      .finally(() => setCargando(false));
  }, [pagina, busquedaAplicada, estado, orden]);

  useEffect(() => { cargar(); }, [cargar, refrescoExterno]);

  // Cambiar un filtro tiene que volver a la primera página: si estabas en
  // la 4 y el filtro deja 2, la consulta traería una página vacía.
  useEffect(() => { setPagina(1); }, [busquedaAplicada, estado, orden]);

  const eliminar = async (imp) => {
    const ok = window.confirm(
      `¿Deshacer la importación de "${imp.nombre_archivo}"?\n\nSe borran los ${formatNum(imp.filas_totales)} datos que trajo ese archivo. Las campañas y los pedidos no se tocan.`,
    );
    if (!ok) return;
    try {
      await metaReportesService.eliminarImportacion(imp.id);
      if (abierto?.id === imp.id) setAbierto(null);
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'No se pudo deshacer la importación.');
    }
  };

  if (abierto) {
    return <DetalleReporte importacion={abierto} onVolver={() => setAbierto(null)} irA={irA} />;
  }

  const hayFiltros = Boolean(busquedaAplicada) || estado !== 'todos';
  const importaciones = datos.importaciones || [];

  return (
    <div className="flex flex-col gap-3">
      <EncabezadoSeccion
        titulo="Historial de reportes"
        descripcion="Cada archivo de Meta que importaste. Abrí uno para ver su rendimiento por producto y los datos que trajo."
      >
        <button type="button" className="btn-primary" onClick={onImportar}>
          <Upload size={15} style={{ marginRight: '0.35rem' }} /> Importar datos
        </button>
      </EncabezadoSeccion>

      {/* Filtros — todos resueltos por el backend */}
      <div className="flex flex-wrap items-center gap-2">
        <CampoBusqueda valor={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre de archivo..." />
        <select className="filter-input" style={{ maxWidth: '190px' }} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="con_pendientes">Con pendientes</option>
          <option value="completo">Todo relacionado</option>
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted" title="Ordenar">
          <ArrowUpDown size={13} />
          <select
            className="filter-input"
            style={{ maxWidth: '210px' }}
            value={orden.campo}
            onChange={(e) => setOrden(ORDEN_HISTORIAL.find((o) => o.campo === e.target.value) || ORDEN_HISTORIAL[0])}
          >
            {ORDEN_HISTORIAL.map((o) => <option key={o.campo} value={o.campo}>{o.label}</option>)}
          </select>
        </label>
        {!cargando && (
          <span className="text-xs text-fg-subtle">
            {formatNum(datos.total)} {datos.total === 1 ? 'reporte' : 'reportes'}
          </span>
        )}
      </div>

      {cargando ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-row" style={{ height: '190px' }} />)}
        </div>
      ) : importaciones.length === 0 ? (
        <EstadoVacio
          icono={FileText}
          titulo={hayFiltros ? 'Ningún reporte coincide con los filtros' : 'Todavía no importaste ningún reporte'}
          descripcion={hayFiltros
            ? 'Probá con otro texto o quitá el filtro de estado.'
            : 'Exportá "Rendimiento de campaña" desde Meta Ads Manager en .csv e importalo acá. El resto lo relaciona Gesicomm.'}
        >
          {!hayFiltros && (
            <button type="button" className="btn-primary mt-1" onClick={onImportar}>
              <Upload size={15} style={{ marginRight: '0.35rem' }} /> Importar datos de Meta
            </button>
          )}
        </EstadoVacio>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {importaciones.map((imp) => (
              <TarjetaReporte
                key={imp.id}
                importacion={imp}
                onAbrir={() => setAbierto(imp)}
                onRelacionar={() => irA('relaciones')}
                onEliminar={() => eliminar(imp)}
              />
            ))}
          </div>

          {(datos.total_paginas || 1) > 1 && (
            <div className="data-table-wrapper">
              <Paginacion
                pagina={datos.pagina || 1}
                totalPaginas={datos.total_paginas || 1}
                etiqueta={`${formatNum(datos.total)} ${datos.total === 1 ? 'reporte' : 'reportes'}`}
                cargando={cargando}
                onCambio={setPagina}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TarjetaReporte({ importacion: imp, onAbrir, onRelacionar, onEliminar }) {
  const pendientes = imp.filas_sin_match || 0;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
          <FileText size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-sm font-semibold text-fg" title={imp.nombre_archivo}>{imp.nombre_archivo}</h3>
          <p className="m-0 mt-0.5 text-[0.72rem] text-fg-subtle">
            {imp.fecha_inicio_reporte
              ? `${formatFecha(imp.fecha_inicio_reporte)} → ${formatFecha(imp.fecha_fin_reporte)}`
              : 'Sin período declarado'}
          </p>
        </div>
      </div>

      <dl className="m-0 grid grid-cols-3 gap-2">
        {[
          { k: 'Datos', v: formatNum(imp.filas_totales) },
          { k: 'Relacionados', v: formatNum(imp.filas_matcheadas) },
          { k: 'Pendientes', v: formatNum(pendientes) },
        ].map(({ k, v }) => (
          <div key={k}>
            <dt className="m-0 text-[0.65rem] uppercase tracking-wide text-fg-subtle">{k}</dt>
            <dd className="m-0 font-mono text-sm font-semibold text-fg">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {pendientes > 0
          ? <Punto color="#f59e0b"><span className="text-warning">{formatNum(pendientes)} sin relacionar</span></Punto>
          : <Punto color="#10b981">Todo relacionado</Punto>}
        <span className="text-[0.7rem] text-fg-subtle">Importado {formatFechaHora(imp.created_at)}</span>
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
        <button type="button" className="btn-secondary" onClick={onAbrir}>
          <Eye size={14} style={{ marginRight: '0.3rem' }} /> Ver reporte
        </button>
        {pendientes > 0 && (
          <button type="button" className="btn-secondary" onClick={onRelacionar}>
            <Link2 size={14} style={{ marginRight: '0.3rem' }} /> Relacionar
          </button>
        )}
        <button type="button" className="btn-icon danger ml-auto" title="Deshacer importación" onClick={onEliminar}>
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}

/** Detalle de un reporte: KPIs propios del archivo + productos + datos crudos. */
function DetalleReporte({ importacion: imp, onVolver, irA }) {
  const [vista, setVista] = useState('productos');
  const [resumen, setResumen] = useState(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);

  // El gasto se acota por `import_id`, pero los pedidos salen de Envíos y
  // se acotan por fecha: sin esto serían los pedidos de todo el historial.
  const rangoDelReporte = {
    ...(imp.fecha_inicio_reporte ? { fecha_desde: imp.fecha_inicio_reporte } : {}),
    ...(imp.fecha_fin_reporte ? { fecha_hasta: imp.fecha_fin_reporte } : {}),
  };

  useEffect(() => {
    setCargandoResumen(true);
    metaReportesService.resumen({ import_id: imp.id, ...rangoDelReporte })
      .then(setResumen)
      .catch(() => setResumen(null))
      .finally(() => setCargandoResumen(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imp.id]);

  const meta = resumen?.actual?.meta;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button type="button" onClick={onVolver} className="mb-2 inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-xs text-fg-muted hover:text-fg">
          <ArrowLeft size={14} /> Historial de reportes
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold text-fg">{imp.nombre_archivo}</h2>
            <p className="m-0 mt-1 text-xs text-fg-muted">
              {imp.fecha_inicio_reporte
                ? `${formatFecha(imp.fecha_inicio_reporte)} → ${formatFecha(imp.fecha_fin_reporte)}`
                : 'Sin período declarado'}
              {' · '}{formatNum(imp.filas_totales)} datos · importado {formatFechaHora(imp.created_at)}
            </p>
          </div>
          {imp.filas_sin_match > 0 ? (
            <button type="button" className="btn-secondary" onClick={() => irA('relaciones')}>
              <AlertTriangle size={14} style={{ marginRight: '0.3rem' }} /> Resolver {formatNum(imp.filas_sin_match)} pendientes
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 size={14} /> Todo relacionado
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaKpi label="Inversión" valor={formatPYGCorto(meta?.inversion)} hint={cargandoResumen ? null : formatPYG(meta?.inversion)} cargando={cargandoResumen} />
        <TarjetaKpi label="Compras" valor={formatNum(meta?.compras)} cargando={cargandoResumen} />
        <TarjetaKpi label="ROAS" valor={formatROAS(meta?.roas)} hint={cargandoResumen ? null : `${formatPYGCorto(meta?.valor_conversion)} de retorno`} cargando={cargandoResumen} />
        <TarjetaKpi label="CPA" valor={formatPYGCorto(meta?.cpa)} menosEsMejor hint={meta?.ctr ? `CTR ${formatPct(meta.ctr, 2)}` : null} cargando={cargandoResumen} />
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'productos', label: 'Rendimiento por producto' },
          { id: 'datos', label: 'Datos importados' },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVista(v.id)}
            className={`border-b-2 border-solid bg-transparent px-3 py-2 text-[0.82rem] transition-colors ${
              vista === v.id
                ? 'border-primary font-semibold text-fg'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vista === 'productos'
        ? <TablaProductos importId={imp.id} rango={rangoDelReporte} />
        : <TablaFilas importId={imp.id} />}
    </div>
  );
}

/**
 * Rendimiento por producto. La usan el detalle de un reporte y el detalle
 * de una campaña — búsqueda, orden y paginación los resuelve el backend.
 */
export function TablaProductos({ importId = null, campanaId = null, rango = {} }) {
  const [datos, setDatos] = useState({ productos: [], total: 0, pagina: 1, total_paginas: 1, orden: null });
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: 'gasto_ads', direccion: 'DESC' });
  // En el detalle de una campaña interesan todos sus productos, tengan
  // gasto en el período o no; en un reporte, solo los que gastaron.
  const [incluirSinGasto, setIncluirSinGasto] = useState(Boolean(campanaId));
  const [busqueda, setBusqueda, busquedaAplicada] = useBusquedaDebounced();
  const [visibles, setVisibles] = usePreferenciaLocal('ads:columnas:producto', VISIBLES_PRODUCTO_INICIAL);

  useEffect(() => {
    setCargando(true);
    metaReportesService.metricasPorProducto({
      ...(importId ? { import_id: importId } : {}),
      ...(campanaId ? { campana_id: campanaId } : {}),
      ...rango,
      ...(busquedaAplicada ? { busqueda: busquedaAplicada } : {}),
      ...(incluirSinGasto ? { solo_con_gasto: false } : {}),
      orden,
      pagina,
      limite: FILAS_POR_PAGINA,
    })
      .then(setDatos)
      .catch(() => setDatos({ productos: [], total: 0, pagina: 1, total_paginas: 1, orden: null }))
      .finally(() => setCargando(false));
    // `rango` es estable mientras no cambie el reporte o la campaña abiertos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId, campanaId, pagina, incluirSinGasto, busquedaAplicada, orden]);

  useEffect(() => { setPagina(1); }, [busquedaAplicada, incluirSinGasto, orden]);

  const ordenar = (campo, direccionInicial) => setOrden((prev) => alternarOrden(prev, campo, direccionInicial));

  // El backend puede haber ignorado el orden pedido (ordenar por una
  // métrica calculada necesita acotar los productos) y lo avisa.
  const ordenIgnorado = datos.orden?.motivo;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CampoBusqueda valor={busqueda} onChange={setBusqueda} placeholder="Buscar producto o SKU..." />
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-fg-muted">
            <input type="checkbox" checked={incluirSinGasto} onChange={(e) => setIncluirSinGasto(e.target.checked)} />
            Incluir productos sin inversión
          </label>
          <SelectorColumnas columnas={COLUMNAS_PRODUCTO} visibles={visibles} onChange={setVisibles} />
        </div>
      </div>

      <p className="m-0 max-w-3xl text-[0.72rem] text-fg-subtle">
        Pedidos, confirmados y entregados son del producto completo en el período: no se acotan a la campaña,
        porque el pedido no guarda de qué campaña vino.
      </p>

      {ordenIgnorado && (
        <p className="m-0 text-[0.72rem] text-warning">
          Ordenado por nombre: {ordenIgnorado}. Destildá "Incluir productos sin inversión" para ordenar por métricas.
        </p>
      )}

      <div className="data-table-wrapper">
        <TablaColumnas
          columnas={COLUMNAS_PRODUCTO}
          visibles={visibles}
          filas={datos.productos || []}
          cargando={cargando}
          claveFila={(m) => m.producto_id}
          orden={datos.orden}
          onOrdenar={ordenar}
          vacio={busquedaAplicada
            ? 'Ningún producto coincide con la búsqueda.'
            : (incluirSinGasto
              ? 'No hay productos para mostrar.'
              : 'Ningún producto tuvo inversión acá. Tildá "Incluir productos sin inversión" para ver el resto.')}
        />
        <Paginacion
          pagina={datos.pagina || 1}
          totalPaginas={datos.total_paginas || 1}
          etiqueta={`${formatNum(datos.total)} ${datos.total === 1 ? 'producto' : 'productos'}`}
          cargando={cargando}
          onCambio={setPagina}
        />
      </div>
    </div>
  );
}

/** Datos crudos: las filas tal como vinieron del archivo de Meta. */
export function TablaFilas({ importId = null, campanaId = null }) {
  const [datos, setDatos] = useState({ filas: [], total: 0, pagina: 1, total_paginas: 1, orden: null });
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: 'fecha_inicio', direccion: 'DESC' });
  const [estadoVinculo, setEstadoVinculo] = useState('todas');
  const [busqueda, setBusqueda, busquedaAplicada] = useBusquedaDebounced();
  const [visibles, setVisibles] = usePreferenciaLocal('ads:columnas:fila', VISIBLES_FILA_INICIAL);

  useEffect(() => {
    setCargando(true);
    metaReportesService.listarFilas({
      ...(importId ? { meta_reporte_import_id: importId } : {}),
      ...(campanaId ? { meta_campana_interna_id: campanaId } : {}),
      ...(busquedaAplicada ? { busqueda: busquedaAplicada } : {}),
      ...(estadoVinculo !== 'todas' ? { estado_vinculo: estadoVinculo } : {}),
      orden,
      pagina,
      limite: FILAS_POR_PAGINA,
    })
      .then(setDatos)
      .catch(() => setDatos({ filas: [], total: 0, pagina: 1, total_paginas: 1, orden: null }))
      .finally(() => setCargando(false));
  }, [importId, campanaId, pagina, busquedaAplicada, estadoVinculo, orden]);

  useEffect(() => { setPagina(1); }, [busquedaAplicada, estadoVinculo, orden]);

  const ordenar = (campo, direccionInicial) => setOrden((prev) => alternarOrden(prev, campo, direccionInicial));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CampoBusqueda valor={busqueda} onChange={setBusqueda} placeholder="Buscar campaña de Meta..." />
          <select className="filter-input" style={{ maxWidth: '180px' }} value={estadoVinculo} onChange={(e) => setEstadoVinculo(e.target.value)}>
            <option value="todas">Relacionados y no</option>
            <option value="vinculadas">Solo relacionados</option>
            <option value="sin_vincular">Solo pendientes</option>
          </select>
        </div>
        <SelectorColumnas columnas={COLUMNAS_FILA} visibles={visibles} onChange={setVisibles} />
      </div>

      <div className="data-table-wrapper">
        <TablaColumnas
          columnas={COLUMNAS_FILA}
          visibles={visibles}
          filas={datos.filas || []}
          cargando={cargando}
          claveFila={(f) => f.id}
          orden={datos.orden}
          onOrdenar={ordenar}
          vacio={busquedaAplicada || estadoVinculo !== 'todas'
            ? 'Ningún dato coincide con los filtros.'
            : 'Este reporte no tiene datos.'}
        />
        <Paginacion
          pagina={datos.pagina || 1}
          totalPaginas={datos.total_paginas || 1}
          etiqueta={`${formatNum(datos.total)} ${datos.total === 1 ? 'dato' : 'datos'}`}
          cargando={cargando}
          onCambio={setPagina}
        />
      </div>
    </div>
  );
}
