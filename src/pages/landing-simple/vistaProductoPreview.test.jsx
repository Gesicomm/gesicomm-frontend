import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';

/**
 * Campo por campo de "Vista producto": se edita en el panel real y se mira
 * la ficha que pinta la preview. CodigoPreview se reemplaza por un captor de
 * sus props (codigo + datos) y esos mismos props se pasan por
 * construirDocumentoCodigo + JSDOM, que es lo que hace el iframe.
 */

const capturado = { props: null };
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: props => { capturado.props = props; return <output data-testid="preview" />; } }));

const catalogo = { productos: [
  { tipo: 'producto', id: 1, slug: 'cacerola', nombre: 'Cacerola', categoria: 'Cocina', precio_efectivo: 850000 },
  { tipo: 'producto', id: 2, slug: 'olla', nombre: 'Olla', categoria: 'Cocina', precio_efectivo: 950000 },
], combos: [] };
afterEach(cleanup);

function montar() {
  const confirmar = vi.fn().mockResolvedValue(true);
  render(<ConfigurarVentaCodigo catalogo={catalogo} inicial={{ seleccion: catalogo.productos }} onConfirmar={confirmar} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
  fireEvent.click(screen.getAllByRole('tab', { name: 'Vista producto' })[0]);
  fireEvent.change(screen.getByRole('combobox', { name: 'Producto a editar' }), { target: { value: 'cacerola' } });
  return confirmar;
}

const bloque = titulo => screen.getByText(titulo, { exact: true }).closest('details');

function ficha() {
  const { codigo, datos } = capturado.props;
  expect(datos.vista).toBe('producto');
  const dom = new JSDOM(construirDocumentoCodigo(codigo, { datos }), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { w.postMessage = () => {}; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; },
  });
  const doc = dom.window.document;
  const txt = sel => doc.querySelector(sel)?.textContent.trim();
  const lista = sel => [...doc.querySelectorAll(`${sel} [data-gesicomm-generado]`)].map(e => e.textContent.replace(/\s+/g, ' ').trim());
  const oculto = sel => {
    const el = doc.querySelector(sel);
    return el.hasAttribute('data-gesicomm-ficha-oculto') || el.style.display === 'none';
  };
  return { doc, txt, lista, oculto };
}

const escribir = (el, value) => fireEvent.change(el, { target: { value } });

