import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';
import { usarCatalogoPaginado } from './catalogoPaginadoFalso';
import { productService } from '../../services/productService';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: ({ datos }) => <output data-testid="preview-datos">{JSON.stringify(datos)}</output> }));
vi.mock('../../services/vitrinaService', async () => ({ vitrinaService: { catalogoPaginado: (await import('./catalogoPaginadoFalso')).catalogoPaginadoFalso } }));
vi.mock('../../services/productService', () => ({ productService: {
  detalle: vi.fn().mockResolvedValue({}),
  faq: vi.fn().mockResolvedValue([]),
  descuentoMasivo: vi.fn().mockResolvedValue({ actualizados: [], omitidos: [] }),
} }));

const catalogo = { productos: [
  { tipo: 'producto', id: 1, slug: 'cacerola', nombre: 'Cacerola', categoria: 'Cocina', precio_efectivo: 850000, precio_tachado: 900000 },
  { tipo: 'producto', id: 2, slug: 'olla', nombre: 'Olla', categoria: 'Cocina', precio_efectivo: 950000 },
], combos: [] };
const cargarOfertas = vi.fn().mockResolvedValue([]);
const datosPreview = () => JSON.parse(screen.getAllByTestId('preview-datos')[0].textContent);
afterEach(cleanup);

