import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RahaPortal from './RahaPortal';
import NuevoEnvioRaha from './NuevoEnvioRaha';
import RahaEnviosPanel from './RahaEnviosPanel';
import RahaDestinosPanel from './RahaDestinosPanel';
import { rahaPortalApi } from '../../services/rahaPortalApi';
import { rahaOperacionesService as comercio } from '../../services/rahaOperacionesService';

vi.mock('../../services/rahaPortalApi', () => ({
  getRahaPortalToken: () => 'portal-token', setRahaPortalToken: vi.fn(),
  rahaPortalApi: { me: vi.fn(), listar: vi.fn(), detalle: vi.fn(), abastecimientos: vi.fn(), abastecimiento: vi.fn(),
    destinos: vi.fn(), guardarDestino: vi.fn(), envios: vi.fn(), envio: vi.fn(), resolverEnvio: vi.fn() },
}));
vi.mock('../../services/rahaOperacionesService', () => ({ rahaOperacionesService: {
  origenes: vi.fn(), destinos: vi.fn(), stock: vi.fn(), crearEnvio: vi.fn(), envios: vi.fn(), envio: vi.fn(), resolverEnvio: vi.fn(),
} }));

const destino = { id: 2, nombre: 'Recepción RAHA', ciudad: 'Asunción', direccion: 'Calle destino 123', activo: true };
const origen = { id: 6, nombre: 'Mi depósito', ciudad: 'Luque', direccion: 'Calle origen 456' };
const filaStock = { producto_id: 3, variante_id: null, disponible: 10, producto: { nombre: 'Termo', sku: 'TRM' } };
const solicitud = { id: 15, estado: 'solicitada', version: 3, origen_snapshot: origen, destino_snapshot: destino,
  tienda: { nombre: 'Tienda Test' }, items: [{ producto_id: 3, cantidad: 4, nombre: 'Termo', sku: 'TRM' }], historial: [] };

beforeEach(() => {
  vi.clearAllMocks();
  rahaPortalApi.me.mockResolvedValue({ usuario: { id: 5, nombre: 'Operador RAHA' } });
  rahaPortalApi.listar.mockResolvedValue({ solicitudes: [], total: 0 });
  rahaPortalApi.abastecimientos.mockResolvedValue({ registros: [], total: 0, totalPaginas: 1 });
  rahaPortalApi.destinos.mockResolvedValue([destino]);
  rahaPortalApi.envios.mockResolvedValue({ registros: [solicitud], total: 1, totalPaginas: 1 });
  rahaPortalApi.envio.mockResolvedValue(solicitud);
  rahaPortalApi.resolverEnvio.mockResolvedValue({ ...solicitud, estado: 'aceptada', version: 4 });
  comercio.origenes.mockResolvedValue([origen, { ...origen, id: 8, nombre: 'Segundo depósito' }]);
  comercio.destinos.mockResolvedValue([destino]);
  comercio.stock.mockResolvedValue({ registros: [filaStock], total: 1, totalPaginas: 1 });
  comercio.crearEnvio.mockResolvedValue({ id: 15 });
  comercio.envios.mockResolvedValue({ registros: [solicitud], total: 1, totalPaginas: 1 });
  comercio.envio.mockResolvedValue(solicitud);
  comercio.resolverEnvio.mockResolvedValue({ ...solicitud, estado: 'preparado', version: 4 });
});
afterEach(cleanup);

it('el portal abre la pestaña operativa sin consultar documentación ni ofrecer pagos', async () => {
  render(<MemoryRouter initialEntries={['/raha/solicitudes?tab=abastecimientos']}><RahaPortal /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Abastecimientos de los comercios' });
  expect(rahaPortalApi.listar).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Abastecimientos', exact: true })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Envíos a RAHA', exact: true }));
  await screen.findByRole('heading', { name: 'Envíos de mercadería a RAHA' });
  expect(screen.queryByText('Subir comprobante')).not.toBeInTheDocument();
});

async function prepararEnvio() {
  const onCreado = vi.fn();
  render(<NuevoEnvioRaha onCreado={onCreado} onCerrar={vi.fn()} />);
  await screen.findByRole('option', { name: /Mi depósito/ });
  fireEvent.change(screen.getByLabelText('Depósito de origen'), { target: { value: '6' } });
  fireEvent.change(screen.getByLabelText('Depósito RAHA de destino'), { target: { value: '2' } });
  fireEvent.click(await screen.findByRole('button', { name: /Termo/ }));
  return onCreado;
}

it('envía la selección del origen y conserva la clave idempotente al reintentar un fallo de red', async () => {
  comercio.crearEnvio.mockRejectedValueOnce(new Error('red'));
  const onCreado = await prepararEnvio();
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('Observaciones para RAHA'), { target: { value: 'Coordinar recepción' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud a RAHA' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Cantidad')).toHaveValue(4);
  fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud a RAHA' }));
  await waitFor(() => expect(onCreado).toHaveBeenCalledWith({ id: 15 }));
  const payload = comercio.crearEnvio.mock.calls[0][0];
  expect(payload).toMatchObject({ deposito_origen_id: 6, destino_raha_id: 2,
    items: [{ producto_id: 3, variante_id: null, cantidad: 4 }], observacion: 'Coordinar recepción' });
  expect(comercio.crearEnvio.mock.calls[1][0].solicitud_key).toBe(payload.solicitud_key);
});

