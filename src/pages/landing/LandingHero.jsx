import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, MessageCircle, Star } from 'lucide-react';

/**
 * Hero — lo primero que ve el visitante. Todo lo que muestra es dato real
 * de ESTA landing (título/descripción propios, cantidad real de productos
 * y categorías). Nada de cifras de clientes o ventas: no hay ningún módulo
 * de pedidos en el sistema que las respalde.
 *
 * Centrado, sin columna lateral: los productos marcados como destacados
 * tienen su propia sección real (ver LandingFeatured.jsx) — antes había
 * una tarjeta acá que solo mostraba "el primer producto por orden" porque
 * se creyó que no existía un flag de destacado propio. Sí existe
 * (Producto.destacado), así que esa tarjeta salió de acá.
 */
export default function LandingHero({
  titulo,
  descripcion,
  totalItems,
  totalCategorias,
  ratingPromedio,
  cantidadOpiniones,
  whatsapp,
  tamano,
}) {
  const reducirMovimiento = useReducedMotion();
  const variantes = {
    oculto: { opacity: 0, y: reducirMovimiento ? 0 : 18 },
    visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] } }),
  };

  const getFontSize = () => {
    if (tamano === 'sm') return 'clamp(1.5rem, 4vw, 2.2rem)';
    if (tamano === 'lg') return 'clamp(3rem, 6vw, 4.5rem)';
    return 'clamp(2.2rem, 5vw, 3.5rem)';
  };

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(80% 60% at 50% 0%, color-mix(in srgb, var(--l-primary) 14%, transparent) 0%, transparent 60%), var(--l-bg)',
        }}
      />

      <div className="mx-auto max-w-[46rem] px-[var(--l-gutter)] py-16 text-center sm:py-20">
        <motion.span
          initial="oculto"
          animate="visible"
          custom={0}
          variants={variantes}
          className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ borderColor: 'var(--l-card-border)', color: 'var(--l-text-muted)' }}
        >
          Catálogo online
        </motion.span>

        <motion.h1
          initial="oculto"
          animate="visible"
          custom={0.08}
          variants={variantes}
          className="text-balance font-extrabold leading-[1.05] text-[var(--l-text)]"
          style={{ fontSize: getFontSize(), letterSpacing: '-0.03em' }}
        >
          {titulo}
        </motion.h1>

        {descripcion && (
          <motion.p
            initial="oculto"
            animate="visible"
            custom={0.16}
            variants={variantes}
            className="mx-auto mt-5 max-w-[34rem] text-pretty text-lg leading-relaxed text-[var(--l-text-muted)]"
          >
            {descripcion}
          </motion.p>
        )}

        <motion.div
          initial="oculto"
          animate="visible"
          custom={0.24}
          variants={variantes}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#lp-productos"
            className="inline-flex items-center gap-2 rounded-[var(--l-radius-sm)] px-6 py-3.5 text-sm font-bold text-[var(--l-on-primary)] shadow-lg transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--l-primary)', boxShadow: '0 12px 30px color-mix(in srgb, var(--l-primary) 32%, transparent)' }}
          >
            Ver catálogo <ArrowRight size={16} />
          </a>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[var(--l-radius-sm)] border px-6 py-3.5 text-sm font-bold text-[var(--l-text)] transition-colors hover:bg-[var(--l-surface)]"
              style={{ borderColor: 'var(--l-card-border)' }}
            >
              <MessageCircle size={16} /> Escribinos
            </a>
          )}
        </motion.div>

        <motion.dl
          initial="oculto"
          animate="visible"
          custom={0.32}
          variants={variantes}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
        >
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--l-text-muted)]">Productos</dt>
            <dd className="text-2xl font-extrabold text-[var(--l-text)]">{totalItems}</dd>
          </div>
          {totalCategorias > 0 && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--l-text-muted)]">Categorías</dt>
              <dd className="text-2xl font-extrabold text-[var(--l-text)]">{totalCategorias}</dd>
            </div>
          )}
          {cantidadOpiniones > 0 && (
            <div>
              <dt className="flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--l-text-muted)]">
                <Star size={12} fill="currentColor" style={{ color: 'var(--l-primary)' }} /> Opiniones
              </dt>
              <dd className="text-2xl font-extrabold text-[var(--l-text)]">
                {ratingPromedio.toFixed(1)} <span className="text-sm font-semibold text-[var(--l-text-muted)]">({cantidadOpiniones})</span>
              </dd>
            </div>
          )}
        </motion.dl>
      </div>
    </section>
  );
}
