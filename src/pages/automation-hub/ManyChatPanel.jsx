import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { manychatApi, getManychatWebhookUrl, getManychatUpdateWebhookUrl } from '../../services/automationHubApi';

const BODY_EJEMPLO = `{
  "name": "{{first_name}} {{last_name}}",
  "phone": "{{phone}}",
  "email": "{{email}}",
  "subscriber_id": "{{id}}",
  "ticket": "MD"
}`;

const BODY_ETAPA_EJEMPLO = `{
  "subscriber_id": "{{id}}",
  "pipeline": "Instagram",
  "stage": "En conversación"
}`;

const BODY_VENTA_EJEMPLO = `{
  "subscriber_id": "{{id}}",
  "pipeline": "Ventas",
  "stage": "Seguimiento pago",
  "value": 150000,
  "ticket": "HG"
}`;

export default function ManyChatPanel() {
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState('');
  const [copiadoKey, setCopiadoKey] = useState('');

  const cargarEstado = async () => {
    setCargando(true);
    try {
      setEstado(await manychatApi.estado());
    } catch (err) {
      setError('No se pudo consultar el estado de ManyChat.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarEstado(); }, []);

  const handleConectar = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setConectando(true);
    setError('');
    try {
      await manychatApi.conectar(apiKey.trim());
      setApiKey('');
      await cargarEstado();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo conectar con ManyChat.');
    } finally {
      setConectando(false);
    }
  };

  const copiar = async (key, texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoKey(key);
      setTimeout(() => setCopiadoKey(''), 2000);
    } catch (e) { /* no bloquea el flujo si el navegador no permite clipboard */ }
  };

  if (cargando) {
    return <div className="p-6 text-center text-sm text-fg-muted">Cargando...</div>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-sm font-semibold text-fg">Conexión con ManyChat</h3>
          {estado?.conectado ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 size={14} /> Conectado</span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-fg-muted"><AlertCircle size={14} /> Sin conectar</span>
          )}
        </div>

        {estado?.conectado && (
          <>
            <div className="mb-4 rounded-lg border border-border bg-surface-2 p-3 text-sm text-fg">
              <div className="text-[10px] font-semibold uppercase text-fg-subtle">Página conectada</div>
              {estado.page_name || '—'}
            </div>

            <div className="mb-4 rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">1. Crear un lead nuevo</div>
              <p className="m-0 mb-2 text-xs text-fg-muted">
                URL para la acción "External Request" (método <strong>POST</strong>) que se dispara cuando arranca la conversación. Cae siempre en el tablero <strong>Instagram</strong>, etapa <strong>New Lead</strong>.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-surface px-2 py-2 text-[11px] text-fg">
                  {getManychatWebhookUrl(estado.webhook_token)}
                </code>
                <button type="button" onClick={() => copiar('url-crear', getManychatWebhookUrl(estado.webhook_token))}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-fg">
                  <Copy size={13} /> {copiadoKey === 'url-crear' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <pre className="m-0 flex-1 overflow-x-auto rounded-md border border-border bg-surface px-2 py-2 text-[11px] text-fg"><code>{BODY_EJEMPLO}</code></pre>
                <button type="button" onClick={() => copiar('body-crear', BODY_EJEMPLO)}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-fg">
                  <Copy size={13} /> {copiadoKey === 'body-crear' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="m-0 mt-2 text-[11px] text-fg-subtle">
                <code>name</code> es el único campo obligatorio. <code>ticket</code> es opcional y clasifica el lead: <code>HG</code> = high ticket, <code>MD</code> = mid ticket, <code>LT</code> = low ticket (se ve como badge en la tarjeta). Cualquier otro dato que agregues al JSON (presupuesto, interés, etc.) se guarda igual, sin crear columnas nuevas en el tablero.
              </p>
            </div>

            <div className="mb-4 rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">2. Mover un lead que ya existe (etapa, pipeline o venta)</div>
              <p className="m-0 mb-2 text-xs text-fg-muted">
                Misma idea, pero método <strong>PATCH</strong> — usalo en cualquier punto del flow donde el suscriptor avance: cambia de etapa, o incluso lo pasa del tablero <strong>Instagram</strong> al tablero <strong>Ventas</strong>. Identifica al lead por <code>subscriber_id</code>, no hace falta guardar ningún ID de Gesicomm en ManyChat.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-surface px-2 py-2 text-[11px] text-fg">
                  {getManychatUpdateWebhookUrl(estado.webhook_token)}
                </code>
                <button type="button" onClick={() => copiar('url-etapa', getManychatUpdateWebhookUrl(estado.webhook_token))}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-fg">
                  <Copy size={13} /> {copiadoKey === 'url-etapa' ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <div className="mt-3 text-[11px] font-semibold text-fg-muted">Ejemplo: avanzó de etapa dentro de Instagram</div>
              <div className="mt-1 flex items-start gap-2">
                <pre className="m-0 flex-1 overflow-x-auto rounded-md border border-border bg-surface px-2 py-2 text-[11px] text-fg"><code>{BODY_ETAPA_EJEMPLO}</code></pre>
                <button type="button" onClick={() => copiar('body-etapa', BODY_ETAPA_EJEMPLO)}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-fg">
                  <Copy size={13} /> {copiadoKey === 'body-etapa' ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <div className="mt-3 text-[11px] font-semibold text-fg-muted">Ejemplo: se cerró una venta (pasa al tablero Ventas, última etapa)</div>
              <div className="mt-1 flex items-start gap-2">
                <pre className="m-0 flex-1 overflow-x-auto rounded-md border border-border bg-surface px-2 py-2 text-[11px] text-fg"><code>{BODY_VENTA_EJEMPLO}</code></pre>
                <button type="button" onClick={() => copiar('body-venta', BODY_VENTA_EJEMPLO)}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-fg">
                  <Copy size={13} /> {copiadoKey === 'body-venta' ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <p className="m-0 mt-2 text-[11px] text-fg-subtle">
                Sirve para <strong>cualquier</strong> etapa de cualquiera de los dos tableros, no solo las de los ejemplos — <code>pipeline</code> tiene que ser exactamente "Instagram" o "Ventas", y <code>stage</code> el nombre exacto de una de sus etapas reales (no son configurables):
              </p>
              <div className="mt-1 flex flex-col gap-1 text-[11px] text-fg-muted">
                <div><strong className="text-fg">Instagram:</strong> New Lead · En conversación · Link Enviado · Agendado</div>
                <div><strong className="text-fg">Ventas:</strong> Agendado · Confirmado · Asistió · Canceló · Seguimiento pago</div>
              </div>
              <p className="m-0 mt-2 text-[11px] text-fg-subtle">
                Si omitís <code>pipeline</code>, se usa el que ya tenía el lead. <code>value</code> y <code>ticket</code> (mismos códigos <code>HG</code>/<code>MD</code>/<code>LT</code> de arriba) son opcionales.
              </p>
            </div>
          </>
        )}

        <form onSubmit={handleConectar} className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-fg-muted">
            {estado?.conectado ? 'Reemplazar API Key' : 'API Key de ManyChat'}
          </label>
          <p className="m-0 text-xs text-fg-muted">
            Se obtiene en ManyChat → Settings → API → Generate your API Key.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Pegá tu API Key acá"
            className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg"
          />
          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          <button type="submit" disabled={conectando}
            className="mt-1 h-10 rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60">
            {conectando ? 'Validando...' : estado?.conectado ? 'Actualizar conexión' : 'Conectar ManyChat'}
          </button>
        </form>
      </div>
    </div>
  );
}
