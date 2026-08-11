import React from 'react';

function FacebookIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
  );
}

function InstagramIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

export default function LandingSocial({ seccion }) {
  const { config = {}, contenido = {} } = seccion || {};
  const titulo = contenido.titulo || 'Seguinos';
  
  // Default color scheme based on config
  const bgColor = config.colorScheme === 'primary' ? 'var(--l-primary)' : config.colorScheme === 'dark' ? 'var(--l-bg-dark, #111827)' : 'transparent';
  const textColor = (config.colorScheme === 'primary' || config.colorScheme === 'dark') ? 'white' : 'inherit';
  const linkClass = (config.colorScheme === 'primary' || config.colorScheme === 'dark') ? 'text-white/80 hover:text-white transition-colors' : 'text-[var(--l-text-muted)] hover:text-[var(--l-text)] transition-colors';

  return (
    <section className="py-16 text-center" style={{ backgroundColor: bgColor, color: textColor }}>
      <div className="mx-auto max-w-[var(--l-max)] px-[var(--l-gutter)]">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">{titulo}</h2>
        
        <div className="flex justify-center gap-6">
          {contenido.instagram && (
            <a href={`https://instagram.com/${contenido.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <InstagramIcon size={32} />
            </a>
          )}
          {contenido.facebook && (
            <a href={`https://facebook.com/${contenido.facebook}`} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <FacebookIcon size={32} />
            </a>
          )}
          {contenido.tiktok && (
            <a href={`https://tiktok.com/@${contenido.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <span className="font-bold text-xl leading-[32px] flex items-center">TikTok</span>
            </a>
          )}
          
          {!contenido.instagram && !contenido.facebook && !contenido.tiktok && (
             <div className="opacity-50 text-sm italic">
                (Configura tus redes sociales en el panel de edici&oacute;n)
             </div>
          )}
        </div>
      </div>
    </section>
  );
}
