import { Suspense } from 'react';

/**
 * Límite de carga del contenido del panel.
 *
 * El <Suspense> de App.jsx envuelve a <Routes> entero: mientras baja el chunk
 * de una sección, React reemplaza TODA la aplicación por la ruedita — el
 * sidebar y el encabezado desaparecen y queda la pantalla en blanco que se
 * siente como una recarga. Como la página se renderiza acá adentro, este
 * límite la atrapa antes y el cascarón del panel no se mueve: la espera pasa
 * a verse solo en el área de contenido.
 *
 * Sin nada suspendido no agrega ningún nodo al DOM.
 */
export default function ContenidoPanel({ children }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 240,
          }}
        >
          <span className="loader" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
