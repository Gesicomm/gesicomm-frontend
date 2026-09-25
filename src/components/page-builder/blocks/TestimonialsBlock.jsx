import React from 'react';

export default function TestimonialsBlock({ section }) {
  const { content, style } = section;

  return (
    <section
      className="py-20 px-6"
      style={{
        backgroundColor: style?.background === 'surface' ? 'var(--color-surface)' : 'transparent',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {content?.title && (
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-center">
            {content.title}
          </h2>
        )}
        {content?.subtitle && (
          <p className="text-center mb-14 text-lg" style={{ color: 'var(--color-text-muted)' }}>
            {content.subtitle}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {content?.items?.map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-2xl flex flex-col gap-4 border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'rgba(255,255,255,0.08)'
              }}
            >
              <div className="flex gap-1" style={{ color: 'var(--color-primary)' }}>
                {Array.from({ length: item.rating || 5 }).map((_, i) => (
                  <span key={i} className="text-lg">★</span>
                ))}
              </div>
              <p className="text-base leading-relaxed flex-1">"{item.quote}"</p>
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
                >
                  {item.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-bold text-sm">{item.name}</p>
                  {item.role && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.role}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
