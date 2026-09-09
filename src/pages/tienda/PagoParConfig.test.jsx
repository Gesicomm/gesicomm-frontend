import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import PagoParConfig from './PagoParConfig';
import { paymentGatewayService } from '../../services/paymentGatewayService';

// Mock the service
vi.mock('../../services/paymentGatewayService', () => ({
  paymentGatewayService: {
    obtenerPagopar: vi.fn(),
    guardarPagopar: vi.fn(),
    probarPagopar: vi.fn()
  }
}));

describe('PagoParConfig Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe cargar la configuracion inicialmente', async () => {
    paymentGatewayService.obtenerPagopar.mockResolvedValue({
      public_key: 'pk_test_123',
      environment: 'sandbox',
      is_active: true,
      has_private_key: true
    });

    render(<PagoParConfig />);
    
    expect(screen.getByText('Cargando configuración...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue('pk_test_123')).toBeInTheDocument();
    });

    // Check environment select
    expect(screen.getByDisplayValue('Sandbox (Pruebas)')).toBeInTheDocument();
    // Check if private key status is shown
    expect(screen.getByText('Clave Privada configurada')).toBeInTheDocument();
  });

  it('debe permitir guardar configuracion sin cambiar private key', async () => {
    paymentGatewayService.obtenerPagopar.mockResolvedValue({
      public_key: 'pk_123',
      environment: 'production',
      is_active: false,
      has_private_key: false
    });

    paymentGatewayService.guardarPagopar.mockResolvedValue({ message: 'OK' });

    render(<PagoParConfig />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('pk_123')).toBeInTheDocument();
    });

    // Cambiar public key
    const publicKeyInput = screen.getByDisplayValue('pk_123');
    fireEvent.change(publicKeyInput, { target: { value: 'pk_new_123' } });

    // Click Guardar
    const saveButton = screen.getByText('Guardar Configuración');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(paymentGatewayService.guardarPagopar).toHaveBeenCalledWith(
        expect.objectContaining({
          public_key: 'pk_new_123',
          environment: 'production',
          is_active: false
        })
      );
    });

    expect(screen.getByText('Configuración guardada exitosamente.')).toBeInTheDocument();
  });

  it('debe mostrar error al fallar la prueba de conexion', async () => {
    paymentGatewayService.obtenerPagopar.mockResolvedValue({
      public_key: 'pk_123',
      environment: 'sandbox',
      is_active: true,
      has_private_key: true
    });

    paymentGatewayService.probarPagopar.mockRejectedValue({
      response: { data: { error: 'Token inválido' } }
    });

    render(<PagoParConfig />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('pk_123')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Probar Conexión');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('Token inválido')).toBeInTheDocument();
    });
  });
});

/**
 * El par público/privado de PagoPar.
 *
 * Los dos tokens se validan juntos: la firma se calcula con el privado y
 * PagoPar la contrasta con el que tiene asociado al público. Guardar uno
 * nuevo con el otro viejo deja un par imposible y todo falla con "Token no
 * coincide" — pasó en producción y por eso existen estos tests.
 */
describe('PagoParConfig — par de tokens', () => {
  // Este describe es hermano del de arriba, asi que su beforeEach no aplica:
  // sin esto las llamadas se acumulan y calls[0] es de otro test.
  beforeEach(() => { vi.clearAllMocks(); cleanup(); });

  const PUB_VIEJA = '17bb8b01cce9ed69f65250688abefa78';
  const PUB_NUEVA = 'aaaa1111bbbb2222cccc3333dddd4444';
  const PRIV_NUEVA = '0855267de6461bab2e7b9c79784d6a15';

  async function montar() {
    paymentGatewayService.obtenerPagopar.mockResolvedValue({
      public_key: PUB_VIEJA,
      environment: 'sandbox',
      is_active: false,
      has_private_key: true,
    });
    paymentGatewayService.guardarPagopar.mockResolvedValue({ message: 'OK' });
    render(<PagoParConfig />);
    await waitFor(() => expect(screen.getByDisplayValue(PUB_VIEJA)).toBeInTheDocument());
  }

  it('avisa y bloquea el guardado si cambia la pública sin reemplazar la privada', async () => {
    await montar();

    fireEvent.change(screen.getByDisplayValue(PUB_VIEJA), { target: { value: PUB_NUEVA } });

    await waitFor(() => {
      expect(screen.getByText(/seguís con la clave privada anterior/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Guardar Configuración/i })).toBeDisabled();
    expect(paymentGatewayService.guardarPagopar).not.toHaveBeenCalled();
  });

  it('al reemplazar la privada manda LAS DOS en el payload', async () => {
    await montar();

    fireEvent.change(screen.getByDisplayValue(PUB_VIEJA), { target: { value: PUB_NUEVA } });
    fireEvent.click(screen.getByRole('button', { name: /Reemplazar o Eliminar/i }));
    fireEvent.change(screen.getByPlaceholderText(/Pegá tu private key aquí/i), {
      target: { value: PRIV_NUEVA },
    });

    // El aviso se va y el botón vuelve a habilitarse.
    await waitFor(() => {
      expect(screen.queryByText(/seguís con la clave privada anterior/i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Configuración/i }));

    await waitFor(() => expect(paymentGatewayService.guardarPagopar).toHaveBeenCalled());
    const payload = paymentGatewayService.guardarPagopar.mock.calls[0][0];
    // Esto es lo que antes se perdía: eliminarKey ganaba y mandaba null.
    expect(payload).toMatchObject({ public_key: PUB_NUEVA, private_key: PRIV_NUEVA });
  });

  it('dejar el campo vacío tras "Reemplazar o Eliminar" sigue borrando la clave', async () => {
    await montar();

    fireEvent.click(screen.getByRole('button', { name: /Reemplazar o Eliminar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar Configuración/i }));

    await waitFor(() => expect(paymentGatewayService.guardarPagopar).toHaveBeenCalled());
    expect(paymentGatewayService.guardarPagopar.mock.calls[0][0].private_key).toBeNull();
  });

  it('guardar sin tocar nada no manda private_key', async () => {
    await montar();

    fireEvent.click(screen.getByRole('button', { name: /Guardar Configuración/i }));

    await waitFor(() => expect(paymentGatewayService.guardarPagopar).toHaveBeenCalled());
    expect(paymentGatewayService.guardarPagopar.mock.calls[0][0]).not.toHaveProperty('private_key');
  });
});
