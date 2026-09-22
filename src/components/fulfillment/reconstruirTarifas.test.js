import { describe, it, expect } from 'vitest';
import { reconstruirDesdeReglas } from './reconstruirTarifas';

/**
 * Volver del plano al atajo es una INFERENCIA, no una lectura: en la base hay
 * una fila por ciudad y por rango, y el formulario habla de "tarifa base" +
 * "precios propios". Lo que se prueba acá es que la inferencia no invente ni
 * aplane en silencio.
 */

const regla = (extra = {}) => ({
  ciudad_id: 1,
  ciudad: 'Luque',
  departamento_id: 11,
  departamento: 'Central',
  rango_min: 1,
  rango_max: 10,
  costo: 20000,
  tipo_pago: 'Ambos',
  tiempo_entrega_min_hs: 24,
  tiempo_entrega_max_hs: 48,
  ...extra,
});

describe('sin reglas', () => {
  it('arranca con un rango vacío y nada seleccionado', () => {
    const r = reconstruirDesdeReglas([]);

    expect(r.rangos).toHaveLength(1);
    expect(r.elegidas.size).toBe(0);
    expect(r.avisos).toEqual([]);
  });
});

describe('configuraciones por ciudad', () => {
  it('agrupa reglas en configuraciones completas por ciudad', () => {
    const r = reconstruirDesdeReglas([
      regla({ ciudad_id: 1, ciudad: 'Luque', costo: 20000 }),
      regla({ ciudad_id: 2, ciudad: 'Areguá', costo: 25000 }),
    ]);

    expect(r.configuraciones.size).toBe(2);
    expect(r.configuraciones.get(1).rangos[0].costo).toBe(20000);
    expect(r.configuraciones.get(2).rangos[0].costo).toBe(25000);
  });

  it('separa los rangos para cada ciudad', () => {
    const r = reconstruirDesdeReglas([
      regla({ ciudad_id: 1, rango_min: 1, rango_max: 10, costo: 20000 }),
      regla({ ciudad_id: 1, rango_min: 11, rango_max: null, costo: 35000 }),
    ]);

    const luque = r.configuraciones.get(1);
    expect(luque.rangos).toHaveLength(2);
    expect(luque.rangos[0]).toMatchObject({ rango_min: 1, rango_max: 10, costo: 20000 });
    expect(luque.rangos[1]).toMatchObject({ rango_min: 11, rango_max: '', costo: 35000 });
  });

  it('guarda condiciones por ciudad', () => {
    const r = reconstruirDesdeReglas([
      regla({ ciudad_id: 1, tipo_pago: 'Anticipado', tiempo_entrega_min_hs: 24, tiempo_entrega_max_hs: 48 }),
    ]);

    const luque = r.configuraciones.get(1);
    expect(luque.tipoPago).toBe('Anticipado');
    expect(luque.tiempo).toEqual({ min: 24, max: 48 });
  });
});
