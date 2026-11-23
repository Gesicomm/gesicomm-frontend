// Prerender de las páginas legales. Se compila con `vite build --ssr` y lo usa
// scripts/prerender-legales.mjs después del build normal.
//
// Por qué existe: la app es un SPA y el HTML que devuelve el servidor no trae
// texto. El chequeo automático de Meta (y cualquier bot que no ejecute
// JavaScript) leía /privacy como una página vacía. Con esto cada ruta legal
// sale del servidor con su texto completo; al cargar, React la reemplaza por la
// versión interactiva de siempre.
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { SeoPrerender } from '../components/public/Seo';
import Privacy from '../pages/legal/Privacy';
import Terms from '../pages/legal/Terms';
import Cookies from '../pages/legal/Cookies';
import Security from '../pages/legal/Security';
import Compliance from '../pages/legal/Compliance';
import DataDeletion from '../pages/legal/DataDeletion';

export const PAGINAS = {
  '/privacy': Privacy,
  '/terms': Terms,
  '/cookies': Cookies,
  '/security': Security,
  '/compliance': Compliance,
  '/data-deletion': DataDeletion,
};

export function render(ruta) {
  const Pagina = PAGINAS[ruta];
  const seo = {};
  const html = renderToString(
    <SeoPrerender.Provider value={seo}>
      <StaticRouter location={ruta}>
        <Pagina />
      </StaticRouter>
    </SeoPrerender.Provider>
  );
  return { html, ...seo };
}
