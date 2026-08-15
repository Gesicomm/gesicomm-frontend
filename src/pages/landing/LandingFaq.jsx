import React, { useId, useState } from 'react';
import { ChevronDown, CheckSquare, ChevronRight, Circle } from 'lucide-react';


function FaqItem({ pregunta, respuesta, abiertoInicial, icono }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const id = useId();
  const idBoton = `\${id}-boton`;
  const idPanel = `\${id}-panel`;

  const renderIcon = () => {
    if (icono === 'none' || !icono) return null;
    const props = { size: 18, className: "shrink-0 mr-3 mt-0.5", style: { color: 'var(--l-primary)' } };
    if (icono === 'check') return <CheckSquare {...props} />;
    if (icono === 'chevron') return <ChevronRight {...props} />;
    if (icono === 'dot') return <Circle fill="currentColor" {...props} size={10} className="shrink-0 mr-4 mt-1.5" />;
    return null;
  };

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--l-card-border)' }}>
      <h3>
        <button
          type="button"
          id={idBoton}
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => setAbierto((v) => !v)}
          className="flex w-full items-start justify-between gap-4 py-5 text-left transition-colors group"
          style={{ color: 'var(--l-text)' }}
        >
          <div className="flex items-start">
            {renderIcon()}
            <span className="text-base font-semibold group-hover:text-[var(--l-primary)] transition-colors" style={{ letterSpacing: '-0.01em' }}>{pregunta}</span>
          </div>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`flex-shrink-0 transition-transform duration-300 mt-1 \${abierto ? 'rotate-180' : ''}`}
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

export default function LandingFaq({ seccion }) {
  const { config = {}, contenido = {} } = seccion || {};
  const items = contenido.items || [];
  const icono = contenido.icono || 'none';
  const titulo = contenido.titulo || 'Preguntas frecuentes';

  if (items.length === 0) return null;

  return (
    <section id="lp-faq" className="mx-auto max-w-[var(--l-max)] px-[var(--l-gutter)] py-16">
      <div className="mx-auto max-w-[var(--l-max)] px-[var(--l-gutter)]">
        <h2 className="mb-8 text-2xl font-extrabold text-[var(--l-text)] text-center md:text-left" style={{ letterSpacing: '-0.02em' }}>
          {titulo}
        </h2>
        <div className={`mx-auto ${seccion.template === 'grid' ? 'grid md:grid-cols-2 gap-x-12 gap-y-4' : 'max-w-2xl'}`}>
          {items.map((item, i) => (
            <FaqItem key={i} pregunta={item.pregunta} respuesta={item.respuesta} abiertoInicial={seccion.template === 'grid' ? true : i === 0} icono={icono} />
          ))}
        </div>
      </div>
    </section>
  );
}
