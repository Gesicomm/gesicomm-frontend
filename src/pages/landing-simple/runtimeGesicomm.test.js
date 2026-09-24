import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { datosRuntimePublico, datosRuntimePreview } from './datosRuntime';
import { PLANTILLA_INICIO, PLANTILLA_PRODUCTO, PLANTILLA_ESTRELLA, PLANTILLA_COMBOS, plantillaInicioPara, formatoDeBase } from './plantillasBaseCodigo';

/**
 * El runtime corre dentro del iframe del lienzo en blanco y es lo único
 * que convierte el HTML del comercio en una tienda que vende: si una lista
 * no se pinta o un clic no llega al contenedor, la landing se ve bien y no
 * vende nada, sin ningún error visible. Por eso se prueba con el documento
 * REAL (construirDocumentoCodigo + plantillas base), no con el runtime suelto.
 */

const airFryer = {
  id: 'air-fryer-26l', referencia_id: 10, tipo: 'producto', nombre: 'Air Fryer 2.6L',
  descripcion: 'Rápida y práctica', precio: 145735, precio_antes: 180000, descuento_pct: 19,
  imagen: 'https://cdn.test/air.jpg', imagenes_url: ['https://cdn.test/air.jpg', 'https://cdn.test/air2.jpg'],
  categoria: 'Cocina', stock: 5, agotado: false, variantes: [], ofertas: [], url: '/air-fryer-26l',
};
const remera = {
  id: 'remera', referencia_id: 11, tipo: 'producto', nombre: 'Remera', precio: 50000, imagen: null,
  imagenes_url: [], categoria: 'Ropa', stock: 3, agotado: false,
  variantes: [{ id: 1, nombre: 'S', stock: 0, precio_efectivo: 50000 }, { id: 2, nombre: 'M', stock: 3, precio_efectivo: 55000 }],
  ofertas: [{ id: 77, nombre: 'Llevá 2', estrategia: 'normal', precio_efectivo: 90000, precio_normal: 100000, imagen: null }],
  url: '/remera',
};
const malicioso = {
  id: 'malo', referencia_id: 12, tipo: 'producto', nombre: '<img src=x onerror="window.__xss=1"></script><b>x</b>',
  precio: 1000, imagen: 'javascript:alert(1)', imagenes_url: [], categoria: 'Cocina', stock: null,
  agotado: false, variantes: [], ofertas: [], url: '/malo',
};

function montar(plantilla, datos) {
  const html = construirDocumentoCodigo(plantilla, { datos });
  const mensajes = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      // En jsdom parent === window: se captura lo que el runtime le manda
      // al contenedor.
      window.postMessage = m => mensajes.push(m);
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = function () { window.__scrolleado = this.id || true; };
    },
  });
  const { document } = dom.window;
  const click = sel => document.querySelector(sel).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return { dom, window: dom.window, document, mensajes, click };
}

