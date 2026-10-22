import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { CourierWizard } from './CourierWizard';
import { getCourierGeografia } from '../../services/courierApi';

vi.mock('../../services/courierApi', () => ({ getCourierGeografia: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  getCourierGeografia.mockResolvedValue([{ id: 1, nombre: 'Central', ciudades: [{ id: 10, nombre: 'Luque' }] }]);
});

test('no permite continuar sin ciudades y no escribe datos antes del resumen', async () => {
  const onGuardar = vi.fn();
  render(<CourierWizard open onClose={vi.fn()} onGuardar={onGuardar} />);
  fireEvent.change(screen.getByLabelText('Nombre del courier o empresa'), { target: { value: 'Propio' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar con ciudades' }));
  await screen.findByRole('button', { name: 'Luque', exact: true });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar', exact: true }));
  expect(screen.getByRole('alert')).toHaveTextContent('Agregá al menos una ciudad');
  expect(onGuardar).not.toHaveBeenCalled();
});

test('la edición conserva el ID del courier y sus rangos ya configurados', async () => {
  const onGuardar = vi.fn().mockResolvedValue();
  render(<CourierWizard open pasoInicial="resumen" courier={{ id: 8, nombre: 'Propio', vehiculo: 'Auto', activo: false }} reglas={[{ ciudad: 'Luque', departamento: 'Central', ciudad_id: 10, rango_min: 0, rango_max: null, costo: 25000, tipo_pago: 'Al Recibir', tiempo_entrega_hs: '24 hs', activo: true }]} onClose={vi.fn()} onGuardar={onGuardar} />);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar courier y ciudades' }));
  await waitFor(() => expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ courier: expect.objectContaining({ id: 8, nombre: 'Propio', activo: false }), reglas: [expect.objectContaining({ ciudad_id: 10, costo: 25000, rango_min: 0, rango_max: '', tipo_pago: 'Al Recibir' })] })));
});

test('cerrar sin modificaciones no pregunta y descartar cambios requiere una acción explícita', () => {
  const onClose = vi.fn();
  render(<CourierWizard open onClose={onClose} onGuardar={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('Nombre del courier o empresa'), { target: { value: 'PAP' } });
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Descartar y cerrar' }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('el alta con depósito mantiene sus cuatro pasos y marca el paso actual', () => {
  render(<CourierWizard open conDeposito onClose={vi.fn()} onGuardar={vi.fn()} />);
  const nav = screen.getByRole('navigation', { name: 'Pasos de configuración' });
  expect(within(nav).getAllByRole('button')).toHaveLength(4);
  expect(within(nav).getByRole('button', { name: '1 Depósito' })).toHaveAttribute('aria-current', 'step');
  expect(within(nav).getByRole('button', { name: '2 Courier' })).toBeDisabled();
});
