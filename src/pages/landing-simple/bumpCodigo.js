/**
 * Order bump oficial para landings de "Lienzo en blanco".
 *
 * Antes la IA armaba su propio bump en el HTML (un checkbox con la oferta),
 * pero ese checkbox no estaba conectado a nada: el botón de compra solo
 * mandaba el producto principal y el pedido salía SIN la oferta aunque el
 * cliente la marcara. Ahora la landing solo pone un marcador:
 *
 *   <div data-gesicomm-bump="producto:6"></div>
 *
 * y Gesicom dibuja ahí la oferta con los datos reales (precio, ahorro,
 * imagen), maneja el estado seleccionado y la manda junto con el producto
 * cuando se toca el botón data-gesicomm-checkout del mismo producto.
 *
 * Opcional: un input con data-gesicomm-cantidad-de="producto:6" hace que la
 * cantidad elegida viaje al carrito y cuente en el total del botón.
 */
import { detalleOfertaCheckout, ofertaCheckoutPublicable, precioOfertaCheckout } from '../landing/ofertasCheckout';

/**
 * Datos mínimos (ya resueltos y serializables) que necesita el runtime del
 * iframe: por producto, su precio y sus order bumps publicables.
 * @param {Array} catalogo      catalogo_items públicos
 * @param {(url: string) => string} resolverImagen  getMediaUrl
 */
export function datosBumpsCodigo(catalogo = [], resolverImagen = u => u) {
  const datos = {};
  for (const item of catalogo) {
    const bumps = (item.ofertas || [])
      .filter(o => o.estrategia === 'order_bump' && ofertaCheckoutPublicable(o))
      .slice(0, 1)
      .map(o => {
        const { complementario, imagen, precioNormal } = detalleOfertaCheckout(o);
        const precio = precioOfertaCheckout(o);
        return {
          id: o.id,
          titulo: complementario?.nombre || o.nombre,
          imagen: imagen ? resolverImagen(imagen) : null,
          precio,
          precioNormal: precioNormal > precio ? precioNormal : 0,
        };
      });
    if (!bumps.length) continue;
    datos[`${item.tipo}:${item.referencia_id}`] = {
      // "AdelFit - Suplemento Natural para…" → "AdelFit": el nombre entero no
      // entra en la línea de "Tu compra incluye…".
      nombre: String(item.nombre || '').split(/\s[-–—|]\s/)[0].trim() || item.nombre,
      precio: Number(item.precio) || 0,
      bumps,
    };
  }
  return datos;
}

/** Estilos del bump: toman --gc-* de la landing, con respaldo neutro. */
export const CSS_BUMP_CODIGO = `
.gcb { --gcb-a: var(--gc-primario, #16a34a); margin: 16px 0; font: inherit; color: inherit; }
.gcb-card { display: block; width: 100%; box-sizing: border-box; text-align: left; font: inherit; color: inherit; cursor: pointer;
  padding: 12px 14px 14px; border-radius: 14px; border: 1.5px dashed color-mix(in srgb, var(--gcb-a) 60%, transparent);
  background: color-mix(in srgb, var(--gcb-a) 6%, var(--gc-fondo, #fff));
  transition: border-color .15s, background .15s, box-shadow .15s, transform .15s; }
.gcb-card:hover { border-color: var(--gcb-a); box-shadow: 0 8px 24px -12px color-mix(in srgb, var(--gcb-a) 60%, transparent); transform: translateY(-1px); }
.gcb-card:focus-visible { outline: 3px solid color-mix(in srgb, var(--gcb-a) 45%, transparent); outline-offset: 2px; }
.gcb-card[aria-checked="true"] { border-style: solid; border-color: var(--gcb-a); background: color-mix(in srgb, var(--gcb-a) 11%, var(--gc-fondo, #fff)); }
.gcb-head { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--gcb-a); }
.gcb-body { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; align-items: center; }
.gcb-img { width: 64px; height: 64px; border-radius: 10px; background: #fff; object-fit: contain; border: 1px solid color-mix(in srgb, currentColor 10%, transparent); }
.gcb-sub { margin: 0 0 2px; font-size: 13px; opacity: .8; }
.gcb-sub b { opacity: 1; }
.gcb-tit { margin: 0 0 6px; font-size: 15px; font-weight: 700; line-height: 1.3; }
.gcb-precio { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 14px; }
.gcb-precio strong { font-size: 16px; }
.gcb-precio del { opacity: .55; }
.gcb-ahorro { color: #15803d; font-weight: 700; font-size: 13px; }
.gcb-ctrl { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid color-mix(in srgb, currentColor 10%, transparent); font-size: 14px; font-weight: 700; }
.gcb-dot { flex: 0 0 auto; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 999px; border: 2px solid var(--gcb-a); color: transparent; font-size: 13px; line-height: 1; transition: background .15s, color .15s; }
.gcb-card[aria-checked="true"] .gcb-dot { background: var(--gcb-a); color: var(--gc-texto-sobre-primario, #fff); }
.gcb-quitar { margin-left: auto; font-size: 13px; font-weight: 600; text-decoration: underline; opacity: .7; }
.gcb-incluye { margin: 8px 2px 0; font-size: 13px; opacity: .75; }
@media (prefers-reduced-motion: reduce) { .gcb-card { transition: none; } .gcb-card:hover { transform: none; } }
`;

