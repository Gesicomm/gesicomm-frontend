import React, { useMemo } from 'react';
import BeautyProductPage from './BeautyProductPage';
import { resolverFichaBeauty, fichaBeautyDesdeProducto } from './fichaBeauty';
import { armarItemFicha } from '../fichaComun';
import { urlPublicaLanding } from '../../urlPublicaLanding';
import { ofertaAFormaPublica } from '../../../../services/ofertaService';

export default function BeautyProductPagePublica({
  item,
  landingConfig,
  tema,
  contacto,
  nombreComercio,
  relacionados = [],
  onComprarAhora,
  onVolver,
  onClickRelacionado,
}) {
  const itemMapeado = useMemo(() => armarItemFicha({
    ...item,
    descripcion: item.descripcion,
    imagenes: item.imagenes?.map(i => i.url) || [],
    ofertas: (item.ofertas || []).map(o => ofertaAFormaPublica(o, item.id)),
    faq: item.faq,
    faqTitulo: landingConfig?.faqTitulo,
    relacionados,
    relacionadosTitulo: landingConfig?.relacionadosTitulo,
  }), [item, landingConfig, relacionados]);

  const fichaBeautyDelProducto = useMemo(() => fichaBeautyDesdeProducto(item), [item]);

  const fichaTech = resolverFichaBeauty(
    item.ficha_beauty || {},
    landingConfig?.ficha_beauty || {},
    fichaBeautyDelProducto
  );

  return (
    <div className="flex flex-col min-h-screen">
      <BeautyProductPage
        item={itemMapeado}
        ficha={fichaTech}
        tema={tema}
        templateSlug="beauty-skincare"
        contacto={contacto}
        nombreComercio={nombreComercio}
        previewMode={false}
        onComprar={onComprarAhora}
        onVolver={onVolver}
        onClickRelacionado={onClickRelacionado}
      />
    </div>
  );
}
