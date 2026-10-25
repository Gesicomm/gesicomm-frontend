import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import MiDashboard from './MiDashboard';
import { getMetricasDashboardPedidos } from '../../services/courierApi';

vi.mock('../../services/courierApi', () => ({ getMetricasDashboardPedidos: vi.fn() }));
vi.mock('../../services/landingService', () => ({
  landingService: { estadisticasRango: vi.fn().mockResolvedValue(null) },
}));

// Los números de la tienda de prueba "sommix" en octubre de 2026 (auditoría
// UX): sin entregas, 9 pedidos creados, 4 confirmados y Gs 800.000 de fijos.
function ventasSinEntregas(kpisExtra = {}) {
  return {
    rango_fechas: { desde: '2026-10-01', hasta: '2026-10-31' },
    kpis: {
      facturacion_entregada: 0,
      ticket_promedio: 0,
      ganancia_neta_estimada: -800000,
      pct_margen_neto: 0,
      margen_bruto_estimado: 0,
      pct_margen_bruto: 0,
      gastos_fijos_generales: 800000,
      punto_equilibrio: null,
      falta_para_equilibrio: null,
      ...kpisExtra,
    },
    comparativo: { facturacion_entregada: 0, ganancia_neta_estimada: 223000 },
    funnel: { entregados: 0, confirmados: 4, total_creados: 9, tasa_confirmacion: 44.4 },
  };
}

async function montar(ventas) {
  getMetricasDashboardPedidos.mockResolvedValue(ventas);
  render(<MemoryRouter><MiDashboard /></MemoryRouter>);
  return screen.findByText('Resumen Ejecutivo');
}

describe('MiDashboard: métricas que no se contradicen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rotula los pedidos como entregados y da la base de la tasa de confirmación', async () => {
    await montar(ventasSinEntregas());
    expect(screen.getByText('Pedidos entregados')).toBeInTheDocument();
    expect(screen.getByText('4 de 9 confirmados')).toBeInTheDocument();
  });

  it('sin ventas no diagnostica "vender bajo costo"', async () => {
    await montar(ventasSinEntregas());
    expect(screen.queryByText('No hay punto de equilibrio')).not.toBeInTheDocument();
    expect(screen.getByText('Todavía no hay ventas entregadas en este período')).toBeInTheDocument();
  });

  it('con ventas y margen negativo sigue avisando que se vende bajo costo', async () => {
    await montar(ventasSinEntregas({ facturacion_entregada: 100000 }));
    expect(screen.getByText('No hay punto de equilibrio')).toBeInTheDocument();
  });

  it('compara una pérdida en guaraníes, no con un porcentaje sobre base negativa', async () => {
    await montar(ventasSinEntregas());
    const tarjeta = screen.getByText('Resumen Ejecutivo').closest('section, div[id], .md-summary-card') || document.body;
    expect(within(tarjeta).queryByText(/%\s*vs\. período anterior/)).not.toBeInTheDocument();
    expect(within(tarjeta).getByText(/−Gs\s?1\.023\.000 vs\. período anterior/)).toBeInTheDocument();
  });
});
