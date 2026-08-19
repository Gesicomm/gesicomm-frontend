import React, { useState } from 'react';
import { ArrowLeft, Loader, Save, Star, Trash2, Upload, X, Search, ImageOff } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import FaqPanel from './FaqPanel';

const CAMPO = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30';

/**
 * Panel de edición de UN producto, dentro del sidebar del armador de
 * landing (reemplaza los tabs Marca/Contenido/etc. mientras hay un
 * producto abierto — esos tabs no aplican a un producto individual, ver
 * LandingSimpleEditor.jsx). Escribe directo sobre el Producto real, no una
 * copia "de landing". La vista previa (templates/ProductoPreview.jsx, panel
 * derecho) es puramente de lectura y se actualiza en vivo con este mismo
 * estado — mismo patrón que el resto del editor (panel edita, preview
 * refleja al instante).
 */
export default function ProductoPanel({
  producto, editable, cargando,
  descripcion, onDescripcion,
  imagenes, subiendoImg, onSubirImagen, onEliminarImagen, onMarcarPrincipal,
  faqTitulo, onFaqTitulo,
  faq, onFaqChange,
  relacionadosTitulo, onRelacionadosTitulo,
  relacionados, relacionadosAutomatico, onAgregarRelacionado, onQuitarRelacionado, catalogo,
  guardando, onGuardar, aviso, error,
  onVolver,
}) {
  const [buscandoRelacionado, setBuscandoRelacionado] = useState('');
  const opcionesRelacionado = buscandoRelacionado.trim().length < 2 ? [] : [
    ...(catalogo?.productos || []).map(p => ({ ...p, tipo: 'producto' })),
  ]
    .filter(p => p.id !== producto?.id && !relacionados?.some(r => r.id === p.id))
    .filter(p => p.nombre?.toLowerCase().includes(buscandoRelacionado.trim().toLowerCase()))
    .slice(0, 6);
  return (
    <div className="flex flex-col h-full">
      <button type="button" onClick={onVolver} className="p-4 border-b border-white/10 flex items-center gap-3 hover:bg-white/5 transition-colors w-full text-left">
        <div className="p-1 rounded-full transition-colors">
          <ArrowLeft size={16} />
        </div>
        <span className="text-sm font-semibold">Volver a la landing</span>
      </button>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        <div>
          <p className="text-xs text-white/40 mb-0.5">Editando producto</p>
          <p className="text-sm font-bold text-white truncate">{producto?.nombre}</p>
        </div>

        {!editable ? (
          <p className="text-xs text-white/40">Los combos se editan desde Mis Productos.</p>
        ) : cargando ? (
          <div className="flex items-center gap-2 text-white/40 text-xs"><Loader size={14} className="animate-spin" /> Cargando...</div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Imágenes</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {imagenes.map(img => (
                  <div key={img.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/10 group">
                    <img src={getMediaUrl(img.url)} alt="" className="w-full h-full object-cover" />
                    {img.es_principal && <span className="absolute top-0.5 left-0.5 bg-white rounded-full p-0.5"><Star size={9} className="text-black" fill="black" /></span>}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {!img.es_principal && (
                        <button type="button" onClick={() => onMarcarPrincipal(img.id)} title="Marcar como principal" className="p-1 rounded bg-white/90 hover:bg-white">
                          <Star size={11} />
                        </button>
                      )}
                      <button type="button" onClick={() => onEliminarImagen(img.id)} title="Eliminar" className="p-1 rounded bg-white/90 hover:bg-white">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white cursor-pointer w-fit">
                {subiendoImg ? <Loader size={13} className="animate-spin" /> : <Upload size={13} />}
                Agregar imagen
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onSubirImagen} disabled={subiendoImg} />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Descripción</label>
              <textarea
                value={descripcion}
                onChange={e => onDescripcion(e.target.value)}
                rows={4}
                placeholder="Contale al cliente de qué se trata este producto..."
                className={CAMPO}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Todo lo que necesitas saber</label>
              <p className="text-xs text-white/30 mb-2">Preguntas frecuentes propias de este producto.</p>
              
              <div className="mb-3">
                <input
                  type="text"
                  value={faqTitulo}
                  onChange={e => onFaqTitulo(e.target.value)}
                  placeholder="Ej: Todo lo que necesitas saber"
                  className={CAMPO}
                />
              </div>

              <FaqPanel faq={faq} onChange={onFaqChange} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Productos relacionados</label>
              {relacionadosAutomatico ? (
                <p className="text-xs text-amber-400/80 mb-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
                  Ahora se muestran productos de la misma categoría. Podés agregar productos específicos abajo para reemplazarlos.
                </p>
              ) : (
                <p className="text-xs text-white/30 mb-2">
                  Se muestran al final de la página de este producto.
                </p>
              )}

              <div className="mb-3">
                <input
                  type="text"
                  value={relacionadosTitulo}
                  onChange={e => onRelacionadosTitulo(e.target.value)}
                  placeholder="Ej: Productos relacionados"
                  className={CAMPO}
                />
              </div>

              {relacionados?.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2">
                  {relacionados.map(r => (
                    <div key={r.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                      <div className="w-8 h-8 shrink-0 rounded overflow-hidden bg-black/40 flex items-center justify-center text-white/30">
                        {r.imagen ? <img src={getMediaUrl(r.imagen)} alt="" className="w-full h-full object-cover" /> : <ImageOff size={12} />}
                      </div>
                      <span className="text-xs text-white flex-1 truncate">{r.nombre}</span>
                      <button type="button" onClick={() => onQuitarRelacionado(r.id)} className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={buscandoRelacionado}
                  onChange={e => setBuscandoRelacionado(e.target.value)}
                  placeholder="Buscar producto para agregar..."
                  className={`${CAMPO} pl-8`}
                />
              </div>
              {opcionesRelacionado.length > 0 && (
                <div className="mt-1.5 border border-white/10 rounded-lg overflow-hidden divide-y divide-white/10">
                  {opcionesRelacionado.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { onAgregarRelacionado(p); setBuscandoRelacionado(''); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-white/5"
                    >
                      <div className="w-7 h-7 shrink-0 rounded overflow-hidden bg-black/40 flex items-center justify-center text-white/30">
                        {p.imagen ? <img src={getMediaUrl(p.imagen)} alt="" className="w-full h-full object-cover" /> : <ImageOff size={11} />}
                      </div>
                      <span className="text-xs text-white truncate">{p.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onGuardar}
              disabled={guardando}
              className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-50"
            >
              {guardando ? <Loader size={14} className="animate-spin" /> : <Save size={14} />} Guardar cambios
            </button>
            {aviso && <p className="text-xs text-emerald-400">{aviso}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
