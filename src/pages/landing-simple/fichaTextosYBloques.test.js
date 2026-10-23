import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { datosRuntimePreview, datosRuntimePublico, presentacionComercial, textosRecomendados } from './datosRuntime';
import { PLANTILLA_PRODUCTO, PLANTILLA_CHECKOUT } from './plantillasBaseCodigo';
import { ROTULOS_BLOQUES_FICHA, bloqueDeZona, moverEnOrden, normalizarOrdenMobile } from './PresentacionProducto';

// El panel y la página resuelven la ficha con la misma función. Estas pruebas
// fijan las tres reglas que la mantienen coherente: lo que la landing tocó
// manda (también vacío), lo que no tocó sale del producto, y un texto vacío
// no se dibuja.

function montar(datos, plantilla = PLANTILLA_PRODUCTO) {
  const mensajes = [];
  const dom = new JSDOM(construirDocumentoCodigo(plantilla, { datos }), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.postMessage = m => mensajes.push(m);
      window.scrollTo = () => {};
    },
  });
  const { document } = dom.window;
  const evento = (sel, tipo) => document.querySelector(sel).dispatchEvent(new dom.window.MouseEvent(tipo, { bubbles: true, cancelable: true }));
  const visible = sel => {
    const el = document.querySelector(sel);
    return !!el && el.style.display !== 'none' ? el.textContent.trim() : null;
  };
  return { dom, document, mensajes, evento, visible };
}

const producto = {
  id: 10, tipo: 'producto', nombre: 'Air Fryer', slug: 'air', precio_efectivo: 145735, imagen: 'https://cdn.test/air.jpg', categoria: 'Cocina',
  propuesta_valor: 'Frita sin aceite', descripcion: 'Descripción del producto',
  beneficios: [{ titulo: 'Beneficio del producto', texto: '' }],
  ficha_datos: { presentacion: { urgencia_kicker: 'Kicker del producto' } },
};
const otro = { id: 11, tipo: 'producto', nombre: 'Canasto', slug: 'canasto', precio_efectivo: 50000, imagen: 'https://cdn.test/c.jpg', categoria: 'Cocina' };
const fichaCon = propio => presentacionComercial(producto, { presentacion_productos: { 'producto:10': propio } });

