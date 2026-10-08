import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  Save, Check, X, Loader, AlertCircle, Globe, Sparkles, Crown,
  ShieldCheck, Trash2, Eye, EyeOff, HelpCircle, CheckCircle2, Info,
  Store, MessageCircle, BarChart3, MousePointerClick, CreditCard, Coins,
  ArrowRight, Palette, ImagePlus, Mail, MapPin, Share2,
  AtSign, Link2, User, Phone, Video, Type
} from 'lucide-react';


import { tiendaService } from '../../services/tiendaService';
import { planesService } from '../../services/planesService';
import { useDebounce } from '../../hooks/useDebounce';
import { getMediaUrl } from '../../services/api';
import { generarPreviewMensaje } from '../../lib/mensajeWhatsapp';
import { listaFuentes, typographyStyle } from '../../lib/typography';
import PagoParConfig from './PagoParConfig';
import SpeedboxConfig from './SpeedboxConfig';
import RahaConexion from './RahaConexion';
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

const FORM_INICIAL = {
  nombre: '',
  subdominio_manual: '', // prefijo URL editable independiente del nombre
  documento: '',
  ruc: '',
  color_primario: '#10b981',
  color_secundario: '#059669',
  color_fondo: '#0a0a0a',
  whatsapp: '',
  telefono: '',
  mensaje_contacto: 'Hola, me interesa {producto}',
  nombre_contacto: '',
  canal_contacto: 'whatsapp',
  email: '',
  instagram: '',
  facebook: '',
  twitter: '',
  tiktok: '',
  youtube: '',
  direccion_publica: '',
  ciudad_publica: '',
  horario_atencion: '',
  deposito_departamento: '',
  deposito_ciudad: '',
  deposito_direccion: '',
  deposito_referencia: '',
  deposito_telefono: '',
  meta_pixel_id: '',
  meta_test_event_code: '',
  meta_capi_activo: false,
  google_analytics_id: '',
  tiktok_pixel_id: '',
  typography: { headingFont: 'outfit', bodyFont: 'outfit' },
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
    desc: 'Cómo se llama tu negocio, dónde se publica, bajo qué dominio y con qué identidad visual sale tu marca.',
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
    desc: 'Definí los métodos de pago de tu negocio.',
  },
  { id: 'raha', label: 'Conexión Raha', icono: ShieldCheck, titulo: 'Conexión Raha', desc: '' },
  { id: 'speedbox', label: 'Validación RAHA', icono: Link2, titulo: 'Validación RAHA', desc: '' },
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
const TABS_CON_GUARDADO_PROPIO = ['economica', 'pasarelas', 'speedbox'];

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
  const [estadoCuenta, setEstadoCuenta] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [ok, setOk] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [tab, setTab] = useState(TABS_VALIDAS.has(tabInicial) ? tabInicial : 'tienda');
  const [mostrarPagopar, setMostrarPagopar] = useState(true);

  const [disponibilidad, setDisponibilidad] = useState(null); // { valido, disponible, motivo } | null | 'cargando'
  const ultimaConsulta = useRef(0);
  const textareaRef = useRef(null);

  // El logo va por su propio endpoint (multipart) y se guarda al instante,
  // independiente de "Guardar cambios".
  const logoInputRef = useRef(null);
  const fuenteInputRef = useRef(null);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [errorLogo, setErrorLogo] = useState(null);
  const [subiendoFuente, setSubiendoFuente] = useState(false);
  const [errorFuente, setErrorFuente] = useState(null);

  // El access token nunca vuelve del backend (ni cifrado) — solo un flag
  // de si ya hay uno guardado (tienda.meta_access_token_configurado).
  const [metaTokenNuevo, setMetaTokenNuevo] = useState('');
  const [eliminarMetaToken, setEliminarMetaToken] = useState(false);
  const [mostrarToken, setMostrarToken] = useState(false);
  const [mostrarGuiaCapi, setMostrarGuiaCapi] = useState(false);

  // Ahora el subdominio es un campo manual independiente del nombre.
  // Al tipear en "Prefijo URL" se autoformatea con slugifyLigero.
  // Si la tienda tiene dominio propio, el subdominio no cambia aunque el nombre varíe.
  const subdominioDerivado = slugifyLigero(form.subdominio_manual || form.nombre);
  const tieneDominioPropio = Boolean(tienda?.dominio_propio);
  const subdominioCambia = !tienda || subdominioDerivado !== tienda.subdominio;
  // El prefijo se edita siempre (con dominio propio queda como respaldo).
  const debeValidarSubdominio = subdominioCambia;
  const subdominioDebounced = useDebounce(subdominioDerivado, 500);
  const urlPublica = tieneDominioPropio
    ? tienda.dominio_propio
    : `${subdominioDerivado || 'tu-tienda'}.${tienda?.dominio_base || 'gesicomm.com'}`;


  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [data, estadoSuscripcion] = await Promise.all([
        tiendaService.obtener(),
        planesService.miEstado().catch(() => null),
      ]);
      setTienda(data);
      setEstadoCuenta(estadoSuscripcion);
      if (data) {
        setForm({
          nombre: data.nombre || '',
          subdominio_manual: data.subdominio || '',
          documento: data.documento || '',
          ruc: data.ruc || '',
          color_primario: data.color_primario || FORM_INICIAL.color_primario,
          color_secundario: data.color_secundario || FORM_INICIAL.color_secundario,
          color_fondo: data.color_fondo || FORM_INICIAL.color_fondo,
          whatsapp: data.whatsapp || '',
          telefono: data.telefono || '',
          mensaje_contacto: data.mensaje_contacto || FORM_INICIAL.mensaje_contacto,
          nombre_contacto: data.nombre_contacto || '',
          canal_contacto: data.canal_contacto || 'whatsapp',
          email: data.email || data.email_contacto || '',
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          twitter: data.twitter || '',
          tiktok: data.tiktok || '',
          youtube: data.youtube || '',
          direccion_publica: data.direccion_publica || '',
          ciudad_publica: data.ciudad_publica || '',
          horario_atencion: data.horario_atencion || '',
          deposito_departamento: data.deposito_departamento || '',
          deposito_ciudad: data.deposito_ciudad || '',
          deposito_direccion: data.deposito_direccion || '',
          deposito_referencia: data.deposito_referencia || '',
          deposito_telefono: data.deposito_telefono || '',
          meta_pixel_id: data.meta_pixel_id || '',
          meta_test_event_code: data.meta_test_event_code || '',
          meta_capi_activo: !!data.meta_capi_activo,
          google_analytics_id: data.google_analytics_id || '',
          tiktok_pixel_id: data.tiktok_pixel_id || '',
          typography: {
            headingFont: data.typography?.headingFont || FORM_INICIAL.typography.headingFont,
            bodyFont: data.typography?.bodyFont || FORM_INICIAL.typography.bodyFont,
          },
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

  // Chequeo de disponibilidad en vivo: solo aplica cuando la URL pública es
  // el subdominio de Gesicomm. Con dominio propio, el subdominio queda como
  // respaldo y el nombre no tiene por qué estar disponible como URL.
  useEffect(() => {
    if (!debeValidarSubdominio || !subdominioDebounced || subdominioDebounced.length < 3) {
      setDisponibilidad(null);
      return;
    }
    const idConsulta = ++ultimaConsulta.current;
    setDisponibilidad('cargando');
    tiendaService.disponibilidadSubdominio(subdominioDebounced)
      .then(res => { if (idConsulta === ultimaConsulta.current) setDisponibilidad(res); })
      .catch(() => { if (idConsulta === ultimaConsulta.current) setDisponibilidad({ valido: false, disponible: false, motivo: 'Error al verificar.' }); });
  }, [subdominioDebounced, debeValidarSubdominio]);

  async function subirLogo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      return setErrorLogo('Solo se permiten imágenes JPG, PNG o WebP.');
    }
    if (archivo.size > 5 * 1024 * 1024) {
      return setErrorLogo('El logo no puede pesar más de 5 MB.');
    }
    setErrorLogo(null);
    setSubiendoLogo(true);
    try {
      const formData = new FormData();
      formData.append('imagen', archivo);
      const actualizada = await tiendaService.subirLogo(formData);
      setTienda(prev => ({ ...prev, logo_imagen: actualizada.logo_imagen }));
    } catch (err) {
      setErrorLogo(err.response?.data?.message || 'No se pudo subir el logo.');
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function quitarLogo() {
    setErrorLogo(null);
    setSubiendoLogo(true);
    try {
      await tiendaService.eliminarLogo();
      setTienda(prev => ({ ...prev, logo_imagen: null }));
    } catch (err) {
      setErrorLogo(err.response?.data?.message || 'No se pudo quitar el logo.');
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function subirFuente(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!/\.(woff2|woff|ttf|otf)$/i.test(archivo.name)) {
      return setErrorFuente('Solo se permiten fuentes .woff2, .woff, .ttf u .otf.');
    }
    if (archivo.size > 4 * 1024 * 1024) {
      return setErrorFuente('La fuente no puede pesar más de 4 MB.');
    }
    setErrorFuente(null);
    setSubiendoFuente(true);
    try {
      const fd = new FormData();
      fd.append('fuente', archivo);
      fd.append('nombre', archivo.name.replace(/\.[^.]+$/, ''));
      const nueva = await tiendaService.subirFuente(fd);
      setTienda(prev => {
        const typography = prev?.typography || {};
        return {
          ...prev,
          typography: {
            ...typography,
            customFonts: [nueva, ...(typography.customFonts || [])],
          },
        };
      });
    } catch (err) {
      setErrorFuente(err.response?.data?.message || 'No se pudo subir la fuente.');
    } finally {
      setSubiendoFuente(false);
    }
  }

  async function eliminarFuente(font) {
    setErrorFuente(null);
    setSubiendoFuente(true);
    try {
      await tiendaService.eliminarFuente(font.custom_id);
      setTienda(prev => ({
        ...prev,
        typography: {
          ...(prev?.typography || {}),
          customFonts: (prev?.typography?.customFonts || []).filter(f => f.id !== font.id),
        },
      }));
    } catch (err) {
      setErrorFuente(err.response?.data?.message || 'No se pudo eliminar la fuente.');
    } finally {
      setSubiendoFuente(false);
    }
  }

  function handleChange(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  function cambiarTipografia(campo, valor) {
    setForm(prev => ({ ...prev, typography: { ...(prev.typography || {}), [campo]: valor } }));
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
    if (debeValidarSubdominio) {
      if (!subdominioDerivado || subdominioDerivado.length < 3) {
        return setError('El prefijo URL no es suficientemente largo — usá al menos 3 letras o números.');
      }
      if (disponibilidad && (disponibilidad.valido === false || disponibilidad.disponible === false)) {
        return setError(disponibilidad.motivo || 'Ese prefijo URL ya está en uso — probá con otro.');
      }
    }

    setGuardando(true);
    try {
      // subdominio_manual es campo interno de UI — no lo mandamos al backend.
      // En su lugar mandamos `subdominio` con el valor ya slugificado.
      const { subdominio_manual, ...resto } = form;
      const payload = { ...resto };
      payload.subdominio = subdominioDerivado;

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
      const typographyRes = await tiendaService.guardarTipografia(form.typography || FORM_INICIAL.typography);
      actualizada = { ...actualizada, typography: typographyRes.typography };
      setTienda(actualizada);
      setEstadoCuenta(actualizada.estado_cuenta || actualizada.estadoCuenta || estadoCuenta);
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

  const suscripcionActiva = estadoCuenta?.suscripcion || tienda?.suscripcion || null;
  const planActivo = suscripcionActiva?.plan || null;
  const esPlanPago = Boolean(estadoCuenta?.tiene_suscripcion_activa || suscripcionActiva || tienda?.plan === 'pago');
  const nombrePlanActivo = planActivo?.nombre || (esPlanPago ? 'plan de pago' : null);

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

  const typographyCatalogo = tienda?.typography || { ...FORM_INICIAL.typography, customFonts: [] };
  const fuentesDisponibles = listaFuentes(typographyCatalogo);
  const previewTypography = {
    ...typographyCatalogo,
    headingFont: form.typography?.headingFont || typographyCatalogo.headingFont,
    bodyFont: form.typography?.bodyFont || typographyCatalogo.bodyFont,
  };

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
        <div className="tn-page-head-top">
          <div>
            <h1>Configuración de tu tienda</h1>
            <p>Todo lo que define tu negocio online: identidad, contacto, cobros, costos y medición. Se aplica a tu catálogo y a todas tus landings.</p>
          </div>
          <button
            type="button"
            className="tn-btn-tiendas"
            onClick={() => navigate('/seleccionar-tienda', { state: { desde: '/mi-tienda' } })}
            title="Cambiar de tienda o crear una nueva"
          >
            <Store size={14} /> Mis tiendas
          </button>
        </div>
      </header>

      <div className="tn-shell">
        {/* ── Navegación ──────────────────────────────────────────────── */}
        <nav className="tn-tabs" role="tablist" aria-label="Secciones de configuración">
          {TABS.map((t, idx) => {
            const Icono = t.icono;
            const activo = tab === t.id;
            return (
              <React.Fragment key={t.id}>
                {idx > 0 && (
                  <span className="tn-tab-arrow" aria-hidden="true">
                    <ArrowRight size={12} />
                  </span>
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  className={`tn-tab ${activo ? 'activo' : ''}`}
                  onClick={() => seleccionarTab(t.id)}
                >
                  <span className="tn-tab-icon"><Icono size={15} /></span>
                  {t.label}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="tn-panel">
          <div className="tn-panel-head">
            {tab === 'pasarelas' && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.22rem 0.65rem',
                borderRadius: '0.375rem',
                background: 'var(--vit-accent)',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '0.5rem'
              }}>
                PASO 1
              </div>
            )}
            <h2>{tabActual.titulo}</h2>
            <p>{tabActual.desc}</p>
          </div>

          {tab === 'raha' ? <RahaConexion tienda={tienda} /> : <form onSubmit={handleSubmit} className="tn-form">
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
                          <input
                            value={form.nombre}
                            onChange={e => handleChange('nombre', e.target.value)}
                            placeholder="Ej: Gesicom Store"
                          />
                          <span className="tn-field-hint">El nombre visible para tus clientes. No afecta la URL si ya la personalizaste.</span>
                        </label>

                        <div className="tn-field">
                          <span className="tn-field-label">Prefijo URL <em>(subdominio{tieneDominioPropio ? ', de respaldo' : ''})</em></span>
                          <div className="tn-url-prefix-wrap">
                            <input
                              className="tn-url-prefix-input"
                              value={form.subdominio_manual}
                              onChange={e => handleChange('subdominio_manual', slugifyLigero(e.target.value))}
                              placeholder={slugifyLigero(form.nombre) || 'tu-tienda'}
                              maxLength={63}
                            />
                            <span className="tn-url-prefix-suffix">.{tienda?.dominio_base || 'gesicomm.com'}</span>
                          </div>
                          <span className="tn-field-hint">
                            {tieneDominioPropio
                              ? `Tu dirección principal es ${tienda.dominio_propio}; esta queda como respaldo. `
                              : 'La parte antes del punto en tu dirección web, independiente del nombre. '}
                            Solo letras minúsculas, números y guiones.
                            {form.subdominio_manual ? '' : ' Si lo dejás vacío se genera del nombre automáticamente.'}
                          </span>

                          {debeValidarSubdominio && (
                            <div className="tn-disponibilidad tn-disponibilidad-inline">
                              {disponibilidad === 'cargando' && <span className="tn-check cargando"><Loader size={12} className="spin-icon" /> Verificando disponibilidad...</span>}
                              {disponibilidad && disponibilidad !== 'cargando' && disponibilidad.disponible && (
                                <span className="tn-check ok"><Check size={12} /> URL disponible</span>
                              )}
                              {disponibilidad && disponibilidad !== 'cargando' && !disponibilidad.disponible && (
                                <span className="tn-check error"><X size={12} /> {disponibilidad.motivo || 'No disponible'}</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="tn-field">
                          <span className="tn-field-label">URL pública</span>
                          <div className="tn-url-readonly">
                            <Globe size={14} />
                            <code>{urlPublica}</code>
                          </div>
                          <span className="tn-field-hint">
                            {tieneDominioPropio
                              ? 'Usa tu dominio propio; el subdominio de Gesicomm queda como respaldo.'
                              : 'Así se ve tu catálogo y tus landings para los clientes.'}
                          </span>
                        </div>

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
                      </div>

                      {debeValidarSubdominio && !!tienda && (
                        <p className="tn-warning">
                          <AlertCircle size={14} />
                          <span><strong>Atención:</strong> Cambiar el prefijo URL va a modificar la URL pública de tu catálogo y de todas tus landings. Links que ya hayas compartido dejarán de funcionar.</span>
                        </p>
                      )}
                    </div>
                  </section>


                  {/* Branding */}
                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3><Palette size={16} /> Branding</h3>
                      <p>El logo y los colores se aplican al catálogo público y a las landings. Si editás el tema desde el armador, también se reflejan acá.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-logo-field">
                        <span className="tn-field-label">Logo</span>
                        <div className="tn-logo-row">
                          <button
                            type="button"
                            className={`tn-logo-preview ${tienda?.logo_imagen ? 'con-logo' : ''}`}
                            onClick={() => logoInputRef.current?.click()}
                            disabled={subiendoLogo}
                            aria-label={tienda?.logo_imagen ? 'Cambiar logo' : 'Subir logo'}
                          >
                            {subiendoLogo
                              ? <Loader size={18} className="spin-icon" />
                              : tienda?.logo_imagen
                                ? <img src={getMediaUrl(tienda.logo_imagen)} alt="Logo de la tienda" />
                                : <ImagePlus size={20} />}
                          </button>
                          <div className="tn-logo-actions">
                            <div className="tn-logo-buttons">
                              <button type="button" className="btn-secondary" onClick={() => logoInputRef.current?.click()} disabled={subiendoLogo}>
                                {tienda?.logo_imagen ? 'Cambiar logo' : 'Subir logo'}
                              </button>
                              {tienda?.logo_imagen && (
                                <button type="button" className="btn-secondary" onClick={quitarLogo} disabled={subiendoLogo}>
                                  <Trash2 size={14} /> Quitar
                                </button>
                              )}
                            </div>
                            <span className="tn-field-hint">
                              PNG con fondo transparente, JPG o WebP (máx. 5 MB). Tamaño recomendado: 512x512 px. Se guarda al subirlo y aparece en todas tus páginas que no tengan un logo propio.
                            </span>
                            {errorLogo && <span className="tn-logo-error"><AlertCircle size={12} /> {errorLogo}</span>}
                          </div>
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={subirLogo}
                            hidden
                          />
                        </div>
                      </div>
                      <div className="tn-brand-grid">
                        <label className="tn-color-field">
                          <span className="tn-field-label">Color principal</span>
                          <span className="tn-color-control">
                            <input
                              type="color"
                              value={form.color_primario || FORM_INICIAL.color_primario}
                              onChange={e => handleChange('color_primario', e.target.value)}
                              aria-label="Color principal"
                            />
                            <input
                              value={form.color_primario || ''}
                              onChange={e => handleChange('color_primario', e.target.value)}
                              placeholder="#10B981"
                              maxLength={7}
                            />
                          </span>
                          <span className="tn-field-hint">Botones, enlaces y acentos de la marca.</span>
                        </label>

                        <label className="tn-color-field">
                          <span className="tn-field-label">Color secundario</span>
                          <span className="tn-color-control">
                            <input
                              type="color"
                              value={form.color_secundario || FORM_INICIAL.color_secundario}
                              onChange={e => handleChange('color_secundario', e.target.value)}
                              aria-label="Color secundario"
                            />
                            <input
                              value={form.color_secundario || ''}
                              onChange={e => handleChange('color_secundario', e.target.value)}
                              placeholder="#059669"
                              maxLength={7}
                            />
                          </span>
                          <span className="tn-field-hint">Refuerzos visuales y estados destacados.</span>
                        </label>

                        <label className="tn-color-field">
                          <span className="tn-field-label">Fondo de marca</span>
                          <span className="tn-color-control">
                            <input
                              type="color"
                              value={form.color_fondo || FORM_INICIAL.color_fondo}
                              onChange={e => handleChange('color_fondo', e.target.value)}
                              aria-label="Fondo de marca"
                            />
                            <input
                              value={form.color_fondo || ''}
                              onChange={e => handleChange('color_fondo', e.target.value)}
                              placeholder="#0A0A0A"
                              maxLength={7}
                            />
                          </span>
                          <span className="tn-field-hint">Base visual para landings en modo oscuro.</span>
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3><Type size={16} /> Tipografía</h3>
                      <p>Definí la fuente de títulos y textos generales para tu tienda, landings y páginas publicadas.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-fields">
                        <label className="tn-field">
                          <span className="tn-field-label">Fuente para títulos</span>
                          <select
                            value={form.typography?.headingFont || FORM_INICIAL.typography.headingFont}
                            onChange={e => cambiarTipografia('headingFont', e.target.value)}
                          >
                            {fuentesDisponibles.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                          </select>
                        </label>
                        <label className="tn-field">
                          <span className="tn-field-label">Fuente para textos</span>
                          <select
                            value={form.typography?.bodyFont || FORM_INICIAL.typography.bodyFont}
                            onChange={e => cambiarTipografia('bodyFont', e.target.value)}
                          >
                            {fuentesDisponibles.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                          </select>
                        </label>
                      </div>

                      <div
                        className="tn-typography-preview"
                        style={{
                          ...typographyStyle(previewTypography),
                          marginTop: '1rem',
                          border: '1px solid var(--vit-border)',
                          borderRadius: '0.75rem',
                          padding: '1rem',
                          background: 'var(--vit-surface)',
                        }}
                      >
                        <h4 style={{ margin: '0 0 .35rem', fontFamily: 'var(--store-font-heading)' }}>Vista previa de títulos</h4>
                        <p style={{ margin: '0 0 .85rem', fontFamily: 'var(--store-font-body)', color: 'var(--vit-muted)' }}>
                          Así se verán los textos generales en tus páginas.
                        </p>
                        <button type="button" className="land-btn-primary" style={{ fontFamily: 'var(--store-font-body)' }}>
                          Botón de ejemplo
                        </button>
                      </div>

                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                        <div className="tn-logo-buttons">
                          <button type="button" className="btn-secondary" onClick={() => fuenteInputRef.current?.click()} disabled={subiendoFuente}>
                            {subiendoFuente ? <Loader size={14} className="spin-icon" /> : <ImagePlus size={14} />}
                            Subir tipografía
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setForm(prev => ({ ...prev, typography: FORM_INICIAL.typography }))}
                          >
                            Restaurar predeterminadas
                          </button>
                        </div>
                        <input
                          ref={fuenteInputRef}
                          type="file"
                          accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                          onChange={subirFuente}
                          hidden
                        />
                        <span className="tn-field-hint">WOFF2 recomendado. También se aceptan WOFF, TTF y OTF hasta 4 MB.</span>
                        {errorFuente && <span className="tn-logo-error"><AlertCircle size={12} /> {errorFuente}</span>}
                      </div>

                      {(typographyCatalogo.customFonts || []).length > 0 && (
                        <div style={{ marginTop: '1rem', display: 'grid', gap: '.5rem' }}>
                          {(typographyCatalogo.customFonts || []).map(font => {
                            const enUso = form.typography?.headingFont === font.id || form.typography?.bodyFont === font.id;
                            return (
                              <div key={font.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', padding: '.65rem .75rem', border: '1px solid var(--vit-border)', borderRadius: '.6rem' }}>
                                <div>
                                  <strong style={{ fontFamily: font.cssFamily }}>{font.label}</strong>
                                  <div className="tn-field-hint">Pesos: {(font.weights || [400]).join(', ')} · {Math.round((font.size || 0) / 1024)} KB</div>
                                </div>
                                <button type="button" className="btn-secondary" onClick={() => eliminarFuente(font)} disabled={subiendoFuente || enUso} title={enUso ? 'Está en uso' : 'Eliminar fuente'}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
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
                      se lee desde /suscripciones/mi-estado y se mejora desde
                      /planes. Guardar la tienda no toca el plan de la cuenta. */}
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
                            <strong>Estás en el {nombrePlanActivo}</strong>
                            <span>Tenés habilitadas todas las funciones de tu plan.</span>
                          </div>
                          <button type="button" className="tn-plan-link" onClick={() => navigate('/planes')}>
                            Ver planes <ArrowRight size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="tn-upsell">
                          <span className="tn-upsell-eyebrow"><Sparkles size={13} /> Tu cuenta no tiene un plan activo</span>
                          <h4>Activá un plan para publicar tu tienda.</h4>
                          <p>
                            Gesicomm no tiene plan gratis. Elegí un plan para publicar bajo tu propio
                            dominio, cobrar online desde el checkout y medir cada campaña con Meta,
                            Google y TikTok.
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

                  {/* Canales de contacto */}
                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3>Canales de contacto</h3>
                      <p>Datos de contacto que ven tus clientes en el catálogo y tus landings.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-fields">
                        <label className="tn-field">
                          <span className="tn-field-label"><User size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Nombre de contacto <em>(opcional)</em></span>
                          <input
                            value={form.nombre_contacto}
                            onChange={e => handleChange('nombre_contacto', e.target.value)}
                            placeholder="Ej: Martín García"
                          />
                          <span className="tn-field-hint">Nombre visible en la sección de contacto de tu tienda pública.</span>
                        </label>

                        <div className="tn-field">
                          <span className="tn-field-label">Canal preferido</span>
                          <div className="tn-canal-selector">
                            {[
                              { value: 'whatsapp', label: 'WhatsApp' },
                              { value: 'email',    label: 'Email' },
                              { value: 'telefono', label: 'Teléfono' },
                              { value: 'instagram',label: 'Instagram' },
                            ].map(op => (
                              <button
                                key={op.value}
                                type="button"
                                className={`tn-canal-chip ${form.canal_contacto === op.value ? 'activo' : ''}`}
                                onClick={() => handleChange('canal_contacto', op.value)}
                              >
                                {op.label}
                              </button>
                            ))}
                          </div>
                          <span className="tn-field-hint">El botón principal de contacto en tus landings usará este canal.</span>
                        </div>

                        <label className="tn-field">
                          <span className="tn-field-label"><Phone size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> WhatsApp</span>
                          <input value={form.whatsapp} onChange={e => handleChange('whatsapp', e.target.value)} placeholder="Ej: 595981234567" />
                          <span className="tn-field-hint">Con código de país, sin espacios ni signos. Recibe las consultas de tus landings.</span>
                        </label>

                        <label className="tn-field">
                          <span className="tn-field-label"><Phone size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Teléfono <em>(opcional)</em></span>
                          <input value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} placeholder="Solo si querés mostrar otro número" />
                          <span className="tn-field-hint">Se muestra como dato de contacto adicional, no recibe los mensajes de las landings.</span>
                        </label>

                        <label className="tn-field">
                          <span className="tn-field-label"><Mail size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Email de contacto <em>(opcional)</em></span>
                          <input
                            type="email"
                            value={form.email}
                            onChange={e => handleChange('email', e.target.value)}
                            placeholder="Ej: contacto@tutienda.com"
                          />
                        </label>
                      </div>
                    </div>
                  </section>

                  {/* Redes sociales */}
                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3>Redes sociales</h3>
                      <p>Se muestran como íconos de enlace en tu catálogo y tus landings. Podés dejar vacías las que no usés.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-fields">
                        <label className="tn-field">
                          <span className="tn-field-label tn-field-label-icon">
                            <AtSign size={14} /> Instagram
                          </span>
                          <div className="tn-social-input-wrap">
                            <span className="tn-social-prefix">@</span>
                            <input
                              value={form.instagram}
                              onChange={e => handleChange('instagram', e.target.value.replace(/^@/, ''))}
                              placeholder="tu_handle"
                            />
                          </div>
                          <span className="tn-field-hint">Solo el nombre de usuario, sin @.</span>
                        </label>

                        <label className="tn-field">
                          <span className="tn-field-label tn-field-label-icon">
                            <Link2 size={14} /> Facebook
                          </span>
                          <div className="tn-social-input-wrap">
                            <span className="tn-social-prefix">fb.com/</span>
                            <input
                              value={form.facebook}
                              onChange={e => handleChange('facebook', e.target.value)}
                              placeholder="tupagina"
                            />
                          </div>
                          <span className="tn-field-hint">Handle o nombre de página de Facebook.</span>
                        </label>

                        <label className="tn-field">
                          <span className="tn-field-label tn-field-label-icon">
                            <AtSign size={14} /> Twitter / X
                          </span>
                          <div className="tn-social-input-wrap">
                            <span className="tn-social-prefix">@</span>
                            <input
                              value={form.twitter}
                              onChange={e => handleChange('twitter', e.target.value.replace(/^@/, ''))}
                              placeholder="tu_handle"
                            />
                          </div>
                        </label>

                        <label className="tn-field">
                          <span className="tn-field-label tn-field-label-icon">
                            <AtSign size={14} /> TikTok
                          </span>
                          <div className="tn-social-input-wrap">
                            <span className="tn-social-prefix">@</span>
                            <input
                              value={form.tiktok}
                              onChange={e => handleChange('tiktok', e.target.value.replace(/^@/, ''))}
                              placeholder="tu_handle"
                            />
                          </div>
                        </label>

                        <label className="tn-field">
                          <span className="tn-field-label tn-field-label-icon">
                            <Video size={14} /> YouTube
                          </span>
                          <div className="tn-social-input-wrap">
                            <span className="tn-social-prefix">youtube.com/</span>
                            <input
                              value={form.youtube}
                              onChange={e => handleChange('youtube', e.target.value)}
                              placeholder="@tucanal o c/tucanal"
                            />
                          </div>
                        </label>
                      </div>
                    </div>
                  </section>

                  {/* Ubicación pública */}
                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3><MapPin size={15} style={{ display: 'inline', verticalAlign: 'middle' }} /> Dirección pública</h3>
                      <p>La dirección de tu local o punto de atención, visible en el catálogo. Distinta de la dirección de depósito logístico.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-fields">
                        <label className="tn-field">
                          <span className="tn-field-label">Ciudad / Localidad <em>(opcional)</em></span>
                          <input
                            value={form.ciudad_publica}
                            onChange={e => handleChange('ciudad_publica', e.target.value)}
                            placeholder="Ej: Asunción, Paraguay"
                          />
                        </label>
                        <label className="tn-field">
                          <span className="tn-field-label">Dirección <em>(opcional)</em></span>
                          <input
                            value={form.direccion_publica}
                            onChange={e => handleChange('direccion_publica', e.target.value)}
                            placeholder="Ej: Av. España 1234, Edificio Central piso 3"
                          />
                        </label>
                        <label className="tn-field">
                          <span className="tn-field-label">Horario de atención <em>(opcional)</em></span>
                          <input
                            value={form.horario_atencion}
                            onChange={e => handleChange('horario_atencion', e.target.value)}
                            placeholder="Ej: Lunes a viernes de 9 a 18 horas"
                            maxLength={150}
                          />
                        </label>
                      </div>
                    </div>
                  </section>

                  {/* Mensaje de WhatsApp */}

                  <section className="tn-group">
                    <div className="tn-group-head">
                      <h3>Mensaje de WhatsApp para consultas</h3>
                      <p>El texto editable que se envía cuando un cliente toca "Consultar" o un botón de WhatsApp en tus landings. Los pedidos usan otro mensaje con número, productos y total.</p>
                    </div>
                    <div className="tn-group-body">
                      <div className="tn-msg-grid">
                        <div className="tn-msg-builder">
                          <span className="tn-field-label">Plantilla de consulta</span>
                          <textarea
                            ref={textareaRef}
                            className="tn-msg-textarea"
                            value={form.mensaje_contacto}
                            onChange={e => handleChange('mensaje_contacto', e.target.value)}
                            placeholder="Ej: Hola, me interesa {producto}"
                            maxLength={300}
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
                  {/* PASO 1: Métodos de Pago del Negocio */}
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.84rem', color: 'var(--vit-muted)', lineHeight: '1.65', marginBottom: '1.25rem' }}>
                      <p style={{ margin: '0 0 0.6rem 0' }}>
                        Inicialmente estos métodos son los mínimos recomendados para operar, sea que trabajes con logística propia o con Gesicom-RAHA (te recomendamos tener activados los 3):
                      </p>
                      <ul style={{ margin: '0.5rem 0 0.85rem 1.25rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem', listStyleType: 'disc', color: 'var(--vit-text)' }}>
                        <li><strong>1) Efectivo contra entrega</strong></li>
                        <li><strong>2) Transferencia bancaria contra entrega</strong></li>
                        <li><strong>3) Transferencia bancaria anticipado</strong></li>
                      </ul>

                      <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.65rem',
                        background: 'color-mix(in srgb, var(--vit-accent) 8%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--vit-accent) 22%, transparent)',
                        color: 'var(--vit-text)',
                        fontSize: '0.8rem',
                        lineHeight: '1.5'
                      }}>
                        <strong>💡 Nota para la operación:</strong> Estos métodos son utilizados por el <em>confirmador de pedidos</em> al momento de la confirmación de la venta. Se crean inactivos por defecto para que los actives según tu preferencia.
                      </div>
                    </div>

                    <section className="tn-group tn-group-plena" style={{ borderTop: 'none', paddingTop: 0 }}>
                      <div className="tn-group-body">
                        <div className="tn-embed tn-embed-metodos-pago">
                          <MetodosPagoCrud />
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* PASO 2: Integración Pagopar & Cobro Anticipado */}
                  <div style={{ borderTop: '1px solid color-mix(in srgb, var(--vit-border) 70%, transparent)', paddingTop: '1.75rem' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '0.375rem',
                      background: 'var(--vit-accent)',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '0.75rem'
                    }}>
                      PASO 2 (No es obligatorio, pero es recomendado) 
                    
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.85rem 1.1rem',
                      borderRadius: '0.85rem',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12))',
                      border: '1px dashed color-mix(in srgb, var(--vit-accent) 40%, transparent)',
                      color: 'var(--vit-text)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '1.5rem'
                    }}>
                      <span>🚀 El futuro del e-commerce está en el pago anticipado, conectate a pagopar y empezá a cobrar por anticipado en tu sitio web </span>
                    </div>

                    <section className="tn-group tn-group-plena" style={{ borderTop: 'none', paddingTop: 0 }}>
                      <div className="tn-group-head" style={{ marginBottom: '1rem' }}>
                       
                      </div>

                      {mostrarPagopar && (
                        <div className="tn-group-body">
                          <div className="tn-embed tn-embed-pagopar">
                            <PagoParConfig />
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}

              {tab === 'speedbox' && <div className="tn-tab-content" key="speedbox"><SpeedboxConfig /></div>}

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


                </div>
              )}
            </div>

            {/* ── Footer de acciones ─────────────────────────────────── */}
            {tab !== 'speedbox' && <div className="tn-footer">
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
            </div>}
          </form>}
        </div>
      </div>
    </div>
  );
}
