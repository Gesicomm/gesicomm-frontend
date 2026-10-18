import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MetodosPagoEditor } from './PresentacionProducto';
import { presentacionComercial } from './datosRuntime';
afterEach(cleanup);

it('agrega nombre e imagen, permite subirla y conserva el logo tras guardar y recargar', async () => {
  let guardado;
  const subir = vi.fn().mockResolvedValue('https://cdn.test/tigo.webp');
  function Editor() {
    const [metodos, setMetodos] = useState([]);
    guardado = metodos;
    return <MetodosPagoEditor metodos={metodos} onCambiar={(_, v) => setMetodos(v)} onSubirImagen={subir} />;
  }
  render(<Editor />);
  fireEvent.click(screen.getByRole('button', { name: '+ Otro método', exact: true }));
  fireEvent.change(screen.getByLabelText('Otro método 1'), { target: { value: 'Giros Tigo' } });
  fireEvent.change(screen.getByLabelText('Subir ícono del método 1'), { target: { files: [new File(['logo'], 'tigo.webp', { type: 'image/webp' })] } });
  await waitFor(() => expect(screen.getByLabelText('Ícono del método 1')).toHaveValue('https://cdn.test/tigo.webp'));
  expect(subir).toHaveBeenCalledTimes(1);
  const venta = { ficha_compartida: { v: 2, metodos_pago: JSON.parse(JSON.stringify(guardado)) } };
  const ficha = presentacionComercial({ id: 1, tipo: 'producto' }, venta);
  expect(ficha.metodos_pago).toEqual([]);
  expect(ficha.payment_logos).toContainEqual(expect.objectContaining({ nombre: 'Giros Tigo', imagen: 'https://cdn.test/tigo.webp' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quitar', exact: true }));
  expect(screen.queryByLabelText('Otro método 1')).toBeNull();
});