describe('ficha v2: lo que la landing tocó manda, también vacío', () => {
  it('sin tocar, el texto y la lista salen del producto', () => {
    const f = fichaCon({ v: 2 });
    expect(f.urgencia_kicker).toBe('Kicker del producto');
    expect(f.beneficios.map(b => b.titulo)).toEqual(['Beneficio del producto']);
    expect(f.vacios).toEqual([]);
  });

  it('un texto vaciado queda vacío y avisa al runtime; una lista vaciada no vuelve a los ejemplos', () => {
    const f = fichaCon({ v: 2, urgencia_kicker: '', urgencia_titulo: 'Solo hoy', beneficios: [], propuesta_valor: '' });
    expect(f.urgencia_kicker).toBe('');
    expect(f.urgencia_titulo).toBe('Solo hoy');
    expect(f.vacios).toEqual(expect.arrayContaining(['urgencia_kicker', 'propuesta_valor']));
    expect(f.beneficios).toEqual([]);
    expect(f.propuesta_valor).toBeNull();
  });

  it('un texto con "Mostrar" destildado no se dibuja, pero conserva lo escrito', () => {
    const f = fichaCon({ v: 2, preguntas_titulo: 'Dudas', preguntas_kicker: 'FAQ', textos_ocultos: ['preguntas_titulo', 'propuesta_valor'] });
    expect(f.vacios).toEqual(expect.arrayContaining(['preguntas_titulo', 'propuesta_valor']));
    expect(f.vacios).not.toContain('preguntas_kicker');
    expect(f.preguntas_titulo).toBe('Dudas');
    const { visible, dom } = montar(datosRuntimePreview({ productos: [producto, otro], venta: { presentacion_productos: { 'producto:10': { v: 2, textos_ocultos: ['propuesta_valor', 'urgencia_kicker'] } } }, vista: 'producto', productoId: 'air' }));
    expect(visible('[data-gesicomm-bind="propuesta_valor"]')).toBeNull();
    expect(visible('[data-gesicomm-bind="urgencia_kicker"]')).toBeNull();
    expect(visible('.pdp-lead[data-gesicomm-bind="descripcion_ficha"]')).toBe('Descripción del producto');
    dom.window.close();
  }, 20000);

  it('un botón sin texto vuelve a su respaldo: no hay botón de compra sin rótulo', () => {
    expect(fichaCon({ v: 2, cta_texto: '' }).cta_texto).toBe('Comprar con pago anticipado');
  });

  it('en una ficha anterior a la v2, vacío sigue siendo "sin tocar"', () => {
    const f = fichaCon({ urgencia_kicker: '', beneficios: [] });
    expect(f.urgencia_kicker).toBe('Kicker del producto');
    expect(f.beneficios.map(b => b.titulo)).toEqual(['Beneficio del producto']);
  });

  it('sin calificación cargada vale el respaldo, no una estrella', () => {
    expect(fichaCon({ v: 2 }).resenas_calificacion).toBe(4.9);
    expect(fichaCon({ v: 2, resenas_calificacion: '3.5' }).resenas_calificacion).toBe(3.5);
  });

  it('hereda las estrellas editadas en el producto y respeta un ajuste específico de la landing', () => {
    const item = { ...producto, ficha_datos: { presentacion: { titulo_comercial: 'Nombre editado', resenas_calificacion: '3.5' } } };
    expect(presentacionComercial(item, null)).toMatchObject({ titulo_comercial: 'Nombre editado', resenas_calificacion: 3.5 });
    expect(presentacionComercial(item, { presentacion_productos: { 'producto:10': { v: 2 } } }).resenas_calificacion).toBe(3.5);
    expect(presentacionComercial(item, { presentacion_productos: { 'producto:10': { v: 2, resenas_calificacion: 4 } } }).resenas_calificacion).toBe(4);
  });

  it('la página no dibuja el texto vaciado y sí el que viene del producto', () => {
    const datos = venta => datosRuntimePreview({ productos: [producto, otro], venta, vista: 'producto', productoId: 'air' });
    const sinTocar = montar(datos({ presentacion_productos: { 'producto:10': { v: 2 } } }));
    expect(sinTocar.visible('[data-gesicomm-bind="urgencia_kicker"]')).toBe('Kicker del producto');
    expect(sinTocar.visible('[data-gesicomm-bind="propuesta_valor"]')).toBe('Frita sin aceite');
    expect(sinTocar.visible('.eyebrow[data-gesicomm-bind="insignia_principal"]')).toBe('Cocina');
    const vaciado = montar(datos({ presentacion_productos: { 'producto:10': { v: 2, urgencia_kicker: '', propuesta_valor: '', insignia_principal: '', mensaje_comercial: '' } } }));
    expect(vaciado.visible('[data-gesicomm-bind="urgencia_kicker"]')).toBeNull();
    expect(vaciado.visible('[data-gesicomm-bind="propuesta_valor"]')).toBeNull();
    expect(vaciado.visible('.eyebrow[data-gesicomm-bind="insignia_principal"]')).toBeNull();
    expect(vaciado.visible('.pdp-lead[data-gesicomm-bind="descripcion_ficha"]')).toBeNull();
  }, 20000);
});

