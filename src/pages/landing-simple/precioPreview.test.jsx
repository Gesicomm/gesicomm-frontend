import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mapEditorDraftToTemplateData } from './mapLandingToTemplateData';
import CatalogoPreview from './templates/CatalogoPreview';
import { armarItemFicha } from './templates/fichaComun';
import ModaProductPage from './templates/moda/ModaProductPage';
import { resolverFichaModa } from './templates/moda/fichaModa';
import BazarProductPage from './templates/bazar/BazarProductPage';
import { resolverFichaBazar } from './templates/bazar/fichaBazar';

afterEach(cleanup);
describe('Precio de preview y campos de medidas', () => {
  const producto = { id: 1, tipo: 'producto', nombre: 'Florero QA', precio_base: 45000, precio_efectivo: 159000, precio_publico: 143100 };
  it('usa el precio público resuelto en destacados sin confundir costo o precio editable', () => {
    const data = mapEditorDraftToTemplateData({ items: [{ tipo: 'producto', referencia_id: 1 }] }, { productos: [producto] });
    expect(data.productos[0].precio).toBe(143100);
    expect(producto.precio_efectivo).toBe(159000);
  });
  it('usa el mismo precio público en el catálogo del editor', () => {
    render(<MemoryRouter><CatalogoPreview productos={[producto]} titulo="Catálogo QA" tema={{}} /></MemoryRouter>);
    expect(screen.getByText('Gs. 143.100')).toBeInTheDocument();
    expect(screen.queryByText('Gs. 159.000')).toBeNull();
  });
  it('publica el texto destacado que el usuario carga en Medidas', () => {
    const ficha = resolverFichaBazar({ medidas: { activo: true, titulo: 'Medidas QA', titulo_destacado: 'en contexto QA', texto: '24 cm' } });
    render(<MemoryRouter><BazarProductPage item={armarItemFicha({ nombre: 'Florero QA', precio: 143100 })} ficha={ficha} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Medidas QA en contexto QA' })).toBeInTheDocument();
  });
  it('publica el texto destacado de la guía de talles de Moda', () => {
    const ficha = resolverFichaModa({ guia_talles: { activo: true, titulo: 'Guía QA', titulo_destacado: 'medidas reales QA', columnas: ['Talle'], filas: [['S']] } });
    render(<MemoryRouter><ModaProductPage item={armarItemFicha({ nombre: 'Vestido QA', precio: 204000 })} ficha={ficha} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Guía QA medidas reales QA' })).toBeInTheDocument();
  });
});
