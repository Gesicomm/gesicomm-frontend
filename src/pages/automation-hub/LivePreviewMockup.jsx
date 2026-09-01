import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function LivePreviewMockup({ format, text, medias }) {
  const [slideIndex, setSlideIndex] = useState(0);

  const prev = () => setSlideIndex((s) => (s > 0 ? s - 1 : s));
  const next = () => setSlideIndex((s) => (s < medias.length - 1 ? s + 1 : s));

  // Simulating IG mockup
  const currentMedia = medias[slideIndex];

  return (
    <div className="flex w-full flex-col items-center justify-center bg-surface-2 p-4 rounded-xl border border-border">
      <div className="relative w-[280px] h-[580px] overflow-hidden rounded-[2.5rem] border-[12px] border-black bg-black shadow-2xl">
        
        <div className="absolute top-0 z-20 flex w-full justify-center p-2">
          <div className="h-5 w-24 rounded-full bg-black"></div>
        </div>

        <div className="relative h-full w-full bg-[#1a1a1a]">
          {!currentMedia ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-xs text-white/50">
              Sube fotos o videos localmente para ver la previsualizacin
            </div>
          ) : (
            <div className="flex h-full flex-col">
              
              <div className="flex items-center gap-2 p-3 pb-2">
                <div className="h-7 w-7 rounded-full bg-white/20"></div>
                <div className="text-xs font-semibold text-white">tusegundaempresa</div>
              </div>

              <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                {currentMedia.type.startsWith('video/') ? (
                  <video src={currentMedia.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={currentMedia.url} className="w-full h-full object-cover" alt="Preview" />
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
                <div className="flex flex-col p-3 pt-2">
                  <div className="mb-2 flex gap-3 text-white">
                    <div className="h-5 w-5 rounded-full border border-white"></div>
                    <div className="h-5 w-5 rounded-full border border-white"></div>
                    <div className="h-5 w-5 rounded-full border border-white"></div>
                  </div>
                  
                  <div className="max-h-24 overflow-y-auto pr-1 text-xs text-white [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30">
                    <span className="font-semibold mr-1">tusegundaempresa</span>
                    <span className="whitespace-pre-wrap">{text || 'El copy aparecerǭ aqu...'}</span>
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