it('cambiar de origen vacía la selección de productos del depósito anterior', async () => {
  await prepararEnvio();
  expect(screen.getByLabelText('Cantidad')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Depósito de origen'), { target: { value: '8' } });
  expect(screen.queryByLabelText('Cantidad')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Enviar solicitud a RAHA' })).toBeDisabled();
  await waitFor(() => expect(comercio.stock).toHaveBeenCalledWith(expect.objectContaining({ deposito_origen_id: 8 })));
});

it('sin destinos publicados explica el motivo y no permite enviar', async () => {
  comercio.destinos.mockResolvedValue([]);
  render(<NuevoEnvioRaha onCreado={vi.fn()} onCerrar={vi.fn()} />);
  await screen.findByText(/RAHA todavía no publicó depósitos/);
  expect(screen.getByRole('button', { name: 'Enviar solicitud a RAHA' })).toBeDisabled();
});

it('el operador revisa el contenido y confirma la aceptación usando la versión recibida', async () => {
  render(<RahaEnviosPanel portal />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ver solicitud de envío 15' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Aceptar para coordinar' }));
  fireEvent.change(screen.getByLabelText('Comentario de coordinación (opcional)'), { target: { value: 'Recepción el martes' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
  await waitFor(() => expect(rahaPortalApi.resolverEnvio).toHaveBeenCalledWith(15, { estado: 'aceptada', version: 3, comentario: 'Recepción el martes' }));
});

it('publica un destino solo tras guardar su dirección y contacto', async () => {
  rahaPortalApi.guardarDestino.mockResolvedValue(destino);
  render(<RahaDestinosPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Agregar depósito RAHA' }));
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Centro RAHA' } });
  fireEvent.change(screen.getByLabelText('Ciudad'), { target: { value: 'Luque' } });
  fireEvent.change(screen.getByLabelText('Dirección de recepción'), { target: { value: 'Calle 123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar depósito' }));
  await waitFor(() => expect(rahaPortalApi.guardarDestino).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Centro RAHA', ciudad: 'Luque', direccion: 'Calle 123', activo: true }), null));
});

it.each([['solicitada', 'Marcar como preparado', 'preparado'], ['preparado', 'Marcar como enviado', 'enviado']])(
  'el comercio actualiza desde %s usando versión y confirmación', async (estado, label, siguiente) => {
    comercio.envio.mockResolvedValue({ ...solicitud, estado });
    render(<RahaEnviosPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver solicitud de envío 15' }));
    fireEvent.click(await screen.findByRole('button', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
    await waitFor(() => expect(comercio.resolverEnvio).toHaveBeenCalledWith(15, { estado: siguiente, version: 3, comentario: '' }));
    expect(screen.queryByRole('button', { name: 'Marcar como recibido' })).not.toBeInTheDocument();
  },
);

it('RAHA ofrece recibido únicamente cuando la mercadería fue enviada', async () => {
  rahaPortalApi.envio.mockResolvedValue({ ...solicitud, estado: 'enviado' });
  render(<RahaEnviosPanel portal />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ver solicitud de envío 15' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Marcar como recibido' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
  await waitFor(() => expect(rahaPortalApi.resolverEnvio).toHaveBeenCalledWith(15, { estado: 'recibido', version: 3, comentario: '' }));
});

it('permite cantidades declaradas sin ubicación pero bloquea stock registrado agotado', async () => {
  comercio.stock.mockResolvedValue({ registros: [{ ...filaStock, stock_registrado: false, disponible: 0 },
    { ...filaStock, producto_id: 4, producto: { nombre: 'Agotado' }, stock_registrado: true, disponible: 0 }], total: 2, totalPaginas: 1 });
  await prepararEnvio();
  expect(screen.getByText('Sin stock registrado · cantidad declarada')).toBeInTheDocument();
  expect(screen.getByLabelText('Cantidad')).toHaveAttribute('max', '1000000');
  expect(screen.getByRole('button', { name: /Agotado/ })).toBeDisabled();
});

it('muestra la foto en catálogo y selección y reemplaza imágenes rotas', async () => {
  comercio.stock.mockResolvedValue({ registros: [{ ...filaStock, producto: { ...filaStock.producto, imagen_url: '/uploads/termo.jpg' } }], total: 1, totalPaginas: 1 });
  await prepararEnvio();
  const imagenes = screen.getAllByRole('img', { name: 'Foto de Termo' });
  expect(imagenes).toHaveLength(2);
  expect(imagenes[1]).toHaveAttribute('src', expect.stringContaining('/uploads/termo.jpg'));
  fireEvent.error(imagenes[1]);
  expect(screen.getByRole('img', { name: 'Producto sin imagen disponible' })).toBeInTheDocument();
});
