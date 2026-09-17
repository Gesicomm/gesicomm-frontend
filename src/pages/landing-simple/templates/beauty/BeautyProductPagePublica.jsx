import React, { useMemo, useState } from 'react';
import BeautyProductPage from './BeautyProductPage';
import { fichaBeautyDesdeProducto, resolverFichaBeauty } from './fichaBeauty';
import { armarItemFicha } from '../fichaComun';
import FunnelCheckout from '../../../funnel/FunnelCheckout';

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
  onComprarAhora,
  onClickRelacionado,
  onVolver,
  deliveryCiudades = [],
}) {
  const [enCompra, setEnCompra] = useState({ variante: null, pack: null });
  const [comprando, setComprando] = useState(false);

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

  return (
    <>
      <BeautyProductPage
        item={itemFicha}
        ficha={ficha}
        tema={tema}
        contacto={contacto}
        nombreComercio={nombreComercio}
        previewMode={false}
        onVolver={onVolver}
        onClickRelacionado={onClickRelacionado}
        onAgregar={(eleccion) => onAgregar && onAgregar({
          item,
          variante: null,
          oferta: eleccion?.pack || null,
          cantidad: 1,
          precio: precioDe(eleccion),
        })}
        onComprar={(eleccion) => { setEnCompra(eleccion || { variante: null, pack: null }); setComprando(true); }}
      />

      <FunnelCheckout
        abierto={comprando}
        onCerrar={() => setComprando(false)}
        tema={tema || {}}
        resumen={{
          nombre: enCompra.pack ? `${item.nombre} — ${enCompra.pack.nombre}` : item.nombre,
          variante: null,
          precio: precioDe(enCompra),
          cantidad: 1,
          imagen: item.imagenes?.[0] || null,
        }}
        ofertasLanding={landingConfig?.ofertas_producto_vista || []}
        itemOriginal={item}
        deliveryCiudades={deliveryCiudades}
        onConfirmar={(form, ofertasCheckout = []) => {
          if (!onComprarAhora) return undefined;
          // El paquete elegido y las ofertas del checkout (order bumps) son
          // cosas distintas y viajan por separado: el bump nunca pisa el
          // precio del producto principal.
          return onComprarAhora(item, null, enCompra.pack, 1, precioDe(enCompra), form, ofertasCheckout);
        }}
      />
    </>
  );
}
