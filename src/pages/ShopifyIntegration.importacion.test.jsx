import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShopifyIntegration, { ImportacionPedidosAviso } from './ShopifyIntegration';
import shopifyService from '../services/shopifyService';

// La sesión real devuelve siempre el mismo usuario; uno nuevo por render
// recargaría el estado sin parar.
const sesion = { usuario: { id: 1 }, cargando: false };
vi.mock('../hooks/useSesion', () => ({ default: () => sesion }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../services/shopifyService', () => ({
  default: { getStatus: vi.fn(), syncPedidos: vi.fn(), listPedidos: vi.fn(async () => ({ pedidos: [] })), listClientes: vi.fn(async () => ({ clientes: [] })), listLogs: vi.fn(async () => ({ logs: [] })) },
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

describe('ImportacionPedidosAviso', () => {
  it('en curso: avance con total y porcentaje', () => {
    render(<ImportacionPedidosAviso importacion={{ estado: 'en_curso', procesados: 500, total: 1240, errores: 0 }} />);
    expect(screen.getByText('Importando el historial de pedidos')).toBeTruthy();
    expect(screen.getByText('500 de 1.240 pedidos · 40%')).toBeTruthy();
  });

  it('interrumpida: ofrece continuar desde donde quedó', () => {
    const onContinuar = vi.fn();
    render(<ImportacionPedidosAviso importacion={{ estado: 'interrumpido', procesados: 499, total: 620, errores: 1, reanudable: true }} onContinuar={onContinuar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar importación' }));
    expect(onContinuar).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/sin repetir los anteriores/)).toBeTruthy();
  });

  it('terminada con errores: dice cuántos y dónde mirar', () => {
    render(<ImportacionPedidosAviso importacion={{ estado: 'error', procesados: 619, total: 620, errores: 1 }} />);
    expect(screen.getByText('Historial importado con pedidos pendientes de revisar')).toBeTruthy();
    expect(screen.getByText(/1 pedido\(s\) no se pudieron importar/)).toBeTruthy();
  });

  it('sin importación previa no muestra nada', () => {
    const { container } = render(<ImportacionPedidosAviso importacion={null} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('ShopifyIntegration: avance de la importación', () => {
  const tienda = (importacion) => ({ id: 7, shop_domain: 'tienda.myshopify.com', estado: 'conectado', currency: 'PYG', importacion_pedidos: importacion });

  it('relee el estado mientras importa y deja de hacerlo al terminar', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    let actual = { estado: 'en_curso', procesados: 250, total: 600, errores: 0 };
    shopifyService.getStatus.mockImplementation(async () => ({ tiendas: [tienda(actual)], logs: [] }));

    render(<MemoryRouter><ShopifyIntegration /></MemoryRouter>);
    expect(await screen.findByText('250 de 600 pedidos · 42%')).toBeTruthy();

    actual = { estado: 'en_curso', procesados: 500, total: 600, errores: 0 };
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(await screen.findByText('500 de 600 pedidos · 83%')).toBeTruthy();

    actual = { estado: 'ok', procesados: 600, total: 600, errores: 0, terminado_at: '2026-11-19T18:00:00Z' };
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(await screen.findByText('Historial de pedidos importado')).toBeTruthy();
    const llamadas = shopifyService.getStatus.mock.calls.length;

    await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
    expect(shopifyService.getStatus.mock.calls.length).toBe(llamadas);
  });

  it('el botón de pedidos queda deshabilitado mientras importa', async () => {
    shopifyService.getStatus.mockResolvedValue({ tiendas: [tienda({ estado: 'en_curso', procesados: 1, total: 10, errores: 0 })], logs: [] });
    render(<MemoryRouter><ShopifyIntegration /></MemoryRouter>);
    const boton = await screen.findByRole('button', { name: /Pedidos y ventas/ });
    expect(boton.disabled).toBe(true);
  });
});
