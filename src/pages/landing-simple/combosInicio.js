export const COMBOS_INICIO_DEFAULT = {
  kicker: 'TODO EN UN COMBO', titulo: 'Juntos convienen más.',
  descripcion: 'Elegí un combo listo para vos y descubrí todo lo que incluye.',
  enlace_texto: 'Ver todos los combos', pie: 'Varios productos juntos en un solo pedido',
  modo: 'todos', items: [], columnas: 3, filas: 1, limite: 3,
  imagen_modo: 'portada', mostrar_incluidos: true, mostrar_ahorro: true, mostrar_descripcion: true,
};

export function normalizarCombosInicio(valor = {}) {
  const entrada = valor && typeof valor === 'object' ? valor : {};
  const entero = (v, max, defecto) => Math.max(1, Math.min(max, Math.floor(Number(v) || defecto)));
  const columnas = entero(entrada.columnas, 6, 3);
  const filas = entero(entrada.filas, 8, 1);
  const textos = Object.fromEntries(['kicker', 'titulo', 'descripcion', 'enlace_texto', 'pie'].map(k => [k, typeof entrada[k] === 'string' ? entrada[k] : COMBOS_INICIO_DEFAULT[k]]));
  return { ...COMBOS_INICIO_DEFAULT, ...entrada, ...textos, columnas, filas,
    limite: entero(entrada.limite, 48, columnas * filas),
    modo: entrada.modo === 'manual' ? 'manual' : 'todos',
    items: [...new Set((Array.isArray(entrada.items) ? entrada.items : []).filter(i => typeof i === 'string'))].slice(0, 48),
    imagen_modo: 'portada',
  };
}
