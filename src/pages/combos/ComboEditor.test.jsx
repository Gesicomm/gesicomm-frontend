import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ComboEditor from './ComboEditor';
import { verificarSesion } from '../../utils/auth';
import { productService } from '../../services/productService';
import { vitrinaService } from '../../services/vitrinaService';
import { comboAdminService } from '../../services/comboAdminService';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn() }));
vi.mock('../../services/productService', () => ({ productService: { buscar: vi.fn(), actualizar: vi.fn() } }));
vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { guardarPrecioProducto: vi.fn() } }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: {
  obtenerConfiguracion: vi.fn().mockResolvedValue({ cpa_porcentaje: 0, costo_envio: 0, costo_confirmacion: 0, costo_empaque: 0, margen_minimo: 15, umbral_excelente: 30 }),
} }));

const productos = [
  { id: 1, nombre: 'Cacerola QA', precio_base: 100000, precio_costo: 40000, imagen: '/cacerola.png' },
  { id: 2, nombre: 'Utensilios QA', precio_base: 30000, precio_costo: 10000, imagen: '/utensilios.png' },
];
const productoPaginaDos = { id: 3, nombre: 'Organizador QA', precio_base: 45000, precio_costo: 18000, imagen: '/organizador.png' };
beforeEach(() => {
  comboAdminService.obtenerConfiguracion.mockResolvedValue({ cpa_porcentaje: 0, costo_envio: 0, costo_confirmacion: 0, costo_empaque: 0, margen_minimo: 15, umbral_excelente: 30 });
  verificarSesion.mockResolvedValue({ id: 1, rol: 'administrador' });
  productService.buscar.mockResolvedValue({ productos });
  productService.actualizar.mockImplementation(async (_, payload) => payload);
  vitrinaService.guardarPrecioProducto.mockImplementation(async (_, precio) => ({ precio }));
});
afterEach(() => { cleanup(); sessionStorage.clear(); vi.resetAllMocks(); });

async function iniciar() {
  render(<MemoryRouter><ComboEditor /></MemoryRouter>);
  fireEvent.change(await screen.findByPlaceholderText('Ej: Pack Detox 3 en 1'), { target: { value: 'Combo cocina QA' } });
  fireEvent.click(screen.getByRole('button', { name: /Siguiente: producto principal/i }));
  return screen.findByRole('textbox', { name: 'Precio de venta de Cacerola QA' });
}
function renderConPrefillCatalogo() {
  sessionStorage.setItem('gesicomm:usarComboPrefillCatalogo', '1');
  render(
    <MemoryRouter initialEntries={[{ pathname: '/combos/nuevo', state: { usarPrefillCatalogo: true } }]}>
      <ComboEditor />
    </MemoryRouter>
  );
}
function elegir(nombre, accion = 'Elegir') {
  const campo = screen.getByRole('textbox', { name: `Precio de venta de ${nombre}` });
  fireEvent.click(within(campo.closest('li')).getByRole('button', { name: new RegExp(accion) }));
}
function editar(campo, valor) {
  fireEvent.change(campo, { target: { value: String(valor) } });
  fireEvent.blur(campo);
}

