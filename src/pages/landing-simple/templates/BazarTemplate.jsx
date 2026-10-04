import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { hexToRgba, resolverTema } from './themeUtils';
import { BeneficiosSection, FaqSection, RedesSocialesFooter, AccionesProducto, ImagenProductoHover, textoOMuestra } from './sections';
import StoreHeader from "./StoreHeader";
import StoreFooterLegal from '../../landing/StoreFooterLegal';
import HeroCarousel from './HeroCarousel';

const DEFAULT_TEMA = { fondo: '#FBFAF7', texto: '#292722', acento: '#A95843' };
const NOOP = () => {};

/**
 * Estructura fija del template "Bazar, Hogar y Decoración": mismo esqueleto de 9
 * secciones que el resto de los templates rígidos, con identidad visual
 * propia (paleta pastel/clara por defecto). Ver FitnessTemplate.jsx para
 * el criterio general (contrato de props en mapLandingToTemplateData.js).
 */
export default function BazarTemplate({ data, onClickProducto = NOOP, onClickInicio = null, onClickCatalogo = null, onClickContacto = null, onAgregarProducto = null, linkWhatsappProducto = null, onContactarProducto = null, cantidadCarrito = 0, onAbrirCarrito = NOOP, isMobile = false, previewMode = false }) {
  const { nombreComercio, logo, hero, productos, productosTitulo, contacto, faq, beneficios } = data;
  const tema = resolverTema(data.tema, DEFAULT_TEMA);
  const bordeSuave = hexToRgba(tema.texto, 0.12);
  const textoSuave = (a) => ({ color: hexToRgba(tema.texto, a) });

  const [filtro, setFiltro] = useState('Todos');
  const parseTags = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
  const etiquetasSet = new Set();
  productos.forEach(p => parseTags(p.etiqueta).forEach(t => etiquetasSet.add(t)));
  const etiquetas = ['Todos', ...etiquetasSet];
  const productosFiltrados = filtro === 'Todos' ? productos : productos.filter(p => parseTags(p.etiqueta).includes(filtro));

  const slug = data?.slug || data?.tienda?.subdominio;
  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const useAlias = isLocalFallback || previewMode;
  const linkInicio = useAlias && slug ? `/l/${slug}` : '/';
  const linkCatalogo = useAlias && slug ? `/l/${slug}/catalogo` : '/catalogo';
  const linkContacto = useAlias && slug ? `/l/${slug}/contacto` : '/contacto';

  // Encabezado: lo que cargó el comercio; vacío = un ejemplo atenuado en el
  // preview del armador (para ver dónde va) y nada en la landing publicada.
  const heroRotulo = textoOMuestra(hero.eyebrow, 'Rótulo de ejemplo', previewMode);
  const heroTitulo = textoOMuestra(hero.titulo, 'Título de tu portada', previewMode);
  const heroBajada = textoOMuestra(hero.subtitulo, 'Un párrafo corto que cuente qué vendés y por qué elegirte.', previewMode);
  const heroBoton = textoOMuestra(hero.ctaTexto, 'Texto del botón', previewMode);

  return (
    <div className="w-full font-sans" style={{ backgroundColor: tema.fondo, color: tema.texto }}>
      <StoreHeader
        templateSlug="bazar-hogar"
        isMobile={isMobile}
        nombreComercio={nombreComercio}
        logo={logo}
        tema={tema}
        cantidadCarrito={cantidadCarrito}
        onAbrirCarrito={onAbrirCarrito}
        linkInicio={linkInicio}
        linkCatalogo={linkCatalogo}
        linkContacto={linkContacto}
        onClickInicio={onClickInicio}
        onClickCatalogo={onClickCatalogo}
        onClickContacto={onClickContacto}
        previewMode={previewMode}
      />

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden">
        <HeroCarousel
          hero={hero}
          alt={hero.titulo || nombreComercio}
          className="absolute inset-0"
          imageOpacity={hero.opacidad !== undefined && hero.opacidad !== null ? hero.opacidad / 100 : 0.60}
        />
        <div className="relative px-6 py-20 md:py-28 max-w-3xl">
          {/* Vacío = no se muestra: ni el rótulo ni el título caen en el
              nombre del comercio ni en un texto de fábrica. */}
          {heroRotulo.texto && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest mb-3 ${heroRotulo.clase}`} style={{ color: tema.acento }}>
              <Sparkles size={14} /> {heroRotulo.texto}
            </span>
          )}
          {heroTitulo.texto && <h1 className={`text-4xl md:text-6xl font-serif font-normal leading-tight mb-4 ${heroTitulo.clase}`}>{heroTitulo.texto}</h1>}
          {heroBajada.texto && <p className={`text-lg mb-8 ${heroBajada.clase}`} style={textoSuave(0.7)}>{heroBajada.texto}</p>}
          {heroBoton.texto && (
            <a
              href={hero.ctaLink || '#productos'}
              className={`inline-block text-white font-semibold px-7 py-3 rounded-full transition-opacity hover:opacity-90 ${heroBoton.clase}`}
              style={{ backgroundColor: tema.acento }}
            >
              {heroBoton.texto}
            </a>
          )}
        </div>
      </section>

      {/* Productos */}
      <section id="productos" className="px-6 py-14" style={{ borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-2xl font-serif font-normal mb-6">{productosTitulo}</h2>
        
        {etiquetas.length > 1 && (
          <div className="flex overflow-x-auto gap-2 pb-4 mb-4" style={{ scrollbarWidth: 'none' }}>
            {etiquetas.map(e => (
              <button 
                key={e} 
                onClick={() => setFiltro(e)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filtro === e ? '' : 'hover:opacity-70'}`}
                style={filtro === e ? { backgroundColor: tema.acento, color: '#fff' } : { backgroundColor: hexToRgba(tema.texto, 0.05), color: tema.texto }}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {productosFiltrados.length === 0 ? (
          <p className="text-sm" style={textoSuave(0.5)}>No hay productos para mostrar en esta categoría.</p>
        ) : (
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
            {productosFiltrados.map(p => (
              <div key={p.id} onClick={() => onClickProducto(p)} className="rounded-none overflow-hidden shadow-sm cursor-pointer transition-opacity hover:opacity-90" style={{ backgroundColor: hexToRgba('#FFFFFF', 0.6), border: `1px solid ${bordeSuave}` }}>
                <div className="aspect-square" style={{ backgroundColor: hexToRgba(tema.acento, 0.15) }}>
                  <ImagenProductoHover imagenes={p.imagenes} imagen={p.imagen} alt={p.nombre} />
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm line-clamp-2 leading-snug">{p.nombre}</p>
                  {p.precio != null && (
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: tema.acento }}>Gs {Number(p.precio).toLocaleString('es-PY')}</p>
                      {p.precioAntes > p.precio && (
                        <p className="text-xs line-through opacity-50" style={{ color: tema.texto }}>Gs {Number(p.precioAntes).toLocaleString('es-PY')}</p>
                      )}
                    </div>
                  )}
                    <AccionesProducto
                      producto={p}
                      onAgregar={onAgregarProducto}
                      onElegir={onClickProducto}
                      linkWhatsapp={linkWhatsappProducto ? linkWhatsappProducto(p) : null}
                      onContactar={onContactarProducto}
                      acento={tema.acento}
                      fondo={'#fff'}
                      bordeSuave={bordeSuave}
                    />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <BeneficiosSection beneficios={beneficios} acento={tema.acento} textoSuave={textoSuave} tituloClase="font-semibold" bordeSuave={bordeSuave} isMobile={isMobile} />
      <FaqSection faq={faq} titulo={data.faqTitulo} acento={tema.acento} bordeSuave={bordeSuave} textoSuave={textoSuave} tituloClase="font-serif font-normal" />
      {/* Orden pedido explícitamente: primero las redes sociales, y el
          copyright al final de TODO. Igual en las 3 páginas
          (inicio/catálogo/contacto). */}
      <RedesSocialesFooter contacto={contacto} acento={tema.acento} bordeSuave={bordeSuave} isMobile={isMobile} />

      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={previewMode} />
    </div>
  );
}
