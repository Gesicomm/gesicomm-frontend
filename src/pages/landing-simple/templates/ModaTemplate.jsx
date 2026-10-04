import React from 'react';
import { ArrowRight, ImageOff } from 'lucide-react';
import { resolverTemaPorSlug, hexToRgba, textoLegible } from './themeUtils';
import StoreHeader from './StoreHeader';
import StoreFooterLegal from '../../landing/StoreFooterLegal';
import { AccionesProducto, BeneficiosSection, FaqSection, ImagenProductoHover, RedesSocialesFooter, textoOMuestra } from './sections';
import { formatPrecio } from '../../../lib/mensajeWhatsapp';
import HeroCarousel from './HeroCarousel';
import './moda/modaTemplate.css';

const NOOP = () => {};

// The attached editorial fashion layout, populated exclusively from store data.
export default function ModaTemplate({
  data, onClickProducto = NOOP, onClickInicio = null, onClickCatalogo = null,
  onClickContacto = null, onAgregarProducto = null, linkWhatsappProducto = null,
  onContactarProducto = null, cantidadCarrito = 0, onAbrirCarrito = NOOP,
  isMobile = false, previewMode = false,
}) {
  const { nombreComercio, logo, hero, productos = [], productosTitulo, contacto, faq, beneficios, contenidoAdicional } = data;
  const tema = resolverTemaPorSlug(data.tema, 'moda-indumentaria');
  const bordeSuave = hexToRgba(tema.texto, .15);
  const alias = previewMode || (typeof window !== 'undefined' && window.location.pathname.startsWith('/l/'));
  const raiz = alias && data.slug ? `/l/${data.slug}` : '';
  const textoSuave = a => ({ color: hexToRgba(tema.texto, a) });
  // Encabezado: lo que cargó el comercio; vacío = un ejemplo atenuado en el
  // preview del armador (para ver dónde va) y nada en la landing publicada.
  const heroRotulo = textoOMuestra(hero.eyebrow, 'Rótulo de ejemplo', previewMode);
  const heroTitulo = textoOMuestra(hero.titulo, 'Título de tu portada', previewMode);
  const heroBajada = textoOMuestra(hero.subtitulo, 'Un párrafo corto que cuente qué vendés y por qué elegirte.', previewMode);
  const heroBoton = textoOMuestra(hero.ctaTexto, 'Texto del botón', previewMode);

  return (
    <div className={`fashion-store ${isMobile ? 'es-movil' : ''}`} style={{
      '--fashion-bg': tema.fondo, '--fashion-ink': tema.texto,
      '--fashion-accent': tema.acento, '--fashion-on-accent': textoLegible('#FFFFFF', tema.acento),
      '--fashion-line': bordeSuave, '--fashion-paper': hexToRgba(tema.acento, .07),
      background: tema.fondo, color: tema.texto,
    }}>
      <StoreHeader
        templateSlug="moda-indumentaria" nombreComercio={nombreComercio} logo={logo} tema={tema}
        cantidadCarrito={cantidadCarrito} onAbrirCarrito={onAbrirCarrito}
        linkInicio={raiz || '/'} linkCatalogo={`${raiz}/catalogo`} linkContacto={`${raiz}/contacto`}
        onClickInicio={onClickInicio} onClickCatalogo={onClickCatalogo} onClickContacto={onClickContacto}
        isMobile={isMobile} previewMode={previewMode}
      />
      <section className="fashion-store-hero fashion-store-wrap" id="hero">
        <div>
          {/* Rótulo editable (Portada → Rótulo chico); vacío = no se muestra. */}
          {heroRotulo.texto && <p className={`fashion-store-kicker ${heroRotulo.clase}`}>{heroRotulo.texto}</p>}
          {heroTitulo.texto && <h1 className={heroTitulo.clase}>{heroTitulo.texto}</h1>}
          {heroBajada.texto && <p className={`fashion-store-lead ${heroBajada.clase}`}>{heroBajada.texto}</p>}
          {heroBoton.texto && <a className={`fashion-store-button ${heroBoton.clase}`} href={hero.ctaLink || '#productos'}>{heroBoton.texto} <ArrowRight size={16} /></a>}
        </div>
        <div className="fashion-store-editorial">
          <HeroCarousel
            hero={hero}
            alt={hero.titulo || nombreComercio}
            className="relative h-full w-full"
            imageOpacity={hero.opacidad != null ? Number(hero.opacidad) / 100 : 1}
          />
          {!hero.imagenes?.length && !hero.imagen && <ImageOff size={40} />}
        </div>
      </section>
      {beneficios?.length > 0 && <BeneficiosSection beneficios={beneficios} acento={tema.acento} textoSuave={textoSuave} tituloClase="font-semibold" bordeSuave={bordeSuave} isMobile={isMobile} />}
      <section className="fashion-store-collection fashion-store-wrap" id="productos">
        {productosTitulo && <h2>{productosTitulo}</h2>}
        <div className="fashion-store-grid">
          {productos.map(p => (
            <article key={p.id}>
              <button type="button" className="fashion-store-photo" aria-label={`Ver ${p.nombre}`} onClick={() => onClickProducto(p)}>
                <ImagenProductoHover imagenes={p.imagenes} imagen={p.imagen} alt={p.nombre} />
                {p.etiqueta && <span>{p.etiqueta}</span>}
              </button>
              <button type="button" className="fashion-store-name" onClick={() => onClickProducto(p)}>{p.nombre}</button>
              {p.precio != null && <div className="fashion-store-price"><b>{formatPrecio(p.precio)}</b>{p.precioAntes > p.precio && <del>{formatPrecio(p.precioAntes)}</del>}</div>}
              <AccionesProducto producto={p} onAgregar={onAgregarProducto} onElegir={onClickProducto} linkWhatsapp={linkWhatsappProducto ? linkWhatsappProducto(p) : null} onContactar={onContactarProducto} acento={tema.acento} fondo={tema.fondo} bordeSuave={bordeSuave} />
            </article>
          ))}
        </div>
      </section>
      {(contenidoAdicional?.titulo || contenidoAdicional?.texto) && <section className="fashion-store-story"><div className="fashion-store-wrap">{contenidoAdicional.titulo && <h2>{contenidoAdicional.titulo}</h2>}{contenidoAdicional.texto && <p>{contenidoAdicional.texto}</p>}</div></section>}
      <FaqSection faq={faq} titulo={data.faqTitulo} acento={tema.acento} bordeSuave={bordeSuave} textoSuave={textoSuave} tituloClase="font-serif font-normal" />
      <RedesSocialesFooter contacto={contacto} acento={tema.acento} bordeSuave={bordeSuave} isMobile={isMobile} />
      <StoreFooterLegal tema={tema} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={previewMode} />
    </div>
  );
}
