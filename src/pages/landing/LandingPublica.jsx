import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, MessageCircle, Package, Layers, ImageOff, ShoppingCart, Plus, Check, Heart, Eye } from 'lucide-react';
import { obtenerLandingPublica, registrarEventoLanding, crearCheckoutLanding } from '../../services/landingPublicaService';
import { getMediaUrl } from '../../services/api';
import { inicializarPixel, generarEventId, leerCookiesFacebook, trackearEvento } from '../../lib/metaPixel';
import { inicializarGA, trackearEventoGA } from '../../lib/googleAnalytics';
import { inicializarTikTokPixel, trackearEventoTikTok } from '../../lib/tiktokPixel';
import { calcularEstiloLanding, cargarFuenteGoogle } from '../../lib/landingDiseno';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import { formatPrecio, armarLinkWhatsapp, armarLinkWhatsappCarrito } from '../../lib/mensajeWhatsapp';
import ProductDetailModal from './ProductDetailModal';
import CartDrawer from './CartDrawer';
import LandingDropdown from './LandingDropdown';
import LandingHeader from './LandingHeader';
import LandingHero from './LandingHero';
import LandingBenefits from './LandingBenefits';
import LandingCategoryStrip from './LandingCategoryStrip';
import LandingFeatured from './LandingFeatured';
import LandingTestimonials from './LandingTestimonials';
import LandingFaq from './LandingFaq';
import './landingPublica.css';

const VENTANA_NUEVO_DIAS = 14;

function claveCarrito(item, varianteId, ofertaId) {
  return `${item.tipo}:${item.content_id}:${varianteId || 'base'}:${ofertaId || 'individual'}`;
}

function cargarCarritoGuardado(slug) {
  try {
    const crudo = localStorage.getItem(`gesicomm-carrito-${slug || 'home'}`);
    return crudo ? new Map(JSON.parse(crudo)) : new Map();
  } catch {
    return new Map(); // localStorage puede no estar disponible (modo privado) — el carrito solo vive en memoria.
  }
}

/** Mismo criterio que el carrito, pero un Set: no hay cantidad/variante que trackear. */
function cargarWishlistGuardada(slug) {
  try {
    const crudo = localStorage.getItem(`gesicomm-wishlist-${slug || 'home'}`);
    return crudo ? new Set(JSON.parse(crudo)) : new Set();
  } catch {
    return new Set();
  }
}

function esNuevo(item) {
  if (!item.creado) return false;
  return Date.now() - new Date(item.creado).getTime() < VENTANA_NUEVO_DIAS * 86400000;
}

