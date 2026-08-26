import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Dumbbell, Sparkles, Cpu, Store, ArrowRight, ArrowLeft } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { getComponenteTemplate } from './templates';
import { mapEditorDraftToTemplateData } from './mapLandingToTemplateData';

const ICONOS = {
  'fitness-suplementos': Dumbbell,
  'beauty-skincare': Sparkles,
  'tech-electronica': Cpu,
  'basico': Store,
};

const DATA_PREVIEW = mapEditorDraftToTemplateData({
  titulo: 'Tu comercio',
  banner_titulo: 'Así se ve tu landing',
  banner_subtitulo: 'Elegí un template para empezar',
}, { productos: [], combos: [] });

/**
 * "Elegí un template para comenzar" (spec punto 11) — se muestra siempre
 * que el comercio tiene 0 landings rígidas, sin importar cuántas veces
 * haya borrado la anterior (spec punto 12): la lista sale de
 * LandingTemplate (kind=rigido), nunca de si existe o no una Landing.
 */
export default function TemplateSelector({ onCreada, onVolver }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creandoId, setCreandoId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    landingSimpleService.listarTemplates()
      .then(data => { if (activo) setTemplates(data); })
      .catch(() => { if (activo) setError('No se pudieron cargar los templates.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  async function usarTemplate(template) {
    setError('');
    setCreandoId(template.id);
    try {
      const landing = await landingSimpleService.crear(template.id);
      if (onCreada) onCreada(landing);
      else navigate(`/landing/${landing.id}`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear la landing.');
    } finally {
      setCreandoId(null);
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 text-white/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando templates...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* Solo aparece si se llegó desde ModoSelector — cuando el comercio
          ya eligió "con template" pero se quiere arrepentir y usar el
          lienzo en blanco. */}
      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={13} /> Volver a elegir cómo armarla
        </button>
      )}
      <h1 className="text-2xl font-bold text-white mb-1">Elegí un template para comenzar</h1>
      <p className="text-white/50 mb-8">Estructura y diseño ya definidos — vos solo cargás productos, contacto y preguntas frecuentes.</p>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {templates.map(template => {
          const Componente = getComponenteTemplate(template.slug);
          const Icono = ICONOS[template.slug];
          return (
            <div key={template.id} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex flex-col">
              <div className="h-56 overflow-hidden relative bg-black/40">
                {Componente ? (
                  <div className="absolute inset-0 scale-[0.32] origin-top-left w-[312%] pointer-events-none">
                    <Componente data={DATA_PREVIEW} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/30">Sin preview</div>
                )}
              </div>
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2">
                  {Icono && <Icono size={18} className="text-white/70" />}
                  <h2 className="font-semibold text-white">{template.name}</h2>
                </div>
                <p className="text-sm text-white/50 flex-1">{template.description}</p>
                <button
                  type="button"
                  onClick={() => usarTemplate(template)}
                  disabled={creandoId === template.id}
                  className="mt-2 inline-flex items-center justify-center gap-2 bg-white text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  {creandoId === template.id ? <Loader size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  Usar template
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
