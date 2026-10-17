import React, { useLayoutEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { hexToRgba, contraste } from '../landing-simple/templates/themeUtils';
import { CREDITO_GESICOM_CONTENIDO, CREDITO_GESICOM_CSS, adaptarLogosGesicom } from './storeCredit';

/**
 * Footer legal de las landings y funnels públicos.
 *
 * El footer hereda el tema del comercio; la firma de Gesicom conserva
 * Signal Coral y su símbolo propio.
 *
 * Sobre las opacidades: antes eran 0,4 para el texto y 0,6 para los enlaces,
 * y encima se multiplicaban por clases Tailwind (`opacity-80`, `opacity-75`),
 * así que la línea de firma terminaba al 30 %. Con un template de fondo claro
 * eso todavía se leía; sobre el fondo oscuro de Tech (#0B1220) daba 2,4:1
 * contra un mínimo AA de 4,5:1 — el footer directamente desaparecía. Ahora
 * las opacidades del texto del comercio no se apilan. La firma de marca
 * usa Coral sólido, independiente del tema.
 */

// Opacidades del texto del comercio; la marca tiene su propio color sólido.
const ALPHA_ENLACE = 0.96;
const ALPHA_TEXTO  = 0.88;
const ALPHA_FIRMA  = 0.90;

export default function StoreFooterLegal({ tema, bordeSuave, nombreComercio, isPreview = false, style }) {
  const colorTexto = tema?.texto || '#000000';
  const fondo = tema?.fondo || '#ffffff';
  const colorLogo = contraste('#08111f', fondo) >= contraste('#f7fafc', fondo) ? '#08111f' : '#f7fafc';
  const footerRef = useRef(null);
  useLayoutEffect(() => adaptarLogosGesicom(footerRef.current), [tema, style]);
  // El footer no pinta fondo propio: hereda el del template.

  const linkColor  = hexToRgba(colorTexto, ALPHA_ENLACE);
  const textColor  = hexToRgba(colorTexto, ALPHA_TEXTO);
  const firmaColor = hexToRgba(colorTexto, ALPHA_FIRMA);

  const { slug } = useParams();

  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const basePath = isPreview ? '#' : (isLocalFallback && slug ? `/l/${slug}` : '');

  const linkStyle = {
    color: linkColor,
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    fontSize: 'clamp(0.94rem, 1.05vw, 1rem)',
    fontWeight: 700,
  };

  const enlaces = [
    { to: 'politica-privacidad', label: 'Política de Privacidad' },
    { to: 'politica-reembolso',  label: 'Política de Reembolso' },
    { to: 'terminos-servicio',   label: 'Términos del Servicio' },
    { to: 'politica-envio',      label: 'Política de Envío' },
    { to: 'contacto',            label: 'Información de Contacto' },
    { to: 'aviso-legal',         label: 'Aviso Legal' },
  ];

  return (
    <footer
      ref={footerRef}
      className="px-6 py-8 flex flex-col items-center"
      style={{ borderTop: `1px solid ${bordeSuave}`, color: textColor, ...style }}
    >
      <style>{CREDITO_GESICOM_CSS}</style>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
        {enlaces.map(({ to, label }) => (
          <Link
            key={to}
            to={isPreview ? '#' : `${basePath}/${to}`}
            style={linkStyle}
            className="hover:underline underline-offset-4"
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="mb-2" style={{ color: textColor, fontSize: 'clamp(0.9rem, 1vw, 0.96rem)', fontWeight: 700 }}>
        © 2026 {nombreComercio}
      </div>
      <div style={{ color: firmaColor, fontSize: 'clamp(0.9rem, 1vw, 0.96rem)', fontWeight: 700 }}>
        Tecnología de{' '}
        <a
          data-gesicomm-credit=""
          href="https://gesicomm.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ '--gesicom-credit-logo': colorLogo }}
          dangerouslySetInnerHTML={{ __html: CREDITO_GESICOM_CONTENIDO }}
        />
      </div>
    </footer>
  );
}
