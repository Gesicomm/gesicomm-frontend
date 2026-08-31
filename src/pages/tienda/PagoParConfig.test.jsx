import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
