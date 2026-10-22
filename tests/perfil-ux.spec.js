import { test, expect } from '@playwright/test';
import { prepararUsuario } from './fixtures/user-theme-session.js';
const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';

for (const theme of ['light', 'dark']) for (const width of [375, 1280]) {
  test(`Perfil ${theme} a ${width}px: edición, contraseña y verificación`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 950 });
    await prepararUsuario(page, theme);
    const usuario = { id: 41, nombre: 'Usuario de prueba', email: 'usuario@example.test', telefono: '0981123456' };
    const guardados = [];
    await page.route('**/api/auth/perfil', route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: usuario });
      const datos = route.request().postDataJSON();
      guardados.push(datos);
      return route.fulfill({ json: { usuario: { ...usuario, nombre: datos.nombre, telefono: datos.telefono } } });
    });
    await page.route('**/api/auth/perfil/solicitar-otp', route => route.fulfill({ json: { message: 'Código enviado' } }));
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.goto(`${origin}/mi-catalogo`);
    if (width < 1024) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
    await page.getByTitle('Editar perfil y contraseña').click();
    const modal = page.getByRole('dialog', { name: 'Configuración de Perfil' });
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel('Nombre completo')).toHaveValue(usuario.nombre);
    await expect(modal.getByLabel('Correo electrónico')).toBeDisabled();
    await expect(modal.getByRole('heading', { name: 'Datos personales' })).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Seguridad de tu cuenta' })).toBeVisible();
    await modal.getByRole('button', { name: 'Cerrar modal', exact: true }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(modal.getByRole('button', { name: 'Guardar cambios', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(modal.getByRole('button', { name: 'Cerrar modal', exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('perfil.png') });
    await modal.getByLabel('Nombre completo').fill('Mi nuevo nombre');
    await modal.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
    await modal.getByLabel('Nueva contraseña', { exact: true }).fill('ClaveNueva123');
    await modal.getByLabel('Confirmar nueva contraseña', { exact: true }).fill('ClaveNueva123');
    await modal.getByRole('button', { name: 'Mostrar nueva contraseña', exact: true }).click();
    await expect(modal.getByLabel('Nueva contraseña', { exact: true })).toHaveAttribute('type', 'text');
    await modal.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(modal.getByRole('heading', { name: 'Confirmación de Seguridad' })).toBeVisible();
    await modal.getByRole('textbox', { name: 'Dígito 1 del código', exact: true }).fill('123456');
    await expect(modal.getByRole('heading', { name: '¡Perfil actualizado!' })).toBeVisible();
    expect(guardados).toEqual([{ codigo_otp: '123456', nombre: 'Mi nuevo nombre', telefono: usuario.telefono, password: 'ClaveNueva123' }]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errores).toEqual([]);
  });
}
