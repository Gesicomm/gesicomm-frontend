import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import ProductLandingPreview from './ProductLandingPreview';
import { construirDocumentoCodigo } from '../landing-simple/construirDocumentoCodigo';
import { PLANTILLA_PRODUCTO } from '../landing-simple/plantillasBaseCodigo';

/**
 * La vista previa de la ficha en el formulario de producto tiene que mandar
 * a WhatsApp el mismo texto que la tienda publicada: la plantilla de
 * "Consulta de producto" de Mi Tienda. Armaba los datos de la tienda sin la
 * plantilla ni el número y el botón caía al texto fijo del runtime.
 */

const PLANTILLA_TIENDA = 'Hola, me interesa {producto} con el precio de {precio} me podrias ayudar para que me envien?';

const capturado = { datos: null };
vi.mock('../landing-simple/CodigoPreview', () => ({
  default: ({ datos }) => { capturado.datos = datos; return null; },
}));
vi.mock('../landing-simple/usePagoparConectado', () => ({ usePagoparConectado: () => null }));
vi.mock('../../services/ofertaService', () => ({ ofertaService: { listarPorProducto: vi.fn().mockResolvedValue([]) }, ofertaAFormaPublica: vi.fn() }));
vi.mock('../../services/tiendaService', () => ({
  tiendaService: {
    obtener: vi.fn().mockResolvedValue({
      nombre: 'Mi Tienda', whatsapp: '595981123456',
      mensaje_contacto: 'Hola, me interesa {producto} con el precio de {precio} me podrias ayudar para que me envien?',
      mensaje_consulta_general: 'Hola, tengo una consulta',
    }),
  },
}));
vi.mock('../../services/landingSimpleService', () => ({
  landingSimpleService: {
    listar: vi.fn().mockResolvedValue([{ id: 7 }]),
    obtener: vi.fn().mockResolvedValue({ id: 7, slug: 'tienda', mostrar_whatsapp: true, content: {} }),
  },
}));

afterEach(cleanup);

function textoQueSaleAWhatsapp(datos) {
  const abiertos = [];
  const dom = new JSDOM(construirDocumentoCodigo(PLANTILLA_PRODUCTO, { datos }), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'about:blank',
    beforeParse(window) {
      window.postMessage = () => {};
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.open = (url) => { abiertos.push(url); return null; };
    },
  });
  const boton = dom.window.document.querySelector('[data-gesicomm-accion-contacto="whatsapp"]');
  boton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return abiertos.map(url => decodeURIComponent(new URL(url).searchParams.get('text') || ''));
}

describe('Vista previa de la ficha — WhatsApp', () => {
  it('usa la plantilla de consulta de producto de Mi Tienda, no el texto fijo', async () => {
    render(
      <ProductLandingPreview
        productoId={12}
        producto={{ nombre: 'Chomba Lacoste Clásica', slug: 'chomba-lacoste' }}
        precioFinal={150000}
        device="desktop"
        onDeviceChange={() => {}}
        imagenes={[]}
        imagenesNuevas={[]}
        variantes={[]}
        opciones={[]}
        faq={[]}
      />,
    );
    await waitFor(() => expect(capturado.datos?.tienda?.nombre).toBe('Mi Tienda'));
    expect(capturado.datos.tienda.mensaje).toBe(PLANTILLA_TIENDA);
    expect(capturado.datos.tienda.mensaje_general).toBe('Hola, tengo una consulta');
    expect(textoQueSaleAWhatsapp(capturado.datos)).toEqual([
      'Hola, me interesa Chomba Lacoste Clásica con el precio de Gs 150.000 me podrias ayudar para que me envien?',
    ]);
  });
});
