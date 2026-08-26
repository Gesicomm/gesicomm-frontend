import React, { useEffect } from 'react';
import CodigoPreview from './CodigoPreview';

/**
 * La landing pública de una tienda que eligió "Lienzo en blanco": el
 * HTML/CSS/JS del comercio ocupando toda la ventana, dentro del mismo
 * iframe aislado que usa el preview del editor (ver CodigoPreview y
 * construirDocumentoCodigo).
 *
 * El iframe va fijo a la ventana y scrollea por dentro en vez de crecer
 * con su contenido: así `100vh`, `position: fixed` y un header pegajoso
 * escritos por el comercio se comportan igual que en una página suelta.
 * El precio es que el scroll pasa a ser del iframe — por eso se apaga el
 * del documento contenedor mientras esta landing está montada.
 */
export default function LandingCodigoPublica({ codigo, titulo }) {
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, []);

  const vacia = !codigo?.html?.trim() && !codigo?.css?.trim() && !codigo?.js?.trim();
  if (vacia) {
    return (
      <div className="lp-status-page">
        <h1>Esta página todavía está en construcción</h1>
        <p>Volvé en un rato.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff' }}>
      <CodigoPreview codigo={codigo} titulo={titulo} />
    </div>
  );
}
