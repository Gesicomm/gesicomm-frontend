import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/ofertaService', () => ({ ofertaService: { listarTodas: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: () => null }));

afterEach(cleanup);

// HTML tal como lo deja el backend (mcpBloques.identificar) cuando la IA
// marcó solo encabezado, productos y footer: las secciones sin marca ahora
// salen como bloque_N y el editor las puede mover.
const html = '<header data-gesicomm-bloque="encabezado">Logo</header>'
  + '<section class="hero" data-gesicomm-bloque="bloque_1">Hero</section>'
  + '<section data-gesicomm-bloque="productos_categoria"><button data-gesicomm-comprar>Comprar</button></section>'
  + '<section data-gesicomm-bloque="bloque_2">Historia</section>'
  + '<footer data-gesicomm-bloque="footer">Pie</footer>';

it('una página creada por MCP muestra todas sus secciones y deja arrastrarlas', () => {
  const codigo = { html, css: '', js: '', generado_por_mcp: true };
  // Lo que guarda guardarCodigo del MCP en venta.inicio.bloques.
  const venta = { inicio: { bloques: [{ tipo: 'bloque_1', visible: true }, { tipo: 'productos_categoria', visible: true }, { tipo: 'bloque_2', visible: true }] } };
  render(<ConfigurarVentaCodigo
    catalogo={{ productos: [], combos: [] }} inicial={{ seleccion: [], venta }}
    landing={{ id: 141, content: { generado_por_ia: true, origen: 'mcp', bloques_inicio_bloqueados: false, codigo, venta } }}
    codigos={{ inicio: codigo }} onConfirmar={vi.fn()} onVolver={vi.fn()}
    onCambiarCodigo={vi.fn()} onRestaurarCodigo={vi.fn()}
  />);
  for (const etiqueta of ['bloque_1', 'Productos', 'bloque_2']) {
    expect(screen.getByLabelText(`Arrastrar ${etiqueta} para cambiar su lugar`)).toBeTruthy();
  }
  const ordenActual = () => [...fila('bloque_1').parentElement.querySelectorAll(':scope > [data-bloque-inicio]')]
    .sort((a, b) => Number(a.style.order) - Number(b.style.order)).map(e => e.dataset.bloqueInicio);
  const fila = texto => screen.getByLabelText(`Arrastrar ${texto} para cambiar su lugar`).closest('[data-bloque-inicio]');
  expect(ordenActual()).toEqual(['__menu__', 'bloque_1', 'productos_categoria', 'bloque_2', '__footer__']);
  const dt = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '', dropEffect: '' };
  fireEvent.dragStart(screen.getByLabelText('Arrastrar bloque_2 para cambiar su lugar'), { dataTransfer: dt });
  fireEvent.dragOver(fila('bloque_1'), { dataTransfer: dt });
  fireEvent.drop(fila('bloque_1'), { dataTransfer: dt });
  expect(ordenActual()).toEqual(['__menu__', 'bloque_2', 'bloque_1', 'productos_categoria', '__footer__']);
});
