import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InstruccionesIaPagina } from './ConfigurarVentaCodigo';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function montar() {
  const cambiar = vi.fn();
  render(<InstruccionesIaPagina
    tienda={{ nombre: 'Mi tienda' }} venta={{ tipo: 'catalogo' }} productos={[]}
    codigos={{ inicio: { html: '<main>Anterior</main>', css: '.viejo {}', js: 'viejo()' } }}
    onCambiarCodigo={cambiar}
  />);
  return cambiar;
}

describe('Guía de IA para la página completa', () => {
  it('presenta el contrato comercial y un único campo de pegado, sin pestañas por lenguaje', () => {
    montar();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.queryByRole('tablist', { name: 'Parte del código' })).toBeNull();
    const guia = screen.getByText(/Sos un desarrollador front-end senior/).textContent;
    expect(guia).toContain('Estrategia comercial');
    expect(guia).toContain('Motor comercial editable de Inicio');
    expect(guia).toContain('Devolvé un único bloque html');
    expect(guia).not.toContain('Devolvé exactamente tres bloques');
    expect(guia).toContain('Mi tienda');
  });

  it.each([
    '<main>Nuevo</main><style>.nuevo { color: red; }</style>',
    '```html\n<main>Nuevo</main><style>.nuevo { color: red; }</style>\n```',
  ])('aplica HTML con CSS integrado y elimina el JavaScript anterior: %s', respuesta => {
    const cambiar = montar();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: respuesta } });
    expect(cambiar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar a la página' }));
    expect(cambiar.mock.calls).toEqual([
      ['inicio', 'html', '<main>Nuevo</main>'],
      ['inicio', 'css', '.nuevo { color: red; }'],
      ['inicio', 'js', ''],
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('Guardá para publicarlo');
  });

  it('rechaza texto sin HTML sin modificar la página', () => {
    const cambiar = montar();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Quiero un diseño nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar a la página' }));
    expect(cambiar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Pegá el código completo');
  });

  it('copia la guía comercial con el formato de respuesta unificado', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar prompt maestro' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Instrucciones copiadas' })).toBeInTheDocument());
    expect(writeText.mock.calls[0][0]).toContain('Devolvé un único bloque html');
  });

  it('extrae el JavaScript integrado y aplica el código a la página elegida', () => {
    const cambiar = montar();
    fireEvent.change(screen.getByLabelText('Página a diseñar'), { target: { value: 'checkout' } });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '<main>Pedido</main><style>main { color: blue; }</style><script>console.log("nuevo")</script>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar a la página' }));
    expect(cambiar.mock.calls).toEqual([
      ['checkout', 'html', '<main>Pedido</main>'],
      ['checkout', 'css', 'main { color: blue; }'],
      ['checkout', 'js', 'console.log("nuevo")'],
    ]);
  });
});
