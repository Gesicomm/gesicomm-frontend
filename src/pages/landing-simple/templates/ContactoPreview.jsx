import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { hexToRgba, resolverTemaPorSlug } from './themeUtils';
import StoreFooterLegal from '../../landing/StoreFooterLegal';
import StoreHeader from './StoreHeader';
import ContactoView from './ContactoView';

/**
 * Vista previa (dentro del editor) de la página de Contacto — igual que
 * CatalogoPreview.jsx, antes clickear "Contacto" en el preview del editor
 * navegaba a la landing pública de verdad. La edición de estos datos ya
 * vive en la pestaña "Redes sociales" del sidebar (no hay nada clickeable
 * acá para editar, a diferencia del catálogo con sus productos) — este
 * componente solo evita que el comercio se vaya del editor al mirar cómo
 * queda la página.
 *
 * El cuerpo es ContactoView.jsx, el MISMO componente que monta
 * ContactoPublico.jsx — ver memoria gesicomm-preview-igual-publicada.
 */
export default function ContactoPreview({ contacto, tema, templateSlug, nombreComercio, logo, onClickInicio, onClickCatalogo, onClickContacto, onVolver, isMobile = false }) {
  const t = resolverTemaPorSlug(tema, templateSlug);
  const bordeSuave = hexToRgba(t.texto, 0.12);

  return (
    <div className="w-full min-h-full flex flex-col" style={{ backgroundColor: t.fondo, color: t.texto }}>
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: t.fondo }}>
        <button type="button" onClick={onVolver} className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70">
          <ArrowLeft size={16} /> Volver a la landing
        </button>
        <span className="text-xs" style={{ color: hexToRgba(t.texto, 0.5) }}>Página de Contacto</span>
      </div>

      <StoreHeader
        templateSlug={templateSlug}
        isMobile={isMobile}
        nombreComercio={nombreComercio}
        logo={logo}
        tema={t}
        cantidadCarrito={0}
        previewMode={true}
        onClickInicio={onClickInicio}
        onClickCatalogo={onClickCatalogo}
        onClickContacto={onClickContacto}
      />

      <main className="flex-1 flex flex-col">
        <ContactoView contacto={contacto} tema={t} bordeSuave={bordeSuave} />
      </main>

      <StoreFooterLegal tema={t} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={true} />
    </div>
  );
}
