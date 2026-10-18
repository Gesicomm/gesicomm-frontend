import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import CodigoPreview from './CodigoPreview';
vi.mock('./construirDocumentoCodigo', () => ({ construirDocumentoCodigo: () => '<main></main>', SANDBOX_CODIGO: 'allow-scripts' }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('el envío diferido al cargar usa los últimos checks, sin restaurar una versión anterior', () => {
  vi.useFakeTimers();
  const codigo = { html: '<main></main>' };
  const { container, rerender } = render(<CodigoPreview codigo={codigo} datos={{ incluye: true }} />);
  const iframe = container.querySelector('iframe');
  const enviar = vi.spyOn(iframe.contentWindow, 'postMessage');
  fireEvent.load(iframe);
  rerender(<CodigoPreview codigo={codigo} datos={{ incluye: false }} />);
  vi.advanceTimersByTime(100);
  expect(enviar).toHaveBeenLastCalledWith({ tipo: 'gesicomm:datos', datos: { incluye: false } }, '*');
});
