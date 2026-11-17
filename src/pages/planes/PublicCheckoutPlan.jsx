import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CreditCard, Loader, ShieldCheck, AlertCircle, KeyRound, Rocket } from 'lucide-react';
import { planesService } from '../../services/planesService';
import { leerRefAfiliado } from '../../services/afiliadosService';
import { formatMoneda } from '../../utils/currency';
import Logo from '../../components/public/Logo';
import API from '../../services/api';
import './planes.css';

function formatPrecioPlan(plan) {
  if (!plan) return '';
  if (plan.moneda === 'USD') {
    return `$${Number(plan.precio || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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
  { id: 'guia', src: '/brand/mascot/guia-transparente.png', label: 'Saludar', icon: '👋' },
  { id: 'pensando', src: '/brand/mascot/pensando-transparente.png', label: 'Pensar', icon: '💡' },
  { id: 'analizando', src: '/brand/mascot/analizando-transparente.png', label: 'Analizar', icon: '🔍' },
  { id: 'confirmando', src: '/brand/mascot/confirmando-transparente.png', label: 'Celebrar', icon: '🎉' },
  { id: 'alerta', src: '/brand/mascot/alerta-transparente.png', label: 'Alerta', icon: '⚡' },
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

  // Código de prueba inline en el checkout
  const [codigoPrueba, setCodigoPrueba] = useState('');
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [codigoValido, setCodigoValido] = useState(null);
  const [codigoError, setCodigoError] = useState('');

  // Animación y reactividad autónoma de la mascota
  const [hoveringSubmit, setHoveringSubmit] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [campoActivo, setCampoActivo] = useState(null);
  const [idlePoseIndex, setIdlePoseIndex] = useState(0);

  // Ciclo automático suave de poses si el usuario no interactúa
  useEffect(() => {
    if (campoActivo || hoveringSubmit || pagando || verificandoCodigo || codigoValido || error || codigoError) {
      return;
    }
    const timer = setInterval(() => {
      setIdlePoseIndex(prev => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, [campoActivo, hoveringSubmit, pagando, verificandoCodigo, codigoValido, error, codigoError]);

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -16;
    setMousePos({ x, y });
  }

  function handleMouseLeave() {
    setMousePos({ x: 0, y: 0 });
  }

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
      setCodigoError(err.response?.data?.error || err.response?.data?.message || 'Código de prueba inválido, vencido o ya usado.');
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
      // Flujo directo con código de prueba: redirige a /registro con datos precargados
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
        ruta: 'fisico', // Exclusivo productos físicos / E-commerce
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

  // Determinación autónoma de la pose según la situación específica del usuario
  const currentPose = useMemo(() => {
    if (error || codigoError) return 'alerta';
    if (hoveringSubmit || codigoValido) return 'confirmando';
    if (pagando || verificandoCodigo || campoActivo === 'codigo') return 'analizando';
    if (campoActivo) return 'pensando';
    return ['guia', 'pensando', 'analizando'][idlePoseIndex] || 'guia';
  }, [error, codigoError, hoveringSubmit, codigoValido, pagando, verificandoCodigo, campoActivo, idlePoseIndex]);

  // Mensaje y estado visual reactivo según la situación específica
  const mascotInfo = useMemo(() => {
    if (error) {
      return {
        badge: 'Atención requerida',
        badgeColor: 'text-amber-400',
        mensaje: error,
      };
    }
    if (codigoError) {
      return {
        badge: 'Código no válido',
        badgeColor: 'text-amber-400',
        mensaje: codigoError,
      };
    }
    if (hoveringSubmit && codigoValido) {
      return {
        badge: '¡Listo para activar!',
        badgeColor: 'text-emerald-400',
        mensaje: `¡Siii! Hacé clic acá para activar tus ${codigoValido.dias} días de prueba gratis y empezar hoy mismo.`,
      };
    }
    if (hoveringSubmit) {
      return {
        badge: '¡Excelente decisión!',
        badgeColor: 'text-emerald-400',
        mensaje: '¡Qué emoción! Hacé clic para confirmar tu suscripción y empezar a vender tus productos físicos.',
      };
    }
    if (codigoValido) {
      return {
        badge: '¡Cupón activado!',
        badgeColor: 'text-emerald-400',
        mensaje: `¡Woooow! Acceso concedido: tenés ${codigoValido.dias} días de prueba sin costo ni tarjeta hoy.`,
      };
    }
    if (pagando) {
      return {
        badge: 'Conectando pago...',
        badgeColor: 'text-primary',
        mensaje: 'Un momento, estoy conectando de forma segura con la pasarela KunfuPay...',
      };
    }
    if (verificandoCodigo) {
      return {
        badge: 'Analizando cupón...',
        badgeColor: 'text-primary',
        mensaje: 'Comprobando tu código de prueba gratuita en la base de datos...',
      };
    }
    if (campoActivo === 'codigo') {
      return {
        badge: '¿Tenés código de prueba?',
        badgeColor: 'text-primary',
        mensaje: 'Ingresá tu código acá y hacé clic en "Canjear" para activar tus días de acceso libre.',
      };
    }
    if (campoActivo === 'email') {
      return {
        badge: 'Tu correo de acceso',
        badgeColor: 'text-primary',
        mensaje: 'Con este correo vas a iniciar sesión en Gesicom y recibir las notificaciones de ventas.',
      };
    }
    if (campoActivo) {
      return {
        badge: 'Completando tus datos',
        badgeColor: 'text-primary',
        mensaje: 'Ingresá tus datos de contacto para personalizar tu panel y emitir tu comprobante.',
      };
    }
    return {
      badge: 'Tu compañero Gesicom',
      badgeColor: 'text-primary',
      mensaje: '¡Hola! Te acompaño en este paso para dejar tu tienda lista para vender productos físicos.',
    };
  }, [error, codigoError, hoveringSubmit, codigoValido, pagando, verificandoCodigo, campoActivo]);

  return (
    <div className="pl-page pl-checkout-page pl-public-checkout py-6 sm:py-10">
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 no-imprimir">
        <Link to="/" aria-label="Gesicom, ir al inicio">
          <Logo size={28} />
        </Link>
        <button type="button" className="pl-volver m-0 text-sm font-semibold flex items-center gap-1.5" onClick={() => navigate(esPlanRutas ? '/#precios' : '/planes')}>
          <ArrowLeft size={15} /> Volver a planes
        </button>
      </header>

      {cargando ? (
        <div className="pl-cargando mt-16"><Loader size={24} className="spin-icon" /><span>Preparando checkout seguro...</span></div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
          <div className="pl-checkout-frame">
            <div className="pl-checkout-card">
              
              {/* Columna Izquierda: Formulario Principal */}
              <div className="pl-checkout-main-col">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <span className="pl-hero-eyebrow text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-primary">
                      <ShieldCheck size={14} /> Checkout seguro · Cifrado SSL
                    </span>
                    <span className="text-xs text-muted font-medium bg-surface-2 px-2.5 py-1 rounded-full border border-border">
                      Gestión de E-commerce · Productos físicos
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mt-1 mb-1.5">
                    Pagá tu suscripción
                  </h1>
                  <p className="text-sm text-muted leading-relaxed">
                    Ingresá tus datos para iniciar el plan y activar tu cuenta al instante para vender productos físicos.
                  </p>
                </div>

                {error && (
                  <div className="pl-aviso pl-aviso-error py-3 px-4 text-sm rounded-xl">
                    <AlertCircle size={17} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <label className="pl-campo">
                      <span>Nombre completo</span>
                      <input
                        value={form.nombre}
                        onChange={e => actualizar('nombre', e.target.value)}
                        onFocus={() => setCampoActivo('nombre')}
                        onBlur={() => setCampoActivo(null)}
                        placeholder="Ej: Ana González"
                        autoComplete="name"
                        disabled={pagando}
                      />
                      {errores.nombre && <em className="pl-campo-error">{errores.nombre}</em>}
                    </label>

                    <label className="pl-campo">
                      <span>Correo electrónico</span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => actualizar('email', e.target.value)}
                        onFocus={() => setCampoActivo('email')}
                        onBlur={() => setCampoActivo(null)}
                        placeholder="tu@email.com"
                        autoComplete="email"
                        disabled={pagando}
                      />
                      {errores.email && <em className="pl-campo-error">{errores.email}</em>}
                    </label>

                    <label className="pl-campo">
                      <span>Teléfono</span>
                      <input
                        value={form.telefono}
                        onChange={e => actualizar('telefono', e.target.value)}
                        onFocus={() => setCampoActivo('telefono')}
                        onBlur={() => setCampoActivo(null)}
                        placeholder="Ej: +595981123456"
                        autoComplete="tel"
                        inputMode="tel"
                        disabled={pagando}
                      />
                      {errores.telefono && <em className="pl-campo-error">{errores.telefono}</em>}
                    </label>

                    <label className="pl-campo">
                      <span>Número de cédula</span>
                      <input
                        value={form.documento}
                        onChange={e => actualizar('documento', e.target.value)}
                        onFocus={() => setCampoActivo('documento')}
                        onBlur={() => setCampoActivo(null)}
                        placeholder="Ej: 4123456"
                        autoComplete="off"
                        inputMode="numeric"
                        disabled={pagando}
                      />
                      {errores.documento && <em className="pl-campo-error">{errores.documento}</em>}
                    </label>
                  </div>

                  {/* Recuadro de cupón / código de prueba */}
                  <div className="p-3.5 rounded-xl border border-border/80 bg-surface-2/60 flex flex-col gap-2 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                        <KeyRound size={14} className="text-primary" /> ¿Tenés un código de prueba gratuita o cupón?
                      </span>
                      {codigoValido && (
                        <span className="text-xs font-bold text-primary flex items-center gap-1">
                          <Check size={13} /> Canjeado
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codigoPrueba}
                        onChange={e => { setCodigoPrueba(e.target.value.toUpperCase()); setCodigoError(''); }}
                        onFocus={() => setCampoActivo('codigo')}
                        onBlur={() => setCampoActivo(null)}
                        placeholder="Ej: GESI-XXXXXX"
                        className="flex-1 bg-surface border border-border rounded-lg px-3.5 py-2 text-xs text-text uppercase tracking-wider focus:outline-none focus:border-primary"
                        disabled={verificandoCodigo || Boolean(codigoValido)}
                      />
                      {codigoValido ? (
                        <button
                          type="button"
                          onClick={quitarCodigo}
                          className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-surface text-muted hover:text-text transition-colors"
                        >
                          Quitar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={validarCodigo}
                          disabled={!codigoPrueba.trim() || verificandoCodigo}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-fg hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          {verificandoCodigo ? <Loader size={12} className="spin-icon" /> : 'Canjear'}
                        </button>
                      )}
                    </div>
                    {codigoError && <p className="text-xs text-danger m-0 font-medium">{codigoError}</p>}
                    {codigoValido && (
                      <p className="text-xs text-primary font-medium m-0 flex items-center gap-1.5">
                        <Check size={13} /> ¡Código válido! Acceso libre por <strong>{codigoValido.dias} días</strong> sin pagar nada hoy.
                      </p>
                    )}
                  </div>

                  {/* Acciones principales del checkout */}
                  <div className="pt-4 border-t border-border flex items-center justify-between gap-3 flex-wrap mt-2">
                    <span className="text-xs text-muted flex items-center gap-1.5">
                      <ShieldCheck size={15} className="text-primary shrink-0" /> Pago seguro KunfuPay · Cancelás cuando quieras
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        className="pl-btn text-sm px-4 py-2.5"
                        onClick={() => navigate(esPlanRutas ? '/#precios' : '/planes')}
                        disabled={pagando}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="pl-cta primario text-sm font-bold px-6 py-2.5 shadow-lg"
                        disabled={pagando || !plan}
                        onMouseEnter={() => setHoveringSubmit(true)}
                        onMouseLeave={() => setHoveringSubmit(false)}
                        onFocus={() => setHoveringSubmit(true)}
                        onBlur={() => setHoveringSubmit(false)}
                      >
                        {pagando ? (
                          <><Loader size={15} className="spin-icon" /> Abriendo pago...</>
                        ) : codigoValido ? (
                          <><Rocket size={16} /> Activar mis {codigoValido.dias} días gratis <ArrowRight size={16} /></>
                        ) : (
                          <><CreditCard size={16} /> Confirmar suscripción <ArrowRight size={16} /></>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Columna Derecha: Escenario 3D de la Mascota y Resumen de Plan */}
              <div className="pl-checkout-side-col">
                {/* Escenario 3D de la Mascota Embebida */}
                <div
                  className="pl-mascot-stage-3d"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="pl-mascot-sparkle pl-mascot-sparkle-1" />
                  <span className="pl-mascot-sparkle pl-mascot-sparkle-2" />
                  <div className="pl-mascot-pedestal" />

                  {/* Figura 3D grande de la Mascota con poses y perspectiva fluida */}
                  <div
                    className="pl-mascot-3d-wrapper"
                    style={{
                      transform: `perspective(500px) rotateY(${mousePos.x}deg) rotateX(${mousePos.y}deg)`,
                    }}
                  >
                    {MASCOT_POSES.map(pose => {
                      const isActive = currentPose === pose.id;
                      return (
                        <img
                          key={pose.id}
                          src={pose.src}
                          alt={pose.label}
                          className={`pl-mascot-img-3d ${isActive ? 'is-active' : ''} ${
                            currentPose === 'confirmando'
                              ? 'is-happy'
                              : currentPose === 'analizando'
                              ? 'is-busy'
                              : currentPose === 'alerta'
                              ? 'is-alert'
                              : currentPose === 'pensando'
                              ? 'is-thinking'
                              : 'is-idle'
                          }`}
                          draggable="false"
                        />
                      );
                    })}
                  </div>

                  {/* Bocadillo de diálogo 3D flotante */}
                  <div className="pl-mascot-speech-3d">
                    <div className="pl-mascot-speech-header">
                      <span className="pl-mascot-speech-dot" />
                      <span className={`pl-mascot-speech-badge ${mascotInfo.badgeColor}`}>
                        {mascotInfo.badge}
                      </span>
                    </div>
                    <p className="pl-mascot-speech-text">
                      {mascotInfo.mensaje}
                    </p>
                  </div>
                </div>

                {/* Ficha Resumen del Plan */}
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <span className="pl-cinta font-semibold">{plan?.etiqueta || 'Lanzamiento'}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{plan?.moneda || 'USD'}</span>
                  </div>
                  <div className="mt-2">
                    <h2 className="text-xl font-extrabold text-text tracking-tight">{plan?.nombre || 'Una ruta mensual'}</h2>
                    <p className="text-xs text-muted mt-0.5 font-medium">Gestión de E-commerce · Productos físicos</p>
                  </div>

                  <div className="pl-precio py-3 border-y border-border/60 my-3">
                    {codigoValido ? (
                      <div>
                        <span className="line-through text-muted text-sm mr-2">{formatPrecioPlan(plan)}</span>
                        <strong className="text-3xl font-black text-primary">GRATIS</strong>
                        <span className="text-xs text-muted block mt-1">por {codigoValido.dias} días · sin tarjeta hoy</span>
                      </div>
                    ) : (
                      <div>
                        <strong className="text-3xl font-black text-text">{formatPrecioPlan(plan)}</strong>
                        <span className="text-xs text-muted ml-1.5 font-medium">
                          {plan?.periodicidad === 'anual' ? 'por año · pago adelantado' : 'por mes · recurrente'}
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className="pl-features space-y-2 my-3">
                    {(plan?.features || [
                      'Herramientas de la ruta elegida',
                      'Tutoriales técnicos del sistema',
                      'Soporte técnico por WhatsApp en horario laboral'
                    ]).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs text-text font-medium">
                        <Check size={14} className="text-primary shrink-0" /> <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted font-medium">
                    <span>Activación inmediata</span>
                    <span className="text-primary font-semibold flex items-center gap-1">
                      <ShieldCheck size={13} /> 100% Seguro
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
