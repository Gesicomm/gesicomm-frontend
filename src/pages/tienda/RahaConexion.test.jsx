import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import RahaConexion from './RahaConexion';
import { rahaService } from '../../services/rahaService';
vi.mock('../../services/rahaService', () => ({ rahaService: { obtener: vi.fn(), guardar: vi.fn(), enviar: vi.fn(), subir: vi.fn(), quitar: vi.fn(), documento: vi.fn() } }));
const base = { id: 1, estado: 'borrador', version: 0, datos: {}, documentos: [], historial: [] };
beforeEach(() => { cleanup(); vi.clearAllMocks(); rahaService.obtener.mockResolvedValue(structuredClone(base)); });
describe('Raha application', () => {
  it('prefills known store data and requires consent before submitting', async () => {
    render(<RahaConexion tienda={{ nombre: 'Mi empresa', ruc: '80000000-0' }} />);
    expect(await screen.findByLabelText('Razón social')).toHaveValue('Mi empresa');
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled();
  });
  it('preserves inputs after upload and validation errors', async () => {
    rahaService.subir.mockResolvedValue({ ...base, version: 1, documentos: [{ id: 4, tipo: 'ruc', nombre: 'ruc.pdf', size: 30 }] });
    rahaService.guardar.mockRejectedValue({ response: { data: { message: 'Conflicto de version' } } });
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Tipo de productos que vendés'), { target: { value: 'Ropa y calzado' } });
    fireEvent.change(screen.getByLabelText('Adjuntar Constancia de RUC'), { target: { files: [new File(['%PDF'], 'ruc.pdf', { type: 'application/pdf' })] } });
    await screen.findByText('ruc.pdf');
    expect(screen.getByLabelText('Tipo de productos que vendés')).toHaveValue('Ropa y calzado');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto de version');
    expect(screen.getByLabelText('Tipo de productos que vendés')).toHaveValue('Ropa y calzado');
    expect(rahaService.guardar.mock.calls[0][0].version).toBe(1);
  });
  it('disallows modifying a pending application but shows review notes', async () => {
    rahaService.obtener.mockResolvedValue({ ...base, estado: 'en_revision', historial: [{ estado: 'observada', ocurrido_at: '2026-10-03T00:00:00Z', nota: 'La cedula no se lee.' }] });
    render(<RahaConexion />);
    expect(await screen.findByLabelText('Razón social')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).not.toBeInTheDocument();
    expect(screen.getByText('La cedula no se lee.')).toBeInTheDocument();
  });
  it('rejects unsupported file types without posting them', async () => {
    render(<RahaConexion />);
    fireEvent.change(await screen.findByLabelText('Adjuntar Constancia de RUC'), { target: { files: [new File(['<svg/>'], 'ruc.svg', { type: 'image/svg+xml' })] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('hasta 8 MB'));
    expect(rahaService.subir).not.toHaveBeenCalled();
  });
});
