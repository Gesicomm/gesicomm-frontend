import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImagenProductoSeguimiento } from './ImagenProductoSeguimiento';

const imagen = { item_id: 20, nombre: 'ClimaCube WiFi', url: '/uploads/clima.webp' };
const png = new Blob(['png'], { type: 'image/png' });
let write;

beforeEach(() => {
  write = vi.fn(async items => { await items[0].datos['image/png']; });
  vi.stubGlobal('ClipboardItem', class { constructor(datos) { this.datos = datos; } });
  Object.defineProperty(navigator, 'clipboard', { value: { write }, configurable: true });
});
afterEach(() => vi.unstubAllGlobals());

test('copia el archivo de imagen para pegarlo, sin copiar su URL como texto', async () => {
  const servicio = { getImagenProducto: vi.fn(async () => png) };
  render(<ImagenProductoSeguimiento imagen={imagen} envioId={50} servicio={servicio} />);
  expect(screen.getByRole('img', { name: imagen.nombre })).toHaveAttribute('src', expect.stringContaining('/uploads/clima.webp'));
  fireEvent.click(screen.getByRole('button', { name: `Copiar imagen de ${imagen.nombre}` }));
  await screen.findByRole('status');
  expect(servicio.getImagenProducto).toHaveBeenCalledWith(50, 20);
  expect(write).toHaveBeenCalledTimes(1);
  expect(await write.mock.calls[0][0][0].datos['image/png']).toBe(png);
  expect(screen.getByRole('status')).toHaveTextContent('pegala en el chat antes de enviar');
});

test('un error de descarga permite reintentar sin mostrar una copia exitosa', async () => {
  const servicio = { getImagenProducto: vi.fn().mockRejectedValueOnce(new Error('Error de red')).mockResolvedValueOnce(png) };
  render(<ImagenProductoSeguimiento imagen={imagen} envioId={50} servicio={servicio} />);
  const boton = screen.getByRole('button', { name: `Copiar imagen de ${imagen.nombre}` });
  fireEvent.click(boton);
  await screen.findByRole('alert');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(boton).toBeEnabled();
  fireEvent.click(boton);
  await screen.findByRole('status');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('sin soporte de portapapeles ofrece abrir la imagen y no descarga el archivo', async () => {
  vi.stubGlobal('ClipboardItem', undefined);
  const servicio = { getImagenProducto: vi.fn() };
  render(<ImagenProductoSeguimiento imagen={imagen} envioId={50} servicio={servicio} />);
  fireEvent.click(screen.getByRole('button', { name: `Copiar imagen de ${imagen.nombre}` }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Este navegador no permite copiar imágenes');
  expect(screen.getByRole('link', { name: 'Abrir imagen' })).toHaveAttribute('target', '_blank');
  expect(servicio.getImagenProducto).not.toHaveBeenCalled();
});

test('las imágenes externas se copian con el PNG del servidor sin depender del CORS del origen', async () => {
  const servicio = { getImagenProducto: vi.fn().mockResolvedValue(png) };
  const fetchImagen = vi.fn();
  vi.stubGlobal('fetch', fetchImagen);
  render(<ImagenProductoSeguimiento imagen={{ ...imagen, url: 'https://imagenes.example/clima.png' }} envioId={50} servicio={servicio} />);
  fireEvent.click(screen.getByRole('button', { name: `Copiar imagen de ${imagen.nombre}` }));
  await screen.findByRole('status');
  expect(servicio.getImagenProducto).toHaveBeenCalledWith(50, 20);
  expect(fetchImagen).not.toHaveBeenCalled();
});

test('muestra el motivo real del error del servidor y no confirma una copia fallida', async () => {
  const servicio = { getImagenProducto: vi.fn().mockRejectedValue({ response: { data: { error: 'No se pudo descargar la imagen del producto.' } } }) };
  render(<ImagenProductoSeguimiento imagen={imagen} envioId={50} servicio={servicio} />);
  fireEvent.click(screen.getByRole('button', { name: `Copiar imagen de ${imagen.nombre}` }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo descargar la imagen del producto.');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('distingue el bloqueo del portapapeles de un error en la descarga', async () => {
  write.mockRejectedValue(new DOMException('Write permission denied', 'NotAllowedError'));
  render(<ImagenProductoSeguimiento imagen={imagen} envioId={50} servicio={{ getImagenProducto: vi.fn().mockResolvedValue(png) }} />);
  fireEvent.click(screen.getByRole('button', { name: `Copiar imagen de ${imagen.nombre}` }));
  expect(await screen.findByRole('alert')).toHaveTextContent('El navegador bloqueó la copia');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
