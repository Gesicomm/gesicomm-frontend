import React, { useMemo } from 'react';
import ModaProductPage from './ModaProductPage';
import { fichaModaDesdeProducto, resolverFichaModa } from './fichaModa';
import { armarItemFicha } from '../fichaComun';

/**
 * La ficha de Moda en la landing PUBLICADA.
 *
 * A propósito no dibuja nada: traduce el DTO público al `item` que espera
 * ModaProductPage, resuelve la ficha con el mismo módulo que usa el
 * editor y le cuelga el checkout. Todo el diseño vive en ModaProductPage,
 * que es exactamente el mismo componente que monta el preview del armador —
 * eso es lo que garantiza que lo que el comercio ve mientras edita sea lo
 * que se publica.
 *
 * El equivalente del lado del editor es la rama `fichaModaResuelta` de
 * PreviewContent en LandingSimpleEditor.jsx. Si cambia la forma del `item`,
 * cambian los dos.
 */
export default function ModaProductPagePublica({
  item,
  landingConfig,
  tema,
  contacto,
  nombreComercio,
  relacionados,
  onAgregar,
  onClickRelacionado,
  onVolver,
}) {
  const ficha = useMemo(
    () => resolverFichaModa(item?.ficha_moda, landingConfig?.ficha_moda, fichaModaDesdeProducto(item)),
    [item, landingConfig?.ficha_moda]
  );

  const itemFicha = useMemo(() => armarItemFicha({
    nombre: item?.nombre,
    categoria: item?.categoria,
    // descripcion_larga ya viene con el override de la landing aplicado del
    // lado del servidor (ver LandingService.overrideDeProducto).
    descripcion: item?.descripcion_larga || item?.descripcion,
    precio: item?.precio,
    precioAntes: item?.precio_antes,
    // En el DTO público `imagenes` ya es un array de URLs, no de objetos:
    // mapearlo con `i.url` dejaba la galería vacía.
    imagenes: item?.imagenes,
    // Las ofertas ya vienen en forma pública del backend; volver a
    // convertirlas con el traductor del admin las corrompía.
    ofertas: item?.ofertas,
    variantes: item?.variantes,
    opciones: item?.opciones,
    faq: item?.faq,
    faqTitulo: item?.faq_titulo,
    relacionados: relacionados?.items,
    relacionadosTitulo: relacionados?.titulo,
  }), [item, relacionados]);

  if (!item) return null;

  // Un paquete trae su precio total y no se combina con la variante: son
  // dos formas distintas de comprar el mismo producto (mismo criterio que
  // Tech/Básico).
  const precioDe = ({ variante, pack } = {}) => (
    pack ? (pack.precio_efectivo ?? pack.precio) : (variante?.precio_efectivo ?? item.precio)
  );
  const agregarCompra = (eleccion) => onAgregar && onAgregar({
    item,
    // Sin esto el checkout vendía "el producto" a secas, sin registrar
    // qué variante (color/talla) eligió el cliente ni descontar su stock
    // propio.
    variante: eleccion?.variante || null,
    oferta: eleccion?.pack || null,
    // La ficha tiene selector de cantidad; el carrito la recorta al stock.
    cantidad: Math.max(1, Number(eleccion?.cantidad) || 1),
    precio: precioDe(eleccion),
  });

  return (
    <ModaProductPage
      item={itemFicha}
      ficha={ficha}
      tema={tema}
      contacto={contacto}
      nombreComercio={nombreComercio}
      previewMode={false}
      onVolver={onVolver}
      onClickRelacionado={onClickRelacionado}
      onAgregar={agregarCompra}
      onComprar={agregarCompra}
    />
  );
}
