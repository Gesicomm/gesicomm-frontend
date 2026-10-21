import { vitrinaService } from '../../services/vitrinaService';
import { tiendaService } from '../../services/tiendaService';

/**
 * Precarga del editor de la tienda ("Mi e-commerce"). Al entrar, las
 * cargas iban en cascada: listar landings → bajar el código del editor →
 * detalle de la landing → recién ahí catálogo completo (miles de productos)
 * y tienda. El catálogo y la tienda no dependen de cuál landing se abra, así
 * que se piden apenas arranca la entrada, en paralelo con el resto.
 *
 * Cada precarga se consume una sola vez: una recarga posterior (después de
 * guardar precios, activar un combo...) siempre va al servidor.
 */
const VIGENCIA_MS = 60_000;
let precarga = null;

export function precargarEditor() {
  if (precarga && Date.now() - precarga.desde < VIGENCIA_MS) return;
  const catalogo = vitrinaService.catalogo();
  const tienda = tiendaService.obtener().catch(() => null);
  // Sin esto, un error del catálogo sin consumir queda como rechazo sin manejar.
  catalogo.catch(() => {});
  precarga = { desde: Date.now(), catalogo, tienda };
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
