export const usuarioPaleta = { id: 41, nombre: 'Usuario de prueba', email: 'usuario@example.test', rol: 'usuario', tiendaId: 7 };
export const rutasUsuario = [
  ['/mi-dashboard', 'Dashboard', 'LayoutDashboard'], ['/mi-catalogo', 'Catálogo', 'Grid'],
  ['/mis-pedidos', 'Gestión comercial', 'ShoppingCart'], ['/gestion-logistica', 'Gestión logística', 'Truck'],
  ['/combos', 'Combos', 'PackageSearch'], ['/mi-tienda', 'Mi tienda', 'Store'],
  ['/inventario', 'Inventario', 'PackageCheck'], ['/academia', 'Academia', 'GraduationCap'],
  ['/finanzas/costos-gastos', 'Costos y gastos', 'Receipt'], ['/configuracion', 'Configuración', 'Settings'],
];

export async function prepararUsuario(page, theme, { conPlan = true } = {}) {
  const requests = [];
  const unknown = new Set();
  let precioPropio = 125000;
  const productos = () => [
    { id: 101, tipo: 'producto', nombre: 'Producto propio de prueba', descripcion: 'Producto creado por el usuario.', categoria: 'Hogar', creado_por: 41, origen: 'PROPIO', stock: 12, precio_base: 85000, precio_minimo: 90000, precio_usuario: precioPropio, precio_efectivo: precioPropio, imagenes: [] },
    { id: 102, tipo: 'producto', nombre: 'Producto Gesicom de prueba', descripcion: 'Producto del catálogo general.', categoria: 'Hogar', creado_por: 99, origen: 'GESICOMM', stock: 20, precio_base: 65000, precio_minimo: 70000, precio_usuario: 95000, precio_efectivo: 95000, imagenes: [] },
  ];
  const modulo = { id: 1, titulo: 'Primeros pasos', descripcion: 'Configurá tu tienda y catálogo.', desbloqueado: true, icono: '🎓', total_lecciones: 1, lecciones: [{ id: 11, titulo: 'Tu primera tienda', duracion_min: 5, completada: false }], preguntas: [] };
  const pedidos = [
    { id: 501, numero_pedido: 1, numero_pedido_visible: 'TIE-1001', monto: 125000, cliente: 'Cliente de prueba', nombre_cliente: 'Cliente', apellido_cliente: 'de prueba', telefono: '595981000001', ciudad: 'Asunción', direccion: 'Dirección de prueba', fecha: '2026-10-15', createdAt: '2026-10-15T12:00:00Z', estado: 'Pendiente', total: 125000, total_cobrar: 125000, items: [{ id: 601, producto_id: 101, nombre_producto: 'Producto propio de prueba', cantidad: 1, precio_unitario: 125000 }], metodo_pago: 'Efectivo', metodo_pago_id: 1 },
    { id: 502, numero_pedido: 2, numero_pedido_visible: 'TIE-1002', monto: 95000, cliente: 'Cliente de logística', telefono: '595981000002', ciudad: 'Asunción', direccion: 'Dirección de prueba', fecha: '2026-10-15', createdAt: '2026-10-15T12:00:00Z', estado: 'Confirmado', total: 95000, total_cobrar: 95000, items: [{ id: 602, producto_id: 102, nombre_producto: 'Producto Gesicom de prueba', cantidad: 1, precio_unitario: 95000 }] },
  ];
  const tienda = { id: 7, nombre: 'Tienda del usuario', subdominio: 'tienda-usuario', documento: '1234567', whatsapp: '595981000000', color_primario: '#155e63', color_secundario: '#d8a862', color_fondo: '#f7fafc' };
  await page.addInitScript(theme => {
    // Las vistas previas usan iframes sandbox sin acceso a almacenamiento.
    if (window.top !== window.self) return;
    if (!localStorage.getItem('gesicomm-tema-publico')) localStorage.setItem('gesicomm-tema-publico', theme);
    sessionStorage.setItem('moduloActivo', 'ecommerce');
  }, theme);
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    let payload = null;
    try { payload = request.postDataJSON(); } catch { /* Sin cuerpo JSON. */ }
    requests.push({ path, method: request.method(), payload });
    let body;
    if (path === '/auth/me') body = usuarioPaleta;
    else if (path === '/suscripciones/mi-estado') body = { tiene_suscripcion_activa: conPlan, suscripcion: conPlan ? { estado: 'activa', plan: { codigo: 'PRO', nombre: 'Pro' } } : null };
    else if (path === '/mi-tienda') body = tienda;
    else if (path === '/tiendas/mias') body = [tienda];
    else if (path === '/mi-tienda/fulfillment') body = { modalidad: 'PROPIA', deposito_fulfillment_id: null, propia: { total_depositos: 0, disponible: true, depositos: [] }, gesicomm: { disponible: true, costo_desde: 15000 } };
    else if (path === '/mi-tienda/fulfillment/depositos') body = { data: [], total: 0, totalPages: 1, filtros: { ciudades: [], departamentos: [] } };
    else if (path === '/depositos') body = { data: [], total: 0, totalPages: 1 };
    else if (path === '/educacion/progreso-sidebar') body = { menusDesbloqueados: rutasUsuario.map(([path]) => path.slice(1)), bloqueos: {}, modulos: rutasUsuario.map(([path, label, icono], i) => ({ id: i + 1, path, label, icono, menuKey: path.slice(1), contexto: 'ecommerce', seccion: 'MI NEGOCIO', rolesPermitidos: ['usuario'] })) };
    else if (path === '/educacion/modulos') body = { modulos: [modulo] };
    else if (path === '/educacion/modulos/1') body = modulo;
    else if (path === '/educacion/lecciones/11/completar') { modulo.lecciones[0].completada = true; body = { ok: true }; }
    else if (path === '/vitrina/catalogo-paginado') {
      let items = productos();
      if (payload?.solamenteMios) items = items.filter(p => p.creado_por === usuarioPaleta.id);
      else if (payload?.origenCatalogo === 'GESICOMM') items = items.filter(p => p.origen === 'GESICOMM');
      if (payload?.tipo === 'combo') items = [];
      if (payload?.busqueda) items = items.filter(p => p.nombre.toLowerCase().includes(payload.busqueda.toLowerCase()));
      body = { items, total: items.length, totalPages: 1, categorias: ['Hogar'], proveedores: [], colecciones_landing: [] };
    } else if (path === '/vitrina/productos/101/precio' && request.method() === 'PUT') {
      precioPropio = payload.precio;
      body = { ok: true };
    } else if (path.includes('notifications') || path.includes('notificaciones')) body = { data: [], no_leidas: 0, seguimientos_vencidos: 0 };
    else if (path === '/costos-gastos/reporte-flujo-caja') body = { indicadores: { ventas: 0, utilidad_neta: 0, margen_neto: 0, flujo_caja_neto: 0, roi: 0, caja_disponible: 0 }, ingresos: { ventas_totales: 0, ingresos_netos: 0 }, gastos: { costos_variables: [], gastos_fijos: [], gastos_totales: 0 }, resultado_operativo: {}, flujo_caja: {}, activos: { items: [], total: 0 }, pasivos: { items: [], total: 0 }, comparacion: null };
    else if (path === '/costos-gastos/buscar') body = { registros: [], pagina: 1, total_paginas: 1, total: 0 };
    else if (path === '/planes') body = [{ id: 1, codigo: 'PRO', nombre: 'Pro', precio: 150000, activo: true, features: ['Catálogo y productos'], moneda: 'PYG' }];
    else if (path === '/envios/metricas-dashboard') body = { kpis: { facturacion_entregada: 375000, ticket_promedio: 125000, costo_mercaderia_entregada: 255000, margen_bruto_estimado: 120000, ganancia_neta_estimada: 120000, pct_margen_neto: 32, pct_margen_bruto: 32 }, funnel: { entregados: 3 }, ranking_productos: [], tendencias: [], anios_disponibles: [2026], productos_disponibles: [], couriers: [] };
    else if (path.includes('estadisticas-rango')) body = { resumen: {}, diario: [], productos: [] };
    else if (path === '/envios/list') body = pedidos;
    else if (path === '/envios/list-paginado') { const data = pedidos.filter(p => !payload?.estados || payload.estados.includes(p.estado)); body = { data, total: data.length, totalPages: 1 }; }
    else if (path === '/envios/resumen-entregados') body = {};
    else if (path.includes('conteo')) body = {};
    else if (path === '/inventario/stock/listado') body = { filas: [], total_paginas: 1, kpis: { total_unidades: 0, disponibles: 0, reservadas: 0, ubicaciones: 0 } };
    else if (path === '/productos/buscar') body = { productos: [], total: 0, total_paginas: 1 };
    else if (path.includes('/categorias')) body = { categorias: [] };
    else if (path.includes('/proveedores')) body = { proveedores: [] };
    else if (path.includes('depositos') && /buscar|listado/.test(path)) body = { depositos: [], total: 0, totalPages: 1 };
    else if (path === '/mis-landings/paginas') body = [];
    else if (path.includes('config') || path.includes('fulfillment')) body = {};
    else {
      unknown.add(path);
      body = [];
    }
    await route.fulfill({ status: 200, json: body });
  });
  return { requests, unknown };
}
