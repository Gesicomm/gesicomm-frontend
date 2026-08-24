import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  hexToRgba, componer, contraste, acentoLegible,
} from '../landing-simple/templates/themeUtils';

/**
 * Footer legal de las landings y funnels públicos.
 *
 * Los colores salen del tema del template (fondo/texto/acento), nunca de la
 * paleta del panel: la landing es del comercio, no de Gesicom.
 *
 * Sobre las opacidades: antes eran 0,4 para el texto y 0,6 para los enlaces,
 * y encima se multiplicaban por clases Tailwind (`opacity-80`, `opacity-75`),
 * así que la línea de firma terminaba al 30 %. Con un template de fondo claro
 * eso todavía se leía; sobre el fondo oscuro de Tech (#0B1220) daba 2,4:1
 * contra un mínimo AA de 4,5:1 — el footer directamente desaparecía. Ahora
 * las opacidades son legibles en ambos extremos y no se apilan.
 */

// Opacidades por jerarquía, verificadas contra los 4 temas por defecto: con
// estos valores el peor caso de los 12 (la firma sobre Beauty, que es el tema
// de menor contraste intrínseco) queda en 5,2:1, por encima del mínimo AA de
// 4,5:1. Bajar la firma a 0,6 la deja en 3,7:1 y ya no cumple.
const ALPHA_ENLACE = 0.85;
const ALPHA_TEXTO  = 0.70;
const ALPHA_FIRMA  = 0.72;

export default function StoreFooterLegal({ tema, bordeSuave, nombreComercio, isPreview = false, style }) {
  const colorTexto = tema?.texto || '#000000';
  // El footer no pinta fondo propio: hereda el del template. Ese es el color
  // contra el que hay que medir contraste.
  const colorFondo = tema?.fondo || '#FFFFFF';

  const linkColor  = hexToRgba(colorTexto, ALPHA_ENLACE);
  const textColor  = hexToRgba(colorTexto, ALPHA_TEXTO);
  const firmaColor = hexToRgba(colorTexto, ALPHA_FIRMA);

  // El acento sólo se usa si de verdad se lee sobre este fondo; si no, cae al
  // color de texto del tema (que por definición sí contrasta).
  const colorMarca = acentoLegible(
    tema?.acento,
    colorFondo,
    componer(colorTexto, ALPHA_ENLACE, colorFondo),
  );

  const { slug } = useParams();

  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const basePath = isPreview ? '#' : (isLocalFallback && slug ? `/l/${slug}` : '');

  const linkStyle = {
    color: linkColor,
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    fontSize: '0.75rem',
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
      className="px-6 py-8 flex flex-col items-center"
      style={{ borderTop: `1px solid ${bordeSuave}`, color: textColor, ...style }}
    >
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

      <div className="mb-2 text-xs" style={{ color: textColor }}>
        © 2026 {nombreComercio}
      </div>
      <div className="text-xs" style={{ color: firmaColor }}>
        Tecnología de{' '}
        <a
          href="https://gesicomm.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: colorMarca, fontWeight: 600 }}
        >
          Gesicom
        </a>
      </div>
    </footer>
  );
}
