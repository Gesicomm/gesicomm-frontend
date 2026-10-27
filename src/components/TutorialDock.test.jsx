import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import TutorialDock from './TutorialDock';

vi.mock('../hooks/useTutorialesSistema', () => ({ default: () => ({
  'mi-negocio.tienda': 'https://youtu.be/dQw4w9WgXcQ',
  'mi-negocio.contacto': 'https://youtu.be/9bZkp7q19f0',
}) }));

it('abre un reproductor mediano sin mover el contenido y permite minimizarlo', async () => {
  render(<MemoryRouter initialEntries={['/mi-tienda?tab=tienda']}><TutorialDock /><Link to="/mi-tienda?tab=contacto">Ir a Contacto</Link></MemoryRouter>);
  const abrir = screen.getByRole('button', { name: 'Abrir tutorial de Tienda' });
  expect(screen.queryByRole('region', { name: 'Tutorial de Tienda' })).not.toBeInTheDocument();
  fireEvent.click(abrir);
  expect(screen.getByRole('region', { name: 'Tutorial de Tienda' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reproducir tutorial de Tienda' }));
  expect(screen.getByTitle('Video tutorial de Tienda')).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXcQ'));

  fireEvent.click(screen.getByRole('link', { name: 'Ir a Contacto' }));
  await waitFor(() => expect(screen.getByRole('region', { name: 'Tutorial de Contacto' })).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Reproducir tutorial de Contacto' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Minimizar tutorial de Contacto' }));
  expect(screen.queryByRole('region', { name: 'Tutorial de Contacto' })).not.toBeInTheDocument();
});

it('conserva el espacio reservado cuando todavía no hay video', () => {
  render(<MemoryRouter initialEntries={['/mi-dashboard']}><TutorialDock /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir tutorial de Dashboard General' }));
  expect(screen.getByRole('region', { name: 'Tutorial de Dashboard General' })).toHaveTextContent('Video próximamente');
});

it('no muestra el control sobre el editor de E-commerce', () => {
  render(<MemoryRouter initialEntries={['/landing/123']}><TutorialDock /></MemoryRouter>);
  expect(screen.queryByRole('button', { name: /tutorial/i })).not.toBeInTheDocument();
});