describe('textos de Productos recomendados', () => {
  it('una landing anterior conserva el título y el botón que ya mostraba, sin el rótulo repetido', () => {
    expect(textosRecomendados({ titulo: '' })).toMatchObject({ kicker: '', titulo: 'Te puede gustar', subtitulo: '', cta_texto: 'Agregar' });
    expect(textosRecomendados({ titulo: 'Seguí mirando' }).titulo).toBe('Seguí mirando');
    expect(textosRecomendados(undefined).mostrar).toEqual({ kicker: true, titulo: true, subtitulo: true, cta: true });
  });

  it('desde que cada texto se puede ocultar, vacío es vacío', () => {
    const t = textosRecomendados({ titulo: '', cta_texto: '', mostrar: { titulo: true, cta: true } });
    expect(t.titulo).toBe('');
    expect(t.cta_texto).toBe('');
  });

  it('la ficha no dibuja lo vacío ni lo destildado, y el botón de cada tarjeta desaparece con su texto', () => {
    const datos = recomendados => datosRuntimePreview({ productos: [producto, otro], venta: { recomendados }, vista: 'producto', productoId: 'air' });
    const todo = montar(datos({ kicker: 'Rótulo', titulo: 'Título', subtitulo: 'Sub', cta_texto: 'Sumar', mostrar: {} }));
    expect(todo.visible('#relacionados [data-gesicomm-venta="recomendados_kicker"]')).toBe('Rótulo');
    expect(todo.visible('#relacionados .product-card [data-gesicomm-agregar]')).toBe('Sumar');
    const parcial = montar(datos({ kicker: '', titulo: 'Título', subtitulo: 'Sub', cta_texto: '', mostrar: { subtitulo: false } }));
    expect(parcial.visible('#relacionados [data-gesicomm-venta="recomendados_kicker"]')).toBeNull();
    expect(parcial.visible('#relacionados [data-gesicomm-venta="recomendados_titulo"]')).toBe('Título');
    expect(parcial.visible('#relacionados [data-gesicomm-venta="recomendados_subtitulo"]')).toBeNull();
    expect(parcial.document.querySelector('#relacionados .product-card')).toBeTruthy();
    expect(parcial.visible('#relacionados .product-card [data-gesicomm-agregar]')).toBeNull();
  }, 20000);
});

describe('bloques de la ficha en la vista previa del editor', () => {
  const datos = extra => datosRuntimePreview({ productos: [producto, otro], venta: {}, vista: 'producto', productoId: 'air', ...extra });

  it('cada zona de la plantilla tiene su bloque del panel', () => {
    const zonas = [...PLANTILLA_PRODUCTO.html.matchAll(/data-gesicomm-ficha-bloque="([a-z_]+)"/g)].map(m => m[1]);
    expect(zonas.length).toBeGreaterThan(10);
    zonas.forEach(zona => expect(bloqueDeZona(zona), zona).toBeTruthy());
    expect(bloqueDeZona('badge_precio')).toBe('precio');
    expect(bloqueDeZona('oferta_texto')).toBe('oferta');
  });

  it('al pasar el mouse rotula el bloque y un clic en una zona sin acción pide abrirlo', () => {
    const { document, mensajes, evento } = montar(datos({ bloquesEditor: ROTULOS_BLOQUES_FICHA }));
    evento('h1[data-gesicomm-bind="nombre"]', 'mouseover');
    expect(document.querySelector('[data-gesicomm-rotulo-bloque]').textContent).toBe('3 · Nombre comercial · clic para editar');
    expect(document.querySelector('h1[data-gesicomm-bind="nombre"]').style.outline).toMatch(/solid/);
    evento('h1[data-gesicomm-bind="nombre"]', 'click');
    evento('[data-gesicomm-ficha-bloque="oferta_nombre"]', 'click');
    expect(mensajes.filter(m => m.tipo === 'gesicomm:bloque').map(m => m.clave)).toEqual(['nombre_comercial', 'oferta_nombre']);
  }, 20000);

  it('un botón de la ficha sigue comprando: el clic no se lo queda el editor', () => {
    const { mensajes, evento } = montar(datos({ bloquesEditor: ROTULOS_BLOQUES_FICHA }));
    evento('.payment-action', 'click');
    expect(mensajes.filter(m => m.tipo === 'gesicomm:bloque')).toEqual([]);
    expect(mensajes.filter(m => m.tipo === 'gesicomm:checkout')).toHaveLength(1);
  }, 20000);

  it('sin el mapa (tienda publicada) no hay rótulos ni avisos al contenedor', () => {
    const { document, mensajes, evento } = montar(datos());
    evento('h1[data-gesicomm-bind="nombre"]', 'mouseover');
    evento('h1[data-gesicomm-bind="nombre"]', 'click');
    expect(document.querySelector('[data-gesicomm-rotulo-bloque]')).toBeNull();
    expect(mensajes.filter(m => m.tipo === 'gesicomm:bloque')).toEqual([]);
  }, 20000);
});

