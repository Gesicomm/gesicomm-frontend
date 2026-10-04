import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TemplateSelector from './TemplateSelector';
import { landingSimpleService } from '../../services/landingSimpleService';
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: {
  listarTemplates: vi.fn().mockResolvedValue([{ id: 4, slug: 'bazar-hogar', name: 'Bazar QA' }]),
  crear: vi.fn().mockResolvedValue({ id: 99 }),
} }));
vi.mock('./templates', () => ({ getComponenteTemplate: () => null }));
vi.mock('./templates/demoTemplates', () => ({ demoDeTemplate: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); });
describe('Selección de colores al usar template', () => {
  it('envía los productos y combos elegidos al crear el template rígido', async () => {
    const items = [{ tipo: 'producto', referencia_id: 1 }, { tipo: 'combo', referencia_id: 1 }];
    sessionStorage.setItem('gesicomm:prefilledLandingItems', JSON.stringify(items));
    render(<MemoryRouter><TemplateSelector /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Usar template', exact: true }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Usar template', exact: true }));
    await waitFor(() => expect(landingSimpleService.crear).toHaveBeenCalledWith(4, expect.any(Object), items));
  });
  it('permite conservar la paleta visible de preview por defecto', async () => {
    const onCreada = vi.fn();
    render(<MemoryRouter><TemplateSelector onCreada={onCreada} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Usar template', exact: true }));
    expect(screen.getByRole('radio', { name: 'Usar colores de preview' })).toBeChecked();
    expect(landingSimpleService.crear).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Usar template', exact: true }));
    await waitFor(() => expect(landingSimpleService.crear).toHaveBeenCalledWith(4, { fondo: '#FBFAF7', texto: '#292722', acento: '#A95843' }, []));
    expect(onCreada).toHaveBeenCalledWith({ id: 99 });
  });
  it('permite elegir explícitamente los colores de la tienda', async () => {
    render(<MemoryRouter><TemplateSelector /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver preview', exact: true }));
    fireEvent.click(screen.getByRole('radio', { name: 'Usar colores de mi tienda' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Usar template', exact: true }));
    await waitFor(() => expect(landingSimpleService.crear).toHaveBeenCalledWith(4, null, []));
  });
});
