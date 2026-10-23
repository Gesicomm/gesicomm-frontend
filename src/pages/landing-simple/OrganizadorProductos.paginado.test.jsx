import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import OrganizadorProductos from './OrganizadorProductos';

/**
 * Categorías → "Organizar productos": con miles de productos la lista se
 * dibuja de a una página. Se protege que ningún producto quede fuera de
 * alcance: paginando, buscando o marcando todos.
 */
const productos = Array.from({ length: 25 }, (_, i) => ({
  tipo: 'producto',
  id: i + 1,
  content_id: `producto-${i + 1}`,
  nombre: `Producto ${String(i + 1).padStart(2, '0')}`,
  categoria: i < 20 ? 'Cocina' : 'Hogar',
  precio_efectivo: 10000 + i,
}));

function montar(extra = {}) {
  const props = {
    productos,
    enContador: [],
    onCategoria: vi.fn(),
    onAplicarOferta: vi.fn(),
    onLimpiar: vi.fn(),
    onColeccion: vi.fn(),
    onEditar: vi.fn(),
    ...extra,
  };
  render(<OrganizadorProductos {...props} />);
  return props;
}
const filas = () => within(screen.getByRole('list')).getAllByRole('listitem');
const nombres = () => filas().map(li => li.textContent.match(/Producto \d+/)[0]);

describe('OrganizadorProductos: lista paginada', () => {
  it('dibuja una página y recorre todas sin perder ni repetir productos', () => {
    montar();
    expect(filas()).toHaveLength(10);
    expect(screen.getByText('1–10 de 25')).toBeInTheDocument();
    const vistos = [...nombres()];
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    vistos.push(...nombres());
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(screen.getByText('21–25 de 25')).toBeInTheDocument();
    vistos.push(...nombres());
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
    expect(new Set(vistos).size).toBe(25);
    expect(vistos).toHaveLength(25);
  });

  it('la búsqueda encuentra productos de cualquier página y vuelve a la primera', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar productos' }), { target: { value: 'Producto 24' } });
    expect(nombres()).toEqual(['Producto 24']);
    expect(screen.getByText('1–1 de 1')).toBeInTheDocument();
  });

  it('la categoría filtra sobre la lista completa', () => {
    montar({ categoriaActiva: 'Hogar' });
    expect(nombres()).toEqual(['Producto 21', 'Producto 22', 'Producto 23', 'Producto 24', 'Producto 25']);
  });

  it('cambiar los productos por página los muestra todos juntos', () => {
    montar();
    fireEvent.change(screen.getByRole('combobox', { name: 'Productos por página' }), { target: { value: '50' } });
    expect(filas()).toHaveLength(25);
  });

  it('"marcar todos" marca los de todas las páginas, no solo los visibles', () => {
    montar();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar todos los productos de la lista' }));
    expect(screen.getByText('25 productos marcados')).toBeInTheDocument();
  });
});
