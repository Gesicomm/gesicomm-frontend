import React, { useMemo, useState } from 'react';
import {
  Search, MessageCircle, Layers, ImageOff, Monitor, Smartphone, ExternalLink, Plus,
  ShoppingCart, ArrowRight, RefreshCw, Handshake, UserCheck, Package, Quote, Star,
} from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { calcularEstiloLanding } from '../../lib/landingDiseno';

/**
 * Vista previa en vivo de la landing pública, dentro del constructor.
 *
 * Es un espejo visual de LandingPublica.jsx (y de sus componentes Landing
 * Header/Hero/Benefits/CategoryStrip/Testimonials/Faq), no el componente
 * real: la página pública se alimenta del endpoint público (precios
 * recalculados contra el piso vigente, items ya filtrados por activo/
 * en_venta) y acá todavía no existe ni la landing guardada. Duplicar el
 * markup es deliberado — permite previsualizar una landing que aún no se
 * guardó. Los controles se dibujan inertes: muestran qué va a ver el
 * visitante, no accionan nada dentro del panel de edición.
 */

function formatPrecio(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }) + ' Gs';
}

const BENEFICIOS_PREVIEW = [
  { icono: MessageCircle, texto: 'Pedís por WhatsApp' },
  { icono: RefreshCw, texto: 'Catálogo al día' },
  { icono: Handshake, texto: 'Pago y entrega directo' },
  { icono: UserCheck, texto: 'Atención personalizada' },
];

