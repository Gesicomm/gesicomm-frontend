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
import MerchantEditor from './pages/landing/MerchantEditor';
import FunnelSelector from './pages/landing/FunnelSelector';
import LandingPublica from './pages/landing/LandingPublica';
import LandingSimpleEntry from './pages/landing-simple/LandingSimpleEntry';
import FunnelEntry from './pages/funnel/FunnelEntry';
import FunnelEditor from './pages/funnel/FunnelEditor';
import EditorSegunModo from './pages/landing-simple/EditorSegunModo';
import ConfigurarTienda from './pages/tienda/ConfigurarTienda';
import Planes from './pages/planes/Planes';
import ResultadoPago from './pages/planes/ResultadoPago';
import AdminPlanes from './pages/planes/AdminPlanes';
import Onboarding from './pages/onboarding/Onboarding';
import { ControlCourier } from './pages/courier/control-courier';
import EducacionView from './pages/educacion/EducacionView';
import AdminEducacion from './pages/educacion/AdminEducacion';
import CostosGastos from './pages/finanzas/CostosGastos';
import ProveedoresView from './pages/finanzas/Proveedores';
import AutomationHub from './pages/automation-hub/AutomationHub';
import FinanzasAutomatizacion from './pages/finanzas/FinanzasAutomatizacion';

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
// Vista de prueba de la ficha Fitness con datos de ejemplo (/dev/ficha-fitness):
// sirve para mirar el diseño y probar paletas sin cargar una landing real.
// Se borra junto con templates/fitness/__DevFicha.jsx cuando ya no haga falta.
const DevFicha = lazy(() => import('./pages/landing-simple/templates/fitness/__DevFicha'));
const DevFichaTech = lazy(() => import('./pages/landing-simple/templates/tech/__DevFichaTech'));
const DevFichaBeauty = lazy(() => import('./pages/landing-simple/templates/beauty/__DevFichaBeauty'));
const DevFichaBasico = lazy(() => import('./pages/landing-simple/templates/basico/__DevFichaBasico'));
const DevProductoPanel = lazy(() => import('./pages/landing-simple/templates/beauty/__DevProductoPanel'));
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
import CatalogoPublico from './pages/landing/CatalogoPublico';
import ContactoPublico from './pages/landing/ContactoPublico';
import PoliticaPrivacidadPublica from './pages/landing/PoliticaPrivacidadPublica';
import PoliticaReembolsoPublica from './pages/landing/PoliticaReembolsoPublica';
import TerminosServicioPublica from './pages/landing/TerminosServicioPublica';
import PoliticaEnvioPublica from './pages/landing/PoliticaEnvioPublica';
import AvisoLegalPublico from './pages/landing/AvisoLegalPublico';
import PaginaBuilderPublica from './pages/page-builder/publico/PaginaBuilderPublica';
import PageBuilderHome from './pages/page-builder/PageBuilderHome';
import ProyectoDetalle from './pages/page-builder/ProyectoDetalle';
import FunnelBuilder from './pages/page-builder/funnel/FunnelBuilder';
// El editor va diferido: es la pantalla más pesada del módulo (y la que
// va a cargar Monaco), no tiene por qué entrar al bundle del dashboard.
const PageEditor = lazy(() => import('./pages/page-builder/editor/PageEditor'));

function RaizSegunHostname() {
  return esHostnameDeTienda() ? <LandingPublica /> : <PublicLayout><Landing /></PublicLayout>;
}