describe('runtime del lienzo en blanco — inicio', () => {
  const datos = { vista: 'inicio', tienda: { nombre: 'Mi Tienda', whatsapp: '0981 123' }, productos: [airFryer, remera, malicioso], producto: null, recomendados: [] };

  it('pinta una tarjeta por producto, el destacado y el contador', () => {
    const { document } = montar(PLANTILLA_INICIO, datos);
    const tarjetas = document.querySelectorAll('#productos [data-gesicomm-item]');
    expect(tarjetas).toHaveLength(3);
    expect(tarjetas[0].querySelector('[data-gesicomm-bind="nombre"]').textContent).toBe('Air Fryer 2.6L');
    expect(tarjetas[0].querySelector('[data-gesicomm-bind="precio"]').textContent).toMatch(/^Gs 145\.735$/);
    expect(document.querySelectorAll('.hero-card')).toHaveLength(1);
    expect(document.querySelector('[data-gesicomm-total]').textContent).toBe('3 productos disponibles');
    expect(document.querySelector('.brand [data-gesicomm-tienda="nombre"]').textContent).toBe('Mi Tienda');
  });

  it('oculta la sección de combos entera si no hay combos, sin duplicar tarjetas', () => {
    const { document } = montar(PLANTILLA_INICIO, datos);
    expect(document.querySelector('#combos').style.display).toBe('none');
    const conCombo = montar(PLANTILLA_INICIO, { ...datos, productos: [...datos.productos, { ...airFryer, id: 'combo-3', tipo: 'combo', nombre: 'Pack', productos_incluidos: ['A', 'B'] }] });
    expect(conCombo.document.querySelector('#combos').style.display).toBe('');
    expect(conCombo.document.querySelectorAll('#combos [data-gesicomm-item]')).toHaveLength(1);
    expect(conCombo.document.querySelector('#combos [data-gesicomm-bind="incluye"]').textContent).toBe('A, B');
  });

  it('"Comprar ahora" manda el producto de la tarjeta al carrito', () => {
    const { mensajes, click } = montar(PLANTILLA_INICIO, datos);
    click('#productos [data-gesicomm-item="air-fryer-26l"] [data-gesicomm-comprar]');
    expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'air-fryer-26l', cantidad: 1, abrir: true }));
  });

  it('un producto con variantes comprado desde la grilla lleva a su ficha', () => {
    const { mensajes, click } = montar(PLANTILLA_INICIO, datos);
    click('#productos [data-gesicomm-item="remera"] [data-gesicomm-comprar]');
    expect(mensajes).toContainEqual({ tipo: 'gesicomm:navegar', destino: 'producto', producto: 'remera' });
    expect(mensajes.some(m => m.tipo === 'gesicomm:checkout')).toBe(false);
  });

  it('un link #ancla scrollea adentro en vez de navegar la ventana de afuera', () => {
    const { window, click } = montar(PLANTILLA_INICIO, datos);
    click('a[href="#productos"]');
    expect(window.__scrolleado).toBe('productos');
  });

  it('el texto del catálogo nunca se interpreta como HTML', () => {
    const { window, document } = montar(PLANTILLA_INICIO, datos);
    const nombre = document.querySelector('[data-gesicomm-item="malo"] [data-gesicomm-bind="nombre"]');
    expect(nombre.textContent).toContain('<img src=x');
    expect(nombre.querySelector('img, b')).toBeNull();
    expect(window.__xss).toBeUndefined();
    // Una imagen con esquema peligroso no se carga.
    expect(document.querySelector('[data-gesicomm-item="malo"] img').getAttribute('src')).toBeNull();
    // Y el `</script>` del nombre no cortó el documento: el resto se pintó.
    expect(document.querySelectorAll('#productos [data-gesicomm-item]')).toHaveLength(3);
  });

  it('el formulario de contacto registra un Lead', () => {
    const { window, document, mensajes } = montar(PLANTILLA_INICIO, datos);
    window.open = () => null;
    document.querySelector('#nombre').value = 'Ana';
    document.querySelector('#telefono').value = '0981';
    document.querySelector('#mensaje').value = 'Hola';
    document.querySelector('[data-gesicomm-form]').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:evento', nombre: 'Lead' }));
  });
});

describe('runtime del lienzo en blanco — ficha de producto', () => {
  const datos = { vista: 'producto', tienda: {}, productos: [airFryer, remera], producto: remera, recomendados: [airFryer] };

  it('pinta variantes, ofertas y recomendados del producto', () => {
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    expect(document.querySelector('h1[data-gesicomm-bind="nombre"]').textContent).toBe('Remera');
    expect(document.querySelectorAll('[data-gesicomm-variante-id]')).toHaveLength(2);
    expect(document.querySelector('[data-gesicomm-variante-id="1"]').hasAttribute('data-agotado')).toBe(true);
    expect(document.querySelectorAll('[data-gesicomm-oferta-id]')).toHaveLength(1);
    expect(document.querySelectorAll('#relacionados [data-gesicomm-item]')).toHaveLength(1);
  });

  it('no deja comprar sin elegir variante, y con variante manda variante y cantidad', () => {
    const { document, mensajes, click } = montar(PLANTILLA_PRODUCTO, datos);
    click('.buy-row [data-gesicomm-comprar]');
    expect(mensajes.some(m => m.tipo === 'gesicomm:checkout')).toBe(false);

    click('[data-gesicomm-variante-id="2"]');
    expect(document.querySelector('[data-gesicomm-variante-id="2"]').classList.contains('is-selected')).toBe(true);
    // El precio suelto de la ficha pasa a ser el de la variante.
    expect(document.querySelector('.pdp-prices [data-gesicomm-bind="precio"]').textContent).toMatch(/55\.000/);

    document.querySelector('[data-gesicomm-cantidad-input]').value = '3';
    click('.buy-row [data-gesicomm-comprar]');
    expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'remera', variante: 2, cantidad: 3 }));
  });

  it('comprar una oferta manda su id', () => {
    const { mensajes, click } = montar(PLANTILLA_PRODUCTO, datos);
    click('[data-gesicomm-oferta]');
    expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'remera', oferta: 77 }));
  });

  it('una variante sin stock no se puede elegir', () => {
    const { document, click } = montar(PLANTILLA_PRODUCTO, datos);
    click('[data-gesicomm-variante-id="1"]');
    expect(document.querySelector('[data-gesicomm-variante-id="1"]').classList.contains('is-selected')).toBe(false);
  });
});

