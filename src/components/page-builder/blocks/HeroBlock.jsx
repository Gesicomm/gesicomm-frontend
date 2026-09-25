import React from 'react';

export default function HeroBlock({ section }) {
  const { content, layout, style } = section;
  const align = layout?.alignment === 'center' ? 'text-center items-center' :
                layout?.alignment === 'right'  ? 'text-right  items-end'   :
                'text-left items-start';

  const bg = style?.background === 'primary'
    ? 'var(--color-primary)'
    : style?.background === 'surface'
    ? 'var(--color-surface)'
    : 'transparent';

  const textColor = style?.textColor === 'background'
    ? 'var(--color-background)'
    : style?.textColor === 'primary'
    ? 'var(--color-primary)'
    : 'var(--color-text)';

  return (
    <section
      className={`py-24 px-6 flex flex-col ${align} relative overflow-hidden`}
      style={{ backgroundColor: bg, color: textColor }}
    >
      {/* Decoración de fondo */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 80% 50%, var(--color-text) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl w-full mx-auto">
        {content?.eyebrow && (
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: style?.background === 'primary' ? 'var(--color-background)' : 'var(--color-primary)'
            }}
          >
            {content.eyebrow}
          </span>
        )}

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          {content?.title}
        </h1>

        {content?.description && (
          <p
            className="text-lg md:text-xl max-w-2xl leading-relaxed mb-10 opacity-85"
            style={{ color: style?.background === 'primary' ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}
          >
            {content.description}
          </p>
        )}

        {content?.cta && (
          <div className={`flex gap-4 flex-wrap ${layout?.alignment === 'center' ? 'justify-center' : ''}`}>
            {content.cta.primary && (
              <button
                className="px-8 py-4 rounded-xl font-bold text-base transition-all hover:scale-105 shadow-lg"
                style={{
                  backgroundColor: style?.background === 'primary' ? 'var(--color-background)' : 'var(--color-primary)',
                  color: style?.background === 'primary' ? 'var(--color-primary)' : 'var(--color-background)'
                }}
              >
                {content.cta.primary}
              </button>
            )}
            {content.cta.secondary && (
              <button
                className="px-8 py-4 rounded-xl font-bold text-base border-2 transition-all hover:scale-105"
                style={{
                  borderColor: style?.background === 'primary' ? 'rgba(255,255,255,0.4)' : 'var(--color-primary)',
                  color: textColor,
                  backgroundColor: 'transparent'
                }}
              >
                {content.cta.secondary}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
