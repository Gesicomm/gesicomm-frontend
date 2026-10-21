import { it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { PLANTILLA_CHECKOUT } from './plantillasBaseCodigo';

it('oculta los textos borrados del checkout incluso después de repintar las tarjetas', () => {
  const producto = { id: 'extra', tipo: 'producto', nombre: 'Extra', precio: 10000, imagenes_url: [], variantes: [], ofertas: [] };
  const datos = { vista: 'checkout', tienda: {}, productos: [producto], checkout_recomendados: [producto], venta: { checkout_recomendados: { kicker: '', titulo: '', subtitulo: '', cta_texto: '', mostrar: { kicker: false, titulo: false, subtitulo: false, cta: false } } } };
  const dom = new JSDOM(construirDocumentoCodigo(PLANTILLA_CHECKOUT, { datos }), { runScripts: 'dangerously', pretendToBeVisual: true, beforeParse(window) { window.postMessage = () => {}; } });
  try {
    const verificar = () => {
      const textos = dom.window.document.querySelectorAll('[data-gesicomm-venta^="checkout_recomendados_"]');
      expect(textos.length).toBeGreaterThan(3);
      for (const el of textos) expect(el.style.display).toBe('none');
    };
    verificar();
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', { source: dom.window.parent, data: { tipo: 'gesicomm:datos', datos } }));
    verificar();
  } finally { dom.window.close(); }
});
