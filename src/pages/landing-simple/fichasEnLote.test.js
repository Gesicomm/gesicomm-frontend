import { describe, expect, it } from 'vitest';
import { aplicarCambiosFichas, combinarFichaCompartida } from './fichasEnLote';
import { datosRuntimePublico } from './datosRuntime';

describe('edición de fichas en conjunto', () => {
  it('cambia solo los campos generales indicados y conserva los demás contenidos individuales', () => {
    const inicial = { 'producto:1': { v: 2, titulo_comercial: 'Propio', ficha_bloques: { opiniones: false } }, 'producto:2': { v: 2, confianza: [{ titulo: 'Original' }] } };
    const r = aplicarCambiosFichas({ compartida: {}, presentaciones: inicial, cambios: { ficha_bloques: { incluye: false } } });
    expect(r.compartida.ficha_bloques.incluye).toBe(false);
    expect(r.presentaciones['producto:1']).toMatchObject({ titulo_comercial: 'Propio', ficha_bloques: { opiniones: false } });
    expect(r.presentaciones['producto:2']).toEqual(inicial['producto:2']);
    expect(inicial['producto:1'].ficha_bloques).toEqual({ opiniones: false });
  });
  it('permite volver a los ajustes de cada producto quitando el ajuste compartido', () => {
    const propia = { v: 2, ficha_bloques: { opiniones: false }, confianza: [{ titulo: 'Propia' }] };
    const r = aplicarCambiosFichas({ compartida: { ficha_bloques: { incluye: false }, confianza: [] }, presentaciones: { 'producto:1': propia }, cambios: { ficha_bloques: { incluye: null }, confianza: null } });
    expect(r.compartida).toEqual({});
    expect(r.presentaciones['producto:1']).toEqual(propia);
  });
  it('la excepción individual manda y volver a aplicar a todos la reemplaza solo en los campos elegidos', () => {
    const compartida = { ficha_bloques: { incluye: false, opiniones: false }, confianza: [{ titulo: 'Común' }] };
    const propia = { v: 2, ficha_bloques: { incluye: true }, confianza: [] };
    expect(combinarFichaCompartida(compartida, propia)).toMatchObject({ ficha_bloques: { incluye: true, opiniones: false }, confianza: [] });
    const r = aplicarCambiosFichas({ compartida, presentaciones: { 'producto:1': propia }, claves: [], todos: true, cambios: { ficha_bloques: { incluye: false } } });
    expect(combinarFichaCompartida(r.compartida, r.presentaciones['producto:1'])).toMatchObject({ ficha_bloques: { incluye: false, opiniones: false }, confianza: [] });
  });
  it('la publicada aplica el contenido común también a fichas fuera de la primera página y a productos nuevos', () => {
    const venta = { ficha_compartida: { ficha_bloques: { incluye: false }, confianza: [{ titulo: 'Garantía común', texto: 'Atención directa' }] },
      presentacion_productos: { 'producto:800': { v: 2, ficha_bloques: { opiniones: false } } } };
    for (const id of [800, 900]) {
      const item = { tipo: 'producto', referencia_id: id, content_id: `producto-${id}`, nombre: 'Nuevo', precio: 100, confianza: [{ titulo: 'Del producto' }] };
      const publico = datosRuntimePublico({ content: { venta }, catalogo_items: [] }, 'tienda', item, { vista: 'producto' });
      expect(publico.producto.ficha_bloques.incluye).toBe(false);
      expect(publico.producto.confianza[0].titulo).toBe('Garantía común');
      if (id === 800) expect(publico.producto.ficha_bloques.opiniones).toBe(false);
    }
  });
  it('la configuración común no cambia las fichas de combos ni sus excepciones', () => {
    const combo = { tipo: 'combo', referencia_id: 50, content_id: 'combo-50', nombre: 'Pack', precio: 100, confianza: [{ titulo: 'Garantía del pack' }] };
    const venta = { ficha_compartida: { ficha_bloques: { incluye: false }, confianza: [] } };
    const publico = datosRuntimePublico({ content: { venta }, catalogo_items: [] }, 'tienda', combo, { vista: 'producto' });
    expect(publico.producto.ficha_bloques.incluye).toBe(true);
    expect(publico.producto.confianza[0].titulo).toBe('Garantía del pack');
    const propia = { v: 2, confianza: [{ titulo: 'Pack' }] };
    const resultado = aplicarCambiosFichas({ compartida: {}, presentaciones: { 'combo:50': propia }, claves: [], todos: true, cambios: { confianza: [] } });
    expect(resultado.presentaciones['combo:50']).toBe(propia);
  });
});
