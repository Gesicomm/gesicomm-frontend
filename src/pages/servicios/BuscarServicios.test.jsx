import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BuscarServicios from './BuscarServicios';
import API from '../../services/api';

vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }));

beforeEach(() => {
  vi.resetAllMocks();
  API.get.mockResolvedValue({ data: { servicios: [], total: 0, pagina: 1, total_paginas: 0 } });
});

it('muestra ejemplos sin presentarlos como proveedores reales y permite filtrar', async () => {
  render(<MemoryRouter><BuscarServicios independiente /></MemoryRouter>);
  expect(await screen.findByText('Videos que cuentan tu historia')).toBeInTheDocument();
  expect(screen.getByText('Vista de ejemplo')).toBeInTheDocument();
  expect(screen.getAllByText('Ejemplo')).toHaveLength(3);
  expect(screen.queryByRole('link', { name: /Contactar por WhatsApp/ })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Filtrar por tipo de proveedor'), { target: { value: 'envios' } });
  await waitFor(() => expect(screen.getByText('Entregas simples, clientes felices')).toBeInTheDocument());
  expect(screen.queryByText('Videos que cuentan tu historia')).not.toBeInTheDocument();
});

it('reemplaza los ejemplos por perfiles aprobados cuando hay datos reales', async () => {
  API.get.mockResolvedValue({ data: { servicios: [{ id: 7, nombre: 'María López', categoria: 'envios', especialidad: 'Envíos y logística', oferta: 'Entregas en Central', descripcion: 'Coordino envíos y entregas para comercios del área Central.', foto_url: 'https://images.example/maria.webp', whatsapp: '+595981234567' }], total: 1, pagina: 1, total_paginas: 1 } });
  render(<MemoryRouter><BuscarServicios independiente /></MemoryRouter>);
  expect(await screen.findByText('Entregas en Central')).toBeInTheDocument();
  expect(screen.queryByText('Vista de ejemplo')).not.toBeInTheDocument();
  expect(screen.queryByText('Videos que cuentan tu historia')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Más información sobre Entregas en Central' })).toHaveAttribute('href', '/buscar-servicios/7');
});
