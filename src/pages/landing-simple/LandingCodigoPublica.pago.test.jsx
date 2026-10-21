import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LandingCodigoPublica from './LandingCodigoPublica';

const vistas = vi.hoisted(() => ({ preview: null, carrito: null }));
vi.mock('./CodigoPreview', () => ({ default: props => { vistas.preview = props; return null; } }));
vi.mock('../landing/CartDrawer', () => ({ default: props => { vistas.carrito = props; return null; } }));
vi.mock('./FichaComboLienzo', () => ({ default: () => null }));
vi.mock('../../lib/metaPixel', () => ({
  generarEventId: () => 'evento', leerCookiesFacebook: () => ({}), esperarCookiesFacebook: async () => ({}),
  trackearEvento: vi.fn(), trackearEventoPersonalizado: vi.fn(),
}));
vi.mock('../../lib/googleAnalytics', () => ({ trackearEventoGA: vi.fn() }));
vi.mock('../../lib/tiktokPixel', () => ({ trackearEventoTikTok: vi.fn() }));
vi.mock('../../services/landingPublicaService', () => ({
  registrarEventoLanding: vi.fn().mockResolvedValue({}), obtenerGeografiaPublica: vi.fn().mockResolvedValue([]),
  obtenerCatalogoLandingPublica: vi.fn(), obtenerProductosLandingPublica: vi.fn().mockResolvedValue([]),
  recalcularCarritoLanding: vi.fn(), crearCheckoutLanding: vi.fn(), validarCuponLanding: vi.fn(),
}));

const producto = { tipo: 'producto', referencia_id: 7, content_id: 'producto-7', nombre: 'Silla', precio: 100000, stock: 10, variantes: [], ofertas: [] };
const data = { catalogo_items: [producto], producto, tienda: { nombre: 'Tienda' }, content: {}, checkout: { pasarelas: [{ provider: 'pagopar' }] } };
const codigo = { html: '<main></main>', css: '', js: '' };
function Tienda() {
  const { pathname, search } = useLocation();
  const checkout = pathname.endsWith('/checkout');
  return <><span data-testid="ruta">{pathname}{search}</span><LandingCodigoPublica
    key={checkout ? 'checkout' : 'producto'}
    codigo={codigo} titulo="Tienda" data={data} slug="tienda"
    productId={checkout ? null : 'producto-7'} vistaCodigo={checkout ? 'checkout' : null}
  /></>;
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(cleanup);

it('Ver todos los combos navega a la URL pública del catálogo y conserva el filtro en los datos del iframe', () => {
  render(<MemoryRouter initialEntries={['/l/tienda']}><Tienda /></MemoryRouter>);
  act(() => vistas.preview.onNavegar({ destino: 'pagina', pagina: 'catalogo', filtro: { tipo: 'combo' } }));
  expect(screen.getByTestId('ruta').textContent).toBe('/catalogo?tipo=combo');
  expect(vistas.preview.datos.filtro.tipo).toBe('combo');
});

it('el botón anticipado llega directo al checkout, conserva el carrito al cambiar de página y alterna el 10%', async () => {
  render(<MemoryRouter initialEntries={['/l/tienda/producto-7']}><Tienda /></MemoryRouter>);
  act(() => vistas.preview.onCheckout({ producto: 'producto-7', cantidad: 1, payment_method: 'pagopar', descuento_boton_pct: 10, checkout_directo: true }));
  await waitFor(() => expect(screen.getByTestId('ruta').textContent).toBe('/l/tienda/checkout'));
  expect(vistas.carrito.abierto).toBe(false);
  expect(vistas.preview.datos.checkout_metodo_pago).toBe('pagopar');
  expect(vistas.preview.datos.carrito.total).toBe(90000);
  act(() => vistas.preview.onMetodoPago('contra_entrega'));
  expect(vistas.preview.datos.checkout_metodo_pago).toBe('efectivo');
  expect(vistas.preview.datos.carrito.total).toBe(100000);
  act(() => vistas.preview.onMetodoPago('pagopar'));
  expect(vistas.preview.datos.carrito.total).toBe(90000);
});

it('recargar checkout conserva contra entrega sin recuperar el descuento', () => {
  const { unmount } = render(<MemoryRouter initialEntries={['/l/tienda/producto-7']}><Tienda /></MemoryRouter>);
  act(() => vistas.preview.onCheckout({ producto: 'producto-7', cantidad: 1, payment_method: 'pagopar', descuento_boton_pct: 10, checkout_directo: true }));
  act(() => vistas.preview.onMetodoPago('contra_entrega'));
  unmount();
  render(<MemoryRouter initialEntries={['/l/tienda/checkout']}><Tienda /></MemoryRouter>);
  expect(vistas.preview.datos.checkout_metodo_pago).toBe('efectivo');
  expect(vistas.preview.datos.carrito.total).toBe(100000);
});

it('sin PagoPar retira descuentos guardados y selecciona contra entrega', () => {
  const linea = { clave: 'producto-7', tipo: 'producto', contentId: 'producto-7', nombre: 'Silla', precio: 90000,
    precioSinDescuentoBoton: 100000, cantidad: 1, descuentoBotonPct: 10 };
  localStorage.setItem('gesicomm-carrito-tienda', JSON.stringify([[linea.clave, linea]]));
  sessionStorage.setItem('gesicomm-metodo-pago-tienda', 'pagopar');
  render(<MemoryRouter><LandingCodigoPublica codigo={codigo} data={{ ...data, checkout: { pasarelas: [] } }} slug="tienda" vistaCodigo="checkout" /></MemoryRouter>);
  expect(vistas.preview.datos.checkout_metodo_pago).toBe('efectivo');
  expect(vistas.preview.datos.carrito.total).toBe(100000);
});
