import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  Save, Check, X, Loader, AlertCircle, Globe, Sparkles, Crown,
  ShieldCheck, Trash2, Eye, EyeOff, HelpCircle, CheckCircle2, Info,
  Store, MessageCircle, BarChart3, MousePointerClick, CreditCard, Coins,
  ArrowRight
} from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';
import { useDebounce } from '../../hooks/useDebounce';
import { generarPreviewMensaje } from '../../lib/mensajeWhatsapp';
import PagoParConfig from './PagoParConfig';
import DominioPropio from './DominioPropio';
import ComboConfiguracion from '../combos/ComboConfiguracion';
import { MetodosPagoCrud } from '../courier/MetodosPagoCrud';
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

// Los colores de la tienda (color_primario/secundario/fondo) NO están acá a
// propósito: se editan en cada landing, desde su propio editor. Al no viajar
// en el payload, TiendaService.camposEditables ni los toca (solo asigna los
// campos !== undefined), así que los valores guardados quedan intactos y las
// landings que no definen color propio los siguen heredando como default.
const FORM_INICIAL = {
  nombre: '',
  documento: '',
  ruc: '',
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

// El orden sigue el recorrido de una tienda nueva: primero quién sos y dónde
// se publica tu catálogo, después por dónde te escriben, después cómo cobrás,
// después con qué costos calculás, y al final la medición (lo más técnico y
// lo que menos se toca). Los `id` son los mismos de siempre — solo cambió el
// orden en que se listan y la etiqueta de "Económica" → "Costos", que dice
// mejor qué se configura ahí.
const TABS = [
  {
    id: 'tienda',
    label: 'Tienda',
    icono: Store,
    titulo: 'Tu tienda',
    desc: 'Cómo se llama tu negocio, dónde se publica y bajo qué dominio. Los colores se configuran en cada landing, desde su propio editor.',
  },
  {
    id: 'contacto',
    label: 'Contacto',
    icono: MessageCircle,
    titulo: 'Contacto',
    desc: 'Por dónde te escriben tus clientes y con qué mensaje te llegan.',
  },
  {
    id: 'pasarelas',
    label: 'Pagos',
    icono: CreditCard,
    titulo: 'Medios de cobro',
    desc: 'Conectá una pasarela para que tus clientes puedan pagar online.',
  },
  {
    id: 'economica',
    label: 'Costos',
    icono: Coins,
    titulo: 'Configuración económica',
    desc: 'Los costos con los que se calcula la rentabilidad de tus combos y ofertas.',
  },
  {
    id: 'analitica',
    label: 'Analítica',
    icono: BarChart3,
    titulo: 'Medición y píxeles',
    desc: 'Conectá Meta, Google y TikTok para medir lo que pasa en tus landings.',
  },
];

const TABS_VALIDAS = new Set(TABS.map(t => t.id));

// Tabs cuyo contenido tiene su propio botón de guardado (componentes con su
// propio servicio) — el footer de esta pantalla no los alcanza.
const TABS_CON_GUARDADO_PROPIO = ['economica', 'pasarelas'];

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabInicial = searchParams.get('tab');
  const [tienda, setTienda] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [ok, setOk] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [tab, setTab] = useState(TABS_VALIDAS.has(tabInicial) ? tabInicial : 'tienda');

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
          documento: data.documento || '',
          ruc: data.ruc || '',
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

  useEffect(() => {
    const tabUrl = searchParams.get('tab');
    if (tabUrl && TABS_VALIDAS.has(tabUrl) && tabUrl !== tab) {
      setTab(tabUrl);
    }
  }, [searchParams, tab]);

  function seleccionarTab(tabId) {
    setTab(tabId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    }, { replace: true });
  }

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

  const esPlanPago = form.plan === 'pago';

  const tabActual = TABS.find(t => t.id === tab) || TABS[0];
  const tabGuardaAparte = TABS_CON_GUARDADO_PROPIO.includes(tab);

  // Estados derivados de datos que ya existen — no hay lógica nueva detrás,
  // solo se hacen visibles en el encabezado de cada bloque.
  const estadoDominio = tienda?.dominio_propio_verificado
    ? { tono: 'ok', texto: 'Verificado' }
    : tienda?.dominio_propio
      ? { tono: 'pendiente', texto: 'Pendiente de verificación' }
      : { tono: 'neutro', texto: 'Sin dominio propio' };

  const estadoMeta = form.meta_pixel_id
    ? { tono: 'ok', texto: 'Píxel cargado' }
    : { tono: 'neutro', texto: 'Sin configurar' };

  if (cargando) {
    return (
      <div className="tn-page">
        <div className="tn-loading"><Loader size={22} className="spin-icon" /><p>Cargando...</p></div>
      </div>
    );
  }

  return (
    <div className="tn-page">
      <header className="tn-page-head">
        <h1>Configuración de tu tienda</h1>
        <p>Todo lo que define tu negocio online: identidad, contacto, cobros, costos y medición. Se aplica a tu catálogo y a todas tus landings.</p>
      </header>

      <div className="tn-shell">
        {/* ── Navegación ──────────────────────────────────────────────── */}
        <nav className="tn-tabs" role="tablist" aria-label="Secciones de configuración">
          {TABS.map(t => {
            const Icono = t.icono;
            const activo = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activo}
                className={`tn-tab ${activo ? 'activo' : ''}`}
                onClick={() => seleccionarTab(t.id)}
              >
                <span className="tn-tab-icon"><Icono size={15} /></span>
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="tn-panel">
          <div className="tn-panel-head">
            <h2>{tabActual.titulo}</h2>
            <p>{tabActual.desc}</p>
          </div>

          <form onSubmit={handleSubmit} className="tn-form">
            <div className="tn-body">

              {ok && mensajeExito && (
                <div className="land-alert-success tn-alert">
                  <CheckCircle2 size={18} />
                  <span>{mensajeExito}</span>
                </div>
              )}

              {error && (
                <div className="land-alert-error tn-alert">
                  <span><AlertCircle size={15} /> {error}</span>
                  {erroresValidacion.length > 0 && (
                    <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>
                  )}
                </div>
              )}

              {/* ═════════════════════ TAB: TU TIENDA ═════════════════════ */}
              {tab === 'tienda' && (
                <div className="tn-tab-content" key="tienda">

                  {/* Quién es tu tienda */}
                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3>Identidad</h3>
                      <p>El nombre de tu negocio y la dirección donde se publica tu catálogo.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-fields">
                        <label className="tn-field">
                          <span className="tn-field-label">Nombre de la tienda</span>
                          <input value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} />
                        </label>

                        <label className="tn-field">
                          <span className="tn-field-label">Cédula del titular</span>
                          <input value={form.documento} onChange={e => handleChange('documento', e.target.value)} placeholder="Ej: 4123456" inputMode="numeric" />
                          <span className="tn-field-hint">La pide la pasarela para poder cobrarte. No se muestra a tus clientes.</span>
                        </label>

                        <label className="tn-field">
                          <span className="tn-field-label">RUC <em>(opcional)</em></span>
                          <input value={form.ruc} onChange={e => handleChange('ruc', e.target.value)} placeholder="Ej: 80012345-6" />
                          <span className="tn-field-hint">Solo si facturás. Podés dejarlo vacío.</span>
                        </label>

                        <div className="tn-field">
                          <span className="tn-field-label">URL pública</span>
                          <div className="tn-url-readonly">
                            <Globe size={14} />
                            <code>{subdominioDerivado || 'tu-tienda'}.{tienda?.dominio_base || 'gesicomm.com'}</code>
                          </div>
                          <span className="tn-field-hint">Se genera automáticamente a partir del nombre.</span>
                        </div>
                      </div>

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
                    </div>
                  </section>

                  {/* Dónde se publica */}
                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3>Dominio propio</h3>
                      <p>Publicá tu tienda bajo tu propia dirección web en lugar del subdominio de Gesicomm.</p>
                      <span className={`tn-badge ${estadoDominio.tono}`}>{estadoDominio.texto}</span>
                    </div>
                    <div className="tn-group-body">
                      {tienda ? (
                        <DominioPropio tienda={tienda} onActualizado={cargar} />
                      ) : (
                        <p className="tn-field-hint">Guardá tu tienda primero para poder configurar un dominio propio.</p>
                      )}
                    </div>
                  </section>

                  {/* Suscripción — el plan dejó de elegirse acá con dos chips:
                      se mira y se mejora desde /planes. form.plan sigue en el
                      payload con el valor cargado, así que el guardado no
                      cambia. */}
                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3>Plan de tu cuenta</h3>
                      <p>Define qué funciones tenés habilitadas dentro de Gesicomm.</p>
                    </div>
                    <div className="tn-group-body">
                      {esPlanPago ? (
                        <div className="tn-plan-actual">
                          <span className="tn-plan-actual-icono"><Crown size={18} /></span>
                          <div className="tn-plan-actual-texto">
                            <strong>Estás en un plan de pago</strong>
                            <span>Tenés habilitadas todas las funciones de tu plan.</span>
                          </div>
                          <button type="button" className="tn-plan-link" onClick={() => navigate('/planes')}>
                            Ver planes <ArrowRight size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="tn-upsell">
                          <span className="tn-upsell-eyebrow"><Sparkles size={13} /> Estás en el plan Free</span>
                          <h4>Tu tienda ya funciona. Ahora hacela vender sola.</h4>
                          <p>
                            Con un plan de pago publicás bajo tu propio dominio, cobrás online desde el
                            checkout y medís cada campaña con Meta, Google y TikTok — todo lo que hoy
                            tenés a medias en esta misma pantalla.
                          </p>
                          <ul className="tn-upsell-lista">
                            <li><Check size={14} /> Dominio propio con certificado</li>
                            <li><Check size={14} /> Cobros online en tus landings</li>
                            <li><Check size={14} /> Píxeles y Conversions API</li>
                            <li><Check size={14} /> Landings y embudos ilimitados</li>
                          </ul>
                          <div className="tn-upsell-acciones">
                            <button type="button" className="tn-upsell-cta" onClick={() => navigate('/planes')}>
                              Ver planes y mejorar <ArrowRight size={15} />
                            </button>
                            <span className="tn-upsell-nota">Sin permanencia — cambiás cuando quieras.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {/* ═════════════════════ TAB: CONTACTO ══════════════════════ */}
              {tab === 'contacto' && (
                <div className="tn-tab-content" key="contacto">

                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3>Canales de contacto</h3>
                      <p>El número de WhatsApp es el que recibe las consultas que salen de tus landings.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-fields">
                        <label className="tn-field">
                          <span className="tn-field-label">WhatsApp</span>
                          <input value={form.whatsapp} onChange={e => handleChange('whatsapp', e.target.value)} placeholder="Ej: 595981234567" />
                          <span className="tn-field-hint">Con código de país, sin espacios ni signos.</span>
                        </label>
                        <label className="tn-field">
                          <span className="tn-field-label">Teléfono <em>(opcional)</em></span>
                          <input value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} placeholder="Solo si querés mostrar otro número" />
                          <span className="tn-field-hint">Se muestra como dato de contacto, no recibe los mensajes.</span>
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3>Mensaje de WhatsApp</h3>
                      <p>El texto que se envía cuando un cliente toca “Consultar” o “Finalizar pedido”.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-msg-grid">
                        <div className="tn-msg-builder">
                          <span className="tn-field-label">Plantilla del mensaje</span>
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
                  </section>
                </div>
              )}

              {/* ═════════════════════ TAB: PAGOS ═════════════════════════ */}
              {tab === 'pasarelas' && (
                <div className="tn-tab-content" key="pasarelas">
                  <section className="tn-group tn-group-plena">
                    <div className="tn-group-head">
                      <h3>Métodos de pago del negocio</h3>
                      <p>Definí efectivo, transferencia, tarjetas y quién custodia el cobro. Pedidos usa esta lista para calcular rendición, comisiones y método final de entrega.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-embed tn-embed-metodos-pago">
                        <MetodosPagoCrud />
                      </div>
                    </div>
                  </section>

                  <section className="tn-group tn-group-plena">
                    <div className="tn-group-head">
                      <h3>Pasarelas disponibles</h3>
                      <p>Activá una pasarela y cargá sus credenciales para que aparezca como opción de pago en el checkout de tus landings.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-embed tn-embed-pagopar">
                        <PagoParConfig />
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* ═════════════════ TAB: CONFIGURACIÓN ECONÓMICA ═══════════ */}
              {tab === 'economica' && (
                <div className="tn-tab-content" key="economica">
                  <section className="tn-group tn-group-plena">
                    <div className="tn-group-head">
                      <h3>Cómo se usan estos valores</h3>
                      <p>
                        No cambian el precio de tus productos ni lo que ve el cliente: son los costos con los
                        que el armador de combos calcula margen, utilidad y precio sugerido.
                      </p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-embed tn-embed-combo">
                        <ComboConfiguracion asTab={true} />
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* ═════════════════════ TAB: ANALÍTICA ═════════════════════ */}
              {tab === 'analitica' && (
                <div className="tn-tab-content" key="analitica">

                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3>Meta Pixel y Conversions API</h3>
                      <p>Para medir los clics en “Consultar” como conversiones en tus campañas de Meta Ads.</p>
                      <span className={`tn-badge ${estadoMeta.tono}`}>{estadoMeta.texto}</span>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-fields">
                        <label className="tn-field">
                          <span className="tn-field-label">Pixel ID</span>
                          <input
                            value={form.meta_pixel_id}
                            onChange={e => handleChange('meta_pixel_id', e.target.value.replace(/\D/g, ''))}
                            placeholder="Ej: 1234567890123456"
                            inputMode="numeric"
                          />
                        </label>

                        <label className="tn-field">
                          <span className="tn-field-label">Test Event Code <em>(opcional, solo mientras probás)</em></span>
                          <input
                            value={form.meta_test_event_code}
                            onChange={e => handleChange('meta_test_event_code', e.target.value)}
                            placeholder="Ej: TEST12345"
                          />
                        </label>
                      </div>

                      <div className="tn-token-wrapper">
                        <div className="tn-token-head">
                          <span className="tn-field-label">Access Token (Conversions API)</span>
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
                          <ShieldCheck size={14} color="var(--color-success)" />
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

                      <label className="tn-checkbox-row">
                        <input type="checkbox" checked={form.meta_capi_activo} onChange={e => handleChange('meta_capi_activo', e.target.checked)} />
                        Enviar eventos también por Conversions API (recomendado)
                      </label>

                      {form.meta_capi_activo && !form.meta_pixel_id && (
                        <p className="tn-warning"><AlertCircle size={13} /> <span>Activaste CAPI pero todavía no cargaste el Pixel ID — no se va a enviar nada hasta que lo completes.</span></p>
                      )}
                    </div>
                  </section>

                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3>Otras plataformas</h3>
                      <p>Solo el lado navegador — a diferencia de Meta, acá no hay envío server-side (CAPI / Events API).</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-fields">
                        <label className="tn-field">
                          <span className="tn-field-label">Google Analytics — Measurement ID</span>
                          <input
                            value={form.google_analytics_id}
                            onChange={e => handleChange('google_analytics_id', e.target.value.toUpperCase())}
                            placeholder="Ej: G-ABC1234DEF"
                          />
                        </label>
                        <label className="tn-field">
                          <span className="tn-field-label">TikTok Pixel ID</span>
                          <input
                            value={form.tiktok_pixel_id}
                            onChange={e => handleChange('tiktok_pixel_id', e.target.value)}
                            placeholder="Pegá el Pixel ID de TikTok Ads Manager"
                          />
                        </label>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* ── Footer de acciones ─────────────────────────────────── */}
            <div className="tn-footer">
              <p className="tn-footer-note">
                {tabGuardaAparte ? (
                  <>
                    <Info size={13} />
                    <span>Esta sección tiene su propio botón de guardado. “Guardar cambios” aplica lo que edites en Tienda, Contacto y Analítica.</span>
                  </>
                ) : (
                  <>
                    <Info size={13} />
                    <span>Los cambios se aplican a tu catálogo público y a todas tus landings.</span>
                  </>
                )}
              </p>
              <div className="tn-footer-actions">
                {ok && <span className="tn-saved"><Check size={14} /> Guardado</span>}
                <button type="submit" className="land-btn-primary" disabled={guardando}>
                  {guardando ? <Loader size={15} className="spin-icon" /> : <Save size={15} />}
                  Guardar cambios
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
