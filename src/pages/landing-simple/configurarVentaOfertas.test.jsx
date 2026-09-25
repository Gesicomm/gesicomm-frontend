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
    buscar: vi.fn().mockResolvedValue([
      { id: 7, nombre: 'Air Fryer 3.2L', activo: true, precio_base: 297000 },
      { id: 8, nombre: 'Canasto extra', activo: true, precio_base: 90000 },
    ]),
    variantes: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: {
  obtenerConfiguracion: vi.fn().mockResolvedValue(null),
  listar: vi.fn().mockResolvedValue([]),
  cambiarEstado: vi.fn().mockResolvedValue({}),
} }));
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
    fireEvent.click(await screen.findByRole('button', { name: /Crear primera oferta/ }));

    // Panel lateral: primero se elige el producto de la oferta.
    const panel = screen.getByRole('dialog', { name: 'Ofertas' });
    fireEvent.click(within(panel).getByRole('button', { name: /Air Fryer 3\.2L/ }));

    // Se abre el editor de ofertas de Productos para ESE producto.
    await waitFor(() => expect(listarPorProducto).toHaveBeenCalledWith(7));
    fireEvent.click(await within(panel).findByRole('button', { name: /Nueva oferta/ }));

    // El formulario va en un portal a <body>, dentro de .modal-overlay.
    const modal = document.body.querySelector('.modal-overlay form');
    expect(modal).not.toBeNull();
    fireEvent.change(within(modal).getByPlaceholderText('Ej. Llevá 2 y ahorrá'), { target: { value: 'Pack x2' } });
    // El código interno ya no es obligatorio: vacío, se genera solo.
    expect(within(modal).getByPlaceholderText('Se genera solo').value).toBe('');
    fireEvent.submit(modal);

    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    const [productoId, payload] = crear.mock.calls[0];
    expect(productoId).toBe(7);
    expect(payload).toEqual(expect.objectContaining({ nombre: 'Pack x2', activo: true }));
    expect(payload.codigo).toMatch(/^PACK-X2-[A-Z0-9]{1,4}$/);
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
    fireEvent.click(await screen.findByRole('button', { name: /Crear primera oferta/ }));
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

