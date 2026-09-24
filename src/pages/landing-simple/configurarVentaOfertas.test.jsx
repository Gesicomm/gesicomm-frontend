import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Crear order bumps / upsells desde el paso "Configurar venta" de la
 * landing HTML. Recorre el flujo con los componentes REALES (el paso, el
 * panel lateral y el editor de ofertas de Productos); solo la API está
 * mockeada.
 *
 * El bug que motivó esto: "no deja crear ninguna oferta, no sale ningún
 * error". El modal del editor (.modal-overlay) se estilaba solo desde
 * courier.css, que se carga al entrar a Courier; sin eso el formulario
 * quedaba fuera de la vista y el botón parecía no hacer nada.
 */

const crear = vi.fn();
const listarPorProducto = vi.fn();
vi.mock('../../services/ofertaService', () => ({
  ofertaService: {
    listarPorProducto: (...a) => listarPorProducto(...a),
    crear: (...a) => crear(...a),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    listarTodas: vi.fn(),
  },
}));
vi.mock('../../services/productService', () => ({
  productService: {
    buscar: vi.fn().mockResolvedValue([{ id: 7, nombre: 'Air Fryer 3.2L', activo: true }, { id: 8, nombre: 'Canasto extra', activo: true }]),
    variantes: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { obtenerConfiguracion: vi.fn().mockResolvedValue(null) } }));
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1, rol: 'usuario' }) }));
vi.mock('../../services/api', () => ({ default: { get: vi.fn().mockResolvedValue({ data: [] }) }, getMediaUrl: u => u }));

const { default: ConfigurarVentaCodigo } = await import('./ConfigurarVentaCodigo');

const catalogo = {
  productos: [
    { id: 7, slug: 'air-fryer-32', nombre: 'Air Fryer 3.2L', categoria: 'Cocina', precio_efectivo: 297000, precio_costo: 180000 },
    { id: 8, slug: 'canasto', nombre: 'Canasto extra', categoria: 'Cocina', precio_efectivo: 90000 },
  ],
  combos: [],
};

beforeEach(() => {
  crear.mockReset().mockResolvedValue({ id: 55 });
  listarPorProducto.mockReset().mockResolvedValue([]);
});

