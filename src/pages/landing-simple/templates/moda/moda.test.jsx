import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ModaProductPage from './ModaProductPage';
import ModaProductPagePublica from './ModaProductPagePublica';
import FichaModaPanel from '../../panels/FichaModaPanel';
import { DEFAULTS_MODA, GRUPOS_PANEL_MODA, fichaModaDesdeProducto, resolverFichaModa } from './fichaModa';
import { armarItemFicha } from '../fichaComun';
import { demoDeTemplate } from '../demoTemplates';
import { getComponenteTemplate } from '../index';
import FichaRubroTab from '../../../productos/FichaRubroTab';
import TemplatePreviewModal from '../../TemplatePreviewModal';
import { mapEditorDraftToTemplateData } from '../../mapLandingToTemplateData';
import ModaTemplate from '../ModaTemplate';
import TemplateSelector from '../../TemplateSelector';
import { landingSimpleService } from '../../../../services/landingSimpleService';

afterEach(cleanup);
const mount = ui => render(<MemoryRouter>{ui}</MemoryRouter>);
const item = armarItemFicha({ nombre: 'Prenda real', precio: 100000, variantes: [{ id: 5, nombre: 'M', stock: 2, precio_efectivo: 110000 }, { id: 6, nombre: 'L', stock: 0, precio_efectivo: 120000 }] });

