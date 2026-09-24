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
 *
 * `datos` es lo que lee el runtime de adentro (window.Gesicomm, ver
 * runtimeGesicomm.js): catálogo, producto de la ficha, recomendados. Los
 * clics del runtime vuelven por postMessage y se reparten en onCheckout /
 * onNavegar / onEvento.
 */
export default function CodigoPreview({ codigo, titulo, onError, onCheckout, onTema, extras = null, className = '', style }) {
  const ref = useRef(null);

  // resaltar = { lista, n }: pide al runtime que muestre y marque una zona.
  // `n` cambia en cada pedido para poder repetir el mismo. Se reenvía al
  // cargar el iframe, porque al cambiar de vista el documento es nuevo.
  const resaltarRef = useRef(resaltar);
  resaltarRef.current = resaltar;
  function enviarResaltado() {
    const r = resaltarRef.current;
    if (!r?.lista || !ref.current?.contentWindow) return;
    ref.current.contentWindow.postMessage({ tipo: 'gesicomm:resaltar', lista: r.lista }, '*');
  }
  useEffect(() => { enviarResaltado(); }, [resaltar?.n]);

  // `datos` se compara serializado: el contenedor lo arma con useMemo, pero
  // si cambia de identidad sin cambiar de contenido no hay que recargar el
  // iframe (se reiniciaría el JS del comercio y el scroll del visitante).
  const datosJson = useMemo(() => JSON.stringify(datos ?? null), [datos]);
  const doc = useMemo(
    () => construirDocumentoCodigo(codigo, { titulo, reportarErrores: !!onError, extras }),
    [codigo?.html, codigo?.css, codigo?.js, titulo, !!onError, extras?.html, extras?.css, extras?.script],
  );

  // Refs para los handlers: se registran una sola vez y siempre llaman a
  // la versión más nueva, sin re-suscribir el listener en cada render.
  const handlers = useRef({});
  handlers.current = { onError, onCheckout, onNavegar, onEvento, onCatalogo };

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
      onLoad={() => setTimeout(enviarResaltado, 150)}
      title={titulo || 'Vista previa de la landing'}
      srcDoc={doc}
      sandbox={SANDBOX_CODIGO}
      className={className}
      style={{ border: 0, width: '100%', height: '100%', display: 'block', background: '#fff', ...style }}
    />
  );
}