describe('Configurar venta → crear una oferta', () => {
  it('abre el editor de ofertas del producto elegido, crea la oferta y recarga la lista', async () => {
    const cargarOfertas = vi.fn().mockResolvedValue([]);
    render(
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        inicial={{ venta: null, seleccion: [] }}
        onConfirmar={vi.fn()}
        onVolver={vi.fn()}
        cargarOfertas={cargarOfertas}
      />,
    );

    // Sin ofertas todavía: el estado vacío invita a crear la primera.
    fireEvent.click(await screen.findByRole('button', { name: /Crear una oferta/ }));

    // Panel lateral: primero se elige el producto de la oferta.
    const panel = screen.getByRole('dialog', { name: 'Ofertas' });
    fireEvent.click(within(panel).getByRole('button', { name: /Air Fryer 3\.2L/ }));

    // Se abre el editor de ofertas de Productos para ESE producto.
    await waitFor(() => expect(listarPorProducto).toHaveBeenCalledWith(7));
    fireEvent.click(await within(panel).findByRole('button', { name: /Nueva oferta/ }));

    // El formulario va en un portal a <body>, dentro de .modal-overlay.
    const modal = document.body.querySelector('.modal-overlay form');
    expect(modal).not.toBeNull();
    fireEvent.change(within(modal).getByPlaceholderText('Ej. Pack x3'), { target: { value: 'Pack x2' } });
    fireEvent.change(within(modal).getByPlaceholderText('Ej. EAR-X3'), { target: { value: 'af-x2' } });
    fireEvent.submit(modal);

    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    const [productoId, payload] = crear.mock.calls[0];
    expect(productoId).toBe(7);
    expect(payload).toEqual(expect.objectContaining({ nombre: 'Pack x2', codigo: 'AF-X2', activo: true }));
    // Guardada: el modal se cierra y el editor vuelve a pedir sus ofertas.
    await waitFor(() => expect(document.body.querySelector('.modal-overlay')).toBeNull());
    expect(listarPorProducto).toHaveBeenCalledTimes(2);

    // "Listo" cierra el panel y la sección vuelve a pedir las ofertas de la tienda.
    fireEvent.click(within(panel).getByRole('button', { name: /Listo/ }));
    await waitFor(() => expect(cargarOfertas).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog', { name: 'Ofertas' })).toBeNull();
  });

  it('Escape con el formulario abierto no cierra el panel (no se pierde lo cargado)', async () => {
    render(
      <ConfigurarVentaCodigo catalogo={catalogo} inicial={{}} onConfirmar={vi.fn()} onVolver={vi.fn()} cargarOfertas={vi.fn().mockResolvedValue([])} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Crear una oferta/ }));
    const panel = screen.getByRole('dialog', { name: 'Ofertas' });
    fireEvent.click(within(panel).getByRole('button', { name: /Air Fryer 3\.2L/ }));
    fireEvent.click(await within(panel).findByRole('button', { name: /Nueva oferta/ }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Ofertas' })).toBeInTheDocument();
  });

  it('el fondo del modal está en el CSS global, no en uno que se carga solo en Courier', () => {
    const global = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
    const courier = readFileSync(resolve(__dirname, '../courier/courier.css'), 'utf8');
    expect(global).toMatch(/\.modal-overlay\s*\{[^}]*position:\s*fixed[^}]*z-index:\s*1000/);
    expect(courier).not.toMatch(/^\.modal-overlay\s*\{/m);
  });
});

describe('Configurar venta → ofertas por producto', () => {
  const ofertas = [
    {
      id: 1, nombre: 'Sumá el canasto con 30% OFF', estrategia: 'order_bump', tipo_contenido: 'combo',
      precio_normal: 90000, precio_order_bump: 63000, producto_ancla_id: 7, producto_ancla: { nombre: 'Air Fryer 3.2L' },
      componentes: [{ producto_id: 8, cantidad: 1, producto: { nombre: 'Canasto extra' } }],
    },
    {
      id: 2, nombre: 'Otro producto ajeno', estrategia: 'upsell', tipo_contenido: 'pack',
      precio_normal: 50000, producto_ancla_id: 99, producto_ancla: { nombre: 'Producto de otra landing' },
      componentes: [{ producto_id: 99, cantidad: 2 }],
    },
  ];

  it('muestra a qué producto pertenece cada oferta y qué ofrece; las de otros productos quedan plegadas', async () => {
    const { ofertaCruzadaVisible } = await import('./datosRuntime');
    render(
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        inicial={{ venta: { configurado: true, seleccion: 'manual' }, seleccion: [{ ...catalogo.productos[0], tipo: 'producto' }] }}
        onConfirmar={vi.fn()}
        onVolver={vi.fn()}
        cargarOfertas={vi.fn().mockResolvedValue(ofertas)}
      />,
    );
    expect(await screen.findByText('Air Fryer 3.2L', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Ofrece: Canasto extra')).toBeInTheDocument();
    expect(screen.getByText('Order bump', { selector: 'span.font-medium' })).toBeInTheDocument();
    // La oferta de un producto que no está en la landing no aparece hasta desplegar.
    expect(screen.queryByText('Otro producto ajeno')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Ofertas de otros productos de tu tienda/ }));
    expect(screen.getByText('Ofrece: 2 unidades del mismo producto')).toBeInTheDocument();

    // Sin marcar, una landing configurada no muestra la oferta; marcada, sí.
    expect(ofertaCruzadaVisible(ofertas[0], { configurado: true, cross_sell: { activo: true, ofertas: [] } })).toBe(false);
    expect(ofertaCruzadaVisible(ofertas[0], { configurado: true, cross_sell: { activo: true, ofertas: [1] } })).toBe(true);
    expect(ofertaCruzadaVisible(ofertas[0], { configurado: true, cross_sell: { activo: false, ofertas: [1] } })).toBe(false);
    // Landing vieja, que nunca pasó por este paso: como antes, todas.
    expect(ofertaCruzadaVisible(ofertas[0], null)).toBe(true);
  });
});
