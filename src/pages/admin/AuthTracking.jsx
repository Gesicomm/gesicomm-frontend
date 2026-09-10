import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader,
  MailCheck,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  Wifi,
} from 'lucide-react';
import { authTrackingService } from '../../services/authTrackingService';
import './AuthTracking.css';

const EVENTOS = [
  { id: 'todos', label: 'Todos' },
  { id: 'register', label: 'Registros' },
  { id: 'email_verified', label: 'Verificados' },
  { id: 'login_success', label: 'Logins' },
  { id: 'login_failed', label: 'Fallidos' },
  { id: 'onboarding_started', label: 'Onboarding iniciado' },
  { id: 'onboarding_store_created', label: 'Tienda creada' },
  { id: 'onboarding_landing_generated', label: 'Landing generada' },
  { id: 'onboarding_skipped', label: 'Saltados' },
  { id: 'password_reset_requested', label: 'Recuperación' },
];

const EVENTO_LABELS = {
  register: 'Registro',
  email_verified: 'Verificación',
  login_success: 'Login',
  login_failed: 'Login fallido',
  logout: 'Logout',
  otp_resent: 'OTP reenviado',
  password_reset_requested: 'Recuperación',
  onboarding_started: 'Onboarding iniciado',
  onboarding_store_created: 'Tienda creada',
  onboarding_landing_generated: 'Landing generada',
  onboarding_skipped: 'Configurado más tarde',
};

