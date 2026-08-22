import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Plus, Copy, Check, Loader2, Edit2, Link2, Trash2,
  Archive, AlertCircle, ChevronLeft, ChevronRight, Package,
  MessageCircle, Globe, Play, Pause, Zap,
} from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import { productService } from '../../services/productService';
import CampanaInternaModal from './CampanaInternaModal';

const formatPYG = (value) => new Intl.NumberFormat('es-PY', {
  style: 'currency', currency: 'PYG', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(value || 0);

const formatNum = (value) => new Intl.NumberFormat('es-PY').format(value || 0);

const formatPct = (value) => `${(value || 0).toFixed(1)}%`;

const formatFecha = (value) => {
  if (!value) return '-';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
};

const badgeEstado = {
  borrador: { bg: 'rgba(156,163,175,0.1)', color: '#9ca3af' },
  activa: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  pausada: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  archivada: { bg: 'rgba(156,163,175,0.1)', color: '#9ca3af' },
};

/**
 * Pestaña "Reportes & Productos" de Ads & Campañas.
 *
 * 3 secciones:
 *  1. Campañas internas — crear/gestionar (botón "Nueva Campaña", genera
 *     el nombre a copiar en Meta Ads Manager).
 *  2. Subir reporte CSV — importa el export de Meta Ads Manager y
 *     matchea automáticamente cada fila con una campaña interna.
 *  3. Métricas por producto + tabla de filas importadas.
 */
export default function MetaReportesTab({ tiendas = [] }) {
  const fileInputRef = useRef(null);

  const [campanas, setCampanas] = useState([]);
  const [cargandoCampanas, setCargandoCampanas] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [campanaEditar, setCampanaEditar] = useState(null);

  const [subiendo, setSubiendo] = useState(false);
  const [resultadoImport, setResultadoImport] = useState(null);
  const [errorImport, setErrorImport] = useState(null);

  const [metricas, setMetricas] = useState([]);
  const [totalMetricas, setTotalMetricas] = useState(0);
  const [paginaMetricas, setPaginaMetricas] = useState(1);
  const [totalPaginasMetricas, setTotalPaginasMetricas] = useState(1);
  const [tamanioPaginaMetricas, setTamanioPaginaMetricas] = useState(12);
  const [cargandoMetricas, setCargandoMetricas] = useState(true);
  const [productosFiltro, setProductosFiltro] = useState([]);
  const [filtroProductoMetricas, setFiltroProductoMetricas] = useState('ALL');
  const [filtroCampanaMetricas, setFiltroCampanaMetricas] = useState('ALL');
  const [fechaDesdeMetricas, setFechaDesdeMetricas] = useState('');
  const [fechaHastaMetricas, setFechaHastaMetricas] = useState('');

  const [filas, setFilas] = useState([]);
  const [totalFilas, setTotalFilas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargandoFilas, setCargandoFilas] = useState(true);
  const [filtroCampana, setFiltroCampana] = useState('ALL');
  const [copiadoId, setCopiadoId] = useState(null);
  const [vinculandoId, setVinculandoId] = useState(null);

  const cargarCampanas = useCallback(() => {
    setCargandoCampanas(true);
    return metaReportesService.listarCampanas()
      .then(setCampanas)
      .catch(() => setCampanas([]))
      .finally(() => setCargandoCampanas(false));
  }, []);

  const cargarMetricas = useCallback((paginaActual = 1) => {
    setCargandoMetricas(true);
    const filtros = {
      page: paginaActual,
      page_size: tamanioPaginaMetricas,
      ...(filtroProductoMetricas !== 'ALL' ? { producto_id: filtroProductoMetricas } : {}),
      ...(filtroCampanaMetricas !== 'ALL' ? { campana_id: filtroCampanaMetricas } : {}),
      ...(fechaDesdeMetricas ? { fecha_desde: fechaDesdeMetricas } : {}),
      ...(fechaHastaMetricas ? { fecha_hasta: fechaHastaMetricas } : {}),
    };
    return metaReportesService.metricasPorProducto(filtros)
      .then((res) => {
        setMetricas(res.productos || []);
        setTotalMetricas(res.total || 0);
        setPaginaMetricas(res.page || 1);
        setTotalPaginasMetricas(res.total_paginas || 1);
      })
      .catch(() => { setMetricas([]); setTotalMetricas(0); setTotalPaginasMetricas(1); })
      .finally(() => setCargandoMetricas(false));
  }, [tamanioPaginaMetricas, filtroProductoMetricas, filtroCampanaMetricas, fechaDesdeMetricas, fechaHastaMetricas]);

  const cargarFilas = useCallback((paginaActual = 1, campanaId = filtroCampana) => {
    setCargandoFilas(true);
    const filtroExtra = campanaId === 'UNLINKED'
      ? { sin_vincular: true }
      : (campanaId && campanaId !== 'ALL' ? { meta_campana_interna_id: campanaId } : {});
    return metaReportesService.listarFilas({
      pagina: paginaActual,
      limite: 20,
      ...filtroExtra,
    })
      .then((res) => {
        setFilas(res.filas || []);
        setTotalFilas(res.total || 0);
        setPagina(res.pagina || 1);
      })
      .catch(() => { setFilas([]); setTotalFilas(0); })
      .finally(() => setCargandoFilas(false));
  }, [filtroCampana]);

  useEffect(() => { cargarCampanas(); }, [cargarCampanas]);
  useEffect(() => { cargarMetricas(1); }, [cargarMetricas]);
  useEffect(() => { cargarFilas(1, filtroCampana); }, [filtroCampana, cargarFilas]);
  useEffect(() => {
    productService.buscar({ activo: true, sin_limite: true })
      .then((res) => setProductosFiltro(res.productos || []))
      .catch(() => setProductosFiltro([]));
  }, []);

  const refrescarTodo = () => { cargarCampanas(); cargarMetricas(paginaMetricas); cargarFilas(pagina, filtroCampana); };

  const handleArchivoSeleccionado = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo después
    if (!archivo) return;

    setSubiendo(true);
    setErrorImport(null);
    setResultadoImport(null);
    try {
      const meta_integration_id = tiendas.length === 1 ? tiendas[0].id : null;
      const res = await metaReportesService.importarCSV(archivo, meta_integration_id);
      setResultadoImport(res.resumen);
      refrescarTodo();
    } catch (err) {
      setErrorImport(err.response?.data?.message || err.message || 'Error al importar el archivo.');
    } finally {
      setSubiendo(false);
    }
  };

  const handleCampanaCreada = () => { refrescarTodo(); };

  const handleVincularFila = async (filaId, campanaId) => {
    setVinculandoId(filaId);
    try {
      await metaReportesService.vincularFila(filaId, campanaId || null);
      await Promise.all([cargarFilas(pagina, filtroCampana), cargarMetricas(paginaMetricas)]);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'No se pudo vincular la fila.');
    } finally {
      setVinculandoId(null);
    }
  };

  const handleEliminarCampana = async (campana) => {
    if (!window.confirm(`¿Eliminar la campaña "${campana.nombre_display}"?`)) return;
    try {
      await metaReportesService.eliminarCampana(campana.id);
      cargarCampanas();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'No se pudo eliminar.');
    }
  };

  const handleArchivarCampana = async (campana) => {
    try {
      await metaReportesService.actualizarCampana(campana.id, { estado: 'archivada' });
      cargarCampanas();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'No se pudo archivar.');
    }
  };

  // "Borrador" es el default al crearla — nada en el sistema la mueve sola
  // a "activa" cuando el comercio efectivamente la carga en Meta Ads
  // Manager, así que hace falta una acción manual para reflejar eso acá.
  const handleCambiarEstadoCampana = async (campana, nuevoEstado) => {
    try {
      await metaReportesService.actualizarCampana(campana.id, { estado: nuevoEstado });
      cargarCampanas();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'No se pudo cambiar el estado.');
    }
  };

  const copiarTexto = (texto, id) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 1800);
    });
  };

  const totalPaginas = Math.max(1, Math.ceil(totalFilas / 20));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ---- Campañas internas ---- */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Campañas internas</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#888' }}>
              Generá un nombre para copiar en Meta Ads Manager, vinculado a tus productos y funnel.
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={() => { setCampanaEditar(null); setModalOpen(true); }}>
            <Plus size={16} style={{ marginRight: '0.35rem' }} /> Nueva Campaña
          </button>
        </div>

        {cargandoCampanas ? (
          <div className="skeleton-row" style={{ height: '60px' }} />
        ) : campanas.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', padding: '2rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
            Todavía no creaste ninguna campaña interna.
          </div>
        ) : (
          <div className="data-table-wrapper">
            <div className="table-scroll-container">
              <table className="escalafy-table">
                <thead>
                  <tr>
                    <th>Campaña</th>
                    <th>Productos</th>
                    <th>Funnel</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {campanas.map((c) => {
                    const badge = badgeEstado[c.estado] || badgeEstado.borrador;
                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {c.tipo === 'whatsapp' ? <MessageCircle size={16} color="#10b981" title="WhatsApp" /> : <Globe size={16} color="#3b82f6" title="Web" />}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>{c.nombre_display}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <code style={{ fontSize: '0.72rem', color: '#888' }}>{c.nombre_interno}</code>
                              <button
                                type="button"
                                onClick={() => copiarTexto(c.nombre_interno, c.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '2px' }}
                                title="Copiar nombre"
                              >
                                {copiadoId === c.id ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                              </button>
                            </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#c4c4c8' }}>
                          {(c.productos || []).map(p => p.nombre).join(', ') || '—'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#c4c4c8' }}>
                          {c.funnel?.titulo || c.funnel?.nombre || '—'}
                        </td>
                        <td>
                          <span className="badge" style={{ background: badge.bg, color: badge.color }}>{c.estado}</span>
                        </td>
                        <td className="text-right">
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            {/* Solo si el funnel vinculado es un embudo real
                                (template.kind==='funnel') — un link a la
                                landing vieja de la tienda no tiene editor
                                propio en /funnel/:id. */}
                            {c.funnel?.template?.kind === 'funnel' && (
                              <a
                                href={`/funnel/${c.funnel.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-icon"
                                title="Ir al embudo"
                              >
                                <Zap size={15} />
                              </a>
                            )}
                            <button type="button" className="btn-icon" title="Editar" onClick={() => { setCampanaEditar(c); setModalOpen(true); }}>
                              <Edit2 size={15} />
                            </button>
                            {(c.estado === 'borrador' || c.estado === 'pausada') && (
                              <button type="button" className="btn-icon" title="Marcar como activa" onClick={() => handleCambiarEstadoCampana(c, 'activa')}>
                                <Play size={15} />
                              </button>
                            )}
                            {c.estado === 'activa' && (
                              <button type="button" className="btn-icon" title="Pausar" onClick={() => handleCambiarEstadoCampana(c, 'pausada')}>
                                <Pause size={15} />
                              </button>
                            )}
                            {c.estado !== 'archivada' && (
                              <button type="button" className="btn-icon" title="Archivar" onClick={() => handleArchivarCampana(c)}>
                                <Archive size={15} />
                              </button>
                            )}
                            <button type="button" className="btn-icon danger" title="Eliminar" onClick={() => handleEliminarCampana(c)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ---- Subir reporte CSV ---- */}
      <section>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#fff' }}>Subir reporte de Meta Ads</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={subiendo}>
            {subiendo ? <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.35rem' }} /> : <Upload size={16} style={{ marginRight: '0.35rem' }} />}
            {subiendo ? 'Importando...' : 'Subir CSV exportado de Ads Manager'}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleArchivoSeleccionado} />
          <span style={{ fontSize: '0.78rem', color: '#777' }}>
            Export "Rendimiento de campaña" en formato .csv, con columna "Nombre de la campaña".
          </span>
        </div>

        {errorImport && (
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.82rem' }}>
            <AlertCircle size={15} /> {errorImport}
          </div>
        )}

        {resultadoImport && (
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: 'rgba(109,94,248,0.08)', border: '1px solid rgba(109,94,248,0.25)', borderRadius: '6px', padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
            <span>Filas leídas: <strong>{resultadoImport.total}</strong></span>
            <span style={{ color: '#34d399' }}>Mapeadas a un producto: <strong>{resultadoImport.matcheadas}</strong></span>
            {resultadoImport.sin_match > 0 && (
              <span style={{ color: '#f59e0b' }}>Sin vincular: <strong>{resultadoImport.sin_match}</strong> (revisá el nombre de campaña en Meta — debe incluir el código generado)</span>
            )}
          </div>
        )}
      </section>

      {/* ---- Métricas por producto ---- */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Métricas por producto</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#888' }}>
              Confirmados/Entregados son del producto completo en el período — no se acotan al filtrar por campaña, porque hoy no hay un vínculo confiable entre un pedido y la campaña puntual que lo originó.
            </p>
          </div>
        </div>

        {/* Filtros — todos resueltos por el backend */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          <select className="filter-input" style={{ maxWidth: '220px' }} value={filtroProductoMetricas} onChange={(e) => setFiltroProductoMetricas(e.target.value)}>
            <option value="ALL">Todos los productos</option>
            {productosFiltro.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select className="filter-input" style={{ maxWidth: '220px' }} value={filtroCampanaMetricas} onChange={(e) => setFiltroCampanaMetricas(e.target.value)}>
            <option value="ALL">Todas las campañas</option>
            {campanas.map(c => <option key={c.id} value={c.id}>{c.nombre_display}</option>)}
          </select>
          <input type="date" className="filter-input" style={{ maxWidth: '160px' }} value={fechaDesdeMetricas} onChange={(e) => setFechaDesdeMetricas(e.target.value)} title="Fecha desde" />
          <input type="date" className="filter-input" style={{ maxWidth: '160px' }} value={fechaHastaMetricas} onChange={(e) => setFechaHastaMetricas(e.target.value)} title="Fecha hasta" />
          <select className="filter-input" style={{ maxWidth: '140px' }} value={tamanioPaginaMetricas} onChange={(e) => setTamanioPaginaMetricas(Number(e.target.value))}>
            {[12, 25, 50].map(n => <option key={n} value={n}>{n} / página</option>)}
          </select>
        </div>

        <div className="data-table-wrapper">
          <div className="table-scroll-container">
            <table className="escalafy-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="text-right">Pedidos</th>
                  <th className="text-right">Gasto Ads</th>
                  <th className="text-right">CPA</th>
                  <th className="text-right">Confirmados</th>
                  <th className="text-right">% Confirmación</th>
                  <th className="text-right">CPA Confirmado</th>
                  <th className="text-right">Entregados</th>
                  <th className="text-right">% Entrega</th>
                  <th className="text-right">CPA Entregado</th>
                  <th className="text-right">Costo Producto</th>
                  <th className="text-right">Costo Envío</th>
                  <th className="text-right">Precio Venta</th>
                  <th className="text-right">Facturación</th>
                  <th className="text-right">Utilidad Bruta</th>
                  <th className="text-right">Margen Bruto</th>
                </tr>
              </thead>
              <tbody>
                {cargandoMetricas ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`sk-m-${i}`}><td colSpan="16" style={{ padding: '1rem' }}><div className="skeleton-row" style={{ width: '100%' }} /></td></tr>
                  ))
                ) : metricas.length === 0 ? (
                  <tr><td colSpan="16" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>No hay datos para estos filtros.</td></tr>
                ) : (
                  metricas.map((m) => {
                    let margenClass = 'text-neutral';
                    if (m.margen_bruto > 0) margenClass = 'text-success';
                    else if (m.margen_bruto < 0) margenClass = 'text-danger';
                    return (
                      <tr key={m.producto_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Package size={14} color="#a78bfa" />
                            <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{m.producto?.nombre || `Producto #${m.producto_id}`}</span>
                          </div>
                        </td>
                        <td className="text-right tabular-nums">{formatNum(m.pedidos)}</td>
                        <td className="text-right tabular-nums">{formatPYG(m.gasto_ads)}</td>
                        <td className="text-right tabular-nums">{formatPYG(m.cpa)}</td>
                        <td className="text-right tabular-nums">{formatNum(m.confirmados)}</td>
                        <td className="text-right tabular-nums">{formatPct(m.pct_confirmacion)}</td>
                        <td className="text-right tabular-nums">{formatPYG(m.cpa_confirmado)}</td>
                        <td className="text-right tabular-nums">{formatNum(m.entregados)}</td>
                        <td className="text-right tabular-nums">{formatPct(m.pct_entrega)}</td>
                        <td className="text-right tabular-nums">{formatPYG(m.cpa_entregado)}</td>
                        <td className="text-right tabular-nums">{formatPYG(m.costo_producto)}</td>
                        <td className="text-right tabular-nums">{formatPYG(m.costo_envio)}</td>
                        <td className="text-right tabular-nums">{formatPYG(m.precio_venta)}</td>
                        <td className="text-right tabular-nums">{formatPYG(m.facturacion)}</td>
                        <td className="text-right tabular-nums">{formatPYG(m.utilidad_bruta)}</td>
                        <td className={`text-right tabular-nums ${margenClass}`}>{formatPct(m.margen_bruto * 100)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <button onClick={() => cargarMetricas(paginaMetricas - 1)} disabled={paginaMetricas <= 1 || cargandoMetricas}>
              <ChevronLeft size={16} /> Anterior
            </button>
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>
              {cargandoMetricas ? 'Cargando...' : `Página ${paginaMetricas} de ${totalPaginasMetricas} (${totalMetricas} productos)`}
            </span>
            <button onClick={() => cargarMetricas(paginaMetricas + 1)} disabled={paginaMetricas >= totalPaginasMetricas || cargandoMetricas}>
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ---- Filas de reporte importadas ---- */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Filas del reporte</h2>
          <select className="filter-input" style={{ maxWidth: '260px' }} value={filtroCampana} onChange={(e) => setFiltroCampana(e.target.value)}>
            <option value="ALL">Todas las campañas</option>
            <option value="UNLINKED">Sin vincular</option>
            {campanas.map(c => <option key={c.id} value={c.id}>{c.nombre_display}</option>)}
          </select>
        </div>

        <div className="data-table-wrapper">
          <div className="table-scroll-container">
            <table className="escalafy-table">
              <thead>
                <tr>
                  <th>Campaña (Meta)</th>
                  <th>Producto</th>
                  <th>Fecha Inicio Informe</th>
                  <th>Fecha Fin Informe</th>
                  <th className="text-right">Presupuesto</th>
                  <th className="text-right">Gasto</th>
                  <th className="text-right">Resultados</th>
                  <th className="text-right">Costo x Res.</th>
                  <th className="text-right">Alcance</th>
                  <th className="text-right">Impresiones</th>
                  <th className="text-right">CPM</th>
                  <th className="text-right">Clics</th>
                  <th className="text-right">CPC</th>
                  <th className="text-right">CTR</th>
                  <th className="text-right">Compras</th>
                  <th className="text-right">Costo x Compra</th>
                  <th className="text-right">Valor Conv.</th>
                  <th className="text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {cargandoFilas ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`sk-${i}`}><td colSpan="16" style={{ padding: '1rem' }}><div className="skeleton-row" style={{ width: '100%' }} /></td></tr>
                  ))
                ) : filas.length === 0 ? (
                  <tr><td colSpan="16" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>No hay filas de reporte todavía. Subí un CSV para empezar.</td></tr>
                ) : (
                  filas.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '220px' }}>
                          <span style={{ fontSize: '0.82rem', color: '#fff' }}>{f.nombre_campana_meta}</span>
                          {!f.meta_campana_interna_id && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: '#f59e0b' }}>
                              <Link2 size={10} /> sin vincular
                            </span>
                          )}
                          <select
                            className="filter-input"
                            style={{ fontSize: '0.72rem', padding: '3px 6px', height: 'auto' }}
                            value={f.meta_campana_interna_id || ''}
                            disabled={vinculandoId === f.id}
                            onChange={(e) => handleVincularFila(f.id, e.target.value || null)}
                          >
                            <option value="">Sin vincular</option>
                            {campanas.map(c => <option key={c.id} value={c.id}>{c.nombre_display}</option>)}
                          </select>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#c4c4c8' }}>
                        {f.campana ? ((campanas.find(c => c.id === f.campana.id)?.productos || []).map(p => p.nombre).join(', ') || '—') : '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#c4c4c8' }}>{formatFecha(f.fecha_inicio)}</td>
                      <td style={{ fontSize: '0.78rem', color: '#c4c4c8' }}>{formatFecha(f.fecha_fin)}</td>
                      <td className="text-right tabular-nums">{f.presupuesto != null ? formatPYG(f.presupuesto) : '—'}</td>
                      <td className="text-right tabular-nums">{formatPYG(f.importe_gastado)}</td>
                      <td className="text-right tabular-nums">{formatNum(f.resultados)}</td>
                      <td className="text-right tabular-nums">{f.costo_por_resultado != null ? formatPYG(f.costo_por_resultado) : '—'}</td>
                      <td className="text-right tabular-nums">{formatNum(f.alcance)}</td>
                      <td className="text-right tabular-nums">{formatNum(f.impresiones)}</td>
                      <td className="text-right tabular-nums">{f.cpm != null ? formatPYG(f.cpm) : '—'}</td>
                      <td className="text-right tabular-nums">{formatNum(f.clics_enlace)}</td>
                      <td className="text-right tabular-nums">{f.cpc != null ? formatPYG(f.cpc) : '—'}</td>
                      <td className="text-right tabular-nums">{f.ctr != null ? `${Number(f.ctr).toFixed(2)}%` : '—'}</td>
                      <td className="text-right tabular-nums">{formatNum(f.compras)}</td>
                      <td className="text-right tabular-nums">{f.costo_por_compra != null ? formatPYG(f.costo_por_compra) : '—'}</td>
                      <td className="text-right tabular-nums">{f.valor_conversion_compras != null ? formatPYG(f.valor_conversion_compras) : '—'}</td>
                      <td className="text-right tabular-nums" style={{ color: (f.roas || 0) > 1 ? '#10b981' : '#f87171' }}>{f.roas != null ? `${Number(f.roas).toFixed(2)}x` : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <button onClick={() => cargarFilas(pagina - 1)} disabled={pagina <= 1 || cargandoFilas}>
              <ChevronLeft size={16} /> Anterior
            </button>
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>
              {cargandoFilas ? 'Cargando...' : `Página ${pagina} de ${totalPaginas}`}
            </span>
            <button onClick={() => cargarFilas(pagina + 1)} disabled={pagina >= totalPaginas || cargandoFilas}>
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <CampanaInternaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setCampanaEditar(null); }}
        onCreated={handleCampanaCreada}
        tiendas={tiendas}
        campanaEditar={campanaEditar}
      />
    </div>
  );
}
