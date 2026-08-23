import React, { useEffect, useState } from 'react';
import { Check, Loader, Dumbbell, Sparkles, Cpu, Store } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { landingService } from '../../services/landingService';

/**
 * Selector de diseño de un funnel — los MISMOS 4 templates (kind=rigido)
 * que el comercio ya elige para su landing, para que ambos se vean igual.
 * Ver landing-simple/TemplateSelector.jsx.
 *
 * Solo toca color/fondo: la estructura de bloques la define el template de
 * funnel (The Converter, etc.), no esto. La tipografía tampoco se expone —
 * estos templates no la declaran en sus design_tokens.
 *
 * Se usa en dos lugares con la misma UI: el editor del funnel y el paso
 * "Funnel" del wizard de campañas (ahí, sin mandar al comercio a otra
 * pestaña).
 */

const ICONOS_TEMPLATE = {
  'fitness-suplementos': Dumbbell,
  'beauty-skincare': Sparkles,
  'tech-electronica': Cpu,
  'basico': Store,
};

export default function DisenoFunnelPicker({
  landing,
  onAplicado,
  onError,
  compacto = false,
}) {
  const [templates, setTemplates] = useState([]);
  const [templateTiendaId, setTemplateTiendaId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      landingSimpleService.listarTemplates().catch(() => []),
      landingSimpleService.listar().catch(() => []),
    ]).then(([tpls, simples]) => {
      if (!vivo) return;
      setTemplates(tpls || []);
      setTemplateTiendaId((simples || [])[0]?.template_id ?? null);
    });
    return () => { vivo = false; };
  }, []);

  const opciones = templates.map(t => ({
    id: t.id,
    slug: t.slug,
    nombre: t.name,
    color_primario: t.design_tokens?.acento || null,
    color_fondo: t.design_tokens?.acento_secundario || null,
    tema_modo: t.design_tokens?.modo || 'claro',
    esDeLaTienda: t.id === templateTiendaId,
  }));

  const coincide = (t) =>
    (t.color_primario || '').toLowerCase() === (landing?.color_primario || '').toLowerCase()
    && t.tema_modo === landing?.tema_modo;

  async function aplicar(parcial) {
    if (!landing?.id) return;
    setGuardando(true);
    try {
      const actualizada = await landingService.actualizar(landing.id, parcial);
      onAplicado?.(parcial, actualizada);
    } catch (err) {
      onError?.(err.response?.data?.message || 'No pudimos guardar el diseño.');
    } finally {
      setGuardando(false);
    }
  }

  if (!templates.length) {
    return <p className={compacto ? 'text-xs text-white/40' : 'text-xs text-[var(--vit-muted)]'}>Cargando diseños…</p>;
  }

  const claseTitulo = compacto ? 'text-white' : 'text-[var(--vit-text)]';
  const claseSuave = compacto ? 'text-white/50' : 'text-[var(--vit-muted)]';
  const claseBorde = compacto ? 'border-white/15' : 'border-[var(--vit-border)]';
  const claseBordeActivo = compacto ? 'border-primary ring-2 ring-primary/30' : 'border-[var(--vit-primary)] ring-2 ring-[var(--vit-primary)]/30';
  const claseSurface = compacto ? 'bg-white/5' : 'bg-[var(--vit-surface)]';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-bold ${claseTitulo}`}>Diseño</span>
        {guardando && <Loader size={12} className={`animate-spin ${claseSuave}`} />}
      </div>
      <p className={`mb-3 text-xs ${claseSuave}`}>
        Los mismos diseños que tenés para tu landing — así el funnel no desentona con tu tienda.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {opciones.map(p => {
          const activa = coincide(p);
          const oscuro = p.tema_modo === 'oscuro';
          const Icono = ICONOS_TEMPLATE[p.slug] || Store;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => aplicar({ color_primario: p.color_primario, color_fondo: p.color_fondo, tema_modo: p.tema_modo })}
              disabled={guardando}
              title={`${p.nombre} — fondo ${p.tema_modo}`}
              className={`overflow-hidden rounded-lg border text-left transition-all ${activa ? claseBordeActivo : `${claseBorde} hover:border-primary`}`}
            >
              <div className="p-2.5" style={{ background: oscuro ? '#0f172a' : '#ffffff' }}>
                <Icono size={12} className="mb-1.5" style={{ color: p.color_primario }} />
                <div className="mb-1.5 h-1.5 w-2/3 rounded-full" style={{ background: oscuro ? '#e2e8f0' : '#0f172a' }} />
                <div className="mb-2 h-1 w-1/2 rounded-full" style={{ background: oscuro ? '#475569' : '#cbd5e1' }} />
                <div
                  className="flex h-5 items-center justify-center rounded text-[9px] font-bold text-white"
                  style={{ background: p.color_primario }}
                >
                  Comprar
                </div>
              </div>
              <div className={`flex items-center justify-between gap-1 border-t px-2 py-1.5 ${claseBorde} ${claseSurface}`}>
                <span className={`truncate text-[11px] font-semibold ${claseTitulo}`}>{p.nombre}</span>
                {activa && <Check size={12} className="shrink-0 text-primary" />}
              </div>
              {p.esDeLaTienda && (
                <div className="border-t border-primary/30 bg-primary/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-primary">
                  El de tu landing
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Solo el color queda ajustable a mano — el resto lo define el
          diseño elegido arriba. */}
      <label className={`mb-1 block text-xs ${claseSuave}`}>Color principal</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={landing?.color_primario || '#3b82f6'}
          onChange={e => aplicar({ color_primario: e.target.value })}
          disabled={guardando}
          className={`h-8 w-12 cursor-pointer rounded border ${claseBorde}`}
        />
        <span className={`text-xs uppercase ${claseTitulo}`}>{landing?.color_primario || '#3B82F6'}</span>
      </div>
    </div>
  );
}