describe('Precios de venta durante el armado del combo', () => {
  it('conserva imágenes de los productos preseleccionados del catálogo en la vista del combo', async () => {
    sessionStorage.setItem('gesicomm:comboPrefillItems', JSON.stringify(productos));
    renderConPrefillCatalogo();
    await screen.findByRole('heading', { name: '¿Cuánto descontás en cada complemento?' });
    await waitFor(() => expect(screen.getByRole('button', { name: /Vista del combo/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Vista del combo/ }));
    const preview = screen.getByRole('region', { name: 'Vista pública del combo' });
    expect(preview.querySelector('img[src$="/cacerola.png"]')).not.toBeNull();
    expect(preview.querySelector('img[src$="/utensilios.png"]')).not.toBeNull();
    expect(within(preview).queryByText(/Sin imagen/)).toBeNull();
  });

  it('no arrastra productos preseleccionados viejos al crear un combo desde Mis combos', async () => {
    sessionStorage.setItem('gesicomm:comboPrefillItems', JSON.stringify(productos));
    render(<MemoryRouter><ComboEditor /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: '¿Cómo se llama el combo?' })).toBeInTheDocument();
    expect(screen.getByText('Sin producto principal')).toBeInTheDocument();
    await waitFor(() => expect(sessionStorage.getItem('gesicomm:comboPrefillItems')).toBeNull());
  });

  it('ignora una navegación con state viejo si catálogo no dejó la marca temporal', async () => {
    sessionStorage.setItem('gesicomm:comboPrefillItems', JSON.stringify(productos));
    render(
      <MemoryRouter initialEntries={[{ pathname: '/combos/nuevo', state: { usarPrefillCatalogo: true } }]}>
        <ComboEditor />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: '¿Cómo se llama el combo?' })).toBeInTheDocument();
    expect(screen.getByText('Sin producto principal')).toBeInTheDocument();
    await waitFor(() => expect(sessionStorage.getItem('gesicomm:comboPrefillItems')).toBeNull());
  });
  it.each(['administrador', 'usuario'])('edita desde el buscador y guarda el precio correcto para %s', async rol => {
    verificarSesion.mockResolvedValue({ id: 1, rol });
    const campo = await iniciar();
    editar(campo, 150000);
    const servicio = rol === 'administrador' ? productService.actualizar : vitrinaService.guardarPrecioProducto;
    await waitFor(() => expect(servicio).toHaveBeenCalledWith(1, rol === 'administrador' ? { precio_base: 150000 } : 150000));
    await waitFor(() => expect(campo).toHaveValue('Gs 150.000'));
    elegir('Cacerola QA');
    expect(screen.getByRole('heading', { name: '¿Cuál es el producto principal?' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Precio de venta de Cacerola QA' })).toHaveValue('Gs 150.000');
  });

  it('permite editar el principal elegido y los complementarios y actualiza la ficha del paso 7', async () => {
    await iniciar();
    elegir('Cacerola QA');
    editar(screen.getByRole('textbox', { name: 'Precio de venta de Cacerola QA' }), 150000);
    await screen.findByText('Precio guardado');
    fireEvent.click(screen.getByRole('button', { name: /Siguiente: complementarios/i }));
    await screen.findByRole('textbox', { name: 'Precio de venta de Utensilios QA' });
    elegir('Utensilios QA', 'Sumar');
    editar(screen.getByRole('textbox', { name: 'Precio de venta de Utensilios QA' }), 40000);
    await screen.findByText('Precio guardado');
    expect(productService.actualizar).toHaveBeenCalledWith(2, { precio_base: 40000 });
    fireEvent.click(screen.getByRole('button', { name: /Foto/ }));
    expect(screen.queryByRole('button', { name: 'Poner en venta' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Siguiente: vista del combo/i }));
    const preview = screen.getByRole('region', { name: 'Vista pública del combo' });
    expect(within(preview).getByRole('heading', { name: 'Combo cocina QA', level: 1 })).toBeInTheDocument();
    expect(within(preview).getAllByText('190.000 Gs').length).toBeGreaterThan(0);
    expect(within(preview).getAllByText('Cacerola QA').length).toBeGreaterThan(0);
    expect(within(preview).getAllByText('Utensilios QA').length).toBeGreaterThan(0);
    expect(screen.getByText('Fase 7 de 7 · Vista del combo')).toBeInTheDocument();
    fireEvent.click(within(preview).getByRole('button', { name: 'Mobile', exact: true }));
    expect(preview.querySelector('.product-preview-frame')).toHaveClass('mobile');
    expect(screen.getByRole('button', { name: 'Poner en venta' })).toBeEnabled();
  });

  it('pagina los productos disponibles al sumar complementarios', async () => {
    productService.buscar.mockImplementation(async ({ page = 1 }) => ({
      productos: page === 2 ? [productoPaginaDos] : productos,
      total: 3,
      pagina: page,
      total_paginas: 2,
    }));
    await iniciar();
    elegir('Cacerola QA');
    fireEvent.click(screen.getByRole('button', { name: /Siguiente: complementarios/i }));
    await screen.findByRole('textbox', { name: 'Precio de venta de Utensilios QA' });

    fireEvent.click(screen.getByRole('button', { name: /^Siguiente$/i }));

    await screen.findByRole('textbox', { name: 'Precio de venta de Organizador QA' });
    await waitFor(() => expect(productService.buscar).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 12 })));
    expect(screen.getByText(/Página/i)).toHaveTextContent('Página 2 de 2');
  });

  it('rechaza cero sin guardar el precio', async () => {
    const campo = await iniciar();
    editar(campo, 0);
    await screen.findByText('El precio tiene que ser mayor a cero.');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(productService.actualizar).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor y restaura el precio anterior', async () => {
    productService.actualizar.mockRejectedValue({ response: { data: { message: 'Precio inferior al mínimo.' } } });
    const campo = await iniciar();
    editar(campo, 20000);
    await screen.findByText('Precio inferior al mínimo.');
    expect(campo).toHaveValue('Gs 100.000');
  });

  it('espera el guardado antes de cambiar de fase o elegir el producto', async () => {
    let resolver;
    productService.actualizar.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
    const campo = await iniciar();
    editar(campo, 150000);
    expect(screen.getByRole('button', { name: /Siguiente: complementarios/i })).toBeDisabled();
    expect(within(campo.closest('li')).getByRole('button', { name: /Elegir/ })).toBeDisabled();
    resolver({ precio_base: 150000 });
    await waitFor(() => expect(screen.getByRole('button', { name: /Siguiente: complementarios/i })).toBeEnabled());
  });
});

