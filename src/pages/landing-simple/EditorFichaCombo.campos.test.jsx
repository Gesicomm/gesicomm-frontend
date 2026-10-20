import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditorFichaCombo from './EditorFichaCombo';
import FichaComboLienzo from './FichaComboLienzo';

afterEach(cleanup);
const original = { id: 99, tipo: 'combo', nombre: 'Kit cocina', categoria: 'Cocina', precio: 179000,
  propuesta_valor: 'Todo para cocinar', productos_combo: [{ id: 1, nombre: 'Cacerola real', precio: 210000, cantidad: 2,
    imagen: '/cacerola.png', beneficios: [{ titulo: 'Antiadherente' }] }],
  beneficios: [{ titulo: 'Más práctico', texto: 'Todo en una compra' }],
  preguntas_frecuentes: [{ pregunta: '¿Qué recibo?', respuesta: 'Dos cacerolas' }],
};
function Demo({ item = original, content, subir }) {
  const [dato, setDato] = useState(item);
  return <MemoryRouter><EditorFichaCombo item={dato} content={content} onSubirImagen={subir}
    onCambiar={(k, v) => setDato(p => ({ ...p, [k]: v }))} />
    <div data-testid="preview"><FichaComboLienzo item={dato} content={content} preview /></div>
    <div data-testid="publica"><FichaComboLienzo item={dato} content={content} /></div>
  </MemoryRouter>;
}
function abrir(nombre) { fireEvent.click(screen.getByRole('button', { name: new RegExp(`· ${nombre}$`) })); }
function campo(label) {
  if (!screen.queryByRole('textbox', { name: label, exact: true })) {
    const grupo = label === 'Descripción del combo' ? 'Descripción' : label.startsWith('Rótulo') ? 'Precio y ahorro' : 'Textos de la sección';
    fireEvent.click(screen.getByRole('button', { name: `Editar ${grupo}`, exact: true }));
  }
  return screen.getByRole('textbox', { name: label, exact: true });
}
function cambiar(label, value) { fireEvent.change(campo(label), { target: { value } }); }

