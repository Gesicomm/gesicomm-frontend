import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { NuevoPedidoModal } from './NuevoPedidoModal';
import { productService } from '../../services/productService';
import { getCouriers, cotizarEntregaRaha } from '../../services/courierApi';
import { depositoService } from '../../services/deposito.service';
import { canalVentaService } from '../../services/canalVentaService';
import { inventarioService } from '../../services/inventario.service';

vi.mock('../../services/productService', () => ({
  productService: { buscar: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('../../services/ofertaService', () => ({
  ofertaService: { listarPorProducto: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../services/courierApi', () => ({
  getCouriers: vi.fn().mockResolvedValue([]),
  cotizarEntregaRaha: vi.fn().mockResolvedValue({ cubierto: false, costo: null }),
  getMetodosPago: vi.fn().mockResolvedValue([
    { id: 1, nombre: 'Efectivo contra entrega', comision_porcentaje: 0, es_anticipado: false, activo: true },
    { id: 3, nombre: 'POS / Tarjeta', comision_porcentaje: 2.2, es_anticipado: true, activo: true },
  ]),
  getCourierGeografia: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../services/deposito.service', () => ({
  depositoService: {
    listarDepositos: vi.fn().mockResolvedValue({ data: [] }),
    listarCouriersDeposito: vi.fn().mockResolvedValue({ couriers: [] }),
  },
}));
vi.mock('../../services/inventario.service', () => ({
  inventarioService: {
    diagnosticarStockPedido: vi.fn().mockResolvedValue({ depositos: [], origen: null, alternativas: [], faltantes: [] }),
  },
}));
vi.mock('../../services/canalVentaService', () => ({
  canalVentaService: { listar: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../services/api', () => ({ getMediaUrl: (x) => x }));
vi.mock('../landing/ProductPicker', () => ({ default: ({ onToggle }) => <button type="button" onClick={() => onToggle({ id: 202, tipo: 'producto' })}>Elegir producto de prueba</button> }));

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

  beforeEach(() => { vi.clearAllMocks(); cotizarEntregaRaha.mockResolvedValue({ cubierto: false, costo: null }); });
  afterEach(() => cleanup());

  it('reduce cantidades de un pedido web pendiente y guarda sin confirmar ni exigir datos de entrega', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir({ ...pedidoEntregado, estado: 'Pendiente', origen: 'WEB', costo_envio: 15000, direccion: '', items: [{ id: 1, producto_id: 201, nombre_producto: 'Hidrolavadora', cantidad: 2, precio_unitario: 615858 }] }, onSubmit);
    fireEvent.click(screen.getByRole('button', { name: 'Restar Hidrolavadora' }));
    expect(screen.getByRole('spinbutton', { name: 'Cantidad de Hidrolavadora' })).toHaveValue(1);
    expect(screen.getByText('Comprado: 1 unidad')).toBeInTheDocument();
    expect(document.querySelector('.np-summary-lines').textContent).toContain('615.858');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 385, costo_envio: 15000, items: [expect.objectContaining({ cantidad: 1, subtotal: 615858 })] }), true));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('estado');
  });

  it('quita un producto y conserva el resto al guardar el pedido pendiente', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir({ ...pedidoEntregado, estado: 'Pendiente', origen: 'WEB', items: [
      ...pedidoEntregado.items,
      { id: 2, producto_id: 202, nombre_producto: 'Hidrolavadora', cantidad: 2, precio_unitario: 615858 },
    ] }, onSubmit);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Hidrolavadora' }));
    expect(document.querySelectorAll('.np-order-item-card')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ items: [expect.objectContaining({ producto_id: 201 })] }), true));
  });

  it('permite cancelar el pedido completo, incluso después de quitar el último producto', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await abrir({ ...pedidoEntregado, estado: 'Pendiente', origen: 'WEB' }, onSubmit);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Cafeteira' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText('Agregá al menos un producto o cancelá el pedido completo.').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ id: 385, estado: 'Cancelado' }, true));
    confirm.mockRestore();
  });

  it.each([{ estado: 'Confirmado' }, { estado: 'Pendiente', stock_descontado: true }, { estado: 'Pendiente', raha_logistica: { gestionado: true } }])('no habilita edición de productos comprometidos: %j', async restricciones => {
    await abrir({ ...pedidoEntregado, origen: 'WEB', ...restricciones }, vi.fn());
    expect(screen.queryByRole('button', { name: 'Quitar Cafeteira' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar productos' })).not.toBeInTheDocument();
  });

  it('distingue una presentación 2x1 de dos unidades individuales y cuenta las unidades físicas', async () => {
    await abrir({ ...pedidoEntregado, items: [
      { id: 1, producto_id: 201, nombre_producto: 'Adaptador — Oferta 2x1', oferta_id: 9, oferta_nombre: 'Oferta 2x1', cantidad: 1, precio_unitario: 200000, Ofertum: { componentes: [{ producto_id: 201, cantidad: 2 }] } },
      { id: 2, producto_id: 202, nombre_producto: 'Hidrolavadora', cantidad: 2, precio_unitario: 615858 },
    ] }, vi.fn());
    expect(screen.getByText('Comprado: 1 presentación')).toBeInTheDocument();
    expect(screen.getByText('Comprado: 2 unidades')).toBeInTheDocument();
    expect(screen.getAllByText('Preparar: 2 unidades')).toHaveLength(4);
    expect(screen.getByText('Oferta 2x1', { selector: '.np-item-presentation' })).toBeInTheDocument();
    expect(document.querySelector('.np-products-metrics').textContent).toContain('4 unidades');
    expect(document.querySelectorAll('.np-order-item-card')).toHaveLength(2);
  });

  it('el alta manual no ofrece WhatsApp como canal seleccionable', async () => {
    canalVentaService.listar.mockResolvedValueOnce([{ id: 1, slug: 'web', nombre: 'Web' }, { id: 3, slug: 'whatsapp', nombre: 'WhatsApp' }]);
    await abrir(null, vi.fn());
    await waitFor(() => expect(screen.getByRole('option', { name: 'Web' })).toBeInTheDocument());
    expect(screen.queryByRole('option', { name: 'WhatsApp' })).not.toBeInTheDocument();
  });

  it('permite elegir productos al confirmar un lead que llegó sin productos', async () => {
    productService.buscar.mockResolvedValueOnce({ productos: [{ id: 202, nombre: 'Producto elegido', precio_base: 100000 }] });
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir({ ...pedidoEntregado, id: 90, estado: 'Pendiente', origen: 'WHATSAPP', es_lead: true, monto: 0, costo_envio: 0, items: [] }, onSubmit);
    await waitFor(() => expect(screen.getByText(/WhatsApp · Cargado/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    expect(screen.getByRole('tab', { name: /Productos/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Elegir producto de prueba' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear y confirmar pedido' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 90, estado: 'Confirmado', monto: 100000, items: [expect.objectContaining({ producto_id: 202, cantidad: 1 })] }), true));
  });

  it('precarga el confirmador del lead y conserva cliente, teléfono y productos al confirmar contra entrega', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir({ ...pedidoEntregado, estado: 'EnSeguimiento', origen: 'WHATSAPP', es_lead: true }, onSubmit);
    expect(screen.getByRole('heading', { name: /Confirmar compra · LEAD-385/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Juan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0992820631')).toBeInTheDocument();
    expect(screen.getAllByText('Cafeteira').length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
    await guardar();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 385, nombre_cliente: 'Juan', telefono: '0992820631', ciudad: 'Luque', direccion: pedidoEntregado.direccion, estado: 'Confirmado', pago_anticipado: false }), true));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('items');
  });

  it('permite confirmar un lead con pago anticipado y su método elegido', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir({ ...pedidoEntregado, estado: 'EnSeguimiento', origen: 'WHATSAPP', es_lead: true }, onSubmit);
    fireEvent.click(screen.getByRole('checkbox', { name: /Pago anticipado/i }));
    await waitFor(() => expect(screen.getByRole('option', { name: /POS \/ Tarjeta/ })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Método de pago anticipado/), { target: { value: '3' } });
    await guardar();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 385, estado: 'Confirmado', pago_anticipado: true, metodo_pago_id: 3 }), true));
  });

  it('exige ubicación y dirección antes de confirmar un lead', async () => {
    const onSubmit = vi.fn();
    await abrir({ ...pedidoEntregado, estado: 'EnSeguimiento', origen: 'WHATSAPP', es_lead: true, ciudad: '', direccion: '' }, onSubmit);
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    expect(screen.getAllByText(/ciudad de destino/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/dirección de entrega/).length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

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

  it('también confirma un pedido que está en seguimiento: sigue estando por confirmar', async () => {
    // Al marcar el primer mensaje como enviado el pedido pasa de Pendiente a
    // En seguimiento, y desde ahí el modal solo guardaba: no había forma de
    // confirmarlo.
    const onSubmit = vi.fn().mockResolvedValue({});
    await abrir({ ...pedidoEntregado, estado: 'EnSeguimiento' }, onSubmit);
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

  it('si el courier ya estaba asignado conserva el flete cuando no hay tarifa para el nuevo tipo de pago', async () => {
    // Luque solo tiene tarifa contra entrega para este courier. Al pasar a
    // anticipado no hay coincidencia exacta, pero el flete real ya cargado no
    // debe pisarse a cero.
    getCouriers.mockResolvedValueOnce([
      {
        id: 76,
        nombre: 'JB Rider',
        vehiculo: 'Moto',
        tarifas: [
          { ciudad_zona: 'Luque', departamento: 'Central', tipo_pago: 'Al Recibir', rango_min: 1, rango_max: 3, costo: 30000, activo: true },
        ],
      },
    ]);
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<NuevoPedidoModal open envio={{ ...pedidoEntregado, courier_id: 76, costo_envio: 30000 }} onClose={() => {}} onSubmit={onSubmit} deliveryZonas={[]} />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('checkbox', { name: /Pago anticipado/i }));
    await waitFor(() => expect(screen.getByLabelText(/Costo del envío/i).value).toBe('30.000'));
  });

  it('al elegir un origen de despacho lista solo los couriers vinculados a ese depósito', async () => {
    getCouriers.mockResolvedValueOnce([
      { id: 1, nombre: 'Courier Central', vehiculo: 'Moto', tarifas: [] },
      { id: 2, nombre: 'Courier Luque', vehiculo: 'Auto', tarifas: [] },
    ]);
    depositoService.listarDepositos.mockResolvedValueOnce({
      data: [{ id: 10, nombre: 'Principal', ciudad: 'Luque' }],
    });
    depositoService.listarCouriersDeposito.mockResolvedValueOnce({
      couriers: [
        { id: 1, nombre: 'Courier Central', habilitado: false },
        { id: 2, nombre: 'Courier Luque', habilitado: true },
      ],
    });

    const onSubmit = vi.fn().mockResolvedValue({});
    const { container } = render(<NuevoPedidoModal open envio={null} onClose={() => {}} onSubmit={onSubmit} deliveryZonas={[]} />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    const origenSelect = Array.from(container.querySelectorAll('select'))
      .find(select => Array.from(select.options).some(option => option.textContent === 'Automático según stock'));
    fireEvent.change(origenSelect, { target: { value: '10' } });

    await waitFor(() => expect(depositoService.listarCouriersDeposito).toHaveBeenCalledWith('10'));
    await waitFor(() => {
      const courierSelect = Array.from(container.querySelectorAll('select'))
        .find(select => Array.from(select.options).some(option => option.textContent === 'Courier Luque (Auto)'));
      const opciones = Array.from(courierSelect.options).map(o => o.textContent);
      expect(opciones).toContain('Courier Luque (Auto)');
      expect(opciones).not.toContain('Courier Central (Moto)');
    });
  });

  it('autocompleta el envío RAHA por destino aunque no se haya elegido método de pago', async () => {
    cotizarEntregaRaha.mockResolvedValue({ cubierto: true, costo: 27000 });
    await abrir({ ...pedidoEntregado, estado: 'Pendiente', costo_envio: 0, items: [{ ...pedidoEntregado.items[0], es_raha: true }] }, vi.fn());
    await waitFor(() => expect(cotizarEntregaRaha).toHaveBeenCalledWith({ ciudad: 'Luque', departamento: 'Central', cantidad: 1, pago_anticipado: false }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    await waitFor(() => expect(screen.getByLabelText('Costo del envío (Gs)').value).toContain('27'));
    expect(screen.getByText('Tarifa RAHA aplicada para este destino.')).toBeInTheDocument();
    cotizarEntregaRaha.mockResolvedValue({ cubierto: true, costo: 23000 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pago anticipado', exact: true }));
    await waitFor(() => expect(cotizarEntregaRaha).toHaveBeenLastCalledWith(expect.objectContaining({ pago_anticipado: true })));
    await waitFor(() => expect(screen.getByLabelText('Costo del envío (Gs)').value).toContain('23'));
  });

  it('una cotización tardía no pisa un costo que el usuario escribió a mano', async () => {
    let resolver;
    cotizarEntregaRaha.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
    await abrir({ ...pedidoEntregado, estado: 'Pendiente', costo_envio: 0, items: [{ ...pedidoEntregado.items[0], es_raha: true }] }, vi.fn());
    await waitFor(() => expect(cotizarEntregaRaha).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    const costo = screen.getByLabelText('Costo del envío (Gs)');
    fireEvent.change(costo, { target: { value: '18000' } });
    resolver({ cubierto: true, costo: 27000 });
    await waitFor(() => expect(screen.queryByText('Consultando tarifa RAHA…')).toBeNull());
    expect(costo.value).toContain('18');
    expect(costo.value).not.toContain('27');
  });

  it('Cliente → Productos → Entrega resuelve RAHA y vuelve al courier propio al quitar ese producto', async () => {
    productService.buscar.mockResolvedValueOnce({ productos: [{ id: 202, nombre: 'Producto RAHA', precio_base: 100000, es_raha: true }] });
    getCouriers.mockResolvedValueOnce([{ id: 76, nombre: 'Courier propio', vehiculo: 'Moto', tarifas: [{ ciudad: 'Luque', departamento: 'Central', costo: 12000, tipo_pago: 'Ambos' }] }]);
    cotizarEntregaRaha.mockResolvedValue({ cubierto: true, costo: 27000 });
    const { container } = render(<NuevoPedidoModal open envio={{ ...pedidoEntregado, estado: 'Pendiente', courier_id: null }} onClose={() => {}} onSubmit={vi.fn()} />);
    await waitFor(() => expect(productService.buscar).toHaveBeenCalled());
    expect(screen.getAllByRole('tab').map(el => el.textContent)).toEqual(['Paso 1Cliente', 'Paso 2Productos', 'Paso 3Entrega', 'Paso 4Revisión']);
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    expect(screen.getByRole('tab', { name: /Productos/ })).toHaveAttribute('aria-selected', 'true');
    expect(container.querySelector('.np-step-panel.is-active').textContent).toContain('Productos');
    fireEvent.click(screen.getByRole('button', { name: 'Elegir producto de prueba' }));
    await waitFor(() => expect(cotizarEntregaRaha).toHaveBeenCalledWith(expect.objectContaining({ cantidad: 2 })));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    expect(screen.getByRole('tab', { name: /Entrega/ })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.getByLabelText('Costo del envío (Gs)').value).toBe('27.000'));
    expect([...container.querySelectorAll('select')].filter(el => el.value === '__RAHA__')).toHaveLength(2);
    fireEvent.click(screen.getByRole('tab', { name: /Productos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Producto RAHA' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    await waitFor(() => expect(screen.getByLabelText('Costo del envío (Gs)').value).toBe('12.000'));
    expect([...container.querySelectorAll('select')].filter(el => el.value === '__RAHA__')).toHaveLength(0);
    fireEvent.click(screen.getByRole('tab', { name: /Revisión/ }));
    const entrega = [...container.querySelectorAll('.np-review-card')].find(el => el.querySelector('strong')?.textContent === 'Entrega');
    fireEvent.click(entrega.querySelector('button'));
    expect(screen.getByRole('tab', { name: /Entrega/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: /Revisión/ }));
    const productos = [...container.querySelectorAll('.np-review-card')].find(el => el.querySelector('strong')?.textContent === 'Productos');
    fireEvent.click(productos.querySelector('button'));
    expect(screen.getByRole('tab', { name: /Productos/ })).toHaveAttribute('aria-selected', 'true');

  });

  it('no permite saltar desde Cliente a Entrega sin seleccionar productos', async () => {
    await abrir({ ...pedidoEntregado, estado: 'Pendiente', items: [] }, vi.fn());
    fireEvent.click(screen.getByRole('tab', { name: /Entrega/ }));
    expect(screen.getByRole('tab', { name: /Productos/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText(/Debes agregar al menos un producto/).length).toBeGreaterThan(0);
  });

  it('muestra RAHA como origen y courier cuando el pedido tiene producto RAHA', async () => {
    productService.buscar.mockResolvedValueOnce({
      productos: [{ id: 201, nombre: 'Cafeteira', precio_base: 166138, puede_editar: false }],
    });
    getCouriers.mockResolvedValueOnce([
      { id: 76, nombre: 'asd', vehiculo: 'Moto', tarifas: [] },
    ]);

    const onSubmit = vi.fn().mockResolvedValue({});
    const { container } = render(<NuevoPedidoModal open envio={{ ...pedidoEntregado, courier_id: 76 }} onClose={() => {}} onSubmit={onSubmit} deliveryZonas={[]} />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    const origenSelect = Array.from(container.querySelectorAll('select'))
      .find(select => Array.from(select.options).some(option => option.textContent === 'RAHA'));
    expect(origenSelect).toBeDisabled();
    expect(origenSelect).toHaveValue('__RAHA__');
    expect(screen.getByText(/Este producto sale desde RAHA/i)).toBeInTheDocument();

    const courierSelect = Array.from(container.querySelectorAll('select'))
      .filter(select => Array.from(select.options).some(option => option.textContent === 'RAHA'))
      .at(-1);
    expect(courierSelect).toBeDisabled();
    expect(courierSelect).toHaveValue('__RAHA__');
    expect(screen.getByText(/Asignado a RAHA/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Revisión/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Guardar cambios|Confirmar pedido/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ courier_id: null, origen_preferido_id: null });
  });

  it('avisa al elegir un depósito sin stock y sugiere uno que sí alcanza', async () => {
    depositoService.listarDepositos.mockResolvedValueOnce({
      data: [
        { id: 10, nombre: 'Depósito Test E2E', ciudad: 'Luque' },
        { id: 20, nombre: 'Principal', ciudad: 'Luque' },
      ],
    });
    depositoService.listarCouriersDeposito.mockResolvedValueOnce({ couriers: [] });
    inventarioService.diagnosticarStockPedido.mockResolvedValueOnce({
      origen: {
        id: 10,
        nombre: 'Depósito Test E2E',
        ok: false,
        faltantes: [{ nombre: 'Cafeteira', necesario: 1, disponible: 0, faltante: 1 }],
      },
      alternativas: [{ id: 20, nombre: 'Principal', ciudad: 'Luque', ok: true, faltantes: [] }],
      faltantes: [{ nombre: 'Cafeteira', necesario: 1, disponible: 0, faltante: 1 }],
    });

    const onSubmit = vi.fn().mockResolvedValue({});
    const { container } = render(<NuevoPedidoModal open envio={pedidoEntregado} onClose={() => {}} onSubmit={onSubmit} deliveryZonas={[]} />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    const origenSelect = Array.from(container.querySelectorAll('select'))
      .find(select => Array.from(select.options).some(option => option.textContent === 'Automático según stock'));
    fireEvent.change(origenSelect, { target: { value: '10' } });

    await waitFor(() => expect(screen.getByText(/El depósito seleccionado no tiene stock suficiente/i)).toBeInTheDocument());
    expect(screen.getByText(/Cafeteira necesita 1 unidad y acá hay 0/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Principal · Luque/i })).toBeInTheDocument();
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
