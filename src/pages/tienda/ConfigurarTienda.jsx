import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save, Check, X, Loader, AlertCircle, Globe, Sparkles, Crown,
  ShieldCheck, Trash2, Eye, EyeOff, HelpCircle, ExternalLink, Key
} from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';
import { useDebounce } from '../../hooks/useDebounce';
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

  const [disponibilidad, setDisponibilidad] = useState(null); // { valido, disponible, motivo } | null | 'cargando'
  const ultimaConsulta = useRef(0);

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
  const subdominioCambia = !!tienda && subdominioDerivado !== tienda.subdominio;
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
      if (eliminarMetaToken) {
        payload.meta_access_token = '';
      } else if (metaTokenNuevo.trim()) {
        payload.meta_access_token = metaTokenNuevo.trim();
      }

      const actualizada = await tiendaService.actualizar(payload);
      setTienda(actualizada);
      setMetaTokenNuevo('');
      setEliminarMetaToken(false);
      setOk(true);
      setTimeout(() => setOk(false), 1800);
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
        {error && (
          <div className="land-alert-error" style={{ marginBottom: '1.25rem' }}>
            <span><AlertCircle size={15} /> {error}</span>
            {erroresValidacion.length > 0 && (
              <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="land-editor-grid land-editor-grid-form">
          <div className="land-section">
            <h2>Identidad</h2>
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

            {subdominioCambia && (
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

          <DominioPropio tienda={tienda} plan={form.plan} onActualizada={setTienda} />

          <div className="land-section">
            <h2>Colores</h2>
            <div className="land-color-row">
              <label>Primario<input type="color" value={form.color_primario} onChange={e => handleChange('color_primario', e.target.value)} /></label>
              <label>Secundario<input type="color" value={form.color_secundario} onChange={e => handleChange('color_secundario', e.target.value)} /></label>
              <label>Fondo<input type="color" value={form.color_fondo} onChange={e => handleChange('color_fondo', e.target.value)} /></label>
            </div>
          </div>

          <div className="land-section">
            <h2>Contacto</h2>
            <label>WhatsApp
              <input value={form.whatsapp} onChange={e => handleChange('whatsapp', e.target.value)} placeholder="Ej: 595981234567" />
            </label>
            <label>Teléfono (opcional)
              <input value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} />
            </label>
            <label>Mensaje de contacto
              <input value={form.mensaje_contacto} onChange={e => handleChange('mensaje_contacto', e.target.value)} />
            </label>
          </div>

          <div className="land-section">
            <h2>Meta Pixel / CAPI</h2>
            <p className="vit-subtitle">Para medir clics en "Consultar" como conversiones en tus campañas de Meta Ads.</p>
            
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

          <div className="land-section">
            <h2>Google Analytics / TikTok Pixel</h2>
            <p className="vit-subtitle">Solo el lado navegador — a diferencia de Meta, acá no hay envío server-side (CAPI/Events API).</p>
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

          <div className="land-editor-footer">
            {ok && <span className="tn-saved"><Check size={14} /> Guardado</span>}
            <button type="submit" className="land-btn-primary" disabled={guardando}>
              {guardando ? <Loader size={15} className="spin-icon" /> : <Save size={15} />}
              Guardar cambios
            </button>
          </div>
        </form>

        <div className="land-section">
          <h2><Globe size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />Dominio propio</h2>
          <DominioPropio tienda={tienda} onActualizado={cargar} />
        </div>
      </div>
    </div>
  );
}
