import React, { useCallback, useMemo, useState } from 'react';
import CodigoPreview from './CodigoPreview';
import CartDrawer from '../landing/CartDrawer';
import { getMediaUrl } from '../../services/api';
import { useStoreCart } from '../landing/useStoreCart';
import { armarSeccionesSistema, codigoTieneContacto, codigoTieneFooter, codigoTieneProductos } from './seccionesSistemaCodigo';
import { CSS_BUMP_CODIGO, datosBumpsCodigo, scriptBumpCodigo } from './bumpCodigo';

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
  // contacto_landing ya trae el fallback a los datos de la Tienda
  // (onboarding / Configurar tienda), ver landing.service.js.
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

function resolverItemCheckout(data, pedido) {
  const raw = String(pedido?.producto || '').trim();
  if (!raw) return null;
  const colon = raw.match(/^(producto|combo):(\d+)$/);
  if (colon) {
    const [, tipo, id] = colon;
    return items.find(i => i.tipo === tipo && Number(i.referencia_id) === Number(id));
  }
  return items.find(i => i.content_id === raw || `${i.tipo}-${i.referencia_id}` === raw);
}

export default function LandingCodigoPublica({ codigo, titulo, data = null, slug }) {
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
  // Colores reales de la landing, reportados por el iframe (variables
  // --gc-* del prompt, o lo que se ve si el código no las define). Hasta
  // que llegan se usa el tema guardado de la landing/tienda.
  const [temaIframe, setTemaIframe] = useState(null);
  const onTema = useCallback((t) => setTemaIframe(t), []);

  const extras = useMemo(() => {
    if (!data) return null;
    const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/') && slug ? `/l/${slug}` : '';
    const secciones = armarSeccionesSistema({
      mostrarProductos: !tieneProductosEnCodigo,
      mostrarContacto: !tieneContactoEnCodigo,
      mostrarFooter: !tieneFooterEnCodigo,
      productos: productos.map(p => ({ ...p, imagen: p.imagen ? getMediaUrl(p.imagen) : null })),
      contacto,
      nombreComercio: data?.titulo || data?.tienda?.nombre || 'Tienda',
      basePath,
      acento: tema.acento,
    });
    return {
      html: secciones.html,
      css: `${secciones.css}\n${CSS_BUMP_CODIGO}`,
      script: scriptBumpCodigo(datosBumpsCodigo(productos, getMediaUrl)),
    };
  }, [data, slug, productos, contacto, tema.acento, tieneProductosEnCodigo, tieneContactoEnCodigo, tieneFooterEnCodigo]);

  const apariencia = useMemo(() => ({
    primario: temaIframe?.primario || tema.acento,
    fondo: temaIframe?.fondo || tema.fondo,
  }), [temaIframe, tema]);

  function abrirCheckout(pedido) {
    if (!data) return;
    const item = resolverItemCheckout(productos, pedido);
    if (!item) return;
    const cantidad = Number(pedido?.cantidad || 1) || 1;
    cartState.agregarAlCarrito({
      item,
      variante: null,
      oferta: null,
      cantidad,
      precio: item.precio || 0,
    });
    // Order bump marcado en la landing (ver bumpCodigo.js): se agrega como
    // la misma oferta que ofrece el carrito, con su precio promocional.
    for (const ofertaId of pedido?.ofertas || []) {
      const oferta = (item.ofertas || []).find(o => Number(o.id) === Number(ofertaId));
      if (oferta) cartState.agregarSugerencia(item, oferta);
    }
    cartState.setCarritoAbierto(true);
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
    <div style={{ height: '100vh', background: apariencia.fondo }}>
      <CodigoPreview codigo={codigo} titulo={titulo} extras={extras} onCheckout={abrirCheckout} onTema={onTema} />

      <CartDrawer
        items={Array.from(cartState.carrito.values())}
        sugerencias={crossSellActivo
          ? cartState.sugerenciasCarrito.filter(s => ofertaCruzadaVisible(s.oferta, data?.content?.venta))
          : []}
        onAgregarSugerencia={cartState.agregarSugerencia}
        crossSells={cartState.crossSellsCarrito}
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
        apariencia={apariencia}
      />
    </div>
  );
}
