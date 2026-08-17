import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Package } from 'lucide-react';
import { getMediaUrl } from '../../services/api';

/**
 * Tarjetas de categoría clickeables. Sin tocar el modelo Categoria (es
 * global, compartido por todo el catálogo del comercio, no solo esta
 * landing): la imagen de cada tile es la primera foto disponible entre los
 * items curados de ESTA landing que pertenecen a esa categoría — se deriva
 * en LandingPublica.jsx con un useMemo, no es un campo propio. Sin foto
 * disponible cae a un ícono, igual que las tarjetas de producto sin imagen.
 */
export default function LandingCategoryStrip({ seccion, categorias, categoriaImagen, onSeleccionar }) {
  const { template = 'horizontal_scroll', contenido = {} } = seccion || {};
  const titulo = contenido.titulo || '{titulo}';
  const reducirMovimiento = useReducedMotion();

  return (
    <section id="lp-categorias" className="lp-shell" style={{ paddingBlock: '3rem' }}>
      <h2
        className="mb-6 text-2xl font-extrabold text-[var(--l-text)]"
        style={{ letterSpacing: '-0.02em' }}
      >
        {titulo}
      </h2>
      <div className={template === 'grid' ? "lp-grid" : "lp-carousel-container"}>
        {categorias.map((cat, i) => {
          const imagen = categoriaImagen.get(cat);
          return (
            <motion.button
              key={cat}
              type="button"
              onClick={() => onSeleccionar(cat)}
              initial={{ opacity: 0, y: reducirMovimiento ? 0 : 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={reducirMovimiento ? undefined : { y: -4 }}
              className="group relative h-40 w-52 flex-shrink-0 overflow-hidden rounded-[var(--l-radius)] border text-left"
              style={{ borderColor: 'var(--l-card-border)', background: 'var(--l-surface)' }}
            >
              {imagen ? (
                <img
                  src={getMediaUrl(imagen)}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--l-text-muted)' }}>
                  <Package size={30} strokeWidth={1.4} />
                </div>
              )}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%)' }}
              />
              <span className="absolute bottom-3 left-3.5 right-3.5 truncate text-sm font-bold text-white">
                {cat}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
