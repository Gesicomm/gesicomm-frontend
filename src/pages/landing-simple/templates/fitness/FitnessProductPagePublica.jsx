import React, { useMemo } from 'react';
import FitnessProductPage from './FitnessProductPage';
import { armarItemFicha, fichaDesdeMarketing, resolverFichaFitness } from './fichaFitness';

/**
 * La ficha Fitness en la landing PUBLICADA.
 *
 * A propósito no dibuja nada: solo traduce el DTO público al `item` que
 * espera FitnessProductPage, resuelve la ficha con el mismo módulo que usa
 * el editor y le cuelga el checkout. Todo el diseño vive en
 * FitnessProductPage, que es exactamente el mismo componente que monta el
 * preview del armador — que es lo que garantiza que lo que el comercio ve
 * mientras edita sea lo que se publica.
 *
 * El equivalente del lado del editor es la rama `fichaResuelta` de
 * PreviewContent en LandingSimpleEditor.jsx. Si cambia la forma del `item`,
 * cambian los dos.
 */
export default function FitnessProductPagePublica({
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
    () => resolverFichaFitness(item?.ficha, landingConfig?.ficha_fitness, fichaDesdeMarketing(item)),
    [item, landingConfig?.ficha_fitness]
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
  // dos formas distintas de comprar el mismo producto (mismo criterio que
  // Tech/Beauty/Básico).
  const precioDe = ({ variante, pack } = {}) => (
    pack ? (pack.precio_efectivo ?? pack.precio) : (variante?.precio_efectivo ?? item.precio)
  );
  const agregarCompra = (eleccion) => onAgregar && onAgregar({
    item,
    // eleccion es {variante, pack, precio} (ver comprar() en
    // FitnessProductPage) — sin esto el color/talla elegido nunca llegaba
    // al carrito, y "oferta" podía terminar siendo el objeto eleccion
    // entero en vez de null cuando no se elegía ningún pack.
    variante: eleccion?.variante || null,
    oferta: eleccion?.pack || null,
    cantidad: 1,
    precio: precioDe(eleccion),
  });

  return (
    <FitnessProductPage
      item={itemFicha}
      ficha={ficha}
      tema={tema}
      contacto={contacto}
      nombreComercio={nombreComercio}
      previewMode={false}
      onVolver={onVolver}
      onClickRelacionado={onClickRelacionado}
      onComprar={agregarCompra}
    />
  );
}
