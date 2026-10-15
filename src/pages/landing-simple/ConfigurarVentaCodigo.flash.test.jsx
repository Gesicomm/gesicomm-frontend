import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: ({ datos }) => <output data-testid="preview">{JSON.stringify(datos)}</output> }));
vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { catalogoPaginado: vi.fn().mockResolvedValue({ items: [], total: 0, totalPages: 1, categorias: [] }) } }));
const productos = Array.from({ length: 8 }, (_, i) => ({ tipo: 'producto', id: i + 1, slug: 'flash-' + i, nombre: 'Oferta ' + i, categoria: 'Cocina', precio_efectivo: 80000, precio_tachado: 100000 }));
const preview = () => JSON.parse(screen.getAllByTestId('preview')[0].textContent);
afterEach(cleanup);
async function montar() {
  const guardar = vi.fn().mockResolvedValue(true);
  render(<ConfigurarVentaCodigo catalogo={{ productos, combos: [] }} inicial={{ seleccion: productos, venta: { urgencia: { activo: true, productos: productos.map(p => p.slug) } } }} onConfirmar={guardar} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: /Oferta flash con countdown/ }));
  return guardar;
}
describe('Configuración real de Oferta flash', () => {
  it.each([2, 7, 24])('Duración rápida %s horas llega a la preview y al guardado', async horas => {
    const guardar = await montar();
    fireEvent.click(screen.getByRole('button', { name: horas + ' horas', exact: true }));
    const urgencia = preview().venta.urgencia;
    expect(Date.parse(urgencia.fin_at) - Date.now()).toBeGreaterThan(horas * 3600000 - 65000);
    expect(Date.parse(urgencia.fin_at) - Date.now()).toBeLessThanOrEqual(horas * 3600000);
    expect(urgencia.productos).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar', exact: true }));
    await waitFor(() => expect(guardar).toHaveBeenCalled());
    expect(guardar.mock.calls[0][0].venta.urgencia.fin_at).toBe(urgencia.fin_at);
  });
  it('la fecha exacta reemplaza la duración rápida y no se pierde al guardar', async () => {
    const guardar = await montar();
    fireEvent.click(screen.getByRole('button', { name: '7 horas', exact: true }));
    fireEvent.input(screen.getByLabelText('Fecha fin'), { target: { value: '2028-03-25T17:45' } });
    const fin = new Date('2028-03-25T17:45').toISOString();
    expect(preview().venta.urgencia.fin_at).toBe(fin);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar', exact: true }));
    await waitFor(() => expect(guardar).toHaveBeenCalled());
    expect(guardar.mock.calls[0][0].venta.urgencia.fin_at).toBe(fin);
  });
});
