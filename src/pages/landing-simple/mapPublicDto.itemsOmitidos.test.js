import { describe, it, expect } from 'vitest';
import { mapPublicDtoToTemplateData } from './mapLandingToTemplateData';
import { mapPublicDtoToFunnelData } from '../funnel/mapFunnelToTemplateData';

/**
 * Contrato del DTO público: `items` viaja SOLO cuando difiere de
 * `catalogo_items` — o sea en plantillas rígidas, donde son los destacados del
 * home. En flexible/funnel/código el backend lo omite para no serializar el
 * mismo catálogo dos veces (eran 138 KB de los 498 KB de la respuesta).
 * Ver landing.service.js#obtenerPublica.
 */

const item = (content_id, nombre) => ({
  content_id, nombre, tipo: 'producto', precio: 50000, imagenes: [],
});

describe('mapPublicDtoToTemplateData — items omitido', () => {
  it('cae a catalogo_items cuando el backend omite items', () => {
    const { productos } = mapPublicDtoToTemplateData({
      catalogo_items: [item('remera', 'Remera'), item('gorra', 'Gorra')],
    });
    expect(productos.map(p => p.nombre)).toEqual(['Remera', 'Gorra']);
  });

  it('respeta items cuando viene (rígida: son solo los destacados)', () => {
    const { productos } = mapPublicDtoToTemplateData({
      items: [item('remera', 'Remera')],
      catalogo_items: [item('remera', 'Remera'), item('gorra', 'Gorra')],
    });
    expect(productos.map(p => p.nombre)).toEqual(['Remera']);
  });

  it('un items vacío explícito no se confunde con omitido', () => {
    const { productos } = mapPublicDtoToTemplateData({
      items: [],
      catalogo_items: [item('gorra', 'Gorra')],
    });
    expect(productos).toEqual([]);
  });
});

describe('mapPublicDtoToFunnelData — items omitido', () => {
  it('toma el producto de catalogo_items cuando items no viaja', () => {
    const data = mapPublicDtoToFunnelData({
      slug: 'embudo-qa',
      catalogo_items: [item('adelfit', 'AdelFit')],
    });
    expect(data.producto?.nombre ?? data.item?.nombre ?? data.producto).toBeTruthy();
  });

  it('no inventa producto cuando no hay ni items ni catalogo_items', () => {
    const data = mapPublicDtoToFunnelData({ slug: 'embudo-vacio' });
    expect(data.producto?.nombre ?? data.item?.nombre ?? null).toBeNull();
  });
});
