import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obtenerCatalogoLandingPublica } from '../../services/landingPublicaService';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import { galeriaTarjetaDeItem, mapPublicDtoToTemplateData } from '../landing-simple/mapLandingToTemplateData';
import { getMediaUrl } from '../../services/api';
import { Store, Loader } from 'lucide-react';
import { calcularEstiloLanding } from '../../lib/landingDiseno';
import { hexToRgba, resolverTemaPorSlug } from '../landing-simple/templates/themeUtils';
import { RedesSocialesFooter } from '../landing-simple/templates/sections';
import StoreFooterLegal from './StoreFooterLegal';
import StoreHeader from '../landing-simple/templates/StoreHeader';
import CatalogoView from '../landing-simple/templates/CatalogoView';
import CartDrawer from './CartDrawer';
import { useStoreCart } from './useStoreCart';

/**
 * Catálogo completo de la landing (todos los items seleccionados en el
 * panel "Productos" del editor, no solo los destacados del home). Barra de
 * filtros horizontal y compacta (ordenar/disponibilidad/etiqueta + precio),
 * en vez de un sidebar pesado — mismo criterio que una vidriera de
 * e-commerce estándar (grilla al frente, filtros livianos arriba).
 */
const FILTROS_INICIALES = { orden: 'destacados', disponibilidad: 'todos', categoria: 'todas', etiqueta: 'todas', precioMin: '', precioMax: '' };