describe('Inspector de combo: el campo y la preview muestran el mismo contenido', () => {
  it('carga los valores heredados y coloca el check junto a cada campo; borrar no recupera el original', () => {
    render(<Demo />);
    for (const [label, value, check] of [
      ['Título del combo', 'Kit cocina', 'Nombre del combo'], ['Rótulo superior', 'Cocina', 'Sobre-título'],
      ['Descripción del combo', 'Todo para cocinar', 'Descripción'], ['Rótulo del combo', 'Combo armado', 'Rótulo del combo'],
    ]) {
      expect(campo(label)).toHaveValue(value);
      const contenedor = campo(label).closest('[data-combo-campo]');
      expect(within(contenedor).getByRole('checkbox', { name: `Mostrar ${check}` })).toBeChecked();
      cambiar(label, '');
    }
    for (const vista of ['preview', 'publica']) {
      const panel = screen.getByTestId(vista);
      expect(within(panel).queryByRole('heading', { level: 1 })).toBeNull();
      expect(panel.querySelector('.cmb-hero-copy .cmb-eyebrow')).toBeNull();
      expect(panel.querySelector('.cmb-lead')).toBeNull();
      expect(within(panel).queryByText('Combo armado')).toBeNull();
    }
  });
  it('carga los textos de sección, permite ocultar sin borrarlos y editarlos vacíos', () => {
    render(<Demo />);
    abrir('¿Qué incluye\\?');
    expect(campo('Sobre-título de la sección')).toHaveValue('Todo lo que recibís');
    expect(campo('Título de la sección')).toHaveValue('¿Qué incluye?');
    const control = campo('Título de la sección').closest('[data-combo-campo]');
    fireEvent.click(within(control).getByRole('checkbox', { name: 'Mostrar Título de la sección' }));
    expect(campo('Título de la sección')).toHaveValue('¿Qué incluye?');
    expect(screen.getByTestId('preview').querySelector('[data-combo-bloque="incluye"] h2')).toBeNull();
    fireEvent.click(within(control).getByRole('checkbox'));
    cambiar('Título de la sección', ''); cambiar('Sobre-título de la sección', '');
    for (const vista of ['preview', 'publica']) {
      const bloque = screen.getByTestId(vista).querySelector('[data-combo-bloque="incluye"]');
      expect(bloque.querySelector('.cmb-seccion-titulo')).toBeNull();
      expect(bloque).toHaveTextContent('Cacerola real');
    }
  });
  it('precarga y edita los productos incluidos con visibilidad junto a cada dato', () => {
    render(<Demo />); abrir('¿Qué incluye\\?');
    expect(campo('Nombre del producto 1')).toHaveValue('Cacerola real');
    expect(campo('Imagen del producto 1')).toHaveValue('/cacerola.png');
    expect(campo('Beneficio 1 del producto 1')).toHaveValue('Antiadherente');
    cambiar('Nombre del producto 1', 'Nombre editado');
    cambiar('Imagen del producto 1', '');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar beneficio 1 del producto 1' }));
    for (const vista of ['preview', 'publica']) {
      const bloque = screen.getByTestId(vista).querySelector('[data-combo-bloque="incluye"]');
      expect(bloque).toHaveTextContent('Nombre editado');
      expect(bloque).not.toHaveTextContent('Antiadherente');
      expect(bloque.querySelector('img')).toBeNull();
      expect(bloque).toHaveTextContent('×2');
    }
    expect(campo('Beneficio 1 del producto 1')).toHaveValue('Antiadherente');
  });
  it('precarga FAQ de la landing y borra u oculta las preguntas desde su propio campo', () => {
    render(<Demo content={{ ficha_combo: { faq: { items: [{ pregunta: 'Pregunta heredada', respuesta: 'Respuesta heredada' }] } } }}
      item={{ ...original, preguntas_frecuentes: undefined }} />);
    abrir('Preguntas frecuentes');
    expect(campo('Pregunta 1')).toHaveValue('Pregunta heredada');
    expect(campo('Respuesta 1')).toHaveValue('Respuesta heredada');
    fireEvent.click(within(campo('Pregunta 1').closest('[data-combo-campo]')).getByRole('checkbox'));
    for (const vista of ['preview', 'publica']) {
      const faq = screen.getByTestId(vista).querySelector('[data-combo-bloque="faq"]');
      expect(faq.querySelector('h2')).toHaveTextContent('Preguntas frecuentes');
      expect(faq.querySelector('.cmb-faq-item')).toBeNull();
    }
    expect(campo('Pregunta 1')).toHaveValue('Pregunta heredada');
  });
  it('muestra encabezados sin exigir tarjetas y evita contenido de relleno en preview y publicada', () => {
    render(<Demo item={{ id: 1, tipo: 'combo', nombre: 'Vacío', precio: 1000, productos_combo: [], ficha_combo: { prueba_social: { activo: true } } }} />);
    for (const vista of ['preview', 'publica']) {
      const root = screen.getByTestId(vista);
      for (const bloque of ['incluye']) {
        expect(root.querySelector(`[data-combo-bloque="${bloque}"]`)).toBeNull();
      }
      for (const bloque of ['confianza', 'faq', 'beneficio_principal']) {
        expect(root.querySelector(`[data-combo-bloque="${bloque}"] h2`)).not.toBeNull();
        expect(root.querySelector(`[data-combo-bloque="${bloque}"] .cmb-vacio`)).toBeNull();
      }
      expect(root.querySelector('[data-combo-bloque="prueba_social"]')).not.toBeNull();
      expect(root.querySelector('[data-combo-bloque="prueba_social"] .cmb-rating')).toBeNull();
      expect(root.querySelector('.cmb-hero-foto-vacio')).toBeNull();
    }
  });
  it.each([['Zona de confianza', 'confianza'], ['Preguntas frecuentes', 'faq'], ['¿Por qué este combo\\?', 'beneficio_principal']])(
    '%s aparece con cualquiera de sus títulos visibles aunque no tenga elementos', (nombre, clave) => {
      render(<Demo item={{ ...original, preguntas_frecuentes: [], confianza: [],
        ficha_combo: { [clave]: { activo: true, eyebrow: '', titulo: '', items: [] } } }} />);
      abrir(nombre);
      const seccion = vista => screen.getByTestId(vista).querySelector(`[data-combo-bloque="${clave}"]`);
      const comprobar = visible => { for (const vista of ['preview', 'publica']) {
        if (visible) {
          expect(seccion(vista)).not.toBeNull();
          expect(seccion(vista).querySelector('.cmb-trust-item, .cmb-faq-item, .cmb-vacio')).toBeNull();
        } else expect(seccion(vista)).toBeNull();
      } };
      comprobar(false);
      cambiar('Sobre-título de la sección', 'Solo el sobretítulo');
      comprobar(true);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Sobre-título de la sección', exact: true }));
      comprobar(false);
      cambiar('Título de la sección', 'Solo el título');
      comprobar(true);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Título de la sección', exact: true }));
      comprobar(false);
      if (clave === 'beneficio_principal') {
        cambiar('Texto explicativo', 'Solo el texto explicativo');
        comprobar(true);
        fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Texto explicativo', exact: true }));
        comprobar(false);
      }
      fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Sobre-título de la sección', exact: true }));
      comprobar(true);
      fireEvent.click(screen.getByRole('checkbox', { name: `Mostrar ${nombre.replace('\\?', '?')}`, exact: true }));
      comprobar(false);
    });
  it('separa la presentación en bloques plegables y abre solamente los controles elegidos', () => {
    render(<Demo />);
    for (const titulo of ['Nombre del combo', 'Descripción', 'Fotos del combo', 'Precio y ahorro', 'Botón de compra', 'Puntos clave del combo',
      'Calificación']) {
      expect(screen.getByRole('button', { name: `Editar ${titulo}`, exact: true })).toBeInTheDocument();
    }
    expect(screen.queryByRole('textbox', { name: 'Botón principal' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Botón de compra', exact: true }));
    cambiar('Botón principal', 'Comprar mi kit');
    expect(screen.getByTestId('publica').querySelector('.cmb-hero-accion')).toHaveTextContent('Comprar mi kit');
  });
  it('muestra todos los beneficios de Qué incluye, permite editarlos, ocultarlos y borrarlos uno por uno', () => {
    render(<Demo item={{ ...original, productos_combo: [{ ...original.productos_combo[0], beneficios: ['', 'Antiadherente', 'Fácil de limpiar'] }] }} />);
    abrir('¿Qué incluye\\?');
    const bloque = vista => screen.getByTestId(vista).querySelector('[data-combo-bloque="incluye"]');
    for (const vista of ['preview', 'publica']) {
      expect(bloque(vista)).toHaveTextContent('Antiadherente');
      expect(bloque(vista)).toHaveTextContent('Fácil de limpiar');
    }
    cambiar('Beneficio 3 del producto 1', 'Lavable');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar beneficio 2 del producto 1' }));
    for (const vista of ['preview', 'publica']) {
      expect(bloque(vista)).not.toHaveTextContent('Antiadherente');
      expect(bloque(vista)).toHaveTextContent('Lavable');
      expect(bloque(vista).querySelectorAll('.cmb-product-beneficios li')).toHaveLength(1);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Quitar beneficio 3 del producto 1' }));
    expect(bloque('publica').querySelector('.cmb-product-beneficios')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar beneficio al producto 1' }));
    cambiar('Beneficio 3 del producto 1', 'Nuevo beneficio');
    expect(bloque('publica')).toHaveTextContent('Nuevo beneficio');
  });
  it.each([
    ['Nombre del combo', 'Título del combo', '.cmb-hero h1'],
    ['Descripción', 'Descripción del combo', '.cmb-lead'],
    ['Fotos del combo', 'Etiqueta foto', '.cmb-hero-badge'],
    ['Botón de compra', 'Botón principal', '.cmb-hero-accion'],
    ['Precio y ahorro', 'Rótulo del combo', '.cmb-offer-panel-head'],
  ])('el bloque %s permite editar, ocultar y borrar %s', (grupo, label, selector) => {
    render(<Demo item={{ ...original, imagenes: ['/combo.png'] }} />);
    if (grupo !== 'Nombre del combo') fireEvent.click(screen.getByRole('button', { name: `Editar ${grupo}`, exact: true }));
    cambiar(label, 'Contenido comprobado');
    const checkbox = within(campo(label).closest('[data-combo-campo]')).getByRole('checkbox');
    for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector(selector)).toHaveTextContent('Contenido comprobado');
    fireEvent.click(checkbox);
    for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector(selector)?.textContent || '').not.toContain('Contenido comprobado');
    expect(campo(label)).toHaveValue('Contenido comprobado');
    fireEvent.click(checkbox); cambiar(label, '');
    for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector(selector)?.textContent || '').not.toContain('Contenido comprobado');
  });
  it('el check de calificación activa y oculta el dato real; la galería se puede ocultar completa', () => {
    render(<Demo item={{ ...original, imagenes: ['/combo.png', '/segunda.png'] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Calificación', exact: true }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Calificación', exact: true }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Calificación del combo' }), { target: { value: '4.2' } });
    for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-hero-copy .cmb-rating')).toHaveTextContent('4.2/5');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Calificación', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Fotos del combo', exact: true }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Galería e imágenes', exact: true }));
    for (const vista of ['preview', 'publica']) {
      expect(screen.getByTestId(vista).querySelector('.cmb-hero-copy .cmb-rating')).toBeNull();
      expect(screen.getByTestId(vista).querySelector('.cmb-hero-visual')).toBeNull();
    }
  });
  it.each([
    ['¿Qué incluye\\?', 'incluye', 'Título de la sección'],
    ['Valor del combo', 'valor', 'Título de la sección de valor'],
    ['¿Por qué este combo\\?', 'beneficio_principal', 'Título de la sección'],
    ['Opiniones', 'prueba_social', 'Título de la sección'],
    ['Zona de confianza', 'confianza', 'Título de la sección'],
    ['Preguntas frecuentes', 'faq', 'Título de la sección'],
  ])('edita, vacía y restaura los textos del bloque %s en preview y pública', (nombre, key, label) => {
    render(<Demo item={{ ...original, confianza: [{ titulo: 'Atención', texto: 'Consultas' }],
      ficha_combo: { prueba_social: { activo: true, testimonios: [{ nombre: 'Cliente', comentario: 'Comentario real' }] } } }} />);
    abrir(nombre);
    cambiar(label, `Título editado ${key}`);
    for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector(`[data-combo-bloque="${key}"] h2`)).toHaveTextContent(`Título editado ${key}`);
    cambiar(label, '');
    for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector(`[data-combo-bloque="${key}"] h2`)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar este bloque' }));

    if (key === 'prueba_social') expect(screen.getByTestId('publica').querySelector('[data-combo-bloque="prueba_social"]')).toBeNull();
    else expect(screen.getByTestId('publica').querySelector(`[data-combo-bloque="${key}"] h2`)).not.toBeNull();
  });
});

