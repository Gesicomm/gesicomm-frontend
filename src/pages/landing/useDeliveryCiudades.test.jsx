import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../../services/landingPublicaService', () => ({
  obtenerDeliveryCiudadesPublica: vi.fn(),
}));

import { obtenerDeliveryCiudadesPublica } from '../../services/landingPublicaService';
import useDeliveryCiudades from './useDeliveryCiudades';

const luque = { ciudad: 'Luque', departamento: 'Central', costo: 25000, reglas: [] };

describe('useDeliveryCiudades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerDeliveryCiudadesPublica.mockResolvedValue([luque]);
  });

  it('sin carrito activo no pide nada (la visita que no compra no paga las ciudades)', () => {
    const { result } = renderHook(() => useDeliveryCiudades(undefined, false));
    expect(result.current).toEqual([]);
    expect(obtenerDeliveryCiudadesPublica).not.toHaveBeenCalled();
  });

  it('al activarse las pide una vez y las devuelve', async () => {
    const { result, rerender } = renderHook(({ activo }) => useDeliveryCiudades([], activo), { initialProps: { activo: false } });
    rerender({ activo: true });
    await waitFor(() => expect(result.current).toEqual([luque]));
    rerender({ activo: false });
    rerender({ activo: true });
    expect(obtenerDeliveryCiudadesPublica).toHaveBeenCalledTimes(1);
  });

  it('si la respuesta de la landing todavía las trae (backend viejo), usa esas y no pide', () => {
    const recibidas = [{ ...luque, ciudad: 'Asunción' }];
    const { result } = renderHook(() => useDeliveryCiudades(recibidas, true));
    expect(result.current).toBe(recibidas);
    expect(obtenerDeliveryCiudadesPublica).not.toHaveBeenCalled();
  });

  it('si el pedido falla queda vacío, sin romper', async () => {
    obtenerDeliveryCiudadesPublica.mockRejectedValue(new Error('caído'));
    const { result } = renderHook(() => useDeliveryCiudades([], true));
    await waitFor(() => expect(obtenerDeliveryCiudadesPublica).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});
