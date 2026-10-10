import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';

/**
 * La vista previa de escritorio mide su marco para escalar la landing. Con
 * StrictMode (como corre la app en desarrollo) el observador quedaba
 * desconectado y, al ocultar los paneles, la landing seguía con la medida
 * vieja: una franja en blanco abajo y a la derecha.
 */

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: () => <output data-testid="preview" /> }));

const catalogo = { productos: [
  { tipo: 'producto', id: 1, slug: 'cacerola', nombre: 'Cacerola', categoria: 'Cocina', precio_efectivo: 850000 },
], combos: [] };

const marco = { w: 1190, h: 630 };
let observadores = [];
let propiedades;

beforeEach(() => {
  observadores = [];
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb) { this.cb = cb; this.activo = false; observadores.push(this); }
    observe() { this.activo = true; }
    disconnect() { this.activo = false; }
  });
  propiedades = ['clientWidth', 'clientHeight'].map(p => [p, Object.getOwnPropertyDescriptor(HTMLElement.prototype, p)]);
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => marco.w });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => marco.h });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  propiedades.forEach(([p, d]) => { if (d) Object.defineProperty(HTMLElement.prototype, p, d); else delete HTMLElement.prototype[p]; });
  marco.w = 1190; marco.h = 630;
});

const lienzo = () => screen.getByTestId('preview').parentElement;

describe('Vista previa de escritorio: se vuelve a medir', () => {
  it('al ocultar los paneles la landing ocupa el marco nuevo, sin franja en blanco', () => {
    render(
      <React.StrictMode>
        <ConfigurarVentaCodigo catalogo={catalogo} inicial={{ seleccion: catalogo.productos }} onConfirmar={vi.fn()} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />
      </React.StrictMode>,
    );
    expect(lienzo().style.transform).toBe(`scale(${1190 / 1280})`);

    fireEvent.click(screen.getByRole('button', { name: /Ocultar paneles/ }));
    marco.w = 1280; marco.h = 820;
    const activos = observadores.filter(o => o.activo);
    expect(activos.length).toBeGreaterThan(0);
    act(() => { activos.forEach(o => o.cb([])); });

    expect(lienzo().style.transform).toBe('scale(1)');
    expect(lienzo().style.height).toBe('820px');
  });
});
