import React, { useEffect, useMemo, useRef } from 'react';
import { construirDocumentoCodigo, SANDBOX_CODIGO } from './construirDocumentoCodigo';

/**
 * El iframe aislado donde vive una landing de "Lienzo en blanco". Lo usan
 * los dos lados y a propósito es el mismo componente: el preview del
 * editor (LandingCodigoEditor) y la landing pública (LandingPublica), para
 * que lo que el comercio ve mientras escribe no pueda divergir de lo que
 * ve el visitante.
 *
 * El iframe ocupa todo el alto disponible y scrollea por dentro, en vez de
 * crecer con su contenido: así `position: fixed` / `100vh` dentro del
 * código del comercio se comportan como en una página normal (con un
 * iframe auto-alto se romperían), y no hace falta ningún ida y vuelta de
 * postMessage para medir alturas.
 */
export default function CodigoPreview({ codigo, titulo, onError, onCheckout, onTema, extras = null, className = '', style }) {
  const ref = useRef(null);

  const doc = useMemo(
    () => construirDocumentoCodigo(codigo, { titulo, reportarErrores: !!onError, extras }),
    [codigo?.html, codigo?.css, codigo?.js, titulo, !!onError, extras?.html, extras?.css, extras?.script],
  );

  useEffect(() => {
    if (!onError && !onCheckout && !onTema) return;
    function alMensaje(e) {
      // El iframe tiene origen opaco (sandbox sin allow-same-origin), así
      // que e.origin es "null" y no sirve para validar: lo que identifica
      // al emisor es que sea ESTE iframe.
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      if (e.data?.tipo === 'gesicomm:error-codigo') onError?.(e.data.mensaje);
      if (e.data?.tipo === 'gesicomm:checkout') onCheckout?.(e.data);
      if (e.data?.tipo === 'gesicomm:tema') onTema?.(e.data);
    }
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, [onError, onCheckout, onTema]);

  return (
    <iframe
      ref={ref}
      title={titulo || 'Vista previa de la landing'}
      srcDoc={doc}
      sandbox={SANDBOX_CODIGO}
      className={className}
      style={{ border: 0, width: '100%', height: '100%', display: 'block', background: '#fff', ...style }}
    />
  );
}
