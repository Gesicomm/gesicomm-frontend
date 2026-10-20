import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ListaOpinionesProducto from './ListaOpinionesProducto';
vi.mock('../../services/api', () => ({ getMediaUrl: v => v }));
function Demo({ subir }) {
  const [items, setItems] = useState([{ nombre: 'Ana', comentario: 'Excelente', detalle: '', foto: '' }]);
  return <><ListaOpinionesProducto items={items} onCambiar={setItems} onSubirImagen={subir} /><output>{JSON.stringify(items)}</output></>;
}
describe('Editor compartido de opiniones', () => {
  it('sube la foto sin perder un comentario editado durante la subida y permite quitarla', async () => {
    let terminar;
    const subir = vi.fn(() => new Promise(resolve => { terminar = resolve; }));
    render(<Demo subir={subir} />);
    fireEvent.change(screen.getByLabelText('Archivo de foto de opinión 1'), { target: { files: [new File(['foto'], 'ana.webp', { type: 'image/webp' })] } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Comentario', exact: true }), { target: { value: 'Comentario nuevo' } });
    terminar('/ana.webp');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Foto de la persona' })).toHaveValue('/ana.webp'));
    expect(screen.getByRole('textbox', { name: 'Comentario', exact: true })).toHaveValue('Comentario nuevo');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto' }));
    expect(screen.getByRole('textbox', { name: 'Foto de la persona' })).toHaveValue('');
  });
  it('valida el archivo y presenta los errores de subida', async () => {
    const subir = vi.fn().mockRejectedValue(new Error('Falló la conexión'));
    render(<Demo subir={subir} />);
    const archivo = screen.getByLabelText('Archivo de foto de opinión 1');
    fireEvent.change(archivo, { target: { files: [new File(['x'], 'foto.svg', { type: 'image/svg+xml' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('hasta 5 MB');
    expect(subir).not.toHaveBeenCalled();
    fireEvent.change(archivo, { target: { files: [new File(['foto'], 'foto.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Falló la conexión'));
  });
});
