import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';
import { productService } from '../../services/productService';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productService', () => ({ productService: { detalle: vi.fn(), faq: vi.fn() } }));
vi.mock('./CodigoPreview', () => ({ default: ({ datos }) => <output data-testid="preview-datos">{JSON.stringify(datos)}</output> }));

const catalogo = { productos: [
  { tipo: 'producto', id: 1, slug: 'mouse', nombre: 'Mouse', categoria: 'Tech', precio_efectivo: 89000 },
  { tipo: 'producto', id: 2, slug: 'teclado', nombre: 'Teclado', categoria: 'Tech', precio_efectivo: 150000 },
  { tipo: 'producto', id: 3, slug: 'parlante', nombre: 'Parlante', categoria: 'Audio', precio_efectivo: 210000 },
], combos: [] };
const datosPreview = () => JSON.parse(screen.getByTestId('preview-datos').textContent);
afterEach(cleanup);

describe('Elegir productos recomendados a mano', () => {
  it('marca el producto como recomendado sin sacar la vista previa de la ficha que se está editando', async () => {
    productService.detalle.mockResolvedValue({});
    productService.faq.mockResolvedValue([]);
    render(<ConfigurarVentaCodigo catalogo={catalogo} inicial={{ seleccion: catalogo.productos }} onConfirmar={vi.fn()} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Vista producto' }));
    await waitFor(() => expect(datosPreview().producto?.id).toBe('mouse'));

    fireEvent.click(screen.getAllByRole('radio', { name: /Elegidos por vos/, hidden: true })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Teclado/, pressed: false, hidden: true })[0]);

    await waitFor(() => expect(datosPreview().recomendados.map(p => p.id)).toEqual(['teclado']));
    expect(datosPreview().vista).toBe('producto');
    expect(datosPreview().producto.id).toBe('mouse');
  });
});
