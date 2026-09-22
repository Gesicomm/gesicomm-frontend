import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ShoppingCart, Phone, Mail, MapPin, Clock, Check, MessageCircle } from 'lucide-react';
import { InstagramIcon, FacebookIcon, WhatsappIcon, TikTokIcon, YoutubeIcon, TwitterIcon } from '../../../page-builder/blocks/footer-builder/SocialIcons';
import { getIconoBeneficio } from './iconosBeneficios';
import RichText from '../../../components/RichText';
import { getMediaUrl } from '../../../services/api';
import { analizarVideo } from './video';

/** Tope de fotos que rota una tarjeta: más que esto marea y son bytes de más. */
const MAX_FOTOS_TARJETA = 5;

/**
 * Imagen de la tarjeta de producto. Cuando el producto tiene más de una
 * foto, al pasar el mouse por encima va rotando la galería y vuelve a la
 * principal al salir (igual que las tarjetas de Shopify).
 *
 * El resto de la galería recién se agrega al DOM en el primer hover: con
 * un catálogo grande, precargar todas las fotos de todas las tarjetas es
 * un montón de tráfico que casi nadie llega a mirar.
 *
 * Sin hover (touch) o con una sola foto se comporta como un <img> común:
 * nunca se anima sola.
 */
export function ImagenProductoHover({ imagenes = [], imagen = null, alt = '', fallback = null, intervaloMs = 900, className = '', imgClassName = 'w-full h-full object-cover transition-opacity duration-500 ease-out' }) {
  // `imagen` es el respaldo para los orígenes de datos que todavía mandan
  // una sola foto (funnels, items cacheados): la tarjeta se ve igual que
  // antes, simplemente no rota.
  const galeria = (imagenes || []).map(urlDeTarjeta).filter(Boolean);
  const respaldo = urlDeTarjeta(imagen);
  const fotos = (galeria.length ? galeria : [respaldo].filter(Boolean)).slice(0, MAX_FOTOS_TARJETA);
  const [indice, setIndice] = useState(0);
  const [precargar, setPrecargar] = useState(false);
  const timer = useRef(null);

  const detener = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setIndice(0);
  }, []);

  // Sin esto, salir de la página (o filtrar el catálogo) deja el intervalo
  // corriendo contra una tarjeta que ya no está montada.
  useEffect(() => detener, [detener]);

  const cantidad = fotos.length;
  const iniciar = useCallback(() => {
    if (cantidad < 2 || timer.current) return;
    setPrecargar(true);
    timer.current = setInterval(() => setIndice(i => (i + 1) % cantidad), intervaloMs);
  }, [cantidad, intervaloMs]);

  if (!cantidad) {
    return <div className={`w-full h-full flex items-center justify-center ${className}`}>{fallback}</div>;
  }

  const visibles = precargar ? fotos : fotos.slice(0, 1);
  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      onMouseEnter={iniciar}
      onMouseLeave={detener}
    >
      {visibles.map((url, i) => (
        <img
          key={`${url}-${i}`}
          src={url}
          alt={i === 0 ? alt : ''}
          aria-hidden={i !== 0}
          loading={i === 0 ? undefined : 'lazy'}
          decoding="async"
          // Lo único que impone el componente es la superposición: el tamaño,
          // el recorte y la transición se pasan por `imgClassName` para no
          // pisar las hojas que ya estilan estas imágenes (.fpp-upsell-img img,
          // .lp-card-media img y compañía).
          className={`absolute inset-0 ${imgClassName}`}
          style={{ opacity: i === indice ? 1 : 0 }}
        />
      ))}
    </div>
  );
}

