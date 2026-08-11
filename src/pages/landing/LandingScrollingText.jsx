import React from 'react';


export default function LandingScrollingText({ seccion }) {
  const { config = {}, contenido = {} } = seccion || {};
  
  
  // Reuse the mensajes field from announcement_bar for the marquee
  const mensajes = contenido.mensajes || [];

  if (mensajes.length === 0) return null;

  return (
    <div className={` py-3 overflow-hidden whitespace-nowrap`}>
      <div className="flex w-fit animate-marquee text-sm font-semibold tracking-wider uppercase" style={{ color: 'inherit' }}>
        {/* Render the message list multiple times to ensure seamless infinite scroll */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center">
            {mensajes.map((msg, index) => (
              <React.Fragment key={index}>
                <span className="mx-6">{msg}</span>
                <span className="mx-2 opacity-50 text-[10px]">✦</span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
