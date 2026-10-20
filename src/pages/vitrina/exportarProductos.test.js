import { describe, test, expect, vi, beforeEach } from 'vitest';
import { exportarProductosCsv } from './exportarProductos';
import { vitrinaService } from '../../services/vitrinaService';

vi.mock('../../services/vitrinaService', () => ({
  vitrinaService: { buscarPrecios: vi.fn() },
}));

function filaMock(n) {
  return {
    tipo: 'producto', id: n, sku: `SKU-${n}`, nombre: `Producto ${n}`,
    proveedor: 'Proveedor Uno', costo: 1000 * n, precio_actual: 2000 * n,
    descripcion: n === 2 ? 'Con, coma y "comillas"' : `Descripción ${n}`,
    imagenes: [`https://img/${n}-a.jpg`, `https://img/${n}-b.jpg`],
  };
}

let capturado;
beforeEach(() => {
  vi.clearAllMocks();
  capturado = null;
  global.URL.createObjectURL = vi.fn((blob) => { capturado = blob; return 'blob:mock'; });
  global.URL.revokeObjectURL = vi.fn();
});

test('pide detalle:true, 500 por página, y sigue pidiendo hasta juntar todas las filas', async () => {
  const pagina1 = Array.from({ length: 500 }, (_, i) => filaMock(i + 1));
  const pagina2 = Array.from({ length: 150 }, (_, i) => filaMock(500 + i + 1));
  vitrinaService.buscarPrecios
    .mockResolvedValueOnce({ items: pagina1, total: 650 })
    .mockResolvedValueOnce({ items: pagina2, total: 650 });

  const progreso = [];
  const total = await exportarProductosCsv(
    { filtro: 'todos', busqueda: '', categoria: '', proveedor: '', orden: 'nombre' },
    [],
    (cargado, t) => progreso.push([cargado, t])
  );

  expect(total).toBe(650);
  expect(vitrinaService.buscarPrecios).toHaveBeenCalledTimes(2);
  expect(vitrinaService.buscarPrecios).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1, limit: 500, detalle: true, tipo: '', origen: '' }));
  expect(vitrinaService.buscarPrecios).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2, limit: 500, detalle: true }));
  expect(progreso).toEqual([[500, 650], [650, 650]]);
  expect(capturado).toBeInstanceOf(Blob);
});

test('pide varias páginas en simultáneo (no una por una) cuando hay muchas', async () => {
  const pagina = (n) => Array.from({ length: 500 }, (_, i) => filaMock(n * 500 + i + 1));
  vitrinaService.buscarPrecios.mockImplementation(async ({ page }) => {
    if (page === 1) return { items: pagina(0), total: 2000 };
    return { items: pagina(page - 1), total: 2000 };
  });

  const total = await exportarProductosCsv({ filtro: 'todos' }, [], () => {});

  expect(total).toBe(2000);
  // 4 páginas en total: la 1ª sola, y 2ª-4ª a lo sumo con 3 a la vez.
  expect(vitrinaService.buscarPrecios).toHaveBeenCalledTimes(4);
});

test('con seleccionados, filtra por items en vez de por los filtros de la grilla', async () => {
  vitrinaService.buscarPrecios.mockResolvedValueOnce({ items: [filaMock(1)], total: 1 });

  await exportarProductosCsv(
    { filtro: 'mios', busqueda: 'algo', categoria: 'Cat', proveedor: 'Prov', orden: 'nombre' },
    [{ tipo: 'producto', id: 1 }],
    () => {}
  );

  expect(vitrinaService.buscarPrecios).toHaveBeenCalledWith(expect.objectContaining({
    items: [{ tipo: 'producto', id: 1 }],
  }));
  const llamada = vitrinaService.buscarPrecios.mock.calls[0][0];
  expect(llamada.busqueda).toBeUndefined();
  expect(llamada.categoria).toBeUndefined();
});

test('escapa comas, comillas y usa | para separar imágenes', async () => {
  vitrinaService.buscarPrecios.mockResolvedValueOnce({ items: [filaMock(2)], total: 1 });

  await exportarProductosCsv({ filtro: 'todos' }, [], () => {});

  const texto = await capturado.text();
  expect(texto).toContain('"Con, coma y ""comillas"""');
  expect(texto).toContain('https://img/2-a.jpg | https://img/2-b.jpg');
  expect(texto.replace(/^﻿/, '')).toMatch(/^SKU,Nombre,Proveedor,Costo de compra,Precio de venta,Descripción,Imágenes/);
});

test('mapea el filtro de tipo "producto" al vocabulario de /precios/buscar', async () => {
  vitrinaService.buscarPrecios.mockResolvedValueOnce({ items: [], total: 0 });
  await exportarProductosCsv({ filtro: 'mis-combos' }, [], () => {});
  expect(vitrinaService.buscarPrecios).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'combo', origen: 'propios' }));
});