describe('Configurar venta → filtros de productos', () => {
  it('busca por proveedor y separa productos/combos Gesicom y propios', async () => {
    const catalogoFiltros = {
      productos: [
        { id: 70, slug: 'global', nombre: 'Producto global', categoria: 'Cápsulas', proveedor: 'NaturalCaps', creado_por: null, precio_efectivo: 100000 },
        { id: 71, slug: 'propio', nombre: 'Producto propio', categoria: 'Cocina', proveedor: 'Proveedor Propio', creado_por: 1, precio_efectivo: 200000 },
      ],
      combos: [
        { id: 80, slug: 'combo-global', nombre: 'Combo global', proveedor: 'NaturalCaps', creado_por: null, precio_efectivo: 300000 },
        { id: 81, slug: 'combo-propio', nombre: 'Combo propio', proveedor: 'Proveedor Propio', creado_por: 1, precio_efectivo: 400000 },
      ],
    };

    render(
      <ConfigurarVentaCodigo
        catalogo={catalogoFiltros}
        inicial={{ venta: null, seleccion: [] }}
        onConfirmar={vi.fn()}
        onVolver={vi.fn()}
        cargarOfertas={vi.fn().mockResolvedValue([])}
      />,
    );

    const filtro = await screen.findByLabelText('Tipo');
    expect(Array.from(filtro.options).map(o => o.textContent)).toEqual([
      'Productos Gesicom',
      'Mis productos',
      'Combos Gesicom',
      'Mis combos',
      'Todos',
    ]);
    expect(filtro).toHaveValue('producto_gesicom');

    await waitFor(() => expect(screen.getByText('Producto global')).toBeInTheDocument());
    expect(screen.queryByText('Producto propio')).toBeNull();

    fireEvent.change(screen.getByLabelText('Buscar productos'), { target: { value: 'naturalcaps' } });
    expect(screen.getByText('Producto global')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar productos'), { target: { value: '' } });
    fireEvent.change(filtro, { target: { value: 'producto_mio' } });
    await waitFor(() => expect(screen.getByText('Producto propio')).toBeInTheDocument());
    expect(screen.queryByText('Producto global')).toBeNull();

    fireEvent.change(filtro, { target: { value: 'combo_mio' } });
    await waitFor(() => expect(screen.getByText('Combo propio')).toBeInTheDocument());

    fireEvent.change(filtro, { target: { value: 'todos' } });
    await waitFor(() => expect(screen.getByText('Combo global')).toBeInTheDocument());
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
    fireEvent.click(screen.getByRole('button', { name: /Minimizar/ }));
    expect(screen.queryByText('Ofrece: Canasto extra')).toBeNull();
    expect(screen.getByText('1 oferta · 0 activas en esta landing')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Expandir/ }));
    expect(screen.getByText('Ofrece: Canasto extra')).toBeInTheDocument();
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

describe('Formulario de oferta por pasos', () => {
  it('order bump: el precio se completa con el precio de venta de lo elegido y sugiere el de oferta', async () => {
    render(
      <ConfigurarVentaCodigo catalogo={catalogo} inicial={{}} onConfirmar={vi.fn()} onVolver={vi.fn()} cargarOfertas={vi.fn().mockResolvedValue([])} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Crear primera oferta/ }));
    const panel = screen.getByRole('dialog', { name: 'Ofertas' });
    fireEvent.click(within(panel).getByRole('button', { name: /Air Fryer 3\.2L/ }));
    fireEvent.click(await within(panel).findByRole('button', { name: /Nueva oferta/ }));
    const modal = document.body.querySelector('.modal-overlay form');

    // Lo primero: el tipo de oferta, en tarjetas explicadas.
    fireEvent.click(within(modal).getByRole('radio', { name: /Order bump/ }));
    expect(within(modal).getByText('¿Qué se suma a la compra?')).toBeInTheDocument();
    // Ya no hay dos botones para elegir productos.
    expect(within(modal).queryByRole('button', { name: /Agregar producto/ })).toBeNull();
    // Y la ayuda del precio espera a que se elija el producto.
    expect(within(modal).getByText('Elegí arriba qué se suma y lo completamos con su precio de venta.')).toBeInTheDocument();

    // Elegir el canasto → el precio sin descuento sale de su precio de venta.
    fireEvent.click(within(modal).getByRole('button', { name: /Elegir productos/ }));
    const tarjetas = await screen.findAllByText('Canasto extra', { selector: '*:not(option)' });
    fireEvent.click(tarjetas[tarjetas.length - 1]);
    const ayudaPrecio = () => within(modal).getByText((_, el) => el?.tagName === 'P' && /Lo completamos con el precio de venta/.test(el.textContent));
    await waitFor(() => expect(ayudaPrecio().textContent).toMatch(/90\.000/));
    // Y sugiere el precio de oferta: 30% menos.
    expect(within(modal).getByRole('button', { name: /Usar 30% menos/ }).textContent).toMatch(/63\.000/);
  });
});

describe('Configurar venta → combos que no aparecen', () => {
  it('avisa del combo en borrador y al activarlo recarga el catálogo', async () => {
    const { comboAdminService } = await import('../../services/comboAdminService');
    comboAdminService.listar
      .mockResolvedValueOnce([{ id: 3, nombre: 'Kit cocina completa', estado: 'BORRADOR' }])
      .mockResolvedValueOnce([{ id: 3, nombre: 'Kit cocina completa', estado: 'ACTIVO' }]);
    const onRecargarCatalogo = vi.fn().mockResolvedValue();
    render(
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        inicial={{ venta: null, seleccion: [] }}
        onConfirmar={vi.fn()}
        onVolver={vi.fn()}
        cargarOfertas={vi.fn().mockResolvedValue([])}
        onRecargarCatalogo={onRecargarCatalogo}
      />,
    );

    expect(await screen.findByText('Tenés 1 combo que no aparece acá')).toBeInTheDocument();
    expect(screen.getByText('Borrador: nunca se activó')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }));
    await waitFor(() => expect(comboAdminService.cambiarEstado).toHaveBeenCalledWith(3, 'ACTIVO'));
    expect(onRecargarCatalogo).toHaveBeenCalled();
  });
});

