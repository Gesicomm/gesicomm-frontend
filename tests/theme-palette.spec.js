import { test, expect } from '@playwright/test';

const origin = process.env.PALETTE_BASE_URL || 'http://localhost:5173';
const styles = [
  '/src/components/dashboard.css', '/src/pages/vitrina/vitrina.css',
  '/src/pages/productos/productos.css', '/src/pages/combos/combos.css',
  '/src/pages/combos/comboArmado.css', '/src/pages/courier/courier.css',
  '/src/pages/courier/courier-portal.css', '/src/pages/planes/planes.css',
  '/src/pages/landing/landing.css', '/src/pages/educacion/EducacionView.css',
  '/src/pages/educacion/AdminEducacion.css', '/src/pages/tienda/tienda.css',
  '/src/pages/tienda/raha.css', '/src/pages/raha/raha-portal.css',
];

async function prepare(page, theme) {
  await page.addInitScript(value => localStorage.setItem('gesicomm-tema-publico', value), theme);
  await page.route('**/api/**', route => route.fulfill({ status: 401, json: {} }));
  await page.goto(origin + '/login');
  await page.evaluate(async paths => { await Promise.all(paths.map(path => import(path))); }, styles);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(() => {
    document.getElementById('root').style.display = 'none';
    const gallery = document.createElement('div');
    gallery.id = 'palette-gallery';
    gallery.style.cssText = 'padding:24px; display:grid; gap:16px; background:var(--color-canvas);';
    document.body.append(gallery);
  });
}

async function contrastOf(locator) {
  return locator.evaluate(el => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    ctx.canvas.width = ctx.canvas.height = 1;
    const rgba = css => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
    const blend = (front, back) => { const a = front[3] / 255; return front.slice(0, 3).map((x, i) => x * a + back[i] * (1 - a)).concat(255); };
    const chain = []; for (let node = el; node; node = node.parentElement) chain.unshift(node);
    let background = [255, 255, 255, 255];
    for (const node of chain) background = blend(rgba(getComputedStyle(node).backgroundColor), background);
    const color = blend(rgba(getComputedStyle(el).color), background);
    const luminance = rgb => rgb.slice(0, 3).map(x => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(color), b = luminance(background);
    return { ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), color, background };
  });
}

for (const theme of ['light', 'dark']) {
  test(`roles de texto, acciones y selección legibles en todas las hojas (${theme})`, async ({ page }) => {
    await prepare(page, theme);
    const samples = [
      ['tarjeta de datos', 'data-item', '<span>Resumen</span>'],
      ['lección de educación', 'lms-studio-container', '<div class="lms-lesson-sub-item"><span>Primera lección</span></div>'],
      ['imagen principal', 'prod-page', '<span class="img-principal-badge" style="position:static">Principal</span>'],
      ['productos', 'prod-page', '<h2 class="prod-title">Productos</h2>'],
      ['filtros de productos', 'prod-page', '<input class="filter-input" value="Buscar productos">'],
      ['acción compartida', 'prod-page', '<button class="btn-primary">Guardar</button>'],
      ['combos', 'combo-page', '<span class="combo-icon-wrap">G</span>'],
      ['filtro activo de combos', 'combo-page', '<button class="combo-filter-btn active">Activos</button>'],
      ['pestaña logística', 'courier-container', '<button class="tab-btn active">Comercial</button>'],
      ['acción logística', 'courier-container', '<button class="courier-flow-action">Configurar seguimiento</button>'],
      ['selector de productos', 'np-picker-theme', '<div class="lb-segmented"><button class="active">Productos</button></div>'],
      ['pestaña de planes', 'pl-page', '<div class="pl-tabs"><button class="activo">Planes</button></div>'],
      ['contratar plan', 'pl-page', '<button class="pl-cta primario">Elegir plan</button>'],
      ['acción de educación', 'lms-studio-container', '<button class="lms-btn-primary">Nuevo módulo</button>'],
      ['pestaña de educación', 'lms-studio-container', '<button class="lms-step-nav-btn active">Contenido</button>'],
      ['formulario de educación', 'lms-studio-container', '<input class="lms-input-text" value="Título del módulo">'],
      ['módulo seleccionado', 'aca-container', '<div class="aca-module-nav-card active"><h3 class="aca-nav-card-title">Primeros pasos</h3></div>'],
      ['acción RAHA', 'raha', '<button class="raha-button raha-primary">Enviar solicitud</button>'],
      ['estado aprobado', 'raha', '<span class="raha-badge aprobada">Aprobada</span>'],
      ['estado observado', 'raha', '<span class="raha-badge observada">Observada</span>'],
      ['estado rechazado', 'raha', '<span class="raha-badge rechazada">Rechazada</span>'],
      ['portal RAHA', 'rp-root', '<button class="rp-btn-submit">Ingresar</button>'],
      ['portal courier', 'cp-root', '<button class="cp-btn-submit">Ingresar</button>'],
    ];
    for (const [name, wrapper, html] of samples) {
      await page.evaluate(({ name, wrapper, html }) => {
        const section = document.createElement('section');
        section.className = wrapper;
        section.style.cssText = 'min-height:0; padding:16px; background:var(--color-surface);';
        section.innerHTML = html;
        const target = section.querySelector('button, input, h3, h2, span');
        target.dataset.paletteSample = name;
        document.querySelector('#palette-gallery').append(section);
      }, { name, wrapper, html });
      const target = page.locator(`[data-palette-sample="${name}"]`);
      const result = await contrastOf(target);
      expect(result.ratio, `${theme}: ${name}: ${JSON.stringify(result)}`).toBeGreaterThanOrEqual(4.5);
    }
    const local = await page.locator('.courier-container').first().evaluate(el => ({
      primary: getComputedStyle(el).getPropertyValue('--color-primary').trim(),
      foreground: getComputedStyle(el).getPropertyValue('--color-primary-fg').trim(),
    }));
    expect(local.primary).toBe('#ff5c45');
    expect(local.foreground).toBe('#08111f');
  });

  test(`el selector de horario mantiene el tema y permite aplicar (${theme})`, async ({ page }) => {
    await prepare(page, theme);
    await page.evaluate(async () => {
      const { mount } = await import('/tests/fixtures/HorarioPickerPreview.jsx');
      const holder = document.createElement('div');
      document.querySelector('#palette-gallery').append(holder);
      mount(holder);
    });
    await page.getByText('Seleccionar horario...').click();
    await expect(page.getByRole('button', { name: 'Aplicar' })).toBeVisible();
    const result = await contrastOf(page.getByRole('button', { name: 'Aplicar' }));
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    await page.getByRole('button', { name: 'Aplicar' }).click();
    const selection = page.getByText('Lunes a Viernes de 09:00 a 18:00');
    await expect(selection).toBeVisible();
    expect((await contrastOf(selection)).ratio).toBeGreaterThanOrEqual(4.5);
  });
}
