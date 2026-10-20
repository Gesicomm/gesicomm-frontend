import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { codigoFichaCombo } from './codigoFichaCombo';
import { codigoFichaProducto } from './fichaCodigoLanding';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { contenidoCombo, combinarDetalleCombo } from './comboContenido';
import { rotulosCombo } from './codigoFichaCombo';

const inicio = { html: '<div class="announcement" data-gesicomm-bloque="anuncios"><span data-gesicomm-venta="anuncio"></span>Envíos Sommix</div><header class="commerce-header"><a data-gesicomm-link="inicio">Sommix</a><button data-gesicomm-carrito>Carrito</button></header><main>Inicio</main><footer><b>PIE REAL SOMMIX</b><a href="/privacidad">Privacidad</a></footer>', css: '.commerce-header{background:#123456}', js: '' };
const item = contenidoCombo({ id: 99, tipo: 'combo', nombre: 'prueba123', precio: 179000, imagenes: ['/uno.png', '/dos.png'],
  producto_padre: { id: 7, nombre: 'Cacerola', precio_base: 150000, imagen: '/cacerola.png' },
  items: [{ cantidad: 2, producto_incluido: { id: 8, nombre: 'Utensilios', precio_base: 30000, imagen: '/utensilios.png' } }],
  propuesta_valor: 'Propuesta real', beneficios: [{ titulo: 'Beneficio real', texto: 'Detalle real' }],
  preguntas_frecuentes: [{ pregunta: '¿Qué recibo?', respuesta: 'El kit completo.' }],
});
function montar(preview, propia = {}, configurar) {
  const content = { codigo: inicio };
  const codigo = codigoFichaCombo({ item: { ...item, ficha_combo: propia, faq: propia.faq?.items ?? item.preguntas_frecuentes }, content, codigoInicio: inicio, preview });
  const mensajes = [];
  const datos = { vista: 'producto', tienda: { nombre: 'Sommix' }, venta: {}, productos: [{ id: 'combo-99', tipo: 'combo', precio: 179000, nombre: item.nombre }],
    producto: { id: 'combo-99', tipo: 'combo', precio: 179000, nombre: item.nombre, imagenes_url: item.imagenes },
    ...(preview ? { editor_bloques: rotulosCombo(item) } : {}),
  };
  const dom = new JSDOM(construirDocumentoCodigo(codigo, { datos }), { runScripts: 'dangerously', beforeParse(w) { w.postMessage = m => mensajes.push(m); configurar?.(w); } });
  return { dom, mensajes, codigo };
}
describe('Documento de combo: preview y página publicada', () => {
  it('publica los títulos de confianza y FAQ aunque no haya tarjetas ni preguntas', () => {
    for (const preview of [true, false]) {
      const { dom } = montar(preview, {
        confianza: { activo: true, eyebrow: 'Compra segura', titulo: 'Confianza sin tarjetas', items: [] },
        faq: { activo: true, eyebrow: 'Tus dudas', titulo: 'Preguntas sin elementos', items: [] },
        beneficio_principal: { activo: true, eyebrow: 'Selección especial', titulo: 'Beneficios sin tarjetas', items: [] },
      });
      try {
        const doc = dom.window.document;
        for (const [clave, titulo, eyebrow] of [['confianza', 'Confianza sin tarjetas', 'Compra segura'], ['faq', 'Preguntas sin elementos', 'Tus dudas'], ['beneficio_principal', 'Beneficios sin tarjetas', 'Selección especial']]) {
          const bloque = doc.querySelector(`[data-combo-bloque="${clave}"]`);
          expect(bloque.querySelector('h2')).toHaveTextContent(titulo);
          expect(bloque.querySelector('.cmb-eyebrow')).toHaveTextContent(eyebrow);
          expect(bloque.querySelector('.cmb-trust-item, .cmb-faq-item, .cmb-vacio')).toBeNull();
        }
      } finally { dom.window.close(); }
    }
  });
  it('renderiza emojis e imágenes de beneficios en el documento de preview y público', () => {
    for (const preview of [true, false]) {
      const { dom } = montar(preview, { beneficio_principal: { items: [
        { titulo: 'Con emoji', icono: '💚' }, { titulo: 'Con imagen', icono: '/uploads/icono.webp' },
        { titulo: 'Ícono oculto', icono: '/uploads/oculto.webp', partes: { iconos: false } },
      ] } });
      try {
        const tarjetas = dom.window.document.querySelectorAll('.cmb-why-item');
        expect(tarjetas[0].querySelector('.cmb-trust-icono')).toHaveTextContent('💚');
        expect(tarjetas[1].querySelector('.cmb-icono-imagen')).toHaveAttribute('src', expect.stringContaining('/uploads/icono.webp'));
        expect(tarjetas[2].querySelector('img')).toBeNull();
      } finally { dom.window.close(); }
    }
  });
  it('la navegación pertenece a la página y los bloques del combo empiezan en Encabezado', () => {
    expect(Object.keys(rotulosCombo(item))[0]).toBe('hero');
    expect(rotulosCombo(item).hero).toBe('1 · Encabezado');
    expect(rotulosCombo(item).navegacion).toBeUndefined();
    for (const preview of [true, false]) {
      const { dom } = montar(preview, { navegacion: { texto: 'Texto anterior', partes: { compra: false } }, _visibilidad: { navegacion: false } });
      try {
        expect(dom.window.document.querySelector('.cmb-breadcrumbs')).toHaveTextContent('Volver al catálogo');
        expect(dom.window.document.querySelector('[data-gesicomm-ficha-bloque="navegacion"]')).toBeNull();
        expect(dom.window.document.querySelector('header[data-gesicomm-ficha-bloque]')).toBeNull();
      } finally { dom.window.close(); }
    }
  });
  it('el texto destacado aparece aunque el nombre esté vacío u oculto', () => {
    for (const preview of [true, false]) for (const partes of [{}, { titulo: false }]) {
      const { dom } = montar(preview, { hero: { titulo: '', titulo_destacado: 'Destacado independiente', partes } });
      try { expect(dom.window.document.querySelector('h1')).toHaveTextContent('Destacado independiente'); }
      finally { dom.window.close(); }
    }
  });
  it('actualiza el combo en el mismo documento conservando imágenes, header, galería y FAQ abierta', () => {
    const { dom, mensajes } = montar(true);
    try {
      const doc = dom.window.document;
      const root = doc.querySelector('.cmb-root');
      const header = doc.querySelector('header');
      const imagen = doc.querySelector('[data-combo-media-panel="1"] img');
      doc.querySelector('[data-combo-imagen="1"]').click();
      doc.querySelector('[data-combo-pregunta]').click();
      const nuevo = codigoFichaCombo({ item: { ...item, ficha_combo: { hero: { titulo: 'Combo sin recarga' } }, faq: item.preguntas_frecuentes }, content: { codigo: inicio }, codigoInicio: inicio, preview: true });
      const cambio = { tipo: 'gesicomm:combo-documento', html: nuevo.html, css: nuevo.css };
      dom.window.dispatchEvent(new dom.window.MessageEvent('message', { source: {}, data: cambio }));
      expect(doc.querySelector('h1')).toHaveTextContent('prueba123');
      dom.window.dispatchEvent(new dom.window.MessageEvent('message', { source: dom.window.parent, data: cambio }));
      expect(dom.window.document).toBe(doc);
      expect(doc.querySelector('.cmb-root')).toBe(root);
      expect(doc.querySelector('header')).toBe(header);
      expect(doc.querySelector('[data-combo-media-panel="1"] img')).toBe(imagen);
      expect(doc.querySelector('h1')).toHaveTextContent('Combo sin recarga');
      expect(doc.querySelector('[data-combo-media-panel="1"]').hidden).toBe(false);
      expect(doc.querySelector('[data-combo-pregunta]').getAttribute('aria-expanded')).toBe('true');
      expect(doc.querySelector('.cmb-faq-answer').hidden).toBe(false);
      doc.querySelector('.cmb-cta').click();
      expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'combo-99' }));
    } finally { dom.window.close(); }
  });
  it.each(['hero', 'incluye', 'valor', 'beneficio_principal', 'prueba_social', 'confianza', 'faq', 'compra_movil'])('oculta y restaura el bloque completo %s en ambos documentos', key => {
    const base = { prueba_social: { activo: true, testimonios: [{ nombre: 'Ana', comentario: 'Opinión cargada' }] },
      confianza: { items: [{ titulo: 'Atención', texto: 'Atención real de la tienda' }] } };
    for (const preview of [true, false]) {
      const visible = montar(preview, base);
      const oculto = montar(preview, ['navegacion', 'compra_movil'].includes(key)
        ? { ...base, _visibilidad: { [key]: false } } : { ...base, [key]: { ...base[key], activo: false } });
      try {
        expect(visible.dom.window.document.querySelector(`[data-combo-bloque="${key}"]`)).not.toBeNull();
        expect(oculto.dom.window.document.querySelector(key === 'hero' ? '.cmb-hero-copy' : `[data-combo-bloque="${key}"]`)).toBeNull();
      } finally { visible.dom.window.close(); oculto.dom.window.close(); }
    }
  });
  it.each([['anuncios', '.announcement'], ['encabezado_tienda', 'body > header'], ['pie', 'body > footer']])('oculta y restaura el global heredado %s', (key, selector) => {
    for (const preview of [true, false]) {
      const visible = montar(preview);
      const oculto = montar(preview, { _visibilidad: { [key]: false } });
      try {
        expect(visible.dom.window.getComputedStyle(visible.dom.window.document.querySelector(selector)).display).not.toBe('none');
        expect(oculto.dom.window.getComputedStyle(oculto.dom.window.document.querySelector(selector)).display).toBe('none');
      } finally { visible.dom.window.close(); oculto.dom.window.close(); }
    }
  });
  it('la publicación conserva todas las filas de beneficios y sus checks luego del guardado', () => {
    const propia = JSON.parse(JSON.stringify({ incluye: { productos: [{ id: 7, beneficios: ['', 'Antiadherente', 'Lavable', 'Borrado'], beneficios_visibles: [true, false, true, true] }] } }));
    propia.incluye.productos[0].beneficios[3] = '';
    for (const preview of [true, false]) {
      const { dom } = montar(preview, propia);
      try {
        const tarjeta = dom.window.document.querySelector('[data-combo-sub-bloque="incluye_producto_7"]');
        expect(tarjeta.textContent).toContain('Lavable');
        expect(tarjeta.textContent).not.toContain('Antiadherente');
        expect(tarjeta.querySelectorAll('.cmb-product-beneficios li')).toHaveLength(1);
      } finally { dom.window.close(); }
    }
  });
  it.each([true, false])('hereda los mismos globales que producto y carga cada bloque, preview=%s', preview => {
    const { dom, codigo } = montar(preview);
    try {
      const doc = dom.window.document;
      const producto = codigoFichaProducto({ codigo: inicio }, 'producto-7', inicio);
      expect(codigo.html).toContain('<b>PIE REAL SOMMIX</b>');
      expect(producto.html).toContain('<footer><b>PIE REAL SOMMIX</b>');
      expect(doc.querySelectorAll('header')).toHaveLength(1);
      expect(doc.querySelectorAll('footer')).toHaveLength(1);
      expect(doc.querySelectorAll('.announcement')).toHaveLength(1);
      expect(doc.querySelector('.announcement').textContent).toContain('Envíos Sommix');
      expect(doc.querySelector('[data-combo-bloque="incluye"]').textContent).toContain('Utensilios');
      expect(doc.querySelector('[data-combo-bloque="incluye"]').textContent).toContain('×2');
      expect(doc.querySelector('[data-combo-bloque="valor"]').textContent).toContain('210.000');
      expect(doc.querySelector('[data-combo-bloque="detalle_productos"]')).toBeNull();
      expect(doc.querySelector('[data-combo-bloque="beneficio_principal"]').textContent).toContain('Beneficio real');
      expect(doc.querySelector('[data-combo-bloque="cta_final"]')).toBeNull();
      doc.querySelector('[data-combo-imagen="1"]').click();
      expect(doc.querySelector('[data-combo-media-panel="0"]').hidden).toBe(true);
      expect(doc.querySelector('[data-combo-media-panel="1"]').hidden).toBe(false);
      doc.querySelector('[data-combo-pregunta]').click();
      expect(doc.querySelector('.cmb-faq-answer').hidden).toBe(false);
      expect(doc.querySelector('.cmb-faq-answer').textContent).toContain('El kit completo.');
    } finally { dom.window.close(); }
  });
  it('compra el combo y conserva navegación y carrito del encabezado heredado', () => {
    const { dom, mensajes } = montar(false);
    try {
      dom.window.document.querySelector('.cmb-cta').click();
      expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:checkout', producto: 'combo-99' }));
      dom.window.document.querySelector('[data-gesicomm-carrito]').click();
      expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:carrito' }));
    } finally { dom.window.close(); }
  });
  it.each([true, false])('cada bloque respeta los checks de título, rótulo y contenido, preview=%s', preview => {
    const propia = {
      hero: { partes: { titulo: false, sobre_titulo: false, descripcion: false, etiqueta: false, compra: false } },
      incluye: { partes: { titulo: false, eyebrow: false, imagen: false, nombre: false, cantidad: false } },
      valor: { partes: { titulo: false, eyebrow: false, desglose: false, precio: false, rotulo_precio: false, ahorro: false, compra: false } },
      detalle_productos: { partes: { titulo: false, eyebrow: false, nombre: false, imagen: false, cantidad: false, beneficios: false } },
      beneficio_principal: { partes: { titulo: false, eyebrow: false, nombre: false, texto: false, iconos: false } },
    };
    const { dom } = montar(preview, propia);
    try {
      const doc = dom.window.document;
      expect(doc.querySelector('h1')).toBeNull();
      expect(doc.querySelector('.cmb-lead')).toBeNull();
      for (const key of ['incluye', 'valor', 'beneficio_principal']) {
        expect(doc.querySelector(`[data-combo-bloque="${key}"] h2`)).toBeNull();
        expect(doc.querySelector(`[data-combo-bloque="${key}"] .cmb-eyebrow`)).toBeNull();
      }
      expect(doc.querySelector('.cmb-product-card h3')).toBeNull();
      expect(doc.querySelector('.cmb-product-card img')).toBeNull();
      expect(doc.querySelector('.cmb-product-card-image span')).toBeNull();
      expect(doc.querySelector('.cmb-price-breakdown')).toBeNull();
      expect(doc.querySelector('.cmb-combo-price strong')).toBeNull();
      expect(doc.querySelector('.cmb-value-button')).toBeNull();
      expect(doc.querySelector('.cmb-receive-cant')).toBeNull();
      expect(doc.querySelector('.cmb-why-item')).toBeNull();
      expect(doc.querySelector('.cmb-product-card')).toBeNull();
    } finally { dom.window.close(); }
  });
  it('hover identifica el bloque y el clic pide abrir el editor correspondiente', () => {
    const { dom, mensajes } = montar(true);
    try {
      const titulo = dom.window.document.querySelector('[data-combo-bloque="incluye"] h2');
      titulo.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true }));
      expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:combo-activo', clave: 'incluye' }));
      titulo.click();
      expect(mensajes).toContainEqual(expect.objectContaining({ tipo: 'gesicomm:bloque', clave: 'incluye' }));
    } finally { dom.window.close(); }
  });
  it('conserva componentes y marketing del detalle sin perder el precio propio del combo', () => {
    const base = { id: 99, tipo: 'combo', precio_efectivo: 179000, productos_combo: [], beneficios: [], ficha_datos: {} };
    const completo = combinarDetalleCombo(base, contenidoCombo({ ...item, precio_total: 200000, beneficios: [{ titulo: 'Real' }], ficha_datos: { incluye: { titulo: 'Contenido propio' } } }));
    expect(completo.productos_combo).toHaveLength(2);
    expect(completo.productos_combo[1]).toMatchObject({ nombre: 'Utensilios', cantidad: 2, precio: 30000 });
    expect(completo.beneficios).toEqual([{ titulo: 'Real' }]);
    expect(completo.ficha_datos.incluye.titulo).toBe('Contenido propio');
    expect(completo.precio_efectivo).toBe(179000);
    const conPrecioPropio = combinarDetalleCombo({ ...base, productos_combo: [{ id: 7, nombre: 'Cacerola', precio: 190000, cantidad: 1 }] }, item);
    expect(conPrecioPropio.productos_combo[0].precio).toBe(190000);
  });
});