describe('checkout propio: datos que exige el pago anticipado', () => {
  const mouse = { content_id: 'mouse', referencia_id: 1, tipo: 'producto', nombre: 'Mouse', precio: 89000, imagen: 'https://cdn.test/m.jpg', stock: 4, ofertas: [] };
  const carrito = [{ clave: 'm', tipo: 'producto', contentId: 'mouse', nombre: 'Mouse', precio: 89000, cantidad: 1 }];
  const checkout = (pasarelas, plantilla = PLANTILLA_CHECKOUT) => montar(
    datosRuntimePublico({ catalogo_items: [mouse], content: {}, checkout: { pasarelas } }, 'tienda', null, { vista: 'checkout', carrito }),
    plantilla,
  );
  const campo = (document, nombre) => document.querySelector(`form[data-gesicomm-checkout-form] [name="${nombre}"]`);
  const rotulo = (document, nombre) => campo(document, nombre).closest('label').querySelector('span').textContent;
  const elegir = (dom, valor) => {
    const radio = dom.window.document.querySelector(`input[name="payment_method"][value="${valor}"]`);
    radio.checked = true;
    radio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  };

  it('con pago anticipado la cédula y el correo son obligatorios; contra entrega no', () => {
    const { dom, document } = checkout([{ provider: 'pagopar' }]);
    expect(campo(document, 'documento').required).toBe(true);
    expect(campo(document, 'email').required).toBe(true);
    expect(rotulo(document, 'documento')).toMatch(/\*$/);
    elegir(dom, 'contra_entrega');
    expect(campo(document, 'documento').required).toBe(false);
    expect(campo(document, 'email').required).toBe(false);
    expect(rotulo(document, 'documento')).not.toMatch(/\*/);
    elegir(dom, 'pagopar');
    expect(campo(document, 'documento').required).toBe(true);
    dom.window.close();
  }, 20000);

  it('en una tienda sin PagoPar no se exige la cédula ni el correo', () => {
    const { dom, document } = checkout([]);
    expect(campo(document, 'documento').required).toBe(false);
    expect(campo(document, 'email').required).toBe(false);
    expect(campo(document, 'acepta_promociones').type).toBe('checkbox');
    dom.window.close();
  }, 20000);

  it('el pedido lleva el correo y si aceptó recibir promociones', () => {
    const { dom, document, mensajes } = checkout([]);
    const llenar = (nombre, valor) => { campo(document, nombre).value = valor; };
    llenar('nombre_cliente', 'Ana'); llenar('telefono', '0981'); llenar('direccion', 'Calle 1'); llenar('email', 'ana@correo.com');
    const ciudad = campo(document, 'ciudad'); ciudad.add(new dom.window.Option('Luque', 'Luque')); ciudad.value = 'Luque';
    campo(document, 'acepta_promociones').checked = true;
    document.querySelector('form[data-gesicomm-checkout-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const pedido = mensajes.find(m => m.tipo === 'gesicomm:confirmar-checkout');
    expect(pedido.campos).toMatchObject({ email: 'ana@correo.com', acepta_promociones: true, payment_method: 'contra_entrega' });
    dom.window.close();
  }, 20000);

  it('"Necesito factura" muestra y exige razón social y RUC; al destildar se vacían', () => {
    const { dom, document } = checkout([]);
    const factura = campo(document, 'quiere_factura');
    const caja = campo(document, 'ruc').closest('label');
    expect(caja.style.display).toBe('none');
    expect(campo(document, 'ruc').required).toBe(false);
    factura.checked = true;
    factura.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(caja.style.display).not.toBe('none');
    expect(campo(document, 'ruc').required).toBe(true);
    expect(campo(document, 'razon_social').required).toBe(true);
    campo(document, 'ruc').value = '80012345-6';
    factura.checked = false;
    factura.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(caja.style.display).toBe('none');
    expect(campo(document, 'ruc').value).toBe('');
    expect(campo(document, 'ruc').required).toBe(false);
    dom.window.close();
  }, 20000);

  it('un checkout personalizado sin esos campos los recibe igual', () => {
    const html = PLANTILLA_CHECKOUT.html
      .replace(/<label class="lv-field">\s*<span>Correo electronico<\/span>[\s\S]*?<\/label>/, '')
      .replace(/<label class="lv-consent lv-wide">[\s\S]*?<\/label>/, '');
    expect(html).not.toContain('name="email"');
    const { dom, document } = checkout([{ provider: 'pagopar' }], { ...PLANTILLA_CHECKOUT, html });
    expect(campo(document, 'email').type).toBe('email');
    expect(campo(document, 'email').required).toBe(true);
    expect(campo(document, 'acepta_promociones')).toBeTruthy();
    dom.window.close();
  }, 20000);
});

describe('checkout propio: el pedido ya existe y el carrito quedó vacío', () => {
  const mouse = { content_id: 'mouse', referencia_id: 1, tipo: 'producto', nombre: 'Mouse', precio: 89000, imagen: 'https://cdn.test/m.jpg', stock: 4, ofertas: [] };
  const conEstado = checkoutEstado => montar(
    datosRuntimePublico({ catalogo_items: [mouse], content: {}, checkout: { pasarelas: [{ provider: 'pagopar' }] } }, 'tienda', null, { vista: 'checkout', carrito: [], checkoutEstado }),
    PLANTILLA_CHECKOUT,
  );
  const mostrado = (document, sel) => document.querySelector(sel).style.display !== 'none';
  const texto = (document, campo) => document.querySelector(`[data-gesicomm-checkout-confirmado] [data-gesicomm-checkout="${campo}"]`).textContent;

  it('sin pedido muestra el carrito vacío', () => {
    const { dom, document } = conEstado(null);
    expect(mostrado(document, '[data-gesicomm-checkout-vacio]')).toBe(true);
    expect(mostrado(document, '[data-gesicomm-checkout-confirmado]')).toBe(false);
    dom.window.close();
  }, 20000);

  it('si el pago anticipado no se pudo abrir, lo dice: no muestra "tu pedido no tiene productos"', () => {
    const { dom, document } = conEstado({ estado: 'pago_pendiente', mensaje: 'Recibimos tu pedido 12, pero no pudimos abrir el pago online en este momento.', numero_pedido: 12 });
    expect(mostrado(document, '[data-gesicomm-checkout-vacio]')).toBe(false);
    expect(mostrado(document, '[data-gesicomm-checkout-confirmado]')).toBe(true);
    expect(texto(document, 'estado_titulo')).toBe('Tu pedido quedó registrado');
    expect(texto(document, 'estado_rotulo')).toBe('Pago pendiente');
    expect(texto(document, 'mensaje')).toMatch(/pedido 12/);
    expect(texto(document, 'estado_ayuda')).toMatch(/No se te cobró nada/);
    dom.window.close();
  }, 20000);

  it('mientras abre PagoPar tampoco muestra el carrito vacío, y el pedido confirmado sigue igual', () => {
    const yendo = conEstado({ estado: 'redirigiendo', mensaje: 'Un momento' });
    expect(mostrado(yendo.document, '[data-gesicomm-checkout-vacio]')).toBe(false);
    expect(texto(yendo.document, 'estado_titulo')).toBe('Te llevamos a PagoPar');
    yendo.dom.window.close();
    const listo = conEstado({ estado: 'confirmado', mensaje: 'Pedido 3 confirmado.' });
    expect(texto(listo.document, 'estado_titulo')).toBe('¡Gracias por tu compra!');
    expect(mostrado(listo.document, '[data-gesicomm-checkout-vacio]')).toBe(false);
    listo.dom.window.close();
  }, 20000);
});

describe('orden de los bloques de la ficha (arrastrar en el panel)', () => {
  const claves = (padre, enInfo) => [...padre.children]
    .map(el => el.getAttribute('data-gesicomm-ficha-bloque') || (enInfo ? `[${el.getAttribute('data-gesicomm-lista') || el.className}]` : el.tagName.toLowerCase()))
    .filter(c => !['script', 'style', 'template'].includes(c));
  const fichaOrdenada = orden => montar(datosRuntimePreview({
    productos: [producto, otro], tienda: { nombre: 'T' }, vista: 'producto', productoId: 'air',
    venta: { presentacion_productos: { 'producto:10': { v: 2, ficha_orden_mobile: orden } } },
  }));

  it('un bloque solo se mueve dentro de su grupo; la galería queda fija', () => {
    const base = normalizarOrdenMobile([]);
    expect(moverEnOrden(base, 'beneficios', 'recomendados')).toBeNull();
    expect(moverEnOrden(base, 'confianza', 'incluye')).toBeNull();
    expect(moverEnOrden(base, 'galeria', 'encabezado')).toBeNull();
    const abajo = moverEnOrden(base, 'beneficios', 'incluye');
    expect(abajo.indexOf('beneficios')).toBe(abajo.indexOf('incluye') + 1);
    const arriba = moverEnOrden(base, 'confianza', 'recomendados');
    expect(arriba.indexOf('confianza')).toBe(arriba.indexOf('recomendados') - 1);
  });

  it('el badge de precio viaja pegado al precio', () => {
    const orden = moverEnOrden(normalizarOrdenMobile([]), 'precio', 'descripcion');
    expect(orden.indexOf('badge_precio')).toBe(orden.indexOf('precio') + 1);
    expect(orden.indexOf('precio')).toBeGreaterThan(orden.indexOf('descripcion'));
  });

  it('un orden viejo que mezclaba grupos se muestra como lo arma la página', () => {
    const orden = normalizarOrdenMobile(['recomendados', 'beneficios', 'galeria']);
    expect(orden[0]).toBe('galeria');
    expect(orden.indexOf('beneficios')).toBeLessThan(orden.indexOf('recomendados'));
    expect(orden.slice(-4).sort()).toEqual(['confianza', 'opiniones', 'preguntas', 'recomendados']);
  });

  it('se aplica en computadora, y las secciones no terminan debajo del footer', () => {
    const orden = ['confianza', ...normalizarOrdenMobile(moverEnOrden(normalizarOrdenMobile([]), 'beneficios', 'incluye'))];
    const { document, dom } = fichaOrdenada(orden);
    const info = claves(document.querySelector('.pdp-info'), true).filter(c => !c.startsWith('['));
    expect(info.slice(-2)).toEqual(['incluye', 'beneficios']);
    const body = claves(document.body, false);
    expect(body.indexOf('confianza')).toBeLessThan(body.indexOf('recomendados'));
    expect(body.indexOf('preguntas')).toBeLessThan(body.indexOf('footer'));
    expect(body.indexOf('main')).toBeLessThan(body.indexOf('confianza'));
    dom.window.close();
  });

  it('lo que se elige antes de comprar (variantes, bumps, paquetes) sube con los botones de compra', () => {
    const orden = moverEnOrden(normalizarOrdenMobile([]), 'contacto_pago', 'oferta');
    const { document, dom } = fichaOrdenada(orden);
    const info = claves(document.querySelector('.pdp-info'), true);
    const compra = info.indexOf('contacto_pago');
    expect(info.slice(compra - 4, compra)).toEqual(['[variantes]', '[ofertas_bump]', '[bump-incluye]', '[paquetes]']);
    // "Este combo trae" sigue con la descripción, no queda en el medio de la compra.
    expect(info.indexOf('[combo_incluye]')).toBe(info.lastIndexOf('descripcion') + 1);
    expect(compra).toBeLessThan(info.indexOf('oferta'));
    expect(info.indexOf('oferta')).toBeLessThan(info.indexOf('descripcion'));
    dom.window.close();
  });

  it('mover solo secciones no toca la columna del producto', () => {
    const { document, dom } = fichaOrdenada(moverEnOrden(normalizarOrdenMobile([]), 'preguntas', 'recomendados'));
    const base = new JSDOM(PLANTILLA_PRODUCTO.html).window.document;
    expect(claves(document.querySelector('.pdp-info'), true)).toEqual(claves(base.querySelector('.pdp-info'), true));
    const body = claves(document.body, false);
    expect(body.indexOf('preguntas')).toBeLessThan(body.indexOf('recomendados'));
    dom.window.close();
  });

  it('sin orden propio la ficha queda como viene en su HTML', () => {
    const { document, dom } = fichaOrdenada(undefined);
    const base = new JSDOM(PLANTILLA_PRODUCTO.html).window.document;
    expect(claves(document.querySelector('.pdp-info'), true)).toEqual(claves(base.querySelector('.pdp-info'), true));
    dom.window.close();
  });
});