describe('runtime — compatibilidad', () => {
  it('data-gesicomm-checkout sin datos inyectados se reenvía crudo (Page Builder)', () => {
    const { mensajes, click } = montar({ html: '<button data-gesicomm-checkout="producto:5" data-gesicomm-cantidad="2">x</button>', css: '', js: '' }, null);
    click('button');
    expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'producto:5', cantidad: 2 }));
  });
});

describe('runtime — catálogo navegable', () => {
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const base = { vista: 'inicio', tienda: {}, producto: null, recomendados: [] };

  it('catálogo chico: busca sin tildes, filtra por categoría y ordena sin ir al servidor', async () => {
    const productos = [
      { ...airFryer, id: 'a', nombre: 'Café molido', categoria: 'Cocina', precio: 30000 },
      { ...airFryer, id: 'b', nombre: 'Mancuerna', categoria: 'Fitness', precio: 90000 },
      { ...airFryer, id: 'c', nombre: 'Cafetera', categoria: 'Cocina', precio: 120000 },
    ];
    const { window, document, mensajes } = montar(PLANTILLA_INICIO, { ...base, productos });
    const ids = () => Array.from(document.querySelectorAll('#productos [data-gesicomm-item]')).map(e => e.getAttribute('data-gesicomm-item'));

    const buscador = document.querySelector('[data-gesicomm-buscar]');
    buscador.value = 'cafe';
    buscador.dispatchEvent(new window.Event('input', { bubbles: true }));
    await espera(400);
    expect(ids()).toEqual(['a', 'c']);

    buscador.value = '';
    buscador.dispatchEvent(new window.Event('input', { bubbles: true }));
    await espera(400);
    const cat = document.querySelector('select[data-gesicomm-filtro="categoria"]');
    expect(Array.from(cat.options).map(o => o.value)).toEqual(['', 'Cocina', 'Fitness']);
    cat.value = 'Cocina';
    cat.dispatchEvent(new window.Event('change', { bubbles: true }));
    const orden = document.querySelector('select[data-gesicomm-filtro="orden"]');
    orden.value = 'max-min';
    orden.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(ids()).toEqual(['c', 'a']);
    expect(document.querySelector('[data-gesicomm-total]').textContent).toBe('2 productos disponibles');
    expect(mensajes.some(m => m.tipo === 'gesicomm:catalogo')).toBe(false);
  });

  it('catálogo grande: pide cada página al contenedor y se puede comprar desde cualquier página', () => {
    const datos = { ...base, productos: [airFryer], catalogo: { total: 60, por_pagina: 24, paginado: true } };
    const { window, document, mensajes, click } = montar(PLANTILLA_INICIO, datos);
    const responder = extra => {
      const pedido = [...mensajes].reverse().find(m => m.tipo === 'gesicomm:catalogo');
      window.dispatchEvent(new window.MessageEvent('message', {
        source: window,
        data: { tipo: 'gesicomm:catalogo-respuesta', id: pedido.id, modo: pedido.modo, ...extra },
      }));
      return pedido;
    };

    const inicial = responder({ productos: [airFryer], pagina: 1, totalPaginas: 3, total: 60, categorias: ['Cocina', 'Ropa'] });
    expect(inicial).toEqual(expect.objectContaining({ pagina: 1, porPagina: 24 }));
    expect(document.querySelector('[data-gesicomm-paginacion]').textContent).toBe('Página 1 de 3');
    expect(document.querySelector('[data-gesicomm-total]').textContent).toBe('60 productos disponibles');
    expect(document.querySelector('[data-gesicomm-pagina="anterior"]').disabled).toBe(true);

    click('[data-gesicomm-pagina="siguiente"]');
    const lejano = { ...airFryer, id: 'licuadora', nombre: 'Licuadora' };
    const conTalles = { ...airFryer, id: 'zapatilla', nombre: 'Zapatilla', tiene_variantes: true };
    const p2 = responder({ productos: [lejano, conTalles], pagina: 2, totalPaginas: 3, total: 60 });
    expect(p2.pagina).toBe(2);
    expect(document.querySelectorAll('#productos [data-gesicomm-item]')).toHaveLength(2);

    click('[data-gesicomm-item="licuadora"] [data-gesicomm-comprar]');
    expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'licuadora' }));
    // Un producto liviano con variantes lleva a la ficha en vez de comprarse sin talle.
    click('[data-gesicomm-item="zapatilla"] [data-gesicomm-comprar]');
    expect(mensajes).toContainEqual({ tipo: 'gesicomm:navegar', destino: 'producto', producto: 'zapatilla' });
  });

  it('descarta respuestas viejas cuando el visitante ya pidió otra cosa', () => {
    const datos = { ...base, productos: [airFryer], catalogo: { total: 60, por_pagina: 24, paginado: true } };
    const { window, document, mensajes } = montar(PLANTILLA_INICIO, datos);
    const viejo = mensajes.find(m => m.tipo === 'gesicomm:catalogo');
    const cat = document.querySelector('select[data-gesicomm-filtro="orden"]');
    cat.value = 'az';
    cat.dispatchEvent(new window.Event('change', { bubbles: true }));
    window.dispatchEvent(new window.MessageEvent('message', {
      source: window,
      data: { tipo: 'gesicomm:catalogo-respuesta', id: viejo.id, productos: [], pagina: 1, totalPaginas: 1, total: 0 },
    }));
    expect(document.querySelectorAll('#productos [data-gesicomm-item]')).toHaveLength(1);
  });
});

