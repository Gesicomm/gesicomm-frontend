import { describe, it, expect } from 'vitest';
import { conGlobalesHeredados, extraerPieTienda } from './globalesCodigo';
import { codigoFichaProducto } from './fichaCodigoLanding';
import { codigoTieneFooter } from './seccionesSistemaCodigo';
import { PLANTILLA_INICIO, PLANTILLA_CATEGORIA, PLANTILLA_CHECKOUT, PLANTILLA_PRODUCTO } from './plantillasBaseCodigo';

/**
 * El pie es de la tienda, no de cada vista: el del inicio tiene que ser el
 * que se ve en la ficha, la categoría y el checkout. Antes solo se heredaba
 * el header, y una ficha con su propio <footer> mostraba otro pie.
 */

const HEADER = '<header class="commerce-header"><a class="brand">Tienda</a></header>';
const PIE_INICIO = '<footer class="site-footer"><strong>Políticas</strong><a data-gesicomm-link="contacto">Contacto</a><strong>Contactos</strong><ul class="footer-datos"></ul></footer>';
const inicio = { html: `${HEADER}<main>Inicio</main>${PIE_INICIO}`, css: '.site-footer{color:red}', js: '' };

const cuentaPies = html => (html.match(/<footer\b/gi) || []).length;

describe('pie heredado del inicio', () => {
  it('reemplaza el pie propio de una ficha por el del inicio', () => {
    const ficha = {
      html: `${HEADER}<main>Ficha</main><footer class="pie-ia"><p>© 2026 Tienda. Todos los derechos reservados.</p><a href="/privacidad">Privacidad</a></footer>`,
      css: '.pie-ia{color:blue}',
      js: '',
    };
    const res = conGlobalesHeredados(ficha, inicio);
    expect(cuentaPies(res.html)).toBe(1);
    expect(res.html).toContain(PIE_INICIO);
    expect(res.html).not.toContain('Todos los derechos reservados');
    expect(res.html).toContain('<main>Ficha</main>');
    // El CSS del inicio viaja con el pie, y antes que el de la vista.
    expect(res.css.indexOf('.site-footer{color:red}')).toBeLessThan(res.css.indexOf('.pie-ia{color:blue}'));
  });

  it('una vista sin pie recibe el del inicio en vez del genérico del sistema', () => {
    const vista = { html: `${HEADER}<main>Checkout propio</main>`, css: '', js: '' };
    const res = conGlobalesHeredados(vista, inicio);
    expect(res.html.endsWith(PIE_INICIO)).toBe(true);
    expect(codigoTieneFooter(res)).toBe(true);
  });

  it('hereda el pie aunque el header de la vista no se pueda reemplazar', () => {
    const vista = { html: '<div class="hero">Sin header</div><footer><p>Otro pie</p></footer>', css: '', js: '' };
    const res = conGlobalesHeredados(vista, inicio);
    expect(res.html).toBe(`<div class="hero">Sin header</div>${PIE_INICIO}`);
  });

  it('toma el pie de la página y no el <footer> de una tarjeta', () => {
    const html = `<article><footer>— María</footer></article><main></main>${PIE_INICIO}`;
    expect(extraerPieTienda(html).html).toBe(PIE_INICIO);
    const vista = { html: `${HEADER}<article><footer>— Cliente</footer></article><footer>Pie viejo</footer>`, css: '', js: '' };
    const res = conGlobalesHeredados(vista, inicio);
    expect(res.html).toContain('<footer>— Cliente</footer>');
    expect(res.html).not.toContain('Pie viejo');
  });

  it('si el inicio no tiene pie, la vista conserva el suyo', () => {
    const sinPie = { html: `${HEADER}<main>Inicio</main>`, css: '', js: '' };
    const vista = { html: `${HEADER}<main>Ficha</main><footer>Pie de la ficha</footer>`, css: '', js: '' };
    expect(conGlobalesHeredados(vista, sinPie).html).toContain('Pie de la ficha');
  });

  it('un "pie" gigante no se clona en todas las vistas', () => {
    const enorme = { html: `${HEADER}<footer>${'x'.repeat(25000)}</footer>`, css: '', js: '' };
    const vista = { html: `${HEADER}<main>Ficha</main><footer>Pie de la ficha</footer>`, css: '', js: '' };
    expect(conGlobalesHeredados(vista, enorme).html).toContain('Pie de la ficha');
  });

  it('plantillas base: categoría, checkout y ficha quedan con el pie del inicio, uno solo', () => {
    const pieInicio = extraerPieTienda(PLANTILLA_INICIO.html).html;
    for (const plantilla of [PLANTILLA_CATEGORIA, PLANTILLA_CHECKOUT, PLANTILLA_PRODUCTO]) {
      const res = conGlobalesHeredados(plantilla, PLANTILLA_INICIO);
      expect(cuentaPies(res.html)).toBe(cuentaPies(plantilla.html));
      expect(extraerPieTienda(res.html).html).toBe(pieInicio);
    }
  });

  it('ficha guardada con pie escrito por una IA: la publicada muestra el pie del inicio', () => {
    const fichaIA = `<main data-gesicomm-personalizado><h1 data-gesicomm-bind="nombre"></h1><button data-gesicomm-comprar>Comprar</button></main><footer><p>© 2026 Llevalofacil. Todos los derechos reservados.</p><a>Privacidad</a><a>Términos</a></footer>`;
    const content = { codigo: PLANTILLA_INICIO, vistas: { producto: { html: fichaIA, css: '', js: '' } } };
    const res = codigoFichaProducto(content, 'un-producto', PLANTILLA_INICIO);
    expect(res.html).not.toContain('Todos los derechos reservados');
    expect(extraerPieTienda(res.html).html).toBe(extraerPieTienda(PLANTILLA_INICIO.html).html);
    expect(res.html).toContain('data-gesicomm-tienda="whatsapp"');
  });
});
