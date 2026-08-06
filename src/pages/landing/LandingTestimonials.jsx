import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import StarRating from './StarRating';

/**
 * Carrusel de testimonios — no existe ninguna librería de este tipo en el
 * proyecto, así que es uno chico a medida: una tarjeta visible a la vez,
 * flechas + puntos, y arrastre táctil en mobile (drag de Framer Motion,
 * con springback si no llega al umbral). Solo se monta si hay al menos un
 * testimonio real cargado — ver LandingPublica.jsx.
 */
export default function LandingTestimonials({ testimonios }) {
  const [indice, setIndice] = useState(0);
  const reducirMovimiento = useReducedMotion();
  const total = testimonios.length;

  function ir(delta) {
    setIndice((i) => (i + delta + total) % total);
  }

  function alSoltarArrastre(_e, info) {
    const UMBRAL = 60;
    if (info.offset.x < -UMBRAL) ir(1);
    else if (info.offset.x > UMBRAL) ir(-1);
  }

  const t = testimonios[indice];

  return (
    <section id="lp-opiniones" className="mx-auto max-w-[var(--l-max)] px-[var(--l-gutter)] py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-extrabold text-[var(--l-text)]" style={{ letterSpacing: '-0.02em' }}>
          Opiniones
        </h2>
        {total > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => ir(-1)}
              aria-label="Opinión anterior"
              className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-[var(--l-surface)]"
              style={{ borderColor: 'var(--l-card-border)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => ir(1)}
              aria-label="Siguiente opinión"
              className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-[var(--l-surface)]"
              style={{ borderColor: 'var(--l-card-border)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={indice}
            drag={total > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={alSoltarArrastre}
            initial={{ opacity: 0, x: reducirMovimiento ? 0 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducirMovimiento ? 0 : -24 }}
            transition={{ duration: 0.3 }}
            className={`mx-auto max-w-2xl rounded-[var(--l-radius)] border p-8 text-center sm:p-10 ${total > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{ background: 'var(--l-card-bg)', borderColor: 'var(--l-card-border)' }}
          >
            <Quote size={28} className="mx-auto mb-4" style={{ color: 'var(--l-primary)', opacity: 0.5 }} aria-hidden="true" />
            <p className="text-pretty text-lg leading-relaxed text-[var(--l-text)]">&ldquo;{t.comentario}&rdquo;</p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <div style={{ color: 'var(--l-primary)' }}>
                <StarRating value={t.calificacion} size={16} />
              </div>
              <div className="flex items-center gap-3">
                {t.foto ? (
                  <img src={getMediaUrl(t.foto)} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-[var(--l-on-primary)]"
                    style={{ background: 'var(--l-primary)' }}
                    aria-hidden="true"
                  >
                    {t.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-bold text-[var(--l-text)]">{t.nombre}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {total > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {testimonios.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndice(i)}
              aria-label={`Ir a la opinión ${i + 1}`}
              aria-current={i === indice}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === indice ? '1.5rem' : '0.5rem',
                background: i === indice ? 'var(--l-primary)' : 'var(--l-card-border)',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
