import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

function abrirFichaProducto(nombre) {
  fireEvent.click(screen.getByRole('tab', { name: 'Fichas de producto' }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(nombre) }));
}

describe('Presentación de los productos del lienzo', () => {
  it('actualiza ancla y etiquetas en el preview y guarda los mismos valores', async () => {
    const confirmar = montar();
    abrirFichaProducto('Cacerola');
    fireEvent.change(screen.getByLabelText('Precio ancla'), { target: { value: '1200000' } });
    fireEvent.change(screen.getByLabelText('Etiquetas para filtrar (separadas por coma)'), { target: { value: 'Cocina, Oferta especial' } });
    fireEvent.change(screen.getByLabelText('Título comercial'), { target: { value: 'Cocina sin esfuerzo' } });
    fireEvent.change(screen.getByLabelText('Mensaje corto'), { target: { value: 'Ideal para risottos' } });
    fireEvent.change(screen.getByLabelText('Insignia principal'), { target: { value: 'Oferta' } });
    expect(datosPreview().productos[0]).toMatchObject({ precio: 850000, precio_antes: 1200000, etiqueta: 'Cocina, Oferta especial', descuento_pct: 29 });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].venta.presentacion_productos['producto:1']).toMatchObject({ titulo_comercial: 'Cocina sin esfuerzo', mensaje_comercial: 'Ideal para risottos', insignia_principal: 'Oferta' });
    expect(datosPreview().productos[0].titulo_comercial).toBe('Cocina sin esfuerzo');
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ precio_ancla: 1200000, etiqueta: 'Cocina, Oferta especial' });
  });

  it('marca etiquetas comerciales, badge y fecha de oferta desde la ficha', () => {
    const confirmar = montar();
    abrirFichaProducto('Cacerola');
    fireEvent.click(screen.getByRole('button', { name: 'Oferta' }));
    fireEvent.change(screen.getByLabelText('Precio ancla'), { target: { value: '1200000' } });
    fireEvent.change(screen.getByLabelText('Fecha fin de oferta'), { target: { value: '2026-10-20T14:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));

    const payload = confirmar.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ precio_ancla: 1200000, etiqueta: 'Oferta' });
    expect(payload.venta.presentacion_productos['producto:1']).toMatchObject({ insignia_principal: 'Oferta' });
    expect(payload.venta.urgencia).toMatchObject({ activo: true, productos: ['cacerola'], producto_id: 'cacerola' });
    expect(payload.venta.urgencia.fin_at).toBe(new Date('2026-10-20T14:30').toISOString());
  });

  it('abre la edición completa de promo desde la sección de productos', () => {
    const confirmar = montar();
    fireEvent.click(screen.getAllByRole('tab', { name: 'Productos' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar precio, descuento y badges' })[0]);

    fireEvent.change(screen.getByLabelText('Precio ancla'), { target: { value: '1200000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Oferta' }));
    fireEvent.change(screen.getByLabelText('Fecha fin de oferta'), { target: { value: '2026-10-21T09:00' } });
    fireEvent.change(screen.getByLabelText('Insignia principal'), { target: { value: 'Hot sale' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));

    const payload = confirmar.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ precio_ancla: 1200000, etiqueta: 'Oferta' });
    expect(payload.venta.presentacion_productos['producto:1']).toMatchObject({ insignia_principal: 'Hot sale' });
    expect(payload.venta.urgencia.productos).toContain('cacerola');
    expect(payload.venta.urgencia.fin_at).toBe(new Date('2026-10-21T09:00').toISOString());
  });

  it('permite quitar el ancla guardada y ocultar del inicio desde la ficha', () => {
    const confirmar = montar({ seleccion: [{ ...catalogo.productos[0], precio_ancla: 1200000, etiqueta: 'Oferta' }, catalogo.productos[1]] });
    abrirFichaProducto('Cacerola');
    expect(screen.getByLabelText('Precio ancla')).toHaveValue('Gs 1.200.000');
    fireEvent.change(screen.getByLabelText('Precio ancla'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Etiquetas para filtrar (separadas por coma)'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Mostrar en inicio'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].items.map(i => i.id)).toEqual([1, 2]);
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ precio_ancla: null, etiqueta: '', mostrar_en_inicio: false });
    expect(datosPreview().productos[0].precio_antes).toBe(900000);
  });

  it('mantiene y guarda banners aunque exista inicio_comercial viejo vacío', () => {
    const confirmar = montar({
      venta: {
        seleccion: 'manual',
        configurado: true,
        inicio_comercial: { banners: [] },
        inicio: { banners: [{ id: 'hero-1', activo: true, titulo: 'Banner guardado', imagen: 'https://cdn.test/banner-viejo.webp' }] },
      },
      seleccion: catalogo.productos,
    });

    expect(datosPreview().venta.inicio.banners[0]).toMatchObject({ titulo: 'Banner guardado', imagen: 'https://cdn.test/banner-viejo.webp' });
    // El bloque "Banner principal" ahora vive colapsado dentro de "Bloques
    // del Inicio" — hay que abrirlo antes de tocar sus campos.
    fireEvent.click(screen.getByRole('button', { name: 'Banner principal' }));
    fireEvent.change(screen.getAllByLabelText('URL del medio')[0], { target: { value: 'https://cdn.test/banner-nuevo.webp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));

    const ventaGuardada = confirmar.mock.calls[0][0].venta;
    expect(ventaGuardada.inicio.banners[0]).toMatchObject({ titulo: 'Banner guardado', imagen: 'https://cdn.test/banner-nuevo.webp' });
    expect(ventaGuardada.inicio_comercial.banners).toEqual(ventaGuardada.inicio.banners);
  });
  it('guarda ajustes por producto sin cerrar una regla dinámica', () => {
    const confirmar = montar({ venta: { seleccion: 'todos', configurado: true }, seleccion: [] });
    abrirFichaProducto('Olla');
    fireEvent.change(screen.getByLabelText('Precio ancla'), { target: { value: '1300000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].venta.seleccion).toBe('todos');
    expect(confirmar.mock.calls[0][0].items).toHaveLength(1);
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ id: 2, precio_ancla: 1300000 });
  });
});
