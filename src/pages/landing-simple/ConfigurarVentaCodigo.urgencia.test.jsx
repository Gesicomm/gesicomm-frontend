import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EditorUrgenciaInicio } from './ConfigurarVentaCodigo';
import { itemPanelARuntime, itemPublicoARuntime } from './datosRuntime';

afterEach(() => { cleanup(); vi.useRealTimers(); });

function Editor() {
  const [renovar, onRenovar] = useState(true);
  const [duracionHoras, onDuracionHoras] = useState(0);
  const [duracionMinutos, onDuracionMinutos] = useState(3);
  const [duracionSegundos, onDuracionSegundos] = useState(15);
  const [finAt, onFinAt] = useState('');
  return <EditorUrgenciaInicio titulo="Ofertas" texto="Mensaje" cta="Ver todos" confirmar={false}
    {...{ renovar, onRenovar, duracionHoras, onDuracionHoras, duracionMinutos, onDuracionMinutos, duracionSegundos, onDuracionSegundos, finAt, onFinAt }} />;
}

describe('Duración de oferta flash', () => {
  it('admite duraciones sin horas, limita minutos y segundos y explica ambos modos', () => {
    render(<Editor />);
    expect(screen.getByRole('spinbutton', { name: 'Horas' })).toHaveValue(0);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minutos' }), { target: { value: '75' } });
    expect(screen.getByRole('spinbutton', { name: 'Minutos' })).toHaveValue(59);
    expect(screen.getByText(/El ciclo continúa hasta que desactives/)).toHaveTextContent(/Al vencer, se quitan el descuento/);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minutos' }), { target: { value: '0' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Segundos' }), { target: { value: '0' } });
    expect(screen.getByRole('alert')).toHaveTextContent('mayor que cero');
  });

  it('aplica horas, minutos y segundos a la fecha fija sin perder precisión', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T15:00:00Z'));
    const { container } = render(<Editor />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Renovar sola/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar duración desde ahora' }));
    const fecha = container.querySelector('input[type="datetime-local"]');
    expect(fecha).toHaveAttribute('step', '1');
    expect(new Date(fecha.value).getTime()).toBe(Date.now() + 195000);
  });

  it.each(['publico', 'panel'])('elimina el descuento después de combinar la presentación del %s', modo => {
    const venta = {
      urgencia: { activo: true, productos: ['freidora'], fin_at: new Date(Date.now() - 1).toISOString() },
      presentacion_productos: { 'producto:7': { insignia_principal: 'Oferta' } },
    };
    const item = { tipo: 'producto', id: 7, referencia_id: 7, content_id: 'freidora', slug: 'freidora', precio: 100000, precio_efectivo: 100000, precio_ancla: 150000, precio_antes: 150000, descuento_pct: 33, etiqueta: 'Oferta' };
    const resultado = modo === 'publico' ? itemPublicoARuntime(item, 'tienda', venta) : itemPanelARuntime(item, [], null, venta);
    expect(resultado).toMatchObject({ precio_antes: null, descuento_pct: 0, ahorro: 0, insignia_principal: '' });
    expect(resultado.etiqueta).toBeNull();
  });
});
