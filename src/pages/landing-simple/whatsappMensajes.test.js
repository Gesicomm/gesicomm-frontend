import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { datosRuntimePublico } from './datosRuntime';
import { PLANTILLA_INICIO, PLANTILLA_PRODUCTO, PLANTILLA_PRODUCTO_SUPLEMENTOS } from './plantillasBaseCodigo';

/**
 * Mi Tienda tiene dos plantillas de WhatsApp: consulta de PRODUCTO
 * (mensaje_contacto) y consulta GENERAL (mensaje_consulta_general). Se
 * prueba el texto exacto que llega a wa.me desde el documento real del
 * lienzo: botón "Consultar" de la ficha e ícono flotante.
 */

const PLANTILLA_PRODUCTO_TIENDA = 'Hola buenas les escribo por el {producto} de {precio}';
const PLANTILLA_GENERAL_TIENDA = 'Hola! Quiero hacer una consulta sobre la tienda {url}';

const remera = {
  id: 'remera', referencia_id: 11, tipo: 'producto', nombre: 'Chomba Lacoste Clásica', precio: 150000, imagen: null,
  imagenes_url: [], categoria: 'Ropa', stock: 3, agotado: false, variantes: [], ofertas: [], url: '/remera',
  botones_contacto: [{ label: 'Consultar por WhatsApp', tipo: 'whatsapp', valor: '' }],
};
const conVariantes = {
  ...remera, id: 'remera-talles', nombre: 'Remera con talles', precio: 50000,
  variantes: [{ id: 1, nombre: 'S', stock: 2, precio_efectivo: 50000 }, { id: 2, nombre: 'M', stock: 3, precio_efectivo: 55000 }],
};

function tienda(extra = {}) {
  return { nombre: 'Mi Tienda', whatsapp: '0981 123456', mensaje: PLANTILLA_PRODUCTO_TIENDA, mensaje_general: PLANTILLA_GENERAL_TIENDA, ...extra };
}

function montar(plantilla, datos) {
  const abiertos = [];
  const dom = new JSDOM(construirDocumentoCodigo(plantilla, { datos }), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://mitienda.gesicomm.com/remera',
    beforeParse(window) {
      window.postMessage = () => {};
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.open = (url) => { abiertos.push(url); return null; };
    },
  });
  const { document } = dom.window;
  const click = el => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return { document, abiertos, click };
}

const salida = [];
// WA_OUT=archivo vuelca los textos reales que salen a WhatsApp (la consola
// de vitest está silenciada en este proyecto).
const anotar = (...partes) => { salida.push(partes.join(' ')); if (process.env.WA_OUT) fs.writeFileSync(process.env.WA_OUT, salida.join('\n')); };

const textoDe = url => decodeURIComponent(new URL(url).searchParams.get('text') || '');

describe('WhatsApp del lienzo — consulta de producto', () => {
  it('ficha genérica: el botón "Consultar por WhatsApp" manda la plantilla de producto con nombre y precio', () => {
    const { document, abiertos, click } = montar(PLANTILLA_PRODUCTO, { vista: 'producto', tienda: tienda(), productos: [remera], producto: remera, recomendados: [] });
    const boton = document.querySelector('[data-gesicomm-accion-contacto="whatsapp"]');
    expect(boton).toBeTruthy();
    click(boton);
    expect(abiertos).toHaveLength(1);
    expect(abiertos[0]).toMatch(/^https:\/\/wa\.me\/0981123456\?text=/);
    anotar('[ficha genérica] →', textoDe(abiertos[0]));
    expect(textoDe(abiertos[0])).toBe('Hola buenas les escribo por el Chomba Lacoste Clásica de Gs 150.000');
  });

  it('ficha con botones configurables: el botón de contacto manda la plantilla de producto', () => {
    const { document, abiertos, click } = montar(PLANTILLA_PRODUCTO_SUPLEMENTOS, { vista: 'producto', tienda: tienda(), productos: [remera], producto: remera, recomendados: [] });
    const boton = document.querySelector('[data-gesicomm-accion-contacto="whatsapp"]');
    expect(boton).toBeTruthy();
    click(boton);
    anotar('[ficha suplementos] →', textoDe(abiertos[0]));
    expect(textoDe(abiertos[0])).toBe('Hola buenas les escribo por el Chomba Lacoste Clásica de Gs 150.000');
  });

  it('con variante elegida manda el precio de la variante', () => {
    const { document, abiertos, click } = montar(PLANTILLA_PRODUCTO, { vista: 'producto', tienda: tienda(), productos: [conVariantes], producto: conVariantes, recomendados: [] });
    click(document.querySelector('[data-gesicomm-variante-id="2"]'));
    click(document.querySelector('[data-gesicomm-accion-contacto="whatsapp"]'));
    anotar('[producto con variante M] →', textoDe(abiertos[0]));
    expect(textoDe(abiertos[0])).toBe('Hola buenas les escribo por el Remera con talles de Gs 55.000');
  });
});

