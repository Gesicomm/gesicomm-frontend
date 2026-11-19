import { describe, expect, it } from 'vitest';
import { comboComoItemLanding } from './ArmarComboPanel';
import { itemComboEnCurso } from './ComboCodigoPreview';
import { contexto } from './promptsCodigo';
import { ofertaCheckoutPublicable } from '../landing/ofertasCheckout';

const combo = {
  id: 17, nombre: 'Setup Gamer', precio_total: '300000', estado: 'ACTIVO', imagenes: [],
  producto_padre: { id: 1, nombre: 'Teclado', precio_base: '250000' },
  items: [{ producto_incluido: { id: 2, nombre: 'Alfombrilla', precio_base: '45000' } }],
};

describe('combo recién armado', () => {
  it('trae productos_incluidos como lista, igual que el DTO del backend', () => {
    expect(comboComoItemLanding(combo).productos_incluidos).toEqual(['Teclado', 'Alfombrilla']);
    expect(itemComboEnCurso({ combo: {}, principal: { id: 1, nombre: 'A' }, upsells: [{ id: 2, nombre: 'B' }], precioTotal: 10 }).productos_incluidos)
      .toEqual(['A', 'B']);
  });

  it('el prompt de la IA no se rompe con el combo nuevo ni con un texto viejo', () => {
    const tienda = { nombre: 'Gesiii' };
    const conLista = contexto({ tienda, venta: {}, productos: [comboComoItemLanding(combo)] });
    expect(conLista).toContain('Incluye: Teclado, Alfombrilla');
    const conTexto = contexto({ tienda, venta: {}, productos: [{ ...comboComoItemLanding(combo), productos_incluidos: 'Teclado, Alfombrilla' }] });
    expect(conTexto).toContain('Incluye: Teclado, Alfombrilla');
  });
});

describe('order bump y upsell sin imagen', () => {
  const bump = {
    id: 83, estrategia: 'order_bump', precio_normal: 45000, precio_order_bump: 25000, precio_efectivo: 25000, imagen: null,
    producto_complementario: { nombre: 'Alfombrilla XL', imagen: null, precio: 45000, precio_efectivo: 45000 },
  };

  it('se publican igual: la imagen es opcional, como en la vista previa', () => {
    expect(ofertaCheckoutPublicable(bump)).toBe(true);
    expect(ofertaCheckoutPublicable({ ...bump, id: 84, estrategia: 'upsell' })).toBe(true);
  });

  it('siguen fuera si falta el producto o el precio', () => {
    expect(ofertaCheckoutPublicable({ ...bump, producto_complementario: null })).toBe(false);
    expect(ofertaCheckoutPublicable({ ...bump, precio_order_bump: 0, precio_efectivo: 0, precio_normal: 0 })).toBe(false);
  });
});
