import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImagenesProductoLanding from './ImagenesProductoLanding';
import { itemPanelARuntime, itemPublicoARuntime } from './datosRuntime';

afterEach(cleanup);
const producto = { tipo: 'producto', id: 10, referencia_id: 10, content_id: 'cacerola', nombre: 'Cacerola', imagen: '/uploads/a.jpg', imagenes: ['/uploads/a.jpg', '/uploads/b.jpg'] };
function Editor({ subir = vi.fn() }) {
  const [item, setItem] = useState(producto);
  return <><ImagenesProductoLanding item={item} onCambiar={(campo, valor) => setItem(prev => ({ ...prev, [campo]: valor }))} onSubirImagen={subir} /><output data-testid="item">{JSON.stringify(item)}</output></>;
}
describe('imágenes propias de cada landing', () => {
  it('agrega links públicos y rechaza protocolos inseguros y duplicados', () => {
    render(<Editor />);
    fireEvent.change(screen.getByLabelText('Agregar imagen por link'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar link' }));
    expect(screen.getByRole('alert')).toHaveTextContent('https://');
    fireEvent.change(screen.getByLabelText('Agregar imagen por link'), { target: { value: 'https://cdn.test/foto.webp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar link' }));
    expect(screen.getAllByRole('img')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Agregar imagen por link'), { target: { value: 'https://cdn.test/foto.webp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar link' }));
    expect(screen.getByRole('alert')).toHaveTextContent('ya está');
  });
  it('elige portada, permite quitar todas y restaurar el catálogo', () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar foto 2 como portada' }));
    expect(JSON.parse(screen.getByTestId('item').textContent).imagenes_landing[0]).toContain('/uploads/b.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto 2 de esta landing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto 1 de esta landing' }));
    expect(screen.getByText('Este producto se mostrará sin imágenes en esta landing.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Usar imágenes del catálogo' }));
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(producto.imagenes).toHaveLength(2);
  });
  it('sube archivos y mantiene las fotos previas', async () => {
    const subir = vi.fn().mockResolvedValue('https://cdn.test/nueva.webp');
    render(<Editor subir={subir} />);
    fireEvent.change(screen.getByLabelText('Subir imágenes de Cacerola para esta landing'), { target: { files: [new File(['foto'], 'foto.webp', { type: 'image/webp' })] } });
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3));
    expect(subir).toHaveBeenCalledOnce();
    expect(JSON.parse(screen.getByTestId('item').textContent).imagenes_landing[2]).toBe('https://cdn.test/nueva.webp');
  });
  it('rechaza formatos inválidos sin subirlos', () => {
    const subir = vi.fn(); render(<Editor subir={subir} />);
    fireEvent.change(screen.getByLabelText('Subir imágenes de Cacerola para esta landing'), { target: { files: [new File(['x'], 'archivo.svg', { type: 'image/svg+xml' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('hasta 5 MB'); expect(subir).not.toHaveBeenCalled();
  });
  it('aplica la misma galería a preview y público y conserva la ausencia explícita de imágenes', () => {
    const venta = { presentacion_productos: { 'producto:10': { imagenes_landing: ['https://cdn.test/nueva.webp'] } } };
    expect(itemPanelARuntime(producto, [], null, venta).imagen).toBe('https://cdn.test/nueva.webp');
    expect(itemPublicoARuntime(producto, 'tienda', venta).imagenes_url).toEqual(['https://cdn.test/nueva.webp']);
    venta.presentacion_productos['producto:10'].imagenes_landing = [];
    expect(itemPanelARuntime(producto, [], null, venta).imagen).toBeNull();
    expect(itemPublicoARuntime(producto, 'tienda', venta).imagenes_url).toEqual([]);
    expect(itemPublicoARuntime(producto, 'otra-tienda').imagen).toContain('/uploads/a.jpg');
  });
});
