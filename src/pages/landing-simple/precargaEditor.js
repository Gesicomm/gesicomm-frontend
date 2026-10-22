import { vitrinaService } from '../../services/vitrinaService';
import { tiendaService } from '../../services/tiendaService';
import { landingSimpleService } from '../../services/landingSimpleService';
import { sesionVerificadaVigente, verificarSesion } from '../../utils/auth';

/**
 * Precarga del editor de la tienda ("Mi e-commerce"). Al entrar, las
 * cargas iban en cascada: listar landings → bajar el código del editor →
 * detalle de la landing → recién ahí catálogo completo (miles de productos)
 * y tienda. El catálogo y la tienda no dependen de cuál landing se abra, así
 * que se piden apenas arranca la entrada, en paralelo con el resto.
 *
 * El detalle sí depende de cuál se abra, pero casi siempre es la misma que
 * la vez anterior: se pide junto con la lista usando el id de la última
 * abierta (solo una pista: si la lista dice otra, se descarta).
 *
 * Cada precarga se consume una sola vez: una recarga posterior (después de
 * guardar precios, activar un combo...) siempre va al servidor.
 */
const VIGENCIA_MS = 60_000;
// El guard (RequireTienda), la entrada y EditorSegunModo piden la precarga
// uno detrás del otro: comparten la que está en vuelo o recién llegada. Una
// más vieja se vuelve a pedir — si no, un producto cargado mientras tanto
// (ir a Productos y volver) no aparecería en el editor.
const REUSO_MS = 5_000;
// El detalle se usa enseguida (la entrada navega apenas responde la lista):
// vida corta para no abrir nunca una copia vieja de la landing.
const VIGENCIA_DETALLE_MS = 15_000;
let precarga = null;
let detalle = null;

export function precargarEditor() {
  if (precarga && (precarga.llego == null || Date.now() - precarga.llego < REUSO_MS)) return;
  const catalogo = vitrinaService.catalogo();
  const tienda = tiendaService.obtener().catch(() => null);
  const actual = { desde: Date.now(), llego: null, catalogo, tienda };
  // Sin el catch, un error del catálogo sin consumir queda como rechazo sin manejar.
  catalogo.then(() => { actual.llego = Date.now(); }, () => { if (precarga === actual) precarga = null; });
  precarga = actual;
  // El código del editor también: es el chunk más grande del panel.
  import('./EditorSegunModo').catch(() => {});
}

export function tomarPrecargaEditor() {
  const actual = precarga && Date.now() - precarga.desde < VIGENCIA_MS ? precarga : null;
  precarga = null;
  return {
    catalogo: actual?.catalogo || vitrinaService.catalogo(),
    tienda: actual?.tienda || tiendaService.obtener().catch(() => null),
  };
}

// Por usuario y tienda: con dos tiendas, cada una tiene su landing.
function claveUltimaLanding(usuario = sesionVerificadaVigente()?.usuario) {
  return usuario?.id ? `gesicomm:ultima-landing:${usuario.id}:${usuario.tiendaId ?? ''}` : null;
}

export function recordarUltimaLanding(id) {
  if (!id) return;
  verificarSesion().then((usuario) => {
    const clave = claveUltimaLanding(usuario);
    if (!clave) return;
    try { window.localStorage.setItem(clave, String(id)); } catch { /* sin storage: solo se pierde la precarga */ }
  }).catch(() => {});
}

/** Pide el detalle de la última landing abierta, si se conoce. */
export function precargarDetalleUltimaLanding() {
  const clave = claveUltimaLanding();
  let id = null;
  try { id = clave ? window.localStorage.getItem(clave) : null; } catch { /* sin storage */ }
  if (!id || (detalle && detalle.id === id && Date.now() - detalle.desde < VIGENCIA_DETALLE_MS)) return;
  const promesa = landingSimpleService.obtener(id);
  promesa.catch(() => {});
  detalle = { id, desde: Date.now(), promesa };
}

/** El detalle precargado de `id`, o null si no se precargó ese. */
export function tomarDetallePrecargado(id) {
  const actual = detalle && detalle.id === String(id) && Date.now() - detalle.desde < VIGENCIA_DETALLE_MS ? detalle : null;
  detalle = null;
  return actual?.promesa || null;
}
