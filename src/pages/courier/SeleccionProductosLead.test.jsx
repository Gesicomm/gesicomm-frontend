import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeleccionProductosLead } from './SeleccionProductosLead';

vi.mock('../landing/ProductPicker', () => ({ default: ({ abierto, onToggle, onConfirmar, onCerrar, errorConfirmacion }) => abierto ? <div>
  <button onClick={() => onToggle({ id: 10, tipo: 'producto', nombre: 'Silla', precio_efectivo: 50000 })}>Seleccionar silla</button>
  <button onClick={() => onToggle({ id: 20, tipo: 'producto', nombre: 'Mesa', precio_efectivo: 100000 })}>Seleccionar mesa</button>
  <button onClick={onConfirmar}>Agregar productos</button>
  <button onClick={onCerrar}>Cancelar</button>
  {errorConfirmacion && <span role="alert">{errorConfirmacion}</span>}
</div> : null }));

test('solo guarda productos de interés, sin confirmar ni crear un pedido', async () => {
  const guardar = vi.fn(async () => {});
  render(<SeleccionProductosLead lead={{ id: 90, es_lead: true, items: [] }} onClose={() => {}} onGuardar={guardar} />);
  fireEvent.click(screen.getByText('Seleccionar silla'));
  fireEvent.click(screen.getByText('Agregar productos'));
  await waitFor(() => expect(guardar).toHaveBeenCalledWith([{ producto_id: 10, nombre_producto: 'Silla', cantidad: 1, precio_unitario: 50000 }]));
});

test('cancelar la selección no guarda cambios en el lead', () => {
  const guardar = vi.fn(), cerrar = vi.fn();
  render(<SeleccionProductosLead lead={{ id: 90, items: [] }} onClose={cerrar} onGuardar={guardar} />);
  fireEvent.click(screen.getByText('Seleccionar silla'));
  fireEvent.click(screen.getByText('Cancelar'));
  expect(cerrar).toHaveBeenCalled();
  expect(guardar).not.toHaveBeenCalled();
});

test('permite reintentar si falla el guardado', async () => {
  render(<SeleccionProductosLead lead={{ id: 90, items: [] }} onClose={() => {}} onGuardar={async () => { throw new Error('No se pudo guardar'); }} />);
  fireEvent.click(screen.getByText('Agregar productos'));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar');
});


test('reemplaza un producto por otro sin tocar el historial ni confirmar un pedido', async () => {
  const guardar = vi.fn(async () => {});
  const lead = { id: 90, es_lead: true, items: [{ producto_id: 20, nombre_producto: 'Mesa', cantidad: 1, precio_unitario: 100000 }] };
  render(<SeleccionProductosLead lead={lead} onClose={() => {}} onGuardar={guardar} />);
  fireEvent.click(screen.getByText('Seleccionar mesa'));
  fireEvent.click(screen.getByText('Seleccionar silla'));
  fireEvent.click(screen.getByText('Agregar productos'));
  await waitFor(() => expect(guardar).toHaveBeenCalledWith([expect.objectContaining({ producto_id: 10 })]));
  expect(lead.items[0].producto_id).toBe(20);
});

test('puede conservar el producto actual y agregar otro de interés', async () => {
  const guardar = vi.fn(async () => {});
  render(<SeleccionProductosLead lead={{ id: 90, es_lead: true, items: [{ producto_id: 20, nombre_producto: 'Mesa', cantidad: 1, precio_unitario: 100000 }] }} onClose={() => {}} onGuardar={guardar} />);
  fireEvent.click(screen.getByText('Seleccionar silla'));
  fireEvent.click(screen.getByText('Agregar productos'));
  await waitFor(() => expect(guardar).toHaveBeenCalledWith([expect.objectContaining({ producto_id: 20 }), expect.objectContaining({ producto_id: 10 })]));
});
