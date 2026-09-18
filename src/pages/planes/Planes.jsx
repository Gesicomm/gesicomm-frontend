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
  const [errorPago, setErrorPago] = useState(null);
  const [afiliadoRef, setAfiliadoRef] = useState(() => leerRefAfiliado());
  const [afiliadoInvitacion, setAfiliadoInvitacion] = useState(null);

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
    if (modoPreviewAdmin) {
      setErrorPago('Estás viendo la vista previa de admin. Para probar un cobro real, abrí /planes fuera del preview.');
      return;
    }
    if (yaTienePlanPago) {
      solicitarCambioPlan(plan);
      return;
    }
    if (usuario) {
      navigate(`/checkout/plan/${encodeURIComponent(plan.codigo)}`, { state: { plan } });
      return;
    }
    
    // Flujo para no autenticados: navegar a la página dedicada de checkout público
    navigate(`/checkout/public/${encodeURIComponent(plan.codigo)}`, { state: { plan } });
  }

  return (
    <div className="pl-page">
      <button type="button" className="pl-volver" onClick={() => navigate(modoPreviewAdmin ? '/admin/planes' : (usuario ? '/mi-dashboard' : '/'))}>
        <ArrowLeft size={14} /> Volver
      </button>

      <header className="pl-hero">
        <span className="pl-hero-eyebrow"><Sparkles size={13} /> Planes Gesicom</span>
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
              Después de acreditar el pago, Gesicom te lleva al onboarding para configurar
              el nombre de tu tienda, la ficha y los productos que vas a vender.
            </p>
          </>
        )}
      </header>

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
                disabled={esActual}
                onClick={() => seleccionarPlan(plan)}
              >
                {esActual ? (
                  <><CheckCircle2 size={15} /> Plan activo</>
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
