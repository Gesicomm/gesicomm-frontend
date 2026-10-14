import { nombreBaseItem, tipoLineaItem } from './envioItemDisplay';

const mouse = (extra) => ({
  nombre_producto: `Mouse Inalámbrico Silencioso QA — ${extra}`,
  oferta_nombre: extra,
});

test('separa el nombre base del producto cuando viene combinado con la oferta', () => {
  expect(nombreBaseItem(mouse('¿Lo querés con el adaptador HDMI a VGA?')))
    .toBe('Mouse Inalámbrico Silencioso QA');
});

test('deja el nombre tal cual si no hay oferta en la línea', () => {
  expect(nombreBaseItem({ nombre_producto: 'Mouse Inalámbrico Silencioso QA' }))
    .toBe('Mouse Inalámbrico Silencioso QA');
});

test('no corta nada si el nombre no termina en el sufijo esperado (dato inconsistente)', () => {
  expect(nombreBaseItem({ nombre_producto: 'Mouse Inalámbrico Silencioso QA', oferta_nombre: 'Otra cosa' }))
    .toBe('Mouse Inalámbrico Silencioso QA');
});

test('clasifica order_bump y upsell como Upsell', () => {
  expect(tipoLineaItem({ ...mouse('¿Lo querés con el adaptador HDMI a VGA?'), origen_venta: 'order_bump' })).toBe('Upsell');
  expect(tipoLineaItem({ ...mouse('Sí, sumá el adaptador Wi-Fi con 30% OFF'), origen_venta: 'upsell' })).toBe('Upsell');
});

test('clasifica una oferta normal con oferta_id/oferta_nombre como Paquete (oferta por cantidad)', () => {
  expect(tipoLineaItem({ ...mouse('Llevá 2 y ahorrá'), origen_venta: 'normal' })).toBe('Paquete');
});

test('un combo legacy se distingue de un paquete', () => {
  expect(tipoLineaItem({ ...mouse('3 productos combinados'), origen_venta: 'combo' })).toBe('Combo');
});

test('sin oferta_nombre no hay etiqueta, sea cual sea origen_venta', () => {
  expect(tipoLineaItem({ nombre_producto: 'Mouse Inalámbrico Silencioso QA', origen_venta: 'normal' })).toBeNull();
});