it('edita emojis, sube y oculta el ícono propio de cada beneficio en preview y pública', async () => {
  const subir = vi.fn().mockResolvedValue('/uploads/beneficio.webp');
  render(<Demo subir={subir} item={{ ...original, beneficios: [], ficha_combo: { beneficio_principal: { activo: true, items: [{ icono: 'star', titulo: 'Beneficio real', texto: 'Texto de la tarjeta' }] } } }} />);
  abrir('¿Por qué este combo\\?');
  const tarjetas = () => ['preview', 'publica'].map(vista => screen.getByTestId(vista).querySelector('.cmb-why-item'));
  fireEvent.change(screen.getByLabelText('Emoji del beneficio 1'), { target: { value: '✨' } });
  for (const tarjeta of tarjetas()) expect(tarjeta.querySelector('.cmb-trust-icono')).toHaveTextContent('✨');
  const archivo = new File(['imagen'], 'icono.webp', { type: 'image/webp' });
  fireEvent.change(screen.getByLabelText('Archivo de ícono del beneficio 1'), { target: { files: [archivo] } });
  await waitFor(() => expect(subir).toHaveBeenCalledWith(archivo));
  await waitFor(() => { for (const tarjeta of tarjetas()) expect(tarjeta.querySelector('.cmb-icono-imagen')).toHaveAttribute('src', expect.stringContaining('/uploads/beneficio.webp')); });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Emoji o ícono', exact: true }));
  for (const tarjeta of tarjetas()) expect(tarjeta.querySelector('img')).toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Emoji o ícono', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Quitar ícono del beneficio 1' }));
  for (const tarjeta of tarjetas()) {
    expect(tarjeta.querySelector('img, svg, .cmb-trust-icono')).toBeNull();
    expect(tarjeta).toHaveTextContent('Beneficio real');
  }
});

