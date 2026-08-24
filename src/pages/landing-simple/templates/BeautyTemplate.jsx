import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { hexToRgba, resolverTema } from './themeUtils';
import { BeneficiosSection, ContactoSection, FaqSection, CartButton, RedesSocialesFooter, AccionesProducto } from './sections';
import StoreFooterLegal from '../../landing/StoreFooterLegal';

const DEFAULT_TEMA = { fondo: '#FBEFEF', texto: '#3A2A2E', acento: '#E8A2B0' };
const NOOP = () => {};

/**
 * Estructura fija del template "Beauty & Skin Care": mismo esqueleto de 9
 * secciones que el resto de los templates rígidos, con identidad visual
 * propia (paleta pastel/clara por defecto). Ver FitnessTemplate.jsx para
 * el criterio general (contrato de props en mapLandingToTemplateData.js).
 */
export default function BeautyTemplate({ data, onClickProducto = NOOP, onClickCatalogo = null, onClickContacto = null, onAgregarProducto = null, linkWhatsappProducto = null, onContactarProducto = null, cantidadCarrito = 0, onAbrirCarrito = NOOP, isMobile = false, previewMode = false }) {
  const { nombreComercio, logo, hero, productos, productosTitulo, contacto, faq, beneficios, contenidoAdicional } = data;
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
  const catalogoClickProps = onClickCatalogo ? { onClick: (e) => { e.preventDefault(); onClickCatalogo(); } } : {};
  const contactoClickProps = onClickContacto ? { onClick: (e) => { e.preventDefault(); onClickContacto(); } } : {};
  const linkContacto = useAlias && slug ? `/l/${slug}/contacto` : '/contacto';

  return (
    <div className="w-full font-sans" style={{ backgroundColor: tema.fondo, color: tema.texto }}>
      {/* Header */}
      <header id="header" className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur z-10" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.fondo, 0.95) }}>
        <div className="flex items-center gap-4 sm:gap-6">
          <a href={linkInicio} target={previewMode ? "_blank" : "_self"} rel="noreferrer" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            {logo ? (
              <img src={logo} alt={nombreComercio} className="h-9 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: tema.acento }}><Sparkles size={18} style={{ color: tema.fondo }} /></div>
            )}
            <span className="font-serif italic font-medium tracking-wide text-lg hidden sm:inline">{nombreComercio}</span>
          </a>
          
          <nav className="flex gap-3 sm:gap-4 ml-2 sm:ml-0" style={{ borderLeft: `1px solid ${bordeSuave}`, paddingLeft: '1rem' }}>
            <a href={linkCatalogo} target={previewMode ? "_blank" : "_self"} rel="noreferrer" className="font-serif italic text-[14px] sm:text-[15px] hover:opacity-80 transition-opacity" {...catalogoClickProps}>Catálogo</a>
            <a href={linkContacto} target={previewMode ? "_blank" : "_self"} rel="noreferrer" className="font-serif italic text-[14px] sm:text-[15px] hover:opacity-80 transition-opacity" {...contactoClickProps}>Contacto</a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <CartButton cantidad={cantidadCarrito} acento={tema.acento} color={tema.texto} onClick={onAbrirCarrito} />
          <a href={linkCatalogo} target={previewMode ? "_blank" : "_self"} rel="noreferrer" className="hidden sm:inline-block text-sm font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-90" style={{ backgroundColor: tema.acento, color: '#fff' }} {...catalogoClickProps}>Ver catálogo</a>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden">
        {hero.imagen && (
          <img src={hero.imagen} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: hero.opacidad !== undefined && hero.opacidad !== null ? hero.opacidad / 100 : 0.60 }} />
        )}
        <div className="relative px-6 py-20 md:py-28 max-w-3xl">
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: tema.acento }}>
            <Sparkles size={14} /> Cuidado que se nota
          </span>
          <h1 className="text-4xl md:text-6xl font-light leading-tight mb-4">{hero.titulo || 'Tu piel merece lo mejor'}</h1>
          {hero.subtitulo && <p className="text-lg mb-8" style={textoSuave(0.7)}>{hero.subtitulo}</p>}
          <a
            href={hero.ctaLink || '#productos'}
            className="inline-block text-white font-semibold px-7 py-3 rounded-full transition-opacity hover:opacity-90"
            style={{ backgroundColor: tema.acento }}
          >
            {hero.ctaTexto || 'Descubrir productos'}
          </a>
        </div>
      </section>

      {/* Productos */}
      <section id="productos" className="px-6 py-14" style={{ borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-2xl font-light mb-6">{productosTitulo}</h2>
        
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
              <div key={p.id} onClick={() => onClickProducto(p)} className="rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-opacity hover:opacity-90" style={{ backgroundColor: hexToRgba('#FFFFFF', 0.6), border: `1px solid ${bordeSuave}` }}>
                <div className="aspect-square" style={{ backgroundColor: hexToRgba(tema.acento, 0.15) }}>
                  {p.imagen && <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />}
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

      {/* SECCIONES OCULTAS A PETICIÓN DEL USUARIO */}
      {/* 
      <section id="contenido-adicional" className="px-6 py-14" style={{ backgroundColor: hexToRgba(tema.acento, 0.05), borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-2xl font-light mb-2">{contenidoAdicional?.titulo || 'Pensado para vos'}</h2>
        <p className="max-w-2xl" style={textoSuave(0.6)}>{contenidoAdicional?.texto || 'Seleccionamos cuidadosamente cada producto para que encuentres justo lo que necesitás, sin vueltas.'}</p>
      </section>

      <ContactoSection contacto={contacto} acento={tema.acento} tituloClase="font-light" bordeSuave={bordeSuave} isMobile={isMobile} />
      */}
      
      <FaqSection faq={faq} acento={tema.acento} bordeSuave={bordeSuave} textoSuave={textoSuave} tituloClase="font-light" />

      {/* CTA */}
      {/* 
      <section className="px-6 py-16 text-center" style={{ backgroundColor: hexToRgba(tema.acento, 0.05), borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-3xl font-light mb-4">Renová tu estilo hoy</h2>
        <a href={hero.ctaLink || '#productos'} className="inline-block text-white font-semibold px-8 py-3 rounded-full transition-opacity hover:opacity-90" style={{ backgroundColor: tema.acento }}>
          {hero.ctaTexto || 'Descubrir productos'}
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
