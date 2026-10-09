import React from 'react';
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
});
