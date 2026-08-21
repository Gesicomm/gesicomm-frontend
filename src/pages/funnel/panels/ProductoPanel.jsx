import React from 'react';
import { ExternalLink, ImageOff, AlertTriangle } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import { formatPrecio } from '../../../lib/mensajeWhatsapp';

/**
 * El producto del embudo — en modo lectura a propósito.
 *
 * Fotos, precio, stock y variantes viven en la ficha del producto, que es
 * la única fuente de verdad. Duplicar esos campos acá permitiría que el
 * embudo mostrara un precio distinto al que después cobra el checkout.
 * Desde acá solo se salta a editarlos donde corresponde.
 */
export default function ProductoPanel({ producto, imagenes, variantes }) {
  if (!producto) {
    return <p className="text-xs text-white/40">Este embudo no tiene producto asignado.</p>;
  }

  const galeria = imagenes || [];
  const precioBase = Number(producto.precio_base) || 0;
  const tachado = producto.precio_tachado ? Number(producto.precio_tachado) : null;
  const enOferta = tachado && tachado > precioBase;
  const sinFotos = galeria.length === 0;
  const sinDescripcion = !producto.descripcion_larga && !producto.descripcion_corta;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs text-white/40 mb-0.5">Producto del embudo</p>
        <p className="text-sm font-bold text-white">{producto.nombre}</p>
      </div>

      {/* Avisos accionables: sin fotos ni descripción el embudo no puede
          responder "¿qué es?" ni "¿por qué lo necesito?". */}
      {(sinFotos || sinDescripcion) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-200/90 leading-relaxed">
            {sinFotos && <p>Este producto no tiene fotos cargadas.</p>}
            {sinDescripcion && <p>Este producto no tiene descripción.</p>}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-white/60 mb-2">Fotos ({galeria.length})</p>
        {sinFotos ? (
          <div className="flex items-center gap-2 text-xs text-white/35">
            <ImageOff size={14} /> Sin imágenes
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {galeria.slice(0, 8).map(img => (
              <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-white/5">
                <img src={getMediaUrl(img.url)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-white/45">Precio</span>
          <span className="text-white font-semibold">
            {formatPrecio(precioBase)}
            {enOferta && <span className="text-white/40 line-through ml-2">{formatPrecio(tachado)}</span>}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/45">Stock</span>
          <span className="text-white font-semibold">{producto.cantidad_disponible ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/45">Variantes</span>
          <span className="text-white font-semibold">{(variantes || []).length}</span>
        </div>
      </div>

      <a
        href={`/products/${producto.id}/editar`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-violet-200"
      >
        Editar fotos, precio y descripción <ExternalLink size={12} />
      </a>
      <p className="text-[11px] text-white/35 leading-relaxed -mt-3">
        Se editan en la ficha del producto para que el embudo y el checkout
        nunca muestren datos distintos.
      </p>
    </div>
  );
}
