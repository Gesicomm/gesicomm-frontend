import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import EdicionConjuntaFichas from './EdicionConjuntaFichas';
import { aplicarCambiosFichas } from './fichasEnLote';
import { presentacionComercial } from './datosRuntime';

afterEach(cleanup);
it('aplica un check mixto explícitamente sin copiar otros bloques', () => {
  const cambiar = vi.fn();
  render(<EdicionConjuntaFichas cantidad={2} fichas={[{ ficha_bloques: { incluye: false } }, { ficha_bloques: { incluye: true } }]}
    referencia={{ ficha_bloques: { incluye: false } }} onCambiar={cambiar} paymentLogosCatalogo={[]} />);
  expect(screen.getByLabelText('Mostrar Qué incluye tu pedido').indeterminate).toBe(true);
  fireEvent.click(screen.getByLabelText('Mostrar Qué incluye tu pedido'));
  expect(cambiar).toHaveBeenCalledWith('ficha_bloques', { incluye: true });
  expect(screen.queryByRole('textbox', { name: 'Nombre comercial', exact: true })).toBeNull();
});

it('los logos se guardan para dos productos, sobreviven a la resolución y dejan al tercero intacto', () => {
  const visa = { clave: 'visa', nombre: 'Visa', logo_url: '/visa.webp' };
  const master = { clave: 'mastercard', nombre: 'Mastercard', logo_url: '/master.webp' };
  const cambiar = vi.fn();
  render(<EdicionConjuntaFichas cantidad={2} fichas={[{}, {}]} referencia={{ payment_logos: [visa, master] }}
    onCambiar={cambiar} paymentLogosCatalogo={[visa, master]} />);
  fireEvent.click(screen.getByLabelText('Mostrar logo Visa'));
  expect(cambiar).toHaveBeenCalledWith('payment_logos', [master]);
  const r = aplicarCambiosFichas({ compartida: {}, presentaciones: {}, todos: false, claves: ['producto:1', 'producto:2'], cambios: { payment_logos: [master] } });
  const venta = { payment_logos: [visa, master], ficha_compartida: r.compartida, presentacion_productos: JSON.parse(JSON.stringify(r.presentaciones)) };
  for (const id of [1, 2]) expect(presentacionComercial({ tipo: 'producto', id }, venta).payment_logos.map(l => l.clave)).toEqual(['mastercard']);
  expect(presentacionComercial({ tipo: 'producto', id: 3 }, venta).payment_logos.map(l => l.clave)).toEqual(['visa', 'mastercard']);
  expect(presentacionComercial({ tipo: 'producto', id: 1 }, { ...venta, presentacion_productos: { 'producto:1': { v: 2, payment_logos: [] } } }).payment_logos).toEqual([]);
});
