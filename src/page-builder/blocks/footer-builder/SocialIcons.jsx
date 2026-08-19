import React from 'react';

// Mismos trazos que ya usan HeaderBlock.jsx y LandingSocial.jsx (Instagram/
// Facebook/TikTok) — se centralizan acá para que el editor del footer
// (BuilderElement.jsx) y el render público (PublicFooterRenderer.jsx)
// dibujen exactamente el mismo ícono para cada red, en vez de cada uno
// definir su propia versión (que es como habían quedado desincronizados).
function Svg({ size = 20, color = 'currentColor', className, children, ...rest }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
      {children}
    </svg>
  );
}

export function InstagramIcon(props) {
  return (
    <Svg {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </Svg>
  );
}

export function FacebookIcon(props) {
  return (
    <Svg {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </Svg>
  );
}

export function TikTokIcon(props) {
  return (
    <Svg {...props}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </Svg>
  );
}

export function WhatsappIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3 21l1.3-4.2A8.5 8.5 0 1 1 8 19.7L3 21z" />
      <path d="M8.7 9.3c0 3.4 2.9 6.2 6.2 6.2.6 0 .9-.3.9-.9v-1c0-.3-.2-.5-.5-.6l-1.8-.5c-.3-.1-.5 0-.7.2l-.4.5a5 5 0 0 1-2.4-2.4l.5-.4c.2-.2.3-.4.2-.7l-.5-1.8c-.1-.3-.3-.5-.6-.5h-1c-.6 0-.9.4-.9.9z" />
    </Svg>
  );
}

export function YoutubeIcon(props) {
  return (
    <Svg {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5v5l4.5-2.5-4.5-2.5z" fill={props.color || 'currentColor'} stroke="none" />
    </Svg>
  );
}

export function TwitterIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 4l7.5 9.5L4.5 20H7l5.8-6.4L17.5 20H20l-8-10L19 4h-2.5l-5.2 5.8L7 4H4z" fill={props.color || 'currentColor'} stroke="none" />
    </Svg>
  );
}

export const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: InstagramIcon, placeholder: 'https://instagram.com/tu_cuenta' },
  { key: 'facebook', label: 'Facebook', icon: FacebookIcon, placeholder: 'https://facebook.com/tu_pagina' },
  { key: 'whatsapp', label: 'WhatsApp', icon: WhatsappIcon, placeholder: 'https://wa.me/595981234567' },
  { key: 'tiktok', label: 'TikTok', icon: TikTokIcon, placeholder: 'https://tiktok.com/@tu_cuenta' },
  { key: 'youtube', label: 'YouTube', icon: YoutubeIcon, placeholder: 'https://youtube.com/@tu_canal' },
  { key: 'twitter', label: 'X / Twitter', icon: TwitterIcon, placeholder: 'https://x.com/tu_usuario' },
];
