/**
 * Cliente dedicado para la landing pública — a propósito NO usa la
 * instancia axios de services/api.js: esa instancia tiene un interceptor
 * que redirige a /login ante cualquier 401, lo cual no tiene sentido en
 * una página sin autenticación y podría romperla de formas raras.
 * fetch simple, sin credentials (no hace falta cookie para un GET público).
 *
 * IMPORTANTE: a diferencia del resto del frontend (que pega contra
 * VITE_API_URL, un backend fijo), esto usa rutas RELATIVAS al origen
 * actual. La tienda se resuelve en el backend por el hostname de la
 * request (middleware/resolverTienda) — si esto pegara contra una URL de
 * backend fija, todas las tiendas terminarían resolviendo al mismo
 * hostname en vez de al propio. En producción, `/api` en el hostname de
 * la tienda tiene que enrutar al backend (reverse proxy / mismo Express
 * sirviendo todo). En dev local sin ese proxy armado, esto pega contra el
 * propio Vite dev server — ver vite.config.js para el proxy de /api.
 */

/**
 * @param {string|undefined} slug - undefined → landing es_home de la tienda actual
 * @returns {null} el slug nunca existió (404 real)
 * @returns {{disponible:false}} existe pero no está publicada / dueño inactivo
 * @returns {{disponible:true, ...}} landing lista para renderizar
 */
export async function obtenerLandingPublica(slug, opciones = {}) {
  const params = new URLSearchParams();
  if (opciones.tipoPagina) params.set('tipo_pagina', opciones.tipoPagina);
  const query = params.toString();
  const pathBase = slug ? `/api/l/${encodeURIComponent(slug)}` : '/api/l/';
  const path = query ? `${pathBase}?${query}` : pathBase;
  const res = await fetch(path, { credentials: 'include' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('No se pudo cargar la landing.');
  return res.json();
}

/**
 * @param {string|undefined} slug
 * @param {object} [opciones] - { pagina, porPagina, orden, disponibilidad, categoria, etiqueta, precioMin, precioMax }
 *   Los filtros se mandan al backend (no se filtra en el navegador): el
 *   catálogo puede tener más productos de los que trae esta página, así
 *   que filtrar solo lo ya cargado haría que una búsqueda por categoría no
 *   encuentre productos reales que cayeron en otra página.
 */
export async function obtenerCatalogoLandingPublica(slug, opciones = {}) {
  const {
    pagina, porPagina, orden, disponibilidad, categoria, marca, etiqueta, precioMin, precioMax, busqueda, soloInicio,
  } = opciones;
  const params = new URLSearchParams({ vista: 'catalogo' });
  if (pagina) params.set('pagina', pagina);
  if (porPagina) params.set('porPagina', porPagina);
  if (orden) params.set('orden', orden);
  if (disponibilidad && disponibilidad !== 'todos') params.set('disponibilidad', disponibilidad);
  if (categoria && categoria !== 'todas') params.set('categoria', categoria);
  if (marca && marca !== 'todas') params.set('marca', marca);
  if (soloInicio === true) params.set('soloInicio', 'true');
  if (etiqueta && etiqueta !== 'todas') params.set('etiqueta', etiqueta);
  if (precioMin !== undefined && precioMin !== null && precioMin !== '') params.set('precioMin', precioMin);
  if (precioMax !== undefined && precioMax !== null && precioMax !== '') params.set('precioMax', precioMax);
  if (busqueda) params.set('q', String(busqueda).slice(0, 80));

  const path = slug ? `/api/l/${encodeURIComponent(slug)}?${params}` : `/api/l/?${params}`;
  const res = await fetch(path, { credentials: 'include' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('No se pudo cargar el catálogo.');
  return res.json();
}

export async function obtenerProductoLanding(slug, productoSlug) {
  const path = slug
    ? `/api/l/${encodeURIComponent(slug)}/producto/${encodeURIComponent(productoSlug)}`
    : `/api/l/producto/${encodeURIComponent(productoSlug)}`;
  const res = await fetch(path);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('No se pudo cargar el producto.');
  return res.json();
}

/**
 * Evento de conversión (Meta CAPI) — best-effort, nunca lanza: un fallo acá
 * no puede interrumpir el flujo real del visitante (abrir WhatsApp). Ver
 * pixel.js para el lado navegador (fbq) que dispara junto con esto, mismo
 * event_id, para que Meta los deduplique como un solo evento.
 *
 * "Best-effort" es que no lanza, NO que no se entera. Chequear res.ok es
 * indispensable: en una request same-origin el navegador no valida CORS, así
 * que un rechazo del backend llega como una respuesta 4xx/5xx perfectamente
 * resuelta — el fetch no rechaza y el catch nunca corre. Sin este warning,
 * un backend que rebotaba el 100% de los eventos con 500 pasó inadvertido
 * (whitelist de CORS en server.js, ver el comentario de RUTAS_PUBLICAS_TIENDA)
 * y las estadísticas de la landing quedaron con visitas pero sin ninguna
 * conversión, sin una sola señal en consola.
 */
/**
 * Crea el pedido (Envío) real a partir del formulario de checkout — a
 * diferencia de registrarEventoLanding, esto SÍ propaga el error: el
 * visitante necesita saber si su pedido se creó o no (ej. stock
 * insuficiente), no es un pixel de tracking best-effort.
 * @returns {{pedido_id: number, numero_pedido: number, monto: number, redirigir_whatsapp: boolean}}
 * @throws {Error} con el mensaje que mandó el backend.
 */
export async function crearCheckoutLanding(slug, payload) {
  const path = slug ? `/api/l/${encodeURIComponent(slug)}/checkout` : '/api/l/checkout';
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'No se pudo crear el pedido.');
  }
  return data;
}

/**
 * Recálculo de carrito en vivo — SOLO LECTURA, no crea ningún pedido. Se
 * llama cada vez que cambia cantidad/variante/oferta de un item, para
 * mostrar el precio real (mismo motor que después cobra crearCheckoutLanding)
 * antes de llegar al submit final del formulario.
 * @param {Array} items - [{content_id, variante_id?, oferta_id?, cantidad}]
 * @returns {{items: Array, subtotal: number, total: number}}
 * @throws {Error} con el mensaje que mandó el backend.
 */
export async function recalcularCarritoLanding(slug, items) {
  const path = slug ? `/api/l/${encodeURIComponent(slug)}/carrito` : '/api/l/carrito';
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'No se pudo recalcular el carrito.');
  }
  return data;
}

