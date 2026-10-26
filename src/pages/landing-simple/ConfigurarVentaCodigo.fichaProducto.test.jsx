import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';
import { productService } from '../../services/productService';
import { landingSimpleService } from '../../services/landingSimpleService';

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
const bloqueFicha = titulo => screen.getAllByText(titulo).map(el => el.closest('details[data-bloque-ficha]')).find(Boolean);
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
  it('separa la edición conjunta y limita sus campos, conservando los bloques al volver a un producto', async () => {
    productService.detalle.mockResolvedValue(delProducto);
    productService.faq.mockResolvedValue(faq);
    const productos = Array.from({ length: 3 }, (_, idx) => ({ ...catalogo.productos[0], id: idx + 1, slug: `producto-${idx + 1}`, nombre: `Producto ${idx + 1}` }));
    const confirmar = vi.fn().mockResolvedValue(true);
    render(<ConfigurarVentaCodigo catalogo={{ productos, combos: [] }} inicial={{ seleccion: productos }} onConfirmar={confirmar} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />);
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Vista producto' }));
    await waitFor(() => expect(within(bloqueFicha('Opiniones')).getByDisplayValue('Laura P.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Editar varios o todos', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: /Producto 2\s*Tech/ }));
    expect(screen.getByRole('heading', { name: 'Editar 2 productos', exact: true })).toBeInTheDocument();
    expect(document.querySelectorAll('details[data-bloque-ficha]')).toHaveLength(0);
    expect(screen.queryByRole('textbox', { name: 'Nombre comercial', exact: true })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Precio anterior', exact: true })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar tarjeta', exact: true }));
    fireEvent.change(screen.getAllByPlaceholderText('Título, ej: Compra protegida').at(-1), { target: { value: 'Garantía conjunta nueva' } });
    expect(screen.getByDisplayValue('Garantía conjunta nueva')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Otro método', exact: true }));
    fireEvent.change(screen.getByLabelText('Otro método 1'), { target: { value: 'Giros propios' } });
    expect(screen.getByDisplayValue('Giros propios')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Mostrar Qué incluye tu pedido'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar', exact: true }));
    const venta = confirmar.mock.calls[0][0].venta;
    expect(venta.presentacion_productos['producto:1'].ficha_bloques).toEqual({ incluye: false });
    expect(venta.presentacion_productos['producto:2'].ficha_bloques).toEqual({ incluye: false });
    expect(venta.presentacion_productos).not.toHaveProperty('producto:3');
    fireEvent.click(screen.getByRole('button', { name: 'Editar un producto', exact: true }));
    expect(document.querySelectorAll('details[data-bloque-ficha]')).toHaveLength(15);
    expect(screen.getByLabelText('Nombre comercial')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Producto 1\s*Tech/ }));
    expect(screen.getByRole('heading', { name: 'Producto 1', exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aplicar a \d+ productos/ })).not.toBeInTheDocument();
  });

  it('aplica a todo el catálogo, guarda una configuración compartida y la recupera sin pisar fotos ni textos', async () => {
    productService.detalle.mockResolvedValue(delProducto);
    productService.faq.mockResolvedValue(faq);
    const productos = Array.from({ length: 503 }, (_, idx) => ({ ...catalogo.productos[0], id: idx + 1, slug: `producto-${idx + 1}`, nombre: `Producto ${idx + 1}` }));
    const confirmar = vi.fn().mockResolvedValue(true);
    const inicial = { venta: { seleccion: 'todos', presentacion_productos: {
      'producto:1': { v: 2, titulo_comercial: 'Mouse especial', imagenes_landing: ['https://cdn.test/propia.webp'], ficha_bloques: { incluye: true, opiniones: false } },
      'producto:503': { v: 2, confianza: [{ titulo: 'Vieja' }] },
    } } };
    const props = { catalogo: { productos, combos: [] }, inicial, onConfirmar: confirmar, cargarOfertas: vi.fn().mockResolvedValue([]), onVolver: vi.fn() };
    render(<ConfigurarVentaCodigo {...props} />);
    const abrir = () => fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Vista producto' }));
    abrir();
    await waitFor(() => expect(within(bloqueFicha('Zona de confianza')).getByDisplayValue('Garantía de 6 meses')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Editar varios o todos', exact: true }));
    fireEvent.click(screen.getByLabelText('Seleccionar todos (503)'));
    fireEvent.click(screen.getByLabelText('Mostrar Qué incluye tu pedido'));
    fireEvent.change(screen.getByPlaceholderText('Título, ej: Compra protegida'), { target: { value: 'Atención de nuestra tienda' } });
    expect(screen.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled();
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Inicio', exact: true }));
    abrir();
    expect(screen.getByPlaceholderText('Título, ej: Compra protegida')).toHaveValue('Atención de nuestra tienda');
    expect(screen.getByLabelText('Mostrar Qué incluye tu pedido')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar', exact: true }));
    const venta = confirmar.mock.calls[0][0].venta;
    expect(venta.ficha_compartida).toMatchObject({ ficha_bloques: { incluye: false }, confianza: [{ titulo: 'Atención de nuestra tienda' }] });
    expect(Object.keys(venta.presentacion_productos)).toHaveLength(1);
    expect(venta.presentacion_productos['producto:1']).toMatchObject({ titulo_comercial: 'Mouse especial', imagenes_landing: ['https://cdn.test/propia.webp'], ficha_bloques: { opiniones: false } });
    expect(venta.presentacion_productos['producto:1'].ficha_bloques).not.toHaveProperty('incluye');
    cleanup();
    render(<ConfigurarVentaCodigo {...props} inicial={{ venta }} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
    abrir();
    await waitFor(() => expect(within(bloqueFicha('Zona de confianza')).getByDisplayValue('Atención de nuestra tienda')).toBeInTheDocument());
    expect(within(bloqueFicha('Qué incluye tu pedido')).getByLabelText('Mostrar', { exact: true })).not.toBeChecked();
    const preview = JSON.parse(screen.getByTestId('preview-datos').textContent);
    // El iframe recorta sus productos por rendimiento; la selección masiva
    // y la regla guardada abarcan los 503, no solo este recorte.
    expect(preview.productos.length).toBeGreaterThan(0);
    expect(preview.productos.every(p => p.ficha_bloques.incluye === false)).toBe(true);
    expect(preview.productos.every(p => p.confianza[0].titulo === 'Atención de nuestra tienda')).toBe(true);
  });

  it('permite apagar medios de pago después de apagar los botones, sin mostrar un estado falso', async () => {
    const confirmar = await abrirFicha();
    fireEvent.click(within(bloqueFicha('Botones de contacto y pago')).getByLabelText('Mostrar', { exact: true }));
    const medios = within(bloqueFicha('Disponibilidad y medios de pago')).getByLabelText('Mostrar', { exact: true });
    expect(medios).toBeChecked();
    fireEvent.click(medios);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].venta.presentacion_productos['producto:1'].ficha_bloques).toMatchObject({
      contacto_pago: false, promociones_pago: false,
    });
    expect(fichaPreview().ficha_bloques).toMatchObject({ contacto_pago: false, promociones_pago: false });
  });

  it('conserva los logos desactivados al guardar y volver a abrir, incluso los cargados del servidor', async () => {
    const logos = [
      { clave: 'visa', nombre: 'Visa', grupo: 'tarjetas', logo_url: '/visa.webp' },
      { clave: 'metodo-propio', nombre: 'Método propio', grupo: 'tarjetas', logo_url: '/propio.webp' },
    ];
    landingSimpleService.listarPaymentLogos.mockResolvedValue(logos);
    try {
      const confirmar = await abrirFicha();
      await waitFor(() => expect(screen.getByLabelText('Mostrar logo Método propio')).toBeChecked());
      fireEvent.click(screen.getByLabelText('Mostrar logo Visa'));
      fireEvent.click(screen.getByLabelText('Mostrar logo Método propio'));
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
      const venta = confirmar.mock.calls[0][0].venta;
      expect(venta.presentacion_productos['producto:1'].payment_logos).toEqual([]);
      expect(venta.payment_logos).toHaveLength(2);
      cleanup();
      render(<ConfigurarVentaCodigo catalogo={catalogo} inicial={{ venta, seleccion: catalogo.productos }} onConfirmar={vi.fn()} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />);
      fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Vista producto' }));
      await waitFor(() => expect(screen.getByLabelText('Mostrar logo Método propio')).not.toBeChecked());
      expect(screen.getByLabelText('Mostrar logo Visa')).not.toBeChecked();
    } finally {
      landingSimpleService.listarPaymentLogos.mockResolvedValue([]);
    }
  });

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
    const guardado = payload.venta.presentacion_productos['producto:1'] || {};
    ['beneficios', 'confianza', 'opiniones', 'preguntas', 'incluye_pedido'].forEach(campo => expect(guardado).not.toHaveProperty(campo));
    // Ficha v2: lo que el comercio no tocó no viaja (ni siquiera vacío), así
    // sigue valiendo el texto del producto y un '' queda para "lo borré".
    ['insignia_principal', 'opiniones_titulo', 'urgencia_titulo'].forEach(campo => expect(guardado).not.toHaveProperty(campo));
    expect(payload.venta.presentacion_productos).not.toHaveProperty('producto:1');
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

it('mantiene el monitor compacto y cambia el espacio de tutorial con la página', () => {
  render(<ConfigurarVentaCodigo catalogo={catalogo} inicial={{ seleccion: catalogo.productos }} onConfirmar={vi.fn()} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />);
  const vistaPrevia = screen.getByRole('complementary', { name: 'Vista previa' });
  expect(vistaPrevia.querySelector('.ecommerce-preview-monitor-screen')).toBeInTheDocument();
  expect(within(vistaPrevia).getByRole('heading', { name: 'Tutorial de Inicio' })).toBeInTheDocument();

  for (const [pagina, titulo] of [['categoria', 'Categorías'], ['producto', 'Vista producto'], ['checkout', 'Checkout']]) {
    fireEvent.change(screen.getByLabelText('Página de la tienda'), { target: { value: pagina } });
    expect(within(vistaPrevia).getByRole('heading', { name: `Tutorial de ${titulo}` })).toBeInTheDocument();
  }
});
