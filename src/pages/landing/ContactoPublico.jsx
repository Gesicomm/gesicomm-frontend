import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { obtenerLandingPublica } from '../../services/landingPublicaService';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import { mapPublicDtoToTemplateData } from '../landing-simple/mapLandingToTemplateData';
import { calcularEstiloLanding } from '../../lib/landingDiseno';
import { Store, Loader } from 'lucide-react';
import { hexToRgba, resolverTemaPorSlug } from '../landing-simple/templates/themeUtils';
import StoreFooterLegal from './StoreFooterLegal';
import StoreHeader from '../landing-simple/templates/StoreHeader';
import ContactoView from '../landing-simple/templates/ContactoView';
import CartDrawer from './CartDrawer';
import { useStoreCart } from './useStoreCart';
import LandingCodigoPublica from '../landing-simple/LandingCodigoPublica';
import { esPlantillaLegalGenerica, normalizarEstiloPaginaFooter, plantillaLegalPara } from '../landing-simple/plantillasLegalesCodigo';

function tiendaParaPlantillaContacto(data) {
  return {
    nombre: data?.tienda?.nombre || data?.titulo || '',
    telefono: data?.contacto_landing?.telefono || data?.contacto?.telefono || data?.contacto_telefono || '',
    whatsapp: data?.contacto_landing?.whatsapp || data?.contacto?.whatsapp || data?.contacto_whatsapp || '',
    email: data?.contacto_landing?.email || data?.contacto?.email || data?.contacto_email || '',
    direccion_publica: data?.contacto_landing?.direccion || data?.contacto?.direccion || data?.contacto_direccion || '',
    ciudad_publica: data?.contacto_landing?.ciudad || data?.contacto_ciudad || '',
    instagram: data?.contacto_landing?.instagram || data?.contacto_instagram || '',
    facebook: data?.contacto_landing?.facebook || data?.contacto_facebook || '',
    tiktok: data?.contacto_landing?.tiktok || data?.contacto_tiktok || '',
    ruc: data?.tienda?.ruc || '',
    documento: data?.tienda?.documento || '',
  };
}

export default function ContactoPublico() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [estado, setEstado] = useState('cargando');
  const [data, setData] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerLandingPublica(slug)
      .then((res) => {
        if (!activo) return;
        if (res === null) return setEstado('no-encontrada');
        if (!res.disponible) return setEstado('no-disponible');
        setData(res);
        setEstado('ok');
      })
      .catch(() => {
        if (activo) setEstado('no-encontrada');
      });
    return () => { activo = false; };
  }, []);

  useDocumentSeo(data?.seo_titulo || data?.titulo || 'Contacto', data?.seo_descripcion || '');

  const catalogoCompleto = data?.catalogo_items?.length ? data.catalogo_items : (data?.items || []);
  const cartState = useStoreCart(slug, data, catalogoCompleto);

  if (estado === 'cargando') return <div className="min-h-screen flex items-center justify-center bg-canvas"><Loader className="animate-spin text-white/50" /></div>;
  if (estado === 'no-encontrada') return <div className="min-h-screen flex items-center justify-center bg-canvas text-white">Tienda no encontrada.</div>;
  if (estado === 'no-disponible') return <div className="min-h-screen flex items-center justify-center bg-canvas text-white">Esta tienda no está disponible actualmente.</div>;

  const datosTemplate = mapPublicDtoToTemplateData(data);
  const { nombreComercio, logo, contacto, tema: temaData } = datosTemplate;
  const tema = resolverTemaPorSlug(temaData, data?.template?.slug);
  const bordeSuave = hexToRgba(tema.texto, 0.1);
  const contactoGuardado = data?.content?.vistas?.legales?.contacto;
  const codigoContacto = contactoGuardado?.html && !esPlantillaLegalGenerica(contactoGuardado)
    ? normalizarEstiloPaginaFooter(contactoGuardado)
    : plantillaLegalPara('contacto', tiendaParaPlantillaContacto(data));

  if (data?.template?.kind === 'codigo' && codigoContacto?.html) {
    return (
      <LandingCodigoPublica
        codigo={codigoContacto}
        titulo={`Contacto - ${data?.tienda?.nombre || data?.titulo || ''}`}
        data={data}
        slug={slug}
        modoLegal
      />
    );
  }

  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const linkInicio = isLocalFallback && slug ? `/l/${slug}` : '/';
  const linkCatalogo = isLocalFallback && slug ? `/l/${slug}/catalogo` : '/catalogo';

  // Mismo fix que CatalogoPublico.jsx: sin estas variables --l-* el
  // CartDrawer cae en los fallbacks hardcodeados del CSS en vez del tema
  // real de la tienda (ver el comentario largo allá).
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
          linkContacto={isLocalFallback && slug ? `/l/${slug}/contacto` : '/contacto'}
          previewMode={false}
        />
      ) : (
        <header className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur z-10" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(temaData?.fondo || '#fff', 0.95) }}>
          <a href={linkInicio} className="flex items-center gap-2 transition-opacity hover:opacity-80">
            {logo ? (
              <img src={logo} alt={nombreComercio} className="h-9 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: temaData?.acento }}><Store size={18} style={{ color: temaData?.fondo }} /></div>
            )}
            <span className="font-bold tracking-tight text-lg" style={{ color: temaData?.texto }}>{nombreComercio}</span>
          </a>
          <nav className="flex gap-4">
            <a href={isLocalFallback && slug ? `/l/${slug}/catalogo` : '/catalogo'} className="font-semibold text-sm hover:opacity-80 transition-opacity" style={{ color: temaData?.texto }}>Catálogo</a>
          </nav>
        </header>
      )}

      {/* Dos bloques distintos: los datos de contacto reales (dirección,
          ciudad, país, teléfono, email, horarios) y aparte las redes
          sociales. Antes esta página mostraba SOLO redes y descartaba los
          datos reales aunque estuvieran cargados. */}
      <main className="flex-1 flex flex-col">
        <ContactoView contacto={contacto} tema={tema} bordeSuave={bordeSuave} />
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

      {/* Mismo pie que el home y el catálogo — consistente en las 3 páginas. */}
      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={false} />
    </div>
  );
}
