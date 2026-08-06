import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Acordeón de preguntas frecuentes — reimplementa el mismo patrón accesible
 * de components/public/Accordion.jsx (botón dentro de <h3>, aria-expanded/
 * aria-controls/aria-labelledby, animación grid-template-rows 0fr→1fr,
 * `inert` en el panel cerrado) pero SIN reusar ese componente: usa las
 * clases institucionales (bg-primary, text-fg, border-border) que son la
 * marca fija de Gesicomm, no el tema por comercio (--l-*) de esta landing.
 * Tocar el componente compartido para parametrizar el color no vale el
 * riesgo sobre una pieza que ya está en producción en el sitio institucional.
 */
function FaqItem({ pregunta, respuesta, abiertoInicial }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const id = useId();
  const idBoton = `${id}-boton`;
  const idPanel = `${id}-panel`;

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--l-card-border)' }}>
      <h3>
        <button
          type="button"
          id={idBoton}
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => setAbierto((v) => !v)}
          className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors"
          style={{ color: 'var(--l-text)' }}
        >
          <span className="text-base font-semibold" style={{ letterSpacing: '-0.01em' }}>{pregunta}</span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`flex-shrink-0 transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`}
            style={{ color: 'var(--l-text-muted)' }}
          />
        </button>
      </h3>
      <div
        id={idPanel}
        role="region"
        aria-labelledby={idBoton}
        inert={abierto ? undefined : ''}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: abierto ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 pr-8 text-sm leading-relaxed" style={{ color: 'var(--l-text-muted)' }}>{respuesta}</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingFaq({ items }) {
  return (
    <section id="lp-faq" className="mx-auto max-w-[var(--l-max)] px-[var(--l-gutter)] py-16">
      <h2 className="mb-6 text-2xl font-extrabold text-[var(--l-text)]" style={{ letterSpacing: '-0.02em' }}>
        Preguntas frecuentes
      </h2>
      <div className="mx-auto max-w-2xl">
        {items.map((item, i) => (
          <FaqItem key={`${i}-${item.pregunta}`} pregunta={item.pregunta} respuesta={item.respuesta} abiertoInicial={i === 0} />
        ))}
      </div>
    </section>
  );
}
