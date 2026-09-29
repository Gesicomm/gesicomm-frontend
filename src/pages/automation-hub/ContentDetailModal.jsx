import React, { useMemo, useState } from 'react';
import { X, Copy, CheckCircle2, ExternalLink, ImageIcon, Play, Rocket } from 'lucide-react';
import { contentApi, manychatApi } from '../../services/automationHubApi';
import LivePreviewMockup from './LivePreviewMockup';

const FORMATO_LABEL = { R: 'Video / Reel', C: 'Carrusel', H: 'Historias' };

export default function ContentDetailModal({ item, onClose, onCambio, onEdit, setFloatingAssistantItem }) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [mediaSeleccionada, setMediaSeleccionada] = useState(0);
    
  const link = item.ManychatLink || null;
  const medias = useMemo(() => {
    const assets = Array.isArray(item.media_assets) ? item.media_assets : [];
    const normalizados = assets
      .filter((asset) => asset?.url)
      .map((asset, index) => {
        const mime = asset.mime_type || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
        return {
          url: asset.url,
          type: mime,
          label: asset.name || asset.original_name || asset.source_file_name || `Archivo ${index + 1}`,
          index: asset.segment_index || index + 1,
          source: asset.source_file_name,
        };
      });

    if (!normalizados.length && item.video_url) {
      normalizados.push({
        url: item.video_url,
        type: (item.video_url.includes('.mp4') || item.format === 'R') ? 'video/mp4' : 'image/jpeg',
        label: 'Archivo principal',
        index: 1,
      });
    }

    return normalizados;
  }, [item.media_assets, item.video_url, item.format]);

  const mediaActual = medias[Math.min(mediaSeleccionada, Math.max(medias.length - 1, 0))];

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(item.tracking_code);
    } catch (e) { /* no bloquea el flujo */ }
  };

  const abrirManyChat = () => {
    window.open('https://app.manychat.com/', '_blank', 'noopener,noreferrer');
  };

  const mostrarDatosManyChat = () => {
    setFloatingAssistantItem?.({ item, manychatLink: link });
    onClose();
  };

  const publicarAhora = async () => {
    setProcesando(true);
    setError('');
    try {
      await contentApi.publicarAhora(item.id);
      onCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo intentar la publicación ahora.');
      setProcesando(false);
    }
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
      <div className="w-full max-w-4xl rounded-xl bg-surface shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-full" onClick={(e) => e.stopPropagation()}>
        
        {/* Lado izquierdo: Detalles */}
        <div className="flex-1 min-w-0 flex flex-col md:border-r border-border">
          <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-fg">Detalle de contenido</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold border border-blue-500/20">Instagram</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-[10px] font-bold border border-purple-500/20">{FORMATO_LABEL[item.format] || 'Contenido'}</span>
                
                {item.status === 'published' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">Publicado</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20">Programado · {item.publish_date} {String(item.publish_time).slice(0, 5)}</span>
                )}

                {link?.linked && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 size={10} /> ManyChat activo
                  </span>
                )}
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto min-w-0">
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
              <div className="text-sm text-fg break-all">{item.topic}</div>
            </div>

            {item.objective && (
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Objetivo</div>
                <div className="text-sm text-fg break-all">{item.objective}</div>
              </div>
            )}

            {item.angle && (
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Ángulo de Ventas</div>
                <div className="text-sm text-fg break-all">{item.angle}</div>
              </div>
            )}

            {item.keyword && (
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Palabra Clave CTA</div>
                <div className="text-sm text-fg font-semibold text-primary-text break-all">{item.keyword}</div>
              </div>
            )}

            {item.script && (
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Guión / Copy</div>
                <div className="whitespace-pre-wrap break-all text-sm text-fg">{item.script}</div>
              </div>
            )}

            {item.description && (
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Descripción / Caption</div>
                <div className="whitespace-pre-wrap break-all text-sm text-fg">{item.description}</div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-fg-subtle">ManyChat</span>
                {link?.linked && <span className="flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 size={14} /> Vinculado</span>}
              </div>
              {!link?.prepared && item.status !== 'published' && (
                <p className="m-0 text-xs text-fg-muted">Se prepara el tag automáticamente cuando la publicación real se procese.</p>
              )}
              {link?.prepared && !link?.manually_prepared && (
                <p className="m-0 text-xs text-fg-muted">Tag <strong>{link.tag_name}</strong> creado en ManyChat. Armá la automatización a mano dentro de ManyChat y confirmá abajo.</p>
              )}
              {link?.manually_prepared && !link?.linked && (
                <p className="m-0 text-xs text-warning">Pendiente de vinculación — ver "Acciones pendientes".</p>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={mostrarDatosManyChat}
                  className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary text-xs font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
                >
                  <Copy size={14} /> Ver datos para copiar
                </button>
                <button
                  type="button"
                  onClick={abrirManyChat}
                  className="flex h-9 items-center justify-center gap-2 rounded-md border border-primary/25 bg-primary/5 text-xs font-semibold text-primary-text transition-colors hover:bg-primary/10"
                >
                  <ExternalLink size={14} /> Ir a ManyChat
                </button>
              </div>
            </div>

            {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          </div>

          <div className="shrink-0 grid grid-cols-1 gap-2 border-t border-border bg-surface p-4 z-10">
            {(item.status === 'scheduled' || item.status === 'failed') && (
              <button type="button" disabled={procesando}
                onClick={publicarAhora}
                className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60">
                <Rocket size={15} /> {item.status === 'failed' ? 'Reintentar publicación ahora' : 'Publicar ahora'}
              </button>
            )}

            {link?.prepared && !link?.manually_prepared && (
              <button type="button" disabled={procesando}
                onClick={() => ejecutar(() => manychatApi.confirmarPreparacionManual(item.id))}
                className="h-10 rounded-md border border-border bg-surface-2 text-sm font-semibold text-fg disabled:opacity-60">
                ✓ Ya armé la automatización en ManyChat
              </button>
            )}

            {(item.status === 'scheduled' || item.status === 'failed') ? (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button type="button" disabled={procesando}
                  onClick={() => { onClose(); onEdit(item); }}
                  className="h-10 rounded-md bg-surface-2 border border-border text-sm font-semibold text-fg hover:bg-surface-3 transition-colors">
                  Editar Publicación
                </button>
                <button type="button" disabled={procesando}
                  onClick={() => ejecutar(() => contentApi.eliminar(item.id))}
                  className="h-10 rounded-md bg-danger/10 text-danger text-sm font-semibold hover:bg-danger/20 transition-colors">
                  Cancelar (Calendario)
                </button>
              </div>
            ) : (
              <button type="button" disabled={procesando}
                onClick={() => {
                  if (confirm('Esto eliminará físicamente el post de Facebook/Instagram. ¿Estás seguro?')) {
                    ejecutar(() => contentApi.eliminarRemoto(item.id));
                  }
                }}
                className="h-10 mt-1 rounded-md bg-danger text-white text-sm font-semibold hover:bg-danger-hover transition-colors">
                Eliminar de la red social
              </button>
            )}
          </div>
        </div>

        {/* Lado derecho: Previsualización Live */}
        <div className="hidden md:flex md:w-[360px] lg:w-[400px] shrink-0 bg-surface-2 flex-col relative">
          <div className="absolute top-4 right-4 z-10">
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface hover:text-fg bg-surface border border-border shadow-sm">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-3">
            <LivePreviewMockup 
              format={item.format} 
              text={item.description} 
              medias={mediaActual ? [{ url: mediaActual.url, type: mediaActual.type }] : []}
            />
            {medias.length > 1 && (
              <div className="w-full rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">Archivos del contenido</span>
                  <span className="text-[10px] font-semibold text-fg-muted">{mediaSeleccionada + 1}/{medias.length}</span>
                </div>
                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {medias.map((media, index) => {
                    const activo = index === mediaSeleccionada;
                    const esVideo = media.type.startsWith('video/');
                    const Icon = esVideo ? Play : ImageIcon;
                    return (
                      <button
                        key={`${media.url}-${index}`}
                        type="button"
                        onClick={() => setMediaSeleccionada(index)}
                        className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors ${
                          activo ? 'border-primary/40 bg-primary/10 text-primary-text' : 'border-border bg-surface-2 text-fg-muted hover:bg-surface-3 hover:text-fg'
                        }`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${activo ? 'bg-primary text-primary-fg' : 'bg-surface text-fg-muted'}`}>
                          <Icon size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">
                            {item.format === 'H' ? 'Historia' : item.format === 'C' ? 'Slide' : 'Archivo'} {media.index}
                          </span>
                          <span className="block truncate text-[10px]">{media.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