/**
 * Runtime del iframe. Se inyecta con Function#toString, así que NO puede
 * usar nada de fuera de su propio cuerpo (ni imports ni closures) y va en
 * ES5 para no depender de nada del navegador del visitante.
 */
/* eslint-disable no-var */
export function runtimeBumpCodigo(DATOS) {
  var seleccion = {};
  function gs(n) { return 'Gs ' + Number(n || 0).toLocaleString('es-PY', { maximumFractionDigits: 0 }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cantidadDe(clave) {
    var input = document.querySelector('[data-gesicomm-cantidad-de="' + clave + '"]');
    var n = input ? parseInt(input.value, 10) : NaN;
    return n > 0 ? n : 1;
  }
  function totalDe(clave) {
    var d = DATOS[clave];
    var total = d.precio * cantidadDe(clave);
    (seleccion[clave] || []).forEach(function (id) {
      d.bumps.forEach(function (b) { if (b.id === id) total += b.precio; });
    });
    return total;
  }
  function pintarBotones(clave) {
    var botones = document.querySelectorAll('[data-gesicomm-checkout="' + clave + '"]');
    for (var i = 0; i < botones.length; i++) {
      var b = botones[i];
      if (b.getAttribute('data-gesicomm-sin-total') != null) continue;
      if (b.__gcLabel == null) b.__gcLabel = b.textContent.trim();
      b.textContent = b.__gcLabel + ' · ' + gs(totalDe(clave));
    }
  }
  function render(cont, clave) {
    var d = DATOS[clave];
    var b = d.bumps[0];
    var sel = (seleccion[clave] || []).indexOf(b.id) !== -1;
    var ahorro = b.precioNormal ? b.precioNormal - b.precio : 0;
    cont.innerHTML =
      '<div class="gcb">' +
        '<div class="gcb-card" role="checkbox" tabindex="0" aria-checked="' + sel + '">' +
          '<div class="gcb-head">' + (sel ? '✓ Oferta agregada a tu pedido' : ('Oferta exclusiva' + (ahorro ? ' · Ahorrá ' + gs(ahorro) : ''))) + '</div>' +
          '<div class="gcb-body">' +
            (b.imagen ? '<img class="gcb-img" src="' + esc(b.imagen) + '" alt="">' : '<span></span>') +
            '<div>' +
              (sel ? '' : '<p class="gcb-sub">Sumalo a tu pedido por solo <b>' + gs(b.precio) + '</b></p>') +
              '<p class="gcb-tit">' + esc(b.titulo) + '</p>' +
              '<div class="gcb-precio"><strong>' + gs(b.precio) + '</strong>' +
                (b.precioNormal ? '<del>' + gs(b.precioNormal) + '</del>' : '') +
                (ahorro ? '<span class="gcb-ahorro">Ahorrás ' + gs(ahorro) + '</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="gcb-ctrl"><span class="gcb-dot" aria-hidden="true">✓</span>' +
            (sel ? 'Oferta agregada<span class="gcb-quitar">Quitar</span>' : 'Agregar esta oferta') +
          '</div>' +
        '</div>' +
        (sel ? '<p class="gcb-incluye">Tu compra incluye ' + esc(d.nombre) + ' + la oferta seleccionada.</p>' : '') +
      '</div>';
    var card = cont.querySelector('.gcb-card');
    function toggle() {
      var lista = seleccion[clave] || [];
      seleccion[clave] = sel ? lista.filter(function (x) { return x !== b.id; }) : lista.concat([b.id]);
      render(cont, clave);
      pintarBotones(clave);
      var nueva = cont.querySelector('.gcb-card');
      if (nueva) nueva.focus();
    }
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
  }
  function iniciar() {
    var conts = document.querySelectorAll('[data-gesicomm-bump]');
    for (var i = 0; i < conts.length; i++) {
      var clave = conts[i].getAttribute('data-gesicomm-bump');
      if (DATOS[clave]) { render(conts[i], clave); pintarBotones(clave); }
    }
    document.addEventListener('input', function (e) {
      var clave = e.target && e.target.getAttribute && e.target.getAttribute('data-gesicomm-cantidad-de');
      if (clave && DATOS[clave]) pintarBotones(clave);
    });
  }
  // Lo lee el puente de checkout al tocar el botón de compra.
  window.__gesicommBumps = function (clave) { return (seleccion[clave] || []).slice(); };
  window.__gesicommCantidad = cantidadDe;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
}
/* eslint-enable no-var */

/** Script listo para pegar en el documento del iframe. */
export function scriptBumpCodigo(datos) {
  const json = JSON.stringify(datos || {}).replace(/</g, '\\u003c');
  return `(${runtimeBumpCodigo.toString()})(${json});`;
}
