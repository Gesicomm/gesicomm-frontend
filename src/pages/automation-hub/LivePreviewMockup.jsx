import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ImageOff } from 'lucide-react';

export default function LivePreviewMockup({ format, text, medias, onRemove, compact = false }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [urlsRotas, setUrlsRotas] = useState(() => new Set());

  const prev = () => setSlideIndex((s) => (s > 0 ? s - 1 : s));
  const next = () => setSlideIndex((s) => (s < medias.length - 1 ? s + 1 : s));

  const currentMedia = medias[Math.min(slideIndex, medias.length - 1)];
  const rota = currentMedia && urlsRotas.has(currentMedia.url);
  const errorPreview = currentMedia?.esLocal
    ? 'No se pudo previsualizar este archivo. Puede ser un MP4 con códec no compatible en el navegador, pero igual podés programarlo.'
    : 'No se pudo cargar esta URL. Puede estar bloqueada o no ser una URL directa de imagen/video.';

  const marcarRota = (url) => setUrlsRotas((prev) => new Set(prev).add(url));

  const quitarActual = () => {
    if (!onRemove) return;
    const idx = Math.min(slideIndex, medias.length - 1);
    onRemove(idx);
    setSlideIndex((s) => Math.max(0, Math.min(s, medias.length - 2)));
  };

  return (
    <div className={`flex w-full flex-col items-center justify-center rounded-xl border border-border bg-surface-2 ${compact ? 'p-2' : 'p-4'}`}>
      <div className={`relative overflow-hidden rounded-[2.25rem] border-[10px] border-black bg-black shadow-2xl ${
        compact ? 'h-[420px] w-[205px]' : 'h-[580px] w-[280px]'
      }`}>

        <div className="absolute top-0 z-20 flex w-full justify-center p-2">
          <div className={`${compact ? 'h-4 w-20' : 'h-5 w-24'} rounded-full bg-black`}></div>
        </div>

        <div className="relative h-full w-full bg-[#1a1a1a]">
          {!currentMedia ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-xs text-white/50">
              Subí fotos o videos, o pegá un link, para ver la previsualización
            </div>
          ) : (
            <div className="flex h-full flex-col">

              <div className={`flex items-center gap-2 ${compact ? 'p-2 pb-1.5' : 'p-3 pb-2'}`}>
                <div className={`${compact ? 'h-6 w-6' : 'h-7 w-7'} rounded-full bg-white/20`}></div>
                <div className={`${compact ? 'max-w-[130px] truncate text-[10px]' : 'text-xs'} font-semibold text-white`}>tusegundaempresa</div>
              </div>

              <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                {rota ? (
                  <div className="flex flex-col items-center gap-2 p-4 text-center text-[11px] text-white/60">
                    <ImageOff size={28} />
                    {errorPreview}
                  </div>
                ) : currentMedia.type === 'embed/youtube' ? (
                  <iframe src={currentMedia.url} className="h-full w-full" title="Preview de YouTube"
                    allow="autoplay; encrypted-media" allowFullScreen frameBorder="0" />
                ) : currentMedia.type.startsWith('video/') ? (
                  <video src={currentMedia.url} className="w-full h-full object-cover" autoPlay muted loop playsInline
                    onError={() => marcarRota(currentMedia.url)} />
                ) : (
                  <img src={currentMedia.url} className="w-full h-full object-cover" alt="Preview"
                    onError={() => marcarRota(currentMedia.url)} />
                )}

                {onRemove && (
                  <button type="button" onClick={quitarActual}
                    className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-danger">
                    <X size={13} />
                  </button>
                )}

                {medias.length > 1 && (
                  <>
                    <button onClick={prev} disabled={slideIndex === 0} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-0">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={next} disabled={slideIndex === medias.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-0">
                      <ChevronRight size={16} />
                    </button>
                    <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {slideIndex + 1}/{medias.length}
                    </div>
                  </>
                )}
              </div>

              {format !== 'H' && (
                <div className={`flex flex-col ${compact ? 'p-2 pt-1.5' : 'p-3 pt-2'}`}>
                  <div className="mb-2 flex gap-3 text-white">
                    <div className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} rounded-full border border-white`}></div>
                    <div className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} rounded-full border border-white`}></div>
                    <div className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} rounded-full border border-white`}></div>
                  </div>

                  <div className={`${compact ? 'max-h-16 text-[10px]' : 'max-h-24 text-xs'} overflow-y-auto overflow-x-hidden break-words pr-1 text-white [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30`}>
                    <span className="font-semibold mr-1">tusegundaempresa</span>
                    <span className="whitespace-pre-wrap break-words">{text || 'El copy aparecerá acá...'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
