import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import MovilExpressConfig from './MovilExpressConfig';
import ConexionLogistica from './ConexionLogistica';
import { movilExpressService } from '../../services/movilExpressService';
import { rahaService } from '../../services/rahaService';
import { speedboxService } from '../../services/speedboxService';

vi.mock('../../services/movilExpressService', () => ({
  movilExpressService: {
    obtener: vi.fn(), guardar: vi.fn(), verificarClave: vi.fn(),
    registrarComercio: vi.fn(), registrarWebhook: vi.fn(), cotizar: vi.fn(),
  },
}));
vi.mock('../../services/rahaService', () => ({ rahaService: { obtener: vi.fn() } }));
vi.mock('../../services/speedboxService', () => ({ speedboxService: { obtener: vi.fn() } }));

const estado = (conexion = {}, extra = {}) => ({
  habilitado: true,
  environment: 'sandbox',
  tienda: { id: 7, nombre: 'Mi negocio', ruc: '80012345-6' },
  webhook_url: 'https://api.gesicomm.com/api/webhooks/movil-express?environment=sandbox',
  courier: null,
  ciudades_cobertura: [
    { id: 1, nombre: 'Asunción', departamento: 'Asunción' },
    { id: 2, nombre: 'Fernando de la Mora', departamento: 'Central' },
    { id: 3, nombre: 'Luque', departamento: 'Central' },
  ],
  depositos: [{ id: 11, nombre: 'Depósito central', ciudad: 'Fernando de la Mora', external_id: 'GESICOM-D11' }],
  conexion: {
    id: 1, environment: 'sandbox', external_merchant_id: 'GESICOM-T7', merchant_estado: null,
    usa_clave_plataforma: false, tiene_clave: false, tiene_webhook: false, courier_id: null, activo: false,
    ...conexion,
  },
  ...extra,
});

/** Conexión con los dos primeros pasos hechos: lista para activar. */
const completa = {
  merchant_estado: 'active', tiene_clave: true, tiene_webhook: true, courier_id: 3,
  me_verified_at: '2026-11-10T12:00:00.000Z', merchant_verified_at: '2026-11-10T12:01:00.000Z',
};

const irA = async titulo => {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(titulo) }));
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  movilExpressService.obtener.mockResolvedValue(estado());
  movilExpressService.guardar.mockResolvedValue({ ok: true });
  movilExpressService.verificarClave.mockResolvedValue({ ok: true });
  movilExpressService.registrarComercio.mockResolvedValue({ ok: true, estado: 'active' });
});

