import React, { useState } from 'react';
import { ChevronDown, ShoppingCart } from 'lucide-react';
import { InstagramIcon, FacebookIcon, WhatsappIcon, TikTokIcon, YoutubeIcon, TwitterIcon } from '../../../page-builder/blocks/footer-builder/SocialIcons';
import { getIconoBeneficio } from './iconosBeneficios';

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

  const filas = [
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
        {filas.map(({ Icon, valor, type }, idx) => {
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
            {abierta === idx && <p className="mt-2 text-sm" style={textoSuave(0.6)}>{f.respuesta}</p>}
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
