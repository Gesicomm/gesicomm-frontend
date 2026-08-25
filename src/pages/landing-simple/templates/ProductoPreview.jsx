import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ImageOff } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import { formatPrecio } from '../../../lib/mensajeWhatsapp';
import { RedesSocialesFooter } from './sections';
import { hexToRgba, resolverTemaPorSlug } from './themeUtils';
import RichText from '../../../components/RichText';
import StoreFooterLegal from '../../landing/StoreFooterLegal';


/**
 * Vista previa (SOLO LECTURA) de la página de un producto dentro del
 * armador de landing. La edición real vive en panels/ProductoPanel.jsx
 * (sidebar izquierdo) — este componente solo refleja ese estado en vivo,
 * mismo patrón que el resto del editor (un panel edita `draft`, el preview
 * de la derecha renderiza `datosPreview` sin tener controles propios). Así
 * se evita duplicar "Volver"/"Guardar" en dos lugares y el preview
 * responde a cada tecla sin esperar a un guardado.
 */
export default function ProductoPreview({ producto, ofertas, imagenes, descripcion, faq, faqTitulo, relacionadosTitulo, relacionados, tema, templateSlug, contacto, nombreComercio, isMobile = false, previewMode = false, onComprar }) {
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [preguntaAbierta, setPreguntaAbierta] = useState(null);
  const [ofertaSeleccionadaId, setOfertaSeleccionadaId] = useState(null);

  const t = resolverTemaPorSlug(tema, templateSlug);
  const bordeSuave = hexToRgba(t.texto, 0.12);
  const precioBase = producto?.precio_efectivo ?? producto?.precio_base ?? producto?.precio ?? null;
  const paquetes = useMemo(
    () => (ofertas || []).filter(o => o.estrategia === 'normal' && o.tipo_contenido === 'pack'),
    [ofertas]
  );
  const paqueteSeleccionado = paquetes.find(o => Number(o.id) === Number(ofertaSeleccionadaId)) || null;
  const precio = paqueteSeleccionado ? (paqueteSeleccionado.precio_efectivo ?? paqueteSeleccionado.precio) : precioBase;

  const galeria = (imagenes || []).map(i => i.url);
  const imagenActual = galeria[indiceImagen] || producto?.imagen || null;
  const itemsRelacionados = Array.isArray(relacionados) ? relacionados : [];
  const tituloRelacionados = (relacionadosTitulo && relacionadosTitulo.trim()) ? relacionadosTitulo.trim() : 'Productos relacionados';

  useEffect(() => {
    if (!ofertaSeleccionadaId) return;
    if (!paquetes.some(o => Number(o.id) === Number(ofertaSeleccionadaId))) {
      setOfertaSeleccionadaId(null);
    }
  }, [paquetes, ofertaSeleccionadaId]);

  function ahorroPaquete(paquete) {
    const unidades = Number(paquete.unidades) || 0;
    const precioUnitario = Number(precioBase) || 0;
    const precioPack = Number(paquete.precio_efectivo ?? paquete.precio) || 0;
    if (unidades < 2 || precioUnitario <= 0 || precioPack <= 0) return null;
    const ahorro = Math.round((1 - precioPack / (precioUnitario * unidades)) * 100);
    return ahorro > 0 ? ahorro : null;
  }

  if (!producto) return null;

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
              <p className="text-xl font-bold mb-4" style={{ color: t.acento }}>{formatPrecio(precio)}</p>
            )}
            {descripcion && <RichText text={descripcion} className="text-sm mb-6" style={{ color: hexToRgba(t.texto, 0.7) }} />}

            {paquetes.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: hexToRgba(t.texto, 0.55) }}>
                  Elegí cómo comprarlo
                </p>
                <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <button
                    type="button"
                    onClick={() => setOfertaSeleccionadaId(null)}
                    className="rounded-xl px-3 py-3 text-left transition-colors"
                    style={{
                      border: `1.5px solid ${!paqueteSeleccionado ? t.acento : bordeSuave}`,
                      backgroundColor: !paqueteSeleccionado ? hexToRgba(t.acento, 0.14) : hexToRgba(t.texto, 0.04),
                      color: t.texto,
                    }}
                  >
                    <span className="block text-sm font-bold">Individual</span>
                    <span className="block text-sm font-extrabold mt-1" style={{ color: t.acento }}>{formatPrecio(precioBase)}</span>
                  </button>

                  {paquetes.map(paquete => {
                    const activa = Number(paquete.id) === Number(ofertaSeleccionadaId);
                    const ahorro = ahorroPaquete(paquete);
                    return (
                      <button
                        key={paquete.id}
                        type="button"
                        onClick={() => setOfertaSeleccionadaId(paquete.id)}
                        className="rounded-xl px-3 py-3 text-left transition-colors relative overflow-hidden"
                        style={{
                          border: `1.5px solid ${activa ? t.acento : bordeSuave}`,
                          backgroundColor: activa ? hexToRgba(t.acento, 0.14) : hexToRgba(t.texto, 0.04),
                          color: t.texto,
                        }}
                      >
                        {ahorro && (
                          <span className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold" style={{ backgroundColor: t.acento, color: t.fondo }}>
                            -{ahorro}%
                          </span>
                        )}
                        <span className="block text-sm font-bold pr-12">{paquete.nombre}</span>
                        <span className="block text-sm font-extrabold mt-1" style={{ color: t.acento }}>
                          {formatPrecio(paquete.precio_efectivo ?? paquete.precio)}
                        </span>
                        {paquete.unidades && (
                          <span className="block text-xs mt-1" style={{ color: hexToRgba(t.texto, 0.55) }}>
                            Paquete × {paquete.unidades}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onComprar && onComprar(paqueteSeleccionado)}
              className="w-full font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: t.acento, color: t.fondo }}
            >
              Comprar Ahora
            </button>
          </div>
        </div>

        {(faq?.length > 0 || previewMode) && (
          <div className="mt-12 pt-8 max-w-4xl" style={{ borderTop: `1px solid ${bordeSuave}` }}>
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

        {itemsRelacionados.length > 0 && (
          <div className="mt-12 pt-8 max-w-4xl" style={{ borderTop: `1px solid ${bordeSuave}` }}>
            <h2 className="text-lg font-extrabold mb-6">{tituloRelacionados}</h2>
            {itemsRelacionados.length === 0 ? (
              <p className="text-sm italic" style={{ color: hexToRgba(t.texto, 0.4) }}>
                (Los productos relacionados que agregues se mostrarán aquí)
              </p>
            ) : (
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                {itemsRelacionados.map((r) => {
                  const precioRel = r.precio_efectivo ?? r.precio_base ?? r.precio ?? null;
                  const precioAntes = r.precio_ancla ?? r.precio_tachado ?? null;
                  const enOferta = precioAntes != null && precioRel != null && Number(precioAntes) > Number(precioRel);
                  const imagenUrl = r.imagen ? getMediaUrl(r.imagen) : null;
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${bordeSuave}` }}
                    >
                      <div className="aspect-square relative flex items-center justify-center" style={{ backgroundColor: hexToRgba(t.texto, 0.05) }}>
                        {imagenUrl ? <img src={imagenUrl} alt={r.nombre} className="w-full h-full object-cover" /> : <ImageOff size={24} style={{ color: hexToRgba(t.texto, 0.2) }} />}
                        {enOferta && (
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: t.acento, color: t.fondo }}>Oferta</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-sm truncate">{r.nombre}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {precioRel != null && <span className="text-sm font-bold" style={{ color: t.acento }}>Gs {Number(precioRel).toLocaleString('es-PY')}</span>}
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
        )}
      </div>

      {contacto && (
        <div>
          <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={bordeSuave} isMobile={isMobile} />
        </div>
      )}
      <StoreFooterLegal tema={t} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={true} />
    </div>
  );
}
