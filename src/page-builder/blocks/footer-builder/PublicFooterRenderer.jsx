import React from 'react';
import { getMediaUrl } from '../../../services/api';
import { SOCIAL_PLATFORMS } from './SocialIcons';
import { estiloTexto, estiloBoton } from './footerTextStyle';
import { resolveLayout, esApilado, LOGO_MAX_APILADO, FOOTER_PAD_X, FOOTER_PAD_Y, FOOTER_GAP } from './footerLayout';
import './PublicFooterRenderer.css';

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

  // El padding del contenedor SOLO va cuando los elementos se apilan. En
  // modo libre las posiciones son absolutas en % del contenedor, así que un
  // padding correría todo respecto de lo que el usuario acomodó a mano.
  const apiladoDesktop = (elements || []).some(el => esApilado(el, 'desktop'));
  const apiladoMobile = (elements || []).some(el => esApilado(el, 'mobile'));

  return (
    <footer
      className="public-footer-v2"
      style={{
        '--footer-min-height-desktop': minHeightDesktop === 'auto' ? 'auto' : `${minHeightDesktop}px`,
        '--footer-min-height-mobile': minHeightMobile === 'auto' ? 'auto' : `${minHeightMobile}px`,
        '--footer-max-width': `${maxWidth}px`,
        '--footer-pad-x-d': apiladoDesktop ? FOOTER_PAD_X : '0px',
        '--footer-pad-y-d': apiladoDesktop ? FOOTER_PAD_Y : '0px',
        '--footer-pad-x-m': apiladoMobile ? FOOTER_PAD_X : '0px',
        '--footer-pad-y-m': apiladoMobile ? FOOTER_PAD_Y : '0px',
      }}
    >
      <div className="public-footer-container">
        {elements?.map((el, i) => {
          const desktop = resolveLayout(el.layout, 'desktop', el.type);
          const mobile = resolveLayout(el.layout, 'mobile', el.type);

          const isDesktopFree = desktop.mode === 'free';
          const isMobileFree = mobile.mode === 'free';
          // "Encogido" = flujo normal sin ancho completo (logo/social sin
          // layout propio, ver footerLayout.js) — necesita inline-block
          // para achicarse a su contenido, porque un <div> en flujo normal
          // con width:auto igual ocupa todo el ancho disponible. Y el logo
          // además con un tope en px: sin esto, una imagen fuente grande se
          // veía enorme en vez de un logo chico (bug real, reportado con
          // captura). El tope NO aplica en modo libre — ahí el ancho lo
          // define a propósito el usuario arrastrando el resize handle.
          const dEncogido = !isDesktopFree && desktop.width !== '100%';
          const mEncogido = !isMobileFree && mobile.width !== '100%';

          // Generate style variables to be handled by CSS
          const style = {
            '--d-mode': isDesktopFree ? 'absolute' : 'relative',
            '--d-x': isDesktopFree ? `${(desktop.x || 0) * 100}%` : 'auto',
            '--d-y': isDesktopFree ? `${(desktop.y || 0) * 100}%` : 'auto',
            // fit-content (no inline-block): achica al contenido igual pero
            // sigue siendo bloque, así cada elemento va en su propia línea.
            // Con inline-block, logo y redes quedaban lado a lado.
            '--d-w': isDesktopFree ? `${(desktop.width || 0) * 100}%` : (desktop.width === '100%' ? '100%' : 'fit-content'),
            '--d-maxw': dEncogido && el.type === 'logo' ? LOGO_MAX_APILADO : 'none',
            '--d-mb': isDesktopFree ? '0px' : FOOTER_GAP,

            '--m-mode': isMobileFree ? 'absolute' : 'relative',
            '--m-x': isMobileFree ? `${(mobile.x || 0) * 100}%` : 'auto',
            '--m-y': isMobileFree ? `${(mobile.y || 0) * 100}%` : 'auto',
            '--m-w': isMobileFree ? `${(mobile.width || 0) * 100}%` : (mobile.width === '100%' ? '100%' : 'fit-content'),
            '--m-maxw': mEncogido && el.type === 'logo' ? LOGO_MAX_APILADO : 'none',
            '--m-mb': isMobileFree ? '0px' : FOOTER_GAP,

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
