import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportadaChina from './ImportadaChina';
import { importadaChinaService } from '../../services/importadaChina.service';

vi.mock('../../services/importadaChina.service', () => ({ importadaChinaService: { solicitar: vi.fn() } }));
const ok = { ok: true, solicitud: { id: 40, estado: 'Pendiente de cotización' } };
const completar = () => {
  fireEvent.change(screen.getByLabelText(/Enlace del producto en Alibaba/), { target: { value: 'https://www.alibaba.com/product-detail/Test_123.html' } });
  fireEvent.change(screen.getByLabelText(/Cantidad de unidades/), { target: { value: '100' } });
};
beforeEach(() => { vi.clearAllMocks(); importadaChinaService.solicitar.mockResolvedValue(ok); });

test('envía todos los campos y solo confirma después de recibir un registro guardado', async () => {
  render(<ImportadaChina />);
  completar();
  fireEvent.change(screen.getByLabelText('Método de transporte preferido'), { target: { value: 'maritimo' } });
  fireEvent.change(screen.getByLabelText(/Observaciones adicionales/), { target: { value: 'Modelo azul' } });
  fireEvent.click(screen.getByRole('button', { name: /SOLICITAR MI PRESUPUESTO/ }));
  await screen.findByRole('status');
  expect(importadaChinaService.solicitar).toHaveBeenCalledWith(expect.objectContaining({ cantidad: 100, transporte: 'maritimo', observaciones: 'Modelo azul', clave_idempotencia: expect.any(String) }));
  expect(screen.getByRole('status')).toHaveTextContent('Solicitud #40 · Pendiente de cotización');
  expect(screen.getByLabelText(/Enlace del producto en Alibaba/)).toHaveValue('');
});

test('rechaza URL falsa de Alibaba y cantidades no enteras sin llamar al servidor', async () => {
  render(<ImportadaChina />);
  completar();
  fireEvent.change(screen.getByLabelText(/Enlace del producto en Alibaba/), { target: { value: 'https://alibaba.com.evil.example/producto' } });
  fireEvent.change(screen.getByLabelText(/Cantidad de unidades/), { target: { value: '1.5' } });
  fireEvent.click(screen.getByRole('button', { name: /SOLICITAR MI PRESUPUESTO/ }));
  expect(screen.getByLabelText(/Enlace del producto en Alibaba/)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText(/Cantidad de unidades/)).toHaveAttribute('aria-invalid', 'true');
  expect(importadaChinaService.solicitar).not.toHaveBeenCalled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('conserva los datos y la misma clave al reintentar una respuesta perdida', async () => {
  importadaChinaService.solicitar.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(ok);
  render(<ImportadaChina />);
  completar();
  fireEvent.click(screen.getByRole('button', { name: /SOLICITAR MI PRESUPUESTO/ }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Cantidad de unidades/)).toHaveValue(100);
  fireEvent.click(screen.getByRole('button', { name: /SOLICITAR MI PRESUPUESTO/ }));
  await screen.findByRole('status');
  const [primero, segundo] = importadaChinaService.solicitar.mock.calls.map(([datos]) => datos);
  expect(segundo).toEqual(primero);
});

test('impide el doble envío y no confirma mientras la escritura está pendiente', async () => {
  let terminar;
  importadaChinaService.solicitar.mockReturnValue(new Promise(resolve => { terminar = resolve; }));
  render(<ImportadaChina />);
  completar();
  const boton = screen.getByRole('button', { name: /SOLICITAR MI PRESUPUESTO/ });
  fireEvent.click(boton);
  fireEvent.click(boton);
  expect(importadaChinaService.solicitar).toHaveBeenCalledTimes(1);
  expect(boton).toBeDisabled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  terminar(ok);
  await screen.findByRole('status');
});

test('una respuesta sin solicitud guardada no produce confirmación', async () => {
  importadaChinaService.solicitar.mockResolvedValue({ ok: true });
  render(<ImportadaChina />);
  completar();
  fireEvent.click(screen.getByRole('button', { name: /SOLICITAR MI PRESUPUESTO/ }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Cantidad de unidades/)).toHaveValue(100);
});
