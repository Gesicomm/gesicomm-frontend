import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CreditCard, Loader, ShieldCheck, Store, UserRound, AlertCircle } from 'lucide-react';
import { planesService } from '../../services/planesService';
import { tiendaService } from '../../services/tiendaService';
import { PERIODICIDAD } from '../../lib/planesCatalogo';
import { verificarSesionDetallada } from '../../utils/auth';
import { formatMoneda } from '../../utils/currency';
import './planes.css';

function formatPrecioPlan(plan) {
  if (!plan) return '';
  if (plan.moneda === 'USD') {
    return `$${Number(plan.precio || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return formatMoneda(plan.precio);
}

function texto(valor) {
  return String(valor || '').trim();
}

function primero(...valores) {
  return valores.map(texto).find(Boolean) || '';
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

export default function CheckoutPlan() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [plan, setPlan] = useState(() => normalizarPlan(location.state?.plan));
  const [usuario, setUsuario] = useState(null);
  const [estadoCuenta, setEstadoCuenta] = useState(null);
  const [tienda, setTienda] = useState(null);
  const [form, setForm] = useState({ telefono: '', documento: '' });
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const [planesApi, sesion, estado, tiendaActual] = await Promise.all([
          planesService.listar(),
          verificarSesionDetallada({ permitirRenovar: true }),
          planesService.miEstado().catch(() => null),
          tiendaService.obtener().catch(() => null),
        ]);

        if (!activo) return;
        if (sesion.estado !== 'autenticado') {
          navigate('/login', { replace: true, state: { next: `/checkout/plan/${codigo}` } });
          return;
        }

        const encontrado = (Array.isArray(planesApi) ? planesApi : [])
          .map(normalizarPlan)
          .find(item => item?.codigo === codigo && item.activo !== false);

        if (!encontrado) {
          setError('No encontramos este plan activo. Volvé a elegirlo desde la lista de planes.');
          setPlan(null);
        } else {
          setPlan(encontrado);
        }

        setUsuario(sesion.usuario);
        setEstadoCuenta(estado);
        setTienda(tiendaActual);
      } catch (err) {
        if (!activo) return;
        setError(err.response?.data?.error || err.response?.data?.message || 'No pudimos cargar los datos actualizados del checkout.');
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => { activo = false; };
  }, [codigo, navigate]);

  const datos = useMemo(() => {
    const suscripcion = estadoCuenta?.suscripcion || {};
    return {
      nombre: primero(usuario?.nombre, tienda?.nombre, 'Usuario Gesicomm'),
      email: primero(usuario?.correo_electronico, usuario?.email),
      telefono: primero(tienda?.deposito_telefono, tienda?.telefono, tienda?.whatsapp, suscripcion.telefono),
      documento: primero(tienda?.documento, suscripcion.documento),
      tienda: primero(tienda?.nombre, tienda?.subdominio, 'Mi tienda'),
      planActual: primero(suscripcion?.plan?.nombre, 'Plan actual'),
    };
  }, [estadoCuenta, tienda, usuario]);

  useEffect(() => {
    setForm(prev => ({
      telefono: prev.telefono || datos.telefono,
      documento: prev.documento || datos.documento,
    }));
  }, [datos.telefono, datos.documento]);

  const camposFaltantes = {
    telefono: !texto(datos.telefono),
    documento: !texto(datos.documento),
  };
  const requiereCompletar = camposFaltantes.telefono || camposFaltantes.documento;
  const planActualCodigo = estadoCuenta?.suscripcion?.plan?.codigo;
  const esPlanActual = plan && planActualCodigo === plan.codigo;

  function actualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setErrores(prev => ({ ...prev, [campo]: null }));
  }

  function validar() {
    const nuevosErrores = {};
    if (!datos.email) nuevosErrores.general = 'Tu cuenta no tiene un correo válido para iniciar el pago.';
    if (texto(form.telefono).length < 6) nuevosErrores.telefono = 'Completá un teléfono válido.';
    if (!/^[0-9.\-]{5,24}$/.test(texto(form.documento))) {
      nuevosErrores.documento = 'Completá tu número de cédula, sin letras.';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function iniciarPago() {
    if (!plan || esPlanActual || !validar()) return;

    setPagando(true);
    setError(null);
    try {
      const intent = await planesService.crearCheckoutIntent({ plan_codigo: plan.codigo });
      const resultado = await planesService.checkout({
        plan_codigo: plan.codigo,
        email: datos.email,
        nombre: datos.nombre,
        telefono: texto(form.telefono),
        documento: texto(form.documento),
        checkout_intent_token: intent.checkout_intent_token,
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
      <button type="button" className="pl-volver" onClick={() => navigate('/planes')}>
        <ArrowLeft size={14} /> Volver a planes
      </button>

      {cargando ? (
        <div className="pl-cargando"><Loader size={20} className="spin-icon" /><span>Preparando checkout...</span></div>
      ) : (
        <section className="pl-upgrade-shell">
          <main className="pl-upgrade-main">
            <span className="pl-hero-eyebrow"><ShieldCheck size={13} /> Checkout de upgrade</span>
            <div>
              <h1>Confirmá tu cambio a {plan?.nombre || 'este plan'}</h1>
              <p>
                Vamos a iniciar el pago con los datos que ya tenés guardados en Gesicomm.
                No necesitás volver a registrarte ni repetir el onboarding.
              </p>
            </div>

            {error && (
              <div className="pl-aviso pl-aviso-error">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}
            {errores.general && (
              <div className="pl-aviso pl-aviso-error">
                <AlertCircle size={17} />
                <span>{errores.general}</span>
              </div>
            )}

            <div className="pl-upgrade-route" aria-label="Cambio de plan">
              <div>
                <span>Actual</span>
                <strong>{datos.planActual}</strong>
              </div>
              <ArrowRight size={18} />
              <div>
                <span>Nuevo</span>
                <strong>{plan?.nombre || 'Plan seleccionado'}</strong>
              </div>
            </div>

            <div className="pl-upgrade-data-grid">
              <article>
                <UserRound size={17} />
                <div>
                  <span>Cuenta</span>
                  <strong>{datos.nombre}</strong>
                  <p>{datos.email}</p>
                </div>
              </article>
              <article>
                <Store size={17} />
                <div>
                  <span>Tienda</span>
                  <strong>{datos.tienda}</strong>
                  <p>{datos.documento ? `CI ${datos.documento}` : 'Cédula pendiente'}</p>
                </div>
              </article>
            </div>

            <div className="pl-upgrade-details">
              <div>
                <span>Teléfono para PagoPar</span>
                <strong>{datos.telefono || 'Pendiente'}</strong>
              </div>
              <div>
                <span>Número de cédula</span>
                <strong>{datos.documento || 'Pendiente'}</strong>
              </div>
            </div>

            {requiereCompletar && (
              <div className="pl-upgrade-missing">
                <h2>Completá el dato que falta</h2>
                <p>PagoPar exige teléfono y cédula para procesar el cobro. Solo te pedimos lo que no encontramos guardado.</p>
                <div className="pl-checkout-grid">
                  {camposFaltantes.telefono && (
                    <label className="pl-campo">
                      <span>Teléfono</span>
                      <input
                        value={form.telefono}
                        onChange={e => actualizar('telefono', e.target.value)}
                        placeholder="Ej: +595981123456"
                        autoComplete="tel"
                        inputMode="tel"
                      />
                      {errores.telefono && <em className="pl-campo-error">{errores.telefono}</em>}
                    </label>
                  )}
                  {camposFaltantes.documento && (
                    <label className="pl-campo">
                      <span>Número de cédula</span>
                      <input
                        value={form.documento}
                        onChange={e => actualizar('documento', e.target.value)}
                        placeholder="Ej: 4123456"
                        autoComplete="off"
                        inputMode="numeric"
                      />
                      {errores.documento && <em className="pl-campo-error">{errores.documento}</em>}
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="pl-upgrade-actions">
              <button type="button" className="pl-btn" onClick={() => navigate('/planes')} disabled={pagando}>
                Cambiar selección
              </button>
              <button type="button" className="pl-cta primario" onClick={iniciarPago} disabled={pagando || !plan || esPlanActual}>
                {pagando ? (
                  <><Loader size={14} className="spin-icon" /> Abriendo pago...</>
                ) : esPlanActual ? (
                  <>Este ya es tu plan</>
                ) : (
                  <><CreditCard size={15} /> Continuar al pago <ArrowRight size={15} /></>
                )}
              </button>
            </div>
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
