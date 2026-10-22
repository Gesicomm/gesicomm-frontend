import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConfigurarTienda from './ConfigurarTienda';
import { tiendaService } from '../../services/tiendaService';
import { planesService } from '../../services/planesService';
import { getMetodosPago } from '../../services/courierApi';
import { comboAdminService } from '../../services/comboAdminService';

vi.mock('../../services/tiendaService', () => ({
  tiendaService: {
    obtener: vi.fn(),
    actualizar: vi.fn(),
    crear: vi.fn(),
    subirLogo: vi.fn(),
    eliminarLogo: vi.fn(),
    guardarTipografia: vi.fn(),
    disponibilidadSubdominio: vi.fn(),
    guardarDominioPropio: vi.fn(),
    estadoDominioPropio: vi.fn(),
    habilitarDominioPropio: vi.fn(),
    eliminarDominioPropio: vi.fn(),
    consultarWhois: vi.fn(),
  },
}));

vi.mock('../../services/planesService', () => ({
  planesService: {
    miEstado: vi.fn(),
  },
}));

vi.mock('../../services/courierApi', () => ({ getMetodosPago: vi.fn().mockResolvedValue([]) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { obtenerConfiguracion: vi.fn().mockResolvedValue(null) } }));
vi.mock('../../services/rahaService', () => ({ rahaService: { obtener: vi.fn().mockResolvedValue({ estado: 'borrador' }) } }));
vi.mock('../../services/speedboxService', () => ({ speedboxService: { obtener: vi.fn().mockResolvedValue({ connections: [] }) } }));

vi.mock('./PagoParConfig', () => ({
  default: () => <div data-testid="pagopar-config">PagoPar config</div>,
}));

vi.mock('../combos/ComboConfiguracion', () => ({
  default: () => <div data-testid="combo-config">Combo config</div>,
}));

vi.mock('../courier/MetodosPagoCrud', () => ({
  MetodosPagoCrud: ({ onMetodosChange }) => <div data-testid="metodos-pago">Metodos de pago<button type="button" onClick={() => onMetodosChange([{ activo: true }])}>Activar pago QA</button></div>,
}));

const tiendaBase = {
  id: 10,
  nombre: 'SomMix',
  subdominio: 'sommix',
  dominio_base: 'gesicomm.com',
  documento: '4123456',
  ruc: '80012345-6',
  color_primario: '#10b981',
  color_secundario: '#059669',
  color_fondo: '#0a0a0a',
  whatsapp: '595981111222',
  telefono: '',
  mensaje_contacto: 'Hola, me interesa {producto}',
  nombre_contacto: '',
  canal_contacto: 'whatsapp',
  email: '',
  instagram: '',
  facebook: '',
  twitter: '',
  tiktok: '',
  youtube: '',
  direccion_publica: '',
  ciudad_publica: '',
  meta_pixel_id: '',
  meta_test_event_code: '',
  meta_capi_activo: false,
  meta_access_token_configurado: false,
  google_analytics_id: '',
  tiktok_pixel_id: '',
  plan: 'pago',
  suscripcion: {
    plan: { nombre: 'Plan Pro' },
  },
};

function renderizar(ruta = '/mi-tienda') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ConfigurarTienda />
    </MemoryRouter>
  );
}

async function cargarPantalla() {
  renderizar();
  await waitFor(() => expect(screen.getByDisplayValue('SomMix')).toBeInTheDocument());
}

