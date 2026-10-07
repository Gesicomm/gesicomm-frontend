import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CodigoPreview from './CodigoPreview';
import { PLANTILLA_PRODUCTO, PLANTILLA_CATALOGO, PLANTILLA_CATEGORIA, PLANTILLA_CHECKOUT, PLANTILLA_INICIO, esFichaProductoBase, esCheckoutBase } from './plantillasBaseCodigo';
import { datosRuntimePublico, urlProducto, itemPublicoARuntime, urlPaginaTienda, PAGINAS_TIENDA, ofertaCruzadaVisible } from './datosRuntime';
import { generarEventId, leerCookiesFacebook, trackearEvento, trackearEventoPersonalizado } from '../../lib/metaPixel';
import { trackearEventoGA } from '../../lib/googleAnalytics';
import { registrarEventoLanding, obtenerCatalogoLandingPublica, obtenerGeografiaPublica } from '../../services/landingPublicaService';
import CartDrawer from '../landing/CartDrawer';
import { armarSeccionesSistema, codigoTieneContacto, codigoTieneFooter, codigoTieneProductos } from './seccionesSistemaCodigo';
import { getMediaUrl } from '../../services/api';
import { useStoreCart } from '../landing/useStoreCart';
import { codigoConGlobales, conGlobalesHeredados } from './globalesCodigo';

/**
 * La landing pública de una tienda que eligió "Lienzo en blanco": el
 * HTML/CSS/JS del comercio ocupando toda la ventana, dentro del mismo
 * iframe aislado que usa el preview del editor (ver CodigoPreview y
 * construirDocumentoCodigo).
 *
 * El iframe va fijo a la ventana y scrollea por dentro en vez de crecer
 * con su contenido: así `100vh`, `position: fixed` y un header pegajoso
 * escritos por el comercio se comportan igual que en una página suelta.
 * El precio es que el scroll pasa a ser del iframe — por eso se apaga el
 * del documento contenedor mientras esta landing está montada.
 */
function contactoDesdeData(data) {
  return {
    whatsapp: data?.contacto_whatsapp || data?.contacto_landing?.whatsapp || '',
    mensaje: data?.contacto?.mensaje || '',
    incluir_precio: !!data?.contacto?.incluir_precio,
    incluir_url: !!data?.contacto?.incluir_url,
    telefono: data?.contacto_telefono || data?.contacto_landing?.telefono || '',
    email: data?.contacto_email || data?.contacto_landing?.email || '',
    direccion: data?.contacto_direccion || data?.contacto_landing?.direccion || '',
    ciudad: data?.contacto_landing?.ciudad || '',
    pais: data?.contacto_landing?.pais || '',
    horarios: data?.contacto_landing?.horarios || '',
    nombre_contacto: data?.contacto_landing?.nombre || '',
    instagram: data?.contacto_instagram || data?.contacto_landing?.instagram || '',
    facebook: data?.contacto_facebook || data?.contacto_landing?.facebook || '',
    tiktok: data?.contacto_tiktok || data?.contacto_landing?.tiktok || '',
    youtube: data?.contacto_youtube || data?.contacto_landing?.youtube || '',
    twitter: data?.contacto_twitter || data?.contacto_landing?.twitter || '',
  };
}

function temaDesdeData(data) {
  const fondo = data?.tema?.fondo || data?.color_fondo || '#ffffff';
  const textoElegido = data?.tema?.texto || data?.color_texto || null;
  const texto = colorConContraste(textoElegido, fondo) ? textoElegido : textoLegibleSobre(fondo);
  const acentoBase = data?.tema?.primario || data?.color_primario || '#2563eb';
  const acento = colorConContraste(acentoBase, fondo, 3) ? acentoBase : texto;
  return { fondo, texto, acento };
}

