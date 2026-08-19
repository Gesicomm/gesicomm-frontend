import React, { useState } from 'react';
import { ChevronDown, ImageOff } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import { RedesSocialesFooter } from './sections';
import { hexToRgba, resolverTema } from './themeUtils';
import RichText from '../../../components/RichText';

const DEFAULT_TEMA = { fondo: '#ffffff', texto: '#111111', acento: '#111111' };

/**
 * Vista previa (SOLO LECTURA) de la página de un producto dentro del
 * armador de landing. La edición real vive en panels/ProductoPanel.jsx
 * (sidebar izquierdo) — este componente solo refleja ese estado en vivo,
 * mismo patrón que el resto del editor (un panel edita `draft`, el preview
 * de la derecha renderiza `datosPreview` sin tener controles propios). Así
 * se evita duplicar "Volver"/"Guardar" en dos lugares y el preview
 * responde a cada tecla sin esperar a un guardado.
 */
export default function ProductoPreview({ producto, imagenes, descripcion, faq, faqTitulo, tema, contacto, nombreComercio, isMobile = false, previewMode = false }) {
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [preguntaAbierta, setPreguntaAbierta] = useState(null);

  if (!producto) return null;
  const t = resolverTema(tema, DEFAULT_TEMA);
  const bordeSuave = hexToRgba(t.texto, 0.12);
  const precio = producto.precio_efectivo ?? producto.precio_base ?? null;

  const galeria = (imagenes || []).map(i => i.url);
  const imagenActual = galeria[indiceImagen] || producto.imagen || null;

  return (
    <div className="w-full min-h-full" style={{ backgroundColor: t.fondo, color: t.texto }}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className={`grid gap-10 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          <div className="flex flex-col gap-3">
            <div className="aspect-square rounded-2xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: hexToRgba(t.texto, 0.06) }}>
              {imagenActual ? (
                <img src={getMediaUrl(imagenActual)} alt={producto.nombre} className="w-full h-full object-cover" />
              ) : (
                <ImageOff size={40} style={{ color: hexToRgba(t.texto, 0.25) }} />
              )}
            </div>
            {galeria.length > 1 && (
              <div className="flex gap-2">
                {galeria.map((url, idx) => (
                  <button
                    key={url + idx}
                    type="button"
                    onClick={() => setIndiceImagen(idx)}
                    className="w-14 h-14 rounded-lg overflow-hidden shrink-0"
                    style={{ border: idx === indiceImagen ? `2px solid ${t.acento}` : `1px solid ${bordeSuave}` }}
                  >
                    <img src={getMediaUrl(url)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {producto.categoria && (
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.acento }}>{producto.categoria}</p>
            )}
            <h1 className="text-2xl font-extrabold mb-3">{producto.nombre}</h1>
            {precio != null && (
              <p className="text-xl font-bold mb-4" style={{ color: t.acento }}>Gs {Number(precio).toLocaleString('es-PY')}</p>
            )}
            {descripcion && <RichText text={descripcion} className="text-sm mb-6" style={{ color: hexToRgba(t.texto, 0.7) }} />}

            <button
              type="button"
              disabled
              title="El carrito funciona en la landing publicada"
              className="w-full font-bold px-6 py-3 rounded-lg opacity-60 cursor-not-allowed"
              style={{ backgroundColor: t.acento, color: t.fondo }}
            >
              Agregar al carrito
            </button>
          </div>
        </div>

        {(faq?.length > 0 || previewMode) && (
          <div className="mt-12 pt-8 max-w-2xl" style={{ borderTop: `1px solid ${bordeSuave}` }}>
            <h2 className="text-lg font-extrabold mb-4">{faqTitulo || 'Todo lo que necesitas saber'}</h2>
            {faq?.length === 0 ? (
              <p className="text-sm italic" style={{ color: hexToRgba(t.texto, 0.4) }}>
                (Las preguntas frecuentes que agregues se mostrarán aquí)
              </p>
            ) : (
              faq.map((f, idx) => (
              <div key={idx} className="py-3" style={{ borderTop: idx > 0 ? `1px solid ${bordeSuave}` : 'none' }}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 text-left text-sm font-semibold"
                  onClick={() => setPreguntaAbierta(preguntaAbierta === idx ? null : idx)}
                >
                  {f.pregunta || <span style={{ color: hexToRgba(t.texto, 0.3) }}>(pregunta sin título)</span>}
                  <ChevronDown size={15} style={{ color: t.acento, transform: preguntaAbierta === idx ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                </button>
                {preguntaAbierta === idx && (
                  <p className="mt-2 text-sm" style={{ color: hexToRgba(t.texto, 0.6) }}>{f.respuesta}</p>
                )}
              </div>
              ))
            )}
          </div>
        )}
      </div>

      {contacto && (
        <div>
          <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={bordeSuave} isMobile={isMobile} />
        </div>
      )}
      <footer className="px-6 py-8 text-center text-xs" style={{ borderTop: `1px solid ${bordeSuave}`, color: hexToRgba(t.texto, 0.4) }}>
        © {new Date().getFullYear()} {nombreComercio}
      </footer>
    </div>
  );
}
