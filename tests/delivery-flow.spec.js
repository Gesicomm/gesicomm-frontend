// Recorre el flujo real de la pestaña Delivery en un navegador: crear el
// courier y, en el mismo asistente, sus ciudades del departamento Central con
// rangos por cantidad (minorista / mayorista) y por tipo de pago.
//
// El backend va mockeado imitando courierController — replaceZonasDelivery
// borra y recrea todo, y descarta courier_id que no existan — siguiendo la
// convención de los demás specs del repo.
import { test, expect } from '@playwright/test';

const APP = 'http://localhost:5173';

function backendFalso() {
  return { couriers: [], zonas: [], nextCourier: 1, nextZona: 1 };
}

async function montarBackend(page, db) {
  await page.route('**/localhost:3000/api/**', async route => {
    const req = route.request();
    const ruta = new URL(req.url()).pathname.replace(/^\/api/, '');
    const metodo = req.method();
    const json = (body, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

    if (ruta === '/auth/me') {
      return json({ id: 1, nombre: 'Tester', email: 'tester@gesicomm.test', rol: 'admin' });
    }

    if (ruta === '/couriers/zonas-delivery') {
      if (metodo === 'GET') return json(db.zonas);
      if (metodo === 'PUT') {
        const permitidos = new Set(db.couriers.map(c => Number(c.id)));
        const entrantes = req.postDataJSON()?.zonas || [];
        db.zonas = entrantes
          .filter(z => String(z.ciudad || '').trim())
          .map(z => ({
            id: db.nextZona++,
            usuario_id: 1,
            courier_id: permitidos.has(Number(z.courier_id)) ? Number(z.courier_id) : null,
            departamento: z.departamento || null,
            ciudad: String(z.ciudad).trim(),
            tipo_pago: z.tipo_pago || 'Ambos',
            rango_min: Number(z.rango_min) || 0,
            rango_max: z.rango_max === null || z.rango_max === undefined ? null : Number(z.rango_max),
            costo: Number(z.costo) || 0,
            tiempo_entrega_hs: z.tiempo_entrega_hs || null,
            activo: z.activo !== false,
          }));
        return json(db.zonas);
      }
    }

    if (ruta === '/couriers') {
      if (metodo === 'GET') return json(db.couriers);
      if (metodo === 'POST') {
        const creado = { id: db.nextCourier++, usuario_id: 1, ...(req.postDataJSON() || {}), tarifas: [] };
        db.couriers.push(creado);
        return json(creado, 201);
      }
    }

    const esCourier = ruta.match(/^\/couriers\/(\d+)$/);
    if (esCourier) {
      const id = Number(esCourier[1]);
      if (metodo === 'PUT') {
        db.couriers = db.couriers.map(c => c.id === id ? { ...c, ...(req.postDataJSON() || {}), id } : c);
        return json(db.couriers.find(c => c.id === id));
      }
      if (metodo === 'DELETE') {
        db.couriers = db.couriers.filter(c => c.id !== id);
        return json({ success: true });
      }
    }

    if (ruta === '/metodos-pago') return json([]);
    return json([]);
  });
}

function vigilarErrores(page) {
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (/favicon|Failed to load resource/.test(m.text())) return;
    errores.push(m.text());
  });
  return errores;
}

async function irADelivery(page) {
  await page.goto(`${APP}/mis-pedidos`);
  await page.getByRole('button', { name: 'Delivery' }).click();
  await expect(page.getByRole('heading', { name: 'Delivery' })).toBeVisible();
}

/** Completa la tarjeta de ciudad `indice` del paso "Ciudades" con sus rangos. */
async function cargarCiudad(page, indice, { departamento, ciudad, rangos }) {
  const tarjeta = page.locator('form section').nth(indice);

  await tarjeta.getByLabel('Departamento').fill(departamento);
  await tarjeta.getByLabel('Ciudad', { exact: true }).fill(ciudad);

  for (let i = 0; i < rangos.length; i++) {
    if (i > 0) await tarjeta.getByRole('button', { name: /^Agregar rango a/ }).click();
    const r = rangos[i];

    await tarjeta.getByLabel('Cantidad mínima de productos').nth(i).fill(String(r.min));

    const sinLimite = tarjeta.getByLabel('Sin límite máximo').nth(i);
    if (r.max === null) {
      if (!(await sinLimite.isChecked())) await sinLimite.check();
    } else {
      if (await sinLimite.isChecked()) await sinLimite.uncheck();
      await tarjeta.getByLabel('Cantidad máxima de productos').nth(i).fill(String(r.max));
    }

    await tarjeta.getByLabel('Método de pago aceptado').nth(i).selectOption(r.pago);
    await tarjeta.getByLabel('Costo de envío').nth(i).fill(String(r.costo));
    await tarjeta.getByLabel('Tiempo estimado de entrega').nth(i).fill(r.entrega);
  }
}

