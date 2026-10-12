import { describe, expect, it, vi } from 'vitest';
import { vistasCambiadas } from './LandingCodigoEditor';
import { PLANTILLA_CATALOGO, PLANTILLA_CATEGORIA, PLANTILLA_CHECKOUT, PLANTILLA_PRODUCTO } from './plantillasBaseCodigo';

vi.mock('./CodigoPreview', () => ({ default: () => null }));

const LIMITE_BODY = 600 * 1024; // techo histórico del body en el backend
const peso = o => new TextEncoder().encode(JSON.stringify(o)).length;
const codigo = (html, css = '', js = '') => ({ html, css, js });

describe('Guardado del lienzo: solo viaja lo que cambió', () => {
  const guardadas = {
    catalogo: { ...PLANTILLA_CATALOGO, fonts: [], design_context: null },
    producto: { ...PLANTILLA_PRODUCTO, fonts: [], design_context: null },
    categoria: { ...PLANTILLA_CATEGORIA, fonts: [], design_context: null },
    checkout: { ...PLANTILLA_CHECKOUT, fonts: [], design_context: null },
    legales: { contacto: codigo('<p>Contacto</p>'), aviso_legal: codigo('<p>Aviso</p>') },
    productos: { remera: codigo('<p>Ficha propia</p>') },
  };
  const codigos = {
    inicio: codigo('<main>Inicio</main>'),
    catalogo: PLANTILLA_CATALOGO, producto: PLANTILLA_PRODUCTO, categoria: PLANTILLA_CATEGORIA, checkout: PLANTILLA_CHECKOUT,
    'propia:remera': codigo('<p>Ficha propia</p>'),
  };
  const legales = { contacto: codigo('<p>Contacto</p>'), aviso_legal: codigo('<p>Aviso</p>') };

  it('sin cambios no manda ninguna vista', () => {
    expect(vistasCambiadas(codigos, guardadas, new Set(), legales)).toEqual({});
  });

  it('manda la vista editada, la legal editada y la ficha propia nueva o borrada', () => {
    const vistas = vistasCambiadas(
      { ...codigos, checkout: codigo('<main>Otro checkout</main>'), 'propia:gorra': codigo('<p>Gorra</p>') },
      guardadas,
      new Set(['remera-vieja']),
      { ...legales, aviso_legal: codigo('<p>Aviso nuevo</p>') },
    );
    expect(Object.keys(vistas).sort()).toEqual(['checkout', 'legales', 'productos']);
    expect(vistas.legales).toEqual({ aviso_legal: codigo('<p>Aviso nuevo</p>') });
    expect(vistas.productos).toEqual({ 'remera-vieja': null, gorra: codigo('<p>Gorra</p>') });
  });

  it('una vista que el servidor todavía no tiene se manda', () => {
    const vistas = vistasCambiadas(codigos, {}, new Set(), legales);
    expect(Object.keys(vistas).sort()).toEqual(['catalogo', 'categoria', 'checkout', 'legales', 'producto', 'productos']);
  });

  it('500 productos entran en el body aunque la tienda tenga todas las vistas guardadas', () => {
    // Tamaños de una tienda real: 6 páginas legales de ~26 KB, inicio de 85 KB.
    const legalesReales = Object.fromEntries(['contacto', 'aviso_legal', 'politica_envio', 'terminos_servicio', 'politica_reembolso', 'politica_privacidad']
      .map(k => [k, codigo('x'.repeat(26 * 1024))]));
    const items = Array.from({ length: 500 }, (_, i) => ({
      tipo: 'producto', referencia_id: 1000 + i, etiqueta: '', orden: i, precio_ancla: null, envio_incluido: false, mostrar_en_inicio: true,
    }));
    const venta = { presentacion_productos: Object.fromEntries(items.map(i => [`producto:${i.referencia_id}`, { etiqueta: '', mostrar_en_inicio: true, envio_incluido: false }])) };
    const todo = { catalogo: codigos.catalogo, producto: codigos.producto, categoria: codigos.categoria, checkout: codigos.checkout, legales: legalesReales, productos: {} };
    // Como se mandaba antes: todas las vistas en cada guardado.
    expect(peso({ codigo: codigo('x'.repeat(85 * 1024)), vistas: todo, venta, items })).toBeGreaterThan(LIMITE_BODY);
    const vistas = vistasCambiadas(codigos, { ...guardadas, legales: legalesReales }, new Set(), legalesReales);
    expect(peso({ vistas, venta, items })).toBeLessThan(LIMITE_BODY / 4);
  });
});
