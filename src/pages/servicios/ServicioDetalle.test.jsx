import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ServicioDetalle from './ServicioDetalle';

it('abre la ficha de ejemplo con descripción, portafolio y beneficios', () => {
  render(<MemoryRouter initialEntries={['/buscar-servicios/ejemplo-video']}><Routes><Route path="/buscar-servicios/:id" element={<ServicioDetalle />} /></Routes></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Videos que cuentan tu historia' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Portafolio' })).toBeInTheDocument();
  expect(screen.getAllByText('Comunicación directa')).toHaveLength(1);
  expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
});
