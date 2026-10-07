import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { PLANTILLA_INICIO } from './plantillasBaseCodigo';

function montar(extra = {}) {
  return new JSDOM(construirDocumentoCodigo(PLANTILLA_INICIO, {
    datos: {
      vista: 'inicio',
      tienda: {},
      productos: extra.productos || [],
      venta: extra.venta || {},
    },
  }), { runScripts: 'dangerously', beforeParse(w) { w.postMessage = () => {}; } });
}

describe('busqueda en productos seleccionados', () => {
  it('no oculta el banner intermedio al filtrar la seleccion', () => {
    const productos = [
      { id: 'p1', content_id: 'p1', nombre: 'Parlante Krab', precio: 100, categoria: 'Automotor', imagen: 'https://cdn.test/parlante.png' },
      { id: 'p2', content_id: 'p2', nombre: 'Estufa de cuarzo', precio: 200, categoria: 'Climatización', imagen: 'https://cdn.test/estufa.png' },
    ];
    const dom = montar({
      productos,
      venta: {
        inicio: {
          productos_categoria: {
            activo: true,
            titulo: 'Productos seleccionados',
            items: ['p1', 'p2'],
          },
          banners_intermedios: [{
            id: 'medio',
            etiqueta: 'Promo',
            titulo: 'Nueva campaña promocional',
            subtitulo: 'Mostrá una oferta importante.',
            cta_texto: 'Ver productos',
            enlace: '#productos-categoria',
            imagen: 'https://cdn.test/banner.png',
          }],
        },
      },
    });
    const doc = dom.window.document;
    const input = doc.querySelector('[data-gesicomm-pc-buscar]');
    const banner = doc.querySelector('#banner-promocional');

    expect(banner.style.display).not.toBe('none');
    input.value = 'sin resultados';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

    expect(doc.querySelector('[data-gesicomm-pc-vacio]').hidden).toBe(false);
    expect(banner.style.display).not.toBe('none');
    expect(banner.querySelector('.mid-banner')).toBeTruthy();
    expect(banner.textContent).toContain('Nueva campaña promocional');
    dom.window.close();
  });
});
