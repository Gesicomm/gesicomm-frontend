import React from 'react';

export default function LandingComoFunciona({ seccion }) {
  const { contenido = {}, template = 'steps_horizontal' } = seccion || {};
  const { titulo = 'Cómo funciona', pasos = [] } = contenido;

  if (!pasos || pasos.length === 0) return null;

  return (
    <section className="lp-custom-section px-[var(--l-gutter)] mx-auto max-w-[var(--l-max)] py-14">
      <h2 className="mb-10 text-3xl font-extrabold text-center tracking-tight text-[var(--l-text)]">{titulo}</h2>
      
      {template === 'steps_vertical' ? (
        <div className="flex flex-col gap-6 max-w-xl mx-auto">
          {pasos.map((paso, idx) => (
            <article key={`${paso}-${idx}`} className="flex items-center gap-6 p-6 rounded-2xl bg-[var(--l-bg-alt)] shadow-sm border border-[var(--l-border)]">
              <span className="flex items-center justify-center shrink-0 w-12 h-12 rounded-full bg-[var(--l-primary)] text-[var(--l-primary-content)] text-xl font-bold">
                {idx + 1}
              </span>
              <p className="text-lg font-medium text-[var(--l-text)] m-0 leading-tight">{paso}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="lp-steps-grid">
          {pasos.map((paso, idx) => (
            <article key={`${paso}-${idx}`} className="lp-step-card">
              <span>{idx + 1}</span>
              <p>{paso}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
