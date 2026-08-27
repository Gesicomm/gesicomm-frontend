import React, { useState } from 'react';
import { X, Copy, CheckCircle2, Share2 } from 'lucide-react';
import { contentApi, manychatApi } from '../../services/automationHubApi';
import SocialPublishModal from './SocialPublishModal';

const FORMATO_LABEL = { R: 'Video / Reel', C: 'Carrusel', H: 'Historias' };

export default function ContentDetailModal({ item, onClose, onCambio }) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [publicarRedesAbierto, setPublicarRedesAbierto] = useState(false);
  const link = item.ManychatLink || null;

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(item.tracking_code);
    } catch (e) { /* no bloquea el flujo si el navegador no permite clipboard */ }
  };

  const ejecutar = async (accion) => {
    setProcesando(true);
    setError('');
    try {
      await accion();
      onCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo completar la acción.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">Detalle de contenido</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="rounded-lg border border-border bg-surface-2 p-3">
            <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Código de tracking</div>
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm text-primary-text">{item.tracking_code}</strong>
              <button type="button" onClick={copiarCodigo} className="rounded-md border border-border p-1.5 text-fg-muted hover:bg-surface hover:text-fg">
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Formato</div>
              <div className="text-sm text-fg">{FORMATO_LABEL[item.format]}</div>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Publicación</div>
              <div className="text-sm text-fg">{item.publish_date} · {String(item.publish_time).slice(0, 5)}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-3">
            <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Tema</div>
            <div className="text-sm text-fg">{item.topic}</div>
          </div>

          {item.description && (
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Descripción</div>
              <div className="whitespace-pre-wrap text-sm text-fg">{item.description}</div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface-2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-fg-subtle">ManyChat</span>
              {link?.linked && <span className="flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 size={14} /> Vinculado</span>}
            </div>
            {!link?.prepared && item.status !== 'published' && (
              <p className="m-0 text-xs text-fg-muted">Se prepara el tag automáticamente al marcar esta pieza como publicada.</p>
            )}
            {link?.prepared && !link?.manually_prepared && (
              <p className="m-0 text-xs text-fg-muted">Tag <strong>{link.tag_name}</strong> creado en ManyChat. Armá la automatización a mano dentro de ManyChat y confirmá abajo.</p>
            )}
            {link?.manually_prepared && !link?.linked && (
              <p className="m-0 text-xs text-warning">Pendiente de vinculación — ver "Acciones pendientes".</p>
            )}
          </div>

          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-border p-4">
          <button type="button" onClick={() => setPublicarRedesAbierto(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-2 text-sm font-semibold text-fg">
            <Share2 size={14} /> Publicar en redes (GoHighLevel)
          </button>
          {item.status !== 'published' && (
            <button type="button" disabled={procesando}
              onClick={() => ejecutar(() => contentApi.marcarPublicado(item.id).then(() => manychatApi.prepararTag(item.id).catch(() => {})))}
              className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60">
              Marcar como publicado (prepara tag en ManyChat)
            </button>
          )}
          {link?.prepared && !link?.manually_prepared && (
            <button type="button" disabled={procesando}
              onClick={() => ejecutar(() => manychatApi.confirmarPreparacionManual(item.id))}
              className="h-10 rounded-md border border-border bg-surface-2 text-sm font-semibold text-fg disabled:opacity-60">
              ✓ Ya armé la automatización en ManyChat
            </button>
          )}
          {item.status !== 'published' && (
            <button type="button" disabled={procesando}
              onClick={() => ejecutar(() => contentApi.eliminar(item.id))}
              className="h-10 rounded-md border border-danger/30 text-sm font-semibold text-danger disabled:opacity-60">
              Eliminar del calendario
            </button>
          )}
        </div>
      </div>

      {publicarRedesAbierto && (
        <SocialPublishModal item={item} onClose={() => setPublicarRedesAbierto(false)} />
      )}
    </div>
  );
}
