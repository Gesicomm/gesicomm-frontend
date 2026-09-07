import React, { useMemo, useState } from 'react';
import FitnessProductPage from './FitnessProductPage';
import { armarItemFicha, fichaDesdeMarketing, resolverFichaFitness } from './fichaFitness';
import FunnelCheckout from '../../../funnel/FunnelCheckout';

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
  onComprarAhora,
  onClickRelacionado,
  onVolver,
  deliveryCiudades = [],
}) {
  const [packEnCompra, setPackEnCompra] = useState(null);
  const [comprando, setComprando] = useState(false);

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
    faq: item?.faq,
    faqTitulo: item?.faq_titulo,
    relacionados: relacionados?.items,
    relacionadosTitulo: relacionados?.titulo,
  }), [item, relacionados]);

  if (!item) return null;

  const precioDe = (pack) => (pack ? (pack.precio_efectivo ?? pack.precio) : item.precio);

  return (
    <>
      <FitnessProductPage
        item={itemFicha}
        ficha={ficha}
        tema={tema}
        contacto={contacto}
        nombreComercio={nombreComercio}
        onVolver={onVolver}
        onClickRelacionado={onClickRelacionado}
        onComprar={(pack) => { setPackEnCompra(pack); setComprando(true); }}
      />

      <FunnelCheckout
        abierto={comprando}
        onCerrar={() => setComprando(false)}
        tema={tema || {}}
        resumen={{
          nombre: packEnCompra ? `${item.nombre} — ${packEnCompra.nombre}` : item.nombre,
          variante: null,
          precio: precioDe(packEnCompra),
          cantidad: 1,
          imagen: item.imagenes?.[0] || null,
        }}
        ofertasLanding={landingConfig?.ofertas_producto_vista || []}
        itemOriginal={item}
        deliveryCiudades={deliveryCiudades}
        onConfirmar={(form, ofertasCheckout = []) => {
          if (!onComprarAhora) return undefined;
          // El paquete elegido en la ficha y las ofertas del checkout (order
          // bumps) son cosas distintas y viajan por separado, igual que en
          // ProductPagePublica: el bump nunca pisa el precio del principal.
          return onComprarAhora(item, null, packEnCompra, 1, precioDe(packEnCompra), form, ofertasCheckout);
        }}
      />
    </>
  );
}
