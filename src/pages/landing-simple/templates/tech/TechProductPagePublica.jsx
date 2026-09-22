import React, { useMemo } from 'react';
import TechProductPage from './TechProductPage';
import { fichaTechDesdeProducto, resolverFichaTech } from './fichaTech';
import { armarItemFicha } from '../fichaComun';

/**
 * La ficha de Electrónica en la landing PUBLICADA.
 *
 * A propósito no dibuja nada: traduce el DTO público al `item` que espera
 * TechProductPage, resuelve la ficha con el mismo módulo que usa el editor
 * y le cuelga el checkout. Todo el diseño vive en TechProductPage, que es
 * exactamente el mismo componente que monta el preview del armador — eso es
 * lo que garantiza que lo que el comercio ve mientras edita sea lo que se
 * publica.
 *
 * El equivalente del lado del editor es la rama `fichaTechResuelta` de
 * PreviewContent en LandingSimpleEditor.jsx. Si cambia la forma del `item`,
 * cambian los dos.
 */
export default function TechProductPagePublica({
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
    () => resolverFichaTech(item?.ficha_tech, landingConfig?.ficha_tech, fichaTechDesdeProducto(item)),
    [item, landingConfig?.ficha_tech]
  );

  const itemFicha = useMemo(() => armarItemFicha({
    nombre: item?.nombre,
    categoria: item?.categoria,
    // descripcion_larga ya viene con el override de la landing aplicado del
    // lado del servidor (ver LandingService.overrideDeProducto).
    descripcion: item?.descripcion_larga || item?.descripcion,
    precio: item?.precio,
    precioAntes: item?.precio_antes,
    imagenes: item?.imagenes,
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
  // dos formas distintas de comprar el mismo producto.
  const precioDe = ({ variante, pack } = {}) => (
    pack ? (pack.precio_efectivo ?? pack.precio) : (variante?.precio_efectivo ?? item.precio)
  );
  const agregarCompra = (eleccion) => onAgregar && onAgregar({
    item,
    variante: eleccion?.variante || null,
    oferta: eleccion?.pack || null,
    cantidad: 1,
    precio: precioDe(eleccion),
  });

  return (
    <TechProductPage
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
