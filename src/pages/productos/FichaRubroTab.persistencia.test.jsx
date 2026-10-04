import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FichaRubroTab from './FichaRubroTab';
import { ofertaService } from '../../services/ofertaService';
import BazarProductPage from '../landing-simple/templates/bazar/BazarProductPage';
import ModaProductPage from '../landing-simple/templates/moda/ModaProductPage';
import { resolverFichaBazar } from '../landing-simple/templates/bazar/fichaBazar';
import { resolverFichaModa } from '../landing-simple/templates/moda/fichaModa';
import { armarItemFicha } from '../landing-simple/templates/fichaComun';

vi.mock('../../services/ofertaService', () => ({ ofertaService: { listarPorProducto: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => ofertaService.listarPorProducto.mockReset().mockResolvedValue([
  { id: 91, nombre: 'Pack QA', estrategia: 'normal', activo: true },
  { id: 92, nombre: 'Bump QA', estrategia: 'order_bump', activo: true },
]));

const casos = [['bazar', BazarProductPage, resolverFichaBazar], ['moda', ModaProductPage, resolverFichaModa]];
describe.each(casos)('Persistencia de ficha %s', (rubro, Page, resolver) => {
  it('mantiene notas distintas de variantes nuevas cuando reciben IDs y las muestra en la ficha', () => {
    let guardado;
    function Editor({ variantes }) {
      const [datos, setDatos] = useState({});
      return <FichaRubroTab rubro={rubro} datos={datos} variantes={variantes} modo="campos" onDatos={nuevos => { guardado = nuevos; setDatos(nuevos); }} />;
    }
    const nuevas = [{ valores: [{ opcion: 'Color', valor: 'Arena QA' }] }, { valores: [{ opcion: 'Color', valor: 'Oliva QA' }] }];
    const persistidas = nuevas.map((variante, i) => ({ ...variante, nombre: variante.valores[0].valor, id: 71 + i, stock: 3, precio: 10000 }));
    const panel = render(<MemoryRouter><Editor variantes={nuevas} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^3\s*Encabezado y compra/ }));
    const notas = screen.getAllByPlaceholderText('Nota (ej: Ideal para probar)');
    fireEvent.change(notas[0], { target: { value: 'Nota Arena QA' } });
    fireEvent.change(notas[1], { target: { value: 'Nota Oliva QA' } });
    panel.rerender(<MemoryRouter><Editor variantes={persistidas} /></MemoryRouter>);
    expect(screen.getByDisplayValue('Nota Arena QA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nota Oliva QA')).toBeInTheDocument();
    panel.unmount();
    const ficha = resolver(guardado[rubro + '_ficha'], null, null);
    render(<MemoryRouter><Page item={armarItemFicha({ nombre: 'Producto QA', precio: 10000, variantes: persistidas })} ficha={ficha} /></MemoryRouter>);
    expect(screen.getByText('Nota Arena QA')).toBeInTheDocument();
    expect(screen.getByText('Nota Oliva QA')).toBeInTheDocument();
  });

  it('refresca los paquetes al volver a Vista del producto', async () => {
    ofertaService.listarPorProducto.mockResolvedValueOnce([]);
    const props = { rubro, datos: {}, productoId: 7, modo: 'campos', onDatos: vi.fn() };
    const panel = render(<MemoryRouter><FichaRubroTab {...props} activo /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^3\s*Encabezado y compra/ }));
    expect(await screen.findByText(/Sin paquetes/)).toBeInTheDocument();
    panel.rerender(<MemoryRouter><FichaRubroTab {...props} activo={false} /></MemoryRouter>);
    panel.rerender(<MemoryRouter><FichaRubroTab {...props} activo /></MemoryRouter>);
    expect(await screen.findByText('Pack QA')).toBeInTheDocument();
    expect(ofertaService.listarPorProducto).toHaveBeenCalledTimes(2);
  });

  it('carga los paquetes guardados y permite editar sus notas sin incluir bumps', async () => {
    render(<MemoryRouter><FichaRubroTab rubro={rubro} datos={{}} productoId={7} modo="campos" onDatos={vi.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^3\s*Encabezado y compra/ }));
    expect(await screen.findByText('Pack QA')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nota (vacío = el % de ahorro)')).toBeInTheDocument();
    expect(screen.queryByText('Bump QA')).not.toBeInTheDocument();
    expect(ofertaService.listarPorProducto).toHaveBeenCalledWith(7, { soloActivas: true });
  });
});