function hexToRgb(hex) {
  const limpio = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(limpio)) return null;
  return {
    r: parseInt(limpio.slice(0, 2), 16),
    g: parseInt(limpio.slice(2, 4), 16),
    b: parseInt(limpio.slice(4, 6), 16),
  };
}

function luminancia(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const canal = v => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(rgb.r) + 0.7152 * canal(rgb.g) + 0.0722 * canal(rgb.b);
}

function contraste(a, b) {
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  if (l1 === null || l2 === null) return null;
  const claro = Math.max(l1, l2);
  const oscuro = Math.min(l1, l2);
  return (claro + 0.05) / (oscuro + 0.05);
}

function colorConContraste(color, fondo, min = 4.5) {
  const ratio = contraste(color, fondo);
  return ratio !== null && ratio >= min;
}

function textoLegibleSobre(fondo) {
  const blanco = contraste('#ffffff', fondo) || 0;
  const negro = contraste('#111827', fondo) || 0;
  return blanco >= negro ? '#ffffff' : '#111827';
}

function queryCatalogoDesdeFiltro(filtro = {}) {
  const params = new URLSearchParams();
  if (filtro.categoria) params.set('categoria', filtro.categoria);
  if (filtro.etiqueta) params.set('etiqueta', filtro.etiqueta);
  if (filtro.badge && !filtro.etiqueta) params.set('etiqueta', filtro.badge);
  if (filtro.busqueda) params.set('busqueda', filtro.busqueda);
  const query = params.toString();
  return query ? `?${query}` : '';
}

// Los únicos eventos que el backend acepta en /eventos además de los del
// carrito (ver EVENTOS_PERMITIDOS en landingPublica.controller). Cualquier
// otro nombre que ponga el comercio en data-gesicomm-evento va solo al
// pixel y a GA como evento personalizado.
const EVENTOS_ESTANDAR = new Set(['Contact', 'Lead']);

function resolverItemCheckout(items, pedido) {
  const raw = String(pedido?.producto || '').trim();
  if (!raw) return null;
  const colon = raw.match(/^(producto|combo):(\d+)$/);
  if (colon) {
    const [, tipo, id] = colon;
    return items.find(i => i.tipo === tipo && Number(i.referencia_id) === Number(id));
  }
  return items.find(i => i.content_id === raw || `${i.tipo}-${i.referencia_id}` === raw);
}

