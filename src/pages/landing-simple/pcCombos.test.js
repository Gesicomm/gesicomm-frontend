import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { PLANTILLA_INICIO } from './plantillasBaseCodigo';

function montar(config = {}) {
  return new JSDOM(construirDocumentoCodigo(PLANTILLA_INICIO, { datos: {
    vista: 'inicio', tienda: {},
    productos: [
      { id: 'p1', tipo: 'producto', nombre: 'Cacerola', precio: 100, categoria: 'Cocina' },
      { id: 'combo-99', tipo: 'combo', nombre: 'prueba123', precio: 179000, categoria: 'Cocina' },
      { id: 'combo-100', tipo: 'combo', nombre: 'Combo oculto', precio: 200, categoria: 'Cocina', mostrar_en_inicio: false },
    ],
    venta: { inicio: { productos_categoria: { items: ['p1'], ...config } } },
  } }), { runScripts: 'dangerously', beforeParse(w) { w.postMessage = () => {}; } });
}

describe('Combos en Productos del inicio', () => {
  it('incluye combos en una selección, permite buscarlos y filtra por tipo al pulsar Combos', () => {
    const dom = montar();
    try {
      const doc = dom.window.document;
      const lista = () => doc.querySelector('[data-gesicomm-lista="productos_categoria"]');
      expect(lista().textContent).toContain('prueba123');
      expect(lista().textContent).not.toContain('Combo oculto');
      const input = doc.querySelector('[data-gesicomm-pc-buscar]');
      input.value = 'prueba';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      expect(lista().textContent).toContain('prueba123');
      expect(lista().textContent).not.toContain('Cacerola');
      input.value = '';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      doc.querySelector('[data-gesicomm-pc-combos]').click();
      expect(lista().textContent).toContain('prueba123');
      expect(lista().textContent).not.toContain('Cacerola');
      expect(doc.querySelector('[data-gesicomm-pc-combos]').getAttribute('aria-pressed')).toBe('true');
      doc.querySelector('[data-gesicomm-pc-categoria=""]').click();
      expect(lista().textContent).toContain('Cacerola');
      expect(doc.querySelector('[data-gesicomm-pc-combos]').getAttribute('aria-pressed')).toBe('false');
    } finally { dom.window.close(); }
  });

  it('oculta los combos y su pestaña al desmarcar Mostrar combos, incluso si están elegidos', () => {
    const dom = montar({ mostrar_combos: false, items: ['p1', 'combo-99'] });
    try {
      const doc = dom.window.document;
      expect(doc.querySelector('[data-gesicomm-pc-combos]')).toBeNull();
      const lista = doc.querySelector('[data-gesicomm-lista="productos_categoria"]');
      expect(lista.textContent).toContain('Cacerola');
      expect(lista.textContent).not.toContain('prueba123');
    } finally { dom.window.close(); }
  });
});
