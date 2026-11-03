import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ServicioDetalle from './ServicioDetalle';

it('abre la ficha del proveedor RAHA', () => {
  render(<MemoryRouter initialEntries={['/buscar-servicios/raha']}><Routes><Route path="/buscar-servicios/:id" element={<ServicioDetalle />} /></Routes></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Productos y logística para tu negocio' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Iniciar afiliación con RAHA' })).toHaveAttribute('href', '/mi-tienda/proveedores/raha/conectar');
  expect(screen.queryByText('Videos que cuentan tu historia')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
});
