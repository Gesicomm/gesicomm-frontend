import { useEffect, useRef, useState } from 'react';

/**
 * Revela su contenido cuando entra en el viewport.
 *
 * Se desuscribe apenas revela: la animación es de entrada, no un efecto que
 * se repita al subir y bajar la página, y dejar observers vivos en una
 * landing con veinte bloques es desperdicio puro.
 *
 * Si el navegador no soporta IntersectionObserver o la persona pidió menos
 * movimiento, el contenido arranca visible: nunca se queda escondido
 * esperando una animación que no va a ocurrir.
 */
export default function Reveal({ children, delay = 0, className = '' }) {
  const referencia = useRef(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (!('IntersectionObserver' in window)) return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (visible) return;
    const elemento = referencia.current;
    if (!elemento) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    observador.observe(elemento);
    return () => observador.disconnect();
  }, [visible]);

  return (
    <div
      ref={referencia}
      className={`revelar ${visible ? 'revelar-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
