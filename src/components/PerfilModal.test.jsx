import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PerfilModal from './PerfilModal';
import { api } from '../utils/api';

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('PerfilModal', () => {
  const usuarioMock = {
    id: 1,
    nombre: 'Usuario Prueba',
    email: 'prueba@gesicomm.com',
    telefono: '0981123456',
    rol: 'usuario',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({
      id: 1,
      nombre: 'Usuario Prueba',
      email: 'prueba@gesicomm.com',
      telefono: '0981123456',
    });
  });

  it('no se renderiza si isOpen es false', () => {
    const { container } = render(
      <PerfilModal isOpen={false} onClose={() => {}} usuarioActual={usuarioMock} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('se renderiza correctamente y muestra el correo deshabilitado (no modificable)', async () => {
    render(
      <PerfilModal isOpen={true} onClose={() => {}} usuarioActual={usuarioMock} />
    );

    expect(screen.getByText('Configuración de Perfil')).toBeInTheDocument();

    const inputNombre = screen.getByPlaceholderText(/Juan Pérez/i);
    expect(inputNombre).toHaveValue('Usuario Prueba');

    const inputEmail = screen.getByDisplayValue('prueba@gesicomm.com');
    expect(inputEmail).toBeDisabled();
    expect(screen.getByText(/No modificable/i)).toBeInTheDocument();
  });

  it('permite modificar nombre y teléfono y avanza a la pantalla OTP', async () => {
    api.post.mockResolvedValueOnce({ message: 'Código enviado' });

    render(
      <PerfilModal isOpen={true} onClose={() => {}} usuarioActual={usuarioMock} />
    );

    const inputNombre = screen.getByPlaceholderText(/Juan Pérez/i);
    fireEvent.change(inputNombre, { target: { value: 'Nuevo Nombre' } });

    const btnGuardar = screen.getByRole('button', { name: /Guardar cambios/i });
    fireEvent.click(btnGuardar);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/perfil/solicitar-otp');
    });

    expect(await screen.findByText('Confirmación de Seguridad')).toBeInTheDocument();
    expect(screen.getByText('prueba@gesicomm.com')).toBeInTheDocument();
  });

  it('completa el OTP y confirma la actualización', async () => {
    api.post.mockResolvedValueOnce({ message: 'Código enviado' }); // solicitar-otp
    api.post.mockResolvedValueOnce({ // confirmar perfil
      message: 'Perfil actualizado exitosamente.',
      usuario: {
        id: 1,
        nombre: 'Nuevo Nombre',
        email: 'prueba@gesicomm.com',
        telefono: '0981999888',
      },
    });

    const onActualizadoMock = vi.fn();

    render(
      <PerfilModal
        isOpen={true}
        onClose={() => {}}
        usuarioActual={usuarioMock}
        onUsuarioActualizado={onActualizadoMock}
      />
    );

    const btnGuardar = screen.getByRole('button', { name: /Guardar cambios/i });
    fireEvent.click(btnGuardar);

    await screen.findByText('Confirmación de Seguridad');

    const inputsOtp = screen.getAllByRole('textbox');
    // Ingresar 6 dígitos
    ['1', '2', '3', '4', '5', '6'].forEach((d, i) => {
      fireEvent.change(inputsOtp[i], { target: { value: d } });
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/perfil', expect.objectContaining({
        codigo_otp: '123456',
      }));
    });

    await waitFor(() => {
      expect(onActualizadoMock).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Nuevo Nombre',
      }));
    });
  });
});
