import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
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
  fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Vista producto' }));
  const select = screen.getByRole('combobox', { name: 'Producto a editar' });
  fireEvent.change(select, { target: { value: nombre === 'Olla' ? 'olla' : 'cacerola' } });
}

function bloqueFicha(titulo) {
  return screen.getAllByText(titulo).map(el => el.closest('details')).find(Boolean);
}

describe('Presentación de los productos del lienzo', () => {
  it('actualiza ancla y etiquetas en el preview y guarda los mismos valores', async () => {
    const confirmar = montar();
    abrirFichaProducto('Cacerola');
    const encabezado = bloqueFicha('Encabezado');
    const nombreComercial = bloqueFicha('Nombre comercial');
    const precio = bloqueFicha('Precio y oferta');
    const descripcion = bloqueFicha('Descripción breve');
    fireEvent.change(within(precio).getByLabelText('Precio anterior'), { target: { value: '1200000' } });
    fireEvent.change(within(nombreComercial).getByLabelText('Nombre comercial'), { target: { value: 'Cocina sin esfuerzo' } });
    fireEvent.change(within(descripcion).getByLabelText('Texto debajo del precio'), { target: { value: 'Ideal para risottos' } });
    fireEvent.change(within(encabezado).getByLabelText('Encabezado'), { target: { value: 'Oferta' } });
    expect(datosPreview().productos[0]).toMatchObject({ precio: 850000, precio_antes: 1200000, descuento_pct: 29 });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].venta.presentacion_productos['producto:1']).toMatchObject({ titulo_comercial: 'Cocina sin esfuerzo', mensaje_comercial: 'Ideal para risottos', insignia_principal: 'Oferta' });
    expect(datosPreview().productos[0].titulo_comercial).toBe('Cocina sin esfuerzo');
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ precio_ancla: 1200000 });
  });

  it('marca etiquetas comerciales, badge y fecha de oferta desde la ficha', () => {
    const confirmar = montar();
    abrirFichaProducto('Cacerola');
    const encabezado = bloqueFicha('Encabezado');
    const precio = bloqueFicha('Precio y oferta');
    fireEvent.change(within(encabezado).getByLabelText('Encabezado'), { target: { value: 'Oferta' } });
    fireEvent.change(within(precio).getByLabelText('Badge de precio'), { target: { value: 'Exclusivo online' } });
    fireEvent.change(within(precio).getByLabelText('Precio anterior'), { target: { value: '1200000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const payload = confirmar.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ precio_ancla: 1200000 });
    expect(payload.venta.presentacion_productos['producto:1']).toMatchObject({ insignia_principal: 'Oferta', insignia_secundaria: 'Exclusivo online' });
  });

  it('edita la ficha paso a paso con portada primero, beneficios, contador y medios de pago', () => {
    const confirmar = montar();
    abrirFichaProducto('Cacerola');

    const portada = screen.getByText('Galería del producto');
    const resenasTitulo = screen.getByText('Reseñas comerciales');
    const precio = screen.getByText('Precio y oferta');
    const ofertaTitulo = screen.getByText('Oferta por tiempo limitado');
    const bloqueOferta = bloqueFicha('Oferta por tiempo limitado');
    const descripcionTitulo = screen.getByText('Descripción breve');
    const beneficiosTitulo = screen.getByText('Beneficios principales');
    const botonesTitulo = screen.getByText('Botones de contacto y pago');
    const compraTitulo = screen.getByText('Disponibilidad y medios de pago');
    expect(Boolean(portada.compareDocumentPosition(resenasTitulo) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(resenasTitulo.compareDocumentPosition(precio) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(precio.compareDocumentPosition(ofertaTitulo) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(ofertaTitulo.compareDocumentPosition(descripcionTitulo) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(descripcionTitulo.compareDocumentPosition(beneficiosTitulo) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(beneficiosTitulo.compareDocumentPosition(botonesTitulo) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(botonesTitulo.compareDocumentPosition(compraTitulo) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    const drag = {};
    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn((tipo, valor) => { drag[tipo] = valor; }),
      getData: vi.fn(tipo => drag[tipo] || ''),
    };
    fireEvent.dragStart(within(bloqueOferta).getByTitle('Arrastrar para ordenar'), { dataTransfer });
    fireEvent.dragOver(bloqueFicha('Precio y oferta'), { dataTransfer });
    fireEvent.drop(bloqueFicha('Precio y oferta'), { dataTransfer });

    fireEvent.change(within(bloqueOferta).getByLabelText('Encabezado de la oferta'), { target: { value: 'Solo hoy' } });
    fireEvent.change(within(bloqueOferta).getByLabelText('Horas'), { target: { value: '5' } });
    fireEvent.change(within(bloqueOferta).getByLabelText('Minutos'), { target: { value: '30' } });
    fireEvent.change(within(bloqueOferta).getByLabelText('Segundos'), { target: { value: '15' } });

    const bloqueBeneficios = beneficiosTitulo.closest('details');
    fireEvent.click(within(bloqueBeneficios).getByRole('button', { name: /\+ Agregar check/i }));
    fireEvent.change(within(bloqueBeneficios).getAllByPlaceholderText('Ej: Compra segura').at(-1), { target: { value: 'Probado en tienda' } });

    const bloqueCompra = compraTitulo.closest('details');
    const metodos = within(bloqueCompra).getByRole('group', { name: 'Métodos de pago' });
    fireEvent.click(within(metodos).getByLabelText('Transferencia bancaria'));
    ['Deposito bancario', 'Transferencia bancaria', 'Visa', 'Mastercard', 'American Express', 'Diners Club', 'Bancard', 'Credicheck', 'Cabal', 'Panal', 'Discover', 'JCB']
      .forEach(label => fireEvent.click(within(bloqueCompra).getByLabelText(`Mostrar logo ${label}`)));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const payload = confirmar.mock.calls[0][0];
    expect(payload.venta.presentacion_productos['producto:1']).toMatchObject({
      urgencia_kicker: 'Solo hoy',
      urgencia_horas: '5',
      urgencia_minutos: '30',
      urgencia_segundos: '15',
      metodos_pago: [{ texto: 'Pago contra entrega' }],
    });
    expect(payload.venta.presentacion_productos['producto:1'].ficha_orden_mobile.indexOf('oferta')).toBeLessThan(
      payload.venta.presentacion_productos['producto:1'].ficha_orden_mobile.indexOf('precio'),
    );
    expect(payload.venta.presentacion_productos['producto:1'].beneficios).toEqual(
      expect.arrayContaining([expect.objectContaining({ titulo: 'Probado en tienda' })]),
    );
    expect(payload.venta.payment_logos).toEqual([]);
  });

  it('permite quitar el ancla guardada y ocultar del inicio desde la ficha', () => {
    const confirmar = montar({ seleccion: [{ ...catalogo.productos[0], precio_ancla: 1200000, etiqueta: 'Oferta' }, catalogo.productos[1]] });
    abrirFichaProducto('Cacerola');
    const precio = bloqueFicha('Precio y oferta');
    expect(within(precio).getByLabelText('Precio anterior')).toHaveValue('Gs 1.200.000');
    fireEvent.change(within(precio).getByLabelText('Precio anterior'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].items.map(i => i.id)).toEqual([1, 2]);
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ precio_ancla: null });
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
    // montar() deja la preview en "Celular" por defecto; el campo de imagen
    // ahí edita imagen_mobile (RF-GEN-02), así que para tocar la imagen de
    // escritorio hay que volver a "Escritorio" primero.
    fireEvent.click(screen.getByRole('radio', { name: 'Escritorio', exact: true }));
    // El bloque "Banner principal" ahora vive colapsado dentro de "Bloques
    // del Inicio" — hay que abrirlo antes de tocar sus campos.
    fireEvent.click(screen.getByRole('button', { name: 'Banner principal' }));
    fireEvent.change(screen.getAllByLabelText('URL del medio')[0], { target: { value: 'https://cdn.test/banner-nuevo.webp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const ventaGuardada = confirmar.mock.calls[0][0].venta;
    expect(ventaGuardada.inicio.banners[0]).toMatchObject({ titulo: 'Banner guardado', imagen: 'https://cdn.test/banner-nuevo.webp' });
    expect(ventaGuardada.inicio_comercial.banners).toEqual(ventaGuardada.inicio.banners);
  });
  it('guarda ajustes por producto sin cerrar una regla dinámica', () => {
    const confirmar = montar({ venta: { seleccion: 'todos', configurado: true }, seleccion: [] });
    abrirFichaProducto('Olla');
    const precio = bloqueFicha('Precio y oferta');
    fireEvent.change(within(precio).getByLabelText('Precio anterior'), { target: { value: '1300000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].venta.seleccion).toBe('todos');
    expect(confirmar.mock.calls[0][0].items).toHaveLength(1);
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ id: 2, precio_ancla: 1300000 });
  });
});
