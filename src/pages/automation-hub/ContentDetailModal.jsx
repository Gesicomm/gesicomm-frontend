import React, { useState } from 'react';
import { X, Copy, CheckCircle2, FileVideo, FileImage } from 'lucide-react';
import { contentApi, manychatApi } from '../../services/automationHubApi';
import LivePreviewMockup from './LivePreviewMockup';

const FORMATO_LABEL = { R: 'Video / Reel', C: 'Carrusel', H: 'Historias' };

export default function ContentDetailModal({ item, onClose, onCambio, setFloatingAssistantItem }) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [localMedias, setLocalMedias] = useState([]);
  
  const link = item.ManychatLink || null;

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(item.tracking_code);
    } catch (e) { /* no bloquea el flujo */ }
  };

  const manejarArchivos = (e) => {
    const files = Array.from(e.target.files);
    const nuevasMedias = files.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type
    }));
    setLocalMedias(nuevasMedias);
  };

  const manejarPublicacion = async () => {
    setProcesando(true);
    setError('');
    try {
      await contentApi.marcarPublicado(item.id);
      let nuevoLink = link;
      try {
        const res = await manychatApi.prepararTag(item.id);
        if (res?.link) nuevoLink = res.link;
      } catch (e) {
        console.error("Error preparando tag", e);
      }
      
      // Activar el asistente flotante
      if (setFloatingAssistantItem) {
        setFloatingAssistantItem({ item, manychatLink: nuevoLink });
      }
      
      // Abrir manychat y notificar a la grilla que recargue
      window.open('https://app.manychat.com/', '_blank');
      onCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo completar la accin.');
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
      setError(err.response?.data?.message || 'No se pudo completar la accin.');
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
            <h3 className="m-0 text-base font-semibold text-fg">Detalle de contenido</h3>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg md:hidden">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto min-w-0">
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Cdigo de tracking</div>
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
                <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Publicacin</div>
                <div className="text-sm text-fg">{item.publish_date}  {String(item.publish_time).slice(0, 5)}</div>
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
                <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">ngulo de Ventas</div>
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
                <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Guin / Copy</div>
                <div className="whitespace-pre-wrap break-all text-sm text-fg">{item.script}</div>
              </div>
            )}

            {item.description && (
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase text-fg-subtle">Descripcin / Caption</div>
                <div className="whitespace-pre-wrap break-all text-sm text-fg">{item.description}</div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-fg-subtle">ManyChat</span>
                {link?.linked && <span className="flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 size={14} /> Vinculado</span>}
              </div>
              {!link?.prepared && item.status !== 'published' && (
                <p className="m-0 text-xs text-fg-muted">Se prepara el tag automticamente al marcar esta pieza como publicada.</p>
              )}
              {link?.prepared && !link?.manually_prepared && (
                <p className="m-0 text-xs text-fg-muted">Tag <strong>{link.tag_name}</strong> creado en ManyChat. Arm la automatizacin a mano dentro de ManyChat y confirm abajo.</p>
              )}
              {link?.manually_prepared && !link?.linked && (
                <p className="m-0 text-xs text-warning">Pendiente de vinculacin  ver "Acciones pendientes".</p>
              )}
            </div>

            {/* Carga local para previsualizar */}
            <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-center">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-2 text-fg-muted">
                  <FileVideo size={20} /> <FileImage size={20} />
                </div>
                <span className="text-xs font-semibold text-fg">Subir archivo para previsualizar</span>
                <span className="text-[10px] text-fg-muted">Archivos locales. No se guardarn en el servidor.</span>
                <input type="file" multiple accept="video/*,image/*" className="hidden" onChange={manejarArchivos} />
              </label>
            </div>

            {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          </div>

          <div className="shrink-0 grid grid-cols-1 gap-2 border-t border-border bg-surface p-4 z-10">
            {item.status !== 'published' && (
              <button type="button" disabled={procesando}
                onClick={manejarPublicacion}
                className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60">
                Marcar como publicado y armar automatizacin en ManyChat
              </button>
            )}
            {link?.prepared && !link?.manually_prepared && (
              <button type="button" disabled={procesando}
                onClick={() => ejecutar(() => manychatApi.confirmarPreparacionManual(item.id))}
                className="h-10 rounded-md border border-border bg-surface-2 text-sm font-semibold text-fg disabled:opacity-60">
                 Ya arm la automatizacin en ManyChat
              </button>
            )}
            <button type="button" disabled={procesando}
              onClick={() => ejecutar(() => contentApi.eliminar(item.id))}
              className="h-10 rounded-md border border-danger/30 text-sm font-semibold text-danger disabled:opacity-60">
              Eliminar del calendario
            </button>
          </div>
        </div>

        {/* Lado derecho: Previsualizacin Live */}
        <div className="hidden md:flex md:w-[360px] lg:w-[400px] shrink-0 bg-surface-2 flex-col relative">
          <div className="absolute top-4 right-4 z-10">
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface hover:text-fg bg-surface border border-border shadow-sm">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
            <LivePreviewMockup format={item.format} text={item.description} medias={localMedias} />
          </div>
        </div>

      </div>
    </div>
  );
}
