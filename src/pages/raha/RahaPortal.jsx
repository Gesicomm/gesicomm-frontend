import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Loader,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
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

export default function RahaPortal() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const solicitudId = Number(params.get('solicitud')) || null;

  const [usuario, setUsuario] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState({ pendiente: 0, observada: 0, aprobada: 0, rechazada: 0 });
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [offset, setOffset] = useState(0);

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

  // Cargar lista con filtros (POST request según regla del proyecto)
  const cargarLista = useCallback(async () => {
    setLoadingLista(true);
    setError('');
    try {
      const data = await rahaPortalApi.listar({
        estado: filtroEstado || undefined,
        buscar: busqueda.trim() || undefined,
        offset,
      });
      setSolicitudes(data.solicitudes || []);
      setTotal(data.total || 0);
      if (data.resumen) setResumen(data.resumen);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar la lista de solicitudes.');
    } finally {
      setLoadingLista(false);
    }
  }, [filtroEstado, busqueda, offset]);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

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
    cargarDetalle();
  }, [cargarDetalle]);

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

  function handleLogout() {
    rahaPortalApi.logout();
    navigate('/raha/login', { replace: true });
  }

  const esPendiente = solicitud && ['en_revision', 'enviada_raha'].includes(solicitud.estado);

  return (
    <div className="rp-root rp-portal">
      {/* Header */}
      <header className="rp-header">
        <div className="rp-header-brand">
          <div className="rp-badge-brand" style={{ width: 38, height: 38 }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="rp-header-title">Portal RAHA</h1>
            <span className="rp-header-tag">Proveedores</span>
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
            className="rp-btn-logout"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <LogOut size={15} /> Salir
          </button>
        </div>
      </header>

      <main className="rp-main">
        {/* Métricas / Semáforo resumen */}
        <section className="rp-stats">
          <div
            className={`rp-stat-card ${filtroEstado === 'pendiente' ? 'active' : ''}`}
            onClick={() => {
              setFiltroEstado(filtroEstado === 'pendiente' ? '' : 'pendiente');
              setOffset(0);
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
              setOffset(0);
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
              setOffset(0);
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
              setOffset(0);
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

        {/* Toolbar de búsqueda y filtros */}
        <section className="rp-toolbar">
          <div className="rp-search-wrap">
            <Search size={16} />
            <input
              type="search"
              className="rp-search-input"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setOffset(0);
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
                  setOffset(0);
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
                <li style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
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
                          #{sol.id} · {sol.tienda || sol.razon_social || 'Tienda'}
                        </span>
                        <RahaSemaforo estado={sol.estado} compacto />
                      </div>
                      <div className="rp-item-sub">
                        <span>RUC: {sol.ruc || '—'}</span>
                        <span style={{ margin: '0 6px' }}>•</span>
                        <span>
                          {sol.enviado_at
                            ? new Date(sol.enviado_at).toLocaleDateString('es-PY')
                            : 'Reciente'}
                        </span>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
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
                      Solicitud #{solicitud.id} · {solicitud.tienda?.nombre || solicitud.datos?.razon_social}
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
                    <h3 style={{ margin: 0, color: '#fff' }}>Evaluar solicitud para proveerse con RAHA</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
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
                        <Check size={16} /> Aprobar como proveedor
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
      </main>
    </div>
  );
}
