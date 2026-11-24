import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/dom';

const html = readFileSync('registro/web/inicio.html', 'utf8');
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
  const pagina = new DOMParser().parseFromString(html, 'text/html');
  document.body.replaceChildren(document.importNode(pagina.getElementById('precios'), true));
  window.eval(pagina.getElementById('gc-prices-script').textContent);
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); document.body.replaceChildren(); });

it('cambia precios, períodos y ambos enlaces de cada plan con modalidad anual', () => {
  fireEvent.click(screen.getByRole('button', { name: 'Descuento anual' }));
  for (const [clave, importe] of [['builder','370'],['founder','470'],['starter','570']]) {
    const tarjeta = document.querySelector(`[data-plan="${clave}"]`);
    expect(tarjeta.querySelector('.gc-amount strong')).toHaveTextContent(importe);
    expect(tarjeta.querySelector('.gc-amount small:last-child')).toHaveTextContent('/ año');
    for (const enlace of tarjeta.querySelectorAll('.gc-plan-cta')) expect(enlace.getAttribute('href')).toBe(`/solicitar-prueba?plan=${clave}&billing=annual`);
  }
  expect(document.querySelector('[data-plan=founder] .gc-plan-note')).toHaveTextContent('USD 94');
  expect(document.querySelector('[data-plan=starter] .gc-plan-note')).toHaveTextContent('USD 114');
});

it('identifica Scaler como solo mensual y nunca lo envía a una oferta anual inexistente', () => {
  fireEvent.click(screen.getByRole('button', { name: 'Descuento anual' }));
  const tarjeta = document.querySelector('[data-plan=scaler]');
  expect(within(tarjeta).getByText('Solo mensual')).toBeVisible();
  expect(tarjeta.querySelector('.gc-amount strong')).toHaveTextContent('77');
  for (const enlace of tarjeta.querySelectorAll('.gc-plan-cta')) expect(enlace.getAttribute('href')).toContain('billing=monthly');
});

it('restaura los precios mensuales y sus enlaces sin duplicar beneficios', () => {
  fireEvent.click(screen.getByRole('button', { name: 'Descuento anual' }));
  fireEvent.click(screen.getByRole('button', { name: 'Planes mensuales' }));
  for (const [clave, importe] of [['builder','37'],['founder','47'],['starter','57'],['scaler','77']]) {
    const tarjeta = document.querySelector(`[data-plan="${clave}"]`);
    expect(tarjeta.querySelector('.gc-amount strong')).toHaveTextContent(importe);
    expect(tarjeta.querySelector('.gc-amount small:last-child')).toHaveTextContent('/ mes');
    expect(tarjeta.querySelectorAll('.gc-plan-features li').length).toBe(9);
  }
});
