import React, { useMemo } from 'react';
import BeautyProductPage from './BeautyProductPage';
import { fichaBeautyDesdeProducto, resolverFichaBeauty } from './fichaBeauty';
import { armarItemFicha } from '../fichaComun';

/**
 * La ficha de Beauty en la landing PUBLICADA.
 *
 * A propósito no dibuja nada: traduce el DTO público al `item` que espera
 * BeautyProductPage, resuelve la ficha con el mismo módulo que usa el
 * editor y le cuelga el checkout. Todo el diseño vive en BeautyProductPage,
 * que es exactamente el mismo componente que monta el preview del armador —
 * eso es lo que garantiza que lo que el comercio ve mientras edita sea lo
 * que se publica.
 *
 * El equivalente del lado del editor es la rama `fichaBeautyResuelta` de
 * PreviewContent en LandingSimpleEditor.jsx. Si cambia la forma del `item`,
 * cambian los dos.
 */
export default function BeautyProductPagePublica({
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
    () => resolverFichaBeauty(item?.ficha_beauty, landingConfig?.ficha_beauty, fichaBeautyDesdeProducto(item)),
    [item, landingConfig?.ficha_beauty]
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

  // Un paquete trae su precio total: es otra forma de comprar lo mismo.
  const precioDe = ({ pack } = {}) => (pack ? (pack.precio_efectivo ?? pack.precio) : item.precio);
  const agregarCompra = (eleccion) => onAgregar && onAgregar({
    item,
    variante: null,
    oferta: eleccion?.pack || null,
    cantidad: 1,
    precio: precioDe(eleccion),
  });

  return (
    <BeautyProductPage
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
