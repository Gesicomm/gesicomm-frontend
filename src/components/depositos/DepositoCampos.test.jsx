import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import DepositoCampos from './DepositoCampos';

vi.mock('../../services/courierApi', () => ({
  getCourierGeografia: vi.fn().mockResolvedValue([
    { id: 1, nombre: 'Central', ciudades: [{ nombre: 'Luque' }, { nombre: 'Areguá' }] },
  ]),
}));

const form = (extra) => ({ nombre: 'Depósito', departamento: 'Central', ciudad: 'Areguá', direccion: '', referencia: '', ...extra });

test('avisa si la dirección nombra otra ciudad que la elegida', async () => {
  render(<DepositoCampos form={form({ direccion: 'claudio arrua esquina general artigas, Luque' })} onChange={vi.fn()} />);
  expect(await screen.findByText(/La dirección dice Luque, pero la ciudad elegida es Areguá/)).toBeInTheDocument();
});

test('no avisa por una calle que se llama como una ciudad', async () => {
  render(<DepositoCampos form={form({ direccion: 'Avenida Luque 123, Areguá' })} onChange={vi.fn()} />);
  await screen.findByLabelText('Dirección');
  await new Promise(r => setTimeout(r, 30));
  expect(screen.queryByText(/La dirección dice/)).not.toBeInTheDocument();
});
