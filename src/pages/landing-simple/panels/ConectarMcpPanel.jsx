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
  Trash2,
  Globe,
} from 'lucide-react';
import { landingSimpleService } from '../../../services/landingSimpleService';
import { apiBaseURL } from '../../../utils/apiBase';

export default function ConectarMcpPanel({ tienda, landing, onSincronizar, modoProductos = false }) {
  const landingId = landing?.id || '';
  const tiendaId = tienda?.id || landing?.tienda_id || '';
  const tokenStorageKey = `gesicomm:mcp-token:${tiendaId || 'cuenta'}`;
  const [token, setToken] = useState(() => {
    try { return window.sessionStorage.getItem(tokenStorageKey) || ''; } catch { return ''; }
  });
  const [cargandoToken, setCargandoToken] = useState(false);
  const [copiado, setCopiado] = useState('');
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [tabCliente, setTabCliente] = useState('web');
  const [sincronizando, setSincronizando] = useState(false);
  const [conexion, setConexion] = useState({ cargando: true, conectada: false });

  useEffect(() => {
    try { setToken(window.sessionStorage.getItem(tokenStorageKey) || ''); } catch { setToken(''); }
  }, [tokenStorageKey]);

  useEffect(() => {
    let activo = true;
    let consultaEnCurso = false;
    const consultar = async () => {
      if (!activo || consultaEnCurso) return;
      consultaEnCurso = true;
      try {
        const estado = await landingSimpleService.estadoConexionMCP();
        if (activo) setConexion({ cargando: false, conectada: Boolean(estado.conectada) });
      } catch {
        if (activo) setConexion({ cargando: false, conectada: false });
      } finally {
        consultaEnCurso = false;
      }
    };
    const alVolver = () => { if (document.visibilityState === 'visible') consultar(); };
    consultar();
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      activo = false;
      window.removeEventListener('focus', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  const apiUrl = (() => {
    const base = apiBaseURL();
    if (base && base.startsWith('http')) return base;
    return window.location.origin ? `${window.location.origin}/api` : 'http://localhost:5000/api';
  })();

  async function handleGenerarToken(esRegeneracion = false) {
    if (esRegeneracion && !window.confirm('¿Querés crear una nueva clave de conexión? La anterior dejará de funcionar y tendrás que volver a conectar tu asistente.')) {
      return;
    }
    setError('');
    setMensajeExito('');
    setCargandoToken(true);
    try {
      const res = await landingSimpleService.generarTokenMCP(tiendaId);
      if (res?.token) {
        setToken(res.token);
        try { window.sessionStorage.setItem(tokenStorageKey, res.token); } catch {
          setError('No se pudo guardar la clave en este navegador. Copiá los datos de conexión antes de salir.');
        }
        if (esRegeneracion) {
          setMensajeExito('Nueva clave creada. Volvé a conectar tu asistente con los datos actualizados.');
          setTimeout(() => setMensajeExito(''), 5000);
        }
      } else {
        setError('No se pudo crear la clave de conexión.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al conectar con el servidor.');
    } finally {
      setCargandoToken(false);
    }
  }

  async function handleRevocarToken() {
    if (!window.confirm('¿Seguro que querés quitar el acceso? Tu asistente dejará de conectarse hasta que vuelvas a configurarlo.')) {
      return;
    }
    setError('');
    setMensajeExito('');
    setCargandoToken(true);
    try {
      await landingSimpleService.revocarTokenMCP();
      setToken('');
      try { window.sessionStorage.removeItem(tokenStorageKey); } catch {}
      setConexion({ cargando: false, conectada: false });
      setMensajeExito('Se quitó el acceso del asistente.');
      setTimeout(() => setMensajeExito(''), 5000);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al revocar el token.');
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

  const paquete = new URL('/conectores/gesicomm-mcp-1.4.0.tgz', window.location.origin).href;
  const urlRemotaLimpia = `${apiUrl}/mcp/sse`;
  const urlRemota = `${apiUrl}/mcp/sse?token=${token || '<TU_TOKEN>'}`;
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

  const datosConexion = {
    web: urlRemota,
    generico: jsonDesktop,
    desktop: jsonDesktop,
    claude: comandoClaude,
    codex: comandoCodex,
    'codex-desktop': tomlCodexDesktop,
  }[tabCliente];

  const pasosConexion = {
    web: [
      'En tu agente o plataforma (en Ajustes, Conectores, Integraciones o Servidores MCP), agregá un servidor remoto.',
      'En el campo de dirección (Server URL), pegá la dirección completa copiada arriba (ya incluye tu clave segura en el parámetro del enlace).',
      'Si el formulario te pide método o tipo de conexión, seleccioná GET (o transporte SSE / Server-Sent Events).',
      'En la opción de Autenticación (Authentication), seleccioná obligatoriamente "No authentication" (o "Sin autenticación" / "No auth"): la clave ya viaja incluida en la URL.',
      'Guardá o agregá la conexión. Tu agente se conectará de inmediato y podrá acceder a las herramientas de Gesicom.',
    ],
    generico: [
      'Abrí los ajustes de la aplicación donde usás tu asistente y buscá la opción para agregar una conexión.',
      'Pegá los datos copiados arriba en la configuración de nuevas conexiones.',
      'Guardá los cambios y volvé a abrir la aplicación.',
    ],
    desktop: [
      'En Claude Desktop, abrí Configuración → Desarrollador → Editar configuración.',
      'Pegá los datos en claude_desktop_config.json. Si ya tenés servidores, agregá la entrada de Gesicom junto a ellos.',
      'Guardá el archivo, cerrá Claude por completo y volvé a abrirlo.',
    ],
    'codex-desktop': [
      'Abrí el archivo config.toml de la carpeta .codex de tu usuario.',
      'Agregá la configuración de Gesicom al archivo y guardalo.',
      'Volvé a abrir Codex Desktop.',
    ],
    claude: [
      'Abrí la terminal donde usás Claude Code.',
      'Pegá el comando y presioná Enter.',
      'Cuando termine, iniciá una sesión nueva de Claude Code.',
    ],
    codex: [
      'Abrí la terminal donde usás Codex.',
      'Pegá el comando y presioná Enter.',
      'Cuando termine, iniciá una sesión nueva de Codex.',
    ],
  }[tabCliente];

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
              Conectar un asistente
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[13px] font-medium text-success border border-success/30">
                Oficial
              </span>
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] font-semibold ${conexion.conectada ? 'border-success/40 bg-success/10 text-success' : 'border-border bg-surface-2 text-fg-muted'}`} role="status">
              {conexion.conectada ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {conexion.cargando ? 'Revisando conexión…' : conexion.conectada ? 'Asistente conectado' : token ? 'Clave lista · falta conectar el asistente' : 'Todavía no conectado · opcional'}
            </span>
            <p className="text-base text-fg-muted mt-0.5">
              {modoProductos ? 'Compartí las fotos con tu asistente y pedile que prepare la ficha. Una vez guardada, la vas a encontrar en tu catálogo.' : 'Conectá tu IA una sola vez para todas tus tiendas. Al editar una página o cargar productos, elegí en qué tienda trabajar.'}
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

      {mensajeExito && (
        <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success font-medium">
          <CheckCircle2 size={15} />
          {mensajeExito}
        </div>
      )}

      {/* Paso 1: Clave de conexión */}
      <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-fg-muted">1 · Autorizá el acceso a tu cuenta</span>
          {token && (
            <span className="flex items-center gap-1 text-[13px] text-success font-medium">
              <CheckCircle2 size={13} /> Clave creada (30 días)
            </span>
          )}
        </div>

        {!token ? (
          <div>
            <p className="text-base text-fg-muted mb-3 leading-relaxed">
              Creá una clave para que tu asistente pueda conectarse a tus tiendas. La vas a copiar junto con las instrucciones del siguiente paso.
            </p>
            <button
              type="button"
              onClick={() => handleGenerarToken(false)}
              disabled={cargandoToken}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              <Sparkles size={14} />
              {cargandoToken ? 'Creando clave...' : 'Crear clave de conexión'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="password"
                readOnly
                value={token}
                aria-label="Clave de conexión"
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-base text-fg select-all"
              />
              <button
                type="button"
                onClick={() => copiarTexto(token, 'token')}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-fg hover:border-border-strong hover:bg-surface-2"
              >
                {copiado === 'token' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                {copiado === 'token' ? 'Copiado' : 'Copiar'}
              </button>
              <button
                type="button"
                onClick={() => handleGenerarToken(true)}
                disabled={cargandoToken}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-fg hover:border-border-strong hover:bg-surface-2 disabled:opacity-50"
                title="Crear una clave nueva; la anterior dejará de funcionar"
              >
                <RefreshCw size={14} className={cargandoToken ? 'animate-spin' : ''} />
                Regenerar
              </button>
              <button
                type="button"
                onClick={handleRevocarToken}
                disabled={cargandoToken}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-danger/40 bg-danger/10 px-3 text-sm font-semibold text-danger hover:bg-danger/20 disabled:opacity-50"
                title="Quitar el acceso actual"
              >
                <Trash2 size={14} />
                Revocar
              </button>
            </div>
            <p className="text-sm text-fg-muted">
              Si creás una clave nueva o quitás el acceso, tendrás que volver a conectar el asistente.
            </p>
          </div>
        )}
      </div>

      {/* Paso 2: Conectar con tu cliente */}
      <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-3">
        <span className="text-sm font-bold uppercase tracking-wider text-fg-muted">2 · ¿Dónde usás tu asistente?</span>

        {/* Selector de Cliente */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setTabCliente('web')}
            aria-pressed={tabCliente === 'web'}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              tabCliente === 'web'
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <Globe size={13} /> En la web / Remoto (MCP)
          </button>
          <button
            type="button"
            onClick={() => setTabCliente('generico')}
            aria-pressed={tabCliente === 'generico'}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              tabCliente === 'generico'
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:text-fg hover:bg-surface'
            }`}
          >
            Otro asistente en mi computadora
          </button>
          <button
            type="button"
            onClick={() => setTabCliente('claude')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              tabCliente === 'claude'
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <Terminal size={13} /> Claude Code · Terminal
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
            <Code2 size={13} /> Claude Desktop · aplicación
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
            <Terminal size={13} /> Codex · Terminal
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
            <Bot size={13} /> Codex Desktop · aplicación
          </button>
        </div>

        <p className="text-base text-fg-muted">
          {tabCliente === 'web'
            ? 'Elegí esta opción para conectar cualquier agente que uses por internet. La conexión es directa por HTTP/SSE (GET); no requiere instalar nada en tu computadora.'
            : tabCliente === 'claude'
              ? 'Elegí esta opción si abrís Claude Code desde una terminal. Copiá el texto de abajo y pegalo en la terminal.'
              : tabCliente === 'codex'
                ? 'Elegí esta opción si abrís Codex desde una terminal. Copiá el texto de abajo y pegalo en la terminal.'
                : tabCliente === 'desktop'
                  ? 'Elegí esta opción si abrís Claude como una aplicación con ventanas y menús. Vas a agregar Gesicom desde sus ajustes.'
                  : tabCliente === 'codex-desktop'
                    ? 'Elegí esta opción si abrís Codex como una aplicación con ventanas y menús. Vas a agregar Gesicom a su archivo de configuración.'
                    : 'Elegí esta opción si el asistente está instalado en tu computadora. Seguí los pasos para agregar Gesicom y reiniciá el asistente al terminar.'}
        </p>

        {!token && (
          <p className="text-sm font-semibold text-primary-text">
            Primero generá tu clave en el paso 1 para poder copiar la configuración lista para usar.
          </p>
        )}

        <section className="min-w-0 space-y-4 rounded-xl border-2 border-primary bg-surface p-4 sm:p-5">
          <h3 className="text-xl font-bold">
            {tabCliente === 'web' ? '3 · Dirección y parámetros de conexión' : '3 · Copiá los datos para conectar'}
          </h3>
          <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-1 block">Server URL (dirección completa con clave)</span>
            <pre className="m-0 whitespace-pre-wrap break-all font-mono text-sm leading-relaxed text-fg">{datosConexion}</pre>
          </div>
          <button
            type="button"
            disabled={!token}
            onClick={() => copiarTexto(datosConexion, tabCliente)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-fg disabled:opacity-50"
          >
            <Copy size={16} /> {copiado === tabCliente ? 'Copiado' : tabCliente === 'web' ? 'Copiar dirección de conexión' : 'Copiar datos de conexión'}
          </button>

          {tabCliente === 'web' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">Método HTTP</span>
                <p className="mt-1 text-base font-semibold text-fg">GET</p>
                <p className="text-sm text-fg-muted">Transporte SSE (Server-Sent Events)</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">Autenticación</span>
                <p className="mt-1 text-base font-semibold text-primary-text">No authentication</p>
                <p className="text-sm text-fg-muted">Marcá "No authentication" o "Sin autenticación". No uses OAuth.</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">Clave integrada</span>
                <p className="mt-1 text-base font-semibold text-fg">Incluida en el enlace</p>
                <p className="text-sm text-fg-muted">La URL ya lleva tu clave en ?token=... para autorizar la sesión.</p>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2 rounded-xl border border-border bg-surface p-4">
          <h3 className="text-lg font-bold">4 · Conectá tu asistente</h3>
          <ol className="list-decimal space-y-2 pl-6 text-base leading-relaxed">
            {pasosConexion.map(paso => <li key={paso}>{paso}</li>)}
          </ol>
        </section>

        {tabCliente === 'web' && (
          <details className="rounded-xl border border-border bg-surface p-4">
            <summary className="cursor-pointer text-base font-semibold text-fg hover:text-primary-text">
              ¿Tu plataforma pide la clave en un campo separado (Bearer token / API key)?
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-base text-fg-muted">
                Si el formulario de tu asistente te pide la dirección limpia por un lado y la clave por el otro (o si estás configurando un conector REST personalizado), usá estos valores:
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">Server URL (sin token)</span>
                  <code className="mt-1 block break-all text-sm text-fg font-mono">{urlRemotaLimpia}</code>
                  <button type="button" onClick={() => copiarTexto(urlRemotaLimpia, 'url-limpia')}
                    className="mt-2 min-h-10 rounded-lg border border-border px-3 text-sm font-semibold text-fg hover:bg-surface">
                    {copiado === 'url-limpia' ? 'Copiado' : 'Copiar URL sin token'}
                  </button>
                </div>
                <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">Clave de acceso (API Key / Bearer Token)</span>
                  <code className="mt-1 block break-all text-sm text-fg font-mono">{token ? `${token.slice(0, 16)}…${token.slice(-10)}` : 'Generá tu clave en el paso 1'}</code>
                  <button type="button" disabled={!token} onClick={() => copiarTexto(token, 'token-solo')}
                    className="mt-2 min-h-10 rounded-lg border border-border px-3 text-sm font-semibold text-fg hover:bg-surface disabled:opacity-50">
                    {copiado === 'token-solo' ? 'Copiado' : 'Copiar solo la clave'}
                  </button>
                </div>
                <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">Método</span>
                  <p className="mt-1 text-base font-semibold text-fg">GET</p>
                  <p className="text-sm text-fg-muted">Si pide ruta de prueba (Test Path), ingresá: <code className="text-xs bg-surface px-1 py-0.5 rounded border border-border">/mcp/tiendas</code></p>
                </div>
                <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">Encabezado si lo pide</span>
                  <code className="mt-1 block break-all text-sm text-fg font-mono">Authorization: Bearer &lt;TU_CLAVE&gt;</code>
                  <p className="text-sm text-fg-muted mt-1">Elegí "Bearer token" si ofrece selector de autenticación.</p>
                </div>
              </div>
            </div>
          </details>
        )}

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-lg font-semibold">5 · Probá la conexión</h3>
          <p className="mt-2 text-base">Abrí un chat nuevo y pedile <strong>“Usá Gesicom para listar las tiendas de mi cuenta”</strong>. Si responde con tus tiendas, la conexión está funcionando; luego elegí una y pedile un cambio concreto.</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-semibold">Mi asistente no encuentra Gesicom</summary>
            <p className="mt-2 text-base">
              Revisá que Gesicom aparezca conectado en los ajustes de tu asistente. Si lo usás en la web, asegurate de haber agregado la dirección completa que copiaste. Si está instalado en tu computadora, guardá los cambios y reinicialo.
            </p>
          </details>
        </div>
      </div>

      {/* Qué pedirle a la IA */}
      <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
        <h4 className="text-lg font-semibold text-success flex items-center gap-2">
          <ShieldCheck size={18} className="shrink-0" /> Pedile lo que querés, con tus palabras
        </h4>
        {modoProductos ? (
          <p className="text-base leading-relaxed">“Cargá estos productos con sus fotos. En cada ficha poné la descripción, qué incluye y las preguntas frecuentes. Avisame si falta algo.”</p>
        ) : (
          <>
            <p className="text-base text-fg-muted leading-relaxed">
              Podés crear tu e-commerce y editar el inicio, las categorías, las fichas de producto y el checkout. También podés mandarle fotos y datos de uno o varios productos para guardarlos en Gesicom con su presentación, qué incluye y preguntas frecuentes.
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
                <span>“Buscá este termo en mi catálogo. Si todavía no está, cargalo con estas fotos, el precio y lo que incluye. Avisame si falta algún dato.”</span>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
