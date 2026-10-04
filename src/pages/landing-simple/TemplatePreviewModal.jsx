import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Loader, Monitor, Smartphone, X } from 'lucide-react';
import { getComponenteTemplate } from './templates';
import StoreHeader from './templates/StoreHeader';
import { demoDeTemplate } from './templates/demoTemplates';
import { resolverTemaPorSlug } from './templates/themeUtils';

/**
 * "Ver preview" de un template rígido, antes de crear la landing.
 *
 * Dibuja la portada y la ficha de producto con los componentes reales del
 * template (los mismos de la landing publicada) y contenido de ejemplo de
 * demoTemplates.js. Nada de lo que pasa acá se guarda: tocar "Comprar" o
 * un producto solo navega entre las dos vistas.
 */
export default function TemplatePreviewModal({ template, creando = false, onUsar, onCerrar }) {
  const [vista, setVista] = useState('producto');
  const [movil, setMovil] = useState(false);
  const [usarColoresPreview, setUsarColoresPreview] = useState(true);
  const scrollRef = useRef(null);

  const demo = useMemo(() => demoDeTemplate(template.slug), [template.slug]);
  const Portada = getComponenteTemplate(template.slug);

  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCerrar]);

  const irA = (destino) => {
    setVista(destino);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const headerProps = {
    templateSlug: template.slug,
    nombreComercio: demo?.tienda.nombreComercio,
    tema: demo?.tienda.tema,
    previewMode: true,
    isMobile: movil,
    onClickInicio: () => irA('tienda'),
    onClickCatalogo: () => irA('tienda'),
    onClickContacto: () => irA('tienda'),
    linkInicio: '#',
    linkCatalogo: '#',
    linkContacto: '#',
  };

  const Pagina = demo?.Pagina;
  const tab = (id, label) => (
    <button
      type="button"
      onClick={() => irA(id)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${vista === id ? 'bg-fg text-canvas' : 'text-fg/60 hover:text-fg hover:bg-fg/10'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Preview de ${template.name}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-canvas border-b border-fg/10">
        <div className="min-w-0 mr-auto">
          <p className="text-sm font-semibold text-fg truncate">{template.name}</p>
          <p className="text-[11px] text-fg/45">Contenido de ejemplo — todo se edita después desde el armador.</p>
        </div>

        <div className="flex items-center gap-1 bg-fg/5 rounded-xl p-1">
          {tab('tienda', 'Tienda')}
          {tab('producto', 'Vista del producto')}
        </div>

        <div className="flex items-center gap-1 bg-fg/5 rounded-xl p-1">
          <button type="button" title="Escritorio" onClick={() => setMovil(false)} className={`p-1.5 rounded-lg ${!movil ? 'bg-fg text-canvas' : 'text-fg/60 hover:text-fg'}`}>
            <Monitor size={15} />
          </button>
          <button type="button" title="Celular" onClick={() => setMovil(true)} className={`p-1.5 rounded-lg ${movil ? 'bg-fg text-canvas' : 'text-fg/60 hover:text-fg'}`}>
            <Smartphone size={15} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onUsar(usarColoresPreview)}
          disabled={creando}
          className="inline-flex items-center gap-2 bg-fg text-canvas font-semibold text-sm px-4 py-2 rounded-lg hover:bg-fg-muted transition-colors disabled:opacity-50"
        >
          {creando ? <Loader size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          Usar template
        </button>
        <button type="button" onClick={onCerrar} aria-label="Cerrar preview" className="p-2 rounded-lg text-fg/60 hover:text-fg hover:bg-fg/10">
          <X size={18} />
        </button>
      </div>

      <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 bg-canvas border-b border-fg/10 text-sm text-fg">
        <legend className="sr-only">Colores de la nueva landing</legend>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="radio" name="paleta-template" checked={usarColoresPreview} disabled={creando} onChange={() => setUsarColoresPreview(true)} />
          Usar colores de preview
          <span className="inline-flex gap-1" aria-hidden="true">
            {Object.values(resolverTemaPorSlug(demo?.tienda?.tema, template.slug)).map((color, i) => <span key={i} className="size-4 rounded-full border border-fg/20" style={{ backgroundColor: color }} />)}
          </span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="radio" name="paleta-template" checked={!usarColoresPreview} disabled={creando} onChange={() => setUsarColoresPreview(false)} />
          Usar colores de mi tienda
        </label>
        <span className="text-xs text-fg/50">Podés cambiarlos después en Estilo.</span>
      </fieldset>

      <div className="flex-1 min-h-0 flex justify-center p-3 md:p-5">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overflow-x-hidden rounded-xl bg-white shadow-2xl transition-[width] duration-300"
          style={{ width: movil ? 390 : '100%', maxWidth: '100%' }}
        >
          {!demo ? (
            <div className="flex items-center justify-center h-full text-sm text-neutral-500 p-10">
              Este template todavía no tiene preview.
            </div>
          ) : vista === 'tienda' ? (
            Portada ? (
              <Portada
                data={demo.tienda}
                isMobile={movil}
                previewMode
                onClickProducto={() => irA('producto')}
                onAgregarProducto={() => irA('producto')}
              />
            ) : null
          ) : (
            <div className="flex flex-col min-h-full">
              <StoreHeader {...headerProps} />
              <Pagina
                item={demo.item}
                ficha={demo.ficha}
                tema={demo.tienda.tema}
                templateSlug={template.slug}
                nombreComercio={demo.tienda.nombreComercio}
                isMobile={movil}
                previewMode={false}
                onComprar={() => {}}
                onAgregar={() => {}}
                onVolver={() => irA('tienda')}
                onClickRelacionado={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
