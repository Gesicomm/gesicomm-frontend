import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { presentacionComercial } from './datosRuntime';
import { PLANTILLA_PRODUCTO } from './plantillasBaseCodigo';

/**
 * Los bloques de "Vista producto" (PresentacionProducto.jsx) se guardan en
 * venta.presentacion_productos y el runtime los pinta en la ficha base.
 * Se prueba con el documento real: el editor puede guardar bien y la ficha
 * no mostrar nada, que era justamente el bug.
 */

const venta = (presentacion, extra = {}) => ({ presentacion_productos: { 'producto:11': presentacion }, ...extra });
const base = {
  id: 'remera', referencia_id: 11, tipo: 'producto', nombre: 'Remera', precio: 50000, imagen: null,
  imagenes_url: [], categoria: 'Ropa', stock: 3, agotado: false, variantes: [], ofertas: [], url: '/remera',
};

function montar(presentacion, ventaExtra = {}) {
  const v = venta(presentacion, ventaExtra);
  const producto = { ...base, ...presentacionComercial(base, v) };
  const html = construirDocumentoCodigo(PLANTILLA_PRODUCTO, { datos: { vista: 'producto', tienda: {}, productos: [producto], producto, recomendados: [], venta: v } });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.postMessage = () => {};
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
    },
  });
  return dom.window.document;
}

describe('ficha: bloques editables de Vista producto', () => {
  it('pinta rótulo, título y subtítulo de Beneficios, Opiniones y Preguntas', () => {
    const doc = montar({
      beneficios_kicker: 'Ventajas reales', beneficios_titulo: 'Lo importante antes de comprar', beneficios_subtitulo: 'Sin letra chica',
      opiniones_kicker: 'Clientes', opiniones_titulo: 'Lo que dicen en Luque',
      preguntas_kicker: 'Dudas', preguntas_titulo: 'Antes de pedir',
    });
    expect(doc.querySelector('[data-gesicomm-bind="beneficios_kicker"]').textContent).toBe('Ventajas reales');
    expect(doc.querySelector('[data-gesicomm-bind="beneficios_titulo"]').textContent).toBe('Lo importante antes de comprar');
    expect(doc.querySelector('[data-gesicomm-bind="beneficios_subtitulo"]').textContent).toBe('Sin letra chica');
    expect(doc.querySelector('[data-gesicomm-bind="opiniones_kicker"]').textContent).toBe('Clientes');
    expect(doc.querySelector('[data-gesicomm-bind="opiniones_titulo"]').textContent).toBe('Lo que dicen en Luque');
    expect(doc.querySelector('[data-gesicomm-bind="preguntas_kicker"]').textContent).toBe('Dudas');
    expect(doc.querySelector('[data-gesicomm-bind="preguntas_titulo"]').textContent).toBe('Antes de pedir');
  });

  it('el contador de la ficha usa la duración cargada aunque la Oferta flash sea de otro producto', () => {
    const doc = montar(
      { urgencia_kicker: 'Solo hoy', urgencia_horas: '5', urgencia_minutos: '30', urgencia_segundos: '0' },
      { urgencia: { activo: true, fin_at: new Date(Date.now() + 864e5).toISOString(), productos: ['otro-producto'] } },
    );
    const bloque = doc.querySelector('[data-gesicomm-ficha-bloque="urgencia"]');
    expect(bloque.style.display).not.toBe('none');
    expect(bloque.querySelector('[data-gesicomm-bind="urgencia_kicker"]').textContent).toBe('Solo hoy');
    expect(['05', '04']).toContain(bloque.querySelector('[data-gesicomm-countdown-parte="horas"]').textContent);
  });

  it('muestra solo los métodos de pago marcados, y ninguno si se desmarcaron todos', () => {
    const conUno = montar({ metodos_pago: [{ texto: 'Pago contra entrega' }] });
    expect([...conUno.querySelectorAll('.payment-methods [data-gesicomm-generado]')].map(e => e.textContent.trim())).toEqual(['Pago contra entrega']);

    const vacio = montar({ metodos_pago: [] });
    expect(vacio.querySelectorAll('.payment-methods [data-gesicomm-generado]')).toHaveLength(0);
    expect(vacio.querySelector('.payment-methods').style.display).toBe('none');
  });

  it('"Mostrar" apagado oculta el bloque sin re-mostrar listas vacías al prenderlo', () => {
    const apagado = montar({ ficha_bloques: { beneficios: false } });
    expect(apagado.querySelector('#beneficios').hasAttribute('data-gesicomm-ficha-oculto')).toBe(true);
    const prendido = montar({ ficha_bloques: { compra: true }, metodos_pago: [] });
    expect(prendido.querySelector('.payment-methods').hasAttribute('data-gesicomm-ficha-oculto')).toBe(false);
    expect(prendido.querySelector('.payment-methods').style.display).toBe('none');
  });

  it('los logos de PagoPar se apagan desde pago_logos', () => {
    const doc = montar({}, { pago_logos: { tarjetas: false, bocas: false, billetera: false } });
    expect(doc.querySelector('.payment-brands').style.display).toBe('none');
  });
});
