import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BadgeDollarSign,
  Bot,
  Check,
  CheckCircle2,
  CreditCard,
  LayoutTemplate,
  Loader,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { planesService } from '../../services/planesService';
import { afiliadosService, guardarRefAfiliado, leerRefAfiliado } from '../../services/afiliadosService';
import { PERIODICIDAD } from '../../lib/planesCatalogo';
import { verificarSesionDetallada } from '../../utils/auth';
import { formatMoneda } from '../../utils/currency';
import './planes.css';

const CORREO_FACTURACION = 'contacto@gesicomm.com';

const MODULOS_GESICOMM = [
  {
    icono: Store,
    titulo: 'Tienda y landing listas para vender',
    texto: 'Creá una vitrina profesional, páginas de producto y checkout sin armar todo desde cero.',
  },
  {
    icono: ShoppingCart,
    titulo: 'Pedidos organizados en un solo lugar',
    texto: 'Recibí ventas, confirmá datos y seguí cada pedido con estados claros para tu equipo.',
  },
  {
    icono: LayoutTemplate,
    titulo: 'Fichas que convierten mejor',
    texto: 'Plantillas por rubro para mostrar beneficios, combos, ofertas y respuestas a objeciones.',
  },
  {
    icono: PackageCheck,
    titulo: 'Delivery, stock y abastecimiento',
    texto: 'Gestioná entregas, depósitos y disponibilidad sin perder el control operativo del día a día.',
  },
  {
    icono: MessageCircle,
    titulo: 'Seguimiento por WhatsApp',
    texto: 'Recordatorios y mensajes para recuperar interesados, confirmar pedidos y evitar ventas frías.',
  },
  {
    icono: BarChart3,
    titulo: 'Reportes para decidir con números',
    texto: 'Medí ventas, costos, canales y rendimiento para saber qué producto o anuncio conviene empujar.',
  },
];

const PASOS = [
  ['Elegís tu plan', 'Seleccionás el nivel que calza con tu operación y pagás con PagoPar.'],
  ['Configurás tu negocio', 'Después del pago cargás nombre, rubro, datos de entrega y primera ficha.'],
  ['Empezás a vender', 'Publicás productos, compartís tu tienda y administrás pedidos desde el panel.'],
];

