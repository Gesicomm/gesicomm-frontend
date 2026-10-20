import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productService', () => ({ productService: { detalle: vi.fn().mockResolvedValue({}), faq: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: ({ datos }) => <output data-testid="preview">{JSON.stringify(datos)}</output> }));

afterEach(cleanup);

describe('Selección de ofertas sin salir de la sección', () => {
  it('guarda una oferta renovable de minutos y segundos y permite confirmarla sin fecha fija', async () => {
    const guardar = vi.fn().mockResolvedValue(true);
    const producto = { tipo: 'producto', id: 7, slug: 'freidora', nombre: 'Freidora', precio_efectivo: 200000 };
    render(<ConfigurarVentaCodigo catalogo={{ productos: [producto], combos: [] }}
      inicial={{ seleccion: [producto], venta: { configurado: true, urgencia: { activo: true, renovar_cada_visita: true, duracion_horas: 0, duracion_minutos: 3, duracion_segundos: 15 } } }}
      cargarOfertas={vi.fn().mockResolvedValue([])} onConfirmar={guardar} onVolver={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar', exact: true }));
    await waitFor(() => expect(guardar).toHaveBeenCalledTimes(1));
    expect(guardar.mock.calls[0][0]).toMatchObject({
      venta: { urgencia: { renovar_cada_visita: true, duracion_horas: 0, duracion_minutos: 3, duracion_segundos: 15 } },
      confirmaciones: { urgencia: true },
    });
  });

  it.each(['normal', 'order_bump', 'upsell'])('activa y desactiva %s conservando la sección y la vista previa', async estrategia => {
    const producto = { tipo: 'producto', id: 7, slug: 'freidora', nombre: 'Freidora', precio_efectivo: 200000 };
    const oferta = { id: 55, nombre: 'Oferta de prueba', estrategia, producto_ancla_id: 7, producto_ancla: producto, precio_normal: 90000, componentes: [{ producto_id: 7, cantidad: 2 }] };
    const guardar = vi.fn().mockResolvedValue(true);
    render(<ConfigurarVentaCodigo
      catalogo={{ productos: [producto], combos: [] }}
      inicial={{ seleccion: [producto], venta: { configurado: true, seleccion: 'manual', paquetes: { 55: { activo: false } }, cross_sell: { activo: true, ofertas: [] } } }}
      cargarOfertas={vi.fn().mockResolvedValue([oferta])}
      onConfirmar={guardar} onVolver={vi.fn()}
    />);
    fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
    const tab = within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Ofertas', exact: true });
    fireEvent.click(tab);
    const checkbox = await screen.findByRole('checkbox', { name: /Mostrar .*Oferta de prueba en esta landing/ });
    const vista = () => JSON.parse(screen.getAllByTestId('preview')[0].textContent).vista;
    const vistaInicial = vista();
    expect(checkbox).not.toBeChecked();

    for (const activo of [true, false]) {
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(activo);
      expect(tab).toHaveAttribute('aria-selected', 'true');
      expect(vista()).toBe(vistaInicial);
      fireEvent.click(screen.getByRole('button', { name: 'Guardar', exact: true }));
      await waitFor(() => expect(guardar).toHaveBeenCalledTimes(activo ? 1 : 2));
      const venta = guardar.mock.calls.at(-1)[0].venta;
      if (estrategia === 'normal') expect(venta.paquetes[55].activo).toBe(activo);
      else expect(venta.cross_sell.ofertas.includes(55)).toBe(activo);
    }
  });
});
