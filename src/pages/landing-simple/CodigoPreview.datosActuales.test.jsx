import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import CodigoPreview from './CodigoPreview';
const construir = vi.hoisted(() => vi.fn(codigo => codigo?.html || '<main></main>'));
vi.mock('./construirDocumentoCodigo', () => ({ construirDocumentoCodigo: construir, SANDBOX_CODIGO: 'allow-scripts' }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

it('el cambio de método de pago solo se acepta desde su propio iframe', () => {
  const onMetodoPago = vi.fn();
  const { container } = render(<CodigoPreview codigo={{ html: '<main></main>' }} onMetodoPago={onMetodoPago} />);
  const iframe = container.querySelector('iframe');
  window.dispatchEvent(new MessageEvent('message', { source: window, data: { tipo: 'gesicomm:metodo-pago', metodo: 'pagopar' } }));
  expect(onMetodoPago).not.toHaveBeenCalled();
  window.dispatchEvent(new MessageEvent('message', { source: iframe.contentWindow, data: { tipo: 'gesicomm:metodo-pago', metodo: 'contra_entrega' } }));
  expect(onMetodoPago).toHaveBeenCalledExactlyOnceWith('contra_entrega');
});

it('escribe varios cambios en el combo sin modificar srcDoc ni reiniciar el iframe', () => {
  const { container, rerender } = render(<CodigoPreview edicionCombo="99" codigo={{ html: '<h1>Inicial</h1>', css: 'h1{color:red}', js: '' }} />);
  const iframe = container.querySelector('iframe');
  const doc = iframe.getAttribute('srcdoc');
  const enviar = vi.spyOn(iframe.contentWindow, 'postMessage');
  for (const texto of ['C', 'Co', 'Combo']) {
    rerender(<CodigoPreview edicionCombo="99" codigo={{ html: `<h1>${texto}</h1>`, css: 'h1{color:blue}', js: '' }} />);
    expect(container.querySelector('iframe')).toBe(iframe);
    expect(iframe.getAttribute('srcdoc')).toBe(doc);
    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'gesicomm:combo-documento', html: `<h1>${texto}</h1>` }), '*');
  }
  expect(construir).toHaveBeenCalledTimes(1);
  rerender(<CodigoPreview edicionCombo="100" codigo={{ html: '<h1>Otro combo</h1>', css: '', js: '' }} />);
  expect(iframe.getAttribute('srcdoc')).toContain('Otro combo');
  expect(construir).toHaveBeenCalledTimes(2);
});
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
it('restaura el scroll del combo al actualizar el documento y solo acepta mensajes de su iframe', () => {
  vi.useFakeTimers();
  const { container } = render(<CodigoPreview codigo={{ html: '<main>Combo</main>' }} preservarScroll />);
  const iframe = container.querySelector('iframe');
  const enviar = vi.spyOn(iframe.contentWindow, 'postMessage');
  window.dispatchEvent(new MessageEvent('message', { source: iframe.contentWindow, data: { tipo: 'gesicomm:scroll', y: 640 } }));
  window.dispatchEvent(new MessageEvent('message', { source: window, data: { tipo: 'gesicomm:scroll', y: 9999 } }));
  fireEvent.load(iframe);
  expect(enviar).toHaveBeenCalledWith({ tipo: 'gesicomm:restaurar-scroll', y: 640 }, '*');
});
