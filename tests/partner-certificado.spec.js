import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test('postulacion y terminos partner ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 940 });
    const errores = [];
    page.on('pageerror', e => errores.push(e.message));
    let solicitud = null;
    const posts = [];
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()).pathname;
      let data = {};
      if (url === '/api/auth/me') data = { id: 7, nombre: 'Ana', rol: 'usuario', tiendaId: 1 };
      if (url === '/api/suscripciones/mi-estado') data = { tiene_suscripcion_activa: true, suscripcion: { plan: { codigo: 'founders' } } };
      if (url === '/api/mi-tienda') data = { id: 1, nombre: 'Tienda de Ana' };
      if (url === '/api/tiendas/mias') data = [{ id: 1, nombre: 'Tienda de Ana' }];
      if (url === '/api/educacion/progreso-sidebar') data = { modulos: [
        { contexto: 'ecommerce', seccion: 'AFILIADOS', path: '/afiliados', label: 'Quiero ser afiliado', icono: 'BadgeDollarSign', menuKey: 'afiliados', requierePlan: 'founders' },
        { contexto: 'ecommerce', seccion: 'AFILIADOS', path: '/partner-certificado', label: 'Partner Certificado', icono: 'BadgeCheck', menuKey: 'partner-certificado' },
      ], bloqueos: {} };
      if (url.includes('/seguimiento/notificaciones')) data = { data: [], no_leidas: 0 };
      if (url === '/api/partner/me') {
        if (route.request().method() === 'POST') {
          posts.push(route.request().postDataJSON());
          solicitud = { id: 9, telefono: '+595981123456', estado: 'pendiente', terminos_version: '1.0', terminos_aceptados_en: '2026-10-19T12:00:00Z' };
          data = { solicitud };
        } else data = { solicitud, nombre: 'Ana', terminos: {
          version: '1.0', fecha: '2026-10-14',
          texto: '# TÉRMINOS DEL PROGRAMA PARTNER CERTIFICADO GESICOM\n\n' + Array.from({ length: 23 }, (_, i) => '### ' + (i + 1) + '. ' + (i === 22 ? 'Aceptación' : 'Condiciones del programa') + '\n\n' + 'Las condiciones de formación, membresía y certificación requieren aceptación expresa. '.repeat(5)).join('\n\n'),
        } };
      }
      await route.fulfill({ json: data });
    });
    await page.goto('http://127.0.0.1:5181/partner-certificado');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Conviértete en Partner Certificado Gesicom');
    if (width < 1024) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Quiero ser afiliado', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Partner Certificado', exact: true })).toBeVisible();
    const enlaces = await page.locator('nav[aria-label="Navegación de usuario"] a').allTextContents();
    expect(enlaces.findIndex(t => t.includes('Quiero ser afiliado'))).toBeLessThan(enlaces.findIndex(t => t.includes('Partner Certificado')));
    if (width < 1024) await page.getByRole('button', { name: 'Cerrar menú', exact: true }).click();
    await expect(page.locator('.pc-commercial dd').first()).toContainText('USD 997');
    await page.screenshot({ path: '../outputs/partner-desktop-' + width + '.png', fullPage: true });
    await page.getByRole('button', { name: 'Quiero ser Partner Certificado', exact: true }).click();
    await page.getByLabel('Teléfono / WhatsApp').fill('+595981123456');
    await page.getByRole('button', { name: 'Enviar mi solicitud', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', { name: '23. Aceptación' })).toHaveCount(1);
    const aceptar = page.getByRole('button', { name: 'Aceptar términos', exact: true });
    await expect(aceptar).toBeDisabled();
    expect(posts).toHaveLength(0);
    await page.getByRole('checkbox').check();
    await page.screenshot({ path: '../outputs/partner-terminos-' + width + '.png' });
    await aceptar.click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: 'Enviar mi solicitud', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Solicitud recibida', exact: true })).toBeVisible();
    expect(posts).toEqual([{ nombre: 'Ana', telefono: '+595981123456', acepta_terminos: true, terminos_version: '1.0' }]);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Solicitud recibida', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.pc-brand').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.route('**/api/afiliados/me', route => route.fulfill({
      status: 403, json: { message: 'El programa de afiliados está disponible solo para usuarios con plan Fundador.' },
    }));
    if (width < 1024) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
    await page.getByRole('link', { name: 'Quiero ser afiliado', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quiero ser afiliado', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver planes', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toHaveCount(0);
    expect(errores).toEqual([]);
  });
}
