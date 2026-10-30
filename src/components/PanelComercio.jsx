import { lazy } from 'react';
import RequireTienda from './RequireTienda';

// El guard va en el bundle de entrada a propósito: es quien pide /auth/me y
// dispara la precarga del editor, y si hubiera que bajar un chunk antes de
// montarlo, toda esa cadena arrancaría medio segundo más tarde. El layout sí
// va diferido — ningún visitante de una tienda pública lo usa.
const LayoutDelPanel = lazy(() => import('./LayoutDelPanel'));

/**
 * Envoltorio único de las secciones del panel del comercio.
 *
 * Antes cada ruta traía el suyo — unas `RequireTienda > UserLayout`, otras
 * `RequireTienda > DynamicLayout` —. Como son componentes distintos, al pasar
 * de una sección a otra React desmontaba el layout y lo volvía a montar: el
 * sidebar y el encabezado pedían otra vez auth/me, mi-estado, tiendas/mias,
 * progreso-sidebar y notificaciones, y el panel parpadeaba como si recargara.
 * Con un envoltorio único el cascarón se queda montado y solo cambia el
 * contenido.
 */
export default function PanelComercio({ soloUsuario = false, children }) {
  return (
    <RequireTienda>
      <LayoutDelPanel soloUsuario={soloUsuario}>{children}</LayoutDelPanel>
    </RequireTienda>
  );
}
