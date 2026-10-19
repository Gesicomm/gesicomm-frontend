import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getMediaUrl } from '../../services/api';

export default function ImagenMercaderia({ producto, className = 'h-16 w-16' }) {
  const [imagenFallida, setImagenFallida] = useState(null);
  const imagen = producto?.imagen_url || '';
  const estilo = `${className} shrink-0 rounded-lg border border-border bg-surface object-contain p-1`;
  return imagen && imagenFallida !== imagen
    ? <img src={getMediaUrl(imagen)} alt={`Foto de ${producto.nombre || 'producto'}`} loading="lazy" className={estilo} onError={() => setImagenFallida(imagen)} />
    : <span role="img" aria-label="Producto sin imagen disponible" className={`${estilo} flex items-center justify-center text-fg-muted`}><ImageOff size={21} aria-hidden="true" /></span>;
}