describe('Fase 4: de dónde sale la ganancia', () => {
  it('desglosa la pérdida del combo y avisa cuando el complemento se vende a costo', async () => {
    verificarSesion.mockResolvedValue({ id: 7, rol: 'usuario' });
    comboAdminService.obtenerConfiguracion.mockResolvedValue({
      cpa_porcentaje: 20, costo_envio: 20000, costo_confirmacion: 3000, costo_empaque: 2482,
      margen_minimo: 10, umbral_excelente: 50, pagopar_comision_porcentaje: 0,
    });
    // Tienda: precio_base es su costo frente al admin; precio_venta, lo que cobra.
    // El ropero no tiene precio propio, así que se vende a costo.
    sessionStorage.setItem('gesicomm:comboPrefillItems', JSON.stringify([
      { id: 1, nombre: 'Mouse QA', precio_base: 55000, costo_tienda: 55000, precio_venta: 89000 },
      { id: 2, nombre: 'Ropero QA', precio_base: 117183, costo_tienda: 117183, precio_venta: 117183 },
    ]));
    renderConPrefillCatalogo();
    await screen.findByRole('heading', { name: '¿Cuánto descontás en cada complemento?' });

    // CPA 20% sobre el combo entero: 206.183 × 20% = 41.237.
    // 206.183 − 172.183 − 41.237 − 25.482 = −32.719
    expect(screen.getByText('Vos perdés').nextSibling).toHaveTextContent('32.719 Gs');
    const recibo = screen.getByText('De dónde sale lo que perdés').closest('.cw-recibo');
    const linea = dt => within(recibo).getByText(dt).nextSibling.textContent;
    expect(linea('Precio de venta')).toBe('206.183 Gs');
    expect(linea('Costo de los 2 productos')).toBe('− 172.183 Gs');
    expect(linea('Publicidad (20% del precio)')).toBe('− 41.237 Gs');
    expect(linea('Envío, confirmación y empaque')).toBe('− 25.482 Gs');
    expect(linea('Perdés por pedido')).toBe('32.719 Gs');
    expect(screen.getByText(/Su precio de venta es igual a tu costo/)).toBeInTheDocument();
  });

  it('suma la comisión de cobro al recibo para que dé lo mismo que el motor', async () => {
    comboAdminService.obtenerConfiguracion.mockResolvedValue({
      cpa_porcentaje: 0, costo_envio: 0, costo_confirmacion: 0, costo_empaque: 0,
      margen_minimo: 15, umbral_excelente: 30, pagopar_comision_porcentaje: 5,
    });
    sessionStorage.setItem('gesicomm:comboPrefillItems', JSON.stringify(productos));
    renderConPrefillCatalogo();
    await screen.findByRole('heading', { name: '¿Cuánto descontás en cada complemento?' });

    const recibo = screen.getByText(/De dónde sale lo que/).closest('.cw-recibo');
    // 5% sobre el combo entero (100.000 + 30.000), no solo sobre el principal.
    expect(within(recibo).getByText('Comisión de cobro (5% del precio)').nextSibling).toHaveTextContent('− 6.500 Gs');
    const total = recibo.querySelector('.total dd').textContent;
    expect(screen.getByText(/^Vos (ganás|perdés)$/).nextSibling.textContent).toContain(total);
  });

  it('abre el mismo análisis de sensibilidad de productos con los datos del combo', async () => {
    verificarSesion.mockResolvedValue({ id: 7, rol: 'usuario' });
    comboAdminService.obtenerConfiguracion.mockResolvedValue({
      cpa_porcentaje: 20, costo_envio: 25000, costo_confirmacion: 0, costo_empaque: 0,
      raha_cpa_porcentaje: 15, raha_costo_envio: 30000, raha_costo_confirmacion: 0, raha_costo_empaque: 0,
      margen_minimo: 10, umbral_excelente: 50, escenarios_descuento: [0, 10],
      pagopar: { opciones_checkout: [{ id: 'tarjetas', nombre: 'Tarjetas de crédito/débito', comision_porcentaje: 5 }] },
    });
    sessionStorage.setItem('gesicomm:comboPrefillItems', JSON.stringify([
      { id: 1, nombre: 'Mouse QA', precio_base: 55000, costo_tienda: 55000, precio_venta: 89000 },
      { id: 2, nombre: 'Ropero QA', precio_base: 100000, costo_tienda: 100000, precio_venta: 111000 },
    ]));
    renderConPrefillCatalogo();
    await screen.findByRole('heading', { name: '¿Cuánto descontás en cada complemento?' });
    fireEvent.click(screen.getByRole('button', { name: /Analizar margen/ }));

    const panel = (await screen.findByRole('heading', { name: 'Análisis de sensibilidad' })).closest('.vit-modal');
    const tarjeta = label => within(panel).getByText(label).nextSibling.textContent;
    expect(tarjeta('Costo de compra de los 2 productos')).toBe('155.000 Gs');
    // Operación propia, contra entrega: 200.000 − 155.000 − 40.000 (CPA) − 25.000 = −20.000
    expect(within(panel).getByText('Marketing (CPA)').nextSibling).toHaveTextContent('40.000 Gs');
    expect(within(panel).getByText('Utilidad estimada').nextSibling).toHaveTextContent('-20.000 Gs');
    // Con 10% de descuento el CPA también baja: 180.000 − 155.000 − 36.000 − 25.000 = −36.000
    expect(within(panel).getByRole('cell', { name: '180.000 Gs' }).nextSibling).toHaveTextContent('-36.000 Gs');

    fireEvent.click(within(panel).getByRole('tab', { name: 'Operación Gesicom RAHA' }));
    // RAHA: CPA 15% = 30.000, envío 30.000, contra entrega 2% = 4.000 → −19.000
    expect(within(panel).getByText('Costo de envío promedio').nextSibling).toHaveTextContent('30.000 Gs');
    expect(within(panel).getByText('Utilidad estimada').nextSibling).toHaveTextContent('-19.000 Gs');

    fireEvent.click(within(panel).getAllByRole('button', { name: 'Usar este precio' })[0]);
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Análisis de sensibilidad' })).toBeNull());
  });
});
