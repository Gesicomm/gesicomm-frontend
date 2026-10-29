import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accesoDelPlan, NOMBRES_RUTA } from '../../lib/rutasPlan';
import { planesService } from '../../services/planesService';

const PERIODOS = { mensual: 'Mensual', anual: 'Anual', unico: 'Pago único' };
const DETALLE_PERIODO = { mensual: 'por mes', anual: 'por año · pago adelantado', unico: 'pago único' };

export default function PublicPlans({ ruta = 'fisico' }) {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [revision, setRevision] = useState(0);
  const [monedaElegida, setMonedaElegida] = useState('PYG');
  const [periodoElegido, setPeriodoElegido] = useState('mensual');

  useEffect(() => {
    let vigente = true;
    let enCurso = false;
    const cargar = async () => {
      if (enCurso) return;
      enCurso = true;
      setEstado('cargando');
      try {
        const catalogo = await planesService.listar();
        if (!Array.isArray(catalogo)) throw new Error('Catálogo inválido');
        if (vigente) {
          setPlanes(catalogo.filter(plan => plan.activo !== false)
            .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0)));
          setEstado('listo');
        }
      } catch {
        if (vigente) setEstado('error');
      } finally { enCurso = false; }
    };
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    cargar();
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      vigente = false;
      window.removeEventListener('focus', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [revision]);

  const monedas = [...new Set(planes.map(plan => plan.moneda || 'PYG'))];
  const moneda = monedas.includes(monedaElegida) ? monedaElegida : monedas.includes('PYG') ? 'PYG' : monedas[0];
  const porMoneda = planes.filter(plan => (plan.moneda || 'PYG') === moneda);
  const periodos = Object.keys(PERIODOS).filter(periodo => porMoneda.some(plan => (plan.periodicidad || 'mensual') === periodo));
  const periodo = periodos.includes(periodoElegido) ? periodoElegido : periodos[0];
  const visibles = porMoneda.filter(plan => (plan.periodicidad || 'mensual') === periodo);

  const contratar = plan => {
    const codigo = plan.codigo || plan.id;
    const params = new URLSearchParams({
      ruta: accesoDelPlan(plan) === 'elegir' ? ruta : accesoDelPlan(plan),
      moneda_referencia: plan.moneda || 'PYG',
    });
    navigate(`/checkout/public/${encodeURIComponent(codigo)}?${params}`);
  };

  return <section className="section home-public-plans" id="precios" aria-labelledby="home-plans-title">
    <div className="wrap">
      <div className="section-head">
        <span className="eyebrow">Planes de Gesicom</span>
        <h2 id="home-plans-title">Elegí el plan que impulsa tu negocio.</h2>
        <p>Una ruta significa un espacio de trabajo: Gestión de E-commerce para productos, o Marca personal para servicios y tu marca. Los planes de ambas rutas incluyen los dos espacios.</p>
      </div>
      {estado === 'cargando' && <p className="home-plans-status" role="status">Cargando planes disponibles…</p>}
      {estado === 'error' && <div className="home-plans-status">
        <p role="alert">No pudimos cargar los planes. Volvé a intentar para ver los precios vigentes.</p>
        <button className="btn" type="button" onClick={() => setRevision(value => value + 1)}>Reintentar</button>
      </div>}
      {estado === 'listo' && !planes.length && <div className="home-plans-status">
        <p>Por ahora no hay planes disponibles para contratar.</p>
        <a className="btn" href="#solicitar-demo">Solicitar asesoramiento</a>
      </div>}
      {estado === 'listo' && planes.length > 0 && <>
        {monedas.length > 1 && <div className="selectors" role="group" aria-label="Moneda del plan">
          {monedas.map(valor => <button type="button" key={valor} aria-pressed={moneda === valor}
            className={moneda === valor ? 'active' : ''} onClick={() => setMonedaElegida(valor)}>
            {valor === 'PYG' ? 'Guaraníes · PYG' : 'Dólares · USD'}
          </button>)}
        </div>}
        <p className="home-plan-billing" role="status">{periodo === 'anual' ? 'El precio anual corresponde al año completo y se paga por adelantado.' : periodo === 'mensual' ? 'El precio mensual corresponde a un mes de acceso.' : 'Este plan se abona en un solo pago. Revisá el alcance publicado antes de contratar.'}</p>
        {periodos.length > 1 && <div className="selectors" role="group" aria-label="Duración del plan">
          {periodos.map(valor => <button type="button" key={valor} aria-pressed={periodo === valor}
            className={periodo === valor ? 'active' : ''} onClick={() => setPeriodoElegido(valor)}>{PERIODOS[valor]}</button>)}
        </div>}
        <div className="pricing" aria-label="Planes disponibles">
          {visibles.map(plan => <article className={`price-card${plan.destacado ? ' is-featured' : ''}`} key={plan.codigo || plan.id}>
            {plan.etiqueta && <span className="eyebrow home-plan-badge">{plan.etiqueta}</span>}
            <h3>{plan.nombre}</h3>
            <p className="home-plan-period">Acceso: {NOMBRES_RUTA[accesoDelPlan(plan)]}</p>
            <p className="home-plan-scope">{accesoDelPlan(plan) === 'elegir' ? '1 espacio a elección' : accesoDelPlan(plan) === 'ambas' ? '2 espacios incluidos' : '1 espacio incluido'}{accesoDelPlan(plan) !== 'personal' && ' · Varias tiendas en Gestión de E-commerce'}</p>
            {plan.resumen && <p>{plan.resumen}</p>}
            <div className="price">{moneda === 'USD' ? 'US$' : '₲'} {Number(plan.precio).toLocaleString(moneda === 'USD' ? 'en-US' : 'es-PY')}</div>
            <p className="home-plan-period">{DETALLE_PERIODO[plan.periodicidad || 'mensual']}</p>
            {Array.isArray(plan.features) && plan.features.length > 0 && <ul className="plan-list">
              {plan.features.map((feature, index) => <li key={index}>{feature}</li>)}
            </ul>}
            <button type="button" className="btn primary" onClick={() => contratar(plan)}>{plan.cta || 'Contratar plan'} <span aria-hidden="true">↗</span></button>
          </article>)}
        </div>
        <p className="home-payment-note">El checkout confirma el plan y el importe vigente antes de continuar al pago seguro.</p>
        <div className="home-plan-conditions"><h3>Antes de contratar</h3><p>Los beneficios incluidos se detallan en cada tarjeta. Consultá con el equipo la permanencia mínima y los posibles servicios con costo adicional.</p><a className="btn" href="#solicitar-demo">Solicitar asesoramiento</a></div>
      </>}
    </div>
  </section>;
}
