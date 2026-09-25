import React from 'react';

// Formatea precio con regla del 100:
// < 750.000 Gs → muestra % de descuento
// >= 750.000 Gs → muestra ahorro en monto
function formatSaving(precio, precioPrevio) {
  if (!precioPrevio || precioPrevio <= precio) return null;
  const diff = precioPrevio - precio;
  if (precio < 750000) {
    const pct = Math.round((diff / precioPrevio) * 100);
    return `Ahorrás ${pct}%`;
  }
  return `Ahorrás Gs ${diff.toLocaleString('es-PY')}`;
}

function ProductCard({ product }) {
  const saving = formatSaving(product.price, product.compare_at_price);

  return (
    <div
      className="group flex flex-col rounded-2xl overflow-hidden border transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {/* Imagen placeholder */}
      <div className="aspect-square relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🛒</div>
        )}
        {saving && (
          <span
            className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
          >
            {saving}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {product.badge && (
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
            {product.badge}
          </span>
        )}
        <h3 className="font-bold text-base leading-snug">{product.name}</h3>
        {product.description && (
          <p className="text-sm opacity-70 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
            {product.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div>
            {product.compare_at_price && (
              <span className="text-xs line-through mr-2 opacity-50">
                Gs {product.compare_at_price.toLocaleString('es-PY')}
              </span>
            )}
            <span className="font-extrabold text-lg" style={{ color: 'var(--color-primary)' }}>
              Gs {(product.price || 0).toLocaleString('es-PY')}
            </span>
          </div>
          <button
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductGridBlock({ section }) {
  const { content, layout, source } = section;
  const cols = layout?.columns || 4;

  // En preview mostramos placeholders basados en los product_ids del schema
  const productIds = source?.manual?.product_ids || [];
  const placeholders = productIds.length > 0
    ? productIds.map((id, i) => ({ id, name: `Producto #${id}`, price: 85000 + i * 15000, image_url: null }))
    : Array.from({ length: cols }).map((_, i) => ({ id: i, name: `Producto ${i + 1}`, price: 85000 + i * 15000, image_url: null }));

  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      {content?.title && (
        <div className="flex justify-between items-end mb-10 gap-4 flex-wrap">
          <div>
            {content.subtitle && (
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>
                {content.subtitle}
              </p>
            )}
            <h2 className="text-3xl md:text-4xl font-extrabold">{content.title}</h2>
          </div>
          {source?.type === 'query' && (
            <span className="text-sm px-4 py-1.5 rounded-full font-medium border" style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'var(--color-text-muted)' }}>
              Top por: {source.sort}
            </span>
          )}
        </div>
      )}

      <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-5`}>
        {placeholders.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