export default function CatalogoPublico() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [estadoCarga, setEstadoCarga] = useState('cargando');
  const [data, setData] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [pagina, setPagina] = useState(1);
  // Distinto del spinner de pantalla completa: esto es solo un dim sutil de
  // la grilla mientras se pide una página/filtro nuevo, para no perder el
  // scroll ni el layout en cada cambio (ver CatalogoView -> prop `cargando`).
  const [cargandoPagina, setCargandoPagina] = useState(false);

  // Todo filtro/orden/página se resuelve del lado del servidor: el
  // catálogo puede tener más productos de los que trae esta página, así
  // que filtrar solo lo ya cargado haría que una búsqueda por categoría no
  // encuentre productos reales que cayeron en otra página (ver AskUserQuestion
  // de esta sesión). setFiltros/setPagina.
  useEffect(() => {
    let activo = true;
    const esPrimeraCarga = data === null;
    if (!esPrimeraCarga) setCargandoPagina(true);
    obtenerCatalogoLandingPublica(slug, { ...filtros, pagina })
      .then((res) => {
        if (!activo) return;
        if (res === null) return setEstadoCarga('no-encontrada');
        if (!res.disponible) return setEstadoCarga('no-disponible');
        setData(res);
        setEstadoCarga('ok');
      })
      .catch(() => {
        if (activo) setEstadoCarga('no-encontrada');
      })
      .finally(() => {
        if (activo) setCargandoPagina(false);
      });
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, filtros, pagina]);

  function handleFiltrosChange(patch) {
    setFiltros(prev => ({ ...prev, ...patch }));
    setPagina(1); // cualquier cambio de filtro vuelve a arrancar desde la página 1
  }

  function handleCambiarPagina(nuevaPagina) {
    setPagina(nuevaPagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useDocumentSeo(data ? `Catálogo - ${data.titulo || data.tienda?.nombre}` : 'Catálogo', data?.seo_descripcion || '');

  const catalogoCompleto = useMemo(
    () => (data?.catalogo_items?.length ? data.catalogo_items : (data?.items || [])),
    [data]
  );
  const cartState = useStoreCart(slug, data, catalogoCompleto);
  const datosTemplate = useMemo(() => mapPublicDtoToTemplateData(data), [data]);
  const productos = useMemo(() => (data?.catalogo_items || []).map(i => ({
    id: i.content_id,
    nombre: i.nombre,
    precio: i.precio,
    precioAntes: i.precio_antes,
    imagen: i.imagen ? getMediaUrl(i.imagen) : null,
    // Solo imágenes/miniaturas para la tarjeta: un link de video no puede ir
    // como <img src>, porque se ve como imagen rota.
    imagenes: galeriaTarjetaDeItem(i),
    categoria: i.categoria || null,
    etiqueta: i.etiqueta || null,
    stock: i.stock,
  })), [data?.catalogo_items]);

  if (estadoCarga === 'cargando') return <div className="min-h-screen flex items-center justify-center bg-canvas"><Loader className="animate-spin text-white/50" /></div>;
  if (estadoCarga === 'no-encontrada') return <div className="min-h-screen flex items-center justify-center bg-canvas text-white">Tienda no encontrada.</div>;
  if (estadoCarga === 'no-disponible') return <div className="min-h-screen flex items-center justify-center bg-canvas text-white">Esta tienda no está disponible actualmente.</div>;

  const { nombreComercio, logo, contacto, tema: temaData } = datosTemplate;
  // `productos_titulo` (panel "Productos" del editor) es el título de la
  // sección "Productos destacados" del home — en esta página de catálogo
  // completo se usa solo si el comercio lo personalizó explícitamente,
  // nunca el default genérico de esa sección ("Productos destacados"), que
  // no tiene sentido como título de esta página.
  // Título propio de esta página (catalogo_titulo); si no lo personalizaron,
  // se cae al genérico — NUNCA a productos_titulo, que es el de la sección
  // "Productos destacados" del home (son dos páginas distintas).
  // Vacío = sin título (regla de las portadas rígidas: nunca un texto que
  // el comercio no escribió).
  const tituloCatalogo = data?.catalogo_titulo || '';
  const tema = resolverTemaPorSlug(temaData, data?.template?.slug);
  const bordeSuave = hexToRgba(tema.texto, 0.1);

  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const linkInicio = isLocalFallback && slug ? `/l/${slug}` : '/';
  const linkContacto = isLocalFallback && slug ? `/l/${slug}/contacto` : '/contacto';
  const linkProducto = (productoId) => (isLocalFallback && slug ? `/l/${slug}/${productoId}` : `/${productoId}`);

  // El CartDrawer (y cualquier clase `lp-*` del CSS compartido) toma sus
  // colores de las variables --l-*, que acá no llegaban: a diferencia del
  // home y la ficha de producto (que se montan dentro del wrapper con
  // cssVarsRigido de TiendaPaginaView.jsx), esta página es una ruta propia
  // y nunca las definía — el carrito quedaba con los fallbacks
  // hardcodeados del CSS (gris/negro) en vez del tema real de la tienda.
  // Mismo cálculo de "modo" que TiendaPaginaView.jsx, para que dé exactamente
  // el mismo resultado que en esas páginas.
  const modoOscuro = (() => {
    const hex = (tema.fondo || '#000').toLowerCase().match(/#([0-9a-f]{6})/)?.[1];
    if (!hex) return true;
    const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) <= 0.5;
  })();
  const cssVarsCarrito = calcularEstiloLanding({
    tema: { primario: tema.acento, fondo: tema.fondo, texto: tema.texto, modo: modoOscuro ? 'oscuro' : 'claro' },
    diseno: {},
  });

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ ...cssVarsCarrito, backgroundColor: tema.fondo, color: tema.texto }}>
      {data?.template?.kind === 'rigido' ? (
        <StoreHeader
          templateSlug={data.template.slug}
          nombreComercio={nombreComercio}
          logo={logo}
          tema={resolverTemaPorSlug(temaData, data.template.slug)}
          cantidadCarrito={Array.from(cartState.carrito.values()).reduce((s, it) => s + it.cantidad, 0)}
          onAbrirCarrito={() => cartState.setCarritoAbierto(true)}
          linkInicio={linkInicio}
          linkCatalogo={isLocalFallback && slug ? `/l/${slug}/catalogo` : '/catalogo'}
          linkContacto={linkContacto}
          previewMode={false}
        />
      ) : (
        <header className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur z-20" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(temaData?.fondo || '#fff', 0.95) }}>
          <a href={linkInicio} className="flex items-center gap-2 transition-opacity hover:opacity-80">
            {logo ? (
              <img src={logo} alt={nombreComercio} className="h-9 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: temaData?.acento }}><Store size={18} style={{ color: temaData?.fondo }} /></div>
            )}
            <span className="font-bold tracking-tight text-lg" style={{ color: temaData?.texto }}>{nombreComercio}</span>
          </a>
          <nav className="flex gap-4">
            <a href={linkContacto} className="font-semibold text-sm hover:opacity-80 transition-opacity" style={{ color: temaData?.texto }}>Contacto</a>
          </nav>
        </header>
      )}

      <main className="flex-1 flex flex-col">
        <CatalogoView
          productos={productos}
          titulo={tituloCatalogo}
          descripcion={data?.catalogo_descripcion}
          tema={tema}
          bordeSuave={bordeSuave}
          onClickProducto={(p) => navigate(linkProducto(p.id))}
          previewMode={false}
          filtrosControlados={filtros}
          onFiltrosControladosChange={handleFiltrosChange}
          categoriasDisponibles={data?.categorias_disponibles || []}
          etiquetasDisponibles={data?.etiquetas_disponibles || []}
          totalResultados={data?.paginacion?.total ?? productos.length}
          paginacion={data?.paginacion || null}
          onCambiarPagina={handleCambiarPagina}
          cargando={cargandoPagina}
        />
      </main>
      <CartDrawer
        items={Array.from(cartState.carrito.values())}
        sugerencias={cartState.sugerenciasCarrito}
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
      />

      {/* Mismo pie que el home (BasicTemplate.jsx y hermanos): primero las
          redes sociales, y el copyright al final de TODO — consistente en
          las 3 páginas (inicio/catálogo/contacto). */}
      {contacto && (
        <RedesSocialesFooter contacto={contacto} acento={tema.acento} bordeSuave={bordeSuave} isMobile={false} />
      )}
      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={false} />
    </div>
  );
}
