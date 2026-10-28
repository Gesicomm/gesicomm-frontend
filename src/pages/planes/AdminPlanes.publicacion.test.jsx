import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminPlanes from './AdminPlanes';
import PublicPlans from '../public/PublicPlans';
import { planesService } from '../../services/planesService';
vi.mock('../../services/planesService', () => ({ planesService: {
  planesAdmin: vi.fn(), guardarPlanesAdmin: vi.fn(), listar: vi.fn(), afiliadosConfig: vi.fn(async () => ({})),
} }));
it('publica en la landing los cambios guardados en admin, incluida la periodicidad y visibilidad', async () => {
  let catalogo = [{ id: 'editor-prueba', codigo: 'editor-prueba', nombre: 'Plan inicial', resumen: 'Resumen', precio: 120000, moneda: 'PYG', periodicidad: 'mensual', features: ['Beneficio'], activo: true, equivale: 'pago' }];
  planesService.planesAdmin.mockImplementation(async () => catalogo);
  planesService.guardarPlanesAdmin.mockImplementation(async data => { catalogo = data; return data; });
  planesService.listar.mockImplementation(async () => catalogo.filter(p => p.activo !== false));
  render(<MemoryRouter><Link to="/landing">Ver landing</Link><Link to="/">Editar planes</Link><Routes>
    <Route path="/" element={<AdminPlanes />} /><Route path="/landing" element={<PublicPlans />} />
  </Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByLabelText('Nombre del plan')).toHaveValue('Plan inicial'));
  fireEvent.change(screen.getByLabelText('Nombre del plan'), { target: { value: 'Plan actualizado' } });
  fireEvent.change(screen.getByLabelText('Acceso incluido'), { target: { value: 'personal' } });
  fireEvent.change(screen.getByLabelText('Precio del plan'), { target: { value: '777000' } });
  fireEvent.change(screen.getByLabelText('Duración del plan'), { target: { value: 'anual' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar planes' }));
  await screen.findByText('Guardado');
  expect(planesService.guardarPlanesAdmin).toHaveBeenCalledWith([expect.objectContaining({ nombre: 'Plan actualizado', precio: 777000, periodicidad: 'anual', acceso_rutas: 'personal' })]);
  fireEvent.click(screen.getByRole('link', { name: 'Ver landing' }));
  await screen.findByRole('heading', { name: 'Plan actualizado' });
  expect(screen.getByText(/777.000/)).toBeInTheDocument();
  expect(screen.getByText('por año · pago adelantado')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Editar planes' }));
  await screen.findByLabelText('Visible en landing y /planes');
  fireEvent.click(screen.getByLabelText('Visible en landing y /planes'));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar planes' }));
  await screen.findByText('Guardado');
  fireEvent.click(screen.getByRole('link', { name: 'Ver landing' }));
  expect(await screen.findByText('Por ahora no hay planes disponibles para contratar.')).toBeInTheDocument();
});
