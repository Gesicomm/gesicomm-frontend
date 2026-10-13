import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import DepositosPage from './DepositosPage';
import { depositoService } from '../../services/deposito.service';
import * as courierApi from '../../services/courierApi';
import { productService } from '../../services/productService';
import { categoriaService } from '../../services/catalogoService';
import { solicitudAbastecimientoService } from '../../services/solicitudAbastecimiento.service';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../hooks/useSesion', () => ({ default: () => ({ estado: 'autenticado', usuario: { rol: 'usuario' } }) }));
vi.mock('../../components/depositos/FulfillmentCard', () => ({ default: () => null }));
vi.mock('../../services/deposito.service', () => ({
  depositoService: {
    listarDepositos: vi.fn(),
    crearDeposito: vi.fn(),
    actualizarDeposito: vi.fn(),
    cambiarEstadoDeposito: vi.fn(),
    eliminarDeposito: vi.fn(),
    listarCouriersDeposito: vi.fn(),
    guardarCouriersDeposito: vi.fn(),
  },
}));
vi.mock('../../services/productService', () => ({
  productService: {
    buscar: vi.fn(),
    variantes: vi.fn(),
  },
}));
vi.mock('../../services/catalogoService', () => ({
  categoriaService: {
    buscar: vi.fn(),
  },
}));
vi.mock('../../services/solicitudAbastecimiento.service', () => ({
  solicitudAbastecimientoService: {
    crear: vi.fn(),
  },
}));
vi.mock('../../services/courierApi', () => ({
  getCouriers: vi.fn(),
  getDeliveryZonas: vi.fn(),
  replaceDeliveryZonas: vi.fn(),
  createCourier: vi.fn(),
  updateCourier: vi.fn(),
  deleteCourier: vi.fn(),
  createCourierAccess: vi.fn(),
  changeCourierAccessPassword: vi.fn(),
  updateCourierAccessStatus: vi.fn(),
  getCourierGeografia: vi.fn(),
}));

const GEOGRAFIA = [{ id: 1, pais_id: 1, nombre: 'Central', ciudades: [{ id: 10, nombre: 'Luque' }, { id: 11, nombre: 'Lambaré' }] }];

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  depositoService.listarDepositos.mockResolvedValue({ data: [], total: 0 });
  depositoService.crearDeposito.mockResolvedValue({ id: 50, nombre: 'Depósito Luque' });
  depositoService.actualizarDeposito.mockResolvedValue({ id: 50 });
  depositoService.guardarCouriersDeposito.mockResolvedValue({});
  courierApi.getCouriers.mockResolvedValue([]);
  courierApi.getDeliveryZonas.mockResolvedValue([]);
  courierApi.getCourierGeografia.mockResolvedValue(GEOGRAFIA);
  courierApi.createCourier.mockResolvedValue({ id: 7, nombre: 'Moto Express', activo: true });
  courierApi.updateCourier.mockResolvedValue({ id: 7, nombre: 'Moto Express', activo: true });
  courierApi.replaceDeliveryZonas.mockResolvedValue([]);
  categoriaService.buscar.mockResolvedValue({ categorias: [{ id: 4, nombre: 'Electro' }] });
  productService.buscar.mockResolvedValue({ productos: [], total: 0, total_paginas: 0 });
  productService.variantes.mockResolvedValue([]);
  solicitudAbastecimientoService.crear.mockResolvedValue({ id: 99 });
});

async function abrirFormularioDeposito() {
  render(<DepositosPage />);
  fireEvent.click(await screen.findByRole('button', { name: /Agregar depósito/ }));
  expect(await screen.findByRole('heading', { name: 'Nuevo depósito' })).toBeInTheDocument();
}

async function completarDeposito() {
  fireEvent.change(screen.getByPlaceholderText('Ej: Depósito Central Luque'), { target: { value: 'Depósito Luque' } });
  fireEvent.change(screen.getByPlaceholderText('Calle, número, barrio'), { target: { value: 'Av. Test 123' } });
  // Ciudad: el segundo combo (el primero es departamento). Se escribe y se
  // confirma la opción del catálogo, que además completa el departamento.
  const ciudad = screen.getAllByRole('combobox')[2];
  await waitFor(() => expect(courierApi.getCourierGeografia).toHaveBeenCalled());
  fireEvent.change(ciudad, { target: { value: 'Luque' } });
  fireEvent.keyDown(ciudad, { key: 'Enter', code: 'Enter' });
}

