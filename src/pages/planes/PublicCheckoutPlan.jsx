import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CreditCard, Loader, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';
import { planesService } from '../../services/planesService';
import { leerRefAfiliado } from '../../services/afiliadosService';
import { formatMoneda } from '../../utils/currency';
import Logo from '../../components/public/Logo';
import './planes.css';
import RutaDelPlan from '../../components/RutaDelPlan';
import { accesoDelPlan } from '../../lib/rutasPlan';

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
  const parametros = new URLSearchParams(location.search);
  const [ruta, setRuta] = useState((location.state?.ruta || parametros.get('ruta')) === 'personal' ? 'personal' : 'fisico');
  const esPlanRutas = /^(una-ruta|ambas-rutas)-(mensual|anual)$/.test(codigo);


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

  async function iniciarPago(e) {
    e.preventDefault();
    if (pagando || !plan || !validar()) return;

    setPagando(true);
    setError(null);
    try {
      const intent = await planesService.crearCheckoutIntent({ 
        plan_codigo: plan.codigo,
        ruta: accesoDelPlan(plan) === 'elegir' ? ruta : accesoDelPlan(plan),
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
                <Link to="/registro" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full">
                  <KeyRound size={13} /> ¿Tenés código de prueba? Canjear acá
                </Link>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text">Pagá tu suscripción</h1>
                <p className="text-xs sm:text-sm text-muted mt-0.5">
                  Ingresá tus datos para iniciar el plan y activar tu cuenta al instante.
                </p>
              </div>

              {error && (
                <div className="pl-aviso pl-aviso-error py-2 px-3 text-xs">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={iniciarPago} className="pl-checkout-form flex flex-col gap-3 mt-1">
                <RutaDelPlan plan={plan} value={ruta} onChange={setRuta} disabled={pagando} />

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

                <div className="pl-checkout-actions-bar pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap mt-2">
                  <span className="text-xs text-muted flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-primary shrink-0" /> Pago seguro cifrado SSL · Cancelás cuando quieras
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="pl-btn text-sm px-4 py-2" onClick={() => navigate(esPlanRutas ? '/#precios' : '/planes')} disabled={pagando}>
                      Cancelar
                    </button>
                    <button type="submit" className="pl-cta primario text-sm font-bold px-5 py-2.5 shadow-md" disabled={pagando || !plan}>
                      {pagando ? (
                        <><Loader size={14} className="spin-icon" /> Abriendo pago...</>
                      ) : (
                        <><CreditCard size={15} /> Confirmar suscripción <ArrowRight size={15} /></>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </main>

            <aside className="pl-upgrade-summary">
              <div className="flex items-center justify-between">
                <span className="pl-cinta">{plan?.etiqueta || 'Plan seleccionado'}</span>
                <span className="text-xs font-semibold text-primary">{plan?.moneda || 'USD'}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-text">{plan?.nombre || 'Plan'}</h2>
                <p className="text-xs text-muted mt-0.5">{plan?.resumen}</p>
              </div>
              <div className="pl-precio py-2 border-y border-border/50 my-1">
                <strong className="text-2xl font-black">{formatPrecioPlan(plan)}</strong>
                <span className="text-xs text-muted">{plan?.periodicidad === 'anual' ? 'por año · pago adelantado' : 'por mes · recurrente'}</span>
              </div>
              <ul className="pl-features space-y-1.5">
                {(plan?.features || []).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-xs text-text">
                    <Check size={13} className="text-primary shrink-0" /> <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </section>
        </div>
      )}
    </div>
  );
}
