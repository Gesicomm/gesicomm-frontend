/**
 * Estado de sesión del lado del cliente.
 *
 * El token vive en una cookie HttpOnly que el JavaScript no puede leer (ver
 * utils/auth.js), así que acá NO se guarda ningún token ni dato del usuario.
 * Lo único que se guarda es un par de banderas de UX en sessionStorage:
 *
 *   - "hubo sesión en esta pestaña": para poder distinguir a alguien cuya
 *     sesión venció (hay que avisarle) de alguien que entró directo a una URL
 *     privada sin haber iniciado sesión nunca (a ese no hay nada que avisarle,
 *     va derecho al login).
 *   - el aviso pendiente que tiene que mostrar la pantalla de login.
 *
 * Va en sessionStorage y no en la URL a propósito: en Gesicomm el estado de
 * UI nunca viaja por query params.
 */
import { apiOrigin } from './apiBase';

const CLAVE_AVISO = 'gesicomm:aviso-sesion';
const CLAVE_SESION_ACTIVA = 'gesicomm:sesion-activa';

/** Motivos por los que el usuario termina en la pantalla de login. */
export const AVISO_SESION_EXPIRADA = 'expirada';

/** Base de la API (sin barra final). Mismo criterio que utils/api.js. */
export function baseApi() {
  return apiOrigin();
}

// sessionStorage puede tirar excepción (modo privado en algunos navegadores,
// cookies de terceros bloqueadas en un iframe). Ninguna de estas banderas es
// crítica: si falla, se pierde el aviso pero el flujo sigue.
function leer(clave) {
  try { return window.sessionStorage.getItem(clave); } catch { return null; }
}
function escribir(clave, valor) {
  try { window.sessionStorage.setItem(clave, valor); } catch { /* sin storage */ }
}
function borrar(clave) {
  try { window.sessionStorage.removeItem(clave); } catch { /* sin storage */ }
}

/** Se llama cada vez que el backend confirma una sesión válida. */
export function marcarSesionActiva() {
  escribir(CLAVE_SESION_ACTIVA, '1');
}

/** ¿Esta pestaña llegó a tener una sesión válida en algún momento? */
export function huboSesion() {
  return leer(CLAVE_SESION_ACTIVA) === '1';
}

// ─────────────────────────────────────────────────────────────────────────
// Respuestas de sesión compartidas por los guards y layouts
//
// Al abrir una pantalla del panel, RequireTienda, DynamicLayout, UserLayout
// y la página misma preguntaban cada uno /auth/me (y dos de ellos
// /suscripciones/mi-estado), uno detrás del otro: cada pregunta a
// producción cuesta 0,2–0,4 s y el panel esperaba varias en cadena antes de
// pedir sus datos. Acá se comparte la respuesta: la misma petición en vuelo
// y, ya resuelta, durante unos segundos.
//
// Solo en memoria (nada de storage) y con vida corta. Se descarta al cerrar
// o perder la sesión y con cualquier escritura exitosa (login, cambio de
// tienda, pago de plan...: ver invalidarCacheSesion en services/api.js y
// utils/api.js), así nunca se reusa la identidad o la tienda de antes.
// ─────────────────────────────────────────────────────────────────────────
const VIGENCIA_CACHE_SESION_MS = 5000;
let cacheSesion = new Map();

/**
 * Devuelve la promesa compartida de `clave` o llama a `pedir()`. Una
 * respuesta que `esReusable` descarta (error, sin sesión) no se guarda: la
 * próxima llamada vuelve a preguntar.
 */
