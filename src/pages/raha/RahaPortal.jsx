import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader,
  LogOut,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { useTema } from '../../components/public/ThemeProvider';
import { getRahaPortalToken, rahaPortalApi, setRahaPortalToken } from '../../services/rahaPortalApi';
import {
  ESTADOS_RAHA,
  GRUPOS_RAHA,
  RahaHistorial,
  RahaSemaforo,
  TIPOS_DOC_RAHA,
} from '../tienda/RahaConexion';
import '../tienda/raha.css';
import './raha-portal.css';
import RahaAbastecimientosPanel from './RahaAbastecimientosPanel';
import RahaEnviosPanel from './RahaEnviosPanel';
import RahaDestinosPanel from './RahaDestinosPanel';

const SECCIONES_PORTAL = [['documentacion', 'Documentación'], ['abastecimientos', 'Abastecimientos'],
  ['envios', 'Envíos a RAHA'], ['destinos', 'Depósitos RAHA']];

export default function RahaPortal() {
  const navigate = useNavigate();
  const { tema, alternarTema } = useTema();
  const [params, setParams] = useSearchParams();
  const seccion = SECCIONES_PORTAL.some(([valor]) => valor === params.get('tab')) ? params.get('tab') : 'documentacion';
  const solicitudId = Number(params.get('solicitud')) || null;

  const [usuario, setUsuario] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [resumen, setResumen] = useState({ pendiente: 0, observada: 0, aprobada: 0, rechazada: 0 });
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Filtros de fecha ('', 'hoy', 'ayer', '7d', 'mes', 'custom')
  const [rangoFecha, setRangoFecha] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [solicitud, setSolicitud] = useState(null);
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Formulario de resolución
  const [accion, setAccion] = useState(null); // 'aprobada' | 'observada' | 'rechazada'
  const [notaResolucion, setNotaResolucion] = useState('');

  const detailRequest = useRef(0);

  // Verificar sesión en el portal
  useEffect(() => {
    const token = getRahaPortalToken();
    if (!token) {
      navigate('/raha/login', { replace: true });
      return;
    }
    rahaPortalApi
      .me()
      .then((res) => setUsuario(res.usuario))
      .catch(() => {
        setRahaPortalToken(null);
        navigate('/raha/login', { replace: true });
      });
  }, [navigate]);

  // Cargar lista con filtros (POST request según regla estricta del proyecto)
  const cargarLista = useCallback(async () => {
    setLoadingLista(true);
    setError('');
    try {
      const payload = {
        estado: filtroEstado || undefined,
        buscar: busqueda.trim() || undefined,
        page,
        limit,
      };

      if (rangoFecha === 'custom') {
        if (fechaDesde) payload.fecha_desde = fechaDesde;
        if (fechaHasta) payload.fecha_hasta = fechaHasta;
      } else if (rangoFecha) {
        payload.rango_fecha = rangoFecha;
      }

      const data = await rahaPortalApi.listar(payload);
      setSolicitudes(data.solicitudes || []);
      setTotal(data.total || 0);
      setTotalPaginas(data.totalPaginas || 1);
      if (data.resumen) setResumen(data.resumen);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar la lista de solicitudes.');
    } finally {
      setLoadingLista(false);
    }
  }, [filtroEstado, busqueda, page, limit, rangoFecha, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (usuario && seccion === 'documentacion') cargarLista();
  }, [cargarLista, seccion, usuario]);

  // Cargar detalle de la solicitud seleccionada
  const cargarDetalle = useCallback(async () => {
    const reqId = ++detailRequest.current;
    setSolicitud(null);
    setAccion(null);
    setNotaResolucion('');
    if (!solicitudId) return;

    setLoadingDetalle(true);
    try {
      const data = await rahaPortalApi.detalle(solicitudId);
      if (reqId === detailRequest.current) {
        setSolicitud(data);
      }
    } catch (err) {
      if (reqId === detailRequest.current) {
        setError(err?.response?.data?.message || 'No se pudo cargar el detalle de la solicitud.');
      }
    } finally {
      if (reqId === detailRequest.current) setLoadingDetalle(false);
    }
  }, [solicitudId]);

  useEffect(() => {
    if (usuario && seccion === 'documentacion') cargarDetalle();
    else detailRequest.current += 1;
  }, [cargarDetalle, seccion, usuario]);

  // Manejar resolución de solicitud por RAHA
  async function resolverSolicitud(e) {
    e.preventDefault();
    if (!accion || !solicitud || busy) return;
    setBusy(true);
    setError('');
    setMensaje('');
    try {
      const actualizada = await rahaPortalApi.resolver(solicitud.id, {
        estado: accion,
        nota: notaResolucion,
        version: solicitud.version,
      });
      setSolicitud(actualizada);
      setAccion(null);
      setNotaResolucion('');
      setMensaje(
        accion === 'aprobada'
          ? '¡Solicitud aceptada! El comercio ya puede operar con Raha.'
          : accion === 'observada'
          ? 'Se enviaron las observaciones al comercio para que corrija su solicitud.'
          : 'Solicitud rechazada.'
      );
      await cargarLista();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo registrar la resolución.');
    } finally {
      setBusy(false);
    }
  }

  function handleSeleccionarRangoFecha(preset) {
    setRangoFecha(preset);
    if (preset !== 'custom') {
      setFechaDesde('');
      setFechaHasta('');
    }
    setPage(1);
  }

  function handleCambioFechaDesde(val) {
    setRangoFecha('custom');
    setFechaDesde(val);
    setPage(1);
  }

  function handleCambioFechaHasta(val) {
    setRangoFecha('custom');
    setFechaHasta(val);
    setPage(1);
  }

  function handleLimpiarFechas() {
    setRangoFecha('');
    setFechaDesde('');
    setFechaHasta('');
    setPage(1);
  }

  function handleLogout() {
    rahaPortalApi.logout();
    navigate('/raha/login', { replace: true });
  }

  const esPendiente = solicitud && ['en_revision', 'enviada_raha'].includes(solicitud.estado);

  return (
    <div className="gc-panel rp-root rp-portal">
      {/* Header */}
      <header className="rp-header">
        <div className="rp-header-brand">
          <div className="rp-badge-brand" style={{ width: 38, height: 38 }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="rp-header-title">Portal RAHA</h1>
            <span className="rp-header-tag">Operaciones y documentación</span>
          </div>
        </div>

        <div className="rp-header-user">
          {usuario && (
            <span className="rp-user-name">
              Hola, <strong>{usuario.nombre}</strong> ({usuario.email})
            </span>
          )}
          <button
            type="button"
            className="rp-btn-theme"
            onClick={alternarTema}
            title={tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            aria-label={tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {tema === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button
            type="button"
            className="rp-btn-logout"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <LogOut size={15} /> Salir
          </button>
        </div>
      </header>

      <main className="rp-main">
        <nav aria-label="Secciones del portal RAHA" className="mb-6 flex flex-wrap gap-2 border-b border-border pb-4">
          {SECCIONES_PORTAL.map(([valor, label]) => <button type="button" key={valor} aria-pressed={seccion === valor} disabled={busy} className={`rp-tab ${seccion === valor ? 'active' : ''}`} onClick={() => setParams({ tab: valor })}>{label}</button>)}
        </nav>
        {!usuario ? <div role="status" className="p-8 text-center text-fg-muted">Verificando sesión…</div> : seccion === 'documentacion' ? <>
        {/* Métricas / Semáforo resumen */}
        <section className="rp-stats">
          <div
            className={`rp-stat-card ${filtroEstado === 'pendiente' ? 'active' : ''}`}
            onClick={() => {
              setFiltroEstado(filtroEstado === 'pendiente' ? '' : 'pendiente');
              setPage(1);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="rp-stat-icon amarillo">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="rp-stat-val">{resumen.pendiente}</div>
              <div className="rp-stat-lbl">Nuevas enviadas (Pendientes)</div>
            </div>
          </div>

          <div
            className={`rp-stat-card ${filtroEstado === 'aprobada' ? 'active' : ''}`}
            onClick={() => {
              setFiltroEstado(filtroEstado === 'aprobada' ? '' : 'aprobada');
              setPage(1);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="rp-stat-icon verde">
              <Check size={22} />
            </div>
            <div>
              <div className="rp-stat-val">{resumen.aprobada}</div>
              <div className="rp-stat-lbl">Aprobadas (Activas)</div>
            </div>
          </div>

          <div
            className={`rp-stat-card ${filtroEstado === 'observada' ? 'active' : ''}`}
            onClick={() => {
              setFiltroEstado(filtroEstado === 'observada' ? '' : 'observada');
              setPage(1);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="rp-stat-icon rojo">
              <AlertCircle size={22} />
            </div>
            <div>
              <div className="rp-stat-val">{resumen.observada}</div>
              <div className="rp-stat-lbl">Requieren correcciones</div>
            </div>
          </div>

          <div
            className={`rp-stat-card ${filtroEstado === 'rechazada' ? 'active' : ''}`}
            onClick={() => {
              setFiltroEstado(filtroEstado === 'rechazada' ? '' : 'rechazada');
              setPage(1);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="rp-stat-icon rojo">
              <X size={22} />
            </div>
            <div>
              <div className="rp-stat-val">{resumen.rechazada}</div>
              <div className="rp-stat-lbl">Rechazadas</div>
            </div>
          </div>
        </section>

        {/* Barra de Filtro por Fechas (Hoy, Ayer, Últimos 7 días, Este mes, Fecha puntual/rango) */}
        <section className="rp-date-bar">
          <div className="rp-date-presets">
            <span className="rp-date-lbl">
              <Calendar size={15} /> Fecha:
            </span>
            {[
              ['', 'Todas'],
              ['hoy', 'Hoy'],
              ['ayer', 'Ayer'],
              ['7d', 'Últimos 7 días'],
              ['mes', 'Este mes'],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`rp-date-chip ${rangoFecha === val ? 'active' : ''}`}
                onClick={() => handleSeleccionarRangoFecha(val)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rp-date-custom">
            <div className="rp-date-input-group">
              <label htmlFor="rp-fecha-desde">Desde:</label>
              <input
                id="rp-fecha-desde"
                type="date"
                className="rp-date-input"
                value={fechaDesde}
                onChange={(e) => handleCambioFechaDesde(e.target.value)}
                title="Filtrar desde esta fecha (o fecha puntual si no seleccionás Hasta)"
              />
            </div>

            <div className="rp-date-input-group">
              <label htmlFor="rp-fecha-hasta">Hasta:</label>
              <input
                id="rp-fecha-hasta"
                type="date"
                className="rp-date-input"
                value={fechaHasta}
                onChange={(e) => handleCambioFechaHasta(e.target.value)}
                title="Filtrar hasta esta fecha"
              />
            </div>

            {(rangoFecha || fechaDesde || fechaHasta) && (
              <button
                type="button"
                className="rp-btn-clear-date"
                onClick={handleLimpiarFechas}
                title="Quitar filtro de fecha"
              >
                <X size={13} /> Limpiar fecha
              </button>
            )}
          </div>
        </section>

        {/* Toolbar de búsqueda y estados */}
        <section className="rp-toolbar">
          <div className="rp-search-wrap">
            <Search size={16} />
            <input
              type="search"
              className="rp-search-input"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por tienda, razón social o RUC…"
            />
          </div>

          <div className="rp-tabs">
            {[
              ['', 'Todas'],
              ['pendiente', 'Pendientes (Amarillo)'],
              ['aprobada', 'Aprobadas (Verde)'],
              ['observada', 'Observadas (Rojo)'],
              ['rechazada', 'Rechazadas'],
            ].map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                className={`rp-tab ${filtroEstado === valor ? 'active' : ''}`}
                onClick={() => {
                  setFiltroEstado(valor);
                  setPage(1);
                }}
              >
                {etiqueta}
              </button>
            ))}

            <button
              type="button"
              className="rp-tab"
              title="Actualizar lista"
              disabled={loadingLista}
              onClick={cargarLista}
            >
              <RefreshCw size={14} className={loadingLista ? 'raha-spin' : ''} />
            </button>
          </div>
        </section>

        {error && (
          <div className="rp-alert rp-alert-error" role="alert">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {mensaje && (
          <div className="rp-alert rp-alert-success" role="status">
            <CheckCircle2 size={16} /> {mensaje}
          </div>
        )}

        {/* Master - Detail layout */}
        <div className="rp-content-grid">
          {/* Columna Izquierda: Lista de solicitudes */}
          <aside className="rp-list-col">
            <div className="rp-list-header">
              <span>SOLICITUDES ({total})</span>
              {loadingLista && <Loader size={14} className="raha-spin" />}
            </div>

            <ul className="rp-list-items">
              {solicitudes.length === 0 && !loadingLista ? (
                <li className="rp-empty-msg">
                  No hay solicitudes que coincidan con el filtro.
                </li>
              ) : (
                solicitudes.map((sol) => (
                  <li key={sol.id}>
                    <button
                      type="button"
                      className={`rp-list-item-btn ${solicitudId === sol.id ? 'selected' : ''}`}
                      onClick={() => setParams({ solicitud: sol.id })}
                    >
                      <div className="rp-item-top">
                        <span className="rp-item-tienda">
                          #{sol.id} · {sol.razon_social || sol.tienda || 'Tienda'}
                          {sol.tienda && sol.razon_social && sol.tienda.toLowerCase() !== sol.razon_social.toLowerCase()
                            ? ` (${sol.tienda})`
                            : ''}
                        </span>
                        <RahaSemaforo estado={sol.estado} compacto />
                      </div>
                      <div className="rp-item-sub">
                        <span>RUC: {sol.ruc || '—'}</span>
                        <span style={{ margin: '0 6px' }}>•</span>
                        <span>
                          {sol.enviado_at
                            ? `${new Date(sol.enviado_at).toLocaleDateString('es-PY')} ${new Date(sol.enviado_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}`
                            : 'Reciente'}
                        </span>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>

            {/* Paginación de solicitudes */}
            <footer className="rp-pagination">
              <div className="rp-pagination-info">
                <span>Pág. <strong>{page}</strong> / <strong>{totalPaginas}</strong></span>
                <span className="rp-pagination-total">({total})</span>
              </div>

              <div className="rp-pagination-controls">
                <button
                  type="button"
                  className="rp-page-btn"
                  disabled={page <= 1 || loadingLista}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                  title="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="rp-page-indicator">{page}</span>
                <button
                  type="button"
                  className="rp-page-btn"
                  disabled={page >= totalPaginas || loadingLista}
                  onClick={() => setPage(p => Math.min(totalPaginas, p + 1))}
                  aria-label="Página siguiente"
                  title="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="rp-page-size">
                <select
                  className="rp-page-size-select"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="Items por página"
                >
                  <option value={10}>10 / pág</option>
                  <option value={20}>20 / pág</option>
                  <option value={50}>50 / pág</option>
                </select>
              </div>
            </footer>
          </aside>

          {/* Columna Derecha: Detalle de la solicitud */}
          <div className="rp-detail-col">
            {loadingDetalle ? (
              <div className="rp-detail-empty">
                <Loader size={24} className="raha-spin" />
                <span>Cargando expediente…</span>
              </div>
            ) : !solicitud ? (
              <div className="rp-detail-empty">
                <ShieldCheck size={36} />
                <p>Seleccioná una solicitud de la lista para ver los datos, documentos y resolverla.</p>
              </div>
            ) : (
              <div className="raha" style={{ padding: 0 }}>
                {/* Cabecera del detalle */}
                <div className="raha-status">
                  <ShieldCheck size={24} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                      Solicitud #{solicitud.id} · {solicitud.datos?.razon_social || solicitud.tienda?.nombre}
                      {solicitud.tienda?.nombre && solicitud.datos?.razon_social && solicitud.tienda.nombre.toLowerCase() !== solicitud.datos.razon_social.toLowerCase()
                        ? ` (${solicitud.tienda.nombre})`
                        : ''}
                    </h2>
                    <span className={`raha-badge ${solicitud.estado}`}>
                      {ESTADOS_RAHA[solicitud.estado] || solicitud.estado}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="raha-button"
                    disabled={busy}
                    onClick={() => rahaPortalApi.expediente(solicitud.id)}
                  >
                    <Download size={16} /> Descargar expediente (.zip)
                  </button>
                </div>

                {/* Semáforo Informativo */}
                <RahaSemaforo estado={solicitud.estado} />

                {/* Grupos de datos */}
                {GRUPOS_RAHA.map((group) => (
                  <section className="raha-section" key={group.titulo}>
                    <h3>{group.titulo}</h3>
                    <dl className="raha-fields">
                      {group.campos.map(([key, label]) => (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>{solicitud.datos?.[key] || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}

                {/* Documentos adjuntos */}
                <section className="raha-section">
                  <h3>Documentos adjuntos</h3>
                  <div className="raha-docs">
                    {TIPOS_DOC_RAHA.map(([tipo, label]) => {
                      const docs = (solicitud.documentos || []).filter((d) => d.tipo === tipo);
                      return (
                        <div className="raha-doc-group" key={tipo}>
                          <div className="raha-doc-head">
                            <strong>{label}</strong>
                            <span className={docs.length ? 'raha-ok' : 'raha-muted'}>
                              {docs.length ? 'Presentado' : 'Faltante'}
                            </span>
                          </div>
                          <ul>
                            {docs.map((doc) => (
                              <li key={doc.id}>
                                <FileText size={16} />
                                <span className="raha-filename">
                                  {doc.nombre}
                                  <small>{Math.ceil(doc.size / 1024)} KB</small>
                                </span>
                                <button
                                  type="button"
                                  className="raha-icon"
                                  title={`Descargar ${doc.nombre}`}
                                  aria-label={`Descargar ${doc.nombre}`}
                                  disabled={busy}
                                  onClick={() => rahaPortalApi.documento(solicitud.id, doc)}
                                >
                                  <Download size={16} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Historial */}
                <RahaHistorial solicitud={solicitud} />

                {/* Acciones de resolución por RAHA */}
                {esPendiente && (
                  <section className="rp-resolve-card">
                    <h3 className="rp-resolve-title">Evaluar solicitud para proveerse con RAHA</h3>
                    <p className="rp-resolve-desc">
                      Al aprobar, el semáforo del comercio pasará a Verde (Aprobado). Si requiere cambios
                      o se rechaza, indicá el motivo en la nota.
                    </p>

                    <div className="rp-resolve-actions">
                      <button
                        type="button"
                        className={`rp-btn-action rp-btn-green ${accion === 'aprobada' ? 'active' : ''}`}
                        disabled={busy}
                        onClick={() => setAccion('aprobada')}
                      >
                        <Check size={16} /> Aprobar como vendedor
                      </button>

                      <button
                        type="button"
                        className={`rp-btn-action rp-btn-amber ${accion === 'observada' ? 'active' : ''}`}
                        disabled={busy}
                        onClick={() => setAccion('observada')}
                      >
                        <AlertTriangle size={16} /> Pedir correcciones
                      </button>

                      <button
                        type="button"
                        className={`rp-btn-action rp-btn-red ${accion === 'rechazada' ? 'active' : ''}`}
                        disabled={busy}
                        onClick={() => setAccion('rechazada')}
                      >
                        <X size={16} /> Rechazar solicitud
                      </button>
                    </div>

                    {accion && (
                      <form onSubmit={resolverSolicitud} style={{ display: 'grid', gap: '0.85rem' }}>
                        <label className="rp-field">
                          <span>
                            {accion === 'aprobada'
                              ? 'Nota o referencia de aprobación (opcional)'
                              : 'Motivo / Indicaciones para el comercio (requerido)'}
                          </span>
                          <textarea
                            className="rp-input"
                            style={{ minHeight: 70, resize: 'vertical' }}
                            rows={3}
                            value={notaResolucion}
                            onChange={(e) => setNotaResolucion(e.target.value)}
                            required={accion !== 'aprobada'}
                            minLength={accion !== 'aprobada' ? 5 : 0}
                            maxLength={1000}
                            placeholder={
                              accion === 'aprobada'
                                ? 'Ej. Proveedor validado en sistema comercial Raha.'
                                : 'Detallá qué dato o documento debe corregir el comercio…'
                            }
                          />
                        </label>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="submit"
                            className={`rp-btn-action ${
                              accion === 'aprobada'
                                ? 'rp-btn-green'
                                : accion === 'observada'
                                ? 'rp-btn-amber'
                                : 'rp-btn-red'
                            }`}
                            disabled={busy}
                          >
                            {busy ? (
                              <Loader size={16} className="raha-spin" />
                            ) : (
                              <Check size={16} />
                            )}
                            Confirmar {accion === 'aprobada' ? 'Aprobación' : accion === 'observada' ? 'Corrección' : 'Rechazo'}
                          </button>
                          <button
                            type="button"
                            className="rp-tab"
                            onClick={() => {
                              setAccion(null);
                              setNotaResolucion('');
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
        </> : seccion === 'abastecimientos' ? <RahaAbastecimientosPanel /> : seccion === 'envios' ? <RahaEnviosPanel portal /> : <RahaDestinosPanel />}
      </main>
    </div>
  );
}
