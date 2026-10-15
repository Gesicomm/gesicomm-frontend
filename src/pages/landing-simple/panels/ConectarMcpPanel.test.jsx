import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConectarMcpPanel from './ConectarMcpPanel';
import { landingSimpleService } from '../../../services/landingSimpleService';

vi.mock('../../../services/landingSimpleService', () => ({
  landingSimpleService: {
    generarTokenMCP: vi.fn(),
  },
}));

describe('ConectarMcpPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza título, descripción y botones de cliente', () => {
    render(<ConectarMcpPanel tienda={{ id: 5 }} landing={{ id: 12 }} />);

    expect(screen.getByText(/Conexión MCP con Claude & Codex/i)).toBeInTheDocument();
    expect(screen.getByText(/Claude Code \(CLI\)/i)).toBeInTheDocument();
    expect(screen.getByText(/OpenAI Codex \(CLI\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Claude Desktop/i)).toBeInTheDocument();
    expect(screen.getByText(/Codex Desktop/i)).toBeInTheDocument();
  });

  it('permite generar un token y muestra el comando con el token', async () => {
    landingSimpleService.generarTokenMCP.mockResolvedValueOnce({
      ok: true,
      token: 'jwt_mock_token_12345',
      tiendaId: 5,
    });

    render(<ConectarMcpPanel tienda={{ id: 5 }} landing={{ id: 12 }} />);

    const botonGenerar = screen.getByRole('button', { name: /Generar Token de Acceso MCP/i });
    fireEvent.click(botonGenerar);

    await waitFor(() => {
      expect(landingSimpleService.generarTokenMCP).toHaveBeenCalledWith(5);
      expect(screen.getByText(/Token generado/i)).toBeInTheDocument();
    });

    // Debe incluir el token generado en el comando de Claude
    expect(screen.getByText(/jwt_mock_token_12345/i)).toBeInTheDocument();
  });

  it('cambia entre clientes (Claude, Codex, Claude Desktop, Codex Desktop)', () => {
    render(<ConectarMcpPanel tienda={{ id: 5 }} landing={{ id: 12 }} />);

    const tabCodex = screen.getByRole('button', { name: /OpenAI Codex \(CLI\)/i });
    fireEvent.click(tabCodex);

    expect(screen.getByText(/codex mcp add gesicomm/i)).toBeInTheDocument();

    const tabDesktop = screen.getByRole('button', { name: /Claude Desktop/i });
    fireEvent.click(tabDesktop);

    expect(screen.getByText(/claude_desktop_config\.json/i)).toBeInTheDocument();

    const tabCodexDesktop = screen.getByRole('button', { name: /Codex Desktop/i });
    fireEvent.click(tabCodexDesktop);

    expect(screen.getAllByText(/config\.toml/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\[mcp_servers\.gesicomm\]/i)).toBeInTheDocument();
  });

  it('llama a onSincronizar al presionar el botón de sincronización', async () => {
    const onSincronizarMock = vi.fn().mockResolvedValueOnce();

    render(<ConectarMcpPanel tienda={{ id: 5 }} landing={{ id: 12 }} onSincronizar={onSincronizarMock} />);

    const botonSync = screen.getByRole('button', { name: /Sincronizar preview/i });
    fireEvent.click(botonSync);

    await waitFor(() => {
      expect(onSincronizarMock).toHaveBeenCalledTimes(1);
    });
  });
});
