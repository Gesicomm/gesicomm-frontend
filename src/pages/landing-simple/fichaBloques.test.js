import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { presentacionComercial } from './datosRuntime';
import {
  PLANTILLA_CATALOGO,
  PLANTILLA_CHECKOUT,
  PLANTILLA_INICIO,
  PLANTILLA_PRODUCTO,
} from './plantillasBaseCodigo';

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

function montar(presentacion, ventaExtra = {}, itemExtra = {}, datosExtra = {}) {
  const v = venta(presentacion, ventaExtra);
  const item = { ...base, ...itemExtra };
  const producto = { ...item, ...presentacionComercial(item, v) };
  const html = construirDocumentoCodigo(PLANTILLA_PRODUCTO, {
    datos: {
      vista: 'producto',
      tienda: {},
      productos: datosExtra.productos || [producto],
      producto,
      recomendados: datosExtra.recomendados || [],
      venta: v,
    },
  });
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
  it('mantiene un solo header y ancho completo en las plantillas base', () => {
    const plantillas = [PLANTILLA_INICIO, PLANTILLA_CATALOGO, PLANTILLA_PRODUCTO, PLANTILLA_CHECKOUT];
    const menuEsperado = ['Inicio', 'Productos', 'Descuentos', 'Nosotros', 'Contacto'];

    for (const plantilla of plantillas) {
      const doc = new JSDOM(plantilla.html).window.document;
      const links = [...doc.querySelectorAll('.commerce-header .nav-links a')].map((a) => a.textContent.trim());

      expect(links).toEqual(menuEsperado);
      expect(plantilla.css).toContain('gesicomm-header-unificado');
      expect(plantilla.css).toContain('gesicomm-ancho-completo');
      expect(plantilla.css).toContain('gesicomm-checkout-centrado');
      expect(plantilla.css).toContain('gesicomm-gallery-image-fit');
    }
  });

  it('impacta bloque por bloque en el documento real de preview', () => {
    const doc = montar({
      resenas_texto: '4.8 · 88 reseñas reales',
      resenas_calificacion: 4.8,
      insignia_principal: 'Hot sale',
      insignia_secundaria: 'Exclusivo online',
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
      confianza: [{ icono: '♡', titulo: 'Compra protegida', texto: 'Tu pago y tus datos están seguros.' }],
      cta_texto: 'Comprar esta remera',
      agregar_carrito_texto: 'Sumar al carrito',
      botones_pago: [{ label: 'Pagar por WhatsApp', tipo: 'whatsapp', valor: 'Hola' }],
      metodos_pago: [{ texto: 'Giros Tigo' }],
      incluye_pedido: [{ texto: '1 remera premium' }],
      opiniones_kicker: 'Clientes reales',
      opiniones_titulo: 'Lo que cuentan',
      opiniones_subtitulo: 'Comentarios cargados por la tienda.',
      opiniones: [{ nombre: 'Ana', comentario: 'La tela se siente muy bien.', detalle: 'Compra verificada', calificacion: 5 }],
      preguntas_kicker: 'Dudas antes de comprar',
      preguntas_titulo: 'Preguntas clave',
      preguntas_subtitulo: 'Respuestas breves.',
      preguntas: [{ pregunta: '¿Tiene cambio?', respuesta: 'Sí, según política de la tienda.' }],
    }, { pago_logos: { tarjetas: false, bocas: true, billetera: false } }, { imagen: 'https://cdn.test/remera.webp', propuesta_valor: 'Descripción corta bajo el nombre.' });

    expect(doc.querySelector('.gallery img[data-gesicomm-imagen-principal]').getAttribute('src')).toContain('remera.webp');
    expect(doc.querySelector('.pdp-info [data-gesicomm-bind="insignia_principal"]').textContent).toBe('Hot sale');
    expect(doc.querySelector('.pdp-info [data-gesicomm-bind="nombre"]').textContent).toBe('Remera premium test');
    const titulo = doc.querySelector('.pdp-info [data-gesicomm-bind="nombre"]');
    const precio = doc.querySelector('.pdp-prices');
    const badge = doc.querySelector('.pdp-price-badge');
    const oferta = doc.querySelector('.pdp-limited-offer[data-gesicomm-ficha-bloque="oferta"]');
    const descripcion = doc.querySelector('.pdp-promesa');
    const resenas = doc.querySelector('.pdp-reviews');
    const beneficios = doc.querySelector('.highlights');
    const compra = doc.querySelector('.buy-row');
    const botonesPago = doc.querySelector('.payment-actions');
    const botonesContacto = doc.querySelector('.contact-actions');
    const disponibilidad = doc.querySelector('.payment-methods');
    const incluye = doc.querySelector('.order-includes');
    const confianza = doc.querySelector('#confianza-producto');
    const recomendados = doc.querySelector('#relacionados');
    const opiniones = doc.querySelector('#opiniones');
    const preguntas = doc.querySelector('#preguntas');
    const sigue = (a, b) => {
      expect(a).toBeTruthy();
      expect(b).toBeTruthy();
      expect(a.compareDocumentPosition(b) & doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    };
    expect(descripcion.textContent).toBe('Descripción corta bajo el nombre.');
    sigue(titulo, resenas);
    sigue(resenas, precio);
    sigue(precio, badge);
    sigue(badge, oferta);
    sigue(oferta, descripcion);
    sigue(descripcion, beneficios);
    sigue(beneficios, compra);
    sigue(compra, botonesPago);
    sigue(botonesPago, botonesContacto);
    sigue(botonesContacto, disponibilidad);
    sigue(disponibilidad, incluye);
    sigue(incluye, recomendados);
    sigue(recomendados, confianza);
    sigue(confianza, opiniones);
    sigue(opiniones, preguntas);
    expect(doc.querySelectorAll('#opiniones')).toHaveLength(1);
    expect(doc.querySelectorAll('#preguntas')).toHaveLength(1);
    expect(doc.querySelector('.pdp-reviews [data-gesicomm-bind="resenas_texto"]').textContent).toBe('4.8 · 88 reseñas reales');
    expect(doc.querySelector('.pdp-reviews [data-gesicomm-bind="resenas_estrellas"]').getAttribute('aria-label')).toBe('4,8 de 5 estrellas');
    expect(doc.querySelectorAll('.pdp-reviews [data-gesicomm-bind="resenas_estrellas"] .gc-star')).toHaveLength(5);
    expect(doc.querySelector('.pdp-reviews [data-gesicomm-bind="resenas_estrellas"] .gc-star:nth-child(5)').getAttribute('style')).toContain('80');
    expect(doc.querySelector('.pdp-lead').textContent).toBe('Tela liviana para todos los días.');
    expect(doc.querySelector('[data-gesicomm-ficha-bloque="badge_precio"][data-gesicomm-bind="badge_precio"]').textContent).toBe('Exclusivo online');
    expect(doc.querySelector('[data-gesicomm-ficha-bloque="oferta_encabezado"][data-gesicomm-bind="urgencia_kicker"]').textContent).toBe('Solo hasta hoy');
    expect(doc.querySelector('[data-gesicomm-ficha-bloque="oferta_nombre"][data-gesicomm-bind="urgencia_titulo"]').textContent).toBe('Reservá el precio antes de medianoche');
    expect(doc.querySelector('[data-gesicomm-ficha-bloque="oferta_texto"][data-gesicomm-bind="urgencia_texto"]').textContent).toBe('El descuento se corta al terminar el contador.');
    expect(doc.querySelectorAll('.pdp-limited-offer[data-gesicomm-ficha-bloque="oferta"]')).toHaveLength(1);
    expect(doc.querySelector('.highlights [data-gesicomm-bind="titulo"]').textContent).toBe('Costura reforzada');
    expect(doc.querySelector('#confianza-producto .pdp-trust-icon').textContent).toBe('♡');
    expect(doc.querySelector('#confianza-producto [data-gesicomm-bind="titulo"]').textContent).toBe('Compra protegida');
    expect(doc.querySelector('#confianza-producto [data-gesicomm-bind="texto"]').textContent).toBe('Tu pago y tus datos están seguros.');
    expect(doc.querySelector('[data-gesicomm-comprar] [data-gesicomm-bind="cta_texto"]').textContent).toBe('Comprar esta remera');
    expect(doc.querySelector('.payment-action [data-gesicomm-bind="label"]').textContent).toBe('Pagar por WhatsApp');
    expect(doc.querySelector('.payment-methods [data-gesicomm-generado]').textContent).toBe('Giros Tigo');
    expect(doc.querySelector('.order-includes [data-gesicomm-generado]').textContent).toBe('1 remera premium');
    expect([...doc.querySelectorAll('.payment-brand-name')].map(el => el.textContent.trim())).toEqual(['Credicheck', 'Panal']);
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
    expect(doc.querySelectorAll('#opiniones .opinion-card')).toHaveLength(2);
    expect(doc.querySelector('[data-gesicomm-bind="preguntas_kicker"]').textContent).toBe('Dudas');
    expect(doc.querySelector('[data-gesicomm-bind="preguntas_titulo"]').textContent).toBe('Antes de pedir');
  });

  it('el contador de la ficha usa la duración cargada aunque la Oferta flash sea de otro producto', () => {
    const doc = montar(
      { urgencia_kicker: 'Solo hoy', urgencia_horas: '5', urgencia_minutos: '30', urgencia_segundos: '0' },
      { urgencia: { activo: true, fin_at: new Date(Date.now() + 864e5).toISOString(), productos: ['otro-producto'] } },
    );
    const bloque = doc.querySelector('.pdp-limited-offer[data-gesicomm-ficha-bloque="oferta"]');
    expect(bloque.style.display).not.toBe('none');
    expect(doc.querySelector('[data-gesicomm-ficha-bloque="oferta_encabezado"][data-gesicomm-bind="urgencia_kicker"]').textContent).toBe('Solo hoy');
    expect(['05', '04']).toContain(bloque.querySelector('[data-gesicomm-countdown-parte="horas"]').textContent);
  });

  it('muestra las reseñas comerciales aunque no se escriba texto y limita las estrellas a cinco', () => {
    const doc = montar({ resenas_texto: '', resenas_calificacion: 2.8 });
    const bloque = doc.querySelector('.pdp-reviews');
    const estrellas = bloque.querySelector('[data-gesicomm-bind="resenas_estrellas"]');

    expect(bloque.style.display).not.toBe('none');
    expect(estrellas.getAttribute('aria-label')).toBe('2,8 de 5 estrellas');
    expect(estrellas.querySelectorAll('.gc-star')).toHaveLength(5);
    expect(estrellas.textContent).toBe('★★★★★');
    expect(bloque.querySelector('[data-gesicomm-bind="resenas_texto"]').style.display).toBe('none');
  });

  it('muestra solo métodos de pago personalizados y oculta los chips viejos', () => {
    const conUno = montar({ metodos_pago: [{ texto: 'Pago contra entrega' }, { texto: 'Giros Tigo' }, { texto: 'Transferencia bancaria' }] });
    expect([...conUno.querySelectorAll('.payment-methods [data-gesicomm-generado]')].map(e => e.textContent.trim())).toEqual(['Giros Tigo']);

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

  it('muestra el precio anterior en las tarjetas de recomendados', () => {
    const recomendado = {
      id: 'botella',
      referencia_id: 22,
      tipo: 'producto',
      nombre: 'Botella Aromática 750 ml',
      precio: 119000,
      precio_antes: 220000,
      descuento_pct: 46,
      ahorro: 101000,
      imagen: null,
      imagenes_url: [],
      categoria: 'Bienestar',
      stock: 4,
      agotado: false,
      variantes: [],
      ofertas: [],
      url: '/botella-aromatica-750-ml',
    };

    const doc = montar({}, {}, {}, { recomendados: [recomendado] });
    const tarjeta = doc.querySelector('#relacionados .product-card[data-gesicomm-generado]');

    expect(tarjeta.querySelector('.price').textContent).toBe('Gs 119.000');
    expect(tarjeta.querySelector('.price-old').textContent).toBe('Gs 220.000');
    expect(tarjeta.textContent).toContain('Ahorrás Gs 101.000');
  });
});
