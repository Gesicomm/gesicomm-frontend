/**
 * Runtime de Gesicomm dentro del iframe del lienzo en blanco.
 *
 * Es el CONTRATO entre el HTML que escribe el comercio (o que le genera
 * una IA con el prompt maestro, ver promptsCodigo.js) y el sistema: el
 * HTML solo declara atributos `data-gesicomm-*`, y este runtime los llena
 * con los productos reales y convierte los clics en mensajes al contenedor,
 * que es el que tiene el carrito, el checkout y el tracking.
 *
 * Se serializa con toString() dentro del documento del iframe (ver
 * construirDocumentoCodigo.js), así que esta función NO puede referenciar
 * nada de afuera de su propio cuerpo: ni imports, ni constantes del
 * módulo. Por lo mismo está escrita en ES5 y sin la cadena de cierre de
 * script en ningún lado.
 *
 * Nunca usa innerHTML con datos: todo lo que viene del catálogo entra por
 * textContent o por atributos validados. El catálogo lo carga el comercio,
 * pero se pinta en la landing de otro (sus visitantes), y el día que se
 * reutilice para catálogos compartidos no puede ser un vector de XSS.
 *
 * Referencia rápida de atributos (el detalle vive en el prompt maestro):
 *   data-gesicomm-lista="catalogo|productos|combos|recomendados|ofertas|variantes|imagenes"
 *     "catalogo" es la grilla navegable: la afectan data-gesicomm-buscar,
 *     data-gesicomm-filtro="categoria|orden", data-gesicomm-pagina="anterior|siguiente",
 *     data-gesicomm-cargar-mas, data-gesicomm-paginacion y data-gesicomm-sin-resultados.
 *     + un <template> adentro que se clona por cada elemento
 *     + opcionales data-gesicomm-categoria, data-gesicomm-limite
 *   data-gesicomm-bind="nombre|descripcion|descripcion_larga|precio|precio_antes|
 *                       descuento|imagen|categoria|etiqueta|stock|url|incluye"
 *   data-gesicomm-comprar[="id"]   agrega y abre el carrito ("principal" = el producto estrella)
 *   data-gesicomm-agregar[="id"]   agrega sin abrir el carrito
 *   data-gesicomm-ver[="id"]       va a la ficha del producto
 *   data-gesicomm-inicio           vuelve al inicio
 *   data-gesicomm-oferta           (dentro de una lista de ofertas) agrega esa oferta
 *   data-gesicomm-bump             casilla de un order bump: marcada, la oferta se
 *                                  suma cuando se toca "Comprar" del producto
 *   listas de ofertas: "ofertas" (todas), "ofertas_bump", "ofertas_upsell", "ofertas_pack"
 *   bind "ahorro" → "Ahorrás Gs X" (ofertas con precio anterior)
 *   data-gesicomm-variante         (dentro de la lista "variantes") elige la variante
 *   data-gesicomm-cantidad-input   input numérico de cantidad en la ficha
 *   data-gesicomm-whatsapp[="texto"] abre el WhatsApp de la tienda
 *   data-gesicomm-evento="Nombre"  registra un evento de tracking propio
 *   <form data-gesicomm-form="contacto"> consulta → WhatsApp + evento Lead
 *   data-gesicomm-link="contacto|catalogo|politica-privacidad|politica-reembolso|
 *                       terminos-servicio|politica-envio|aviso-legal"  páginas de la tienda
 *     (un href="/contacto" a secas también se reconoce y se corrige)
 *   data-gesicomm-checkout="producto:ID" — formato viejo, sigue andando
 */
