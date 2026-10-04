import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { hexToRgba, resolverTema } from './themeUtils';
import { BeneficiosSection, ContactoSection, FaqSection, CartButton, RedesSocialesFooter, AccionesProducto, ImagenProductoHover, textoOMuestra } from './sections';
import StoreFooterLegal from '../../landing/StoreFooterLegal';
import StoreHeader from './StoreHeader';
import HeroCarousel from './HeroCarousel';

const DEFAULT_TEMA = { fondo: '#FFFFFF', texto: '#000000', acento: '#000000' };
const NOOP = () => {};

/**
 * Estructura fija del template "Básico": mismo esqueleto de 9 secciones
 * que el resto de los templates rígidos, pero genérico (no está atado a
 * ningún rubro) y con paleta neutra por defecto — fondo blanco, texto
 * negro, un solo acento gris oscuro. Pensado para cualquier tipo de
 * comercio que no encaje en Fitness/Beauty/Tech. Ver FitnessTemplate.jsx
 * para el criterio general (contrato de props en mapLandingToTemplateData.js).
 */
export default function BasicTemplate({ data, onClickProducto = NOOP, onClickInicio = null, onClickCatalogo = null, onClickContacto = null, onAgregarProducto = null, linkWhatsappProducto = null, onContactarProducto = null, cantidadCarrito = 0, onAbrirCarrito = NOOP, isMobile = false, previewMode = false }) {
  const { nombreComercio, logo, hero, productos, productosTitulo, contacto, faq, beneficios, contenidoAdicional } = data;
  const tema = resolverTema(data.tema, DEFAULT_TEMA);
  const bordeSuave = hexToRgba(tema.texto, 0.1);
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
  // Dentro del editor, "Catálogo" abre la vista in-editor (templates/
  // CatalogoPreview.jsx) en vez de navegar a la landing pública de verdad
  // — así se puede editar cada producto desde ahí sin salir del armador.
  // En la landing pública, onClickCatalogo es null y el link navega normal.
  const catalogoClickProps = onClickCatalogo ? { onClick: (e) => { e.preventDefault(); onClickCatalogo(); } } : {};
  const contactoClickProps = onClickContacto ? { onClick: (e) => { e.preventDefault(); onClickContacto(); } } : {};

  // Encabezado: lo que cargó el comercio; vacío = un ejemplo atenuado en el
  // preview del armador (para ver dónde va) y nada en la landing publicada.
  const heroRotulo = textoOMuestra(hero.eyebrow, 'Rótulo de ejemplo', previewMode);
  const heroTitulo = textoOMuestra(hero.titulo, 'Título de tu portada', previewMode);
  const heroBajada = textoOMuestra(hero.subtitulo, 'Un párrafo corto que cuente qué vendés y por qué elegirte.', previewMode);
  const heroBoton = textoOMuestra(hero.ctaTexto, 'Texto del botón', previewMode);

  return (
    <div className="w-full font-sans" style={{ backgroundColor: tema.fondo, color: tema.texto }}>
      {/* Header */}
      <StoreHeader
        templateSlug="basico"
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
          imageOpacity={hero.opacidad !== undefined && hero.opacidad !== null ? hero.opacidad / 100 : 0.15}
        />
        <div className="relative px-6 py-20 md:py-28 max-w-3xl">
          {heroRotulo.texto && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest mb-3 ${heroRotulo.clase}`} style={textoSuave(0.5)}>
              {heroRotulo.texto}
            </span>
          )}
          {heroTitulo.texto && <h1 className={`text-4xl md:text-6xl font-bold leading-tight mb-4 ${heroTitulo.clase}`}>{heroTitulo.texto}</h1>}
          {heroBajada.texto && <p className={`text-lg mb-8 ${heroBajada.clase}`} style={textoSuave(0.6)}>{heroBajada.texto}</p>}
          {heroBoton.texto && (
            <a
              href={hero.ctaLink || '#productos'}
              className={`inline-block font-bold px-7 py-3 rounded-full transition-opacity hover:opacity-90 ${heroBoton.clase}`}
              style={{ backgroundColor: tema.acento, color: tema.fondo }}
            >
              {heroBoton.texto}
            </a>
          )}
        </div>
      </section>

      {/* Productos */}
      <section id="productos" className="px-6 py-14" style={{ borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-2xl font-bold mb-6">{productosTitulo}</h2>
        
        {etiquetas.length > 1 && (
          <div className="flex overflow-x-auto gap-2 pb-4 mb-4" style={{ scrollbarWidth: 'none' }}>
            {etiquetas.map(e => (
              <button 
                key={e} 
                onClick={() => setFiltro(e)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filtro === e ? '' : 'hover:opacity-70'}`}
                style={filtro === e ? { backgroundColor: tema.acento, color: tema.fondo } : { backgroundColor: hexToRgba(tema.texto, 0.05), color: tema.texto }}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {productosFiltrados.length === 0 ? (
          <p className="text-sm" style={textoSuave(0.5)}>No hay productos para mostrar en esta categoría.</p>
        ) : (
          <div className={`grid gap-5 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
            {productosFiltrados.map(p => (
              <div key={p.id} onClick={() => onClickProducto(p)} className="rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-opacity hover:opacity-90" style={{ backgroundColor: tema.fondo, border: `1px solid ${bordeSuave}` }}>
                <div className="aspect-square" style={{ backgroundColor: hexToRgba(tema.texto, 0.05) }}>
                  <ImagenProductoHover imagenes={p.imagenes} imagen={p.imagen} alt={p.nombre} />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm line-clamp-2 leading-snug">{p.nombre}</p>
                  {p.precio != null && (
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">Gs {Number(p.precio).toLocaleString('es-PY')}</p>
                      {p.precioAntes > p.precio && (
                        <p className="text-xs line-through opacity-50">Gs {Number(p.precioAntes).toLocaleString('es-PY')}</p>
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
                      fondo={tema.fondo}
                      bordeSuave={bordeSuave}
                    />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <BeneficiosSection beneficios={beneficios} acento={hexToRgba(tema.texto, 0.7)} textoSuave={textoSuave} tituloClase="font-bold" bordeSuave={bordeSuave} isMobile={isMobile} />

      {/* SECCIONES OCULTAS A PETICIÓN DEL USUARIO */}
      {/* 
      <section id="contenido-adicional" className="px-6 py-14" style={{ borderTop: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.texto, 0.03) }}>
        <h2 className="text-2xl font-bold mb-2">{contenidoAdicional?.titulo || 'Pensado para vos'}</h2>
        <p className="max-w-2xl" style={textoSuave(0.6)}>{contenidoAdicional?.texto || 'Seleccionamos cuidadosamente cada producto para que encuentres justo lo que necesitás, sin vueltas.'}</p>
      </section>

      <ContactoSection contacto={contacto} acento={hexToRgba(tema.texto, 0.7)} tituloClase="font-bold" bordeSuave={bordeSuave} isMobile={isMobile} />
      */}
      
      <FaqSection faq={faq} titulo={data.faqTitulo} acento={tema.acento} bordeSuave={bordeSuave} textoSuave={textoSuave} tituloClase="font-bold" />

      {/* CTA (También oculto a petición del usuario) */}
      {/* 
      <section className="px-6 py-16 text-center" style={{ borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-3xl font-bold mb-4">Empezá a comprar hoy</h2>
        <a href={hero.ctaLink || '#productos'} className="inline-block font-bold px-8 py-3 rounded-full transition-opacity hover:opacity-90" style={{ backgroundColor: tema.acento, color: tema.fondo }}>
          {hero.ctaTexto || 'Comprar ahora'}
        </a>
      </section>
      */}

      {/* Orden pedido explícitamente: primero las redes sociales, y el
          copyright al final de TODO. Igual en las 3 páginas
          (inicio/catálogo/contacto). */}
      <RedesSocialesFooter contacto={contacto} acento={tema.acento} bordeSuave={bordeSuave} isMobile={isMobile} />

      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={previewMode} />
    </div>
  );
}