test('crea un courier con sus ciudades de Central, por rango y tipo de pago', async ({ page }) => {
  const db = backendFalso();
  await montarBackend(page, db);
  const errores = vigilarErrores(page);

  await irADelivery(page);
  await page.screenshot({ path: 'test-results/delivery-01-vacio.png', fullPage: true });

  await page.getByRole('button', { name: /Crear primer courier|Nuevo courier/ }).first().click();
  await page.getByLabel('Nombre del courier o empresa').fill('Propio');
  await page.getByLabel('Teléfono de contacto').fill('0981 111 222');
  await page.getByLabel('Tipo de vehículo').selectOption('Moto');
  await page.screenshot({ path: 'test-results/delivery-02-paso-courier.png', fullPage: true });
  await page.getByRole('button', { name: 'Continuar con ciudades' }).click();

  // Luque: minorista contra entrega vs anticipado, y mayorista desde 4.
  await cargarCiudad(page, 0, {
    departamento: 'Central',
    ciudad: 'Luque',
    rangos: [
      { min: 1, max: 3, pago: 'Al Recibir', costo: 15000, entrega: 'En el día' },
      { min: 1, max: 3, pago: 'Anticipado', costo: 12000, entrega: 'En el día' },
      { min: 4, max: null, pago: 'Ambos', costo: 10000, entrega: '24 hs' },
    ],
  });

  await page.getByRole('dialog').getByRole('button', { name: 'Agregar ciudad', exact: true }).click();
  await cargarCiudad(page, 1, {
    departamento: 'Central',
    ciudad: 'Asunción',
    rangos: [
      { min: 1, max: 3, pago: 'Al Recibir', costo: 25000, entrega: 'En el día' },
      { min: 4, max: null, pago: 'Ambos', costo: 19000, entrega: '24 hs' },
    ],
  });

  await page.getByRole('dialog').getByRole('button', { name: 'Agregar ciudad', exact: true }).click();
  await cargarCiudad(page, 2, {
    departamento: 'Central',
    ciudad: 'Fernando de la Mora',
    rangos: [
      { min: 1, max: 5, pago: 'Ambos', costo: 20000, entrega: 'En el día' },
      { min: 6, max: null, pago: 'Ambos', costo: 16000, entrega: '24 hs' },
    ],
  });

  await page.screenshot({ path: 'test-results/delivery-03-paso-ciudades.png', fullPage: true });
  await page.getByRole('button', { name: 'Revisar' }).click();
  await expect(page.getByText('Luque, Central')).toBeVisible();
  await page.screenshot({ path: 'test-results/delivery-04-resumen.png', fullPage: true });

  await page.getByRole('button', { name: 'Guardar courier y ciudades' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Propio' })).toBeVisible();
  await page.screenshot({ path: 'test-results/delivery-05-guardado.png', fullPage: true });

  expect(db.couriers).toHaveLength(1);
  expect(db.zonas).toHaveLength(7);
  expect(db.zonas.every(z => z.courier_id === 1)).toBe(true);
  expect(db.zonas.filter(z => z.ciudad === 'Luque').map(z => z.costo).sort((a, b) => a - b))
    .toEqual([10000, 12000, 15000]);
  const mayoristaLuque = db.zonas.find(z => z.ciudad === 'Luque' && z.rango_min === 4);
  expect(mayoristaLuque.rango_max).toBeNull();
  expect(db.zonas.find(z => z.ciudad === 'Asunción' && z.tipo_pago === 'Al Recibir').costo).toBe(25000);

  // Asunción quedó con el tramo 1-3 solo para contra entrega: un pedido
  // anticipado de esa cantidad cotizaría la tarifa mayorista. El panel avisa.
  const aviso = page.getByText('Asunción: de 1 a 3 productos no tiene tarifa "Anticipado"');
  await aviso.scrollIntoViewIfNeeded();
  await expect(aviso).toBeVisible();
  await page.screenshot({ path: 'test-results/delivery-11-aviso-cobertura.png' });

  expect(errores).toEqual([]);
});

test('segundo courier sobre la misma ciudad y ajuste en la grilla', async ({ page }) => {
  const db = backendFalso();
  await montarBackend(page, db);
  const errores = vigilarErrores(page);

  await irADelivery(page);

  await page.getByRole('button', { name: /Crear primer courier|Nuevo courier/ }).first().click();
  await page.getByLabel('Nombre del courier o empresa').fill('Propio');
  await page.getByRole('button', { name: 'Continuar con ciudades' }).click();
  await cargarCiudad(page, 0, {
    departamento: 'Central',
    ciudad: 'Luque',
    rangos: [{ min: 1, max: null, pago: 'Ambos', costo: 15000, entrega: 'En el día' }],
  });
  await page.getByRole('button', { name: 'Revisar' }).click();
  await page.getByRole('button', { name: 'Guardar courier y ciudades' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Propio' })).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo courier' }).click();
  await page.getByLabel('Nombre del courier o empresa').fill('TSI');
  await page.getByLabel('Tipo de vehículo').selectOption('Camioneta');
  await page.getByRole('button', { name: 'Continuar con ciudades' }).click();
  await cargarCiudad(page, 0, {
    departamento: 'Central',
    ciudad: 'Luque',
    rangos: [{ min: 1, max: null, pago: 'Anticipado', costo: 13000, entrega: '48 hs' }],
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Agregar ciudad', exact: true }).click();
  await cargarCiudad(page, 1, {
    departamento: 'Central',
    ciudad: 'Capiatá',
    rangos: [{ min: 1, max: null, pago: 'Ambos', costo: 22000, entrega: '24 hs' }],
  });
  await page.getByRole('button', { name: 'Revisar' }).click();
  await page.getByRole('button', { name: 'Guardar courier y ciudades' }).click();
  // El asistente recién se cierra cuando terminó de persistir las zonas.
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Guardar el segundo courier no puede pisar las reglas del primero: el
  // endpoint reemplaza TODAS las zonas del usuario.
  await expect(page.getByRole('heading', { name: 'TSI' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Propio' })).toBeVisible();
  expect(db.zonas.filter(z => z.courier_id === 1)).toHaveLength(1);
  expect(db.zonas.filter(z => z.courier_id === 2)).toHaveLength(2);
  await page.screenshot({ path: 'test-results/delivery-06-dos-couriers.png', fullPage: true });

  await page.getByRole('button', { name: 'Ciudad', exact: true }).click();
  const luque = page.locator('section').filter({ hasText: 'Luque, Central' }).first();
  await expect(luque.getByText('Propio')).toBeVisible();
  await expect(luque.getByText('TSI')).toBeVisible();
  await page.screenshot({ path: 'test-results/delivery-07-por-ciudad.png', fullPage: true });

  await page.getByRole('button', { name: 'Courier', exact: true }).click();
  await page.getByLabel('Tiempo de entrega de Luque').first().fill('2 horas');
  await expect(page.getByText('Tenés ajustes de tarifas sin guardar.')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Tenés ajustes de tarifas sin guardar.')).toBeHidden();
  expect(db.zonas.some(z => z.tiempo_entrega_hs === '2 horas')).toBe(true);
  await page.screenshot({ path: 'test-results/delivery-08-ajuste-guardado.png', fullPage: true });

  expect(errores).toEqual([]);
});

test('editar un courier existente le agrega ciudad sin perder las anteriores', async ({ page }) => {
  const db = backendFalso();
  await montarBackend(page, db);
  const errores = vigilarErrores(page);

  await irADelivery(page);

  await page.getByRole('button', { name: /Crear primer courier|Nuevo courier/ }).first().click();
  await page.getByLabel('Nombre del courier o empresa').fill('Propio');
  await page.getByRole('button', { name: 'Continuar con ciudades' }).click();
  await cargarCiudad(page, 0, {
    departamento: 'Central',
    ciudad: 'Luque',
    rangos: [{ min: 1, max: null, pago: 'Ambos', costo: 15000, entrega: 'En el día' }],
  });
  await page.getByRole('button', { name: 'Revisar' }).click();
  await page.getByRole('button', { name: 'Guardar courier y ciudades' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // "Agregar ciudad" desde la tarjeta abre el asistente directo en el paso 2
  // con las ciudades ya cargadas.
  await page.getByRole('button', { name: 'Agregar ciudad' }).click();
  await expect(page.getByRole('dialog').getByLabel('Ciudad', { exact: true }).first()).toHaveValue('Luque');

  await page.getByRole('dialog').getByRole('button', { name: 'Agregar ciudad', exact: true }).click();
  await cargarCiudad(page, 1, {
    departamento: 'Central',
    ciudad: 'San Lorenzo',
    rangos: [
      { min: 1, max: 4, pago: 'Al Recibir', costo: 23000, entrega: 'En el día' },
      { min: 5, max: null, pago: 'Ambos', costo: 17000, entrega: '24 hs' },
    ],
  });
  await page.getByRole('button', { name: 'Revisar' }).click();
  await page.getByRole('button', { name: 'Guardar courier y ciudades' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  expect(db.couriers).toHaveLength(1);
  expect(db.zonas.map(z => z.ciudad).sort()).toEqual(['Luque', 'San Lorenzo', 'San Lorenzo']);
  await expect(page.getByText('Luque, Central')).toBeVisible();
  await expect(page.getByText('San Lorenzo, Central')).toBeVisible();
  await page.screenshot({ path: 'test-results/delivery-09-editado.png', fullPage: true });

  // Eliminar el courier se lleva sus ciudades.
  await page.getByRole('button', { name: 'Eliminar Propio' }).click();
  await expect(page.getByText(/Se borran también las 2 ciudades/)).toBeVisible();
  await page.screenshot({ path: 'test-results/delivery-10-confirmar-borrado.png', fullPage: true });
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();

  await expect(page.getByText('Todavía no configuraste el delivery')).toBeVisible();
  expect(db.couriers).toHaveLength(0);
  expect(db.zonas).toHaveLength(0);

  expect(errores).toEqual([]);
});
