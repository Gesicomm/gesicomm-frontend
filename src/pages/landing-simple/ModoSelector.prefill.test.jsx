import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ModoSelector from './ModoSelector';
import { landingSimpleService } from '../../services/landingSimpleService';

vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { crearLienzoBlanco: vi.fn() } }));
vi.mock('./TemplateSelector', () => ({ default: () => null }));
vi.mock('./AILandingWizard', () => ({ default: () => null }));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.clearAllMocks(); });

it('envía la selección del catálogo al crear el lienzo y abre la landing creada', async () => {
  const items = [{ tipo: 'producto', referencia_id: 4 }, { tipo: 'combo', referencia_id: 7 }];
  sessionStorage.setItem('gesicomm:prefilledLandingItems', JSON.stringify(items));
  const landing = { id: 8, items };
  landingSimpleService.crearLienzoBlanco.mockResolvedValue(landing);
  const onCreada = vi.fn();
  render(<MemoryRouter><ModoSelector onCreada={onCreada} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Empezar con lienzo' }));
  await waitFor(() => expect(onCreada).toHaveBeenCalledWith(landing));
  expect(landingSimpleService.crearLienzoBlanco).toHaveBeenCalledWith(items);
});

it('permite reintentar sin perder los productos si falla la creación', async () => {
  const items = [{ tipo: 'producto', referencia_id: 4 }];
  sessionStorage.setItem('gesicomm:prefilledLandingItems', JSON.stringify(items));
  landingSimpleService.crearLienzoBlanco.mockRejectedValue(new Error('Sin conexión'));
  render(<MemoryRouter><ModoSelector /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Empezar con lienzo' }));
  await screen.findByText('No se pudo crear la landing en blanco.');
  expect(JSON.parse(sessionStorage.getItem('gesicomm:prefilledLandingItems'))).toEqual(items);
});
