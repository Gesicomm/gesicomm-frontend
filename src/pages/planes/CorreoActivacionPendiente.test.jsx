import { useState } from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CorreoActivacionPendiente from './CorreoActivacionPendiente';
import { planesService } from '../../services/planesService';
vi.mock('../../services/planesService', () => ({ planesService: { reenviarActivacion: vi.fn(), corregirCorreoActivacion: vi.fn() } }));
function Pantalla() {
  const [cuenta, setCuenta] = useState({ email: 'mal@example.com', token_registro: 'token-anterior' });
  return <CorreoActivacionPendiente email={cuenta.email} token={cuenta.token_registro} onActualizar={setCuenta} />;
}
beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);
it('avisa dónde llegará la verificación y permite revisar la dirección', () => {
  render(<Pantalla />);
  expect(screen.getByText(/Revisá que esté bien escrito/)).toBeInTheDocument();
  expect(screen.getByText('mal@example.com')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cambiar correo' })).toBeInTheDocument();
});
it('no envía el cambio si las dos direcciones no coinciden', () => {
  render(<Pantalla />);
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar correo' }));
  fireEvent.change(screen.getByLabelText('Nuevo correo electrónico'), { target: { value: 'nuevo@example.com' } });
  fireEvent.change(screen.getByLabelText('Repetí el nuevo correo'), { target: { value: 'otro@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar correo y enviar enlace' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Los correos no coinciden');
  expect(planesService.corregirCorreoActivacion).not.toHaveBeenCalled();
});
it('muestra el nuevo correo y utiliza el comprobante rotado para reenvíos posteriores', async () => {
  planesService.corregirCorreoActivacion.mockResolvedValue({ email: 'nuevo@example.com', token_registro: 'token-nuevo', message: 'Correo actualizado.' });
  planesService.reenviarActivacion.mockResolvedValue({ message: 'Enlace reenviado.' });
  render(<Pantalla />);
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar correo' }));
  for (const etiqueta of ['Nuevo correo electrónico', 'Repetí el nuevo correo']) fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: 'nuevo@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar correo y enviar enlace' }));
  await screen.findByText('Correo actualizado.');
  expect(screen.getByText('nuevo@example.com')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reenviar enlace' }));
  await screen.findByText('Enlace reenviado.');
  expect(planesService.reenviarActivacion).toHaveBeenCalledWith('token-nuevo');
});
it('cancelar la edición conserva el correo de la compra', () => {
  render(<Pantalla />);
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar correo' }));
  fireEvent.change(screen.getByLabelText('Nuevo correo electrónico'), { target: { value: 'nuevo@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByText('mal@example.com')).toBeInTheDocument();
  expect(planesService.corregirCorreoActivacion).not.toHaveBeenCalled();
});
