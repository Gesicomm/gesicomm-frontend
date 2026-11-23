import { expect, it, vi } from 'vitest';
import { prepararActivacion } from './prepararActivacion';
it('retira el secreto antes de que lo vea el píxel y conserva el estado de navegación', () => {
  const ventana = { location: { href: 'https://gesicomm.com/registro#activacion=secreto' }, history: { state: { key: 'navegacion', usr: { from: '/planes' } }, replaceState: vi.fn() } };
  prepararActivacion(ventana);
  expect(ventana.history.replaceState).toHaveBeenCalledWith({ key: 'navegacion', usr: { from: '/planes', activacion: 'secreto' } }, '', '/registro');
});
it('no modifica enlaces o anclas ajenos a la activación', () => {
  const ventana = { location: { href: 'https://gesicomm.com/planes#precios' }, history: { replaceState: vi.fn() } };
  prepararActivacion(ventana);
  expect(ventana.history.replaceState).not.toHaveBeenCalled();
});