describe('ConfigurarTienda — flujo integral de configuracion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMetodosPago.mockResolvedValue([]);
    comboAdminService.obtenerConfiguracion.mockResolvedValue(null);
    window.confirm = vi.fn(() => true);
    tiendaService.obtener.mockResolvedValue({ ...tiendaBase });
    tiendaService.actualizar.mockImplementation(payload => Promise.resolve({ ...tiendaBase, ...payload }));
    tiendaService.crear.mockImplementation(payload => Promise.resolve({ ...tiendaBase, ...payload }));
    tiendaService.subirLogo.mockResolvedValue({ ...tiendaBase, logo_imagen: '/uploads/logo.webp' });
    tiendaService.eliminarLogo.mockResolvedValue({ ...tiendaBase, logo_imagen: null });
    tiendaService.guardarTipografia.mockResolvedValue({ typography: { headingFont: 'outfit', bodyFont: 'outfit' } });
    tiendaService.disponibilidadSubdominio.mockResolvedValue({ valido: true, disponible: true, motivo: null });
    tiendaService.guardarDominioPropio.mockResolvedValue({
      dominio: 'mitienda.com.py',
      estado: 'pendiente',
      verificado: false,
      registros: [{ tipo: 'A', nombre: '@', valor: '155.117.43.52', obligatorio: true }],
    });
    tiendaService.estadoDominioPropio.mockResolvedValue({
      dominio: 'mitienda.com.py',
      estado: 'pendiente',
      verificado: false,
      registros: [{ tipo: 'A', nombre: '@', valor: '155.117.43.52', obligatorio: true }],
    });
    tiendaService.consultarWhois.mockResolvedValue({ proveedor: null });
    planesService.miEstado.mockResolvedValue({ tiene_suscripcion_activa: true, suscripcion: tiendaBase.suscripcion });
  });

  it('edita tienda, documento/RUC, URL, contacto y analitica; guarda con el payload correcto', async () => {
    await cargarPantalla();

    fireEvent.change(screen.getByDisplayValue('SomMix'), { target: { value: 'SomMix Natural' } });
    fireEvent.change(screen.getByDisplayValue('sommix'), { target: { value: 'SomMix Natural PY' } });
    fireEvent.change(screen.getByDisplayValue('4123456'), { target: { value: '5123456' } });
    fireEvent.change(screen.getByDisplayValue('80012345-6'), { target: { value: '80123456-7' } });
    fireEvent.change(screen.getByPlaceholderText('#10B981'), { target: { value: '#155e63' } });
    fireEvent.change(screen.getByPlaceholderText('#059669'), { target: { value: '#d8a862' } });
    fireEvent.change(screen.getByPlaceholderText('#0A0A0A'), { target: { value: '#101a21' } });

    expect(screen.getByText('sommix-natural-py.gesicomm.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => expect(tiendaService.actualizar).toHaveBeenCalledTimes(1));
    expect(tiendaService.actualizar.mock.calls[0][0]).toMatchObject({
      nombre: 'SomMix Natural',
      subdominio: 'sommix-natural-py',
      documento: '5123456',
      ruc: '80123456-7',
      color_primario: '#155e63',
      color_secundario: '#d8a862',
      color_fondo: '#101a21',
    });
    expect(tiendaService.actualizar.mock.calls[0][0]).not.toHaveProperty('subdominio_manual');
    expect(await screen.findByText(/Configuración guardada correctamente/i)).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('tablist', { name: 'Secciones de configuración', exact: true })).getByRole('tab', { name: /Contacto/i }));
    fireEvent.change(await screen.findByPlaceholderText('Ej: Martín García'), { target: { value: 'Martin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    fireEvent.change(screen.getByDisplayValue('595981111222'), { target: { value: '595981234567' } });
    fireEvent.change(screen.getByPlaceholderText('Solo si querés mostrar otro número'), { target: { value: '021555555' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: contacto@tutienda.com'), { target: { value: 'hola@sommix.com.py' } });
    fireEvent.change(screen.getAllByPlaceholderText('tu_handle')[0], { target: { value: '@sommixpy' } });
    fireEvent.change(screen.getByPlaceholderText('tupagina'), { target: { value: 'sommixparaguay' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Asunción, Paraguay'), { target: { value: 'Asuncion, Paraguay' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Av. España 1234, Edificio Central piso 3'), { target: { value: 'Av. Test 123' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Hola, me interesa {producto}'), {
      target: { value: 'Hola, quiero saber de {producto} a {precio}' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => expect(tiendaService.actualizar).toHaveBeenCalledTimes(2));
    expect(tiendaService.actualizar.mock.calls[1][0]).toMatchObject({
      nombre_contacto: 'Martin',
      canal_contacto: 'email',
      whatsapp: '595981234567',
      telefono: '021555555',
      email: 'hola@sommix.com.py',
      instagram: 'sommixpy',
      facebook: 'sommixparaguay',
      ciudad_publica: 'Asuncion, Paraguay',
      direccion_publica: 'Av. Test 123',
      mensaje_contacto: 'Hola, quiero saber de {producto} a {precio}',
    });

    fireEvent.click(within(screen.getByRole('tablist', { name: 'Secciones de configuración', exact: true })).getByRole('tab', { name: /Analítica/i }));
    fireEvent.change(await screen.findByPlaceholderText('Ej: 1234567890123456'), { target: { value: '1234567890123456' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: TEST12345'), { target: { value: 'TEST98765' } });
    fireEvent.change(screen.getByPlaceholderText(/Pegá acá el token/i), { target: { value: 'EAAB-token-test' } });
    fireEvent.click(screen.getByLabelText(/Enviar eventos también por Conversions API/i));
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => expect(tiendaService.actualizar).toHaveBeenCalledTimes(3));
    expect(tiendaService.actualizar.mock.calls[2][0]).toMatchObject({
      meta_pixel_id: '1234567890123456',
      meta_test_event_code: 'TEST98765',
      meta_access_token: 'EAAB-token-test',
      meta_capi_activo: true,
    });
  });

  it('guarda dominio propio, sube y quita logo con endpoints independientes', async () => {
    await cargarPantalla();

    fireEvent.change(screen.getByPlaceholderText('mitienda.com'), { target: { value: 'mitienda.com.py' } });
    fireEvent.click(screen.getByRole('button', { name: /Conectar dominio/i }));

    await waitFor(() => expect(tiendaService.guardarDominioPropio).toHaveBeenCalledWith('mitienda.com.py'));
    await waitFor(() => expect(tiendaService.obtener).toHaveBeenCalledTimes(2));

    const inputLogo = document.querySelector('input[type="file"]');
    const archivo = new File(['fake'], 'logo.webp', { type: 'image/webp' });
    fireEvent.change(inputLogo, { target: { files: [archivo] } });

    await waitFor(() => expect(tiendaService.subirLogo).toHaveBeenCalledTimes(1));
    const formData = tiendaService.subirLogo.mock.calls[0][0];
    expect(formData.get('imagen')).toBe(archivo);

    await waitFor(() => expect(screen.getByRole('button', { name: /Quitar/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Quitar/i }));
    await waitFor(() => expect(tiendaService.eliminarLogo).toHaveBeenCalledTimes(1));
  });

  it('muestra los modulos con guardado propio en Pagos y Costos', async () => {
    await cargarPantalla();

    fireEvent.click(within(screen.getByRole('tablist', { name: 'Secciones de configuración', exact: true })).getByRole('tab', { name: /Pagos/i }));
    expect(await screen.findByTestId('metodos-pago')).toBeInTheDocument();
    expect(screen.getByTestId('pagopar-config')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Guardar cambios/i })).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('tablist', { name: 'Secciones de configuración', exact: true })).getByRole('tab', { name: /Costos/i }));
    expect(await screen.findByTestId('combo-config')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Guardar cambios/i })).not.toBeInTheDocument();
  });
  it('muestra check y pendiente en ambos menús según datos guardados', async () => {
    tiendaService.obtener.mockResolvedValue({ ...tiendaBase, whatsapp: '' });
    await cargarPantalla();
    const menus = screen.getAllByRole('tablist', { hidden: true });
    for (const menu of menus) {
      expect(within(menu).getByRole('tab', { name: 'Tienda', hidden: true })).toHaveAccessibleDescription(/^Completo/);
      expect(within(menu).getByRole('tab', { name: 'Contacto', hidden: true })).toHaveAccessibleDescription(/^Pendiente/);
    }
    const menu = screen.getByRole('tablist', { name: 'Secciones de configuración', exact: true });
    fireEvent.click(within(menu).getByRole('tab', { name: 'Contacto' }));
    const input = screen.getByPlaceholderText('Ej: 595981234567');
    fireEvent.change(input, { target: { value: '595981111222' } });
    expect(within(menu).getByRole('tab', { name: 'Contacto' })).toHaveAccessibleDescription(/^Pendiente/);
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }));
    await waitFor(() => expect(within(menu).getByRole('tab', { name: 'Contacto' })).toHaveAccessibleDescription(/^Completo/));
  });

  it('conserva las plantillas al cambiar de tarjeta y limpia el aviso al guardar', async () => {
    await cargarPantalla();
    const menu = screen.getByRole('tablist', { name: 'Secciones de configuración', exact: true });
    fireEvent.click(within(menu).getByRole('tab', { name: 'Contacto', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar mensaje: Consulta general', exact: true }));
    const general = screen.getByRole('textbox', { name: 'Texto del mensaje', exact: true });
    expect(general).toHaveValue('Hola, quiero hacer una consulta.');
    fireEvent.change(general, { target: { value: '' } });
    expect(general).toHaveValue('');
    fireEvent.change(general, { target: { value: 'Hola, necesito información de su tienda.' } });
    expect(screen.getByRole('status')).toHaveTextContent('Cambios sin guardar');
    fireEvent.click(screen.getByRole('button', { name: 'Editar mensaje: Confirmación de pedido', exact: true }));
    expect(general).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Editar mensaje: Consulta general', exact: true }));
    expect(general).toBeVisible();
    expect(general).toHaveValue('Hola, necesito información de su tienda.');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios', exact: true }));
    await waitFor(() => expect(tiendaService.actualizar).toHaveBeenCalled());
    expect(tiendaService.actualizar.mock.calls[0][0].mensaje_consulta_general).toBe('Hola, necesito información de su tienda.');
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Usar mensaje recomendado', exact: true }));
    expect(general).toHaveValue('Hola, quiero hacer una consulta.');
    expect(screen.getByRole('status')).toHaveTextContent('Cambios sin guardar');
  });

  it('actualiza el check al activar un pago sin recargar', async () => {
    await cargarPantalla();
    const menu = screen.getByRole('tablist', { name: 'Secciones de configuración', exact: true });
    const pagos = within(menu).getByRole('tab', { name: 'Pagos' });
    expect(pagos).toHaveAccessibleDescription(/^Pendiente/);
    fireEvent.click(pagos);
    fireEvent.click(await screen.findByRole('button', { name: 'Activar pago QA' }));
    expect(pagos).toHaveAccessibleDescription(/^Completo/);
  });

});
