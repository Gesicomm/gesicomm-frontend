import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { api } from '../utils/api';

vi.mock('../utils/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../components/public/LoginCompanion', () => ({ default: () => null }));
vi.mock('../components/public/ThemeToggle', () => ({ default: () => null }));
vi.mock('../components/public/Logo', () => ({ default: () => null }));
vi.mock('../lib/metaPixel', () => ({ trackearEvento: vi.fn(), trackearEventoPersonalizado: vi.fn(), generarEventId: () => 'test-event' }));

const compra = { nombre: 'Ana Compradora', telefono: '0981123456', email: 'ana@example.com', plan: { nombre: 'Starter' } };
const mostrar = (entrada = '/registro?token=compra-confirmada') => render(<MemoryRouter initialEntries={[entrada]}><Login /></MemoryRouter>);

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  api.get.mockResolvedValue(compra);
  api.post.mockResolvedValue({ requiere_verificacion: true, email: compra.email });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('recupera la compra y solo pide crear y confirmar la contraseña', async () => {
  mostrar();
  await screen.findByRole('heading', { name: 'Creá tu contraseña' });
  expect(screen.getByText(compra.email)).toBeInTheDocument();
  expect(screen.queryByLabelText('Nombre completo')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Teléfono de contacto')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
  expect(screen.queryByText('¿Tenés un código de prueba?')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Segura123' } });
  fireEvent.change(screen.getByLabelText('Repetir contraseña'), { target: { value: 'Segura123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear contraseña y continuar' }));
  await screen.findByRole('heading', { name: 'Verificá tu correo' });
  expect(api.post).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ nombre: compra.nombre, telefono: compra.telefono, email: compra.email, password: 'Segura123', token_suscripcion: 'compra-confirmada' }));
  expect(api.post).not.toHaveBeenCalledWith('/api/auth/login', expect.anything());
});

it('permite revisar los datos precargados sin cambiar el correo del pago', async () => {
  mostrar();
  fireEvent.click(await screen.findByRole('button', { name: 'Revisar datos de la compra' }));
  expect(screen.getByLabelText('Nombre completo')).toHaveValue(compra.nombre);
  expect(screen.getByLabelText('Teléfono de contacto')).toHaveValue(compra.telefono);
  expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
});

it('pide completar el contacto cuando la pasarela no lo entrega', async () => {
  api.get.mockResolvedValue({ ...compra, telefono: null });
  mostrar();
  await screen.findByRole('heading', { name: 'Creá tu contraseña' });
  expect(screen.getByLabelText('Teléfono de contacto')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Teléfono de contacto'), { target: { value: '0981234567' } });
  expect(screen.getByLabelText('Teléfono de contacto')).toHaveValue('0981234567');
});

it('un enlace vencido permite recuperar el plan con el mismo correo', async () => {
  api.get.mockRejectedValue(new Error('Enlace vencido'));
  mostrar();
  await screen.findByRole('alert');
  await waitFor(() => expect(screen.getByLabelText('Correo electrónico')).toBeEnabled());
  expect(screen.queryByRole('heading', { name: 'Creá tu contraseña' })).not.toBeInTheDocument();
});

it('acepta el token en el estado del navegador al volver del pago', async () => {
  mostrar({ pathname: '/registro', state: { token: 'token-desde-pago' } });
  await screen.findByRole('heading', { name: 'Creá tu contraseña' });
  expect(api.get).toHaveBeenCalledWith('/api/suscripciones/token/token-desde-pago');
});

it('conserva el registro normal para quien todavía no tiene plan', () => {
  mostrar('/registro');
  expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
});

it('el enlace del correo activa la cuenta e inicia sesión sin mostrar OTP', async () => {
  api.post.mockResolvedValueOnce({ cuenta_activada: true }).mockResolvedValueOnce({ usuario: { id: 21, rol: 'usuario', rutas: { fisico: true, personal: true } }, tiendas: [] });
  mostrar({ pathname: '/registro', state: { activacion: 'enlace-firmado-del-correo' } });
  await screen.findByRole('heading', { name: 'Creá tu contraseña' });
  expect(api.get).toHaveBeenCalledWith('/api/suscripciones/activacion/enlace-firmado-del-correo');
  expect(screen.getByText(/Tu correo quedó verificado con este enlace/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Segura123' } });
  fireEvent.change(screen.getByLabelText('Repetir contraseña'), { target: { value: 'Segura123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear contraseña y entrar' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/auth/login', { email: compra.email, password: 'Segura123' }));
  expect(api.post).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ token_activacion: 'enlace-firmado-del-correo', token_suscripcion: undefined }));
  expect(screen.queryByRole('heading', { name: 'Verificá tu correo' })).not.toBeInTheDocument();
});
