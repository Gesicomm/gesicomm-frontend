import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductForm from './ProductForm';
import { productService } from '../../services/productService';
import { ofertaService } from '../../services/ofertaService';

vi.mock('../../services/productService', () => ({ productService: {
  buscar: vi.fn().mockResolvedValue([]), crear: vi.fn(), variantes: vi.fn().mockResolvedValue([]),
} }));
vi.mock('../../services/ofertaService', () => ({ ofertaService: {
  listarPorProducto: vi.fn().mockResolvedValue([]), crear: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn(),
} }));
vi.mock('../../services/catalogoService', () => ({ categoriaService: { buscar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/costosGastosService', () => ({ proveedoresService: { buscar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { obtenerConfiguracion: vi.fn().mockResolvedValue(null) } }));
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 9, rol: 'tienda' }) }));
vi.mock('./ProductLandingPreview', () => ({ default: () => null }));
vi.mock('./FichaRubroTab', () => ({ default: () => null }));
vi.mock('../landing-simple/panels/FaqPanel', () => ({ default: () => null }));
vi.mock('../landing/ProductPicker', () => ({ default: ({ onToggle }) => <button type="button" onClick={() => onToggle({ id: 7 })}>Elegir extra QA</button> }));

beforeEach(() => {
  vi.clearAllMocks();
  productService.crear.mockResolvedValue({ id: 42, ofertas: [{ id: 61 }] });
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

async function montar() {
  render(<MemoryRouter initialEntries={['/products/nuevo']}><Routes>
    <Route path="/products/nuevo" element={<ProductForm />} />
    <Route path="/mi-catalogo" element={<p>Catálogo guardado</p>} />
  </Routes></MemoryRouter>);
  await screen.findByRole('button', { name: 'Nueva oferta' });
}
function guardar() { fireEvent.click(screen.getAllByRole('button', { name: 'Guardar', exact: true })[0]); }
function completarIdentidad() {
  fireEvent.change(document.getElementById('prod-nombre'), { target: { value: 'Mi producto' } });
  fireEvent.change(document.getElementById('prod-sku'), { target: { value: 'SKU-123' } });
}
function completarPrecio(valor = '10000') {
  fireEvent.change(document.getElementById('prod-precio-base'), { target: { value: valor } });
}
async function prepararPack() {
  fireEvent.click(screen.getByRole('tab', { name: /^Venta/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Nueva oferta' }));
  fireEvent.change(screen.getByPlaceholderText('Ej. Llevá 2 y ahorrá'), { target: { value: 'Pack x2' } });
  const precio = screen.getByText('Precio del paquete', { selector: 'label' }).parentElement.querySelector('input');
  fireEvent.change(precio, { target: { value: '18000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar oferta al producto' }));
  await screen.findByText('Pack x2', { selector: '.combo-list-card-name' });
}

describe('Alta de producto por secciones', () => {
  it('abre directamente Venta cuando el listado pide gestionar ofertas', async () => {
    sessionStorage.setItem('gesicomm:tabInicial', 'ofertas');
    await montar();
    expect(screen.getByRole('tab', { name: /^Venta/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Nueva oferta' })).toBeVisible();
  });

  it('desde Identidad lleva a Precio y enfoca el campo pendiente, sin crear el producto', async () => {
    await montar();
    completarIdentidad();
    guardar();
    await waitFor(() => expect(document.getElementById('prod-precio-base')).toHaveFocus());
    expect(screen.getByRole('tab', { name: /^Precio/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('El precio base es requerido.')).toBeVisible();
    expect(document.getElementById('prod-nombre')).toHaveValue('Mi producto');
    expect(productService.crear).not.toHaveBeenCalled();
  });

  it('recorre Identidad y Precio al corregir errores en distintas secciones', async () => {
    await montar();
    fireEvent.click(screen.getByRole('tab', { name: /^Venta/ }));
    guardar();
    await waitFor(() => expect(document.getElementById('prod-nombre')).toHaveFocus());
    fireEvent.change(document.getElementById('prod-nombre'), { target: { value: 'Mi producto' } });
    guardar();
    await waitFor(() => expect(document.getElementById('prod-sku')).toHaveFocus());
    fireEvent.change(document.getElementById('prod-sku'), { target: { value: 'ABC' } });
    guardar();
    await waitFor(() => expect(document.getElementById('prod-precio-base')).toHaveFocus());
  });

  it('muestra los mínimos para guardar y vender con accesos a sus secciones', async () => {
    await montar();
    expect(screen.getByLabelText('Datos mínimos del producto')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Stock disponible' }));
    expect(screen.getByRole('tab', { name: /^Inventario/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('permite preparar, editar y guardar un pack antes del primer guardado del producto', async () => {
    await montar();
    await prepararPack();
    expect(productService.crear).not.toHaveBeenCalled();
    expect(ofertaService.crear).not.toHaveBeenCalled();
    expect(ofertaService.listarPorProducto).not.toHaveBeenCalled();
    expect(productService.variantes).not.toHaveBeenCalledWith(-1);
    fireEvent.click(screen.getByRole('button', { name: 'Editar', exact: true }));
    fireEvent.change(screen.getByPlaceholderText('Ej. Llevá 2 y ahorrá'), { target: { value: 'Pack editado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar oferta preparada' }));
    await screen.findByText('Pack editado', { selector: '.combo-list-card-name' });
    completarIdentidad();
    completarPrecio();
    guardar();
    await screen.findByText('Catálogo guardado');
    expect(productService.crear).toHaveBeenCalledTimes(1);
    expect(productService.crear.mock.calls[0][0]).toMatchObject({
      nombre: 'Mi producto', precio_base: 10000,
      ofertas: [{ nombre: 'Pack editado', precio_normal: 18000, componentes: [{ producto_id: null, es_producto_actual: true, cantidad: 2 }] }],
    });
  });

  it('conserva las ofertas al fallar el guardado y abre Venta ante un error del servidor', async () => {
    await montar();
    await prepararPack();
    completarIdentidad(); completarPrecio();
    productService.crear.mockRejectedValueOnce({ response: { data: { message: 'Código de oferta repetido.', seccion: 'venta' } } });
    fireEvent.click(screen.getByRole('tab', { name: /^Identidad/ }));
    guardar();
    await screen.findByText('Código de oferta repetido.');
    expect(screen.getByRole('tab', { name: /^Venta/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Pack x2', { selector: '.combo-list-card-name' })).toBeVisible();
    guardar();
    await screen.findByText('Catálogo guardado');
    expect(productService.crear.mock.calls[1][0].ofertas).toHaveLength(1);
  });

  it('no ofrece Combo dentro del armador de ofertas', async () => {
    await montar();
    fireEvent.click(screen.getByRole('tab', { name: /^Venta/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Nueva oferta' }));
    expect(screen.queryByRole('radio', { name: /^Combo/ })).toBeNull();
  });

  it.each([
    ['Order bump', 'order_bump', 'Precio de lo que se suma'],
    ['Upsell', 'upsell', 'Precio de lo que se suma'],
  ])('prepara %s con referencias correctas al producto nuevo y al complemento', async (tipo, estrategia, label) => {
    await montar();
    completarIdentidad(); completarPrecio();
    fireEvent.click(screen.getByRole('tab', { name: /^Venta/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Nueva oferta' }));
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${tipo}`) }));
    fireEvent.click(screen.getByRole('button', { name: 'Elegir extra QA' }));
    fireEvent.change(document.querySelector('.modal-content input[required]:not([type="number"])'), { target: { value: `${tipo} QA` } });
    fireEvent.change(screen.getByText(label, { selector: 'label' }).parentElement.querySelector('input'), { target: { value: '12000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar oferta al producto' }));
    await screen.findByText(`${tipo} QA`, { selector: '.combo-list-card-name' });
    guardar();
    await screen.findByText('Catálogo guardado');
    const oferta = productService.crear.mock.calls[0][0].ofertas[0];
    expect(oferta.estrategia).toBe(estrategia);
    expect(oferta.componentes.some(c => c.es_producto_actual)).toBe(false);
    expect(oferta.componentes.some(c => c.producto_id === 7)).toBe(true);
  });
});

describe('Importar el JSON de la IA', () => {
  const json = {
    schema_version: '1.1',
    product: {
      identity: { name: 'Mouse QA', sku: 'QA-1', category: { name: 'tecnologia', id: null }, provider: { name: null, id: null }, tags: [] },
      pricing: { purchase_cost: 35000, purchase_currency: 'LOCAL', sale_price: 89000, anchor_price: null, discount: { percentage: 0 } },
      inventory: { stock_store: 0, stock_warehouse: 0, minimum_total_stock: 0 },
      publication: { sale_status: 'en_venta', active: true, featured: false },
      landing_blocks: {
        product_showcase: {
          badge: 'MÁS VENDIDO',
          tagline: 'Trabajá sin cables y sin ruido.',
          short_description: 'Mouse inalámbrico compacto.',
          description: 'Mouse con receptor USB. Ideal para la oficina.',
          highlights: ['Inalámbrico'],
          cta: 'Quiero el mío',
        },
        faqs: [], testimonials: [],
      },
    },
  };

  it('el badge no pisa la descripción corta, la categoría se resuelve por nombre y la propuesta de valor llega', async () => {
    const { categoriaService } = await import('../../services/catalogoService');
    categoriaService.buscar.mockResolvedValue([{ id: 28, nombre: 'Accesorios Tech' }, { id: 5, nombre: 'Tecnología' }]);
    await montar();
    await waitFor(() => expect(document.querySelectorAll('#prod-categoria option').length).toBe(3));

    fireEvent.change(screen.getByPlaceholderText('Pegar JSON aquí...'), { target: { value: JSON.stringify(json) } });
    expect(document.getElementById('prod-categoria').value).toBe('5');
    guardar();

    await waitFor(() => expect(productService.crear).toHaveBeenCalled());
    const payload = productService.crear.mock.calls[0][0];
    expect(payload).toMatchObject({
      descripcion_corta: 'Mouse inalámbrico compacto.',
      propuesta_valor: 'Trabajá sin cables y sin ruido.',
      descripcion_larga: 'Mouse con receptor USB. Ideal para la oficina.',
    });
    expect(String(payload.categoria_id)).toBe('5');
    expect(payload.ficha_datos).toMatchObject({ insignia: 'MÁS VENDIDO', cta_principal_texto: 'Quiero el mío' });
  });
});
