import React from 'react';
import { beforeEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MovilExpressSeguimiento } from './MovilExpressSeguimiento';
import { estadoMovilExpress } from './orderLifecycle';

const envio = (movilExpress, resto = {}) => ({
  id: 10, numero_pedido: 1, cliente: 'Cliente', estado: 'Despachado',
  ...resto,
  ...(movilExpress === null ? {} : { movil_express: movilExpress }),
});

const gestionado = {
  gestionado: true, environment: 'sandbox', external_order_id: 'GESICOM-ME-SBX-1-10',
  estado_envio: 'aceptado', guide: 'ME-004521', tracking_url: 'https://movil-express.test/t/ME-004521',
  service_fee: 32000, status: 'in_route', status_at: '2026-11-10T15:00:00.000Z',
};

beforeEach(cleanup);

describe('bloque de seguimiento de Móvil Express', () => {
  it('no se muestra si el pedido no salió por Móvil Express', () => {
    const { container } = render(<MovilExpressSeguimiento envio={envio(null)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('tampoco se muestra si quedó encolado pero no se mandó', () => {
    const { container } = render(<MovilExpressSeguimiento envio={envio({ ...gestionado, gestionado: false, estado_envio: 'pendiente', guide: null })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra la guía, el estado, el costo y el enlace al seguimiento', () => {
    render(<MovilExpressSeguimiento envio={envio(gestionado)} />);
    expect(screen.getByText('Móvil Express')).toBeVisible();
    expect(screen.getByText('En ruta')).toBeVisible();
    expect(screen.getByText('ME-004521')).toBeVisible();
    expect(screen.getByText('Gs. 32.000')).toBeVisible();
    const enlace = screen.getByRole('link', { name: /Ver seguimiento/ });
    expect(enlace).toHaveAttribute('href', 'https://movil-express.test/t/ME-004521');
    // Enlace externo: no puede llevar el panel a otra pestaña sin aislar.
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('mientras no llega la guía dice que está procesando, sin inventar un número', () => {
    render(<MovilExpressSeguimiento envio={envio({ ...gestionado, estado_envio: 'enviado', guide: null, tracking_url: null, status: 'pending', service_fee: null })} />);
    expect(screen.getByText('Procesando')).toBeVisible();
    expect(screen.getByText('Todavía no la asignaron')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('muestra el motivo cuando Móvil Express dejó el pedido en revisión', () => {
    render(<MovilExpressSeguimiento envio={envio({
      ...gestionado, estado_envio: 'revision', guide: null, tracking_url: null, status: 'pending',
      reason_code: 'DESTINATION_UNRESOLVED', reason: 'No se pudo resolver la ciudad de destino.',
    })} />);
    expect(screen.getByText('No se pudo resolver la ciudad de destino.')).toBeVisible();
  });

  it('nombra en castellano cada estado del proveedor', () => {
    const casos = {
      picked_up: 'Retirado', in_base: 'En base', in_route: 'En ruta', delivered: 'Entregado',
      absent: 'Cliente ausente', rejected: 'Rechazado por el cliente', postponed: 'Postergado',
      returning: 'En devolución', returned: 'Devuelto', cancelled: 'Cancelado',
    };
    for (const [status, label] of Object.entries(casos)) {
      cleanup();
      render(<MovilExpressSeguimiento envio={envio({ ...gestionado, status })} />);
      expect(screen.getByText(label)).toBeVisible();
    }
  });
});

describe('estadoMovilExpress', () => {
  it('devuelve null para un pedido que no es de Móvil Express', () => {
    expect(estadoMovilExpress(envio(null))).toBeNull();
    expect(estadoMovilExpress({})).toBeNull();
    expect(estadoMovilExpress(undefined)).toBeNull();
  });

  it('un estado desconocido no rompe: cae en "esperando retiro"', () => {
    const estado = estadoMovilExpress(envio({ ...gestionado, status: 'algo_nuevo' }));
    expect(estado.label).toBe('Esperando retiro');
    expect(estado.guia).toBe('ME-004521');
  });

  it('un costo que no es número queda en null, no en cero', () => {
    expect(estadoMovilExpress(envio({ ...gestionado, service_fee: null })).costo).toBeNull();
    expect(estadoMovilExpress(envio({ ...gestionado, service_fee: 0 })).costo).toBe(0);
  });
});