it('usa los mismos controles que producto y refleja emojis, foto, detalle y su visibilidad', () => {
  render(<Demo item={{ ...original, confianza: [{ icono: '🚚', titulo: 'Envíos', texto: 'Todo Paraguay' }],
    ficha_combo: { prueba_social: { activo: true, testimonios: [{ nombre: 'Ana', comentario: 'Excelente kit', foto: '/ana.webp', detalle: 'Compró en octubre' }] } } }} />);
  abrir('Zona de confianza');
  fireEvent.change(screen.getByRole('textbox', { name: 'Ícono 1' }), { target: { value: '💚' } });
  abrir('Opiniones');
  expect(screen.queryByRole('textbox', { name: 'Rótulo Compra verificada', exact: true })).toBeNull();
  expect(screen.getByRole('button', { name: /Subir foto/ })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Detalle', exact: true }), { target: { value: 'Compra confirmada' } });
  for (const vista of ['preview', 'publica']) {
    const nodo = screen.getByTestId(vista);
    expect(nodo.querySelector('.cmb-trust-icono')).toHaveTextContent('💚');
    expect(nodo.querySelector('.cmb-review-foto')).toHaveAttribute('src', expect.stringContaining('/ana.webp'));
    expect(nodo.querySelector('.cmb-review small')).toHaveTextContent('Compra confirmada');
  }
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Foto de la persona', exact: true }));
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-review-foto')).toBeNull();
  fireEvent.change(screen.getByRole('textbox', { name: 'Detalle', exact: true }), { target: { value: '' } });
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-review small')).toBeNull();
});

it('explica y deshabilita las miniaturas sin dos fotos, y las habilita al agregar otra foto', () => {
  render(<Demo item={{ ...original, imagenes_landing: ['https://cdn.test/uno.webp'] }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar Fotos del combo', exact: true }));
  const miniaturas = () => screen.getByRole('checkbox', { name: 'Mostrar Miniaturas de la galería', exact: true });
  expect(miniaturas()).toBeDisabled();
  expect(miniaturas()).not.toBeChecked();
  expect(screen.getByText(/Agregá al menos dos fotos del combo/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Agregar imagen por link' }), { target: { value: 'https://cdn.test/dos.webp' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar link', exact: true }));
  expect(miniaturas()).toBeEnabled();
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelectorAll('.cmb-miniatura')).toHaveLength(2);
  fireEvent.click(miniaturas());
  for (const vista of ['preview', 'publica']) {
    expect(screen.getByTestId(vista).querySelector('.cmb-miniaturas')).toBeNull();
    expect(screen.getByTestId(vista).querySelector('.cmb-kit-strip')).not.toBeNull();
  }
  fireEvent.click(miniaturas());
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelectorAll('.cmb-miniatura')).toHaveLength(2);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Galería e imágenes', exact: true }));
  expect(miniaturas()).toBeDisabled();
  expect(miniaturas()).not.toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Galería e imágenes', exact: true }));
  expect(miniaturas()).toBeEnabled();
  expect(miniaturas()).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar foto 2 de esta landing', exact: true }));
  expect(miniaturas()).toBeDisabled();
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-miniaturas')).toBeNull();
});

it('ocultar Encabezado conserva fotos, precio, compra y los demás bloques', () => {
  render(<Demo item={{ ...original, imagenes: ['https://cdn.test/combo.webp'] }} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Encabezado', exact: true }));
  for (const vista of ['preview', 'publica']) {
    const root = screen.getByTestId(vista);
    expect(root.querySelector('.cmb-hero-copy')).toBeNull();
    expect(root.querySelector('.cmb-hero-foto img')).not.toBeNull();
    expect(root.querySelector('.cmb-price-main strong')).toHaveTextContent('179.000');
    expect(root.querySelector('.cmb-hero-accion button')).not.toBeNull();
    expect(root.querySelector('[data-combo-bloque="incluye"]')).not.toBeNull();
  }
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Encabezado', exact: true }));
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-hero-copy h1')).toHaveTextContent('Kit cocina');
});
it('activar Opiniones muestra el bloque sin reseñas inventadas y el precio se explica sin un ancla manual', () => {
  render(<Demo />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar Opiniones', exact: true }));
  for (const vista of ['preview', 'publica']) {
    const opiniones = screen.getByTestId(vista).querySelector('[data-combo-bloque="prueba_social"]');
    expect(opiniones).not.toBeNull();
    expect(opiniones).toHaveTextContent('Todavía no hay opiniones');
    expect(opiniones.querySelector('.cmb-rating')).toBeNull();
    expect(opiniones.querySelector('.cmb-review')).toBeNull();
  }
  fireEvent.click(screen.getByRole('button', { name: 'Editar Precio y ahorro', exact: true }));
  expect(screen.queryByLabelText('Precio ancla')).toBeNull();
  expect(screen.getByText(/El precio tachado es la suma/)).toHaveTextContent('420.000');
});

it('ordena las tarjetas desde sus propias asas y flechas, sin un bloque de orden adicional', () => {
  render(<Demo item={{ ...original, ficha_combo: { hero: { nota_envio: 'Nota antigua', nota_garantia: 'Garantía antigua', nota_stock: 'Stock antiguo' } } }} />);
  for (const nombre of ['Envío, garantía y stock', 'Oferta y contador', 'Orden de los elementos']) expect(screen.queryByRole('button', { name: `Editar ${nombre}`, exact: true })).toBeNull();
  expect(screen.queryByText('Nota antigua')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Subir Descripción dentro del encabezado', exact: true }));
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-hero-copy').firstElementChild.dataset.comboOrden).toBe('descripcion');
  const drag = { setData: () => {}, effectAllowed: '' };
  fireEvent.dragStart(screen.getByRole('button', { name: 'Arrastrar Botón de compra dentro del encabezado', exact: true }), { dataTransfer: drag });
  fireEvent.dragOver(screen.getByRole('button', { name: 'Editar Precio y ahorro', exact: true }).closest('[data-combo-subeditor]'), { dataTransfer: drag });
  fireEvent.drop(screen.getByRole('button', { name: 'Editar Precio y ahorro', exact: true }).closest('[data-combo-subeditor]'), { dataTransfer: drag });
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-offer-panel').firstElementChild.dataset.comboOrden).toBe('compra');
  const tarjetas = [...document.querySelectorAll('[data-combo-subeditor]')].map(n => n.dataset.comboSubeditor);
  expect(tarjetas.indexOf('hero_compra')).toBeLessThan(tarjetas.indexOf('hero_precio'));
});
it.each([
  ['Descripción', 'Nombre del combo', 'data-combo-subeditor', 'hero_descripcion', 'hero_titulo', 'dentro del encabezado'],
  ['¿Qué incluye?', 'Zona de confianza', 'data-combo-editor-bloque', 'incluye', 'confianza', 'para ordenar'],
])('desplaza los bloques durante el arrastre de %s y guarda solamente al soltar', (nombre, hacia, atributo, clave, destinoClave, sufijo) => {
  render(<Demo />);
  const asa = screen.getByRole('button', { name: `Arrastrar ${nombre} ${sufijo}`, exact: true });
  const origen = document.querySelector(`[${atributo}="${clave}"]`);
  const destino = document.querySelector(`[${atributo}="${destinoClave}"]`);
  const rect = el => { const top = 100 + Number(el.style.order) * 80; return { top, bottom: top + 60, left: 30, width: 400, height: 60 }; };
  for (const el of document.querySelectorAll(`[${atributo}]`)) el.getBoundingClientRect = () => rect(el);
  const cabecera = asa.closest('[data-combo-cabecera]');
  cabecera.getBoundingClientRect = () => rect(origen);
  const imagen = vi.fn();
  const drag = { setData: vi.fn(), setDragImage: imagen, effectAllowed: '', dropEffect: '' };
  const ordenInicial = Number(origen.style.order);
  const previewInicial = screen.getByTestId('preview').innerHTML;
  const evento = (el, tipo, clientY) => {
    const e = new MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: 50, clientY });
    Object.defineProperty(e, 'dataTransfer', { value: drag });
    fireEvent(el, e);
  };
  const comenzar = () => evento(asa, 'dragstart', rect(origen).top + 15);
  const pasar = () => evento(destino, 'dragover', rect(destino).top + (ordenInicial < Number(destino.style.order) ? 59 : 1));
  comenzar();
  expect(imagen).toHaveBeenLastCalledWith(cabecera, 20, 15);
  pasar();
  expect(origen).toHaveAttribute('data-arrastrando', 'true');
  expect(Number(origen.style.order)).not.toBe(ordenInicial);
  expect(origen.style.transition).toContain('transform 240ms');
  expect(screen.getByTestId('preview').innerHTML).toBe(previewInicial);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(Number(origen.style.order)).toBe(ordenInicial);
  expect(screen.getByTestId('preview').innerHTML).toBe(previewInicial);
  comenzar(); pasar();
  fireEvent.dragEnd(asa);
  expect(Number(origen.style.order)).toBe(ordenInicial);
  comenzar(); pasar();
  fireEvent.drop(destino, { dataTransfer: drag });
  expect(Number(origen.style.order)).not.toBe(ordenInicial);
  expect(origen).not.toHaveAttribute('data-arrastrando');
  expect(document.querySelector('[data-combo-arrastre-flotante]')).toBeNull();
  if (clave === 'hero_descripcion') for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-hero-copy').firstElementChild.dataset.comboOrden).toBe('descripcion');
  else for (const vista of ['preview', 'publica']) {
    const bloques = [...screen.getByTestId(vista).querySelectorAll('[data-combo-bloque]')].map(n => n.dataset.comboBloque);
    expect(bloques.indexOf('incluye')).toBeGreaterThan(bloques.indexOf('confianza'));
  }
});

it.each([
  ['Descripción dentro del encabezado', 'data-combo-subeditor', 'hero_descripcion', 'hero_titulo'],
  ['¿Qué incluye? para ordenar', 'data-combo-editor-bloque', 'incluye', 'valor'],
])('arrastra %s desde el punto exacto de agarre y cancela fuera del grupo', (nombre, atributo, clave, hacia) => {
  render(<Demo />);
  const asa = screen.getByRole('button', { name: `Arrastrar ${nombre}`, exact: true });
  const origen = document.querySelector(`[${atributo}="${clave}"]`);
  const destino = document.querySelector(`[${atributo}="${hacia}"]`);
  const cabecera = asa.closest('[data-combo-cabecera]');
  const rect = el => { const top = 100 + Number(el.style.order) * 80; return { top, bottom: top + 60, left: 30, width: 400, height: 60 }; };
  for (const el of document.querySelectorAll(`[${atributo}]`)) el.getBoundingClientRect = () => rect(el);
  cabecera.getBoundingClientRect = () => rect(origen);
  const inicial = Number(origen.style.order), top = rect(origen).top;
  const elementFromPoint = document.elementFromPoint;
  asa.setPointerCapture = () => {};
  asa.hasPointerCapture = () => false;
  const pointer = (tipo, x, y) => {
    const e = new MouseEvent(tipo, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    fireEvent(asa, e);
  };
  try {
    document.elementFromPoint = () => destino;
    pointer('pointerdown', 50, top + 15);
    expect(document.querySelector('[data-arrastre-cabecera]')).toBeNull();
    const y = rect(destino).top + (inicial < Number(destino.style.order) ? 59 : 1);
    pointer('pointermove', 100, y);
    const fantasma = document.querySelector('[data-arrastre-cabecera]');
    expect(fantasma).not.toBeNull();
    expect(fantasma.style.left).toBe('30px');
    expect(fantasma.style.top).toBe(`${top}px`);
    expect(fantasma.style.transform).toBe(`translate3d(50px, ${y - top - 15}px, 0)`);
    expect(Number(origen.style.order)).not.toBe(inicial);
    document.elementFromPoint = () => document.body;
    pointer('pointerup', 100, y);
    expect(Number(origen.style.order)).toBe(inicial);
    expect(document.querySelector('[data-arrastre-cabecera]')).toBeNull();
    expect(document.body.style.cursor).not.toBe('grabbing');
  } finally { document.elementFromPoint = elementFromPoint; }
});

it('configura el contador junto al precio y lo muestra dentro de la oferta', () => {
  render(<Demo />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar Precio y ahorro', exact: true }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Oferta por tiempo limitado', exact: true }));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Minutos', exact: true }), { target: { value: 15 } });
  for (const vista of ['preview', 'publica']) {
    const root = screen.getByTestId(vista);
    expect(root.querySelector('.cmb-offer-panel .cmb-contador')).not.toBeNull();
    expect(root.querySelector('.cmb-offer-panel .cmb-contador')).toHaveTextContent('15');
    expect(root.querySelector('[data-combo-bloque="hero"] > [data-combo-sub-bloque="hero_oferta"]')).toBeNull();
  }
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar encabezado', exact: true }));
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-contador')).not.toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Oferta por tiempo limitado', exact: true }));
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-contador')).toBeNull();
});

