import React, { useRef } from 'react';
import { ArrowLeft, ArrowRight, Image as ImageIcon, X, Loader, Link as LinkIcon, Sparkles, Upload } from 'lucide-react';

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:outline-none focus:border-fg/30';
const LABEL = 'block text-xs font-semibold text-fg/60 mb-1.5';

const DEFAULT_TITULO = 'Todo lo que buscás, en un solo lugar';
const DEFAULT_SUBTITULO = 'Encontrá las mejores ofertas y productos seleccionados especialmente para vos.';
const DEFAULT_CTA_TEXTO = 'Comprar ahora';

const ATAJOS_CTA = [
  { label: '🛍️ Catálogo (#productos)', value: '#productos' },
  { label: '📄 Página Catálogo (/catalogo)', value: '/catalogo' },
  { label: '⭐ Beneficios (#beneficios)', value: '#beneficios' },
  { label: '❓ Preguntas frecuentes (#faq)', value: '#faq' },
  { label: '📞 Contacto (#contacto)', value: '#contacto' },
];

const MAX_HERO_IMAGENES = 5;

function imagenesHeroDraft(draft, heroUrl) {
  const propias = draft?.content?.portada?.banner_imagenes;
  if (Array.isArray(propias) && propias.length) return propias.slice(0, MAX_HERO_IMAGENES);
  return heroUrl ? [heroUrl] : [];
}

