import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CreditCard, Loader, Sparkles, AlertCircle } from 'lucide-react';
import { planesService } from '../../services/planesService';
import { afiliadosService, guardarRefAfiliado, leerRefAfiliado } from '../../services/afiliadosService';
import { cargarPlanes, PERIODICIDAD } from '../../lib/planesCatalogo';
import { verificarSesionDetallada } from '../../utils/auth';
import { formatMoneda } from '../../utils/currency';
import './planes.css';

function formatPrecioPlan(plan) {
  if (plan.moneda === 'USD') {
    return `$${Number(plan.precio || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return formatMoneda(plan.precio);
}

function normalizarPlanes(planes) {
  return (Array.isArray(planes) ? planes : [])
    .filter(plan => Number(plan.precio) > 0)
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
  const [planes, setPlanes] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [estadoCuenta, setEstadoCuenta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [simulandoCodigo, setSimulandoCodigo] = useState(null);
  const [errorPago, setErrorPago] = useState(null);
  const [exito, setExito] = useState(null);
  const [afiliadoRef, setAfiliadoRef] = useState(() => leerRefAfiliado());

  useEffect(() => {
    let activo = true;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      const guardado = guardarRefAfiliado(ref);
      setAfiliadoRef(guardado);
      afiliadosService.track({ codigo: guardado, landing_url: window.location.href }).catch(() => {});
    }

    async function cargar() {
      setCargando(true);
      try {
        const [planesApi, sesion] = await Promise.all([
          planesService.listar().catch(() => cargarPlanes()),
          verificarSesionDetallada({ permitirRenovar: true }),
        ]);

        if (!activo) return;
        setPlanes(normalizarPlanes(planesApi));

        if (sesion.estado === 'autenticado') {
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
  }, []);

  useEffect(() => {
    if (!estadoCuenta?.tiene_suscripcion_activa) return;
    const destino = estadoCuenta.requiere_onboarding ? '/onboarding' : '/mi-dashboard';
    const t = setTimeout(() => navigate(destino, { replace: true }), 900);
    return () => clearTimeout(t);
  }, [estadoCuenta, navigate]);

  const yaTienePlan = !!estadoCuenta?.tiene_suscripcion_activa;
  const planesOrdenados = useMemo(() => [...planes].sort((a, b) => (a.orden || 0) - (b.orden || 0)), [planes]);

  async function simularPago(plan) {
    if (!usuario) {
      navigate('/login');
      return;
    }

    setErrorPago(null);
    setExito(null);
    setSimulandoCodigo(plan.codigo);
    try {
      const resultado = await planesService.pagarDummyPagopar({
        plan_codigo: plan.codigo,
        afiliado_codigo: afiliadoRef || leerRefAfiliado(),
      });
      setEstadoCuenta(resultado.estado_cuenta);
      setExito('PagoPar dummy acreditó tu plan. Te llevamos al onboarding.');
    } catch (err) {
      setErrorPago(err.response?.data?.message || err.message || 'No pudimos simular el pago con PagoPar.');
    } finally {
      setSimulandoCodigo(null);
    }
  }

  return (
    <div className="pl-page">
      <button type="button" className="pl-volver" onClick={() => navigate(usuario ? '/mi-dashboard' : '/login')}>
        <ArrowLeft size={14} /> Volver
      </button>

      <header className="pl-hero">
        <span className="pl-hero-eyebrow"><Sparkles size={13} /> Planes Gesicomm</span>
        <h1>Elegí un plan pago para activar tu tienda</h1>
        <p>
          No hay plan gratis. Después de acreditar el pago, Gesicomm te lleva al onboarding para configurar
          el nombre de tu tienda, la ficha y los productos que vas a vender.
        </p>
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

      {cargando ? (
        <div className="pl-cargando"><Loader size={20} className="spin-icon" /><span>Cargando planes...</span></div>
      ) : yaTienePlan ? (
        <div className="pl-estado ok">
          <CheckCircle2 size={44} />
          <h1>Tu plan ya está activo</h1>
          <p>Vamos a continuar con la configuración de tu tienda.</p>
        </div>
      ) : (
        <div className="pl-grid con-destacado">
          {planesOrdenados.map(plan => (
            <article key={plan.codigo} className={`pl-card ${plan.destacado ? 'destacado' : ''}`}>
              {plan.etiqueta && <span className="pl-cinta">{plan.etiqueta}</span>}

              <header className="pl-card-head">
                <h2>{plan.nombre}</h2>
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
                disabled={!!simulandoCodigo}
                onClick={() => simularPago(plan)}
              >
                {simulandoCodigo === plan.codigo ? (
                  <><Loader size={14} className="spin-icon" /> Simulando PagoPar...</>
                ) : (
                  <><CreditCard size={15} /> Simular pago con PagoPar <ArrowRight size={15} /></>
                )}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
