import { afterEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { depositoService } from './deposito.service';

vi.mock('./api', () => ({ default: { post: vi.fn() } }));
afterEach(() => vi.clearAllMocks());

const duplicado = { response: { status: 409, data: { codigo: 'DEPOSITO_DUPLICADO', error: 'Ya tenés un depósito "Central" en Calle 1.' } } };

describe('crearDepositoAvisandoDuplicado', () => {
  it('pregunta y, si confirma, crea con confirmar_duplicado', async () => {
    api.post.mockRejectedValueOnce(duplicado).mockResolvedValueOnce({ data: { id: 9, nombre: 'Central' } });
    const confirmar = vi.fn(() => true);
    const r = await depositoService.crearDepositoAvisandoDuplicado({ nombre: 'Central', direccion: 'Calle 1' }, confirmar);
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('¿Querés crear otro igual'));
    expect(api.post.mock.calls[1][1]).toMatchObject({ confirmar_duplicado: true });
    expect(r).toBeTruthy();
  });

  it('si no confirma, no crea nada y devuelve null', async () => {
    api.post.mockRejectedValueOnce(duplicado);
    const r = await depositoService.crearDepositoAvisandoDuplicado({ nombre: 'Central', direccion: 'Calle 1' }, () => false);
    expect(r).toBeNull();
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('otros errores se propagan', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(depositoService.crearDepositoAvisandoDuplicado({}, () => true)).rejects.toBeTruthy();
  });
});
