import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, MessageCircle, Package, Layers, ImageOff, ShoppingCart, Plus, Check } from 'lucide-react';
import { obtenerLandingPublica, registrarEventoLanding } from '../../services/landingPublicaService';
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
import './landingPublica.css';

function claveCarrito(item, varianteId) {
  return `${item.tipo}:${item.content_id}:${varianteId || 'base'}`;
}

function cargarCarritoGuardado(slug) {
  try {
    const crudo = localStorage.getItem(`gesicomm-carrito-${slug || 'home'}`);
    return crudo ? new Map(JSON.parse(crudo)) : new Map();
  } catch {
    return new Map(); // localStorage puede no estar disponible (modo privado) — el carrito solo vive en memoria.
  }
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

  function agregarAlCarrito({ item, variante, cantidad, precio }) {
    const clave = claveCarrito(item, variante?.id);
    const stockMax = variante ? variante.stock : item.stock;
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
        precio,
        cantidad: nuevaCantidad,
        imagen: item.imagenes?.[0] || item.imagen || null,
        stockMax: stockMax ?? null,
      });
      return copia;
    });
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

  function checkoutCarrito() {
    const items = Array.from(carrito.values());
    // El checkout solo se puede disparar desde el drawer, que solo se
    // renderiza con estado==='ok' — data ya está poblado en ese punto.
    const link = armarLinkWhatsappCarrito(data.contacto, items);
    if (!link) return;

    const eventId = generarEventId();
    const { fbc, fbp } = leerCookiesFacebook();
    const esUnSolo = items.length === 1;
    const customData = {
      content_ids: items.map(it => it.contentId),
      content_name: esUnSolo ? items[0].nombre : `Carrito (${items.length} productos)`,
      content_type: esUnSolo && items[0].tipo !== 'combo' ? 'product' : 'product_group',
    };

    trackearEvento('Contact', eventId, customData);
    const valorTotal = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
    trackearEventoGA('checkout_whatsapp', { valor: valorTotal, cantidad_items: items.length });
    trackearEventoTikTok('Contact', { content_ids: customData.content_ids, value: valorTotal });

    registrarEventoLanding(slug, {
      event_name: 'Contact',
      event_id: eventId,
      event_source_url: window.location.href,
      fbc,
      fbp,
      custom_data: customData,
      // Detalle por producto para que "Productos con más consultas" en
      // Estadísticas no pierda info cuando el evento junta varios (ver
      // landing.service.js estadisticas()).
      items: items.map(it => ({
        content_id: it.contentId,
        nombre: it.varianteNombre ? `${it.nombre} (${it.varianteNombre})` : it.nombre,
        cantidad: it.cantidad,
        precio: it.precio,
      })),
    });

    window.open(link, '_blank', 'noopener');
    setCarrito(new Map());
    setCarritoAbierto(false);
  }

  function contactar(item) {
    const eventId = generarEventId();
    const { fbc, fbp } = leerCookiesFacebook();
    const customData = {
      content_ids: [item.content_id],
      content_name: item.nombre,
      content_type: item.tipo === 'combo' ? 'product_group' : 'product',
    };

    trackearEvento('Contact', eventId, customData);
    trackearEventoGA('contact_whatsapp', { producto: item.nombre });
    trackearEventoTikTok('Contact', { content_id: item.content_id, content_name: item.nombre });

    // Se manda siempre, tenga o no Meta CAPI configurado: el backend igual
    // registra el evento en LandingEvento (ver landing.service.js) — es la
    // única fuente de las Estadísticas de la landing. Antes esto quedaba
    // gateado detrás de capi_activo y las tiendas sin CAPI no generaban
    // ningún dato de conversión.
    registrarEventoLanding(slug, {
      event_name: 'Contact',
      event_id: eventId,
      event_source_url: window.location.href,
      fbc,
      fbp,
      custom_data: customData,
    });
  }

  const categorias = useMemo(() => data ? [...new Set(data.items.map(i => i.categoria).filter(Boolean))] : [], [data]);
  const marcas = useMemo(() => data ? [...new Set(data.items.map(i => i.marca).filter(Boolean))] : [], [data]);

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
    if (item.variantes?.length > 0) {
      setItemAbierto(item);
      return;
    }
    agregarAlCarrito({
      item,
      variante: null,
      cantidad: 1,
      precio: item.precio,
    });
    setAgregadoRapido(item.content_id);
    setTimeout(() => setAgregadoRapido(null), 1400);
  }

  const { filtros, contacto, banner } = data;
  const hayFiltrosVisibles = filtros.categoria || filtros.marca || filtros.etiqueta || filtros.buscador || filtros.orden_precio;
  // Sin link, el botón lleva a la grilla de productos de esta misma página.
  const bannerLinkEsExterno = banner?.boton_link && /^https?:\/\//i.test(banner.boton_link);

  return (
    <div
      className={`lp-page ${data.tema.modo === 'claro' ? 'claro' : ''}`}
      style={calcularEstiloLanding({ tema: data.tema, diseno: data.diseno })}
    >
      {banner && (
        <div
          className={`lp-banner ${banner.imagen ? 'con-imagen' : ''}`}
          style={banner.imagen ? { backgroundImage: `url(${getMediaUrl(banner.imagen)})` } : undefined}
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

      <header className="lp-header">
        <h1>{data.titulo}</h1>
        {data.descripcion && <p>{data.descripcion}</p>}
      </header>

      {hayFiltrosVisibles && (
        <div className="lp-filters">
          {filtros.buscador && (
            <div className="lp-search">
              <Search size={14} />
              <input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
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
      )}

      {itemsFiltrados.length === 0 ? (
        <div className="lp-empty">No hay productos que coincidan con el filtro.</div>
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
                  {item.tipo === 'combo' && <span className="lp-card-badge combo"><Layers size={11} /> Combo</span>}
                  {item.variantes?.length > 0 && <span className="lp-card-badge variantes">{item.variantes.length} opciones</span>}
                </div>
                <div className="lp-card-body">
                  {item.etiqueta && <span className="lp-card-tag">{item.etiqueta}</span>}
                  <h3>{item.nombre}</h3>
                  {item.descripcion && <p className="lp-card-desc">{item.descripcion}</p>}
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
                      ) : item.variantes?.length > 0 ? (
                        <><ShoppingCart size={14} /> Ver opciones</>
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
        abierto={carritoAbierto}
        onAbrir={() => setCarritoAbierto(true)}
        onCerrar={() => setCarritoAbierto(false)}
        onCantidad={cambiarCantidadCarrito}
        onQuitar={quitarDelCarrito}
        onCheckout={checkoutCarrito}
        whatsappConfigurado={!!contacto?.whatsapp}
      />
    </div>
  );
}
