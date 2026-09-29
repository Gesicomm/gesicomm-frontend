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

  it('marca productos clickeables y rota la galería de la tarjeta al pasar el mouse', async () => {
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const { window, document } = montar(PLANTILLA_INICIO, datos);
    const tarjeta = document.querySelector('#productos [data-gesicomm-item="air-fryer-26l"]');
    const img = tarjeta.querySelector('img[data-gesicomm-bind="imagen"]');

    expect(tarjeta.style.cursor).toBe('pointer');
    expect(tarjeta.hasAttribute('data-gesicomm-carrusel')).toBe(true);
    expect(img.hasAttribute('data-gesicomm-carrusel')).toBe(true);

    tarjeta.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
    expect(tarjeta.classList.contains('is-previewing')).toBe(true);
    expect(img.getAttribute('src')).toBe('https://cdn.test/air2.jpg');

    await espera(950);
    expect(img.getAttribute('src')).toBe('https://cdn.test/air.jpg');

    tarjeta.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true, cancelable: true }));
    expect(tarjeta.classList.contains('is-previewing')).toBe(false);
    expect(img.getAttribute('src')).toBe('https://cdn.test/air.jpg');
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
    // El paquete de la remera aparece en "Elegí tu oferta", junto a 1 unidad.
    expect(document.querySelectorAll('.paquete')).toHaveLength(2);
    expect(document.querySelectorAll('#relacionados [data-gesicomm-item]')).toHaveLength(1);
  });

  it('no deja comprar sin elegir variante, y con variante manda variante y cantidad', () => {
    // Sin paquetes, para que la cantidad salga del campo de cantidad.
    const remeraSola = { ...remera, ofertas: [] };
    const { document, mensajes, click } = montar(PLANTILLA_PRODUCTO, { ...datos, productos: [airFryer, remeraSola], producto: remeraSola });
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

  it('comprar un paquete manda su id (y pide el talle antes)', () => {
    const { mensajes, click } = montar(PLANTILLA_PRODUCTO, datos);
    click('.paquete[data-gesicomm-paquete="77"]');
    click('.buy-row [data-gesicomm-comprar]');
    expect(mensajes.some(m => m.tipo === 'gesicomm:checkout')).toBe(false);
    click('[data-gesicomm-variante-id="2"]');
    click('.buy-row [data-gesicomm-comprar]');
    expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'remera', oferta: 77, variante: 2 }));
  });

  it('una variante sin stock no se puede elegir', () => {
    const { document, click } = montar(PLANTILLA_PRODUCTO, datos);
    click('[data-gesicomm-variante-id="1"]');
    expect(document.querySelector('[data-gesicomm-variante-id="1"]').classList.contains('is-selected')).toBe(false);
  });

  it('en recomendados la tarjeta abre la ficha aunque la IA solo haya puesto botón Agregar', () => {
    const plantilla = {
      html: `
        <section data-gesicomm-lista="recomendados">
          <template>
            <article class="rec-card">
              <h3 data-gesicomm-bind="nombre"></h3>
              <span data-gesicomm-bind="precio"></span>
              <button type="button" data-gesicomm-agregar>Agregar</button>
            </article>
          </template>
        </section>`,
      css: '',
      js: '',
    };
    const { document, mensajes, click } = montar(plantilla, datos);
    expect(document.querySelector('.rec-card').hasAttribute('data-gesicomm-ver')).toBe(true);

    click('.rec-card h3');
    expect(mensajes).toContainEqual({ tipo: 'gesicomm:navegar', destino: 'producto', producto: 'air-fryer-26l' });

    click('.rec-card [data-gesicomm-agregar]');
    expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'air-fryer-26l', abrir: false }));
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

  it('hay un solo inicio base (la tienda); las bases viejas se siguen reconociendo', () => {
    // "Combos primero" es orden y "Directo en un producto" abre la ficha:
    // ningún formato tiene ya su propio inicio.
    expect(plantillaInicioPara('catalogo')).toBe(PLANTILLA_INICIO);
    expect(plantillaInicioPara('producto_unico')).toBe(PLANTILLA_INICIO);
    expect(plantillaInicioPara('combos')).toBe(PLANTILLA_INICIO);
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
      { id: 20, tipo: 'producto', slug: 'canasto', nombre: 'Canasto', precio_efectivo: 160000, imagen: 'https://cdn.test/canasto.jpg' },
    ];
    const ofertas = [
      {
        id: 90,
        estrategia: 'order_bump',
        nombre: 'Canasto',
        producto_ancla_id: 10,
        precio_normal: 170000,
        precio_order_bump: 120000,
        componentes: [{ producto_id: 20, producto: productos[1] }],
      },
      { id: 91, estrategia: 'upsell', nombre: 'Otra', producto_ancla_id: 10, precio_normal: 70000, precio_order_bump: 55000, componentes: [{ producto_id: 10 }] },
    ];
    const venta = { configurado: true, cross_sell: { activo: true, ofertas: [90, 91] } };
    const datos = datosRuntimePreview({ productos, venta, vista: 'producto', productoId: 'air', ofertas });
    const [bump, upsell] = datos.producto.ofertas;
    expect(bump.imagen).toBe('https://cdn.test/canasto.jpg');
    expect(bump.precio_efectivo).toBe(120000);
    expect(bump.precio_normal).toBe(160000);
    expect(upsell.precio_efectivo).toBe(55000);
    expect(upsell.imagen).toBe('https://cdn.test/air.jpg');
  });
});