describe('asistente de Móvil Express', () => {
  it('muestra un solo paso por vez y arranca en el primero pendiente', async () => {
    render(<MovilExpressConfig />);
    expect(await screen.findByRole('heading', { name: 'Clave de la conexión', level: 5 })).toBeVisible();
    expect(screen.getByText('Paso 1 de 3')).toBeVisible();
    // Los otros pasos están en el mapa, pero su contenido no se renderiza.
    expect(screen.queryByRole('button', { name: /Declarar los avisos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Activar los envíos/ })).not.toBeInTheDocument();
  });

  it('con la clave y los avisos hechos abre directo en el último paso', async () => {
    movilExpressService.obtener.mockResolvedValue(estado(completa));
    render(<MovilExpressConfig />);
    expect(await screen.findByRole('heading', { name: 'Probar y activar', level: 5 })).toBeVisible();
    expect(screen.getByText('Paso 3 de 3')).toBeVisible();
  });

  it('se puede ir y volver entre los pasos', async () => {
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Clave de la conexión', level: 5 });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(await screen.findByRole('heading', { name: 'Avisos de estado', level: 5 })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Atrás/ }));
    expect(await screen.findByRole('heading', { name: 'Clave de la conexión', level: 5 })).toBeVisible();
  });

  it('conectar la cuenta guarda la clave, la verifica y da de alta el comercio', async () => {
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Clave de la conexión', level: 5 });
    fireEvent.change(screen.getByPlaceholderText('mxt_…'), { target: { value: 'mxt_abc' } });
    fireEvent.change(screen.getByPlaceholderText('El secreto que te dieron'), { target: { value: 'secreto-de-prueba' } });
    fireEvent.click(screen.getByRole('button', { name: /Conectar la cuenta/ }));
    await waitFor(() => expect(movilExpressService.registrarComercio).toHaveBeenCalled());
    expect(movilExpressService.verificarClave).toHaveBeenCalled();
    expect(movilExpressService.guardar).toHaveBeenCalledWith({
      usa_clave_plataforma: false, public_id: 'mxt_abc', secret: 'secreto-de-prueba',
    });
    // El secreto no queda escrito en pantalla después de guardarlo.
    await waitFor(() => expect(screen.getByPlaceholderText('El secreto que te dieron')).toHaveValue(''));
  });

  it('siempre pide la clave propia del comercio y no ofrece clave corporativa compartida', async () => {
    movilExpressService.obtener.mockResolvedValue(estado({ usa_clave_plataforma: true, tiene_clave: false }));
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Clave de la conexión', level: 5 });
    expect(screen.getByPlaceholderText('mxt_…')).toBeVisible();
    expect(screen.queryByText(/Usar el convenio de Gesicom/)).not.toBeInTheDocument();
  });

  it('avisa cuando Móvil Express deja el comercio en revisión', async () => {
    movilExpressService.registrarComercio.mockResolvedValue({ ok: true, estado: 'review_required' });
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Clave de la conexión', level: 5 });
    fireEvent.click(screen.getByRole('button', { name: /Conectar la cuenta/ }));
    expect(await screen.findByText(/está revisando el alta/)).toBeVisible();
  });

  it('el paso de avisos muestra la dirección pública del servidor, no la del navegador', async () => {
    movilExpressService.obtener.mockResolvedValue(estado({ me_verified_at: '2026-11-10T12:00:00.000Z', merchant_estado: 'active' }));
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Avisos de estado', level: 5 });
    const url = screen.getByText(/api\/webhooks\/movil-express/);
    expect(url).toHaveTextContent('https://api.gesicomm.com/api/webhooks/movil-express?environment=sandbox');
    expect(url.textContent).not.toMatch(/localhost/);
  });

  it('no deja declarar los avisos sin la cuenta conectada', async () => {
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Clave de la conexión', level: 5 });
    await irA('Siguiente');
    expect(screen.getByRole('button', { name: /Declarar los avisos/ })).toBeDisabled();
    expect(screen.getByText('Primero hay que conectar la cuenta, en el paso 1.')).toBeVisible();
  });

  it('no pide elegir un courier: lo crea el proveedor al activarse', async () => {
    movilExpressService.obtener.mockResolvedValue(estado(completa));
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Probar y activar', level: 5 });
    expect(screen.queryByText(/Elegí con qué courier/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Guardar el courier/ })).not.toBeInTheDocument();
    expect(screen.getByText(/creamos el courier/)).toBeVisible();
  });

  it('tampoco pide el punto de despacho: sale del depósito de cada pedido', async () => {
    movilExpressService.obtener.mockResolvedValue(estado(completa));
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Probar y activar', level: 5 });
    expect(screen.queryByRole('button', { name: /Registrar el comercio/ })).not.toBeInTheDocument();
    expect(screen.getByText(/depósito desde el que se despacha ese pedido/)).toBeVisible();
  });

  it('la ciudad de la prueba se elige de una lista, no se escribe', async () => {
    movilExpressService.obtener.mockResolvedValue(estado(completa));
    movilExpressService.cotizar.mockResolvedValueOnce({ ok: true, elegible: true, costo: 32000, ciudad_destino: 'Luque' });
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Probar y activar', level: 5 });
    const combo = screen.getByLabelText('Ciudad de destino');
    expect(combo.tagName).toBe('SELECT');
    expect(within(combo).getByRole('option', { name: 'Fernando de la Mora' })).toBeInTheDocument();
    // Cotizar está bloqueado hasta elegir: no hay forma de mandar un tipeo.
    expect(screen.getByRole('button', { name: /^Cotizar/ })).toBeDisabled();
    fireEvent.change(combo, { target: { value: 'Luque' } });
    fireEvent.click(screen.getByRole('button', { name: /^Cotizar/ }));
    await waitFor(() => expect(movilExpressService.cotizar).toHaveBeenCalledWith({ ciudad: 'Luque' }));
    // El costo aparece en el aviso y en la línea del resultado.
    expect((await screen.findAllByText(/Gs\. 32\.000/)).length).toBeGreaterThan(0);
  });

  it('un destino sin tarifa no inventa un costo', async () => {
    movilExpressService.obtener.mockResolvedValue(estado(completa));
    movilExpressService.cotizar.mockResolvedValueOnce({ ok: true, elegible: false, costo: null, motivo: 'Sin cobertura para ese destino.' });
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Probar y activar', level: 5 });
    fireEvent.change(screen.getByLabelText('Ciudad de destino'), { target: { value: 'Luque' } });
    fireEvent.click(screen.getByRole('button', { name: /^Cotizar/ }));
    expect(await screen.findByText('Sin cobertura para ese destino.')).toBeVisible();
    expect(screen.queryByText(/Gs\./)).not.toBeInTheDocument();
  });

  it('activa cuando los dos primeros pasos están listos', async () => {
    movilExpressService.obtener.mockResolvedValue(estado(completa));
    render(<MovilExpressConfig />);
    const activar = await screen.findByRole('button', { name: /Activar los envíos/ });
    await waitFor(() => expect(activar).toBeEnabled());
    fireEvent.click(activar);
    await waitFor(() => expect(movilExpressService.guardar).toHaveBeenCalledWith({ activo: true }));
  });

  it('sin los pasos previos el botón de activar queda bloqueado y dice qué falta', async () => {
    movilExpressService.obtener.mockResolvedValue(estado());
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Clave de la conexión', level: 5 });
    await irA('Siguiente');
    await irA('Siguiente');
    await screen.findByRole('heading', { name: 'Probar y activar', level: 5 });
    expect(screen.getByRole('button', { name: /Activar los envíos/ })).toBeDisabled();
    expect(screen.getByText('Para activar faltan los pasos anteriores: Clave de la conexión y Avisos de estado.')).toBeVisible();
  });

  it('una vez activo ofrece desactivar y nombra el courier creado', async () => {
    movilExpressService.obtener.mockResolvedValue(
      estado({ ...completa, activo: true, enabled_at: '2026-11-10T12:30:00.000Z' }, { courier: { id: 3, nombre: 'Móvil Express', activo: true } }),
    );
    render(<MovilExpressConfig />);
    expect(await screen.findByRole('button', { name: /Desactivar los envíos/ })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Activar los envíos/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Courier:/)).toHaveTextContent('Móvil Express');
  });

  it('muestra el motivo real cuando el proveedor rechaza la operación', async () => {
    movilExpressService.registrarComercio.mockRejectedValue({
      response: { data: { message: 'No hay tarifa para esa operación.', codigo: 'TARIFF_NOT_CONFIGURED' } },
    });
    render(<MovilExpressConfig />);
    await screen.findByRole('heading', { name: 'Clave de la conexión', level: 5 });
    fireEvent.click(screen.getByRole('button', { name: /Conectar la cuenta/ }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No hay tarifa para esa operación. (TARIFF_NOT_CONFIGURED)');
  });
});

describe('tarjeta en Conexión logística', () => {
  beforeEach(() => {
    rahaService.obtener.mockResolvedValue({ id: 1, estado: 'borrador', version: 1, datos: {}, documentos: [], historial: [] });
    speedboxService.obtener.mockResolvedValue({ connections: [], checks: {}, events: [], orders: [] });
  });

  // La tarjeta está escrita y lista, pero oculta a propósito con el filtro
  // de ConexionLogistica.jsx hasta que Móvil Express entregue la clave y se
  // habilite el convenio. Este test fija esa decisión: si alguien saca el
  // filtro sin querer, falla acá y no en la pantalla de un comercio.
  it('está oculta mientras no se habilite la conexión real', async () => {
    render(<ConexionLogistica tienda={{ id: 7, nombre: 'Mi negocio' }} />);
    await waitFor(() => expect(rahaService.obtener).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'Móvil Express', level: 3 })).not.toBeInTheDocument();
    // Rahá sí se ve: lo que está oculto es un proveedor, no la sección.
    expect(screen.getByRole('heading', { name: 'Rahá', level: 3 })).toBeVisible();
    expect(movilExpressService.obtener).not.toHaveBeenCalled();
  });
});
