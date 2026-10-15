import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LandingSimpleEntry from './LandingSimpleEntry';
import { landingSimpleService } from '../../services/landingSimpleService';

vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listar: vi.fn() } }));
vi.mock('./ModoSelector', () => ({ default: () => <p>Crear una página nueva</p> }));

function montar() {
  return render(<MemoryRouter initialEntries={['/landing']}><Routes>
    <Route path="/landing" element={<LandingSimpleEntry />} />
    <Route path="/landing/:id" element={<p>Editor existente</p>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('Entrada a las páginas de venta', () => {
  it('abre la página existente aunque tenga 3500 productos', async () => {
    landingSimpleService.listar.mockResolvedValue([{ id: 140, items: Array.from({ length: 3500 }, (_, i) => ({ id: i + 1 })) }]);
    montar();
    expect(await screen.findByText('Editor existente')).toBeInTheDocument();
    expect(screen.queryByText('Crear una página nueva')).not.toBeInTheDocument();
  });

  it.each([
    new Error('Network Error'),
    { response: { status: 500, data: { message: 'Error al listar landings.' } } },
    { response: { status: 409, data: { message: 'Seleccioná una tienda.' } } },
  ])('un error no se interpreta como una página eliminada: %j', async error => {
    landingSimpleService.listar.mockRejectedValue(error);
    montar();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Crear una página nueva')).not.toBeInTheDocument();
  });

  it('reintenta la consulta y abre la misma página cuando vuelve el servidor', async () => {
    landingSimpleService.listar.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce([{ id: 140 }]);
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Editor existente')).toBeInTheDocument();
    expect(landingSimpleService.listar).toHaveBeenCalledTimes(2);
  });

  it('solo ofrece crear si el servidor confirma una lista vacía', async () => {
    landingSimpleService.listar.mockResolvedValue([]);
    montar();
    expect(await screen.findByText('Crear una página nueva')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('una respuesta inválida tampoco ofrece reemplazar la página', async () => {
    landingSimpleService.listar.mockResolvedValue({ message: 'Servicio no disponible' });
    montar();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText('Crear una página nueva')).not.toBeInTheDocument();
  });
});
