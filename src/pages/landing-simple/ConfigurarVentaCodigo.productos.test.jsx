import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: ({ datos }) => <output data-testid="preview-datos">{JSON.stringify(datos)}</output> }));

const catalogo = { productos: [
  { tipo: 'producto', id: 1, slug: 'cacerola', nombre: 'Cacerola', categoria: 'Cocina', precio_efectivo: 850000, precio_tachado: 900000 },
  { tipo: 'producto', id: 2, slug: 'olla', nombre: 'Olla', categoria: 'Cocina', precio_efectivo: 950000 },
], combos: [] };
const cargarOfertas = vi.fn().mockResolvedValue([]);
const datosPreview = () => JSON.parse(screen.getByTestId('preview-datos').textContent);
afterEach(cleanup);

function montar(inicial = { seleccion: catalogo.productos }) {
  const confirmar = vi.fn().mockResolvedValue(true);
  render(<ConfigurarVentaCodigo catalogo={catalogo} inicial={inicial} onConfirmar={confirmar} cargarOfertas={cargarOfertas} onVolver={vi.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
  return confirmar;
}

describe('Presentación de los productos del lienzo', () => {
  it('actualiza ancla y etiquetas en el preview y guarda los mismos valores', async () => {
    const confirmar = montar();
    const fila = screen.getByRole('listitem', { name: 'Presentación de Cacerola' });
    fireEvent.change(within(fila).getByLabelText('Precio ancla'), { target: { value: '1200000' } });
    fireEvent.change(within(fila).getByLabelText('Etiquetas para filtrar (separadas por coma)'), { target: { value: 'Cocina, Oferta especial' } });
    fireEvent.change(within(fila).getByLabelText('Título comercial'), { target: { value: 'Cocina sin esfuerzo' } });
    fireEvent.change(within(fila).getByLabelText('Mensaje corto'), { target: { value: 'Ideal para risottos' } });
    fireEvent.change(within(fila).getByLabelText('Insignia principal'), { target: { value: 'Oferta' } });
    expect(datosPreview().productos[0]).toMatchObject({ precio: 850000, precio_antes: 1200000, etiqueta: 'Cocina, Oferta especial', descuento_pct: 29 });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].venta.presentacion_productos['producto:1']).toMatchObject({ titulo_comercial: 'Cocina sin esfuerzo', mensaje_comercial: 'Ideal para risottos', insignia_principal: 'Oferta' });
    expect(datosPreview().productos[0].titulo_comercial).toBe('Cocina sin esfuerzo');
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ precio_ancla: 1200000, etiqueta: 'Cocina, Oferta especial' });
  });

  it('permite quitar el ancla guardada, ocultar del inicio y reordenar', () => {
    const confirmar = montar({ seleccion: [{ ...catalogo.productos[0], precio_ancla: 1200000, etiqueta: 'Oferta' }, catalogo.productos[1]] });
    const fila = screen.getByRole('listitem', { name: 'Presentación de Cacerola' });
    expect(within(fila).getByLabelText('Precio ancla')).toHaveValue('Gs 1.200.000');
    fireEvent.change(within(fila).getByLabelText('Precio ancla'), { target: { value: '' } });
    fireEvent.change(within(fila).getByLabelText('Etiquetas para filtrar (separadas por coma)'), { target: { value: '' } });
    fireEvent.click(within(fila).getByLabelText('Mostrar en inicio'));
    fireEvent.click(within(fila).getByRole('button', { name: 'Bajar Cacerola' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].items.map(i => i.id)).toEqual([2, 1]);
    expect(confirmar.mock.calls[0][0].items[1]).toMatchObject({ precio_ancla: null, etiqueta: '', mostrar_en_inicio: false });
    expect(datosPreview().productos[1].precio_antes).toBe(900000);
  });

  it('guarda controles visibles y ajustes por producto sin cerrar una regla dinámica', () => {
    const confirmar = montar({ venta: { seleccion: 'todos', configurado: true }, seleccion: [] });
    const fila = screen.getByRole('listitem', { name: 'Presentación de Olla' });
    fireEvent.change(within(fila).getByLabelText('Precio ancla'), { target: { value: '1300000' } });
    fireEvent.click(screen.getByLabelText('Marca', { exact: true }));
    fireEvent.click(screen.getByLabelText('Buscador', { exact: true }));
    expect(datosPreview().venta.catalogo_filtros).toEqual({ marca: false, buscador: false });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].venta.seleccion).toBe('todos');
    expect(confirmar.mock.calls[0][0].items).toHaveLength(1);
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ id: 2, precio_ancla: 1300000 });
  });
});
