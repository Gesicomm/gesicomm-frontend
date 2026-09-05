import { test, expect } from '@playwright/test';

const PRODUCTO_ID = 77;

const productoBase = {
  id: PRODUCTO_ID,
  nombre: 'Lentes Amarillos Anti Luz Azul QA',
  categoria_id: 1,
  categoria: 'Accesorios',
  proveedor_id: 1,
  sku: 'QA-LUZ-AZUL',
  tags: ['qa', 'vista-producto'],
  descripcion_corta: 'Bloquea luz azul para descansar mejor.',
  descripcion_larga: 'Descripción larga de respaldo del producto.',
  precio_base: 149000,
  precio_ancla: 189000,
  precio_tachado: 189000,
  precio_costo: 85000,
  precio_minimo: 120000,
  cantidad_disponible: 18,
  stock_salon: 10,
  stock_deposito: 8,
  stock_minimo: 3,
  unidad_medida: 'unidad',
  activo: true,
  estado_venta: 'en_venta',
  destacado: true,
  ficha_rubro: null,
  ficha_datos: {},
  beneficios: [],
  confianza: [],
  imagenes: [
    { id: 1, url: 'https://picsum.photos/seed/qa-lentes/900/700', es_principal: true, orden: 0 },
  ],
  sobre_este_producto: '',
  propuesta_valor: '',
};

