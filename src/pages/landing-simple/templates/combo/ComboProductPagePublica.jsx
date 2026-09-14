import React, { useMemo, useState } from 'react';
import ComboProductPage from './ComboProductPage';
import { fichaComboDesdeProducto, resolverFichaCombo } from './fichaCombo';
import { armarItemFicha } from '../fichaComun';
import FunnelCheckout from '../../../funnel/FunnelCheckout';

/**
 * La ficha del Combo en la landing PUBLICADA.
 *
 * Mismo criterio que BasicoProductPagePublica.jsx: no dibuja nada, traduce
 * el DTO público al `item` que espera ComboProductPage, resuelve la ficha
 * con el mismo módulo que usa el editor y le cuelga el checkout. El diseño
 * vive en ComboProductPage, que es el MISMO componente que monta el
 * preview del armador (ver la rama `fichaComboResuelta` de PreviewContent
 * en LandingSimpleEditor.jsx) — así preview y publicada nunca se
 * desincronizan.
 *
 * A diferencia de Fitness/Tech/Beauty/Básico, esta ficha se usa siempre
 * que `item.tipo === 'combo'`, sin importar qué template use el resto de
 * la landing: un combo no tiene rubro, es su propia entidad.
 */
export default function ComboProductPagePublica({
  item,
  landingConfig,
  tema,
  templateSlug,
  contacto,
  nombreComercio,
  // Agregar al carrito — recorrido real de compra, igual que un producto
  // individual (ver TiendaPaginaView.jsx: agrega y abre el carrito, donde
  // se elige PagoPar o contra entrega).
  onAgregar,
  onComprarAhora,
  onVolver,
  deliveryCiudades = [],
}) {
  const [comprando, setComprando] = useState(false);

  const ficha = useMemo(
    () => resolverFichaCombo(item?.ficha_combo, landingConfig?.ficha_combo, fichaComboDesdeProducto(item)),
    [item, landingConfig?.ficha_combo]
  );

  const itemFicha = useMemo(() => armarItemFicha({
    nombre: item?.nombre,
    categoria: item?.categoria,
    descripcion: item?.descripcion_larga || item?.descripcion,
    precio: item?.precio,
    precioAntes: item?.precio_antes,
    imagenes: item?.imagenes,
    faq: item?.faq,
    faqTitulo: item?.faq_titulo,
    // `productos_combo`, no `productos_incluidos`: ese último es solo
    // nombres y lo comparten otras vistas (ProductDetailBlock, VitrinaGrid).
    productosIncluidos: item?.productos_combo,
  }), [item]);

  if (!item) return null;

  return (
    <>
      <ComboProductPage
        item={itemFicha}
        ficha={ficha}
        tema={tema}
        templateSlug={templateSlug}
        contacto={contacto}
        nombreComercio={nombreComercio}
        previewMode={false}
        onVolver={onVolver}
        onAgregar={onAgregar ? (eleccion) => onAgregar({
          item,
          variante: null,
          oferta: null,
          cantidad: 1,
          precio: eleccion?.precio ?? item.precio,
        }) : null}
        onComprar={() => setComprando(true)}
      />

      <FunnelCheckout
        abierto={comprando}
        onCerrar={() => setComprando(false)}
        tema={tema || {}}
        resumen={{
          nombre: item.nombre,
          variante: null,
          precio: item.precio,
          cantidad: 1,
          imagen: item.imagenes?.[0] || null,
        }}
        ofertasLanding={landingConfig?.ofertas_producto_vista || []}
        itemOriginal={item}
        deliveryCiudades={deliveryCiudades}
        onConfirmar={(form, ofertasCheckout = []) => {
          if (!onComprarAhora) return undefined;
          return onComprarAhora(item, null, null, 1, item.precio, form, ofertasCheckout);
        }}
      />
    </>
  );
}
