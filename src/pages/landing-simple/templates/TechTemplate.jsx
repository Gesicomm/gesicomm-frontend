import React, { useState } from 'react';
import { Cpu, Zap } from 'lucide-react';
import { hexToRgba, resolverTema } from './themeUtils';
import { BeneficiosSection, ContactoSection, FaqSection, CartButton, RedesSocialesFooter, AccionesProducto } from './sections';

const DEFAULT_TEMA = { fondo: '#0B1220', texto: '#E5EEF7', acento: '#3AB0FF' };
const NOOP = () => {};

/**
 * Estructura fija del template "Electrónica & Tecnología": mismo esqueleto
 * de 9 secciones que el resto de los templates rígidos, con identidad
 * visual propia (dark + acento cian por defecto). Ver FitnessTemplate.jsx
 * para el criterio general (contrato de props en mapLandingToTemplateData.js).
 */
export default function TechTemplate({ data, onClickProducto = NOOP, onClickCatalogo = null, onClickContacto = null, onAgregarProducto = null, linkWhatsappProducto = null, onContactarProducto = null, cantidadCarrito = 0, onAbrirCarrito = NOOP, isMobile = false, previewMode = false }) {
  const { nombreComercio, logo, hero, productos, productosTitulo, contacto, faq, beneficios, contenidoAdicional } = data;
  const tema = resolverTema(data.tema, DEFAULT_TEMA);
  const bordeSuave = hexToRgba(tema.acento, 0.15);
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
              <div className="h-9 w-9 rounded flex items-center justify-center" style={{ backgroundColor: hexToRgba(tema.acento, 0.2), border: `1px solid ${tema.acento}` }}><Cpu size={18} style={{ color: tema.acento }} /></div>
            )}
            <span className="font-mono font-bold tracking-tight text-lg hidden sm:inline">{nombreComercio}</span>
          </a>
          
          <nav className="flex gap-3 sm:gap-4 ml-2 sm:ml-0" style={{ borderLeft: `1px solid ${bordeSuave}`, paddingLeft: '1rem' }}>
            <a href={linkCatalogo} target={previewMode ? "_blank" : "_self"} rel="noreferrer" className="font-mono font-semibold text-[13px] sm:text-sm hover:opacity-80 transition-opacity" style={{ color: tema.acento }} {...catalogoClickProps}>Catálogo</a>
            <a href={linkContacto} target={previewMode ? "_blank" : "_self"} rel="noreferrer" className="font-mono font-semibold text-[13px] sm:text-sm hover:opacity-80 transition-opacity" style={{ color: tema.acento }} {...contactoClickProps}>Contacto</a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <CartButton cantidad={cantidadCarrito} acento={tema.acento} color={tema.texto} onClick={onAbrirCarrito} />
          <a href={linkCatalogo} target={previewMode ? "_blank" : "_self"} rel="noreferrer" className="text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90" style={{ backgroundColor: tema.acento, color: tema.fondo }} {...catalogoClickProps}>Ver catálogo</a>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden">
        {hero.imagen && (
          <img src={hero.imagen} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: hero.opacidad !== undefined && hero.opacidad !== null ? hero.opacidad / 100 : 0.30 }} />
        )}
        <div className="relative px-6 py-20 md:py-28 max-w-3xl">
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ color: tema.acento }}>
            <Zap size={14} /> Tecnología al día
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">{hero.titulo || 'La tecnología que estabas buscando'}</h1>
          {hero.subtitulo && <p className="text-lg mb-8" style={textoSuave(0.7)}>{hero.subtitulo}</p>}
          <a
            href={hero.ctaLink || '#productos'}
            className="inline-block font-bold px-7 py-3 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: tema.acento, color: tema.fondo }}
          >
            {hero.ctaTexto || 'Ver catálogo'}
          </a>
        </div>
      </section>

      {/* Productos */}
      <section id="productos" className="px-6 py-14" style={{ borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-2xl font-extrabold mb-6">{productosTitulo}</h2>
        
        {etiquetas.length > 1 && (
          <div className="flex overflow-x-auto gap-2 pb-4 mb-4" style={{ scrollbarWidth: 'none' }}>
            {etiquetas.map(e => (
              <button 
                key={e} 
                onClick={() => setFiltro(e)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${filtro === e ? '' : 'hover:opacity-70'}`}
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
              <div key={p.id} onClick={() => onClickProducto(p)} className="rounded-xl overflow-hidden cursor-pointer transition-opacity hover:opacity-90" style={{ backgroundColor: hexToRgba(tema.texto, 0.05), border: `1px solid ${bordeSuave}` }}>
                <div className="aspect-square" style={{ backgroundColor: hexToRgba(tema.texto, 0.08) }}>
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

      <BeneficiosSection beneficios={beneficios} acento={tema.acento} textoSuave={textoSuave} tituloClase="font-bold" bordeSuave={bordeSuave} isMobile={isMobile} />

      {/* SECCIONES OCULTAS A PETICIÓN DEL USUARIO */}
      {/* 
      <section id="contenido-adicional" className="px-6 py-14" style={{ backgroundColor: hexToRgba('#FFFFFF', 0.02), borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-2xl font-extrabold mb-2">{contenidoAdicional?.titulo || 'Tecnología para vos'}</h2>
        <p className="max-w-2xl" style={textoSuave(0.6)}>{contenidoAdicional?.texto || 'Buscamos simplificarte la vida con los mejores productos de tecnología.'}</p>
      </section>

      <ContactoSection contacto={contacto} acento={tema.acento} tituloClase="font-extrabold" bordeSuave={bordeSuave} isMobile={isMobile} />
      */}
      
      <FaqSection faq={faq} acento={tema.acento} bordeSuave={bordeSuave} textoSuave={textoSuave} tituloClase="font-extrabold" />

      {/* CTA */}
      {/* 
      <section className="px-6 py-16 text-center" style={{ backgroundColor: hexToRgba('#FFFFFF', 0.02), borderTop: `1px solid ${bordeSuave}` }}>
        <h2 className="text-3xl font-extrabold mb-4">Actualizá tu setup</h2>
        <a href={hero.ctaLink || '#productos'} className="inline-block font-bold px-8 py-3 rounded-lg transition-opacity hover:opacity-90" style={{ backgroundColor: tema.acento, color: tema.fondo }}>
          {hero.ctaTexto || 'Ver catálogo'}
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