function responderJson(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test('edita Vista del producto y agrega el producto guardado a la landing', async ({ page }) => {
  let productoGuardado = { ...productoBase };
  let payloadProducto = null;
  let payloadLanding = null;

  await page.route('**/api/**', route => responderJson(route, {}));

  await page.route('**/api/auth/me', route => responderJson(route, {
    id: 1,
    nombre: 'Admin QA',
    email: 'admin.qa@test.local',
    rol: 'administrador',
  }));

  await page.route('**/api/mi-tienda', route => responderJson(route, {
    id: 1,
    nombre: 'Tienda QA',
    subdominio: 'tienda-qa',
    color_primario: '#2f5597',
    whatsapp: '+595981000000',
  }));

  await page.route('**/api/categorias/buscar', route => responderJson(route, {
    total: 1,
    pagina: 1,
    total_paginas: 1,
    categorias: [{ id: 1, nombre: 'Accesorios', activa: true }],
  }));

  await page.route('**/api/proveedores/buscar', route => responderJson(route, {
    total: 1,
    pagina: 1,
    total_paginas: 1,
    proveedores: [{ id: 1, nombre: 'Proveedor QA' }],
  }));

  await page.route('**/api/combos/configuracion', route => responderJson(route, {
    recargo_tc: 0,
    descuento_efectivo: 0,
  }));

  await page.route(`**/api/productos/${PRODUCTO_ID}`, async route => {
    if (route.request().method() === 'PUT') {
      payloadProducto = JSON.parse(route.request().postData() || '{}');
      productoGuardado = {
        ...productoGuardado,
        ...payloadProducto,
        id: PRODUCTO_ID,
        ficha_rubro: payloadProducto.ficha_rubro,
        precio_tachado: payloadProducto.precio_ancla,
        precio_efectivo: payloadProducto.precio_base,
        categoria: 'Accesorios',
        imagenes: productoBase.imagenes,
      };
      return responderJson(route, productoGuardado);
    }
    return responderJson(route, productoGuardado);
  });

  await page.route(`**/api/productos/${PRODUCTO_ID}/variantes`, route => responderJson(route, []));
  await page.route(`**/api/productos/${PRODUCTO_ID}/imagenes`, route => responderJson(route, productoBase.imagenes));
  await page.route(`**/api/productos/${PRODUCTO_ID}/faq`, route => responderJson(route, []));
  await page.route(`**/api/productos/${PRODUCTO_ID}/ofertas**`, route => responderJson(route, []));

  await page.route('**/api/landing-templates**', route => responderJson(route, [
    { id: 1, nombre: 'Diseño propio', slug: 'basico', key: 'basico', kind: 'rigido' },
  ]));

  await page.route('**/api/mis-landings-simples', route => responderJson(route, []));

  await page.route('**/api/vitrina/catalogo', route => responderJson(route, {
    productos: [{
      ...productoGuardado,
      ficha_rubro: productoGuardado.ficha_rubro,
      precio_efectivo: productoGuardado.precio_base,
      imagen: productoBase.imagenes[0].url,
      stock: productoGuardado.stock_salon + productoGuardado.stock_deposito,
      tipo: 'producto',
    }],
    combos: [],
  }));

  await page.route('**/api/mis-landings/paginas', route => responderJson(route, [
    { id: 1, nombre: 'Inicio', titulo: 'Inicio', tipo_pagina: 'inicio' },
  ]));

  await page.route('**/api/mis-landings/1', async route => {
    if (route.request().method() === 'PUT') {
      payloadLanding = JSON.parse(route.request().postData() || '{}');
      return responderJson(route, {
        id: 1,
        nombre: 'Inicio',
        titulo: 'Inicio',
        tipo_pagina: 'inicio',
        activo: true,
        ...payloadLanding,
        secciones: payloadLanding.secciones || [],
        items: payloadLanding.items || [],
      });
    }
    return responderJson(route, {
      id: 1,
      nombre: 'Inicio',
      titulo: 'Inicio',
      tipo_pagina: 'inicio',
      activo: true,
      content: {},
      items: [],
      secciones: [
        {
          id: 11,
          stable_id: 'qa-productos',
          page_type: 'landing',
          tipo: 'productos',
          schema_version: 1,
          nombre_interno: 'Productos',
          activo: true,
          orden: 0,
          template: 'grid_4',
          config: {},
          contenido: { productos: [] },
        },
      ],
    });
  });

  await page.route(`**/api/productos/${PRODUCTO_ID}/landing`, route => responderJson(route, {
    id: 901,
    slug: 'lentes-amarillos-qa',
    activo: true,
    content: {},
    template: {
      schema: [
        { id: 'product-detail', type: 'product_detail', nombre_interno: 'Detalle de Producto', config: {}, contenido: {} },
      ],
    },
  }));

  await page.goto(`http://localhost:5174/products/${PRODUCTO_ID}/editar`);
  await expect(page.getByRole('heading', { name: 'Editar producto' })).toBeVisible();
  await expect(page.locator('#prod-nombre')).toHaveValue('Lentes Amarillos Anti Luz Azul QA');

  await page.getByRole('tab', { name: /Vista del producto/ }).click();
  await expect(page.getByRole('button', { name: 'Genérico / ficha básica' })).toBeVisible();
  await expect(page.getByText('Sobre este producto', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Beauty y Skin Care' }).click();
  await expect(page.locator('textarea[name="sobre_este_producto"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Genérico / ficha básica' }).click();
  await expect(page.getByText('Sobre este producto', { exact: true })).toBeVisible();
  await expect(page.getByText('Texto del botón principal', { exact: true })).toBeVisible();

  await page.locator('label.rubro-field:has-text("Texto del botón principal") input')
    .fill('Comprar ahora - Retiro en tienda');
  await page.locator('.quick-benefit-row').first().locator('input')
    .fill('Bloquea hasta el 99% de la luz azul');
  await page.locator('textarea[name="sobre_este_producto"]')
    .fill('Sobre este producto QA: lentes pensados para pantallas, lectura nocturna y descanso visual.');
  await page.locator('input[name="beneficios.0.titulo"]').fill('Descanso visual');
  await page.locator('textarea[name="beneficios.0.texto"]').fill('Ayuda a reducir la fatiga frente a pantallas.');

  await expect(page.getByText('Comprar ahora - Retiro en tienda').first()).toBeVisible();
  await expect(page.getByText('Bloquea hasta el 99% de la luz azul').first()).toBeVisible();
  await expect(page.getByText('Sobre este producto QA').first()).toBeVisible();

  const [putProducto] = await Promise.all([
    page.waitForRequest(req => req.url().includes(`/api/productos/${PRODUCTO_ID}`) && req.method() === 'PUT'),
    page.getByRole('button', { name: /^Guardar$/ }).first().click(),
  ]);
  expect(putProducto).toBeTruthy();
  expect(payloadProducto.ficha_rubro).toBeNull();
  expect(payloadProducto.sobre_este_producto).toContain('Sobre este producto QA');
  expect(payloadProducto.ficha_datos.cta_principal_texto).toBe('Comprar ahora - Retiro en tienda');
  expect(payloadProducto.ficha_datos.beneficios_rapidos[0]).toBe('Bloquea hasta el 99% de la luz azul');
  expect(payloadProducto.beneficios[0].titulo).toBe('Descanso visual');

  await page.goto('http://localhost:5174/mi-landing');
  await page.waitForURL('**/mi-landing/1');
  await expect(page.getByText('Inicio').first()).toBeVisible();
  await page.getByText('Productos', { exact: true }).first().click();
  await page.getByRole('button', { name: /Seleccionar productos/ }).click();
  await page.getByRole('button', { name: /Elegir productos/ }).click();
  await page.getByText('Lentes Amarillos Anti Luz Azul QA').click();
  await expect(page.getByText('1 / 50 seleccionados')).toBeVisible();
  await page.getByRole('button', { name: 'Listo' }).click();
  await page.getByRole('button', { name: 'Confirmar selección' }).click();
  await expect(page.getByText('Lentes Amarillos Anti Luz Azul QA')).toBeVisible();

  const [putLanding] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/api/mis-landings/1') && req.method() === 'PUT'),
    page.getByRole('button', { name: /Guardar/ }).first().click(),
  ]);
  expect(putLanding).toBeTruthy();
  expect(payloadLanding.items).toEqual([
    { tipo: 'producto', referencia_id: PRODUCTO_ID, etiqueta: '', orden: 0 },
  ]);

  await page.goto(`http://localhost:5174/mi-landing/producto/${PRODUCTO_ID}`);
  await expect(page.locator('main')).toContainText('Editor');
  await expect(page.locator('main')).toContainText('Lentes Amarillos Anti Luz Azul QA');
});
