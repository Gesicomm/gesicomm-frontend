import React from 'react';
import { InstagramIcon, FacebookIcon, TikTokIcon, WhatsappIcon, YoutubeIcon, TwitterIcon } from '../../../page-builder/blocks/footer-builder/SocialIcons';

const CAMPO = 'w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30';
const LABEL = 'block text-xs font-semibold text-white/60 mb-1.5';

// Mismo ícono que ve el cliente en el pie de la landing
// (RedesSocialesFooter en sections.jsx) — así el comercio reconoce de un
// vistazo qué campo es cada uno.
const CAMPOS = [
  { key: 'contacto_whatsapp', label: 'WhatsApp', placeholder: '+595 xxx xxx xxx', Icon: WhatsappIcon },
  { key: 'contacto_instagram', label: 'Instagram', placeholder: '@miempresa', Icon: InstagramIcon },
  { key: 'contacto_facebook', label: 'Facebook', placeholder: 'miempresa', Icon: FacebookIcon },
  { key: 'contacto_tiktok', label: 'TikTok', placeholder: '@miempresa', Icon: TikTokIcon },
  { key: 'contacto_youtube', label: 'YouTube', placeholder: '@micanal', Icon: YoutubeIcon },
  { key: 'contacto_twitter', label: 'X / Twitter', placeholder: '@miusuario', Icon: TwitterIcon },
];

/**
 * Solo redes sociales — se muestran en el pie de TODAS las páginas y, con
 * más detalle, en la página de Contacto. Los datos de contacto reales
 * (dirección/ciudad/país/teléfono/email/horarios) viven en su propio panel
 * (panels/ContactoPanel.jsx).
 */
export default function RedesPanel({ draft, onCampo }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/40 leading-relaxed">
        Aparecen en el pie de todas las páginas. El WhatsApp además se usa para el botón
        <strong className="text-white/70"> "Consultar por WhatsApp"</strong> de cada producto.
      </p>
      {CAMPOS.map(({ key, label, placeholder, Icon }) => (
        <div key={key}>
          <label className={LABEL}>{label}</label>
          <div className="relative">
            <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={draft[key] || ''}
              onChange={e => onCampo(key, e.target.value)}
              placeholder={placeholder}
              className={CAMPO}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
