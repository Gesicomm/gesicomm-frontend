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
    render(<MemoryRouter><ComboEditor /></MemoryRouter>);
    await screen.findByRole('heading', { name: '¿Cuánto descontás en cada complemento?' });
    await waitFor(() => expect(screen.getByRole('button', { name: /Vista del combo/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Vista del combo/ }));
    const preview = screen.getByRole('region', { name: 'Vista pública del combo' });
    expect(preview.querySelector('img[src$="/cacerola.png"]')).not.toBeNull();
    expect(preview.querySelector('img[src$="/utensilios.png"]')).not.toBeNull();
    expect(within(preview).queryByText(/Sin imagen/)).toBeNull();
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
