import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ThemeProvider from './ThemeProvider';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

/**
 * Restaura la posición de scroll al navegar.
 *
 * React Router no lo hace solo: sin esto, entrar a /privacy desde el pie de
 * la landing deja la página nueva scrolleada a la mitad. Y como el sitio usa
 * scroll-behavior: smooth, el salto se fuerza con behavior 'instant' — un
 * scroll animado de 4000 px al cambiar de página se ve como un error.
 *
 * Si la URL trae hash, en cambio, se busca el elemento y se desplaza hasta
 * él, que es lo que hacen los enlaces del tipo /#integraciones desde una
 * página que no es la portada.
 */
function RestaurarScroll() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Un frame de margen para que el contenido de la ruta nueva ya esté
      // montado cuando se busca el ancla.
      const temporizador = window.setTimeout(() => {
        const destino = document.querySelector(hash);
        if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      return () => window.clearTimeout(temporizador);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}

/**
 * Envoltorio de todas las páginas públicas: tema, navbar, pie y el enlace de
 * salto al contenido que exige la pauta de accesibilidad para que quien
 * navega con teclado no tenga que recorrer el menú en cada página.
 */
export default function PublicLayout({ children }) {
  return (
    <ThemeProvider>
      <RestaurarScroll />
      <div className="sitio-publico flex min-h-screen flex-col bg-canvas text-fg">
        <a href="#contenido" className="saltar-al-contenido no-imprimir">
          Saltar al contenido
        </a>

        <PublicNavbar />

        <main id="contenido" className="flex-1">
          {children}
        </main>

        <PublicFooter />
      </div>
    </ThemeProvider>
  );
}
