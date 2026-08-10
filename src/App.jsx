import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Ads from './pages/Ads';
import ProductList from './pages/productos/ProductList';
import ProductForm from './pages/productos/ProductForm';
import CategoriaList from './pages/categorias/CategoriaList';
import ComboList from './pages/combos/ComboList';
import ComboEditor from './pages/combos/ComboEditor';
import ComboConfiguracion from './pages/combos/ComboConfiguracion';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import RequireTienda from './components/RequireTienda';
import DashboardLayout from './components/DashboardLayout';
import UserLayout from './components/UserLayout';
import DynamicLayout from './components/DynamicLayout';
import VitrinaGrid from './pages/vitrina/VitrinaGrid';
import MiDashboard from './pages/dashboard/MiDashboard';
import MiLandingEntry from './pages/landing/MiLandingEntry';
import LandingEditor from './pages/landing/LandingEditor';
import LandingPublica from './pages/landing/LandingPublica';
import ConfigurarTienda from './pages/tienda/ConfigurarTienda';
import Onboarding from './pages/onboarding/Onboarding';
import { ControlCourier } from './pages/courier/control-courier';
import EducacionView from './pages/educacion/EducacionView';
import AdminEducacion from './pages/educacion/AdminEducacion';

// Sitio institucional público (gesicomm.com). Son las URLs que se cargan en
// el App Dashboard de Meta para la revisión de la aplicación, así que tienen
// que quedar siempre accesibles sin sesión.
//
// La landing va con import normal porque es la portada: tiene que pintar sin
// esperar un chunk adicional. Los documentos legales van con lazy() porque
// son mucho texto que casi nadie lee de corrido, y cargarlos siempre sumaba
// ~190 kB al bundle que descarga cualquiera que entre a gesicomm.com.
import PublicLayout from './components/public/PublicLayout';
import Landing from './pages/public/Landing';
import { esHostnameDeTienda } from './lib/hostname';

const Contact = lazy(() => import('./pages/public/Contact'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const Privacy = lazy(() => import('./pages/legal/Privacy'));
const Terms = lazy(() => import('./pages/legal/Terms'));
const Cookies = lazy(() => import('./pages/legal/Cookies'));
const Security = lazy(() => import('./pages/legal/Security'));
const Compliance = lazy(() => import('./pages/legal/Compliance'));
const DataDeletion = lazy(() => import('./pages/legal/DataDeletion'));
const DataDeletionStatus = lazy(() => import('./pages/legal/DataDeletionStatus'));

/**
 * Envoltorio de las páginas públicas diferidas.
 *
 * El fallback ocupa alto de pantalla para que la navbar y el pie no salten
 * hacia arriba mientras llega el chunk. role="status" hace que un lector de
 * pantalla anuncie la carga en vez de quedarse en silencio.
 */
function PaginaPublica({ children }) {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            className="flex min-h-[60vh] items-center justify-center"
          >
            <span className="loader" />
            <span className="sr-only">Cargando página…</span>
          </div>
        }
      >
        {children}
      </Suspense>
    </PublicLayout>
  );
}

