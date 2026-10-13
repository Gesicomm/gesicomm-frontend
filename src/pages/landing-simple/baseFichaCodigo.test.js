import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { conBaseDeFicha, construirDocumentoCodigo } from './construirDocumentoCodigo';
import { PLANTILLA_INICIO, PLANTILLA_PRODUCTO } from './plantillasBaseCodigo';

/**
 * Ficha guardada por una tienda antes de que la plantilla llevara
 * data-gesicomm-base="producto" (caso real: Llevalofacil, 2026-10-12). Sin
 * el atributo, el CSS de sistema de la galería no aplicaba y la foto tapaba
 * la columna de compra, en la preview y en la publicada.
 */
const FICHA_VIEJA = `<header class="site-header"><div class="container nav"></div></header>
<main class="container">
  <section class="pdp">
    <div class="gallery">
      <div class="gallery-main"><img data-gesicomm-bind="imagen" data-gesicomm-imagen-principal alt="" /></div>
      <div class="thumbs" data-gesicomm-lista="imagenes"></div>
    </div>
    <div class="pdp-info"><h1 data-gesicomm-bind="nombre"></h1></div>
  </section>
</main>`;

describe('header heredado sobre el CSS viejo de una ficha guardada', () => {
  it('el contenedor del logo no queda con el ancho del ícono de la plantilla vieja', () => {
    const documento = construirDocumentoCodigo({
      html: `<header class="commerce-header"><div class="container header-main">
  <div class="brand-column"><a class="brand brand-mark" href="#" data-gesicomm-inicio><img class="brand-logo" data-gesicomm-tienda="logo" alt=""></a></div>
  <nav class="header-nav"><div class="nav-links"><a href="/">Inicio</a></div></nav>
</div></header>
${FICHA_VIEJA.replace(/<header[\s\S]*?<\/header>/, '')}`,
      // Así llega la ficha de Llevalofacil: el CSS del inicio y, después, el suyo.
      css: '.brand-mark { display: inline-flex; min-width: 0; }\n.brand-mark { display: grid; width: 36px; height: 36px; place-items: center; }',
    }, { datos: { vista: 'producto', tienda: {}, productos: [] } });
    const { window } = new JSDOM(documento);

    expect(window.getComputedStyle(window.document.querySelector('.commerce-header .brand')).width).toBe('auto');
  });
});

describe('ficha guardada sin data-gesicomm-base', () => {
  it('marca el main de una copia vieja de la plantilla', () => {
    const doc = new JSDOM(conBaseDeFicha(FICHA_VIEJA)).window.document;
    const main = doc.querySelector('main');

    expect(main.getAttribute('data-gesicomm-base')).toBe('producto');
    expect(main.className).toBe('container');
    expect(doc.querySelector('[data-gesicomm-base="producto"] .gallery-main img[data-gesicomm-imagen-principal]')).not.toBeNull();
  });

  it('llega marcada al documento que usan la preview y la publicada', () => {
    const documento = construirDocumentoCodigo({ html: FICHA_VIEJA, css: '' }, { datos: { vista: 'producto', tienda: {}, productos: [] } });
    const doc = new JSDOM(documento).window.document;

    expect(doc.querySelector('main.container[data-gesicomm-base="producto"] .pdp .gallery')).not.toBeNull();
  });

  it('no toca lo que ya declara una base ni lo que no es la ficha de plantilla', () => {
    const fichaPropia = '<main class="mi-ficha"><img data-gesicomm-imagen-principal alt=""><div class="compra"></div></main>';

    expect(conBaseDeFicha(PLANTILLA_PRODUCTO.html)).toBe(PLANTILLA_PRODUCTO.html);
    expect(conBaseDeFicha(PLANTILLA_INICIO.html)).toBe(PLANTILLA_INICIO.html);
    expect(conBaseDeFicha(fichaPropia)).toBe(fichaPropia);
    expect(conBaseDeFicha('')).toBe('');
  });
});
