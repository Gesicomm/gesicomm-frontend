import React, { useMemo, useState } from 'react';
import { ExternalLink, Monitor, Smartphone, Search, MessageCircle, Layers, ImageOff, Plus, Check, Heart } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { calcularEstiloLanding } from '../../lib/landingDiseno';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import LandingHeader from './LandingHeader';
import LandingHero from './LandingHero';
import LandingBenefits from './LandingBenefits';
import LandingCategoryStrip from './LandingCategoryStrip';
import LandingFeatured from './LandingFeatured';
import LandingTestimonials from './LandingTestimonials';
import LandingFaq from './LandingFaq';
import LandingDropdown from './LandingDropdown';
import './landingPublica.css';

function precioItem(item) {
  return item.precio ?? item.precio_efectivo ?? item.precio_total ?? item.precio_base ?? 0;
}

function normalizarItem(item, idx) {
  const tipo = item.tipo || (item.precio_total !== undefined ? 'combo' : 'producto');
  return {
    ...item,
    tipo,
    content_id: item.content_id || item.slug || `${tipo}-${item.id || idx}`,
    precio: precioItem(item),
    imagen: item.imagen || item.imagen_principal || item.imagenes?.[0] || null,
    imagenes: item.imagenes || (item.imagen ? [item.imagen] : []),
    destacado: !!item.destacado,
  };
}

