import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';
import LandingCodigoPublica from './LandingCodigoPublica';
import FichaComboLienzo from './FichaComboLienzo';
import { comboAdminService } from '../../services/comboAdminService';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]), obtener: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productService', () => ({ productService: { detalle: vi.fn().mockResolvedValue({}), faq: vi.fn().mockResolvedValue([]) } }));
vi.mock('./usePagoparConectado', async importOriginal => ({ ...await importOriginal(), usePagoparConectado: () => false }));
vi.mock('./CodigoPreview', () => ({ default: ({ codigo, onNavegar }) => <div data-testid="codigo-preview">
  {codigo?.html}
  <button onClick={() => onNavegar({ destino: 'producto', producto: 'combo-99' })}>Abrir combo</button>
  <button onClick={() => onNavegar({ destino: 'producto', producto: 'producto-7' })}>Abrir producto</button>
</div> }));
vi.mock('../landing/CartDrawer', () => ({ default: () => null }));
// Las interacciones React se verifican acá; el documento aislado y sus
// globales se verifican con el runtime real en codigoFichaCombo.test.jsx.
vi.mock('./ComboCodigoVista', async () => {
  const { default: Vista } = await import('./templates/combo/ComboProductPagePublica');
  return { default: props => <Vista item={props.item} landingConfig={props.content} previewMode={props.preview} tema={props.tema}
    isMobile={props.isMobile} bloqueActivo={props.bloqueActivo} onBloque={props.onBloque} onActivo={props.onActivo}
    onVolver={() => props.onNavegar?.({ destino: 'inicio' })}
    onAgregar={() => props.onComprar?.({ producto: `combo-${props.item.referencia_id || props.item.id}`, cantidad: 1 })} /> };
});
vi.mock('../../lib/metaPixel', () => ({
  esperarCookiesFacebook: vi.fn().mockResolvedValue({}), generarEventId: () => 'test', leerCookiesFacebook: () => ({}),
  trackearEvento: vi.fn(), trackearEventoPersonalizado: vi.fn(),
}));
vi.mock('../../lib/googleAnalytics', () => ({ trackearEventoGA: vi.fn() }));
vi.mock('../../services/landingPublicaService', () => ({
  registrarEventoLanding: vi.fn().mockResolvedValue({}), obtenerCatalogoLandingPublica: vi.fn(),
  obtenerGeografiaPublica: vi.fn(), obtenerProductosLandingPublica: vi.fn(),
}));
const cart = vi.hoisted(() => ({
  carrito: new Map(), agregarAlCarrito: vi.fn(), setCarritoAbierto: vi.fn(),
  iniciarCheckout: vi.fn(), cambiarMetodoPago: vi.fn(), sugerenciasCarrito: [], crossSellsCarrito: [],
}));
vi.mock('../landing/useStoreCart', () => ({ useStoreCart: () => cart }));