describe('Configurar venta → crear desde el armador', () => {
  it('"Nueva oferta" pide qué producto editar antes de crear', async () => {
    render(
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        inicial={{ venta: null, seleccion: [] }}
        onConfirmar={vi.fn()}
        onVolver={vi.fn()}
        cargarOfertas={vi.fn().mockResolvedValue([])}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Nueva oferta$/i }));

    const panel = screen.getByRole('dialog', { name: 'Ofertas' });
    expect(within(panel).getByText('Elegí el producto a editar')).toBeInTheDocument();
    expect(within(panel).getByText('Elegí qué producto querés editar. Las ofertas se muestran cuando el cliente compra ese producto.')).toBeInTheDocument();
    expect(within(panel).queryByText('¿Qué querés sumar?')).toBeNull();

    fireEvent.click(within(panel).getByRole('button', { name: /Air Fryer 3\.2L/ }));
    await waitFor(() => expect(listarPorProducto).toHaveBeenCalledWith(7));
    await waitFor(() => expect(within(panel).getAllByText(/Ofertas de Air Fryer 3\.2L/).length).toBeGreaterThan(0));
  });

  it('los accesos por tipo explican la oferta y abren directo el formulario correspondiente', async () => {
    render(
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        inicial={{ venta: null, seleccion: [] }}
        onConfirmar={vi.fn()}
        onVolver={vi.fn()}
        cargarOfertas={vi.fn().mockResolvedValue([])}
      />,
    );

    expect(await screen.findByText('Crear directo')).toBeInTheDocument();
    expect(screen.getByText('Varias unidades del mismo producto')).toBeInTheDocument();
    expect(screen.getByText('Extra durante la compra')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Order bump/ }));

    const panel = screen.getByRole('dialog', { name: 'Ofertas' });
    expect(within(panel).getByText('Crear Order bump: elegí el producto')).toBeInTheDocument();
    expect(within(panel).getByText('Elegí el producto principal donde se va a mostrar el order bump.')).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: /Air Fryer 3\.2L/ }));
    await waitFor(() => expect(listarPorProducto).toHaveBeenCalledWith(7));

    const modal = await waitFor(() => {
      const form = document.body.querySelector('.modal-overlay form');
      expect(form).not.toBeNull();
      return form;
    });
    expect(within(modal).getByRole('radio', { name: /Order bump/ })).toHaveAttribute('aria-checked', 'true');
    expect(within(modal).getByText('¿Qué se suma a la compra?')).toBeInTheDocument();
  });

  it('aunque haya un solo producto, un acceso por tipo pide confirmar a qué producto corresponde', async () => {
    render(
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        inicial={{ venta: null, seleccion: [{ ...catalogo.productos[0], tipo: 'producto' }] }}
        onConfirmar={vi.fn()}
        onVolver={vi.fn()}
        cargarOfertas={vi.fn().mockResolvedValue([])}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Order bump/ }));

    const panel = screen.getByRole('dialog', { name: 'Ofertas' });
    expect(within(panel).getByText('Crear Order bump: elegí el producto')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /Air Fryer 3\.2L/ })).toBeInTheDocument();
    expect(document.body.querySelector('.modal-overlay')).toBeNull();
  });
});

describe('Configurar venta → dónde entra el cliente', () => {
  it('"Directo en un producto" guarda abrir_en y el producto principal', async () => {
    const onConfirmar = vi.fn();
    render(
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        inicial={{ venta: null, seleccion: [{ ...catalogo.productos[0], tipo: 'producto' }] }}
        onConfirmar={onConfirmar}
        onVolver={vi.fn()}
        cargarOfertas={vi.fn().mockResolvedValue([])}
      />,
    );
    expect(screen.queryByText('Producto estrella')).toBeNull();
    fireEvent.click(await screen.findByRole('radio', { name: /Directo en un producto/ }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar y armar el diseño/ }));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalled());
    const { venta } = onConfirmar.mock.calls[0][0];
    expect(venta).toMatchObject({ abrir_en: 'producto', tipo: 'producto_unico', principal_id: 7, combos_primero: false });
  });

  it('"Mostrar los combos primero" es una casilla de la tienda', async () => {
    const onConfirmar = vi.fn();
    render(
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        inicial={{ venta: null, seleccion: [{ ...catalogo.productos[0], tipo: 'producto' }] }}
        onConfirmar={onConfirmar}
        onVolver={vi.fn()}
        cargarOfertas={vi.fn().mockResolvedValue([])}
      />,
    );
    fireEvent.click(await screen.findByLabelText(/Mostrar los combos primero/));
    fireEvent.click(screen.getByRole('button', { name: /Guardar y armar el diseño/ }));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalled());
    expect(onConfirmar.mock.calls[0][0].venta).toMatchObject({ abrir_en: 'tienda', combos_primero: true, tipo: 'combos' });
  });
});