describe('Moda: editable template, real sizes and matching previews', () => {
  it('opens the selector thumbnail without nesting storefront controls inside its button', async () => {
    const listar = vi.spyOn(landingSimpleService, 'listarTemplates').mockResolvedValue([{ id: 124, slug: 'moda-indumentaria', name: 'Moda QA' }]);
    try {
      const { container } = mount(<TemplateSelector />);
      fireEvent.click(await screen.findByRole('button', { name: 'Ver preview de Moda QA' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(container.querySelector('button button')).toBeNull();
    } finally { listar.mockRestore(); }
  });
  it('opens the size selection from a compact catalog and disables unavailable products in the home preview', () => {
    const data = mapEditorDraftToTemplateData({ items: [
      { tipo: 'producto', referencia_id: 1 }, { tipo: 'producto', referencia_id: 2 },
    ] }, { productos: [
      { id: 1, nombre: 'Con talles', stock: 5, tiene_opciones: true },
      { id: 2, nombre: 'Agotado', stock: 0 },
    ] });
    const elegir = vi.fn();
    const agregar = vi.fn();
    mount(<ModaTemplate data={data} onClickProducto={elegir} onAgregarProducto={agregar} previewMode />);
    fireEvent.click(screen.getByRole('button', { name: 'Elegir', exact: true }));
    expect(elegir).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Con talles', tieneOpciones: true }));
    expect(agregar).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sin stock', exact: true })).toBeDisabled();
  });
  it('does not publish sample prices, sizes, conditions or testimonials', () => {
    const ficha = resolverFichaModa(null, null, null);
    mount(<ModaProductPage item={armarItemFicha({ nombre: 'Prenda real', precio: 100000 })} ficha={ficha} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Prenda real');
    expect(screen.queryByText(/MODO NORTE|Blazer Forma|Envío gratis|Compra segura|248 reseñas|XS/)).toBeNull();
    expect(ficha.guia_talles.filas).toEqual([]);
    expect(ficha.resenas.items).toEqual([]);
    expect(ficha.garantias.items).toEqual([]);
  });
  it('requires an available size and sends its real price and quantity to checkout', () => {
    const agregar = vi.fn();
    const dto = { nombre: item.nombre, precio: item.precio, variantes: item.variantes };
    mount(<ModaProductPagePublica item={dto} onAgregar={agregar} />);
    const buy = screen.getAllByRole('button', { name: 'Agregar al carrito' });
    expect(buy.every(b => b.disabled)).toBe(true);
    expect(screen.getByRole('button', { name: 'Talle L' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Talle M' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sumar uno' }));
    fireEvent.click(buy[0]);
    expect(agregar).toHaveBeenCalledWith(expect.objectContaining({ item: dto, variante: dto.variantes[0], cantidad: 2, precio: 110000 }));
  });
  it('uses the same per-landing FAQ title over the saved product title in public and preview', () => {
    const dto = { nombre: 'Prenda real', precio: 100000, faq_titulo: 'Cuidados del producto', faq: [{ pregunta: '¿Cómo lavar?', respuesta: 'En frío' }], ficha_moda: { faq: { titulo: 'Cuidados de esta landing' } } };
    const previewFicha = resolverFichaModa(dto.ficha_moda, null, fichaModaDesdeProducto(dto));
    const preview = mount(<ModaProductPage item={armarItemFicha({ nombre: dto.nombre, precio: dto.precio, faq: dto.faq, faqTitulo: dto.faq_titulo })} ficha={previewFicha} previewMode />);
    expect(screen.getByRole('heading', { name: 'Cuidados de esta landing' })).toBeInTheDocument();
    preview.unmount();
    mount(<ModaProductPagePublica item={dto} />);
    expect(screen.getByRole('heading', { name: 'Cuidados de esta landing' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cuidados del producto' })).toBeNull();
  });
  it('keeps the mandatory size selector usable even when the options section is hidden', () => {
    mount(<ModaProductPage item={item} ficha={resolverFichaModa({ opciones: { activo: false } }, null, null)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Talle M' }));
    expect(screen.getAllByRole('button', { name: 'Agregar al carrito' })[0]).toBeEnabled();
  });
  it('inherits product content and normalizes configurable size tables without mutating defaults', () => {
    const producto = fichaModaDesdeProducto({ ficha_datos: { moda_ficha: { guia_talles: { activo: true, columnas: ['Talle', 'Largo'], filas: [['M', 72], null] }, materiales: { titulo: 'Producto', items: [{ nombre: 'Lino' }] } } } });
    const ficha = resolverFichaModa({ materiales: { titulo: 'Propio' } }, { materiales: { subtitulo: 'De la landing' } }, producto);
    expect(ficha.materiales).toMatchObject({ titulo: 'Propio', subtitulo: 'De la landing', items: [{ nombre: 'Lino' }] });
    expect(ficha.guia_talles.filas).toEqual([['M', '72']]);
    expect(DEFAULTS_MODA.guia_talles.filas).toEqual([]);
    expect(resolverFichaModa({ guia_talles: { columnas: null, filas: 'bad' } }, null, null).guia_talles.filas).toEqual([]);
  });
  it('opens every inspector and saves a product-owned size table', () => {
    const demo = demoDeTemplate('moda-indumentaria');
    const cambiar = vi.fn();
    const panel = mount(<FichaModaPanel ficha={null} fichaResuelta={demo.ficha} onChange={cambiar} />);
    for (const grupo of GRUPOS_PANEL_MODA) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(grupo.label) }));
      fireEvent.click(screen.getByRole('button', { name: 'Secciones', exact: true }));
    }
    panel.unmount();
    mount(<FichaRubroTab rubro="moda" datos={{ moda_ficha: { guia_talles: demo.ficha.guia_talles } }} onDatos={cambiar} modo="campos" />);
    fireEvent.click(screen.getByRole('button', { name: /Guía de talles/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Busto fila 1' }), { target: { value: '85–89' } });
    expect(cambiar.mock.calls.at(-1)[0].moda_ficha.guia_talles.filas[0][1]).toBe('85–89');
  });
  it('renders the real store and product from the selector preview, including mobile mode', () => {
    const preview = mount(<TemplatePreviewModal template={{ slug: 'moda-indumentaria', name: 'Moda' }} onCerrar={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Blazer Forma', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Celular'));
    expect(preview.container.querySelector('.mpg-root.es-movil')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tienda', exact: true }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Vestite como');
    expect(preview.container.querySelector('.fashion-store.es-movil')).not.toBeNull();
    expect(getComponenteTemplate('moda-indumentaria')).toBeTruthy();
  });
  it('uses real normal offers and hides quantity without including checkout upsells', () => {
    const agregar = vi.fn();
    const oferta = { id: 9, estrategia: 'normal', tipo_contenido: 'pack', unidades: 2, nombre: 'Pack real', precio: 180000 };
    const withPacks = armarItemFicha({ nombre: 'Prenda', precio: 100000, ofertas: [oferta, { id: 10, nombre: 'Upsell oculto', estrategia: 'upsell', precio: 10000 }] });
    mount(<ModaProductPage item={withPacks} ficha={resolverFichaModa(null, null, null)} onAgregar={agregar} />);
    expect(screen.queryByText('Upsell oculto')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sumar uno' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Pack real/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Agregar al carrito' })[0]);
    expect(agregar).toHaveBeenCalledWith(expect.objectContaining({ pack: oferta, cantidad: 1, precio: 180000 }));
  });
});