function urlDeTarjeta(medio) {
  if (!medio) return null;
  if (typeof medio === 'string') {
    if (/\.(jpe?g|png|webp|gif|avif|svg)(?:$|[?#])/i.test(medio)) return getMediaUrl(medio);
    const video = analizarVideo(medio);
    if (video?.miniatura) return video.miniatura;
    if (video && video.plataforma !== 'enlace') return null;
    return getMediaUrl(medio);
  }
  if (medio.tipo === 'video') {
    const video = analizarVideo(medio.url);
    return medio.portada || medio.miniatura || video?.miniatura || null;
  }
  return getMediaUrl(medio.url || medio.imagen || medio.src || medio.path || '');
}

/**
 * Botón de carrito con badge de cantidad — vive en el Header de los 4
 * templates. `onClick` es un no-op en el preview del editor (no hay
 * carrito ahí, solo en la landing pública, ver LandingPublica.jsx).
 */
export function CartButton({ cantidad = 0, acento, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative p-2 rounded-full transition-opacity hover:opacity-80"
      style={{ color }}
      title="Ver carrito"
    >
      <ShoppingCart size={20} />
      {cantidad > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
          style={{ backgroundColor: acento, color: '#fff' }}
        >
          {cantidad}
        </span>
      )}
    </button>
  );
}

/**
 * Secciones compartidas entre los 4 templates rígidos (Fitness/Beauty/
 * Tech/Básico) — Beneficios, Contacto y FAQ tienen exactamente el mismo
 * comportamiento en los cuatro, solo cambia la paleta/tipografía que cada
 * template les pasa por props. Centralizarlas evita que las 4 copias se
 * desincronicen entre sí (pasó con los íconos de redes: cada template
 * tenía su propio Instagram "a mano" en vez de los íconos canónicos de
 * SocialIcons.jsx que ya usa el resto del producto).
 */

/** Vacío = no se agregaron beneficios todavía → no se muestra nada (mismo criterio que FAQ), nunca contenido "fantasma" que no está en el panel del editor. */
export function BeneficiosSection({ beneficios, acento, textoSuave, tituloClase = 'font-bold', bordeSuave = 'transparent', isMobile = false }) {
  if (!beneficios?.length) return null;
  return (
    <section id="beneficios" className={`px-6 py-14 grid gap-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`} style={{ borderTop: `1px solid ${bordeSuave}` }}>
      {beneficios.map((b, idx) => {
        const Icon = getIconoBeneficio(b.icono);
        return (
          <div key={idx} className="flex flex-col items-start gap-2">
            <Icon size={24} style={{ color: acento }} />
            <h3 className={tituloClase}>{b.titulo}</h3>
            <p className="text-sm" style={textoSuave(0.6)}>{b.texto}</p>
          </div>
        );
      })}
    </section>
  );
}

/**
 * Acciones rápidas dentro de la tarjeta de producto: "Agregar" y WhatsApp,
 * para no obligar al visitante a entrar al detalle. Están conectadas al
 * MISMO carrito de la tienda que usa la página de producto y el checkout
 * (agregarAlCarrito en LandingPublica.jsx, que además dispara el tracking
 * de AddToCart a Pixel/CAPI).
 *
 * Si el producto tiene variantes u ofertas, "Agregar" no puede resolver
 * sola qué opción quiere el visitante: en ese caso lleva al detalle
 * (onElegir) en vez de agregar algo al azar.
 *
 * En el preview del editor no se pasan handlers → no se renderiza nada.
 */
export function AccionesProducto({ producto, onAgregar, onElegir, linkWhatsapp, onContactar, acento, fondo, bordeSuave }) {
  const [agregado, setAgregado] = useState(false);
  if (!onAgregar && !linkWhatsapp) return null;

  const sinStock = producto?.stock != null && producto.stock <= 0;
  const necesitaElegir = !!(producto?.tieneOpciones);

  function alAgregar(e) {
    e.stopPropagation();
    if (sinStock) return;
    if (necesitaElegir) { onElegir?.(producto); return; }
    onAgregar?.(producto);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1500);
  }

  return (
    <div className="flex items-center gap-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
      {onAgregar && (
        <button
          type="button"
          onClick={alAgregar}
          disabled={sinStock}
          title={sinStock ? 'Sin stock' : (necesitaElegir ? 'Elegir opciones' : 'Agregar al carrito')}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-2 py-2 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: agregado ? '#10b981' : acento, color: fondo }}
        >
          {sinStock ? 'Sin stock'
            : agregado ? <><Check size={13} /> Agregado</>
            : necesitaElegir ? 'Elegir'
            : <><ShoppingCart size={13} /> Agregar</>}
        </button>
      )}
      {linkWhatsapp && (
        <a
          href={linkWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { e.stopPropagation(); onContactar?.(producto); }}
          title="Consultar por WhatsApp"
          className="inline-flex items-center justify-center p-2 rounded-lg transition-opacity hover:opacity-80 shrink-0"
          style={{ border: `1px solid ${bordeSuave}`, color: acento }}
        >
          <MessageCircle size={15} />
        </a>
      )}
    </div>
  );
}

