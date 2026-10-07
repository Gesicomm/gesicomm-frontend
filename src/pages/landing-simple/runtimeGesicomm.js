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
 *   data-gesicomm-lista="catalogo|categorias|productos|productos_destacados|productos_manual|
 *                        productos_ofertas|productos_novedades|combos|recomendados|ofertas|
 *                        variantes|imagenes"
 *     "productos_ofertas": productos con descuento activo (precio_antes > precio) — vitrina de
 *     "Ofertas" real, respaldada por datos. "productos_novedades": productos ordenados del más
 *     reciente al más antiguo (LandingItem.created_at). "productos_manual": el comercio elige
 *     EXACTAMENTE cuáles van (panel "Secciones" del editor), vía data-gesicomm-productos-curados
 *     en el propio elemento de la lista. NO existe (todavía) ningún "más vendidos" calculado:
 *     el sistema no tiene módulo de Pedidos/Checkout que cuente ventas — por eso esa vitrina en
 *     la plantilla base usa "productos_manual": el comercio carga a mano lo que sabe que vende.
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
 *   data-gesicomm-total            total en vivo de la ficha (producto × cantidad + bumps marcados)
 *   data-gesicomm-whatsapp[="texto"] abre el WhatsApp de la tienda
 *   data-gesicomm-redes            links a las redes de la tienda (Mi Tienda); se oculta sin ninguna
 *   data-gesicomm-evento="Nombre"  registra un evento de tracking propio
 *   <form data-gesicomm-form="contacto"> consulta → WhatsApp + evento Lead
 *   data-gesicomm-link="contacto|catalogo|politica-privacidad|politica-reembolso|
 *                       terminos-servicio|politica-envio|aviso-legal"  páginas de la tienda
 *     (un href="/contacto" a secas también se reconoce y se corrige)
 *   data-gesicomm-checkout="producto:ID" — formato viejo, sigue andando
 *   data-gesicomm-lista="estadisticas"  prueba social cuantitativa (binds "valor"/"etiqueta"),
 *                                       fuente: venta.prueba_social.items (Configurar venta)
 *   data-gesicomm-countdown            envuelve la cuenta regresiva de una oferta; adentro,
 *     data-gesicomm-countdown-parte="horas|minutos|segundos" recibe el número ya calculado.
 *     Fuente: venta.urgencia (activo + fin_at, cargados en Configurar venta). Si no está
 *     activo o fin_at ya pasó, el bloque se oculta solo — mismo criterio que una lista vacía.
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
  var porPagina = metaCatalogo.por_pagina || metaCatalogo.porPagina || 20;
  var filtros = { busqueda: '', categoria: datos.categoria && datos.categoria.nombre ? datos.categoria.nombre : '', marca: '', etiqueta: '', precioMin: '', precioMax: '', disponibilidad: 'todos', soloDescuento: '', orden: '', pagina: 1 };
  try {
    var paramsIniciales = new URLSearchParams(window.location.search || '');
    if (paramsIniciales.get('etiqueta')) filtros.etiqueta = paramsIniciales.get('etiqueta');
    if (paramsIniciales.get('badge')) filtros.etiqueta = paramsIniciales.get('badge');
    if (paramsIniciales.get('categoria')) filtros.categoria = paramsIniciales.get('categoria');
    if (paramsIniciales.get('busqueda')) filtros.busqueda = paramsIniciales.get('busqueda');
  } catch (e) { /* URLSearchParams no disponible: usa los filtros por defecto */ }
  var catalogoVista = {
    items: productos.slice(),
    pagina: 1,
    totalPaginas: 1,
    total: metaCatalogo.total || productos.length,
    categorias: [],
    marcas: [],
    etiquetas: [],
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
  var PAGINAS_TIENDA = ['contacto', 'catalogo', 'checkout', 'politica-privacidad', 'politica-reembolso', 'terminos-servicio', 'politica-envio', 'aviso-legal'];
  // Solo rutas internas: un link a otro dominio que termine en /contacto es de ese sitio.
  var RUTA_PAGINA = /^\/?(?:l\/[^/?#]+\/)?(contacto|catalogo|checkout|politica-privacidad|politica-reembolso|terminos-servicio|politica-envio|aviso-legal)\/?(?:[?#].*)?$/i;
  var RUTA_CATEGORIA = /^\/?(?:l\/[^/?#]+\/)?categoria\/([^/?#]+)\/?(?:[?#].*)?$/i;
  var paginasTienda = datos.paginas || {};

  function paginaDeEnlace(a) {
    var explicita = a.getAttribute('data-gesicomm-link');
    if (explicita && PAGINAS_TIENDA.indexOf(explicita) !== -1) return explicita;
    var href = a.getAttribute('href') || '';
    var m = href.match(RUTA_PAGINA);
    return m ? m[1].toLowerCase() : null;
  }

  function categoriaDesdeSlug(slug) {
    var buscado = normalizar(String(slug || '').replace(/-/g, ' '));
    var fuente = (catalogoVista.categorias && catalogoVista.categorias.length ? catalogoVista.categorias : productos.map(function (p) { return p.categoria; }));
    for (var i = 0; i < fuente.length; i++) {
      var cat = String(fuente[i] || '').trim();
      if (!cat) continue;
      var slugCat = normalizar(cat).trim().replace(/[^a-z0-9]+/g, ' ').trim();
      if (slugCat === buscado) return cat;
    }
    return String(slug || '').replace(/-/g, ' ');
  }

  function categoriaDeEnlace(a) {
    var href = a && a.getAttribute ? (a.getAttribute('href') || '') : '';
    var m = href.match(RUTA_CATEGORIA);
    return m ? categoriaDesdeSlug(decodeURIComponent(m[1])) : null;
  }

  function prepararEnlacesTienda() {
    var enlaces = document.querySelectorAll('a[href], [data-gesicomm-link]');
    for (var i = 0; i < enlaces.length; i++) {
      var pagina = paginaDeEnlace(enlaces[i]);
      if (!pagina) continue;
      enlaces[i].setAttribute('data-gesicomm-link', pagina);
      if (enlaces[i].tagName === 'A' && paginasTienda[pagina]) {
        var original = enlaces[i].getAttribute('href') || '';
        var extra = '';
        var queryIdx = original.indexOf('?');
        var hashIdx = original.indexOf('#');
        if (queryIdx >= 0) extra = original.slice(queryIdx);
        else if (hashIdx >= 0) extra = original.slice(hashIdx);
        enlaces[i].setAttribute('href', paginasTienda[pagina] + extra);
      }
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

  function aplicarPlantillaWhatsapp(plantilla, item) {
    var msg = String(plantilla || '');
    var producto = item || productoActual || productos[0] || null;
    var precio = producto ? precioDe(producto, varianteElegida) : null;
    msg = msg.replace(/\{producto\}/gi, producto && producto.nombre ? producto.nombre : 'este producto');
    msg = msg.replace(/\{precio\}/gi, precio ? formatoPrecio(precio) : '');
    msg = msg.replace(/\{url\}/gi, window.location.href);
    return msg.replace(/[ \t]+\n/g, '\n').trim();
  }

  function mensajeWhatsapp(texto) {
    var tienda = datos.tienda || {};
    var plantilla = texto || tienda.mensaje || (productoActual ? 'Hola, me interesa {producto}' : 'Hola, quiero hacer una consulta.');
    var msg = aplicarPlantillaWhatsapp(plantilla, productoActual);
    var tienePrecioInline = /\{precio\}/i.test(plantilla);
    var tieneUrlInline = /\{url\}/i.test(plantilla);
    if (tienda.incluir_precio && productoActual && !tienePrecioInline) {
      var precio = precioDe(productoActual, varianteElegida);
      if (precio) msg += '\nPrecio: ' + formatoPrecio(precio);
    }
    if (tienda.incluir_url && !tieneUrlInline) msg += '\n' + window.location.href;
    return msg;
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

  function productosDestacados() {
    var ids = datos.venta && Array.isArray(datos.venta.destacados) ? datos.venta.destacados : [];
    var visiblesInicio = productos.filter(function (p) { return p.mostrar_en_inicio !== false; });
    if (!ids.length) return visiblesInicio.slice(0, 4);
    var salida = [];
    for (var i = 0; i < ids.length; i++) {
      var item = buscar(ids[i]);
      if (item && item.mostrar_en_inicio !== false && salida.indexOf(item) === -1) salida.push(item);
    }
    return salida.length ? salida : visiblesInicio.slice(0, 4);
  }

  function productosOfertaLimitada() {
    var base = productos.filter(function (p) {
      return p.mostrar_en_inicio !== false && Number(p.descuento_pct) > 0;
    });
    var ids = datos.venta && datos.venta.urgencia && Array.isArray(datos.venta.urgencia.productos)
      ? datos.venta.urgencia.productos
      : [];
    if (!ids.length) return base;
    var salida = [];
    for (var i = 0; i < ids.length; i++) {
      var item = buscar(ids[i]);
      if (item && item.mostrar_en_inicio !== false && Number(item.descuento_pct) > 0 && salida.indexOf(item) === -1) salida.push(item);
    }
    return salida;
  }

  // Vitrina "elegida a mano" (panel "Secciones" del editor, ver
  // plantillaInicioEditor.js): data-gesicomm-productos-curados en el propio
  // elemento de la lista, JSON [{id, nombre}] — el runtime solo usa "id"
  // (resuelve el producto REAL con buscar(), nunca confía en "nombre",
  // que es apenas para que el editor muestre algo sin tener que re-pedir
  // el catálogo). Sirve para que el comercio arme vitrinas como "Más
  // vendidos" a mano: hoy no hay módulo de Pedidos que pueda calcularla sola.
  function productosCuradosDe(el) {
    var raw = el && el.getAttribute && el.getAttribute('data-gesicomm-productos-curados');
    if (!raw) return [];
    var curados;
    try { curados = JSON.parse(raw); } catch (e) { return []; }
    if (!Array.isArray(curados)) return [];
    var salida = [];
    for (var i = 0; i < curados.length; i++) {
      var item = buscar(curados[i] && curados[i].id);
      if (item && item.mostrar_en_inicio !== false && salida.indexOf(item) === -1) salida.push(item);
    }
    return salida;
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
    return /^(https?:)?\/\//i.test(s) || s.charAt(0) === '/' || s.charAt(0) === '#' ? s : '';
  }

  function precioDe(item, variante) {
    if (variante && Number(variante.precio_efectivo) > 0) return variante.precio_efectivo;
    return item.precio;
  }

  // Total de la compra de la ficha: producto (con variante y cantidad) + los
  // order bumps marcados. Lo muestran los elementos data-gesicomm-total (ej.
  // dentro del botón: "Comprar ahora · Gs 160.000"), así marcar la oferta
  // da una confirmación inmediata de que se sumó.
  // ─── Paquetes por cantidad ("Elegí tu oferta") ─────────────────────
  // Cuando la ficha tiene la lista "paquetes", elegir el paquete ES elegir
  // la cantidad: 1 unidad / Pack x2 / Pack x3, una sola decisión y un solo
  // botón. paqueteElegido: null = 1 unidad; si no, el id de la oferta.
  var paqueteElegido;
  function paquetesDelProducto() {
    return (productoActual && productoActual.ofertas || []).filter(function (o) { return o.estrategia === 'normal'; });
  }
  function hayPaquetes() {
    return paquetesDelProducto().length > 0 && !!document.querySelector('[data-gesicomm-lista="paquetes"]');
  }
  function opcionesDePaquete() {
    if (!productoActual) return [];
    var unidad = Number(precioDe(productoActual, varianteElegida)) || 0;
    var paquetes = paquetesDelProducto().slice().sort(function (a, b) { return (Number(a.unidades) || 99) - (Number(b.unidades) || 99); });
    // Etiquetas y paquete destacado: los elige el comercio en Configurar
    // venta (venta.paquetes). Sin nada configurado, solo "Mayor ahorro"
    // (se calcula); un "Más elegido" nunca se inventa.
    var conf = (datos.venta && datos.venta.paquetes) || {};
    var imagen = productoActual.imagen || '';
    var opciones = [{ id: 'unidad', titulo: '1 unidad', unidades: 1, unidades_texto: 'x1', imagen: imagen, precio_efectivo: unidad, precio_antes: null, por_unidad: null, ahorro: 0, ahorro_pct: '' }];
    var hayEtiquetas = false;
    var destacado = null;
    paquetes.forEach(function (o) {
      var u = Number(o.unidades) || 0;
      var precio = Number(o.precio_efectivo) || 0;
      var sueltas = u > 1 ? u * unidad : 0;
      var ahorro = sueltas > precio ? sueltas - precio : 0;
      var c = conf[o.id] || conf[String(o.id)] || {};
      if (c.etiqueta) hayEtiquetas = true;
      var op = {
        id: String(o.id),
        titulo: u > 1 ? 'Pack x' + u : (o.nombre || 'Paquete'),
        unidades: u || null,
        unidades_texto: u > 1 ? 'x' + u : '',
        imagen: o.imagen || imagen,
        precio_efectivo: precio,
        precio_antes: ahorro ? sueltas : null,
        por_unidad: u > 1 ? Math.round(precio / u) : null,
        ahorro: ahorro,
        ahorro_pct: ahorro ? Math.round((ahorro / sueltas) * 100) + '% OFF' : '',
        etiqueta: c.etiqueta || '',
        destacado: c.destacado === true,
        oferta: o,
      };
      if (op.destacado && !destacado) destacado = op;
      opciones.push(op);
    });
    if (!hayEtiquetas && opciones.length > 2) {
      var mejor = null;
      opciones.forEach(function (op) { if (op.ahorro > 0 && (!mejor || op.ahorro > mejor.ahorro)) mejor = op; });
      if (mejor) mejor.etiqueta = 'Mayor ahorro';
    }
    if (paqueteElegido === undefined) {
      // Arranca en el destacado; si no hay, en el primer paquete.
      paqueteElegido = destacado ? destacado.id : (opciones[1] ? opciones[1].id : null);
    }
    return opciones;
  }
  function paqueteActual() {
    if (!hayPaquetes() || !paqueteElegido || paqueteElegido === 'unidad') return null;
    var p = null;
    paquetesDelProducto().forEach(function (o) { if (String(o.id) === String(paqueteElegido)) p = o; });
    return p;
  }

  // El precio grande de la ficha tiene que seguir al paquete elegido. Antes
  // solo se actualizaba el total del botón, así que la página mostraba
  // "Gs 169.000" arriba y "Comprar ahora · Gs 250.000" abajo: el cliente lo
  // lee como un error y desconfía. Solo toca los binds SUELTOS (los de
  // adentro de una lista son de esa lista y los pinta ella).
  function pintarPrecioElegido() {
    if (!productoActual || !hayPaquetes()) return;
    var paquete = paqueteActual();
    var valores = {
      precio: formatoPrecio(paquete ? paquete.precio_efectivo : precioDe(productoActual, varianteElegida)),
      precio_antes: paquete ? formatoPrecio(paquete.precio_antes) : '',
      por_unidad: paquete && Number(paquete.por_unidad) > 0 ? formatoPrecio(paquete.por_unidad) + ' c/u' : '',
    };
    for (var campo in valores) {
      if (!Object.prototype.hasOwnProperty.call(valores, campo)) continue;
      var els = document.querySelectorAll('[data-gesicomm-bind="' + campo + '"]');
      for (var i = 0; i < els.length; i++) {
        if (els[i].closest('[data-gesicomm-lista]')) continue;
        els[i].textContent = valores[campo];
        // Sin valor (1 unidad no tiene "antes") el elemento estorba.
        els[i].style.display = valores[campo] ? '' : 'none';
      }
    }
  }

  function pintarTotal() {
    var destinos = document.querySelectorAll('[data-gesicomm-total]');
    if (!destinos.length || !productoActual) return;
    var input = document.querySelector('[data-gesicomm-cantidad-input]');
    var n = input && !hayPaquetes() ? parseInt(input.value, 10) : 1;
    var paquete = paqueteActual();
    var total = paquete
      ? (Number(paquete.precio_efectivo) || 0)
      : (Number(precioDe(productoActual, varianteElegida)) || 0) * (n > 0 ? Math.min(n, 99) : 1);
    var sumados = 0;
    (productoActual.ofertas || []).forEach(function (o) {
      if (bumpsElegidos[o.id]) { total += Number(o.precio_efectivo) || 0; sumados++; }
    });
    for (var i = 0; i < destinos.length; i++) destinos[i].textContent = formatoPrecio(total);
    // El texto del botón nombra TODO lo que se compra: "Comprar Pack x2 + 1
    // oferta". Antes decía solo el paquete y el total incluía además los
    // order bumps marcados, así que el precio de arriba (Gs 250.000) y el
    // del botón (Gs 370.000) no coincidían y no había forma de saber por qué.
    var ctas = document.querySelectorAll('[data-gesicomm-cta]');
    for (var j = 0; j < ctas.length; j++) {
      var original = (productoActual && productoActual.cta_texto) || ctas[j].getAttribute('data-gesicomm-cta-original') || ctas[j].textContent || 'Comprar con pago anticipado';
      ctas[j].setAttribute('data-gesicomm-cta-original', original);
      var titulo = null;
      if (paquete) opcionesDePaquete().forEach(function (op) { if (String(op.id) === String(paquete.id)) titulo = op.titulo; });
      var texto = titulo ? 'Comprar ' + titulo : original;
      if (sumados) texto += ' + ' + sumados + (sumados === 1 ? ' oferta' : ' ofertas');
      ctas[j].textContent = texto;
    }
    pintarPrecioElegido();
  }

  function aplicarBind(el, item, extra) {
    var campo = el.getAttribute('data-gesicomm-bind');
    var valor = null;
    var variante = extra && extra.variante;
    switch (campo) {
      case 'nombre': valor = item.titulo_comercial || item.nombre; break;
      case 'descripcion': valor = item.mensaje_comercial || item.descripcion; break;
      case 'insignia_principal': valor = item.insignia_principal || item.categoria || ''; break;
      case 'resenas_texto': valor = item.resenas_texto || 'Sin reseñas todavía'; break;
      case 'cta_texto': valor = item.cta_texto || 'Comprar ahora'; break;
      case 'agregar_carrito_texto': valor = item.agregar_carrito_texto || 'Agregar al carrito'; break;
      case 'beneficios_kicker': valor = item.beneficios_kicker || 'Por qué elegirlo'; break;
      case 'beneficios_titulo': valor = item.beneficios_titulo || 'Lo que vas a notar.'; break;
      case 'beneficios_subtitulo': valor = item.beneficios_subtitulo || ''; break;
      case 'urgencia_kicker': valor = item.urgencia_kicker || 'Oferta por tiempo limitado'; break;
      case 'urgencia_titulo': valor = item.urgencia_titulo || 'Reservá esta condición antes de que termine.'; break;
      case 'urgencia_texto': valor = item.urgencia_texto || 'La fecha real se configura en Gesicomm; el contador se actualiza solo.'; break;
      case 'urgencia_horas': valor = item.urgencia_horas || '1'; break;
      case 'urgencia_minutos': valor = item.urgencia_minutos || '59'; break;
      case 'urgencia_segundos': valor = item.urgencia_segundos || '58'; break;
      case 'opiniones_kicker': valor = item.opiniones_kicker || 'Opiniones'; break;
      case 'opiniones_titulo': valor = item.opiniones_titulo || 'Personas que ya lo probaron.'; break;
      case 'opiniones_subtitulo': valor = item.opiniones_subtitulo || ''; break;
      case 'preguntas_kicker': valor = item.preguntas_kicker || 'Resolvemos tus dudas'; break;
      case 'preguntas_titulo': valor = item.preguntas_titulo || 'Preguntas frecuentes'; break;
      case 'preguntas_subtitulo': valor = item.preguntas_subtitulo || ''; break;
      case 'precio': valor = formatoPrecio(item.precio_efectivo !== undefined ? item.precio_efectivo : precioDe(item, variante)); break;
      case 'precio_unitario': valor = formatoPrecio(item.precio_unitario); break;
      case 'subtotal': valor = formatoPrecio(item.subtotal); break;
      case 'precio_antes': valor = formatoPrecio(item.precio_antes || item.precio_normal); break;
      case 'precio_separado': valor = formatoPrecio(item.precio_separado); break;
      case 'por_unidad': valor = Number(item.por_unidad) > 0 ? formatoPrecio(item.por_unidad) + ' c/u' : ''; break;
      case 'descuento': valor = item.insignia_principal || item.insignia_secundaria || (Number(item.descuento_pct) > 0 ? '-' + item.descuento_pct + '%' : ''); break;
      case 'ahorro': valor = Number(item.ahorro) > 0 ? 'Ahorrás ' + formatoPrecio(item.ahorro) : ''; break;
      // Cómo se ve más grande el mismo ahorro ("regla del 100", J. Berger):
      // en productos baratos el %, en caros el monto. Umbral ≈ USD 100.
      case 'ahorro_texto':
        valor = !(Number(item.ahorro) > 0) ? ''
          : (Number(item.precio_antes || 0) < 750000 && Number(item.descuento_pct) > 0
            ? 'Ahorrás ' + item.descuento_pct + '%'
            : 'Ahorrás ' + formatoPrecio(item.ahorro));
        break;
      case 'stock': valor = item.stock === null || item.stock === undefined ? '' : String(item.stock); break;
      case 'incluye': valor = Array.isArray(item.productos_incluidos) ? item.productos_incluidos.join(', ') : ''; break;
      case 'imagen': valor = item.imagen || item.url_imagen || ''; break;
      case 'video': valor = item.video || item.video_url || (item.tipo_medio === 'video' ? item.imagen : ''); break;
      case 'url': valor = item.url || ''; break;
      case 'categoria_url': valor = item.categoria_url || ''; break;
      case 'enlace': valor = item.enlace || item.url || ''; break;
      default: valor = item[campo];
    }
    var vacio = valor === null || valor === undefined || valor === '';

    if (campo === 'imagen') {
      var src = urlSegura(valor);
      if (el.tagName === 'IMG') {
        if (item.tipo_medio === 'video') { el.style.display = 'none'; return; }
        if (src) { el.src = src; if (!el.alt) el.alt = item.nombre || ''; }
        else el.style.display = 'none';
      } else if (src) {
        el.style.backgroundImage = 'url("' + src.replace(/"/g, '%22') + '")';
      }
      return;
    }
    if (campo === 'video') {
      var videoSrc = urlSegura(valor);
      if (el.tagName === 'VIDEO') {
        if (videoSrc && item.tipo_medio === 'video') {
          el.src = videoSrc;
          el.style.display = '';
          el.muted = true;
          el.setAttribute('muted', '');
          el.setAttribute('playsinline', '');
          var p = el.play && el.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          el.style.display = 'none';
        }
      }
      return;
    }
    if (campo === 'url' || campo === 'enlace' || campo === 'categoria_url') {
      if (el.tagName === 'A' && urlSegura(valor)) el.setAttribute('href', valor);
      if (campo === 'url' && item.id && !el.hasAttribute('data-gesicomm-ver') && !el.closest('.payment-actions, .contact-actions')) el.setAttribute('data-gesicomm-ver', item.id || '');
      return;
    }
    if (campo === 'icono') {
      var iconoTexto = String(valor || '').trim();
      el.textContent = '';
      if (!iconoTexto) { el.style.display = 'none'; return; }
      el.style.display = '';
      if (/^(fa[srbld]?\s|fa-)/i.test(iconoTexto) && /^[a-z0-9_\-\s]+$/i.test(iconoTexto)) {
        var icono = document.createElement('i');
        icono.className = iconoTexto;
        icono.setAttribute('aria-hidden', 'true');
        el.appendChild(icono);
      } else {
        el.textContent = iconoTexto;
      }
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

  function imagenesDeProducto(item) {
    var imgs = [];
    function agregar(url) {
      var segura = urlSegura(url);
      if (segura && imgs.indexOf(segura) === -1) imgs.push(segura);
    }
    agregar(item && (item.imagen || item.url_imagen));
    var galeria = item && item.imagenes_url;
    if (Array.isArray(galeria)) {
      for (var i = 0; i < galeria.length; i++) agregar(galeria[i]);
    }
    return imgs;
  }

  function productoAplicaUrgencia(item, config) {
    if (!item || !config || !config.activo) return false;
    var ids = Array.isArray(config.productos) ? config.productos : [];
    if (ids.length) {
      for (var i = 0; i < ids.length; i++) {
        if (String(item.id) === String(ids[i]) || String(item.content_id || '') === String(ids[i])) return true;
      }
      return false;
    }
    var id = config.producto_id || config.content_id;
    if (!id) return true;
    return String(item.id) === String(id) || String(item.content_id || '') === String(id);
  }

  function prepararTarjetaProducto(raiz, item) {
    if (!raiz || !item) return;
    var contenido = raiz.querySelector('.product-content, .limited-offer-copy, .hero-card-copy');
    if (item.titulo_comercial || item.mensaje_comercial || item.insignia_principal || item.insignia_secundaria || item.cta_texto) {
      raiz.classList.add('has-commercial-presentation');
    }
    raiz.querySelectorAll('[data-gesicomm-bind="etiqueta"], .product-category').forEach(function (el) { el.style.setProperty('display', 'none', 'important'); });
    if (item.titulo_comercial) raiz.querySelectorAll('[data-gesicomm-bind="nombre"]').forEach(function (el) { el.textContent = item.titulo_comercial; });
    if (contenido) {
      if (item.mensaje_comercial && !contenido.querySelector('.gc-commercial-copy')) {
        contenido.querySelectorAll('[data-gesicomm-bind="descripcion"]').forEach(function (el) { el.style.setProperty('display', 'none', 'important'); });
        var mensaje = document.createElement('p');
        mensaje.className = 'gc-commercial-copy'; mensaje.textContent = item.mensaje_comercial;
        var titulo = contenido.querySelector('[data-gesicomm-bind="nombre"]');
        if (titulo) titulo.insertAdjacentElement('afterend', mensaje); else contenido.prepend(mensaje);
      }
      var antes = Number(item.precio_antes), precio = Number(item.precio);
      var ahorro = antes > precio && precio > 0 ? antes - precio : 0;
      var insignias = [item.insignia_principal || item.insignia_secundaria].filter(function (valor) {
        return valor && (valor !== 'Oferta' || ahorro > 0) && (valor !== 'Envío gratis' || item.envio_incluido);
      });
      if (insignias.length && !raiz.querySelector('.gc-commercial-badges')) {
        raiz.querySelectorAll('.product-badge').forEach(function (el) { el.style.setProperty('display', 'none', 'important'); });
        var badges = document.createElement('div'); badges.className = 'gc-commercial-badges';
        insignias.forEach(function (valor) {
          var badge = document.createElement('span'); badge.textContent = valor === 'Oferta' ? 'Oferta · ' + Math.round(ahorro / antes * 100) + '% OFF' : valor;
          badges.appendChild(badge);
        });
        raiz.prepend(badges);
      }
      if (ahorro && !contenido.querySelector('.gc-commercial-saving')) {
        var saving = document.createElement('p'); saving.className = 'gc-commercial-saving'; saving.textContent = 'Ahorrás ' + formatoPrecio(ahorro);
        var footer = contenido.querySelector('.product-footer, .limited-offer-prices');
        if (footer) footer.appendChild(saving); else contenido.appendChild(saving);
      }
      var urgencia = datos.venta && datos.venta.urgencia;
      if (productoAplicaUrgencia(item, urgencia) && urgencia.fin_at && !contenido.querySelector('.gc-card-countdown')) {
        var cardCountdown = document.createElement('div');
        cardCountdown.className = 'gc-card-countdown';
        cardCountdown.setAttribute('data-gesicomm-countdown', '');
        var tituloCountdown = document.createElement('strong');
        tituloCountdown.textContent = urgencia.titulo || 'Esta oferta termina pronto';
        var textoCountdown = document.createElement('span');
        textoCountdown.textContent = urgencia.texto || 'Aprovechá antes de que vuelva a su precio normal.';
        var tiempoCountdown = document.createElement('em');
        tiempoCountdown.innerHTML = '<b data-gesicomm-countdown-parte="horas">--</b>h <b data-gesicomm-countdown-parte="minutos">--</b>m <b data-gesicomm-countdown-parte="segundos">--</b>s';
        cardCountdown.appendChild(tituloCountdown);
        cardCountdown.appendChild(textoCountdown);
        cardCountdown.appendChild(tiempoCountdown);
        var footerCountdown = contenido.querySelector('.product-footer, .limited-offer-prices');
        if (footerCountdown) footerCountdown.insertAdjacentElement('beforebegin', cardCountdown);
        else contenido.appendChild(cardCountdown);
      }
      if (item.cta_texto) {
        contenido.querySelectorAll('[data-gesicomm-comprar]').forEach(function (btn) { btn.textContent = item.cta_texto; });
      }
      if (raiz.classList && raiz.classList.contains('product-card')) {
        contenido.querySelectorAll('[data-gesicomm-comprar]').forEach(function (btn) {
          if (!btn.hasAttribute('data-gesicomm-metodo-pago')) {
            btn.textContent = 'Comprar';
            btn.setAttribute('data-gesicomm-comprar-ver', '');
          }
        });
      }
      if ((item.titulo_comercial || item.mensaje_comercial) && !contenido.querySelector('.gc-commercial-details')) {
        var detalles = document.createElement('button'); detalles.type = 'button'; detalles.className = 'gc-commercial-details';
        detalles.setAttribute('data-gesicomm-ver', item.id || ''); detalles.textContent = 'Ver producto →'; contenido.appendChild(detalles);
      }
    }
    if (item.envio_incluido && contenido && !contenido.querySelector('.gc-product-shipping')) {
      var envio = document.createElement('p');
      envio.className = 'gc-product-shipping';
      envio.textContent = 'Envío gratis';
      contenido.appendChild(envio);
    }
    if (raiz.hasAttribute('data-gesicomm-ver')) raiz.style.cursor = 'pointer';
    var imgs = imagenesDeProducto(item);
    if (imgs.length < 2) return;
    var img = raiz.matches && raiz.matches('img[data-gesicomm-bind="imagen"]')
      ? raiz
      : raiz.querySelector('img[data-gesicomm-bind="imagen"]');
    if (!img) return;
    img.setAttribute('data-gesicomm-carrusel', '');
    raiz.setAttribute('data-gesicomm-carrusel', '');
    var idx = 0;
    var timer = null;
    function mostrar(n) {
      idx = n % imgs.length;
      img.src = imgs[idx];
    }
    function iniciar() {
      if (timer) return;
      raiz.classList.add('is-previewing');
      mostrar(idx + 1);
      timer = setInterval(function () { mostrar(idx + 1); }, 900);
    }
    function parar() {
      if (timer) clearInterval(timer);
      timer = null;
      idx = 0;
      img.src = imgs[0];
      raiz.classList.remove('is-previewing');
    }
    raiz.addEventListener('mouseenter', iniciar);
    raiz.addEventListener('mouseleave', parar);
    raiz.addEventListener('focusin', iniciar);
    raiz.addEventListener('focusout', parar);
    raiz.addEventListener('touchstart', function () {
      iniciar();
      setTimeout(parar, 1800);
    }, false);
  }

  // Tarjeta de colección (.collection-card): al pasar el mouse, va mostrando
  // la imagen de cada producto de esa categoría, una por una.
  function prepararTarjetaColeccion(raiz, item) {
    if (!raiz || !item) return;
    var imgs = Array.isArray(item.imagenes) ? item.imagenes : [];
    if (imgs.length < 2) return;
    var idx = 0;
    var timer = null;
    function mostrar(n) {
      idx = n % imgs.length;
      raiz.style.backgroundImage = 'url("' + imgs[idx].replace(/"/g, '%22') + '")';
    }
    function iniciar() {
      if (timer) return;
      timer = setInterval(function () { mostrar(idx + 1); }, 900);
    }
    function parar() {
      if (timer) clearInterval(timer);
      timer = null;
      idx = 0;
      mostrar(0);
    }
    raiz.addEventListener('mouseenter', iniciar);
    raiz.addEventListener('mouseleave', parar);
    raiz.addEventListener('focusin', iniciar);
    raiz.addEventListener('focusout', parar);
  }

  // Countdown de oferta (data-gesicomm-countdown): el HTML trae la estructura,
  // no fechas ni JS propio. Si hay fecha real del producto, se usa esa; si no,
  // se muestra un countdown generado para mantener la estructura comercial de
  // la landing. Publicar con datos no confirmados se advierte en el editor.
  var COUNTDOWN_DEMO_MS = 2 * 60 * 60 * 1000;
  function dosDigitos(n) { return (n < 10 ? '0' : '') + n; }

  function countdownDemoMs(item) {
    if (!item) return COUNTDOWN_DEMO_MS;
    var horas = Math.max(0, parseInt(item.urgencia_horas, 10) || 0);
    var minutos = Math.max(0, Math.min(59, parseInt(item.urgencia_minutos, 10) || 0));
    var segundos = Math.max(0, Math.min(59, parseInt(item.urgencia_segundos, 10) || 0));
    var total = (horas * 3600 + minutos * 60 + segundos) * 1000;
    return total > 0 ? total : COUNTDOWN_DEMO_MS;
  }

  function prepararCountdown(el, finMs) {
    var horas = el.querySelector('[data-gesicomm-countdown-parte="horas"]');
    var minutos = el.querySelector('[data-gesicomm-countdown-parte="minutos"]');
    var segundos = el.querySelector('[data-gesicomm-countdown-parte="segundos"]');
    function pintar() {
      var restante = finMs - Date.now();
      if (restante <= 0) return false;
      var totalSeg = Math.floor(restante / 1000);
      if (horas) horas.textContent = dosDigitos(Math.floor(totalSeg / 3600));
      if (minutos) minutos.textContent = dosDigitos(Math.floor((totalSeg % 3600) / 60));
      if (segundos) segundos.textContent = dosDigitos(totalSeg % 60);
      return true;
    }
    if (!pintar()) return;
    el.style.display = '';
    if (el.__gesicommCountdownTimer) clearInterval(el.__gesicommCountdownTimer);
    var timer = setInterval(function () { if (!pintar()) clearInterval(timer); }, 1000);
    el.__gesicommCountdownTimer = timer;
  }

  function finCountdown(urgencia, item) {
    if (urgencia && urgencia.activo) {
      var aplica = item
        ? productoAplicaUrgencia(item, urgencia)
        : (!urgencia.producto_id && !urgencia.content_id && !(Array.isArray(urgencia.productos) && urgencia.productos.length) ? true : datoAplicaAlProducto(urgencia));
      var real = aplica ? Date.parse(urgencia.fin_at) : NaN;
      if (isFinite(real) && real > Date.now()) return real;
      if (!aplica && item) return NaN;
    }
    return Date.now() + countdownDemoMs(item);
  }

  function prepararCountdowns() {
    var els = document.querySelectorAll('[data-gesicomm-countdown]');
    if (!els.length) return;
    var urgencia = datos.venta && datos.venta.urgencia;
    for (var i = 0; i < els.length; i++) {
      var contItem = els[i].closest('[data-gesicomm-item]');
      var enFicha = !contItem && !!els[i].closest('[data-gesicomm-ficha-bloque="precio"]');
      var item = contItem ? buscar(contItem.getAttribute('data-gesicomm-item')) : (enFicha ? productoActual : null);
      var finMs = finCountdown(urgencia, item);
      // El bloque de urgencia de la ficha lo prende o apaga el comercio desde
      // el editor: si la Oferta flash es de otros productos, usa la duración
      // cargada en la ficha en vez de desaparecer.
      if (!isFinite(finMs) && enFicha && item) finMs = Date.now() + countdownDemoMs(item);
      if (!isFinite(finMs)) { els[i].style.display = 'none'; continue; }
      prepararCountdown(els[i], finMs);
    }
  }

  function prepararHeroBanners() {
    // Quita ejemplos incluidos en bases anteriores guardadas: no son datos del comercio.
    var franjas = document.querySelectorAll('main[data-gesicomm-base="catalogo"] .store-benefits');
    Array.prototype.forEach.call(franjas, function (franja) {
      var texto = franja.textContent || '';
      if (texto.indexOf('Checkout simple') !== -1 || texto.indexOf('Procesado por PagoPar') !== -1 || texto.indexOf('Pago seguro') !== -1) franja.remove();
    });
    var shells = document.querySelectorAll('.hero-shell');
    Array.prototype.forEach.call(shells, function (shell) {
      var slides = shell.querySelectorAll('.hero-banners .hero-banner');
      if (shell.__gesicommHeroTimer) clearInterval(shell.__gesicommHeroTimer);
      shell.classList.toggle('has-banner', slides.length > 0);
      var hero = shell.closest('section.hero');
      Array.prototype.forEach.call(shell.querySelectorAll('.hero-fallback'), function (fallback) { fallback.remove(); });
      if (hero) hero.hidden = slides.length === 0;
      var controls = shell.querySelector('.hero-dots[data-gesicomm-slider]');
      if (controls) {
        controls.innerHTML = '';
        for (var n = 0; n < slides.length; n++) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.setAttribute('aria-label', 'Ir al banner ' + (n + 1));
          controls.appendChild(dot);
        }
        controls.hidden = slides.length < 2;
      }
      var anterior = shell.querySelector('[data-gesicomm-banner-anterior]');
      var siguiente = shell.querySelector('[data-gesicomm-banner-siguiente]');
      if (anterior) anterior.hidden = slides.length < 2;
      if (siguiente) siguiente.hidden = slides.length < 2;
      if (!slides.length) return;
      var dots = shell.querySelectorAll('.hero-dots button, .hero-dots span');
      var actual = 0;
      var pintar = function (n) {
        actual = (n + slides.length) % slides.length;
        for (var i = 0; i < slides.length; i++) slides[i].classList.toggle('is-active', i === actual);
        for (var d = 0; d < dots.length; d++) {
          dots[d].classList.toggle('is-active', d === actual);
          dots[d].setAttribute('aria-pressed', String(d === actual));
        }
      };
      Array.prototype.forEach.call(dots, function (dot, indice) { dot.onclick = function () { pintar(indice); }; });
      if (anterior) anterior.onclick = function () { pintar(actual - 1); };
      if (siguiente) siguiente.onclick = function () { pintar(actual + 1); };
      Array.prototype.forEach.call(slides, function (slide) {
        var medio = slide.querySelector('img[src], video[src]');
        var texto = slide.querySelector('.hero-text');
        var tieneTexto = Array.prototype.some.call(slide.querySelectorAll('[data-gesicomm-bind="titulo"], [data-gesicomm-bind="subtitulo"], [data-gesicomm-bind="etiqueta"], [data-gesicomm-bind="cta_texto"]'), function (el) { return el.textContent.trim(); });
        var soloMedio = !!medio && !tieneTexto;
        slide.classList.toggle('has-media', !!medio);
        slide.classList.toggle('is-media-only', soloMedio);
        if (texto) texto.hidden = soloMedio;
        var cta = slide.querySelector('a[data-gesicomm-bind="enlace"]');
        var label = cta && cta.querySelector('[data-gesicomm-bind="cta_texto"]');
        if (cta && label) cta.hidden = soloMedio || !label.textContent.trim();
        if (medio && soloMedio && !slide.querySelector('.hero-media-link')) {
          var enlace = slide.querySelector('a[data-gesicomm-bind="enlace"]');
          if (enlace && enlace.getAttribute('href')) {
            var link = document.createElement('a');
            link.className = 'hero-media-link';
            link.href = enlace.getAttribute('href');
            link.setAttribute('aria-label', 'Ver promocion');
            slide.appendChild(link);
          }
        }
        if (!soloMedio) Array.prototype.forEach.call(slide.querySelectorAll('.hero-media-link'), function (link) { link.remove(); });
      });
      if (slides.length > 1) shell.__gesicommHeroTimer = setInterval(function () { pintar((actual + 1) % slides.length); }, 5000);
      pintar(0);
    });
  }

  function textoVenta(campo) {
    var venta = datos.venta || {};
    var urg = venta.urgencia || {};
    var marca = (venta.inicio && venta.inicio.marca) || (venta.inicio_comercial && venta.inicio_comercial.marca) || {};
    switch (campo) {
      case 'recomendados_kicker': return venta.recomendados_kicker || 'Te puede gustar';
      case 'recomendados_titulo': return venta.recomendados_titulo || 'Te puede gustar';
      case 'recomendados_subtitulo': return venta.recomendados_subtitulo || '';
      case 'recomendados_cta': return venta.recomendados_cta || 'Agregar';
      case 'urgencia_titulo': return urg.titulo || 'Ofertas que terminan pronto';
      case 'urgencia_texto': return urg.texto || 'Aprovechá antes de que se agoten';
      case 'urgencia_cta': return urg.cta_texto || 'Ver todos';
      case 'marca_kicker': return marca.kicker || '';
      case 'marca_titulo': return marca.titulo || '';
      case 'marca_texto': return marca.texto || '';
      case 'productos_categoria_kicker': return productosCategoriaConfig().kicker || '';
      case 'productos_categoria_titulo': return productosCategoriaConfig().titulo || 'Productos seleccionados';
      case 'productos_categoria_subtitulo': return productosCategoriaConfig().subtitulo || '';
      default: return '';
    }
  }

  function pintarVenta() {
    var configuradas = document.querySelectorAll('[data-gesicomm-venta-configurada]');
    Array.prototype.forEach.call(configuradas, function (seccion) {
      var clave = seccion.getAttribute('data-gesicomm-venta-configurada');
      // "marca" vive en venta.inicio.marca (config del Inicio), el resto
      // (urgencia, etc.) directo en venta — ver inicioConfig().
      var config = (datos.venta && datos.venta[clave]) || (clave === 'marca' ? marcaConfig() : null);
      seccion.hidden = !config || config.activo !== true;
    });
    var els = document.querySelectorAll('[data-gesicomm-venta]');
    for (var i = 0; i < els.length; i++) {
      var valor = textoVenta(els[i].getAttribute('data-gesicomm-venta'));
      if (!valor) { els[i].style.display = 'none'; continue; }
      els[i].style.display = '';
      els[i].textContent = valor;
    }
  }

  function datoAplicaAlProducto(config) {
    if (!config || !config.activo || !productoActual) return false;
    return productoAplicaUrgencia(productoActual, config);
  }

  // ─── Listas ───────────────────────────────────────────────────────────
  // "confianza" (sin sufijo) ya existe para la ficha de producto (beneficios
  // del producto en Fitness/Beauty/Bazar) — la zona de confianza del INICIO
  // es un dato distinto (venta.inicio.confianza), por eso lleva otro nombre
  // de lista acá adentro para no pisarse.
  var LISTAS_DE_DATOS = {
    categorias: 1, menu_categorias: 1, banners_inicio: 1, banners_intermedios: 1, secciones_inicio: 1,
    beneficios: 1, confianza: 1, preguntas: 1, combo_incluye: 1, estadisticas: 1, checkout_items: 1,
    botones_pago_producto: 1, metodos_pago_producto: 1, incluye_pedido_producto: 1,
    anuncios: 1, confianza_inicio: 1, marca_badges: 1, marca_medios: 1,
  };
  var LISTA_PAQUETES = 'paquetes';

  function inicioConfig() {
    return (datos.venta && (datos.venta.inicio || datos.venta.inicio_comercial)) || {};
  }

  function encabezadoConfig() {
    var e = inicioConfig().encabezado || {};
    var tamano = Number(e.logo_tamano);
    var rotacion = Number(e.logo_rotacion);
    return {
      logo_tamano: isFinite(tamano) ? Math.max(28, Math.min(96, tamano)) : 46,
      logo_rotacion: isFinite(rotacion) ? Math.max(-180, Math.min(180, rotacion)) : 0,
      logo_posicion: e.logo_posicion === 'centro' ? 'centro' : 'izquierda',
    };
  }

  function aplicarEncabezadoInicio() {
    var cfg = encabezadoConfig();
    var headers = document.querySelectorAll('.commerce-header');
    for (var i = 0; i < headers.length; i++) {
      headers[i].style.setProperty('--gc-logo-tamano', cfg.logo_tamano + 'px');
      headers[i].style.setProperty('--gc-logo-escala', String(cfg.logo_tamano / 46));
      headers[i].style.setProperty('--gc-logo-rotacion', cfg.logo_rotacion + 'deg');
      headers[i].classList.toggle('logo-centrado', cfg.logo_posicion === 'centro');
    }
  }

  // ─── Zona de confianza, anuncios y "Nuestra marca" del Inicio ──────────
  var ANUNCIOS_DEFAULT = ['Envío a todo Paraguay', 'Pago seguro', 'Atención personalizada', 'Cambios y devoluciones'];
  var CONFIANZA_DEFAULT = [
    { icono: 'card', titulo: 'Opciones de pago', texto: 'Consultá los medios de pago disponibles para tu compra.' },
    { icono: 'rotate', titulo: 'Cambios y devoluciones', texto: 'Conocé las condiciones y los pasos para solicitar un cambio.' },
    { icono: 'truck', titulo: 'Envíos a tu zona', texto: 'Confirmá la cobertura, el costo y el plazo antes de pedir.' },
  ];

  // El runtime vive en un iframe aislado sin el set de íconos de React del
  // editor (lucide-react, ver iconosBeneficios.js) — por eso la clave
  // guardada (ej. "truck") se traduce a un glifo simple acá, mismo criterio
  // que el carrito (🛒) del header. Mismo catálogo que el selector de
  // íconos del editor (ConfigurarVentaCodigo.jsx, ICONOS_CONFIANZA) — una
  // clave nueva ahí necesita su glifo acá también.
  var EMOJI_CONFIANZA = {
    shield: '🛡️', card: '💳', truck: '🚚', rotate: '↺', badge: '✅', heart: '❤️',
    leaf: '🌿', headphones: '🎧', package: '📦', clock: '⏱️', gift: '🎁', star: '⭐',
    lock: '🔒', whatsapp: '💬', mail: '✉️', location: '📍', cash: '💵',
  };
  // El runtime nunca deja la barra ni la zona de confianza vacías: sin
  // configurar todavía, se ven con este contenido de ejemplo (igual criterio
  // que textoVenta/urgencia). El comercio lo reemplaza desde el editor.
  // Ícono por defecto cuando el anuncio todavía no tiene uno elegido (texto
  // suelto guardado antes de que existiera el selector, o nunca tocado) —
  // cicla estos 4 en vez de repetir siempre el mismo.
  var ICONOS_ANUNCIOS_DEFAULT = ['✦', '✓', '◉', '↺'];
  function anunciosInicio() {
    var lista = inicioConfig().anuncios;
    var fuente = Array.isArray(lista) && lista.length ? lista : ANUNCIOS_DEFAULT;
    var items = fuente.map(function (it, i) {
      var esObjeto = it && typeof it === 'object';
      var texto = esObjeto ? (it.texto || '') : (it || '');
      var claveIcono = esObjeto ? it.icono : '';
      var icono = (claveIcono && EMOJI_CONFIANZA[claveIcono]) || ICONOS_ANUNCIOS_DEFAULT[i % ICONOS_ANUNCIOS_DEFAULT.length];
      return { texto: texto, icono: icono };
    });
    // El track se mueve hasta -50% (ver .trust-track). Con solo dos ciclos,
    // tres anuncios cortos no alcanzan a cubrir pantallas anchas y queda un
    // hueco visible. Se repiten ciclos completos en cantidad par para que la
    // mitad izquierda y la derecha sigan siendo idénticas.
    var salida = [];
    for (var r = 0; r < 6; r++) salida = salida.concat(items);
    return salida;
  }

  function confianzaInicio() {
    var lista = inicioConfig().confianza;
    var items = Array.isArray(lista) && lista.length ? lista : CONFIANZA_DEFAULT;
    return items.map(function (it) {
      var icono = String(it.icono || '').trim();
      return { icono: EMOJI_CONFIANZA[icono] || icono || '🛡️', titulo: it.titulo || '', texto: it.texto || '' };
    });
  }

  function marcaConfig() {
    return inicioConfig().marca || null;
  }

  function productosCategoriaConfig() {
    return inicioConfig().productos_categoria || {};
  }

  // Productos elegidos a mano en el editor. Si el comercio todavía no
  // seleccionó ninguno, arranca mostrando todo el catálogo (en vez de nada)
  // para que el bloque no se vea vacío/roto en una landing nueva.
  function productosCategoriaBase() {
    var ids = productosCategoriaConfig().items;
    if (!Array.isArray(ids) || !ids.length) {
      return productos.filter(function (p) { return p.mostrar_en_inicio !== false; });
    }
    var salida = [];
    for (var i = 0; i < ids.length; i++) {
      var item = buscar(ids[i]);
      if (item && item.mostrar_en_inicio !== false && salida.indexOf(item) === -1) salida.push(item);
    }
    return salida;
  }

  function categoriasProductosCategoria() {
    var base = productosCategoriaBase();
    var vistas = [];
    for (var i = 0; i < base.length; i++) {
      var cat = String(base[i].categoria || '').trim();
      if (cat && vistas.indexOf(cat) === -1) vistas.push(cat);
    }
    return vistas;
  }

  // Tab activa de la mini-vidriera de Productos por categoría — estado
  // propio, nunca el de `filtros`: esa es la categoría del catálogo
  // completo, no debe mezclarse con esta grilla chica del inicio.
  var pcCategoriaActiva = '';
  var pcBusqueda = '';

  function urlContactoProducto(boton) {
    var tipo = String(boton && boton.tipo || 'whatsapp');
    var valor = valorWhatsappEditable(boton && boton.valor);
    if (tipo === 'checkout') return '/checkout';
    if (tipo === 'contacto') return '/contacto';
    if (tipo === 'url') return urlSegura(valor) || '#';
    var numero = String((datos.tienda && datos.tienda.whatsapp) || '').replace(/\D/g, '');
    if (!numero) return '#';
    var mensaje = mensajeWhatsapp(valor);
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensaje);
  }

  function valorWhatsappEditable(valor) {
    var limpio = String(valor || '').trim();
    return limpio === 'Hola! Quiero consultar por este producto.' ? '' : limpio;
  }

  function contactosProducto() {
    var lista = productoActual && Array.isArray(productoActual.botones_contacto) ? productoActual.botones_contacto : [];
    return lista.map(function (b) {
      return {
        label: String(b.label || '').trim() || 'Consultar',
        tipo: b.tipo || 'whatsapp',
        valor: valorWhatsappEditable(b.valor),
        url: urlContactoProducto(b),
      };
    }).filter(function (b) { return b.label; }).slice(0, 4);
  }

  function botonesPagoProducto() {
    var lista = productoActual && Array.isArray(productoActual.botones_pago) ? productoActual.botones_pago : [];
    return lista.map(function (b) {
      var tipo = b.tipo || 'checkout';
      var valor = b.valor || '';
      var label = String(b.label || '').trim() || 'Pagar';
      var esContraEntrega = normalizar(valor + ' ' + label).indexOf('contra entrega') !== -1 || normalizar(valor).indexOf('efectivo') !== -1;
      return {
        label: label,
        tipo: tipo,
        valor: valor,
        url: urlContactoProducto(b),
        payment_method: tipo === 'checkout' && esContraEntrega ? 'efectivo' : (tipo === 'checkout' ? 'pagopar' : ''),
      };
    }).filter(function (b) { return b.label; }).slice(0, 4);
  }

  function metodosPagoProducto() {
    var lista = productoActual && Array.isArray(productoActual.metodos_pago) ? productoActual.metodos_pago : [];
    return lista.map(function (m) { return { texto: String((m && (m.texto || m.label)) || '').trim() }; })
      .filter(function (m) { return m.texto; }).slice(0, 8);
  }

  function incluyePedidoProducto() {
    var lista = productoActual && Array.isArray(productoActual.incluye_pedido) ? productoActual.incluye_pedido : [];
    return lista.map(function (m) { return { texto: String((m && (m.texto || m.titulo)) || '').trim() }; })
      .filter(function (m) { return m.texto; }).slice(0, 8);
  }

  function opinionesProducto() {
    var lista = productoActual && Array.isArray(productoActual.opiniones) ? productoActual.opiniones : [];
    return lista.map(function (o) {
      var n = Math.max(1, Math.min(5, Number(o.calificacion) || 5));
      return {
        nombre: String(o.nombre || '').trim(),
        comentario: String(o.comentario || '').trim(),
        detalle: String(o.detalle || '').trim(),
        imagen: urlSegura(o.foto || o.imagen || o.avatar || '') || '',
        calificacion: n,
        estrellas: '★★★★★'.slice(0, n),
      };
    }).filter(function (o) { return o.nombre || o.comentario; }).slice(0, 6);
  }

  function productosCategoriaFiltrados() {
    var base = productosCategoriaBase();
    if (pcCategoriaActiva) base = base.filter(function (p) { return String(p.categoria || '') === pcCategoriaActiva; });
    if (pcBusqueda) {
      base = base.filter(function (p) {
        return normalizar([
          p.nombre,
          p.categoria,
          p.marca,
          p.etiqueta,
          p.descripcion,
          p.descripcion_corta,
        ].filter(Boolean).join(' ')).indexOf(pcBusqueda) !== -1;
      });
    }
    var limite = Number(productosCategoriaConfig().limite);
    return base.slice(0, limite > 0 ? limite : 8);
  }

  // Reordena/oculta los bloques del body del Inicio según venta.inicio.bloques
  // (ver EditorBloquesInicio, frontend). Sin esa lista guardada todavía
  // (landing vieja, o recién creada) no toca nada: la página queda tal como
  // viene en el HTML — puramente aditivo, nunca rompe lo que ya había.
  function aplicarBloquesInicio() {
    var bloques = inicioConfig().bloques;
    if (!Array.isArray(bloques) || !bloques.length) return;
    var secciones = document.querySelectorAll('[data-gesicomm-bloque]');
    if (!secciones.length) return;
    // "anuncios" (la franja de arriba del todo) vive FUERA de .page-content
    // a propósito — es una tira fija por encima del header, no una fila más
    // del body. Se puede ocultar como cualquier bloque, pero no se reinserta
    // en .page-content: ahí quedaría abajo del header, que no es su lugar.
    var contenedor = document.querySelector('.page-content');
    var mapa = {};
    for (var i = 0; i < secciones.length; i++) mapa[secciones[i].getAttribute('data-gesicomm-bloque')] = secciones[i];
    var configurados = {};
    for (var b = 0; b < bloques.length; b++) {
      configurados[bloques[b].tipo] = 1;
      var el = mapa[bloques[b].tipo];
      if (!el) continue;
      // Solo suma un "oculto": si el bloque ya se escondió solo (sin banners
      // cargados, sin oferta con urgencia activa, lista vacía…) esto nunca lo
      // vuelve a mostrar. Cuando el ocultamiento sí vino del control manual,
      // lo marcamos para poder restaurarlo si el comercio vuelve a tildar
      // "Mostrar".
      if (bloques[b].visible === false) {
        el.setAttribute('data-gesicomm-oculto-manual', '1');
        el.hidden = true;
      } else if (el.getAttribute('data-gesicomm-oculto-manual') === '1') {
        el.hidden = false;
        el.removeAttribute('data-gesicomm-oculto-manual');
      }
      if (contenedor && contenedor.contains(el)) contenedor.appendChild(el); // reinserta al final, en el orden de `bloques`
    }
    for (var tipo in mapa) {
      if (Object.prototype.hasOwnProperty.call(mapa, tipo) && !configurados[tipo]) mapa[tipo].hidden = true;
    }
  }

  function pintarProductosCategoria() {
    var seccion = document.querySelector('[data-gesicomm-bloque="productos_categoria"]');
    if (seccion) seccion.hidden = productosCategoriaBase().length === 0;
    var vacio = document.querySelector('[data-gesicomm-pc-vacio]');
    if (vacio) vacio.hidden = productosCategoriaBase().length === 0 || productosCategoriaFiltrados().length > 0;
    var cont = document.querySelector('[data-gesicomm-pc-tabs]');
    if (!cont) return;
    var cats = categoriasProductosCategoria();
    if (pcCategoriaActiva && cats.indexOf(pcCategoriaActiva) === -1) pcCategoriaActiva = '';
    cont.textContent = '';
    cont.style.display = cats.length > 1 ? '' : 'none';
    var opciones = [''].concat(cats);
    for (var i = 0; i < opciones.length; i++) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.textContent = opciones[i] || 'Todos';
      boton.setAttribute('data-gesicomm-pc-categoria', opciones[i]);
      boton.className = 'pc-tab';
      var activo = opciones[i] === pcCategoriaActiva;
      boton.classList.toggle('is-active', activo);
      boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
      cont.appendChild(boton);
    }
  }

  function repintarProductosCategoria() {
    var listas = document.querySelectorAll('[data-gesicomm-lista="productos_categoria"]');
    for (var i = 0; i < listas.length; i++) renderizarLista(listas[i]);
    pintarProductosCategoria();
  }

  function categoriasDeProductos() {
    var porNombre = {};
    productos.forEach(function (p) {
      if (datos.vista === 'inicio' && p.mostrar_en_inicio === false) return;
      var nombre = String(p.categoria || '').trim();
      if (!nombre) return;
      if (!porNombre[nombre]) porNombre[nombre] = { nombre: nombre, categoria: nombre, cantidad: 0, imagen: '', imagenes: [], etiqueta: 'Categoria' };
      porNombre[nombre].cantidad += 1;
      if (!porNombre[nombre].imagen && (p.imagen || p.url_imagen)) porNombre[nombre].imagen = p.imagen || p.url_imagen;
      var imgSegura = urlSegura(p.imagen || p.url_imagen);
      if (imgSegura && porNombre[nombre].imagenes.indexOf(imgSegura) === -1) porNombre[nombre].imagenes.push(imgSegura);
    });
    return Object.keys(porNombre).sort(function (a, b) { return a.localeCompare(b, 'es'); }).map(function (k) {
      var cat = porNombre[k];
      cat.cantidad_texto = cat.cantidad + (cat.cantidad === 1 ? ' producto' : ' productos');
      return cat;
    });
  }

  // Curaduría manual de categorías (panel "Secciones" del editor, ver
  // plantillaInicioEditor.js): data-gesicomm-categorias-curadas en el
  // propio elemento de la lista, JSON [{nombre, imagen?}]. Sin ese
  // atributo (o vacío/inválido) se sigue armando automático desde el
  // catálogo, como siempre. El conteo de productos SIEMPRE sale del
  // catálogo real, nunca de lo guardado: una curaduría vieja no debe
  // mostrar un número de productos desactualizado.
  function categoriasCuradasDe(el) {
    var raw = el && el.getAttribute && el.getAttribute('data-gesicomm-categorias-curadas');
    if (!raw) return null;
    var curadas;
    try { curadas = JSON.parse(raw); } catch (e) { return null; }
    if (!Array.isArray(curadas) || !curadas.length) return null;
    var auto = categoriasDeProductos();
    var porNombre = {};
    auto.forEach(function (c) { porNombre[c.nombre] = c; });
    return curadas.map(function (c) {
      var base = porNombre[c.nombre] || { nombre: c.nombre, categoria: c.nombre, cantidad: 0, cantidad_texto: '0 productos', imagen: '', etiqueta: 'Categoria' };
      return c.imagen ? Object.assign({}, base, { imagen: c.imagen }) : base;
    });
  }

  function categoriasMenu() {
    var inicio = inicioConfig();
    if (inicio.menu_categorias === false) return [];
    var auto = categoriasDeProductos();
    var elegidas = Array.isArray(inicio.categorias) ? inicio.categorias : [];
    if (!elegidas.length) return auto.slice(0, 8);
    var porNombre = {};
    auto.forEach(function (c) { porNombre[c.nombre] = c; });
    return elegidas.map(function (nombre) { return porNombre[nombre]; }).filter(Boolean);
  }

  function categoriasParaHeader() {
    var porNombre = {};
    categoriasDeProductos().forEach(function (c) { porNombre[c.nombre] = c; });
    var extras = catalogoVista.categorias || [];
    for (var i = 0; i < extras.length; i++) {
      var nombre = String(extras[i] || '').trim();
      if (!nombre || porNombre[nombre]) continue;
      porNombre[nombre] = { nombre: nombre, categoria: nombre, cantidad: 0, cantidad_texto: '', imagen: '', etiqueta: 'Categoria' };
    }
    return Object.keys(porNombre).sort(function (a, b) { return a.localeCompare(b, 'es'); }).map(function (k) { return porNombre[k]; });
  }

  function cerrarMenuCategorias() {
    var panel = document.querySelector('[data-gesicomm-menu-categorias]');
    var toggle = document.querySelector('[data-gesicomm-categorias-toggle]');
    if (panel) panel.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function prepararMenuCategoriasHeader() {
    var panel = document.querySelector('[data-gesicomm-menu-categorias]');
    var toggle = document.querySelector('[data-gesicomm-categorias-toggle]');
    if (!panel || !toggle) return;
    var lista = panel.querySelector('.category-menu-list') || panel;
    var categorias = categoriasParaHeader();
    lista.textContent = '';
    if (!categorias.length) {
      toggle.style.display = 'none';
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      return;
    }
    toggle.style.display = '';
    for (var i = 0; i < categorias.length; i++) {
      var cat = categorias[i];
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'category-menu-item';
      item.setAttribute('data-gesicomm-categoria-ir', cat.nombre);
      var nombre = document.createElement('span');
      nombre.textContent = cat.nombre;
      item.appendChild(nombre);
      if (cat.cantidad_texto) {
        var cantidad = document.createElement('small');
        cantidad.textContent = cat.cantidad_texto;
        item.appendChild(cantidad);
      }
      lista.appendChild(item);
    }
    panel.hidden = toggle.getAttribute('aria-expanded') !== 'true';
  }

  function menuPrincipal() {
    var inicio = inicioConfig();
    if (!Array.isArray(inicio.menu_links) || !inicio.menu_links.length) return null;
    var links = inicio.menu_links;
    return links.filter(function (item) {
      return item && item.visible !== false && item.texto && item.destino;
    });
  }

  function prepararMenuPrincipalHeader() {
    var contenedores = document.querySelectorAll('#nav-links, [data-gesicomm-menu-principal]');
    if (!contenedores.length) return;
    var links = menuPrincipal();
    if (!links) return;
    for (var c = 0; c < contenedores.length; c++) {
      var cont = contenedores[c];
      cont.textContent = '';
      for (var i = 0; i < links.length; i++) {
        var item = links[i];
        var a = document.createElement('a');
        a.href = urlSegura(item.destino) || '#inicio';
        a.textContent = item.texto;
        if (item.destino === '/catalogo') a.setAttribute('data-gesicomm-link', 'catalogo');
        if (item.destino === '/checkout') a.setAttribute('data-gesicomm-link', 'checkout');
        if ((datos.vista === 'inicio' && item.destino === '#inicio')
          || (datos.vista === 'catalogo' && item.destino === '/catalogo')
          || (datos.vista === 'categoria' && item.destino.indexOf('/categoria/') === 0)
          || (datos.vista === 'checkout' && item.destino === '/checkout')) {
          a.className = 'active';
        }
        cont.appendChild(a);
      }
      cont.style.display = links.length ? '' : 'none';
    }
  }

  function bannersInicio() {
    var banners = inicioConfig().banners || [];
    if (!Array.isArray(banners)) return [];
    return banners.filter(function (b) {
      return b && b.activo !== false && (b.titulo || b.subtitulo || b.imagen);
    }).map(function (b) {
      return {
        id: b.id || b.titulo,
        titulo: b.titulo || '',
        subtitulo: b.subtitulo || '',
        etiqueta: b.etiqueta || '',
        cta_texto: b.cta_texto || '',
        enlace: b.enlace || '#productos',
        imagen: b.imagen || '',
        tipo_medio: b.tipo_medio || (/(\.mp4|\.webm|\.ogg|\.mov|\.m4v)(\?|$)/i.test(b.imagen || '') ? 'video' : 'imagen'),
      };
    });
  }

  function bannersIntermedios() {
    var banners = inicioConfig().banners_intermedios || [];
    if (!Array.isArray(banners)) return [];
    return banners.filter(function (b) {
      return b && b.activo !== false && (b.titulo || b.subtitulo || b.imagen);
    }).map(function (b) {
      return {
        id: b.id || b.titulo,
        titulo: b.titulo || '',
        subtitulo: b.subtitulo || '',
        etiqueta: b.etiqueta || '',
        cta_texto: b.cta_texto || 'Ver ofertas',
        enlace: b.enlace || '#ofertas',
        imagen: b.imagen || '',
        tipo_medio: b.tipo_medio || (/(\.mp4|\.webm|\.ogg|\.mov|\.m4v)(\?|$)/i.test(b.imagen || '') ? 'video' : 'imagen'),
      };
    });
  }

  function seccionesInicio() {
    var secciones = inicioConfig().secciones || [];
    if (!Array.isArray(secciones)) return [];
    return secciones.filter(function (s) { return s && s.activo !== false && s.titulo; }).map(function (s) {
      return {
        id: s.id || s.titulo,
        tipo: s.tipo || 'categoria',
        tipo_label: ({ categoria: 'Categoría', ofertas: 'Ofertas', mas_vendidos: 'Más vendidos', novedades: 'Nuevos ingresos', manual: 'Colección' }[s.tipo || 'categoria']) || 'Sección',
        titulo: s.titulo || '',
        subtitulo: s.subtitulo || '',
        categoria: s.categoria || '',
        productos: Array.isArray(s.productos) ? s.productos : [],
        limite: Number(s.limite) > 0 ? Number(s.limite) : 4,
      };
    });
  }

  function seccionDeElemento(el) {
    var cont = el && el.closest && el.closest('[data-gesicomm-seccion-id]');
    var id = cont && cont.getAttribute('data-gesicomm-seccion-id');
    var secciones = seccionesInicio();
    for (var i = 0; i < secciones.length; i++) if (String(secciones[i].id) === String(id)) return secciones[i];
    return null;
  }

  function productosDeSeccion(el) {
    var seccion = seccionDeElemento(el);
    if (!seccion) return [];
    var visibles = productos.filter(function (p) { return p.mostrar_en_inicio !== false; });
    var base = [];
    if (seccion.tipo === 'categoria') {
      base = visibles.filter(function (p) { return String(p.categoria || '') === String(seccion.categoria || ''); });
    } else if (seccion.tipo === 'ofertas') {
      base = visibles.filter(function (p) { return Number(p.descuento_pct) > 0 || tieneEtiqueta(p, 'Oferta'); });
    } else if (seccion.tipo === 'novedades') {
      var conEtiquetaNovedad = visibles.filter(function (p) { return tieneEtiqueta(p, 'Novedades'); });
      base = (conEtiquetaNovedad.length ? conEtiquetaNovedad : visibles.slice()).sort(function (a, b) {
        var ta = a.creado ? new Date(a.creado).getTime() : 0;
        var tb = b.creado ? new Date(b.creado).getTime() : 0;
        return tb - ta;
      });
    } else if (seccion.tipo === 'manual' || seccion.tipo === 'mas_vendidos') {
      var ids = seccion.productos || [];
      if (ids.length) {
        for (var i = 0; i < ids.length; i++) {
          var item = buscar(ids[i]);
          if (item && item.mostrar_en_inicio !== false && base.indexOf(item) === -1) base.push(item);
        }
      } else if (seccion.tipo === 'mas_vendidos') {
        base = visibles.filter(function (p) { return tieneEtiqueta(p, 'Más vendidos'); });
        if (!base.length) base = productosDestacados();
      } else {
        base = productosDestacados();
      }
    }
    return base.slice(0, seccion.limite || 4);
  }

  function fuenteDeLista(nombre, el) {
    var base;
    switch (nombre) {
      case 'catalogo': return catalogoVista.items;
      case 'checkout_items': base = (datos.carrito && datos.carrito.items) || []; break;
      case 'categorias': base = categoriasCuradasDe(el) || categoriasDeProductos(); break;
      case 'menu_categorias': base = categoriasMenu(); break;
      case 'banners_inicio': base = bannersInicio(); break;
      case 'banners_intermedios': base = bannersIntermedios(); break;
      case 'secciones_inicio': base = seccionesInicio(); break;
      case 'productos_seccion': return productosDeSeccion(el);
      case 'productos': base = productos; break;
      case 'productos_destacados': base = productosDestacados(); break;
      case 'productos_manual': return productosCuradosDe(el); // ya resuelto y filtrado: no pasa por el límite/categoría genéricos de abajo
      case 'productos_categoria': return productosCategoriaFiltrados(); // ídem: límite y tab propios, no los genéricos de abajo
      case 'anuncios': base = anunciosInicio(); break;
      case 'confianza_inicio': base = confianzaInicio(); break;
      case 'marca_badges': base = (marcaConfig() && marcaConfig().badges || []).map(function (texto) { return { texto: texto }; }); break;
      // `imagen`/`tipo_medio`: mismo contrato que un banner, así aplicarBind
      // decide sola si pintar <img> o <video> (ver aaplicarBind, campo "video").
      case 'marca_medios':
        base = (marcaConfig() && marcaConfig().medios || []).map(function (m) { return { imagen: m.url, tipo_medio: m.tipo }; });
        if (!base.length) {
          var respaldoMarca = (datos.tienda && datos.tienda.logo) || ((productos[0] || {}).imagen || '');
          if (respaldoMarca) base = [{ imagen: respaldoMarca, tipo_medio: 'imagen' }];
        }
        break;
      case 'productos_ofertas': base = productosOfertaLimitada(); break;
      case 'productos_novedades':
        base = productos.filter(function (p) { return tieneEtiqueta(p, 'Novedades'); });
        if (!base.length) base = productos.slice();
        base = base.sort(function (a, b) {
          var ta = a.creado ? new Date(a.creado).getTime() : 0;
          var tb = b.creado ? new Date(b.creado).getTime() : 0;
          return tb - ta;
        });
        break;
      case 'combos': base = productos.filter(function (p) { return p.tipo === 'combo'; }); break;
      // (solo ficha) los combos que traen el producto que se está viendo.
      case 'combos_producto':
        base = productoActual ? productos.filter(function (p) {
          return p.tipo === 'combo' && Array.isArray(p.combo_productos)
            && p.combo_productos.indexOf(Number(productoActual.referencia_id)) !== -1;
        }) : [];
        break;
      case 'solo_productos': base = productos.filter(function (p) { return p.tipo === 'producto'; }); break;
      case 'recomendados': base = datos.recomendados || []; break;
      case 'ofertas': base = productoActual ? (productoActual.ofertas || []) : []; break;
      case 'ofertas_upsell':
        // Los upsells ya no son un bloque de ficha. Gesicomm los muestra como
        // una etapa del checkout, después de que el cliente completa sus datos.
        return [];
      case 'ofertas_bump':
      case 'ofertas_pack':
        var estrategia = { ofertas_bump: 'order_bump', ofertas_pack: 'normal' }[nombre];
        base = (productoActual ? (productoActual.ofertas || []) : []).filter(function (o) { return o.estrategia === estrategia; });
        break;
      case 'variantes': base = productoActual ? (productoActual.variantes || []) : []; break;
      // (solo ficha) contenido del producto cargado en Productos → Vista del producto.
      case 'beneficios': base = productoActual ? (productoActual.beneficios || []) : []; break;
      case 'confianza': base = productoActual ? (productoActual.confianza || []) : []; break;
      case 'preguntas': base = productoActual ? (productoActual.preguntas || []) : []; break;
      // (solo ficha de un combo) cada producto que trae, con su precio suelto.
      case 'combo_incluye': base = productoActual ? (productoActual.combo_incluye || []) : []; break;
      // (solo ficha) 1 unidad + los paquetes: el selector de cantidad/precio.
      case 'paquetes': base = paquetesDelProducto().length ? opcionesDePaquete() : []; break;
      case 'imagenes': base = productoActual ? (productoActual.imagenes_url || []) : []; break;
      case 'botones_pago_producto': base = botonesPagoProducto(); break;
      case 'metodos_pago_producto': base = metodosPagoProducto(); break;
      case 'incluye_pedido_producto': base = incluyePedidoProducto(); break;
      case 'botones_contacto_producto': base = contactosProducto(); break;
      case 'opiniones_producto': base = opinionesProducto(); break;
      // Prueba social cuantitativa cargada en "Configurar venta" (venta.prueba_social.items):
      // en modo "demo" son valores de ejemplo de la IA, en "confirmado" son los reales del
      // comercio — el runtime los pinta igual en los dos casos, la diferencia es de negocio.
      case 'estadisticas':
        base = datoAplicaAlProducto(datos.venta && datos.venta.prueba_social) ? (datos.venta.prueba_social.items || []) : [];
        break;
      default: base = [];
    }
    if (datos.vista !== 'producto' && ['productos', 'combos', 'solo_productos', 'productos_ofertas', 'productos_novedades', 'productos_seccion'].indexOf(nombre) !== -1) {
      base = base.filter(function (p) { return p.mostrar_en_inicio !== false; });
    }
    var categoria = el.getAttribute('data-gesicomm-categoria');
    if (categoria && nombre.indexOf('ofertas') !== 0 && !LISTAS_DE_DATOS[nombre] && nombre !== 'variantes' && nombre !== 'imagenes') {
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
      if (nombre === 'productos_seccion') {
        var secVacia = el.closest('[data-gesicomm-seccion-id]');
        if (secVacia) secVacia.style.display = 'none';
      }
      if (el.getAttribute('data-gesicomm-si-vacio') !== 'mostrar') el.style.display = 'none';
      return;
    }
    el.style.display = '';
    if (nombre === 'productos_seccion') {
      var secLlena = el.closest('[data-gesicomm-seccion-id]');
      if (secLlena) secLlena.style.display = '';
    }

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
        } else if (nombre === LISTA_PAQUETES) {
          var elegido = String(elemento.id) === String(paqueteElegido || 'unidad');
          h.setAttribute('data-gesicomm-paquete', elemento.id);
          h.setAttribute('role', 'radio');
          h.setAttribute('aria-checked', elegido ? 'true' : 'false');
          h.classList.toggle('is-selected', elegido);
          h.classList.toggle('is-destacado', !!elemento.destacado);
          bindDentro(h, elemento);
        } else if (LISTAS_DE_DATOS[nombre]) {
          // No son productos: no se compran ni se abren (salvo un producto
          // del combo que esté en la landing, que abre su ficha).
          if (elemento.content_id) h.setAttribute('data-gesicomm-item', elemento.content_id);
          if (nombre === 'categorias') h.setAttribute('data-gesicomm-categoria-ir', elemento.nombre);
          if (nombre === 'menu_categorias') h.setAttribute('data-gesicomm-categoria-ir', elemento.nombre);
          if (nombre === 'secciones_inicio') h.setAttribute('data-gesicomm-seccion-id', elemento.id);
          if (nombre === 'categorias') prepararTarjetaColeccion(h, elemento);
          if (nombre === 'botones_pago_producto') {
            h.setAttribute('data-gesicomm-accion-pago', elemento.tipo || 'checkout');
            h.setAttribute('data-gesicomm-valor-pago', elemento.valor || '');
            if (elemento.payment_method) h.setAttribute('data-gesicomm-metodo-pago', elemento.payment_method);
          }
          if (nombre === 'botones_contacto_producto') {
            h.setAttribute('data-gesicomm-accion-contacto', elemento.tipo || 'whatsapp');
            h.setAttribute('data-gesicomm-valor-contacto', elemento.valor || '');
          }
          bindDentro(h, elemento);
        } else if (nombre === 'imagenes') {
          bindDentro(h, { imagen: elemento, nombre: (productoActual && productoActual.nombre) || '' });
          h.setAttribute('data-gesicomm-imagen-idx', String(idx));
        } else {
          h.setAttribute('data-gesicomm-item', elemento.id);
          if (!h.hasAttribute('data-gesicomm-ver')
            && !h.hasAttribute('data-gesicomm-comprar')
            && !h.hasAttribute('data-gesicomm-agregar')
            && !h.hasAttribute('data-gesicomm-checkout')) {
            h.setAttribute('data-gesicomm-ver', '');
          }
          if (elemento.agotado) h.setAttribute('data-agotado', '');
          bindDentro(h, elemento);
          prepararTarjetaProducto(h, elemento);
        }
      });
      frag.appendChild(clon);
    });
    tpl.parentNode.insertBefore(frag, tpl);
    var anidadas = el.querySelectorAll('[data-gesicomm-generado] [data-gesicomm-lista]');
    for (var n = 0; n < anidadas.length; n++) renderizarLista(anidadas[n]);
  }

  // Una lista vacía se oculta sola, pero su título vive AFUERA del elemento
  // con data-gesicomm-lista, así que quedaba "Elegí tu oferta" o "Agregá a
  // tu compra" flotando sin nada debajo en los productos sin ofertas. Acá se
  // oculta la sección entera, pero solo si su ÚNICO contenido son listas que
  // quedaron vacías: si tiene texto propio, un botón de compra o un bind
  // suelto, la sección se respeta porque está mostrando algo.
  function ocultarSeccionesVacias() {
    var secciones = document.querySelectorAll('section, article, aside');
    for (var i = 0; i < secciones.length; i++) {
      var sec = secciones[i];
      var listas = sec.querySelectorAll('[data-gesicomm-lista]');
      if (!listas.length) continue;
      var algunaConDatos = false;
      for (var j = 0; j < listas.length; j++) {
        if (listas[j].style.display !== 'none') { algunaConDatos = true; break; }
      }
      if (algunaConDatos) { sec.style.display = ''; continue; }
      // ¿Hay algo vivo fuera de esas listas? (un CTA, un dato del producto)
      var vivos = sec.querySelectorAll('[data-gesicomm-comprar], [data-gesicomm-agregar], [data-gesicomm-bind], [data-gesicomm-venta], [data-gesicomm-form], [data-gesicomm-whatsapp]');
      var hayVivoAfuera = false;
      for (var k = 0; k < vivos.length; k++) {
        if (!vivos[k].closest('[data-gesicomm-lista]')) { hayVivoAfuera = true; break; }
      }
      sec.style.display = hayVivoAfuera ? '' : 'none';
    }
  }

  function aplicarVisibilidadFicha() {
    if (!productoActual) return;
    var bloques = productoActual.ficha_bloques || {};
    var els = document.querySelectorAll('[data-gesicomm-ficha-bloque]');
    for (var i = 0; i < els.length; i++) {
      var clave = els[i].getAttribute('data-gesicomm-ficha-bloque');
      // Atributo y no style.display: el display lo manejan también las
      // listas vacías y data-gesicomm-si; pisarlo con '' re-mostraba los
      // logos de pago apagados o la lista de métodos vacía.
      els[i].toggleAttribute('data-gesicomm-ficha-oculto', bloques[clave] === false);
    }
  }

  var fichaOrdenParents = [];
  function registrarOrdenOriginalFicha(parent) {
    if (!parent || parent.__gesicommFichaOrdenOriginal) return;
    parent.__gesicommFichaOrdenOriginal = Array.prototype.slice.call(parent.children);
    fichaOrdenParents.push(parent);
  }

  function restaurarOrdenOriginalFicha() {
    for (var i = 0; i < fichaOrdenParents.length; i++) {
      var parent = fichaOrdenParents[i];
      var original = parent && parent.__gesicommFichaOrdenOriginal;
      if (!parent || !original) continue;
      for (var j = 0; j < original.length; j++) {
        if (original[j] && original[j].parentNode === parent) parent.appendChild(original[j]);
      }
    }
  }

  function claveFichaDeNodo(nodo) {
    if (!nodo || !nodo.getAttribute) return '';
    return nodo.getAttribute('data-gesicomm-ficha-bloque') || '';
  }

  function ordenarHijosFichaMobile(parent, orden) {
    if (!parent || !orden || !orden.length) return;
    registrarOrdenOriginalFicha(parent);
    var hijos = Array.prototype.slice.call(parent.children);
    var usados = [];
    var mover = [];
    for (var i = 0; i < orden.length; i++) {
      for (var j = 0; j < hijos.length; j++) {
        if (usados.indexOf(hijos[j]) >= 0) continue;
        if (claveFichaDeNodo(hijos[j]) === orden[i]) {
          usados.push(hijos[j]);
          mover.push(hijos[j]);
        }
      }
    }
    if (!mover.length) return;
    for (var k = 0; k < mover.length; k++) parent.appendChild(mover[k]);
  }

  function aplicarOrdenMobileFicha() {
    if (!productoActual) return;
    var orden = Array.isArray(productoActual.ficha_orden_mobile) ? productoActual.ficha_orden_mobile : [];
    var esMobile = false;
    try { esMobile = window.matchMedia && window.matchMedia('(max-width: 760px)').matches; } catch (err) { esMobile = window.innerWidth <= 760; }
    if (!esMobile || !orden.length) {
      restaurarOrdenOriginalFicha();
      return;
    }
    ordenarHijosFichaMobile(document.querySelector('.pdp-info'), orden);
    ordenarHijosFichaMobile(document.body, orden);
  }

  function renderizar() {
    var listas = document.querySelectorAll('[data-gesicomm-lista]');
    for (var i = 0; i < listas.length; i++) renderizarLista(listas[i]);
    ocultarSeccionesVacias();
    // data-gesicomm-si="campo": el bloque se ve solo si el producto de la
    // ficha tiene ese dato (ej. "Por separado: …" solo en combos).
    if (productoActual) productoActual.tiene_paquetes = paquetesDelProducto().length > 0 && !!document.querySelector('[data-gesicomm-lista="paquetes"]');
    var inversos = document.querySelectorAll('[data-gesicomm-sin]');
    for (var r = 0; r < inversos.length; r++) {
      var datoInv = productoActual ? productoActual[inversos[r].getAttribute('data-gesicomm-sin')] : null;
      var hayInv = Array.isArray(datoInv) ? datoInv.length > 0 : !!datoInv;
      inversos[r].style.display = hayInv ? 'none' : '';
    }
    var condicionales = document.querySelectorAll('[data-gesicomm-si]');
    for (var q = 0; q < condicionales.length; q++) {
      var dato = productoActual ? productoActual[condicionales[q].getAttribute('data-gesicomm-si')] : null;
      var hayDato = Array.isArray(dato) ? dato.length > 0 : (dato !== null && dato !== undefined && dato !== '' && dato !== 0 && dato !== false);
      condicionales[q].style.display = hayDato ? '' : 'none';
    }
    aplicarVisibilidadFicha();
    aplicarOrdenMobileFicha();
    // Binds sueltos (fuera de listas): el producto de la ficha, o el que
    // declare data-gesicomm-item="content_id" en un ancestro. Eso último es
    // lo que hace posible un bloque "producto protagonista" en el INICIO
    // (hero con la foto y el precio de un producto), donde no hay ficha
    // abierta y antes esos binds quedaban vacíos — una <img> sin src.
    var sueltos = document.querySelectorAll('[data-gesicomm-bind]');
    for (var j = 0; j < sueltos.length; j++) {
      // Lo de una tarjeta generada ya lo pintó su lista. El rótulo y título
      // de sección (Beneficios, Opiniones, Preguntas) viven dentro del
      // envoltorio con data-gesicomm-lista pero son de la ficha: van acá.
      if (sueltos[j].closest('[data-gesicomm-generado]')) continue;
      var contItem = sueltos[j].closest('[data-gesicomm-item]');
      var itemSuelto = contItem ? buscar(contItem.getAttribute('data-gesicomm-item')) : productoActual;
      if (!itemSuelto) continue;
      aplicarBind(sueltos[j], itemSuelto, itemSuelto === productoActual ? { variante: varianteElegida } : undefined);
    }
    aplicarVisibilidadFicha();
    aplicarOrdenMobileFicha();
    // La ficha base también existe como HTML guardado: evita un bloque de
    // "Detalles" vacío cuando el producto no tiene descripción cargada.
    var descripciones = document.querySelectorAll('section.description');
    for (var d = 0; d < descripciones.length; d++) {
      var textos = descripciones[d].querySelectorAll('.description-body[data-gesicomm-bind]');
      if (!textos.length) continue;
      var hayDescripcion = false;
      for (var t = 0; t < textos.length; t++) {
        if (textos[t].style.display !== 'none' && textos[t].textContent.trim()) hayDescripcion = true;
      }
      descripciones[d].style.display = hayDescripcion ? '' : 'none';
      if (descripciones[d].id === 'descripcion') {
        var enlacesDetalle = document.querySelectorAll('a[href="#descripcion"]');
        for (var e = 0; e < enlacesDetalle.length; e++) enlacesDetalle[e].style.display = hayDescripcion ? '' : 'none';
      }
    }
    pintarControlesCatalogo();
    pintarCheckout();
    pintarGeografia();
    pintarTotal();
    var marcas = document.querySelectorAll('[data-gesicomm-tienda]');
    for (var k = 0; k < marcas.length; k++) {
      var campo = marcas[k].getAttribute('data-gesicomm-tienda');
      var val = datos.tienda ? datos.tienda[campo] : '';
      if (campo === 'logo') {
        var src = urlSegura(val);
        if (src && marcas[k].tagName === 'IMG') {
          marcas[k].src = src;
          marcas[k].style.display = '';
        } else {
          marcas[k].removeAttribute('src');
          marcas[k].style.display = 'none';
        }
      } else if (val) {
        marcas[k].textContent = String(val);
      } else {
        marcas[k].style.display = 'none';
      }
    }
    var categoriaEls = document.querySelectorAll('[data-gesicomm-categoria]');
    for (var ce = 0; ce < categoriaEls.length; ce++) {
      var campoCat = categoriaEls[ce].getAttribute('data-gesicomm-categoria');
      var valCat = datos.categoria ? datos.categoria[campoCat] : '';
      categoriaEls[ce].textContent = valCat || '';
      categoriaEls[ce].style.display = valCat ? '' : 'none';
    }
    pintarRedes();
    pintarContactoFlotante();
    aplicarEncabezadoInicio();
    prepararMenuPrincipalHeader();
    prepararMenuCategoriasHeader();
  }

  function actualizarDatos(nuevosDatos) {
    if (!nuevosDatos || typeof nuevosDatos !== 'object') return;
    var mismaVista = String((datos && datos.vista) || '') === String(nuevosDatos.vista || '');
    var conservarScroll = mismaVista ? (window.pageYOffset || document.documentElement.scrollTop || 0) : null;
    var raiz = document.documentElement;
    var overflowAnchorPrevio = raiz.style.overflowAnchor;
    if (mismaVista) raiz.style.overflowAnchor = 'none';
    datos = nuevosDatos;
    productos = Array.isArray(datos.productos) ? datos.productos : [];
    productoActual = datos.producto || null;
    metaCatalogo = datos.catalogo || {};
    paginado = !!metaCatalogo.paginado;
    porPagina = metaCatalogo.por_pagina || metaCatalogo.porPagina || 20;
    filtros.categoria = datos.categoria && datos.categoria.nombre ? datos.categoria.nombre : filtros.categoria;
    paginasTienda = datos.paginas || {};
    catalogoVista = {
      items: productos.slice(),
      pagina: 1,
      totalPaginas: 1,
      total: metaCatalogo.total || productos.length,
      categorias: [],
      marcas: [],
      etiquetas: [],
      cargando: false,
    };
    conocidos = productos.slice();
    if (!paginado) aplicarLocal();
    renderizar();
    prepararCountdowns();
    prepararHeroBanners();
    pintarVenta();
    prepararEnlacesTienda();
    prepararFiltrosCatalogo();
    prepararMenuPrincipalHeader();
    prepararMenuCategoriasHeader();
    pintarProductosCategoria();
    aplicarBloquesInicio();
    if (paginado && document.querySelector('[data-gesicomm-lista="catalogo"]')) pedirPagina('reemplazar');
    if (conservarScroll !== null) {
      try { window.scrollTo(0, conservarScroll); } catch (err) { /* noop */ }
      setTimeout(function () {
        try { window.scrollTo(0, conservarScroll); } catch (err) { /* noop */ }
        raiz.style.overflowAnchor = overflowAnchorPrevio;
      }, 0);
    }
    if (window.Gesicomm) {
      window.Gesicomm.datos = datos;
      window.Gesicomm.vista = datos.vista || 'inicio';
      window.Gesicomm.tienda = datos.tienda || {};
      window.Gesicomm.productos = productos;
      window.Gesicomm.catalogo = catalogoVista;
      window.Gesicomm.carrito = datos.carrito || { items: [], cantidad: 0, subtotal: 0, total: 0 };
      window.Gesicomm.producto = productoActual;
      window.Gesicomm.recomendados = datos.recomendados || [];
    }
  }

  // ─── Redes de la tienda (data-gesicomm-redes) ─────────────────────────
  // Salen de Mi Tienda / onboarding: la landing no las vuelve a pedir. Un
  // link por red cargada, con la clase "gc-red gc-red--instagram" para que
  // el diseño los estile; sin ninguna, el contenedor se oculta.
  var REDES = [
    ['whatsapp', 'WhatsApp', function (v) { var n = v.replace(/\D/g, '').replace(/^0/, '595'); return n ? 'https://wa.me/' + n : ''; }],
    ['instagram', 'Instagram', function (v) { return 'https://instagram.com/' + v.replace(/^@/, ''); }],
    ['facebook', 'Facebook', function (v) { return 'https://facebook.com/' + v.replace(/^@/, ''); }],
    ['tiktok', 'TikTok', function (v) { return 'https://tiktok.com/@' + v.replace(/^@/, ''); }],
    ['youtube', 'YouTube', function (v) { return 'https://youtube.com/@' + v.replace(/^@/, ''); }],
    ['twitter', 'X', function (v) { return 'https://x.com/' + v.replace(/^@/, ''); }],
  ];
  var ICONOS_RED = {
    whatsapp: '<path d="M3 21l1.3-4.2A8.5 8.5 0 1 1 8 19.7L3 21z"></path><path d="M8.7 9.3c0 3.4 2.9 6.2 6.2 6.2.6 0 .9-.3.9-.9v-1c0-.3-.2-.5-.5-.6l-1.8-.5c-.3-.1-.5 0-.7.2l-.4.5a5 5 0 0 1-2.4-2.4l.5-.4c.2-.2.3-.4.2-.7l-.5-1.8c-.1-.3-.3-.5-.6-.5h-1c-.6 0-.9.4-.9.9z"></path>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>',
    tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"></rect><path d="M10 9.5v5l4.5-2.5-4.5-2.5z" fill="currentColor" stroke="none"></path>',
    twitter: '<path d="M4 4l7.5 9.5L4.5 20H7l5.8-6.4L17.5 20H20l-8-10L19 4h-2.5l-5.2 5.8L7 4H4z" fill="currentColor" stroke="none"></path>',
    email: '<path d="M4 4h16v16H4z"></path><path d="m22 6-10 7L2 6"></path>',
    telefono: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.6 2.61a2 2 0 0 1-.45 2.11L8 9.7a16 16 0 0 0 6.3 6.3l1.26-1.26a2 2 0 0 1 2.11-.45c.84.28 1.71.48 2.61.6A2 2 0 0 1 22 16.92z"></path>',
  };
  function urlRed(red, valor) {
    var v = String(valor || '').trim();
    if (!v) return '';
    if (/^https:\/\/[^\s"'<>]+$/i.test(v)) return v;
    // WhatsApp se reduce a dígitos. Un usuario (@tienda) nunca lleva ":" ni
    // espacios: lo que los tenga y no sea https se descarta.
    if (red[0] !== 'whatsapp' && /[:\s"'<>]/.test(v)) return '';
    return red[2](v);
  }
  function pintarRedes() {
    var contenedores = document.querySelectorAll('[data-gesicomm-redes]');
    if (!contenedores.length) return;
    var tienda = datos.tienda || {};
    for (var i = 0; i < contenedores.length; i++) {
      var c = contenedores[i];
      while (c.firstChild) c.removeChild(c.firstChild);
      var hay = 0;
      for (var r = 0; r < REDES.length; r++) {
        var href = urlRed(REDES[r], tienda[REDES[r][0]]);
        if (!href) continue;
        // El WhatsApp del pie llevaba el chat vacío: el cliente abría la
        // conversación sin nada escrito y le aparecía el borrador que
        // hubiera quedado de antes. Ahora va con el mismo mensaje que el
        // botón de consulta, que es el que configuró el comercio.
        if (REDES[r][0] === 'whatsapp') {
          href += (href.indexOf('?') === -1 ? '?' : '&') + 'text=' + encodeURIComponent(mensajeWhatsapp());
        }
        var a = document.createElement('a');
        a.className = 'gc-red gc-red--' + REDES[r][0];
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = REDES[r][1];
        a.setAttribute('aria-label', REDES[r][1]);
        a.innerHTML = '<svg class="gc-red__icon" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONOS_RED[REDES[r][0]] || '') + '</svg><span class="gc-red__label">' + REDES[r][1] + '</span>';
        c.appendChild(a);
        hay++;
      }
      c.style.display = hay ? '' : 'none';
    }
  }

  function canalContactoPreferido() {
    var tienda = datos.tienda || {};
    var preferido = String(tienda.canal_contacto || 'whatsapp').toLowerCase();
    var orden = [preferido, 'whatsapp', 'telefono', 'instagram', 'email'];
    for (var i = 0; i < orden.length; i++) {
      var canal = orden[i];
      if (canal === 'email' && tienda.email) return ['email', 'Email', 'mailto:' + tienda.email];
      if (canal === 'telefono' && tienda.telefono) return ['telefono', 'Teléfono', 'tel:' + String(tienda.telefono).replace(/\D/g, '')];
      if (canal === 'instagram' && tienda.instagram) {
        var instagramHref = urlRed(REDES[1], tienda.instagram);
        if (instagramHref) return ['instagram', 'Instagram', instagramHref];
      }
      if (canal === 'whatsapp' && tienda.whatsapp) {
        var href = urlRed(REDES[0], tienda.whatsapp);
        if (href) href += (href.indexOf('?') === -1 ? '?' : '&') + 'text=' + encodeURIComponent(mensajeWhatsapp());
        return ['whatsapp', 'WhatsApp', href];
      }
    }
    return null;
  }

  function pintarContactoFlotante() {
    var actual = document.querySelector('[data-gesicomm-contacto-flotante]');
    var canal = canalContactoPreferido();
    if (!canal) {
      if (actual) actual.remove();
      return;
    }
    if (!actual) {
      actual = document.createElement('a');
      actual.setAttribute('data-gesicomm-contacto-flotante', '');
      actual.className = 'gc-contact-float';
      document.body.appendChild(actual);
    }
    actual.className = 'gc-contact-float gc-contact-float--' + canal[0];
    actual.href = canal[2] || '#contacto';
    actual.title = canal[1];
    actual.setAttribute('aria-label', canal[1]);
    actual.innerHTML = '<svg class="gc-contact-float__icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONOS_RED[canal[0]] || ICONOS_RED.whatsapp) + '</svg><span class="gc-contact-float__label">' + canal[1] + '</span>';
  }

  // ─── Catálogo: filtros, páginas y pedidos al servidor ─────────────────
  function etiquetasDe(item) {
    return String(item.etiqueta || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
  }

  function tieneEtiqueta(item, etiqueta) {
    var buscada = normalizar(etiqueta);
    return etiquetasDe(item).some(function (t) { return normalizar(t) === buscada; });
  }

  function agregarEtiquetaUnica(lista, etiqueta) {
    var limpia = String(etiqueta || '').trim();
    if (!limpia) return;
    for (var i = 0; i < lista.length; i++) if (normalizar(lista[i]) === normalizar(limpia)) return;
    lista.push(limpia);
  }

  function etiquetasDisponiblesCatalogo(lista) {
    var etiquetas = [];
    (lista || []).forEach(function (p) {
      etiquetasDe(p).forEach(function (t) { agregarEtiquetaUnica(etiquetas, t); });
      if (Number(p.descuento_pct) > 0 || Number(p.precio_antes) > Number(p.precio)) agregarEtiquetaUnica(etiquetas, 'Oferta');
    });
    var orden = { oferta: 0, novedades: 1, 'mas vendidos': 2 };
    return etiquetas.sort(function (a, b) {
      var na = normalizar(a);
      var nb = normalizar(b);
      var oa = Object.prototype.hasOwnProperty.call(orden, na) ? orden[na] : 20;
      var ob = Object.prototype.hasOwnProperty.call(orden, nb) ? orden[nb] : 20;
      return oa === ob ? String(a).localeCompare(String(b), 'es') : oa - ob;
    });
  }

  function textoEtiquetaFiltro(etiqueta) {
    var n = normalizar(etiqueta);
    if (n === 'oferta') return 'Ofertas';
    if (n === 'novedades') return 'Novedades';
    if (n === 'mas vendidos') return 'Más vendidos';
    return etiqueta;
  }

  function productoPasaEtiqueta(item, etiqueta) {
    if (!etiqueta) return true;
    if (normalizar(etiqueta) === 'oferta') return Number(item.descuento_pct) > 0 || Number(item.precio_antes) > Number(item.precio) || tieneEtiqueta(item, etiqueta);
    return tieneEtiqueta(item, etiqueta);
  }

  function prepararFiltrosCatalogo() {
    var lista = document.querySelector('[data-gesicomm-lista="catalogo"]');
    if (!lista) return;
    // Busca una barra ya creada por una pasada anterior (gc-catalog-controls)
    // o una propia del template del comercio (catalog-toolbar); si no existe
    // ninguna, recién ahí crea una — si no, cada repintado (cada tecla que
    // se tipea en el editor) apilaba una barra vacía nueva arriba de la
    // grilla, porque la creada acá nunca tenía la clase que este mismo
    // selector buscaba.
    var barra = document.querySelector('.catalog-toolbar, .gc-catalog-controls');
    if (!barra) {
      barra = document.createElement('div');
      lista.parentNode.insertBefore(barra, lista);
    }
    barra.classList.add('gc-catalog-controls');
    var opciones = [
      ['categoria', 'Categoría', 'Todas las categorías'], ['disponibilidad', 'Disponibilidad', 'Toda disponibilidad'],
      ['orden', 'Ordenar', 'Destacados'],
    ];
    opciones.forEach(function (def) {
      if (document.querySelector('[data-gesicomm-filtro="' + def[0] + '"]')) return;
      var select = document.createElement('select');
      select.className = 'catalog-select';
      select.setAttribute('aria-label', def[1]);
      select.setAttribute('data-gesicomm-filtro', def[0]);
      var valores = def[0] === 'orden' ? [['', def[2]], ['min-max', 'Menor precio'], ['max-min', 'Mayor precio'], ['az', 'A → Z'], ['za', 'Z → A']]
        : def[0] === 'disponibilidad' ? [['todos', def[2]], ['en_stock', 'En stock'], ['agotado', 'Agotados']] : [['', def[2]]];
      valores.forEach(function (v) { var o = document.createElement('option'); o.value = v[0]; o.textContent = v[1]; select.appendChild(o); });
      barra.appendChild(select);
    });
    [['buscador', 'Buscar productos'], ['precioMin', 'Precio mínimo'], ['precioMax', 'Precio máximo']].forEach(function (def) {
      var selector = def[0] === 'buscador' ? '[data-gesicomm-buscar]' : '[data-gesicomm-filtro="' + def[0] + '"]';
      if (document.querySelector(selector)) return;
      var input = document.createElement('input');
      input.className = 'catalog-search';
      input.type = def[0] === 'buscador' ? 'search' : 'number';
      if (input.type === 'number') { input.min = '0'; input.step = '1'; }
      input.placeholder = def[1]; input.setAttribute('aria-label', def[1]);
      input.setAttribute(def[0] === 'buscador' ? 'data-gesicomm-buscar' : 'data-gesicomm-filtro', def[0] === 'buscador' ? '' : def[0]);
      barra.appendChild(input);
    });
    var configuracion = (datos.venta && datos.venta.catalogo_filtros) || {};
    var controles = document.querySelectorAll('[data-gesicomm-buscar], [data-gesicomm-filtro]');
    for (var i = 0; i < controles.length; i++) {
      var campo = controles[i].hasAttribute('data-gesicomm-buscar') ? 'buscador' : controles[i].getAttribute('data-gesicomm-filtro');
      if (controles[i].tagName === 'SELECT' && ['categoria', 'marca', 'etiqueta'].indexOf(campo) !== -1 && controles[i].options.length) controles[i].options[0].value = '';
      if (campo === 'precioMin' || campo === 'precioMax') campo = 'precio';
      if (campo === 'soloDescuento') campo = 'promociones';
      var objetivo = controles[i].closest('[data-gesicomm-control]') || controles[i];
      objetivo.style.display = configuracion[campo] === false ? 'none' : '';
    }
  }

  function cerrarBuscadorHeader() {
    var wrap = document.querySelector('.commerce-header .search-wrap');
    var panel = document.querySelector('#gesicomm-search-panel, .commerce-header .search-box');
    var toggle = document.querySelector('[data-gesicomm-search-toggle]');
    var resultados = document.querySelector('[data-gesicomm-search-results]');
    if (wrap) wrap.classList.remove('is-open');
    if (!panel) return;
    panel.hidden = true;
    if (resultados) resultados.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function panelResultadosHeader(wrap) {
    var panel = wrap && wrap.querySelector('[data-gesicomm-search-results]');
    if (!panel && wrap) {
      panel = document.createElement('div');
      panel.className = 'search-results';
      panel.setAttribute('data-gesicomm-search-results', '');
      panel.hidden = true;
      wrap.appendChild(panel);
    }
    return panel;
  }

  function resultadosBusquedaHeader(q) {
    var termino = normalizar(q).trim();
    if (termino.length < 2) return [];
    var vistos = {};
    var base = conocidos.concat(productos);
    var salida = [];
    for (var i = 0; i < base.length; i++) {
      var p = base[i];
      if (!p || !p.id || vistos[p.id]) continue;
      vistos[p.id] = true;
      var texto = normalizar((p.nombre || '') + ' ' + (p.categoria || '') + ' ' + (p.marca || '') + ' ' + (p.etiqueta || ''));
      if (texto.indexOf(termino) === -1) continue;
      salida.push(p);
      if (salida.length >= 6) break;
    }
    return salida;
  }

  function pintarResultadosHeader(input) {
    var wrap = input && input.closest ? input.closest('.commerce-header .search-wrap') : null;
    var panel = panelResultadosHeader(wrap);
    if (!panel) return;
    var items = resultadosBusquedaHeader(input.value || '');
    panel.textContent = '';
    if (!items.length) { panel.hidden = true; return; }
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-result-item';
      btn.setAttribute('data-gesicomm-search-result', item.id);
      var img = document.createElement('img');
      img.className = 'search-result-thumb';
      img.alt = '';
      var src = urlSegura(item.imagen || item.url_imagen || '');
      if (src) img.src = src;
      var copy = document.createElement('span');
      var nombre = document.createElement('strong');
      nombre.className = 'search-result-name';
      nombre.textContent = item.nombre || 'Producto';
      var meta = document.createElement('span');
      meta.className = 'search-result-meta';
      meta.textContent = [formatoPrecio(precioDe(item, null)), item.categoria || ''].filter(Boolean).join(' · ');
      copy.appendChild(nombre);
      copy.appendChild(meta);
      btn.appendChild(img);
      btn.appendChild(copy);
      panel.appendChild(btn);
    }
    panel.hidden = false;
  }

  function prepararBuscadorHeader() {
    var wrap = document.querySelector('.commerce-header .search-wrap');
    var toggle = wrap && wrap.querySelector('[data-gesicomm-search-toggle]');
    var panel = wrap && (wrap.querySelector('#gesicomm-search-panel') || wrap.querySelector('.search-box'));
    if (!toggle || !panel || toggle.getAttribute('data-gesicomm-search-ready') === 'true') return;
    toggle.setAttribute('data-gesicomm-search-ready', 'true');
    panelResultadosHeader(wrap);
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      var abrir = panel.hidden === true;
      panel.hidden = !abrir;
      if (wrap) wrap.classList.toggle('is-open', abrir);
      toggle.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      if (abrir) {
        var input = panel.querySelector('[data-gesicomm-buscar], input[type="search"]');
        if (input && input.focus) input.focus();
        if (input) pintarResultadosHeader(input);
      } else {
        var resultados = panelResultadosHeader(wrap);
        if (resultados) resultados.hidden = true;
      }
    }, true);
  }

  function categoriaFiltroEfectiva() {
    return filtros.categoria || '';
  }

  function actualizarTituloCategoria() {
    var titulo = filtros.categoria || (datos.vista === 'categoria' && datos.categoria && datos.categoria.nombre) || 'Todos los productos';
    var nodos = document.querySelectorAll('[data-gesicomm-categoria="nombre"]');
    for (var i = 0; i < nodos.length; i++) nodos[i].textContent = titulo;
  }
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
    var categoriaActiva = categoriaFiltroEfectiva();
    var lista = productos.filter(function (p) {
      if (datos.vista === 'inicio' && p.mostrar_en_inicio === false) return false;
      if (categoriaActiva && p.categoria !== categoriaActiva) return false;
      if (filtros.marca && p.marca !== filtros.marca) return false;
      if (filtros.etiqueta && !productoPasaEtiqueta(p, filtros.etiqueta)) return false;
      if (filtros.precioMin !== '' && Number(p.precio) < Number(filtros.precioMin)) return false;
      if (filtros.precioMax !== '' && Number(p.precio) > Number(filtros.precioMax)) return false;
      if (filtros.disponibilidad === 'en_stock' && p.stock != null && Number(p.stock) <= 0) return false;
      if (filtros.disponibilidad === 'agotado' && !(p.stock != null && Number(p.stock) <= 0)) return false;
      if (filtros.soloDescuento === 'true' && !(Number(p.descuento_pct) > 0 || (Number(p.precio_antes) > Number(p.precio)))) return false;
      if (q && normalizar(p.nombre + ' ' + (p.categoria || '') + ' ' + (p.marca || '') + ' ' + (p.etiqueta || '')).indexOf(q) === -1) return false;
      return true;
    });
    var cats = [];
    productos.forEach(function (p) { if (p.categoria && cats.indexOf(p.categoria) === -1) cats.push(p.categoria); });
    catalogoVista.items = ordenar(lista);
    catalogoVista.total = lista.length;
    catalogoVista.pagina = 1;
    catalogoVista.totalPaginas = 1;
    catalogoVista.categorias = cats.sort();
    catalogoVista.marcas = productos.map(function (p) { return p.marca; }).filter(function (m, i, todos) { return m && todos.indexOf(m) === i; }).sort();
    catalogoVista.etiquetas = etiquetasDisponiblesCatalogo(productos);
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
      categoria: categoriaFiltroEfectiva(),
      marca: filtros.marca,
      etiqueta: filtros.etiqueta,
      precioMin: filtros.precioMin,
      precioMax: filtros.precioMax,
      disponibilidad: filtros.disponibilidad,
      soloDescuento: filtros.soloDescuento === 'true',
      soloInicio: datos.vista === 'inicio',
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
    prepararDropdownsCatalogo();
    actualizarTituloCategoria();
    prepararMenuCategoriasHeader();
  }

  function textoSelectCatalogo(select) {
    if (!select) return '';
    var opcion = select.options && select.options[select.selectedIndex];
    return opcion ? opcion.textContent : '';
  }

  function opcionesSelectCatalogo(select) {
    var opciones = [];
    if (!select || !select.options) return opciones;
    for (var i = 0; i < select.options.length; i++) opciones.push({ valor: select.options[i].value, texto: select.options[i].textContent });
    return opciones;
  }

  function prepararDropdownsCatalogo() {
    var selects = document.querySelectorAll('select[data-gesicomm-filtro="categoria"], select[data-gesicomm-filtro="orden"]');
    for (var i = 0; i < selects.length; i++) {
      var select = selects[i];
      var wrap = select.nextElementSibling && select.nextElementSibling.getAttribute('data-gesicomm-select-ui') === 'true' ? select.nextElementSibling : null;
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'gc-select-ui';
        wrap.setAttribute('data-gesicomm-select-ui', 'true');
        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'gc-select-ui-button';
        boton.setAttribute('aria-haspopup', 'listbox');
        boton.setAttribute('aria-expanded', 'false');
        var lista = document.createElement('div');
        lista.className = 'gc-select-ui-menu';
        lista.setAttribute('role', 'listbox');
        lista.hidden = true;
        wrap.appendChild(boton);
        wrap.appendChild(lista);
        select.parentNode.insertBefore(wrap, select.nextSibling);
        select.style.position = 'absolute';
        select.style.opacity = '0';
        select.style.pointerEvents = 'none';
        select.style.width = '1px';
        select.style.height = '1px';
      }
      var btn = wrap.querySelector('.gc-select-ui-button');
      var menu = wrap.querySelector('.gc-select-ui-menu');
      btn.textContent = textoSelectCatalogo(select);
      menu.textContent = '';
      opcionesSelectCatalogo(select).forEach(function (op) {
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'gc-select-ui-option';
        item.textContent = op.texto;
        item.setAttribute('data-gesicomm-select-value', op.valor);
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', op.valor === select.value ? 'true' : 'false');
        menu.appendChild(item);
      });
    }
  }

  function pintarFiltrosRapidosEtiquetas() {
    var contenedores = document.querySelectorAll('[data-gesicomm-filtros-etiquetas], .lv-quick-filters');
    if (!contenedores.length) return;
    var etiquetas = catalogoVista.etiquetas || [];
    for (var c = 0; c < contenedores.length; c++) {
      var cont = contenedores[c];
      cont.textContent = '';
      cont.style.display = etiquetas.length ? '' : 'none';
      for (var i = 0; i < etiquetas.length; i++) {
        var etiqueta = etiquetas[i];
        var boton = document.createElement('button');
        boton.type = 'button';
        boton.textContent = textoEtiquetaFiltro(etiqueta);
        boton.setAttribute('data-gesicomm-filtro-etiqueta', etiqueta);
        cont.appendChild(boton);
      }
    }
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
    pintarFiltrosRapidosEtiquetas();
    var filtrosEtiqueta = document.querySelectorAll('[data-gesicomm-filtro-etiqueta]');
    for (i = 0; i < filtrosEtiqueta.length; i++) {
      var activa = normalizar(filtrosEtiqueta[i].getAttribute('data-gesicomm-filtro-etiqueta')) === normalizar(filtros.etiqueta);
      filtrosEtiqueta[i].classList.toggle('is-active', activa);
      filtrosEtiqueta[i].setAttribute('aria-pressed', activa ? 'true' : 'false');
    }
    var vacios = document.querySelectorAll('[data-gesicomm-sin-resultados]');
    for (i = 0; i < vacios.length; i++) vacios[i].style.display = !v.cargando && !v.items.length ? '' : 'none';
    var selects = document.querySelectorAll('select[data-gesicomm-filtro="categoria"], select[data-gesicomm-filtro="marca"], select[data-gesicomm-filtro="etiqueta"]');
    for (i = 0; i < selects.length; i++) {
      var sel = selects[i];
      var viejas = sel.querySelectorAll('option[data-gesicomm-generado]');
      for (var o = 0; o < viejas.length; o++) sel.removeChild(viejas[o]);
      var campo = sel.getAttribute('data-gesicomm-filtro');
      (campo === 'marca' ? v.marcas : campo === 'etiqueta' ? v.etiquetas : v.categorias).forEach(function (cat) {
        var op = document.createElement('option');
        op.value = cat;
        op.textContent = cat;
        op.setAttribute('data-gesicomm-generado', '');
        sel.appendChild(op);
      });
      sel.disabled = false;
      sel.title = '';
      sel.value = filtros[campo];
    }
  }

  function pintarCheckout() {
    var resumen = datos.carrito || { cantidad: 0, subtotal: 0, total: 0, items: [] };
    var estado = datos.checkout_estado || null;
    var campos = document.querySelectorAll('[data-gesicomm-checkout]');
    var i;
    for (i = 0; i < campos.length; i++) {
      var campo = campos[i].getAttribute('data-gesicomm-checkout');
      var valor = '';
      if (campo === 'cantidad') valor = String(resumen.cantidad || 0);
      else if (campo === 'subtotal' || campo === 'total') valor = formatoPrecio(resumen[campo]);
      else if (campo === 'estado') valor = estado ? estado.estado || '' : '';
      else if (campo === 'mensaje') valor = estado ? estado.mensaje || '' : '';
      campos[i].textContent = valor;
      campos[i].style.display = valor ? '' : 'none';
    }
    var vacios = document.querySelectorAll('[data-gesicomm-checkout-vacio]');
    for (i = 0; i < vacios.length; i++) vacios[i].style.display = resumen.items && resumen.items.length ? 'none' : '';
    var llenos = document.querySelectorAll('[data-gesicomm-checkout-con-items]');
    for (i = 0; i < llenos.length; i++) llenos[i].style.display = resumen.items && resumen.items.length ? '' : 'none';
    var forms = document.querySelectorAll('form[data-gesicomm-checkout-form]');
    for (i = 0; i < forms.length; i++) {
      var botones = forms[i].querySelectorAll('button, input[type="submit"]');
      for (var b = 0; b < botones.length; b++) botones[b].disabled = !!(estado && estado.estado === 'enviando') || !(resumen.items && resumen.items.length);
    }
  }

  // Departamento + Ciudad del checkout propio: <select data-gesicomm-geografia="departamento">
  // y <select data-gesicomm-geografia="ciudad">, poblados con el catálogo real
  // de Paraguay que manda el contenedor en datos.geografia (GET /api/l/geografia,
  // el mismo catálogo que usa Courier → Nuevo pedido). Se pintan UNA sola vez
  // (dataset.gesicommPintado): son <select> con su propio estado, no una lista
  // que se vuelve a dibujar en cada render — repintar perdería lo elegido.
  function pintarGeografia() {
    var selDepto = document.querySelector('[data-gesicomm-geografia="departamento"]');
    var selCiudad = document.querySelector('[data-gesicomm-geografia="ciudad"]');
    if (!selDepto && !selCiudad) return;
    var geo = Array.isArray(datos.geografia) ? datos.geografia : [];
    if (!geo.length) return; // todavía no llegó: se reintenta en el próximo render

    function opciones(select, etiquetaVacia) {
      select.innerHTML = '';
      var vacia = document.createElement('option');
      vacia.value = '';
      vacia.textContent = etiquetaVacia;
      select.appendChild(vacia);
    }
    function pintarCiudades(nombreDepto) {
      if (!selCiudad) return;
      var previo = selCiudad.value;
      opciones(selCiudad, 'Ciudad');
      var depto = nombreDepto ? geo.find(function (d) { return d.nombre === nombreDepto; }) : null;
      var ciudades = depto
        ? (depto.ciudades || []).slice()
        : geo.reduce(function (acc, d) { return acc.concat(d.ciudades || []); }, []).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
      for (var i = 0; i < ciudades.length; i++) {
        var op = document.createElement('option');
        op.value = ciudades[i].nombre;
        op.textContent = ciudades[i].nombre;
        selCiudad.appendChild(op);
      }
      if (ciudades.some(function (c) { return c.nombre === previo; })) selCiudad.value = previo;
    }
    if (selDepto && !selDepto.dataset.gesicommPintado) {
      selDepto.dataset.gesicommPintado = '1';
      opciones(selDepto, 'Departamento');
      for (var i = 0; i < geo.length; i++) {
        var op = document.createElement('option');
        op.value = geo[i].nombre;
        op.textContent = geo[i].nombre;
        selDepto.appendChild(op);
      }
      selDepto.addEventListener('change', function () { pintarCiudades(selDepto.value); });
    }
    if (selCiudad && !selCiudad.dataset.gesicommPintado) {
      selCiudad.dataset.gesicommPintado = '1';
      pintarCiudades(selDepto ? selDepto.value : '');
    }
  }

  // "Ver dónde aparece" del paso de venta: el contenedor pide resaltar una
  // lista (ofertas, recomendados, catálogo…) y acá se la lleva a la vista.
  // scrollIntoView NO se usa en el runtime: el navegador propaga ese scroll
  // a los documentos de afuera (el editor que contiene el iframe), moviendo
  // incluso contenedores con overflow:hidden y la ventana entera. Esto solo
  // desplaza la ventana del propio iframe.
  function desplazarA(el, bloque, suave) {
    if (!el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect();
    var alto = window.innerHeight || document.documentElement.clientHeight;
    var y = window.pageYOffset + r.top;
    if (bloque === 'center') y -= Math.max(0, (alto - r.height) / 2);
    try { window.scrollTo({ top: Math.max(0, y), behavior: suave ? 'smooth' : 'auto' }); }
    catch (err) { window.scrollTo(0, Math.max(0, y)); }
  }

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
    desplazarA(el, 'center', false);
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
    if (d.tipo === 'gesicomm:datos') { actualizarDatos(d.datos); return; }
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
    if (Array.isArray(d.marcas)) catalogoVista.marcas = d.marcas;
    if (Array.isArray(d.etiquetas)) {
      catalogoVista.etiquetas = d.etiquetas.slice();
      etiquetasDisponiblesCatalogo(catalogoVista.items).forEach(function (et) { agregarEtiquetaUnica(catalogoVista.etiquetas, et); });
      catalogoVista.etiquetas = etiquetasDisponiblesCatalogo(catalogoVista.etiquetas.map(function (et) { return { etiqueta: et }; }));
    }
    repintarCatalogo();
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.matches && e.target.matches('[data-gesicomm-cantidad-input]')) pintarTotal();
    var pcBuscador = e.target && e.target.closest ? e.target.closest('[data-gesicomm-pc-buscar]') : null;
    if (pcBuscador) {
      pcBusqueda = normalizar(String(pcBuscador.value || '').slice(0, 80));
      repintarProductosCategoria();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      cerrarMenuCategorias();
      var menusSelect = document.querySelectorAll('.gc-select-ui-menu');
      for (var i = 0; i < menusSelect.length; i++) menusSelect[i].hidden = true;
      var botonesSelect = document.querySelectorAll('.gc-select-ui-button');
      for (var b = 0; b < botonesSelect.length; b++) botonesSelect[b].setAttribute('aria-expanded', 'false');
    }
  });

  var temporizadorBusqueda = null;
  document.addEventListener('input', function (e) {
    var campo = e.target && e.target.closest ? e.target.closest('[data-gesicomm-buscar], input[data-gesicomm-filtro="precioMin"], input[data-gesicomm-filtro="precioMax"]') : null;
    if (!campo) return;
    var clave = campo.hasAttribute('data-gesicomm-buscar') ? 'busqueda' : campo.getAttribute('data-gesicomm-filtro');
    filtros[clave] = String(campo.value || '').slice(0, 80);
    if (campo.closest && campo.closest('.commerce-header .search-wrap')) {
      pintarResultadosHeader(campo);
      return;
    }
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(function () {
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
      pintarTotal();
      // Sin toast: la tarjeta marcada y el total del botón ya lo confirman,
      // y el aviso flotante tapaba justo el botón de comprar.
      enviar({ tipo: 'gesicomm:evento', nombre: bump.checked ? 'OrderBumpMarcado' : 'OrderBumpDesmarcado', datos: { oferta: idBump } });
      return;
    }
    var sel = e.target && e.target.closest ? e.target.closest('[data-gesicomm-filtro]') : null;
    if (!sel) return;
    var campo = sel.getAttribute('data-gesicomm-filtro');
    if (!Object.prototype.hasOwnProperty.call(filtros, campo) || campo === 'pagina') return;
    clearTimeout(temporizadorBusqueda);
    filtros[campo] = sel.type === 'checkbox' ? (sel.checked ? 'true' : '') : String(sel.value || '');
    filtros.pagina = 1;
    actualizarCatalogo('reemplazar');
  });

  function irAlCatalogo() {
    var lista = document.querySelector('[data-gesicomm-lista="catalogo"]');
    if (lista) desplazarA(lista, 'start', true);
  }

  function filtrarCategoriaVisual(categoria) {
    filtros.categoria = String(categoria || '');
    filtros.pagina = 1;
    var selects = document.querySelectorAll('select[data-gesicomm-filtro="categoria"]');
    for (var i = 0; i < selects.length; i++) selects[i].value = filtros.categoria;
    actualizarCatalogo('reemplazar');
    irAlCatalogo();
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
    // Un paquete elegido en el selector también necesita talle/color.
    if (tieneVariantes && !variante && (!opciones.oferta || opciones.conBumps)) {
      // Desde una grilla no hay dónde elegir talle/color: se lleva a la
      // ficha, igual que el catálogo de los templates.
      if (!productoActual || productoActual.id !== item.id) { verProducto(item); return; }
      toast('Elegí una opción antes de comprar.');
      var lista = document.querySelector('[data-gesicomm-lista="variantes"]');
      if (lista) desplazarA(lista, 'center', true);
      return;
    }
    // Order bumps marcados en esta ficha: van al carrito junto con el
    // producto, antes de abrirlo, así el carrito ya los muestra.
    var bumps = [];
    if ((!opciones.oferta || opciones.conBumps) && productoActual && item.id === productoActual.id) {
      (productoActual.ofertas || []).forEach(function (o) { if (bumpsElegidos[o.id]) bumps.push(o); });
    }
    bumps.forEach(function (o) {
      enviar({ tipo: 'gesicomm:checkout', producto: item.id, cantidad: 1, variante: null, oferta: o.id, abrir: false });
    });
    var mensajeCheckout = {
      tipo: 'gesicomm:checkout',
      producto: item.id,
      cantidad: opciones.cantidad || 1,
      variante: variante ? variante.id : null,
      oferta: opciones.oferta ? opciones.oferta.id : null,
      abrir: opciones.abrir !== false,
    };
    if (opciones.payment_method) mensajeCheckout.payment_method = opciones.payment_method;
    enviar(mensajeCheckout);
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

    if ((el = t.closest('[data-gesicomm-carrito]'))) {
      e.preventDefault();
      enviar({ tipo: 'gesicomm:carrito' });
      return;
    }
    if ((el = t.closest('[data-gesicomm-checkout-ir]'))) {
      e.preventDefault();
      enviar({ tipo: 'gesicomm:navegar', destino: 'checkout' });
      return;
    }
    if ((el = t.closest('[data-gesicomm-contacto-flotante]'))) {
      var seccionContacto = document.getElementById('contacto') || document.querySelector('[data-gesicomm-bloque="contacto"]');
      enviar({ tipo: 'gesicomm:evento', nombre: 'Contact', datos: { canal: (datos.tienda && datos.tienda.canal_contacto) || 'whatsapp' } });
      if (seccionContacto) {
        e.preventDefault();
        try { seccionContacto.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (err) { seccionContacto.scrollIntoView(); }
        return;
      }
    }
    if ((el = t.closest('[data-gesicomm-categorias-toggle]'))) {
      e.preventDefault();
      var panelCategorias = document.querySelector('[data-gesicomm-menu-categorias]');
      if (!panelCategorias) return;
      var abierto = panelCategorias.hidden === true;
      panelCategorias.hidden = !abierto;
      el.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      return;
    }
    if ((el = t.closest('[data-gesicomm-search-result]'))) {
      e.preventDefault();
      verProducto(buscar(el.getAttribute('data-gesicomm-search-result')));
      cerrarBuscadorHeader();
      return;
    }
    if ((el = t.closest('[data-gesicomm-pc-categoria]'))) {
      e.preventDefault();
      pcCategoriaActiva = el.getAttribute('data-gesicomm-pc-categoria') || '';
      repintarProductosCategoria();
      return;
    }
    if (!t.closest('.category-menu-wrap')) cerrarMenuCategorias();
    if (!t.closest('.search-wrap')) cerrarBuscadorHeader();
    if (t.closest('#nav-links a')) {
      var headerNavAbierto = document.querySelector('.header-nav');
      var toggleHeader = document.querySelector('.menu-toggle');
      if (headerNavAbierto) headerNavAbierto.classList.remove('is-open');
      if (toggleHeader) toggleHeader.setAttribute('aria-expanded', 'false');
    }

    if ((el = t.closest('[data-gesicomm-select-ui] .gc-select-ui-button'))) {
      e.preventDefault();
      var wrapSelect = el.closest('[data-gesicomm-select-ui]');
      var menuSelect = wrapSelect && wrapSelect.querySelector('.gc-select-ui-menu');
      var abrirSelect = menuSelect && menuSelect.hidden;
      var abiertos = document.querySelectorAll('.gc-select-ui-menu');
      for (var as = 0; as < abiertos.length; as++) abiertos[as].hidden = true;
      var botonesSelect = document.querySelectorAll('.gc-select-ui-button');
      for (var bs = 0; bs < botonesSelect.length; bs++) botonesSelect[bs].setAttribute('aria-expanded', 'false');
      if (menuSelect) { menuSelect.hidden = !abrirSelect; el.setAttribute('aria-expanded', abrirSelect ? 'true' : 'false'); }
      return;
    }
    if ((el = t.closest('[data-gesicomm-select-ui] [data-gesicomm-select-value]'))) {
      e.preventDefault();
      var wrapOpcion = el.closest('[data-gesicomm-select-ui]');
      var selectOriginal = wrapOpcion && wrapOpcion.previousElementSibling;
      if (selectOriginal && selectOriginal.matches && selectOriginal.matches('select[data-gesicomm-filtro]')) {
        selectOriginal.value = el.getAttribute('data-gesicomm-select-value');
        selectOriginal.dispatchEvent(new window.Event('change', { bubbles: true }));
      }
      var menuOpcion = wrapOpcion && wrapOpcion.querySelector('.gc-select-ui-menu');
      var botonOpcion = wrapOpcion && wrapOpcion.querySelector('.gc-select-ui-button');
      if (menuOpcion) menuOpcion.hidden = true;
      if (botonOpcion) botonOpcion.setAttribute('aria-expanded', 'false');
      return;
    }
    if (!t.closest('[data-gesicomm-select-ui]')) {
      var menusSelectClick = document.querySelectorAll('.gc-select-ui-menu');
      for (var ms = 0; ms < menusSelectClick.length; ms++) menusSelectClick[ms].hidden = true;
      var botonesCerrar = document.querySelectorAll('.gc-select-ui-button');
      for (var bc = 0; bc < botonesCerrar.length; bc++) botonesCerrar[bc].setAttribute('aria-expanded', 'false');
    }

    if ((el = t.closest('[data-gesicomm-filtro-etiqueta]'))) {
      e.preventDefault();
      var etiquetaRapida = el.getAttribute('data-gesicomm-filtro-etiqueta') || '';
      filtros.etiqueta = normalizar(filtros.etiqueta) === normalizar(etiquetaRapida) ? '' : etiquetaRapida;
      filtros.pagina = 1;
      actualizarCatalogo('reemplazar');
      return;
    }

    // El documento tiene <base target="_top"> (para que un link externo no
    // meta la web dentro de sí misma), así que un href="#productos" navegaría
    // la ventana de afuera en vez de scrollear acá adentro.
    var ancla = t.closest('a[href^="#"]');
    if (ancla && !ancla.hasAttribute('data-gesicomm-ver') && !ancla.hasAttribute('data-gesicomm-comprar')) {
      var hash = ancla.getAttribute('href');
      e.preventDefault();
      if (hash.length > 1) {
        var destino = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (destino) desplazarA(destino, 'start', true);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (hash === '#inicio') enviar({ tipo: 'gesicomm:navegar', destino: 'inicio' });
      if (hash === '#categorias' || hash === '#productos-categoria') enviar({ tipo: 'gesicomm:navegar', destino: 'categoria' });
      if (hash === '#checkout') enviar({ tipo: 'gesicomm:navegar', destino: 'checkout' });
      // Sin return: el mismo link puede tener además un data-gesicomm-evento.
    }

    if ((el = t.closest('[data-gesicomm-link]'))) {
      var paginaTienda = paginaDeEnlace(el);
      if (paginaTienda) {
        // Navega el contenedor (sin recargar la app); en el preview del
        // editor, avisa qué página abriría en vez de sacarte del editor.
        e.preventDefault();
        var filtroLink = {};
        try {
          var urlLink = new URL(el.getAttribute('href') || '', window.location.href);
          if (urlLink.searchParams.get('etiqueta')) filtroLink.etiqueta = urlLink.searchParams.get('etiqueta');
          if (urlLink.searchParams.get('badge')) filtroLink.etiqueta = urlLink.searchParams.get('badge');
          if (urlLink.searchParams.get('categoria')) filtroLink.categoria = urlLink.searchParams.get('categoria');
          else if (filtroLink.etiqueta) filtroLink.categoria = '';
        } catch (err) { /* href relativo raro: navega sin filtro extra */ }
        if (paginaTienda === 'catalogo' && !filtroLink.etiqueta && el.closest('[data-gesicomm-bloque="ofertas_urgencia"]')) {
          filtroLink.etiqueta = 'Oferta';
          filtroLink.categoria = '';
        }
        enviar({ tipo: 'gesicomm:navegar', destino: 'pagina', pagina: paginaTienda, filtro: filtroLink });
        return;
      }
    }
    var enlaceCategoria = t.closest('a[href]');
    var categoriaHref = enlaceCategoria ? categoriaDeEnlace(enlaceCategoria) : null;
    if (categoriaHref) {
      e.preventDefault();
      enviar({ tipo: 'gesicomm:navegar', destino: 'categoria', categoria: categoriaHref });
      return;
    }
    if ((el = t.closest('[data-gesicomm-categoria-ir]'))) {
      e.preventDefault();
      cerrarMenuCategorias();
      enviar({ tipo: 'gesicomm:navegar', destino: 'categoria', categoria: el.getAttribute('data-gesicomm-categoria-ir') });
      return;
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
    if ((el = t.closest('[data-gesicomm-paquete]'))) {
      e.preventDefault();
      paqueteElegido = el.getAttribute('data-gesicomm-paquete');
      var listaPaq = document.querySelectorAll('[data-gesicomm-lista="paquetes"]');
      for (var lp = 0; lp < listaPaq.length; lp++) renderizarLista(listaPaq[lp]);
      pintarTotal();
      var elegidoPaq = paqueteActual();
      // Para medir qué paquete se elige y cuál termina en compra.
      enviar({ tipo: 'gesicomm:evento', nombre: 'PaqueteElegido', datos: { oferta: elegidoPaq ? elegidoPaq.id : null, unidades: elegidoPaq ? elegidoPaq.unidades || null : 1 } });
      return;
    }
    if ((el = t.closest('[data-gesicomm-accion-pago]'))) {
      e.preventDefault();
      var accionPago = el.getAttribute('data-gesicomm-accion-pago') || 'checkout';
      var valorPago = el.getAttribute('data-gesicomm-valor-pago') || '';
      if (accionPago === 'whatsapp') { whatsapp(mensajeWhatsapp(valorPago)); return; }
      if (accionPago === 'contacto') { enviar({ tipo: 'gesicomm:navegar', destino: 'pagina', pagina: 'contacto', filtro: {} }); return; }
      if (accionPago === 'url') {
        var seguraPago = urlSegura(valorPago);
        if (seguraPago) window.open(seguraPago, '_blank', 'noopener');
        return;
      }
      comprar(productoActual, { cantidad: cantidadElegida(el), variante: varianteElegida, payment_method: el.getAttribute('data-gesicomm-metodo-pago') || 'pagopar' });
      return;
    }
    if ((el = t.closest('[data-gesicomm-accion-contacto]'))) {
      e.preventDefault();
      var accionContacto = el.getAttribute('data-gesicomm-accion-contacto') || 'whatsapp';
      var valorContacto = el.getAttribute('data-gesicomm-valor-contacto') || '';
      if (accionContacto === 'contacto') { enviar({ tipo: 'gesicomm:navegar', destino: 'pagina', pagina: 'contacto', filtro: {} }); return; }
      if (accionContacto === 'url') {
        var seguraContacto = urlSegura(valorContacto);
        if (seguraContacto) window.open(seguraContacto, '_blank', 'noopener');
        return;
      }
      whatsapp(mensajeWhatsapp(valorContacto));
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
      var itemComprar = itemDeContexto(el, el.getAttribute('data-gesicomm-comprar'));
      var paqC = itemComprar === productoActual ? paqueteActual() : null;
      if (el.hasAttribute('data-gesicomm-comprar-ver') && itemComprar && itemComprar !== productoActual && !paqC) {
        comprar(itemComprar, { cantidad: cantidadElegida(el), variante: varianteElegida, abrir: false, payment_method: el.getAttribute('data-gesicomm-metodo-pago') || null });
        verProducto(itemComprar);
        return;
      }
      comprar(itemComprar, paqC
        ? { oferta: paqC, variante: varianteElegida, conBumps: true, payment_method: el.getAttribute('data-gesicomm-metodo-pago') || null }
        : { cantidad: hayPaquetes() && itemComprar === productoActual ? 1 : cantidadElegida(el), variante: varianteElegida, payment_method: el.getAttribute('data-gesicomm-metodo-pago') || null });
      return;
    }
    if ((el = t.closest('[data-gesicomm-agregar]'))) {
      e.preventDefault();
      var itemAgregar = itemDeContexto(el, el.getAttribute('data-gesicomm-agregar'));
      var paqA = itemAgregar === productoActual ? paqueteActual() : null;
      comprar(itemAgregar, paqA
        ? { oferta: paqA, variante: varianteElegida, conBumps: true, abrir: false }
        : { cantidad: hayPaquetes() && itemAgregar === productoActual ? 1 : cantidadElegida(el), variante: varianteElegida, abrir: false });
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
      whatsapp(mensajeWhatsapp(texto));
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
      var buscadorSubmit = e.target.querySelector('[data-gesicomm-buscar]');
      filtros.busqueda = String(buscadorSubmit.value || '').slice(0, 80);
      filtros.pagina = 1;
      if (document.querySelector('[data-gesicomm-lista="catalogo"]')) {
        actualizarCatalogo('reemplazar');
        irAlCatalogo();
      } else {
        enviar({ tipo: 'gesicomm:navegar', destino: 'pagina', pagina: 'catalogo', filtro: { busqueda: filtros.busqueda } });
      }
      return;
    }
    var checkoutForm = e.target && e.target.closest ? e.target.closest('form[data-gesicomm-checkout-form]') : null;
    if (checkoutForm) {
      e.preventDefault();
      var camposCheckout = {};
      var controles = checkoutForm.querySelectorAll('input[name], textarea[name], select[name]');
      for (var ci = 0; ci < controles.length; ci++) {
        var control = controles[ci];
        if ((control.type === 'checkbox' || control.type === 'radio') && !control.checked) continue;
        camposCheckout[control.name] = control.type === 'checkbox' ? control.checked : String(control.value || '').slice(0, 500);
      }
      enviar({ tipo: 'gesicomm:confirmar-checkout', campos: camposCheckout });
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

  var resizeFichaTimer = null;
  window.addEventListener('resize', function () {
    if (resizeFichaTimer) clearTimeout(resizeFichaTimer);
    resizeFichaTimer = setTimeout(aplicarOrdenMobileFicha, 120);
  });

  window.Gesicomm = {
    datos: datos,
    vista: datos.vista || 'inicio',
    tienda: datos.tienda || {},
    productos: productos,
    catalogo: catalogoVista,
    carrito: datos.carrito || { items: [], cantidad: 0, subtotal: 0, total: 0 },
    producto: productoActual,
    recomendados: datos.recomendados || [],
    formatoPrecio: formatoPrecio,
    buscar: buscar,
    comprar: function (id, opciones) { comprar(typeof id === 'object' ? id : buscar(id), opciones); },
    agregar: function (id, opciones) { var o = opciones || {}; o.abrir = false; comprar(typeof id === 'object' ? id : buscar(id), o); },
    verProducto: function (id) { verProducto(typeof id === 'object' ? id : buscar(id)); },
    irInicio: function () { enviar({ tipo: 'gesicomm:navegar', destino: 'inicio' }); },
    irCheckout: function () { enviar({ tipo: 'gesicomm:navegar', destino: 'checkout' }); },
    irCategoria: function (categoria) { enviar({ tipo: 'gesicomm:navegar', destino: 'categoria', categoria: categoria }); },
    elegirVariante: elegirVariante,
    whatsapp: whatsapp,
    evento: function (nombre, extra) { enviar({ tipo: 'gesicomm:evento', nombre: String(nombre || ''), datos: extra || {} }); },
    renderizar: renderizar,
    toast: toast,
  };

  prepararFiltrosCatalogo();
  if (!paginado) aplicarLocal();
  renderizar();
  prepararCountdowns();
  prepararHeroBanners();
  pintarVenta();
  prepararEnlacesTienda();
  prepararBuscadorHeader();
  prepararMenuPrincipalHeader();
  prepararMenuCategoriasHeader();
  pintarProductosCategoria();
  aplicarBloquesInicio();
  // Catálogo grande: se pide la página 1 con el formato del servidor para
  // tener el total, las páginas y las categorías de TODO el catálogo (la
  // respuesta inicial solo trae los primeros productos).
  if (paginado && document.querySelector('[data-gesicomm-lista="catalogo"]')) pedirPagina('reemplazar');
}
