import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { hexToRgba, resolverTema } from './themeUtils';
import { ContactoSection, DatosContactoSection } from './sections';

const DEFAULT_TEMA = { fondo: '#ffffff', texto: '#111111', acento: '#111111' };

/**
 * Vista previa (dentro del editor) de la página de Contacto — igual que
 * CatalogoPreview.jsx, antes clickear "Contacto" en el preview del editor
 * navegaba a la landing pública de verdad. La edición de estos datos ya
 * vive en la pestaña "Redes sociales" del sidebar (no hay nada clickeable
 * acá para editar, a diferencia del catálogo con sus productos) — este
 * componente solo evita que el comercio se vaya del editor al mirar cómo
 * queda la página.
 */
export default function ContactoPreview({ contacto, tema, nombreComercio, onVolver }) {
  const t = resolverTema(tema, DEFAULT_TEMA);
  const bordeSuave = hexToRgba(t.texto, 0.12);

  return (
    <div className="w-full min-h-full flex flex-col" style={{ backgroundColor: t.fondo, color: t.texto }}>
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: t.fondo }}>
        <button type="button" onClick={onVolver} className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70">
          <ArrowLeft size={16} /> Volver a la landing
        </button>
        <span className="text-xs" style={{ color: hexToRgba(t.texto, 0.5) }}>Página de Contacto</span>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <h1 className="text-3xl font-bold text-center mb-8">Contacto</h1>
        <div className="rounded-3xl px-6" style={{ border: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(t.texto, 0.03) }}>
          <DatosContactoSection
            contacto={contacto}
            acento={t.acento}
            tituloClase="font-bold"
            bordeSuave="transparent"
            textoSuave={(a) => ({ color: hexToRgba(t.texto, a) })}
            isMobile={false}
          />
          <ContactoSection contacto={contacto} acento={t.acento} tituloClase="font-bold" bordeSuave={bordeSuave} isMobile={false} />
        </div>
      </main>

      <footer className="px-6 py-8 text-center text-xs" style={{ borderTop: `1px solid ${bordeSuave}`, color: hexToRgba(t.texto, 0.4) }}>
        © {new Date().getFullYear()} {nombreComercio}
      </footer>
    </div>
  );
}
