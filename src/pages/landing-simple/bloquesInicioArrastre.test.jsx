import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorBloquesInicio } from './ConfigurarVentaCodigo';

// Arrastrar y soltar de "Bloques del Inicio": barra de anuncios y
// encabezado fijos arriba, footer fijo al final; el resto se arrastra.
const bloques = [
  { tipo: 'anuncios', visible: true },
  { tipo: 'banner', visible: true },
  { tipo: 'productos_categoria', visible: true },
  { tipo: 'confianza', visible: true },
];

function transferencia() {
  return { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '', dropEffect: '' };
}

function montar(onReordenar = vi.fn()) {
  render(<EditorBloquesInicio bloques={bloques} onReordenar={onReordenar} onAlternar={vi.fn()} paneles={{}} />);
  return onReordenar;
}

describe('Bloques del Inicio — arrastrar y soltar', () => {
  it('barra de anuncios y encabezado arriba y footer al final, fijos y sin manija', () => {
    montar();
    const filas = screen.getAllByText(/^(Barra de anuncios|Encabezado|Banner principal|Productos|Zona de confianza|Footer)$/).map(n => n.textContent);
    expect(filas).toEqual(['Barra de anuncios', 'Encabezado', 'Banner principal', 'Productos', 'Zona de confianza', 'Footer']);
    expect(screen.queryByLabelText(/Arrastrar Barra de anuncios/)).toBeNull();
    expect(screen.queryByLabelText(/Arrastrar Encabezado/)).toBeNull();
    expect(screen.queryByLabelText(/Arrastrar Footer/)).toBeNull();
    expect(screen.getAllByText('Fijo')).toHaveLength(3);
    expect(screen.queryByLabelText('Subir bloque')).toBeNull();
  });

  it('soltar "Zona de confianza" sobre "Banner principal" la pasa al primer lugar movible', () => {
    const onReordenar = montar();
    const dt = transferencia();
    fireEvent.dragStart(screen.getByLabelText(/Arrastrar Zona de confianza/), { dataTransfer: dt });
    const destino = screen.getByText('Banner principal').closest('[data-bloque-inicio]');
    fireEvent.dragOver(destino, { dataTransfer: dt });
    fireEvent.drop(destino, { dataTransfer: dt });
    // Índices dentro de los movibles (sin la barra de anuncios): 2 → 0.
    expect(onReordenar).toHaveBeenCalledWith(2, 0);
  });

  it('soltar sin haber arrastrado un bloque no reordena nada', () => {
    const onReordenar = montar();
    const destino = screen.getByText('Productos').closest('[data-bloque-inicio]');
    fireEvent.drop(destino, { dataTransfer: transferencia() });
    expect(onReordenar).not.toHaveBeenCalled();
  });
  it('muestra la nueva posición antes de soltar y Escape o un destino fijo cancela sin guardar', () => {
    const guardar = montar();
    const origen = screen.getByText('Zona de confianza').closest('[data-bloque-inicio]');
    const destino = screen.getByText('Banner principal').closest('[data-bloque-inicio]');
    const fijo = screen.getByText('Encabezado').closest('[data-bloque-inicio]');
    const asa = screen.getByLabelText(/Arrastrar Zona de confianza/);
    const dt = transferencia();
    const inicial = Number(origen.style.order);
    fireEvent.dragStart(asa, { dataTransfer: dt });
    fireEvent.dragOver(destino, { dataTransfer: dt });
    expect(Number(origen.style.order)).toBeLessThan(Number(destino.style.order));
    expect(guardar).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(Number(origen.style.order)).toBe(inicial);
    fireEvent.dragStart(asa, { dataTransfer: dt });
    fireEvent.dragOver(destino, { dataTransfer: dt });
    fireEvent.dragOver(fijo, { dataTransfer: dt });
    expect(fijo.querySelector('[aria-label="Destino bloqueado"]')).not.toBeNull();
    expect(fijo).not.toHaveClass('border-danger');
    fireEvent.drop(fijo, { dataTransfer: dt });
    expect(guardar).not.toHaveBeenCalled();
    expect(Number(origen.style.order)).toBe(inicial);
  });

  it('arrastra con puntero, muestra el límite junto al cursor y permite volver a un destino válido', () => {
    const guardar = montar();
    const asa = screen.getByLabelText(/Arrastrar Zona de confianza/);
    const destino = screen.getByText('Banner principal').closest('[data-bloque-inicio]');
    const fijo = screen.getByText('Encabezado').closest('[data-bloque-inicio]');
    asa.setPointerCapture = () => {};
    asa.hasPointerCapture = () => false;
    const anterior = document.elementFromPoint;
    const pointer = (tipo, y) => {
      const e = new MouseEvent(tipo, { bubbles: true, cancelable: true, button: 0, clientX: 60, clientY: y });
      Object.defineProperty(e, 'pointerId', { value: 1 });
      fireEvent(asa, e);
    };
    try {
      document.elementFromPoint = () => fijo;
      pointer('pointerdown', 300); pointer('pointermove', 100);
      const fantasma = document.querySelector('[data-arrastre-cabecera]');
      expect(fantasma.dataset.arrastreBloqueado).toBe('true');
      expect(fantasma.querySelector('[data-arrastre-limite]')).toHaveTextContent('🔒');
      expect(fantasma.querySelector('[data-arrastre-limite]').style.width).toBe('26px');
      expect(document.body.style.cursor).toBe('not-allowed');
      document.elementFromPoint = () => destino;
      pointer('pointermove', 150);
      expect(fantasma.dataset.arrastreBloqueado).toBe('false');
      expect(fantasma.querySelector('[data-arrastre-limite]')).not.toBeVisible();
      expect(document.body.style.cursor).toBe('grabbing');
      pointer('pointerup', 150);
      expect(guardar).toHaveBeenCalledWith(2, 0);
      expect(document.querySelector('[data-arrastre-cabecera]')).toBeNull();
    } finally { document.elementFromPoint = anterior; }
  });

  it('vuelve al listado para reordenar y conserva los ajustes al abrir de nuevo', () => {
    function Demo() {
      const [lista, setLista] = useState(bloques);
      return <EditorBloquesInicio bloques={lista} onAlternar={() => {}} menuPanel={<p>Menú</p>}
        paneles={{ confianza: <input aria-label="Dato de confianza" defaultValue="Dato original" /> }}
        onReordenar={(desde, hasta) => setLista(prev => {
          const fijos = prev.filter(b => b.tipo === 'anuncios'), movibles = prev.filter(b => b.tipo !== 'anuncios');
          const [movido] = movibles.splice(desde, 1); movibles.splice(hasta, 0, movido); return [...fijos, ...movibles];
        })} />;
    }
    render(<Demo />);
    fireEvent.click(screen.getByRole('button', { name: 'Zona de confianza', exact: true }));
    fireEvent.change(screen.getByLabelText('Dato de confianza'), { target: { value: 'Dato editado' } });
    expect(screen.getByRole('region', { name: 'Ajustes de Zona de confianza' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Bloques de Inicio' }));
    const dt = transferencia();
    fireEvent.dragStart(screen.getByLabelText(/Arrastrar Zona de confianza/), { dataTransfer: dt });
    const destino = screen.getByText('Banner principal').closest('[data-bloque-inicio]');
    fireEvent.dragOver(destino, { dataTransfer: dt }); fireEvent.drop(destino, { dataTransfer: dt });
    expect(Number(screen.getByRole('button', { name: 'Zona de confianza', exact: true }).closest('[data-bloque-inicio]').style.order)).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Zona de confianza', exact: true }));
    expect(screen.getByLabelText('Dato de confianza')).toHaveValue('Dato editado');
  });

  it('sincroniza la selección del listado y la selección recibida desde el lienzo', () => {
    const seleccionar = vi.fn();
    const props = { bloques, onAlternar: vi.fn(), onReordenar: vi.fn(), onSeleccionar: seleccionar,
      paneles: { confianza: <p>Ajustes de confianza</p>, banner: <p>Ajustes del banner</p> } };
    const { rerender } = render(<EditorBloquesInicio {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zona de confianza', exact: true }));
    expect(seleccionar).toHaveBeenLastCalledWith('confianza');
    expect(screen.queryByRole('button', { name: 'Banner principal', exact: true })).toBeNull();
    rerender(<EditorBloquesInicio {...props} bloqueAbierto={{ clave: 'banner', n: 1 }} />);
    expect(screen.getByRole('region', { name: 'Ajustes de Banner principal' })).toBeVisible();
    expect(seleccionar).toHaveBeenLastCalledWith('banner');
    fireEvent.click(screen.getByRole('button', { name: 'Bloques de Inicio' }));
    expect(seleccionar).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('button', { name: 'Zona de confianza', exact: true })).toBeVisible();
  });

});