/**
 * Datos de contacto REALES del comercio — dirección, ciudad, país,
 * teléfono, email, horarios. Es lo propio de la página de Contacto y no
 * tiene nada que ver con las redes sociales (esas van en ContactoSection /
 * RedesSocialesFooter): antes la página de Contacto mostraba SOLO redes y
 * descartaba teléfono/email/dirección aunque estuvieran cargados.
 */
export function DatosContactoSection({ contacto, acento, tituloClase, bordeSuave, textoSuave, isMobile = false }) {
  const ubicacion = [contacto?.direccion, contacto?.ciudad, contacto?.pais].filter(Boolean).join(', ');

  const filas = [
    ubicacion && { Icon: MapPin, valor: ubicacion, href: `https://maps.google.com/?q=${encodeURIComponent(ubicacion)}`, label: 'Dirección' },
    contacto?.telefono && { Icon: Phone, valor: contacto.telefono, href: `tel:${contacto.telefono.replace(/\D/g, '')}`, label: 'Teléfono' },
    contacto?.email && { Icon: Mail, valor: contacto.email, href: `mailto:${contacto.email}`, label: 'Email' },
    contacto?.horarios && { Icon: Clock, valor: contacto.horarios, href: null, label: 'Horarios' },
  ].filter(Boolean);

  if (!filas.length) return null;

  return (
    <section id="datos-contacto" className="px-6 py-14" style={{ borderTop: `1px solid ${bordeSuave}` }}>
      <h2 className={`text-2xl mb-6 ${tituloClase}`}>Datos de contacto</h2>
      <div className={`grid gap-5 text-sm ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {filas.map(({ Icon, valor, href, label }, idx) => {
          const contenido = (
            <>
              <Icon size={17} style={{ color: acento, flexShrink: 0, marginTop: '2px' }} />
              <span className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider" style={textoSuave ? textoSuave(0.45) : undefined}>{label}</span>
                <span>{valor}</span>
              </span>
            </>
          );
          return href ? (
            <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 hover:opacity-80 transition-opacity">{contenido}</a>
          ) : (
            <div key={idx} className="flex items-start gap-2.5">{contenido}</div>
          );
        })}
      </div>
    </section>
  );
}

export function ContactoSection({ contacto, acento, tituloClase, bordeSuave, isMobile = false }) {
  const getHref = (type, valor) => {
    if (!valor) return null;
    const cleanPhone = valor.replace(/\D/g, '');
    
    // Si el usuario ya pegó un link completo, usarlo tal cual
    const isUrl = valor.startsWith('http://') || valor.startsWith('https://');
    
    switch (type) {
      case 'whatsapp': return `https://api.whatsapp.com/send?phone=${cleanPhone}`;
      case 'telefono': return `tel:${cleanPhone}`;
      case 'email': return `mailto:${valor}`;
      case 'instagram': return isUrl ? valor : `https://instagram.com/${valor.replace(/^@/, '')}`;
      case 'facebook': return isUrl ? valor : `https://facebook.com/${valor}`;
      case 'tiktok': return isUrl ? valor : `https://tiktok.com/@${valor.replace(/^@/, '')}`;
      case 'youtube': return isUrl ? valor : `https://youtube.com/@${valor.replace(/^@/, '')}`;
      case 'twitter': return isUrl ? valor : `https://x.com/${valor.replace(/^@/, '')}`;
      default: return null;
    }
  };

  const filasSociales = [
    contacto.whatsapp && { Icon: WhatsappIcon, valor: contacto.whatsapp, type: 'whatsapp' },
    contacto.instagram && { Icon: InstagramIcon, valor: contacto.instagram, type: 'instagram' },
    contacto.facebook && { Icon: FacebookIcon, valor: contacto.facebook, type: 'facebook' },
    contacto.tiktok && { Icon: TikTokIcon, valor: contacto.tiktok, type: 'tiktok' },
    contacto.youtube && { Icon: YoutubeIcon, valor: contacto.youtube, type: 'youtube' },
    contacto.twitter && { Icon: TwitterIcon, valor: contacto.twitter, type: 'twitter' },
  ].filter(Boolean);

  return (
    <section id="contacto" className="px-6 py-14" style={{ borderTop: `1px solid ${bordeSuave}` }}>
      <h2 className={`text-2xl mb-6 ${tituloClase}`}>Redes sociales</h2>
      <div className={`grid gap-4 text-sm ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {filasSociales.map(({ Icon, valor, type }, idx) => {
          const href = getHref(type, valor);
          const content = (
            <>
              <Icon size={16} style={{ color: acento }} /> 
              <span>{valor}</span>
            </>
          );
          
          if (href) {
            return (
              <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {content}
              </a>
            );
          }
          
          return (
            <div key={idx} className="flex items-center gap-2">
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FaqSection({ faq, acento, bordeSuave, textoSuave, tituloClase }) {
  const [abierta, setAbierta] = useState(null);
  if (!faq?.length) return null;
  return (
    <section id="faq" className="px-6 py-14" style={{ borderTop: `1px solid ${bordeSuave}` }}>
      <h2 className={`text-2xl mb-6 ${tituloClase}`}>Preguntas frecuentes</h2>
      <div className="max-w-2xl">
        {faq.map((f, idx) => (
          <div key={idx} className="py-4" style={{ borderTop: idx > 0 ? `1px solid ${bordeSuave}` : 'none' }}>
            <button
              type="button"
              className="w-full flex items-center justify-between text-left font-semibold"
              onClick={() => setAbierta(abierta === idx ? null : idx)}
            >
              {f.pregunta}
              <ChevronDown size={16} style={{ color: acento, transform: abierta === idx ? 'rotate(180deg)' : 'none' }} />
            </button>
            {abierta === idx && <RichText text={f.respuesta} className="mt-2 text-sm" style={textoSuave(0.6)} />}
          </div>
        ))}
      </div>
    </section>
  );
}

export function RedesSocialesFooter({ contacto, acento, bordeSuave }) {
  const getHref = (type, valor) => {
    if (!valor) return null;
    const isUrl = valor.startsWith('http://') || valor.startsWith('https://');
    const cleanPhone = valor.replace(/\D/g, '');
    switch (type) {
      case 'whatsapp': return `https://api.whatsapp.com/send?phone=${cleanPhone}`;
      case 'instagram': return isUrl ? valor : `https://instagram.com/${valor.replace(/^@/, '')}`;
      case 'facebook': return isUrl ? valor : `https://facebook.com/${valor}`;
      case 'tiktok': return isUrl ? valor : `https://tiktok.com/@${valor.replace(/^@/, '')}`;
      case 'youtube': return isUrl ? valor : `https://youtube.com/@${valor.replace(/^@/, '')}`;
      case 'twitter': return isUrl ? valor : `https://x.com/${valor.replace(/^@/, '')}`;
      default: return null;
    }
  };

  const redes = [
    contacto?.whatsapp && { Icon: WhatsappIcon, href: getHref('whatsapp', contacto.whatsapp) },
    contacto?.facebook && { Icon: FacebookIcon, href: getHref('facebook', contacto.facebook) },
    contacto?.instagram && { Icon: InstagramIcon, href: getHref('instagram', contacto.instagram) },
    contacto?.tiktok && { Icon: TikTokIcon, href: getHref('tiktok', contacto.tiktok) },
    contacto?.youtube && { Icon: YoutubeIcon, href: getHref('youtube', contacto.youtube) },
    contacto?.twitter && { Icon: TwitterIcon, href: getHref('twitter', contacto.twitter) },
  ].filter(Boolean);

  if (!redes.length) return null;

  return (
    <div className="py-6 flex items-center justify-center gap-6" style={{ borderTop: `1px solid ${bordeSuave}` }}>
      {redes.map(({ Icon, href }, idx) => (
        <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: acento }}>
          <Icon size={20} />
        </a>
      ))}
    </div>
  );
}
