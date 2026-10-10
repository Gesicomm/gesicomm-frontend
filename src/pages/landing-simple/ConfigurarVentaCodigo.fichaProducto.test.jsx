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

// El catálogo del panel llega sin datos de marketing; los del producto
// (cargados en Productos, p. ej. con el JSON de la IA) salen del detalle.
const catalogo = { productos: [
  { tipo: 'producto', id: 1, slug: 'mouse', nombre: 'Mouse', categoria: 'Tech', precio_efectivo: 89000 },
], combos: [] };
const delProducto = {
  beneficios: [{ titulo: 'Batería larga', texto: 'Dura semanas.', icono: 'battery' }],
  confianza: [{ icono: '', titulo: 'Garantía de 6 meses', texto: 'Cambio directo.' }],
  ficha_datos: {
    product_page_opiniones: [{ nombre: 'Laura P.', calificacion: 4, comentario: 'Liviano y cómodo.', detalle: 'Reseña en Amazon', foto: '' }],
    presentacion: { insignia_principal: 'Más vendido', opiniones_titulo: 'Quienes ya lo usan', incluye_pedido: [{ texto: 'Receptor USB' }] },
  },
};
const faq = [{ id: 7, pregunta: '¿Trae pila?', respuesta: 'Sí, incluye una pila AA.', orden: 0 }];
const fichaPreview = () => JSON.parse(screen.getByTestId('preview-datos').textContent).productos.find(p => p.id === 'mouse');
const bloqueFicha = titulo => screen.getAllByText(titulo).map(el => el.closest('details')).find(Boolean);
afterEach(cleanup);

async function abrirFicha() {
  productService.detalle.mockResolvedValue(delProducto);
  productService.faq.mockResolvedValue(faq);
  const confirmar = vi.fn().mockResolvedValue(true);
  render(<ConfigurarVentaCodigo catalogo={catalogo} inicial={{ seleccion: catalogo.productos }} onConfirmar={confirmar} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
  fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Vista producto' }));
  await waitFor(() => expect(within(bloqueFicha('Opiniones')).getByDisplayValue('Laura P.')).toBeInTheDocument());
  return confirmar;
}

describe('Los bloques de la ficha arrancan con los datos del producto', () => {
  it('muestra beneficios, garantías, opiniones y preguntas del producto en el panel y en la vista previa, sin guardarlos en la landing', async () => {
    const confirmar = await abrirFicha();

    expect(within(bloqueFicha('Opiniones')).queryByDisplayValue('Cliente verificado')).toBeNull();
    expect(within(bloqueFicha('Opiniones')).getByDisplayValue('Reseña en Amazon')).toBeInTheDocument();
    expect(within(bloqueFicha('Preguntas frecuentes')).getByDisplayValue('¿Trae pila?')).toBeInTheDocument();
    expect(within(bloqueFicha('Beneficios principales')).getByDisplayValue('Batería larga')).toBeInTheDocument();
    expect(within(bloqueFicha('Zona de confianza')).getByDisplayValue('Garantía de 6 meses')).toBeInTheDocument();
    expect(within(bloqueFicha('Encabezado')).getByLabelText('Encabezado')).toHaveValue('Más vendido');
    expect(within(bloqueFicha('Opiniones')).getByLabelText('Título de sección')).toHaveValue('Quienes ya lo usan');
    expect(within(bloqueFicha('Qué incluye tu pedido')).getByDisplayValue('Receptor USB')).toBeInTheDocument();

    const ficha = fichaPreview();
    expect(ficha.beneficios.map(b => b.titulo)).toEqual(['Batería larga']);
    expect(ficha.confianza.map(c => c.titulo)).toEqual(['Garantía de 6 meses']);
    expect(ficha.opiniones.map(o => o.nombre)).toEqual(['Laura P.']);
    expect(ficha.preguntas.map(p => p.pregunta)).toEqual(['¿Trae pila?']);
    expect(ficha.resenas_texto).toBe('4 de 5 · 1 opinión');
    expect(ficha).toMatchObject({ insignia_principal: 'Más vendido', opiniones_titulo: 'Quienes ya lo usan', incluye_pedido: [{ texto: 'Receptor USB' }] });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    const payload = confirmar.mock.calls[0][0];
    const guardado = payload.venta.presentacion_productos['producto:1'];
    ['beneficios', 'confianza', 'opiniones', 'preguntas', 'incluye_pedido'].forEach(campo => expect(guardado).not.toHaveProperty(campo));
    expect(guardado).toMatchObject({ insignia_principal: '', opiniones_titulo: '' });
    expect(payload.items[0]).not.toHaveProperty('ficha_datos');
  });

  it('al editar una opinión guarda las del producto con el cambio, no los ejemplos', async () => {
    const confirmar = await abrirFicha();
    fireEvent.change(within(bloqueFicha('Opiniones')).getByDisplayValue('Laura P.'), { target: { value: 'Laura Pérez' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(confirmar.mock.calls[0][0].venta.presentacion_productos['producto:1'].opiniones).toMatchObject([
      { nombre: 'Laura Pérez', calificacion: 4, comentario: 'Liviano y cómodo.', detalle: 'Reseña en Amazon' },
    ]);
  });
});
