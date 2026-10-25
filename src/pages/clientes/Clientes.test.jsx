import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Clientes, { telefonoWhatsapp } from './Clientes';
import { reportesService } from '../../services/reportesApi';
import { clientesService } from '../../services/clientesService';

vi.mock('../../services/reportesApi', () => ({ reportesService: { obtenerReporteClientes: vi.fn() } }));
vi.mock('../../services/clientesService', () => ({ clientesService: { pedidos: vi.fn() } }));

const fila = {
  cliente_key: 'TEL:595992820631', nombre: 'Martin Victorino', telefono: '0992820631', calificacion: 'recurrente',
  pedidos_totales: 8, entregados: 2, devueltos: 0, cancelados: 0, total_comprado: 338000, ticket_promedio: 169000, ultimo_pedido: '2026-10-19',
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('telefonoWhatsapp', () => {
  it('lleva cualquier formato paraguayo a +595', () => {
    expect(telefonoWhatsapp('0992 820 631')).toBe('595992820631');
    expect(telefonoWhatsapp('+595992820631')).toBe('595992820631');
    expect(telefonoWhatsapp('992820631')).toBe('595992820631');
    expect(telefonoWhatsapp('')).toBe('');
  });
});

describe('Módulo Clientes', () => {
  it('lista todo el historial (sin fechas) y busca en el servidor', async () => {
    reportesService.obtenerReporteClientes.mockResolvedValue({ data: [fila], kpis: {}, paginas: 1, total: 1 });
    render(<Clientes />);
    await screen.findByRole('button', { name: 'Ver ficha de Martin Victorino' });
    const primera = reportesService.obtenerReporteClientes.mock.calls[0][0];
    expect(primera).not.toHaveProperty('fecha_desde');
    expect(primera).not.toHaveProperty('buscador');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar cliente por nombre o teléfono' }), { target: { value: '0992' } });
    await waitFor(() => expect(reportesService.obtenerReporteClientes.mock.calls.at(-1)[0]).toMatchObject({ buscador: '0992' }));
  });

  it('abre la ficha con sus pedidos y contacto, y la cierra con Escape', async () => {
    reportesService.obtenerReporteClientes.mockResolvedValue({ data: [fila], kpis: {}, paginas: 1, total: 1 });
    clientesService.pedidos.mockResolvedValue({ pedidos: [
      { id: 1047, numero_pedido_visible: 'sommix-1047', fecha: '2026-10-19', estado: 'Pendiente', monto: 1431716, ciudad: 'Luque', items: [{ id: 1, cantidad: 2, nombre_producto: 'Hidrolavadora' }] },
    ] });
    render(<Clientes />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Martin Victorino' }));
    const ficha = await screen.findByRole('dialog', { name: 'Ficha de Martin Victorino' });
    expect(clientesService.pedidos).toHaveBeenCalledWith('TEL:595992820631');
    expect(within(ficha).getByRole('link', { name: /Escribir por WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/595992820631');
    expect(await within(ficha).findByText('SOM-1047')).toBeInTheDocument();
    expect(within(ficha).getByText('2× Hidrolavadora')).toBeInTheDocument();
    expect(within(ficha).getByText('19/10/2026 · Luque')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('dice que no hubo coincidencias cuando la búsqueda no encuentra a nadie', async () => {
    reportesService.obtenerReporteClientes.mockResolvedValue({ data: [], kpis: {}, paginas: 1, total: 0 });
    render(<Clientes />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(await screen.findByText('Ningún cliente coincide con "zzz".')).toBeInTheDocument();
  });
});
