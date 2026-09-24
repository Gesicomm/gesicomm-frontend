import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CodigoPreview from './CodigoPreview';
import { PLANTILLA_PRODUCTO } from './plantillasBaseCodigo';
import { datosRuntimePublico, urlProducto, itemPublicoARuntime, urlPaginaTienda, PAGINAS_TIENDA, ofertaCruzadaVisible } from './datosRuntime';
import { generarEventId, leerCookiesFacebook, trackearEvento, trackearEventoPersonalizado } from '../../lib/metaPixel';
import { trackearEventoGA } from '../../lib/googleAnalytics';
import { registrarEventoLanding, obtenerCatalogoLandingPublica } from '../../services/landingPublicaService';
import StoreFooterLegal from '../landing/StoreFooterLegal';
import CartDrawer from '../landing/CartDrawer';
import { ContactoSection } from './templates/sections';
import { getMediaUrl } from '../../services/api';
import { useStoreCart } from '../landing/useStoreCart';

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
    telefono: data?.contacto_telefono || data?.contacto_landing?.telefono || '',
    email: data?.contacto_email || data?.contacto_landing?.email || '',
    direccion: data?.contacto_direccion || data?.contacto_landing?.direccion || '',
    ciudad: data?.contacto_landing?.ciudad || '',
    pais: data?.contacto_landing?.pais || '',
    horarios: data?.contacto_landing?.horarios || '',
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

function rgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(17,24,39,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
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

function htmlTieneSelector(html, selector) {
  return new RegExp(`(?:id|class)=["'][^"']*\\b${selector}\\b[^"']*["']`, 'i').test(html);
}

function codigoTieneProductos(codigo) {
  const html = codigo?.html || '';
  return htmlTieneSelector(html, 'productos')
    || htmlTieneSelector(html, 'productos-grid')
    || /data-gesicomm-checkout/i.test(html);
}

function codigoTieneContacto(codigo) {
  return htmlTieneSelector(codigo?.html || '', 'contacto');
}

function codigoTieneFooter(codigo) {
  const html = codigo?.html || '';
  return /<footer(?:\s|>)/i.test(html) || htmlTieneSelector(html, 'footer');
}

export default function LandingCodigoPublica({ codigo: codigoInicio, titulo, data = null, slug, productId = null }) {
  const navigate = useNavigate();
  // Ficha de producto: una sola plantilla (content.vistas.producto) que el
  // runtime llena con el producto de la URL. Si el comercio todavía no la
  // escribió se usa la ficha base: ningún producto se queda sin página.
  const productoPublico = productId ? (data?.producto || null) : null;
  const esFicha = !!productoPublico;
  const codigo = esFicha
    ? (data?.content?.vistas?.producto?.html ? data.content.vistas.producto : PLANTILLA_PRODUCTO)
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
  const datosRuntime = useMemo(
    () => (data ? datosRuntimePublico(data, slug, productoPublico) : null),
    [data, slug, productoPublico],
  );
  const tieneProductosEnCodigo = useMemo(() => codigoTieneProductos(codigo), [codigo?.html]);
  const tieneContactoEnCodigo = useMemo(() => codigoTieneContacto(codigo), [codigo?.html]);
  const tieneFooterEnCodigo = useMemo(() => codigoTieneFooter(codigo), [codigo?.html]);
  const mostrarSistema = !!data;
  const bordeSuave = rgba(tema.texto, 0.16);
  const cartApariencia = useMemo(() => ({
    acento: tema.acento,
    onAcento: textoLegibleSobre(tema.acento),
    claro: (luminancia(tema.fondo) ?? 1) > 0.62,
  }), [tema]);
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
    if (pedido?.abrir !== false) cartState.setCarritoAbierto(true);
  }

  // Una página del catálogo, pedida por el runtime del iframe.
  const pedirCatalogo = useCallback(async (pedido) => {
    const res = await obtenerCatalogoLandingPublica(slug, {
      pagina: pedido?.pagina,
      porPagina: pedido?.porPagina,
      orden: pedido?.orden === 'min-max' || pedido?.orden === 'max-min' || pedido?.orden === 'az' || pedido?.orden === 'za'
        ? pedido.orden
        : 'destacados',
      categoria: pedido?.categoria || undefined,
      busqueda: pedido?.busqueda || undefined,
    });
    if (!res || !res.disponible) throw new Error('Catálogo no disponible');
    const items = res.items || [];
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
    };
  }, [slug]);

  function navegar(pedido) {
    if (pedido?.destino === 'producto' && pedido.producto) {
      navigate(urlProducto(slug, pedido.producto));
    } else if (pedido?.destino === 'inicio') {
      navigate(slug ? `/l/${slug}` : '/');
    } else if (pedido?.destino === 'pagina' && PAGINAS_TIENDA[pedido.pagina]) {
      navigate(urlPaginaTienda(slug, pedido.pagina));
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
    <div style={{ minHeight: '100vh', background: tema.fondo, color: tema.texto }}>
      <div style={{ height: '100vh', background: '#fff' }}>
        {/* key: al pasar de un producto a otro el iframe se remonta y el
            JS del comercio arranca de cero, como en una página nueva. */}
        <CodigoPreview
          key={esFicha ? `producto:${productoPublico.content_id}` : 'inicio'}
          codigo={codigo}
          titulo={esFicha ? productoPublico.nombre : titulo}
          datos={datosRuntime}
          onCheckout={abrirCheckout}
          onNavegar={navegar}
          onEvento={registrarEvento}
          onCatalogo={pedirCatalogo}
        />
      </div>

      {mostrarSistema && (
        <>
          {!esFicha && !tieneProductosEnCodigo && (
            <ProductosSistema
              productos={productos}
              tema={tema}
              bordeSuave={bordeSuave}
              onComprar={(item) => abrirCheckout({ producto: `${item.tipo}:${item.referencia_id}` })}
            />
          )}
          {!tieneContactoEnCodigo && (
            <div style={{ backgroundColor: tema.fondo, color: tema.texto }}>
              <ContactoSection
                contacto={contacto}
                acento={tema.acento}
                tituloClase="font-bold"
                bordeSuave={bordeSuave}
                isMobile={false}
              />
            </div>
          )}
          {!tieneFooterEnCodigo && (
            <StoreFooterLegal
              tema={tema}
              bordeSuave={bordeSuave}
              nombreComercio={data?.titulo || data?.tienda?.nombre || 'Tienda'}
              style={{ backgroundColor: tema.fondo }}
            />
          )}
        </>
      )}

      <CartDrawer
        items={Array.from(cartState.carrito.values())}
        sugerencias={crossSellActivo
          ? cartState.sugerenciasCarrito.filter(s => ofertaCruzadaVisible(s.oferta, data?.content?.venta))
          : []}
        onAgregarSugerencia={cartState.agregarSugerencia}
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
      />
    </div>
  );
}

