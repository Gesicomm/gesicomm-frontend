import { vi } from 'vitest';

// Doble de POST /api/vitrina/catalogo-paginado para los tests del editor:
// busca, filtra por categoría y tipo, y pagina como el servidor. Cada test
// le carga su catálogo con usarCatalogoPaginado().
let productos = [];

export function usarCatalogoPaginado(lista) {
  productos = lista;
}

export const catalogoPaginadoFalso = vi.fn(async (filtros) => {
  let lista = productos;
  if (filtros.tipo && filtros.tipo !== 'todos') lista = lista.filter(p => (p.tipo || 'producto') === filtros.tipo);
  if (filtros.filtroCategoria) lista = lista.filter(p => p.categoria === filtros.filtroCategoria);
  if (filtros.busqueda) lista = lista.filter(p => p.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()));
  const desde = (filtros.page - 1) * filtros.limit;
  return {
    items: lista.slice(desde, desde + filtros.limit),
    total: lista.length,
    totalPages: Math.max(1, Math.ceil(lista.length / filtros.limit)),
    categorias: [...new Set(productos.map(p => p.categoria).filter(Boolean))].sort(),
  };
});