describe('Vista producto: cada campo llega a la preview', () => {
  it('2 · reseñas, rótulo, título, subtítulo y precio anterior', () => {
    montar();
    const b = bloque('Reseñas, rótulo, título y subtítulo');
    escribir(within(b).getByLabelText('Texto de reseñas'), '4.8 · 320 reseñas en Asunción');
    escribir(within(b).getByLabelText('Rótulo superior'), 'Más vendido');
    escribir(within(b).getByLabelText('Título'), 'Cacerola de hierro 24 cm');
    escribir(within(b).getByLabelText('Subtítulo'), 'Cocina parejo y retiene el calor.');
    escribir(within(b).getByLabelText('Precio anterior'), '1000000');
    const f = ficha();
    expect(f.txt('[data-gesicomm-bind="resenas_texto"]')).toBe('4.8 · 320 reseñas en Asunción');
    expect(f.txt('.eyebrow[data-gesicomm-bind="insignia_principal"]')).toBe('Más vendido');
    expect(f.txt('h1[data-gesicomm-bind="nombre"]')).toBe('Cacerola de hierro 24 cm');
    expect(f.txt('.pdp-lead[data-gesicomm-bind="descripcion"]')).toBe('Cocina parejo y retiene el calor.');
    expect(f.txt('.pdp-prices [data-gesicomm-bind="precio_antes"]')).toMatch(/1\.000\.000/);
    expect(f.txt('.pdp-prices [data-gesicomm-bind="ahorro_texto"]')).toMatch(/Ahorrás/);
  });

  it('2 · el % de descuento calcula el precio anterior', () => {
    montar();
    escribir(within(bloque('Reseñas, rótulo, título y subtítulo')).getByLabelText('% de descuento'), '15');
    expect(ficha().txt('.pdp-prices [data-gesicomm-bind="precio_antes"]')).toMatch(/1\.000\.000/);
  });

  it('3 · oferta por tiempo limitado: textos y duración del contador', () => {
    montar();
    const b = bloque('Oferta por tiempo limitado');
    escribir(within(b).getByLabelText('Rótulo'), 'Solo hoy');
    escribir(within(b).getByLabelText('Título'), 'Precio especial de lanzamiento');
    escribir(within(b).getByLabelText('Texto'), 'Termina esta noche.');
    escribir(within(b).getByLabelText('Horas'), '5');
    escribir(within(b).getByLabelText('Minutos'), '30');
    escribir(within(b).getByLabelText('Segundos'), '15');
    const f = ficha();
    const u = '.pdp-limited-offer[data-gesicomm-ficha-bloque="precio"]';
    expect(f.oculto(u)).toBe(false);
    expect(f.txt(`${u} [data-gesicomm-bind="urgencia_kicker"]`)).toBe('Solo hoy');
    expect(f.txt(`${u} [data-gesicomm-bind="urgencia_titulo"]`)).toBe('Precio especial de lanzamiento');
    expect(f.txt(`${u} [data-gesicomm-bind="urgencia_texto"]`)).toBe('Termina esta noche.');
    expect(f.txt(`${u} [data-gesicomm-countdown-parte="horas"]`)).toBe('05');
    expect(['30', '29']).toContain(f.txt(`${u} [data-gesicomm-countdown-parte="minutos"]`));
  });

  it('4 · beneficios: textos de sección y lista', () => {
    montar();
    const b = bloque('Beneficios');
    escribir(within(b).getByLabelText('Rótulo de sección'), 'Ventajas reales');
    escribir(within(b).getByLabelText('Título de sección'), 'Lo importante antes de comprar');
    escribir(within(b).getByLabelText('Subtítulo de sección'), 'Probado en cocinas de Luque.');
    escribir(within(b).getAllByPlaceholderText('Beneficio')[0], 'Hierro fundido');
    escribir(within(b).getAllByPlaceholderText('Explicación corta')[0], 'Dura toda la vida.');
    fireEvent.click(within(b).getByRole('button', { name: '+ Agregar beneficio' }));
    escribir(within(b).getAllByPlaceholderText('Beneficio').at(-1), 'Apta horno');
    const f = ficha();
    expect(f.txt('#beneficios [data-gesicomm-bind="beneficios_kicker"]')).toBe('Ventajas reales');
    expect(f.txt('#beneficios [data-gesicomm-bind="beneficios_titulo"]')).toBe('Lo importante antes de comprar');
    expect(f.txt('#beneficios [data-gesicomm-bind="beneficios_subtitulo"]')).toBe('Probado en cocinas de Luque.');
    expect(f.lista('.beneficios-grid')[0]).toBe('Hierro fundido Dura toda la vida.');
    expect(f.lista('.beneficios-grid')).toContain('Apta horno');
    expect(f.lista('.highlights')).toEqual([]);
  });

  it('5 · botones de compra, botones de pago y contacto', () => {
    montar();
    const b = bloque('Botón de compra, pagos y contacto');
    escribir(within(b).getByLabelText('Botón principal de compra'), 'La quiero');
    escribir(within(b).getByLabelText('Botón agregar al carrito'), 'Sumar al carrito');
    const pagos = within(b).getByRole('group', { name: 'Botones de pago' });
    escribir(within(pagos).getAllByPlaceholderText('Texto del botón')[0], 'Pagar con PagoPar');
    const contacto = within(b).getByRole('group', { name: 'Botones configurables de contacto' });
    fireEvent.click(within(contacto).getByRole('button', { name: '+ Agregar botón' }));
    escribir(within(contacto).getAllByPlaceholderText('Texto del botón')[0], 'Hablar con ventas');
    escribir(within(contacto).getAllByPlaceholderText('https://...')[0], 'https://wa.me/595981123456');
    const f = ficha();
    expect(f.txt('.buy-row [data-gesicomm-bind="cta_texto"]')).toBe('La quiero');
    expect(f.txt('[data-gesicomm-bind="agregar_carrito_texto"]')).toBe('Sumar al carrito');
    expect(f.lista('.payment-actions')[0]).toBe('Pagar con PagoPar');
    expect(f.lista('.contact-actions')).toEqual(['Hablar con ventas']);
  });

  it('5 · métodos de pago: casillas, otro método y logos', () => {
    montar();
    const metodos = within(bloque('Botón de compra, pagos y contacto')).getByRole('group', { name: 'Métodos de pago' });
    let f = ficha();
    expect(f.lista('.payment-methods')).toEqual(['Pago contra entrega', 'Transferencia bancaria']);
    expect(f.oculto('.payment-brands')).toBe(false);

    fireEvent.click(within(metodos).getByLabelText('Transferencia bancaria'));
    fireEvent.click(within(metodos).getByRole('button', { name: '+ Otro método' }));
    escribir(within(metodos).getByLabelText('Otro método 1'), 'Giros Tigo');
    fireEvent.click(within(metodos).getByLabelText('Tarjetas de crédito'));
    f = ficha();
    expect(f.lista('.payment-methods')).toEqual(['Pago contra entrega', 'Giros Tigo']);
    expect(f.oculto('.payment-brands [data-gesicomm-si="pago_logo_tarjetas"]')).toBe(true);
    expect(f.oculto('.payment-brands [data-gesicomm-si="pago_logo_bocas"]')).toBe(false);

    fireEvent.click(within(metodos).getByLabelText('Pago contra entrega'));
    fireEvent.click(within(metodos).getByRole('button', { name: 'Quitar' }));
    fireEvent.click(within(metodos).getByLabelText('Bocas de cobranza'));
    fireEvent.click(within(metodos).getByLabelText('Billetera electrónica'));
    f = ficha();
    expect(f.lista('.payment-methods')).toEqual([]);
    expect(f.oculto('.payment-methods')).toBe(true);
    expect(f.oculto('.payment-brands')).toBe(true);
  });

  it('6 · qué incluye el pedido', () => {
    montar();
    const b = bloque('Qué incluye el pedido');
    escribir(within(b).getAllByPlaceholderText('Ej: 1 unidad del producto seleccionado')[0], '1 cacerola con tapa');
    const f = ficha();
    expect(f.lista('.order-includes')[0]).toBe('1 cacerola con tapa');
  });

  it('7 · opiniones: textos de sección y una opinión', () => {
    montar();
    const b = bloque('Opiniones de las personas');
    escribir(within(b).getByLabelText('Rótulo de sección'), 'Clientes');
    escribir(within(b).getByLabelText('Título de sección'), 'Lo que dicen en Encarnación');
    escribir(within(b).getByLabelText('Subtítulo de sección'), 'Opiniones de compras reales.');
    escribir(within(b).getAllByPlaceholderText('Nombre')[0], 'Lucía G.');
    escribir(within(b).getAllByPlaceholderText('Comentario real del cliente')[0], 'Llegó al día siguiente.');
    escribir(within(b).getAllByPlaceholderText('Ej: Compra verificada')[0], 'Compra verificada');
    const f = ficha();
    expect(f.txt('#opiniones [data-gesicomm-bind="opiniones_kicker"]')).toBe('Clientes');
    expect(f.txt('#opiniones [data-gesicomm-bind="opiniones_titulo"]')).toBe('Lo que dicen en Encarnación');
    expect(f.txt('#opiniones [data-gesicomm-bind="opiniones_subtitulo"]')).toBe('Opiniones de compras reales.');
    const primera = f.doc.querySelector('.opiniones-grid [data-gesicomm-generado]');
    expect(primera.querySelector('[data-gesicomm-bind="nombre"]').textContent).toBe('Lucía G.');
    expect(primera.querySelector('[data-gesicomm-bind="comentario"]').textContent).toBe('Llegó al día siguiente.');
    expect(primera.querySelector('[data-gesicomm-bind="detalle"]').textContent).toBe('Compra verificada');
  });

  it('8 · preguntas frecuentes: textos de sección y una pregunta', () => {
    montar();
    const b = bloque('Preguntas frecuentes');
    escribir(within(b).getByLabelText('Rótulo de sección'), 'Dudas');
    escribir(within(b).getByLabelText('Título de sección'), 'Antes de pedir');
    escribir(within(b).getByLabelText('Subtítulo de sección'), 'Respondemos por WhatsApp.');
    escribir(within(b).getAllByPlaceholderText('Pregunta frecuente')[0], '¿Sirve para inducción?');
    escribir(within(b).getAllByPlaceholderText('Respuesta clara y corta')[0], 'Sí, en todas las cocinas.');
    const f = ficha();
    expect(f.txt('#preguntas [data-gesicomm-bind="preguntas_kicker"]')).toBe('Dudas');
    expect(f.txt('#preguntas [data-gesicomm-bind="preguntas_titulo"]')).toBe('Antes de pedir');
    expect(f.txt('#preguntas [data-gesicomm-bind="preguntas_subtitulo"]')).toBe('Respondemos por WhatsApp.');
    const primera = f.doc.querySelector('.faq-lista [data-gesicomm-generado]');
    expect(primera.querySelector('summary').textContent).toBe('¿Sirve para inducción?');
    expect(primera.querySelector('p').textContent).toBe('Sí, en todas las cocinas.');
  });

  it('"Mostrar" de cada bloque oculta su parte de la ficha y la vuelve a mostrar', () => {
    montar();
    const casos = [
      ['Portada e imágenes', '.gallery'],
      ['Reseñas, rótulo, título y subtítulo', 'h1[data-gesicomm-bind="nombre"]'],
      ['Oferta por tiempo limitado', '.pdp-limited-offer[data-gesicomm-ficha-bloque="precio"]'],
      ['Beneficios', '#beneficios'],
      ['Botón de compra, pagos y contacto', '.buy-row'],
      ['Qué incluye el pedido', '.order-includes'],
      ['Opiniones de las personas', '#opiniones'],
      ['Preguntas frecuentes', '#preguntas'],
    ];
    for (const [titulo, selector] of casos) {
      const mostrar = within(bloque(titulo).querySelector('summary')).getByRole('checkbox');
      fireEvent.click(mostrar);
      expect([titulo, ficha().oculto(selector)]).toEqual([titulo, true]);
      fireEvent.click(mostrar);
      expect([titulo, ficha().oculto(selector)]).toEqual([titulo, false]);
    }
  });

  it('lo editado se guarda y otro producto no se contamina', () => {
    const confirmar = montar();
    escribir(within(bloque('Beneficios')).getByLabelText('Título de sección'), 'Solo de la cacerola');
    fireEvent.change(screen.getByRole('combobox', { name: 'Producto a editar' }), { target: { value: 'olla' } });
    expect(ficha().txt('#beneficios [data-gesicomm-bind="beneficios_titulo"]')).not.toBe('Solo de la cacerola');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    const presentacion = confirmar.mock.calls[0][0].venta.presentacion_productos;
    expect(presentacion['producto:1'].beneficios_titulo).toBe('Solo de la cacerola');
    expect(presentacion['producto:2']?.beneficios_titulo || '').toBe('');
  });
});