function ProductosSistema({ productos, tema, bordeSuave, onComprar }) {
  if (!productos?.length) return null;
  return (
    <section
      id="productos-seleccionados"
      style={{
        backgroundColor: tema.fondo,
        color: tema.texto,
        borderTop: `1px solid ${bordeSuave}`,
        padding: '64px 24px',
      }}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 8px', color: tema.acento, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Productos seleccionados
          </p>
          <h2 style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.05 }}>Comprá desde esta landing</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          {productos.map(item => (
            <article
              key={item.content_id || `${item.tipo}-${item.referencia_id}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                border: `1px solid ${bordeSuave}`,
                borderRadius: 14,
                padding: 16,
                backgroundColor: rgba(tema.texto, 0.04),
              }}
            >
              {item.imagen && (
                <img
                  src={getMediaUrl(item.imagen)}
                  alt={item.nombre}
                  style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 10, background: rgba(tema.texto, 0.08) }}
                />
              )}
              <span style={{ color: tema.acento, fontSize: 12, fontWeight: 800 }}>{item.tipo === 'combo' ? 'Combo' : 'Producto'}</span>
              <h3 style={{ margin: 0, fontSize: 20 }}>{item.nombre}</h3>
              {item.descripcion && <p style={{ margin: 0, color: rgba(tema.texto, 0.72), lineHeight: 1.45 }}>{item.descripcion}</p>}
              <strong style={{ marginTop: 'auto', fontSize: 18 }}>
                {Number(item.precio || 0).toLocaleString('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 })}
              </strong>
              <button
                type="button"
                onClick={() => onComprar(item)}
                style={{
                  border: 0,
                  borderRadius: 10,
                  padding: '12px 14px',
                  backgroundColor: tema.acento,
                  color: textoLegibleSobre(tema.acento),
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Comprar ahora
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
