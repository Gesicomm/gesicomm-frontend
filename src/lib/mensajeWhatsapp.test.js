import { describe, expect, it } from 'vitest';
import { generarPreviewMensaje } from './mensajeWhatsapp';

describe('generarPreviewMensaje', () => {
  it('usa la URL pública real de la tienda cuando se pasa en opciones', () => {
    const mensaje = generarPreviewMensaje('{url} Hola, quiero consultar por {producto}.', {
      url: 'llevatelofacil.shop',
    });

    expect(mensaje).toBe('llevatelofacil.shop Hola, quiero consultar por Chomba Lacoste Clásica.');
    expect(mensaje).not.toContain('sommix.gesicomm.com');
  });
});
