import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProspectosRegistroPanel from './ProspectosRegistroPanel';
import API from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const prospectoPendiente = {
  id: 1,
  nombre: 'Martin Rodriguez',
  email: 'martin@example.com',
  whatsapp: '+595992820631',
  pais: 'Paraguay',
  origen: 'solicitar_prueba',
  plan_codigo: 'hotmart-starter-founder',
  estado: 'checkout_iniciado',
  paso_1_en: '2026-11-23T15:30:00Z',
  checkout_iniciado_en: '2026-11-23T15:35:00Z',
  correo_confirmacion_enviado_en: null,
  brevo_sincronizado_en: '2026-11-23T15:35:02Z',
  updated_at: '2026-11-23T15:35:02Z',
};

const prospectoComprado = {
  id: 2,
  nombre: 'Ana Compradora',
  email: 'ana@example.com',
  whatsapp: '+595981222333',
  pais: 'Argentina',
  origen: 'portada',
  plan_codigo: 'hotmart-starter-founder',
  estado: 'comprado',
  monto_pagado: 47,
  moneda: 'USD',
  comprado_en: '2026-11-23T16:00:00Z',
  correo_confirmacion_enviado_en: '2026-11-23T16:00:02Z',
  brevo_sincronizado_en: '2026-11-23T16:00:03Z',
  updated_at: '2026-11-23T16:00:03Z',
};

const resumen = {
  total: 2,
  sin_comprar: 1,
  datos_completados: 0,
  checkout_iniciado: 1,
  prueba_activa: 0,
  comprado: 1,
  cancelado: 0,
};

beforeEach(() => {
  vi.resetAllMocks();
  API.post.mockResolvedValue({
    data: {
      total: 2,
      pagina: 1,
      total_paginas: 1,
      resumen,
      prospectos: [prospectoPendiente, prospectoComprado],
    },
  });
});

it('carga el resumen, lista prospectos y filtra por sin_comprar y búsqueda por POST', async () => {
  render(<ProspectosRegistroPanel />);

  expect(await screen.findByText('Martin Rodriguez')).toBeInTheDocument();
  expect(screen.getByText('Ana Compradora')).toBeInTheDocument();
  expect(screen.getByText('USD 47')).toBeInTheDocument();
  expect(screen.getByText('Sin correo de compra todavía')).toBeInTheDocument();
  expect(screen.getByText(/Correo de confirmación enviado/)).toBeInTheDocument();

  expect(API.post).toHaveBeenCalledWith('/publico/admin/prospectos-registro/buscar', {
    estado: 'todos',
    busqueda: '',
    fechaDesde: undefined,
    fechaHasta: undefined,
    page: 1,
    limit: 20,
  });

  API.post.mockResolvedValueOnce({
    data: {
      total: 1,
      pagina: 1,
      total_paginas: 1,
      resumen,
      prospectos: [prospectoPendiente],
    },
  });

  fireEvent.click(screen.getByRole('button', { name: /Sin comprar/i }));

  await waitFor(() => {
    expect(API.post).toHaveBeenLastCalledWith('/publico/admin/prospectos-registro/buscar', {
      estado: 'sin_comprar',
      busqueda: '',
      fechaDesde: undefined,
      fechaHasta: undefined,
      page: 1,
      limit: 20,
    });
  });

  fireEvent.change(screen.getByPlaceholderText('Nombre, correo o WhatsApp'), {
    target: { value: 'martin@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

  await waitFor(() => {
    expect(API.post).toHaveBeenLastCalledWith('/publico/admin/prospectos-registro/buscar', {
      estado: 'sin_comprar',
      busqueda: 'martin@example.com',
      fechaDesde: undefined,
      fechaHasta: undefined,
      page: 1,
      limit: 20,
    });
  });
});

it('exporta CSV con los filtros actuales', async () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = vi.fn(() => 'blob:csv-test');
  URL.revokeObjectURL = vi.fn();
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  try {
    render(<ProspectosRegistroPanel />);
    await screen.findByText('Martin Rodriguez');

    API.post.mockResolvedValueOnce({ data: 'ID,Email\n1,martin@example.com' });
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));

    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith(
        '/publico/admin/prospectos-registro/exportar',
        {
          estado: 'todos',
          busqueda: '',
          fechaDesde: undefined,
          fechaHasta: undefined,
        },
        { responseType: 'blob' }
      );
    });
    expect(clickSpy).toHaveBeenCalledTimes(1);
  } finally {
    clickSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }
});

it('tolera una respuesta vacía {} sin romper la vista', async () => {
  API.post.mockResolvedValueOnce({ data: {} });
  render(<ProspectosRegistroPanel />);

  expect(await screen.findByText('No hay prospectos en esta etapa')).toBeInTheDocument();
  expect(screen.getByText('0 registros encontrados')).toBeInTheDocument();
});
