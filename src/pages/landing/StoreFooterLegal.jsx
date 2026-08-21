import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  } else if (hex.startsWith('rgb')) {
      return hex; // Already rgb/rgba
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function StoreFooterLegal({ tema, bordeSuave, nombreComercio, isPreview = false, style }) {
  const textColor = tema?.texto ? hexToRgba(tema.texto, 0.4) : 'rgba(0, 0, 0, 0.4)';
  const linkColor = tema?.texto ? hexToRgba(tema.texto, 0.6) : 'rgba(0, 0, 0, 0.6)';
  const accentColor = tema?.acento || '#000';
  
  const { slug } = useParams();
  
  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const basePath = isPreview ? '#' : (isLocalFallback && slug ? `/l/${slug}` : '');

  const linkStyle = {
    color: linkColor,
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    fontSize: '0.75rem'
  };

  return (
    <footer className="px-6 py-8 flex flex-col items-center" style={{ borderTop: `1px solid ${bordeSuave}`, color: textColor, ...style }}>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
        <Link to={isPreview ? '#' : `${basePath}/politica-privacidad`} style={linkStyle} className="hover:opacity-100 opacity-80">Política de Privacidad</Link>
        <Link to={isPreview ? '#' : `${basePath}/politica-reembolso`} style={linkStyle} className="hover:opacity-100 opacity-80">Política de Reembolso</Link>
        <Link to={isPreview ? '#' : `${basePath}/terminos-servicio`} style={linkStyle} className="hover:opacity-100 opacity-80">Términos del Servicio</Link>
        <Link to={isPreview ? '#' : `${basePath}/politica-envio`} style={linkStyle} className="hover:opacity-100 opacity-80">Política de Envío</Link>
        <Link to={isPreview ? '#' : `${basePath}/contacto`} style={linkStyle} className="hover:opacity-100 opacity-80">Información de Contacto</Link>
        <Link to={isPreview ? '#' : `${basePath}/aviso-legal`} style={linkStyle} className="hover:opacity-100 opacity-80">Aviso Legal</Link>
      </div>
      
      <div className="mb-2 text-xs">
        © 2026 {nombreComercio}
      </div>
      <div className="text-xs opacity-75">
        Tecnología de <a href="https://gesicomm.com" target="_blank" rel="noopener noreferrer" style={{color: accentColor, fontWeight: 600}}>Gesicomm</a>
      </div>
    </footer>
  );
}
