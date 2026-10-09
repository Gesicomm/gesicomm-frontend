import { PLANTILLA_PRODUCTO, PLANTILLA_INICIO, esFichaProductoBase } from './plantillasBaseCodigo';
import { codigoConGlobales, conGlobalesHeredados } from './globalesCodigo';

/**
 * El código (HTML/CSS/JS) con el que una landing de lienzo muestra la ficha
 * de un producto: la ficha propia de ese producto si el comercio le armó una
 * → la ficha general de la landing → la base. Hereda los globales (header,
 * colores, footer) del inicio.
 *
 * Una sola regla para la landing publicada (LandingCodigoPublica) y para la
 * vista previa de Productos → Vista del producto: si cada una resolviera la
 * ficha por su cuenta, lo que el comercio ve al editar dejaría de ser lo que
 * se publica.
 */
export function codigoInicioHeredable(content, codigoInicio = null) {
  return codigoConGlobales([
    content?.codigo,
    content?.vistas?.inicio,
    codigoInicio,
    PLANTILLA_INICIO,
  ]) || codigoInicio || PLANTILLA_INICIO;
}

export function codigoFichaProducto(content, contentId, codigoInicio = null) {
  const fichaPropia = contentId ? content?.vistas?.productos?.[contentId] : null;
  const fichaGeneral = content?.vistas?.producto;
  const ficha = fichaPropia?.html && !esFichaProductoBase(fichaPropia.html)
    ? fichaPropia
    : (fichaGeneral?.html && !esFichaProductoBase(fichaGeneral.html) ? fichaGeneral : PLANTILLA_PRODUCTO);
  return conGlobalesHeredados(ficha, codigoInicioHeredable(content, codigoInicio));
}
