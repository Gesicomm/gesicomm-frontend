import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import TutorialDock, { TutorialHeaderAction } from './TutorialDock';

vi.mock('../hooks/useTutorialesSistema', () => ({ default: () => ({
  'mi-negocio.tienda': 'https://youtu.be/dQw4w9WgXcQ',
  'mi-negocio.contacto': 'https://youtu.be/9bZkp7q19f0',
  'modulo.negocio': 'https://youtu.be/general1234',
}) }));

function montar(ruta = '/mi-tienda?tab=tienda') {
  return render(<MemoryRouter initialEntries={[ruta]}><TutorialDock>
    <header><TutorialHeaderAction /></header>
    <input aria-label="Nombre del negocio" defaultValue="Mi tienda" />
    <Link to="/mi-tienda?tab=contacto">Ir a Contacto</Link>
  </TutorialDock></MemoryRouter>);
}

it('minimiza sin desmontar el video, restaura y cierra devolviendo el foco al encabezado', async () => {
  montar();
  const abrir = screen.getByRole('button', { name: 'Ver tutorial de Tienda' });
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nombre del negocio'), { target: { value: 'Cambio sin guardar' } });
  fireEvent.click(abrir);
  fireEvent.click(screen.getByRole('button', { name: 'Reproducir tutorial de Tienda' }));
  const iframe = screen.getByTitle('Video tutorial de Tienda');
  expect(iframe).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXcQ'));
  fireEvent.click(screen.getByRole('button', { name: 'Minimizar tutorial' }));
  expect(iframe).toBeInTheDocument();
  expect(iframe).not.toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar tutorial' }));
  expect(screen.getByTitle('Video tutorial de Tienda')).toBe(iframe);
  expect(iframe).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar tutorial' }));
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  expect(iframe).not.toBeInTheDocument();
  expect(abrir).toHaveFocus();
  expect(screen.getByLabelText('Nombre del negocio')).toHaveValue('Cambio sin guardar');
  await waitFor(() => expect(abrir).toHaveAttribute('aria-expanded', 'false'));
});

it('actualiza el video al cambiar de pestaña y permite cerrar con Escape desde el reproductor', async () => {
  montar();
  fireEvent.click(screen.getByRole('button', { name: 'Ver tutorial de Tienda' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reproducir tutorial de Tienda' }));
  fireEvent.click(screen.getByRole('link', { name: 'Ir a Contacto' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Reproducir tutorial de Contacto' })).toBeInTheDocument());
  expect(screen.queryByTitle('Video tutorial de Tienda')).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('region'), { key: 'Escape' });
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});

it('usa el video general de Mi negocio cuando la pestaña no tiene uno propio', () => {
  montar('/mi-tienda?tab=analitica');
  fireEvent.click(screen.getByRole('button', { name: 'Ver tutorial de Analítica' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reproducir tutorial de Analítica' }));
  expect(screen.getByTitle('Video tutorial de Analítica')).toHaveAttribute('src', expect.stringContaining('general1234'));
});

it('conserva el espacio reservado cuando todavía no hay video', () => {
  montar('/mi-dashboard');
  fireEvent.click(screen.getByRole('button', { name: 'Ver tutorial de Dashboard General' }));
  expect(screen.getByRole('region')).toHaveTextContent('Video próximamente');
});

it.each(['/landing/123', '/mi-landing/123', '/seleccionar-tienda'])('conserva la página sin agregar el control en %s', ruta => {
  montar(ruta);
  expect(screen.queryByRole('button', { name: /tutorial/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Nombre del negocio')).toBeInTheDocument();
});

it('permite moverlo con teclado y mantiene un margen mínimo', () => {
  montar();
  fireEvent.click(screen.getByRole('button', { name: 'Ver tutorial de Tienda' }));
  const panel = screen.getByRole('region');
  vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 20, width: 400, height: 300 });
  fireEvent.keyDown(screen.getByRole('button', { name: 'Mover tutorial' }), { key: 'ArrowLeft' });
  expect(panel.style.left).toBe('12px');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Mover tutorial' }), { key: 'ArrowDown', shiftKey: true });
  expect(panel.style.top).toBe('68px');
});
