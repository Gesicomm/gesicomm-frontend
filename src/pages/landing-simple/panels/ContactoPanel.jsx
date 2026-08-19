import React from 'react';
import { MapPin, Building2, Globe, Phone, Mail, Clock } from 'lucide-react';

const CAMPO = 'w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30';
const LABEL = 'block text-xs font-semibold text-white/60 mb-1.5';

/**
 * Datos de contacto REALES del comercio — lo que se muestra en la página
 * de Contacto (/contacto). Separado a propósito de las redes sociales
 * (panels/RedesPanel.jsx): son dos cosas distintas y antes estaban
 * mezcladas en un solo panel llamado "Redes sociales", así que la página
 * de Contacto terminaba mostrando solo redes.
 */
const CAMPOS = [
  { key: 'contacto_direccion', label: 'Dirección', placeholder: 'Av. España 123', Icon: MapPin },
  { key: 'contacto_ciudad', label: 'Ciudad', placeholder: 'Asunción', Icon: Building2 },
  { key: 'contacto_pais', label: 'País', placeholder: 'Paraguay', Icon: Globe },
  { key: 'contacto_telefono', label: 'Teléfono', placeholder: '+595 21 555 555', Icon: Phone },
  { key: 'contacto_email', label: 'Email', placeholder: 'hola@mitienda.com', Icon: Mail },
  { key: 'contacto_horarios', label: 'Horarios de atención', placeholder: 'Lun a Vie de 9 a 18hs', Icon: Clock },
];

export default function ContactoPanel({ draft, onCampo }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/40 leading-relaxed">
        Se muestran en la página de <strong className="text-white/70">Contacto</strong>. Dejá vacío el que no uses — no aparece.
        Las redes sociales se cargan en su propia pestaña.
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