export default function ContenidoPanel({ draft, onCampo, heroUrl, subiendoHero, onSubirHero, onQuitarHero, error }) {
  const inputRef = useRef(null);
  const imagenesHero = imagenesHeroDraft(draft, heroUrl);

  function actualizarImagenesHero(imagenes) {
    const limpias = imagenes.filter(Boolean).slice(0, MAX_HERO_IMAGENES);
    onCampo('content', {
      ...(draft.content || {}),
      portada: {
        ...(draft.content?.portada || {}),
        banner_imagenes: limpias,
      },
    });
  }

  async function handleFile(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const disponibles = MAX_HERO_IMAGENES - imagenesHero.length;
    if (disponibles <= 0) return;
    const elegidas = files.slice(0, disponibles);
    const subidas = [];
    for (const file of elegidas) {
      const url = await onSubirHero(file);
      if (url) subidas.push(url);
    }
    if (subidas.length) actualizarImagenesHero([...imagenesHero, ...subidas]);
  }

  function quitarImagenHero(indice) {
    const siguientes = imagenesHero.filter((_, i) => i !== indice);
    actualizarImagenesHero(siguientes);
    if (!siguientes.length && draft.banner_imagen && !Array.isArray(draft?.content?.portada?.banner_imagenes)) {
      onQuitarHero();
    }
  }

  function moverImagenHero(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= imagenesHero.length) return;
    const siguientes = [...imagenesHero];
    const [item] = siguientes.splice(indice, 1);
    siguientes.splice(destino, 0, item);
    actualizarImagenesHero(siguientes);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Rótulo chico: vive en content.portada (no tiene columna propia). */}
      <div>
        <label className={LABEL}>Rótulo chico (arriba del título)</label>
        <input
          type="text"
          value={draft.content?.portada?.eyebrow || ''}
          onChange={e => onCampo('content', {
            ...(draft.content || {}),
            portada: { ...(draft.content?.portada || {}), eyebrow: e.target.value },
          })}
          placeholder="Ej: Cuidado que se nota"
          className={CAMPO}
        />
        <span className="text-[11px] text-fg/40 block mt-1">Si lo dejás vacío, no se muestra.</span>
      </div>

      {/* Título */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className={LABEL} style={{ marginBottom: 0 }}>Título</label>
          {!draft.banner_titulo && (
            <button
              type="button"
              onClick={() => onCampo('banner_titulo', DEFAULT_TITULO)}
              className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <Sparkles size={11} /> Usar sugerido
            </button>
          )}
        </div>
        <input
          type="text"
          value={draft.banner_titulo || ''}
          onChange={e => onCampo('banner_titulo', e.target.value)}
          placeholder={`Ej: ${DEFAULT_TITULO}`}
          className={CAMPO}
        />
        {!draft.banner_titulo && (
          <span className="text-[11px] text-fg/40 block mt-1">
            Si lo dejás vacío, no se muestra título. "Usar sugerido" carga un texto de ejemplo.
          </span>
        )}
      </div>

      {/* Subtítulo */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className={LABEL} style={{ marginBottom: 0 }}>Subtítulo</label>
          {!draft.banner_subtitulo && (
            <button
              type="button"
              onClick={() => onCampo('banner_subtitulo', DEFAULT_SUBTITULO)}
              className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <Sparkles size={11} /> Usar sugerido
            </button>
          )}
        </div>
        <textarea
          value={draft.banner_subtitulo || ''}
          onChange={e => onCampo('banner_subtitulo', e.target.value)}
          rows={2}
          placeholder={`Ej: ${DEFAULT_SUBTITULO}`}
          className={CAMPO}
        />
        {!draft.banner_subtitulo && (
          <span className="text-[11px] text-fg/40 block mt-1">
            Si lo dejás vacío, no se muestra.
          </span>
        )}
      </div>

      {/* Imagenes */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <label className={LABEL} style={{ marginBottom: 0 }}>Imágenes del banner</label>
          <span className="text-[11px] text-fg/45">{imagenesHero.length}/{MAX_HERO_IMAGENES}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {imagenesHero.map((url, indice) => (
            <div key={`${url}-${indice}`} className="relative h-24 rounded-lg border border-fg/10 bg-fg/5 overflow-hidden group">
              <img src={url} alt={`Banner ${indice + 1}`} className="h-full w-full object-cover" />
              {indice === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  Portada
                </span>
              )}
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <button type="button" onClick={() => moverImagenHero(indice, -1)} disabled={indice === 0} className="h-7 w-7 rounded-full bg-black/55 text-white inline-flex items-center justify-center disabled:opacity-30">
                    <ArrowLeft size={13} />
                  </button>
                  <button type="button" onClick={() => moverImagenHero(indice, 1)} disabled={indice === imagenesHero.length - 1} className="h-7 w-7 rounded-full bg-black/55 text-white inline-flex items-center justify-center disabled:opacity-30">
                    <ArrowRight size={13} />
                  </button>
                </div>
                <button type="button" onClick={() => quitarImagenHero(indice)} className="h-7 w-7 rounded-full bg-red-500/85 text-white inline-flex items-center justify-center">
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
          {imagenesHero.length < MAX_HERO_IMAGENES && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendoHero}
              className="h-24 rounded-lg border border-dashed border-fg/20 bg-fg/5 text-fg/60 hover:bg-fg/10 hover:text-fg transition-colors inline-flex flex-col items-center justify-center gap-2 text-xs font-semibold disabled:opacity-60"
            >
              {subiendoHero ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
              Agregar imagen
            </button>
          )}
          {!imagenesHero.length && !subiendoHero && (
            <div className="h-24 rounded-lg bg-fg/5 border border-fg/10 flex items-center justify-center text-fg/30">
              <ImageIcon size={18} />
            </div>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFile} />
        <p className="text-[11px] text-fg/40 mt-2">
          Hasta 5 imágenes. La primera es la portada; en la landing se muestran como carrusel automático con controles.
        </p>
        {imagenesHero.length > 0 && (
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-fg/50">Opacidad de la imagen</span>
              <span className="text-xs text-fg/80">{draft.banner_opacidad !== undefined && draft.banner_opacidad !== null ? draft.banner_opacidad : 30}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={draft.banner_opacidad !== undefined && draft.banner_opacidad !== null ? draft.banner_opacidad : 30}
              onChange={e => onCampo('banner_opacidad', parseInt(e.target.value, 10))}
              className="w-full accent-primary bg-fg/10 rounded-full h-1 appearance-none cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* CTA: Texto y URL */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Texto del CTA</label>
            <input
              type="text"
              value={draft.banner_boton_texto || ''}
              onChange={e => onCampo('banner_boton_texto', e.target.value)}
              placeholder={`Ej: ${DEFAULT_CTA_TEXTO}`}
              className={CAMPO}
            />
          </div>
          <div>
            <label className={LABEL}>URL / Enlace del CTA</label>
            <input
              type="text"
              value={draft.banner_boton_link || ''}
              onChange={e => onCampo('banner_boton_link', e.target.value)}
              placeholder="Ej: #productos"
              className={CAMPO}
            />
          </div>
        </div>

        {/* Atajos de URL para el CTA */}
        <div className="bg-fg/5 border border-fg/10 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-fg/70">
            <LinkIcon size={13} className="text-primary" />
            Atajos de enlace para el botón CTA:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ATAJOS_CTA.map(atajo => {
              const seleccionado = (draft.banner_boton_link || '#productos') === atajo.value;
              return (
                <button
                  type="button"
                  key={atajo.value}
                  onClick={() => onCampo('banner_boton_link', atajo.value)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    seleccionado
                      ? 'bg-primary text-white font-semibold shadow-sm'
                      : 'bg-fg/10 hover:bg-fg/15 text-fg/80'
                  }`}
                >
                  {atajo.label}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-fg/40">
            Hacé clic en un atajo o escribí un enlace personalizado (ej: #productos, /catalogo, o una URL externa).
          </span>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
