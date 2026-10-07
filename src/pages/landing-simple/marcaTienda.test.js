import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo, cssMarcaTienda } from './construirDocumentoCodigo';
import { PLANTILLA_INICIO } from './plantillasBaseCodigo';
import { datosRuntimePublico, datosRuntimePreview } from './datosRuntime';
import { armarPromptVista } from './promptsCodigo';
import { mapEditorDraftToTemplateData } from './mapLandingToTemplateData';

/**
 * La landing HTML arranca con el Branding de Mi Tienda (colores, logo,
 * nombre): sin esto la base salía siempre verde y la IA inventaba su paleta.
 */

describe('Branding de Mi Tienda en la landing HTML', () => {
  it('los colores de la tienda llegan como variables --tienda-*, con texto legible', () => {
    const css = cssMarcaTienda({ primario: '#f5d90a', secundario: '#1d4ed8', fondo: '#0a0a0a' });
    expect(css).toContain('--tienda-primario: #f5d90a;');
    expect(css).toContain('--tienda-texto-sobre-primario: #111111;'); // primario claro → texto oscuro
    expect(css).toContain('--tienda-secundario: #1d4ed8;');
    expect(css).toContain('--tienda-fondo: #0a0a0a;');
    // Fondo oscuro: texto claro, tarjetas un poco más claras que el fondo, bandas teñidas.
    expect(css).toContain('--tienda-texto: #eef2f6;');
    expect(css).toMatch(/--tienda-superficie: #[0-9a-f]{6};/);
    expect(css).toMatch(/--tienda-banda: #[0-9a-f]{6};/);
    expect(css).not.toContain('--tienda-fondo-claro');
    expect(cssMarcaTienda({ fondo: '#fafaf5' })).toContain('--tienda-fondo-claro: #fafaf5;');
  });

  it('solo acepta hex: nada que pueda romper el CSS', () => {
    expect(cssMarcaTienda({ primario: 'red;} body{display:none' })).toBe('');
    expect(cssMarcaTienda(null)).toBe('');
  });

  it('el inicio conserva la paleta de referencia y muestra el logo y nombre de la tienda', () => {
    const datos = datosRuntimePublico({
      tienda: { nombre: 'sommix', logo_imagen: 'https://cdn.test/logo.png', colores: { primario: '#7c3aed', secundario: null, fondo: null } },
      catalogo_items: [],
    }, 'promo', null);
    const html = construirDocumentoCodigo(PLANTILLA_INICIO, { datos });
    const dom = new JSDOM(html, { runScripts: 'dangerously', beforeParse(w) { w.postMessage = () => {}; w.scrollTo = () => {}; } });
    const { document } = dom.window;
    expect(html).toContain('--tienda-primario: #7c3aed;');
    expect(html).toContain('--navy: #082947;');
    expect(html).toContain('--gc-fondo: var(--home-fondo);');
    expect(html).toContain('--gc-superficie: var(--home-superficie);');
    expect(document.querySelector('img[data-gesicomm-tienda="logo"]').getAttribute('src')).toBe('https://cdn.test/logo.png');
    expect(document.querySelector('[data-gesicomm-tienda="nombre"]').textContent).toBe('sommix');
    dom.window.close();
  });

  it('el buscador publico del header usa la paleta de Mi Tienda con contraste en resultados', () => {
    const datos = datosRuntimePublico({
      tienda: { nombre: 'sommix', colores: { primario: '#7c3aed', secundario: '#f59e0b', fondo: '#06111f' } },
      catalogo_items: [],
    }, 'promo', null);
    const html = construirDocumentoCodigo(PLANTILLA_INICIO, { datos });
    expect(html).toContain('--tienda-primario: #7c3aed;');
    expect(html).toContain('--tienda-primario-texto:');
    expect(html).toContain('--tienda-destacado:');
    expect(html).toContain('background: var(--gc-primario, var(--tienda-primario, #0d6efd)) !important;');
    expect(html).toContain('color: var(--gc-texto-sobre-primario, var(--tienda-texto-sobre-primario, #fff)) !important;');
    expect(html).toContain('color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #0d6efd)) 11%');
    expect(html).toContain('color: var(--tienda-primario-texto, var(--gc-texto, #071a33)) !important;');
    expect(html).toContain('color: var(--tienda-destacado, var(--tienda-primario-texto, var(--gc-texto-suave, #64748b))) !important;');
  });

  it('sin logo no agrega ningun logo inventado y el nombre no tiene fondo', () => {
    const datos = datosRuntimePublico({
      tienda: { nombre: 'sommix', logo_imagen: null, colores: { primario: '#7c3aed', secundario: null, fondo: null } },
      catalogo_items: [],
    }, 'promo', null);
    const html = construirDocumentoCodigo(PLANTILLA_INICIO, { datos });
    const dom = new JSDOM(html, { runScripts: 'dangerously', beforeParse(w) { w.postMessage = () => {}; w.scrollTo = () => {}; } });
    const { document } = dom.window;
    const logoImg = document.querySelector('img[data-gesicomm-tienda="logo"]');
    expect(logoImg.style.display).toBe('none');
    expect(logoImg.hasAttribute('src')).toBe(false);
    expect(document.querySelector('[data-gesicomm-tienda="nombre"]').textContent).toBe('sommix');
    expect(html).not.toMatch(/content:\s*['"]G['"]/);
    expect(html).toContain('background: transparent !important;');
    dom.window.close();
  });

  it('el preview del editor usa los colores de la tienda del panel', () => {
    const datos = datosRuntimePreview({ productos: [], tienda: { nombre: 'x', color_primario: '#0f5132', color_secundario: '#ffc107', color_fondo: '#ffffff' } });
    expect(datos.tienda.colores).toEqual({ primario: '#0f5132', secundario: '#ffc107', fondo: '#ffffff' });
  });

  it('el inicio rígido hereda los colores guardados en tienda.colores', () => {
    const datos = mapEditorDraftToTemplateData(
      { titulo: 'Mi tienda', items: [] },
      { productos: [], combos: [] },
      { colores: { primario: '#155E63', secundario: '#D8A862', fondo: '#101A21' } },
    );
    expect(datos.tema).toEqual({ fondo: '#101A21', texto: '#D8A862', acento: '#155E63' });
  });

  it('el prompt le pasa a la IA los colores y le pide usar las variables de la tienda', () => {
    const prompt = armarPromptVista('inicio', { tienda: { nombre: 'sommix', color_primario: '#0f5132', logo_imagen: 'x' }, venta: null, productos: [] });
    expect(prompt).toContain('Colores de la marca (Mi Tienda → Branding): principal #0f5132.');
    expect(prompt).toContain('Tiene logo cargado');
  });
});

describe('landing ya guardada con la base vieja (verde fijo)', () => {
  // CSS tal cual quedó guardado antes de que la base leyera --tienda-*.
  const cssViejo = `:root {
  --ink: #10202f;
  --ink-soft: #506172;
  --white: #ffffff;
  --line: #e4eaf0;
  --paper: #f7f9fc;
  --brand: #16a36a;
  --brand-dark: #08734a;
  --brand-soft: #e9f8f0;
  --accent: #ffb547;
  --accent-soft: #fff5e3;
}
.nav-cta, .button-primary { color: var(--white); background: var(--brand); box-shadow: 0 10px 24px rgba(22, 163, 106, .22); }
.announcement { color: var(--white); background: var(--ink); }
.eyebrow { color: var(--brand-dark); }
.otro { color: #16a36a; }`;
  const colores = { primario: '#155E63', secundario: '#D8A862', fondo: '#101A21' };

  function estilos(css) {
    const html = construirDocumentoCodigo({ html: '<a class="button-primary">Comprar</a><span class="acento"></span>', css: `${css}\n.acento { color: var(--accent); }`, js: '' }, { datos: { tienda: { colores } } });
    const dom = new JSDOM(html);
    return { html, raiz: dom.window.getComputedStyle(dom.window.document.documentElement) };
  }

  it('pasa a usar los colores de Mi Tienda sin volver a guardar', () => {
    const { html } = estilos(cssViejo);
    expect(html).toContain('--brand: var(--tienda-primario, #16a36a);');
    expect(html).toContain('--accent: var(--tienda-secundario, #ffb547);');
    expect(html).toContain('--brand-dark: color-mix(in srgb, var(--brand) 72%, #000);');
    expect(html).toContain('box-shadow: 0 10px 24px color-mix(in srgb, var(--brand, #16a36a) 22%, transparent)');
    expect(html).toContain('color: var(--tienda-texto-sobre-primario, #fff); background: var(--brand)');
    expect(html).toContain('--tienda-primario: #155E63;');
    expect(html).toContain('--tienda-secundario: #D8A862;');
    // Fondo de marca (oscuro): fondo de página, tarjetas, texto y bandas.
    expect(html).toContain('--tienda-fondo: #101A21;');
    expect(html).toContain('--paper: var(--tienda-fondo, #f7f9fc);');
    expect(html).toContain('--ink: var(--tienda-texto, #10202f);');
    expect(html).toContain('--white: var(--tienda-superficie, #ffffff);');
    expect(html).toContain('.announcement { color: var(--tienda-banda-texto, #fff); background: var(--tienda-banda, var(--ink)); }');
    // Etiquetas ("CÁPSULAS", "DETALLES") en el secundario.
    expect(html).toContain('.eyebrow { color: var(--tienda-destacado, var(--brand-dark)); }');
    expect(html).toContain('--tienda-destacado: #D8A862;');
    // Un color que el comercio escribió a mano en otro lado no se toca.
    expect(html).toContain('.otro { color: #16a36a; }');
  });

  it('sin Branding en la tienda, la página queda igual que antes', () => {
    const html = construirDocumentoCodigo({ html: '', css: cssViejo, js: '' }, { datos: { tienda: { colores: null } } });
    expect(html).toContain('--brand: var(--tienda-primario, #16a36a);');
    expect(html).not.toMatch(/--tienda-primario:/);
  });

  it('un diseño hecho con la IA toma el primario de la tienda en --gc-primario', () => {
    const html = construirDocumentoCodigo({ html: '', css: ':root { --gc-primario: #e11d48; --gc-texto-sobre-primario: #fff; --gc-fondo: #ffffff; }', js: '' }, { datos: { tienda: { colores } } });
    expect(html).toContain('--gc-primario: var(--tienda-primario, #e11d48);');
    expect(html).toContain('--gc-texto-sobre-primario: var(--tienda-texto-sobre-primario, #fff);');
    expect(html).toContain('--gc-fondo: var(--tienda-fondo, #ffffff);');
  });
});