export default function LandingCodigoPublica({ codigo: codigoInicio, titulo, data = null, slug, productId = null, modoLegal = false, vistaCodigo = null, categorySlug = null }) {
  const navigate = useNavigate();
  // Ficha de producto: una sola plantilla (content.vistas.producto) que el
  // runtime llena con el producto de la URL. Si el comercio todavía no la
  // escribió se usa la ficha base: ningún producto se queda sin página.
  // "Directo en un producto" (venta.abrir_en): la dirección de la landing
  // muestra la ficha del producto principal (el primero de la selección),
  // sin redirigir, así el link del anuncio queda limpio.
  const abreEnFicha = !modoLegal && !productId && data?.content?.venta?.abrir_en === 'producto';
  const principalDeLanding = (() => {
    if (!abreEnFicha) return null;
    const lista = (data?.catalogo_items || data?.items || []).filter(i => i.tipo === 'producto');
    const id = Number(data?.content?.venta?.principal_id);
    return lista.find(i => Number(i.referencia_id) === id) || lista[0] || null;
  })();
  const productoPublico = productId ? (data?.producto || null) : principalDeLanding;
  const esFicha = !!productoPublico;
  const vistaActual = vistaCodigo || (esFicha ? 'producto' : 'inicio');
  // Ficha propia de ESTE producto (si el comercio le armó una) → la general
  // → la base.
  const fichaPropia = esFicha ? data?.content?.vistas?.productos?.[productoPublico.content_id] : null;
  const fichaGeneral = data?.content?.vistas?.producto;
  const codigoCatalogo = data?.content?.vistas?.catalogo;
  const codigoCategoria = data?.content?.vistas?.categoria;
  const codigoCheckout = data?.content?.vistas?.checkout;
  const codigoInicioHeredable = codigoConGlobales([
    data?.content?.codigo,
    data?.content?.vistas?.inicio,
    codigoInicio,
    PLANTILLA_INICIO,
  ]) || codigoInicio || PLANTILLA_INICIO;
  const codigoFicha = fichaPropia?.html && !esFichaProductoBase(fichaPropia.html)
    ? fichaPropia
    : (fichaGeneral?.html && !esFichaProductoBase(fichaGeneral.html) ? fichaGeneral : PLANTILLA_PRODUCTO);
  const codigoCatalogoConGlobales = conGlobalesHeredados(codigoCatalogo?.html ? codigoCatalogo : PLANTILLA_CATALOGO, codigoInicioHeredable);
  const codigoCategoriaConGlobales = conGlobalesHeredados(codigoCategoria?.html ? codigoCategoria : PLANTILLA_CATEGORIA, codigoInicioHeredable);
  const codigoCheckoutConGlobales = conGlobalesHeredados(
    codigoCheckout?.html && !esCheckoutBase(codigoCheckout.html) ? codigoCheckout : PLANTILLA_CHECKOUT,
    codigoInicioHeredable,
  );
  const codigo = esFicha
    ? codigoFicha
    : vistaActual === 'checkout' ? codigoCheckoutConGlobales
      : vistaActual === 'catalogo' ? codigoCatalogoConGlobales
        : vistaActual === 'categoria' ? codigoCategoriaConGlobales
          : codigoInicio;

  const tema = useMemo(() => temaDesdeData(data), [data]);
  const contacto = useMemo(() => contactoDesdeData(data), [data]);
  // Todo producto que la landing mostró: la primera página que vino con la
  // landing + cada página que el visitante pidió después. Comprar desde la
  // página 7 tiene que encontrar el producto (y el carrito, sus ofertas).
  const [extras, setExtras] = useState([]);
  useEffect(() => { setExtras([]); }, [data]);
  const productos = useMemo(() => {
    const base = data?.catalogo_items || data?.items || [];
    if (!extras.length) return base;
    const ids = new Set(base.map(i => i.content_id));
    return [...base, ...extras.filter(i => !ids.has(i.content_id))];
  }, [data, extras]);
  const cartState = useStoreCart(slug, data, productos);
  const [checkoutEstado, setCheckoutEstado] = useState(null);
  const [paymentMethodInicial, setPaymentMethodInicial] = useState(null);
  // Departamentos/ciudades de Paraguay para el <select> de dirección del
  // checkout propio (ver data-gesicomm-geografia). Catálogo compartido, no
  // de esta tienda: se pide una sola vez, recién al llegar a checkout (no en
  // cada visita a la landing, que es la inmensa mayoría de las veces que
  // nadie llega a pagar).
  const [geografia, setGeografia] = useState([]);
  useEffect(() => {
    if (vistaActual !== 'checkout' || geografia.length) return;
    let cancelado = false;
    obtenerGeografiaPublica()
      .then(lista => { if (!cancelado) setGeografia(Array.isArray(lista) ? lista : []); })
      .catch(() => {}); // best-effort: mismo catálogo que ya usa Courier, no debería fallar; si falla, reintenta en el próximo render
    return () => { cancelado = true; };
  }, [vistaActual, geografia.length]);
  const datosRuntime = useMemo(
    () => (data ? datosRuntimePublico(data, slug, productoPublico, {
      vista: vistaActual,
      categorySlug,
      carrito: Array.from(cartState.carrito.values()),
      checkoutEstado,
      geografia,
    }) : null),
    [data, slug, productoPublico, vistaActual, categorySlug, cartState.carrito, checkoutEstado, geografia],
  );
  const tieneProductosEnCodigo = useMemo(() => codigoTieneProductos(codigo), [codigo?.html]);
  const tieneContactoEnCodigo = useMemo(() => codigoTieneContacto(codigo), [codigo?.html]);
  const tieneFooterEnCodigo = useMemo(() => codigoTieneFooter(codigo), [codigo?.html]);
  // Colores reales de la landing, reportados por el iframe (variables
  // --gc-* o lo que se ve si el código no las define). Hasta que llegan se
  // usa el tema guardado; así el carrito nunca queda oscuro sobre una
  // landing blanca.
  const [temaIframe, setTemaIframe] = useState(null);
  const onTema = useCallback((t) => setTemaIframe(t), []);
  // El respaldo del fondo es blanco y no el de la tienda: el fondo de marca
  // viene oscuro por defecto y pintaba carrito y contenedor de negro durante
  // la carga (o siempre, si el iframe no llegaba a reportar).
  const cartApariencia = useMemo(() => ({
    primario: temaIframe?.primario || tema.acento,
    fondo: temaIframe?.fondo || '#ffffff',
  }), [temaIframe, tema]);

  // Productos (si el código no tiene grilla), contacto y footer legal de la
  // tienda: van DENTRO del iframe, heredando fondo y tipografía de la
  // landing. Afuera quedaban con un segundo scroll y el fondo de la tienda
  // (oscuro por defecto) aunque la landing fuera blanca.
  const seccionesSistema = useMemo(() => {
    if (!data) return null;
    const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/') && slug ? `/l/${slug}` : '';
    return armarSeccionesSistema({
      mostrarProductos: !modoLegal && !esFicha && !tieneProductosEnCodigo,
      mostrarContacto: !modoLegal && !tieneContactoEnCodigo,
      mostrarFooter: !tieneFooterEnCodigo,
      productos: productos.map(p => ({ ...p, imagen: p.imagen ? getMediaUrl(p.imagen) : null })),
      contacto,
      nombreComercio: data?.titulo || data?.tienda?.nombre || 'Tienda',
      basePath,
      acento: tema.acento,
    });
  }, [data, slug, modoLegal, esFicha, productos, contacto, tema.acento, tieneProductosEnCodigo, tieneContactoEnCodigo, tieneFooterEnCodigo]);
  // Ventas cruzadas apagadas en la configuración de venta → el carrito no sugiere nada.
  const crossSellActivo = data?.content?.venta?.cross_sell?.activo !== false;

  // ViewContent de la ficha: una vez por producto, con el mismo event_id
  // al pixel y a la Conversions API (así Meta los deduplica).
  const vistaTrackeada = useRef(null);
  useEffect(() => {
    if (!esFicha || vistaTrackeada.current === productoPublico.content_id) return;
    vistaTrackeada.current = productoPublico.content_id;
    try {
      const eventId = generarEventId();
      const { fbc, fbp } = leerCookiesFacebook();
      const customData = {
        content_ids: [productoPublico.content_id],
        content_name: productoPublico.nombre,
        content_type: productoPublico.tipo === 'combo' ? 'product_group' : 'product',
        value: Number(productoPublico.precio) || 0,
        currency: 'PYG',
      };
      trackearEvento('ViewContent', eventId, customData);
      trackearEventoGA('view_item', {
        currency: 'PYG',
        value: customData.value,
        items: [{ item_id: productoPublico.content_id, item_name: productoPublico.nombre, price: customData.value }],
      });
      registrarEventoLanding(slug, {
        event_name: 'ViewContent', event_id: eventId, event_source_url: window.location.href, fbc, fbp, custom_data: customData,
      });
    } catch (e) {
      console.error('Error trackeando ViewContent:', e);
    }
  }, [esFicha, productoPublico, slug]);

  function abrirCheckout(pedido) {
    if (!data) return;
    const item = resolverItemCheckout(productos, pedido);
    if (!item) return;
    const cantidad = Math.max(1, Math.min(99, Number(pedido?.cantidad || 1) || 1));
    const variante = pedido?.variante != null
      ? (item.variantes || []).find(v => Number(v.id) === Number(pedido.variante)) || null
      : null;
    const oferta = pedido?.oferta != null
      ? (item.ofertas || []).find(o => Number(o.id) === Number(pedido.oferta)) || null
      : null;
    // El precio es solo lo que se muestra en el carrito: el backend lo
    // recalcula entero al confirmar (LandingService.resolverCarrito).
    const precio = oferta
      ? (oferta.precio_efectivo ?? oferta.precio_normal ?? oferta.precio ?? item.precio)
      : (variante?.precio_efectivo ?? item.precio ?? 0);
    cartState.agregarAlCarrito({ item, variante, oferta, cantidad, precio });
    if (pedido?.payment_method === 'pagopar' || pedido?.payment_method === 'efectivo') {
      setPaymentMethodInicial(pedido.payment_method);
    }
    if (pedido?.abrir !== false) cartState.setCarritoAbierto(true);
  }

  async function confirmarCheckoutIframe(pedido) {
    setCheckoutEstado({ estado: 'enviando', mensaje: 'Enviando pedido...' });
    try {
      const res = await cartState.confirmarPedido(pedido?.campos || {});
      setCheckoutEstado({
        estado: 'confirmado',
        mensaje: `Pedido ${res?.numero_pedido || res?.pedido_id || ''} confirmado.`,
        pedido_id: res?.pedido_id,
        numero_pedido: res?.numero_pedido,
      });
    } catch (err) {
      setCheckoutEstado({ estado: 'error', mensaje: err?.message || 'No se pudo enviar el pedido. Probá de nuevo.' });
    }
  }

  // Una página del catálogo, pedida por el runtime del iframe.
  const pedirCatalogo = useCallback(async (pedido) => {
    const res = await obtenerCatalogoLandingPublica(slug, {
      pagina: pedido?.pagina,
      porPagina: pedido?.porPagina || 20,
      orden: pedido?.orden === 'min-max' || pedido?.orden === 'max-min' || pedido?.orden === 'az' || pedido?.orden === 'za'
        ? pedido.orden
        : 'destacados',
      categoria: pedido?.categoria || undefined,
      marca: pedido?.marca || undefined,
      etiqueta: pedido?.etiqueta || undefined,
      disponibilidad: pedido?.disponibilidad || undefined,
      precioMin: pedido?.precioMin,
      precioMax: pedido?.precioMax,
      soloInicio: pedido?.soloInicio === true,
      busqueda: pedido?.busqueda || undefined,
    });
    if (!res || !res.disponible) throw new Error('Catálogo no disponible');
    const items = res.catalogo_items || res.items || [];
    setExtras(prev => {
      const ids = new Set(prev.map(i => i.content_id));
      return [...prev, ...items.filter(i => !ids.has(i.content_id))];
    });
    return {
      productos: items.map(i => itemPublicoARuntime(i, slug, data?.content?.venta || null)),
      pagina: res.paginacion?.pagina || 1,
      totalPaginas: res.paginacion?.totalPaginas || 1,
      total: res.paginacion?.total ?? items.length,
      categorias: res.categorias_disponibles || [],
      marcas: res.marcas_disponibles || [],
      etiquetas: res.etiquetas_disponibles || [],
    };
  }, [slug]);

  function navegar(pedido) {
    if (pedido?.destino === 'producto' && pedido.producto) {
      navigate(urlProducto(slug, pedido.producto));
    } else if (pedido?.destino === 'inicio') {
      navigate(slug ? `/l/${slug}` : '/');
    } else if (pedido?.destino === 'pagina' && pedido.pagina === 'checkout') {
      navigate(slug ? `/l/${slug}/checkout` : '/checkout');
    } else if (pedido?.destino === 'pagina' && PAGINAS_TIENDA[pedido.pagina]) {
      navigate(`${urlPaginaTienda(slug, pedido.pagina)}${pedido.pagina === 'catalogo' ? queryCatalogoDesdeFiltro(pedido.filtro) : ''}`);
    } else if (pedido?.destino === 'categoria' && pedido.categoria) {
      const categoria = String(pedido.categoria || '');
      const normalizada = categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      navigate(slug ? `/l/${slug}/categoria/${normalizada}` : `/categoria/${normalizada}`);
    } else if (pedido?.destino === 'checkout') {
      navigate(slug ? `/l/${slug}/checkout` : '/checkout');
    }
  }

  function registrarEvento(pedido) {
    const nombre = String(pedido?.nombre || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
    if (!nombre) return;
    const eventId = generarEventId();
    try {
      if (EVENTOS_ESTANDAR.has(nombre)) {
        const { fbc, fbp } = leerCookiesFacebook();
        const customData = productoPublico
          ? { content_ids: [productoPublico.content_id], content_type: 'product' }
          : undefined;
        trackearEvento(nombre, eventId, customData || {});
        registrarEventoLanding(slug, {
          event_name: nombre, event_id: eventId, event_source_url: window.location.href, fbc, fbp, custom_data: customData,
        });
      } else {
        trackearEventoPersonalizado(nombre, eventId, {});
      }
      trackearEventoGA(nombre === 'Lead' ? 'generate_lead' : nombre === 'Contact' ? 'contact' : nombre, {});
    } catch (e) {
      console.error('Error trackeando evento de la landing:', e);
    }
  }

  const vacia = !codigo?.html?.trim() && !codigo?.css?.trim() && !codigo?.js?.trim();
  if (vacia) {
    return (
      <div className="lp-status-page">
        <h1>Esta página todavía está en construcción</h1>
        <p>Volvé en un rato.</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: cartApariencia.fondo }}>
      {/* key: al pasar de un producto a otro el iframe se remonta y el
          JS del comercio arranca de cero, como en una página nueva. */}
      <CodigoPreview
        key={esFicha ? `producto:${productoPublico.content_id}` : 'inicio'}
        codigo={codigo}
        titulo={esFicha ? productoPublico.nombre : titulo}
        datos={datosRuntime}
        extras={seccionesSistema}
        onCheckout={abrirCheckout}
        onConfirmarCheckout={confirmarCheckoutIframe}
        onCarrito={() => cartState.setCarritoAbierto(true)}
        onNavegar={navegar}
        onEvento={registrarEvento}
        onCatalogo={pedirCatalogo}
        onTema={onTema}
      />

      {!modoLegal && (
        <CartDrawer
          items={Array.from(cartState.carrito.values())}
          sugerencias={crossSellActivo
            ? cartState.sugerenciasCarrito.filter(s => ofertaCruzadaVisible(s.oferta, data?.content?.venta))
            : []}
          onAgregarSugerencia={cartState.agregarSugerencia}
          crossSells={crossSellActivo ? cartState.crossSellsCarrito : []}
          onAgregarCrossSell={cartState.agregarCrossSell}
          abierto={cartState.carritoAbierto}
          onAbrir={() => cartState.setCarritoAbierto(true)}
          onCerrar={() => cartState.setCarritoAbierto(false)}
          onCantidad={cartState.cambiarCantidadCarrito}
          onQuitar={cartState.quitarDelCarrito}
          onConfirmarPedido={cartState.confirmarPedido}
          onValidarCupon={cartState.validarCupon}
          pasarelas={data?.checkout?.pasarelas || []}
          deliveryCiudades={data?.delivery_ciudades || []}
          apariencia={cartApariencia}
          paymentMethodInicial={paymentMethodInicial}
          onIrACheckout={() => navegar({ destino: 'checkout' })}
        />
      )}
    </div>
  );
}