it('conserva foto, detalle y emoji en el documento de preview y el público guardado', () => {
  for (const preview of [true, false]) {
    const { dom } = montar(preview, { confianza: { items: [{ icono: '📦', titulo: 'Envíos', texto: 'A todo el país' }] },
      prueba_social: { activo: true, testimonios: [{ nombre: 'Ana', comentario: 'Excelente', foto: 'https://cdn.test/ana.webp', detalle: 'Compra confirmada' }] } });
    try {
      const doc = dom.window.document;
      expect(doc.querySelector('.cmb-trust-icono')).toHaveTextContent('📦');
      expect(doc.querySelector('.cmb-review-foto')).toHaveAttribute('src', 'https://cdn.test/ana.webp');
      expect(doc.querySelector('.cmb-review small')).toHaveTextContent('Compra confirmada');
    } finally { dom.window.close(); }
  }
});

it('muestra y oculta las miniaturas sin ocultar los productos bajo la foto, en preview y pública', () => {
  for (const preview of [true, false]) {
    const { dom } = montar(preview);
    try {
      const doc = dom.window.document;
      expect(doc.querySelectorAll('.cmb-miniatura')).toHaveLength(2);
      doc.querySelector('[data-combo-imagen="1"]').click();
      expect(doc.querySelector('[data-combo-media-panel="1"]').hidden).toBe(false);
      for (const mostrar of [false, true]) {
        const codigo = codigoFichaCombo({ item: { ...item, ficha_combo: { hero: { partes: { miniaturas: mostrar } } } }, content: { codigo: inicio }, codigoInicio: inicio, preview });
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { source: dom.window.parent,
          data: { tipo: 'gesicomm:combo-documento', html: codigo.html, css: codigo.css } }));
        expect(doc.querySelectorAll('.cmb-miniatura')).toHaveLength(mostrar ? 2 : 0);
        expect(doc.querySelector('.cmb-kit-strip')).not.toBeNull();
        expect(doc.querySelector('[data-combo-media-panel="1"]').hidden).toBe(false);
      }
    } finally { dom.window.close(); }
  }
});

