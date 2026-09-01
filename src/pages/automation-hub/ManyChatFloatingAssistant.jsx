import React, { useState } from 'react';
import { Copy, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

export default function ManyChatFloatingAssistant({ item, manychatLink }) {
  const [minimizada, setMinimizada] = useState(false);
  const [copiado, setCopiado] = useState(null);

  if (!item) return null;

  const copiar = async (clave, texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado(null), 2000);
    } catch (e) {
      console.error('Error al copiar', e);
    }
  };

  const tag = manychatLink?.tag_name || item.tracking_code;
  const cta = item.keyword || '';
  const isStory = item.format === 'H';

  if (minimizada) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 shadow-lg">
        <MessageCircle size={16} className="text-primary-text" />
        <span className="text-sm font-semibold text-fg">Asistente ManyChat</span>
        <button
          onClick={() => setMinimizada(false)}
          className="ml-2 rounded-full bg-primary/10 p-1 text-primary-text hover:bg-primary/20"
        >
          <ChevronUp size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 rounded-xl border border-border bg-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-3 rounded-t-xl">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-primary-text" />
          <h3 className="m-0 text-sm font-semibold text-fg">Configuracion ManyChat</h3>
        </div>
        <button
          onClick={() => setMinimizada(true)}
          className="rounded-md p-1 text-fg-muted hover:bg-surface hover:text-fg"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <p className="m-0 text-xs text-fg-muted">
          Duplica la plantilla correcta en ManyChat y usa estos datos para armar el trigger:
        </p>

        <div className="rounded-md border border-border bg-surface-2 p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Plantilla a duplicar</div>
          <div className="text-xs font-semibold text-fg">
            {isStory ? 'PLANTILLA - TRACKING HISTORIAS' : 'PLANTILLA - TRACKING REELS / POSTS'}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-2 p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Palabra CTA (Trigger)</div>
          <div className="flex items-center justify-between">
            <strong className="text-sm text-primary-text">{cta}</strong>
            <button
              onClick={() => copiar('cta', cta)}
              className="rounded border border-border bg-surface px-2 py-1 text-xs font-semibold text-fg hover:bg-surface-2"
            >
              {copiado === 'cta' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-2 p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Tag (Etiqueta final)</div>
          <div className="flex items-center justify-between">
            <strong className="truncate text-xs text-primary-text mr-2">{tag}</strong>
            <button
              onClick={() => copiar('tag', tag)}
              className="rounded border border-border bg-surface px-2 py-1 text-xs font-semibold text-fg hover:bg-surface-2 shrink-0"
            >
              {copiado === 'tag' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {isStory && (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-2">
            <div className="mb-1 text-[10px] font-semibold uppercase text-warning">Ojo: Es una Historia</div>
            <div className="text-xs text-warning">
              Asegurate de que la automatizacion solo se dispare en el slide <strong>exacto</strong> donde haces el CTA, no en todas las historias.
            </div>
          </div>
        )}

        <div className="rounded-md border border-border bg-surface-2 p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle flex justify-between items-center">
            <span>Body del Webhook (JSON)</span>
            <button
              onClick={() => copiar('json', `{\n  "name": "{{first_name}} {{last_name}}",\n  "subscriber_id": "{{subscriber_id}}",\n  "ticket": "LT",\n  "tracking_code": "${tag}"\n}`)}
              className="rounded text-xs text-primary-text hover:underline"
            >
              {copiado === 'json' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <pre className="text-[10px] text-fg font-mono bg-surface p-2 rounded border border-border overflow-x-auto whitespace-pre">
{`{
  "name": "{{first_name}} {{last_name}}",
  "subscriber_id": "{{subscriber_id}}",
  "ticket": "LT",
  "tracking_code": "${tag}"
}`}
          </pre>
          <div className="mt-1 text-[9px] text-fg-muted">
            * Cambia el "LT" por "MD" o "HG" segn el ticket.
          </div>
        </div>
      </div>
    </div>
  );
}
