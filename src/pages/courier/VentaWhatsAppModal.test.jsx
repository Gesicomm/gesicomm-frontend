import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VentaWhatsAppModal } from './VentaWhatsAppModal';

vi.mock('../../services/productService', () => ({ productService: { buscar: vi.fn(async () => []) } }));
vi.mock('../../services/api', () => ({ getMediaUrl: value => value }));
vi.mock('../landing/ProductPicker', () => ({ default: ({ onToggle }) => <button type="button" onClick={() => onToggle({ id: 10, nombre: 'Silla', precio_efectivo: 100000 })}>Elegir silla</button> }));

test.each(['Orgánico', 'Campaña WhatsApp'])('permite guardar una consulta sin productos: %s', async origen => {
  const onSubmit = vi.fn(async () => {});
  render(<VentaWhatsAppModal open onClose={() => {}} onSubmit={onSubmit} />);
  fireEvent.change(screen.getByLabelText('Nombre del cliente'), { target: { value: 'Consulta Test' } });
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '0981111222' } });
  fireEvent.click(screen.getByRole('button', { name: origen }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar lead' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    nombre_cliente: 'Consulta Test', items: [], monto: 0, estado: 'Pendiente', estado_comercial: 'Pendiente',
    lead_tipo_manual: origen === 'Orgánico' ? 'organico' : 'campana',
  })));
});

test('recupera el contacto y permite agregarle productos manteniendo el tipo de lead', async () => {
  const onSubmit = vi.fn(async () => {});
  render(<VentaWhatsAppModal open lead={{ nombre_cliente: 'Consulta Test', telefono: '0981111222', lead_tipo_manual: 'campana' }} onClose={() => {}} onSubmit={onSubmit} />);
  expect(screen.getByLabelText('Nombre del cliente')).toHaveValue('Consulta Test');
  fireEvent.click(screen.getByRole('button', { name: 'Elegir silla' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar productos' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    lead_tipo_manual: 'campana', monto: 100000, items: [expect.objectContaining({ producto_id: 10, cantidad: 1 })],
  })));
});

test('sigue exigiendo los datos de contacto para guardar un lead', async () => {
  const onSubmit = vi.fn();
  render(<VentaWhatsAppModal open onClose={() => {}} onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar lead' }));
  expect(screen.getByText('Ingresá el nombre del cliente.')).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});


test.each(['Orgánico', 'Campaña WhatsApp'])('elegir productos no crea un pedido automáticamente: %s', async origen => {
  const onSubmit = vi.fn(async () => {});
  render(<VentaWhatsAppModal open onClose={() => {}} onSubmit={onSubmit} />);
  fireEvent.change(screen.getByLabelText('Nombre del cliente'), { target: { value: 'Consulta Test' } });
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '0981111222' } });
  fireEvent.click(screen.getByRole('button', { name: origen }));
  fireEvent.click(screen.getByRole('button', { name: 'Elegir silla' }));
  expect(screen.getByText(/Valor de interés/)).toBeInTheDocument();
  expect(screen.getByText(/Seguimiento de producto/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Crear pedido' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar lead' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ es_lead: true, monto: 100000, items: [expect.objectContaining({ producto_id: 10 })] })));
});
