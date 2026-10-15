import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Key,
  Loader,
  Plus,
  RefreshCw,
  Save,
  Users,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { rahaService } from '../../services/rahaService';
import { ESTADOS_RAHA, GRUPOS_RAHA, RahaDocumentos, RahaHistorial, RahaSemaforo } from '../tienda/RahaConexion';
import '../tienda/raha.css';

export default function RahaSolicitudes() {
  const [params, setParams] = useSearchParams();
  const id = Number(params.get('solicitud')) || null;
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filtro, setFiltro] = useState('en_revision');
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('observada');
  const [nota, setNota] = useState('');
  const [referencia, setReferencia] = useState('');

  // Cuentas del portal RAHA
  const [modalUsuarios, setModalUsuarios] = useState(false);
  const [usuariosPortal, setUsuariosPortal] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [errorUsuario, setErrorUsuario] = useState('');
  const [mensajeUsuario, setMensajeUsuario] = useState('');

  const detailRequest = useRef(0);

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await rahaService.listar({ estado: filtro || undefined, offset });
      setRows(result.solicitudes);
      setTotal(result.total);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar la bandeja.');
    } finally {
      setLoading(false);
    }
  }, [filtro, offset]);

  const detalle = useCallback(async () => {
    const requestId = ++detailRequest.current;
    setSolicitud(null); setNota(''); setReferencia(''); setEstado('observada');
    if (!id) return;
    setLoading(true); setError('');
    try {
      const row = await rahaService.detalle(id);
      if (requestId === detailRequest.current) setSolicitud(row);
    } catch (err) {
      if (requestId === detailRequest.current) setError(err.response?.data?.message || 'No se pudo cargar la solicitud.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { detalle(); }, [detalle]);

  const cargarUsuariosPortal = useCallback(async () => {
    setLoadingUsuarios(true);
    setErrorUsuario('');
    try {
      const lista = await rahaService.listarUsuariosPortal();
      setUsuariosPortal(lista);
    } catch (err) {
      setErrorUsuario(err.response?.data?.message || 'No se pudieron cargar los usuarios del portal.');
    } finally {
      setLoadingUsuarios(false);
    }
  }, []);

  useEffect(() => {
    if (modalUsuarios) cargarUsuariosPortal();
  }, [modalUsuarios, cargarUsuariosPortal]);

  async function crearUsuario(e) {
    e.preventDefault();
    setErrorUsuario('');
    setMensajeUsuario('');
    setBusy(true);
    try {
      await rahaService.crearUsuarioPortal({
        nombre: nuevoNombre,
        email: nuevoEmail,
        password: nuevoPassword,
      });
      setNuevoNombre('');
      setNuevoEmail('');
      setNuevoPassword('');
      setMensajeUsuario('Cuenta creada y activada correctamente.');
      await cargarUsuariosPortal();
    } catch (err) {
      setErrorUsuario(err.response?.data?.message || 'No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  async function alternarEstadoUsuario(user) {
    setErrorUsuario('');
    setMensajeUsuario('');
    try {
      await rahaService.actualizarUsuarioPortal(user.id, { activo: !user.activo });
      setMensajeUsuario(`Cuenta ${!user.activo ? 'activada' : 'desactivada'} correctamente.`);
      await cargarUsuariosPortal();
    } catch (err) {
      setErrorUsuario(err.response?.data?.message || 'No se pudo actualizar la cuenta.');
    }
  }

  async function action(fn) {
    if (busy) return; setBusy(true); setError('');
    try {
      const result = await fn();
      if (result?.id) {
        setSolicitud(result); setEstado('observada'); setNota(''); setReferencia('');
        await cargar();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo completar la operación.');
    } finally {
      setBusy(false);
    }
  }

  const transitions = solicitud?.estado === 'en_revision'
    ? ['observada', 'enviada_raha', 'rechazada']
    : solicitud?.estado === 'enviada_raha'
    ? ['observada', 'aprobada', 'rechazada']
    : [];

  return (
    <main className="raha raha-admin">
      <header className="raha-status">
        <div>
          <h1>Solicitudes Raha</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="raha-button"
            onClick={() => setModalUsuarios(true)}
            title="Gestionar cuentas de acceso para el equipo de RAHA"
          >
            <Users size={16} /> Cuentas Portal Raha
          </button>
          <button
            type="button"
            className="raha-icon"
            title="Actualizar bandeja"
            aria-label="Actualizar bandeja"
            disabled={busy || loading}
            onClick={() => { cargar(); detalle(); }}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {error && <div className="raha-alert raha-error" role="alert"><AlertCircle size={18} />{error}</div>}

      <div className="raha-admin-layout">
        <aside className="raha-queue">
          <label className="raha-field">
            <span>Estado de solicitudes</span>
            <select value={filtro} onChange={event => { setFiltro(event.target.value); setOffset(0); }}>
              <option value="">Todas las presentadas</option>
              {Object.entries(ESTADOS_RAHA).filter(([key]) => key !== 'borrador').map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <p className="raha-muted">{total} solicitudes</p>
          {loading && <Loader size={18} className="raha-spin" aria-label="Cargando" />}
          <ul>
            {rows.map(row => (
              <li key={row.id}>
                <button
                  type="button"
                  className="raha-button"
                  aria-pressed={id === row.id}
                  onClick={() => setParams({ solicitud: row.id })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <strong>#{row.id} · {row.tienda?.nombre}</strong>
                    <RahaSemaforo estado={row.estado} compacto />
                  </div>
                  <span>{ESTADOS_RAHA[row.estado]}</span>
                </button>
              </li>
            ))}
          </ul>
          {!loading && rows.length === 0 && <p className="raha-muted">No hay solicitudes en este estado.</p>}
          <div className="raha-actions">
            <button
              type="button"
              className="raha-icon"
              aria-label="Página anterior"
              title="Página anterior"
              disabled={!offset || loading}
              onClick={() => setOffset(prev => prev - 30)}
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              className="raha-icon"
              aria-label="Página siguiente"
              title="Página siguiente"
              disabled={offset + 30 >= total || loading}
              onClick={() => setOffset(prev => prev + 30)}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </aside>

        <div className="raha-details">
          {!solicitud ? (
            <p className="raha-muted">{id && loading ? 'Cargando solicitud…' : 'Seleccioná una solicitud.'}</p>
          ) : (
            <>
              <div className="raha-status">
                <div>
                  <strong>Solicitud #{solicitud.id}</strong>
                  <span className={`raha-badge ${solicitud.estado}`}>{ESTADOS_RAHA[solicitud.estado]}</span>
                </div>
                <button
                  type="button"
                  className="raha-button"
                  disabled={busy}
                  onClick={() => action(() => rahaService.expediente(solicitud.id))}
                >
                  <Download size={16} /> Descargar expediente
                </button>
              </div>

              {/* Semáforo del estado actual */}
              <RahaSemaforo estado={solicitud.estado} />

              {GRUPOS_RAHA.map(group => (
                <section className="raha-section" key={group.titulo}>
                  <h3>{group.titulo}</h3>
                  <dl className="raha-fields">
                    {group.campos.map(([key, label]) => (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>{solicitud.datos[key] || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}

              <RahaDocumentos
                documentos={solicitud.documentos}
                busy={busy}
                onDownload={doc => action(() => rahaService.documento(doc))}
              />

              <RahaHistorial solicitud={solicitud} />

              {transitions.length > 0 && (
                <form
                  className="raha-section"
                  onSubmit={event => {
                    event.preventDefault();
                    action(() => rahaService.revisar(solicitud.id, { estado, nota, referencia, version: solicitud.version }));
                  }}
                >
                  <h3>Registrar revisión manual Gesicom</h3>
                  <div className="raha-fields">
                    <label className="raha-field">
                      <span>Resultado de la revisión</span>
                      <select value={estado} disabled={busy} onChange={event => setEstado(event.target.value)}>
                        {transitions.map(key => (
                          <option key={key} value={key}>{ESTADOS_RAHA[key]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="raha-field">
                      <span>Referencia del envío o respuesta de Raha</span>
                      <input
                        value={referencia}
                        maxLength={180}
                        required={['enviada_raha', 'aprobada'].includes(estado)}
                        disabled={busy}
                        onChange={event => setReferencia(event.target.value)}
                      />
                    </label>
                    <label className="raha-field raha-wide">
                      <span>Nota para el comercio</span>
                      <textarea
                        required
                        minLength={5}
                        maxLength={1000}
                        rows={3}
                        value={nota}
                        disabled={busy}
                        onChange={event => setNota(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="raha-actions" style={{ marginTop: 16 }}>
                    <button type="submit" className="raha-button raha-primary" disabled={busy}>
                      <Save size={16} /> Registrar resultado
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal para gestionar cuentas del Portal RAHA */}
      {modalUsuarios && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: "color-mix(in srgb, var(--color-surface) 75%, transparent)",
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--color-canvas)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 24,
              width: 'min(640px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'grid',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Cuentas del Portal RAHA</h2>
                <p className="raha-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  Activá cuentas para que el equipo de RAHA ingrese en{' '}
                  <a href="/raha/login" target="_blank" rel="noreferrer" style={{ color: "var(--color-success)" }}>
                    /raha/login
                  </a>{' '}
                  a evaluar solicitudes.
                </p>
              </div>
              <button
                type="button"
                className="raha-icon"
                onClick={() => setModalUsuarios(false)}
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {errorUsuario && (
              <div className="raha-alert raha-error">
                <AlertCircle size={16} /> {errorUsuario}
              </div>
            )}
            {mensajeUsuario && (
              <div className="raha-alert raha-success">
                <CheckCircle2 size={16} /> {mensajeUsuario}
              </div>
            )}

            {/* Formulario de nueva cuenta */}
            <form onSubmit={crearUsuario} style={{ borderBottom: '1px solid #353535', paddingBottom: 20 }}>
              <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Crear nueva cuenta para RAHA</h3>
              <div className="raha-fields">
                <label className="raha-field">
                  <span>Nombre del operador</span>
                  <input
                    required
                    value={nuevoNombre}
                    onChange={e => setNuevoNombre(e.target.value)}
                    placeholder="Ej. Rodrigo - Operaciones Raha"
                  />
                </label>
                <label className="raha-field">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    value={nuevoEmail}
                    onChange={e => setNuevoEmail(e.target.value)}
                    placeholder="operaciones@raha.com.py"
                  />
                </label>
                <label className="raha-field raha-wide">
                  <span>Contraseña (mínimo 10 caracteres)</span>
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={nuevoPassword}
                    onChange={e => setNuevoPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </label>
              </div>
              <div style={{ marginTop: 12 }}>
                <button type="submit" className="raha-button raha-primary" disabled={busy}>
                  <Plus size={16} /> Activar cuenta en Portal RAHA
                </button>
              </div>
            </form>

            {/* Listado de cuentas existentes */}
            <div>
              <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Cuentas existentes</h3>
              {loadingUsuarios ? (
                <div className="raha-loading"><Loader size={16} className="raha-spin" /> Cargando…</div>
              ) : usuariosPortal.length === 0 ? (
                <p className="raha-muted">Todavía no hay cuentas registradas para el portal RAHA.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                  {usuariosPortal.map(u => (
                    <li
                      key={u.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: '#222',
                        border: '1px solid #333',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{u.nombre}</strong>
                        <div className="raha-muted" style={{ fontSize: 12 }}>
                          {u.email} {u.ultimo_acceso && `• Último acceso: ${new Date(u.ultimo_acceso).toLocaleDateString('es-PY')}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span
                          className="raha-badge"
                          style={{
                            background: u.activo ? "color-mix(in srgb, var(--color-success) 12%, transparent)" : "color-mix(in srgb, var(--color-danger) 12%, transparent)",
                            color: u.activo ? "var(--color-success)" : "var(--color-danger)",
                          }}
                        >
                          {u.activo ? 'Activa' : 'Desactivada'}
                        </span>
                        <button
                          type="button"
                          className="raha-button"
                          style={{ padding: '4px 10px', minHeight: 32, fontSize: 12 }}
                          onClick={() => alternarEstadoUsuario(u)}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

