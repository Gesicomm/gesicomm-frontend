/**
 * Precarga del chunk de una sección del panel.
 *
 * Cada sección se carga con lazy(), así que el navegador recién empieza a
 * bajar su JavaScript DESPUÉS del clic: entre 0,3 y 0,6 s mirando una ruedita
 * antes de que la pantalla pueda siquiera empezar a dibujarse. El sidebar
 * llama a `precargarSeccion` cuando el mouse se posa sobre el enlace (o al
 * primer toque en celular), que es medio segundo antes del clic, y para
 * entonces el chunk ya está en memoria.
 *
 * Los `import()` de acá apuntan a los MISMOS archivos que App.jsx: Vite les da
 * el mismo chunk y el navegador no descarga nada dos veces.
 */
const POR_RUTA = {
  '/mi-tienda': () => import('../pages/tienda/ConfigurarTienda'),
  '/mi-tienda/depositos': () => import('../pages/tienda/DepositosPage'),
  '/mi-tienda/couriers': () => import('../pages/tienda/CouriersCatalogPage'),
  '/mi-catalogo': () => import('../pages/vitrina/VitrinaGrid'),
  '/clientes': () => import('../pages/clientes/Clientes'),
  // La entrada navega al editor apenas sabe cuál landing abrir, así que el
  // chunk del editor (el más grande del panel) se baja desde el hover también.
  // Solo el código: los datos los pide la entrada al montarse, para no cargarle
  // el catálogo entero al servidor cada vez que alguien pasa por el menú.
  '/landing': () => Promise.all([
    import('../pages/landing-simple/LandingSimpleEntry'),
    import('../pages/landing-simple/EditorSegunModo'),
  ]),
  '/mis-anuncios': () => import('../pages/Ads'),
  '/mis-pedidos': () => import('../pages/courier/control-courier'),
  '/gestion-logistica': () => import('../pages/courier/control-courier'),
  '/dashboard-operativo': () => import('../pages/courier/DashboardOperativo'),
  '/mi-dashboard': () => import('../pages/dashboard/MiDashboard'),
  '/finanzas/costos-gastos': () => import('../pages/finanzas/CostosGastos'),
  '/importada-de-china': () => import('../pages/importada-china/ImportadaChina'),
  '/afiliados': () => import('../pages/afiliados/MiAfiliado'),
  '/partner-certificado': () => import('../pages/partner/PartnerCertificado'),
  '/academia': () => import('../pages/educacion/EducacionView'),
  '/configuracion': () => import('../pages/Settings'),
  '/inventario': () => import('../pages/inventario/InventarioPage'),
  '/products': () => import('../pages/productos/ProductList'),
  '/combos': () => import('../pages/combos/ComboList'),
};

const yaPedidas = new Set();

export default function precargarSeccion(ruta) {
  const cargar = POR_RUTA[ruta];
  if (!cargar || yaPedidas.has(ruta)) return;
  yaPedidas.add(ruta);
  // Si falla (red caída, deploy que cambió los hashes) no hay nada que hacer:
  // el clic la vuelve a pedir y ahí sí se ve el error.
  cargar().catch(() => yaPedidas.delete(ruta));
}
