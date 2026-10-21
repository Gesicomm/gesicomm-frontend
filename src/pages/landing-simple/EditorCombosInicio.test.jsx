import React, { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import EditorCombosInicio from './EditorCombosInicio';
import { normalizarCombosInicio } from './combosInicio';

afterEach(cleanup);
const combos = [
  { id: 1, tipo: 'combo', nombre: 'Cocina completa', precio_efectivo: 150000, producto_padre: { id: 10, nombre: 'Cacerola' }, items: [{ cantidad: 2, producto_incluido: { id: 11, nombre: 'Utensilios' } }] },
  { id: 2, tipo: 'combo', nombre: 'Pack café', precio_efectivo: 120000, productos_combo: [{ id: 12, nombre: 'Cafetera', cantidad: 1 }] },
];
function Demo({ inicial }) {
  const [config, setConfig] = useState(() => normalizarCombosInicio(inicial));
  return <><EditorCombosInicio config={config} combos={combos} onCambiar={patch => setConfig(prev => normalizarCombosInicio({ ...prev, ...patch }))} /><output data-testid="config">{JSON.stringify(config)}</output></>;
}
const config = () => JSON.parse(screen.getByTestId('config').textContent);

it('edita textos, permite vaciarlos y mantiene coordinadas columnas, filas y total', () => {
  render(<Demo />);
  fireEvent.change(screen.getByLabelText('Título de combos'), { target: { value: 'Nuestros packs' } });
  fireEvent.change(screen.getByLabelText('Rótulo de combos'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Tarjetas por fila'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Filas de combos'), { target: { value: '2' } });
  expect(config()).toMatchObject({ titulo: 'Nuestros packs', kicker: '', columnas: 2, filas: 2, limite: 4 });
  fireEvent.change(screen.getByLabelText('Máximo de combos'), { target: { value: '3' } });
  expect(config()).toMatchObject({ columnas: 2, filas: 2, limite: 3 });
});

it('lista el contenido real, busca por un producto incluido y guarda solo los combos elegidos', () => {
  render(<Demo />);
  expect(screen.getByText('Cacerola · 2 × Utensilios')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar selección' }));
  expect(config()).toMatchObject({ modo: 'manual', items: [] });
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar combos' }), { target: { value: 'cacerola' } });
  expect(screen.queryByLabelText('Mostrar combo Pack café')).toBeNull();
  fireEvent.click(screen.getByLabelText('Mostrar combo Cocina completa'));
  expect(config().items).toEqual(['combo-1']);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar combos' }), { target: { value: '' } });
  fireEvent.click(screen.getByLabelText('Mostrar combo Pack café'));
  fireEvent.click(screen.getByRole('button', { name: 'Subir Pack café' }));
  expect(config().items).toEqual(['combo-2', 'combo-1']);
});

it('usa la portada incluso con la configuración anterior y controla la información visible', () => {
  render(<Demo inicial={{ imagen_modo: 'componentes' }} />);
  expect(screen.getByText(/Las tarjetas usan la imagen que cargaste/)).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Mostrar qué incluye'));
  fireEvent.click(screen.getByLabelText('Mostrar ahorro real'));
  expect(config()).toMatchObject({ imagen_modo: 'portada', mostrar_incluidos: false, mostrar_ahorro: false });
});

it('aprovecha los nombres incluidos del catálogo mientras llega la ficha completa', () => {
  render(<EditorCombosInicio config={normalizarCombosInicio()} combos={[{ id: 1, tipo: 'combo', nombre: 'Pack cocina', productos_incluidos: ['Cacerola', 'Tapa'] }]} onCambiar={() => {}} />);
  expect(screen.getByText('Cacerola · Tapa')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar combos' }), { target: { value: 'tapa' } });
  expect(screen.getByLabelText('Mostrar combo Pack cocina')).toBeTruthy();
});
