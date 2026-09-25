import React from 'react';

export default function CategoryGridBlock({ section }) {
  const { content, layout } = section;
  const cols = layout?.columns || 3;

  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      {content?.title && (
        <h2 className="text-3xl md:text-4xl font-extrabold mb-10 text-center">{content.title}</h2>
      )}
      <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-5`}>
        {content?.items?.map((cat, idx) => (
          <div
            key={idx}
            className="group relative flex flex-col items-center justify-end p-6 rounded-2xl cursor-pointer overflow-hidden aspect-video transition-all hover:-translate-y-1 hover:shadow-2xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            {cat.image_url && (
              <img
                src={cat.image_url}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="relative text-center">
              {cat.emoji && <div className="text-4xl mb-2">{cat.emoji}</div>}
              <h3 className="font-bold text-lg">{cat.name}</h3>
              {cat.count && (
                <p className="text-sm opacity-70 mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {cat.count} productos
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
