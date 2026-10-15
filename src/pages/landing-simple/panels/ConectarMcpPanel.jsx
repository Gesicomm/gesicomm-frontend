import React, { useState } from 'react';
import {
  Bot,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Cpu,
  Code2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { landingSimpleService } from '../../../services/landingSimpleService';
import { apiBaseURL } from '../../../utils/apiBase';

export default function ConectarMcpPanel({ tienda, landing, onSincronizar }) {
  const [token, setToken] = useState('');
  const [cargandoToken, setCargandoToken] = useState(false);
  const [copiado, setCopiado] = useState('');
  const [error, setError] = useState('');
  const [tabCliente, setTabCliente] = useState('claude'); // 'claude' | 'desktop' | 'codex' | 'codex-desktop'
  const [sincronizando, setSincronizando] = useState(false);
  const [modoDev, setModoDev] = useState(false);

  const landingId = landing?.id || '';
  const tiendaId = tienda?.id || landing?.tienda_id || '';
  const apiUrl = (() => {
    const base = apiBaseURL();
    if (base && base.startsWith('http')) return base;
    return window.location.origin ? `${window.location.origin}/api` : 'http://localhost:5000/api';
  })();
  const mcpLocalPath = 'C:/Proyectos/Gesicom/packages/gesicomm-mcp/bin/cli.js';

  async function handleGenerarToken() {
    setError('');
    setCargandoToken(true);
    try {
      const res = await landingSimpleService.generarTokenMCP(tiendaId);
      if (res?.token) {
        setToken(res.token);
      } else {
        setError('No se pudo generar el token.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al conectar con el servidor.');
    } finally {
      setCargandoToken(false);
    }
  }

  function copiarTexto(texto, clave) {
    if (!texto) return;
    navigator.clipboard?.writeText(texto).then(() => {
      setCopiado(clave);
      setTimeout(() => setCopiado(''), 2500);
    }).catch(() => {
      setError('No se pudo copiar al portapapeles.');
    });
  }

  async function handleSincronizar() {
    if (!onSincronizar) return;
    setSincronizando(true);
    try {
      await onSincronizar();
    } finally {
      setTimeout(() => setSincronizando(false), 600);
    }
  }

  const comandoClaude = modoDev
    ? `claude mcp add gesicomm node ${mcpLocalPath} -e GESICOMM_API_URL=${apiUrl} -e GESICOMM_TOKEN=${token || '<TU_TOKEN>'} -e GESICOMM_LANDING_ID=${landingId}`
    : `claude mcp add gesicomm npx -y gesicomm-mcp -e GESICOMM_API_URL=${apiUrl} -e GESICOMM_TOKEN=${token || '<TU_TOKEN>'} -e GESICOMM_LANDING_ID=${landingId}`;

  const comandoCodex = modoDev
    ? `codex mcp add gesicomm --env GESICOMM_API_URL=${apiUrl} --env GESICOMM_TOKEN=${token || '<TU_TOKEN>'} --env GESICOMM_LANDING_ID=${landingId} -- node ${mcpLocalPath}`
    : `codex mcp add gesicomm --env GESICOMM_API_URL=${apiUrl} --env GESICOMM_TOKEN=${token || '<TU_TOKEN>'} --env GESICOMM_LANDING_ID=${landingId} -- npx -y gesicomm-mcp`;

  const jsonDesktop = JSON.stringify({
    mcpServers: {
      gesicomm: {
        command: modoDev ? 'node' : 'npx',
        args: modoDev ? [mcpLocalPath] : ['-y', 'gesicomm-mcp'],
        env: {
          GESICOMM_API_URL: apiUrl,
          GESICOMM_TOKEN: token || '<TU_TOKEN>',
          GESICOMM_LANDING_ID: String(landingId),
        },
      },
    },
  }, null, 2);

  const tomlCodexDesktop = modoDev
    ? `[mcp_servers.gesicomm]
command = "node"
args = ["${mcpLocalPath}"]
enabled = true

[mcp_servers.gesicomm.env]
GESICOMM_API_URL = "${apiUrl}"
GESICOMM_TOKEN = "${token || '<TU_TOKEN>'}"
GESICOMM_LANDING_ID = "${landingId}"`
    : `[mcp_servers.gesicomm]
command = "npx"
args = ["-y", "gesicomm-mcp"]
enabled = true

[mcp_servers.gesicomm.env]
GESICOMM_API_URL = "${apiUrl}"
GESICOMM_TOKEN = "${token || '<TU_TOKEN>'}"
GESICOMM_LANDING_ID = "${landingId}"`;

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 text-fg shadow-sm">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-fg text-base flex items-center gap-2">
              Conexión MCP con Claude & Codex
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success border border-success/30">
                Oficial
              </span>
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Conectá tu asistente externo por Model Context Protocol para crear y editar landings respetando pedidos, carrito y píxeles.
            </p>
          </div>
        </div>

        {onSincronizar && (
          <button
            type="button"
            onClick={handleSincronizar}
            disabled={sincronizando}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:border-border-strong disabled:opacity-50"
            title="Recargar vista previa si la IA ya guardó cambios"
          >
            <RefreshCw size={13} className={sincronizando ? 'animate-spin text-primary' : ''} />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar preview'}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger font-medium">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Paso 1: Token */}
      <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">1 · Token de Autenticación MCP</span>
          {token && (
            <span className="flex items-center gap-1 text-[11px] text-success font-medium">
              <CheckCircle2 size={13} /> Token generado (30 días)
            </span>
          )}
        </div>

        {!token ? (
          <div>
            <p className="text-xs text-fg-muted mb-3 leading-relaxed">
              Generá tu token seguro para que Claude o Codex puedan interactuar con esta landing en tu nombre.
            </p>
            <button
              type="button"
              onClick={handleGenerarToken}
              disabled={cargandoToken}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              <Sparkles size={14} />
              {cargandoToken ? 'Generando token...' : 'Generar Token de Acceso MCP'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="password"
              readOnly
              value={token}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg select-all"
            />
            <button
              type="button"
              onClick={() => copiarTexto(token, 'token')}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-fg hover:border-border-strong"
            >
              {copiado === 'token' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              {copiado === 'token' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {/* Paso 2: Conectar con tu cliente */}
      <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">2 · Conectar con tu Asistente</span>

        {/* Selector de Cliente */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setTabCliente('claude')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tabCliente === 'claude'
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <Terminal size={13} /> Claude Code (CLI)
          </button>
          <button
            type="button"
            onClick={() => setTabCliente('desktop')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tabCliente === 'desktop'
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <Code2 size={13} /> Claude Desktop
          </button>
          <button
            type="button"
            onClick={() => setTabCliente('codex')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tabCliente === 'codex'
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <Terminal size={13} /> OpenAI Codex (CLI)
          </button>
          <button
            type="button"
            onClick={() => setTabCliente('codex-desktop')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tabCliente === 'codex-desktop'
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <Bot size={13} /> Codex Desktop
          </button>
        </div>

        {tabCliente === 'claude' && (
          <div className="space-y-2">
            <p className="text-xs text-fg-muted">Ejecutá este comando en tu terminal para registrar el servidor MCP en Claude Code:</p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-xs text-fg whitespace-pre-wrap break-all">
                {comandoClaude}
              </pre>
              <button
                type="button"
                onClick={() => copiarTexto(comandoClaude, 'claude')}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-1 text-[11px] font-semibold text-fg hover:border-border-strong"
              >
                {copiado === 'claude' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copiado === 'claude' ? 'Copiado' : 'Copiar comando'}
              </button>
            </div>
          </div>
        )}

        {tabCliente === 'codex' && (
          <div className="space-y-2">
            <p className="text-xs text-fg-muted">Ejecutá este comando en tu terminal para registrar el servidor MCP en OpenAI Codex:</p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-xs text-fg whitespace-pre-wrap break-all">
                {comandoCodex}
              </pre>
              <button
                type="button"
                onClick={() => copiarTexto(comandoCodex, 'codex')}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-1 text-[11px] font-semibold text-fg hover:border-border-strong"
              >
                {copiado === 'codex' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copiado === 'codex' ? 'Copiado' : 'Copiar comando'}
              </button>
            </div>
          </div>
        )}

        {tabCliente === 'desktop' && (
          <div className="space-y-2">
            <p className="text-xs text-fg-muted">Pegá esta configuración dentro de tu archivo <code className="text-primary font-mono text-[11px]">claude_desktop_config.json</code>:</p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-xs text-fg whitespace-pre-wrap">
                {jsonDesktop}
              </pre>
              <button
                type="button"
                onClick={() => copiarTexto(jsonDesktop, 'desktop')}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-1 text-[11px] font-semibold text-fg hover:border-border-strong"
              >
                {copiado === 'desktop' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copiado === 'desktop' ? 'Copiado' : 'Copiar JSON'}
              </button>
            </div>
          </div>
        )}

        {tabCliente === 'codex-desktop' && (
          <div className="space-y-2">
            <p className="text-xs text-fg-muted">
              Pegá esta configuración en tu archivo <code className="text-primary font-mono text-[11px]">~/.codex/config.toml</code> (en Windows: <code className="text-primary font-mono text-[11px]">%USERPROFILE%\.codex\config.toml</code>), o agregalo en la app desde <strong>Settings › MCP Servers</strong>:
            </p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-xs text-fg whitespace-pre-wrap">
                {tomlCodexDesktop}
              </pre>
              <button
                type="button"
                onClick={() => copiarTexto(tomlCodexDesktop, 'codex-desktop')}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-1 text-[11px] font-semibold text-fg hover:border-border-strong"
              >
                {copiado === 'codex-desktop' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copiado === 'codex-desktop' ? 'Copiado' : 'Copiar TOML'}
              </button>
            </div>
            <p className="text-[11px] text-fg-muted flex items-center gap-1">
              <Sparkles size={12} className="text-primary" />
              <span>Tip: Si ya ejecutaste el comando de la pestaña <strong>OpenAI Codex (CLI)</strong>, Codex Desktop lo sincroniza automáticamente.</span>
            </p>
          </div>
        )}

        {/* Toggle para desarrollo local vs comando npx universal */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <p className="text-[11px] text-fg-muted">
            ⚡ Se ejecuta con <strong>npx</strong> directamente en cualquier computadora (Windows, Mac, Linux).
          </p>
          <button
            type="button"
            onClick={() => setModoDev(d => !d)}
            className="text-[11px] text-fg-muted hover:text-fg underline ml-auto shrink-0"
          >
            {modoDev ? 'Cambiar a comando universal (npx)' : 'Ver comando con ruta local de archivo'}
          </button>
        </div>
      </div>

      {/* Qué pedirle a la IA */}
      <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
        <h4 className="text-xs font-bold text-success flex items-center gap-1.5 uppercase tracking-wide">
          <ShieldCheck size={15} /> ¿Qué le podés pedir una vez conectado?
        </h4>
        <p className="text-xs text-fg-muted leading-relaxed">
          Claude y Codex tienen acceso a tus productos, fotos y al motor comercial. Podes decirles por ejemplo:
        </p>
        <ul className="text-xs space-y-1.5 text-fg/80">
          <li className="flex items-start gap-2">
            <span className="text-success font-bold font-mono">›</span>
            <span><em>"Claude, leé el contexto de mi landing con gesicomm_obtener_contexto_landing y diseñá un hero impactante para el producto estrella."</em></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success font-bold font-mono">›</span>
            <span><em>"Codex, agregá un selector de variantes táctil y un bloque de Order Bump usando data-gesicomm-bump, y guardalo en la landing."</em></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success font-bold font-mono">›</span>
            <span><em>"Armame una sección de testimonios y un comparador antes/después mobile-first con estilos modernos y guardalo con gesicomm_guardar_codigo_landing."</em></span>
          </li>
        </ul>
      </div>
    </div>
  );
}