describe('Depósitos: alta simple', () => {
  it('abre solo el formulario del depósito, sin pedir courier en el alta', async () => {
    await abrirFormularioDeposito();
    expect(screen.queryByText(/Tipo de ubicación/)).toBeNull();
    expect(screen.queryByText(/Salón/)).toBeNull();
    expect(screen.queryByText('Datos del courier')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continuar con el courier/ })).toBeNull();
  });

  it('no guarda si faltan los datos obligatorios del depósito', async () => {
    await abrirFormularioDeposito();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar depósito' }));
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La ciudad es obligatoria')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuevo depósito' })).toBeInTheDocument();
  });

  it('guarda únicamente el depósito y luego permite asignar couriers desde el detalle', async () => {
    await abrirFormularioDeposito();
    await completarDeposito();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar depósito' }));

    await waitFor(() => expect(depositoService.crearDeposito).toHaveBeenCalledTimes(1));
    expect(depositoService.crearDeposito).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Depósito Luque', ciudad: 'Luque', departamento: 'Central', direccion: 'Av. Test 123', tipoUbicacion: 'DEPOSITO',
    }));
    expect(courierApi.createCourier).not.toHaveBeenCalled();
    expect(courierApi.replaceDeliveryZonas).not.toHaveBeenCalled();
    expect(depositoService.guardarCouriersDeposito).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Nuevo depósito' })).toBeNull());
    expect(depositoService.listarDepositos.mock.calls.length).toBeGreaterThan(1);
  });

  it('si el depósito no tiene couriers disponibles, guía a crear el primer courier', async () => {
    depositoService.listarDepositos.mockResolvedValue({
      data: [{ id: 50, nombre: 'Depósito Luque', ciudad: 'Luque', departamento: 'Central', direccion: 'Av. Test 123', activo: true }],
      total: 1,
    });
    depositoService.listarCouriersDeposito.mockResolvedValue({ couriers: [] });

    render(<DepositosPage />);

    expect((await screen.findAllByText('Depósito Luque')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Administrar/ }));

    expect(await screen.findByText('Primero cargá tus couriers')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Crear courier' }));
    expect(await screen.findByText('Nuevo courier')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Datos del courier' })).toBeInTheDocument();
  });

  it('permite abastecer un depósito con productos de catálogo RAHA', async () => {
    depositoService.listarDepositos.mockResolvedValue({
      data: [{ id: 50, nombre: 'Depósito Luque', ciudad: 'Luque', departamento: 'Central', direccion: 'Av. Test 123', activo: true }],
      total: 1,
    });
    depositoService.listarCouriersDeposito.mockResolvedValue({ couriers: [] });
    productService.buscar.mockResolvedValue({
      productos: [{
        id: 80,
        nombre: 'Air Fryer RAHA',
        sku: 'RAHA-80',
        categoria_id: 4,
        precio_base: 227899,
        variantes_count: 0,
        puede_editar: false,
        imagenes: [{ url: '/uploads/air-fryer.jpg' }],
      }],
      total: 1,
      total_paginas: 1,
    });

    render(<DepositosPage />);

    expect((await screen.findAllByText('Depósito Luque')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Administrar/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Abastecer depósito' }));

    await screen.findByText('Producto de catálogo RAHA');
    expect(await screen.findByAltText('Air Fryer RAHA')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: '4' } });
    await waitFor(() => expect(productService.buscar).toHaveBeenCalledWith(expect.objectContaining({
      catalogo_raha: true,
      categoria_id: 4,
      page: 1,
      limit: 20,
    })));
    fireEvent.click(await screen.findByRole('button', { name: /Air Fryer RAHA/ }));
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar al pedido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear pedido' }));

    await waitFor(() => expect(solicitudAbastecimientoService.crear).toHaveBeenCalledWith({
      producto_id: 80,
      variante_id: null,
      cantidad: 3,
      tipoLogistica: 'PROPIA',
      depositoId: 50,
    }));
  });

  it('pagina el catálogo RAHA completo sin recortarlo en el frontend', async () => {
    depositoService.listarDepositos.mockResolvedValue({
      data: [{ id: 50, nombre: 'Depósito Luque', ciudad: 'Luque', departamento: 'Central', direccion: 'Av. Test 123', activo: true }],
      total: 1,
    });
    depositoService.listarCouriersDeposito.mockResolvedValue({ couriers: [] });
    productService.buscar
      .mockResolvedValueOnce({
        productos: [{
          id: 80,
          nombre: 'Producto RAHA página 1',
          sku: 'RAHA-80',
          categoria_id: 4,
          precio_base: 100000,
          variantes_count: 0,
          imagenes: [{ url: '/uploads/p1.jpg' }],
        }],
        total: 25,
        total_paginas: 2,
      })
      .mockResolvedValueOnce({
        productos: [{
          id: 81,
          nombre: 'Producto RAHA página 2',
          sku: 'RAHA-81',
          categoria_id: 4,
          precio_base: 120000,
          variantes_count: 0,
          imagenes: [{ url: '/uploads/p2.jpg' }],
        }],
        total: 25,
        total_paginas: 2,
      });

    render(<DepositosPage />);

    expect((await screen.findAllByText('Depósito Luque')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Administrar/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Abastecer depósito' }));

    expect(await screen.findByText('Producto RAHA página 1')).toBeInTheDocument();
    expect(screen.getByText('25 productos · página 1 de 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));

    await waitFor(() => expect(productService.buscar).toHaveBeenLastCalledWith(expect.objectContaining({
      catalogo_raha: true,
      page: 2,
      limit: 20,
    })));
    expect(await screen.findByText('Producto RAHA página 2')).toBeInTheDocument();
  });
});

describe('Depósitos: gestión de couriers', () => {
  it('ya no incrusta el administrador global de couriers debajo del listado', async () => {
    courierApi.getCouriers.mockResolvedValue([{ id: 1, nombre: 'Propio', vehiculo: 'Moto', activo: true }]);
    courierApi.getDeliveryZonas.mockResolvedValue([
      { id: 10, departamento: 'Central', ciudad: 'Luque', courier_id: 1, tipo_pago: 'Ambos', rango_min: 1, rango_max: null, costo: 25000, tiempo_entrega_hs: 'En el día', activo: true },
    ]);
    render(<DepositosPage />);

    expect(screen.queryByRole('heading', { name: /Couriers/ })).toBeNull();
    expect(screen.queryByText(/Configuración avanzada de couriers/)).toBeNull();
    expect(screen.getByRole('button', { name: /Catálogo de couriers/ })).toBeInTheDocument();
    expect(screen.queryByText(/envíos? en el rango/)).toBeNull();
  });
});
