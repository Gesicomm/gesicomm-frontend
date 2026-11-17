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

  // Animación y reactividad de la mascota
  const [hoveringSubmit, setHoveringSubmit] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -14;
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

  // Estados visuales y mensajes de la mascota
  const mascotMessage = useMemo(() => {
    if (error) return 'Revisemos los datos ingresados para poder continuar.';
    if (pagando) return 'Un momento, estoy conectando con el pago seguro...';
    if (hoveringSubmit && codigoValido) return '¡Siii! Hacé clic para activar tus 10 días de prueba gratis y empezar hoy mismo.';
    if (hoveringSubmit) return '¡Qué emoción! Estás a un solo clic de tener tu tienda lista para vender productos físicos.';
    if (codigoValido) return `¡Woooow! Con tu código tenés ${codigoValido.dias} días libres sin tarjeta. ¡Qué empiece la fiesta de ventas!`;
    return '¡Excelente elección! Vas a gestionar tus ventas y pedidos de productos físicos con todo organizado.';
  }, [error, pagando, codigoValido, hoveringSubmit]);

  return (
    <div className="pl-page pl-checkout-page pl-public-checkout">
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 no-imprimir">
        <Link to="/" aria-label="Gesicom, ir al inicio">
          <Logo size={28} />
        </Link>
        <button type="button" className="pl-volver m-0" onClick={() => navigate(esPlanRutas ? '/#precios' : '/planes')}>
          <ArrowLeft size={14} /> Volver a planes
        </button>
      </header>

      {cargando ? (
        <div className="pl-cargando mt-12"><Loader size={20} className="spin-icon" /><span>Preparando checkout...</span></div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
          <section className="pl-upgrade-shell">
            <main className="pl-upgrade-main">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="pl-hero-eyebrow"><ShieldCheck size={13} /> Checkout seguro</span>
                <span className="text-xs text-muted">Gestión de E-commerce · Productos físicos</span>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text">Pagá tu suscripción</h1>
                <p className="text-xs sm:text-sm text-muted mt-0.5">
                  Ingresá tus datos para iniciar el plan y activar tu cuenta al instante.
                </p>
              </div>

              {error && (
                <div className="pl-aviso pl-aviso-error py-2.5 px-3.5 text-xs">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="pl-checkout-form flex flex-col gap-3.5 mt-1">
                <div className="pl-checkout-grid">
                  <label className="pl-campo">
                    <span>Nombre completo</span>
                    <input
                      value={form.nombre}
                      onChange={e => actualizar('nombre', e.target.value)}
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
                      placeholder="Ej: 4123456"
                      autoComplete="off"
                      inputMode="numeric"
                      disabled={pagando}
                    />
                    {errores.documento && <em className="pl-campo-error">{errores.documento}</em>}
                  </label>
                </div>

                {/* Campo de Código de prueba directo en el formulario */}
                <div className="p-3 rounded-xl border border-border bg-surface-2/40 flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                      <KeyRound size={13} className="text-primary" /> ¿Tenés un código de prueba gratuita o cupón?
                    </span>
                    {codigoValido && (
                      <span className="text-xs font-bold text-primary flex items-center gap-1">
                        <Check size={12} /> Canjeado
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoPrueba}
                      onChange={e => { setCodigoPrueba(e.target.value.toUpperCase()); setCodigoError(''); }}
                      placeholder="Ej: GESI-XXXXXX"
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text uppercase tracking-wider focus:outline-none focus:border-primary"
                      disabled={verificandoCodigo || Boolean(codigoValido)}
                    />
                    {codigoValido ? (
                      <button
                        type="button"
                        onClick={quitarCodigo}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-surface text-muted hover:text-text transition-colors"
                      >
                        Quitar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={validarCodigo}
                        disabled={!codigoPrueba.trim() || verificandoCodigo}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-fg hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-1"
                      >
                        {verificandoCodigo ? <Loader size={12} className="spin-icon" /> : 'Canjear'}
                      </button>
                    )}
                  </div>
                  {codigoError && <p className="text-xs text-danger m-0">{codigoError}</p>}
                  {codigoValido && (
                    <p className="text-xs text-primary font-medium m-0 flex items-center gap-1">
                      <Check size={12} /> ¡Código válido! Acceso libre por <strong>{codigoValido.dias} días</strong> sin pagar nada hoy.
                    </p>
                  )}
                </div>

                <div className="pl-checkout-actions-bar pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap mt-1">
                  <span className="text-xs text-muted flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-primary shrink-0" /> Pago seguro cifrado SSL · Cancelás cuando quieras
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="pl-btn text-sm px-4 py-2" onClick={() => navigate(esPlanRutas ? '/#precios' : '/planes')} disabled={pagando}>
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="pl-cta primario text-sm font-bold px-5 py-2.5 shadow-md"
                      disabled={pagando || !plan}
                      onMouseEnter={() => setHoveringSubmit(true)}
                      onMouseLeave={() => setHoveringSubmit(false)}
                      onFocus={() => setHoveringSubmit(true)}
                      onBlur={() => setHoveringSubmit(false)}
                    >
                      {pagando ? (
                        <><Loader size={14} className="spin-icon" /> Abriendo pago...</>
                      ) : codigoValido ? (
                        <><Rocket size={15} /> Activar mis {codigoValido.dias} días gratis <ArrowRight size={15} /></>
                      ) : (
                        <><CreditCard size={15} /> Confirmar suscripción <ArrowRight size={15} /></>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </main>

            <aside className="pl-upgrade-summary flex flex-col justify-between">
              <div>
                {/* Mascota viva de Gesicom acompañando la compra */}
                <div
                  className="pl-mascot-box mb-4 p-3 rounded-2xl bg-surface border border-primary/20 shadow-sm flex items-center gap-3 relative overflow-hidden"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="pl-mascot-sparkle pl-mascot-sparkle-1" />
                  <span className="pl-mascot-sparkle pl-mascot-sparkle-2" />
                  <div className="relative shrink-0 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-primary/20 blur-md animate-pulse" />
                    <img
                      src="/brand/mascot/guia-transparente.png"
                      alt="Mascota de Gesicom"
                      style={{
                        transform: `perspective(300px) rotateY(${mousePos.x}deg) rotateX(${mousePos.y}deg)`,
                      }}
                      className={`pl-mascot-avatar relative z-10 w-16 h-20 sm:w-20 sm:h-24 object-contain filter drop-shadow-md select-none pointer-events-none ${
                        hoveringSubmit || codigoValido ? 'is-happy' : pagando ? 'is-busy' : ''
                      }`}
                      draggable="false"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">
                      {hoveringSubmit
                        ? '¡Vamos con todo!'
                        : pagando
                        ? 'Procesando'
                        : codigoValido
                        ? '¡Prueba activa!'
                        : 'Tu compañero Gesicom'}
                    </span>
                    <p className="text-xs text-text leading-snug m-0 font-medium">
                      {mascotMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="pl-cinta">{plan?.etiqueta || 'Plan seleccionado'}</span>
                  <span className="text-xs font-semibold text-primary">{plan?.moneda || 'USD'}</span>
                </div>
                <div className="mt-1.5">
                  <h2 className="text-lg font-bold text-text">{plan?.nombre || 'Plan'}</h2>
                  <p className="text-xs text-muted mt-0.5">Gestión de E-commerce · Productos físicos</p>
                </div>
                <div className="pl-precio py-2 border-y border-border/50 my-2">
                  {codigoValido ? (
                    <div>
                      <span className="line-through text-muted text-sm mr-2">{formatPrecioPlan(plan)}</span>
                      <strong className="text-2xl font-black text-primary">GRATIS</strong>
                      <span className="text-xs text-muted block mt-0.5">por {codigoValido.dias} días · sin tarjeta</span>
                    </div>
                  ) : (
                    <div>
                      <strong className="text-2xl font-black text-text">{formatPrecioPlan(plan)}</strong>
                      <span className="text-xs text-muted block mt-0.5">{plan?.periodicidad === 'anual' ? 'por año · pago adelantado' : 'por mes · recurrente'}</span>
                    </div>
                  )}
                </div>
                <ul className="pl-features space-y-1.5">
                  {(plan?.features || []).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs text-text">
                      <Check size={13} className="text-primary shrink-0" /> <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2.5 border-t border-border/50 mt-3 flex items-center justify-between text-xs text-muted">
                <span>Activación inmediata</span>
                <span className="font-semibold text-text">100% Seguro</span>
              </div>
            </aside>
          </section>
        </div>
      )}
    </div>
  );
}
