import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/ofertaService', () => ({ ofertaService: { listarTodas: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: () => null }));

afterEach(cleanup);

it('una landing MCP existente permite editar los bloques y no ofrece conexiones MCP', () => {
  const codigo = { html: '<main>Diseño existente</main>', css: '', js: '', generado_por_mcp: true };
  render(<ConfigurarVentaCodigo
    catalogo={{ productos: [], combos: [] }} inicial={{ seleccion: [] }}
    landing={{ id: 140, content: { generado_por_ia: true, origen: 'mcp', bloques_inicio_bloqueados: true, codigo } }}
    codigos={{ inicio: codigo }} onConfirmar={vi.fn()} onVolver={vi.fn()}
    onCambiarCodigo={vi.fn()} onRestaurarCodigo={vi.fn()}
  />);
  expect(screen.queryByText(/Bloques estándar bloqueados/)).toBeNull();
  expect(screen.queryByRole('button', { name: /Conectar MCP/ })).toBeNull();
  expect(screen.getByRole('button', { name: 'Banner principal', exact: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Productos', exact: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Guardar', exact: true }).disabled).toBe(false);
});