function fechaHora(valor) {
  if (!valor) return '-';
  return new Intl.DateTimeFormat('es-PY', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

function tiempoRelativo(valor) {
  if (!valor) return '-';
  const diff = Date.now() - new Date(valor).getTime();
  const minutos = Math.max(0, Math.round(diff / 60000));
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} d`;
}

function nombreUsuario(item) {
  return item?.usuario?.nombre || item?.email || item?.usuario?.correo_electronico || 'Sin usuario';
}

function userAgentCorto(userAgent) {
  if (!userAgent) return '-';
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('Safari/')) return 'Safari';
  return userAgent.slice(0, 42);
}

function Kpi({ icon: Icon, label, value, note, tone = 'neutral' }) {
  return (
    <section className={`at-kpi at-kpi-${tone}`}>
      <div className="at-kpi-icon"><Icon size={18} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </section>
  );
}

function BadgeEvento({ tipo, resultado }) {
  const esOnboarding = tipo?.startsWith('onboarding_');
  const tone = resultado === 'fallo'
    ? 'danger'
    : tipo === 'register' || tipo === 'onboarding_landing_generated'
      ? 'success'
      : tipo === 'email_verified' || esOnboarding
        ? 'info'
        : 'neutral';
  return <span className={`at-badge at-badge-${tone}`}>{EVENTO_LABELS[tipo] || tipo}</span>;
}

function MiniSerie({ serie }) {
  const max = Math.max(1, ...serie.map((d) => Math.max(
    d.registros,
    d.logins,
    d.onboarding_started || 0,
    d.onboarding_landing_generated || 0,
    d.fallos,
  )));
  return (
    <div className="at-serie" aria-label="Actividad de autenticación por día">
      {serie.map((dia) => (
        <div
          className="at-serie-dia"
          key={dia.fecha}
          title={`${dia.fecha}: ${dia.registros} registros, ${dia.logins} logins, ${dia.onboarding_started || 0} onboarding, ${dia.onboarding_landing_generated || 0} landings, ${dia.fallos} fallos`}
        >
          <span className="at-bar at-bar-registros" style={{ height: `${Math.max(4, (dia.registros / max) * 100)}%` }} />
          <span className="at-bar at-bar-logins" style={{ height: `${Math.max(4, (dia.logins / max) * 100)}%` }} />
          <span className="at-bar at-bar-onboarding" style={{ height: `${Math.max(4, ((dia.onboarding_started || 0) / max) * 100)}%` }} />
          <span className="at-bar at-bar-landings" style={{ height: `${Math.max(4, ((dia.onboarding_landing_generated || 0) / max) * 100)}%` }} />
          <span className="at-bar at-bar-fallos" style={{ height: `${dia.fallos > 0 ? Math.max(4, (dia.fallos / max) * 100) : 0}%` }} />
        </div>
      ))}
    </div>
  );
}

function paginaVacia() {
  return {
    pagina: 1,
    limite: 10,
    total: 0,
    paginas: 1,
    tiene_siguiente: false,
    tiene_anterior: false,
  };
}

function Paginacion({ paginacion, onChange }) {
  const p = paginacion || paginaVacia();
  return (
    <div className="at-pagination">
      <span>{p.total} registros · página {p.pagina} de {p.paginas}</span>
      <div>
        <button type="button" disabled={!p.tiene_anterior} onClick={() => onChange(p.pagina - 1)}>Anterior</button>
        <button type="button" disabled={!p.tiene_siguiente} onClick={() => onChange(p.pagina + 1)}>Siguiente</button>
      </div>
    </div>
  );
}

export default function AuthTracking() {
  const [dias, setDias] = useState(30);
  const [tipo, setTipo] = useState('todos');
  const [resultado, setResultado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [eventosPagina, setEventosPagina] = useState(1);
  const [sesionesPagina, setSesionesPagina] = useState(1);
  const [notificacionesPagina, setNotificacionesPagina] = useState(1);
  const [resumen, setResumen] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [eventosPaginacion, setEventosPaginacion] = useState(paginaVacia());
  const [sesiones, setSesiones] = useState([]);
  const [sesionesPaginacion, setSesionesPaginacion] = useState(paginaVacia());
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionesPaginacion, setNotificacionesPaginacion] = useState(paginaVacia());
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [r, e, s, n] = await Promise.all([
        authTrackingService.resumen(dias),
        authTrackingService.eventos({
          pagina: eventosPagina,
          filtros: { tipo, resultado, busqueda },
        }),
        authTrackingService.sesiones({
          pagina: sesionesPagina,
          filtros: { busqueda },
        }),
        authTrackingService.notificaciones({
          pagina: notificacionesPagina,
          filtros: {},
        }),
      ]);
      setResumen(r);
      setEventos(e.items || []);
      setEventosPaginacion(e.paginacion || paginaVacia());
      setSesiones(s.items || []);
      setSesionesPaginacion(s.paginacion || paginaVacia());
      setNotificaciones(n.items || []);
      setNotificacionesPaginacion(n.paginacion || paginaVacia());
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos cargar el tracking de seguridad.');
    } finally {
      setLoading(false);
    }
  }, [busqueda, dias, eventosPagina, notificacionesPagina, resultado, sesionesPagina, tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setEventosPagina(1);
    setSesionesPagina(1);
  }, [busqueda, resultado, tipo]);

  const noLeidas = useMemo(() => notificaciones.filter((n) => !n.leida).length, [notificaciones]);
  const serie = resumen?.serie || [];

  const marcarLeidas = async () => {
    setMarcando(true);
    try {
      await authTrackingService.marcarNotificacionesLeidas();
      await cargar();
      window.dispatchEvent(new Event('auth-tracking:updated'));
    } finally {
      setMarcando(false);
    }
  };

  if (loading && !resumen) {
    return (
      <div className="at-loading">
        <Loader className="at-spin" size={22} />
        <span>Cargando seguridad...</span>
      </div>
    );
  }

  return (
    <div className="auth-tracking">
      <header className="at-header">
        <div>
          <span className="at-eyebrow"><ShieldCheck size={14} /> Seguridad gratis</span>
          <h1>Tracking de login, registros y onboarding</h1>
          <p>Auditoría propia del sistema: usuarios conectados, eventos de acceso, avance de onboarding y alertas internas.</p>
        </div>
        <div className="at-actions">
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Rango de días">
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
          <button type="button" onClick={cargar} disabled={loading}>
            {loading ? <Loader className="at-spin" size={15} /> : <RefreshCw size={15} />}
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="at-error" role="alert">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <section className="at-kpis">
        <Kpi icon={Users} label="Usuarios totales" value={resumen?.usuarios_total ?? 0} note={`${resumen?.usuarios_verificados ?? 0} verificados`} />
        <Kpi icon={Wifi} label="Conectados ahora" value={resumen?.sesiones_activas ?? 0} note="actividad en los últimos 15 min" tone="success" />
        <Kpi icon={UserPlus} label="Registros" value={resumen?.registros_periodo ?? 0} note={`${resumen?.nuevos_registros_24h ?? 0} en 24 h`} tone="info" />
        <Kpi icon={KeyRound} label="Logins" value={resumen?.logins_periodo ?? 0} note={`${resumen?.nuevos_logins_24h ?? 0} en 24 h`} />
        <Kpi icon={Rocket} label="Onboarding iniciado" value={resumen?.onboarding_iniciados_periodo ?? 0} note={`${resumen?.nuevos_onboarding_24h ?? 0} en 24 h`} tone="info" />
        <Kpi icon={CheckCircle2} label="Landings generadas" value={resumen?.onboarding_landings_periodo ?? 0} note={`${resumen?.onboarding_saltados_periodo ?? 0} configuraron más tarde`} tone="success" />
        <Kpi icon={AlertTriangle} label="Fallos" value={resumen?.fallos_periodo ?? 0} note="credenciales, OTP o sesión" tone="danger" />
        <Kpi icon={Bell} label="Alertas sin leer" value={resumen?.notificaciones_no_leidas ?? noLeidas} note="registros, logins y onboarding" tone="warning" />
      </section>

      <section className="at-panel at-span-12">
        <div className="at-panel-head">
          <div>
            <h2>Actividad diaria</h2>
            <p>Registros, logins, onboarding, landings generadas y fallos del período.</p>
          </div>
          <div className="at-legend">
            <span><i className="at-dot at-dot-registros" /> Registros</span>
            <span><i className="at-dot at-dot-logins" /> Logins</span>
            <span><i className="at-dot at-dot-onboarding" /> Onboarding</span>
            <span><i className="at-dot at-dot-landings" /> Landings</span>
            <span><i className="at-dot at-dot-fallos" /> Fallos</span>
          </div>
        </div>
        {serie.length > 0 ? <MiniSerie serie={serie} /> : <div className="at-empty">Todavía no hay eventos para este período.</div>}
      </section>

      <div className="at-grid">
        <section className="at-panel">
          <div className="at-panel-head">
            <div>
              <h2>Usuarios conectados</h2>
              <p>Sesiones activas detectadas por actividad reciente.</p>
            </div>
            <Activity size={18} />
          </div>
          <div className="at-table-wrap">
            <table className="at-table">
              <thead>
                <tr><th>Usuario</th><th>Última actividad</th><th>IP</th><th>Navegador</th></tr>
              </thead>
              <tbody>
                {sesiones.length === 0 ? (
                  <tr><td colSpan={4} className="at-empty-cell">Sin sesiones activas ahora.</td></tr>
                ) : sesiones.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.usuario?.nombre || 'Usuario'}</strong>
                      <small>{s.usuario?.correo_electronico}</small>
                    </td>
                    <td>{tiempoRelativo(s.last_seen_at)}</td>
                    <td>{s.ip || '-'}</td>
                    <td>{userAgentCorto(s.user_agent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion paginacion={sesionesPaginacion} onChange={setSesionesPagina} />
        </section>

        <section className="at-panel">
          <div className="at-panel-head">
            <div>
              <h2>Notificaciones</h2>
              <p>Eventos importantes para revisar desde admin.</p>
            </div>
            <button type="button" onClick={marcarLeidas} disabled={marcando || (resumen?.notificaciones_no_leidas ?? noLeidas) === 0}>
              {marcando ? <Loader className="at-spin" size={14} /> : <CheckCircle2 size={14} />}
              Marcar leídas
            </button>
          </div>
          <div className="at-notificaciones">
            {notificaciones.length === 0 ? (
              <div className="at-empty">No hay notificaciones todavía.</div>
            ) : notificaciones.map((n) => (
              <article key={n.id} className={`at-notificacion ${n.leida ? '' : 'at-notificacion-nueva'}`}>
                <div className="at-noti-icon">{n.tipo?.startsWith('onboarding_') ? <Rocket size={15} /> : n.tipo === 'register' ? <UserPlus size={15} /> : n.tipo === 'email_verified' ? <MailCheck size={15} /> : <KeyRound size={15} />}</div>
                <div>
                  <strong>{n.titulo}</strong>
                  <p>{n.mensaje}</p>
                  <small><Clock3 size={12} /> {fechaHora(n.created_at)}</small>
                </div>
              </article>
            ))}
          </div>
          <Paginacion paginacion={notificacionesPaginacion} onChange={setNotificacionesPagina} />
        </section>
      </div>

      <section className="at-panel at-span-12">
        <div className="at-panel-head">
          <div>
            <h2>Eventos de autenticación</h2>
            <p>Historial técnico para investigar accesos, registros, onboarding e intentos fallidos.</p>
          </div>
          <div className="at-filtros">
            <label className="at-search">
              <Search size={15} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar email, IP o usuario"
              />
            </label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar eventos">
              {EVENTOS.map((evento) => <option key={evento.id} value={evento.id}>{evento.label}</option>)}
            </select>
            <select value={resultado} onChange={(e) => setResultado(e.target.value)} aria-label="Filtrar resultado">
              <option value="todos">Todos los resultados</option>
              <option value="ok">Correctos</option>
              <option value="fallo">Fallidos</option>
            </select>
          </div>
        </div>
        <div className="at-table-wrap">
          <table className="at-table">
            <thead>
              <tr><th>Evento</th><th>Usuario</th><th>Fecha</th><th>IP</th><th>Navegador</th></tr>
            </thead>
            <tbody>
              {eventos.length === 0 ? (
                <tr><td colSpan={5} className="at-empty-cell">No hay eventos con este filtro.</td></tr>
              ) : eventos.map((evento) => (
                <tr key={evento.id}>
                  <td><BadgeEvento tipo={evento.tipo} resultado={evento.resultado} /></td>
                  <td>
                    <strong>{nombreUsuario(evento)}</strong>
                    <small>{evento.email || evento.usuario?.correo_electronico || '-'}</small>
                  </td>
                  <td>{fechaHora(evento.created_at)}</td>
                  <td>{evento.ip || '-'}</td>
                  <td>{userAgentCorto(evento.user_agent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginacion paginacion={eventosPaginacion} onChange={setEventosPagina} />
      </section>
    </div>
  );
}