const combo = {
  id: 99, referencia_id: 99, content_id: 'combo-99', tipo: 'combo', nombre: 'prueba123',
  precio: 179000, precio_efectivo: 179000, categoria: 'Cocina',
  propuesta_valor: 'La propuesta propia del combo',
  productos_combo: [{ id: 7, nombre: 'Cacerola incluida', precio: 200000, cantidad: 1 }],
};
const producto = { id: 7, referencia_id: 7, tipo: 'producto', content_id: 'producto-7', nombre: 'Cacerola', precio_efectivo: 200000 };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Navegación a la vista propia del combo desde el lienzo', () => {
  it('carga los componentes y marketing del combo aunque el catálogo solo incluya su resumen', async () => {
    comboAdminService.obtener.mockResolvedValueOnce({ id: 99, nombre: 'prueba123', propuesta_valor: 'Contenido completo cargado',
      producto_padre: { id: 7, nombre: 'Cacerola de detalle', precio_base: 200000 },
      items: [{ cantidad: 2, producto_incluido: { id: 8, nombre: 'Utensilios del detalle', precio_base: 30000 } }],
      ficha_datos: { incluye: { titulo: 'Todo lo que incluye el kit' } },
    });
    const resumen = { id: 99, tipo: 'combo', nombre: 'prueba123', precio_efectivo: 179000, productos_combo: [], ficha_datos: {} };
    const { container } = render(<MemoryRouter><ConfigurarVentaCodigo catalogo={{ productos: [producto], combos: [resumen] }}
      inicial={{ seleccion: [producto, resumen] }} codigos={{ inicio: { html: 'Inicio' } }}
      cargarOfertas={vi.fn().mockResolvedValue([])} onConfirmar={vi.fn()} onVolver={vi.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('radio', { name: 'Celular' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir combo' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Todo lo que incluye el kit' })).toBeInTheDocument();
    expect(container.querySelector('[data-combo-preview-bloque="incluye"]')).toHaveTextContent('Utensilios del detalle');
    expect(container.querySelector('[data-combo-preview-bloque="incluye"]')).toHaveTextContent('×2');
    expect(container.querySelector('.cmb-lead')).toHaveTextContent('Contenido completo cargado');
    expect(comboAdminService.obtener).toHaveBeenCalledWith(99);
  });
  it.each([1440, 390])('abre el combo pulsado en la lista y sus bloques con una pantalla de %s px', async ancho => {
    const anchoAnterior = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: ancho });
    try {
      const otro = { ...combo, id: 100, referencia_id: 100, content_id: 'combo-100', nombre: 'Segundo combo' };
      render(<MemoryRouter><ConfigurarVentaCodigo
        catalogo={{ productos: [producto], combos: [combo, otro] }} inicial={{ seleccion: [producto, combo, otro] }}
        codigos={{ inicio: { html: 'Inicio' } }} cargarOfertas={vi.fn().mockResolvedValue([])}
        onConfirmar={vi.fn()} onVolver={vi.fn()} /></MemoryRouter>);
      fireEvent.click(screen.getByRole('radio', { name: 'Celular' }));
      fireEvent.click(screen.getByRole('tab', { name: 'Combos', exact: true }));
      fireEvent.click(screen.getByRole('button', { name: 'Ver combo Segundo combo', exact: true }));
      const vista = ancho < 1280 ? within(screen.getByRole('dialog', { name: 'Vista previa' })) : screen;
      expect(await vista.findByRole('heading', { level: 1, name: 'Segundo combo' })).toBeInTheDocument();
      expect(vista.getByLabelText('Producto de la ficha')).toHaveValue('combo-100');
      expect(vista.getByRole('tab', { name: 'Vista combo', exact: true })).toBeInTheDocument();
      if (ancho < 1280) fireEvent.click(vista.getByRole('button', { name: 'Cerrar vista previa' }));
      expect(screen.getByRole('region', { name: 'Bloques de la vista de combo' })).toBeInTheDocument();
      expect(screen.getByLabelText('Título del combo')).toHaveValue('Segundo combo');
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: anchoAnterior });
    }
  });
  it('conserva la edición al cambiar de combo y permite restaurar un bloque oculto', async () => {
    const otro = { ...combo, id: 100, referencia_id: 100, content_id: 'combo-100', nombre: 'Segundo combo' };
    const confirmar = vi.fn();
    const { container } = render(<MemoryRouter><ConfigurarVentaCodigo
      catalogo={{ productos: [producto], combos: [combo, otro] }} inicial={{ seleccion: [producto, combo, otro] }}
      codigos={{ inicio: { html: 'Inicio' } }} cargarOfertas={vi.fn().mockResolvedValue([])}
      onConfirmar={confirmar} onVolver={vi.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('radio', { name: 'Celular' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir combo' }));
    fireEvent.change(screen.getByLabelText('Título del combo'), { target: { value: 'Solo el primer combo' } });
    fireEvent.change(screen.getByLabelText('Producto de la ficha'), { target: { value: 'combo-100' } });
    expect(screen.getByRole('heading', { level: 1, name: 'Segundo combo' })).toBeInTheDocument();
    const panel = screen.getByRole('region', { name: 'Bloques de la vista de combo' });
    fireEvent.click(within(panel).getByRole('checkbox', { name: 'Mostrar ¿Qué incluye?' }));
    expect(container.querySelector('[data-combo-preview-bloque="incluye"]')).toBeNull();
    fireEvent.click(within(panel).getByRole('button', { name: /· ¿Qué incluye\?$/ }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Restaurar este bloque' }));
    expect(container.querySelector('[data-combo-preview-bloque="incluye"]')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Producto de la ficha'), { target: { value: 'combo-99' } });
    expect(screen.getByRole('heading', { level: 1, name: 'Solo el primer combo' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(confirmar).toHaveBeenCalled());
    const fichas = confirmar.mock.calls[0][0].venta.presentacion_productos;
    expect(fichas['combo:99'].ficha_combo.hero.titulo).toBe('Solo el primer combo');
    expect(fichas['combo:100'].ficha_combo.hero).toBeUndefined();
  });

  it('respeta una galería vaciada sin recuperar fotos del catálogo', () => {
    const { container } = render(<MemoryRouter><FichaComboLienzo
      item={{ ...combo, imagenes: ['https://cdn.test/original.jpg'] }}
      runtime={{ id: 'combo-99', precio: 179000, imagenes_url: [] }}
    /></MemoryRouter>);
    expect(container.querySelector('.cmb-hero-foto img')).toBeNull();
  });
  it('edita y oculta bloques, reordena con arrastre y teclado, y guarda los cambios solo para este combo', async () => {
    const confirmar = vi.fn();
    const { container } = render(<MemoryRouter><ConfigurarVentaCodigo
      catalogo={{ productos: [producto], combos: [combo] }} inicial={{ seleccion: [producto, combo] }}
      codigos={{ inicio: { html: 'Inicio propio' }, producto: { html: 'FICHA GENERAL PRODUCTO' } }}
      cargarOfertas={vi.fn().mockResolvedValue([])} onConfirmar={confirmar} onVolver={vi.fn()}
    /></MemoryRouter>);
    fireEvent.click(screen.getByRole('radio', { name: 'Celular' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir combo' }));
    const panel = screen.getByRole('region', { name: 'Bloques de la vista de combo' });
    fireEvent.change(within(panel).getByLabelText('Título del combo'), { target: { value: 'Combo editado por bloques' } });
    expect(screen.getByRole('heading', { level: 1, name: 'Combo editado por bloques' })).toBeInTheDocument();
    const moverDescripcion = within(panel).getByRole('button', { name: 'Arrastrar Descripción dentro del encabezado' });
    fireEvent.keyDown(moverDescripcion, { altKey: true, key: 'ArrowUp' });
    fireEvent.keyDown(moverDescripcion, { altKey: true, key: 'ArrowUp' });
    expect(container.querySelector('.cmb-hero-copy').firstElementChild.dataset.comboOrden).toBe('descripcion');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar Descripción', exact: true }));
    fireEvent.click(within(panel).getByRole('checkbox', { name: 'Mostrar Descripción' }));
    expect(container.querySelector('.cmb-lead')).toBeNull();
    fireEvent.click(within(panel).getByRole('checkbox', { name: 'Mostrar ¿Qué incluye?' }));
    expect(container.querySelector('[data-combo-preview-bloque="incluye"]')).toBeNull();
    fireEvent.click(within(panel).getByRole('checkbox', { name: 'Mostrar ¿Qué incluye?' }));
    expect(container.querySelector('[data-combo-preview-bloque="incluye"]')).toBeTruthy();
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(within(panel).getByRole('button', { name: 'Arrastrar ¿Qué incluye? para ordenar' }), { dataTransfer });
    fireEvent.dragOver(panel.querySelector('[data-combo-editor-bloque="hero"]'), { dataTransfer });
    fireEvent.drop(panel.querySelector('[data-combo-editor-bloque="hero"]'), { dataTransfer });
    const ordenPreview = () => [...container.querySelectorAll('[data-combo-preview-bloque]')].map(el => el.dataset.comboPreviewBloque);
    expect(ordenPreview().indexOf('incluye')).toBeLessThan(ordenPreview().indexOf('hero'));
    fireEvent.keyDown(within(panel).getByRole('button', { name: 'Arrastrar ¿Qué incluye? para ordenar' }), { altKey: true, key: 'ArrowDown' });
    expect(ordenPreview().indexOf('incluye')).toBeGreaterThan(ordenPreview().indexOf('hero'));
    fireEvent.mouseEnter(container.querySelector('[data-combo-preview-bloque="incluye"]'));
    expect(panel.querySelector('[data-combo-editor-bloque="incluye"]')).toHaveClass('border-primary');
    fireEvent.click(screen.getByRole('button', { name: 'Editar bloque ¿Qué incluye?' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar Textos de la sección' }));
    expect(within(panel).getByLabelText('Título de la sección')).toBeInTheDocument();
    expect(container.querySelector('[data-combo-preview-bloque="faq"] h2')).toHaveTextContent('Preguntas frecuentes');
    fireEvent.click(within(panel).getByRole('button', { name: /· Preguntas frecuentes$/ }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Agregar pregunta' }));
    fireEvent.change(within(panel).getByLabelText('Pregunta 1'), { target: { value: '¿Qué recibo?' } });
    fireEvent.change(within(panel).getByLabelText('Respuesta 1'), { target: { value: 'Todo el combo.' } });
    expect(container.querySelector('.cmb-faq-list')).toHaveTextContent('¿Qué recibo?');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(confirmar).toHaveBeenCalled());
    const guardado = confirmar.mock.calls[0][0].venta.presentacion_productos;
    expect(guardado['combo:99'].ficha_combo).toMatchObject({
      hero: { titulo: 'Combo editado por bloques', partes: { descripcion: false } },
      faq: { items: [{ pregunta: '¿Qué recibo?', respuesta: 'Todo el combo.' }] },
      _orden: expect.any(Array),
      _orden_hero: expect.arrayContaining(['descripcion', 'titulo']),
    });
    expect(guardado['producto:7']?.ficha_combo).toBeUndefined();
  });

  it('la publicación conserva orden, visibilidad, textos y preguntas guardados por combo', () => {
    const propia = { hero: { titulo: 'Nombre guardado', partes: { descripcion: false } }, incluye: { activo: false },
      faq: { items: [{ pregunta: 'Pregunta guardada', respuesta: 'Respuesta guardada' }] },
      _orden: ['faq', 'hero'], _orden_hero: ['compra', 'precio'], _visibilidad: { pie: false, compra_movil: false } };
    const data = { titulo: 'Mi tienda', tienda: { nombre: 'Mi tienda' }, tema: { fondo: '#fff', texto: '#111827', primario: '#155E63' }, producto: combo, catalogo_items: [combo],
      content: { venta: { presentacion_productos: { 'combo:99': { v: 2, ficha_combo: propia } } } } };
    const { container } = render(<MemoryRouter><LandingCodigoPublica codigo={{ html: 'Inicio' }} data={data} slug="mi-tienda" productId="combo-99" /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Nombre guardado' })).toBeInTheDocument();
    expect(container.querySelector('.cmb-root').style.getPropertyValue('--cmb-fg')).toBe('#111827');
    expect(container.querySelector('.cmb-lead')).toBeNull();
    expect(container.querySelector('[data-combo-bloque="incluye"]')).toBeNull();
    expect(container.querySelector('[data-combo-bloque="pie"]')).toBeNull();
    expect(container.querySelector('[data-combo-bloque="compra_movil"]')).toBeNull();
    const secciones = [...container.querySelector('.cmb-root').children].map(el => el.dataset.comboBloque);
    expect(secciones.indexOf('faq')).toBeLessThan(secciones.indexOf('hero'));
    const partes = [...container.querySelector('.cmb-offer-panel').children].map(el => el.dataset.comboOrden);
    expect(partes.indexOf('compra')).toBeLessThan(partes.indexOf('precio'));
    fireEvent.click(screen.getByRole('button', { name: 'Pregunta guardada' }));
    expect(screen.getByText('Respuesta guardada')).toBeInTheDocument();
    expect(container.querySelector('.cmb-editor-label')).toBeNull();
  });
  it('abre la ficha de combo en el editor y conserva la ficha general para productos individuales', async () => {
    const { container } = render(<MemoryRouter><ConfigurarVentaCodigo
      catalogo={{ productos: [producto], combos: [combo] }} inicial={{ seleccion: [producto, combo] }}
      codigos={{ inicio: { html: 'Inicio propio' }, producto: { html: 'FICHA GENERAL PRODUCTO' } }}
      cargarOfertas={vi.fn().mockResolvedValue([])} onConfirmar={vi.fn()} onVolver={vi.fn()}
    /></MemoryRouter>);
    fireEvent.click(screen.getByRole('radio', { name: 'Celular' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir combo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'prueba123' })).toBeInTheDocument();
    expect(container.querySelector('.cmb-root')).toBeTruthy();
    expect(container.querySelector('.cmb-lead')).toHaveTextContent('La propuesta propia del combo');
    expect(screen.queryByTestId('codigo-preview')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Vista combo' })).toBeInTheDocument();
    fireEvent.click(container.querySelector('.cmb-breadcrumbs'));
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir producto' }));
    expect(screen.getByTestId('codigo-preview')).toHaveTextContent('FICHA GENERAL PRODUCTO');
  });

  it('abre la ficha de combo publicada y agrega el combo correcto al carrito', async () => {
    const data = { titulo: 'Mi tienda', tienda: { nombre: 'Mi tienda' }, producto: combo, catalogo_items: [combo],
      content: { vistas: { producto: { html: 'FICHA GENERAL PRODUCTO' } } } };
    const { container } = render(<MemoryRouter><LandingCodigoPublica codigo={{ html: 'Inicio propio' }} data={data} slug="mi-tienda" productId="combo-99" /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'prueba123' })).toBeInTheDocument();
    expect(container.querySelector('.cmb-root')).toBeTruthy();
    expect(screen.queryByTestId('codigo-preview')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /Comprar ahora/ })[0]);
    await waitFor(() => expect(cart.agregarAlCarrito).toHaveBeenCalledWith(expect.objectContaining({
      item: expect.objectContaining({ tipo: 'combo', content_id: 'combo-99' }), precio: 179000, cantidad: 1,
    })));
    expect(cart.setCarritoAbierto).toHaveBeenCalledWith(true);
  });
});