const FAQS = [
  {
    pregunta: '¿Gesicomm es solo una página web?',
    respuesta: 'No. Es una plataforma para vender: landing, catálogo, productos, pedidos, delivery, seguimiento, reportes y herramientas comerciales en el mismo flujo.',
  },
  {
    pregunta: '¿Necesito saber diseño o programación?',
    respuesta: 'No. El sistema trae estructuras listas y formularios guiados para publicar rápido, sin depender de código.',
  },
  {
    pregunta: '¿Qué pasa después de pagar?',
    respuesta: 'Se habilita tu cuenta y te llevamos al onboarding para configurar tu tienda, los datos principales y el primer punto de venta.',
  },
  {
    pregunta: '¿Puedo entrar por un link de afiliado?',
    respuesta: 'Sí. Si el link trae un código de referido, Gesicomm guarda esa referencia y la mantiene durante el checkout.',
  },
];

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

      <header className="pl-landing-hero">
        <div className="pl-landing-copy">
          <span className="pl-hero-eyebrow"><Sparkles size={13} /> Gesicomm para vender online</span>
          {yaTienePlan ? (
            <>
              <h1>Tu plan está activo y tu operación puede seguir creciendo</h1>
              <p>Estás en {nombrePlanActual}. Revisá qué incluye Gesicomm y compará los planes disponibles sin salir de tu cuenta.</p>
            </>
          ) : estaMejorandoDesdeGratis ? (
            <>
              <h1>Vender online debería ser más simple.</h1>
              <p>Mejorá a un plan pago para activar más herramientas comerciales, checkout, seguimiento y gestión completa sin repetir tu onboarding.</p>
            </>
          ) : (
            <>
              <h1>Vender online debería ser más simple.</h1>
              <p>
                Gesicomm une tu tienda, tu catálogo y tus ventas en un panel pensado para que entiendas qué pasa en tu negocio y puedas empezar con el plan correcto.
              </p>
            </>
          )}
          <div className="pl-hero-actions">
            <a className="pl-cta primario" href="#planes">
              Ver planes y precios <ArrowRight size={15} />
            </a>
            <a className="pl-cta" href="#que-incluye">
              Qué incluye Gesicomm
            </a>
          </div>
          <div className="pl-trust-row" aria-label="Señales de confianza">
            <span><ShieldCheck size={15} /> Pago seguro con PagoPar</span>
            <span><Zap size={15} /> Activación guiada</span>
            <span><Users size={15} /> Hecho para comercios que venden por redes</span>
          </div>
        </div>

        <div className="pl-product-visual" aria-label="Vista previa del panel de Gesicomm">
          <div className="pl-browser-bar">
            <div className="pl-browser-dots"><span /><span /><span /></div>
            <div className="pl-browser-url">gesicomm.com/panel/resumen</div>
          </div>
          <div className="pl-visual-toolbar">
            <strong>Panel de ventas</strong>
            <span>Hoy</span>
          </div>
          <div className="pl-visual-metrics">
            <div><span>Pedidos</span><strong>38</strong></div>
            <div><span>Conversión</span><strong>12.4%</strong></div>
            <div><span>Ventas</span><strong>Gs. 8.7M</strong></div>
          </div>
          <div className="pl-visual-board">
            <div>
              <span>Nuevo</span>
              <p>Combo skincare x2</p>
              <p>Suplemento proteína</p>
            </div>
            <div>
              <span>Confirmado</span>
              <p>Kit tecnología</p>
              <p>Pedido express</p>
            </div>
            <div>
              <span>En delivery</span>
              <p>Pack bienestar</p>
              <p>Reposición mayorista</p>
            </div>
          </div>
          <div className="pl-visual-note">
            <Bot size={16} />
            <span>Seguimiento automático listo para recuperar clientes indecisos.</span>
          </div>
        </div>
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

      <section id="que-incluye" className="pl-section">
        <div className="pl-section-head">
          <span className="pl-section-kicker">Qué es Gesicomm</span>
          <h2>Todo lo que necesitás para pasar de “me escriben al WhatsApp” a una operación vendiendo en serio.</h2>
          <p>La landing no solo muestra precios: primero hace tangible el producto, responde dudas y reduce el miedo de pagar por una herramienta nueva.</p>
        </div>
        <div className="pl-feature-grid">
          {MODULOS_GESICOMM.map(({ icono: Icono, titulo, texto }) => (
            <article key={titulo} className="pl-feature">
              <Icono size={20} />
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pl-proof-band">
        <div>
          <span className="pl-section-kicker">Por qué convierte mejor</span>
          <h2>Antes de pedir el pago, la página explica el valor.</h2>
        </div>
        <div className="pl-proof-grid">
          <article>
            <strong>Sin contexto</strong>
            <p>El visitante ve precios, no entiende el producto y posterga la decisión.</p>
          </article>
          <article>
            <strong>Con Gesicomm explicado</strong>
            <p>Ve el resultado, entiende módulos, elimina objeciones y llega a planes con intención.</p>
          </article>
        </div>
      </section>

      <section className="pl-section">
        <div className="pl-section-head compact">
          <span className="pl-section-kicker">Cómo empieza</span>
          <h2>De visitante a tienda activa en tres pasos.</h2>
        </div>
        <div className="pl-steps">
          {PASOS.map(([titulo, texto], index) => (
            <article key={titulo} className="pl-step">
              <span>{index + 1}</span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="planes" className="pl-section">
        <div className="pl-section-head compact">
          <span className="pl-section-kicker">Planes</span>
          <h2>Elegí el plan que acompaña tu nivel de venta.</h2>
          <p>Todos los planes pagos activan el flujo para configurar tu negocio y empezar a vender con una experiencia guiada.</p>
        </div>

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
      </section>

      <section className="pl-section">
        <div className="pl-section-head compact">
          <span className="pl-section-kicker">Dudas frecuentes</span>
          <h2>Lo importante antes de activar tu plan.</h2>
        </div>
        <div className="pl-faq-grid">
          {FAQS.map(item => (
            <article key={item.pregunta} className="pl-faq">
              <h3>{item.pregunta}</h3>
              <p>{item.respuesta}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
