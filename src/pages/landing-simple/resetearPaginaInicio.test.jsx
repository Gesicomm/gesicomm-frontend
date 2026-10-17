import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';
vi.mock('./mcpEditorConfig', () => ({ MCP_EDITOR_HABILITADO: true }));

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: ({ datos }) => <output data-testid="preview-datos">{JSON.stringify(datos)}</output> }));
vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { catalogoPaginado: vi.fn().mockResolvedValue({ productos: [], total: 0, pagina: 1, total_paginas: 1 }) } }));

const catalogo = {
  productos: [
    { tipo: 'producto', id: 1, slug: 'prod-1', nombre: 'Producto 1', categoria: 'Cocina', precio_efectivo: 100000 },
  ],
  combos: [],
};

afterEach(cleanup);

describe('Resetear página de Inicio a plantilla por defecto', () => {
  it('muestra aviso de bloqueo con IA/MCP y permite resetear a la plantilla estándar', () => {
    const onRestaurarCodigo = vi.fn();
    const onCambiarCodigo = vi.fn();
    const landingConIa = {
      id: 240,
      content: {
        generado_por_ia: true,
        origen: 'mcp',
        bloques_inicio_bloqueados: true,
        codigo: { html: '<main>Diseño MCP</main>', css: '', js: '', generado_por_mcp: true },
      },
    };

    render(
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        inicial={{ seleccion: catalogo.productos }}
        landing={landingConIa}
        codigos={{ inicio: { html: '<main>Diseño MCP</main>', css: '', js: '' } }}
        onConfirmar={vi.fn()}
        onVolver={vi.fn()}
        onCambiarCodigo={onCambiarCodigo}
        onRestaurarCodigo={onRestaurarCodigo}
      />
    );

    // Debe mostrar que los bloques están bloqueados por MCP
    expect(screen.getByText(/Bloques estándar bloqueados \(Generada con IA \/ MCP\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resetear página a plantilla por defecto/i })).toBeInTheDocument();

    // Al hacer clic, pide confirmación antes de resetear
    fireEvent.click(screen.getByRole('button', { name: /Resetear página a plantilla por defecto/i }));
    expect(screen.getByText(/¿Confirmás resetear la página a la plantilla por defecto\?/i)).toBeInTheDocument();

    // Confirmar reset
    fireEvent.click(screen.getByRole('button', { name: /Sí, resetear página/i }));

    // Se llaman las funciones para restaurar el código base
    expect(onRestaurarCodigo).toHaveBeenCalledWith('inicio');
    expect(onCambiarCodigo).toHaveBeenCalledWith('inicio', 'html', expect.any(String));

    // El bloqueo desaparece y se desbloquean los bloques estándar
    expect(screen.queryByText(/Bloques estándar bloqueados \(Generada con IA \/ MCP\)/i)).toBeNull();
    expect(screen.getByText(/Página de Inicio reseteada a la plantilla por defecto/i)).toBeInTheDocument();
    expect(screen.getByText(/Barra de anuncios/i)).toBeInTheDocument();
    expect(screen.getByText(/Banner principal/i)).toBeInTheDocument();
  });

  it('permite cancelar el reseteo sin modificar la página', () => {
    const onRestaurarCodigo = vi.fn();
    const landingConIa = {
      id: 240,
      content: {
        generado_por_ia: true,
        origen: 'mcp',
      },
    };

    render(
      <ConfigurarVentaCodigo
        catalogo={catalogo}
        inicial={{ seleccion: catalogo.productos }}
        landing={landingConIa}
        codigos={{ inicio: { html: '<main>Diseño MCP</main>', css: '', js: '' } }}
        onConfirmar={vi.fn()}
        onVolver={vi.fn()}
        onRestaurarCodigo={onRestaurarCodigo}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Resetear página a plantilla por defecto/i }));
    expect(screen.getByText(/¿Confirmás resetear la página a la plantilla por defecto\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onRestaurarCodigo).not.toHaveBeenCalled();
    expect(screen.getByText(/Bloques estándar bloqueados \(Generada con IA \/ MCP\)/i)).toBeInTheDocument();
  });
});
