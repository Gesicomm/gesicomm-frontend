import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, RefreshCw, Handshake, UserCheck } from 'lucide-react';

/**
 * Copy genérico pero HONESTO — nada de "envío gratis" ni "pago 100% seguro"
 * sin un campo real detrás. Estos cuatro puntos son ciertos para cualquier
 * tienda de Gesicomm, sea lo que sea que venda: el pedido se cierra por
 * WhatsApp, el catálogo es el mismo que administra la dueña en vivo, y el
 * pago/entrega se coordina directo con ella (no hay checkout ni pasarela).
 */
const BENEFICIOS = [
  { icono: MessageCircle, titulo: 'Pedís directo por WhatsApp', texto: 'Elegís lo que querés y coordinás todo por chat, sin vueltas.' },
  { icono: RefreshCw, titulo: 'Catálogo siempre al día', texto: 'Los precios y el stock que ves son los que administra la tienda en vivo.' },
  { icono: Handshake, titulo: 'Pago y entrega directo', texto: 'Coordinás la forma de pago y el envío con la tienda, sin intermediarios.' },
  { icono: UserCheck, titulo: 'Atención personalizada', texto: 'Hablás directo con quien vende — no con un bot ni un call center.' },
];

export default function LandingBenefits() {
  const reducirMovimiento = useReducedMotion();

  return (
    <section
      className="border-y py-14"
      style={{ borderColor: 'var(--l-card-border)', background: 'var(--l-surface)' }}
    >
      <div className="mx-auto grid max-w-[var(--l-max)] grid-cols-2 gap-x-6 gap-y-10 px-[var(--l-gutter)] lg:grid-cols-4">
        {BENEFICIOS.map((b, i) => (
          <motion.div
            key={b.titulo}
            initial={{ opacity: 0, y: reducirMovimiento ? 0 : 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
          >
            <b.icono size={26} strokeWidth={1.6} style={{ color: 'var(--l-primary)' }} />
            <p className="mt-3 text-sm font-bold text-[var(--l-text)]">{b.titulo}</p>
            <p className="mt-1 text-[0.83rem] leading-relaxed text-[var(--l-text-muted)]">{b.texto}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