describe('redes de la tienda (data-gesicomm-redes)', () => {
  it('pinta un link por red cargada en Mi Tienda y arma URLs seguras', () => {
    const { document } = montar(PLANTILLA_INICIO, {
      productos: [airFryer],
      tienda: { nombre: 'Ecom', whatsapp: '0981 123 456', instagram: '@ecom.py', facebook: 'https://facebook.com/ecompy', tiktok: 'javascript:alert(1)' },
    });
    const redes = [...document.querySelectorAll('[data-gesicomm-redes] .gc-red')];
    expect(redes.map(a => a.getAttribute('aria-label'))).toEqual(['WhatsApp', 'Instagram', 'Facebook']);
    expect(redes.every(a => a.querySelector('svg.gc-red__icon'))).toBe(true);
    expect(redes[0].getAttribute('href')).toContain('https://wa.me/595981123456?text=');
    expect(redes[1].getAttribute('href')).toBe('https://instagram.com/ecom.py');
    expect(redes[2].getAttribute('href')).toBe('https://facebook.com/ecompy');
    expect(redes[1].className).toBe('gc-red gc-red--instagram');
    expect(redes[1].getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('sin redes el contenedor se oculta: nada de títulos vacíos', () => {
    const { document } = montar(PLANTILLA_INICIO, { productos: [airFryer], tienda: { nombre: 'Ecom' } });
    const cont = document.querySelector('[data-gesicomm-redes]');
    expect(cont.children).toHaveLength(0);
    expect(cont.style.display).toBe('none');
  });
});

describe('secciones de Gesicom dentro del documento', () => {
  it('van antes del footer de la landing, no debajo', () => {
    const html = construirDocumentoCodigo(
      { html: '<main>hola</main><footer class="pie">pie</footer>' },
      { extras: { html: '<section id="contacto">contacto</section>', css: '' } },
    );
    expect(html.indexOf('id="contacto"')).toBeLessThan(html.indexOf('<footer class="pie"'));
  });

  it('sin footer propio van al final del contenido', () => {
    const html = construirDocumentoCodigo(
      { html: '<main>hola</main>' },
      { extras: { html: '<footer class="gcx-footer">legal</footer>', css: '' } },
    );
    expect(html.indexOf('<main>hola</main>')).toBeLessThan(html.indexOf('gcx-footer">legal'));
  });
});

describe('ficha: combos que traen el producto', () => {
  it('muestra solo los combos que incluyen el producto de la ficha', () => {
    const producto = { ...airFryer, referencia_id: 10 };
    const conFryer = { id: 'combo-1', referencia_id: 1, tipo: 'combo', nombre: 'Kit fryer + canasto', precio: 200000, imagen: null, imagenes_url: [], combo_productos: [10, 8], variantes: [], ofertas: [], url: '/combo-1' };
    const sinFryer = { id: 'combo-2', referencia_id: 2, tipo: 'combo', nombre: 'Kit remeras', precio: 90000, imagen: null, imagenes_url: [], combo_productos: [11], variantes: [], ofertas: [], url: '/combo-2' };
    const datos = { vista: 'producto', tienda: {}, productos: [producto, conFryer, sinFryer], producto, recomendados: [] };
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    const tarjetas = document.querySelectorAll('#combos-producto [data-gesicomm-item]');
    expect(tarjetas).toHaveLength(1);
    expect(tarjetas[0].querySelector('[data-gesicomm-bind="nombre"]').textContent).toBe('Kit fryer + canasto');
  });

  it('sin combos para ese producto, la sección no se ve', () => {
    const datos = { vista: 'producto', tienda: {}, productos: [airFryer], producto: airFryer, recomendados: [] };
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    expect(document.querySelector('#combos-producto').style.display).toBe('none');
  });
});

describe('ficha que vende: contenido real del producto', () => {
  const img = 'https://cdn.test/a.jpg';
  const data = (items) => ({ content: { venta: { configurado: true } }, catalogo_items: items });
  const producto = {
    content_id: 'adelfit', referencia_id: 8, tipo: 'producto', nombre: 'AdelFit', precio: 169000, precio_antes: 210000,
    imagen: img, imagenes: [img], variantes: [], ofertas: [],
    propuesta_valor: 'Controlá el apetito.',
    beneficios: [{ titulo: 'Menos ansiedad' }, { titulo: 'Más energía', texto: 'Todo el día' }, { titulo: '' }],
    confianza: [{ texto: 'Registro sanitario' }],
    preguntas_frecuentes: [{ pregunta: '¿Dosis?', respuesta: 'Dos por día' }, { pregunta: 'sin respuesta', respuesta: '' }],
  };

  it('pinta promesa, highlights, garantías y preguntas; el ahorro barato va en %', () => {
    const datos = datosRuntimePublico(data([producto]), 'x', producto);
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    expect(document.querySelector('.pdp-promesa').textContent).toBe('Controlá el apetito.');
    expect([...document.querySelectorAll('.highlights li')].map(l => l.textContent)).toEqual(['Menos ansiedad', 'Más energía']);
    expect(document.querySelectorAll('.garantias li')).toHaveLength(1);
    expect(document.querySelectorAll('.faq-item')).toHaveLength(1);
    expect(document.querySelector('.pdp-prices .badge-off').textContent).toBe('Ahorrás 20%');
    // No es combo: lo propio de un combo no se ve.
    expect(document.querySelector('.pdp-separado').style.display).toBe('none');
    expect(document.querySelector('#incluye').style.display).toBe('none');
  });

  it('producto caro (≥ Gs 750.000): el ahorro se dice en guaraníes', () => {
    const caro = { ...producto, precio: 900000, precio_antes: 1200000 };
    const datos = datosRuntimePublico(data([caro]), 'x', caro);
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    expect(document.querySelector('.pdp-prices .badge-off').textContent).toBe('Ahorrás Gs 300.000');
  });

  it('combo: precio por separado como ancla y qué incluye cada producto', () => {
    const combo = { content_id: 'combo-3', referencia_id: 3, tipo: 'combo', nombre: 'Kit', precio: 288000, imagen: img, imagenes: [img], variantes: [], ofertas: [],
      productos_combo: [{ id: 8, nombre: 'AdelFit', precio: 169000, cantidad: 1, imagen: img }, { id: 9, nombre: 'Articumina', precio: 170000, cantidad: 2, imagen: img }] };
    const datos = datosRuntimePublico(data([combo]), 'x', combo);
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    expect(document.querySelector('.pdp-separado').textContent).toBe('Por separado: Gs 509.000');
    expect(document.querySelectorAll('.incluye-card')).toHaveLength(2);
    expect(document.querySelector('.incluye-total').textContent).toMatch(/Por separado: Gs 509\.000 · En combo: Gs 288\.000/);
  });
});

describe('ficha: elegí tu oferta (paquetes por cantidad)', () => {
  const pack2 = { id: 21, nombre: 'Lleva 2 por un descuento imperdible', estrategia: 'normal', precio_efectivo: 250000, unidades: 2 };
  const pack3 = { id: 22, nombre: 'Lleva 3', estrategia: 'normal', precio_efectivo: 349000, unidades: 3 };
  const prod = { ...airFryer, precio: 169000, precio_antes: null, descuento_pct: 0, ofertas: [pack3, pack2] };
  const datos = { vista: 'producto', tienda: {}, productos: [prod], producto: prod, recomendados: [] };

  it('1 unidad + los paquetes ordenados, con precio por unidad, ahorro y "Mejor precio"; arranca en Pack x2', () => {
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    const opciones = [...document.querySelectorAll('.paquete')];
    expect(opciones.map(o => o.querySelector('.paquete-titulo').textContent)).toEqual(['1 unidad', 'Pack x2', 'Pack x3']);
    expect(opciones[1].getAttribute('aria-checked')).toBe('true');
    expect(opciones[1].querySelector('.paquete-unidad').textContent).toBe('Gs 125.000 c/u');
    expect(opciones[1].querySelector('.paquete-ahorro span').textContent).toBe('Ahorrás Gs 88.000');
    expect(opciones[1].querySelector('s').textContent).toBe('Gs 338.000');
    // Sin etiquetas configuradas: solo "Mayor ahorro", que se calcula.
    expect(opciones[2].querySelector('.paquete-etiqueta').textContent).toBe('Mayor ahorro');
    expect(opciones[1].querySelector('.paquete-etiqueta').style.display).toBe('none');
    expect(opciones[1].querySelector('.paquete-ahorro em').textContent).toBe('26% OFF');
    expect(opciones[1].querySelector('.paquete-x').textContent).toBe('x2');
    expect(opciones[1].querySelector('.paquete-foto img').getAttribute('src')).toBe(prod.imagen);
    expect(document.querySelector('.buy-row [data-gesicomm-cta]').textContent).toBe('Comprar Pack x2');
    // Con paquetes no hay campo de cantidad: la cantidad la da el paquete.
    expect(document.querySelector('[data-gesicomm-cantidad-input]').style.display).toBe('none');
    expect(document.querySelector('.buy-row [data-gesicomm-total]').textContent).toBe('Gs 250.000');
  });

  it('elegir otra opción cambia el total, y comprar lleva el paquete elegido', () => {
    const { document, mensajes, click } = montar(PLANTILLA_PRODUCTO, datos);
    click('.paquete[data-gesicomm-paquete="22"]');
    expect(document.querySelector('.buy-row [data-gesicomm-total]').textContent).toBe('Gs 349.000');
    click('.buy-row [data-gesicomm-comprar]');
    expect(mensajes.filter(m => m.tipo === 'gesicomm:checkout').at(-1)).toMatchObject({ oferta: 22, abrir: true });
    expect(mensajes.some(m => m.tipo === 'gesicomm:evento' && m.nombre === 'PaqueteElegido')).toBe(true);

    click('.paquete[data-gesicomm-paquete="unidad"]');
    click('.buy-row [data-gesicomm-comprar]');
    expect(mensajes.filter(m => m.tipo === 'gesicomm:checkout').at(-1)).toMatchObject({ oferta: null, cantidad: 1 });
  });

  it('sin paquetes, el selector no aparece y vuelve el campo de cantidad', () => {
    const solo = { ...prod, ofertas: [] };
    const { document } = montar(PLANTILLA_PRODUCTO, { ...datos, productos: [solo], producto: solo });
    expect(document.querySelector('.paquetes').style.display).toBe('none');
    expect(document.querySelector('[data-gesicomm-cantidad-input]').style.display).toBe('');
  });
});

describe('ficha: etiquetas y paquete destacado (Configurar venta)', () => {
  const pack2 = { id: 21, nombre: 'x', estrategia: 'normal', precio_efectivo: 250000, unidades: 2 };
  const pack3 = { id: 22, nombre: 'y', estrategia: 'normal', precio_efectivo: 349000, unidades: 3 };
  const prod = { ...airFryer, precio: 169000, precio_antes: null, descuento_pct: 0, ofertas: [pack2, pack3] };

  it('usa las etiquetas del comercio y arranca en el destacado', () => {
    const venta = { paquetes: { 21: { etiqueta: 'Más elegido', destacado: false }, 22: { etiqueta: 'Ideal para 1 mes', destacado: true } } };
    const { document } = montar(PLANTILLA_PRODUCTO, { vista: 'producto', tienda: {}, venta, productos: [prod], producto: prod, recomendados: [] });
    const opciones = [...document.querySelectorAll('.paquete')];
    expect(opciones[1].querySelector('.paquete-etiqueta').textContent).toBe('Más elegido');
    expect(opciones[2].querySelector('.paquete-etiqueta').textContent).toBe('Ideal para 1 mes');
    expect(opciones[2].classList.contains('is-destacado')).toBe(true);
    expect(opciones[2].getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector('.buy-row [data-gesicomm-cta]').textContent).toBe('Comprar Pack x3');
  });

  it('con 1 unidad elegida, el botón vuelve a "Comprar ahora"', () => {
    const { document, click } = montar(PLANTILLA_PRODUCTO, { vista: 'producto', tienda: {}, productos: [prod], producto: prod, recomendados: [] });
    click('.paquete[data-gesicomm-paquete="unidad"]');
    expect(document.querySelector('.buy-row [data-gesicomm-cta]').textContent).toBe('Comprar ahora');
  });
});
