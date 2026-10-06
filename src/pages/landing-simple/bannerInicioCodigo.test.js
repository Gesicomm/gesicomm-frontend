import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { PLANTILLA_INICIO } from './plantillasBaseCodigo';
import { datosRuntimePreview, datosRuntimePublico } from './datosRuntime';
import { getMediaUrl } from '../../services/api';

function montar(banners = [], codigo = PLANTILLA_INICIO, extra = {}) {
  return new JSDOM(construirDocumentoCodigo(codigo, {
    datos: {
      vista: 'inicio',
      tienda: {},
      productos: extra.productos || [],
      venta: { inicio: { banners }, ...(extra.venta || {}) },
    },
  }), { runScripts: 'dangerously', beforeParse(w) { w.postMessage = () => {}; } });
}

describe('banners configurados del inicio', () => {
  it('resuelve las imagenes y videos subidos contra el backend tanto en editor como en publico', () => {
    const venta = { inicio: { banners: [
      { id: 'foto', titulo: 'Titulo elegido', imagen: '/uploads/banner.webp', activo: true },
      { id: 'video', imagen: '/uploads/banner.mp4', tipo_medio: 'video', activo: false },
    ] } };
    const preview = datosRuntimePreview({ productos: [], venta }).venta.inicio.banners;
    const publico = datosRuntimePublico({ content: { venta }, catalogo_items: [] }, 'tienda').venta.inicio.banners;
    expect(preview).toEqual(publico);
    expect(preview[0]).toEqual({ ...venta.inicio.banners[0], imagen: getMediaUrl('/uploads/banner.webp') });
    expect(preview[1]).toEqual({ ...venta.inicio.banners[1], imagen: getMediaUrl('/uploads/banner.mp4') });
    expect(venta.inicio.banners[0].imagen).toBe('/uploads/banner.webp');
  });

  it('tambien conserva banners si la venta viene con inicio_comercial', () => {
    const venta = { inicio_comercial: { banners: [
      { id: 'foto', titulo: 'Banner guardado', imagen: '/uploads/banner.webp', activo: true },
    ] } };
    const runtime = datosRuntimePublico({ content: { venta }, catalogo_items: [] }, 'tienda').venta;
    const dom = montar([], PLANTILLA_INICIO, { venta: runtime });
    const doc = dom.window.document;
    expect(runtime.inicio.banners[0].titulo).toBe('Banner guardado');
    expect(doc.querySelector('.hero-banner h2').textContent).toBe('Banner guardado');
    dom.window.close();
  });

  it('no inventa campanas, beneficios ni una oferta sin configurar', () => {
    const dom = montar();
    const doc = dom.window.document;
    expect(doc.querySelector('#inicio').hidden).toBe(true);
    expect(doc.querySelector('#ofertas').hidden).toBe(true);
    expect(doc.querySelector('.store-benefits')).toBeNull();
    expect(doc.querySelector('main').textContent).not.toContain('Checkout simple');
    expect(doc.querySelector('main').textContent).not.toContain('Procesado por PagoPar');
    expect(doc.querySelector('.hero-fallback, .promo-band, .reviews-section')).toBeNull();
    dom.window.close();
  });

  it('no renderiza el catalogo completo dentro de la homepage', () => {
    const dom = montar([], PLANTILLA_INICIO, {
      productos: Array.from({ length: 20 }, (_, idx) => ({
        id: `p${idx}`,
        content_id: `p${idx}`,
        nombre: `Producto ${idx}`,
        precio: 1000 + idx,
        imagen: `https://cdn.test/${idx}.png`,
      })),
    });
    const doc = dom.window.document;
    expect(doc.querySelector('[data-gesicomm-lista="catalogo"]')).toBeNull();
    expect(doc.querySelector('#catalogo-completo a[data-gesicomm-link="catalogo"]').getAttribute('href')).toBe('/catalogo');
    expect(doc.querySelector('main').textContent).not.toContain('Producto 19');
    dom.window.close();
  });
  it('muestra ofertas que terminan pronto con countdown y solo productos con descuento', () => {
    const dom = montar([], PLANTILLA_INICIO, {
      venta: {
        urgencia: {
          activo: true,
          titulo: 'Ofertas que terminan pronto',
          texto: 'Aprovechá antes de que se agoten',
          cta_texto: 'Ver todos',
          fin_at: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
        },
      },
      productos: [
        { id: 'oferta-1', content_id: 'oferta-1', nombre: 'Parlante Bluetooth', precio: 110000, precio_antes: 130000, descuento_pct: 15, imagen: 'https://cdn.test/parlante.png' },
        { id: 'normal-1', content_id: 'normal-1', nombre: 'Producto sin descuento', precio: 90000, imagen: 'https://cdn.test/normal.png' },
      ],
    });
    const doc = dom.window.document;
    expect(doc.querySelector('#ofertas').hidden).toBe(false);
    expect(doc.querySelector('#ofertas h2').textContent).toContain('Ofertas que terminan pronto');
    expect(doc.querySelector('#ofertas .limited-offer-see-all').getAttribute('href')).toBe('#ofertas-catalogo');
    expect(doc.querySelector('#ofertas .limited-offer-see-all').textContent).toContain('Ver todos');
    expect(doc.querySelector('[data-gesicomm-countdown-parte="horas"]').textContent).toMatch(/^\d{2}$/);
    expect(Array.from(doc.querySelectorAll('#ofertas .limited-offer-product h3')).map(el => el.textContent)).toEqual(['Parlante Bluetooth']);
    expect(doc.querySelector('#ofertas').textContent).not.toContain('Producto sin descuento');
    expect(doc.querySelector('#ofertas-catalogo').style.display).not.toBe('none');
    expect(doc.querySelector('#ofertas-catalogo').textContent).toContain('Parlante Bluetooth');
    dom.window.close();
  });

  it('muestra las imagenes y textos reales, permite cambiar de banner y repinta al editar la venta', () => {
    const dom = montar([
      { id: 'uno', titulo: 'Campana elegida', subtitulo: 'Texto elegido', cta_texto: 'Ir a cocina', enlace: '#categorias', imagen: 'https://cdn.test/banner.png' },
      { id: 'dos', titulo: 'Segunda campana', imagen: 'https://cdn.test/otro.png' },
      { id: 'inactivo', titulo: 'No mostrar', activo: false },
    ]);
    const doc = dom.window.document;
    expect(doc.querySelectorAll('.hero-banner')).toHaveLength(2);
    expect(doc.querySelectorAll('[data-gesicomm-lista="banners_inicio"]')).toHaveLength(1);
    expect(doc.querySelector('.hero-banner.is-active img').getAttribute('src')).toBe('https://cdn.test/banner.png');
    expect(doc.querySelector('.hero-banner.is-active').classList.contains('is-media-only')).toBe(false);
    expect(doc.querySelector('.hero-banner.is-active .hero-text').hidden).toBe(false);
    expect(doc.querySelector('.hero-banner.is-active h2').textContent).toBe('Campana elegida');
    expect(doc.querySelector('.hero-banner.is-active p:not(.eyebrow)').textContent).toBe('Texto elegido');
    expect(doc.querySelector('.hero-banner.is-active a[data-gesicomm-bind="enlace"]').hidden).toBe(false);
    expect(doc.querySelector('.hero-banner.is-active a[data-gesicomm-bind="enlace"]').getAttribute('href')).toBe('#categorias');
    expect(doc.querySelector('.hero-banner.is-active .hero-media-link')).toBeNull();
    doc.querySelector('[data-gesicomm-banner-siguiente]').click();
    expect(doc.querySelector('.hero-banner.is-active img').getAttribute('src')).toBe('https://cdn.test/otro.png');
    expect(doc.querySelector('.hero-banner.is-active h2').textContent).toBe('Segunda campana');
    expect(doc.querySelector('.hero-banner.is-active a[data-gesicomm-bind="enlace"]').hidden).toBe(true);
    doc.querySelector('.hero-dots button').click();
    expect(doc.querySelector('.hero-banner.is-active img').getAttribute('src')).toBe('https://cdn.test/banner.png');
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', { source: dom.window, data: {
      tipo: 'gesicomm:datos', datos: { vista: 'inicio', tienda: {}, productos: [], venta: { inicio: { banners: [] } } },
    } }));
    expect(doc.querySelector('#inicio').hidden).toBe(true);
    expect(doc.querySelectorAll('.hero-banner')).toHaveLength(0);
    dom.window.close();
  });

  it('un banner de solo imagen conserva el enlace de area completa y no recibe texto ni overlay', () => {
    const dom = montar([{ id: 'foto', imagen: 'https://cdn.test/banner.png', enlace: '#productos' }]);
    const doc = dom.window.document;
    const banner = doc.querySelector('.hero-banner');
    expect(banner.classList.contains('is-media-only')).toBe(true);
    expect(banner.querySelector('.hero-text').hidden).toBe(true);
    expect(banner.querySelector('.hero-media-link').getAttribute('href')).toBe('#productos');
    expect(doc.querySelector('[data-gesicomm-banner-siguiente]').hidden).toBe(true);
    dom.window.close();
  });

  it('muestra banners intermedios debajo de destacados cuando estan configurados', () => {
    const dom = montar([], PLANTILLA_INICIO, {
      venta: {
        inicio: {
          banners: [],
          banners_intermedios: [{
            id: 'medio',
            etiqueta: 'Campaña',
            titulo: 'Renová tu cocina',
            subtitulo: 'Productos seleccionados con precios especiales.',
            cta_texto: 'Ver ofertas',
            enlace: '#ofertas',
            imagen: 'https://cdn.test/cocina.png',
          }],
        },
      },
    });
    const doc = dom.window.document;
    const banner = doc.querySelector('#banner-promocional .mid-banner');
    expect(banner).toBeTruthy();
    expect(banner.compareDocumentPosition(doc.querySelector('#destacados')) & dom.window.Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(banner.querySelector('img').getAttribute('src')).toBe('https://cdn.test/cocina.png');
    expect(banner.textContent).toContain('Renová tu cocina');
    expect(banner.querySelector('a').getAttribute('href')).toBe('#ofertas');
    dom.window.close();
  });

  it('las categorias visuales obedecen la configuracion del inicio', () => {
    const productos = [
      { id: 'p1', content_id: 'p1', nombre: 'Notebook', precio: 100, categoria: 'Tecnología', imagen: 'https://cdn.test/notebook.png' },
      { id: 'p2', content_id: 'p2', nombre: 'Olla', precio: 100, categoria: 'Cocina', imagen: 'https://cdn.test/olla.png' },
      { id: 'p3', content_id: 'p3', nombre: 'Sillón', precio: 100, categoria: 'Hogar', imagen: 'https://cdn.test/sillon.png' },
    ];
    const dom = montar([], PLANTILLA_INICIO, {
      productos,
      venta: { inicio: { menu_categorias: true, categorias: ['Cocina', 'Hogar'] } },
    });
    const doc = dom.window.document;
    expect(Array.from(doc.querySelectorAll('#categorias .category-card strong')).map(el => el.textContent)).toEqual(['Cocina', 'Hogar']);
    expect(doc.querySelector('#categorias').style.display).not.toBe('none');
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
      source: dom.window,
      data: { tipo: 'gesicomm:datos', datos: { vista: 'inicio', tienda: {}, productos, venta: { inicio: { menu_categorias: false, categorias: ['Cocina'] } } } },
    }));
    expect(doc.querySelector('#categorias').style.display).toBe('none');
    dom.window.close();
  });

  it('las bases guardadas dejan de mostrar la franja de beneficios de ejemplo', () => {
    const dom = montar([], { html: '<main data-gesicomm-base="catalogo"><div class="store-benefits">Checkout simple Procesado por PagoPar</div><div class="store-benefits">Mi beneficio personalizado</div></main>', css: '', js: '' });
    expect(dom.window.document.querySelectorAll('.store-benefits')).toHaveLength(1);
    expect(dom.window.document.querySelector('.store-benefits').textContent).toBe('Mi beneficio personalizado');
    dom.window.close();
  });

  it('las bases guardadas dejan de mostrar el fallback de campana anterior', () => {
    const html = '<main data-gesicomm-base="catalogo"><section id="inicio" class="hero"><div class="hero-shell"><div class="hero-fallback"><h1>Ofertas, novedades y favoritos en un solo lugar.</h1></div><div class="hero-banners" data-gesicomm-lista="banners_inicio"><template><article class="hero-banner"><img data-gesicomm-bind="imagen"><div class="hero-text"><h2 data-gesicomm-bind="titulo"></h2></div></article></template></div></div></section></main>';
    const dom = montar([], { html, css: '', js: '' });
    expect(dom.window.document.querySelector('.hero-fallback')).toBeNull();
    expect(dom.window.document.querySelector('#inicio').hidden).toBe(true);
    dom.window.close();
  });
});