describe('runtime — páginas de la tienda (legales y contacto)', () => {
  const paginas = {
    contacto: '/l/mi-promo/contacto',
    'politica-privacidad': '/l/mi-promo/politica-privacidad',
    'terminos-servicio': '/l/mi-promo/terminos-servicio',
    'politica-reembolso': '/l/mi-promo/politica-reembolso',
    'politica-envio': '/l/mi-promo/politica-envio',
    'aviso-legal': '/l/mi-promo/aviso-legal',
    catalogo: '/l/mi-promo/catalogo',
  };
  const datos = { vista: 'inicio', tienda: {}, productos: [airFryer], producto: null, recomendados: [], paginas };

  it('el footer base reescribe cada link a la URL real de la landing y navega sin recargar', () => {
    const { document, mensajes, click } = montar(PLANTILLA_INICIO, datos);
    const links = Array.from(document.querySelectorAll('.footer-links a'));
    expect(links.map(a => a.getAttribute('href'))).toEqual([
      '/l/mi-promo/contacto', '/l/mi-promo/politica-privacidad', '/l/mi-promo/terminos-servicio',
      '/l/mi-promo/politica-reembolso', '/l/mi-promo/politica-envio', '/l/mi-promo/aviso-legal',
    ]);
    click('.footer-links a[data-gesicomm-link="politica-privacidad"]');
    expect(mensajes).toContainEqual({ tipo: 'gesicomm:navegar', destino: 'pagina', pagina: 'politica-privacidad' });
  });

  it('un href escrito a mano (sin data-gesicomm-link) también se reconoce; uno externo no se toca', () => {
    const html = '<a id="a" href="/contacto">Contacto</a><a id="b" href="https://otro.com/contacto">Otro</a>';
    const { document, mensajes, click } = montar({ html, css: '', js: '' }, datos);
    expect(document.querySelector('#a').getAttribute('href')).toBe('/l/mi-promo/contacto');
    expect(document.querySelector('#b').getAttribute('href')).toBe('https://otro.com/contacto');
    click('#a');
    expect(mensajes).toContainEqual({ tipo: 'gesicomm:navegar', destino: 'pagina', pagina: 'contacto' });
    click('#b');
    expect(mensajes.filter(m => m.destino === 'pagina')).toHaveLength(1);
  });
});

