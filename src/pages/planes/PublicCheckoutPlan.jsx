import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CreditCard, Loader, ShieldCheck, AlertCircle } from 'lucide-react';
import { planesService } from '../../services/planesService';
import { leerRefAfiliado } from '../../services/afiliadosService';
import { PERIODICIDAD } from '../../lib/planesCatalogo';
import { formatMoneda } from '../../utils/currency';
import Logo from '../../components/public/Logo';
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

  useEffect(() => {
    let activo = true;

    async function cargar() {
      if (plan) return; // Si ya vino por state, no cargamos
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
  }, [codigo, plan]);

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
    if (!plan || !validar()) return;

    setPagando(true);
    setError(null);
    try {
      const intent = await planesService.crearCheckoutIntent({ 
        plan_codigo: plan.codigo,
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
    <div className="pl-page pl-checkout-page">
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 no-imprimir">
        <Link to="/" aria-label="Gesicom, ir al inicio">
          <Logo size={28} />
        </Link>
        <button type="button" className="pl-volver m-0" onClick={() => navigate('/planes')}>
          <ArrowLeft size={14} /> Volver a planes
        </button>
      </header>

      {cargando ? (
        <div className="pl-cargando mt-20"><Loader size={20} className="spin-icon" /><span>Preparando checkout...</span></div>
      ) : (
        <section className="pl-upgrade-shell mt-10 max-w-5xl mx-auto p-6">
          <main className="pl-upgrade-main">
            <span className="pl-hero-eyebrow"><ShieldCheck size={13} /> Checkout seguro</span>
            <div>
              <h1>Completá tus datos para activar tu tienda</h1>
              <p>
                Usamos estos datos para iniciar la transacción con PagoPar y precargar tu cuenta de Gesicom. 
                Después del pago te llevaremos al onboarding para configurar tu negocio.
              </p>
            </div>

            {error && (
              <div className="pl-aviso pl-aviso-error mt-6">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={iniciarPago} className="pl-upgrade-missing mt-8">
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

              <div className="pl-upgrade-actions mt-8 pt-6 border-t border-border flex gap-3">
                <button type="button" className="pl-btn" onClick={() => navigate('/planes')} disabled={pagando}>
                  Cancelar
                </button>
                <button type="submit" className="pl-cta primario" disabled={pagando || !plan}>
                  {pagando ? (
                    <><Loader size={14} className="spin-icon" /> Abriendo pago...</>
                  ) : (
                    <><CreditCard size={15} /> Pagar con PagoPar <ArrowRight size={15} /></>
                  )}
                </button>
              </div>
            </form>
          </main>

          <aside className="pl-upgrade-summary">
            <span className="pl-cinta">{plan?.etiqueta || 'Plan seleccionado'}</span>
            <h2>{plan?.nombre || 'Plan'}</h2>
            <p>{plan?.resumen}</p>
            <div className="pl-precio">
              <strong>{formatPrecioPlan(plan)}</strong>
              <span>{PERIODICIDAD}</span>
            </div>
            <ul className="pl-features">
              {(plan?.features || []).map((feature, index) => (
                <li key={index}><Check size={14} /> <span>{feature}</span></li>
              ))}
            </ul>
          </aside>
        </section>
      )}
    </div>
  );
}
