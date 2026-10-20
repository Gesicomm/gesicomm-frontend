import { SECCIONES_COMBO } from './templates/combo/fichaCombo';

export const BLOQUES_COMBO = [
  { key: 'anuncios', label: 'Anuncios del ecommerce', fijo: true, global: true },
  { key: 'encabezado_tienda', label: 'Encabezado del ecommerce', fijo: true, global: true },
  ...SECCIONES_COMBO.slice(1).filter(b => b.key !== 'cta_final'),
  { key: 'pie', label: 'Pie de página', fijo: true, global: true },
  { key: 'compra_movil', label: 'Compra fija en celular', fijo: true },
].map((b, i) => ({ ...b, numero: i + 1 }));

export const BLOQUES_EDITABLES_COMBO = BLOQUES_COMBO.filter(b => !b.global);

export const PARTES_HERO_COMBO = [
  ['oferta', 'Etiqueta de oferta'], ['sobre_titulo', 'Sobre-título'], ['titulo', 'Nombre del combo'],
  ['calificacion', 'Calificación'], ['descripcion', 'Descripción'],
  ['galeria', 'Galería e imágenes'], ['etiqueta', 'Etiqueta de la foto'], ['productos', 'Productos bajo la foto'], ['miniaturas', 'Miniaturas de la galería'],
  ['precio', 'Precio y ahorro'], ['precio_anterior', 'Precio por separado'], ['ahorro', 'Ahorro y porcentaje'],
  ['rotulo_combo', 'Rótulo del combo'], ['cantidad_productos', 'Cantidad de productos'],
  ['rotulo_precio', 'Rótulo del precio actual'], ['rotulo_precio_anterior', 'Rótulo del precio por separado'], ['porcentaje', 'Porcentaje de ahorro'],
  ['caracteristicas', 'Puntos clave'], ['compra', 'Botón de compra'], 
];

export const SUBBLOQUES_HERO_COMBO = {
  hero_titulo: 'Nombre del combo', hero_descripcion: 'Descripción', hero_galeria: 'Fotos del combo', hero_precio: 'Precio y ahorro',
  hero_compra: 'Botón de compra', hero_caracteristicas: 'Puntos clave del combo',
  hero_oferta: 'Precio y ahorro', hero_calificacion: 'Calificación',
};

export function bloquePadreCombo(clave) {
  if (BLOQUES_COMBO.some(b => b.key === clave)) return clave;
  if (SUBBLOQUES_HERO_COMBO[clave] || clave === 'oferta' || clave?.startsWith('oferta_')) return 'hero';
  if (/^incluye_producto_\d+$/.test(clave)) return 'incluye';
  if (/^detalle_productos_producto_\d+$/.test(clave)) return 'detalle_productos';
  return null;
}

export function ordenBloquesCombo(orden) {
  const claves = BLOQUES_COMBO.filter(b => !b.fijo).map(b => b.key);
  return ['anuncios', 'encabezado_tienda', ...new Set([...(Array.isArray(orden) ? orden : []).filter(k => claves.includes(k)), ...claves]), 'pie', 'compra_movil'];
}

export function moverBloqueCombo(orden, origen, destino) {
  const lista = ordenBloquesCombo(orden);
  if (!lista.includes(origen) || !lista.includes(destino) || origen === destino
    || BLOQUES_COMBO.some(b => b.fijo && [origen, destino].includes(b.key))) return lista;
  const desde = lista.indexOf(origen);
  const hasta = lista.indexOf(destino);
  lista.splice(desde, 1);
  lista.splice(hasta, 0, origen);
  return lista;
}

export const PARTES_BLOQUE_COMBO = {
  incluye: [['imagen', 'Imágenes de productos'], ['nombre', 'Nombres de productos'], ['cantidad', 'Cantidades'], ['beneficio', 'Beneficio de cada producto']],
  valor: [['desglose', 'Precios por separado'], ['total', 'Total por separado'], ['rotulo_precio', 'Rótulo del precio del combo'], ['precio', 'Precio del combo'], ['ahorro', 'Ahorro'], ['nota', 'Nota de ahorro'], ['compra', 'Botón de compra']],
  beneficio_principal: [['iconos', 'Iconos'], ['nombre', 'Títulos de tarjetas'], ['texto', 'Textos de tarjetas']],
  detalle_productos: [['imagen', 'Imágenes de productos'], ['nombre', 'Nombres de productos'], ['cantidad', 'Cantidades'], ['beneficios', 'Beneficios de cada producto']],
  prueba_social: [['calificacion', 'Calificación general'], ['estrellas', 'Estrellas de cada opinión'], ['comentario', 'Comentarios'], ['nombre', 'Nombres de clientes'], ['verificada', 'Rótulo Compra verificada']],
  confianza: [['iconos', 'Iconos'], ['nombre', 'Títulos de tarjetas'], ['texto', 'Textos de tarjetas']],
  faq: [['respuestas', 'Respuestas']],
  compra_movil: [['precio', 'Precio'], ['compra', 'Botón de compra']],
};

export function fichaPropiaCombo(item, content) {
  const referencia = item.referencia_id || item.id;
  const propia = content?.venta?.presentacion_productos?.[`combo:${referencia}`]?.ficha_combo
    ?? item.ficha_combo ?? content?.combos?.[String(referencia)]?.ficha_combo ?? {};
  return { ...Object.fromEntries(['_orden', '_orden_hero', '_visibilidad'].filter(k => item.ficha_datos?.[k] != null).map(k => [k, item.ficha_datos[k]])), ...propia };
}

export const GRUPOS_HERO_COMBO = [
  [['titulo', 'Nombre del combo'], ['descripcion', 'Descripción'], ['calificacion', 'Calificación']],
  [['precio', 'Precio y ahorro'], ['caracteristicas', 'Puntos clave'], ['compra', 'Botón de compra']],
];
export function ordenPartesCombo(orden) {
  return GRUPOS_HERO_COMBO.flatMap(grupo => {
    const claves = grupo.map(([k]) => k);
    return [...new Set([...(Array.isArray(orden) ? orden : []).filter(k => claves.includes(k)), ...claves])];
  });
}
export function moverParteCombo(orden, origen, destino) {
  const grupo = GRUPOS_HERO_COMBO.find(g => g.some(([k]) => k === origen));
  const lista = ordenPartesCombo(orden);
  if (!grupo?.some(([k]) => k === destino)) return lista;
  const desde = lista.indexOf(origen), hasta = lista.indexOf(destino);
  lista.splice(desde, 1); lista.splice(hasta, 0, origen);
  return lista;
}