describe('páginas base por formato', () => {
  const combo = { ...airFryer, id: 'combo-3', referencia_id: 3, tipo: 'combo', nombre: 'Pack cocina', productos_incluidos: ['Air Fryer', 'Canasto'], descuento_pct: 15 };

  it('cada formato tiene su base, marcada para reconocerla', () => {
    expect(plantillaInicioPara('catalogo')).toBe(PLANTILLA_INICIO);
    expect(plantillaInicioPara('producto_unico')).toBe(PLANTILLA_ESTRELLA);
    expect(plantillaInicioPara('combos')).toBe(PLANTILLA_COMBOS);
    expect(formatoDeBase(PLANTILLA_ESTRELLA.html)).toBe('producto_unico');
    expect(formatoDeBase('<h1>mío</h1>')).toBeNull();
  });

  it('Producto estrella: el hero es el principal y "Comprar" (también el del header) lo compra', () => {
    const { document, mensajes, click } = montar(PLANTILLA_ESTRELLA, {
      vista: 'inicio', tienda: {}, productos: [airFryer, remera], producto: null, recomendados: [remera],
    });
    expect(document.querySelector('.star-hero h1').textContent).toBe('Air Fryer 2.6L');
    click('.nav-cta[data-gesicomm-comprar="principal"]');
    expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'air-fryer-26l' }));
    // Complementos: el resto de la selección.
    expect(Array.from(document.querySelectorAll('[data-gesicomm-lista="recomendados"] [data-gesicomm-item]')).map(e => e.getAttribute('data-gesicomm-item'))).toEqual(['remera']);
  });

  it('Combos: primero el combo destacado y la grilla de combos, después los productos sueltos', () => {
    const { document } = montar(PLANTILLA_COMBOS, {
      vista: 'inicio', tienda: {}, productos: [combo, airFryer], producto: null, recomendados: [],
    });
    expect(document.querySelector('.hero-card [data-gesicomm-bind="nombre"]').textContent).toBe('Pack cocina');
    expect(document.querySelector('#combos [data-gesicomm-bind="incluye"]').textContent).toBe('Air Fryer, Canasto');
    expect(document.querySelectorAll('#productos [data-gesicomm-item]')).toHaveLength(1);
  });
});

describe('runtime — order bump en la ficha', () => {
  const bump = { id: 90, nombre: 'Sumá el canasto con 30% OFF', estrategia: 'order_bump', precio_efectivo: 63000, precio_normal: 90000, ahorro: 27000, descuento_pct: 30, imagen: null };
  const upsell = { id: 91, nombre: 'Kit de moldes', estrategia: 'upsell', precio_efectivo: 55000, precio_normal: null, ahorro: 0, imagen: null };
  const fryer = { ...airFryer, ofertas: [bump, upsell] };
  const datos = { vista: 'producto', tienda: {}, productos: [fryer], producto: fryer, recomendados: [] };

  it('el bump es una casilla arriba del botón de compra; el upsell no se renderiza en la ficha', () => {
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    const casilla = document.querySelector('.bump input[data-gesicomm-bump]');
    expect(casilla).not.toBeNull();
    expect(casilla.checked).toBe(false); // nunca marcada de antemano
    expect(document.querySelector('.bump [data-gesicomm-bind="ahorro"]').textContent).toBe('Ahorrás Gs 27.000');
    // Orden en la página: bump → botón de compra. El upsell va en checkout.
    const bumpEl = document.querySelector('.bumps');
    const comprar = document.querySelector('.buy-row [data-gesicomm-comprar]');
    expect(bumpEl.compareDocumentPosition(comprar) & 4).toBeTruthy();
    expect(document.querySelector('[data-gesicomm-lista="ofertas_upsell"]')).toBeNull();
    expect(document.querySelector('.upsell')).toBeNull();
  });

  it('marcado, se suma al tocar Comprar (antes que el producto); desmarcado, no', () => {
    const { window, document, mensajes, click } = montar(PLANTILLA_PRODUCTO, datos);
    const casilla = document.querySelector('input[data-gesicomm-bump]');
    casilla.checked = true;
    casilla.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(document.querySelector('.bump').classList.contains('is-checked')).toBe(true);
    click('.buy-row [data-gesicomm-comprar]');
    const compras = mensajes.filter(m => m.tipo === 'gesicomm:checkout');
    expect(compras).toEqual([
      expect.objectContaining({ producto: 'air-fryer-26l', oferta: 90, abrir: false }),
      expect.objectContaining({ producto: 'air-fryer-26l', oferta: null, abrir: true }),
    ]);

    mensajes.length = 0;
    casilla.checked = false;
    casilla.dispatchEvent(new window.Event('change', { bubbles: true }));
    click('.buy-row [data-gesicomm-comprar]');
    expect(mensajes.filter(m => m.tipo === 'gesicomm:checkout')).toEqual([
      expect.objectContaining({ producto: 'air-fryer-26l', oferta: null, abrir: true }),
    ]);
  });

  it('el botón muestra el total en vivo: cantidad + bumps marcados', () => {
    const { window, document } = montar(PLANTILLA_PRODUCTO, datos);
    const total = () => document.querySelector('.buy-row [data-gesicomm-total]').textContent;
    const precio = datos.producto.precio;
    const bump = datos.producto.ofertas.find(o => o.estrategia === 'order_bump');
    const gs = n => 'Gs ' + Math.round(n).toLocaleString('es-PY');
    expect(total()).toBe(gs(precio));

    const casilla = document.querySelector('input[data-gesicomm-bump]');
    casilla.checked = true;
    casilla.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(total()).toBe(gs(precio + bump.precio_efectivo));

    const cantidad = document.querySelector('[data-gesicomm-cantidad-input]');
    cantidad.value = '2';
    cantidad.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(total()).toBe(gs(precio * 2 + bump.precio_efectivo));
  });
});

