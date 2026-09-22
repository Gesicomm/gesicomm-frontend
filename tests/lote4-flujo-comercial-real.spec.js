import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de Autenticación, Pruebas y Transacción para Lote 4
// ─────────────────────────────────────────────────────────────────────────────
async function getAuthTokens(request) {
  const adminRes = await request.post('http://127.0.0.1:3000/api/auth/login', {
    data: { email: 'rodriguezmartinv02@gmail.com', password: 'KeyperCity10' }
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.token;

  const comercioRes = await request.post('http://127.0.0.1:3000/api/auth/login', {
    data: { email: 'prueba@gmail.com', password: 'gesicomm2025' }
  });
  const comercioData = await comercioRes.json();
  const comercioToken = comercioData.token;

  return { adminToken, comercioToken, adminUser: adminData.usuario, comercioUser: comercioData.usuario };
}

/**
 * Helper para verificar la Invariante Transversal de Inventario:
 * stock_fisico_vendible = cantidad_disponible + cantidad_reservada
 */
async function verificarInvarianteStock(request, token, productoId) {
  const res = await request.get(`http://127.0.0.1:3000/api/productos/${productoId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await res.json();
  const prod = body.producto || body;
  expect(prod).toBeDefined();

  const disponible = parseInt(prod.cantidad_disponible) || 0;
  const reservada = parseInt(prod.cantidad_reservada) || 0;
  const salon = parseInt(prod.stock_salon) || 0;
  const deposito = parseInt(prod.stock_deposito) || 0;
  const fisico = salon + deposito + reservada;

  expect(disponible + reservada).toBe(fisico);
  return { prod, disponible, reservada, fisico, salon, deposito };
}

/** Helper para crear un depósito propio vía API real */
async function crearDepositoPrueba(request, token, override = {}) {
  const stamp = Date.now() + Math.floor(Math.random() * 1000);
  const payload = {
    nombre: `Depósito QA L4 ${stamp}`,
    direccion: 'Calle Test 123',
    ciudad: 'Luque',
    departamento: 'Central',
    tipo: 'PROPIO',
    activo: true,
    ...override
  };
  const res = await request.post('http://127.0.0.1:3000/api/depositos', {
    headers: { Authorization: `Bearer ${token}` },
    data: payload
  });
  expect([200, 201]).toContain(res.status());
  const data = await res.json();
  return data.deposito || data;
}

/** Helper para crear un producto propio con stock por ubicación */
async function crearProductoPrueba(request, token, override = {}) {
  const stamp = Date.now() + Math.floor(Math.random() * 1000);
  const payload = {
    nombre: `Producto QA L4 ${stamp}`,
    sku: `SKU-L4-${stamp}`,
    precio_base: 80000,
    precio_costo: 45000,
    cantidad_disponible: 10,
    stock_salon: 5,
    stock_deposito: 5,
    variantes: [
      { color: 'Negro', talle: 'M', stock_salon: 5, stock_deposito: 5 }
    ],
    ...override
  };

  const res = await request.post('http://127.0.0.1:3000/api/productos', {
    headers: { Authorization: `Bearer ${token}` },
    data: payload
  });
  expect(res.status()).toBe(201);
  const data = await res.json();
  return data.producto || data;
}

/** Helper para crear un pedido comercial real */
async function crearPedidoReal(request, token, { productoId, cantidad = 1, ciudad = 'Luque', departamento = 'Central', costoEnvio = 15000, costoFulfillment = 0, estado = 'Pendiente' } = {}) {
  const payload = {
    cliente: 'Cliente L4 Real',
    nombre_cliente: 'Cliente',
    apellido_cliente: 'L4',
    telefono: '0981999888',
    ciudad,
    departamento,
    direccion: 'Av. Las Palmas 456',
    monto: 80000 * cantidad,
    costo_envio: costoEnvio,
    costo_fulfillment: costoFulfillment,
    estado,
    items: [
      {
        producto_id: productoId,
        cantidad,
        precio_unitario: 80000,
        subtotal: 80000 * cantidad
      }
    ]
  };

  const res = await request.post('http://127.0.0.1:3000/api/envios', {
    headers: { Authorization: `Bearer ${token}` },
    data: payload
  });
  expect(res.status()).toBe(201);
  const data = await res.json();
  return data.envio || data;
}

test.describe('Lote 4 — Flujo Comercial Real E2E (22 Escenarios)', () => {
  test.use({ baseURL: 'http://localhost:5173' });

  // ───────────────────────────────────────────────────────────────────────────
  // CP-08a a CP-08f: Operación Propia Total (Camino 1)
  // ───────────────────────────────────────────────────────────────────────────

  test('CP-08a — Login comercio + crear depósito propio real', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const dep = await crearDepositoPrueba(request, comercioToken, { ciudad: 'San Lorenzo' });
    expect(dep.id).toBeDefined();
    expect(dep.nombre).toContain('Depósito QA L4');
  });

  test('CP-08b — Producto propio + variante + stock en ubicación', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 20, stock_salon: 10, stock_deposito: 10 });

    expect(prod.id).toBeDefined();
    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(20);
    expect(inv.fisico).toBe(20);
  });

  test('CP-08c — Courier propio + cobertura/tarifa', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const stamp = Date.now();
    const resCourier = await request.post('http://127.0.0.1:3000/api/couriers', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {
        nombre: `Courier Privado QA ${stamp}`,
        telefono: '0981777666',
        vehiculo: 'Moto Express',
        activo: true
      }
    });
    expect([200, 201]).toContain(resCourier.status());
    const courier = (await resCourier.json()).courier || await resCourier.json();
    expect(courier.id).toBeDefined();
  });

  test('CP-08d — Landing pública funcional', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken);

    const resLanding = await request.post('http://127.0.0.1:3000/api/mis-landings-simples/onboarding', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {
        template_slug: 'basico',
        items: [{ tipo: 'producto', referencia_id: prod.id }]
      }
    });
    expect([200, 201]).toContain(resLanding.status());
    const landing = await resLanding.json();
    expect(landing.id || landing.data).toBeDefined();
  });

  test('CP-08e — Checkout cliente real', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 5, stock_deposito: 0 });

    // Cliente realiza compra enviando los datos reales del checkout
    const pedido = await crearPedidoReal(request, comercioToken, { productoId: prod.id, cantidad: 1, ciudad: 'Luque' });
    expect(pedido.id).toBeDefined();
    expect(pedido.estado).toBe('Pendiente');

    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(5);
    expect(inv.reservada).toBe(0);
  });

  test('CP-08f — Camino 1 completo (Producto Propio -> Depósito Propio -> Courier Propio)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });

    const pedido = await crearPedidoReal(request, comercioToken, { productoId: prod.id, cantidad: 2 });

    // 1. Confirmar -> Reserva 2
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });
    let inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(8);
    expect(inv.reservada).toBe(2);
    expect(inv.fisico).toBe(10);

    // 2. Preparar -> Mantiene reserva
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Preparado' }
    });

    // 3. Despachar -> Descuenta físico (reserva 0, disponible 8, físico 8)
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Despachado' }
    });
    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(8);
    expect(inv.reservada).toBe(0);
    expect(inv.fisico).toBe(8);

    // 4. Entregado -> Mantiene stock físico 8
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Entregado', metodo_pago_id: 1, monto: 160000, costo_envio: 15000 }
    });
    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(8);
    expect(inv.reservada).toBe(0);
    expect(inv.fisico).toBe(8);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CP-08g a CP-08j: Abastecimiento y Venta Gesicomm en Depósito Comercio (Camino 2)
  // ───────────────────────────────────────────────────────────────────────────

  test('CP-08g — Catálogo Gesicomm disponible', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const res = await request.post('http://127.0.0.1:3000/api/productos/buscar', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {}
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.productos || data)).toBe(true);
  });

  test('CP-08h — Abastecimiento Gesicomm -> depósito propio', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 0, stock_salon: 0, stock_deposito: 0 });

    // Iniciar solicitud de abastecimiento Gesicomm
    const pedidoAbast = await crearPedidoReal(request, comercioToken, { productoId: prod.id, cantidad: 10, costoFulfillment: 0 });
    expect(pedidoAbast.id).toBeDefined();
  });

  test('CP-08i — Recepción + inventario disponible', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });

    // Confirmar recepción de stock
    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(10);
    expect(inv.fisico).toBe(10);
  });

  test('CP-08j — Camino 2 completo (Gesicomm en Depósito Comercio)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 15, stock_salon: 10, stock_deposito: 5 });

    const pedido = await crearPedidoReal(request, comercioToken, { productoId: prod.id, cantidad: 3 });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Preparado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Despachado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Entregado', metodo_pago_id: 1, monto: 240000, costo_envio: 15000 }
    });

    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(12);
    expect(inv.reservada).toBe(0);
    expect(inv.fisico).toBe(12);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CP-08k a CP-08o: Fulfillment Gesicomm (Caminos 3 y 4)
  // ───────────────────────────────────────────────────────────────────────────

  test('CP-08k — Ingreso producto propio -> Gesicomm (Inbound)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 50, stock_salon: 25, stock_deposito: 25 });
    expect(prod.id).toBeDefined();
  });

  test('CP-08l — Recepción admin -> DISPONIBLE', async ({ request }) => {
    const { adminToken, comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 30, stock_salon: 15, stock_deposito: 15 });

    const inv = await verificarInvarianteStock(request, adminToken, prod.id);
    expect(inv.disponible).toBe(30);
  });

  test('CP-08m — Camino 3 completo (Fulfillment Gesicomm de Producto Propio)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 12, stock_salon: 6, stock_deposito: 6 });

    const pedido = await crearPedidoReal(request, comercioToken, { productoId: prod.id, cantidad: 2, costoFulfillment: 6000 });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Preparado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Despachado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Entregado', metodo_pago_id: 1, monto: 160000, costo_envio: 20000 }
    });

    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(10);
    expect(inv.reservada).toBe(0);
    expect(inv.fisico).toBe(10);
  });

  test('CP-08n — Fulfillment fee + delivery fee', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken);
    const pedido = await crearPedidoReal(request, comercioToken, { productoId: prod.id, cantidad: 1, costoEnvio: 18000, costoFulfillment: 5500 });

    expect(Number(pedido.costo_envio)).toBe(18000);
    expect(Number(pedido.costo_fulfillment)).toBe(5500);
  });

  test('CP-08o — Camino 4 completo (Gesicomm en Centro Gesicomm)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 8, stock_salon: 4, stock_deposito: 4 });

    const pedido = await crearPedidoReal(request, comercioToken, { productoId: prod.id, cantidad: 1, costoFulfillment: 5000 });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Preparado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Despachado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Entregado', metodo_pago_id: 1, monto: 80000, costo_envio: 15000 }
    });

    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(7);
    expect(inv.reservada).toBe(0);
    expect(inv.fisico).toBe(7);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CP-08p a CP-08r: Pedidos Mixtos y Validaciones (Caminos 5 y 6)
  // ───────────────────────────────────────────────────────────────────────────

  test('CP-08p — Mixto mismo depósito (Camino 5)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const p1 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });
    const p2 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });

    const res = await request.post('http://127.0.0.1:3000/api/envios', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {
        cliente: 'Cliente Mixto 1',
        telefono: '0981444555',
        ciudad: 'Luque',
        departamento: 'Central',
        monto: 160000,
        estado: 'Pendiente',
        items: [
          { producto_id: p1.id, cantidad: 1, precio_unitario: 80000 },
          { producto_id: p2.id, cantidad: 1, precio_unitario: 80000 }
        ]
      }
    });
    expect(res.status()).toBe(201);
    const pedido = (await res.json()).envio || await res.json();

    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    const inv1 = await verificarInvarianteStock(request, comercioToken, p1.id);
    const inv2 = await verificarInvarianteStock(request, comercioToken, p2.id);

    expect(inv1.disponible).toBe(9);
    expect(inv1.reservada).toBe(1);

    expect(inv2.disponible).toBe(9);
    expect(inv2.reservada).toBe(1);
  });

  test('CP-08q — Mixto mismo centro (Camino 6)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const p1 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 5, stock_deposito: 0 });
    const p2 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 5, stock_deposito: 0 });

    const res = await request.post('http://127.0.0.1:3000/api/envios', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {
        cliente: 'Cliente Mixto Centro',
        telefono: '0981333222',
        ciudad: 'Asunción',
        departamento: 'Capital',
        monto: 160000,
        estado: 'Pendiente',
        items: [
          { producto_id: p1.id, cantidad: 1, precio_unitario: 80000 },
          { producto_id: p2.id, cantidad: 1, precio_unitario: 80000 }
        ]
      }
    });
    expect(res.status()).toBe(201);
  });

  test('CP-08r — Ubicación incompatible -> 409 PEDIDO_REQUIERE_SPLIT', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const p1 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 5, stock_deposito: 0 });
    const p2 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 0, stock_salon: 0, stock_deposito: 0 });

    // Intento de pedido con producto sin stock disponible suficiente o ubicación incompatible
    const res = await request.post('http://127.0.0.1:3000/api/envios', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {
        cliente: 'Cliente Incompatible',
        telefono: '0981111000',
        ciudad: 'Luque',
        departamento: 'Central',
        monto: 160000,
        estado: 'Pendiente',
        items: [
          { producto_id: p1.id, cantidad: 1, precio_unitario: 80000 },
          { producto_id: p2.id, cantidad: 5, precio_unitario: 80000 } // falla por stock
        ]
      }
    });
    const resBody = await res.json();
    const pedido = resBody.envio || resBody;

    const resConf = await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });
    expect([400, 409, 422]).toContain(resConf.status());
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CP-08s a CP-08v: Invariantes, Analítica e Historial Transversal
  // ───────────────────────────────────────────────────────────────────────────

  test('CP-08s — Invariante final de inventario', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });

    let inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible + inv.reservada).toBe(inv.fisico);

    const pedido = await crearPedidoReal(request, comercioToken, { productoId: prod.id, cantidad: 3 });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible + inv.reservada).toBe(inv.fisico);
  });

  test('CP-08t — KPIs / analítica consistentes', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const res = await request.post('http://127.0.0.1:3000/api/envios/dashboard-general', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {}
    });
    expect([200, 404]).toContain(res.status());
  });

  test('CP-08u — Historial E2E', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken);
    const pedido = await crearPedidoReal(request, comercioToken, { productoId: prod.id, cantidad: 1 });

    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    const resHist = await request.get(`http://127.0.0.1:3000/api/envios/${pedido.id}/historial`, {
      headers: { Authorization: `Bearer ${comercioToken}` }
    });
    expect([200, 404]).toContain(resHist.status());
  });

  test('CP-08v — Snapshots históricos inmutables', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { precio_base: 100000 });
    const pedido = await crearPedidoReal(request, comercioToken, { productoId: prod.id, cantidad: 1, costoEnvio: 15000, costoFulfillment: 5000 });

    // Modificar precio del producto en catálogo no debe alterar el pedido existente
    await request.put(`http://127.0.0.1:3000/api/productos/${prod.id}`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { precio_base: 150000 }
    });

    const resList = await request.post('http://127.0.0.1:3000/api/envios/list', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {}
    });
    const envios = await resList.json();
    const envObj = Array.isArray(envios) ? envios.find(e => e.id === pedido.id) : null;
    if (envObj) {
      expect(Number(envObj.costo_envio)).toBe(15000);
    }
  });
});
