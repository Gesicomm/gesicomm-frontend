import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader, Sparkles, AlertCircle } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';
import { planesService } from '../../services/planesService';
import { cargarPlanes, PERIODICIDAD } from '../../lib/planesCatalogo';
import { formatMoneda } from '../../utils/currency';
import './planes.css';

/**
 * Pantalla de planes. Muestra el catálogo de lib/planesCatalogo.js y marca
 * cuál es el plan actual de la cuenta comparando `equivale` contra el
 * Usuario.plan que devuelve /mi-tienda ('free' | 'pago').
 *
 * Contratar todavía no hace nada: no hay pasarela de suscripciones ni
 * endpoint de cambio de plan, y el botón lo dice en vez de simular una
 * compra que no ocurre.
 */
export default function Planes() {
  const navigate = useNavigate();
  // Los planes ahora viven en la base (tabla `planes`). El catálogo del
  // front queda solo como respaldo si la API no responde.
  const [planes, setPlanes] = useState([]);
  const [planActual, setPlanActual] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Checkout: quién compra. Antes de pagar no hay cuenta, así que lo único
  // que se pide es el correo — es la identidad de la suscripción hasta que
  // la persona se registra.
  const [comprando, setComprando] = useState(null);   // plan elegido
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorPago, setErrorPago] = useState(null);

  useEffect(() => {
    planesService.listar()
      .then(data => setPlanes(Array.isArray(data) && data.length ? data : cargarPlanes()))
      .catch(() => setPlanes(cargarPlanes()))
      .finally(() => setCargando(false));

    // Puede no haber sesión: esta pantalla es pública.
    tiendaService.obtener()
      .then(t => setPlanActual(t?.plan || null))
      .catch(() => setPlanActual(null));
  }, []);

  async function iniciarPago(e) {
    e.preventDefault();
    setErrorPago(null);
    setEnviando(true);
    try {
      const { payment_url } = await planesService.checkout({
        plan_codigo: comprando.codigo,
        email: email.trim(),
        nombre: nombre.trim(),
      });
      // Salimos del SPA hacia el checkout de PagoPar.
      window.location.href = payment_url;
    } catch (err) {
      setErrorPago(err.response?.data?.error || 'No pudimos iniciar el pago. Probá de nuevo.');
      setEnviando(false);
    }
  }

  const destacados = planes.filter(p => p.destacado).length;

  return (
    <div className="pl-page">
      <button type="button" className="pl-volver" onClick={() => navigate('/mi-tienda')}>
        <ArrowLeft size={14} /> Volver a Mi tienda
      </button>

      <header className="pl-hero">
        <span className="pl-hero-eyebrow"><Sparkles size={13} /> Planes</span>
        <h1>Vendé más, con menos vueltas</h1>
        <p>
          Todos los planes incluyen tu catálogo online y pedidos por WhatsApp.
          Los de pago suman dominio propio, cobros online, medición y automatizaciones.
        </p>
      </header>

      {cargando ? (
        <div className="pl-cargando"><Loader size={20} className="spin-icon" /><span>Cargando tu plan...</span></div>
      ) : (
        <div className={`pl-grid ${destacados ? 'con-destacado' : ''}`}>
          {planes.map(plan => {
            const esActual = planActual !== null && plan.equivale === planActual;
            return (
              <article key={plan.id} className={`pl-card ${plan.destacado ? 'destacado' : ''} ${esActual ? 'actual' : ''}`}>
                {plan.etiqueta && <span className="pl-cinta">{plan.etiqueta}</span>}

                <header className="pl-card-head">
                  <h2>{plan.nombre}</h2>
                  {esActual && <span className="pl-badge-actual">Tu plan actual</span>}
                </header>

                <p className="pl-resumen">{plan.resumen}</p>

                <div className="pl-precio">
                  {plan.precio > 0 ? (
                    <>
                      <strong>{formatMoneda(plan.precio)}</strong>
                      <span>{PERIODICIDAD}</span>
                    </>
                  ) : (
                    <strong className="pl-precio-gratis">Gratis</strong>
                  )}
                </div>

                <ul className="pl-features">
                  {plan.features.map((f, i) => (
                    <li key={i}><Check size={14} /> <span>{f}</span></li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`pl-cta ${plan.destacado ? 'primario' : ''}`}
                  disabled={esActual || plan.precio <= 0}
                  onClick={() => { setComprando(plan); setErrorPago(null); }}
                  title={esActual ? 'Ya tenés este plan' : undefined}
                >
                  {esActual ? 'Tu plan actual' : plan.cta}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {comprando && (
        <div className="pl-modal-fondo" onClick={() => !enviando && setComprando(null)}>
          <form className="pl-modal" onClick={e => e.stopPropagation()} onSubmit={iniciarPago}>
            <h3>Contratar {comprando.nombre}</h3>
            <p className="pl-modal-precio">{formatMoneda(comprando.precio)} <span>{PERIODICIDAD}</span></p>
            <p className="pl-modal-ayuda">
              Con este correo vas a crear tu cuenta después de pagar, así que asegurate de tenerlo a mano.
            </p>

            <label className="pl-campo">
              <span>Tu correo</span>
              <input
                type="email" required value={email} autoFocus
                onChange={e => setEmail(e.target.value)}
                placeholder="vos@tunegocio.com"
              />
            </label>
            <label className="pl-campo">
              <span>Tu nombre <em>(opcional)</em></span>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellido" />
            </label>

            {errorPago && <p className="pl-modal-error"><AlertCircle size={14} /> {errorPago}</p>}

            <div className="pl-modal-acciones">
              <button type="button" className="pl-btn" onClick={() => setComprando(null)} disabled={enviando}>
                Cancelar
              </button>
              <button type="submit" className="pl-btn primario" disabled={enviando || !email.trim()}>
                {enviando ? <Loader size={14} className="spin-icon" /> : null}
                Ir a pagar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
