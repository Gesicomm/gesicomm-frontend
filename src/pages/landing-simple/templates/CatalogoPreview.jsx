import React, { useState } from 'react';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import { hexToRgba, resolverTemaPorSlug } from './themeUtils';
import { RedesSocialesFooter } from './sections';
import StoreFooterLegal from '../../landing/StoreFooterLegal';


/**
 * Vista previa (dentro del editor) de la página de Catálogo completo —
 * TODOS los productos que el comercio agregó a esta landing (curados para
 * el home o no, ver mostrar_en_inicio), no solo los destacados. Antes,
 * clickear "Catálogo" en el preview del editor abría la landing PÚBLICA de
 * verdad en una pestaña nueva, sin forma de editar nada desde ahí — esta
 * vista in-editor resuelve eso: clickear un producto acá abre el mismo
 * panel de edición que Productos (panels/ProductoPanel.jsx).
 *
 * Título y descripción son PROPIOS de esta página (catalogo_titulo /
 * catalogo_descripcion), no los de la sección "Productos destacados" del
 * home (productos_titulo) — son dos páginas distintas.
 */
export default function CatalogoPreview({
  productos, titulo, descripcion, tema, templateSlug, contacto, nombreComercio, onClickProducto, onVolver, isMobile = false,
}) {
  const t = resolverTemaPorSlug(tema, templateSlug);
  const bordeSuave = hexToRgba(t.texto, 0.12);

  const [filtro, setFiltro] = useState('Todos');
  const parseTags = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
  const etiquetasSet = new Set();
  productos.forEach(p => parseTags(p.etiqueta).forEach(tag => etiquetasSet.add(tag)));
  const etiquetas = ['Todos', ...etiquetasSet];
  const productosFiltrados = filtro === 'Todos' ? productos : productos.filter(p => parseTags(p.etiqueta).includes(filtro));

  return (
    <div className="w-full min-h-full" style={{ backgroundColor: t.fondo, color: t.texto }}>
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: t.fondo }}>
        <button type="button" onClick={onVolver} className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70">
          <ArrowLeft size={16} /> Volver a la landing
        </button>
        <span className="text-xs" style={{ color: hexToRgba(t.texto, 0.5) }}>Catálogo completo — clickeá un producto para editarlo</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-extrabold">{titulo || 'Catálogo de Productos'}</h1>
        {descripcion && (
          <p className="mt-2 max-w-2xl text-sm" style={{ color: hexToRgba(t.texto, 0.6) }}>{descripcion}</p>
        )}

        <div className="mt-6">
        {etiquetas.length > 1 && (
          <div className="flex overflow-x-auto gap-2 pb-4 mb-4" style={{ scrollbarWidth: 'none' }}>
            {etiquetas.map(e => (
              <button 
                key={e} 
                onClick={() => setFiltro(e)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filtro === e ? '' : 'hover:opacity-70'}`}
                style={filtro === e ? { backgroundColor: t.acento, color: t.fondo } : { backgroundColor: hexToRgba(t.texto, 0.05), color: t.texto }}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {productosFiltrados.length === 0 ? (
          <div className="py-16 text-center rounded-2xl" style={{ border: `1px dashed ${bordeSuave}` }}>
            <ImageOff size={32} style={{ color: hexToRgba(t.texto, 0.25), margin: '0 auto 0.75rem' }} />
            <p className="font-semibold mb-1">Todavía no agregaste productos</p>
            <p className="text-sm" style={{ color: hexToRgba(t.texto, 0.5) }}>Elegilos en el panel de la izquierda, pestaña "Catálogo".</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
            {productosFiltrados.map(p => {
              const precio = p.precio_efectivo ?? p.precio_base ?? null;
              // precio_ancla (de esta landing) manda sobre precio_tachado (del
              // producto global) — mismo criterio que la landing pública.
              const precioAntes = p.precio_ancla ?? p.precio_tachado ?? null;
              const enOferta = precioAntes != null && precio != null && Number(precioAntes) > Number(precio);
              const imagenUrl = p.imagen ? getMediaUrl(p.imagen) : null;
              return (
                <div
                  key={`${p.tipo}:${p.id}`}
                  onClick={() => onClickProducto(p)}
                  className="group rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg"
                  style={{ border: `1px solid ${bordeSuave}` }}
                >
                  <div className="aspect-square relative flex items-center justify-center" style={{ backgroundColor: hexToRgba(t.texto, 0.05) }}>
                    {imagenUrl ? <img src={imagenUrl} alt={p.nombre} className="w-full h-full object-cover" /> : <ImageOff size={24} style={{ color: hexToRgba(t.texto, 0.2) }} />}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                      {enOferta && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: t.acento, color: t.fondo }}>Oferta</span>
                      )}
                    </div>
                    {/* Pista de que la tarjeta es clickeable para editar — el
                        comercio no encontraba cómo editar desde acá. */}
                    <span
                      className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: t.acento, color: t.fondo }}
                    >
                      <Pencil size={10} /> Editar
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">{p.nombre}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {precio != null && <span className="text-sm font-bold" style={{ color: t.acento }}>Gs {Number(precio).toLocaleString('es-PY')}</span>}
                      {enOferta && (
                        <span className="text-xs line-through" style={{ color: hexToRgba(t.texto, 0.45) }}>Gs {Number(precioAntes).toLocaleString('es-PY')}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Orden pedido explícitamente: primero las redes sociales, y el
          copyright al final de TODO. Igual en las 3 páginas
          (inicio/catálogo/contacto) y en la landing pública real. */}
      {contacto && (
        <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={bordeSuave} isMobile={isMobile} />
      )}
      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={true} />
    </div>
  );
}