export default function LandingPublica() {
  const { slug } = useParams();
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'no-encontrada' | 'no-disponible' | 'ok'
  const [data, setData] = useState(null);

  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('');

  const [itemAbierto, setItemAbierto] = useState(null); // item con el modal de detalle abierto
  const [carrito, setCarrito] = useState(() => new Map());
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [agregadoRapido, setAgregadoRapido] = useState(null);
  const [wishlist, setWishlist] = useState(() => new Set());

  useEffect(() => {
    let activo = true;
    setEstado('cargando');
    obtenerLandingPublica(slug)
      .then((res) => {
        if (!activo) return;
        if (res === null) return setEstado('no-encontrada');
        if (!res.disponible) return setEstado('no-disponible');
        setData(res);
        setEstado('ok');
        if (res.meta?.pixel_id) inicializarPixel(res.meta.pixel_id);
        if (res.meta?.google_analytics_id) inicializarGA(res.meta.google_analytics_id);
        if (res.meta?.tiktok_pixel_id) inicializarTikTokPixel(res.meta.tiktok_pixel_id);
        if (res.diseno?.fuente) cargarFuenteGoogle(res.diseno.fuente);
      })
      .catch(() => { if (activo) setEstado('no-encontrada'); });
    return () => { activo = false; };
  }, [slug]);

  useDocumentSeo(data?.seo, typeof window !== 'undefined' ? window.location.href : undefined);

  // Un slug por carrito: si la tienda tiene varias landings, cada una guarda
  // el suyo por separado (no tiene sentido mezclar pedidos de vidrieras
  // distintas). Se recarga desde localStorage cada vez que cambia el slug,
  // y se persiste en cada cambio del carrito mismo.
  useEffect(() => { setCarrito(cargarCarritoGuardado(slug)); }, [slug]);
  useEffect(() => {
    try {
      localStorage.setItem(`gesicomm-carrito-${slug || 'home'}`, JSON.stringify(Array.from(carrito.entries())));
    } catch { /* modo privado / storage lleno — el carrito sigue funcionando solo en memoria */ }
  }, [carrito, slug]);

  useEffect(() => { setWishlist(cargarWishlistGuardada(slug)); }, [slug]);
  useEffect(() => {
    try {
      localStorage.setItem(`gesicomm-wishlist-${slug || 'home'}`, JSON.stringify(Array.from(wishlist)));
    } catch { /* modo privado / storage lleno — la wishlist sigue funcionando solo en memoria */ }
  }, [wishlist, slug]);

  function toggleWishlist(e, contentId) {
    e.stopPropagation();
    setWishlist(prev => {
      const copia = new Set(prev);
      if (copia.has(contentId)) copia.delete(contentId); else copia.add(contentId);
      return copia;
    });
  }

  // Ofertas para mostrar como sugerencia en el carrito: order_bump siempre
  // que no esté ya agregada, upsell solo si su producto ancla ya está en el
  // carrito (mismo criterio que Oferta.estrategia documenta en el backend).
  const sugerenciasCarrito = useMemo(() => {
    if (!data?.items) return [];
    const contentIdsEnCarrito = new Set(Array.from(carrito.values()).map(it => it.contentId));
    const ofertaIdsEnCarrito = new Set(Array.from(carrito.values()).map(it => it.ofertaId).filter(Boolean));
    const sugerencias = [];
    for (const item of data.items) {
      if (item.tipo !== 'producto' || !item.ofertas?.length) continue;
      for (const oferta of item.ofertas) {
        if (ofertaIdsEnCarrito.has(oferta.id)) continue;
        if (oferta.estrategia === 'order_bump') {
          sugerencias.push({ item, oferta });
        } else if (oferta.estrategia === 'upsell' && contentIdsEnCarrito.has(item.content_id)) {
          sugerencias.push({ item, oferta });
        }
      }
    }
    return sugerencias;
  }, [data, carrito]);

  function agregarSugerencia(item, oferta) {
    agregarAlCarrito({ item, variante: null, oferta, cantidad: 1, precio: oferta.precio });
  }

  function agregarAlCarrito({ item, variante, oferta, cantidad, precio }) {
    const clave = claveCarrito(item, variante?.id, oferta?.id);
    const stockMax = variante ? variante.stock : (oferta ? null : item.stock);
    setCarrito(prev => {
      const copia = new Map(prev);
      const existente = copia.get(clave);
      const nuevaCantidad = stockMax != null
        ? Math.min(stockMax, (existente?.cantidad || 0) + cantidad)
        : (existente?.cantidad || 0) + cantidad;
      copia.set(clave, {
        clave,
        tipo: item.tipo,
        contentId: item.content_id,
        nombre: item.nombre,
        varianteId: variante?.id || null,
        varianteNombre: variante?.nombre || null,
        ofertaId: oferta?.id || null,
        ofertaNombre: oferta?.nombre || null,
        precio,
        cantidad: nuevaCantidad,
        imagen: item.imagenes?.[0] || item.imagen || null,
        stockMax: stockMax ?? null,
      });
      return copia;
    });

    // Tracking del evento AddToCart (Meta Pixel, CAPI, GA, TikTok y Estadísticas)
    try {
      const eventId = generarEventId();
      const { fbc, fbp } = leerCookiesFacebook();
      const nombreCompleto = oferta?.nombre ? `${item.nombre} — ${oferta.nombre}` : (variante?.nombre ? `${item.nombre} (${variante.nombre})` : item.nombre);
      const valorTotal = (precio || 0) * cantidad;
      const customData = {
        content_ids: [item.content_id],
        content_name: nombreCompleto,
        content_type: item.tipo === 'combo' ? 'product_group' : 'product',
        value: valorTotal,
        currency: 'PYG',
        num_items: cantidad,
      };

      trackearEvento('AddToCart', eventId, customData);
      trackearEventoGA('add_to_cart', {
        item_id: item.content_id,
        item_name: nombreCompleto,
        price: precio,
        quantity: cantidad,
      });
      trackearEventoTikTok('AddToCart', {
        content_id: item.content_id,
        content_name: nombreCompleto,
        value: valorTotal,
      });

      registrarEventoLanding(slug, {
        event_name: 'AddToCart',
        event_id: eventId,
        event_source_url: window.location.href,
        fbc,
        fbp,
        custom_data: customData,
        items: [{
          content_id: item.content_id,
          nombre: nombreCompleto,
          cantidad,
          precio,
        }],
      });
    } catch (err) {
      console.warn('[tracking] AddToCart error:', err);
    }
  }

  function cambiarCantidadCarrito(clave, delta) {
    setCarrito(prev => {
      const actual = prev.get(clave);
      if (!actual) return prev;
      const nueva = actual.cantidad + delta;
      if (nueva <= 0) {
        const copia = new Map(prev);
        copia.delete(clave);
        return copia;
      }
      if (actual.stockMax != null && nueva > actual.stockMax) return prev;
      const copia = new Map(prev);
      copia.set(clave, { ...actual, cantidad: nueva });
      return copia;
    });
  }

  function quitarDelCarrito(clave) {
    setCarrito(prev => {
      const copia = new Map(prev);
      copia.delete(clave);
      return copia;
    });
  }

  /**
   * Reemplaza el viejo checkoutCarrito() que iba directo a WhatsApp: ahora
   * primero crea el pedido (Envío) real en el backend — el link de
   * WhatsApp, si corresponde, es un paso DESPUÉS de que el pedido ya
   * existe, no el checkout entero. El tracking (Meta/GA/TikTok/
   * Estadísticas) se sigue disparando igual que antes, ahora recién
   * después de que el backend confirma que el pedido se creó.
   *
   * @param {object} datosFormulario - lo que completó el visitante en CartDrawer.
   * @returns {{redirigido: boolean, pedido_id: number}}
   * @throws {Error} si el backend rechaza el pedido (ej. sin stock) — CartDrawer lo muestra.
   */
  async function confirmarPedido(datosFormulario) {
    const items = Array.from(carrito.values());
    if (!items.length) throw new Error('Tu carrito está vacío.');

    const resultado = await crearCheckoutLanding(slug, {
      ...datosFormulario,
      items: items.map(it => ({
        content_id: it.contentId,
        variante_id: it.varianteId || undefined,
        oferta_id: it.ofertaId || undefined,
        cantidad: it.cantidad,
      })),
    });

    const eventId = generarEventId();
    const { fbc, fbp } = leerCookiesFacebook();
    const esUnSolo = items.length === 1;
    const valorTotal = items.reduce((s, it) => s + (it.precio || 0) * it.cantidad, 0);
    const customData = {
      content_ids: items.map(it => it.contentId),
      content_name: esUnSolo ? items[0].nombre : `Carrito (${items.length} productos)`,
      content_type: esUnSolo && items[0].tipo !== 'combo' ? 'product' : 'product_group',
      value: valorTotal,
      currency: 'PYG',
      num_items: items.reduce((s, it) => s + it.cantidad, 0),
    };

    trackearEvento('InitiateCheckout', eventId, customData);
    trackearEvento('Contact', eventId + '-contact', customData);
    trackearEventoGA('checkout_whatsapp', { valor: valorTotal, cantidad_items: items.length });
    trackearEventoTikTok('Contact', { content_ids: customData.content_ids, value: valorTotal });

    const basePayload = {
      event_source_url: window.location.href,
      fbc,
      fbp,
      custom_data: customData,
      items: items.map(it => ({
        content_id: it.contentId,
        nombre: it.ofertaNombre ? `${it.nombre} — ${it.ofertaNombre}` : (it.varianteNombre ? `${it.nombre} (${it.varianteNombre})` : it.nombre),
        cantidad: it.cantidad,
        precio: it.precio,
      })),
    };

    registrarEventoLanding(slug, { ...basePayload, event_name: 'InitiateCheckout', event_id: eventId });
    registrarEventoLanding(slug, { ...basePayload, event_name: 'Contact', event_id: eventId + '-contact' });

    let redirigido = false;
    if (resultado.redirigir_whatsapp && contacto?.whatsapp) {
      const link = armarLinkWhatsappCarrito(contacto, items);
      if (link) {
        window.open(link, '_blank', 'noopener');
        redirigido = true;
      }
    }

    setCarrito(new Map());
    return { redirigido, pedido_id: resultado.pedido_id };
  }

  function contactar(item) {
    const eventId = generarEventId();
    const { fbc, fbp } = leerCookiesFacebook();
    const customData = {
      content_ids: [item.content_id],
      content_name: item.nombre,
      content_type: item.tipo === 'combo' ? 'product_group' : 'product',
      value: item.precio || 0,
      currency: 'PYG',
      num_items: 1,
    };

    trackearEvento('Contact', eventId, customData);
    trackearEventoGA('contact_whatsapp', { producto: item.nombre });
    trackearEventoTikTok('Contact', { content_id: item.content_id, content_name: item.nombre });

    // Se manda siempre, tenga o no Meta CAPI configurado: el backend igual
    // registra el evento en LandingEvento (ver landing.service.js) — es la
    // única fuente de las Estadísticas de la landing.
    registrarEventoLanding(slug, {
      event_name: 'Contact',
      event_id: eventId,
      event_source_url: window.location.href,
      fbc,
      fbp,
      custom_data: customData,
      items: [{
        content_id: item.content_id,
        nombre: item.nombre,
        cantidad: 1,
        precio: item.precio,
      }],
    });
  }

  const categorias = useMemo(() => data ? [...new Set(data.items.map(i => i.categoria).filter(Boolean))] : [], [data]);
  const marcas = useMemo(() => data ? [...new Set(data.items.map(i => i.marca).filter(Boolean))] : [], [data]);

  // Imagen de cada categoría para LandingCategoryStrip: la primera foto
  // disponible entre los items curados de ESTA landing en esa categoría —
  // no un campo propio (Categoria no tiene imagen, es un modelo global).
  const categoriaImagen = useMemo(() => {
    const mapa = new Map();
    if (!data) return mapa;
    data.items.forEach(i => {
      if (i.categoria && i.imagen && !mapa.has(i.categoria)) mapa.set(i.categoria, i.imagen);
    });
    return mapa;
  }, [data]);

  // Etiquetas agrupadas case-insensitive: "Ofertas" y "ofertas " son el mismo filtro.
  const etiquetas = useMemo(() => {
    if (!data) return [];
    const mapa = new Map();
    data.items.forEach(i => {
      if (i.etiqueta) {
        const clave = i.etiqueta.toLowerCase();
        if (!mapa.has(clave)) mapa.set(clave, i.etiqueta);
      }
    });
    return Array.from(mapa.values());
  }, [data]);

  // Producto.destacado ya existe en el catálogo (lo marca la dueña en el
  // picker de la landing) — ver LandingFeatured.jsx.
  const itemsDestacados = useMemo(() => data ? data.items.filter(i => i.destacado) : [], [data]);

  const itemsFiltrados = useMemo(() => {
    if (!data) return [];
    let arr = data.items;
    if (filtroCategoria) arr = arr.filter(i => i.categoria === filtroCategoria);
    if (filtroMarca) arr = arr.filter(i => i.marca === filtroMarca);
    if (filtroEtiqueta) arr = arr.filter(i => i.etiqueta && i.etiqueta.toLowerCase() === filtroEtiqueta.toLowerCase());
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      arr = arr.filter(i => i.nombre.toLowerCase().includes(q));
    }
    if (orden === 'asc') arr = [...arr].sort((a, b) => a.precio - b.precio);
    if (orden === 'desc') arr = [...arr].sort((a, b) => b.precio - a.precio);
    return arr;
  }, [data, filtroCategoria, filtroMarca, filtroEtiqueta, busqueda, orden]);

  if (estado === 'cargando') {
    return <div className="lp-status-page"><div className="lp-spinner" /></div>;
  }

  if (estado === 'no-encontrada' || estado === 'no-disponible') {
    return (
      <div className="lp-status-page">
        <h1>Esta vidriera no está disponible</h1>
        <p>El link puede haber cambiado o el catálogo ya no está activo.</p>
      </div>
    );
  }

  function handleAgregarRapido(e, item) {
    e.stopPropagation();
    const tieneOfertasNormales = (item.ofertas || []).some(o => o.estrategia === 'normal');
    if (item.variantes?.length > 0 || tieneOfertasNormales) {
      setItemAbierto(item);
      return;
    }
    agregarAlCarrito({
      item,
      variante: null,
      oferta: null,
      cantidad: 1,
      precio: item.precio,
    });
    setAgregadoRapido(item.content_id);
    setTimeout(() => setAgregadoRapido(null), 1400);
  }

  function limpiarFiltros() {
    setFiltroCategoria('');
    setFiltroMarca('');
    setFiltroEtiqueta('');
    setBusqueda('');
    setOrden('');
  }

  const { filtros, contacto, banner } = data;
  const hayFiltrosVisibles = filtros.categoria || filtros.marca || filtros.etiqueta || filtros.buscador || filtros.orden_precio;
  const hayFiltroActivo = !!(filtroCategoria || filtroMarca || filtroEtiqueta || busqueda.trim() || orden);
  // Sin link, el botón lleva a la grilla de productos de esta misma página.
  const bannerLinkEsExterno = banner?.boton_link && /^https?:\/\//i.test(banner.boton_link);

  const totalItems = data.items.length;
  const conteo = hayFiltroActivo && itemsFiltrados.length !== totalItems
    ? `${itemsFiltrados.length} de ${totalItems} productos`
    : `${totalItems} producto${totalItems === 1 ? '' : 's'}`;

  const cantidadOpiniones = data.testimonios?.length || 0;
  const ratingPromedio = cantidadOpiniones > 0
    ? data.testimonios.reduce((s, t) => s + t.calificacion, 0) / cantidadOpiniones
    : 0;

  function seleccionarCategoria(cat) {
    setFiltroCategoria(cat);
    document.getElementById('lp-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const seccionesOrdenadas = Array.isArray(data.secciones) && data.secciones.length
    ? data.secciones.map((s, idx) => ({ ...s, orden: s.orden ?? idx }))
    : [
      'header', 'hero', 'beneficios', 'categorias', 'destacados',
      'banner', 'productos', 'testimonios', 'faq', 'footer',
    ].map((tipo, idx) => ({ tipo, activo: true, orden: idx }));
  const ordenSeccion = new Map(seccionesOrdenadas.map((s, idx) => [s.tipo, idx]));
  const visibleSeccion = (tipo) => seccionesOrdenadas.find(s => s.tipo === tipo)?.activo !== false;
  const ordenLayout = (tipo) => ordenSeccion.has(tipo) ? ordenSeccion.get(tipo) : 99;
  const contenidoSeccion = (tipo) => seccionesOrdenadas.find(s => s.tipo === tipo)?.contenido || {};

  return (
    <div
      className={`lp-page ${data.tema.modo === 'claro' ? 'claro' : ''}`}
      style={{ ...calcularEstiloLanding({ tema: data.tema, diseno: data.diseno }), display: 'flex', flexDirection: 'column' }}
    >
      {visibleSeccion('header') && (
        <div style={{ order: ordenLayout('header') }}>
          <LandingHeader
            nombre={contenidoSeccion('header').logo_texto || data.titulo}
            mostrarBuscador={!!filtros.buscador}
            mostrarCategorias={categorias.length > 0}
            mostrarTestimonios={cantidadOpiniones > 0}
            mostrarFaq={(data.faq?.length || 0) > 0}
            cantidadCarrito={Array.from(carrito.values()).reduce((s, it) => s + it.cantidad, 0)}
            onAbrirCarrito={() => setCarritoAbierto(true)}
          />
        </div>
      )}

      {visibleSeccion('announcement_bar') && contenidoSeccion('announcement_bar').texto && (
        <section className="lp-custom-announcement" style={{ order: ordenLayout('announcement_bar') }}>
          {contenidoSeccion('announcement_bar').texto}
        </section>
      )}

      {visibleSeccion('hero') && (
        <div style={{ order: ordenLayout('hero') }}>
          <LandingHero
            titulo={data.titulo}
            descripcion={data.descripcion}
            totalItems={totalItems}
            totalCategorias={categorias.length}
            ratingPromedio={ratingPromedio}
            cantidadOpiniones={cantidadOpiniones}
            whatsapp={contacto?.whatsapp}
          />
        </div>
      )}

      {visibleSeccion('beneficios') && <div style={{ order: ordenLayout('beneficios') }}><LandingBenefits /></div>}

      {visibleSeccion('categorias') && categorias.length > 0 && (
        <div style={{ order: ordenLayout('categorias') }}>
          <LandingCategoryStrip
            categorias={categorias}
            categoriaImagen={categoriaImagen}
            onSeleccionar={seleccionarCategoria}
          />
        </div>
      )}

      {visibleSeccion('destacados') && itemsDestacados.length > 0 && (
        <div style={{ order: ordenLayout('destacados') }}>
          <LandingFeatured
            items={itemsDestacados}
            contacto={contacto}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            agregadoRapido={agregadoRapido}
            onAgregarRapido={handleAgregarRapido}
            onAbrir={setItemAbierto}
            onContactar={contactar}
          />
        </div>
      )}

      {visibleSeccion('banner') && banner && (
        <div
          className={`lp-banner ${banner.imagen ? 'con-imagen' : ''}`}
          style={{
            order: ordenLayout('banner'),
            ...(banner.imagen ? { backgroundImage: `url(${getMediaUrl(banner.imagen)})` } : {}),
          }}
        >
          <div className="lp-banner-overlay">
            {banner.titulo && <h2>{banner.titulo}</h2>}
            {banner.subtitulo && <p>{banner.subtitulo}</p>}
            {banner.boton_texto && (
              <a
                className="lp-banner-btn"
                href={banner.boton_link || '#lp-productos'}
                target={bannerLinkEsExterno ? '_blank' : undefined}
                rel={bannerLinkEsExterno ? 'noopener noreferrer' : undefined}
              >
                {banner.boton_texto}
              </a>
            )}
          </div>
        </div>
      )}

      {visibleSeccion('productos') && <main className="lp-shell" style={{ order: ordenLayout('productos') }}>
        <header className="lp-header">
          <span className="lp-header-eyebrow">{conteo}</span>
          <h2 className="lp-header-titulo">Todos los productos</h2>
        </header>

        {hayFiltrosVisibles && (
          <div className="lp-filterbar">
            <div className="lp-filters">
              {filtros.buscador && (
                <div className="lp-search">
                  <Search size={14} />
                  <input id="lp-buscador-input" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
              )}
              {filtros.categoria && categorias.length > 0 && (
                <LandingDropdown
                  value={filtroCategoria}
                  onChange={setFiltroCategoria}
                  options={[{ value: '', label: 'Todas las categorías' }, ...categorias.map(c => ({ value: c, label: c }))]}
                />
              )}
              {filtros.marca && marcas.length > 0 && (
                <LandingDropdown
                  value={filtroMarca}
                  onChange={setFiltroMarca}
                  options={[{ value: '', label: 'Todas las marcas' }, ...marcas.map(m => ({ value: m, label: m }))]}
                />
              )}
              {filtros.etiqueta && etiquetas.length > 0 && (
                <LandingDropdown
                  value={filtroEtiqueta}
                  onChange={setFiltroEtiqueta}
                  options={[{ value: '', label: 'Todas las etiquetas' }, ...etiquetas.map(e => ({ value: e, label: e }))]}
                />
              )}
              {filtros.orden_precio && (
                <LandingDropdown
                  value={orden}
                  onChange={setOrden}
                  options={[
                    { value: '', label: 'Orden por defecto' },
                    { value: 'asc', label: 'Precio: menor a mayor' },
                    { value: 'desc', label: 'Precio: mayor a menor' },
                  ]}
                />
              )}
            </div>
          </div>
        )}

        {itemsFiltrados.length === 0 ? (
          <div className="lp-empty">
            <p>Ningún producto coincide con lo que buscaste.</p>
            {hayFiltroActivo && (
              <button type="button" className="lp-empty-reset" onClick={limpiarFiltros}>
                Ver todo el catálogo
              </button>
            )}
          </div>
        ) : (
          <div className="lp-grid" id="lp-productos">
            {itemsFiltrados.map(item => {
              const linkWhatsapp = armarLinkWhatsapp(contacto, item);
              return (
                // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                <div key={item.content_id} className="lp-card" onClick={() => setItemAbierto(item)} role="button" tabIndex={0}>
                  <div className="lp-card-media">
                    {item.imagen ? (
                      <img src={getMediaUrl(item.imagen)} alt={item.nombre} loading="lazy" />
                    ) : (
                      <div className="lp-card-media-placeholder">
                        {item.tipo === 'combo' ? <Layers size={32} /> : <ImageOff size={32} />}
                        <span>Sin imagen</span>
                      </div>
                    )}
                    <div className="lp-card-badges">
                      {item.tipo === 'combo' && <span className="lp-card-badge combo"><Layers size={11} /> Combo</span>}
                      {esNuevo(item) && <span className="lp-card-badge nuevo">Nuevo</span>}
                    </div>
                    {item.variantes?.length > 0 && <span className="lp-card-badge variantes">{item.variantes.length} opciones</span>}
                    <button
                      type="button"
                      className={`lp-card-wishlist ${wishlist.has(item.content_id) ? 'activo' : ''}`}
                      onClick={(e) => toggleWishlist(e, item.content_id)}
                      title={wishlist.has(item.content_id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      aria-pressed={wishlist.has(item.content_id)}
                    >
                      <Heart size={14} fill={wishlist.has(item.content_id) ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      className="lp-card-quickview"
                      onClick={(e) => { e.stopPropagation(); setItemAbierto(item); }}
                    >
                      <Eye size={13} /> Vista rápida
                    </button>
                  </div>
                  <div className="lp-card-body">
                    {item.etiqueta && <span className="lp-card-tag">{item.etiqueta}</span>}
                    <h3>{item.nombre}</h3>
                    <span className="lp-card-price">{formatPrecio(item.precio)}</span>

                    <div className="lp-card-actions">
                      <button
                        type="button"
                        className={`lp-card-btn-add ${agregadoRapido === item.content_id ? 'agregado' : ''}`}
                        onClick={(e) => handleAgregarRapido(e, item)}
                        title="Agregar al carrito"
                      >
                        {agregadoRapido === item.content_id ? (
                          <><Check size={14} /> Agregado</>
                        ) : (
                          <><Plus size={14} /> Agregar</>
                        )}
                      </button>
                      {linkWhatsapp && (
                        <a
                          className="lp-card-contact-btn"
                          href={linkWhatsapp}
                          target="_blank"
                          rel="noreferrer"
                          title="Consultar por WhatsApp"
                          onClick={(e) => { e.stopPropagation(); contactar(item); }}
                        >
                          <MessageCircle size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>}

      {visibleSeccion('texto') && (
        <section className="lp-custom-section" style={{ order: ordenLayout('texto') }}>
          {contenidoSeccion('texto').titulo && <h2>{contenidoSeccion('texto').titulo}</h2>}
          {contenidoSeccion('texto').texto && <p>{contenidoSeccion('texto').texto}</p>}
        </section>
      )}

      {visibleSeccion('como_funciona') && (
        <section className="lp-custom-section" style={{ order: ordenLayout('como_funciona') }}>
          <h2>{contenidoSeccion('como_funciona').titulo || 'Como funciona'}</h2>
          <div className="lp-steps-grid">
            {(contenidoSeccion('como_funciona').pasos || []).map((paso, idx) => (
              <article key={`${paso}-${idx}`} className="lp-step-card">
                <span>{idx + 1}</span>
                <p>{paso}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {visibleSeccion('redes_sociales') && (
        <section className="lp-social-section" style={{ order: ordenLayout('redes_sociales') }}>
          <h2>{contenidoSeccion('redes_sociales').titulo || 'Seguinos'}</h2>
          <div>
            {contenidoSeccion('redes_sociales').instagram && <a href={contenidoSeccion('redes_sociales').instagram} target="_blank" rel="noreferrer">Instagram</a>}
            {contenidoSeccion('redes_sociales').facebook && <a href={contenidoSeccion('redes_sociales').facebook} target="_blank" rel="noreferrer">Facebook</a>}
            {contenidoSeccion('redes_sociales').tiktok && <a href={contenidoSeccion('redes_sociales').tiktok} target="_blank" rel="noreferrer">TikTok</a>}
          </div>
        </section>
      )}

      {visibleSeccion('testimonios') && cantidadOpiniones > 0 && (
        <div style={{ order: ordenLayout('testimonios') }}>
          <LandingTestimonials testimonios={data.testimonios} />
        </div>
      )}
      {visibleSeccion('faq') && (data.faq?.length || 0) > 0 && (
        <div style={{ order: ordenLayout('faq') }}>
          <LandingFaq items={data.faq} />
        </div>
      )}

      {visibleSeccion('footer') && <footer id="lp-contacto" className="lp-footer" style={{ order: ordenLayout('footer') }}>
        <div className="lp-footer-inner">
          <div>
            <p className="lp-footer-nombre">{contenidoSeccion('footer').titulo || data.titulo}</p>
            {(contenidoSeccion('footer').descripcion || data.descripcion) && <p className="lp-footer-desc">{contenidoSeccion('footer').descripcion || data.descripcion}</p>}
          </div>
          <nav className="lp-footer-links">
            {categorias.length > 0 && <a href="#lp-categorias">Categorías</a>}
            <a href="#lp-productos">Productos</a>
            {cantidadOpiniones > 0 && <a href="#lp-opiniones">Opiniones</a>}
            {(data.faq?.length || 0) > 0 && <a href="#lp-faq">Preguntas frecuentes</a>}
          </nav>
          {contacto?.whatsapp && (
            <a
              className="lp-footer-wsp"
              href={`https://wa.me/${contacto.whatsapp}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={15} /> Escribinos por WhatsApp
            </a>
          )}
        </div>
      </footer>}

      {itemAbierto && (
        <ProductDetailModal
          item={itemAbierto}
          onClose={() => setItemAbierto(null)}
          onAgregar={agregarAlCarrito}
          contacto={contacto}
          onContactar={contactar}
        />
      )}

      <CartDrawer
        items={Array.from(carrito.values())}
        sugerencias={sugerenciasCarrito}
        onAgregarSugerencia={agregarSugerencia}
        abierto={carritoAbierto}
        onAbrir={() => setCarritoAbierto(true)}
        onCerrar={() => setCarritoAbierto(false)}
        onCantidad={cambiarCantidadCarrito}
        onQuitar={quitarDelCarrito}
        onConfirmarPedido={confirmarPedido}
      />
    </div>
  );
}
