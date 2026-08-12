import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
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
import { getMediaUrl } from '../../services/api';

export default function LandingHero({
  template = 'minimal_center',
  config = {},
  titulo,
  descripcion,
  imagenFondo,
  totalItems,
  totalCategorias,
  ratingPromedio,
  cantidadOpiniones,
  whatsapp,
  tamano,
  contenido = {},
}) {
  const reducirMovimiento = useReducedMotion();
  const variantes = {
    oculto: { opacity: 0, y: reducirMovimiento ? 0 : 18 },
    visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] } }),
  };

  const [currentSlide, setCurrentSlide] = useState(0);
  const images = [imagenFondo, contenido.imagen_fondo_2, contenido.imagen_fondo_3].filter(Boolean);
  
  useEffect(() => {
    if (template === 'carousel' && config.autoplay && images.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % images.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [template, config.autoplay, images.length]);

  const getFontSize = () => {
    if (tamano === 'sm') return 'clamp(1.5rem, 4vw, 2.2rem)';
    if (tamano === 'lg') return 'clamp(3rem, 6vw, 4.5rem)';
    return 'clamp(2.2rem, 5vw, 3.5rem)';
  };

  if (template === 'carousel') {
    return (
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden py-24 text-center sm:py-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 -z-20 h-full w-full"
          >
            {images[currentSlide] && (
               <img src={getMediaUrl(images[currentSlide])} alt="" className="h-full w-full object-cover" />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 -z-10 bg-[var(--l-bg)] opacity-60 mix-blend-multiply" />
        
        <div className="mx-auto max-w-4xl px-[var(--l-gutter)] text-[var(--l-text)]">
          <motion.h1
            initial="oculto"
            animate="visible"
            custom={0}
            variants={variantes}
            className="text-balance font-extrabold leading-[1.05]"
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
              className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--l-text-muted)]"
            >
              {descripcion}
            </motion.p>
          )}

          <motion.div
            initial="oculto"
            animate="visible"
            custom={0.24}
            variants={variantes}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="#lp-productos"
              className="inline-flex items-center gap-2 rounded-[var(--l-radius-sm)] px-8 py-4 text-base font-bold text-[var(--l-text)] shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--l-primary)' }}
            >
              Ver catálogo <ArrowRight size={18} />
            </a>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[var(--l-radius-sm)] border border-white/30 bg-white/10 px-8 py-4 text-base font-bold text-[var(--l-text)] backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <MessageCircle size={18} /> Escribinos
              </a>
            )}
          </motion.div>
          
          {images.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
               {images.map((_, i) => (
                 <button 
                   key={i} 
                   onClick={() => setCurrentSlide(i)}
                   className={`w-2 h-2 rounded-full transition-all ${currentSlide === i ? 'w-6 bg-white' : 'bg-white/50 hover:bg-white/80'}`}
                   aria-label={`Slide ${i+1}`}
                 />
               ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (template === 'image_background') {
    return (
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden py-24 text-center sm:py-32">
        {imagenFondo && (
          <>
            <img src={getMediaUrl(imagenFondo)} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-[var(--l-bg)] opacity-60 mix-blend-multiply" />
          </>
        )}
        <div className="mx-auto max-w-4xl px-[var(--l-gutter)] text-[var(--l-text)]">
          <motion.h1
            initial="oculto"
            animate="visible"
            custom={0}
            variants={variantes}
            className="text-balance font-extrabold leading-[1.05]"
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
              className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--l-text-muted)]"
            >
              {descripcion}
            </motion.p>
          )}

          <motion.div
            initial="oculto"
            animate="visible"
            custom={0.24}
            variants={variantes}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="#lp-productos"
              className="inline-flex items-center gap-2 rounded-[var(--l-radius-sm)] px-8 py-4 text-base font-bold text-[var(--l-text)] shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--l-primary)' }}
            >
              Ver catálogo <ArrowRight size={18} />
            </a>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[var(--l-radius-sm)] border border-white/30 bg-white/10 px-8 py-4 text-base font-bold text-[var(--l-text)] backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <MessageCircle size={18} /> Escribinos
              </a>
            )}
          </motion.div>
          
          {config.mostrar_estadisticas !== false && (
            <motion.dl
              initial="oculto"
              animate="visible"
              custom={0.32}
              variants={variantes}
              className="mt-16 flex flex-wrap items-center justify-center gap-x-12 gap-y-6"
            >
              <div>
                <dt className="text-sm font-semibold uppercase tracking-wide text-gray-300">Productos</dt>
                <dd className="mt-1 text-3xl font-extrabold text-[var(--l-text)]">{totalItems}</dd>
              </div>
              {totalCategorias > 0 && (
                <div>
                  <dt className="text-sm font-semibold uppercase tracking-wide text-gray-300">Categorías</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-[var(--l-text)]">{totalCategorias}</dd>
                </div>
              )}
            </motion.dl>
          )}
        </div>
      </section>
    );
  }

  if (template === 'split_image_text') {
    return (
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="mx-auto max-w-[var(--l-max)] px-[var(--l-gutter)] grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <motion.span
              initial="oculto"
              animate="visible"
              custom={0}
              variants={variantes}
              className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider"
              style={{ borderColor: 'var(--l-card-border)', color: 'var(--l-text-muted)' }}
            >
              Tienda Oficial
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
                className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-[var(--l-text-muted)]"
              >
                {descripcion}
              </motion.p>
            )}

            <motion.div
              initial="oculto"
              animate="visible"
              custom={0.24}
              variants={variantes}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <a
                href="#lp-productos"
                className="inline-flex items-center gap-2 rounded-[var(--l-radius-sm)] px-6 py-3.5 text-sm font-bold text-[var(--l-on-primary)] shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--l-primary)', boxShadow: '0 12px 30px color-mix(in srgb, var(--l-primary) 32%, transparent)' }}
              >
                Catálogo <ArrowRight size={16} />
              </a>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-[var(--l-radius-sm)] border px-6 py-3.5 text-sm font-bold text-[var(--l-text)] transition-colors hover:bg-[var(--l-surface)]"
                  style={{ borderColor: 'var(--l-card-border)' }}
                >
                  <MessageCircle size={16} /> Contacto
                </a>
              )}
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative aspect-square w-full lg:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl"
          >
            {imagenFondo ? (
              <img src={getMediaUrl(imagenFondo)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[var(--l-surface)] flex items-center justify-center text-[var(--l-text-muted)]">
                <span className="text-sm">Sube una imagen desde el inspector</span>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    );
  }

  // minimal_center por defecto
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

        {config.mostrar_estadisticas !== false && (
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
        )}
      </div>
    </section>
  );
}
