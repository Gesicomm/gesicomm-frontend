import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TutorialesSistema from './TutorialesSistema';
import API from '../../services/api';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), put: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  API.get.mockResolvedValue({ data: { secciones: [
    { clave: 'ecommerce.inicio', grupo: 'E-commerce', nombre: 'Inicio' },
    { clave: 'ecommerce.checkout', grupo: 'E-commerce', nombre: 'Checkout' },
    { clave: 'mi-negocio.tienda', grupo: 'Mi negocio', nombre: 'Tienda' },
  ], videos: {} } });
  API.put.mockImplementation(async (path, body) => ({ data: { clave: decodeURIComponent(path.split('/').pop()), url: body.url } }));
});

it('permite al admin asignar un video a Inicio y otro a Mi negocio sin mezclarlos', async () => {
  render(<TutorialesSistema />);
  fireEvent.change(await screen.findByLabelText('Enlace de YouTube'), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar video' }));
  await waitFor(() => expect(API.put).toHaveBeenCalledWith('/tutoriales/ecommerce.inicio', { url: 'https://youtu.be/dQw4w9WgXcQ' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mi negocio' }));
  expect(screen.getByRole('heading', { name: 'Tienda' })).toBeInTheDocument();
  expect(screen.getByLabelText('Enlace de YouTube')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Enlace de YouTube'), { target: { value: 'https://youtu.be/9bZkp7q19f0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar video' }));
  await waitFor(() => expect(API.put).toHaveBeenCalledWith('/tutoriales/mi-negocio.tienda', { url: 'https://youtu.be/9bZkp7q19f0' }));
});
