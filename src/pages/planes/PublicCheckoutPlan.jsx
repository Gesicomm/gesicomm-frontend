import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Loader,
  AlertCircle,
  Tag,
  X,
} from 'lucide-react';
import { planesService } from '../../services/planesService';
import { afiliadosService, guardarRefAfiliado, leerRefAfiliado } from '../../services/afiliadosService';
import { formatMoneda } from '../../utils/currency';
import Logo from '../../components/public/Logo';
import API from '../../services/api';
import './planes.css';

function formatPrecioPlan(plan) {
  if (!plan) return '';
  if (plan.moneda === 'USD') {
    return `US$${Number(plan.precio || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return formatMoneda(plan.precio);
}

function normalizarPlan(plan) {
  if (!plan) return null;
  return {
    ...plan,
    id: plan.id || plan.codigo,
    codigo: plan.codigo || plan.id,
    moneda: plan.moneda || 'PYG',
    features: Array.isArray(plan.features) ? plan.features : [],
  };
}

const MASCOT_POSES = [
  { id: 'guia', src: '/brand/mascot/guia-transparente.png', alt: 'Mascota de Gesicom' },
  { id: 'pensando', src: '/brand/mascot/pensando-transparente.png', alt: 'Mascota de Gesicom pensando' },
  { id: 'analizando', src: '/brand/mascot/analizando-transparente.png', alt: 'Mascota de Gesicom analizando' },
  { id: 'confirmando', src: '/brand/mascot/confirmando-transparente.png', alt: 'Mascota de Gesicom confirmando' },
  { id: 'alerta', src: '/brand/mascot/alerta-transparente.png', alt: 'Mascota de Gesicom en alerta' },
];

const DEFAULT_BENEFITS = [
  'Herramientas de la ruta elegida',
  'Tutoriales técnicos del sistema',
  'Soporte técnico por WhatsApp en horario laboral',
  'Activación inmediata',
];

export default function PublicCheckoutPlan() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [plan, setPlan] = useState(() => normalizarPlan(location.state?.plan));
  const [cargando, setCargando] = useState(!plan);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    documento: '',
  });
  const [errores, setErrores] = useState({});
  const esPlanRutas = /^(una-ruta|ambas-rutas)-(mensual|anual)$/.test(codigo);

  // Cupón promocional / código de prueba compacto
  const [cuponAbierto, setCuponAbierto] = useState(false);
  const [codigoPrueba, setCodigoPrueba] = useState('');
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [codigoValido, setCodigoValido] = useState(null);
  const [codigoError, setCodigoError] = useState('');

  // Estados contextuales para la mascota (autónomos y sobrios)
  const [hoveringSubmit, setHoveringSubmit] = useState(false);
  const [campoActivo, setCampoActivo] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      const guardado = guardarRefAfiliado(ref);
      if (guardado) {
        afiliadosService.track({ codigo: guardado, landing_url: window.location.href }).catch(() => {});
      }
    }
  }, [location.search]);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const planesApi = await planesService.listar();
        if (!activo) return;

        const encontrado = (Array.isArray(planesApi) ? planesApi : [])
          .map(normalizarPlan)
          .find(item => item?.codigo === codigo && item.activo !== false);

        if (!encontrado) {
          setError('No encontramos este plan activo. Volvé a elegirlo desde la lista de planes.');
          setPlan(null);
        } else {
          setPlan(encontrado);
        }
      } catch (err) {
        if (!activo) return;
        setError(err.response?.data?.error || err.response?.data?.message || 'No pudimos cargar los datos del plan.');
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => { activo = false; };
  }, [codigo]);

  function actualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setErrores(prev => ({ ...prev, [campo]: null }));
  }

  function validar() {
    const nuevosErrores = {};
    const email = form.email.trim().toLowerCase();

    if (form.nombre.trim().length < 3) nuevosErrores.nombre = 'Ingresá tu nombre completo.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) nuevosErrores.email = 'Ingresá un correo válido.';
    if (form.telefono.trim().length < 6) nuevosErrores.telefono = 'Completá un teléfono válido.';
    if (!/^[0-9.\-]{5,24}$/.test(form.documento.trim())) {
      nuevosErrores.documento = 'Completá tu número de cédula, sin letras.';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function validarCodigo() {
    if (!codigoPrueba.trim()) return;
    setVerificandoCodigo(true);
    setCodigoError('');
    try {
      const { data } = await API.post('/publico/verificar-codigo-prueba', {
        codigo: codigoPrueba.trim().toUpperCase(),
        email: form.email.trim() || undefined,
      });
      setCodigoValido(data);
      setCodigoError('');
    } catch (err) {
      setCodigoValido(null);
      setCodigoError(err.response?.data?.error || err.response?.data?.message || 'Código promocional inválido, vencido o ya utilizado.');
    } finally {
      setVerificandoCodigo(false);
    }
  }

  function quitarCodigo() {
    setCodigoValido(null);
    setCodigoPrueba('');
    setCodigoError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (pagando || !plan || !validar()) return;

    if (codigoValido) {
      navigate('/registro', {
        state: {
          nombre: form.nombre.trim(),
          email: form.email.trim().toLowerCase(),
          telefono: form.telefono.trim(),
          documento: form.documento.trim(),
          codigo: codigoValido.codigo,
        },
      });
      return;
    }

    setPagando(true);
    setError(null);
    try {
      const intent = await planesService.crearCheckoutIntent({
        plan_codigo: plan.codigo,
        ruta: 'fisico',
        afiliado_codigo: leerRefAfiliado(),
      });

      const resultado = await planesService.checkout({
        plan_codigo: plan.codigo,
        email: form.email.trim().toLowerCase(),
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        documento: form.documento.trim(),
        checkout_intent_token: intent.checkout_intent_token,
        afiliado_codigo: leerRefAfiliado(),
      });

      if (!resultado?.payment_url) {
        throw new Error('La pasarela no devolvió una URL de pago.');
      }
      window.location.href = resultado.payment_url;
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'No pudimos iniciar el pago.');
      setPagando(false);
    }
  }

  // Estado autónomo de la mascota según el contexto real del usuario
  const hasFieldErrors = Object.values(errores).some(Boolean);

  const currentPose = useMemo(() => {
    if (error || codigoError || hasFieldErrors) return 'alerta';
    if (hoveringSubmit || codigoValido) return 'confirmando';
    if (pagando || verificandoCodigo || campoActivo === 'codigo') return 'analizando';
    if (campoActivo) return 'pensando';
    return 'guia';
  }, [error, codigoError, hasFieldErrors, hoveringSubmit, codigoValido, pagando, verificandoCodigo, campoActivo]);

  const mascotMessage = useMemo(() => {
    if (error) return error;
    if (codigoError) return codigoError;
    if (hasFieldErrors) return 'Revisá los campos marcados para continuar con tu suscripción.';
    if (pagando) return 'Conectando de forma segura con KunfuPay para procesar tu suscripción...';
    if (verificandoCodigo) return 'Verificando tu código promocional en el sistema...';
    if (hoveringSubmit && codigoValido) {
      return `¡Listo! Hacé clic para activar tus ${codigoValido.dias} días gratis sin ingresar tarjeta.`;
    }
    if (hoveringSubmit) {
      return '¡Todo listo! Hacé clic para activar tu suscripción y empezar hoy mismo.';
    }
    if (codigoValido) {
      return `¡Código aplicado! Disfrutás ${codigoValido.dias} días de acceso gratuito sin costo hoy.`;
    }
    if (campoActivo === 'codigo') {
      return 'Ingresá tu código promocional o de prueba y aplicá el beneficio antes de continuar.';
    }
    if (campoActivo === 'email') {
      return 'Con este correo vas a acceder a tu panel y recibir las notificaciones de tus pedidos.';
    }
    if (campoActivo) {
      return 'Completá tus datos para dejar tu cuenta preparada al instante.';
    }
    return '¡Hola! Te acompaño en este paso para dejar tu tienda lista para vender productos físicos.';
  }, [error, codigoError, hasFieldErrors, pagando, verificandoCodigo, hoveringSubmit, codigoValido, campoActivo]);

  const beneficios = useMemo(() => {
    if (plan?.features?.length) {
      return plan.features.includes('Activación inmediata')
        ? plan.features
        : [...plan.features, 'Activación inmediata'];
    }
    return DEFAULT_BENEFITS;
  }, [plan]);

  const precioFormateado = formatPrecioPlan(plan);
  const esAnual = plan?.periodicidad === 'anual';

  return (
    <div className="gc-co-page">
      <header className="gc-co-header no-imprimir">
        <div className="gc-co-header-inner">
          <Link to="/" aria-label="Gesicom, ir al inicio">
            <Logo size={28} />
          </Link>
          <button
            type="button"
            className="gc-co-back-link"
            onClick={() => navigate(esPlanRutas ? '/#precios' : '/planes')}
            disabled={pagando}
          >
            <ArrowLeft size={15} /> Volver a planes
          </button>
        </div>
      </header>

      {cargando ? (
        <div className="pl-cargando mt-16">
          <Loader size={22} className="spin-icon" />
          <span>Preparando tu suscripción...</span>
        </div>
      ) : (
        <main className="gc-co-container">
          <div className="gc-co-grid">
            {/* Columna Izquierda — Datos y Conversión */}
            <section className="gc-co-form-panel" aria-labelledby="checkout-heading">
              <div className="gc-co-eyebrow">
                <span className="gc-co-eyebrow-dot" />
                Suscripción Gesicom
              </div>
              <h1 id="checkout-heading" className="gc-co-title">
                Activá tu suscripción
              </h1>
              <p className="gc-co-subtitle">
                Completá tus datos para habilitar tu espacio de e-commerce y comenzar a vender productos físicos.
              </p>

              {error && (
                <div className="gc-co-alert-error" role="alert">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="gc-co-form" noValidate>
                <div className="gc-co-fields-grid">
                  <label className="gc-co-field">
                    <span className="gc-co-label">Nombre completo</span>
                    <input
                      name="name"
                      type="text"
                      value={form.nombre}
                      onChange={e => actualizar('nombre', e.target.value)}
                      onFocus={() => setCampoActivo('nombre')}
                      onBlur={() => setCampoActivo(null)}
                      placeholder="Ej: Ana González"
                      autoComplete="name"
                      disabled={pagando}
                      className={`gc-co-input ${errores.nombre ? 'is-error' : ''}`}
                    />
                    {errores.nombre && <span className="gc-co-field-error">{errores.nombre}</span>}
                  </label>

                  <label className="gc-co-field">
                    <span className="gc-co-label">Correo electrónico</span>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={e => actualizar('email', e.target.value)}
                      onFocus={() => setCampoActivo('email')}
                      onBlur={() => setCampoActivo(null)}
                      placeholder="tu@email.com"
                      autoComplete="email"
                      disabled={pagando}
                      className={`gc-co-input ${errores.email ? 'is-error' : ''}`}
                    />
                    {errores.email && <span className="gc-co-field-error">{errores.email}</span>}
                  </label>

                  <label className="gc-co-field">
                    <span className="gc-co-label">Teléfono</span>
                    <input
                      name="tel"
                      type="tel"
                      value={form.telefono}
                      onChange={e => actualizar('telefono', e.target.value)}
                      onFocus={() => setCampoActivo('telefono')}
                      onBlur={() => setCampoActivo(null)}
                      placeholder="+595981123456"
                      autoComplete="tel"
                      inputMode="tel"
                      disabled={pagando}
                      className={`gc-co-input ${errores.telefono ? 'is-error' : ''}`}
                    />
                    {errores.telefono && <span className="gc-co-field-error">{errores.telefono}</span>}
                  </label>

                  <label className="gc-co-field">
                    <span className="gc-co-label">Número de cédula</span>
                    <input
                      name="document"
                      type="text"
                      value={form.documento}
                      onChange={e => actualizar('documento', e.target.value)}
                      onFocus={() => setCampoActivo('documento')}
                      onBlur={() => setCampoActivo(null)}
                      placeholder="Ej: 4123456"
                      autoComplete="off"
                      inputMode="numeric"
                      disabled={pagando}
                      className={`gc-co-input ${errores.documento ? 'is-error' : ''}`}
                    />
                    {errores.documento && <span className="gc-co-field-error">{errores.documento}</span>}
                  </label>
                </div>

                {/* Cupón promocional secundario y compacto */}
                <div className="gc-co-coupon">
                  {codigoValido ? (
                    <div className="gc-co-coupon-applied">
                      <div className="gc-co-coupon-applied-info">
                        <Check size={16} color="#20B981" className="shrink-0" />
                        <span>
                          Código <strong>{codigoValido.codigo}</strong> aplicado · {codigoValido.dias} días gratis
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={quitarCodigo}
                        className="gc-co-coupon-remove"
                        disabled={pagando}
                      >
                        Quitar
                      </button>
                    </div>
                  ) : !cuponAbierto ? (
                    <button
                      type="button"
                      className="gc-co-coupon-toggle"
                      onClick={() => setCuponAbierto(true)}
                      disabled={pagando}
                    >
                      <Tag size={14} />
                      <span>¿Tenés un código promocional?</span>
                    </button>
                  ) : (
                    <div className="gc-co-coupon-box">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-[#A5B5AA]">
                          Ingresá tu código promocional o de prueba
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCuponAbierto(false);
                            setCodigoError('');
                          }}
                          className="text-[#A5B5AA] hover:text-[#F5F8F6] bg-transparent border-0 cursor-pointer p-1"
                          aria-label="Cerrar código promocional"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="gc-co-coupon-row">
                        <input
                          type="text"
                          value={codigoPrueba}
                          onChange={e => {
                            setCodigoPrueba(e.target.value.toUpperCase());
                            setCodigoError('');
                          }}
                          onFocus={() => setCampoActivo('codigo')}
                          onBlur={() => setCampoActivo(null)}
                          placeholder="GESI-XXXXXX"
                          className="gc-co-coupon-input"
                          disabled={verificandoCodigo || pagando}
                        />
                        <button
                          type="button"
                          onClick={validarCodigo}
                          disabled={!codigoPrueba.trim() || verificandoCodigo || pagando}
                          className="gc-co-coupon-btn"
                        >
                          {verificandoCodigo ? (
                            <>
                              <Loader size={14} className="spin-icon" /> Verificando
                            </>
                          ) : (
                            'Aplicar'
                          )}
                        </button>
                      </div>
                      {codigoError && (
                        <span className="gc-co-field-error" role="alert">
                          {codigoError}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Botón Principal de Suscripción + Seguridad */}
                <div className="gc-co-cta-wrap">
                  <button
                    type="submit"
                    className="gc-co-cta"
                    disabled={pagando || !plan}
                    onMouseEnter={() => setHoveringSubmit(true)}
                    onMouseLeave={() => setHoveringSubmit(false)}
                    onFocus={() => setHoveringSubmit(true)}
                    onBlur={() => setHoveringSubmit(false)}
                  >
                    {pagando ? (
                      <>
                        <Loader size={18} className="spin-icon" /> Conectando con KunfuPay...
                      </>
                    ) : codigoValido ? (
                      <>
                        Activar mis {codigoValido.dias} días gratis <ArrowRight size={18} />
                      </>
                    ) : (
                      <>
                        Activar mi suscripción <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div className="gc-co-security-note">
                    <Lock size={13} className="shrink-0" color="#20B981" />
                    <span>
                      Conexión cifrada SSL · Procesado por KunfuPay · Suscripción {esAnual ? 'anual' : 'mensual'}, cancelás cuando quieras.
                    </span>
                  </div>
                </div>
              </form>
            </section>

            {/* Columna Derecha — Mascota y Resumen */}
            <aside className="gc-co-aside">
              {/* Mascota Original de Gesicom con composición abierta y globo refinado */}
              <div className="gc-co-companion">
                <div className="gc-co-mascot-stage" aria-hidden="true">
                  <div className="gc-co-mascot-ambient" />
                  {MASCOT_POSES.map(pose => (
                    <img
                      key={pose.id}
                      src={pose.src}
                      alt={pose.alt}
                      className={`gc-co-mascot-img ${currentPose === pose.id ? 'is-active' : ''}`}
                      draggable="false"
                    />
                  ))}
                </div>

                <div className="gc-co-bubble" aria-live="polite">
                  <div className="gc-co-bubble-identity">
                    <i />
                    <span>TU COMPAÑERO GESICOM</span>
                  </div>
                  <p className="gc-co-bubble-text">{mascotMessage}</p>
                </div>
              </div>

              {/* Resumen de Suscripción */}
              <div className="gc-co-summary">
                <div className="gc-co-plan-head">
                  <div>
                    <h2 className="gc-co-plan-name">{plan?.nombre || 'Una ruta mensual'}</h2>
                    <p className="gc-co-plan-scope">Gestión de E-commerce · Productos físicos</p>
                  </div>
                  {plan?.etiqueta && (
                    <span className="gc-co-plan-badge">{plan.etiqueta}</span>
                  )}
                </div>

                <div className="gc-co-price-block">
                  {codigoValido ? (
                    <>
                      <div className="gc-co-price-row">
                        <span className="gc-co-price-strike">{precioFormateado}</span>
                        <span className="gc-co-price-amount is-free">
                          {plan?.moneda === 'USD' ? 'US$0' : formatMoneda(0)}
                        </span>
                        <span className="gc-co-price-period">
                          / {codigoValido.dias} días gratis
                        </span>
                      </div>
                      <p className="gc-co-price-recurrence">
                        Luego {precioFormateado} {esAnual ? '/ año' : '/ mes'} · Suscripción recurrente
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="gc-co-price-row">
                        <span className="gc-co-price-amount">{precioFormateado}</span>
                        <span className="gc-co-price-period">
                          {esAnual ? '/ año' : '/ mes'}
                        </span>
                      </div>
                      <p className="gc-co-price-recurrence">
                        {esAnual ? 'Facturación anual recurrente.' : 'Suscripción recurrente.'}
                      </p>
                    </>
                  )}
                </div>

                <ul className="gc-co-benefits">
                  {beneficios.map((feature, index) => (
                    <li key={index}>
                      <Check size={16} className="gc-co-benefits-icon" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="gc-co-total-section">
                  <div className="gc-co-total-row">
                    <span className="gc-co-total-label">Total a pagar hoy</span>
                    <span className="gc-co-total-value">
                      {codigoValido
                        ? plan?.moneda === 'USD'
                          ? 'US$0'
                          : formatMoneda(0)
                        : precioFormateado}
                    </span>
                  </div>
                  <p className="gc-co-billing-note">
                    {codigoValido
                      ? `No se realiza ningún cobro hoy. Disfrutás ${codigoValido.dias} días libres y podés cancelar antes de que finalice la prueba.`
                      : `Facturación ${esAnual ? 'anual' : 'mensual'} automática. Podés cancelar tu suscripción en cualquier momento sin penalidades.`}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
