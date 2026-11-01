import React, { useEffect, useState } from 'react';
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

export default function ConectarMcpPanel({ tienda, landing, onSincronizar, modoProductos = false }) {
  const [token, setToken] = useState('');
  const [cargandoToken, setCargandoToken] = useState(false);
  const [copiado, setCopiado] = useState('');
  const [error, setError] = useState('');
  const [tabCliente, setTabCliente] = useState('generico');
  const [sincronizando, setSincronizando] = useState(false);
  const [conexion, setConexion] = useState({ cargando: true, conectada: false });

  const landingId = landing?.id || '';
  const tiendaId = tienda?.id || landing?.tienda_id || '';
  useEffect(() => {
    let activo = true;
    let timer;
    const consultar = async () => {
      try {
        const estado = await landingSimpleService.estadoConexionMCP();
        if (!activo) return;
        const conectada = Boolean(estado.conectada);
        setConexion({ cargando: false, conectada });
        if (!conectada) timer = window.setTimeout(consultar, 10000);
      } catch {
        if (!activo) return;
        setConexion({ cargando: false, conectada: false });
        timer = window.setTimeout(consultar, 10000);
      }
    };
    consultar();
    return () => { activo = false; window.clearTimeout(timer); };
  }, []);
  const apiUrl = (() => {
    const base = apiBaseURL();
    if (base && base.startsWith('http')) return base;
    return window.location.origin ? `${window.location.origin}/api` : 'http://localhost:5000/api';
  })();

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

  const paquete = new URL('/conectores/gesicomm-mcp-1.2.1.tgz', window.location.origin).href;
  const comandoClaude = `claude mcp add gesicomm -e GESICOMM_API_URL=${apiUrl} -e GESICOMM_TOKEN=${token || '<TU_TOKEN>'}${landingId ? ` -e GESICOMM_LANDING_ID=${landingId}` : ''} -- npx -y ${paquete}`;
  const comandoCodex = `codex mcp add gesicomm --env GESICOMM_API_URL=${apiUrl} --env GESICOMM_TOKEN=${token || '<TU_TOKEN>'}${landingId ? ` --env GESICOMM_LANDING_ID=${landingId}` : ''} -- npx -y ${paquete}`;

  const jsonDesktop = JSON.stringify({
    mcpServers: {
      gesicomm: {
        command: 'npx',
        args: ['-y', paquete],
        env: {
          GESICOMM_API_URL: apiUrl,
          GESICOMM_TOKEN: token || '<TU_TOKEN>',
          ...(landingId ? { GESICOMM_LANDING_ID: String(landingId) } : {}),
        },
      },
    },
  }, null, 2);

  const tomlCodexDesktop = `[mcp_servers.gesicomm]
command = "npx"
args = ["-y", "${paquete}"]
enabled = true

[mcp_servers.gesicomm.env]
GESICOMM_API_URL = "${apiUrl}"
GESICOMM_TOKEN = "${token || '<TU_TOKEN>'}"${landingId ? `\nGESICOMM_LANDING_ID = "${landingId}"` : ''}`;

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 text-fg shadow-sm">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-text">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-fg text-base flex items-center gap-2">
              Conectar una IA por MCP
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[13px] font-medium text-success border border-success/30">
                Oficial
              </span>
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] font-semibold ${conexion.conectada ? 'border-success/40 bg-success/10 text-success' : 'border-border bg-surface-2 text-fg-muted'}`} role="status">
              {conexion.conectada ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {conexion.cargando ? 'Consultando conexión…' : conexion.conectada ? 'Conexión verificada' : 'Sin conectar · opcional'}
            </span>
            <p className="text-base text-fg-muted mt-0.5">
              {modoProductos ? 'Compartí las fotos con tu asistente y pedile que prepare la ficha. Una vez guardada, la vas a encontrar en tu catálogo.' : 'Conectá tu asistente para crear y editar tu e-commerce.'}
            </p>
          </div>
        </div>

        {onSincronizar && (
          <button
            type="button"
            onClick={handleSincronizar}
            disabled={sincronizando}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-fg hover:border-border-strong disabled:opacity-50"
            title="Recargar vista previa si la IA ya guardó cambios"
          >
            <RefreshCw size={13} className={sincronizando ? 'animate-spin text-primary-text' : ''} />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar preview'}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger font-medium">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Paso 1: Token */}
      <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-fg-muted">1 · Token de Autenticación MCP</span>
          {token && (
            <span className="flex items-center gap-1 text-[13px] text-success font-medium">
              <CheckCircle2 size={13} /> Token generado (30 días)
            </span>
          )}
        </div>

        {!token ? (
          <div>
            <p className="text-base text-fg-muted mb-3 leading-relaxed">
              Generá un token para que tu cliente MCP pueda trabajar con tu tienda.
            </p>
            <button
              type="button"
              onClick={handleGenerarToken}
              disabled={cargandoToken}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50 transition-colors"
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
              aria-label="Token de acceso MCP"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-base text-fg select-all"
            />
            <button
              type="button"
              onClick={() => copiarTexto(token, 'token')}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-fg hover:border-border-strong"
            >
              {copiado === 'token' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              {copiado === 'token' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {/* Paso 2: Conectar con tu cliente */}
      <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-3">
        <span className="text-sm font-bold uppercase tracking-wider text-fg-muted">2 · Conectar con tu Asistente</span>

        {/* Selector de Cliente */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          <button type="button" onClick={() => setTabCliente('generico')} aria-pressed={tabCliente === 'generico'} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tabCliente === 'generico' ? 'bg-primary text-primary-fg' : 'text-fg-muted'}`}>Cualquier cliente MCP</button>
          <button
            type="button"
            onClick={() => setTabCliente('claude')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
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
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
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
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
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
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
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
            <p className="text-base text-fg-muted">Ejecutá este comando en tu terminal para registrar el servidor MCP en Claude Code:</p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-sm text-fg whitespace-pre-wrap break-all">
                {comandoClaude}
              </pre>
              <button
                type="button"
                onClick={() => copiarTexto(comandoClaude, 'claude')}
                className="mt-2 inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-1 text-[13px] font-semibold text-fg hover:border-border-strong"
              >
                {copiado === 'claude' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copiado === 'claude' ? 'Copiado' : 'Copiar comando'}
              </button>
            </div>
          </div>
        )}

        {tabCliente === 'codex' && (
          <div className="space-y-2">
            <p className="text-base text-fg-muted">Ejecutá este comando en tu terminal para registrar el servidor MCP en OpenAI Codex:</p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-sm text-fg whitespace-pre-wrap break-all">
                {comandoCodex}
              </pre>
              <button
                type="button"
                onClick={() => copiarTexto(comandoCodex, 'codex')}
                className="mt-2 inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-1 text-[13px] font-semibold text-fg hover:border-border-strong"
              >
                {copiado === 'codex' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copiado === 'codex' ? 'Copiado' : 'Copiar comando'}
              </button>
            </div>
          </div>
        )}

        {(tabCliente === 'desktop' || tabCliente === 'generico') && (
          <div className="space-y-2">
            {tabCliente === 'generico' ? <p className="text-base text-fg-muted">Agregá Gesicomm en la configuración MCP de tu herramienta de IA y copiá este JSON. El paquete se descarga automáticamente: no necesitás archivos del proyecto. Requiere Node.js y un cliente compatible con MCP por stdio. El formato de configuración puede variar según el cliente.</p> : <p className="text-base text-fg-muted">Pegá esta configuración dentro de tu archivo <code className="text-primary-text font-mono text-[13px]">claude_desktop_config.json</code>:</p>}
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-sm text-fg whitespace-pre-wrap">
                {jsonDesktop}
              </pre>
              <button
                type="button"
                onClick={() => copiarTexto(jsonDesktop, 'desktop')}
                className="mt-2 inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-1 text-[13px] font-semibold text-fg hover:border-border-strong"
              >
                {copiado === 'desktop' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copiado === 'desktop' ? 'Copiado' : 'Copiar JSON'}
              </button>
            </div>
          </div>
        )}

        {tabCliente === 'codex-desktop' && (
          <div className="space-y-2">
            <p className="text-base text-fg-muted">
              Pegá esta configuración en tu archivo <code className="text-primary-text font-mono text-[13px]">~/.codex/config.toml</code> (en Windows: <code className="text-primary-text font-mono text-[13px]">%USERPROFILE%\.codex\config.toml</code>), o agregalo en la app desde <strong>Settings › MCP Servers</strong>:
            </p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-sm text-fg whitespace-pre-wrap">
                {tomlCodexDesktop}
              </pre>
              <button
                type="button"
                onClick={() => copiarTexto(tomlCodexDesktop, 'codex-desktop')}
                className="mt-2 inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-1 text-[13px] font-semibold text-fg hover:border-border-strong"
              >
                {copiado === 'codex-desktop' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copiado === 'codex-desktop' ? 'Copiado' : 'Copiar TOML'}
              </button>
            </div>
            <p className="text-[13px] text-fg-muted flex items-center gap-1">
              <Sparkles size={12} className="text-primary-text" />
              <span>Tip: Si ya ejecutaste el comando de la pestaña <strong>OpenAI Codex (CLI)</strong>, Codex Desktop lo sincroniza automáticamente.</span>
            </p>
          </div>
        )}

      </div>

      {/* Qué pedirle a la IA */}
      <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
        <h4 className="text-lg font-semibold text-success flex items-center gap-2">
          <ShieldCheck size={18} className="shrink-0" /> Pedile lo que querés, con tus palabras
        </h4>
        {modoProductos ? <p className="text-base leading-relaxed">“Cargá estos productos con sus fotos. En cada ficha poné la descripción, qué incluye y las preguntas frecuentes. Avisame si falta algo.”</p> : <>
        <p className="text-base text-fg-muted leading-relaxed">
          Podés crear tu e-commerce y editar el inicio, las categorías, las fichas de producto y el checkout. Compartí una referencia o contale a tu IA cómo querés que se vea.
        </p>
        <ul className="text-base leading-relaxed space-y-3 text-fg">
          <li className="flex items-start gap-2">
            <span className="text-success font-bold font-mono">›</span>
            <span>“Quiero que mi página se vea como esta imagen, con estos colores y fotos grandes de mis productos.”</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success font-bold font-mono">›</span>
            <span>“Agregué una oferta en mi tienda. Quiero que la muestres bien destacada en la página.”</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success font-bold font-mono">›</span>
            <span>“Rediseñá mi e-commerce con fotos grandes, estos colores y una presentación destacada de mis ofertas.”</span>
          </li>
        </ul></>}
      </div>
    </div>
  );
}