export default function LandingPreview({
  titulo, descripcion, filtros, items, tema, diseno, contacto, banner, urlPublica,
  mostrarTestimonios, testimonios, mostrarFaq, faqs,
}) {
  const [dispositivo, setDispositivo] = useState('desktop');

  const categorias = useMemo(() => [...new Set(items.map(i => i.categoria).filter(Boolean))], [items]);
  const marcas = useMemo(() => [...new Set(items.map(i => i.marca).filter(Boolean))], [items]);
  const etiquetas = useMemo(() => {
    const mapa = new Map();
    items.forEach(i => {
      if (i.etiqueta) {
        const clave = i.etiqueta.toLowerCase();
        if (!mapa.has(clave)) mapa.set(clave, i.etiqueta);
      }
    });
    return Array.from(mapa.values());
  }, [items]);

  const hayFiltros = filtros.categoria || filtros.marca || filtros.etiqueta || filtros.buscador || filtros.orden_precio;
  // Producto.destacado ya viene en cada item del catálogo (lo marca la
  // dueña en el picker) — no es "el primero de la lista".
  const itemsDestacados = useMemo(() => items.filter(i => i.destacado), [items]);
  const testimoniosVisibles = mostrarTestimonios ? (testimonios || []).filter(t => t.nombre?.trim() || t.comentario?.trim()) : [];
  const faqsVisibles = mostrarFaq ? (faqs || []).filter(f => f.pregunta?.trim() || f.respuesta?.trim()) : [];

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
              title="Abrir web real en pestaña nueva"
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
          className={`lpv-page ${tema?.modo === 'claro' ? 'claro' : ''}`}
          style={calcularEstiloLanding({ tema, diseno })}
        >
          <header className="lpv-topbar">
            <span className="lpv-topbar-nombre">{titulo || 'Tu tienda'}</span>
            <span className="lpv-topbar-carrito"><ShoppingCart size={13} /></span>
          </header>

          <section className="lpv-hero">
            <span className="lpv-hero-eyebrow">Catálogo online</span>
            <h1>{titulo || 'Título de tu tienda'}</h1>
            {descripcion && <p>{descripcion}</p>}
            <span className="lpv-hero-cta">Ver catálogo <ArrowRight size={11} /></span>
            <div className="lpv-hero-stats">
              <span><strong>{items.length}</strong> productos</span>
              {categorias.length > 0 && <span><strong>{categorias.length}</strong> categorías</span>}
              {testimoniosVisibles.length > 0 && <span><strong>{testimoniosVisibles.length}</strong> opiniones</span>}
            </div>
          </section>

          <section className="lpv-benefits">
            {BENEFICIOS_PREVIEW.map(b => (
              <div key={b.texto} className="lpv-benefit">
                <b.icono size={15} strokeWidth={1.7} />
                <span>{b.texto}</span>
              </div>
            ))}
          </section>

          {categorias.length > 0 && (
            <section className="lpv-categorias">
              {categorias.map(c => (
                <span key={c} className="lpv-categoria-chip"><Package size={11} /> {c}</span>
              ))}
            </section>
          )}

          {itemsDestacados.length > 0 && (
            <section className="lpv-destacados">
              <h2>Productos destacados</h2>
              <div className="lpv-grid">
                {itemsDestacados.map(item => (
                  <div key={`destacado-${item.tipo}-${item.id}`} className="lpv-card">
                    <div className="lpv-card-media">
                      {item.imagen ? (
                        <img src={getMediaUrl(item.imagen)} alt={item.nombre} loading="lazy" />
                      ) : (
                        <div className="lpv-card-media-placeholder">
                          {item.tipo === 'combo' ? <Layers size={22} /> : <ImageOff size={22} />}
                          <span>Sin imagen</span>
                        </div>
                      )}
                      <span className="lpv-card-badge destacado">Destacado</span>
                    </div>
                    <div className="lpv-card-body">
                      <h3>{item.nombre}</h3>
                      <span className="lpv-card-price">{formatPrecio(item.precio_efectivo)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {banner && (
            <div
              className={`lpv-banner ${banner.imagen ? 'con-imagen' : ''}`}
              style={banner.imagen ? { backgroundImage: `url(${getMediaUrl(banner.imagen)})` } : undefined}
            >
              <div className="lpv-banner-overlay">
                {banner.titulo && <h2>{banner.titulo}</h2>}
                {banner.subtitulo && <p>{banner.subtitulo}</p>}
                {/* Inerte a propósito: en el constructor un botón real
                    navegaría fuera de la pantalla de edición. */}
                {banner.boton_texto && <span className="lpv-banner-btn">{banner.boton_texto}</span>}
              </div>
            </div>
          )}

          <div className="lpv-header">
            {items.length > 0 && (
              <span className="lpv-header-eyebrow">
                {items.length} producto{items.length === 1 ? '' : 's'}
              </span>
            )}
            <h2>Todos los productos</h2>
          </div>

          {hayFiltros && (
            <div className="lpv-filters">
              {filtros.buscador && (
                <span className="lpv-search"><Search size={12} /> Buscar...</span>
              )}
              {filtros.categoria && categorias.length > 0 && (
                <span className="lpv-select">Todas las categorías</span>
              )}
              {filtros.marca && marcas.length > 0 && (
                <span className="lpv-select">Todas las marcas</span>
              )}
              {filtros.etiqueta && etiquetas.length > 0 && (
                <span className="lpv-select">Todas las etiquetas</span>
              )}
              {filtros.orden_precio && (
                <span className="lpv-select">Orden por defecto</span>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <div className="lpv-empty">
              Elegí productos en el paso <strong>Productos</strong> y van a aparecer acá.
            </div>
          ) : (
            <div className="lpv-grid">
              {items.map(item => (
                <div key={`${item.tipo}-${item.id}`} className="lpv-card">
                  <div className="lpv-card-media">
                    {item.imagen ? (
                      <img src={getMediaUrl(item.imagen)} alt={item.nombre} loading="lazy" />
                    ) : (
                      <div className="lpv-card-media-placeholder">
                        {item.tipo === 'combo' ? <Layers size={22} /> : <ImageOff size={22} />}
                        <span>Sin imagen</span>
                      </div>
                    )}
                    {item.tipo === 'combo' && (
                      <span className="lpv-card-badge combo"><Layers size={10} /> Combo</span>
                    )}
                  </div>
                  <div className="lpv-card-body">
                    {item.etiqueta && <span className="lpv-card-tag">{item.etiqueta}</span>}
                    <h3>{item.nombre}</h3>
                    {item.descripcion && <p className="lpv-card-desc">{item.descripcion}</p>}
                    <span className="lpv-card-price">{formatPrecio(item.precio_efectivo)}</span>
                    <div className="lpv-card-actions">
                      <span className="lpv-card-btn-add">
                        <Plus size={13} /> Agregar
                      </span>
                      {contacto?.whatsapp && (
                        <span className="lpv-card-contact-btn" title="Consultar">
                          <MessageCircle size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {testimoniosVisibles.length > 0 && (
            <section className="lpv-testimonios">
              <h2>Opiniones</h2>
              <div className="lpv-testimonio-card">
                <Quote size={16} className="lpv-testimonio-quote" />
                <p>&ldquo;{testimoniosVisibles[0].comentario || 'Lo que dijo tu cliente'}&rdquo;</p>
                <div className="lpv-testimonio-estrellas">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={11} fill={n <= testimoniosVisibles[0].calificacion ? 'currentColor' : 'none'} />
                  ))}
                </div>
                <strong>{testimoniosVisibles[0].nombre || 'Tu cliente'}</strong>
                {testimoniosVisibles.length > 1 && (
                  <span className="lpv-testimonio-mas">+{testimoniosVisibles.length - 1} más en la landing real</span>
                )}
              </div>
            </section>
          )}

          {faqsVisibles.length > 0 && (
            <section className="lpv-faq">
              <h2>Preguntas frecuentes</h2>
              {faqsVisibles.map((f, i) => (
                <div key={i} className="lpv-faq-item">
                  <strong>{f.pregunta || '¿Pregunta?'}</strong>
                  <p>{f.respuesta || 'Respuesta...'}</p>
                </div>
              ))}
            </section>
          )}

          <footer className="lpv-footer">
            <span>{titulo || 'Tu tienda'}</span>
            {contacto?.whatsapp && (
              <span className="lpv-footer-wsp"><MessageCircle size={11} /> Escribinos por WhatsApp</span>
            )}
          </footer>
        </div>
      </div>

      {!contacto?.whatsapp && (
        <p className="lb-preview-hint">
          Sin WhatsApp configurado no se muestra el botón de contacto. Se configura en Mi tienda.
        </p>
      )}
    </div>
  );
}
