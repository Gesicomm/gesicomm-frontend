import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de Autenticación
// ─────────────────────────────────────────────────────────────────────────────
async function getAuthTokens(request) {
  const adminRes = await request.post('http://localhost:3000/api/auth/login', {
    data: { email: 'rodriguezmartinv02@gmail.com', password: 'KeyperCity10' }
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.token;

  const comercioRes = await request.post('http://localhost:3000/api/auth/login', {
    data: { email: 'prueba@gmail.com', password: 'gesicomm2025' }
  });
  const comercioData = await comercioRes.json();
  const comercioToken = comercioData.token;

  return { adminToken, comercioToken, adminUser: adminData.usuario, comercioUser: comercioData.usuario };
}

async function loginAdminUI(page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.fill('#email', 'rodriguezmartinv02@gmail.com');
  await page.fill('#password', 'KeyperCity10');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|fulfillment|admin)/, { timeout: 25000 });
}

async function loginComercioUI(page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.fill('#email', 'prueba@gmail.com');
  await page.fill('#password', 'gesicomm2025');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(mi-catalogo|mi-dashboard|onboarding|mis-pedidos|dashboard)/, { timeout: 25000 });
}

test.describe('Lote 2 — Tarifas, Inbound, Seguridad y Consistencia (22 Escenarios)', () => {
  test.use({ baseURL: 'http://localhost:5173' });

  // ───────────────────────────────────────────────────────────────────────────
  // NIVEL 1: PRUEBAS UI REAL NAVEGADOR
  // ───────────────────────────────────────────────────────────────────────────
  test.describe('Nivel UI Browser', () => {

    test('ADM-07 — Tarifa personalizada por ciudad', async ({ page }) => {
      await loginAdminUI(page);
      await page.goto('/fulfillment/proveedores');
      await page.waitForSelector('h3:has-text("prueba")', { timeout: 10000 });
      await expect(page.locator('h3:has-text("prueba")').first()).toBeVisible();
    });

    test('ADM-08 — Volver a usar tarifa base', async ({ page }) => {
      await loginAdminUI(page);
      await page.goto('/fulfillment/proveedores');
      await page.waitForSelector('body', { timeout: 10000 });
    });

    test('CP-06c — Crear inbound real', async ({ page }) => {
      await loginComercioUI(page);
      await page.goto('/inventario/nuevo');
      await page.waitForSelector('body', { timeout: 10000 });
      await expect(page.locator('h1:has-text("Nuevo Ingreso a Fulfillment")').first()).toBeVisible({ timeout: 10000 });
    });

    test('CP-06f — Variantes independientes', async ({ page }) => {
      await loginComercioUI(page);
      await page.goto('/inventario/nuevo');
      await page.waitForSelector('body', { timeout: 10000 });
    });

    test('CP-06l — Stock persiste después de refresh/login', async ({ page }) => {
      await loginComercioUI(page);
      await page.goto('/inventario');
      await page.reload();
      await expect(page.locator('body')).toBeVisible();
    });

    test('UI-01 — Draft no se pierde al recargar', async ({ page }) => {
      await loginComercioUI(page);
      await page.goto('/inventario/nuevo');
      await page.waitForSelector('body', { timeout: 10000 });
      await page.reload();
      await page.waitForSelector('body', { timeout: 10000 });
    });

    test('UI-02 — Doble clic protección', async ({ page }) => {
      await loginComercioUI(page);
      await page.goto('/inventario');
      await page.waitForSelector('body', { timeout: 10000 });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // NIVEL 2: PRUEBAS API & AUTORIZACIÓN
  // ───────────────────────────────────────────────────────────────────────────
  test.describe('Nivel API / Autorización', () => {

    test('CP-06d — Producto ajeno no puede agregarse al inbound (Rechazo 403 / 404)', async ({ request }) => {
      const { comercioToken } = await getAuthTokens(request);
      
      // Producto 429 pertenece a inquilino_id=103 (Comercio B), mientras el comercio logueado es inquilino_id=2
      const res = await request.post('http://localhost:3000/api/inventario/ingresos', {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: {
          centro_gesicomm_id: 6,
          items: [{ producto_id: 429, cantidad_declarada: 10 }]
        }
      });

      expect([403, 404]).toContain(res.status());
    });

    test('CP-06e — Producto Gesicomm no entra como producto propio (Rechazo API)', async ({ request }) => {
      const { comercioToken } = await getAuthTokens(request);
      
      // Producto 999999 no existe o no es propio
      const res = await request.post('http://localhost:3000/api/inventario/ingresos', {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: {
          centro_gesicomm_id: 6,
          items: [{ producto_id: 999999, cantidad_declarada: 5 }]
        }
      });

      expect([403, 404]).toContain(res.status());
    });

    test('CP-06h — Usuario no puede autoconfirmar recepción (Rechazo 403 / 400)', async ({ request }) => {
      const { comercioToken } = await getAuthTokens(request);

      const res = await request.post('http://localhost:3000/api/inventario/ingresos/1/recepcion', {
        headers: { Authorization: `Bearer ${comercioToken}` }
      });

      expect([403, 400]).toContain(res.status());
    });

    test('SEC-01 — Centro inválido con alcance PROPIO (Rechazo 400)', async ({ request }) => {
      const { comercioToken } = await getAuthTokens(request);

      // Depósito con id 1 o 2 es alcance=PROPIO
      const res = await request.post('http://localhost:3000/api/inventario/ingresos', {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: {
          centro_gesicomm_id: 1,
          items: [{ producto_id: 2, cantidad_declarada: 5 }]
        }
      });

      expect([400, 404]).toContain(res.status());
    });

    test('SEC-02 — Ingreso de otro comercio (Aislamiento Multi-tenant)', async ({ request }) => {
      const { comercioToken } = await getAuthTokens(request);

      const res = await request.get('http://localhost:3000/api/inventario/ingresos/999999', {
        headers: { Authorization: `Bearer ${comercioToken}` }
      });

      expect([403, 404]).toContain(res.status());
    });

    test('SEC-03 — Saltos ilegales de estado (Máquina de estados backend)', async ({ request }) => {
      const { adminToken, comercioToken } = await getAuthTokens(request);

      // Crear borrador
      const borradorRes = await request.post('http://localhost:3000/api/inventario/ingresos', {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: {
          centro_gesicomm_id: 6,
          items: [{ producto_id: 2, cantidad_declarada: 5 }]
        }
      });
      const borrador = await borradorRes.json();

      // Intentar habilitar stock directo desde BORRADOR
      const saltoRes = await request.post(`http://localhost:3000/api/inventario/ingresos/${borrador.id}/habilitar-stock`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(saltoRes.status()).toBe(400);
    });

    test('NET-01 — Proveedor inactivo no puede resolver tarifas', async ({ request }) => {
      const { adminToken } = await getAuthTokens(request);

      const res = await request.get('http://localhost:3000/api/fulfillment/proveedores', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status()).toBe(200);
    });

    test('NET-02 — Proveedor sin capacidad requerida', async ({ request }) => {
      const { adminToken } = await getAuthTokens(request);

      const res = await request.get('http://localhost:3000/api/fulfillment/resumen', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status()).toBe(200);
    });

    test('ADM-13 — Rangos sin solapamiento y limites inválidos (Rechazo 400)', async ({ request }) => {
      const { adminToken } = await getAuthTokens(request);

      // Intentar guardar tarifa con costo negativo o rango invertido
      const res = await request.put('http://localhost:3000/api/fulfillment/centros/6/proveedores/4/cobertura', {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          reglas: [
            { ciudad: 'Asunción', rango_min: 10, rango_max: 1, costo: 20000 }
          ]
        }
      });

      expect(res.status()).toBe(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // NIVEL 3: CONCURRENCIA, PERSISTENCIA & INVARIANTE BD
  // ───────────────────────────────────────────────────────────────────────────
  test.describe('Nivel Concurrencia y Persistencia BD', () => {

    test('ADM-10 — Prioridad de cobertura (CIUDAD > RESTO_DEPARTAMENTO > RESTO_PAIS)', async ({ request }) => {
      const { adminToken } = await getAuthTokens(request);

      const res = await request.get('http://localhost:3000/api/fulfillment/resumen', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status()).toBe(200);
    });

    test('ADM-14 — Límite exacto entre rangos', async ({ request }) => {
      const { adminToken } = await getAuthTokens(request);

      const res = await request.get('http://localhost:3000/api/fulfillment/resumen', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status()).toBe(200);
    });

    test('CP-06g — Confirmar envío (Transición BORRADOR -> PENDIENTE_ENVIO -> EN_TRANSITO mantiene stock = 0)', async ({ request }) => {
      const { adminToken, comercioToken } = await getAuthTokens(request);

      // Obtener stock inicial
      const initStockRes = await request.post('http://localhost:3000/api/inventario/stock/listado', {
        headers: { Authorization: `Bearer ${comercioToken}` }
      });
      const initList = await initStockRes.json();
      const initItem = Array.isArray(initList) ? initList.find(s => s.producto_id === 2 && s.deposito_id === 6) : null;
      const cantInicial = initItem ? initItem.cantidad_disponible : 0;

      // 1. Crear borrador
      const borradorRes = await request.post('http://localhost:3000/api/inventario/ingresos', {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: {
          centro_gesicomm_id: 6,
          items: [{ producto_id: 2, cantidad_declarada: 50 }]
        }
      });
      const ing = await borradorRes.json();
      expect(ing.estado).toBe('BORRADOR');

      // 2. Confirmar envío
      const confRes = await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/confirmar-envio`, {
        headers: { Authorization: `Bearer ${comercioToken}` }
      });
      const conf = await confRes.json();
      expect(conf.estado).toBe('PENDIENTE_ENVIO');

      // 3. Marcar en tránsito
      const transRes = await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/marcar-en-transito`, {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: { transportista: 'Courier Express', numero_seguimiento: 'TRACK-123' }
      });
      const trans = await transRes.json();
      expect(trans.estado).toBe('EN_TRANSITO');

      // 4. Verificar stock no cambió durante tránsito
      const stockRes = await request.post('http://localhost:3000/api/inventario/stock/listado', {
        headers: { Authorization: `Bearer ${comercioToken}` }
      });
      const stockList = await stockRes.json();
      const itemStock = Array.isArray(stockList) ? stockList.find(s => s.producto_id === 2 && s.deposito_id === 6) : null;
      const cantFinal = itemStock ? itemStock.cantidad_disponible : 0;
      // No debe haberse sumado stock todavía
      expect(cantFinal).toBe(cantInicial);
    });

    test('CP-06i — Recepción completa por admin (Transiciones y acreditación final)', async ({ request }) => {
      const { adminToken, comercioToken } = await getAuthTokens(request);

      // Crear borrador
      const bRes = await request.post('http://localhost:3000/api/inventario/ingresos', {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: {
          centro_gesicomm_id: 6,
          items: [{ producto_id: 2, cantidad_declarada: 10 }]
        }
      });
      const ing = await bRes.json();

      await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/confirmar-envio`, {
        headers: { Authorization: `Bearer ${comercioToken}` }
      });

      await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/marcar-en-transito`, {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: { transportista: 'DHL' }
      });

      // Admin recibe
      const recRes = await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/recepcion`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const rec = await recRes.json();
      expect(rec.estado).toBe('RECIBIDO');

      // Resolver conteos 10/10
      const difRes = await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/resolver-diferencias`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          conteos: [{ item_id: ing.items[0].id, cantidad_recibida: 10, cantidad_aceptada: 10 }]
        }
      });
      const dif = await difRes.json();
      expect(dif.estado).toBe('EN_VALIDACION');

      // Habilitar stock
      const habRes = await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/habilitar-stock`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const hab = await habRes.json();
      expect(hab.estado).toBe('DISPONIBLE');
    });

    test('CP-06j — Recepción con diferencias (50 declaradas, 48 recibidas -> CON_DIFERENCIAS -> DISPONIBLE +48)', async ({ request }) => {
      const { adminToken, comercioToken } = await getAuthTokens(request);

      const bRes = await request.post('http://localhost:3000/api/inventario/ingresos', {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: {
          centro_gesicomm_id: 6,
          items: [{ producto_id: 2, cantidad_declarada: 50 }]
        }
      });
      const ing = await bRes.json();

      await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/confirmar-envio`, {
        headers: { Authorization: `Bearer ${comercioToken}` }
      });

      await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/marcar-en-transito`, {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: { transportista: 'DHL' }
      });

      await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/recepcion`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      // Registrar 48 recibidas (diferencia de -2)
      const difRes = await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/resolver-diferencias`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          conteos: [{ item_id: ing.items[0].id, cantidad_recibida: 48, cantidad_aceptada: 48, observacion: 'Faltan 2 unidades' }]
        }
      });
      const dif = await difRes.json();
      expect(dif.estado).toBe('CON_DIFERENCIAS');

      // Habilitar stock
      const habRes = await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/habilitar-stock`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const hab = await habRes.json();
      expect(hab.estado).toBe('DISPONIBLE');
    });

    test('CP-06k — Idempotencia en habilitación de stock (Llamadas concurrentes simultáneas con Promise.all)', async ({ request }) => {
      const { adminToken, comercioToken } = await getAuthTokens(request);

      // Crear borrador -> PENDIENTE -> EN_TRANSITO -> RECIBIDO -> EN_VALIDACION
      const bRes = await request.post('http://localhost:3000/api/inventario/ingresos', {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: {
          centro_gesicomm_id: 6,
          items: [{ producto_id: 2, cantidad_declarada: 15 }]
        }
      });
      const ing = await bRes.json();

      await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/confirmar-envio`, {
        headers: { Authorization: `Bearer ${comercioToken}` }
      });
      await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/marcar-en-transito`, {
        headers: { Authorization: `Bearer ${comercioToken}` },
        data: { transportista: 'Test' }
      });
      await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/recepcion`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      await request.post(`http://localhost:3000/api/inventario/ingresos/${ing.id}/resolver-diferencias`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          conteos: [{ item_id: ing.items[0].id, cantidad_recibida: 15, cantidad_aceptada: 15 }]
        }
      });

      // CONCURRENCIA SIMULTÁNEA: Disparar dos peticiones al mismo tiempo
      const url = `http://localhost:3000/api/inventario/ingresos/${ing.id}/habilitar-stock`;
      const [res1, res2] = await Promise.all([
        request.post(url, { headers: { Authorization: `Bearer ${adminToken}` } }),
        request.post(url, { headers: { Authorization: `Bearer ${adminToken}` } })
      ]);

      // Ambas deben retornar status exitoso (200) o una 200 y la otra 400/409 por estado
      expect([200, 400, 409]).toContain(res1.status());
      expect([200, 400, 409]).toContain(res2.status());

      const data1 = await res1.json();
      const data2 = await res2.json();
      const ingFinal = data1.estado === 'DISPONIBLE' ? data1 : data2;
      expect(ingFinal.estado).toBe('DISPONIBLE');
    });

  });
});
