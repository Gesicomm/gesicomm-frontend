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
 *
 * `extras` son las secciones y scripts de Gesicom que se pegan al documento
 * (contacto/footer, order bump de la landing — ver seccionesSistemaCodigo.js
 * y el order bump del runtime); `onTema` recibe los colores reales del carrito.
 */
export default function CodigoPreview({ codigo, titulo, datos, extras = null, typography = null, previewDevice = null, onError, onCheckout, onConfirmarCheckout, onQuitarOferta, onNavegar, onEvento, onCatalogo, onTema, onCarrito, resaltar, className = '', style }) {
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
    () => construirDocumentoCodigo(codigo, { titulo, reportarErrores: !!onError, datos: JSON.parse(datosJson), extras, typography, previewDevice }),
    // Si cambia el generador durante una actualización de estilos/runtime,
    // no conservar un srcDoc anterior con fotos que invaden el contenido.
    // `datos` viaja por postMessage para no reiniciar el iframe y perder scroll
    // mientras el comercio escribe títulos, badges o CTAs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [construirDocumentoCodigo, codigo?.html, codigo?.css, codigo?.js, titulo, !!onError, extras?.html, extras?.css, extras?.script, typography?.headingFont, typography?.bodyFont, previewDevice],
  );

  function enviarDatos() {
    if (!ref.current?.contentWindow) return;
    ref.current.contentWindow.postMessage({ tipo: 'gesicomm:datos', datos: JSON.parse(datosJson) }, '*');
  }
  useEffect(() => { enviarDatos(); }, [datosJson]);

  // Refs para los handlers: se registran una sola vez y siempre llaman a
  // la versión más nueva, sin re-suscribir el listener en cada render.
  const handlers = useRef({});
  handlers.current = { onError, onCheckout, onConfirmarCheckout, onQuitarOferta, onNavegar, onEvento, onCatalogo, onTema, onCarrito };

  useEffect(() => {
    function alMensaje(e) {
      // El iframe tiene origen opaco (sandbox sin allow-same-origin), así
      // que e.origin es "null" y no sirve para validar: lo que identifica
      // al emisor es que sea ESTE iframe.
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      const h = handlers.current;
      const tipo = e.data?.tipo;
      if (tipo === 'gesicomm:error-codigo') h.onError?.(e.data.mensaje);
      if (tipo === 'gesicomm:checkout') h.onCheckout?.(e.data);
      if (tipo === 'gesicomm:confirmar-checkout') h.onConfirmarCheckout?.(e.data);
      if (tipo === 'gesicomm:quitar-oferta') h.onQuitarOferta?.(e.data);
      if (tipo === 'gesicomm:carrito') h.onCarrito?.(e.data);
      if (tipo === 'gesicomm:navegar') h.onNavegar?.(e.data);
      if (tipo === 'gesicomm:evento') h.onEvento?.(e.data);
      // Colores reales de la landing para el carrito (ver el puente de tema
      // en construirDocumentoCodigo.js).
      if (tipo === 'gesicomm:tema') h.onTema?.(e.data);
      // Página del catálogo: el iframe no tiene red, la pide el contenedor
      // y se la devuelve con el mismo id (el runtime descarta respuestas
      // viejas si el visitante ya cambió de filtro).
      if (tipo === 'gesicomm:catalogo' && h.onCatalogo) {
        const pedido = e.data;
        const ventana = e.source;
        Promise.resolve(h.onCatalogo(pedido))
          .then(res => ({ ...res, error: false }))
          .catch(() => ({ error: true }))
          .then(res => {
            try { ventana.postMessage({ tipo: 'gesicomm:catalogo-respuesta', id: pedido.id, modo: pedido.modo, ...res }, '*'); } catch { /* iframe desmontado */ }
          });
      }
    }
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, []);

  return (
    <iframe
      ref={ref}
      onLoad={() => {
        setTimeout(enviarDatos, 80);
        setTimeout(enviarResaltado, 150);
      }}
      title={titulo || 'Vista previa de la landing'}
      srcDoc={doc}
      sandbox={SANDBOX_CODIGO}
      className={className}
      style={{ border: 0, width: '100%', height: '100%', display: 'block', background: '#fff', ...style }}
    />
  );
}
