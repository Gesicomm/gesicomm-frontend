import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import DepositosPage from './DepositosPage';
import { depositoService } from '../../services/deposito.service';
import * as courierApi from '../../services/courierApi';

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
});

async function abrirAsistente() {
  render(<DepositosPage />);
  fireEvent.click(await screen.findByRole('button', { name: /Agregar depósito/ }));
  expect(await screen.findByText('Datos del depósito')).toBeInTheDocument();
}

async function completarDeposito() {
  fireEvent.change(screen.getByPlaceholderText('Ej: Depósito Central Luque'), { target: { value: 'Depósito Luque' } });
  fireEvent.change(screen.getByPlaceholderText('Calle, número, barrio'), { target: { value: 'Av. Test 123' } });
  // Ciudad: el segundo combo (el primero es departamento). Se escribe y se
  // confirma la opción del catálogo, que además completa el departamento.
  const ciudad = within(screen.getByRole('dialog')).getAllByRole('combobox')[1];
  await waitFor(() => expect(courierApi.getCourierGeografia).toHaveBeenCalled());
  fireEvent.change(ciudad, { target: { value: 'Luque' } });
  fireEvent.keyDown(ciudad, { key: 'Enter', code: 'Enter' });
}

describe('Depósitos: alta por pasos', () => {
  it('ya no pide elegir entre depósito y salón', async () => {
    await abrirAsistente();
    expect(screen.queryByText(/Tipo de ubicación/)).toBeNull();
    expect(screen.queryByText(/Salón/)).toBeNull();
  });

  it('los pasos son Depósito, Courier, Ciudades y Resumen, en ese orden', async () => {
    await abrirAsistente();
    const pasos = screen.getAllByRole('button', { name: /^\d/ }).map(b => b.textContent);
    expect(pasos).toEqual(['1Depósito', '2Courier', '3Ciudades', '4Resumen']);
  });

  it('no avanza al courier si faltan los datos obligatorios del depósito', async () => {
    await abrirAsistente();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con el courier' }));
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La ciudad es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('Datos del depósito')).toBeInTheDocument();
  });

  it('guarda el depósito, el courier, sus ciudades y los deja vinculados', async () => {
    await abrirAsistente();
    await completarDeposito();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con el courier' }));

    expect(await screen.findByText('Datos del courier')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Ej. Propio, TSI, PAP...'), { target: { value: 'Moto Express' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con ciudades' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Lambaré' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));

    // Resumen: el depósito y el courier, juntos.
    expect(await screen.findByText('Revisar y guardar')).toBeInTheDocument();
    expect(screen.getByText('Depósito Luque')).toBeInTheDocument();
    expect(screen.getByText('Moto Express')).toBeInTheDocument();
    expect(screen.getByText('Lambaré, Central')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar depósito y courier' }));

    await waitFor(() => expect(depositoService.guardarCouriersDeposito).toHaveBeenCalledWith(50, [7]));
    expect(depositoService.crearDeposito).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Depósito Luque', ciudad: 'Luque', departamento: 'Central', direccion: 'Av. Test 123', tipoUbicacion: 'DEPOSITO',
    }));
    expect(courierApi.createCourier).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Moto Express' }));
    const [zonas, alcance] = courierApi.replaceDeliveryZonas.mock.calls[0];
    expect(alcance).toEqual([7]);
    expect(zonas).toEqual([expect.objectContaining({ ciudad: 'Lambaré', departamento: 'Central', courier_id: '7' })]);
    // El asistente se cierra y la lista se vuelve a pedir.
    await waitFor(() => expect(screen.queryByText('Revisar y guardar')).toBeNull());
    expect(depositoService.listarDepositos.mock.calls.length).toBeGreaterThan(1);
  });

  it('permite guardar solo el depósito cuando todavía no hay courier', async () => {
    await abrirAsistente();
    await completarDeposito();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con el courier' }));

    fireEvent.click(await screen.findByLabelText(/Todavía no tengo courier/));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar depósito' }));

    await waitFor(() => expect(depositoService.crearDeposito).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Revisar y guardar')).toBeNull());
    expect(courierApi.createCourier).not.toHaveBeenCalled();
    expect(courierApi.replaceDeliveryZonas).not.toHaveBeenCalled();
    expect(depositoService.guardarCouriersDeposito).not.toHaveBeenCalled();
  });

  it('si falla el courier, reintentar no duplica el depósito', async () => {
    courierApi.createCourier.mockRejectedValueOnce(new Error('caído'));
    await abrirAsistente();
    await completarDeposito();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con el courier' }));
    fireEvent.change(await screen.findByPlaceholderText('Ej. Propio, TSI, PAP...'), { target: { value: 'Moto Express' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con ciudades' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Lambaré' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar depósito y courier' }));

    expect(await screen.findByText(/El depósito ya quedó guardado/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar depósito y courier' }));
    await waitFor(() => expect(depositoService.guardarCouriersDeposito).toHaveBeenCalledWith(50, [7]));
    expect(depositoService.crearDeposito).toHaveBeenCalledTimes(1);
    expect(depositoService.actualizarDeposito).toHaveBeenCalledWith(50, expect.objectContaining({ nombre: 'Depósito Luque' }));
    expect(courierApi.createCourier).toHaveBeenCalledTimes(2);
  });
});

describe('Depósitos: couriers en la misma pantalla', () => {
  it('muestra la sección Couriers con los couriers del comercio', async () => {
    courierApi.getCouriers.mockResolvedValue([{ id: 1, nombre: 'Propio', vehiculo: 'Moto', activo: true }]);
    courierApi.getDeliveryZonas.mockResolvedValue([
      { id: 10, departamento: 'Central', ciudad: 'Luque', courier_id: 1, tipo_pago: 'Ambos', rango_min: 1, rango_max: null, costo: 25000, tiempo_entrega_hs: 'En el día', activo: true },
    ]);
    render(<DepositosPage />);

    expect(await screen.findByRole('heading', { name: /Couriers/ })).toBeInTheDocument();
    expect(await screen.findByText('Propio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo courier/ })).toBeInTheDocument();
    // En Depósitos no hay pedidos cargados: no se inventa un contador de envíos.
    expect(screen.queryByText(/envíos? en el rango/)).toBeNull();
  });
});
