import { resolverRango, describirRango } from './periodo';

const HOY = new Date(2026, 9, 23); // 23 oct 2026

describe('resolverRango', () => {
  test('cada preset da fechas concretas', () => {
    expect(resolverRango({ periodo: 'hoy' }, HOY)).toEqual({ fecha_desde: '2026-10-23', fecha_hasta: '2026-10-23' });
    expect(resolverRango({ periodo: '7d' }, HOY)).toEqual({ fecha_desde: '2026-10-17', fecha_hasta: '2026-10-23' });
    expect(resolverRango({ periodo: 'mes_anterior' }, HOY)).toEqual({ fecha_desde: '2026-09-01', fecha_hasta: '2026-09-30' });
    expect(resolverRango({ periodo: 'personalizado_mes', mes: 2, anio: 2024 }, HOY)).toEqual({ fecha_desde: '2024-02-01', fecha_hasta: '2024-02-29' });
  });

  test('mes anterior en enero cae en diciembre del año pasado', () => {
    expect(resolverRango({ periodo: 'mes_anterior' }, new Date(2027, 0, 10))).toEqual({ fecha_desde: '2026-12-01', fecha_hasta: '2026-12-31' });
  });

  test('un preset ignora las fechas de un rango personalizado anterior', () => {
    expect(resolverRango({ periodo: 'este_mes', fecha_desde: '2025-01-01', fecha_hasta: '2025-01-31' }, HOY))
      .toEqual({ fecha_desde: '2026-10-01', fecha_hasta: '2026-10-31' });
  });
});

test('describirRango cuenta los días incluidos', () => {
  expect(describirRango({ fecha_desde: '2026-09-01', fecha_hasta: '2026-09-30' }).dias).toBe(30);
});
