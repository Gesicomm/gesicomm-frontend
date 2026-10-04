import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ComboProductPagePublica from './ComboProductPagePublica';
import { DEFAULT_TEMA_POR_TEMPLATE } from '../themeUtils';
afterEach(cleanup);
const item = { tipo: 'combo', nombre: 'Combo sin vista propia QA', precio: 190000, descripcion: 'Descripción real QA', productos_combo: [{ id: 1, nombre: 'Producto incluido QA', cantidad: 2, precio: 100000 }] };
describe('Combo sin vista propia acompaña al template', () => {
  it.each(Object.keys(DEFAULT_TEMA_POR_TEMPLATE))('hereda la identidad de %s', slug => {
    const { container } = render(<MemoryRouter><ComboProductPagePublica item={item} templateSlug={slug} /></MemoryRouter>);
    const root = container.querySelector('.cmb-root');
    expect(root.style.getPropertyValue('--cmb-bg')).toBe(DEFAULT_TEMA_POR_TEMPLATE[slug].fondo);
    expect(root.style.getPropertyValue('--cmb-accent')).toBe(DEFAULT_TEMA_POR_TEMPLATE[slug].acento);
    if (['bazar-hogar', 'moda-indumentaria', 'beauty-skincare'].includes(slug)) expect(root.style.getPropertyValue('--cmb-font-heading')).toContain('Georgia');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(item.nombre);
    expect(screen.getByText(item.descripcion)).toBeInTheDocument();
    expect(screen.queryByText('Envío gratis')).toBeNull();
    expect(screen.queryByText('Garantía 30 días')).toBeNull();
    expect(screen.queryByText('Más vendido')).toBeNull();
    expect(screen.queryByLabelText('4.8 de 5')).toBeNull();
    expect(container.querySelector('.cmb-contador')).toBeNull();
  });
  it('respeta colores y textos propios de la landing y del combo', () => {
    const { container } = render(<MemoryRouter><ComboProductPagePublica item={{ ...item, ficha_combo: { hero: { lead: 'Promesa propia QA' } } }} templateSlug="moda-indumentaria" tema={{ fondo: '#faf4f7', texto: '#38242e', acento: '#985776' }} landingConfig={{ ficha_combo: { hero: { lead: 'Promesa heredada QA', nota_envio: 'Envío definido por la tienda QA' } } }} /></MemoryRouter>);
    expect(container.querySelector('.cmb-root').style.getPropertyValue('--cmb-accent')).toBe('#985776');
    expect(screen.getByText('Promesa propia QA')).toBeInTheDocument();
    expect(screen.queryByText('Promesa heredada QA')).toBeNull();
    expect(screen.getAllByText('Envío definido por la tienda QA').length).toBeGreaterThan(0);
  });
});
