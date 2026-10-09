import { describe, expect, it } from 'vitest';
import { datosRuntimePreview } from './datosRuntime';

describe('datosRuntimePreview: aislamiento de tienda/landing', () => {
  it('prioriza los colores de la landing abierta sobre los de la tienda activa', () => {
    const datos = datosRuntimePreview({
      productos: [],
      tienda: {
        nombre: 'Tienda B',
        color_primario: '#0f5132',
        color_secundario: '#ffc107',
        color_fondo: '#ffffff',
      },
      landing: {
        color_primario: '#aa1122',
        color_texto: '#223344',
        color_fondo: '#f8f1e7',
      },
    });

    expect(datos.tienda.colores).toEqual({
      primario: '#aa1122',
      secundario: '#223344',
      fondo: '#f8f1e7',
    });
  });
});
