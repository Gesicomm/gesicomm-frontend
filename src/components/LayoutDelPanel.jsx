import { Suspense, lazy, useContext } from 'react';
import { SesionDelPanel } from './RequireTienda';
import UserLayout from './UserLayout';

// Solo lo ve el administrador: diferido para no sumarle el layout del panel
// admin al chunk que baja cualquier comercio al entrar a su panel.
const DashboardLayout = lazy(() => import('./DashboardLayout'));

/**
 * Elige el layout del panel sin volver a preguntar quién es el usuario:
 * RequireTienda ya lo resolvió y lo deja en SesionDelPanel. Antes esto lo
 * hacía DynamicLayout con su propio /auth/me, y tapaba la pantalla entera
 * con "verificando" mientras esperaba la respuesta.
 *
 * `soloUsuario` conserva la disposición de antes para el administrador: las
 * secciones que usaban UserLayout fijo lo siguen usando, y las que elegían
 * según el rol siguen eligiendo.
 */
export default function LayoutDelPanel({ soloUsuario, children }) {
  const usuario = useContext(SesionDelPanel);

  if (!soloUsuario && usuario?.rol === 'administrador') {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><span className="loader" /></div>}>
        <DashboardLayout>{children}</DashboardLayout>
      </Suspense>
    );
  }

  return <UserLayout>{children}</UserLayout>;
}
