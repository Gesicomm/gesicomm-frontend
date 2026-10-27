import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TutorialModulo from './TutorialModulo';

vi.mock('../hooks/useTutorialesSistema', () => ({ default: () => ({}) }));

it.each([
  ['/mi-catalogo', 'Productos'],
  ['/mis-anuncios', 'Publicidad'],
  ['/gestion-logistica', 'Gestión Logística'],
])('muestra un espacio de video en %s', (ruta, nombre) => {
  render(<MemoryRouter initialEntries={[ruta]}><TutorialModulo /></MemoryRouter>);
  expect(screen.getByRole('region', { name: `Tutorial de ${nombre}` })).toHaveTextContent('Espacio para el video explicativo');
});

it('deja el video principal de Mi negocio en su propia pantalla', () => {
  render(<MemoryRouter initialEntries={['/mi-tienda']}><TutorialModulo /></MemoryRouter>);
  expect(screen.queryByText('Espacio para el video explicativo')).not.toBeInTheDocument();
});
