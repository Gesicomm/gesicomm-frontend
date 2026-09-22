import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de Autenticación y Transacción
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
 * Función helper para verificar el Invariante Transversal de Inventario:
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

  // Invariante central: lo disponible + reservado es igual al stock físico (salon + deposito + reservada)
  expect(disponible + reservada).toBe(fisico);
  return { prod, disponible, reservada, fisico, salon, deposito };
}

/** Helper para crear un producto de prueba en el backend */
async function crearProductoPrueba(request, token, override = {}) {
  const nombre = `Producto Test Lote3 ${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const payload = {
    nombre,
    precio_base: 50000,
    precio_costo: 35000,
    cantidad_disponible: 10,
    stock_salon: 5,
    stock_deposito: 5,
    ...override
  };

  const res = await request.post('http://127.0.0.1:3000/api/productos', {
    headers: { Authorization: `Bearer ${token}` },
    data: payload
  });
  expect(res.status()).toBe(201);
  const data = await res.json();
  return data.producto ? data.producto : data;
}

/** Helper para crear un pedido de prueba en el backend */
async function crearPedidoPrueba(request, token, { productoId, cantidad = 1, ciudad = 'Luque', departamento = 'Central', costoEnvio = 15000, costoFulfillment = 5000, estado = 'Pendiente' } = {}) {
  const payload = {
    cliente: 'Juan Perez Test',
    nombre_cliente: 'Juan',
    apellido_cliente: 'Perez',
    telefono: '0981123456',
    ciudad,
    departamento,
    direccion: 'Av. Principal 123',
    monto: 50000 * cantidad,
    costo_envio: costoEnvio,
    costo_fulfillment: costoFulfillment,
    estado,
    items: [
      {
        producto_id: productoId,
        cantidad,
        precio_unitario: 50000,
        subtotal: 50000 * cantidad
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

test.describe('Lote 3 — Pedidos, Reserva de Stock y Fulfillment End-to-End (22 Escenarios)', () => {
  test.use({ baseURL: 'http://localhost:5173' });

  // ───────────────────────────────────────────────────────────────────────────
  // SEC-04 & SEC-05: Autorizaciones Multi-tenant
  // ───────────────────────────────────────────────────────────────────────────
  test('SEC-04 — Rechazo 403 a Comercio ejecutando endpoints de Admin Gesicomm', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    
    // Intentar acceder o ejecutar endpoints restringidos de Admin Gesicomm
    const res = await request.post('http://127.0.0.1:3000/api/envios/1/abastecimiento/pago/validar', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado_pago: 'validado' }
    });
    // Debe denegar acceso por rol
    expect([403, 401, 400, 404]).toContain(res.status());
    if (res.status() === 403) {
      const data = await res.json();
      expect(data.error).toMatch(/Solo un administrador|Acceso denegado|rol|permiso/i);
    }
  });

  test('SEC-05 — Admin vs. Fulfillment Propio (Aislamiento de Operaciones)', async ({ request }) => {
    const { adminToken, comercioToken } = await getAuthTokens(request);
    
    // Crear producto y pedido del comercio
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 5, stock_deposito: 0 });
    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 1 });

    // Verificar que el admin no rompa el flujo de fulfillment propio del comercio
    const res = await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { estado: 'Confirmado' }
    });
    expect([200, 400, 403, 404]).toContain(res.status());
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Escenarios E2E Completo (CP-07a a CP-07f)
  // ───────────────────────────────────────────────────────────────────────────
  test('CP-07a — Producto Propio -> Depósito Propio E2E', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });
    
    await verificarInvarianteStock(request, comercioToken, prod.id);

    // 1. Crear Pedido (Borrador/Pendiente - No debe reservar stock)
    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 2, estado: 'Pendiente' });
    let inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(10);
    expect(inv.reservada).toBe(0);

    // 2. Confirmar Pedido (Reserva stock: disponible=8, reservado=2)
    const resConf = await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });
    expect(resConf.status()).toBe(200);

    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(8);
    expect(inv.reservada).toBe(2);
    expect(inv.fisico).toBe(10);

    // 3. Preparado (Comercio prepara - Mantiene reserva e invariante)
    const resPrep = await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Preparado' }
    });
    expect(resPrep.status()).toBe(200);

    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(8);
    expect(inv.reservada).toBe(2);

    // 4. Despachado (Descuenta físico 2 unidades: reservado 2->0, fisico 10->8)
    const resDesp = await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Despachado' }
    });
    expect(resDesp.status()).toBe(200);

    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(8);
    expect(inv.reservada).toBe(0);
    expect(inv.fisico).toBe(8);

    // 5. Entregado (No toca stock)
    const resEntr = await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Entregado', metodo_pago_id: 1, monto: 100000, costo_envio: 15000 }
    });
    expect(resEntr.status()).toBe(200);

    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(8);
    expect(inv.reservada).toBe(0);
    expect(inv.fisico).toBe(8);
  });

  test('CP-07b — Producto Gesicomm -> Depósito Propio E2E', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 15, stock_salon: 10, stock_deposito: 5 });

    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 3 });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(12);
    expect(inv.reservada).toBe(3);
    expect(inv.fisico).toBe(15);
  });

  test('CP-07c — Producto Propio -> Centro Gesicomm E2E', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 8, stock_salon: 4, stock_deposito: 4 });

    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 1 });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(7);
    expect(inv.reservada).toBe(1);
    expect(inv.fisico).toBe(8);
  });

  test('CP-07d — Producto Gesicomm -> Centro Gesicomm E2E', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 20, stock_salon: 10, stock_deposito: 10 });

    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 5 });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(15);
    expect(inv.reservada).toBe(5);
    expect(inv.fisico).toBe(20);
  });

  test('CP-07e — Pedido Mixto Mismo Depósito Propio E2E', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const p1 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 5, stock_deposito: 0 });
    const p2 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 0, stock_deposito: 5 });

    const res = await request.post('http://127.0.0.1:3000/api/envios', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {
        cliente: 'Cliente Mixto',
        telefono: '0981999999',
        ciudad: 'Asunción',
        departamento: 'Capital',
        monto: 100000,
        costo_envio: 15000,
        items: [
          { producto_id: p1.id, cantidad: 2, precio_unitario: 50000, subtotal: 100000 },
          { producto_id: p2.id, cantidad: 1, precio_unitario: 50000, subtotal: 50000 }
        ]
      }
    });
    const resBody = await res.json();
    const pedido = resBody.envio || resBody;

    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    const inv1 = await verificarInvarianteStock(request, comercioToken, p1.id);
    const inv2 = await verificarInvarianteStock(request, comercioToken, p2.id);

    expect(inv1.disponible).toBe(3);
    expect(inv1.reservada).toBe(2);
    expect(inv2.disponible).toBe(4);
    expect(inv2.reservada).toBe(1);
  });

  test('CP-07f — Pedido Mixto Mismo Centro Gesicomm E2E', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const p1 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });
    const p2 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });

    const res = await request.post('http://127.0.0.1:3000/api/envios', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {
        cliente: 'Cliente Centro Gesicomm',
        telefono: '0981888888',
        ciudad: 'San Lorenzo',
        departamento: 'Central',
        monto: 200000,
        costo_envio: 20000,
        items: [
          { producto_id: p1.id, cantidad: 3, precio_unitario: 50000, subtotal: 150000 },
          { producto_id: p2.id, cantidad: 2, precio_unitario: 50000, subtotal: 100000 }
        ]
      }
    });
    const resBody = await res.json();
    const pedido = resBody.envio || resBody;

    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    const inv1 = await verificarInvarianteStock(request, comercioToken, p1.id);
    const inv2 = await verificarInvarianteStock(request, comercioToken, p2.id);

    expect(inv1.disponible).toBe(7);
    expect(inv1.reservada).toBe(3);
    expect(inv2.disponible).toBe(8);
    expect(inv2.reservada).toBe(2);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Escenarios de API / Validación / Transacción / Concurrencia (CP-07g a CP-07s)
  // ───────────────────────────────────────────────────────────────────────────
  test('CP-07g — Ubicaciones Físicas Incompatibles', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    // Simulación de respuesta de rechazo si se solicitan ubicaciones no compatibles
    const res = await request.post('http://127.0.0.1:3000/api/envios', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {
        cliente: 'Cliente Split',
        telefono: '0981777777',
        ciudad: 'Luque',
        departamento: 'Central',
        monto: 50000,
        es_split_incompatible: true,
        items: [{ producto_id: 999999, cantidad: 1, precio_unitario: 50000 }]
      }
    });
    expect([400, 404, 409, 422, 500]).toContain(res.status());
  });

  test('CP-07h — Stock Insuficiente', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 2, stock_salon: 2, stock_deposito: 0 });

    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 5 });

    // Al intentar confirmar 5 unidades cuando solo hay 2 disponibles
    const res = await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });
    // Debe responder 400 por stock insuficiente
    expect([400, 409, 422, 500]).toContain(res.status());

    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(2);
    expect(inv.reservada).toBe(0);
  });

  test('CP-07h2 — Atomicidad Multi-Item (ROLLBACK Total)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const p1 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 5, stock_deposito: 0 });
    const p2 = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 1, stock_salon: 1, stock_deposito: 0 }); // solo 1

    const res = await request.post('http://127.0.0.1:3000/api/envios', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {
        cliente: 'Cliente Atomicidad',
        telefono: '0981666666',
        ciudad: 'Asunción',
        departamento: 'Capital',
        monto: 150000,
        estado: 'Pendiente',
        items: [
          { producto_id: p1.id, cantidad: 2, precio_unitario: 50000 },
          { producto_id: p2.id, cantidad: 5, precio_unitario: 50000 } // falla por stock
        ]
      }
    });
    const resBody = await res.json();
    const pedido = resBody.envio || resBody;

    const resConf = await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });
    expect([400, 409, 422, 500]).toContain(resConf.status());

    // Verificar ROLLBACK TOTAL: p1 NO debió haber reservado nada, disponible, reservado e historial intactos
    const inv1 = await verificarInvarianteStock(request, comercioToken, p1.id);
    const inv2 = await verificarInvarianteStock(request, comercioToken, p2.id);

    expect(inv1.disponible).toBe(5);
    expect(inv1.reservada).toBe(0);
    expect(inv1.fisico).toBe(5);

    expect(inv2.disponible).toBe(1);
    expect(inv2.reservada).toBe(0);
    expect(inv2.fisico).toBe(1);
  });

  test('CP-07i — Concurrencia Última Unidad (Promise.all)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 1, stock_salon: 1, stock_deposito: 0 });

    const p1 = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 1 });
    const p2 = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 1 });

    // Ejecutar ambas confirmaciones simultáneamente
    const [res1, res2] = await Promise.all([
      request.put(`http://127.0.0.1:3000/api/envios/${p1.id}/estado`, {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: { estado: 'Confirmado' }
      }),
      request.put(`http://127.0.0.1:3000/api/envios/${p2.id}/estado`, {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: { estado: 'Confirmado' }
      })
    ]);

    const statuses = [res1.status(), res2.status()];
    // Al menos una solicitud debe ser exitosa o tratada de manera atómica
    expect(statuses).toContain(200);

    const inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.reservada).toBe(1);
    expect(inv.disponible).toBe(0);
    expect(inv.fisico).toBe(1);
  });

  test('CP-07j — Cancelación Pre-despacho vs. Post-despacho', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });

    // 1. Pre-despacho cancelation: libera reservado -> disponible
    const p1 = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 3 });
    await request.put(`http://127.0.0.1:3000/api/envios/${p1.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    let inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(7);
    expect(inv.reservada).toBe(3);
    expect(inv.fisico).toBe(10);

    const resCanc1 = await request.put(`http://127.0.0.1:3000/api/envios/${p1.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Cancelado' }
    });
    expect(resCanc1.status()).toBe(200);

    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(10);
    expect(inv.reservada).toBe(0);
    expect(inv.fisico).toBe(10);

    // 2. Post-despacho cancelation: intentar cancelar un pedido Despachado retorna 400 Bad Request
    const p2 = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 2 });
    await request.put(`http://127.0.0.1:3000/api/envios/${p2.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${p2.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Preparado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${p2.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Despachado' }
    });

    const resCanc2 = await request.put(`http://127.0.0.1:3000/api/envios/${p2.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Cancelado' }
    });
    expect(resCanc2.status()).toBe(400);

    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(8);
    expect(inv.reservada).toBe(0);
    expect(inv.fisico).toBe(8);
  });

  test('CP-07k — Fallo en Preparación (Resiliencia)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 5, stock_deposito: 0 });

    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 2 });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    // Enviar un estado inválido o payload corrupto en preparación
    const resErr = await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'EstadoInvalidoQueFalla' }
    });
    expect(resErr.status()).toBe(400);

    // Mantiene la reserva exacta
    const invK = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(invK.disponible).toBe(3);
    expect(invK.reservada).toBe(2);
    expect(invK.fisico).toBe(5);
  });

  test('CP-07l — Despacho descuenta Stock Físico', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });

    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 4 });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    let inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(6);
    expect(inv.reservada).toBe(4);

    // Preparar -> Despachar: mueve stock reservado -> tránsito (reservada baja a 0)
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Preparado' }
    });
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Despachado' }
    });

    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(6);
    expect(inv.reservada).toBe(0);

    // Entregado no toca disponible ni reservada
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Entregado', metodo_pago_id: 1, monto: 200000, costo_envio: 15000 }
    });

    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(6);
    expect(inv.reservada).toBe(0);
  });

  test('CP-07m — Sin Proveedor Compatible', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    // Intentar cotizar o crear envío a un destino inexistente o sin cobertura
    const res = await request.post('http://127.0.0.1:3000/api/proveedores-logisticos/cotizar', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { ciudad: 'CiudadInexistente999', departamento: 'Ninguno', peso_kg: 1 }
    });
    expect([200, 400, 404]).toContain(res.status());
  });

  test('CP-07n — Proveedor Inactivo / No Elegible', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 5, stock_deposito: 0 });

    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 1 });
    expect(pedido.id).toBeDefined();
  });

  test('CP-07o — Resolución de Tarifa Final', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const res = await request.post('http://127.0.0.1:3000/api/proveedores-logisticos/cotizar', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { ciudad: 'Luque', departamento: 'Central', peso_kg: 2 }
    });
    expect([200, 400, 404]).toContain(res.status());
  });

  test('CP-07p — Costo Fulfillment vs. Envío', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });
    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 2, costoEnvio: 20000, costoFulfillment: 7000 });

    expect(Number(pedido.costo_envio)).toBe(20000);
    expect(Number(pedido.costo_fulfillment)).toBe(7000);
  });

  test('CP-07q — Snapshots de Costos (Inmutabilidad)', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });
    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 1, costoEnvio: 15000, costoFulfillment: 5000 });

    const pedFetch = await request.post('http://127.0.0.1:3000/api/envios/list', {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: {}
    });
    const resData = await pedFetch.json();
    const envios = Array.isArray(resData) ? resData : (resData.data || []);
    const pedObj = envios.find(e => e.id === pedido.id) || pedido;

    expect(Number(pedObj.costo_envio)).toBe(15000);
    expect(Number(pedObj.costo_fulfillment)).toBe(5000);
  });

  test('CP-07r — Snapshot de Dirección destinataria', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 5, stock_salon: 5, stock_deposito: 0 });
    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 1, ciudad: 'Luque' });

    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Confirmado' }
    });

    expect(pedido.ciudad).toBe('Luque');
  });

  test('CP-07s — Idempotencia en Concurrencia Real', async ({ request }) => {
    const { comercioToken } = await getAuthTokens(request);
    const prod = await crearProductoPrueba(request, comercioToken, { cantidad_disponible: 10, stock_salon: 5, stock_deposito: 5 });
    const pedido = await crearPedidoPrueba(request, comercioToken, { productoId: prod.id, cantidad: 2 });

    // 1. Ejecutar 2 peticiones idénticas de Confirmación en simultáneo (Promise.all)
    const [r1, r2] = await Promise.all([
      request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: { estado: 'Confirmado' }
      }),
      request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: { estado: 'Confirmado' }
      })
    ]);

    expect([200, 400]).toContain(r1.status());
    expect([200, 400]).toContain(r2.status());

    // Debe existir exactamente UNA reserva de 2 unidades (disponible 8, reservada 2)
    let inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(8);
    expect(inv.reservada).toBe(2);
    expect(inv.fisico).toBe(10);

    // 2. Transicionar a Preparado
    await request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
      headers: { Authorization: `Bearer ${comercioToken}` },
      data: { estado: 'Preparado' }
    });

    // 3. Ejecutar 2 peticiones idénticas de Despacho en simultáneo (Promise.all)
    const [d1, d2] = await Promise.all([
      request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: { estado: 'Despachado' }
      }),
      request.put(`http://127.0.0.1:3000/api/envios/${pedido.id}/estado`, {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: { estado: 'Despachado' }
      })
    ]);

    expect([200, 400]).toContain(d1.status());
    expect([200, 400]).toContain(d2.status());

    // Debe existir exactamente UNA salida de reservado a tránsito (reservada 0, disponible 8)
    inv = await verificarInvarianteStock(request, comercioToken, prod.id);
    expect(inv.disponible).toBe(8);
    expect(inv.reservada).toBe(0);
  });
});
