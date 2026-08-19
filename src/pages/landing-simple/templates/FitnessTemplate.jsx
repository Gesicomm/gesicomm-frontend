import React, { useState } from 'react';
import { Dumbbell, Flame } from 'lucide-react';
import { hexToRgba, resolverTema } from './themeUtils';
import { BeneficiosSection, ContactoSection, FaqSection, CartButton, RedesSocialesFooter } from './sections';

const DEFAULT_TEMA = { fondo: '#0B0B0E', texto: '#FFFFFF', acento: '#FF5A1F' };
const NOOP = () => {};

/**
 * Estructura fija del template "Fitness & Suplementos": Header, Hero,
 * Beneficios, Productos, Contenido adicional, Contacto, FAQ, CTA, Footer.
 * El comercio nunca reordena/agrega/quita secciones acá — solo llenan las
 * props (data: TemplateData, ver mapLandingToTemplateData.js). Colores
 * (tema) y beneficios/contenido adicional son contenido, no estructura.
 * onClickProducto/cantidadCarrito/onAbrirCarrito: interactividad de la
 * landing pública (carrito/checkout, ver LandingPublica.jsx) — en el
 * preview del editor no se pasan, quedan como no-op/0.
 */
export default function FitnessTemplate({ data, onClickProducto = NOOP, onClickCatalogo = null, onClickContacto = null, cantidadCarrito = 0, onAbrirCarrito = NOOP, isMobile = false, previewMode = false }) {
  const { nombreComercio, logo, hero, productos, productosTitulo, contacto, faq, beneficios, contenidoAdicional } = data;
  const tema = resolverTema(data.tema, DEFAULT_TEMA);
  const bordeSuave = hexToRgba(tema.texto, 0.1);
  const textoSuave = (a) => ({ color: hexToRgba(tema.texto, a) });

  const [filtro, setFiltro] = useState('Todos');
  const etiquetas = ['Todos', ...new Set(productos.map(p => p.etiqueta).filter(Boolean))];
  const productosFiltrados = filtro === 'Todos' ? productos : productos.filter(p => p.etiqueta === filtro);

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
              <div className="h-9 w-9 flex items-center justify-center rounded-full" style={{ backgroundColor: tema.acento }}><Dumbbell size={18} style={{ color: tema.fondo }} /></div>
            )}
            <span className="font-black uppercase tracking-widest text-lg hidden sm:inline">{nombreComercio}</span>
          </a>
          
          <nav className="flex gap-3 sm:gap-4 ml-2 sm:ml-0" style={{ borderLeft: `1px solid ${bordeSuave}`, paddingLeft: '1rem' }}>
            <a href={linkCatalogo} target={previewMode ? "_blank" : "_self"} rel="noreferrer" className="font-semibold text-[13px] sm:text-sm hover:opacity-80 transition-opacity uppercase tracking-wider" {...catalogoClickProps}>Catálogo</a>
            <a href={linkContacto} target={previewMode ? "_blank" : "_self"} rel="noreferrer" className="font-semibold text-[13px] sm:text-sm hover:opacity-80 transition-opacity uppercase tracking-wider" {...contactoClickProps}>Contacto</a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <CartButton cantidad={cantidadCarrito} acento={tema.acento} color={tema.texto} onClick={onAbrirCarrito} />
          <a href={linkCatalogo} target={previewMode ? "_blank" : "_self"} rel="noreferrer" className="text-sm font-bold px-4 py-2 rounded-full transition-opacity hover:opacity-90" style={{ backgroundColor: tema.acento, color: '#fff' }} {...catalogoClickProps}>Ver catálogo</a>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden">
        {hero.imagen && (
          <img src={hero.imagen} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: hero.opacidad !== undefined && hero.opacidad !== null ? hero.opacidad / 100 : 0.40 }} />
        )}
        <div className="relative px-6 py-20 md:py-28 max-w-3xl">
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ color: tema.acento }}>
            <Flame size={14} /> Rendimiento real
          </span>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">{hero.titulo || 'Llevá tu entrenamiento al siguiente nivel'}</h1>
          {hero.subtitulo && <p className="text-lg mb-8" style={textoSuave(0.7)}>{hero.subtitulo}</p>}
          <a
            href={hero.ctaLink || '#productos'}
            className="inline-block font-bold px-7 py-3 rounded-full transition-opacity hover:opacity-90"
            style={{ backgroundColor: tema.acento, color: '#fff' }}
          >
            {hero.ctaTexto || 'Comprar ahora'}
          </a>
        </div>
      </section>

      {/* Productos */}
      <section id="productos" className="px-6 py-14" style={{ borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-2xl font-black mb-6">{productosTitulo}</h2>
        
        {etiquetas.length > 1 && (
          <div className="flex overflow-x-auto gap-2 pb-4 mb-4" style={{ scrollbarWidth: 'none' }}>
            {etiquetas.map(e => (
              <button 
                key={e} 
                onClick={() => setFiltro(e)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold uppercase transition-colors ${filtro === e ? '' : 'hover:opacity-70'}`}
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
          <div className={`grid gap-5 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
            {productosFiltrados.map(p => (
              <div key={p.id} onClick={() => onClickProducto(p)} className="rounded-2xl overflow-hidden cursor-pointer transition-opacity hover:opacity-90" style={{ backgroundColor: hexToRgba(tema.texto, 0.05), border: `1px solid ${bordeSuave}` }}>
                <div className="aspect-square" style={{ backgroundColor: hexToRgba(tema.texto, 0.1) }}>
                  {p.imagen && <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{p.nombre}</p>
                  {p.precio != null && (
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm" style={{ color: tema.acento }}>Gs {Number(p.precio).toLocaleString('es-PY')}</p>
                      {p.precioAntes > p.precio && (
                        <p className="text-xs line-through opacity-50" style={{ color: tema.texto }}>Gs {Number(p.precioAntes).toLocaleString('es-PY')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <BeneficiosSection beneficios={beneficios} acento={tema.acento} textoSuave={textoSuave} tituloClase="font-black uppercase" bordeSuave={bordeSuave} isMobile={isMobile} />

      {/* SECCIONES OCULTAS A PETICIÓN DEL USUARIO */}
      {/* 
      <section id="contenido-adicional" className="px-6 py-14" style={{ borderTop: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.texto, 0.03) }}>
        <h2 className="text-2xl font-black mb-2">{contenidoAdicional?.titulo || 'Nutrición pensada para tu objetivo'}</h2>
        <p className="max-w-2xl" style={textoSuave(0.6)}>{contenidoAdicional?.texto || 'Ya sea que busques ganar masa, definir o mejorar tu rendimiento, tenemos la combinación de suplementos justa para vos.'}</p>
      </section>

      <ContactoSection contacto={contacto} acento={tema.acento} tituloClase="font-black" bordeSuave={bordeSuave} isMobile={isMobile} />
      */}
      <FaqSection faq={faq} acento={tema.acento} bordeSuave={bordeSuave} textoSuave={textoSuave} tituloClase="font-black" />

      {/* CTA */}
      {/* 
      <section className="px-6 py-16 text-center" style={{ borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-3xl font-black mb-4">Empezá hoy tu transformación</h2>
        <a href={hero.ctaLink || '#productos'} className="inline-block font-bold px-8 py-3 rounded-full transition-opacity hover:opacity-90" style={{ backgroundColor: tema.acento, color: '#fff' }}>
          {hero.ctaTexto || 'Comprar ahora'}
        </a>
      </section>
      */}

      {/* Orden pedido explícitamente: primero las redes sociales, y el
          copyright al final de TODO. Igual en las 3 páginas
          (inicio/catálogo/contacto). */}
      <RedesSocialesFooter contacto={contacto} acento={tema.acento} bordeSuave={bordeSuave} isMobile={isMobile} />

      <footer className="px-6 py-8 text-center text-xs" style={{ borderTop: `1px solid ${bordeSuave}`, ...textoSuave(0.4) }}>
        © {new Date().getFullYear()} {nombreComercio}
      </footer>
    </div>
  );
}