describe('WhatsApp del lienzo — ícono flotante', () => {
  it('en el inicio usa la plantilla general, no la de producto', () => {
    const { document } = montar(PLANTILLA_INICIO, { vista: 'inicio', tienda: tienda(), productos: [remera], producto: null, recomendados: [] });
    const flotante = document.querySelector('[data-gesicomm-contacto-flotante]');
    expect(flotante).toBeTruthy();
    anotar('[flotante inicio] →', textoDe(flotante.href));
    expect(textoDe(flotante.href)).toBe('Hola! Quiero hacer una consulta sobre la tienda https://mitienda.gesicomm.com/remera');
  });

  it('en el inicio sin plantilla general cargada manda un saludo neutro (nunca "este producto")', () => {
    const { document } = montar(PLANTILLA_INICIO, { vista: 'inicio', tienda: tienda({ mensaje_general: '' }), productos: [remera], producto: null, recomendados: [] });
    const texto = textoDe(document.querySelector('[data-gesicomm-contacto-flotante]').href);
    anotar('[flotante inicio sin general] →', texto);
    expect(texto).toBe('Hola, quiero hacer una consulta.');
  });

  it('el botón "Escribinos por WhatsApp" del inicio también usa la plantilla general', () => {
    const { document, abiertos, click } = montar(PLANTILLA_INICIO, { vista: 'inicio', tienda: tienda(), productos: [remera], producto: null, recomendados: [] });
    click(document.querySelector('#contacto [data-gesicomm-whatsapp]'));
    anotar('[contacto inicio] →', textoDe(abiertos[0]));
    expect(textoDe(abiertos[0])).toBe('Hola! Quiero hacer una consulta sobre la tienda https://mitienda.gesicomm.com/remera');
  });

  it('dentro de la ficha de un producto usa la plantilla de producto', () => {
    const { document } = montar(PLANTILLA_PRODUCTO, { vista: 'producto', tienda: tienda(), productos: [remera], producto: remera, recomendados: [] });
    const texto = textoDe(document.querySelector('[data-gesicomm-contacto-flotante]').href);
    anotar('[flotante ficha] →', texto);
    expect(texto).toBe('Hola buenas les escribo por el Chomba Lacoste Clásica de Gs 150.000');
  });
});

describe('WhatsApp del lienzo — datos que llegan del backend', () => {
  it('datosRuntimePublico pasa las dos plantillas del DTO público', () => {
    const datos = datosRuntimePublico({
      tienda: { nombre: 'Mi Tienda' },
      contacto: { whatsapp: '0981123456', mensaje: PLANTILLA_PRODUCTO_TIENDA, mensaje_general: PLANTILLA_GENERAL_TIENDA },
      catalogo_items: [],
    }, 'tienda', null);
    expect(datos.tienda.mensaje).toBe(PLANTILLA_PRODUCTO_TIENDA);
    expect(datos.tienda.mensaje_general).toBe(PLANTILLA_GENERAL_TIENDA);
  });
});
