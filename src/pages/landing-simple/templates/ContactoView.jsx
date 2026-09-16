import React from 'react';
import { hexToRgba } from './themeUtils';
import { ContactoSection, DatosContactoSection } from './sections';

/**
 * Cuerpo de la página de Contacto (título + intro + datos de contacto +
 * redes) — el ÚNICO renderer, montado tanto por ContactoPublico.jsx
 * (landing real) como por ContactoPreview.jsx (editor). Antes cada uno
 * dibujaba su propia versión (título, ancho del contenedor y sombra de la
 * tarjeta distintos) y se fueron desincronizando — ver memoria
 * gesicomm-preview-igual-publicada, mismo bug que ya pasó con el catálogo
 * (ver CatalogoView.jsx).
 */
export default function ContactoView({ contacto, tema, bordeSuave }) {
  return (
    <div className="max-w-4xl mx-auto w-full px-6 pt-10 pb-20">
      <h1 className="text-4xl font-bold text-center mb-4">Información de Contacto</h1>
      <p className="text-center max-w-2xl mx-auto mb-10 opacity-80" style={{ color: tema.texto }}>
        Si tiene consultas, reclamos o necesita asistencia relacionada con nuestros productos, pedidos o políticas, puede comunicarse con nosotros a través de los siguientes medios. Nuestro equipo de atención al cliente hará sus mejores esfuerzos para responder en el menor tiempo posible.
      </p>
      <div className="rounded-3xl px-6 shadow-sm" style={{ border: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.texto, 0.03) }}>
        <DatosContactoSection
          contacto={contacto}
          acento={tema.acento}
          tituloClase="font-bold"
          bordeSuave="transparent"
          textoSuave={(a) => ({ color: hexToRgba(tema.texto, a) })}
          isMobile={false}
        />
        <ContactoSection contacto={contacto} acento={tema.acento} tituloClase="font-bold" bordeSuave={bordeSuave} isMobile={false} />
      </div>
    </div>
  );
}
