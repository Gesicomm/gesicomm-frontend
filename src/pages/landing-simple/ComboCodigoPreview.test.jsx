import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ComboCodigoPreview from './ComboCodigoPreview';

afterEach(cleanup);
const armado = {
  combo: { nombre: 'Mi combo', descripcion: 'Descripción del combo' },
  principal: { id: 7, nombre: 'Cacerola', precio_base: 100000, imagen: '/cacerola.png' },
  upsells: [{ id: 8, nombre: 'Utensilios', precio_base: 30000, imagen: '/utensilios.png' }],
  precioTotal: 120000, device: 'desktop', onDeviceChange: vi.fn(),
};
const landing = {
  codigos: {
    inicio: { html: '<h1>MI INICIO EXCLUSIVO</h1><div data-gesicomm-lista="combos"><template><span data-gesicomm-bind="nombre"></span></template></div>', css: '.exclusivo { color: rgb(1,2,3); }', js: 'console.log("JS_INICIO_PROPIO");' },
    producto: { html: '<h1>MI FICHA EXCLUSIVA</h1><span data-gesicomm-producto="nombre"></span>', css: '.ficha-exclusiva { background: #123456; }', js: 'console.log("JS_FICHA_PROPIO");' },
  },
  tienda: { nombre: 'Tienda personalizada', color_primario: '#abcdef' },
  productos: [{ tipo: 'producto', id: 10, slug: 'otro', nombre: 'Otro producto', precio_efectivo: 90000 }],
  venta: { seleccion: 'manual', configurado: true },
};
const documento = () => screen.getByTitle('Combo en el HTML de esta landing').getAttribute('srcdoc');

describe('Vista del combo con el HTML actual de la landing', () => {
  it('usa el HTML, CSS y JS personalizados y cambia entre ficha e inicio con el combo en curso', () => {
    render(<ComboCodigoPreview {...armado} landing={landing} />);
    expect(documento()).toContain('MI FICHA EXCLUSIVA');
    expect(documento()).toContain('background: #123456');
    expect(documento()).toContain('JS_FICHA_PROPIO');
    expect(documento()).toContain('Mi combo');
    expect(documento()).toContain('Utensilios');
    expect(documento()).toContain('Tienda personalizada');
    fireEvent.click(screen.getByRole('button', { name: 'Inicio', exact: true }));
    expect(documento()).toContain('MI INICIO EXCLUSIVO');
    expect(documento()).toContain('rgb(1,2,3)');
    expect(documento()).toContain('JS_INICIO_PROPIO');
    expect(documento()).not.toContain('MI FICHA EXCLUSIVA');
    expect(documento()).toContain('Otro producto');
    expect(documento()).toContain('combo-0');
  });
  it('actualiza el precio y las fotos del borrador sin guardar ni modificar la selección', () => {
    const { rerender } = render(<ComboCodigoPreview {...armado} landing={landing} />);
    rerender(<ComboCodigoPreview {...armado} precioTotal={115000} imagenes={[{ url: 'blob:portada-borrador', es_principal: true }]} landing={landing} />);
    expect(documento()).toContain('115000');
    expect(documento()).toContain('blob:portada-borrador');
    expect(landing.productos).toHaveLength(1);
    expect(landing.productos[0].id).toBe(10);
  });
  it('si falta HTML muestra la limitación, sin reemplazarlo por la ficha genérica', () => {
    render(<ComboCodigoPreview {...armado} landing={{ ...landing, codigos: { inicio: landing.codigos.inicio } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('todavía no tiene HTML para la ficha del combo');
    expect(screen.queryByTitle('Combo en el HTML de esta landing')).toBeNull();
    expect(screen.queryByText('¿Qué incluye?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Inicio', exact: true }));
    expect(documento()).toContain('MI INICIO EXCLUSIVO');
  });
});
