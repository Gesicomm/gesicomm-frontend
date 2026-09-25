import React from 'react';

function formatSaving(precio, precioPrevio) {
  if (!precioPrevio || precioPrevio <= precio) return null;
  const diff = precioPrevio - precio;
  if (precio < 750000) {
    const pct = Math.round((diff / precioPrevio) * 100);
    return `Ahorrás ${pct}%`;
  }
  return `Ahorrás Gs ${diff.toLocaleString('es-PY')}`;
}

export default function ProductShowcaseBlock({ section }) {
  const { content, layout, style } = section;
  const isReverse = layout?.image_position === 'left';

  const precio = content?.price || 0;
  const precioPrevio = content?.compare_at_price || null;
  const saving = formatSaving(precio, precioPrevio);

  return (
    <section
      className="py-20 px-6"
      style={{ backgroundColor: style?.background === 'surface' ? 'var(--color-surface)' : 'transparent' }}
    >
      <div className={`max-w-7xl mx-auto flex flex-col ${isReverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12`}>

        {/* Imagen */}
        <div className="w-full md:w-1/2">
          <div
            className="aspect-square rounded-3xl overflow-hidden flex items-center justify-center relative"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {content?.image_url ? (
              <img src={content.image_url} alt={content.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-8xl opacity-20">📦</div>
            )}
            {saving && (
              <div
                className="absolute top-5 left-5 px-4 py-2 rounded-full font-black text-base shadow-xl"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
              >
                {saving}
              </div>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          {content?.badge && (
            <span
              className="self-start text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
            >
              {content.badge}
            </span>
          )}

          <h2 className="text-4xl font-extrabold leading-tight">{content?.name}</h2>

          {content?.tagline && (
            <p className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
              {content.tagline}
            </p>
          )}

          {content?.description && (
            <p className="text-base leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {content.description}
            </p>
          )}

          {/* Highlights con checkmarks — Baymard: arriba del fold */}
          {content?.highlights?.length > 0 && (
            <ul className="flex flex-col gap-2">
              {content.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}>
                    ✓
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          )}

          {/* Precio */}
          <div className="flex items-end gap-3 py-4 border-y" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {precioPrevio && (
              <span className="text-xl line-through opacity-40">
                Gs {precioPrevio.toLocaleString('es-PY')}
              </span>
            )}
            <span className="text-4xl font-black" style={{ color: 'var(--color-primary)' }}>
              Gs {precio.toLocaleString('es-PY')}
            </span>
          </div>

          {/* CTA + Info confianza (Baymard: envío/pago/cambios cerca del botón) */}
          <div className="flex flex-col gap-3">
            <button
              className="w-full py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] shadow-xl"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
            >
              {content?.cta || 'Agregar al carrito'}
            </button>
            <div className="grid grid-cols-3 gap-2 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <span>🚚</span><span>Envío disponible</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <span>🔒</span><span>Pago seguro</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <span>🔄</span><span>Cambios</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
