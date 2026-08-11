import React from 'react';


export default function LandingCta({ seccion }) {
  const { config = {}, contenido = {}, template } = seccion || {};
  
  
  const { titulo, subtitulo, boton_texto, boton_link } = contenido;

  if (template === 'split') {
    return (
      <section className={` py-16`}>
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 rounded-3xl bg-[var(--l-bg-alt)] p-8 md:p-12 shadow-lg border border-[var(--l-border)]">
            <div className="text-left flex-1 max-w-2xl">
              {titulo && <h2 className="mb-4 text-3xl font-bold tracking-tight text-[var(--l-text)]">{titulo}</h2>}
              {subtitulo && <p className="text-lg text-[var(--l-text-muted)]">{subtitulo}</p>}
            </div>
            {boton_texto && (
              <a href={boton_link || '#'} className="lp-btn-primary shrink-0 whitespace-nowrap px-8 py-4 text-lg">
                {boton_texto}
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={` py-24`}>
      <div className="mx-auto max-w-4xl px-4 text-center">
        {titulo && (
          <h2 className="mb-6 text-4xl md:text-5xl font-bold tracking-tight text-[var(--l-text)]" style={{ letterSpacing: '-0.02em' }}>
            {titulo}
          </h2>
        )}
        {subtitulo && (
          <p className="mb-10 text-xl text-[var(--l-text-muted)] leading-relaxed">{subtitulo}</p>
        )}
        {boton_texto && (
          <a href={boton_link || '#'} className="lp-btn-primary inline-flex px-10 py-4 text-lg shadow-xl shadow-[var(--l-primary)]/20 hover:scale-105 transition-transform duration-300">
            {boton_texto}
          </a>
        )}
      </div>
    </section>
  );
}
