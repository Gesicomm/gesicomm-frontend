import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Acordeón accesible, usado en la sección de preguntas frecuentes.
 *
 * El encabezado es un <button> real dentro de un <h3>, con aria-expanded y
 * aria-controls apuntando al panel, y el panel referencia de vuelta al
 * botón con aria-labelledby. Eso es lo que hace que un lector de pantalla
 * anuncie "botón, contraído/expandido" y permita recorrer las preguntas.
 *
 * La animación usa grid-template-rows de 0fr a 1fr: es la única forma de
 * animar hasta la altura real del contenido sin fijar un max-height a ojo
 * que después corte los textos largos.
 */
function AccordionItem({ pregunta, respuesta, abiertoInicial = false }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const id = useId();
  const idBoton = `${id}-boton`;
  const idPanel = `${id}-panel`;

  return (
    <div className="border-b border-border last:border-b-0">
      <h3>
        <button
          type="button"
          id={idBoton}
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => setAbierto((valor) => !valor)}
          className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-primary"
        >
          <span className="text-base font-medium text-fg" style={{ letterSpacing: '-0.01em' }}>
            {pregunta}
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`flex-shrink-0 text-fg-subtle transition-transform duration-300 ${
              abierto ? 'rotate-180' : ''
            }`}
          />
        </button>
      </h3>

      {/* No se usa `hidden` porque display:none cancelaría la transición.
          Con 0fr el panel queda recortado a altura cero pero seguiría
          siendo tabulable y visible para un lector de pantalla, así que se
          lo saca del árbol de accesibilidad con inert mientras está
          cerrado. En React 18 inert se pasa como cadena vacía. */}
      <div
        id={idPanel}
        role="region"
        aria-labelledby={idBoton}
        inert={abierto ? undefined : ''}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: abierto ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="pb-5 pr-8 text-sm leading-relaxed text-fg-muted">{respuesta}</div>
        </div>
      </div>
    </div>
  );
}

export default function Accordion({ items, className = '' }) {
  return (
    <div className={className}>
      {items.map((item, indice) => (
        <AccordionItem
          key={item.pregunta}
          pregunta={item.pregunta}
          respuesta={item.respuesta}
          abiertoInicial={indice === 0}
        />
      ))}
    </div>
  );
}
