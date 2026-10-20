import React from 'react';
import ComboProductPagePublica from './templates/combo/ComboProductPagePublica';
import { fichaPropiaCombo } from './comboBloques';
import { contenidoCombo } from './comboContenido';
import ComboCodigoVista from './ComboCodigoVista';

// La ficha de combos es la misma del editor de Combos, también en el lienzo.
// Conserva el contrato comercial del lienzo para comprar y volver al inicio.
export default function FichaComboLienzo({ item, runtime, content, tienda, tema, contacto, preview = false, isMobile = false, onComprar, onVolver, bloqueActivo, onBloque, onActivo, codigoInicio, datos, onNavegar, onCarrito, onCatalogo, onTema }) {
  item = contenidoCombo(item);
  const colores = tienda?.colores || {};
  const propia = fichaPropiaCombo(item, content);
  const ficha = {
    ...item,
    precio: runtime?.precio ?? item.precio_efectivo ?? item.precio,
    precio_antes: runtime?.precio_antes ?? item.precio_antes,
    imagenes: Array.isArray(runtime?.imagenes_url) ? runtime.imagenes_url : (Array.isArray(item.imagenes_landing) ? item.imagenes_landing : (item.imagenes?.length ? item.imagenes : [item.imagen].filter(Boolean))),
    ficha_combo: propia,
    faq: propia.faq?.items ?? item.ficha_datos?.faq?.items ?? item.faq ?? item.preguntas_frecuentes,
    faq_titulo: propia.faq?.titulo ?? item.ficha_datos?.faq?.titulo ?? item.faq_titulo,
  };
  if (codigoInicio) return <ComboCodigoVista item={ficha} content={content} codigoInicio={codigoInicio}
    tema={tema || { fondo: colores.fondo, texto: colores.texto, acento: colores.primario }} tienda={tienda}
    preview={preview} isMobile={isMobile} datos={datos}
    onComprar={onComprar} onNavegar={onNavegar || (p => { if (p.destino === 'inicio') onVolver?.(); })}
    onCarrito={onCarrito} onCatalogo={onCatalogo} onTema={onTema}
    bloqueActivo={bloqueActivo} onBloque={onBloque} onActivo={onActivo} />;
  return <ComboProductPagePublica
    item={ficha}
    landingConfig={content}
    tema={tema || { fondo: colores.fondo, texto: colores.texto, acento: colores.primario }}
    contacto={contacto}
    nombreComercio={tienda?.nombre}
    previewMode={preview}
    isMobile={isMobile}
    bloqueActivo={bloqueActivo} onBloque={onBloque} onActivo={onActivo}
    onVolver={onVolver}
    onAgregar={() => onComprar?.({ producto: runtime?.id || item.content_id || `combo-${item.id}`, cantidad: 1 })}
  />;
}