// Misma URL raíz, dos dueños distintos según el hostname: en gesicomm.com
// (o localhost) es la portada institucional; en <tienda>.gesicomm.com es
// la landing pública de esa tienda. Nginx ya resuelve esto del lado
// servidor para bots (ver tiendas.gesicomm.com + landingHtml.js: internamente
// reescribe "/" a "/l" solo en el vhost de tiendas) — esto es la mitad
// cliente, para cuando el visitante SÍ ejecuta JS. esHostnameDeTienda() es
// la misma lógica que middleware/resolverTienda.js del backend.
function RaizSegunHostname() {
  return esHostnameDeTienda() ? <LandingPublica /> : <PublicLayout><Landing /></PublicLayout>;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* ─────────────────────────────────────────────────────────
            Sitio institucional público (gesicomm.com) — sin guards.

            Estas URLs son las que se cargan en el App Dashboard de Meta
            para la revisión de la app, así que tienen que responder
            siempre sin sesión:
              /privacy        → Privacy Policy URL
              /terms          → Terms of Service URL
              /data-deletion  → Data Deletion Instructions URL
            El Data Deletion Callback en cambio es del backend:
            POST https://api.gesicomm.com/api/meta/data-deletion-callback
            ───────────────────────────────────────────────────────── */}
        <Route path="/" element={<RaizSegunHostname />} />
        <Route path="/privacy" element={<PaginaPublica><Privacy /></PaginaPublica>} />
        <Route path="/terms" element={<PaginaPublica><Terms /></PaginaPublica>} />
        <Route path="/cookies" element={<PaginaPublica><Cookies /></PaginaPublica>} />
        <Route path="/security" element={<PaginaPublica><Security /></PaginaPublica>} />
        <Route path="/compliance" element={<PaginaPublica><Compliance /></PaginaPublica>} />
        <Route path="/contact" element={<PaginaPublica><Contact /></PaginaPublica>} />
        <Route path="/data-deletion" element={<PaginaPublica><DataDeletion /></PaginaPublica>} />
        <Route path="/data-deletion/estado" element={<PaginaPublica><DataDeletionStatus /></PaginaPublica>} />
        <Route path="/data-deletion/estado/:codigo" element={<PaginaPublica><DataDeletionStatus /></PaginaPublica>} />

        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas — panel admin */}
        <Route path="/dashboard" element={
          <AdminRoute><DashboardLayout><div><h1>Dashboard</h1><p>Bienvenido a Gesicomm.</p></div></DashboardLayout></AdminRoute>
        } />

        {/* Productos */}
        <Route path="/products" element={
          <RequireTienda><DynamicLayout><ProductList /></DynamicLayout></RequireTienda>
        } />
        <Route path="/products/nuevo" element={
          <RequireTienda><DynamicLayout><ProductForm /></DynamicLayout></RequireTienda>
        } />
        <Route path="/products/:id/editar" element={
          <RequireTienda><DynamicLayout><ProductForm /></DynamicLayout></RequireTienda>
        } />

        {/* Catálogo */}
        <Route path="/categorias" element={
          <AdminRoute><DashboardLayout><CategoriaList /></DashboardLayout></AdminRoute>
        } />

        {/* Otras secciones */}
        <Route path="/orders" element={
          <AdminRoute><DashboardLayout><ControlCourier /></DashboardLayout></AdminRoute>
        } />
        <Route path="/customers" element={
          <AdminRoute><DashboardLayout><div><h1>Clientes</h1><p>En construcción</p></div></DashboardLayout></AdminRoute>
        } />
        <Route path="/admin/educacion" element={
          <AdminRoute><DashboardLayout><AdminEducacion /></DashboardLayout></AdminRoute>
        } />
        <Route path="/ads" element={
          <AdminRoute><DashboardLayout><Ads /></DashboardLayout></AdminRoute>
        } />
        <Route path="/settings" element={
          <AdminRoute><DashboardLayout><Settings /></DashboardLayout></AdminRoute>
        } />

        {/* Combos */}
        <Route path="/combos" element={
          <RequireTienda><DynamicLayout><ComboList /></DynamicLayout></RequireTienda>
        } />
        <Route path="/combos/nuevo" element={
          <RequireTienda><DynamicLayout><ComboEditor /></DynamicLayout></RequireTienda>
        } />
        <Route path="/combos/:id/editar" element={
          <RequireTienda><DynamicLayout><ComboEditor /></DynamicLayout></RequireTienda>
        } />
        <Route path="/configuracion-economica" element={
          <RequireTienda><DynamicLayout><ComboConfiguracion /></DynamicLayout></RequireTienda>
        } />

        {/* Onboarding — primer paso de una cuenta nueva del rol 'usuario' */}
        <Route path="/onboarding" element={
          <ProtectedRoute><Onboarding /></ProtectedRoute>
        } />

        {/* Rutas protegidas — vitrina, academia y pedidos del rol 'usuario' */}
        <Route path="/academia" element={
          <RequireTienda><UserLayout><EducacionView /></UserLayout></RequireTienda>
        } />
        <Route path="/mi-dashboard" element={
          <RequireTienda><UserLayout><MiDashboard /></UserLayout></RequireTienda>
        } />
        <Route path="/mi-catalogo" element={
          <RequireTienda><UserLayout><VitrinaGrid /></UserLayout></RequireTienda>
        } />
        <Route path="/mis-pedidos" element={
          <RequireTienda><UserLayout><ControlCourier /></UserLayout></RequireTienda>
        } />
        <Route path="/mi-tienda" element={
          <RequireTienda><UserLayout><ConfigurarTienda /></UserLayout></RequireTienda>
        } />
        {/* MVP: una sola landing por tienda (ver landing.service.js
            MAX_LANDINGS_POR_TIENDA). /mi-landing decide sola si redirige a
            editar la que ya existe o se queda en modo creación. */}
        <Route path="/mi-landing" element={
          <RequireTienda><UserLayout><MiLandingEntry /></UserLayout></RequireTienda>
        } />
        <Route path="/mi-landing/:id" element={
          <RequireTienda><UserLayout><LandingEditor /></UserLayout></RequireTienda>
        } />
        <Route path="/mis-anuncios" element={
          <RequireTienda><UserLayout><Ads /></UserLayout></RequireTienda>
        } />
        <Route path="/configuracion" element={
          <RequireTienda><UserLayout><Settings /></UserLayout></RequireTienda>
        } />

        {/* /l y /l/:slug: compatibilidad hacia atrás — desde la IP dedicada,
            "/" en el hostname de una tienda ya sirve lo mismo (ver
            RaizSegunHostname arriba). Nginx sigue proxyeando estas dos rutas
            al backend igual que "/", así que un link viejo con /l no rompe. */}
        <Route path="/l" element={<LandingPublica />} />
        <Route path="/l/:slug" element={<LandingPublica />} />

        {/* Comodín: sin esto una URL mal escrita renderiza una página en
            blanco, porque React Router no encuentra ninguna coincidencia. */}
        <Route path="*" element={<PaginaPublica><NotFound /></PaginaPublica>} />
      </Routes>
    </Router>
  );
}

export default App;