describe('order bump y upsell de punta a punta (datos del backend → ficha)', () => {
  // Forma exacta que arma LandingService.obtenerPublica para un producto con
  // un bump y un upsell ya marcados en Configurar venta.
  const itemBackend = {
    content_id: 'air-fryer-26l', referencia_id: 10, tipo: 'producto', nombre: 'Air Fryer 2.6L',
    precio: 145735, imagen: 'https://cdn.test/air.jpg', imagenes: ['https://cdn.test/air.jpg'], stock: 5, variantes: [],
    ofertas: [
      {
        id: 90, nombre: 'Canasto extra', estrategia: 'order_bump', precio_normal: 90000, precio_order_bump: 63000,
        precio_efectivo: 63000, imagen: null,
        producto_complementario: { nombre: 'Canasto', imagen: 'https://cdn.test/canasto.jpg' },
      },
      {
        id: 91, nombre: 'Kit de moldes', estrategia: 'upsell', precio_normal: 70000, precio_order_bump: 55000,
        precio_efectivo: 55000, imagen: null,
        producto_complementario: { nombre: 'Moldes', imagen: 'https://cdn.test/moldes.jpg' },
      },
    ],
  };
  const data = (ofertasMarcadas) => ({
    content: { venta: { configurado: true, tipo: 'catalogo', cross_sell: { activo: true, ofertas: ofertasMarcadas } } },
    catalogo_items: [itemBackend],
  });

  it('marcadas: el bump se pinta en la ficha con su foto y precio, el upsell llega a los datos', () => {
    const datos = datosRuntimePublico(data([90, 91]), 'tienda', itemBackend);
    expect(datos.producto.ofertas.map(o => o.id)).toEqual([90, 91]);
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    const casilla = document.querySelector('.bump input[data-gesicomm-bump]');
    expect(casilla).not.toBeNull();
    expect(document.querySelector('.bump').textContent).toContain('Canasto extra');
    expect(document.querySelector('.bump img').getAttribute('src')).toBe('https://cdn.test/canasto.jpg');
  });

  it('sin marcar en la landing: no aparecen', () => {
    const datos = datosRuntimePublico(data([]), 'tienda', itemBackend);
    expect(datos.producto.ofertas).toEqual([]);
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    expect(document.querySelector('.bump input[data-gesicomm-bump]')).toBeNull();
  });
});

describe('preview del editor con ofertas del panel', () => {
  it('muestra el bump marcado con la foto del producto que suma y el upsell con su precio promocional', () => {
    const productos = [
      { id: 10, tipo: 'producto', slug: 'air', nombre: 'Air', precio_efectivo: 145000, imagen: 'https://cdn.test/air.jpg' },
      { id: 20, tipo: 'producto', slug: 'canasto', nombre: 'Canasto', precio_efectivo: 90000, imagen: 'https://cdn.test/canasto.jpg' },
    ];
    const ofertas = [
      { id: 90, estrategia: 'order_bump', nombre: 'Canasto', producto_ancla_id: 10, precio_normal: 90000, precio_order_bump: 63000, componentes: [{ producto_id: 20 }] },
      { id: 91, estrategia: 'upsell', nombre: 'Otra', producto_ancla_id: 10, precio_normal: 70000, precio_order_bump: 55000, componentes: [{ producto_id: 10 }] },
    ];
    const venta = { configurado: true, cross_sell: { activo: true, ofertas: [90, 91] } };
    const datos = datosRuntimePreview({ productos, venta, vista: 'producto', productoId: 'air', ofertas });
    const [bump, upsell] = datos.producto.ofertas;
    expect(bump.imagen).toBe('https://cdn.test/canasto.jpg');
    expect(upsell.precio_efectivo).toBe(55000);
    expect(upsell.imagen).toBe('https://cdn.test/air.jpg');
  });
});
