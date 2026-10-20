import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MisAbastecimientos from './MisAbastecimientos';
import AbastecimientoRahaDetalle from '../../components/abastecimiento/AbastecimientoRahaDetalle';
import { solicitudAbastecimientoService } from '../../services/solicitudAbastecimiento.service';
import { depositoService } from '../../services/deposito.service';

vi.mock('../../services/solicitudAbastecimiento.service', () => ({ solicitudAbastecimientoService: { listar: vi.fn() } }));
vi.mock('../../services/deposito.service', () => ({ depositoService: { listarDepositos: vi.fn() } }));

const solicitud = { id: 44, cantidad: 4, precio_unitario: 20000, costo_producto: 80000, costo_logistico: 10000,
  estado_seguimiento: 'en_camino', producto: { nombre: 'Termo', sku: 'T-123' },
  depositoDestino: { id: 6, nombre: 'Depósito Luque', ciudad: 'Luque' },
  inventario: { disponible: 9, reservado: 2 }, ventas_producto: { unidades: 5, importe: 150000 },
  historial_raha: [{ id: 'raha-1', origen: 'RAHA', estado: 'en_camino', created_at: '2026-10-18T12:00:00Z' }] };

beforeEach(() => {
  vi.clearAllMocks();
  depositoService.listarDepositos.mockResolvedValue({ data: [solicitud.depositoDestino], totalPages: 1 });
  solicitudAbastecimientoService.listar.mockResolvedValue({ solicitudes: [solicitud], total: 45, total_paginas: 3 });
});
afterEach(cleanup);

function mostrar(ruta = '/mis-abastecimientos') {
  return render(<MemoryRouter initialEntries={[ruta]}><MisAbastecimientos /></MemoryRouter>);
}

describe('Abastecimientos RAHA', () => {
  it('pagina en el servidor y vuelve a la primera página al cambiar de depósito o tamaño', async () => {
    mostrar();
    await screen.findByRole('link', { name: 'Ver seguimiento del abastecimiento 44' });
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(solicitudAbastecimientoService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ vista: 'raha', page: 2, limit: 20 })));
    fireEvent.change(screen.getByLabelText('Depósito de destino'), { target: { value: '6' } });
    await waitFor(() => expect(solicitudAbastecimientoService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ depositoId: '6', page: 1 })));
    fireEvent.change(screen.getByLabelText(/Mostrar/), { target: { value: '50' } });
    await waitFor(() => expect(solicitudAbastecimientoService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 50, page: 1 })));
    expect(screen.queryByText('Subir comprobante')).not.toBeInTheDocument();
  });

  it('conserva filtros de estado y fechas desde la URL', async () => {
    mostrar('/mis-abastecimientos?estado=entregado&desde=2026-10-01&hasta=2026-10-18');
    await waitFor(() => expect(solicitudAbastecimientoService.listar).toHaveBeenCalledWith(expect.objectContaining({ estado: 'entregado', desde: '2026-10-01', hasta: '2026-10-18' })));
  });

  it('descarta una respuesta anterior si el usuario cambió de filtro', async () => {
    let resolverAnterior;
    solicitudAbastecimientoService.listar.mockReturnValueOnce(new Promise(resolve => { resolverAnterior = resolve; }));
    mostrar();
    fireEvent.change(screen.getByLabelText('Estado RAHA'), { target: { value: 'devuelto' } });
    await screen.findByText('Termo');
    resolverAnterior({ solicitudes: [{ ...solicitud, producto: { nombre: 'Resultado anterior' } }], total: 1 });
    await waitFor(() => expect(screen.queryByText('Resultado anterior')).not.toBeInTheDocument());
  });

  it('permite reintentar una carga fallida', async () => {
    solicitudAbastecimientoService.listar.mockRejectedValueOnce(new Error('red'));
    mostrar();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Termo');
  });

  it('muestra el historial real y solo permite confirmar recepción después de la entrega', () => {
    const confirmar = vi.fn();
    const vista = render(<AbastecimientoRahaDetalle solicitud={solicitud} confirmarRecepcion={confirmar} />);
    expect(screen.getByText('Historial de movimientos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar recepción/ })).not.toBeInTheDocument();
    vista.rerender(<AbastecimientoRahaDetalle solicitud={{ ...solicitud, estado_seguimiento: 'entregado' }} confirmarRecepcion={confirmar} />);
    fireEvent.click(screen.getByRole('button', { name: /Confirmar recepción/ }));
    expect(confirmar).toHaveBeenCalledOnce();
    expect(screen.queryByText('Subir comprobante')).not.toBeInTheDocument();
  });
});
