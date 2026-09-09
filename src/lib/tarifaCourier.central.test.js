import { buscarZonaDelivery } from './tarifaCourier';

// Tarifas de Central tal como se cargan desde la pestaña Delivery: minorista
// separado por tipo de pago y un tramo mayorista para cantidades altas.
const zonas = [
  { departamento: 'Central', ciudad: 'Luque', courier_id: 1, tipo_pago: 'Al Recibir', rango_min: 1, rango_max: 3, costo: 15000, activo: true },
  { departamento: 'Central', ciudad: 'Luque', courier_id: 1, tipo_pago: 'Anticipado', rango_min: 1, rango_max: 3, costo: 12000, activo: true },
  { departamento: 'Central', ciudad: 'Luque', courier_id: 1, tipo_pago: 'Ambos', rango_min: 4, rango_max: null, costo: 10000, activo: true },
  { departamento: 'Central', ciudad: 'Asunción', courier_id: 1, tipo_pago: 'Al Recibir', rango_min: 1, rango_max: 3, costo: 25000, activo: true },
  { departamento: 'Central', ciudad: 'Asunción', courier_id: 1, tipo_pago: 'Ambos', rango_min: 4, rango_max: null, costo: 19000, activo: true },
  { departamento: 'Central', ciudad: 'Fernando de la Mora', courier_id: 1, tipo_pago: 'Ambos', rango_min: 1, rango_max: 5, costo: 20000, activo: true },
  { departamento: 'Central', ciudad: 'Fernando de la Mora', courier_id: 1, tipo_pago: 'Ambos', rango_min: 6, rango_max: null, costo: 16000, activo: true },
];

const items = cantidad => [{ cantidad }];
const cotizar = (ciudad, cantidad, anticipado) =>
  buscarZonaDelivery(zonas, ciudad, anticipado, items(cantidad), 'Central');

test('Luque distingue contra entrega, anticipado y mayorista', () => {
  expect(cotizar('Luque', 2, false).costo).toBe(15000);
  expect(cotizar('Luque', 2, true).costo).toBe(12000);
  expect(cotizar('Luque', 5, false).costo).toBe(10000);
  expect(cotizar('Luque', 5, true).costo).toBe(10000);
});

test('Fernando de la Mora corta el mayorista en 6', () => {
  expect(cotizar('Fernando de la Mora', 5, false).costo).toBe(20000);
  expect(cotizar('Fernando de la Mora', 6, false).costo).toBe(16000);
});

test('Asunción cobra 25.000 al minorista contra entrega', () => {
  expect(cotizar('Asunción', 2, false).costo).toBe(25000);
  expect(cotizar('Asunción', 6, false).costo).toBe(19000);
});

test('un tipo de pago sin tramo cargado no autocompleta nada', () => {
  // Asunción no tiene regla anticipada para 1-3 productos. Antes esto caía a
  // la mayorista y cobraba 19.000 en vez de 25.000; ahora no hay coincidencia
  // exacta, así que devuelve null y el flete se carga a mano.
  expect(cotizar('Asunción', 2, true)).toBeNull();
});

test('una ciudad sin ninguna regla tampoco inventa un precio', () => {
  expect(cotizar('Encarnación', 2, false)).toBeNull();
});

test('una cantidad fuera de todos los tramos no autocompleta', () => {
  // Fernando de la Mora arranca en 1; un pedido evaluado en 0 productos no
  // entra en ningún tramo.
  expect(buscarZonaDelivery(zonas, 'Fernando de la Mora', false, [{ cantidad: 0 }], 'Central').costo).toBe(20000);
  const soloMayorista = zonas.filter(z => z.ciudad === 'Luque' && z.rango_min === 4);
  expect(buscarZonaDelivery(soloMayorista, 'Luque', false, items(2), 'Central')).toBeNull();
});
