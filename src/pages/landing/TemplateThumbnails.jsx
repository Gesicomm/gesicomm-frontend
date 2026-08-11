import React from 'react';

export default function TemplateThumbnails({ type, templateId }) {
  const defaultWireframe = (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="10" y="10" width="80" height="40" rx="2" fill="currentColor" opacity="0.2" />
    </svg>
  );

  if (type === 'image_text') {
    if (templateId === 'image_right' || templateId === 'image_large_right') return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)] p-2">
        <rect x="55" y="10" width="40" height="40" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="5" y="15" width="30" height="6" rx="2" fill="currentColor" />
        <rect x="5" y="25" width="40" height="4" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="5" y="33" width="35" height="4" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="5" y="42" width="20" height="8" rx="2" fill="currentColor" opacity="0.8" />
      </svg>
    );
    if (templateId === 'image_top') return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)] p-2">
        <rect x="25" y="5" width="50" height="25" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="35" y="35" width="30" height="4" rx="1" fill="currentColor" />
        <rect x="20" y="43" width="60" height="3" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="40" y="50" width="20" height="6" rx="2" fill="currentColor" opacity="0.8" />
      </svg>
    );
    if (templateId === 'overlay') return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)] p-2">
        <rect x="5" y="5" width="90" height="50" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="20" y="20" width="60" height="20" rx="2" fill="currentColor" opacity="0.8" />
      </svg>
    );
    if (templateId === 'split_50_50') return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
        <rect x="0" y="0" width="50" height="60" fill="currentColor" opacity="0.5" />
        <rect x="60" y="20" width="30" height="4" rx="1" fill="currentColor" />
        <rect x="60" y="28" width="20" height="2" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="60" y="34" width="15" height="4" rx="1" fill="currentColor" opacity="0.8" />
      </svg>
    );
    return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)] p-2">
        <rect x="5" y="10" width="40" height="40" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="55" y="15" width="30" height="6" rx="2" fill="currentColor" />
        <rect x="55" y="25" width="40" height="4" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="55" y="33" width="35" height="4" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="55" y="42" width="20" height="8" rx="2" fill="currentColor" opacity="0.8" />
      </svg>
    );
  }

  if (type === 'hero') {
    if (templateId === 'split_image_text') return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
        <rect x="50" y="0" width="50" height="60" fill="currentColor" opacity="0.3" />
        <rect x="10" y="15" width="30" height="6" rx="2" fill="currentColor" opacity="0.9" />
        <rect x="10" y="25" width="25" height="3" rx="1" fill="currentColor" opacity="0.6" />
        <rect x="10" y="35" width="15" height="6" rx="2" fill="currentColor" opacity="0.9" />
      </svg>
    );
    if (templateId === 'minimal_center') return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)] p-2">
        <rect x="20" y="15" width="60" height="10" rx="2" fill="currentColor" opacity="0.8" />
        <rect x="30" y="30" width="40" height="4" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="40" y="40" width="20" height="8" rx="2" fill="currentColor" opacity="0.7" />
      </svg>
    );
    return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
        <rect x="0" y="0" width="100" height="60" fill="currentColor" opacity="0.3" />
        <rect x="25" y="15" width="50" height="8" rx="2" fill="currentColor" opacity="0.9" />
        <rect x="35" y="27" width="30" height="4" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="40" y="38" width="20" height="8" rx="2" fill="currentColor" opacity="0.9" />
      </svg>
    );
  }

  if (type === 'productos') {
    if (templateId === 'carousel') return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)] p-2">
        <rect x="-10" y="10" width="30" height="40" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="25" y="10" width="50" height="40" rx="1" fill="currentColor" opacity="0.6" />
        <rect x="80" y="10" width="30" height="40" rx="1" fill="currentColor" opacity="0.3" />
      </svg>
    );
    if (templateId === 'banner_oferta') return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
        <rect x="0" y="0" width="100" height="60" fill="currentColor" opacity="0.8" />
        <rect x="35" y="15" width="30" height="5" rx="2" fill="#fff" opacity="0.5" />
        <rect x="20" y="25" width="60" height="8" rx="2" fill="#fff" opacity="0.9" />
        <rect x="40" y="40" width="20" height="6" rx="2" fill="#fff" opacity="0.9" />
      </svg>
    );
    return (
      <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)] p-2">
        <rect x="5" y="5" width="20" height="25" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="30" y="5" width="20" height="25" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="55" y="5" width="20" height="25" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="80" y="5" width="20" height="25" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="5" y="35" width="20" height="25" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="30" y="35" width="20" height="25" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="55" y="35" width="20" height="25" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="80" y="35" width="20" height="25" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    );
  }

  if (type === 'beneficios') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="15" y="15" width="20" height="30" rx="2" fill="currentColor" opacity="0.2" />
      <circle cx="25" cy="25" r="5" fill="currentColor" opacity="0.6" />
      <rect x="18" y="35" width="14" height="2" rx="1" fill="currentColor" opacity="0.8" />
      
      <rect x="40" y="15" width="20" height="30" rx="2" fill="currentColor" opacity="0.2" />
      <circle cx="50" cy="25" r="5" fill="currentColor" opacity="0.6" />
      <rect x="43" y="35" width="14" height="2" rx="1" fill="currentColor" opacity="0.8" />

      <rect x="65" y="15" width="20" height="30" rx="2" fill="currentColor" opacity="0.2" />
      <circle cx="75" cy="25" r="5" fill="currentColor" opacity="0.6" />
      <rect x="68" y="35" width="14" height="2" rx="1" fill="currentColor" opacity="0.8" />
    </svg>
  );

  if (type === 'categorias') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="10" y="25" width="15" height="10" rx="5" fill="currentColor" opacity="0.4" />
      <rect x="30" y="25" width="20" height="10" rx="5" fill="currentColor" opacity="0.6" />
      <rect x="55" y="25" width="15" height="10" rx="5" fill="currentColor" opacity="0.4" />
      <rect x="75" y="25" width="15" height="10" rx="5" fill="currentColor" opacity="0.4" />
    </svg>
  );

  if (type === 'destacados') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="15" y="10" width="30" height="4" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="15" y="20" width="30" height="30" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="55" y="20" width="30" height="30" rx="2" fill="currentColor" opacity="0.3" />
    </svg>
  );

  if (type === 'rich_text' || type === 'texto') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="30" y="15" width="40" height="4" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="20" y="25" width="60" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="20" y="32" width="60" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="30" y="39" width="40" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );

  if (type === 'faq') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="15" y="10" width="70" height="8" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="15" y="22" width="70" height="8" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="15" y="34" width="70" height="8" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="15" y="46" width="70" height="8" rx="2" fill="currentColor" opacity="0.3" />
    </svg>
  );

  if (type === 'testimonios') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="15" y="15" width="30" height="25" rx="4" fill="currentColor" opacity="0.3" />
      <circle cx="23" cy="25" r="4" fill="currentColor" opacity="0.6" />
      <rect x="30" y="23" width="10" height="2" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="30" y="27" width="5" height="2" rx="1" fill="currentColor" opacity="0.5" />

      <rect x="55" y="15" width="30" height="25" rx="4" fill="currentColor" opacity="0.3" />
      <circle cx="63" cy="25" r="4" fill="currentColor" opacity="0.6" />
      <rect x="70" y="23" width="10" height="2" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="70" y="27" width="5" height="2" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
  );

  if (type === 'before_after') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="10" y="10" width="40" height="40" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="50" y="10" width="40" height="40" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="49" y="8" width="2" height="44" fill="currentColor" opacity="0.8" />
      <circle cx="50" cy="30" r="4" fill="currentColor" opacity="0.9" />
    </svg>
  );

  if (type === 'cta') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="10" y="10" width="80" height="40" rx="4" fill="currentColor" opacity="0.2" />
      <rect x="30" y="20" width="40" height="6" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="40" y="32" width="20" height="8" rx="4" fill="currentColor" opacity="0.9" />
    </svg>
  );

  if (type === 'logo_list') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="40" y="10" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="35" r="6" fill="currentColor" opacity="0.4" />
      <circle cx="40" cy="35" r="6" fill="currentColor" opacity="0.4" />
      <circle cx="60" cy="35" r="6" fill="currentColor" opacity="0.4" />
      <circle cx="80" cy="35" r="6" fill="currentColor" opacity="0.4" />
    </svg>
  );

  if (type === 'redes_sociales') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <circle cx="35" cy="30" r="8" fill="currentColor" opacity="0.5" />
      <circle cx="65" cy="30" r="8" fill="currentColor" opacity="0.5" />
      <rect x="40" y="15" width="20" height="4" rx="2" fill="currentColor" opacity="0.8" />
    </svg>
  );

  if (type === 'como_funciona') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="40" y="10" width="20" height="4" rx="2" fill="currentColor" opacity="0.8" />
      <circle cx="25" cy="30" r="8" fill="currentColor" opacity="0.3" />
      <circle cx="50" cy="30" r="8" fill="currentColor" opacity="0.3" />
      <circle cx="75" cy="30" r="8" fill="currentColor" opacity="0.3" />
      <path d="M 35 30 L 40 30" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" opacity="0.5" />
      <path d="M 60 30 L 65 30" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  );

  if (type === 'scrolling_text') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="0" y="20" width="100" height="20" fill="currentColor" opacity="0.2" />
      <rect x="-10" y="26" width="30" height="8" rx="2" fill="currentColor" opacity="0.6" />
      <rect x="30" y="26" width="40" height="8" rx="2" fill="currentColor" opacity="0.6" />
      <rect x="80" y="26" width="30" height="8" rx="2" fill="currentColor" opacity="0.6" />
    </svg>
  );

  if (type === 'banner') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="0" y="10" width="100" height="40" fill="currentColor" opacity="0.3" />
      <rect x="25" y="20" width="50" height="6" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="40" y="32" width="20" height="6" rx="2" fill="currentColor" opacity="0.9" />
    </svg>
  );

  if (type === 'header') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="0" y="0" width="100" height="15" fill="currentColor" opacity="0.2" />
      <rect x="10" y="4" width="20" height="7" rx="2" fill="currentColor" opacity="0.8" />
      <circle cx="85" cy="7.5" r="3" fill="currentColor" opacity="0.5" />
    </svg>
  );

  if (type === 'footer') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="0" y="40" width="100" height="20" fill="currentColor" opacity="0.2" />
      <rect x="10" y="45" width="20" height="4" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="10" y="52" width="30" height="2" rx="1" fill="currentColor" opacity="0.4" />
      <circle cx="80" cy="48" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="85" cy="48" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );

  if (type === 'announcement_bar') return (
    <svg viewBox="0 0 100 60" className="w-full h-full text-[var(--vit-muted-2)]">
      <rect x="0" y="0" width="100" height="10" fill="currentColor" opacity="0.8" />
      <rect x="30" y="3" width="40" height="4" rx="2" fill="#fff" opacity="0.9" />
    </svg>
  );

  return defaultWireframe;
}