function ProductoSegunHostname() {
  return esHostnameDeTienda() ? <LandingPublica /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function CatalogoSegunHostname() {
  return esHostnameDeTienda() ? <CatalogoPublico /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function ContactoSegunHostname() {
  return esHostnameDeTienda() ? <ContactoPublico /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function PoliticaPrivacidadSegunHostname() {
  return esHostnameDeTienda() ? <PoliticaPrivacidadPublica /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function PoliticaReembolsoSegunHostname() {
  return esHostnameDeTienda() ? <PoliticaReembolsoPublica /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function TerminosServicioSegunHostname() {
  return esHostnameDeTienda() ? <TerminosServicioPublica /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function PoliticaEnvioSegunHostname() {
  return esHostnameDeTienda() ? <PoliticaEnvioPublica /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function AvisoLegalSegunHostname() {
  return esHostnameDeTienda() ? <AvisoLegalPublico /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

import ThemeProvider from './components/public/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
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

        <Route path="/dev/ficha-fitness" element={<DevFicha />} />
        <Route path="/dev/ficha-tech" element={<DevFichaTech />} />
        <Route path="/dev/ficha-beauty" element={<DevFichaBeauty />} />
        <Route path="/dev/ficha-basico" element={<DevFichaBasico />} />
        <Route path="/dev/producto-panel" element={<DevProductoPanel />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas — panel admin */}
        <Route path="/dashboard" element={
          <AdminRoute><DashboardLayout><div><h1>Dashboard</h1><p>Bienvenido a Gesicom.</p></div></DashboardLayout></AdminRoute>
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
        {/* Page Builder (privado). El editor va a pantalla completa, sin
            DashboardLayout: necesita todo el alto para el código y el preview. */}
        <Route path="/page-builder" element={
          <AdminRoute><DashboardLayout><PageBuilderHome /></DashboardLayout></AdminRoute>
        } />
        <Route path="/page-builder/p/:proyectoId" element={
          <AdminRoute><DashboardLayout><ProyectoDetalle /></DashboardLayout></AdminRoute>
        } />
        <Route path="/page-builder/funnels/:id" element={
          <AdminRoute><DashboardLayout><FunnelBuilder /></DashboardLayout></AdminRoute>
        } />
        <Route path="/page-builder/paginas/:id" element={
          <AdminRoute>
            <Suspense fallback={
              <div className="flex h-screen items-center justify-center bg-canvas">
                <span className="loader" />
              </div>
            }>
              <PageEditor />
            </Suspense>
          </AdminRoute>
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


        {/* Finanzas */}
        <Route path="/finanzas/costos-gastos" element={
          <RequireTienda><DynamicLayout><CostosGastos /></DynamicLayout></RequireTienda>
        } />
        <Route path="/finanzas/proveedores" element={
          <AdminRoute><DynamicLayout><ProveedoresView /></DynamicLayout></AdminRoute>
        } />


        {/* Automatización de contenido — Gesicomm Automation Hub (backend independiente) */}
        <Route path="/automatizacion" element={
          <RequireTienda><UserLayout><AutomationHub /></UserLayout></RequireTienda>
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
          <RequireTienda><DynamicLayout><ConfigurarTienda /></DynamicLayout></RequireTienda>
        } />
        {/* Planes: /planes es la pantalla que ve el comercio (catálogo de
            lib/planesCatalogo.js); /admin/planes es donde el admin edita ese
            catálogo. Sin backend todavía — ver el aviso del editor. */}
        {/* Publicas a proposito: el flujo es elegir plan -> pagar -> recien
            ahi registrarse, asi que quien las usa todavia no tiene cuenta.
            /planes/resultado/:hash es la URL DE REDIRECCIONAMIENTO que se
            configura en el panel de PagoPar. */}
        <Route path="/planes" element={<Planes />} />
        <Route path="/planes/resultado/:hash" element={<ResultadoPago />} />
        <Route path="/admin/planes" element={
          <AdminRoute><DashboardLayout><AdminPlanes /></DashboardLayout></AdminRoute>
        } />
        {/* Cada tienda tiene 3 páginas fijas (Inicio/Catálogo/Contacto, ver
            landing.service.js asegurarPaginasFijas). /mi-landing garantiza
            las 3 y aterriza en Inicio; LandingEditor tiene sus propios tabs
            para saltar entre ellas. */}
        <Route path="/mi-landing" element={
          <RequireTienda><UserLayout><MiLandingEntry /></UserLayout></RequireTienda>
        } />
        <Route path="/mi-landing/:id" element={
          <RequireTienda><UserLayout><LandingEditor /></UserLayout></RequireTienda>
        } />
        {/* Landing de la tienda — ver pages/landing-simple/. Sistema
            paralelo al de arriba, con dos modos que arrancan en
            ModoSelector: templates rígidos (Fitness/Beauty/Tech/Básico,
            el comercio solo edita contenido) o lienzo en blanco (escribe
            el HTML/CSS/JS a mano). EditorSegunModo elige el editor. */}
        <Route path="/landing" element={
          <RequireTienda><DynamicLayout><LandingSimpleEntry /></DynamicLayout></RequireTienda>
        } />
        <Route path="/landing/:id" element={
          <RequireTienda><DynamicLayout><EditorSegunModo /></DynamicLayout></RequireTienda>
        } />
        {/* EMBUDOS — módulo propio (pages/funnel/). Una página por producto,
            hecha para llevar al cliente al checkout. Nada que ver con
            /mi-landing (deprecado) ni con /landing (la tienda). */}
        <Route path="/funnel/producto/:productoId" element={
          <RequireTienda><UserLayout><FunnelEntry /></UserLayout></RequireTienda>
        } />
        <Route path="/funnel/:id" element={
          <RequireTienda><UserLayout><FunnelEditor /></UserLayout></RequireTienda>
        } />
        {/* Diseño de página propio de un producto — mismo editor, en modo
            producto (ver esModoProducto en LandingEditor.jsx). */}
        <Route path="/mi-landing/producto/:productoId/funnel-selector" element={
          <RequireTienda><UserLayout><FunnelSelector /></UserLayout></RequireTienda>
        } />
        {/* Fase 4: Nuevo editor guiado por schema para productos */}
        <Route path="/mi-landing/producto/:productoId" element={
          <RequireTienda><UserLayout><MerchantEditor /></UserLayout></RequireTienda>
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
        
        {/* Catálogo y Contacto públicos de la tienda */}
        <Route path="/catalogo" element={<CatalogoSegunHostname />} />
        <Route path="/contacto" element={<ContactoSegunHostname />} />
        <Route path="/politica-privacidad" element={<PoliticaPrivacidadSegunHostname />} />
        <Route path="/politica-reembolso" element={<PoliticaReembolsoSegunHostname />} />
        <Route path="/terminos-servicio" element={<TerminosServicioSegunHostname />} />
        <Route path="/politica-envio" element={<PoliticaEnvioSegunHostname />} />
        <Route path="/aviso-legal" element={<AvisoLegalSegunHostname />} />
        {/* Alias para pruebas locales o previsualización. En producción se usará el hostname. */}
        <Route path="/l/:slug/catalogo" element={<CatalogoPublico />} />
        <Route path="/l/:slug/contacto" element={<ContactoPublico />} />
        <Route path="/l/:slug/politica-privacidad" element={<PoliticaPrivacidadPublica />} />
        <Route path="/l/:slug/politica-reembolso" element={<PoliticaReembolsoPublica />} />
        <Route path="/l/:slug/terminos-servicio" element={<TerminosServicioPublica />} />
        <Route path="/l/:slug/politica-envio" element={<PoliticaEnvioPublica />} />
        <Route path="/l/:slug/aviso-legal" element={<AvisoLegalPublico />} />

        {/* Page Builder público. Van ANTES de "/:productId", que es un
            comodín de un solo segmento: sin esto, "/p" y "/f" caerían ahí.
            Son las rutas de fallback — cuando la página tiene hostname
            propio (calcula.gesicomm.com) el backend resuelve por Host y
            esta misma vista se monta en la raíz. */}
        <Route path="/p/:pageSlug" element={<PaginaBuilderPublica />} />
        <Route path="/f/:funnelSlug" element={<PaginaBuilderPublica />} />
        <Route path="/f/:funnelSlug/:pageSlug" element={<PaginaBuilderPublica />} />

        {/* Producto publico */}
        <Route path="/:productId" element={<ProductoSegunHostname />} />
        <Route path="/l/:slug/:productId" element={<LandingPublica />} />

        {/* Comodín: sin esto una URL mal escrita renderiza una página en
            blanco, porque React Router no encuentra ninguna coincidencia. */}
        <Route path="*" element={<PaginaPublica><NotFound /></PaginaPublica>} />
      </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
