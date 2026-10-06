import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPublica from './pages/landing/LandingPublica';
import TestRenderer from './pages/landing-v2/TestRenderer';

import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import RequireTienda from './components/RequireTienda';
import DashboardLayout from './components/DashboardLayout';
import UserLayout from './components/UserLayout';
import DynamicLayout from './components/DynamicLayout';

// Panel de administracion / dashboard del comercio: ningun visitante publico
// de una tienda (catalogo, ficha de producto) pasa por estas pantallas, asi
// que van con lazy() para no sumarles el peso de todo el panel admin al
// bundle de entrada -- mismo criterio que los documentos legales, mas abajo.
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Settings = lazy(() => import('./pages/Settings'));
const Ads = lazy(() => import('./pages/Ads'));
const ProductList = lazy(() => import('./pages/productos/ProductList'));
const ProductForm = lazy(() => import('./pages/productos/ProductForm'));
const CategoriaList = lazy(() => import('./pages/categorias/CategoriaList'));
const ComboList = lazy(() => import('./pages/combos/ComboList'));
const ComboEditor = lazy(() => import('./pages/combos/ComboEditor'));
const VitrinaGrid = lazy(() => import('./pages/vitrina/VitrinaGrid'));
const CambiarPrecios = lazy(() => import('./pages/vitrina/CambiarPrecios'));
const MiDashboard = lazy(() => import('./pages/dashboard/MiDashboard'));
const MiLandingEntry = lazy(() => import('./pages/landing/MiLandingEntry'));
const LandingEditor = lazy(() => import('./pages/landing/LandingEditor'));
const LandingSimpleEntry = lazy(() => import('./pages/landing-simple/LandingSimpleEntry'));
const EditorSegunModo = lazy(() => import('./pages/landing-simple/EditorSegunModo'));
const ConfigurarTienda = lazy(() => import('./pages/tienda/ConfigurarTienda'));
const DepositosPage = lazy(() => import('./pages/tienda/DepositosPage'));
const InventarioPage = lazy(() => import('./pages/inventario/InventarioPage'));
const NuevoIngresoPage = lazy(() => import('./pages/inventario/NuevoIngresoPage'));
const IngresoDetalle = lazy(() => import('./pages/inventario/IngresoDetalle'));
const Planes = lazy(() => import('./pages/planes/Planes'));
const CheckoutPlan = lazy(() => import('./pages/planes/CheckoutPlan'));
const PublicCheckoutPlan = lazy(() => import('./pages/planes/PublicCheckoutPlan'));
const ResultadoPago = lazy(() => import('./pages/planes/ResultadoPago'));
const ParametrosAdmin = lazy(() => import('./pages/admin/Parametros'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const RahaSolicitudes = lazy(() => import('./pages/admin/RahaSolicitudes'));
const EliminacionDatosAdmin = lazy(() => import('./pages/admin/EliminacionDatos'));
const AdminPlanes = lazy(() => import('./pages/planes/AdminPlanes'));
const MiAfiliado = lazy(() => import('./pages/afiliados/MiAfiliado'));
const AuthTracking = lazy(() => import('./pages/admin/AuthTracking'));
const SeleccionModulo = lazy(() => import('./pages/auth/SeleccionModulo'));
const Onboarding = lazy(() => import('./pages/onboarding/Onboarding'));
const SeleccionarTienda = lazy(() => import('./pages/onboarding/SeleccionarTienda'));
const ControlCourier = lazy(() => import('./pages/courier/control-courier').then(m => ({ default: m.ControlCourier })));
const AbastecimientoAdmin = lazy(() => import('./pages/abastecimiento/AbastecimientoAdmin'));
const SolicitudAbastecimientoDetalle = lazy(() => import('./pages/abastecimiento/SolicitudAbastecimientoDetalle'));
const MisAbastecimientos = lazy(() => import('./pages/abastecimiento/MisAbastecimientos'));
const RedFulfillment = lazy(() => import('./pages/fulfillment/RedFulfillment'));
const CentroFulfillmentDetalle = lazy(() => import('./pages/fulfillment/CentroDetalle'));
const ProveedoresLogisticos = lazy(() => import('./pages/fulfillment/ProveedoresLogisticos'));
const IngresosFulfillmentAdmin = lazy(() => import('./pages/fulfillment/IngresosFulfillmentAdmin'));
const PedidosPrepararGesicomm = lazy(() => import('./pages/fulfillment/PedidosPrepararGesicomm'));
const SeguimientoConfig = lazy(() => import('./pages/courier/SeguimientoConfig').then(m => ({ default: m.SeguimientoConfig })));
const CourierLogin = lazy(() => import('./pages/courier/CourierLogin'));
const CourierPedidos = lazy(() => import('./pages/courier/CourierPedidos'));
const EducacionView = lazy(() => import('./pages/educacion/EducacionView'));
const AdminEducacion = lazy(() => import('./pages/educacion/AdminEducacion'));
const CostosGastos = lazy(() => import('./pages/finanzas/CostosGastos'));
const ProveedoresView = lazy(() => import('./pages/finanzas/Proveedores'));
const AutomationHub = lazy(() => import('./pages/automation-hub/AutomationHub'));
const AutomationSettings = lazy(() => import('./pages/automation-hub/AutomationSettings'));
const FinanzasAutomatizacion = lazy(() => import('./pages/finanzas/FinanzasAutomatizacion'));

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
import { inicializarPixel, PIXEL_ID_GESICOMM } from './lib/metaPixel';

const Contact = lazy(() => import('./pages/public/Contact'));
// Vista de prueba de la ficha Fitness con datos de ejemplo (/dev/ficha-fitness):
// sirve para mirar el diseño y probar paletas sin cargar una landing real.
// Se borra junto con templates/fitness/__DevFicha.jsx cuando ya no haga falta.
const DevFicha = lazy(() => import('./pages/landing-simple/templates/fitness/__DevFicha'));
const DevFichaTech = lazy(() => import('./pages/landing-simple/templates/tech/__DevFichaTech'));
const DevFichaBeauty = lazy(() => import('./pages/landing-simple/templates/beauty/__DevFichaBeauty'));
const DevFichaBazar = lazy(() => import('./pages/landing-simple/templates/bazar/__DevFichaBazar'));
const DevFichaModa = lazy(() => import('./pages/landing-simple/templates/moda/__DevFichaModa'));
const DevFichaBasico = lazy(() => import('./pages/landing-simple/templates/basico/__DevFichaBasico'));
const DevProductoPanel = lazy(() => import('./pages/landing-simple/templates/beauty/__DevProductoPanel'));
// Lienzo en blanco publicado con catálogo falso (bump, upsell, cross-sell): /dev/lienzo[/:productId].
const DevLienzo = lazy(() => import('./pages/landing-simple/__DevLienzo'));
const DevFlujos = lazy(() => import('./pages/courier/__DevFlujos'));
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

/**
 * Carga el Meta Pixel propio de gesicomm.com una sola vez, para toda la app.
 *
 * Va acá y no en Landing porque el embudo que hay que trackear no empieza
 * ni termina en la portada: alguien puede llegar directo a /login desde un
 * anuncio, o entrar a /security por un link. inicializarPixel ya es
 * idempotente (ver lib/metaPixel.js), así que no hay riesgo de cargarlo dos
 * veces.
 *
 * No corre en subdominios de tienda: ahí el pixel que se carga es el propio
 * de cada tienda (Tienda.meta_pixel_id, vía LandingPublica/TiendaPaginaView),
 * y no tiene sentido mezclarlo con el de la plataforma.
 */
function InicializarPixelPlataforma() {
  useEffect(() => {
    if (!esHostnameDeTienda()) inicializarPixel(PIXEL_ID_GESICOMM);
  }, []);
  return null;
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
import LegalPagePublica from './pages/landing/LegalPagePublica';
import ResultadoPagoTienda from './pages/landing/ResultadoPagoTienda';
import PaginaBuilderPublica from './pages/page-builder/publico/PaginaBuilderPublica';
// Page Builder (privado, siempre detras de AdminRoute): mismo criterio de
// lazy() que el resto del panel admin de arriba.
const PageBuilderHome = lazy(() => import('./pages/page-builder/PageBuilderHome'));
const ProyectoDetalle = lazy(() => import('./pages/page-builder/ProyectoDetalle'));
const FunnelBuilder = lazy(() => import('./pages/page-builder/funnel/FunnelBuilder'));
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

function CategoriaSegunHostname() {
  return esHostnameDeTienda() ? <LandingPublica vistaCodigo="categoria" /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function CheckoutTiendaSegunHostname() {
  return esHostnameDeTienda() ? <LandingPublica vistaCodigo="checkout" /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function PoliticaPrivacidadSegunHostname() {
  return esHostnameDeTienda() ? <LegalPagePublica tipoPagina="politica_privacidad" /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function PoliticaReembolsoSegunHostname() {
  return esHostnameDeTienda() ? <LegalPagePublica tipoPagina="politica_reembolso" /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function TerminosServicioSegunHostname() {
  return esHostnameDeTienda() ? <LegalPagePublica tipoPagina="terminos_servicio" /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function PoliticaEnvioSegunHostname() {
  return esHostnameDeTienda() ? <LegalPagePublica tipoPagina="politica_envio" /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

function AvisoLegalSegunHostname() {
  return esHostnameDeTienda() ? <LegalPagePublica tipoPagina="aviso_legal" /> : <PaginaPublica><NotFound /></PaginaPublica>;
}

import ThemeProvider from './components/public/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Router>
        <InicializarPixelPlataforma />
        <Suspense fallback={
          <div className="flex min-h-screen items-center justify-center">
            <span className="loader" />
          </div>
        }>
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
        <Route path="/test-builder" element={<TestRenderer />} />
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
        <Route path="/dev/ficha-bazar" element={<DevFichaBazar />} />
        <Route path="/dev/ficha-moda" element={<DevFichaModa />} />
        <Route path="/dev/ficha-basico" element={<DevFichaBasico />} />
        <Route path="/dev/producto-panel" element={<DevProductoPanel />} />
        <Route path="/dev/flujos" element={<DevFlujos />} />
        <Route path="/dev/lienzo" element={<DevLienzo />} />
        <Route path="/dev/lienzo/:productId" element={<DevLienzo />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/courier" element={<Navigate to="/courier/login" replace />} />
        <Route path="/courier/login" element={<CourierLogin />} />
        <Route path="/courier/pedidos" element={<CourierPedidos />} />

        {/* Rutas protegidas — panel admin */}
        <Route path="/dashboard" element={
          <AdminRoute><DashboardLayout><AdminDashboard /></DashboardLayout></AdminRoute>
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
          <RequireTienda><DynamicLayout><ControlCourier /></DynamicLayout></RequireTienda>
        } />
        {/* Abastecimiento: sección propia, no una pestaña dentro de Pedidos. */}
        <Route path="/abastecimiento/solicitudes/:id" element={
          <AdminRoute><DashboardLayout><SolicitudAbastecimientoDetalle /></DashboardLayout></AdminRoute>
        } />
        <Route path="/mis-abastecimientos" element={
          <RequireTienda><DynamicLayout><MisAbastecimientos /></DynamicLayout></RequireTienda>
        } />
        <Route path="/mis-abastecimientos/:id" element={
          <RequireTienda><DynamicLayout><SolicitudAbastecimientoDetalle /></DynamicLayout></RequireTienda>
        } />
        <Route path="/abastecimiento" element={
          <AdminRoute><DashboardLayout><AbastecimientoAdmin /></DashboardLayout></AdminRoute>
        } />
        {/* Red de Fulfillment: el producto logístico de Gesicomm. No es el
            panel de couriers del comercio, que vive en Pedidos -> Delivery. */}
        <Route path="/fulfillment" element={
          <AdminRoute><DashboardLayout><RedFulfillment /></DashboardLayout></AdminRoute>
        } />
        {/* Antes que /centros/:id no hace falta: las rutas no se pisan, pero
            se agrupan para que se lean juntas. */}
        <Route path="/fulfillment/proveedores" element={
          <AdminRoute><DashboardLayout><ProveedoresLogisticos /></DashboardLayout></AdminRoute>
        } />
        <Route path="/fulfillment/centros/:id" element={
          <AdminRoute><DashboardLayout><CentroFulfillmentDetalle /></DashboardLayout></AdminRoute>
        } />
        {/* Bandeja admin del inbound (Camino 2): stock propio del comercio
            que va hacia un Centro de Fulfillment de Gesicomm. */}
        <Route path="/fulfillment/ingresos" element={
          <AdminRoute><DashboardLayout><IngresosFulfillmentAdmin /></DashboardLayout></AdminRoute>
        } />
        <Route path="/fulfillment/ingresos/:id" element={
          <AdminRoute><DashboardLayout><IngresoDetalle /></DashboardLayout></AdminRoute>
        } />
        <Route path="/fulfillment/pedidos-a-preparar" element={
          <AdminRoute><DashboardLayout><PedidosPrepararGesicomm /></DashboardLayout></AdminRoute>
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

        {/* Parametros del sistema: credenciales de PagoPar de Gesicomm y
            contacto del admin. Solo administradores. */}
        <Route path="/admin/parametros" element={
          <AdminRoute><DashboardLayout><ParametrosAdmin /></DashboardLayout></AdminRoute>
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
        <Route path="/automatizacion/configuracion" element={
          <RequireTienda><UserLayout><AutomationSettings /></UserLayout></RequireTienda>
        } />

        {/* Pantalla de Selección de Módulo */}
        <Route path="/seleccionar-modulo" element={
          <ProtectedRoute><SeleccionModulo /></ProtectedRoute>
        } />

        {/* Onboarding — primer paso de una cuenta nueva del rol 'usuario' */}
        <Route path="/onboarding" element={
          <ProtectedRoute><Onboarding /></ProtectedRoute>
        } />
        {/* Varias tiendas y ninguna activa: elegir con cuál trabajar */}
        <Route path="/seleccionar-tienda" element={
          <ProtectedRoute><SeleccionarTienda /></ProtectedRoute>
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
        <Route path="/mi-catalogo/precios" element={
          <RequireTienda><UserLayout><CambiarPrecios /></UserLayout></RequireTienda>
        } />
        <Route path="/mis-pedidos" element={
          <RequireTienda><UserLayout><ControlCourier /></UserLayout></RequireTienda>
        } />
        <Route path="/pedidos/configuracion" element={
          <RequireTienda><UserLayout><SeguimientoConfig /></UserLayout></RequireTienda>
        } />
        <Route path="/mi-tienda" element={
          <RequireTienda><DynamicLayout><ConfigurarTienda /></DynamicLayout></RequireTienda>
        } />
        <Route path="/mi-tienda/depositos" element={
          <RequireTienda><DynamicLayout><DepositosPage /></DynamicLayout></RequireTienda>
        } />
        <Route path="/inventario" element={
          <RequireTienda><DynamicLayout><InventarioPage /></DynamicLayout></RequireTienda>
        } />
        <Route path="/inventario/nuevo" element={
          <RequireTienda><DynamicLayout><NuevoIngresoPage /></DynamicLayout></RequireTienda>
        } />
        <Route path="/inventario/:id" element={
          <RequireTienda><DynamicLayout><IngresoDetalle /></DynamicLayout></RequireTienda>
        } />
        {/* Planes: /planes es la pantalla que ve el comercio (catálogo de
            lib/planesCatalogo.js); /admin/planes es donde el admin edita ese
            catálogo. Sin backend todavía — ver el aviso del editor. */}
        {/* Publicas a proposito: el flujo es elegir plan -> pagar -> recien
            ahi registrarse, asi que quien las usa todavia no tiene cuenta.
            /planes/resultado/:hash es la URL DE REDIRECCIONAMIENTO que se
            configura en el panel de PagoPar. */}
        <Route path="/planes" element={<Planes />} />
        <Route path="/checkout/plan/:codigo" element={
          <ProtectedRoute><UserLayout><CheckoutPlan /></UserLayout></ProtectedRoute>
        } />
        <Route path="/checkout/public/:codigo" element={<PublicCheckoutPlan />} />
        <Route path="/planes/resultado/:hash" element={<ResultadoPago />} />
        <Route path="/admin/planes" element={
          <AdminRoute><DashboardLayout><AdminPlanes /></DashboardLayout></AdminRoute>
        } />
        <Route path="/admin/seguridad" element={
          <Navigate to="/admin/tracking-onboarding" replace />
        } />
        <Route path="/admin/tracking-onboarding" element={
          <AdminRoute><DashboardLayout><AuthTracking /></DashboardLayout></AdminRoute>
        } />
        <Route path="/admin/tracking-pagos" element={
          <AdminRoute><DashboardLayout><AuthTracking modo="pagos" /></DashboardLayout></AdminRoute>
        } />
        <Route path="/admin/raha" element={
          <AdminRoute><DashboardLayout><RahaSolicitudes /></DashboardLayout></AdminRoute>
        } />
        <Route path="/admin/eliminacion-datos" element={
          <AdminRoute><DashboardLayout><EliminacionDatosAdmin /></DashboardLayout></AdminRoute>
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
        <Route path="/mis-anuncios" element={
          <RequireTienda><UserLayout><Ads /></UserLayout></RequireTienda>
        } />
        <Route path="/afiliados" element={
          <RequireTienda><UserLayout><MiAfiliado /></UserLayout></RequireTienda>
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
        <Route path="/categoria/:categorySlug" element={<CategoriaSegunHostname />} />
        <Route path="/checkout" element={<CheckoutTiendaSegunHostname />} />
        <Route path="/contacto" element={<ContactoSegunHostname />} />
        <Route path="/politica-privacidad" element={<PoliticaPrivacidadSegunHostname />} />
        <Route path="/politica-reembolso" element={<PoliticaReembolsoSegunHostname />} />
        <Route path="/terminos-servicio" element={<TerminosServicioSegunHostname />} />
        <Route path="/politica-envio" element={<PoliticaEnvioSegunHostname />} />
        <Route path="/aviso-legal" element={<AvisoLegalSegunHostname />} />
        <Route path="/pagopar/resultado/:hash" element={<ResultadoPagoTienda />} />
        {/* Alias para pruebas locales o previsualización. En producción se usará el hostname. */}
        <Route path="/l/:slug/catalogo" element={<CatalogoPublico />} />
        <Route path="/l/:slug/categoria/:categorySlug" element={<LandingPublica vistaCodigo="categoria" />} />
        <Route path="/l/:slug/checkout" element={<LandingPublica vistaCodigo="checkout" />} />
        <Route path="/l/:slug/contacto" element={<ContactoPublico />} />
        <Route path="/l/:slug/politica-privacidad" element={<LegalPagePublica tipoPagina="politica_privacidad" />} />
        <Route path="/l/:slug/politica-reembolso" element={<LegalPagePublica tipoPagina="politica_reembolso" />} />
        <Route path="/l/:slug/terminos-servicio" element={<LegalPagePublica tipoPagina="terminos_servicio" />} />
        <Route path="/l/:slug/politica-envio" element={<LegalPagePublica tipoPagina="politica_envio" />} />
        <Route path="/l/:slug/aviso-legal" element={<LegalPagePublica tipoPagina="aviso_legal" />} />

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
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;


