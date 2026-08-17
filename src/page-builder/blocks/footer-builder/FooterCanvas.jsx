import React, { useRef, useState, useEffect } from 'react';
import { useFooterBuilder } from './FooterContext';
import BuilderElement from './BuilderElement';
import { esApilado, FOOTER_PAD_X, FOOTER_PAD_Y } from './footerLayout';
import './FooterBuilder.css';

export default function FooterCanvas() {
  const { data, activeBreakpoint, actions, selectedId } = useFooterBuilder();
  const canvasRef = useRef(null);
  // El contenedor se mide UNA vez acá y se reparte a los elementos por prop.
  // Antes cada BuilderElement se medía solo trepando a su parentElement, lo
  // que obligaba a envolverlo en un div extra — y ese div rompía el
  // `bounds="parent"` de react-rnd, que usa el parentNode crudo del DOM.
  const boundsRef = useRef(null);
  const [containerSize, setContainerSize] = useState(null);

  const { settings, elements } = data;
  const minHeight = settings?.minHeight?.[activeBreakpoint] || 400;
  const maxWidth = settings?.maxWidth || 1200;
  const hayApilados = (elements || []).some(el => esApilado(el, activeBreakpoint));

  // Click on empty canvas clears selection
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains('footer-container-bounds')) {
      actions.setSelectedId(null);
    }
  };

  // El canvas vive dentro del <iframe> de PreviewFrame.jsx, que copia sus
  // estilos recién en el evento "load": hasta que eso pase el ancho puede
  // ser 0, y convertir x/y (que están en %) con un ancho de 0 manda todo a
  // la esquina. Por eso los elementos no se montan hasta tener una medida
  // real (ver el guard más abajo).
  useEffect(() => {
    const node = boundsRef.current;
    if (!node) return;

    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width > 0) setContainerSize({ width, height: height || 400 });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeBreakpoint]);

  return (
    <div
      className="footer-canvas-container"
      data-breakpoint={activeBreakpoint}
      onClick={handleCanvasClick}
      style={{
        backgroundColor: 'var(--l-bg, transparent)',
        color: 'var(--l-text, inherit)',
      }}
    >
      <div 
        className="footer-canvas-inner"
        style={{ minHeight: minHeight !== 'auto' ? `${minHeight}px` : 'auto' }}
        ref={canvasRef}
      >
        <div
          ref={boundsRef}
          className="footer-container-bounds"
          style={{
            maxWidth: `${maxWidth}px`,
            minHeight: minHeight !== 'auto' ? `${minHeight}px` : '100%',
            position: 'relative',
            width: '100%',
            margin: '0 auto',
            // Igual que en el sitio público: el padding solo aplica cuando
            // los elementos se apilan. En modo libre iría corriendo las
            // posiciones absolutas que el usuario acomodó a mano.
            padding: hayApilados ? `${FOOTER_PAD_Y} ${FOOTER_PAD_X}` : 0,
            boxSizing: 'border-box',
          }}
        >
          {/* Los elementos son hijos DIRECTOS de este div: react-rnd resuelve
              `bounds="parent"` con el parentNode crudo del DOM, así que
              cualquier wrapper intermedio le rompe los límites. */}
          {containerSize && elements?.map(element => (
            <BuilderElement
              key={element.id}
              element={element}
              isSelected={selectedId === element.id}
              containerSize={containerSize}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