it('ocultar y restaurar Encabezado en vivo conserva el documento, la foto y los demás bloques', () => {
  const { dom } = montar(true);
  try {
    const doc = dom.window.document;
    const root = doc.querySelector('.cmb-root');
    const foto = doc.querySelector('[data-combo-media-panel="0"] img');
    for (const activo of [false, true]) {
      const codigo = codigoFichaCombo({ item: { ...item, ficha_combo: { hero: { activo } } }, content: { codigo: inicio }, codigoInicio: inicio, preview: true });
      dom.window.dispatchEvent(new dom.window.MessageEvent('message', { source: dom.window.parent, data: { tipo: 'gesicomm:combo-documento', html: codigo.html, css: codigo.css } }));
      expect(doc.querySelector('.cmb-root')).toBe(root);
      expect(doc.querySelectorAll('.cmb-hero-copy')).toHaveLength(activo ? 1 : 0);
      expect(doc.querySelector('[data-combo-media-panel="0"] img')).toBe(foto);
      expect(doc.querySelector('.cmb-price-main')).not.toBeNull();
      expect(doc.querySelector('[data-combo-bloque="incluye"]')).not.toBeNull();
      expect(doc.querySelector('.cmb-hero-accion button')).not.toBeNull();
    }
  } finally { dom.window.close(); }
});

