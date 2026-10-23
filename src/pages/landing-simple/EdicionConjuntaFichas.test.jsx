import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import EdicionConjuntaFichas from './EdicionConjuntaFichas';
import { aplicarCambiosFichas, cambiosContadorFichas } from './fichasEnLote';
import { presentacionComercial } from './datosRuntime';

afterEach(cleanup);
it('aplica 2h 30m 50s a seis productos sin tocar al séptimo ni sus textos', () => {
  const cambiar = vi.fn();
  render(<EdicionConjuntaFichas cantidad={6} fichas={Array.from({ length: 6 }, (_, i) => ({ id: i + 1 }))}
    referencia={{}} onCambiar={cambiar} paymentLogosCatalogo={[]} />);
  fireEvent.change(screen.getByLabelText('Horas'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '30' } });
  fireEvent.change(screen.getByLabelText('Segundos'), { target: { value: '50' } });
  expect(cambiar).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar contador a 6 productos' }));
  expect(cambiar).toHaveBeenCalledWith('urgencia_duracion', { horas: '2', minutos: '30', segundos: '50' });
  const cambios = cambiosContadorFichas(cambiar.mock.calls[0][1]);
  const originales = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`producto:${i + 1}`, { v: 2, titulo_comercial: `Nombre ${i + 1}`, urgencia_horas: 1, ficha_bloques: { opiniones: false, oferta: false } }]));
  const resultado = aplicarCambiosFichas({ compartida: {}, presentaciones: originales, cambios, todos: false, claves: Array.from({ length: 6 }, (_, i) => `producto:${i + 1}`) });
  const venta = { presentacion_productos: JSON.parse(JSON.stringify(resultado.presentaciones)) };
  for (let id = 1; id <= 6; id++) {
    const publico = presentacionComercial({ tipo: 'producto', id }, venta);
    expect(Number(publico.urgencia_horas)).toBe(2);
    expect(Number(publico.urgencia_minutos)).toBe(30);
    expect(Number(publico.urgencia_segundos)).toBe(50);
    expect(resultado.presentaciones[`producto:${id}`]).toMatchObject({ titulo_comercial: `Nombre ${id}`, ficha_bloques: { opiniones: false, oferta: true, oferta_duracion: true } });
  }
  expect(resultado.presentaciones['producto:7']).toBe(originales['producto:7']);
  expect(screen.getByRole('status')).toHaveTextContent('aplicado a 6 productos');
});

it('rechaza duración cero, fracciones y minutos fuera de rango', () => {
  const cambiar = vi.fn();
  render(<EdicionConjuntaFichas cantidad={6} fichas={[{}, {}]} referencia={{}} onCambiar={cambiar} paymentLogosCatalogo={[]} />);
  for (const campo of ['Horas', 'Minutos', 'Segundos']) fireEvent.change(screen.getByLabelText(campo), { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar contador a 6 productos' }));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(cambiar).not.toHaveBeenCalled();
  expect(cambiosContadorFichas({ horas: 2, minutos: 60, segundos: 0 })).toBeNull();
  expect(cambiosContadorFichas({ horas: 2.5, minutos: 0, segundos: 0 })).toBeNull();
  expect(cambiosContadorFichas({ horas: 0, minutos: 0, segundos: 50 })).toMatchObject({ urgencia_horas: 0, urgencia_minutos: 0, urgencia_segundos: 50 });
});
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
