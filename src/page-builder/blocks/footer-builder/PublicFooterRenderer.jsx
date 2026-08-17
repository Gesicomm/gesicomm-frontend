import React from 'react';
import { getMediaUrl } from '../../../services/api';
import { SOCIAL_PLATFORMS } from './SocialIcons';
import { estiloTexto, estiloBoton } from './footerTextStyle';
import './PublicFooterRenderer.css';

// We resolve the layout for mobile and desktop sequentially to generate responsive classes
const resolveLayout = (layout, breakpoint) => {
  if (!layout) return { mode: 'normal' };
  const bpRules = layout[breakpoint];
  if (bpRules && bpRules.inherit) {
    return resolveLayout(layout, bpRules.inherit);
  }
  if (bpRules) return bpRules;
  if (breakpoint === 'mobile') return layout.tablet || layout.desktop || { mode: 'normal' };
  if (breakpoint === 'tablet') return layout.desktop || { mode: 'normal' };
  return layout.desktop || { mode: 'normal' };
};

// Mismo shape de `settings` que arma el editor en BuilderElement.jsx —
// logo.image/alt, link.text/url/target, social.redes (objeto por
// plataforma) — así lo que se ve acá es exactamente lo que se armó ahí.
const PublicElements = {
  logo: ({ settings }) => settings?.image ? (
    <img src={getMediaUrl(settings.image)} alt={settings?.alt || 'Logo'} style={{ maxWidth: '100%', height: 'auto' }} />
  ) : null,
  text: ({ settings }) => <p className="footer-text" style={estiloTexto(settings)}>{settings?.text || ''}</p>,
  link: ({ settings }) => (
    <a
      href={settings?.url || '#'}
      target={settings?.target === '_blank' ? '_blank' : undefined}
      rel={settings?.target === '_blank' ? 'noopener noreferrer' : undefined}
      className="footer-link"
      style={{ ...estiloTexto(settings), display: 'block' }}
    >
      {settings?.text || 'Link'}
    </a>
  ),
  button: ({ settings }) => (
    <a
      href={settings?.url || '#'}
      target={settings?.target === '_blank' ? '_blank' : undefined}
      rel={settings?.target === '_blank' ? 'noopener noreferrer' : undefined}
      className="footer-button"
      style={estiloBoton(settings)}
    >
      {settings?.text || 'Botón'}
    </a>
  ),
  social: ({ settings }) => {
    const redes = settings?.redes || {};
    const activas = SOCIAL_PLATFORMS.filter(p => redes[p.key]);
    if (activas.length === 0) return null;
    return (
      <div className="footer-social">
        {activas.map(p => (
          <a key={p.key} href={redes[p.key]} target="_blank" rel="noopener noreferrer" title={p.label} className="footer-social-link">
            <p.icon size={18} />
          </a>
        ))}
      </div>
    );
  }
};

export default function PublicFooterRenderer({ data }) {
  const { settings, elements } = data || {};
  if (!data || data.schemaVersion < 1) return null;

  // We rely on CSS variables or classes to handle responsive heights
  const minHeightDesktop = settings?.minHeight?.desktop || 'auto';
  const minHeightMobile = settings?.minHeight?.mobile || 'auto';
  const maxWidth = settings?.maxWidth || 1200;

  return (
    <footer
      className="public-footer-v2"
      style={{
        '--footer-min-height-desktop': minHeightDesktop === 'auto' ? 'auto' : `${minHeightDesktop}px`,
        '--footer-min-height-mobile': minHeightMobile === 'auto' ? 'auto' : `${minHeightMobile}px`,
        '--footer-max-width': `${maxWidth}px`
      }}
    >
      <div className="public-footer-container">
        {elements?.map((el, i) => {
          const desktop = resolveLayout(el.layout, 'desktop');
          const mobile = resolveLayout(el.layout, 'mobile');

          const isDesktopFree = desktop.mode === 'free';
          const isMobileFree = mobile.mode === 'free';

          // Generate style variables to be handled by CSS
          const style = {
            '--d-mode': isDesktopFree ? 'absolute' : 'relative',
            '--d-x': isDesktopFree ? `${(desktop.x || 0) * 100}%` : 'auto',
            '--d-y': isDesktopFree ? `${(desktop.y || 0) * 100}%` : 'auto',
            '--d-w': isDesktopFree ? `${(desktop.width || 0) * 100}%` : (desktop.width === '100%' ? '100%' : 'auto'),
            
            '--m-mode': isMobileFree ? 'absolute' : 'relative',
            '--m-x': isMobileFree ? `${(mobile.x || 0) * 100}%` : 'auto',
            '--m-y': isMobileFree ? `${(mobile.y || 0) * 100}%` : 'auto',
            '--m-w': isMobileFree ? `${(mobile.width || 0) * 100}%` : (mobile.width === '100%' ? '100%' : 'auto'),
            
            zIndex: elements.length - i // Inverse array order for z-index as defined in the builder
          };

          const Component = PublicElements[el.type] || (() => null);

          return (
            <div key={el.id} className="public-footer-element" style={style}>
              <Component settings={el.settings} />
            </div>
          );
        })}
      </div>
    </footer>
  );
}
