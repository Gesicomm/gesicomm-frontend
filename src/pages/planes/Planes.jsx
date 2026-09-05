import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader, Sparkles, AlertCircle } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';
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
  const [planes] = useState(() => cargarPlanes());
  const [planActual, setPlanActual] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    tiendaService.obtener()
      .then(t => setPlanActual(t?.plan || 'free'))
      .catch(() => setPlanActual(null))
      .finally(() => setCargando(false));
  }, []);

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
                  disabled={esActual}
                  title={esActual ? 'Ya tenés este plan' : 'La contratación todavía no está habilitada'}
                >
                  {esActual ? 'Tu plan actual' : plan.cta}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <p className="pl-nota">
        <AlertCircle size={14} />
        <span>
          La contratación online todavía no está habilitada — los botones no cobran ni cambian tu plan.
          Para pasarte de plan, escribinos y lo activamos a mano.
        </span>
      </p>
    </div>
  );
}
