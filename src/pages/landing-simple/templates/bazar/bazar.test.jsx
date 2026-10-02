import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BazarProductPage from './BazarProductPage';
import BazarProductPagePublica from './BazarProductPagePublica';
import FichaBazarPanel from '../../panels/FichaBazarPanel';
import { DEFAULTS_BAZAR, GRUPOS_PANEL_BAZAR, fichaBazarDesdeProducto, resolverFichaBazar } from './fichaBazar';
import { armarItemFicha } from '../fichaComun';
import { demoDeTemplate } from '../demoTemplates';
import { getComponenteTemplate } from '../index';
import FichaRubroTab from '../../../productos/FichaRubroTab';

afterEach(cleanup);
const item = armarItemFicha({ nombre: 'Producto real', precio: 100000, imagenes: [] });
const mount = ui => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Bazar: inheritance, real commerce and shared previews', () => {
  it('keeps sample claims out of a newly created store', () => {
    const ficha = resolverFichaBazar(null, null, null);
    mount(<BazarProductPage item={item} ficha={ficha} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Producto real');
    expect(screen.queryByText(/CASA NORTE|Manta Nórdica|Envío gratis|Compra segura|186 reseñas/)).toBeNull();
    expect(ficha.resenas.items).toEqual([]);
    expect(ficha.garantias.items).toEqual([]);
    expect(ficha.barra_superior.items).toEqual([]);
  });
  it('honors landing < product < per-landing product overrides without mutating defaults', () => {
    const producto = fichaBazarDesdeProducto({ ficha_datos: { bazar_ficha: { materiales: { activo: true, titulo: 'Del producto', items: [{ nombre: 'Lino' }] }, medidas: { texto: '20 × 30 cm' } } } });
    const ficha = resolverFichaBazar({ materiales: { titulo: 'En esta landing' } }, { materiales: { titulo: 'General', subtitulo: 'Cargado por el comercio' } }, producto);
    expect(ficha.materiales).toMatchObject({ titulo: 'En esta landing', subtitulo: 'Cargado por el comercio', items: [{ nombre: 'Lino' }] });
    expect(resolverFichaBazar(null, null, producto).materiales.titulo).toBe('Del producto');
    expect(ficha.medidas.texto).toBe('20 × 30 cm');
    expect(DEFAULTS_BAZAR.materiales.items).toEqual([]);
    expect(resolverFichaBazar({ materiales: { items: 'bad', color_fondo: 'bad' }, medidas: { items: [null, 'Sillón', 3] } }, null, null).medidas.items).toEqual(['Sillón']);
  });
  it('shows real packs instead of free quantity and sends the selected offer to checkout', () => {
    const agregar = vi.fn();
    const dto = { nombre: 'Producto real', precio: 100000, ofertas: [{ id: 7, nombre: 'Dúo real', estrategia: 'normal', tipo_contenido: 'pack', unidades: 2, precio: 170000 }, { id: 8, nombre: 'Bump', estrategia: 'order_bump', precio: 50000 }] };
    mount(<BazarProductPagePublica item={dto} onAgregar={agregar} />);
    expect(screen.queryByRole('button', { name: 'Sumar uno' })).toBeNull();
    expect(screen.queryByText('Bump')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Dúo real/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Agregar al carrito' })[0]);
    expect(agregar).toHaveBeenCalledWith(expect.objectContaining({ item: dto, oferta: dto.ofertas[0], precio: 170000, cantidad: 1 }));
  });
  it('falls back to quantity with no packs and propagates the selected variant and quantity', () => {
    const agregar = vi.fn();
    const variantes = [{ id: 2, nombre: 'Arena', stock: 4, precio_efectivo: 110000 }];
    mount(<BazarProductPage item={{ ...item, variantes }} ficha={resolverFichaBazar(null, null, null)} onAgregar={agregar} />);
    fireEvent.click(screen.getByRole('button', { name: /Arena/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Sumar uno' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Agregar al carrito' })[0]);
    expect(agregar).toHaveBeenCalledWith(expect.objectContaining({ variante: variantes[0], cantidad: 2, precio: 110000 }));
  });
  it('renders the registered store and mobile preview with materials, environments and dimensions', () => {
    const demo = demoDeTemplate('bazar-hogar');
    const Store = getComponenteTemplate('bazar-hogar');
    const store = mount(<Store data={demo.tienda} isMobile previewMode />);
    expect(screen.getAllByText('Bazar Jobar').length).toBeGreaterThan(0);
    store.unmount();
    const product = mount(<demo.Pagina item={demo.item} ficha={demo.ficha} isMobile />);
    expect(screen.getByText('En el sofá')).toBeInTheDocument();
    expect(screen.getByText('Medidas en contexto')).toBeInTheDocument();
    expect(product.container.querySelector('.hpg-root.es-movil')).not.toBeNull();
    product.unmount();
    mount(<FichaBazarPanel ficha={null} fichaResuelta={demo.ficha} onChange={vi.fn()} />);
    expect(screen.getByText(/Materiales y terminaciones/)).toBeInTheDocument();
  });
  it('opens every inspector and edits product-owned material content without losing inherited rows', () => {
    const demo = demoDeTemplate('bazar-hogar');
    const cambiar = vi.fn();
    const panel = mount(<FichaBazarPanel ficha={null} fichaResuelta={demo.ficha} onChange={cambiar} />);
    for (const grupo of GRUPOS_PANEL_BAZAR) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(grupo.label) }));
      fireEvent.click(screen.getByRole('button', { name: 'Secciones', exact: true }));
    }
    panel.unmount();
    const datos = { bazar_ficha: { materiales: demo.ficha.materiales } };
    mount(<FichaRubroTab rubro="bazar" datos={datos} onDatos={cambiar} modo="campos" />);
    fireEvent.click(screen.getByRole('button', { name: /Materiales y terminaciones/ }));
    fireEvent.change(screen.getByDisplayValue('Hecha para usarla'), { target: { value: 'Material cargado por el comercio' } });
    expect(cambiar).toHaveBeenLastCalledWith(expect.objectContaining({ bazar_ficha: expect.objectContaining({ materiales: expect.objectContaining({ titulo: 'Material cargado por el comercio', items: demo.ficha.materiales.items }) }) }));
  });
  it('hides the product heading when disabled and never derives a combo discount from unrelated unit prices', () => {
    const ficha = resolverFichaBazar({ hero: { activo: false } }, null, null);
    const oferta = { id: 10, nombre: 'Set Living real', tipo_contenido: 'combo', estrategia: 'normal', unidades: 4, precio: 150000 };
    mount(<BazarProductPage item={armarItemFicha({ nombre: 'Producto real', precio: 100000, ofertas: [oferta] })} ficha={ficha} />);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('button', { name: /Set Living real/ })).not.toHaveTextContent('Ahorrás');
  });
});