it.each([true, false])('el contador funciona en la oferta y conserva su avance al editar: preview=%s', preview => {
  let ahora = 100000, tick;
  const hero = { contador: { activo: true, horas: 0, minutos: 1, segundos: 2 } };
  const { dom } = montar(preview, { hero }, w => {
    w.Date.now = () => ahora;
    w.setInterval = fn => { if (String(fn).includes('pintar()')) tick = fn; return 1; };
  });
  try {
    const doc = dom.window.document;
    const contador = doc.querySelector('.cmb-offer-panel .cmb-contador');
    const tiempos = () => [...contador.querySelectorAll('b')].map(n => n.textContent);
    expect(contador).not.toBeNull();
    ahora += 2000; tick(); expect(tiempos()).toEqual(['00', '01', '00']);
    const codigo = codigoFichaCombo({ item: { ...item, ficha_combo: { hero: { ...hero, titulo: 'Título editado', contador: { ...hero.contador, rotulo: 'Promoción especial' } }, _orden_hero: ['compra', 'precio'] } }, content: { codigo: inicio }, codigoInicio: inicio, preview });
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', { source: dom.window.parent, data: { tipo: 'gesicomm:combo-documento', html: codigo.html, css: codigo.css } }));
    expect(doc.querySelector('.cmb-contador')).toBe(contador);
    expect(doc.querySelector('.cmb-contador-rotulo')).toHaveTextContent('Promoción especial');
    expect(doc.querySelector('.cmb-offer-panel').firstElementChild.getAttribute('data-combo-orden')).toBe('compra');
    expect(tiempos()).toEqual(['00', '01', '00']);
    ahora += 70000; tick(); expect(tiempos()).toEqual(['00', '00', '00']);
  } finally { dom.window.close(); }
});
