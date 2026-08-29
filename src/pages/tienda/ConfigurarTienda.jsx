import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Save, Check, X, Loader, AlertCircle, Globe, Sparkles, Crown,
  ShieldCheck, Trash2, Eye, EyeOff, HelpCircle, Key, CheckCircle2,
  Store, MessageCircle, BarChart3, Phone, Palette, MousePointerClick,
} from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';
import { useDebounce } from '../../hooks/useDebounce';
import { generarPreviewMensaje } from '../../lib/mensajeWhatsapp';
import DominioPropio from './DominioPropio';
import '../vitrina/vitrina.css';
import '../landing/landing.css';
import './tienda.css';

function slugifyLigero(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

const PLANES = [
  { id: 'free', icono: Sparkles, titulo: 'Free' },
  { id: 'pago', icono: Crown, titulo: 'Pago' },
];

const FORM_INICIAL = {
  nombre: '',
  color_primario: '#10b981',
  color_secundario: '#059669',
  color_fondo: '#0a0a0a',
  whatsapp: '',
  telefono: '',
  mensaje_contacto: 'Hola, me interesa {producto}',
  plan: 'free',
  meta_pixel_id: '',
  meta_test_event_code: '',
  meta_capi_activo: false,
  google_analytics_id: '',
  tiktok_pixel_id: '',
};

const TABS = [
  { id: 'tienda', label: 'Tu Tienda', icono: Store },
  { id: 'contacto', label: 'Contacto', icono: MessageCircle },
  { id: 'analitica', label: 'Analítica', icono: BarChart3 },
];

const VARIABLES_MENSAJE = [
  { variable: '{producto}', desc: 'Nombre del producto', ejemplo: 'Chomba Lacoste Clásica' },
  { variable: '{precio}', desc: 'Precio formateado', ejemplo: '150.000 Gs' },
  { variable: '{url}', desc: 'URL de tu landing', ejemplo: 'sommix.gesicomm.com' },
];

// La creación de la tienda vive en /onboarding (nombre + plan, primer paso
// de una cuenta nueva) — a esta pantalla solo se llega ya con una tienda
// creada (lo garantiza el guard RequireTienda), así que acá es siempre
// edición.
export default function ConfigurarTienda() {
  const [tienda, setTienda] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [ok, setOk] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [tab, setTab] = useState('tienda');

  const [disponibilidad, setDisponibilidad] = useState(null); // { valido, disponible, motivo } | null | 'cargando'
  const ultimaConsulta = useRef(0);
  const textareaRef = useRef(null);

  // El access token nunca vuelve del backend (ni cifrado) — solo un flag
  // de si ya hay uno guardado (tienda.meta_access_token_configurado).
  const [metaTokenNuevo, setMetaTokenNuevo] = useState('');
  const [eliminarMetaToken, setEliminarMetaToken] = useState(false);
  const [mostrarToken, setMostrarToken] = useState(false);
  const [mostrarGuiaCapi, setMostrarGuiaCapi] = useState(false);

  // El subdominio no es un campo aparte: es siempre el nombre de la tienda
  // slugificado. Si no está disponible, la usuaria cambia el nombre, no un
  // campo de URL independiente. Cambiar el nombre de una tienda ya
  // publicada cambia su URL pública — cualquier link ya compartido
  // (WhatsApp, anuncios) deja de funcionar. Se avisa en el formulario
  // antes de guardar.
  const subdominioDerivado = slugifyLigero(form.nombre);
  const subdominioCambia = !tienda || subdominioDerivado !== tienda.subdominio;
  const subdominioDebounced = useDebounce(subdominioDerivado, 500);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await tiendaService.obtener();
      setTienda(data);
      if (data) {
        setForm({
          nombre: data.nombre || '',
          color_primario: data.color_primario || '#10b981',
          color_secundario: data.color_secundario || '#059669',
          color_fondo: data.color_fondo || '#0a0a0a',
          whatsapp: data.whatsapp || '',
          telefono: data.telefono || '',
          mensaje_contacto: data.mensaje_contacto || FORM_INICIAL.mensaje_contacto,
          plan: data.plan || 'free',
          meta_pixel_id: data.meta_pixel_id || '',
          meta_test_event_code: data.meta_test_event_code || '',
          meta_capi_activo: !!data.meta_capi_activo,
          google_analytics_id: data.google_analytics_id || '',
          tiktok_pixel_id: data.tiktok_pixel_id || '',
        });
      }
    } catch (err) {
      setError('No se pudo cargar la información de tu tienda.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Chequeo de disponibilidad en vivo — solo hace falta consultar cuando
  // el subdominio derivado del nombre difiere del que ya tiene guardado
  // (si no cambió, no hay nada que validar).
  useEffect(() => {
    if (!subdominioCambia || !subdominioDebounced || subdominioDebounced.length < 3) {
      setDisponibilidad(null);
      return;
    }
    const idConsulta = ++ultimaConsulta.current;
    setDisponibilidad('cargando');
    tiendaService.disponibilidadSubdominio(subdominioDebounced)
      .then(res => { if (idConsulta === ultimaConsulta.current) setDisponibilidad(res); })
      .catch(() => { if (idConsulta === ultimaConsulta.current) setDisponibilidad({ valido: false, disponible: false, motivo: 'Error al verificar.' }); });
  }, [subdominioDebounced, subdominioCambia]);

  function handleChange(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  function insertarVariable(variable) {
    const ta = textareaRef.current;
    if (!ta) {
      handleChange('mensaje_contacto', form.mensaje_contacto + variable);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const texto = form.mensaje_contacto;
    const nuevo = texto.slice(0, start) + variable + texto.slice(end);
    handleChange('mensaje_contacto', nuevo);
    // Re-focus and position cursor after inserted variable
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + variable.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  const previewMensaje = useMemo(() =>
    generarPreviewMensaje(form.mensaje_contacto),
  [form.mensaje_contacto]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setErroresValidacion([]);
    setOk(false);

    if (!form.nombre.trim()) return setError('El nombre de tu tienda es obligatorio.');
    if (subdominioCambia) {
      if (!subdominioDerivado || subdominioDerivado.length < 3) {
        return setError('Ese nombre no alcanza para generar una URL válida — probá con un nombre más largo, con letras o números.');
      }
      if (disponibilidad && (disponibilidad.valido === false || disponibilidad.disponible === false)) {
        return setError(disponibilidad.motivo || 'Ese nombre ya está en uso por otra tienda — probá con otro.');
      }
    }

    setGuardando(true);
    try {
      const payload = { ...form, subdominio: subdominioDerivado };
      const tokenFueIngresado = Boolean(metaTokenNuevo.trim());
      const tokenFueEliminado = eliminarMetaToken;

      if (eliminarMetaToken) {
        payload.meta_access_token = '';
      } else if (tokenFueIngresado) {
        payload.meta_access_token = metaTokenNuevo.trim();
      }

      let actualizada;
      if (tienda) {
        actualizada = await tiendaService.actualizar(payload);
      } else {
        actualizada = await tiendaService.crear(payload);
      }
      setTienda(actualizada);
      setMetaTokenNuevo('');
      setEliminarMetaToken(false);
      setOk(true);

      if (tokenFueIngresado) {
        setMensajeExito('✓ ¡Tu Token de Meta Conversions API (CAPI) fue guardado y encriptado exitosamente en el servidor!');
      } else if (tokenFueEliminado) {
        setMensajeExito('✓ El Token de Meta CAPI fue eliminado correctamente.');
      } else {
        setMensajeExito('✓ Configuración guardada correctamente.');
      }

      setTimeout(() => setOk(false), 4500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la tienda.');
      setErroresValidacion(err.response?.data?.errores || []);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <div className="vit-page"><div className="vit-empty"><Loader size={22} className="spin-icon" /><p>Cargando...</p></div></div>;
  }

  return (
    <div className="vit-page">
      <div className="vit-header">
        <div>
          <h1>Configuración de tu Tienda</h1>
          <p className="vit-subtitle">Ajustá la identidad visual, datos de contacto y analítica de todas tus landings.</p>
        </div>
      </div>

      <div className="vit-card">
        {ok && mensajeExito && (
          <div className="land-alert-success" style={{ marginBottom: '1.25rem' }}>
            <CheckCircle2 size={18} />
            <span>{mensajeExito}</span>
          </div>
        )}

        {error && (
          <div className="land-alert-error" style={{ marginBottom: '1.25rem' }}>
            <span><AlertCircle size={15} /> {error}</span>
            {erroresValidacion.length > 0 && (
              <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>
            )}
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="tn-tabs">
          {TABS.map(t => {
            const Icono = t.icono;
            return (
              <button
                key={t.id}
                type="button"
                className={`tn-tab ${tab === t.id ? 'activo' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <span className="tn-tab-icon"><Icono size={15} /></span>
                {t.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="land-editor-grid land-editor-grid-form">

          {/* ════════════════════════ TAB: TU TIENDA ═════════════════════ */}
          {tab === 'tienda' && (
            <div className="tn-tab-content" key="tienda">
              <div className="land-editor-grid">
                <div className="land-section">
                  <div className="tn-section-header">
                    <span className="tn-section-icon"><Store size={14} /></span>
                    <h2>Identidad</h2>
                  </div>
                  <label>Nombre de la tienda
                    <input value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} />
                  </label>

                  <label>URL pública
                    <div className="tn-url-readonly">
                      <Globe size={14} color="var(--vit-muted)" />
                      <code>{subdominioDerivado || 'tu-tienda'}.{tienda?.dominio_base || 'gesicomm.com'}</code>
                    </div>
                  </label>

                  {subdominioCambia && (
                    <div className="tn-disponibilidad">
                      {disponibilidad === 'cargando' && <span className="tn-check cargando"><Loader size={12} className="spin-icon" /> Verificando disponibilidad...</span>}
                      {disponibilidad && disponibilidad !== 'cargando' && disponibilidad.disponible && (
                        <span className="tn-check ok"><Check size={12} /> URL disponible</span>
                      )}
                      {disponibilidad && disponibilidad !== 'cargando' && !disponibilidad.disponible && (
                        <span className="tn-check error"><X size={12} /> {disponibilidad.motivo || 'No disponible'}</span>
                      )}
                    </div>
                  )}

                  {subdominioCambia && !!tienda && (
                    <p className="tn-warning">
                      <AlertCircle size={14} />
                      <span><strong>Atención:</strong> Cambiar el nombre va a modificar la URL pública de tu catálogo y de todas tus landings. Links que ya hayas compartido dejarán de funcionar.</span>
                    </p>
                  )}

                  <label>Plan de tu cuenta</label>
                  <div className="tn-plan-row">
                    {PLANES.map(p => {
                      const Icono = p.icono;
                      const activo = form.plan === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`tn-plan-chip ${activo ? 'selected' : ''}`}
                          onClick={() => handleChange('plan', p.id)}
                        >
                          <Icono size={14} />
                          {p.titulo}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="land-section">
                  <div className="tn-section-header">
                    <span className="tn-section-icon purple"><Palette size={14} /></span>
                    <h2>Colores</h2>
                  </div>
                  <p className="tn-section-desc">Estos colores se aplican a todas tus landings y al catálogo público.</p>
                  <div className="land-color-row">
                    <label>Primario<input type="color" value={form.color_primario} onChange={e => handleChange('color_primario', e.target.value)} /></label>
                    <label>Secundario<input type="color" value={form.color_secundario} onChange={e => handleChange('color_secundario', e.target.value)} /></label>
                    <label>Fondo<input type="color" value={form.color_fondo} onChange={e => handleChange('color_fondo', e.target.value)} /></label>
                  </div>
                </div>

                <div className="land-section land-section-wide">
                  <div className="tn-section-header">
                    <span className="tn-section-icon blue"><Globe size={14} /></span>
                    <h2>Dominio propio</h2>
                  </div>
                  {tienda ? (
                    <DominioPropio tienda={tienda} onActualizado={cargar} />
                  ) : (
                    <p className="tn-section-desc">Guardá tu tienda primero para poder configurar un dominio propio.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════ TAB: CONTACTO ══════════════════════════ */}
          {tab === 'contacto' && (
            <div className="tn-tab-content" key="contacto">
              <div className="land-editor-grid">
                <div className="land-section">
                  <div className="tn-section-header">
                    <span className="tn-section-icon"><Phone size={14} /></span>
                    <h2>Datos de contacto</h2>
                  </div>
                  <p className="tn-section-desc">El número de WhatsApp es el que recibe las consultas desde tus landings.</p>
                  <label>WhatsApp
                    <input value={form.whatsapp} onChange={e => handleChange('whatsapp', e.target.value)} placeholder="Ej: 595981234567" />
                  </label>
                  <label>Teléfono (opcional)
                    <input value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} placeholder="Solo si querés mostrar otro número" />
                  </label>
                </div>

                <div className="land-section">
                  <div className="tn-section-header">
                    <span className="tn-section-icon"><MessageCircle size={14} /></span>
                    <h2>Mensaje de WhatsApp</h2>
                  </div>
                  <p className="tn-section-desc">
                    Personalizá el texto que se envía cuando un cliente toca "Consultar" o "Finalizar pedido" desde tu landing.
                  </p>

                  <div className="tn-msg-builder">
                    <p className="tn-msg-builder-label">Plantilla del mensaje</p>
                    <textarea
                      ref={textareaRef}
                      className="tn-msg-textarea"
                      value={form.mensaje_contacto}
                      onChange={e => handleChange('mensaje_contacto', e.target.value)}
                      placeholder="Ej: Hola, me interesa {producto}"
                      rows={3}
                    />

                    <div className="tn-msg-vars-header">
                      <MousePointerClick size={12} />
                      <span>Hacé clic para insertar una variable</span>
                    </div>
                    <div className="tn-msg-vars">
                      {VARIABLES_MENSAJE.map(v => (
                        <button
                          key={v.variable}
                          type="button"
                          className="tn-msg-var-chip"
                          onClick={() => insertarVariable(v.variable)}
                          title={`${v.desc} — ej: ${v.ejemplo}`}
                        >
                          {v.variable}
                          <span className="tn-var-desc">— {v.desc}</span>
                        </button>
                      ))}
                    </div>

                    <div className="tn-msg-preview-wrap">
                      <div className="tn-msg-preview-label">
                        <Eye size={12} />
                        <span>Preview — así se ve en WhatsApp</span>
                      </div>
                      <div className="tn-msg-preview-bg">
                        {previewMensaje ? (
                          <div className="tn-msg-preview-bubble">
                            {previewMensaje}
                            <span className="tn-preview-time">10:30 a.m.</span>
                          </div>
                        ) : (
                          <div className="tn-msg-preview-empty">Escribí un mensaje arriba para ver el preview.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════ TAB: ANALÍTICA ═════════════════════════ */}
          {tab === 'analitica' && (
            <div className="tn-tab-content" key="analitica">
              <div className="land-editor-grid">
                <div className="land-section land-section-wide">
                  <div className="tn-section-header">
                    <span className="tn-section-icon rose"><BarChart3 size={14} /></span>
                    <h2>Meta Pixel / CAPI</h2>
                  </div>
                  <p className="tn-section-desc">Para medir clics en "Consultar" como conversiones en tus campañas de Meta Ads.</p>

                  <label>Pixel ID
                    <input
                      value={form.meta_pixel_id}
                      onChange={e => handleChange('meta_pixel_id', e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej: 1234567890123456"
                      inputMode="numeric"
                    />
                  </label>

                  <div className="tn-token-wrapper">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ margin: 0 }}>Access Token (Conversions API)</label>
                      <button
                        type="button"
                        className="tn-token-guide-toggle"
                        onClick={() => setMostrarGuiaCapi(prev => !prev)}
                      >
                        <HelpCircle size={13} />
                        {mostrarGuiaCapi ? 'Ocultar ayuda' : '¿De dónde saco este token?'}
                      </button>
                    </div>

                    {tienda?.meta_access_token_configurado && !eliminarMetaToken && (
                      <div className="tn-token-status-pill">
                        <div className="tn-token-status-left">
                          <ShieldCheck size={15} />
                          <span>Token CAPI guardado en el servidor</span>
                        </div>
                        <button
                          type="button"
                          className="tn-token-btn-remove"
                          onClick={() => {
                            setEliminarMetaToken(true);
                            setMetaTokenNuevo('');
                          }}
                          title="Eliminar token guardado"
                        >
                          <Trash2 size={12} />
                          Quitar token
                        </button>
                      </div>
                    )}

                    {eliminarMetaToken && (
                      <div className="tn-token-status-pill removed">
                        <div className="tn-token-status-left">
                          <AlertCircle size={15} />
                          <span>El token se eliminará al guardar cambios.</span>
                        </div>
                        <button
                          type="button"
                          className="tn-token-btn-undo"
                          onClick={() => setEliminarMetaToken(false)}
                        >
                          Deshacer
                        </button>
                      </div>
                    )}

                    <div className="tn-token-input-group">
                      <input
                        type={mostrarToken ? 'text' : 'password'}
                        value={metaTokenNuevo}
                        onChange={e => {
                          setMetaTokenNuevo(e.target.value);
                          if (eliminarMetaToken) setEliminarMetaToken(false);
                        }}
                        placeholder={
                          tienda?.meta_access_token_configurado && !eliminarMetaToken
                            ? 'Escribe acá para reemplazar el token actual...'
                            : 'Pegá acá el token de Events Manager (EAAB...)'
                        }
                        autoComplete="new-password"
                      />
                      {metaTokenNuevo && (
                        <button
                          type="button"
                          className="tn-token-toggle-btn"
                          onClick={() => setMostrarToken(prev => !prev)}
                          title={mostrarToken ? 'Ocultar token' : 'Ver token'}
                        >
                          {mostrarToken ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                    </div>

                    <div className="tn-token-info-note">
                      <ShieldCheck size={14} color="#10b981" />
                      <span>
                        {tienda?.meta_access_token_configurado && !eliminarMetaToken
                          ? 'Tu token de CAPI está activo y protegido con cifrado AES-256 en el servidor. Por seguridad no se expone en texto plano en la pantalla.'
                          : 'Pegá acá tu token generado en Meta Events Manager para que las compras se registren por el servidor.'}
                      </span>
                    </div>

                    {mostrarGuiaCapi && (
                      <div className="tn-token-guide-box">
                        <strong>¿Cómo obtener tu Access Token de Conversions API?</strong>
                        <ol>
                          <li>Entrá a <strong>Meta Events Manager</strong> con tu cuenta comercial de Meta.</li>
                          <li>Seleccioná tu <strong>Píxel / Conjunto de datos</strong> en la columna izquierda.</li>
                          <li>Hacé clic en la pestaña <strong>Configuración</strong>.</li>
                          <li>Bajá hasta la sección <strong>API de conversiones</strong> y haz clic en <strong>"Generar token de acceso"</strong>.</li>
                          <li>Copiá ese token largo (comienza con <code>EAAB...</code>) y pegalo en el campo de arriba.</li>
                        </ol>
                      </div>
                    )}
                  </div>

                  <label>Test Event Code <span className="vit-subtitle" style={{ display: 'inline' }}>(opcional, solo mientras probás)</span>
                    <input
                      value={form.meta_test_event_code}
                      onChange={e => handleChange('meta_test_event_code', e.target.value)}
                      placeholder="Ej: TEST12345"
                    />
                  </label>

                  <label className="tn-checkbox-row">
                    <input type="checkbox" checked={form.meta_capi_activo} onChange={e => handleChange('meta_capi_activo', e.target.checked)} />
                    Enviar eventos también por Conversions API (recomendado)
                  </label>

                  {form.meta_capi_activo && !form.meta_pixel_id && (
                    <p className="tn-warning"><AlertCircle size={13} /> Activaste CAPI pero todavía no cargaste el Pixel ID — no se va a enviar nada hasta que lo completes.</p>
                  )}
                </div>

                <div className="land-section land-section-wide">
                  <div className="tn-section-header">
                    <span className="tn-section-icon amber"><BarChart3 size={14} /></span>
                    <h2>Google Analytics / TikTok Pixel</h2>
                  </div>
                  <p className="tn-section-desc">Solo el lado navegador — a diferencia de Meta, acá no hay envío server-side (CAPI/Events API).</p>
                  <label>Google Analytics — Measurement ID
                    <input
                      value={form.google_analytics_id}
                      onChange={e => handleChange('google_analytics_id', e.target.value.toUpperCase())}
                      placeholder="Ej: G-ABC1234DEF"
                    />
                  </label>
                  <label>TikTok Pixel ID
                    <input
                      value={form.tiktok_pixel_id}
                      onChange={e => handleChange('tiktok_pixel_id', e.target.value)}
                      placeholder="Pegá el Pixel ID de TikTok Ads Manager"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="land-editor-footer">
            {ok && <span className="tn-saved"><Check size={14} /> Guardado</span>}
            <button type="submit" className="land-btn-primary" disabled={guardando}>
              {guardando ? <Loader size={15} className="spin-icon" /> : <Save size={15} />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
