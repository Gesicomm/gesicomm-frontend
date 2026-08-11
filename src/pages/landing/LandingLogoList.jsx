import React from 'react';


export default function LandingLogoList({ seccion }) {
  const { config = {}, contenido = {}, template } = seccion || {};
  
  
  const { titulo, logos = [] } = contenido; // Assuming logos might be added later, for now we can render placeholders

  // Fake logos if none provided
  const displayLogos = logos.length > 0 ? logos : [1,2,3,4,5,6];

  return (
    <section className={` py-16`}>
      <div className="mx-auto max-w-7xl px-4">
        {titulo && (
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-[var(--l-text-muted)] mb-8">
            {titulo}
          </p>
        )}
        
        {template === 'horizontal_scroll' ? (
           <div className="flex overflow-hidden whitespace-nowrap mask-edges">
              <div className="flex animate-marquee opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center">
                    {displayLogos.map((l, index) => (
                      <div key={index} className="mx-12 flex h-12 w-32 items-center justify-center bg-[var(--l-text-muted)]/10 rounded">
                        <span className="font-bold text-[var(--l-text)]">LOGO</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
           </div>
        ) : (
           <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6 opacity-60 grayscale">
              {displayLogos.slice(0,6).map((l, index) => (
                <div key={index} className="flex h-16 items-center justify-center bg-[var(--l-text-muted)]/10 rounded">
                  <span className="font-bold text-[var(--l-text)]">LOGO</span>
                </div>
              ))}
           </div>
        )}
      </div>
    </section>
  );
}
