import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: ({ datos }) => <output data-testid="preview-datos">{JSON.stringify(datos)}</output> }));

const catalogo = { productos: [
  { tipo: 'producto', id: 1, slug: 'cacerola', nombre: 'Cacerola', categoria: 'Cocina', precio_efectivo: 850000, precio_tachado: 900000 },
  { tipo: 'producto', id: 2, slug: 'olla', nombre: 'Olla', categoria: 'Cocina', precio_efectivo: 950000 },
], combos: [] };
const cargarOfertas = vi.fn().mockResolvedValue([]);
const datosPreview = () => JSON.parse(screen.getByTestId('preview-datos').textContent);
afterEach(cleanup);

function montar(inicial = { seleccion: catalogo.productos }) {
  const confirmar = vi.fn().mockResolvedValue(true);
  render(<ConfigurarVentaCodigo catalogo={catalogo} inicial={inicial} onConfirmar={confirmar} cargarOfertas={cargarOfertas} onVolver={vi.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
  return confirmar;
}

function abrirFichaProducto(nombre) {
  fireEvent.click(screen.getAllByRole('tab', { name: 'Vista producto' })[0]);
  const select = screen.getByRole('combobox', { name: 'Producto a editar' });
  fireEvent.change(select, { target: { value: nombre === 'Olla' ? 'olla' : 'cacerola' } });
}

describe('Presentación de los productos del lienzo', () => {
  it('actualiza ancla y etiquetas en el preview y guarda los mismos valores', async () => {
    const confirmar = montar();
    abrirFichaProducto('Cacerola');
    fireEvent.change(screen.getByLabelText('Precio ancla'), { target: { value: '1200000' } });
    fireEvent.change(screen.getByLabelText('Etiquetas para filtrar (separadas por coma)'), { target: { value: 'Cocina, Oferta especial' } });
    fireEvent.change(screen.getByLabelText('Título comercial'), { target: { value: 'Cocina sin esfuerzo' } });
    fireEvent.change(screen.getByLabelText('Mensaje corto'), { target: { value: 'Ideal para risottos' } });
    fireEvent.change(screen.getByLabelText('Insignia principal'), { target: { value: 'Oferta' } });
    expect(datosPreview().productos[0]).toMatchObject({ precio: 850000, precio_antes: 1200000, etiqueta: 'Cocina, Oferta especial', descuento_pct: 29 });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].venta.presentacion_productos['producto:1']).toMatchObject({ titulo_comercial: 'Cocina sin esfuerzo', mensaje_comercial: 'Ideal para risottos', insignia_principal: 'Oferta' });
    expect(datosPreview().productos[0].titulo_comercial).toBe('Cocina sin esfuerzo');
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ precio_ancla: 1200000, etiqueta: 'Cocina, Oferta especial' });
  });

  it('marca etiquetas comerciales, badge y fecha de oferta desde la ficha', () => {
    const confirmar = montar();
    abrirFichaProducto('Cacerola');
    fireEvent.click(screen.getByRole('button', { name: 'Oferta' }));
    fireEvent.change(screen.getByLabelText('Precio ancla'), { target: { value: '1200000' } });
    fireEvent.change(screen.getByLabelText('Fecha fin de oferta'), { target: { value: '2026-10-20T14:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));

    const payload = confirmar.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ precio_ancla: 1200000, etiqueta: 'Oferta' });
    expect(payload.venta.presentacion_productos['producto:1']).toMatchObject({ insignia_principal: 'Oferta' });
    expect(payload.venta.urgencia).toMatchObject({ activo: true, productos: ['cacerola'], producto_id: 'cacerola' });
    expect(payload.venta.urgencia.fin_at).toBe(new Date('2026-10-20T14:30').toISOString());
  });

  it('edita solo la promo desde la sección de productos sin abrir los bloques de ficha', () => {
    const confirmar = montar();
    fireEvent.click(screen.getAllByRole('tab', { name: 'Productos' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar precio, descuento y badges' })[0]);

    expect(screen.getByText('Editás solo la promo del catálogo.')).toBeInTheDocument();
    expect(screen.queryByText('Portada e imágenes')).not.toBeInTheDocument();
    expect(screen.queryByText('Beneficios')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Precio ancla'), { target: { value: '1200000' } });
    fireEvent.change(screen.getByLabelText('Etiquetas para filtrar (separadas por coma)'), { target: { value: 'Oferta' } });
    fireEvent.click(screen.getByLabelText('Activar countdown para esta promo'));
    fireEvent.change(screen.getByLabelText('Fecha fin de oferta'), { target: { value: '2026-10-21T09:00' } });
    fireEvent.change(screen.getByLabelText('Insignia principal'), { target: { value: 'Hot sale' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));

    const payload = confirmar.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ precio_ancla: 1200000, etiqueta: 'Oferta' });
    expect(payload.venta.presentacion_productos['producto:1']).toMatchObject({ insignia_principal: 'Hot sale' });
    expect(payload.venta.urgencia.productos).toContain('cacerola');
    expect(payload.venta.urgencia.fin_at).toBe(new Date('2026-10-21T09:00').toISOString());
  });

  it('edita la ficha paso a paso con portada primero, beneficios, contador y medios de pago', () => {
    const confirmar = montar();
    abrirFichaProducto('Cacerola');

    const portada = screen.getByText('Portada e imágenes');
    const oferta = screen.getByText('Oferta por tiempo limitado');
    const beneficiosTitulo = screen.getByText('Beneficios', { exact: true });
    const compraTitulo = screen.getByText('Botón de compra, pagos y contacto');
    expect(Boolean(portada.compareDocumentPosition(oferta) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(oferta.compareDocumentPosition(beneficiosTitulo) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(beneficiosTitulo.compareDocumentPosition(compraTitulo) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    const bloqueOferta = oferta.closest('details');
    fireEvent.change(within(bloqueOferta).getByLabelText('Rótulo'), { target: { value: 'Solo hoy' } });
    fireEvent.change(within(bloqueOferta).getByLabelText('Horas'), { target: { value: '5' } });
    fireEvent.change(within(bloqueOferta).getByLabelText('Minutos'), { target: { value: '30' } });
    fireEvent.change(within(bloqueOferta).getByLabelText('Segundos'), { target: { value: '15' } });

    const bloqueBeneficios = beneficiosTitulo.closest('details');
    fireEvent.change(within(bloqueBeneficios).getByLabelText('Rótulo de sección'), { target: { value: 'Ventajas reales' } });
    fireEvent.change(within(bloqueBeneficios).getByLabelText('Título de sección'), { target: { value: 'Lo importante antes de comprar' } });
    fireEvent.click(within(bloqueBeneficios).getByRole('button', { name: /\+ Agregar beneficio/i }));
    fireEvent.change(within(bloqueBeneficios).getAllByPlaceholderText('Beneficio').at(-1), { target: { value: 'Probado en tienda' } });

    const bloqueCompra = compraTitulo.closest('details');
    const metodos = within(bloqueCompra).getByRole('group', { name: 'Métodos de pago' });
    fireEvent.click(within(metodos).getByLabelText('Transferencia bancaria'));
    fireEvent.click(within(bloqueCompra).getByLabelText('Tarjetas de crédito'));
    fireEvent.click(within(bloqueCompra).getByLabelText('Bocas de cobranza'));
    fireEvent.click(within(bloqueCompra).getByLabelText('Billetera electrónica'));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));

    const payload = confirmar.mock.calls[0][0];
    expect(payload.venta.presentacion_productos['producto:1']).toMatchObject({
      urgencia_kicker: 'Solo hoy',
      urgencia_horas: '5',
      urgencia_minutos: '30',
      urgencia_segundos: '15',
      beneficios_kicker: 'Ventajas reales',
      beneficios_titulo: 'Lo importante antes de comprar',
      metodos_pago: [{ texto: 'Pago contra entrega' }],
    });
    expect(payload.venta.presentacion_productos['producto:1'].beneficios).toEqual(
      expect.arrayContaining([expect.objectContaining({ titulo: 'Probado en tienda' })]),
    );
    expect(payload.venta.pago_logos).toEqual({ tarjetas: false, bocas: false, billetera: false });
  });

  it('permite quitar el ancla guardada y ocultar del inicio desde la ficha', () => {
    const confirmar = montar({ seleccion: [{ ...catalogo.productos[0], precio_ancla: 1200000, etiqueta: 'Oferta' }, catalogo.productos[1]] });
    abrirFichaProducto('Cacerola');
    expect(screen.getByLabelText('Precio ancla')).toHaveValue('Gs 1.200.000');
    fireEvent.change(screen.getByLabelText('Precio ancla'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Etiquetas para filtrar (separadas por coma)'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Mostrar en inicio'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].items.map(i => i.id)).toEqual([1, 2]);
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ precio_ancla: null, etiqueta: '', mostrar_en_inicio: false });
    expect(datosPreview().productos[0].precio_antes).toBe(900000);
  });

  it('mantiene y guarda banners aunque exista inicio_comercial viejo vacío', () => {
    const confirmar = montar({
      venta: {
        seleccion: 'manual',
        configurado: true,
        inicio_comercial: { banners: [] },
        inicio: { banners: [{ id: 'hero-1', activo: true, titulo: 'Banner guardado', imagen: 'https://cdn.test/banner-viejo.webp' }] },
      },
      seleccion: catalogo.productos,
    });

    expect(datosPreview().venta.inicio.banners[0]).toMatchObject({ titulo: 'Banner guardado', imagen: 'https://cdn.test/banner-viejo.webp' });
    // El bloque "Banner principal" ahora vive colapsado dentro de "Bloques
    // del Inicio" — hay que abrirlo antes de tocar sus campos.
    fireEvent.click(screen.getByRole('button', { name: 'Banner principal' }));
    fireEvent.change(screen.getAllByLabelText('URL del medio')[0], { target: { value: 'https://cdn.test/banner-nuevo.webp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));

    const ventaGuardada = confirmar.mock.calls[0][0].venta;
    expect(ventaGuardada.inicio.banners[0]).toMatchObject({ titulo: 'Banner guardado', imagen: 'https://cdn.test/banner-nuevo.webp' });
    expect(ventaGuardada.inicio_comercial.banners).toEqual(ventaGuardada.inicio.banners);
  });
  it('guarda ajustes por producto sin cerrar una regla dinámica', () => {
    const confirmar = montar({ venta: { seleccion: 'todos', configurado: true }, seleccion: [] });
    abrirFichaProducto('Olla');
    fireEvent.change(screen.getByLabelText('Precio ancla'), { target: { value: '1300000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].venta.seleccion).toBe('todos');
    expect(confirmar.mock.calls[0][0].items).toHaveLength(1);
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ id: 2, precio_ancla: 1300000 });
  });
});
