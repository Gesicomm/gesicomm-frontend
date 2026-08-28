import React, { useMemo, useState } from 'react';
import TechProductPage from './TechProductPage';
import { fichaTechDesdeProducto, resolverFichaTech } from './fichaTech';
import { armarItemFicha } from '../fichaComun';
import FunnelCheckout from '../../../funnel/FunnelCheckout';

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
  onComprarAhora,
  onClickRelacionado,
  onVolver,
}) {
  const [varianteEnCompra, setVarianteEnCompra] = useState(null);
  const [comprando, setComprando] = useState(false);

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
    faq: item?.faq,
    faqTitulo: item?.faq_titulo,
    relacionados: relacionados?.items,
    relacionadosTitulo: relacionados?.titulo,
  }), [item, relacionados]);

  if (!item) return null;

  const precioDe = (variante) => variante?.precio_efectivo ?? item.precio;

  return (
    <>
      <TechProductPage
        item={itemFicha}
        ficha={ficha}
        tema={tema}
        contacto={contacto}
        nombreComercio={nombreComercio}
        onVolver={onVolver}
        onClickRelacionado={onClickRelacionado}
        onAgregar={(variante) => onAgregar && onAgregar({
          item, variante, oferta: null, cantidad: 1, precio: precioDe(variante),
        })}
        onComprar={(variante) => { setVarianteEnCompra(variante); setComprando(true); }}
      />

      <FunnelCheckout
        abierto={comprando}
        onCerrar={() => setComprando(false)}
        tema={tema || {}}
        resumen={{
          nombre: varianteEnCompra ? `${item.nombre} (${varianteEnCompra.nombre})` : item.nombre,
          variante: varianteEnCompra?.nombre || null,
          precio: precioDe(varianteEnCompra),
          imagen: item.imagenes?.[0] || null,
        }}
        ofertasLanding={landingConfig?.ofertas_producto_vista || []}
        itemOriginal={item}
        onConfirmar={(form, ofertasCheckout = []) => {
          if (!onComprarAhora) return undefined;
          // La variante elegida y las ofertas del checkout (order bumps) son
          // cosas distintas y viajan por separado: el bump nunca pisa el
          // precio del producto principal.
          return onComprarAhora(item, varianteEnCompra, null, 1, precioDe(varianteEnCompra), form, ofertasCheckout);
        }}
      />
    </>
  );
}
