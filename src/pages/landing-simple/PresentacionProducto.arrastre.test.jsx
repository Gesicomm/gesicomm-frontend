import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PresentacionProducto from './PresentacionProducto';

afterEach(cleanup);
function Demo({ guardar }) {
  const [item, setItem] = useState({ id: 1, tipo: 'producto', nombre: 'Cacerola', precio: 150000 });
  return <PresentacionProducto item={item} onCambiar={(clave, valor) => {
    guardar(clave, valor); setItem(p => ({ ...p, [clave]: valor }));
  }} />;
}
const bloque = clave => document.querySelector(`[data-bloque-ficha="${clave}"]`);
it('producto comparte el orden provisional animado y guarda al soltar sin separar precio y badge', () => {
  const guardar = vi.fn();
  render(<Demo guardar={guardar} />);
  const asa = screen.getByLabelText('Arrastrar Oferta por tiempo limitado para ordenar');
  const drag = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
  const inicial = Number(bloque('oferta').style.order);
  fireEvent.dragStart(asa, { dataTransfer: drag });
  fireEvent.dragOver(bloque('precio'), { dataTransfer: drag });
  expect(Number(bloque('oferta').style.order)).toBeLessThan(Number(bloque('precio').style.order));
  expect(guardar).not.toHaveBeenCalled();
  fireEvent.dragEnd(asa);
  expect(Number(bloque('oferta').style.order)).toBe(inicial);
  fireEvent.dragStart(asa, { dataTransfer: drag });
  fireEvent.dragOver(bloque('precio'), { dataTransfer: drag });
  fireEvent.drop(bloque('precio'), { dataTransfer: drag });
  const [clave, orden] = guardar.mock.calls[0];
  expect(clave).toBe('ficha_orden_mobile');
  expect(orden.indexOf('oferta')).toBeLessThan(orden.indexOf('precio'));
  expect(orden[orden.indexOf('precio') + 1]).toBe('badge_precio');
});
it('producto cancela el movimiento entre grupos y mantiene fija la galería', () => {
  const guardar = vi.fn();
  render(<Demo guardar={guardar} />);
  const asa = screen.getByLabelText('Arrastrar Oferta por tiempo limitado para ordenar');
  const drag = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
  const inicial = Number(bloque('oferta').style.order);
  fireEvent.dragStart(asa, { dataTransfer: drag });
  fireEvent.dragOver(bloque('confianza'), { dataTransfer: drag });
  fireEvent.drop(bloque('confianza'), { dataTransfer: drag });
  expect(guardar).not.toHaveBeenCalled();
  expect(Number(bloque('oferta').style.order)).toBe(inicial);
  expect(bloque('galeria').querySelector('[draggable="true"]')).toBeNull();
});
