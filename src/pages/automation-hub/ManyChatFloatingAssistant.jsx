import React, { useState } from 'react';
import { Copy, ChevronDown, ChevronUp, MessageCircle, X } from 'lucide-react';

// z-[900] a propósito: por debajo de los modales (z-[1000]) — si estuviera
// encima tapaba los botones del panel de "Nuevo contenido".
export default function ManyChatFloatingAssistant({ item, manychatLink, onClose }) {
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
      <div className="fixed bottom-4 right-4 z-[900] flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 shadow-lg">
        <MessageCircle size={16} className="text-primary-text" />
        <span className="text-sm font-semibold text-fg">Asistente ManyChat</span>
        <button
          type="button"
          aria-label="Expandir asistente"
          onClick={() => setMinimizada(false)}
          className="ml-2 rounded-full bg-primary/10 p-1 text-primary-text hover:bg-primary/20"
        >
          <ChevronUp size={16} />
        </button>
        {onClose && (
          <button type="button" aria-label="Cerrar asistente" onClick={onClose}
            className="rounded-full p-1 text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[900] w-80 rounded-xl border border-border bg-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-3 rounded-t-xl">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-primary-text" />
          <h3 className="m-0 text-sm font-semibold text-fg">Configuración ManyChat</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Minimizar asistente"
            onClick={() => setMinimizada(true)}
            className="rounded-md p-1 text-fg-muted hover:bg-surface hover:text-fg"
          >
            <ChevronDown size={16} />
          </button>
          {onClose && (
            <button type="button" aria-label="Cerrar asistente" onClick={onClose}
              className="rounded-md p-1 text-fg-muted hover:bg-surface hover:text-fg">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-md bg-surface-2 px-2 py-1.5 text-[11px] text-fg-muted">
          Pieza: <strong className="text-fg">{item.topic || item.tracking_code}</strong>
          {item.publish_date && <> · {item.publish_date}</>}
        </div>

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
          <div className="flex items-start justify-between gap-2">
            <strong className="min-w-0 break-words text-sm text-primary-text">{cta}</strong>
            <button
              onClick={() => copiar('cta', cta)}
              className="shrink-0 rounded border border-border bg-surface px-2 py-1 text-xs font-semibold text-fg hover:bg-surface-2"
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
          {!manychatLink && (
            <p className="m-0 mt-1 text-[10px] text-fg-subtle">
              Todavía no existe en ManyChat — se crea solo al marcar la pieza como publicada.
            </p>
          )}
        </div>

        {isStory && (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-2">
            <div className="mb-1 text-[10px] font-semibold uppercase text-warning">Ojo: Es una Historia</div>
            <div className="text-xs text-warning">
              Asegurate de que la automatización solo se dispare en el slide <strong>exacto</strong> donde hacés el CTA, no en todas las historias.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
