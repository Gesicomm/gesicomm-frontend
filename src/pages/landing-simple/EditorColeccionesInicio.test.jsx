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

it('edita una imagen a la vez y conserva cada imagen al cambiar de tarjeta', () => {
  function Panel() {
    const [config, setConfig] = useState({ limite: 24 });
    return <EditorColeccionesInicio config={config} categorias={Array.from({ length: 24 }, (_, i) => [`Categoría ${i + 1}`, 2])} onCambiar={setConfig} />;
  }
  const { container } = render(<Panel />);
  expect(container.querySelectorAll('.colecciones-image-editor')).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('URL de imagen para Categoría 1'), { target: { value: 'https://cdn.test/uno.webp' } });
  fireEvent.change(screen.getByLabelText('Tarjeta para editar'), { target: { value: 'Categoría 2' } });
  fireEvent.change(screen.getByLabelText('URL de imagen para Categoría 2'), { target: { value: 'https://cdn.test/dos.webp' } });
  fireEvent.change(screen.getByLabelText('Tarjeta para editar'), { target: { value: 'Categoría 1' } });
  expect(screen.getByLabelText('URL de imagen para Categoría 1')).toHaveValue('https://cdn.test/uno.webp');
  fireEvent.change(screen.getByLabelText('Buscar categoría o colección'), { target: { value: '24' } });
  expect(screen.getByLabelText('Mostrar Categoría 24')).toBeInTheDocument();
  expect(screen.queryByLabelText('Mostrar Categoría 1')).toBeNull();
});

it('modifica los tamaños sin perder textos ni la selección', () => {
  const guardar = vi.fn();
  render(<EditorColeccionesInicio config={{ titulo: 'Colecciones de verano', items: ['Cocina'] }} categorias={[["Cocina", 10]]} onCambiar={guardar} />);
  fireEvent.change(screen.getByLabelText('Tamaño del subtítulo'), { target: { value: '22' } });
  expect(guardar).toHaveBeenLastCalledWith(expect.objectContaining({ titulo: 'Colecciones de verano', items: ['Cocina'], tipografia: { subtitulo: 22 } }));
});
