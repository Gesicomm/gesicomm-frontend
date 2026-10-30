import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import PrimerIngreso from './PrimerIngreso';

const post = vi.hoisted(() => vi.fn());
vi.mock('../../services/api', () => ({ default: { post } }));
vi.mock('../../hooks/useSesion', () => ({ default: () => ({ estado: 'autenticado', usuario: { id: 701, nombre: 'Cuenta nueva' }, reintentar: vi.fn() }) }));

function Destino() {
  const location = useLocation();
  return <p>Destino: {location.pathname}</p>;
}

beforeEach(() => {
  vi.clearAllMocks();
  post.mockResolvedValue({ data: { tipo: 'usuario' } });
});

it('guarda la elección de usar Gesicom y continúa al destino previsto', async () => {
  render(<MemoryRouter initialEntries={[{ pathname: '/', state: { destino: '/onboarding' } }]}>
    <Routes><Route path="/" element={<PrimerIngreso />} /><Route path="/onboarding" element={<Destino />} /></Routes>
  </MemoryRouter>);

  fireEvent.click(screen.getByRole('button', { name: /Continuar con Gesicom/i }));
  expect(await screen.findByText('Destino: /onboarding')).toBeInTheDocument();
  expect(post).toHaveBeenCalledWith('/auth/primer-ingreso', { tipo: 'usuario' });
});

it('guarda la elección de proveedor y abre la postulación', async () => {
  render(<MemoryRouter>
    <Routes><Route path="/" element={<PrimerIngreso />} /><Route path="/" element={<Destino />} /></Routes>
  </MemoryRouter>);

  fireEvent.click(screen.getByRole('button', { name: /Completar mi postulación/i }));
  await vi.waitFor(() => expect(post).toHaveBeenCalledWith('/auth/primer-ingreso', { tipo: 'proveedor' }));
});
