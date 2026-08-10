import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function PreviewFrame({ children, className }) {
  const [frameBody, setFrameBody] = useState(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Importar estilos base y de componentes del documento padre
      const parentStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
      parentStyles.forEach(s => {
        doc.head.appendChild(s.cloneNode(true));
      });

      doc.body.style.margin = '0';
      doc.body.style.padding = '0';
      doc.body.style.backgroundColor = 'transparent';
      
      setFrameBody(doc.body);
    };

    iframe.addEventListener('load', handleLoad);
    
    // Si ya cargó el about:blank antes del listener
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, []);

  return (
    <iframe
      ref={frameRef}
      className={className}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      title="Live Preview"
      src="about:blank"
    >
      {frameBody && createPortal(children, frameBody)}
    </iframe>
  );
}
