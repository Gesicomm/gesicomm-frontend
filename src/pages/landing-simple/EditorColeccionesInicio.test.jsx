import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditorColeccionesInicio from './EditorColeccionesInicio';

afterEach(cleanup);

it('permite subir, reemplazar por URL y quitar la imagen de una tarjeta', async () => {
  const onSubir = vi.fn().mockResolvedValue('https://cdn.test/subida.webp');
  function Panel() {
    const [config, setConfig] = useState({ modo: 'categorias', items: ['Cocina'], columnas: 4, limite: 4 });
    return <EditorColeccionesInicio config={config} categorias={[["Cocina", 10]]} onCambiar={setConfig} onSubir={onSubir} />;
  }
  render(<Panel />);
  const archivo = new File(['imagen'], 'coleccion.webp', { type: 'image/webp' });
  fireEvent.change(screen.getByLabelText('Subir imagen para Cocina'), { target: { files: [archivo] } });
  await waitFor(() => expect(screen.getByLabelText('URL de imagen para Cocina').value).toBe('https://cdn.test/subida.webp'));
  expect(onSubir).toHaveBeenCalledWith(archivo);
  fireEvent.change(screen.getByLabelText('URL de imagen para Cocina'), { target: { value: 'https://cdn.test/otra.webp' } });
  expect(screen.getByAltText('Imagen de Cocina').getAttribute('src')).toBe('https://cdn.test/otra.webp');
  fireEvent.click(screen.getByRole('button', { name: 'Usar imagen automática para Cocina' }));
  expect(screen.getByLabelText('URL de imagen para Cocina').value).toBe('');
  expect(screen.queryByAltText('Imagen de Cocina')).toBeNull();
});
