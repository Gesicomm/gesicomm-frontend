import {
  ShieldCheck, Truck, Zap, Award, Heart, Leaf, Sun, Flower2, HeadphonesIcon,
  Package, BadgeCheck, Clock, Gift, Star, Lock, Flame, Wifi, Battery, Cpu,
  Dumbbell, Sparkles, ThumbsUp,
} from 'lucide-react';

/**
 * Catálogo de íconos que el comercio puede elegir para cada tarjeta de
 * "Beneficios" — un solo set genérico compartido por los 4 templates
 * rígidos (no uno distinto por template: simplifica el picker y alcanza
 * para cubrir fitness/beauty/tech/básico). Solo se guarda la clave
 * (ej. "shield") en LandingBeneficio.icono, nunca el componente.
 */
export const CATALOGO_ICONOS_BENEFICIOS = [
  { key: 'shield', label: 'Seguridad', Icon: ShieldCheck },
  { key: 'truck', label: 'Envío', Icon: Truck },
  { key: 'zap', label: 'Rápido', Icon: Zap },
  { key: 'award', label: 'Calidad', Icon: Award },
  { key: 'badge', label: 'Garantía', Icon: BadgeCheck },
  { key: 'heart', label: 'Cuidado', Icon: Heart },
  { key: 'leaf', label: 'Natural', Icon: Leaf },
  { key: 'sun', label: 'Frescura', Icon: Sun },
  { key: 'flower', label: 'Belleza', Icon: Flower2 },
  { key: 'headphones', label: 'Soporte', Icon: HeadphonesIcon },
  { key: 'package', label: 'Producto', Icon: Package },
  { key: 'clock', label: 'Tiempo', Icon: Clock },
  { key: 'gift', label: 'Regalo', Icon: Gift },
  { key: 'star', label: 'Destacado', Icon: Star },
  { key: 'lock', label: 'Confianza', Icon: Lock },
  { key: 'flame', label: 'Energía', Icon: Flame },
  { key: 'wifi', label: 'Conectividad', Icon: Wifi },
  { key: 'battery', label: 'Duración', Icon: Battery },
  { key: 'cpu', label: 'Tecnología', Icon: Cpu },
  { key: 'dumbbell', label: 'Fitness', Icon: Dumbbell },
  { key: 'sparkles', label: 'Especial', Icon: Sparkles },
  { key: 'thumbs-up', label: 'Satisfacción', Icon: ThumbsUp },
];

const MAPA = new Map(CATALOGO_ICONOS_BENEFICIOS.map(i => [i.key, i.Icon]));
const DEFAULT_ICON = ShieldCheck;

/** clave guardada → componente de ícono. Clave null/no reconocida = ícono genérico. */
export function getIconoBeneficio(key) {
  return MAPA.get(key) || DEFAULT_ICON;
}