/**
 * Valida un cupón contra el carrito actual. NO lo consume: el uso se
 * registra recién cuando el pedido se crea (ver crearCheckoutLanding), así
 * probar un código no lo gasta.
 *
 * El descuento que devuelve es para MOSTRAR — el backend lo vuelve a
 * calcular al cobrar, así que no se puede inflar desde el navegador.
 *
 * @returns {{codigo: string, descuento_porcentaje: number, descuento: number, subtotal: number, total: number}}
 * @throws {Error} con el motivo legible del rechazo (vencido, agotado, no aplica).
 */
export async function validarCuponLanding(slug, codigo, items) {
  const path = slug ? `/api/l/${encodeURIComponent(slug)}/cupon` : '/api/l/cupon';
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo, items }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'No se pudo aplicar el cupón.');
  }
  return data;
}

export async function consultarResultadoPagoLanding(hash) {
  const res = await fetch(`/api/l/pagopar/resultado/${encodeURIComponent(hash)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'No se pudo consultar el resultado del pago.');
  }
  return data;
}

/**
 * Cuenta una visita a la landing.
 *
 * Antes la contaba el backend dentro del GET de la landing, lo que obligaba a
 * que cada visita llegara a Node y hacía incacheable esa respuesta. Ahora la
 * dispara el navegador para que el GET pueda vivir en el CDN. No se espera ni
 * se propaga el error: una visita perdida no puede romperle la página a nadie.
 */
export async function registrarVisitaLanding(slug) {
  const path = slug ? `/api/l/${encodeURIComponent(slug)}/visita` : '/api/l/visita';
  try {
    await fetch(path, { method: 'POST', keepalive: true });
  } catch (err) {
    console.warn('[landing] no se pudo registrar la visita:', err?.message || err);
  }
}

export async function registrarEventoLanding(slug, payload) {
  const path = slug ? `/api/l/${encodeURIComponent(slug)}/eventos` : '/api/l/eventos';
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[landing] evento "${payload?.event_name}" rechazado por el backend: HTTP ${res.status}`);
    }
  } catch (err) {
    // La red falló de verdad (offline, DNS, request abortada al navegar).
    // No se propaga: el visitante no puede ver un error por un pixel.
    console.warn(`[landing] evento "${payload?.event_name}" no pudo enviarse:`, err?.message || err);
  }
}
