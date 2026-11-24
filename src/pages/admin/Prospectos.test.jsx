import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Prospectos from './Prospectos';
import API from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const prospectoCarrito = {
  id: 1,
  nombre: 'Martin Rodriguez',
  email: 'martin@example.com',
  whatsapp: '+595992820631',
  pais: 'Paraguay',
  origen: 'crear_cuenta',
  plan_codigo: 'hotmart-starter-founder',
  oferta_hotmart: '0h9kqefg',
  estado: 'checkout_iniciado',
  etapa_label: 'Llegó al carrito',
  llego_al_carrito: true,
  llego_a_pagar: false,
  pago_confirmado: false,
  paso_1_en: '2026-11-23T15:30:00Z',
  checkout_iniciado_en: '2026-11-23T15:35:00Z',
  fecha_ultima_actividad: '2026-11-23T15:35:00Z',
  updated_at: '2026-11-23T15:35:00Z',
};

const prospectoPagado = {
  id: 2,
  nombre: 'Ana Compradora',
  email: 'ana@example.com',
  whatsapp: '+593991222333',
  pais: 'Ecuador',
  origen: 'hotmart',
  plan_codigo: 'hotmart-starter',
  oferta_hotmart: 'ac3huzol',
  estado: 'comprado',
  etapa_label: 'Pagó',
  llego_al_carrito: true,
  llego_a_pagar: true,
  pago_confirmado: true,
  monto_pagado: 57,
  moneda: 'USD',
  comprado_en: '2026-11-23T16:00:00Z',
  fecha_ultima_actividad: '2026-11-23T16:00:00Z',
  updated_at: '2026-11-23T16:00:00Z',
};

const resumen = {
  total: 25,
  sin_comprar: 15,
  datos_completados: 5,
  checkout_iniciado: 10,
  prueba_activa: 4,
  comprado: 5,
  cancelado: 1,
};

const filtrosDisponibles = {
  paises: ['Ecuador', 'Paraguay'],
  planes: ['hotmart-starter', 'hotmart-starter-founder'],
  origenes: ['portada', 'solicitar_prueba', 'crear_cuenta', 'hotmart'],
};

beforeEach(() => {
  vi.resetAllMocks();
  API.post.mockResolvedValue({
    data: {
      total: 25,
      pagina: 1,
      total_paginas: 2,
      paginacion: {
        total: 25,
        pagina: 1,
        limit: 20,
        total_paginas: 2,
        desde: 1,
        hasta: 20,
        tiene_anterior: false,
        tiene_siguiente: true,
      },
      resumen,
      filtros_disponibles: filtrosDisponibles,
      prospectos: [prospectoCarrito, prospectoPagado],
    },
  });
});

it('renderiza etapa, progreso carrito/pago, contacto, país, fecha/hora sin textos CRM de Brevo y aplica filtros y paginación dinámica desde backend', async () => {
  render(<Prospectos />);

  expect(await screen.findByText('Martin Rodriguez')).toBeInTheDocument();
  expect(screen.getByText('Ana Compradora')).toBeInTheDocument();
  expect(screen.getByText('martin@example.com')).toBeInTheDocument();
  expect(screen.getByText('+595992820631')).toBeInTheDocument();
  expect(screen.getByText('Mostrando 1–20 de 25 prospectos')).toBeInTheDocument();
  expect(screen.getByText('USD 57')).toBeInTheDocument();
  expect(screen.getByText('Pagó: No')).toBeInTheDocument();
  expect(screen.getByText('Pagó: Sí')).toBeInTheDocument();
  expect(screen.queryByText(/Sincronizado en Brevo/i)).not.toBeInTheDocument();

  expect(API.post).toHaveBeenCalledWith('/publico/admin/prospectos-registro/buscar', {
    estado: 'todos',
    busqueda: '',
    pais: '',
    plan: '',
    origen: '',
    ordenarPor: 'recientes',
    fechaDesde: undefined,
    fechaHasta: undefined,
    page: 1,
    limit: 20,
  });

  fireEvent.change(screen.getByLabelText('País'), {
    target: { value: 'Ecuador' },
  });

  await waitFor(() => {
    expect(API.post).toHaveBeenLastCalledWith('/publico/admin/prospectos-registro/buscar', expect.objectContaining({
      pais: 'Ecuador',
      page: 1,
      limit: 20,
    }));
  });

  fireEvent.change(screen.getByLabelText('Por página'), {
    target: { value: '50' },
  });

  await waitFor(() => {
    expect(API.post).toHaveBeenLastCalledWith('/publico/admin/prospectos-registro/buscar', expect.objectContaining({
      pais: 'Ecuador',
      page: 1,
      limit: 50,
    }));
  });

  fireEvent.click(screen.getByRole('button', { name: '2' }));

  await waitFor(() => {
    expect(API.post).toHaveBeenLastCalledWith('/publico/admin/prospectos-registro/buscar', expect.objectContaining({
      pais: 'Ecuador',
      page: 2,
      limit: 50,
    }));
  });
});

it('exporta CSV con todos los filtros dinámicos y ordenamiento activos', async () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = vi.fn(() => 'blob:csv-test');
  URL.revokeObjectURL = vi.fn();
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  try {
    render(<Prospectos />);
    await screen.findByText('Martin Rodriguez');

    fireEvent.change(screen.getByLabelText('Ordenar'), {
      target: { value: 'etapa_desc' },
    });
    await waitFor(() => {
      expect(API.post).toHaveBeenLastCalledWith('/publico/admin/prospectos-registro/buscar', expect.objectContaining({
        ordenarPor: 'etapa_desc',
      }));
    });

    API.post.mockResolvedValueOnce({ data: 'ID,Correo\n1,martin@example.com' });
    fireEvent.click(screen.getByRole('button', { name: /Exportar \.csv/i }));

    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith(
        '/publico/admin/prospectos-registro/exportar',
        {
          estado: 'todos',
          busqueda: '',
          pais: '',
          plan: '',
          origen: '',
          ordenarPor: 'etapa_desc',
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

it('tolera respuesta vacía {} sin romper la vista', async () => {
  API.post.mockResolvedValueOnce({ data: {} });
  render(<Prospectos />);

  expect(await screen.findByText('No hay prospectos para estos filtros')).toBeInTheDocument();
  expect(screen.getByText('0 prospectos encontrados')).toBeInTheDocument();
});