export default function LandingPreview({
  titulo, descripcion, filtros, items, tema, diseno, contacto, banner, urlPublica,
  mostrarTestimonios, testimonios, mostrarFaq, faqs,
}) {
  const [dispositivo, setDispositivo] = useState('mobile');

  const itemsPreview = useMemo(() => (items || []).map(normalizarItem), [items]);
  const categorias = useMemo(() => [...new Set(itemsPreview.map(i => i.categoria).filter(Boolean))], [itemsPreview]);
  const marcas = useMemo(() => [...new Set(itemsPreview.map(i => i.marca).filter(Boolean))], [itemsPreview]);
  const etiquetas = useMemo(() => {
    const mapa = new Map();
    itemsPreview.forEach(i => {
      if (!i.etiqueta) return;
      const clave = i.etiqueta.toLowerCase();
      if (!mapa.has(clave)) mapa.set(clave, i.etiqueta);
    });
    return Array.from(mapa.values());
  }, [itemsPreview]);

  const categoriaImagen = useMemo(() => {
    const mapa = new Map();
    itemsPreview.forEach(i => {
      if (i.categoria && i.imagen && !mapa.has(i.categoria)) mapa.set(i.categoria, i.imagen);
    });
    return mapa;
  }, [itemsPreview]);

  const itemsDestacados = useMemo(() => itemsPreview.filter(i => i.destacado), [itemsPreview]);
  const testimoniosVisibles = mostrarTestimonios ? (testimonios || []).filter(t => t.nombre?.trim() || t.comentario?.trim()) : [];
  const faqsVisibles = mostrarFaq ? (faqs || []).filter(f => f.pregunta?.trim() || f.respuesta?.trim()) : [];
  const hayFiltros = filtros.categoria || filtros.marca || filtros.etiqueta || filtros.buscador || filtros.orden_precio;
  const ratingPromedio = testimoniosVisibles.length
    ? testimoniosVisibles.reduce((s, t) => s + (Number(t.calificacion) || 5), 0) / testimoniosVisibles.length
    : 0;
  const bannerLinkEsExterno = banner?.boton_link && /^https?:\/\//i.test(banner.boton_link);

  const noop = () => {};

  return (
    <div className="lb-preview">
      <div className="lb-preview-bar">
        <span className="lb-preview-label">Vista previa</span>
        <div className="lb-preview-actions">
          {urlPublica && (
            <a
              href={urlPublica}
              target="_blank"
              rel="noreferrer"
              className="lb-preview-ext-btn"
              title="Abrir web real en pestana nueva"
            >
              <ExternalLink size={12} />
              <span>Ver web</span>
            </a>
          )}
          <div className="lb-device-toggle">
            <button
              type="button"
              className={dispositivo === 'desktop' ? 'active' : ''}
              onClick={() => setDispositivo('desktop')}
              title="Escritorio"
            >
              <Monitor size={13} />
            </button>
            <button
              type="button"
              className={dispositivo === 'mobile' ? 'active' : ''}
              onClick={() => setDispositivo('mobile')}
              title="Celular"
            >
              <Smartphone size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className={`lb-preview-viewport ${dispositivo}`}>
        <div
          className={`lp-page lb-live-preview-page ${tema?.modo === 'claro' ? 'claro' : ''}`}
          style={calcularEstiloLanding({ tema, diseno })}
        >
          <LandingHeader
            nombre={titulo || 'Tu tienda'}
            mostrarBuscador={!!filtros.buscador}
            mostrarCategorias={categorias.length > 0}
            mostrarTestimonios={testimoniosVisibles.length > 0}
            mostrarFaq={faqsVisibles.length > 0}
            cantidadCarrito={0}
            onAbrirCarrito={noop}
          />

          <LandingHero
            titulo={titulo || 'Titulo de tu tienda'}
            descripcion={descripcion}
            totalItems={itemsPreview.length}
            totalCategorias={categorias.length}
            ratingPromedio={ratingPromedio}
            cantidadOpiniones={testimoniosVisibles.length}
            whatsapp={contacto?.whatsapp}
          />

          <LandingBenefits />

          {categorias.length > 0 && (
            <LandingCategoryStrip
              categorias={categorias}
              categoriaImagen={categoriaImagen}
              onSeleccionar={noop}
            />
          )}

          {itemsDestacados.length > 0 && (
            <LandingFeatured
              items={itemsDestacados}
              contacto={contacto}
              wishlist={new Set()}
              onToggleWishlist={noop}
              agregadoRapido={null}
              onAgregarRapido={noop}
              onAbrir={noop}
              onContactar={noop}
            />
          )}

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
                    onClick={(e) => e.preventDefault()}
                  >
                    {banner.boton_texto}
                  </a>
                )}
              </div>
            </div>
          )}

          <main className="lp-shell">
            <header className="lp-header">
              <span className="lp-header-eyebrow">
                {itemsPreview.length} producto{itemsPreview.length === 1 ? '' : 's'}
              </span>
              <h2 className="lp-header-titulo">Todos los productos</h2>
            </header>

            {hayFiltros && (
              <div className="lp-filterbar">
                <div className="lp-filters">
                  {filtros.buscador && (
                    <div className="lp-search">
                      <Search size={14} />
                      <input placeholder="Buscar..." value="" readOnly />
                    </div>
                  )}
                  {filtros.categoria && categorias.length > 0 && (
                    <LandingDropdown value="" onChange={noop} options={[{ value: '', label: 'Todas las categorias' }]} />
                  )}
                  {filtros.marca && marcas.length > 0 && (
                    <LandingDropdown value="" onChange={noop} options={[{ value: '', label: 'Todas las marcas' }]} />
                  )}
                  {filtros.etiqueta && etiquetas.length > 0 && (
                    <LandingDropdown value="" onChange={noop} options={[{ value: '', label: 'Todas las etiquetas' }]} />
                  )}
                  {filtros.orden_precio && (
                    <LandingDropdown value="" onChange={noop} options={[{ value: '', label: 'Orden por defecto' }]} />
                  )}
                </div>
              </div>
            )}

            {itemsPreview.length === 0 ? (
              <div className="lp-empty">
                <p>Elegi productos en el paso Productos y van a aparecer aca.</p>
              </div>
            ) : (
              <div className="lp-grid" id="lp-productos">
                {itemsPreview.map(item => (
                  <div key={item.content_id} className="lp-card" role="presentation">
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
                      </div>
                      <button type="button" className="lp-card-wishlist" onClick={noop} title="Agregar a favoritos">
                        <Heart size={14} />
                      </button>
                    </div>
                    <div className="lp-card-body">
                      {item.etiqueta && <span className="lp-card-tag">{item.etiqueta}</span>}
                      <h3>{item.nombre}</h3>
                      <span className="lp-card-price">{formatPrecio(precioItem(item))}</span>

                      <div className="lp-card-actions">
                        <button type="button" className="lp-card-btn-add" onClick={noop}>
                          <Plus size={14} /> Agregar
                        </button>
                        {contacto?.whatsapp && (
                          <button type="button" className="lp-card-contact-btn" title="Consultar por WhatsApp" onClick={noop}>
                            <MessageCircle size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {testimoniosVisibles.length > 0 && <LandingTestimonials testimonios={testimoniosVisibles} />}
          {faqsVisibles.length > 0 && <LandingFaq items={faqsVisibles} />}

          <footer id="lp-contacto" className="lp-footer">
            <div className="lp-footer-inner">
              <div>
                <p className="lp-footer-nombre">{titulo || 'Tu tienda'}</p>
                {descripcion && <p className="lp-footer-desc">{descripcion}</p>}
              </div>
              <nav className="lp-footer-links">
                {categorias.length > 0 && <a href="#lp-categorias" onClick={(e) => e.preventDefault()}>Categorias</a>}
                <a href="#lp-productos" onClick={(e) => e.preventDefault()}>Productos</a>
                {testimoniosVisibles.length > 0 && <a href="#lp-opiniones" onClick={(e) => e.preventDefault()}>Opiniones</a>}
                {faqsVisibles.length > 0 && <a href="#lp-faq" onClick={(e) => e.preventDefault()}>Preguntas frecuentes</a>}
              </nav>
              {contacto?.whatsapp && (
                <a className="lp-footer-wsp" href={`https://wa.me/${contacto.whatsapp}`} onClick={(e) => e.preventDefault()}>
                  <MessageCircle size={15} /> Escribinos por WhatsApp
                </a>
              )}
            </div>
          </footer>

          <div className="lb-preview-inert-cover" aria-hidden="true" />
        </div>
      </div>

      {!contacto?.whatsapp && (
        <p className="lb-preview-hint">
          Sin WhatsApp configurado no se muestra el boton de contacto. Se configura en Mi tienda.
        </p>
      )}
    </div>
  );
}
