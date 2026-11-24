import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CiudadPublicaSelect from './CiudadPublicaSelect';
import { getCourierGeografia } from '../../services/courierApi';

vi.mock('../../services/courierApi', () => ({ getCourierGeografia: vi.fn() }));
const geografia = [
  { nombre: 'Central', ciudades: [{ nombre: 'Luque' }, { nombre: 'San Lorenzo' }] },
  { nombre: 'Itapúa', ciudades: [{ nombre: 'Encarnación' }, { nombre: 'San Lorenzo' }] },
];
function Campo({ inicial = 'Luque - Central' }) {
  const [valor, setValor] = useState(inicial);
  return <><CiudadPublicaSelect value={valor} onChange={setValor} /><output data-testid="guardado">{valor}</output></>;
}
beforeEach(() => { vi.clearAllMocks(); getCourierGeografia.mockResolvedValue(geografia); });

it('carga el catálogo, busca sin tildes y permite elegir una ciudad con teclado', async () => {
  render(<Campo />);
  await waitFor(() => expect(getCourierGeografia).toHaveBeenCalledWith({ conCiudades: true }));
  const campo = screen.getByRole('combobox', { name: /Ciudad \/ Departamento/ });
  fireEvent.change(campo, { target: { value: 'encarnacion' } });
  expect(await screen.findByRole('option', { name: 'Encarnación - Itapúa' })).toBeInTheDocument();
  fireEvent.keyDown(campo, { key: 'Home', code: 'Home' });
  fireEvent.keyDown(campo, { key: 'Enter', code: 'Enter' });
  expect(screen.getByTestId('guardado')).toHaveTextContent('Encarnación - Itapúa');
});
it('lista ciudades de departamentos distintos sin confundir nombres repetidos', async () => {
  render(<Campo />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'san lorenzo' } });
  expect(await screen.findByRole('option', { name: 'San Lorenzo - Central' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'San Lorenzo - Itapúa' })).toBeInTheDocument();
});
it('conserva ubicaciones anteriores y permite borrar la selección', async () => {
  render(<Campo inicial="Mi localidad anterior" />);
  await waitFor(() => expect(getCourierGeografia).toHaveBeenCalled());
  expect(screen.getAllByText('Mi localidad anterior')).toHaveLength(2);
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Backspace', code: 'Backspace' });
  expect(screen.getByTestId('guardado')).toBeEmptyDOMElement();
});
it('permite agregar manualmente cuando falla el catálogo y reintentar la carga', async () => {
  getCourierGeografia.mockRejectedValueOnce(new Error('Sin conexión'));
  render(<Campo inicial="" />);
  await screen.findByText(/No pudimos cargar las ciudades/);
  const campo = screen.getByRole('combobox');
  fireEvent.change(campo, { target: { value: 'Mi ciudad' } });
  fireEvent.click(await screen.findByRole('option', { name: 'Agregar "Mi ciudad"' }));
  expect(screen.getByTestId('guardado')).toHaveTextContent('Mi ciudad');
  fireEvent.click(screen.getByRole('button', { name: 'Volver a cargar ciudades' }));
  await waitFor(() => expect(screen.queryByText(/No pudimos cargar las ciudades/)).not.toBeInTheDocument());
});
