import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const generador = vi.hoisted(() => ({ actual: null }));
vi.mock('./construirDocumentoCodigo', () => ({
  get construirDocumentoCodigo() { return generador.actual; },
  SANDBOX_CODIGO: 'allow-scripts',
}));

import CodigoPreview from './CodigoPreview';

beforeEach(() => {
  generador.actual = vi.fn(() => '<html><body>Documento inicial</body></html>');
});
afterEach(cleanup);

describe('actualización del documento de la preview', () => {
  const codigo = { html: '<article>Mi producto</article>', css: '', js: '' };
  const datos = { productos: [{ id: 'producto-1', precio: 850000 }] };

  it('actualiza los estilos compartidos cuando cambia el generador aunque la landing siga igual', () => {
    const { rerender } = render(<CodigoPreview codigo={codigo} datos={datos} titulo="Catálogo" />);
    expect(screen.getByTitle('Catálogo').getAttribute('srcdoc')).toContain('Documento inicial');
    const actualizado = vi.fn(() => '<html><body>Fotos contenidas</body></html>');
    generador.actual = actualizado;
    rerender(<CodigoPreview codigo={codigo} datos={datos} titulo="Catálogo" />);
    expect(screen.getByTitle('Catálogo').getAttribute('srcdoc')).toContain('Fotos contenidas');
    expect(actualizado).toHaveBeenCalledWith(codigo, expect.objectContaining({ datos }));
  });

  it('conserva el documento y su scroll cuando solo cambia la identidad de datos equivalentes', () => {
    const { rerender } = render(<CodigoPreview codigo={codigo} datos={datos} titulo="Catálogo" />);
    rerender(<CodigoPreview codigo={codigo} datos={{ ...datos }} titulo="Catálogo" />);
    expect(generador.actual).toHaveBeenCalledTimes(1);
  });
});

describe('búsqueda del encabezado', () => {
  it('le pide al contenedor los resultados (servidor) y se los devuelve al iframe con el mismo id', async () => {
    const onCatalogo = vi.fn(async () => ({ productos: [{ id: 'licuadora' }], total: 1 }));
    render(<CodigoPreview codigo={{ html: '<p>x</p>', css: '', js: '' }} datos={{ productos: [] }} titulo="Tienda" onCatalogo={onCatalogo} />);
    const ventana = screen.getByTitle('Tienda').contentWindow;
    const respuestas = [];
    ventana.postMessage = m => respuestas.push(m);
    window.dispatchEvent(new MessageEvent('message', { source: ventana, data: { tipo: 'gesicomm:buscar', id: 7, busqueda: 'licu' } }));
    await vi.waitFor(() => expect(respuestas.some(m => m.tipo === 'gesicomm:buscar-respuesta')).toBe(true));
    expect(onCatalogo).toHaveBeenCalledWith({ pagina: 1, porPagina: 6, busqueda: 'licu' });
    expect(respuestas.find(m => m.tipo === 'gesicomm:buscar-respuesta')).toEqual({ tipo: 'gesicomm:buscar-respuesta', id: 7, busqueda: 'licu', productos: [{ id: 'licuadora' }], error: false });
  });
});
