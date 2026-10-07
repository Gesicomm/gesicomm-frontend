import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { datosRuntimePublico, datosRuntimePreview } from './datosRuntime';
import { PLANTILLA_INICIO, PLANTILLA_PRODUCTO, PLANTILLA_ESTRELLA, PLANTILLA_COMBOS, PLANTILLA_CHECKOUT, plantillaInicioPara, formatoDeBase, esCheckoutBase } from './plantillasBaseCodigo';

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

const PLANTILLA_CATALOGO_TEST = {
  html: `<section id="productos">
    <input type="search" data-gesicomm-buscar>
    <select data-gesicomm-filtro="categoria"><option value="">Todas</option></select>
    <select data-gesicomm-filtro="marca"><option value="">Todas</option></select>
    <select data-gesicomm-filtro="etiqueta"><option value="">Todas</option></select>
    <select data-gesicomm-filtro="disponibilidad"><option value="todos">Todos</option><option value="en_stock">En stock</option><option value="agotado">Agotados</option></select>
    <select data-gesicomm-filtro="orden"><option value="">Destacados</option><option value="max-min">Mayor precio</option><option value="min-max">Menor precio</option><option value="az">A-Z</option></select>
    <input data-gesicomm-filtro="precioMin">
    <input data-gesicomm-filtro="precioMax">
    <div data-gesicomm-total></div>
    <div data-gesicomm-lista="catalogo" data-gesicomm-si-vacio="mostrar">
      <template>
        <article class="product-card">
          <div class="product-image"><img data-gesicomm-bind="imagen" alt=""></div>
          <div class="product-content">
            <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
            <div class="product-footer">
              <span class="price" data-gesicomm-bind="precio"></span>
              <button type="button" data-gesicomm-comprar>Comprar</button>
            </div>
          </div>
        </article>
      </template>
    </div>
    <button type="button" data-gesicomm-pagina="anterior">Anterior</button>
    <span data-gesicomm-paginacion></span>
    <button type="button" data-gesicomm-pagina="siguiente">Siguiente</button>
  </section>`,
  css: '',
  js: '',
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

  it('pinta banners configurados con video y permite enlaces internos a secciones', () => {
    const { document } = montar(PLANTILLA_INICIO, {
      ...datos,
      venta: {
        inicio: {
          banners: [{
            id: 'promo-video',
            activo: true,
            titulo: 'Promo con video',
            subtitulo: 'Campaña editable',
            etiqueta: 'Oferta',
            cta_texto: 'Ver ofertas',
            enlace: '#ofertas',
            imagen: '/uploads/banner.mp4',
            tipo_medio: 'video',
          }],
        },
      },
    });

    const banner = document.querySelector('.hero-banner');
    expect(banner).toBeTruthy();
    expect(document.querySelector('.hero-shell').classList.contains('has-banner')).toBe(true);
    expect(banner.querySelector('video').getAttribute('src')).toBe('/uploads/banner.mp4');
    expect(banner.querySelector('video').style.display).not.toBe('none');
    expect(banner.querySelector('img').style.display).toBe('none');
    expect(banner.querySelector('a').getAttribute('href')).toBe('#ofertas');
  });

  it('filtra por cada etiqueta, marca, precio y disponibilidad sin perder las opciones del catálogo', () => {
    const { window, document, dom } = montar(PLANTILLA_CATALOGO_TEST, { ...datos, vista: 'catalogo', productos: [
      { ...airFryer, etiqueta: 'Cocina, Oferta', marca: 'Marca A' }, { ...remera, marca: 'Marca B', etiqueta: 'Oferta', stock: 0 },
    ] });
    const ids = () => [...document.querySelectorAll('#productos [data-gesicomm-item]')].map(el => el.getAttribute('data-gesicomm-item'));
    function filtrar(campo, valor) {
      const el = document.querySelector('[data-gesicomm-filtro="' + campo + '"]');
      el.value = valor;
      el.dispatchEvent(new window.Event('change', { bubbles: true }));
    }
    filtrar('etiqueta', 'Cocina');
    expect(ids()).toEqual(['air-fryer-26l']);
    expect([...document.querySelector('[data-gesicomm-filtro="etiqueta"]').options].map(o => o.value)).toEqual(['', 'Oferta', 'Cocina']);
    filtrar('etiqueta', 'Oferta'); filtrar('marca', 'Marca B');
    expect(ids()).toEqual(['remera']);
    filtrar('marca', ''); filtrar('precioMin', '100000');
    expect(ids()).toEqual(['air-fryer-26l']);
    filtrar('precioMin', ''); filtrar('disponibilidad', 'agotado');
    expect(ids()).toEqual(['remera']);
    dom.window.close();
  });

  it('permite cambiar la categoría y actualiza el título de la página', () => {
    const plantillaCategoria = {
      ...PLANTILLA_CATALOGO_TEST,
      html: PLANTILLA_CATALOGO_TEST.html.replace(
        '<div data-gesicomm-total></div>',
        '<h1 data-gesicomm-categoria="nombre">Todos los productos</h1><div data-gesicomm-total></div>',
      ),
    };
    const { window, document, dom } = montar(plantillaCategoria, {
      ...datos,
      vista: 'categoria',
      categoria: { nombre: 'Cocina', slug: 'cocina', url: '#' },
    });
    const ids = () => [...document.querySelectorAll('#productos [data-gesicomm-item]')].map(el => el.getAttribute('data-gesicomm-item'));
    const select = document.querySelector('[data-gesicomm-filtro="categoria"]');

    expect(select.disabled).toBe(false);
    expect(select.value).toBe('Cocina');
    expect(document.querySelector('[data-gesicomm-categoria="nombre"]').textContent).toBe('Cocina');
    expect(ids()).toEqual(['air-fryer-26l', 'malo']);

    select.value = 'Ropa';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));

    expect(select.value).toBe('Ropa');
    expect(document.querySelector('[data-gesicomm-categoria="nombre"]').textContent).toBe('Ropa');
    expect(ids()).toEqual(['remera']);
    dom.window.close();
  });

  it('aplica el rango de precios mientras se escribe sin necesitar salir del campo', async () => {
    const { window, document, dom } = montar(PLANTILLA_CATALOGO_TEST, { ...datos, vista: 'catalogo' });
    const campo = document.querySelector('[data-gesicomm-filtro="precioMax"]');
    campo.value = '60000';
    campo.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 400));
    expect([...document.querySelectorAll('#productos [data-gesicomm-item]')].map(el => el.getAttribute('data-gesicomm-item'))).toEqual(['remera', 'malo']);
    dom.window.close();
  });

  it('respeta los productos ocultos del inicio en destacados sin renderizar catálogo completo', () => {
    const { document, dom } = montar(PLANTILLA_INICIO, { ...datos,
      productos: [{ ...airFryer, mostrar_en_inicio: false }, remera],
    });
    expect(document.querySelector('[data-gesicomm-lista="catalogo"]')).toBeNull();
    expect(document.querySelector('#destacados .product-card [data-gesicomm-bind="nombre"]').textContent).toBe('Remera');
    dom.window.close();
  });

  it('filtra el catálogo con botones rápidos por etiquetas comerciales', () => {
    const plantilla = {
      ...PLANTILLA_CATALOGO_TEST,
      html: PLANTILLA_CATALOGO_TEST.html.replace(
        '<div data-gesicomm-total></div>',
        '<div class="lv-quick-filters" aria-label="Filtros rápidos"></div><div data-gesicomm-total></div>',
      ),
    };
    const { document, click, dom } = montar(plantilla, {
      ...datos,
      vista: 'catalogo',
      productos: [
        { ...airFryer, etiqueta: 'Novedades, Outlet' },
        { ...remera, etiqueta: 'Más vendidos' },
        { ...malicioso, etiqueta: 'Oferta' },
      ],
    });
    const ids = () => [...document.querySelectorAll('#productos [data-gesicomm-item]')].map(el => el.getAttribute('data-gesicomm-item'));

    click('[data-gesicomm-filtro-etiqueta="Novedades"]');
    expect(ids()).toEqual(['air-fryer-26l']);
    expect(document.querySelector('[data-gesicomm-filtro-etiqueta="Novedades"]').getAttribute('aria-pressed')).toBe('true');

    click('[data-gesicomm-filtro-etiqueta="Novedades"]');
    expect(ids()).toEqual(['air-fryer-26l', 'remera', 'malo']);

    click('[data-gesicomm-filtro-etiqueta="Outlet"]');
    expect(ids()).toEqual(['air-fryer-26l']);
    dom.window.close();
  });

  it('manda los filtros al servidor cuando el catálogo está paginado', () => {
    const { window, document, mensajes, dom } = montar(PLANTILLA_CATALOGO_TEST, { ...datos, vista: 'catalogo', catalogo: { paginado: true, total: 80 }, productos: [{ ...airFryer, marca: 'Marca A', etiqueta: 'Oferta' }] });
    const pedido = mensajes.find(m => m.tipo === 'gesicomm:catalogo');
    window.dispatchEvent(new window.MessageEvent('message', { source: window, data: { tipo: 'gesicomm:catalogo-respuesta', id: pedido.id, productos: [airFryer], marcas: ['Marca A'], etiquetas: ['Oferta'], total: 80 } }));
    const el = document.querySelector('[data-gesicomm-filtro="etiqueta"]');
    el.value = 'Oferta'; el.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(mensajes.filter(m => m.tipo === 'gesicomm:catalogo').at(-1)).toMatchObject({ etiqueta: 'Oferta', soloInicio: false, pagina: 1 });
    dom.window.close();
  });

  it('pinta una tarjeta por producto, los destacados y el contador', () => {
    const { document } = montar(PLANTILLA_CATALOGO_TEST, { ...datos, vista: 'catalogo' });
    const tarjetas = document.querySelectorAll('#productos [data-gesicomm-item]');
    expect(tarjetas).toHaveLength(3);
    expect(tarjetas[0].querySelector('[data-gesicomm-bind="nombre"]').textContent).toBe('Air Fryer 2.6L');
    expect(tarjetas[0].querySelector('[data-gesicomm-bind="precio"]').textContent).toMatch(/^Gs 145\.735$/);
    expect(document.querySelector('[data-gesicomm-total]').textContent).toBe('3 productos disponibles');
  });

  it('usa solo los productos destacados configurados en la vitrina', () => {
    const { document } = montar(PLANTILLA_INICIO, {
      ...datos,
      venta: { destacados: ['remera', 'air-fryer-26l'] },
    });
    const destacados = [...document.querySelectorAll('#destacados .product-card [data-gesicomm-bind="nombre"]')]
      .map(el => el.textContent);
    expect(destacados).toEqual(['Remera', 'Air Fryer 2.6L']);
  });

  it('marca productos clickeables y rota la galería de la tarjeta al pasar el mouse', async () => {
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const { window, document } = montar(PLANTILLA_CATALOGO_TEST, { ...datos, vista: 'catalogo' });
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

  it('"Comprar" en una tarjeta agrega al carrito y lleva a la ficha', () => {
    const { document, mensajes, click } = montar(PLANTILLA_CATALOGO_TEST, { ...datos, vista: 'catalogo' });
    const boton = document.querySelector('#productos [data-gesicomm-item="air-fryer-26l"] [data-gesicomm-comprar]');
    expect(boton.textContent).toBe('Comprar');
    expect(boton.hasAttribute('data-gesicomm-comprar-ver')).toBe(true);
    click('#productos [data-gesicomm-item="air-fryer-26l"] [data-gesicomm-comprar]');
    expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'air-fryer-26l', cantidad: 1, abrir: false }));
    expect(mensajes).toContainEqual({ tipo: 'gesicomm:navegar', destino: 'producto', producto: 'air-fryer-26l' });
  });

  it('un producto con variantes comprado desde la grilla lleva a su ficha', () => {
    const { mensajes, click } = montar(PLANTILLA_CATALOGO_TEST, { ...datos, vista: 'catalogo' });
    click('#productos [data-gesicomm-item="remera"] [data-gesicomm-comprar]');
    expect(mensajes).toContainEqual({ tipo: 'gesicomm:navegar', destino: 'producto', producto: 'remera' });
    expect(mensajes.some(m => m.tipo === 'gesicomm:checkout')).toBe(false);
  });

  it('un link #ancla scrollea adentro en vez de navegar la ventana de afuera', () => {
    const { window, click } = montar(PLANTILLA_INICIO, {
      ...datos,
      venta: { inicio: { menu_links: [{ texto: 'Productos seleccionados', destino: '#productos-categoria' }] } },
    });
    let scrollPedido = null;
    window.scrollTo = (opts) => { scrollPedido = opts; };
    click('a[href="#productos-categoria"]');
    // scrollIntoView se propaga al editor que contiene el iframe: no se usa.
    expect(window.__scrolleado).toBeUndefined();
    expect(scrollPedido).toEqual(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('el texto del catálogo nunca se interpreta como HTML', () => {
    const { window, document } = montar(PLANTILLA_CATALOGO_TEST, { ...datos, vista: 'catalogo' });
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

  it('usa la fecha real del countdown global en Inicio', () => {
    const finAt = new Date(Date.now() + (7 * 60 + 10) * 60 * 1000).toISOString();
    const { document } = montar(PLANTILLA_INICIO, {
      ...datos,
      venta: {
        urgencia: {
          activo: true,
          fin_at: finAt,
          titulo: 'Ofertas que terminan pronto',
          texto: 'Aprovechá antes de que se agoten',
          cta_texto: 'Ver todos',
        },
      },
    });

    expect(document.querySelector('[data-gesicomm-countdown-parte="horas"]').textContent).toBe('07');
  });

  it('ofertas: Ver todos abre catálogo con todas las categorías y filtro Oferta', () => {
    const { mensajes, click } = montar(PLANTILLA_INICIO, {
      ...datos,
      venta: {
        urgencia: {
          activo: true,
          titulo: 'Ofertas que terminan pronto',
          texto: 'Aprovechá antes de que se agoten',
          cta_texto: 'Ver todos',
        },
      },
    });

    click('.limited-offer-see-all');
    expect(mensajes.filter(m => m.tipo === 'gesicomm:navegar').at(-1)).toMatchObject({
      destino: 'pagina',
      pagina: 'catalogo',
      filtro: { categoria: '', etiqueta: 'Oferta' },
    });
  });

  it('anuncios y zona de confianza traen contenido de ejemplo sin configurar nada', () => {
    const { document } = montar(PLANTILLA_INICIO, datos);
    const anuncios = [...document.querySelectorAll('.trust-bar .trust-item strong')].map(el => el.textContent);
    expect(anuncios).toEqual(Array.from({ length: 6 }).flatMap(() => [
      'Envío a todo Paraguay',
      'Pago seguro',
      'Atención personalizada',
      'Cambios y devoluciones',
    ]));
    const confianza = [...document.querySelectorAll('.trust-card h3')].map(el => el.textContent);
    expect(confianza).toEqual(['Opciones de pago', 'Cambios y devoluciones', 'Envíos a tu zona']);
  });

  it('anuncios y confianza configurados reemplazan el contenido de ejemplo', () => {
    const { document } = montar(PLANTILLA_INICIO, {
      ...datos,
      venta: {
        inicio: {
          anuncios: ['Hecho en Paraguay'],
          confianza: [{ icono: 'truck', titulo: 'Envío rápido', texto: 'A todo el país' }],
        },
      },
    });
    expect([...document.querySelectorAll('.trust-bar .trust-item strong')].map(el => el.textContent)).toEqual(Array(6).fill('Hecho en Paraguay'));
    const tarjetas = document.querySelectorAll('.trust-card');
    expect(tarjetas).toHaveLength(1);
    expect(tarjetas[0].querySelector('h3').textContent).toBe('Envío rápido');
    expect(tarjetas[0].querySelector('.trust-card-icon').textContent).toBe('🚚');
  });

  it('cada anuncio puede elegir su propio ícono; sin elegir, ciclan los genéricos', () => {
    const { document } = montar(PLANTILLA_INICIO, {
      ...datos,
      venta: {
        inicio: {
          anuncios: [
            { texto: 'Envío rápido', icono: 'truck' },
            { texto: 'Pago seguro', icono: 'card' },
            { texto: 'Sin ícono elegido' }, // icono vacío/ausente: cae al genérico por posición
          ],
        },
      },
    });
    const items = [...document.querySelectorAll('.trust-bar .trust-item')].slice(0, 3);
    expect(items.map(el => el.querySelector('.trust-icon').textContent)).toEqual(['🚚', '💳', '◉']);
    expect(items.map(el => el.querySelector('strong').textContent)).toEqual(['Envío rápido', 'Pago seguro', 'Sin ícono elegido']);
  });

  it('"Nuestra marca" queda oculta sin configurar, y se pinta completa cuando está activa', () => {
    const sinMarca = montar(PLANTILLA_INICIO, datos);
    expect(sinMarca.document.querySelector('#marca').hidden).toBe(true);

    const conMarca = montar(PLANTILLA_INICIO, {
      ...datos,
      venta: {
        inicio: {
          marca: {
            activo: true, kicker: 'Conocé', titulo: 'Lo cotidiano puede ser más simple.', texto: 'Hola\n\nSegundo párrafo',
            badges: ['Utilidad', 'Simplicidad'],
            medios: [{ tipo: 'imagen', url: 'https://cdn.test/marca.jpg' }],
          },
        },
      },
    });
    const { document } = conMarca;
    expect(document.querySelector('#marca').hidden).toBe(false);
    expect(document.querySelector('#marca').style.display).not.toBe('none');
    expect(document.querySelector('[data-gesicomm-venta="marca_titulo"]').textContent).toBe('Lo cotidiano puede ser más simple.');
    expect(document.querySelector('[data-gesicomm-venta="marca_texto"]').textContent).toBe('Hola\n\nSegundo párrafo');
    expect(getComputedStyle(document.querySelector('[data-gesicomm-venta="marca_texto"]').parentElement.querySelector('p:not(.eyebrow)')).whiteSpace).toBe('pre-line');
    expect([...document.querySelectorAll('.brand-badge')].map(el => el.textContent)).toEqual(['Utilidad', 'Simplicidad']);
    expect(document.querySelector('.brand-medio img').getAttribute('src')).toBe('https://cdn.test/marca.jpg');
    const css = [...document.querySelectorAll('style')].map(el => el.textContent).join('\n');
    expect(css).toContain('.brand-section .brand-layout { width: min(100%, 1120px); margin: 0 auto; padding: 0 clamp(28px, 4vw, 42px);');
    expect(css).toContain('main[data-gesicomm-base="catalogo"] > .page-content > .brand-section > .brand-layout');
  });

  it('testimonios del inicio se ocultan sin datos y pintan opiniones configuradas', () => {
    const sinTestimonios = montar(PLANTILLA_INICIO, datos);
    expect(sinTestimonios.document.querySelector('#testimonios').hidden).toBe(true);

    const { document } = montar(PLANTILLA_INICIO, {
      ...datos,
      venta: {
        inicio: {
          testimonios: {
            kicker: 'Clientes reales',
            titulo: 'Lo que dicen de la tienda',
            subtitulo: 'Opiniones cargadas por el comercio.',
            items: [
              {
                nombre: 'María López',
                detalle: 'Compra verificada',
                comentario: 'Me respondieron rápido y el producto llegó perfecto.',
                foto: 'https://cdn.test/maria.webp',
                calificacion: 4,
              },
            ],
          },
        },
      },
    });

    expect(document.querySelector('#testimonios').hidden).toBe(false);
    expect(document.querySelector('[data-gesicomm-venta="testimonios_kicker"]').textContent).toBe('Clientes reales');
    expect(document.querySelector('[data-gesicomm-venta="testimonios_titulo"]').textContent).toBe('Lo que dicen de la tienda');
    expect(document.querySelector('[data-gesicomm-venta="testimonios_subtitulo"]').textContent).toBe('Opiniones cargadas por el comercio.');
    expect(document.querySelector('.testimonial-stars').textContent).toBe('★★★★');
    expect(document.querySelector('.testimonial-name').textContent).toBe('María López');
    expect(document.querySelector('.testimonial-detail').textContent).toBe('Compra verificada');
    expect(document.querySelector('.testimonial-quote').textContent).toBe('Me respondieron rápido y el producto llegó perfecto.');
    expect(document.querySelector('.testimonial-avatar img').getAttribute('src')).toBe('https://cdn.test/maria.webp');
  });

  it('productos por categoría: sin selección usa catálogo visible, filtra por tab y respeta el límite', () => {
    const sinItems = montar(PLANTILLA_INICIO, datos);
    expect(sinItems.document.querySelector('#productos-categoria').hidden).toBe(false);
    expect([...sinItems.document.querySelectorAll('#productos-categoria [data-gesicomm-bind="nombre"]')].map(el => el.textContent)).toEqual(['Air Fryer 2.6L', 'Remera', '<img src=x onerror="window.__xss=1"></script><b>x</b>']);

    const { document, click } = montar(PLANTILLA_INICIO, {
      ...datos,
      productos: [airFryer, remera, malicioso],
      venta: { inicio: { productos_categoria: { activo: true, items: ['air-fryer-26l', 'remera', 'malo'], limite: 1 } } },
    });
    expect(document.querySelector('#productos-categoria').hidden).toBe(false);
    // Límite 1: solo el primero de la lista configurada se pinta...
    expect([...document.querySelectorAll('#productos-categoria [data-gesicomm-bind="nombre"]')].map(el => el.textContent)).toEqual(['Air Fryer 2.6L']);
    // ...pero las tabs salen de TODA la selección curada, no de lo limitado:
    // así se puede navegar a una categoría que el límite dejó afuera.
    const tabs = [...document.querySelectorAll('[data-gesicomm-pc-categoria]')].map(el => el.textContent);
    expect(tabs).toEqual(['Todos', 'Cocina', 'Ropa']);
  });

  it('productos por categoría: la tab de una categoría filtra sin tocar el estado del catálogo completo', () => {
    const { document, click } = montar(PLANTILLA_INICIO, {
      ...datos,
      productos: [airFryer, remera],
      venta: { inicio: { productos_categoria: { activo: true, items: ['air-fryer-26l', 'remera'], limite: 8 } } },
    });
    const nombres = () => [...document.querySelectorAll('#productos-categoria [data-gesicomm-bind="nombre"]')].map(el => el.textContent);
    expect(nombres()).toEqual(['Air Fryer 2.6L', 'Remera']);
    expect([...document.querySelectorAll('[data-gesicomm-pc-categoria]')].map(el => el.textContent)).toEqual(['Todos', 'Cocina', 'Ropa']);

    click('[data-gesicomm-pc-categoria="Ropa"]');
    expect(nombres()).toEqual(['Remera']);
    expect(document.querySelector('[data-gesicomm-pc-categoria="Ropa"]').classList.contains('is-active')).toBe(true);

    click('[data-gesicomm-pc-categoria=""]');
    expect(nombres()).toEqual(['Air Fryer 2.6L', 'Remera']);
  });

  it('productos por categoría: incluye buscador propio sin tocar el catálogo completo', () => {
    const { document, window } = montar(PLANTILLA_INICIO, {
      ...datos,
      productos: [airFryer, remera],
      venta: { inicio: { productos_categoria: { activo: true, items: ['air-fryer-26l', 'remera'], limite: 8 } } },
    });
    const nombres = () => [...document.querySelectorAll('#productos-categoria [data-gesicomm-bind="nombre"]')].map(el => el.textContent);
    const buscador = document.querySelector('[data-gesicomm-pc-buscar]');
    expect(buscador).toBeTruthy();

    buscador.value = 'remera';
    buscador.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(nombres()).toEqual(['Remera']);
    expect(document.querySelector('[data-gesicomm-pc-vacio]').hidden).toBe(true);

    buscador.value = 'no existe';
    buscador.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(nombres()).toEqual([]);
    expect(document.querySelector('[data-gesicomm-pc-vacio]').hidden).toBe(false);
  });

  it('bloques: reordena y oculta secciones del body sin lista guardada (compatibilidad total)', () => {
    const { document } = montar(PLANTILLA_INICIO, datos);
    // Sin venta.inicio.bloques, el orden original del HTML queda intacto.
    const orden = [...document.querySelectorAll('.page-content > [data-gesicomm-bloque]')].map(el => el.getAttribute('data-gesicomm-bloque'));
    expect(orden[0]).toBe('banner');
    expect(orden.indexOf('destacados')).toBeGreaterThan(orden.indexOf('categorias'));

    const { document: reordenado } = montar(PLANTILLA_INICIO, {
      ...datos,
      venta: {
        inicio: {
          bloques: [
            { tipo: 'destacados', visible: true },
            { tipo: 'banner', visible: true },
            { tipo: 'categorias', visible: false },
          ],
        },
      },
    });
    // Los bloques movidos van al final del contenedor, en el orden dado —
    // los que la config no menciona quedan donde ya estaban (no es una
    // lista parcial real: el editor siempre guarda los 17 completos).
    const ordenNuevo = [...reordenado.querySelectorAll('.page-content > [data-gesicomm-bloque]')].map(el => el.getAttribute('data-gesicomm-bloque'));
    const pos = tipo => ordenNuevo.indexOf(tipo);
    expect(pos('destacados')).toBeLessThan(pos('banner'));
    expect(pos('banner')).toBeLessThan(pos('categorias'));
    expect(reordenado.querySelector('#categorias').hidden).toBe(true);
    // "destacados" no estaba apagado y la vitrina tenía producto: igual se ve.
    expect(reordenado.querySelector('#destacados').hidden).toBe(false);
  });

  it('bloques: un bloque oculto manualmente vuelve a mostrarse al prender Mostrar', () => {
    const banner = {
      id: 'hero',
      activo: true,
      titulo: 'Promo visible',
      subtitulo: 'Texto del banner',
      imagen: '/uploads/banner.webp',
    };
    const base = {
      ...datos,
      venta: {
        inicio: {
          banners: [banner],
          bloques: [{ tipo: 'banner', visible: false }],
        },
      },
    };
    const { document, window } = montar(PLANTILLA_INICIO, base);
    const hero = document.querySelector('[data-gesicomm-bloque="banner"]');
    expect(hero.hidden).toBe(true);
    expect(hero.getAttribute('data-gesicomm-oculto-manual')).toBe('1');

    window.dispatchEvent(new window.MessageEvent('message', {
      data: {
        tipo: 'gesicomm:datos',
        datos: {
          ...base,
          venta: { inicio: { banners: [banner], bloques: [{ tipo: 'banner', visible: true }] } },
        },
      },
      source: window.parent,
    }));

    expect(hero.hidden).toBe(false);
    expect(hero.hasAttribute('data-gesicomm-oculto-manual')).toBe(false);
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

  it('muestra siempre el countdown y filtra las estadísticas por producto', () => {
    const plantilla = {
      html: `
        <section class="timer" data-gesicomm-countdown>
          <b data-gesicomm-countdown-parte="horas"></b>
          <b data-gesicomm-countdown-parte="minutos"></b>
          <b data-gesicomm-countdown-parte="segundos"></b>
        </section>
        <section class="stats" data-gesicomm-lista="estadisticas">
          <template><article><b data-gesicomm-bind="valor"></b><span data-gesicomm-bind="etiqueta"></span></article></template>
        </section>`,
      css: '',
      js: '',
    };
    const venta = {
      urgencia: { activo: true, producto_id: 'remera', fin_at: new Date(Date.now() + 3600 * 1000).toISOString() },
      prueba_social: { activo: true, producto_id: 'remera', items: [{ valor: '94%', etiqueta: 'compradores satisfechos' }] },
    };

    const coincide = montar(plantilla, { ...datos, venta });
    expect(coincide.document.querySelector('.timer').style.display).toBe('');
    expect(coincide.document.querySelector('[data-gesicomm-countdown-parte="horas"]').textContent).toMatch(/^\d{2}$/);
    expect(coincide.document.querySelectorAll('.stats article')).toHaveLength(1);

    const noCoincide = montar(plantilla, {
      ...datos,
      venta: {
        urgencia: { ...venta.urgencia, producto_id: 'air-fryer-26l' },
        prueba_social: { ...venta.prueba_social, producto_id: 'air-fryer-26l' },
      },
    });
    expect(noCoincide.document.querySelector('.timer').style.display).toBe('');
    expect(noCoincide.document.querySelector('.stats').style.display).toBe('none');

    const sinDatos = montar(plantilla, { ...datos, venta: null });
    expect(sinDatos.document.querySelector('.timer').style.display).toBe('');
    expect(sinDatos.document.querySelector('[data-gesicomm-countdown-parte="horas"]').textContent).toMatch(/^\d{2}$/);
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
  const base = { vista: 'catalogo', tienda: {}, producto: null, recomendados: [] };

  it('catálogo chico: busca sin tildes, filtra por categoría y ordena sin ir al servidor', async () => {
    const productos = [
      { ...airFryer, id: 'a', nombre: 'Café molido', categoria: 'Cocina', precio: 30000 },
      { ...airFryer, id: 'b', nombre: 'Mancuerna', categoria: 'Fitness', precio: 90000 },
      { ...airFryer, id: 'c', nombre: 'Cafetera', categoria: 'Cocina', precio: 120000 },
    ];
    const { window, document, mensajes } = montar(PLANTILLA_CATALOGO_TEST, { ...base, productos });
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
    const datos = { ...base, productos: [airFryer], catalogo: { total: 60, por_pagina: 20, paginado: true } };
    const { window, document, mensajes, click } = montar(PLANTILLA_CATALOGO_TEST, datos);
    const responder = extra => {
      const pedido = [...mensajes].reverse().find(m => m.tipo === 'gesicomm:catalogo');
      window.dispatchEvent(new window.MessageEvent('message', {
        source: window,
        data: { tipo: 'gesicomm:catalogo-respuesta', id: pedido.id, modo: pedido.modo, ...extra },
      }));
      return pedido;
    };

    const inicial = responder({ productos: [airFryer], pagina: 1, totalPaginas: 3, total: 60, categorias: ['Cocina', 'Ropa'] });
    expect(inicial).toEqual(expect.objectContaining({ pagina: 1, porPagina: 20 }));
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
    const datos = { ...base, productos: [airFryer], catalogo: { total: 60, por_pagina: 20, paginado: true } };
    const { window, document, mensajes } = montar(PLANTILLA_CATALOGO_TEST, datos);
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
    expect(mensajes).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'gesicomm:navegar', destino: 'pagina', pagina: 'politica-privacidad' }),
    ]));
  });

  it('un href escrito a mano (sin data-gesicomm-link) también se reconoce; uno externo no se toca', () => {
    const html = '<a id="a" href="/contacto">Contacto</a><a id="b" href="https://otro.com/contacto">Otro</a>';
    const { document, mensajes, click } = montar({ html, css: '', js: '' }, datos);
    expect(document.querySelector('#a').getAttribute('href')).toBe('/l/mi-promo/contacto');
    expect(document.querySelector('#b').getAttribute('href')).toBe('https://otro.com/contacto');
    click('#a');
    expect(mensajes).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'gesicomm:navegar', destino: 'pagina', pagina: 'contacto' }),
    ]));
    click('#b');
    expect(mensajes.filter(m => m.destino === 'pagina')).toHaveLength(1);
  });

  it('el menú principal generado navega al checkout desde cualquier vista', () => {
    const plantilla = {
      html: '<nav id="nav-links"></nav>',
      css: '',
      js: '',
    };
    const { document, mensajes, click } = montar(plantilla, {
      ...datos,
      vista: 'checkout',
      venta: { inicio: { menu_links: [{ texto: 'Checkout', destino: '/checkout' }] } },
      paginas: { ...paginas, checkout: '/l/mi-promo/checkout' },
    });
    const link = document.querySelector('#nav-links a');
    expect(link.textContent).toBe('Checkout');
    expect(link.getAttribute('data-gesicomm-link')).toBe('checkout');
    expect(link.className).toBe('active');
    click('#nav-links a');
    expect(mensajes).toContainEqual({ tipo: 'gesicomm:navegar', destino: 'pagina', pagina: 'checkout', filtro: {} });
  });

  it('el menú principal marca Productos en catálogo y oculta anchors internos fuera de Inicio', () => {
    const plantilla = {
      html: '<main class="lv-shop-page"></main><nav id="nav-links"></nav>',
      css: '',
      js: '',
    };
    const { document } = montar(plantilla, {
      ...datos,
      vista: 'catalogo',
      venta: {
        inicio: {
          menu_links: [
            { texto: 'Inicio', destino: '#inicio' },
            { texto: 'Productos', destino: '/catalogo' },
            { texto: 'Colecciones', destino: '#colecciones' },
          ],
        },
      },
    });

    const links = [...document.querySelectorAll('#nav-links a')];
    expect(links.map(link => link.textContent)).toEqual(['Inicio', 'Productos']);
    expect(links.find(link => link.textContent === 'Productos').className).toBe('active');
    expect(links.find(link => link.textContent === 'Inicio').className).toBe('');
  });

  it('el buscador del header abre catálogo con la búsqueda aplicada cuando no hay grilla en la vista', () => {
    const plantilla = {
      html: '<form role="search"><input type="search" data-gesicomm-buscar value="cafetera"><button type="submit">Buscar</button></form>',
      css: '',
      js: '',
    };
    const { document, mensajes } = montar(plantilla, datos);
    document.querySelector('form').dispatchEvent(new document.defaultView.Event('submit', { bubbles: true, cancelable: true }));
    expect(mensajes).toContainEqual({
      tipo: 'gesicomm:navegar',
      destino: 'pagina',
      pagina: 'catalogo',
      filtro: { busqueda: 'cafetera' },
    });
  });

  it('la lupa del header despliega el buscador y deja escribir', () => {
    const { document, click } = montar(PLANTILLA_INICIO, datos);
    const toggle = document.querySelector('[data-gesicomm-search-toggle]');
    const panel = document.querySelector('#gesicomm-search-panel');
    const input = panel.querySelector('[data-gesicomm-buscar]');

    expect(panel.hidden).toBe(true);
    click('[data-gesicomm-search-toggle]');

    expect(panel.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(input);
  });

  it('el buscador del header lista coincidencias parciales y navega al producto', () => {
    const { window, document, mensajes, click } = montar(PLANTILLA_INICIO, datos);
    click('[data-gesicomm-search-toggle]');
    const input = document.querySelector('#gesicomm-search-panel [data-gesicomm-buscar]');
    input.value = 'fry';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    const resultados = [...document.querySelectorAll('[data-gesicomm-search-result]')];
    expect(resultados.map(el => el.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Air Fryer 2.6L')]));
    expect(resultados[0].querySelector('img').getAttribute('src')).toBe('https://cdn.test/air.jpg');

    resultados[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(mensajes).toContainEqual({ tipo: 'gesicomm:navegar', destino: 'producto', producto: 'air-fryer-26l' });
  });
});

describe('ficha: imágenes y descripciones legibles', () => {
  it('conserva el contenedor centrado de una ficha sin dejar estrecho el fondo completo', () => {
    const { window, document, dom } = montar({
      html: '<main class="container"></main><footer></footer>',
      css: '.container{width:1180px;min-width:0}', js: '',
    }, { tienda: {} });
    expect(window.getComputedStyle(document.querySelector('main')).minWidth).toBe('0px');
    expect(window.getComputedStyle(document.querySelector('footer')).minWidth).toBe('100%');
    dom.window.close();
  });

  it('respeta el tamaño de miniaturas, imágenes principales y fotos de tarjetas guardadas', () => {
    const { window, document, dom } = montar({
      html: '<img class="mini" data-gesicomm-bind="imagen"><img class="principal" data-gesicomm-bind="imagen"><img class="tarjeta" data-gesicomm-bind="imagen">',
      css: '.mini{width:72px;height:72px}.principal{width:100%;height:440px}.tarjeta{width:100%;height:auto}',
      js: '',
    }, { vista: 'producto', productos: [airFryer], producto: airFryer, tienda: {} });
    const estilo = selector => window.getComputedStyle(document.querySelector(selector));
    expect(estilo('.mini').width).toBe('72px');
    expect(estilo('.mini').height).toBe('72px');
    expect(estilo('.principal').height).toBe('440px');
    expect(estilo('.tarjeta').height).toBe('auto');
    expect(estilo('.principal').objectFit).toBe('contain');
    dom.window.close();
  });

  it('una foto ausente se mantiene oculta y no ocupa el lugar del texto', () => {
    const { window, document, dom } = montar(PLANTILLA_PRODUCTO, {
      vista: 'producto', productos: [remera], producto: remera, tienda: {}, recomendados: [],
    });
    expect(window.getComputedStyle(document.querySelector('img[data-gesicomm-bind="imagen"]')).display).toBe('none');
    expect(document.querySelector('#descripcion').style.display).toBe('none');
    expect(document.querySelector('a[href="#descripcion"]').style.display).toBe('none');
    dom.window.close();
  });

  it('muestra la descripción real con sus párrafos cuando está cargada', () => {
    const producto = { ...airFryer, sobre: 'Una opción práctica.', descripcion_larga: 'Primer párrafo.\n\nSegundo párrafo.' };
    const { document, dom } = montar(PLANTILLA_PRODUCTO, {
      vista: 'producto', productos: [producto], producto, tienda: {}, recomendados: [],
    });
    expect(document.querySelector('#descripcion').style.display).toBe('');
    expect(document.querySelector('a[href="#descripcion"]').style.display).toBe('');
    expect(document.querySelector('[data-gesicomm-bind="descripcion_larga"]').textContent).toBe(producto.descripcion_larga);
    dom.window.close();
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

  it('en publicación, los paquetes normales aparecen aunque no estén en cross_sell; si se desmarcan, vuelve cantidad', () => {
    const pack = {
      id: 92, nombre: 'Llevá 2', estrategia: 'normal', tipo_contenido: 'pack',
      precio_normal: 250000, precio_efectivo: 250000, unidades: 2, imagen: null,
    };
    const itemConPack = { ...itemBackend, ofertas: [pack] };
    const dataPack = (paquetes = {}) => ({
      content: { venta: { configurado: true, tipo: 'catalogo', paquetes, cross_sell: { activo: true, ofertas: [] } } },
      catalogo_items: [itemConPack],
    });

    const publicado = datosRuntimePublico(dataPack(), 'tienda', itemConPack);
    expect(publicado.producto.ofertas.map(o => o.id)).toEqual([92]);
    const conPack = montar(PLANTILLA_PRODUCTO, publicado);
    expect(conPack.document.querySelectorAll('.paquete')).toHaveLength(2);
    expect(conPack.document.querySelector('[data-gesicomm-cantidad-input]').style.display).toBe('none');

    const oculto = datosRuntimePublico(dataPack({ 92: { activo: false } }), 'tienda', itemConPack);
    expect(oculto.producto.ofertas).toEqual([]);
    const sinPack = montar(PLANTILLA_PRODUCTO, oculto);
    expect(sinPack.document.querySelector('.paquetes').style.display).toBe('none');
    expect(sinPack.document.querySelector('[data-gesicomm-cantidad-input]').style.display).toBe('');
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

  it('pinta promesa, beneficios junto a la compra, garantías y preguntas; el ahorro barato va en %', () => {
    const datos = datosRuntimePublico(data([producto]), 'x', producto);
    const { document } = montar(PLANTILLA_PRODUCTO, datos);
    expect(document.querySelector('.pdp-promesa').textContent).toBe('Controlá el apetito.');
    expect([...document.querySelectorAll('.highlights li')].map(l => l.textContent)).toEqual(['Menos ansiedad', 'Más energía']);
    expect(document.querySelectorAll('.garantias li')).toHaveLength(1);
    expect([...document.querySelectorAll('.faq-item summary')].some(l => l.textContent.includes('Dosis'))).toBe(true);
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

  it('lienzo blanco: un HTML pegado para combo pinta incluidos, navega y compra el combo', () => {
    const htmlPegado = {
      html: `
        <main class="combo-page">
          <section class="combo-hero" data-gesicomm-si="combo_incluye">
            <p class="eyebrow">Combo armado</p>
            <h1 data-gesicomm-bind="nombre"></h1>
            <p class="promise" data-gesicomm-bind="propuesta_valor"></p>
            <div class="price-row">
              <s data-gesicomm-bind="precio_separado"></s>
              <strong data-gesicomm-bind="precio"></strong>
              <em data-gesicomm-bind="ahorro_texto"></em>
            </div>

            <div class="kit-list" data-gesicomm-lista="combo_incluye">
              <template>
                <article class="kit-item">
                  <img data-gesicomm-bind="imagen" alt="">
                  <strong data-gesicomm-bind="nombre"></strong>
                  <span data-gesicomm-bind="cantidad"></span>
                  <small data-gesicomm-bind="precio"></small>
                  <button type="button" data-gesicomm-ver>Ver producto</button>
                </article>
              </template>
            </div>

            <button class="buy-combo" data-gesicomm-comprar>
              <span data-gesicomm-cta>Comprar combo</span>
              <b data-gesicomm-total></b>
            </button>
          </section>
        </main>
      `,
      css: '.kit-item.is-ready{outline:1px solid #10b981}.price-row{display:flex;gap:8px}',
      js: `
        document.querySelectorAll('.kit-item').forEach(function (item) {
          item.classList.add('is-ready');
        });
      `,
    };
    const combo = {
      content_id: 'combo-3',
      referencia_id: 3,
      tipo: 'combo',
      nombre: 'Kit adelgazante',
      precio: 288000,
      imagen: img,
      imagenes: [img],
      variantes: [],
      ofertas: [],
      propuesta_valor: 'Dos productos en una sola compra.',
      productos_combo: [
        { id: 8, slug: 'adelfit', nombre: 'AdelFit', precio: 169000, cantidad: 1, imagen: img },
        { id: 9, slug: 'articumina', nombre: 'Articumina', precio: 170000, cantidad: 2, imagen: img },
      ],
    };
    const articumina = {
      content_id: 'articumina',
      referencia_id: 9,
      tipo: 'producto',
      nombre: 'Articumina',
      precio: 170000,
      imagen: img,
      imagenes: [img],
      variantes: [],
      ofertas: [],
    };
    const datos = datosRuntimePublico(data([producto, articumina, combo]), 'x', combo);

    const { document, mensajes, click } = montar(htmlPegado, datos);

    expect(document.querySelector('[data-gesicomm-bind="nombre"]').textContent).toBe('Kit adelgazante');
    expect(document.querySelector('[data-gesicomm-bind="precio_separado"]').textContent).toBe('Gs 509.000');
    expect(document.querySelector('[data-gesicomm-bind="precio"]').textContent).toBe('Gs 288.000');
    expect(document.querySelector('[data-gesicomm-bind="ahorro_texto"]').textContent).toBe('Ahorrás 43%');
    expect([...document.querySelectorAll('.kit-item [data-gesicomm-bind="nombre"]')].map(el => el.textContent)).toEqual(['AdelFit', 'Articumina']);
    expect(document.querySelectorAll('.kit-item.is-ready')).toHaveLength(2);
    expect(document.querySelector('.kit-item').getAttribute('data-gesicomm-item')).toBe('adelfit');
    expect(document.querySelector('.buy-combo [data-gesicomm-total]').textContent).toBe('Gs 288.000');

    click('.kit-item [data-gesicomm-ver]');
    expect(mensajes.filter(m => m.tipo === 'gesicomm:navegar').at(-1)).toMatchObject({
      destino: 'producto',
      producto: 'adelfit',
    });

    click('.buy-combo');
    expect(mensajes.filter(m => m.tipo === 'gesicomm:checkout').at(-1)).toMatchObject({
      producto: 'combo-3',
      cantidad: 1,
      oferta: null,
      abrir: true,
    });
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


describe('presentacion comercial del lienzo', () => {
  it('activa catálogo paginado con 20 productos desde la metadata pública del backend', () => {
    const publico = datosRuntimePublico({
      content: { venta: { configurado: true } },
      catalogo_items: [airFryer],
      paginacion: { pagina: 1, porPagina: 20, total: 57, totalPaginas: 3 },
    });

    expect(publico.catalogo).toMatchObject({ total: 57, por_pagina: 20, paginado: true });
  });

  it('usa el mismo copy guardado en el panel y en la landing publica', () => {
    const venta = { presentacion_productos: { 'producto:10': { titulo_comercial: 'Cocina facil', mensaje_comercial: 'Para compartir', insignia_principal: 'Oferta', insignia_secundaria: 'Exclusivo online' } } };
    const panel = datosRuntimePreview({ productos: [{ ...airFryer, id: 10, slug: airFryer.id, precio_efectivo: airFryer.precio }], venta });
    const publico = datosRuntimePublico({ items: [airFryer], content: { venta } });
    expect(panel.productos[0].titulo_comercial).toBe('Cocina facil');
    expect(publico.productos[0].titulo_comercial).toBe('Cocina facil');
    const plantilla = { html: '<div data-gesicomm-lista="productos"><template><article><div data-gesicomm-bind="etiqueta"></div><div class="product-content"><h3 data-gesicomm-bind="nombre"></h3><span data-gesicomm-bind="precio"></span></div></article></template></div>', css: '', js: '' };
    const { dom, document, click, mensajes } = montar(plantilla, { vista: 'inicio', productos: [{ ...airFryer, ...venta.presentacion_productos['producto:10'], etiqueta: 'Cocina' }] });
    expect(document.querySelector('h3').textContent).toBe('Cocina facil');
    expect(document.querySelector('.gc-commercial-badges').textContent).toContain('Oferta');
    expect(document.querySelector('.gc-commercial-saving').textContent).toContain('34.265');
    expect(document.querySelector('[data-gesicomm-bind="etiqueta"]').style.display).toBe('none');
    click('.gc-commercial-details');
    expect(mensajes.some(m => m.destino === 'producto')).toBe(true);
    dom.window.close();
  });
});

describe('esCheckoutBase — una landing que nunca tocó su checkout a mano siempre recibe la plantilla al día', () => {
  it('reconoce la plantilla actual', () => {
    expect(esCheckoutBase(PLANTILLA_CHECKOUT.html)).toBe(true);
  });

  it('vacío cuenta como base (nunca se guardó nada)', () => {
    expect(esCheckoutBase('')).toBe(true);
    expect(esCheckoutBase(null)).toBe(true);
  });

  it('reconoce un guardado VIEJO de la base (de antes de Departamento/Ciudad o del color corregido) por su estructura, aunque no tenga la marca data-gesicomm-base', () => {
    const guardadoViejo = PLANTILLA_CHECKOUT.html
      .replace('data-gesicomm-base="checkout"', '') // como quedó guardado antes de agregar la marca
      .replace('<select name="departamento" data-gesicomm-geografia="departamento">\n              <option value="">Departamento</option>\n            </select>', '')
      .replace('background:var(--lv-surface)', 'background:#fff'); // el bug de color viejo
    expect(esCheckoutBase(guardadoViejo)).toBe(true);
  });

  it('un checkout realmente reescrito a mano (sin el formulario de Gesicomm) NO se pisa', () => {
    expect(esCheckoutBase('<div class="mi-checkout-hecho-a-mano"><h1>Pagá acá</h1></div>')).toBe(false);
  });
});

describe('runtime — checkout propio, departamento y ciudad', () => {
  const geografia = [
    { id: 1, nombre: 'Central', ciudades: [{ id: 1, nombre: 'Luque' }, { id: 2, nombre: 'San Lorenzo' }] },
    { id: 2, nombre: 'Alto Paraná', ciudades: [{ id: 3, nombre: 'Ciudad del Este' }] },
  ];
  const datosCheckout = {
    vista: 'checkout',
    tienda: { nombre: 'Mi Tienda' },
    productos: [], producto: null, recomendados: [],
    carrito: { cantidad: 1, subtotal: 145735, total: 145735, items: [{ nombre: airFryer.nombre, precio_unitario: airFryer.precio, cantidad: 1, subtotal: airFryer.precio }] },
    geografia,
  };

  it('llena Departamento con el catálogo real y Ciudad con todas las ciudades sin filtrar', () => {
    const { document, dom } = montar(PLANTILLA_CHECKOUT, datosCheckout);
    const selDepto = document.querySelector('[data-gesicomm-geografia="departamento"]');
    const selCiudad = document.querySelector('[data-gesicomm-geografia="ciudad"]');
    expect([...selDepto.options].map(o => o.textContent)).toEqual(['Departamento', 'Central', 'Alto Paraná']);
    // Sin departamento elegido: las tres ciudades de todos los departamentos, alfabéticas.
    expect([...selCiudad.options].map(o => o.textContent)).toEqual(['Ciudad', 'Ciudad del Este', 'Luque', 'San Lorenzo']);
    dom.window.close();
  });

  it('elegir un departamento filtra Ciudad a solo las suyas', () => {
    const { document, window, dom } = montar(PLANTILLA_CHECKOUT, datosCheckout);
    const selDepto = document.querySelector('[data-gesicomm-geografia="departamento"]');
    const selCiudad = document.querySelector('[data-gesicomm-geografia="ciudad"]');
    selDepto.value = 'Central';
    selDepto.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect([...selCiudad.options].map(o => o.textContent)).toEqual(['Ciudad', 'Luque', 'San Lorenzo']);
    dom.window.close();
  });

  it('el valor elegido viaja con el resto del formulario al confirmar', () => {
    const { document, window, mensajes, dom } = montar(PLANTILLA_CHECKOUT, datosCheckout);
    document.querySelector('[name="nombre_cliente"]').value = 'Ana Gómez';
    document.querySelector('[name="telefono"]').value = '0981123456';
    document.querySelector('[name="direccion"]').value = 'Calle Falsa 123';
    const selDepto = document.querySelector('[data-gesicomm-geografia="departamento"]');
    const selCiudad = document.querySelector('[data-gesicomm-geografia="ciudad"]');
    selDepto.value = 'Alto Paraná';
    selDepto.dispatchEvent(new window.Event('change', { bubbles: true }));
    selCiudad.value = 'Ciudad del Este';
    document.querySelector('form[data-gesicomm-checkout-form]')
      .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    const confirmado = mensajes.find(m => m.tipo === 'gesicomm:confirmar-checkout');
    expect(confirmado.campos).toMatchObject({ departamento: 'Alto Paraná', ciudad: 'Ciudad del Este' });
    dom.window.close();
  });
});
