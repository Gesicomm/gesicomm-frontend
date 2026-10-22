import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingCodigoEditor from './LandingCodigoEditor';
import { landingSimpleService } from '../../services/landingSimpleService';

vi.mock('./precargaEditor', () => ({ tomarPrecargaEditor: () => ({ tienda: Promise.resolve({ id: 3 }), catalogo: Promise.resolve({ productos: [], combos: [] }) }) }));
vi.mock('../../services/ofertaService', () => ({ ofertaService: { listarTodas: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { cambiarEstado: vi.fn() } }));
vi.mock('./CodigoPreview', () => ({ default: () => null }));
vi.mock('./ConfigurarVentaCodigo', () => ({
  aplicarReglaVenta: () => null,
  default: ({ onPublicar, landingActiva }) => <button onClick={onPublicar}>{landingActiva ? 'Despublicar' : 'Publicar'}</button>,
}));

const inicial = (aceptado = false) => ({
  id: 5, activo: false, contenido_ia_aceptado: aceptado, items: [],
  content: { venta: { configurado: true, tipo: 'catalogo' }, codigo: { html: '<div data-gesicomm-countdown></div>', css: '', js: '' } },
});
const montar = landing => render(<MemoryRouter><LandingCodigoEditor landingInicial={landing} /></MemoryRouter>);
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('exige marcar el check y no repite el aviso al republicar o reabrir', async () => {
  landingSimpleService.cambiarEstado.mockImplementation(async (_id, activo) => ({ activo, contenido_ia_aceptado: true }));
  const vista = montar(inicial());
  fireEvent.click(await screen.findByRole('button', { name: 'Publicar', exact: true }));
  const aceptar = screen.getByRole('button', { name: 'Aceptar y publicar' });
  expect(aceptar).toBeDisabled();
  fireEvent.click(aceptar);
  expect(landingSimpleService.cambiarEstado).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(aceptar);
  await screen.findByRole('button', { name: 'Despublicar', exact: true });
  expect(landingSimpleService.cambiarEstado).toHaveBeenCalledWith(5, true, { aceptarContenidoIA: true });
  fireEvent.click(screen.getByRole('button', { name: 'Despublicar', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'Publicar', exact: true }));
  await screen.findByRole('button', { name: 'Despublicar', exact: true });
  expect(screen.queryByRole('dialog')).toBeNull();
  vista.unmount();
  montar(inicial(true));
  fireEvent.click(await screen.findByRole('button', { name: 'Publicar', exact: true }));
  await screen.findByRole('button', { name: 'Despublicar', exact: true });
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('conserva el aviso y permite reintentar si la publicación falla', async () => {
  landingSimpleService.cambiarEstado.mockRejectedValueOnce(new Error('Sin conexión'));
  montar(inicial());
  fireEvent.click(await screen.findByRole('button', { name: 'Publicar', exact: true }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Aceptar y publicar' }));
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('No se pudo cambiar el estado.'));
  expect(screen.getByRole('button', { name: 'Aceptar y publicar' })).toBeEnabled();
});
