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

function montar(presentacion, ventaExtra = {}, itemExtra = {}) {
  const v = venta(presentacion, ventaExtra);
  const item = { ...base, ...itemExtra };
  const producto = { ...item, ...presentacionComercial(item, v) };
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
  it('impacta bloque por bloque en el documento real de preview', () => {
    const doc = montar({
      resenas_texto: '4.8 · 88 reseñas reales',
      insignia_principal: 'Hot sale',
      titulo_comercial: 'Remera premium test',
      mensaje_comercial: 'Tela liviana para todos los días.',
      urgencia_kicker: 'Solo hasta hoy',
      urgencia_titulo: 'Reservá el precio antes de medianoche',
      urgencia_texto: 'El descuento se corta al terminar el contador.',
      urgencia_horas: '3',
      urgencia_minutos: '12',
      urgencia_segundos: '9',
      beneficios_kicker: 'Ventajas reales',
      beneficios_titulo: 'Lo que mejora tu compra',
      beneficios_subtitulo: 'Probado antes de publicar.',
      beneficios: [{ titulo: 'Costura reforzada', texto: 'Soporta más uso diario.' }],
      cta_texto: 'Comprar esta remera',
      agregar_carrito_texto: 'Sumar al carrito',
      botones_pago: [{ label: 'Pagar por WhatsApp', tipo: 'whatsapp', valor: 'Hola' }],
      metodos_pago: [{ texto: 'Transferencia bancaria' }],
      incluye_pedido: [{ texto: '1 remera premium' }],
      opiniones_kicker: 'Clientes reales',
      opiniones_titulo: 'Lo que cuentan',
      opiniones_subtitulo: 'Comentarios cargados por la tienda.',
      opiniones: [{ nombre: 'Ana', comentario: 'La tela se siente muy bien.', detalle: 'Compra verificada', calificacion: 5 }],
      preguntas_kicker: 'Dudas antes de comprar',
      preguntas_titulo: 'Preguntas clave',
      preguntas_subtitulo: 'Respuestas breves.',
      preguntas: [{ pregunta: '¿Tiene cambio?', respuesta: 'Sí, según política de la tienda.' }],
    }, { pago_logos: { tarjetas: false, bocas: true, billetera: false } }, { imagen: 'https://cdn.test/remera.webp' });

    expect(doc.querySelector('.gallery img[data-gesicomm-imagen-principal]').getAttribute('src')).toContain('remera.webp');
    expect(doc.querySelector('.pdp-info [data-gesicomm-bind="insignia_principal"]').textContent).toBe('Hot sale');
    expect(doc.querySelector('.pdp-info [data-gesicomm-bind="nombre"]').textContent).toBe('Remera premium test');
    expect(doc.querySelector('.pdp-reviews [data-gesicomm-bind="resenas_texto"]').textContent).toBe('4.8 · 88 reseñas reales');
    expect(doc.querySelector('.pdp-lead').textContent).toBe('Tela liviana para todos los días.');
    expect(doc.querySelector('[data-gesicomm-ficha-bloque="precio"] [data-gesicomm-bind="urgencia_kicker"]').textContent).toBe('Solo hasta hoy');
    expect(doc.querySelector('[data-gesicomm-ficha-bloque="precio"] [data-gesicomm-bind="urgencia_titulo"]').textContent).toBe('Reservá el precio antes de medianoche');
    expect(doc.querySelector('.highlights [data-gesicomm-bind="titulo"]').textContent).toBe('Costura reforzada');
    expect(doc.querySelector('[data-gesicomm-comprar] [data-gesicomm-bind="cta_texto"]').textContent).toBe('Comprar esta remera');
    expect(doc.querySelector('.payment-action [data-gesicomm-bind="label"]').textContent).toBe('Pagar por WhatsApp');
    expect(doc.querySelector('.payment-methods [data-gesicomm-generado]').textContent).toBe('Transferencia bancaria');
    expect(doc.querySelector('.order-includes [data-gesicomm-generado]').textContent).toBe('1 remera premium');
    expect([...doc.querySelectorAll('.payment-brands-row')].filter(el => el.style.display !== 'none').map(el => el.textContent.trim())).toEqual(['Bocas de cobranza']);
    expect(doc.querySelector('#opiniones [data-gesicomm-bind="opiniones_titulo"]').textContent).toBe('Lo que cuentan');
    expect(doc.querySelector('#opiniones .opinion-card [data-gesicomm-bind="comentario"]').textContent).toBe('La tela se siente muy bien.');
    expect(doc.querySelector('#preguntas [data-gesicomm-bind="preguntas_titulo"]').textContent).toBe('Preguntas clave');
    expect(doc.querySelector('#preguntas').textContent).toContain('¿Tiene cambio?');
  });

  it('pinta beneficios inline, y rótulos de Opiniones y Preguntas', () => {
    const doc = montar({
      beneficios: [{ titulo: 'Compra segura', texto: 'Sin letra chica' }],
      opiniones_kicker: 'Clientes', opiniones_titulo: 'Lo que dicen en Luque',
      preguntas_kicker: 'Dudas', preguntas_titulo: 'Antes de pedir',
    });
    expect(doc.querySelector('.highlights [data-gesicomm-bind="titulo"]').textContent).toBe('Compra segura');
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
    const bloque = doc.querySelector('.pdp-limited-offer[data-gesicomm-ficha-bloque="precio"]');
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
    expect(apagado.querySelector('.highlights').hasAttribute('data-gesicomm-ficha-oculto')).toBe(true);
    const prendido = montar({ ficha_bloques: { compra: true }, metodos_pago: [] });
    expect(prendido.querySelector('.payment-methods').hasAttribute('data-gesicomm-ficha-oculto')).toBe(false);
    expect(prendido.querySelector('.payment-methods').style.display).toBe('none');
  });

  it('los logos de PagoPar se apagan desde pago_logos', () => {
    const doc = montar({}, { pago_logos: { tarjetas: false, bocas: false, billetera: false } });
    expect(doc.querySelector('.payment-brands').style.display).toBe('none');
  });
});
