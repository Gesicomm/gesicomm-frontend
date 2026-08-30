import React from 'react';
import './barraMarquee.css';

/**
 * Barra de anuncio con los mensajes desplazándose de derecha a izquierda.
 *
 * Reemplaza a LandingScrollingText.jsx, del armador por secciones deprecado
 * (/mi-landing): la idea y el keyframe son los mismos, pero aquel duplicaba
 * los mensajes seis veces "por las dudas", no se podía pausar, no tenía
 * velocidad configurable y no respetaba prefers-reduced-motion.
 *
 * ── Por qué el CTA queda afuera de la cinta ────────────────────────────
 * Solo se mueven los mensajes. El botón es un blanco de click: si se
 * desplaza, apuntarle es una lotería y en móvil directamente no se puede.
 * Se queda fijo a la derecha.
 *
 * ── Por qué el grupo se repite ─────────────────────────────────────────
 * La animación va de translateX(0) a translateX(-50%), o sea desplaza
 * exactamente la mitad de la cinta. Para que el salto al reiniciar sea
 * invisible, esa mitad tiene que ser idéntica a la otra: por eso los
 * mensajes se repiten un número PAR de veces (6 = 3 grupos por mitad).
 * Tres grupos también alcanzan para que nunca se vea un hueco en pantallas
 * anchas, que es lo que pasa si se repite poco.
 */
export default function BarraMarquee({
  className = '',
  items,
  renderItem,
  cta = null,
  animado = true,
  velocidad = 28,
  separador = '✦',
}) {
  if (!items?.length) return null;

  // Impar rompería la simetría que hace invisible el reinicio (ver arriba).
  const REPETICIONES = 6;

  // Muy rápido no se lee y marea; muy lento parece que está trabado.
  const segundos = Math.min(120, Math.max(8, Number(velocidad) || 28));

  const grupo = (llave) => (
    <div className="bm-grupo" key={llave} aria-hidden={llave > 0 ? 'true' : undefined}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {renderItem(item, i)}
          {separador && <span className="bm-separador" aria-hidden="true">{separador}</span>}
        </React.Fragment>
      ))}
    </div>
  );

  if (!animado) {
    // Sin animación no tiene sentido repetir: es la barra centrada de
    // siempre, que además es a lo que cae prefers-reduced-motion.
    return (
      <div className={`${className} bm-barra bm-estatica`}>
        <div className="bm-viewport bm-estatica-contenido">
          {items.map((item, i) => (
            <React.Fragment key={i}>{renderItem(item, i)}</React.Fragment>
          ))}
        </div>
        {cta}
      </div>
    );
  }

  return (
    <div className={`${className} bm-barra`}>
      <div className="bm-viewport">
        <div className="bm-track" style={{ animationDuration: `${segundos}s` }}>
          {Array.from({ length: REPETICIONES }, (_, i) => grupo(i))}
        </div>
      </div>
      {cta}
    </div>
  );
}
