import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { NuevoPedidoModal } from './NuevoPedidoModal';

vi.mock('../../services/productService', () => ({
  productService: { buscar: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('../../services/ofertaService', () => ({
  ofertaService: { listarPorProducto: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../services/courierApi', () => ({
  getCouriers: vi.fn().mockResolvedValue([]),
  getMetodosPago: vi.fn().mockResolvedValue([
    { id: 1, nombre: 'Efectivo contra entrega', comision_porcentaje: 0, es_anticipado: false, activo: true },
    { id: 3, nombre: 'POS / Tarjeta', comision_porcentaje: 2.2, es_anticipado: true, activo: true },
  ]),
}));
vi.mock('../../services/canalVentaService', () => ({
  canalVentaService: { listar: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../services/api', () => ({ getMediaUrl: (x) => x }));
vi.mock('../landing/ProductPicker', () => ({ default: () => null }));

/**
 * El modal decide dos cosas que mueven plata real y que se rompieron en
 * producción: qué estado manda al guardar, y con qué monto.
 */
describe('NuevoPedidoModal · edición de un pedido existente', () => {
  // Pedido #385 real: entregado, monto SIN el flete adentro.
  const pedidoEntregado = {
    id: 385,
    estado: 'Entregado',
    monto: 166138,
    costo_envio: 50000,
    delivery_a_cargo: null, // pedido anterior a la columna ⇒ lo paga el cliente
    cupon_descuento: 0,
    nombre_cliente: 'Juan',
    telefono: '0992820631',
    ciudad: 'Luque',
    departamento: 'Central',
    direccion: 'claudio arrua esquina general artigas',
    items: [{ id: 1, producto_id: 201, nombre_producto: 'Cafeteira', cantidad: 1, precio_unitario: 166138, subtotal: 166138 }],
  };

  const abrir = async (envio, onSubmit) => {
    render(<NuevoPedidoModal open envio={envio} onClose={() => {}} onSubmit={onSubmit} />);
    // El modal carga catálogos al abrir; se espera a que asiente.
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument());
  };

  /** Salta hasta el último paso y dispara el submit. */
  const guardar = async () => {
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    }
    fireEvent.click(await screen.findByRole('button', { name: /Guardar cambios|Confirmar pedido/i }));
  };

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('no manda "Confirmado" sobre un pedido que ya avanzó', async () => {
    // El backend solo acepta Pendiente → Confirmado. Mandarlo siempre hacía
    // que editar un entregado muriera en 'No se puede pasar de "Entregado"
    // a "Confirmado"' y no dejara guardar nada.
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir(pedidoEntregado, onSubmit);
    await guardar();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('estado');
  });

  it('sí manda "Confirmado" cuando el pedido está Pendiente', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir({ ...pedidoEntregado, estado: 'Pendiente' }, onSubmit);
    await guardar();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].estado).toBe('Confirmado');
  });

  it('conserva el monto si no se toca nada del precio', async () => {
    // Antes recalculaba subtotales + flete y el #385 saltaba de Gs 166.138 a
    // Gs 216.138 solo por abrirlo y guardar.
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir(pedidoEntregado, onSubmit);
    await guardar();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].monto).toBe(166138);
  });

  it('recalcula el monto cuando se cambia quién paga el delivery', async () => {
    // Se arranca de un pedido que absorbía el flete y cuyo monto son solo los
    // productos. Al destildar, el flete pasa a cobrársele al cliente y el
    // monto TIENE que subir. Elegido así a propósito: si el pedido de partida
    // ya se lo cobrara al cliente, los dos caminos darían el mismo número y
    // el test pasaría aunque la lógica estuviera rota.
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir({ ...pedidoEntregado, delivery_a_cargo: 'negocio' }, onSubmit);

    fireEvent.click(screen.getByRole('checkbox', { name: /Incluye delivery/i }));
    await guardar();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.monto).toBe(166138 + 50000);
    expect(payload.delivery_a_cargo).toBe('cliente');
  });

  it('recalcula el monto cuando se cambia el costo del envío', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir(pedidoEntregado, onSubmit);

    const inputEnvio = screen.getByLabelText(/Costo del envío/i);
    fireEvent.change(inputEnvio, { target: { value: '80000' } });
    await guardar();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.costo_envio).toBe(80000);
    expect(payload.monto).toBe(166138 + 80000);
  });



  it('"Pago anticipado" busca la tarifa correspondiente, distinta de contra entrega', async () => {
    const zonas = [
      { ciudad: 'Luque', departamento: 'Central', tipo_pago: 'Al Recibir', costo: 20000, activo: true },
      { ciudad: 'Luque', departamento: 'Central', tipo_pago: 'Anticipado', costo: 35000, activo: true },
    ];
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<NuevoPedidoModal open envio={pedidoEntregado} onClose={() => {}} onSubmit={onSubmit} deliveryZonas={zonas} />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('checkbox', { name: /Pago anticipado/i }));
    await waitFor(() => expect(screen.getByLabelText(/Costo del envío/i).value).toBe('35.000'));

    await guardar();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].costo_envio).toBe(35000);
  });

  it('sin tarifa para ese tipo de pago deja el flete en cero para cargarlo a mano', async () => {
    // Luque solo tiene tarifa contra entrega. Al pasar a anticipado no hay
    // coincidencia exacta: antes degradaba a la tarifa más barata de la
    // ciudad y cobraba un precio que nadie configuró para ese caso.
    const zonas = [
      { ciudad: 'Luque', departamento: 'Central', tipo_pago: 'Al Recibir', rango_min: 1, rango_max: 3, costo: 20000, activo: true },
    ];
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<NuevoPedidoModal open envio={pedidoEntregado} onClose={() => {}} onSubmit={onSubmit} deliveryZonas={zonas} />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('checkbox', { name: /Pago anticipado/i }));
    await waitFor(() => expect(screen.getByLabelText(/Costo del envío/i).value).toBe('0'));
  });

  it('manda pago_anticipado en el payload para que quede guardado', async () => {
    // Se persiste para reportería (envios.pago_anticipado, migración
    // 20260909170000) — antes de esto era puramente local, solo para
    // elegir tarifa, y nunca llegaba al backend.
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir(pedidoEntregado, onSubmit);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox', { name: /Pago anticipado/i }));
    await guardar();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].pago_anticipado).toBe(true);
  });
});
