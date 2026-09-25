import React, { useState } from 'react';

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border rounded-2xl overflow-hidden transition-all"
      style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'var(--color-surface)' }}
    >
      <button
        className="w-full text-left px-6 py-5 flex justify-between items-center gap-4 font-semibold text-base hover:opacity-80 transition-opacity"
        onClick={() => setOpen(o => !o)}
      >
        <span>{q}</span>
        <span
          className="shrink-0 text-xl font-light transition-transform"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0)', color: 'var(--color-primary)' }}
        >
          +
        </span>
      </button>
      {open && (
        <div
          className="px-6 pb-5 text-sm leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQBlock({ section }) {
  const { content, style } = section;

  return (
    <section
      className="py-20 px-6"
      style={{
        backgroundColor: style?.background === 'surface' ? 'var(--color-surface)' : 'transparent',
      }}
    >
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-12 text-center">
          {content?.title || 'Preguntas Frecuentes'}
        </h2>
        <div className="space-y-3">
          {content?.items?.map((item, idx) => (
            <FAQItem key={idx} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