function montar(inicial = null, catalogoFuente = catalogo, landing = null, extraProps = {}) {
  const confirmar = vi.fn().mockResolvedValue(true);
  usarCatalogoPaginado(catalogoFuente.productos);
  render(<ConfigurarVentaCodigo catalogo={catalogoFuente} inicial={inicial || { seleccion: catalogoFuente.productos }} landing={landing} onConfirmar={confirmar} cargarOfertas={cargarOfertas} onVolver={vi.fn()} {...extraProps} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
  return confirmar;
}

// Al entrar a "Vista producto" queda elegido el primero (Cacerola); otro se
// elige en el buscador paginado, que responde asíncrono.
async function abrirFichaProducto(nombre) {
  fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Vista producto' }));
  if (nombre === 'Cacerola') return;
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${nombre}`), pressed: false }));
}

function bloqueFicha(titulo) {
  return screen.getAllByText(titulo).map(el => el.closest('details[data-bloque-ficha]')).find(Boolean);
}

describe('Presentación de los productos del lienzo', () => {
  it('guarda un contador común solo en seis fichas seleccionadas y lo recupera al reabrir', async () => {
    const productos = Array.from({ length: 7 }, (_, i) => ({ ...catalogo.productos[0], id: i + 1, slug: `producto-${i + 1}`, nombre: i === 0 ? 'Cacerola' : `Producto ${i + 1}` }));
    const guardar = montar(null, { productos, combos: [] });
    await abrirFichaProducto('Cacerola');
    fireEvent.click(screen.getByRole('button', { name: 'Editar varios o todos', exact: true }));
    for (let id = 2; id <= 6; id++) fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^Producto ${id}`), pressed: false }));
    const grupo = screen.getByRole('region', { name: 'Edición de varios productos' });
    fireEvent.change(within(grupo).getByLabelText('Horas'), { target: { value: '2' } });
    fireEvent.change(within(grupo).getByLabelText('Minutos'), { target: { value: '30' } });
    fireEvent.change(within(grupo).getByLabelText('Segundos'), { target: { value: '50' } });
    fireEvent.click(within(grupo).getByRole('button', { name: 'Aplicar contador a 6 productos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar', exact: true }));
    const venta = guardar.mock.calls[0][0].venta;
    for (let id = 1; id <= 6; id++) expect(venta.presentacion_productos[`producto:${id}`]).toMatchObject({ urgencia_horas: 2, urgencia_minutos: 30, urgencia_segundos: 50 });
    expect(venta.presentacion_productos).not.toHaveProperty('producto:7');
    expect(venta.ficha_compartida?.urgencia_horas).toBeUndefined();
    cleanup(); montar({ seleccion: productos, venta }, { productos, combos: [] });
    await abrirFichaProducto('Cacerola');
    const oferta = bloqueFicha('Oferta por tiempo limitado');
    expect(within(oferta).getByLabelText('Horas')).toHaveValue(2);
    expect(within(oferta).getByLabelText('Minutos')).toHaveValue(30);
    expect(within(oferta).getByLabelText('Segundos')).toHaveValue(50);
  });
  it('actualiza ancla y etiquetas en el preview y guarda los mismos valores', async () => {
    const confirmar = montar();
    abrirFichaProducto('Cacerola');
    const encabezado = bloqueFicha('Encabezado');
    const nombreComercial = bloqueFicha('Nombre comercial');
    const precio = bloqueFicha('Precio y oferta');
    const descripcion = bloqueFicha('Descripción breve');
    fireEvent.change(within(precio).getByLabelText('Precio anterior'), { target: { value: '1200000' } });
    fireEvent.change(within(nombreComercial).getByLabelText('Nombre comercial'), { target: { value: 'Cocina sin esfuerzo' } });
    fireEvent.change(within(descripcion).getByLabelText('Descripción'), { target: { value: 'Ideal para risottos' } });
    fireEvent.change(within(encabezado).getByLabelText('Encabezado'), { target: { value: 'Oferta' } });
    expect(datosPreview().productos[0]).toMatchObject({ precio: 850000, precio_antes: 1200000, descuento_pct: 29.17 });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].venta.presentacion_productos['producto:1']).toMatchObject({ titulo_comercial: 'Cocina sin esfuerzo', mensaje_comercial: 'Ideal para risottos', insignia_principal: 'Oferta' });
    expect(datosPreview().productos[0].titulo_comercial).toBe('Cocina sin esfuerzo');
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ precio_ancla: 1200000 });
  });

  it('guarda el HTML, CSS y JavaScript del bloque solo en la ficha elegida y los recupera al recargar', async () => {
    const confirmar = montar(); await abrirFichaProducto('Cacerola');
    const bloque = bloqueFicha('Descripción breve');
    fireEvent.click(within(bloque).getByRole('button', { name: 'Diseño (código) de este bloque' }));
    const prompt = within(bloque).getByLabelText('Prompt completo del bloque').value;
    const html = prompt.match(/HTML COMPLETO DEL BLOQUE:\n```html\n([\s\S]*?)\n```/)[1];
    const respuesta = '<style>.ia-descripcion{padding:20px}</style>' + html + '<script>bloque.dataset.listo="si";</script>';
    fireEvent.change(within(bloque).getByLabelText('Respuesta de IA para Descripción breve'), { target: { value: respuesta } });
    fireEvent.click(within(bloque).getByRole('button', { name: 'Aplicar a este bloque' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    const payload = confirmar.mock.calls[0][0];
    expect(payload.venta.presentacion_productos['producto:1'].codigo_bloques.descripcion).toMatchObject({ css: '.ia-descripcion{padding:20px}', js: 'bloque.dataset.listo="si";' });
    expect(payload.venta.presentacion_productos['producto:2']?.codigo_bloques).toBeUndefined();
    cleanup(); montar({ seleccion: catalogo.productos, venta: payload.venta }); await abrirFichaProducto('Cacerola');
    const nuevo = bloqueFicha('Descripción breve');
    fireEvent.click(within(nuevo).getByRole('button', { name: 'Diseño (código) de este bloque' }));
    expect(within(nuevo).getByLabelText('JS actual del bloque')).toHaveValue('bloque.dataset.listo="si";');
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

    const portada = bloqueFicha('Galería del producto');
    const resenasTitulo = bloqueFicha('Reseñas comerciales');
    const precio = bloqueFicha('Precio y oferta');
    const ofertaTitulo = bloqueFicha('Oferta por tiempo limitado');
    const bloqueOferta = bloqueFicha('Oferta por tiempo limitado');
    const descripcionTitulo = bloqueFicha('Descripción breve');
    const beneficiosTitulo = bloqueFicha('Beneficios principales');
    const botonesTitulo = bloqueFicha('Botones de contacto y pago');
    const compraTitulo = bloqueFicha('Disponibilidad y medios de pago');
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
    fireEvent.click(within(metodos).getByRole('button', { name: '+ Otro método' }));
    fireEvent.change(within(metodos).getByLabelText('Otro método 1'), { target: { value: 'Giros Tigo' } });
    ['Deposito bancario', 'Transferencia bancaria', 'Visa', 'Mastercard', 'American Express', 'Diners Club', 'Bancard', 'Credicheck', 'Cabal', 'Panal', 'Discover', 'JCB']
      .forEach(label => fireEvent.click(within(bloqueCompra).getByLabelText(`Mostrar logo ${label}`)));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const payload = confirmar.mock.calls[0][0];
    expect(payload.venta.presentacion_productos['producto:1']).toMatchObject({
      urgencia_kicker: 'Solo hoy',
      urgencia_horas: '5',
      urgencia_minutos: '30',
      urgencia_segundos: '15',
      metodos_pago: [{ texto: 'Giros Tigo' }],
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

  it('mueve la despublicación a Categorías y elimina el tab Productos', () => {
    const confirmar = montar();
    const tabs = within(screen.getByRole('tablist', { name: 'Área de configuración' }));
    expect(tabs.queryByRole('tab', { name: 'Productos' })).toBeNull();

    fireEvent.click(tabs.getByRole('tab', { name: 'Categorías' }));
    fireEvent.click(screen.getByRole('button', { name: /^Cocina\s*2$/ }));

    expect(screen.getAllByRole('button', { name: /^Editar promo de/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Despublicar Cacerola' }));

    expect(screen.queryByText('Cacerola')).toBeNull();
    expect(datosPreview().productos.map(i => i.id)).toEqual(['olla']);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].items.map(i => i.id)).toEqual([2]);
    expect(confirmar.mock.calls[0][0].seleccion.map(i => i.id)).toEqual([2]);
  });

  it('permite editar todas las categorías y buscar dentro del filtro activo', () => {
    const catalogoMulti = {
      productos: [
        ...catalogo.productos,
        { tipo: 'producto', id: 3, slug: 'batidora', nombre: 'Batidora', categoria: 'Electrodomésticos', precio_efectivo: 500000 },
      ],
      combos: [],
    };
    montar(null, catalogoMulti);

    const tabs = within(screen.getByRole('tablist', { name: 'Área de configuración' }));
    fireEvent.click(tabs.getByRole('tab', { name: 'Categorías' }));
    fireEvent.click(screen.getByRole('button', { name: /^Todas\s*3$/ }));

    expect(screen.getByText('Cacerola')).toBeInTheDocument();
    expect(screen.getByText('Batidora')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar productos'), { target: { value: 'bati' } });
    expect(screen.getByText('Batidora')).toBeInTheDocument();
    expect(screen.queryByText('Cacerola')).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Editar promo de/ })).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Buscar productos'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /^Cocina\s*2$/ }));
    expect(screen.getByText('Cacerola')).toBeInTheDocument();
    expect(screen.queryByText('Batidora')).toBeNull();
    fireEvent.change(screen.getByLabelText('Buscar productos'), { target: { value: 'olla' } });
    expect(screen.getByText('Olla')).toBeInTheDocument();
    expect(screen.queryByText('Cacerola')).toBeNull();
  });

  it('al despublicar desde una regla dinámica pasa a manual y el producto desaparece', () => {
    const confirmar = montar({ venta: { seleccion: 'todos', configurado: true }, seleccion: [] });
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Categorías' }));
    fireEvent.click(screen.getByRole('button', { name: /^Cocina\s*2$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Despublicar Cacerola' }));
    expect(screen.queryByText('Cacerola')).toBeNull();
    expect(datosPreview().productos.map(i => i.id)).toEqual(['olla']);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].venta.seleccion).toBe('manual');
    expect(confirmar.mock.calls[0][0].items.map(i => i.id)).toEqual([2]);
  });

  it('marca varios productos como oferta de una: descuento, badge y contador "Solo por hoy"', () => {
    const confirmar = montar();
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Categorías' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar todos los productos de la lista' }));
    fireEvent.click(screen.getByRole('button', { name: /Marcar como oferta/ }));

    const modal = within(screen.getByRole('dialog', { name: 'Marcar como oferta' }));
    fireEvent.click(within(modal.getByRole('group', { name: 'Precio anterior' })).getByRole('button', { name: '20%' }));
    const duracion = within(modal.getByRole('group', { name: 'Duración' }));
    fireEvent.click(duracion.getByRole('button', { name: 'Solo por hoy' }));
    fireEvent.click(duracion.getByRole('button', { name: 'Ofertas del día' }));
    fireEvent.click(modal.getByRole('button', { name: /Aplicar a 2/ }));

    expect(screen.queryByRole('dialog', { name: 'Marcar como oferta' })).toBeNull();
    const [cacerola, olla] = datosPreview().productos;
    expect(cacerola).toMatchObject({ precio: 850000, precio_antes: 1062500, descuento_pct: 20, insignia_principal: 'Solo por hoy' });
    expect(olla).toMatchObject({ precio: 950000, precio_antes: 1187500, descuento_pct: 20 });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    const { items, venta } = confirmar.mock.calls[0][0];
    expect(items.map(i => i.precio_ancla)).toEqual([1062500, 1187500]);
    expect(venta.presentacion_productos['producto:2']).toMatchObject({ insignia_principal: 'Solo por hoy' });
    expect(venta.urgencia).toMatchObject({ activo: true, estado: 'confirmado', titulo: 'Ofertas del día', productos: ['cacerola', 'olla'] });
    const fin = new Date(venta.urgencia.fin_at);
    expect(fin.getHours()).toBe(23);
    expect(fin.getMinutes()).toBe(59);
    expect(fin.toDateString()).toBe(new Date().toDateString());
  });

  it('descuento real: sin onRecargarCatalogo no se ofrece en el modal', () => {
    montar();
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Categorías' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar todos los productos de la lista' }));
    fireEvent.click(screen.getByRole('button', { name: /Marcar como oferta/ }));
    expect(within(screen.getByRole('dialog', { name: 'Marcar como oferta' })).queryByRole('group', { name: 'Descuento real' })).toBeNull();
  });

  it('descuento real: con onRecargarCatalogo, baja el precio de verdad y no toca el ancla', async () => {
    const onRecargarCatalogo = vi.fn().mockResolvedValue();
    montar(null, catalogo, null, { onRecargarCatalogo });
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Categorías' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar todos los productos de la lista' }));
    fireEvent.click(screen.getByRole('button', { name: /Marcar como oferta/ }));

    const modal = within(screen.getByRole('dialog', { name: 'Marcar como oferta' }));
    fireEvent.click(within(modal.getByRole('group', { name: 'Descuento real' })).getByRole('button', { name: '30%' }));
    const duracion = within(modal.getByRole('group', { name: 'Duración' }));
    fireEvent.click(duracion.getByRole('button', { name: '24 horas' }));
    fireEvent.click(modal.getByRole('button', { name: /Aplicar a 2/ }));

    await vi.waitFor(() => expect(productService.descuentoMasivo).toHaveBeenCalled());
    expect(productService.descuentoMasivo).toHaveBeenCalledWith([1, 2], { pct: 30, finAt: expect.any(String) });
    expect(onRecargarCatalogo).toHaveBeenCalled();
    // El real no toca el precio anterior/ancla: sigue siendo el tachado propio del catálogo (900000), no cambió.
    expect(datosPreview().productos[0].precio_antes).toBe(900000);
  });

  it('la × del descuento lo quita aunque el producto traiga precio tachado propio', () => {
    const confirmar = montar();
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Categorías' }));
    // Cacerola trae precio_tachado 900000 del catálogo: antes, vaciar el de la landing lo hacía volver.
    expect(datosPreview().productos[0].precio_antes).toBe(900000);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar descuento de Cacerola' }));
    expect(datosPreview().productos[0]).toMatchObject({ precio_antes: null, descuento_pct: 0 });
    expect(screen.queryByRole('button', { name: 'Quitar descuento de Cacerola' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ precio_ancla: 850000 });
  });

  it('"Quitar todo" saca descuento, contador, badge y colecciones de los marcados', () => {
    const confirmar = montar({ seleccion: [{ ...catalogo.productos[0], etiqueta: 'Oferta, Novedades' }, catalogo.productos[1]] });
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Categorías' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar todos los productos de la lista' }));
    fireEvent.click(screen.getByRole('button', { name: /Marcar como oferta/ }));
    const modal = within(screen.getByRole('dialog', { name: 'Marcar como oferta' }));
    fireEvent.click(within(modal.getByRole('group', { name: 'Precio anterior' })).getByRole('button', { name: '30%' }));
    fireEvent.click(modal.getByRole('button', { name: /Aplicar a 2/ }));
    expect(screen.getByRole('button', { name: 'Quitar contador de Olla' })).toBeInTheDocument();

    // La × de una marca suelta solo esa parte.
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Cacerola de Novedades' }));
    expect(datosPreview().productos[0].etiqueta).toBe('Oferta');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar todos los productos de la lista' }));
    fireEvent.click(screen.getByRole('button', { name: /Quitar todo/ }));
    const [cacerola, olla] = datosPreview().productos;
    expect(cacerola).toMatchObject({ precio_antes: null, descuento_pct: 0 });
    expect(olla).toMatchObject({ precio_antes: null, descuento_pct: 0 });
    expect(cacerola.etiqueta || '').toBe('');
    expect(cacerola.insignia_principal || '').toBe('');
    expect(screen.queryByRole('button', { name: /^Quitar (contador|badge|descuento) de/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    const { venta } = confirmar.mock.calls[0][0];
    expect(venta.urgencia.productos).toEqual([]);
  });

  it('bloque Colecciones del inicio: elige mis colecciones, cuáles, por fila y total, y lo guarda', () => {
    const confirmar = montar({ seleccion: [{ ...catalogo.productos[0], etiqueta: 'Novedades, Día de la madre' }, catalogo.productos[1]] });
    fireEvent.click(screen.getByRole('button', { name: /^d*s*Colecciones$/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Mis colecciones/ }));
    // Cacerola trae precio tachado del catálogo: "Oferta" aparece sola.
    expect(screen.getByLabelText('Mostrar Oferta')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Mostrar Novedades'));
    fireEvent.change(screen.getByLabelText('Tarjetas por fila'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Total de tarjetas'), { target: { value: '6' } });
    expect(datosPreview().venta.inicio.colecciones).toEqual({ modo: 'colecciones', items: ['Novedades'], columnas: 3, limite: 6, titulo: '✧ Colecciones', subtitulo: 'Elegí tu estilo, encontrá tus favoritos' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].venta.inicio.colecciones).toEqual({ modo: 'colecciones', items: ['Novedades'], columnas: 3, limite: 6, titulo: '✧ Colecciones', subtitulo: 'Elegí tu estilo, encontrá tus favoritos' });
  });

  it('agrega y quita productos de una colección (etiqueta de la landing)', () => {
    const confirmar = montar();
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: 'Categorías' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar Olla' }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar a colección/ }));
    const modal = within(screen.getByRole('dialog', { name: 'Agregar a una colección' }));
    fireEvent.change(modal.getByLabelText('Nombre de la colección'), { target: { value: 'Día de la madre' } });
    fireEvent.click(modal.getByRole('button', { name: /Crear “Día de la madre”/ }));

    // Aparece como filtro de la lista y filtra.
    fireEvent.click(screen.getByRole('button', { name: /^Día de la madre\s*1$/ }));
    expect(screen.getByText('Olla')).toBeInTheDocument();
    expect(screen.queryByText('Cacerola')).toBeNull();
    expect(datosPreview().productos[1].etiqueta).toBe('Día de la madre');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].items[1]).toMatchObject({ etiqueta: 'Día de la madre' });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar Olla' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar de colección' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Quitar de una colección' })).getByRole('button', { name: /^Quitar$/ }));
    expect(screen.getByText('Cacerola')).toBeInTheDocument();
    expect(datosPreview().productos[1].etiqueta || '').toBe('');
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
  it('guarda ajustes por producto sin cerrar una regla dinámica', async () => {
    const confirmar = montar({ venta: { seleccion: 'todos', configurado: true }, seleccion: [] });
    await abrirFichaProducto('Olla');
    const precio = bloqueFicha('Precio y oferta');
    fireEvent.change(within(precio).getByLabelText('Precio anterior'), { target: { value: '1300000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(confirmar.mock.calls[0][0].venta.seleccion).toBe('todos');
    expect(confirmar.mock.calls[0][0].items).toHaveLength(1);
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ id: 2, precio_ancla: 1300000 });
  });

  it('usa el límite del backend para guardar 4000 y conserva una personalización al final', () => {
    const grande = { productos: Array.from({ length: 4000 }, (_, i) => ({
      tipo: 'producto', id: i + 1, slug: `prod-${i + 1}`, nombre: `Producto ${i + 1}`, precio_efectivo: 10000,
    })), combos: [] };
    const confirmar = montar({
      seleccion: grande.productos,
      venta: { configurado: true, seleccion: 'manual', presentacion_productos: { 'producto:4000': { v: 2, titulo_comercial: 'Último producto personalizado' } } },
    }, grande, { limites: { items_manual: 5000 } });
    const guardar = screen.getByRole('button', { name: 'Guardar' });
    expect(guardar).toBeEnabled();
    fireEvent.click(guardar);
    expect(confirmar.mock.calls[0][0].items).toHaveLength(4000);
    expect(confirmar.mock.calls[0][0].venta.presentacion_productos).toEqual({
      'producto:4000': { v: 2, titulo_comercial: 'Último producto personalizado' },
    });
  });

  it('mantiene 500 como límite si el backend no concede una ampliación', () => {
    const grande = { productos: Array.from({ length: 501 }, (_, i) => ({ tipo: 'producto', id: i + 1, nombre: `Producto ${i + 1}` })), combos: [] };
    const confirmar = montar(null, grande);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    expect(screen.getByText(/Esta landing tiene más de 500 productos/)).toBeInTheDocument();
    expect(confirmar).not.toHaveBeenCalled();
  });
});