it('mantiene una sola sección de productos incluidos y elimina la copia inferior incluso si estaba guardada', () => {
  render(<Demo item={{ ...original, ficha_combo: { detalle_productos: { activo: true, titulo: '¿Qué incluye?' }, _orden: ['detalle_productos', 'incluye'] } }} />);
  expect(screen.queryByRole('button', { name: /· Detalle de cada producto$/ })).toBeNull();
  for (const vista of ['preview', 'publica']) {
    const root = screen.getByTestId(vista);
    expect(root.querySelectorAll('[data-combo-bloque="incluye"]')).toHaveLength(1);
    expect(root.querySelector('[data-combo-bloque="incluye"]')).toHaveTextContent('Cacerola real');
    expect(root.querySelector('[data-combo-bloque="detalle_productos"]')).toBeNull();
  }
});

it('carga el rótulo del contador, permite editarlo, ocultarlo y borrarlo', () => {
  render(<Demo item={{ ...original, ficha_combo: { hero: { contador: { activo: true, horas: 1, minutos: 0, segundos: 0 } } } }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar Precio y ahorro', exact: true }));
  const rotulo = screen.getByRole('textbox', { name: 'Encabezado de la oferta', exact: true });
  expect(rotulo).toHaveValue('Oferta por tiempo limitado');
  fireEvent.change(rotulo, { target: { value: 'Precio especial por tiempo limitado' } });
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-contador-rotulo')).toHaveTextContent('Precio especial por tiempo limitado');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar encabezado', exact: true }));
  for (const vista of ['preview', 'publica']) {
    expect(screen.getByTestId(vista).querySelector('.cmb-contador-rotulo')).toBeNull();
    expect(screen.getByTestId(vista).querySelector('.cmb-contador-digitos')).not.toBeNull();
  }
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar encabezado', exact: true }));
  fireEvent.change(rotulo, { target: { value: '' } });
  for (const vista of ['preview', 'publica']) expect(screen.getByTestId(vista).querySelector('.cmb-contador-rotulo')).toBeNull();
});

it('reutiliza el editor de producto para el nombre, texto y visibilidad de la oferta', () => {
  render(<Demo item={{ ...original, ficha_combo: { hero: { contador: { activo: true } } } }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar Precio y ahorro', exact: true }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nombre de la oferta', exact: true }), { target: { value: 'Flash de cocina' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Texto de la oferta', exact: true }), { target: { value: 'Llevá el kit durante esta promoción.' } });
  for (const vista of ['preview', 'publica']) {
    const oferta = screen.getByTestId(vista).querySelector('.pdp-offer-card');
    expect(oferta.querySelector('h2')).toHaveTextContent('Flash de cocina');
    expect(oferta).toHaveTextContent('Llevá el kit durante esta promoción.');
  }
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar nombre', exact: true }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar texto', exact: true }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar contador', exact: true }));
  for (const vista of ['preview', 'publica']) {
    const oferta = screen.getByTestId(vista).querySelector('.pdp-offer-card');
    expect(oferta.querySelector('h2')).toBeNull();
    expect(oferta).not.toHaveTextContent('Llevá el kit durante esta promoción.');
    expect(oferta.querySelector('.countdown')).toBeNull();
  }
});
