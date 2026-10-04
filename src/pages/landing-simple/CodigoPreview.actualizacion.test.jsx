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
