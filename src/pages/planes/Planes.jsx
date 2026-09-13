import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CreditCard, Loader, Sparkles, AlertCircle, BadgeDollarSign } from 'lucide-react';
import { planesService } from '../../services/planesService';
import { afiliadosService, guardarRefAfiliado, leerRefAfiliado } from '../../services/afiliadosService';
import { PERIODICIDAD } from '../../lib/planesCatalogo';
import { verificarSesionDetallada } from '../../utils/auth';
import { formatMoneda } from '../../utils/currency';
import './planes.css';

const CORREO_FACTURACION = 'contacto@gesicomm.com';

function formatPrecioPlan(plan) {
  if (plan.moneda === 'USD') {
    return `$${Number(plan.precio || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return formatMoneda(plan.precio);
}

function normalizarPlanes(planes) {
  return (Array.isArray(planes) ? planes : [])
    .filter(plan => Number(plan.precio) > 0)
    .filter(plan => plan.activo !== false)
    .map(plan => ({
      ...plan,
      id: plan.id || plan.codigo,
      codigo: plan.codigo || plan.id,
      cta: plan.cta || 'Activar plan',
      moneda: plan.moneda || 'PYG',
      features: Array.isArray(plan.features) ? plan.features : [],
    }));
}

export default function Planes() {
  const navigate = useNavigate();
  const location = useLocation();
  const modoPreviewAdmin = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('preview') === 'admin';
  }, [location.search]);
  const [planes, setPlanes] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [estadoCuenta, setEstadoCuenta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pagandoCodigo, setPagandoCodigo] = useState(null);
  const [preparandoCodigo, setPreparandoCodigo] = useState(null);
  const [errorPago, setErrorPago] = useState(null);
  const [exito, setExito] = useState(null);
  const [afiliadoRef, setAfiliadoRef] = useState(() => leerRefAfiliado());
  const [afiliadoInvitacion, setAfiliadoInvitacion] = useState(null);
  const [checkoutIntentToken, setCheckoutIntentToken] = useState(null);
  const [planCheckout, setPlanCheckout] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    documento: '',
  });
  const [checkoutErrores, setCheckoutErrores] = useState({});

  useEffect(() => {
    let activo = true;
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      const guardado = guardarRefAfiliado(ref);
      setAfiliadoRef(guardado);
      afiliadosService.track({ codigo: guardado, landing_url: window.location.href })
        .then(resp => setAfiliadoInvitacion(resp?.afiliado || null))
        .catch(() => setAfiliadoInvitacion(null));
    }

    async function cargar() {
      setCargando(true);
      try {
        const [planesResultado, sesionResultado] = await Promise.allSettled([
          planesService.listar(),
          modoPreviewAdmin
            ? Promise.resolve({ estado: 'preview' })
            : verificarSesionDetallada({ permitirRenovar: true }),
        ]);

        if (!activo) return;
        if (planesResultado.status === 'fulfilled') {
          setPlanes(normalizarPlanes(planesResultado.value));
        } else {
          setPlanes([]);
          setErrorPago('No pudimos cargar los planes actualizados. Revisá que el backend esté respondiendo antes de intentar cobrar.');
        }

        const sesion = sesionResultado.status === 'fulfilled'
          ? sesionResultado.value
          : { estado: 'error', usuario: null };
        if (!modoPreviewAdmin && sesion.estado === 'autenticado') {
          setUsuario(sesion.usuario);
          const estado = await planesService.miEstado().catch(() => null);
          if (!activo) return;
          setEstadoCuenta(estado);
        } else {
          setUsuario(null);
          setEstadoCuenta(null);
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => { activo = false; };
  }, [location.search, modoPreviewAdmin]);

  useEffect(() => {
    if (modoPreviewAdmin) return;
    if (!estadoCuenta?.tiene_suscripcion_activa) return;
    if (!estadoCuenta.requiere_onboarding) return;
    const t = setTimeout(() => navigate('/onboarding', { replace: true }), 900);
    return () => clearTimeout(t);
  }, [estadoCuenta, modoPreviewAdmin, navigate]);

  const yaTienePlanPago = !modoPreviewAdmin && (
    estadoCuenta?.tiene_plan_pago === true ||
    estadoCuenta?.suscripcion?.plan?.equivale_plan === 'pago'
  );
  const yaTienePlan = yaTienePlanPago;
  const estaMejorandoDesdeGratis = !!usuario && estadoCuenta?.tiene_suscripcion_activa && !yaTienePlanPago;
  const planActualCodigo = estadoCuenta?.suscripcion?.plan?.codigo || null;
  const nombrePlanActual = estadoCuenta?.suscripcion?.plan?.nombre || 'tu plan actual';
  const planesOrdenados = useMemo(() => [...planes].sort((a, b) => (a.orden || 0) - (b.orden || 0)), [planes]);

  async function abrirCheckout(plan) {
    if (modoPreviewAdmin) {
      setErrorPago('Estás viendo la vista previa de admin. Para probar un cobro real, abrí /planes fuera del preview.');
      return;
    }

    setErrorPago(null);
    setExito(null);
    setCheckoutErrores({});
    setPreparandoCodigo(plan.codigo);
    try {
      const intent = await planesService.crearCheckoutIntent({
        plan_codigo: plan.codigo,
        afiliado_codigo: afiliadoRef || leerRefAfiliado(),
      });
      setCheckoutIntentToken(intent.checkout_intent_token);
      if (intent.afiliado) setAfiliadoInvitacion(intent.afiliado);
      setPlanCheckout(plan);
      setCheckoutForm(prev => ({
        nombre: usuario?.nombre || prev.nombre,
        email: usuario?.correo_electronico || prev.email,
        telefono: prev.telefono,
        documento: prev.documento,
      }));
    } catch (err) {
      setErrorPago(err.response?.data?.error || err.response?.data?.message || err.message || 'No pudimos preparar tu selección de plan.');
    } finally {
      setPreparandoCodigo(null);
    }
  }

  function actualizarCheckout(campo, valor) {
    setCheckoutForm(prev => ({ ...prev, [campo]: valor }));
    setCheckoutErrores(prev => ({ ...prev, [campo]: null }));
  }

  function validarCheckout() {
    const errores = {};
    const nombre = checkoutForm.nombre.trim();
    const email = checkoutForm.email.trim().toLowerCase();
    const telefono = checkoutForm.telefono.trim();
    const documento = checkoutForm.documento.trim();

    if (nombre.length < 3) errores.nombre = 'Ingresá tu nombre completo.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errores.email = 'Ingresá un correo válido.';
    if (telefono.length < 6) errores.telefono = 'Ingresá un teléfono válido.';
    if (!/^[0-9.\-]{5,24}$/.test(documento)) errores.documento = 'Ingresá tu cédula, sin letras ni símbolos especiales.';

    setCheckoutErrores(errores);
    return Object.keys(errores).length === 0;
  }

  async function iniciarPago(e) {
    e.preventDefault();
    if (!planCheckout || !validarCheckout()) return;

    setErrorPago(null);
    setExito(null);
    setPagandoCodigo(planCheckout.codigo);
    try {
      const resultado = await planesService.checkout({
        plan_codigo: planCheckout.codigo,
        email: checkoutForm.email.trim().toLowerCase(),
        nombre: checkoutForm.nombre.trim(),
        telefono: checkoutForm.telefono.trim(),
        documento: checkoutForm.documento.trim(),
        checkout_intent_token: checkoutIntentToken,
        afiliado_codigo: afiliadoRef || leerRefAfiliado(),
      });
      if (!resultado?.payment_url) {
        throw new Error('PagoPar no devolvió una URL de pago.');
      }
      window.location.href = resultado.payment_url;
    } catch (err) {
      setErrorPago(err.response?.data?.error || err.response?.data?.message || err.message || 'No pudimos iniciar el pago con PagoPar.');
    } finally {
      setPagandoCodigo(null);
    }
  }

  function solicitarCambioPlan(plan) {
    const asunto = `Quiero mejorar mi plan a ${plan.nombre}`;
    const lineas = [
      `Hola, quiero mejorar mi plan de Gesicomm a ${plan.nombre}.`,
      '',
      `Plan actual: ${nombrePlanActual}`,
      `Plan deseado: ${plan.nombre}`,
      usuario?.correo_electronico ? `Correo de mi cuenta: ${usuario.correo_electronico}` : '',
      '',
      'Me gustaría que me indiquen el siguiente paso para activar el cambio.',
    ].filter(Boolean);
    const mailto = `mailto:${CORREO_FACTURACION}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(lineas.join('\n'))}`;
    window.location.href = mailto;
  }

  function seleccionarPlan(plan) {
    if (yaTienePlanPago) {
      solicitarCambioPlan(plan);
      return;
    }
    if (usuario) {
      navigate(`/checkout/plan/${encodeURIComponent(plan.codigo)}`, { state: { plan } });
      return;
    }
    abrirCheckout(plan);
  }

  return (
    <div className="pl-page">
      <button type="button" className="pl-volver" onClick={() => navigate(modoPreviewAdmin ? '/admin/planes' : (usuario ? '/mi-dashboard' : '/login'))}>
        <ArrowLeft size={14} /> Volver
      </button>

      <header className="pl-hero">
        <span className="pl-hero-eyebrow"><Sparkles size={13} /> Planes Gesicomm</span>
        {yaTienePlan ? (
          <>
            <h1>Tu plan está activo</h1>
            <p>Estás en {nombrePlanActual}. Podés revisar los planes disponibles sin salir de tu cuenta.</p>
          </>
        ) : estaMejorandoDesdeGratis ? (
          <>
            <h1>Mejorá tu tienda a un plan pago</h1>
            <p>Elegí el plan y confirmá el pago con los datos que ya están guardados en tu cuenta y en tu tienda.</p>
          </>
        ) : (
          <>
            <h1>Elegí un plan pago para activar tu tienda</h1>
            <p>
              No hay plan gratis. Después de acreditar el pago, Gesicomm te lleva al onboarding para configurar
              el nombre de tu tienda, la ficha y los productos que vas a vender.
            </p>
          </>
        )}
      </header>

      {exito && (
        <div className="pl-aviso pl-aviso-ok">
          <CheckCircle2 size={17} />
          <span>{exito}</span>
        </div>
      )}

      {errorPago && (
        <div className="pl-aviso pl-aviso-error">
          <AlertCircle size={17} />
          <span>{errorPago}</span>
        </div>
      )}

      {afiliadoInvitacion && !yaTienePlan && (
        <div className="pl-aviso pl-aviso-ok">
          <BadgeDollarSign size={17} />
          <span>Invitado por {afiliadoInvitacion.nombre || afiliadoInvitacion.codigo}</span>
        </div>
      )}

      {planCheckout && !yaTienePlan && (
        <form className="pl-editor-card pl-checkout-card" onSubmit={iniciarPago}>
          <div className="pl-editor-card-head">
            <div>
              <h3>Datos para contratar {planCheckout.nombre}</h3>
              <p>Usamos estos datos para iniciar la transacción con PagoPar y precargar tu onboarding después del pago.</p>
            </div>
            <span className="pl-editor-id">{formatPrecioPlan(planCheckout)} {PERIODICIDAD}</span>
          </div>

          <div className="pl-checkout-grid">
            <label className="pl-campo">
              <span>Nombre completo</span>
              <input
                value={checkoutForm.nombre}
                onChange={e => actualizarCheckout('nombre', e.target.value)}
                placeholder="Ej: Ana González"
                autoComplete="name"
              />
              {checkoutErrores.nombre && <em className="pl-campo-error">{checkoutErrores.nombre}</em>}
            </label>

            <label className="pl-campo">
              <span>Correo</span>
              <input
                type="email"
                value={checkoutForm.email}
                onChange={e => actualizarCheckout('email', e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={!!usuario?.correo_electronico}
              />
              {checkoutErrores.email && <em className="pl-campo-error">{checkoutErrores.email}</em>}
            </label>

            <label className="pl-campo">
              <span>Teléfono</span>
              <input
                value={checkoutForm.telefono}
                onChange={e => actualizarCheckout('telefono', e.target.value)}
                placeholder="Ej: +595981123456"
                autoComplete="tel"
                inputMode="tel"
              />
              {checkoutErrores.telefono && <em className="pl-campo-error">{checkoutErrores.telefono}</em>}
            </label>

            <label className="pl-campo">
              <span>Número de cédula</span>
              <input
                value={checkoutForm.documento}
                onChange={e => actualizarCheckout('documento', e.target.value)}
                placeholder="Ej: 4123456"
                autoComplete="off"
                inputMode="numeric"
              />
              {checkoutErrores.documento && <em className="pl-campo-error">{checkoutErrores.documento}</em>}
            </label>
          </div>

          <div className="pl-checkout-actions">
            <button type="button" className="pl-btn-texto" onClick={() => setPlanCheckout(null)} disabled={!!pagandoCodigo}>
              Cancelar
            </button>
            <button type="submit" className="pl-cta primario" disabled={!!pagandoCodigo}>
              {pagandoCodigo === planCheckout.codigo ? (
                <><Loader size={14} className="spin-icon" /> Abriendo PagoPar...</>
              ) : (
                <><CreditCard size={15} /> Continuar a PagoPar <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <div className="pl-cargando"><Loader size={20} className="spin-icon" /><span>Cargando planes...</span></div>
      ) : (
        <div className="pl-grid con-destacado">
          {planesOrdenados.map(plan => {
            const esActual = yaTienePlan && plan.codigo === planActualCodigo;
            return (
            <article key={plan.codigo} className={`pl-card ${plan.destacado ? 'destacado' : ''} ${esActual ? 'actual' : ''}`}>
              {plan.etiqueta && !esActual && <span className="pl-cinta">{plan.etiqueta}</span>}

              <header className="pl-card-head">
                <h2>{plan.nombre}</h2>
                {esActual && <span className="pl-badge-actual"><CheckCircle2 size={12} /> Plan actual</span>}
              </header>

              <p className="pl-resumen">{plan.resumen}</p>

              <div className="pl-precio">
                <strong>{formatPrecioPlan(plan)}</strong>
                <span>{PERIODICIDAD}</span>
              </div>

              <ul className="pl-features">
                {plan.features.map((f, i) => (
                  <li key={i}><Check size={14} /> <span>{f}</span></li>
                ))}
              </ul>

              <button
                type="button"
                className={`pl-cta ${plan.destacado ? 'primario' : ''}`}
                disabled={!!pagandoCodigo || !!preparandoCodigo || esActual}
                onClick={() => seleccionarPlan(plan)}
              >
                {esActual ? (
                  <><CheckCircle2 size={15} /> Plan activo</>
                ) : preparandoCodigo === plan.codigo ? (
                  <><Loader size={14} className="spin-icon" /> Preparando...</>
                ) : pagandoCodigo === plan.codigo ? (
                  <><Loader size={14} className="spin-icon" /> Abriendo PagoPar...</>
                ) : yaTienePlanPago || usuario ? (
                  <>Mejorar a {plan.nombre} <ArrowRight size={15} /></>
                ) : (
                  <><CreditCard size={15} /> Pagar con PagoPar <ArrowRight size={15} /></>
                )}
              </button>
            </article>
          )})}
        </div>
      )}
    </div>
  );
}
