import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import EmojiOImagenCombo from './EmojiOImagenCombo';
afterEach(cleanup);
it('valida el archivo y muestra los errores sin reemplazar el emoji elegido', async () => {
  const cambiar = vi.fn(), subir = vi.fn().mockRejectedValue(new Error('Error de conexión'));
  render(<EmojiOImagenCombo numero={1} valor="✨" onChange={cambiar} onSubirImagen={subir} />);
  const archivo = screen.getByLabelText('Archivo de ícono del beneficio 1');
  fireEvent.change(archivo, { target: { files: [new File(['texto'], 'archivo.pdf', { type: 'application/pdf' })] } });
  expect(subir).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('JPG, PNG o WEBP');
  fireEvent.change(archivo, { target: { files: [new File(['imagen'], 'icono.png', { type: 'image/png' })] } });
  expect(await screen.findByText('Error de conexión')).toBeInTheDocument();
  expect(cambiar).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Emoji del beneficio 1')).toHaveValue('✨');
});
