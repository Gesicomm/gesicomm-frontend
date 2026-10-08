import { describe, it, expect } from 'vitest';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
import { PLANTILLA_INICIO } from './plantillasBaseCodigo';

describe('colores del bloque de oferta flash', () => {
  it('deriva el fondo, tarjetas y acento desde los colores de Mi Tienda', () => {
    const html = construirDocumentoCodigo(PLANTILLA_INICIO, {
      datos: {
        vista: 'inicio',
        tienda: { colores: { primario: '#006d77', secundario: '#f4a261', fondo: '#07171f' } },
        venta: {
          urgencia: {
            activo: true,
            titulo: 'Ofertas que terminan pronto',
            texto: 'Aprovecha antes de que se agoten',
            fin_at: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
          },
        },
        productos: [
          {
            id: 'oferta-1',
            content_id: 'oferta-1',
            nombre: 'Parlante Bluetooth',
            precio: 110000,
            precio_antes: 130000,
            descuento_pct: 15,
            imagen: 'https://cdn.test/parlante.png',
          },
        ],
      },
    });

    expect(html).toContain('--tienda-primario: #006d77;');
    expect(html).toContain('--flash-bg: var(--tienda-banda');
    expect(html).toContain('--flash-card: var(--gc-superficie');
    expect(html).toContain('var(--flash-bg);');
    expect(html).toContain('--flash-accent: var(--tienda-secundario');
    expect(html).not.toContain('--flash-red');
  });
});
