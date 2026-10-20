import { completarMoldeCombo } from './codigoBloquesFicha';
import estilosOfertaProducto from './ofertaTiempoLimitado.css?inline';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ComboProductPagePublica from './templates/combo/ComboProductPagePublica';
import { conGlobalesHeredados } from './globalesCodigo';
import { codigoInicioHeredable } from './fichaCodigoLanding';
import { BLOQUES_EDITABLES_COMBO, SUBBLOQUES_HERO_COMBO } from './comboBloques';
import { actualizarDocumentoCombo } from './actualizarDocumentoCombo';
import estilos from './templates/combo/comboProductPage.css?inline';
import estilosMedia from './templates/mediaGaleria.css?inline';

// Un único documento aislado: mismo header, anuncios, footer y motor que
// la ficha de producto. El contenido propio del combo se genera con su renderer.
export function codigoFichaCombo({ item, content, codigoInicio, tema, tienda, isMobile = false, preview = false }) {
  const layout = item.ficha_combo || {};
  const sinGlobalesPropios = { ...item, ficha_combo: { ...layout, barra_superior: { activo: false },
    _visibilidad: { ...layout._visibilidad, pie: false } } };
  let html = renderToStaticMarkup(<MemoryRouter><ComboProductPagePublica item={sinGlobalesPropios}
    landingConfig={content} tema={tema} nombreComercio={tienda?.nombre} isMobile={isMobile}
    previewMode={preview} documento onVolver={() => {}} /></MemoryRouter>);
  html = html.replace(/data-combo-bloque="([a-z_]+)"/g, '$& data-gesicomm-ficha-bloque="$1"')
    .replace(/data-combo-sub-bloque="([a-z_0-9]+)"/g, '$& data-gesicomm-ficha-bloque="$1"')
    .replace(/(<button\b[^>]*class="cmb-cta[^"]*")/g, '$1 data-gesicomm-comprar')
    .replace(/(<button\b[^>]*class="cmb-breadcrumbs")/g, '$1 data-gesicomm-link="inicio"');
  const inicio = codigoInicioHeredable(content, codigoInicio);
  const heredado = conGlobalesHeredados({ html: `<header></header>${html}<footer></footer>`, css: `${estilos}\n${estilosMedia}\n${estilosOfertaProducto}`, js: '' }, inicio);
  // El mismo control de visibilidad de los bloques globales se aplica dentro
  // del documento, sin duplicar la barra o el pie genérico del combo.
  const css = `${heredado.css || ''}
    .cmb-root [hidden] { display: none !important; }
    .cmb-root .cmb-seccion-numero { display: none; }
    ${layout._visibilidad?.pie === false ? 'body > footer { display:none !important; }' : ''}
    ${layout._visibilidad?.anuncios === false ? '[data-gesicomm-bloque="anuncios"],.announcement { display:none !important; }' : ''}
    ${layout._visibilidad?.encabezado_tienda === false ? 'body > header { display:none !important; }' : ''}`;
  html = heredado.html;
  const codigosBloque = item.codigo_bloques ?? content?.venta?.presentacion_productos?.[`combo:${item.referencia_id || item.id}`]?.codigo_bloques ?? {};
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    for (const [clave, codigo] of Object.entries(codigosBloque)) {
      if (!/^[a-z_0-9]{1,50}$/.test(clave) || !codigo?.html) continue;
      const nodo = doc.querySelector(`[data-gesicomm-ficha-bloque="${clave}"]`);
      if (!nodo) continue;
      const template = doc.createElement('template'); template.innerHTML = completarMoldeCombo(codigo.html, nodo.outerHTML);
      if (template.content.firstElementChild) nodo.replaceWith(template.content.firstElementChild);
    }
    html = doc.body.innerHTML;
  }
  return { ...heredado, html, css, bloquesFicha: codigosBloque, js: `${heredado.js || ''}\n(${interaccionesCombo.toString()})(${actualizarDocumentoCombo.toString()});` };
}

function interaccionesCombo(actualizar) {
  window.addEventListener('scroll', function () {
    window.parent.postMessage({ tipo: 'gesicomm:scroll', y: window.scrollY || 0 }, '*');
  }, { passive: true });
  window.addEventListener('message', function (e) {
    if (e.source === window.parent && e.data?.tipo === 'gesicomm:combo-documento' && typeof e.data.html === 'string' && typeof e.data.css === 'string') {
      actualizar(e.data.html, e.data.css);
      window.dispatchEvent(new Event('gesicomm:actualizar-countdowns'));
      window.__gcCodigoBloques?.montar(window.Gesicomm?.producto);
    }
    if (e.source === window.parent && e.data && e.data.tipo === 'gesicomm:restaurar-scroll' && Number.isFinite(e.data.y)) {
      window.scrollTo({ top: Math.max(0, e.data.y), behavior: 'instant' });
    }
  });
  document.addEventListener('click', function (e) {
    var pregunta = e.target.closest('[data-combo-pregunta]');
    if (pregunta) {
      var abierto = pregunta.getAttribute('aria-expanded') !== 'true';
      pregunta.setAttribute('aria-expanded', String(abierto));
      var respuesta = pregunta.parentElement.querySelector('.cmb-faq-answer');
      if (respuesta) respuesta.hidden = !abierto;
      pregunta.parentElement.classList.toggle('abierta', abierto);
    }
    var miniatura = e.target.closest('[data-combo-imagen]');
    if (miniatura) {
      var indice = Number(miniatura.getAttribute('data-combo-imagen'));
      document.querySelectorAll('[data-combo-media-panel]').forEach(function (panel) {
        panel.hidden = Number(panel.getAttribute('data-combo-media-panel')) !== indice;
        if (panel.hidden) panel.querySelectorAll('video').forEach(function (video) { video.pause(); });
      });
      document.querySelectorAll('[data-combo-imagen]').forEach(function (b) { b.classList.toggle('activa', b === miniatura); });
    }
  });
  document.addEventListener('mouseover', function (e) {
    var bloque = e.target.closest('[data-gesicomm-ficha-bloque]');
    if (bloque) window.parent.postMessage({ tipo: 'gesicomm:combo-activo', clave: bloque.getAttribute('data-gesicomm-ficha-bloque') }, '*');
  });
}

export function rotulosCombo(item) {
  return { ...Object.fromEntries(BLOQUES_EDITABLES_COMBO.map((b, i) => [b.key, `${i + 1} · ${b.label}`])), ...SUBBLOQUES_HERO_COMBO,
    ...Object.fromEntries(['oferta', 'oferta_encabezado', 'oferta_nombre', 'oferta_texto', 'oferta_duracion'].map(k => [k, 'Precio y ahorro'])),
    ...Object.fromEntries((item?.productos_combo || []).flatMap((p, i) => ['incluye', 'detalle_productos'].map(key => [`${key}_producto_${p.id}`, `Producto ${i + 1} · ${p.nombre}`]))) };
}