export function runtimeGesicomm() {
  var datos = window.__GESICOMM__ || {};
  var productos = Array.isArray(datos.productos) ? datos.productos : [];
  var productoActual = datos.producto || null;
  var varianteElegida = null;
  // Order bumps marcados en la ficha: se suman al tocar "Comprar".
  var bumpsElegidos = {};

  // ─── Catálogo navegable ───────────────────────────────────────────────
  // Una landing puede vender miles de productos: la respuesta trae solo la
  // primera página completa. Si hay más (paginado), búsqueda, filtros y
  // páginas se le piden al contenedor, que consulta al servidor — el iframe
  // no tiene red. Si no, todo se resuelve acá con lo que ya vino.
  var metaCatalogo = datos.catalogo || {};
  var paginado = !!metaCatalogo.paginado;
  var porPagina = metaCatalogo.por_pagina || 24;
  var filtros = { busqueda: '', categoria: '', orden: '', pagina: 1 };
  var catalogoVista = {
    items: productos.slice(),
    pagina: 1,
    totalPaginas: 1,
    total: metaCatalogo.total || productos.length,
    categorias: [],
    cargando: false,
  };
  var pedidoCatalogo = 0;
  // Todo producto que la página vio alguna vez: comprar desde la página 7
  // tiene que encontrar el producto aunque no esté en la primera.
  var conocidos = productos.slice();

  var MARCAS_DIACRITICAS = null;
  try { MARCAS_DIACRITICAS = new RegExp('\\p{M}', 'gu'); } catch (e) { /* navegador viejo: sin quitar tildes */ }
  function normalizar(texto) {
    var t = String(texto || '').toLowerCase();
    return MARCAS_DIACRITICAS && t.normalize ? t.normalize('NFD').replace(MARCAS_DIACRITICAS, '') : t;
  }

  function recordar(items) {
    (items || []).forEach(function (it) {
      for (var i = 0; i < conocidos.length; i++) if (conocidos[i].id === it.id) return;
      conocidos.push(it);
    });
  }

  // Páginas de la tienda (legales, contacto, catálogo). Su URL depende de
  // dónde se ve la landing (subdominio de la tienda o /l/:slug), así que la
  // manda el contenedor en datos.paginas y acá se reescriben los href: un
  // "/politica-privacidad" escrito a mano daba 404 fuera del subdominio.
  var PAGINAS_TIENDA = ['contacto', 'catalogo', 'politica-privacidad', 'politica-reembolso', 'terminos-servicio', 'politica-envio', 'aviso-legal'];
  // Solo rutas internas: un link a otro dominio que termine en /contacto es de ese sitio.
  var RUTA_PAGINA = /^\/?(?:l\/[^/?#]+\/)?(contacto|catalogo|politica-privacidad|politica-reembolso|terminos-servicio|politica-envio|aviso-legal)\/?(?:[?#].*)?$/i;
  var paginasTienda = datos.paginas || {};

  function paginaDeEnlace(a) {
    var explicita = a.getAttribute('data-gesicomm-link');
    if (explicita && PAGINAS_TIENDA.indexOf(explicita) !== -1) return explicita;
    var href = a.getAttribute('href') || '';
    var m = href.match(RUTA_PAGINA);
    return m ? m[1].toLowerCase() : null;
  }

  function prepararEnlacesTienda() {
    var enlaces = document.querySelectorAll('a[href], [data-gesicomm-link]');
    for (var i = 0; i < enlaces.length; i++) {
      var pagina = paginaDeEnlace(enlaces[i]);
      if (!pagina) continue;
      enlaces[i].setAttribute('data-gesicomm-link', pagina);
      if (enlaces[i].tagName === 'A' && paginasTienda[pagina]) enlaces[i].setAttribute('href', paginasTienda[pagina]);
    }
  }

  function enviar(mensaje) {
    try { parent.postMessage(mensaje, '*'); } catch (e) { /* sin contenedor: nada que hacer */ }
  }

  function formatoPrecio(valor) {
    var n = Number(valor);
    if (!isFinite(n) || n <= 0) return '';
    return 'Gs ' + Math.round(n).toLocaleString('es-PY');
  }

  function buscar(id) {
    if (id === null || id === undefined || id === '') return null;
    var clave = String(id).trim();
    // "principal": el primer producto de la landing (en "Producto estrella",
    // el elegido como estrella). Así la página no depende de un id escrito.
    if (clave === 'principal') return productos[0] || null;
    var colon = clave.match(/^(producto|combo):(\d+)$/);
    for (var i = 0; i < conocidos.length; i++) {
      var p = conocidos[i];
      if (colon) {
        if (p.tipo === colon[1] && String(p.referencia_id) === colon[2]) return p;
      } else if (p.id === clave || p.tipo + '-' + p.referencia_id === clave) {
        return p;
      }
    }
    if (productoActual && (productoActual.id === clave)) return productoActual;
    return null;
  }

  // ─── Toast mínimo — el aviso de "agregado" / "elegí una opción" ─────────
  var toastEl = null;
  var toastTimer = null;
  function toast(texto) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'status');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;'
        + 'background:#111827;color:#fff;padding:12px 18px;border-radius:999px;font:600 14px/1.3 system-ui,sans-serif;'
        + 'box-shadow:0 10px 30px rgba(0,0,0,.25);transition:opacity .2s;opacity:0;pointer-events:none;max-width:90vw;text-align:center';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = texto;
    toastEl.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.style.opacity = '0'; }, 2200);
  }

  // ─── Binding ──────────────────────────────────────────────────────────
  function urlSegura(u) {
    var s = String(u || '');
    return /^(https?:)?\/\//i.test(s) || s.charAt(0) === '/' ? s : '';
  }

  function precioDe(item, variante) {
    if (variante && Number(variante.precio_efectivo) > 0) return variante.precio_efectivo;
    return item.precio;
  }

  function aplicarBind(el, item, extra) {
    var campo = el.getAttribute('data-gesicomm-bind');
    var valor = null;
    var variante = extra && extra.variante;
    switch (campo) {
      case 'precio': valor = formatoPrecio(item.precio_efectivo !== undefined ? item.precio_efectivo : precioDe(item, variante)); break;
      case 'precio_antes': valor = formatoPrecio(item.precio_antes || item.precio_normal); break;
      case 'descuento': valor = Number(item.descuento_pct) > 0 ? '-' + item.descuento_pct + '%' : ''; break;
      case 'ahorro': valor = Number(item.ahorro) > 0 ? 'Ahorrás ' + formatoPrecio(item.ahorro) : ''; break;
      case 'stock': valor = item.stock === null || item.stock === undefined ? '' : String(item.stock); break;
      case 'incluye': valor = Array.isArray(item.productos_incluidos) ? item.productos_incluidos.join(', ') : ''; break;
      case 'imagen': valor = item.imagen || item.url_imagen || ''; break;
      case 'url': valor = item.url || ''; break;
      default: valor = item[campo];
    }
    var vacio = valor === null || valor === undefined || valor === '';

    if (campo === 'imagen') {
      var src = urlSegura(valor);
      if (el.tagName === 'IMG') {
        if (src) { el.src = src; if (!el.alt) el.alt = item.nombre || ''; }
        else el.style.display = 'none';
      } else if (src) {
        el.style.backgroundImage = 'url("' + src.replace(/"/g, '%22') + '")';
      }
      return;
    }
    if (campo === 'url') {
      if (el.tagName === 'A' && urlSegura(valor)) el.setAttribute('href', valor);
      if (!el.hasAttribute('data-gesicomm-ver')) el.setAttribute('data-gesicomm-ver', item.id || '');
      return;
    }
    // Campos opcionales: si no hay dato, el elemento desaparece en vez de
    // quedar un "Gs " o una etiqueta vacía colgando en el diseño.
    if (vacio) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.textContent = String(valor);
  }

  function bindDentro(raiz, item, extra) {
    if (raiz.hasAttribute && raiz.hasAttribute('data-gesicomm-bind')) aplicarBind(raiz, item, extra);
    var els = raiz.querySelectorAll('[data-gesicomm-bind]');
    for (var i = 0; i < els.length; i++) {
      // Un bind que vive dentro de OTRA lista anidada es de esa lista.
      var lista = els[i].closest('[data-gesicomm-lista]');
      if (lista && lista !== raiz && raiz.contains(lista)) continue;
      aplicarBind(els[i], item, extra);
    }
  }

  // ─── Listas ───────────────────────────────────────────────────────────
  function fuenteDeLista(nombre, el) {
    var base;
    switch (nombre) {
      case 'catalogo': return catalogoVista.items;
      case 'productos': base = productos; break;
      case 'combos': base = productos.filter(function (p) { return p.tipo === 'combo'; }); break;
      case 'solo_productos': base = productos.filter(function (p) { return p.tipo === 'producto'; }); break;
      case 'recomendados': base = datos.recomendados || []; break;
      case 'ofertas': base = productoActual ? (productoActual.ofertas || []) : []; break;
      case 'ofertas_bump':
      case 'ofertas_upsell':
      case 'ofertas_pack':
        var estrategia = { ofertas_bump: 'order_bump', ofertas_upsell: 'upsell', ofertas_pack: 'normal' }[nombre];
        base = (productoActual ? (productoActual.ofertas || []) : []).filter(function (o) { return o.estrategia === estrategia; });
        break;
      case 'variantes': base = productoActual ? (productoActual.variantes || []) : []; break;
      case 'imagenes': base = productoActual ? (productoActual.imagenes_url || []) : []; break;
      default: base = [];
    }
    var categoria = el.getAttribute('data-gesicomm-categoria');
    if (categoria && nombre.indexOf('ofertas') !== 0 && nombre !== 'variantes' && nombre !== 'imagenes') {
      var cat = categoria.toLowerCase();
      base = base.filter(function (p) { return String(p.categoria || '').toLowerCase() === cat; });
    }
    var limite = parseInt(el.getAttribute('data-gesicomm-limite'), 10);
    if (limite > 0) base = base.slice(0, limite);
    return base;
  }

  function renderizarLista(el) {
    var nombre = el.getAttribute('data-gesicomm-lista');
    // El <template> de ESTA lista, no el de una lista anidada: una sección
    // puede envolver a la grilla con el mismo data-gesicomm-lista solo para
    // ocultarse entera cuando no hay datos.
    var tpl = null;
    var candidatos = el.querySelectorAll('template');
    for (var c0 = 0; c0 < candidatos.length; c0++) {
      if (candidatos[c0].parentNode && candidatos[c0].parentNode.closest('[data-gesicomm-lista]') === el) { tpl = candidatos[c0]; break; }
    }
    if (!tpl) {
      // Envoltorio: sin molde propio, solo se muestra u oculta.
      var hay = fuenteDeLista(nombre, el).length > 0;
      el.style.display = hay || el.getAttribute('data-gesicomm-si-vacio') === 'mostrar' ? '' : 'none';
      return;
    }
    // Re-render: se borra lo que generó la pasada anterior, nunca lo escrito a mano.
    var viejos = el.querySelectorAll('[data-gesicomm-generado]');
    for (var v = 0; v < viejos.length; v++) viejos[v].parentNode.removeChild(viejos[v]);

    var elementos = fuenteDeLista(nombre, el);
    if (!elementos.length) {
      if (el.getAttribute('data-gesicomm-si-vacio') !== 'mostrar') el.style.display = 'none';
      return;
    }
    el.style.display = '';

    var frag = document.createDocumentFragment();
    elementos.forEach(function (elemento, idx) {
      var clon = tpl.content.cloneNode(true);
      var hijos = [];
      for (var c = 0; c < clon.childNodes.length; c++) {
        if (clon.childNodes[c].nodeType === 1) hijos.push(clon.childNodes[c]);
      }
      hijos.forEach(function (h) {
        h.setAttribute('data-gesicomm-generado', '');
        if (nombre.indexOf('ofertas') === 0) {
          h.setAttribute('data-gesicomm-oferta-id', elemento.id);
          bindDentro(h, elemento);
          // Casilla de order bump: conserva lo marcado al repintar.
          var casilla = h.matches && h.matches('input[data-gesicomm-bump]') ? h : h.querySelector('input[data-gesicomm-bump]');
          if (casilla) {
            casilla.checked = !!bumpsElegidos[elemento.id];
            h.classList.toggle('is-checked', casilla.checked);
          }
        } else if (nombre === 'variantes') {
          h.setAttribute('data-gesicomm-variante-id', elemento.id);
          if (elemento.stock !== null && elemento.stock !== undefined && Number(elemento.stock) <= 0) h.setAttribute('data-agotado', '');
          var elegida = !!varianteElegida && String(varianteElegida.id) === String(elemento.id);
          if (elegida) h.classList.add('is-selected');
          h.setAttribute('aria-pressed', elegida ? 'true' : 'false');
          bindDentro(h, { nombre: elemento.nombre, precio: elemento.precio_efectivo, stock: elemento.stock });
        } else if (nombre === 'imagenes') {
          bindDentro(h, { imagen: elemento, nombre: (productoActual && productoActual.nombre) || '' });
          h.setAttribute('data-gesicomm-imagen-idx', String(idx));
        } else {
          h.setAttribute('data-gesicomm-item', elemento.id);
          if (elemento.agotado) h.setAttribute('data-agotado', '');
          bindDentro(h, elemento);
        }
      });
      frag.appendChild(clon);
    });
    tpl.parentNode.insertBefore(frag, tpl);
  }

  function renderizar() {
    var listas = document.querySelectorAll('[data-gesicomm-lista]');
    for (var i = 0; i < listas.length; i++) renderizarLista(listas[i]);
    // Binds sueltos (fuera de listas) = el producto de la ficha, si lo hay.
    if (productoActual) {
      var sueltos = document.querySelectorAll('[data-gesicomm-bind]');
      for (var j = 0; j < sueltos.length; j++) {
        if (sueltos[j].closest('[data-gesicomm-lista]')) continue;
        aplicarBind(sueltos[j], productoActual, { variante: varianteElegida });
      }
    }
    pintarControlesCatalogo();
    var marcas = document.querySelectorAll('[data-gesicomm-tienda]');
    for (var k = 0; k < marcas.length; k++) {
      var campo = marcas[k].getAttribute('data-gesicomm-tienda');
      var val = datos.tienda ? datos.tienda[campo] : '';
      if (campo === 'logo') {
        var src = urlSegura(val);
        if (src && marcas[k].tagName === 'IMG') marcas[k].src = src; else if (!src) marcas[k].style.display = 'none';
      } else if (val) {
        marcas[k].textContent = String(val);
      } else {
        marcas[k].style.display = 'none';
      }
    }
  }

  // ─── Catálogo: filtros, páginas y pedidos al servidor ─────────────────
  function ordenar(lista) {
    var por = {
      'min-max': function (a, b) { return (a.precio || 0) - (b.precio || 0); },
      'max-min': function (a, b) { return (b.precio || 0) - (a.precio || 0); },
      az: function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); },
      za: function (a, b) { return String(b.nombre).localeCompare(String(a.nombre), 'es'); },
    }[filtros.orden];
    return por ? lista.slice().sort(por) : lista;
  }

  function aplicarLocal() {
    var q = normalizar(filtros.busqueda.trim());
    var lista = productos.filter(function (p) {
      if (filtros.categoria && p.categoria !== filtros.categoria) return false;
      if (q && normalizar(p.nombre + ' ' + (p.categoria || '')).indexOf(q) === -1) return false;
      return true;
    });
    var cats = [];
    productos.forEach(function (p) { if (p.categoria && cats.indexOf(p.categoria) === -1) cats.push(p.categoria); });
    catalogoVista.items = ordenar(lista);
    catalogoVista.total = lista.length;
    catalogoVista.pagina = 1;
    catalogoVista.totalPaginas = 1;
    catalogoVista.categorias = cats.sort();
  }

  function pedirPagina(modo) {
    pedidoCatalogo += 1;
    catalogoVista.cargando = true;
    pintarControlesCatalogo();
    enviar({
      tipo: 'gesicomm:catalogo',
      id: pedidoCatalogo,
      modo: modo,
      pagina: filtros.pagina,
      porPagina: porPagina,
      categoria: filtros.categoria,
      orden: filtros.orden,
      busqueda: filtros.busqueda.trim(),
    });
  }

  function actualizarCatalogo(modo) {
    if (paginado) { pedirPagina(modo || 'reemplazar'); return; }
    aplicarLocal();
    repintarCatalogo();
  }

  function repintarCatalogo() {
    var listas = document.querySelectorAll('[data-gesicomm-lista="catalogo"]');
    for (var i = 0; i < listas.length; i++) renderizarLista(listas[i]);
    pintarControlesCatalogo();
  }

  function pintarControlesCatalogo() {
    var v = catalogoVista;
    var i;
    var totales = document.querySelectorAll('[data-gesicomm-total]');
    for (i = 0; i < totales.length; i++) {
      totales[i].textContent = v.total === 1 ? '1 producto disponible' : v.total + ' productos disponibles';
    }
    var infos = document.querySelectorAll('[data-gesicomm-paginacion]');
    for (i = 0; i < infos.length; i++) {
      infos[i].textContent = v.totalPaginas > 1 ? 'Página ' + v.pagina + ' de ' + v.totalPaginas : '';
      infos[i].style.display = v.totalPaginas > 1 ? '' : 'none';
    }
    var botones = document.querySelectorAll('[data-gesicomm-pagina]');
    for (i = 0; i < botones.length; i++) {
      var dir = botones[i].getAttribute('data-gesicomm-pagina');
      var fuera = dir === 'anterior' ? v.pagina <= 1 : v.pagina >= v.totalPaginas;
      botones[i].disabled = fuera || v.cargando;
      botones[i].style.display = v.totalPaginas > 1 ? '' : 'none';
    }
    var mas = document.querySelectorAll('[data-gesicomm-cargar-mas]');
    for (i = 0; i < mas.length; i++) {
      mas[i].style.display = v.pagina < v.totalPaginas ? '' : 'none';
      mas[i].disabled = v.cargando;
    }
    var cargando = document.querySelectorAll('[data-gesicomm-cargando]');
    for (i = 0; i < cargando.length; i++) cargando[i].style.display = v.cargando ? '' : 'none';
    var vacios = document.querySelectorAll('[data-gesicomm-sin-resultados]');
    for (i = 0; i < vacios.length; i++) vacios[i].style.display = !v.cargando && !v.items.length ? '' : 'none';
    var selects = document.querySelectorAll('select[data-gesicomm-filtro="categoria"]');
    for (i = 0; i < selects.length; i++) {
      var sel = selects[i];
      var viejas = sel.querySelectorAll('option[data-gesicomm-generado]');
      for (var o = 0; o < viejas.length; o++) sel.removeChild(viejas[o]);
      v.categorias.forEach(function (cat) {
        var op = document.createElement('option');
        op.value = cat;
        op.textContent = cat;
        op.setAttribute('data-gesicomm-generado', '');
        sel.appendChild(op);
      });
      sel.value = filtros.categoria;
    }
  }

  // "Ver dónde aparece" del paso de venta: el contenedor pide resaltar una
  // lista (ofertas, recomendados, catálogo…) y acá se la lleva a la vista.
  var resaltadoTimer = null;
  function resaltar(lista) {
    if (!/^[a-z_]+$/.test(String(lista || ''))) return;
    var el = document.querySelector('[data-gesicomm-lista="' + lista + '"]');
    if (!el || el.style.display === 'none') return;
    // Salto directo, no 'smooth': la animación no siempre termina (iframe
    // recién cargado, ventana sin foco) y la zona quedaba fuera de la vista.
    // El CSS del comercio suele tener scroll-behavior: smooth en <html>, así
    // que se apaga un instante para que el salto sea real.
    var raiz = document.documentElement;
    var comportamiento = raiz.style.scrollBehavior;
    raiz.style.scrollBehavior = 'auto';
    if (el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    raiz.style.scrollBehavior = comportamiento;
    var previo = el.style.outline;
    el.style.outline = '3px dashed #ffc107';
    el.style.outlineOffset = '6px';
    clearTimeout(resaltadoTimer);
    resaltadoTimer = setTimeout(function () { el.style.outline = previo; }, 2600);
  }

  window.addEventListener('message', function (e) {
    // Solo el contenedor habla con el runtime.
    if (e.source !== parent) return;
    var d = e.data || {};
    if (d.tipo === 'gesicomm:resaltar') { resaltar(d.lista); return; }
    if (d.tipo !== 'gesicomm:catalogo-respuesta' || d.id !== pedidoCatalogo) return;
    catalogoVista.cargando = false;
    if (d.error) {
      toast('No se pudo cargar el catálogo. Probá de nuevo.');
      pintarControlesCatalogo();
      return;
    }
    var nuevos = Array.isArray(d.productos) ? d.productos : [];
    recordar(nuevos);
    catalogoVista.items = d.modo === 'agregar' ? catalogoVista.items.concat(nuevos) : nuevos;
    catalogoVista.pagina = d.pagina || filtros.pagina;
    catalogoVista.totalPaginas = d.totalPaginas || 1;
    catalogoVista.total = d.total != null ? d.total : catalogoVista.items.length;
    if (Array.isArray(d.categorias) && d.categorias.length) catalogoVista.categorias = d.categorias;
    repintarCatalogo();
  });

  var temporizadorBusqueda = null;
  document.addEventListener('input', function (e) {
    var campo = e.target && e.target.closest ? e.target.closest('[data-gesicomm-buscar]') : null;
    if (!campo) return;
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(function () {
      filtros.busqueda = String(campo.value || '').slice(0, 80);
      filtros.pagina = 1;
      actualizarCatalogo('reemplazar');
    }, 350);
  });

  document.addEventListener('change', function (e) {
    // Order bump: marcar la casilla lo deja listo para sumarse al comprar.
    var bump = e.target && e.target.matches && e.target.matches('input[data-gesicomm-bump]') ? e.target : null;
    if (bump) {
      var cont = bump.closest('[data-gesicomm-oferta-id]');
      var idBump = cont ? cont.getAttribute('data-gesicomm-oferta-id') : null;
      if (!idBump) return;
      if (bump.checked) bumpsElegidos[idBump] = true; else delete bumpsElegidos[idBump];
      cont.classList.toggle('is-checked', bump.checked);
      if (bump.checked) toast('Listo: se suma cuando toques Comprar');
      enviar({ tipo: 'gesicomm:evento', nombre: bump.checked ? 'OrderBumpMarcado' : 'OrderBumpDesmarcado', datos: { oferta: idBump } });
      return;
    }
    var sel = e.target && e.target.closest ? e.target.closest('[data-gesicomm-filtro]') : null;
    if (!sel) return;
    var campo = sel.getAttribute('data-gesicomm-filtro');
    if (campo !== 'categoria' && campo !== 'orden') return;
    filtros[campo] = String(sel.value || '');
    filtros.pagina = 1;
    actualizarCatalogo('reemplazar');
  });

  function irAlCatalogo() {
    var lista = document.querySelector('[data-gesicomm-lista="catalogo"]');
    if (lista && lista.scrollIntoView) lista.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ─── Acciones ─────────────────────────────────────────────────────────
  function itemDeContexto(el, valorAtributo) {
    if (valorAtributo) return buscar(valorAtributo);
    var cont = el.closest('[data-gesicomm-item]');
    if (cont) return buscar(cont.getAttribute('data-gesicomm-item'));
    return productoActual;
  }

  function cantidadElegida(el) {
    var attr = parseInt(el.getAttribute('data-gesicomm-cantidad'), 10);
    if (attr > 0) return attr;
    var input = document.querySelector('[data-gesicomm-cantidad-input]');
    var n = input ? parseInt(input.value, 10) : 1;
    return n > 0 ? Math.min(n, 99) : 1;
  }

  function comprar(item, opciones) {
    opciones = opciones || {};
    if (!item) { toast('Este producto ya no está disponible.'); return; }
    if (item.agotado) { toast('Sin stock por ahora.'); return; }
    var variante = opciones.variante || null;
    // tiene_variantes: los productos de una página pedida al servidor vienen
    // livianos, sin la lista de variantes — solo el aviso de que existen.
    var tieneVariantes = (item.variantes && item.variantes.length > 0) || !!item.tiene_variantes;
    if (tieneVariantes && !variante && !opciones.oferta) {
      // Desde una grilla no hay dónde elegir talle/color: se lleva a la
      // ficha, igual que el catálogo de los templates.
      if (!productoActual || productoActual.id !== item.id) { verProducto(item); return; }
      toast('Elegí una opción antes de comprar.');
      var lista = document.querySelector('[data-gesicomm-lista="variantes"]');
      if (lista && lista.scrollIntoView) lista.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // Order bumps marcados en esta ficha: van al carrito junto con el
    // producto, antes de abrirlo, así el carrito ya los muestra.
    var bumps = [];
    if (!opciones.oferta && productoActual && item.id === productoActual.id) {
      (productoActual.ofertas || []).forEach(function (o) { if (bumpsElegidos[o.id]) bumps.push(o); });
    }
    bumps.forEach(function (o) {
      enviar({ tipo: 'gesicomm:checkout', producto: item.id, cantidad: 1, variante: null, oferta: o.id, abrir: false });
    });
    enviar({
      tipo: 'gesicomm:checkout',
      producto: item.id,
      cantidad: opciones.cantidad || 1,
      variante: variante ? variante.id : null,
      oferta: opciones.oferta ? opciones.oferta.id : null,
      abrir: opciones.abrir !== false,
    });
    if (opciones.abrir === false) toast(bumps.length ? 'Agregado al carrito, con tu oferta' : 'Agregado al carrito');
  }

  function verProducto(item) {
    if (!item) return;
    enviar({ tipo: 'gesicomm:navegar', destino: 'producto', producto: item.id });
  }

  function elegirVariante(id) {
    if (!productoActual) return;
    var vs = productoActual.variantes || [];
    for (var i = 0; i < vs.length; i++) if (String(vs[i].id) === String(id)) varianteElegida = vs[i];
    // renderizar() repinta los botones con la marca de elegida y el precio
    // de la variante en los binds sueltos de la ficha.
    renderizar();
  }

  function whatsapp(texto) {
    var numero = String((datos.tienda && datos.tienda.whatsapp) || '').replace(/\D/g, '');
    enviar({ tipo: 'gesicomm:evento', nombre: 'Contact', datos: { canal: 'whatsapp' } });
    if (!numero) { toast('La tienda todavía no cargó su WhatsApp.'); return; }
    window.open('https://wa.me/' + numero + (texto ? '?text=' + encodeURIComponent(texto) : ''), '_blank', 'noopener');
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var el;

    // El documento tiene <base target="_top"> (para que un link externo no
    // meta la web dentro de sí misma), así que un href="#productos" navegaría
    // la ventana de afuera en vez de scrollear acá adentro.
    var ancla = t.closest('a[href^="#"]');
    if (ancla && !ancla.hasAttribute('data-gesicomm-ver') && !ancla.hasAttribute('data-gesicomm-comprar')) {
      var hash = ancla.getAttribute('href');
      e.preventDefault();
      if (hash.length > 1) {
        var destino = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Sin return: el mismo link puede tener además un data-gesicomm-evento.
    }

    if ((el = t.closest('[data-gesicomm-link]'))) {
      var paginaTienda = paginaDeEnlace(el);
      if (paginaTienda) {
        // Navega el contenedor (sin recargar la app); en el preview del
        // editor, avisa qué página abriría en vez de sacarte del editor.
        e.preventDefault();
        enviar({ tipo: 'gesicomm:navegar', destino: 'pagina', pagina: paginaTienda });
        return;
      }
    }
    if ((el = t.closest('[data-gesicomm-pagina]'))) {
      e.preventDefault();
      if (catalogoVista.cargando) return;
      var destinoPagina = filtros.pagina + (el.getAttribute('data-gesicomm-pagina') === 'anterior' ? -1 : 1);
      if (destinoPagina < 1 || destinoPagina > catalogoVista.totalPaginas) return;
      filtros.pagina = destinoPagina;
      actualizarCatalogo('reemplazar');
      irAlCatalogo();
      return;
    }
    if ((el = t.closest('[data-gesicomm-cargar-mas]'))) {
      e.preventDefault();
      if (catalogoVista.cargando || filtros.pagina >= catalogoVista.totalPaginas) return;
      filtros.pagina += 1;
      pedirPagina('agregar');
      return;
    }
    if ((el = t.closest('[data-gesicomm-checkout]'))) {
      e.preventDefault();
      var crudo = el.getAttribute('data-gesicomm-checkout');
      var encontrado = buscar(crudo);
      if (encontrado) {
        comprar(encontrado, { cantidad: cantidadElegida(el), variante: varianteElegida });
      } else {
        // Sin datos inyectados (Page Builder) el contenedor resuelve el id
        // contra su propio catálogo, como hacía el puente original.
        enviar({ tipo: 'gesicomm:checkout', producto: String(crudo || ''), cantidad: cantidadElegida(el), abrir: true });
      }
      return;
    }
    if ((el = t.closest('[data-gesicomm-oferta-id]')) && t.closest('[data-gesicomm-oferta]')) {
      e.preventDefault();
      var ofertaId = el.getAttribute('data-gesicomm-oferta-id');
      var oferta = null;
      (productoActual && productoActual.ofertas || []).forEach(function (o) { if (String(o.id) === ofertaId) oferta = o; });
      comprar(productoActual, { oferta: oferta, variante: varianteElegida });
      return;
    }
    if ((el = t.closest('[data-gesicomm-variante-id]'))) {
      e.preventDefault();
      if (el.hasAttribute('data-agotado')) { toast('Esa opción no tiene stock.'); return; }
      elegirVariante(el.getAttribute('data-gesicomm-variante-id'));
      return;
    }
    if ((el = t.closest('[data-gesicomm-comprar]'))) {
      e.preventDefault();
      comprar(itemDeContexto(el, el.getAttribute('data-gesicomm-comprar')), { cantidad: cantidadElegida(el), variante: varianteElegida });
      return;
    }
    if ((el = t.closest('[data-gesicomm-agregar]'))) {
      e.preventDefault();
      comprar(itemDeContexto(el, el.getAttribute('data-gesicomm-agregar')), { cantidad: cantidadElegida(el), variante: varianteElegida, abrir: false });
      return;
    }
    if ((el = t.closest('[data-gesicomm-ver]'))) {
      e.preventDefault();
      verProducto(itemDeContexto(el, el.getAttribute('data-gesicomm-ver')));
      return;
    }
    if ((el = t.closest('[data-gesicomm-inicio]'))) {
      e.preventDefault();
      enviar({ tipo: 'gesicomm:navegar', destino: 'inicio' });
      return;
    }
    if ((el = t.closest('[data-gesicomm-imagen-idx]'))) {
      // Galería: el clic en una miniatura cambia la imagen principal.
      var principal = document.querySelector('[data-gesicomm-imagen-principal]');
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (principal && img && img.src) principal.src = img.src;
    }
    if ((el = t.closest('[data-gesicomm-whatsapp]'))) {
      e.preventDefault();
      var texto = el.getAttribute('data-gesicomm-whatsapp');
      if (!texto && productoActual) texto = 'Hola! Quiero consultar por ' + productoActual.nombre;
      whatsapp(texto);
      return;
    }
    if ((el = t.closest('[data-gesicomm-evento]'))) {
      enviar({ tipo: 'gesicomm:evento', nombre: el.getAttribute('data-gesicomm-evento'), datos: { producto: productoActual ? productoActual.id : null } });
    }
  });

  document.addEventListener('submit', function (e) {
    // Un buscador dentro de un <form>: Enter no tiene que recargar nada.
    if (e.target && e.target.querySelector && e.target.querySelector('[data-gesicomm-buscar]')) {
      e.preventDefault();
      return;
    }
    var form = e.target && e.target.closest ? e.target.closest('form[data-gesicomm-form]') : null;
    if (!form) return;
    e.preventDefault();
    var campos = {};
    var inputs = form.querySelectorAll('input[name], textarea[name], select[name]');
    for (var i = 0; i < inputs.length; i++) campos[inputs[i].name] = String(inputs[i].value || '').slice(0, 500);
    enviar({ tipo: 'gesicomm:evento', nombre: 'Lead', datos: { formulario: form.getAttribute('data-gesicomm-form') } });
    var lineas = ['Hola! Te escribo desde la web.'];
    if (campos.nombre || campos.name) lineas.push('Nombre: ' + (campos.nombre || campos.name));
    if (campos.telefono) lineas.push('Teléfono: ' + campos.telefono);
    if (campos.email) lineas.push('Email: ' + campos.email);
    if (productoActual) lineas.push('Producto: ' + productoActual.nombre);
    if (campos.mensaje || campos.message) lineas.push(campos.mensaje || campos.message);
    whatsapp(lineas.join('\n'));
    var ok = form.querySelector('[data-gesicomm-form-ok]');
    if (ok) ok.style.display = '';
    form.reset();
  });

  window.Gesicomm = {
    datos: datos,
    vista: datos.vista || 'inicio',
    tienda: datos.tienda || {},
    productos: productos,
    catalogo: catalogoVista,
    producto: productoActual,
    recomendados: datos.recomendados || [],
    formatoPrecio: formatoPrecio,
    buscar: buscar,
    comprar: function (id, opciones) { comprar(typeof id === 'object' ? id : buscar(id), opciones); },
    agregar: function (id, opciones) { var o = opciones || {}; o.abrir = false; comprar(typeof id === 'object' ? id : buscar(id), o); },
    verProducto: function (id) { verProducto(typeof id === 'object' ? id : buscar(id)); },
    irInicio: function () { enviar({ tipo: 'gesicomm:navegar', destino: 'inicio' }); },
    elegirVariante: elegirVariante,
    whatsapp: whatsapp,
    evento: function (nombre, extra) { enviar({ tipo: 'gesicomm:evento', nombre: String(nombre || ''), datos: extra || {} }); },
    renderizar: renderizar,
    toast: toast,
  };

  if (!paginado) aplicarLocal();
  renderizar();
  prepararEnlacesTienda();
  // Catálogo grande: se pide la página 1 con el formato del servidor para
  // tener el total, las páginas y las categorías de TODO el catálogo (la
  // respuesta inicial solo trae los primeros productos).
  if (paginado && document.querySelector('[data-gesicomm-lista="catalogo"]')) pedirPagina('reemplazar');
  // Vista previa del paso de venta: la zona a mostrar viene en los datos,
  // así se aplica aunque el iframe se haya recargado después del pedido.
  if (datos.resaltar) setTimeout(function () { resaltar(datos.resaltar); }, 350);
}
