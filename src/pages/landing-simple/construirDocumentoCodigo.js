/**
 * Arma el documento HTML completo del modo "Lienzo en blanco" a partir de
 * los tres campos que escribe el comercio (HTML / CSS / JS).
 *
 * Este documento SIEMPRE se pinta dentro de un <iframe sandbox> sin
 * allow-same-origin (ver CodigoPreview.jsx). Ese sandbox es la contención
 * real del JavaScript del comercio:
 *
 *   - el origen del iframe es opaco → el script no ve document.cookie de
 *     la tienda, ni su localStorage, ni el DOM de la app de Gesicomm;
 *   - sin allow-same-origin cualquier llamada al backend sale con
 *     Origin: null y muere en CORS;
 *   - el <meta http-equiv="Content-Security-Policy"> de acá abajo corta
 *     además connect-src y form-action, así que ni siquiera puede mandar
 *     lo que el visitante escriba a un servidor de afuera.
 *
 * La sanitización del servidor (backend landingCodigo.service.js) es la
 * otra mitad: acá se renderiza, allá se decide qué se guarda. El preview
 * del editor usa esta misma función con el borrador SIN guardar, así que
 * lo que se ve mientras se escribe es exactamente lo que se va a publicar
 * (salvo lo que el guardado le quite).
 */

// El sandbox del iframe. allow-same-origin NO va acá y no debe agregarse:
// combinado con allow-scripts anula el aislamiento por completo.
export const SANDBOX_CODIGO = [
  'allow-scripts',
  'allow-forms',
  'allow-modals',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-top-navigation-by-user-activation',
].join(' ');

const CSP = [
  "default-src 'none'",
  "img-src https: http: data: blob:",
  "media-src https: http: data: blob:",
  "font-src https: data:",
  "style-src 'unsafe-inline' https:",
  "script-src 'unsafe-inline'",
  "frame-src https:",
  // El código del comercio no llama a ningún servidor: sin esto, un
  // formulario o un script podría mandarse los datos del visitante afuera.
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

/** Evita que un `</script>` dentro del JS del comercio cierre el <script> del documento. */
function escaparCierreScript(js) {
  return String(js || '').replace(/<\/(script)/gi, '<\\/$1');
}

/** Ídem para el <style>: un `</style>` en el CSS abriría la puerta a inyectar marcado. */
function escaparCierreStyle(css) {
  return String(css || '').replace(/<\/(style)/gi, '<\\/$1');
}

/**
 * @param {{html?: string, css?: string, js?: string}} codigo
 * @param {{titulo?: string, reportarErrores?: boolean}} opciones
 *   reportarErrores: manda los errores de ejecución del JS al contenedor
 *   por postMessage — lo usa el editor para mostrarlos; en la landing
 *   pública no hace falta.
 * @returns {string} documento listo para el srcDoc del iframe
 */
export function construirDocumentoCodigo(codigo, opciones = {}) {
  const { html = '', css = '', js = '' } = codigo || {};
  const { titulo = '', reportarErrores = false } = opciones;

  // El puente de errores lo inyectamos nosotros, no el comercio: por eso
  // puede usar postMessage aunque el JS del comercio lo tenga prohibido.
  const puenteErrores = reportarErrores ? `<script>
window.addEventListener('error', function (e) {
  parent.postMessage({ tipo: 'gesicomm:error-codigo', mensaje: String(e.message || e.error || 'Error') }, '*');
});
window.addEventListener('unhandledrejection', function (e) {
  parent.postMessage({ tipo: 'gesicomm:error-codigo', mensaje: String((e.reason && e.reason.message) || e.reason || 'Promesa rechazada') }, '*');
});
</script>` : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${String(titulo || '').replace(/[<>&"]/g, '')}</title>
<!-- Sin base target, un link dentro del iframe navegaría el iframe y
     dejaría la landing metida dentro de sí misma. -->
<base target="_top">
<style>
html, body { margin: 0; padding: 0; }
</style>
<style>
${escaparCierreStyle(css)}
</style>
</head>
<body>
${html || ''}
${puenteErrores}
<!-- El codigo del comercio va en su propio script, en el nivel mas alto y
     sin envolverlo en nada: metido dentro de un try/catch o de una
     funcion, sus declaraciones dejan de ser globales y cualquier
     onclick="miFuncion()" del HTML deja de encontrarlas. Los errores los
     levanta el listener de arriba, no un catch. -->
<script>
${escaparCierreScript(js)}
</script>
</body>
</html>`;
}
