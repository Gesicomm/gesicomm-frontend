import React, { useMemo } from 'react';
import CodigoPreview from './CodigoPreview';
import { codigoFichaCombo, rotulosCombo } from './codigoFichaCombo';

export default function ComboCodigoVista({ item, content, codigoInicio, tema, tienda, isMobile, preview, datos, onComprar, onNavegar, onCarrito, onCatalogo, onTema, onBloque, onActivo, bloqueActivo }) {
  const firma = JSON.stringify({ item, content, codigoInicio, tema, tienda, isMobile, preview });
  const codigo = useMemo(() => codigoFichaCombo({ item, content, codigoInicio, tema, tienda, isMobile, preview }),
    // Los handlers de hover no deben regenerar la página ni perder su scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firma]);
  const datosCombo = { ...datos, vista: 'producto',
    // El layout ya fue resuelto por los bloques propios del combo. Los
    // ajustes antiguos de una ficha individual no deben volver a ocultarlo.
    producto: datos?.producto ? { ...datos.producto, ficha_bloques: {}, ficha_orden_mobile: [], codigo_bloques: codigo.bloquesFicha || {} } : null,
    ...(preview ? { editor_bloques: rotulosCombo(item) } : { editor_bloques: null }) };
  return <CodigoPreview codigo={codigo} titulo={preview ? 'Vista previa del combo' : item.nombre} datos={datosCombo}
    previewDevice={isMobile ? 'mobile' : 'desktop'}
    preservarScroll={preview}
    edicionCombo={preview ? JSON.stringify([item.referencia_id || item.id || 'borrador', codigoInicio, content?.codigo]) : null}
    onCheckout={onComprar} onNavegar={onNavegar} onCarrito={onCarrito} onCatalogo={onCatalogo} onTema={onTema}
    onBloque={onBloque} onBloqueActivo={preview ? onActivo : null}
    resaltar={bloqueActivo ? { lista: bloqueActivo, n: bloqueActivo, desplazar: false } : null} />;
}
