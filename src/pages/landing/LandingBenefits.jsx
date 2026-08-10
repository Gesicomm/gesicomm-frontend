import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  MessageCircle, RefreshCw, Handshake, UserCheck, 
  Truck, CreditCard, ShieldCheck, Star, Heart, 
  ThumbsUp, CheckCircle, Zap, Clock, Gift, Globe,
  ShoppingCart, ShoppingBag, Tag, Percent, DollarSign,
  Box, Package, Award, Shield, Smartphone, Phone, 
  Mail, MapPin, Navigation, Headphones, LifeBuoy, 
  Smile, Calendar, Camera, Info, AlertCircle, 
  Lock, Unlock, Key, Briefcase, Bookmark, 
  Eye, Store, FastForward, Send, Megaphone, 
  TrendingUp, Users, UserPlus, FileText, ClipboardList,
  Coffee, Music, Compass, Sun, Moon, Battery,
  Wifi, Cpu, Monitor, Printer, Tv
} from 'lucide-react';

export const BENEFICIOS_ICONS = {
  MessageCircle, RefreshCw, Handshake, UserCheck, 
  Truck, CreditCard, ShieldCheck, Star, Heart, 
  ThumbsUp, CheckCircle, Zap, Clock, Gift, Globe,
  ShoppingCart, ShoppingBag, Tag, Percent, DollarSign,
  Box, Package, Award, Shield, Smartphone, Phone, 
  Mail, MapPin, Navigation, Headphones, LifeBuoy, 
  Smile, Calendar, Camera, Info, AlertCircle, 
  Lock, Unlock, Key, Briefcase, Bookmark, 
  Eye, Store, FastForward, Send, Megaphone, 
  TrendingUp, Users, UserPlus, FileText, ClipboardList,
  Coffee, Music, Compass, Sun, Moon, Battery,
  Wifi, Cpu, Monitor, Printer, Tv
};

/**
 * Copy genérico pero HONESTO — nada de "envío gratis" ni "pago 100% seguro"
 * sin un campo real detrás. Estos cuatro puntos son ciertos para cualquier
 * tienda de Gesicomm, sea lo que sea que venda: el pedido se cierra por
 * WhatsApp, el catálogo es el mismo que administra la dueña en vivo, y el
 * pago/entrega se coordina directo con ella (no hay checkout ni pasarela).
 */
export const DEFAULT_BENEFITS = [
  { icono: 'MessageCircle', titulo: 'Pedís directo por WhatsApp', texto: 'Elegís lo que querés y coordinás todo por chat, sin vueltas.' },
  { icono: 'RefreshCw', titulo: 'Catálogo siempre al día', texto: 'Los precios y el stock que ves son los que administra la tienda en vivo.' },
  { icono: 'Handshake', titulo: 'Pago y entrega directo', texto: 'Coordinás la forma de pago y el envío con la tienda, sin intermediarios.' },
  { icono: 'UserCheck', titulo: 'Atención personalizada', texto: 'Hablás directo con quien vende — no con un bot ni un call center.' },
];

export default function LandingBenefits({ contenido }) {
  const reducirMovimiento = useReducedMotion();
  const beneficios = contenido?.beneficios?.length > 0 ? contenido.beneficios : DEFAULT_BENEFITS;

  return (
    <section
      className="border-y py-14"
      style={{ borderColor: 'var(--l-card-border)', background: 'var(--l-surface)' }}
    >
      <div className="mx-auto grid max-w-[var(--l-max)] grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10 px-[var(--l-gutter)] lg:grid-cols-4">
        {beneficios.map((b, i) => {
          const Icon = BENEFICIOS_ICONS[b.icono] || CheckCircle;
          return (
            <motion.div
              key={`${b.titulo}-${i}`}
              initial={{ opacity: 0, y: reducirMovimiento ? 0 : 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
            >
              <Icon size={26} strokeWidth={1.6} style={{ color: 'var(--l-primary)' }} />
              <p className="mt-3 text-sm font-bold text-[var(--l-text)]">{b.titulo}</p>
              <p className="mt-1 text-[0.83rem] leading-relaxed text-[var(--l-text-muted)]">{b.texto}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