export function compartirPorSesion(clave, pedir, esReusable = () => true) {
  const previa = cacheSesion.get(clave);
  if (previa && (previa.enCurso || Date.now() - previa.desde < VIGENCIA_CACHE_SESION_MS)) return previa.promesa;
  const generacion = cacheSesion;
  const entrada = { enCurso: true, desde: 0, valor: undefined, promesa: null };
  entrada.promesa = Promise.resolve().then(pedir).then(
    (valor) => {
      // Si se invalidó mientras estaba en vuelo, no se guarda.
      if (generacion === cacheSesion && cacheSesion.get(clave) === entrada) {
        if (esReusable(valor)) Object.assign(entrada, { enCurso: false, desde: Date.now(), valor });
        else cacheSesion.delete(clave);
      }
      return valor;
    },
    (err) => {
      if (cacheSesion.get(clave) === entrada) cacheSesion.delete(clave);
      throw err;
    },
  );
  cacheSesion.set(clave, entrada);
  return entrada.promesa;
}

/** Valor ya resuelto y vigente de `clave` (sin esperar), o undefined. */
export function valorCompartidoVigente(clave) {
  const e = cacheSesion.get(clave);
  return e && !e.enCurso && Date.now() - e.desde < VIGENCIA_CACHE_SESION_MS ? e.valor : undefined;
}

export function invalidarCacheSesion() {
  cacheSesion = new Map();
}

/** Cierre de sesión explícito: no hay nada que avisar después. */
export function olvidarSesion() {
  invalidarCacheSesion();
  borrar(CLAVE_SESION_ACTIVA);
  borrar(CLAVE_AVISO);
  avisoDeEstaCarga = undefined;
}

/**
 * Registra que la sesión se perdió sin que el usuario la cerrara.
 * Devuelve true si corresponde avisarle (o sea: había sesión antes).
 */
export function registrarSesionPerdida() {
  invalidarCacheSesion();
  if (!huboSesion()) return false;
  borrar(CLAVE_SESION_ACTIVA);
  escribir(CLAVE_AVISO, AVISO_SESION_EXPIRADA);
  return true;
}

// Se memoiza por carga de página: en desarrollo React ejecuta los efectos
// dos veces (StrictMode), y sin esto la primera llamada consumía el aviso y la
// segunda ya no encontraba nada, así que el cartel no llegaba a aparecer.
let avisoDeEstaCarga;

/** Devuelve el aviso pendiente (si hay) y lo consume del storage. */
export function tomarAvisoSesion() {
  if (avisoDeEstaCarga === undefined) {
    avisoDeEstaCarga = leer(CLAVE_AVISO);
    borrar(CLAVE_AVISO);
  }
  return avisoDeEstaCarga;
}

/**
 * Manda al login por pérdida de sesión, con recarga completa.
 *
 * La recarga es intencional: tira abajo todo el estado en memoria de la
 * sesión anterior (datos ya cargados en componentes montados, peticiones en
 * vuelo, editores abiertos). Sin eso, quedaban restos de la cuenta anterior
 * en pantalla al volver a entrar con otra.
 */
export function irALoginPorSesionPerdida() {
  registrarSesionPerdida();
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login') return; // ya está ahí, no hacer bucle
  window.location.replace('/login');
}

// ─────────────────────────────────────────────────────────────────────────
// Renovación del access token
//
// El access token dura 15 minutos; el refresh token, 7 días. Cuando el
// primero vence, el backend responde 401 y hay que pedir /auth/refresh antes
// de dar la sesión por perdida — si no, en la práctica la sesión duraba 15
// minutos y el usuario volvía al login cada rato sin entender por qué.
//
// Single-flight: en una carga de página se montan varios guards a la vez y
// todos pueden pegarle a la API al mismo tiempo. Sin esto, un token vencido
// dispara N refresh en paralelo.
// ─────────────────────────────────────────────────────────────────────────
let renovacionEnCurso = null;

export function renovarSesion() {
  if (renovacionEnCurso) return renovacionEnCurso;

  renovacionEnCurso = fetch(`${baseApi()}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      // Se libera en el próximo tick para que las peticiones que se
      // encolaron durante el refresh reusen este mismo resultado.
      setTimeout(() => { renovacionEnCurso = null; }, 0);
    });

  return renovacionEnCurso;
}
