import React from 'react';
import { ImageOff } from 'lucide-react';
import { useRenderContext } from '../../core/RenderContext';
import { getMediaUrl } from '../../../services/api';
import { formatPrecio } from '../../../lib/mensajeWhatsapp';
import { ImagenProductoHover } from '../../../pages/landing-simple/templates/sections';

function precioDe(item) {
  return item?.precio ?? item?.precio_efectivo ?? item?.precio_base ?? null;
}

function precioAntesDe(item) {
  return item?.precio_ancla ?? item?.precio_tachado ?? item?.precio_antes ?? null;
}

export default function ProductRecommendationsBlock({ content }) {
  const { data, page, actions, env } = useRenderContext();
  const relacionados = data.relacionados?.items || [];
  const titulo = content?.titulo || data.relacionados?.titulo || 'También te puede interesar';
  const subtitulo = content?.subtitulo || '';
  const cta = content?.cta_texto || 'Ver producto';
  const esPreview = env?.mode !== 'public';

  if (!relacionados.length && !esPreview) return null;

  function abrir(item) {
    const slug = item?.slug || item?.content_id || item?.id;
    if (!slug || !actions.navigate) return;
    actions.navigate(page.slug ? `/l/${page.slug}/${slug}` : `/${slug}`);
  }

  return (
    <section className="lp-product-relacionados" id="lp-recomendados">
      <div className="mb-7 text-center">
        <h2 className="lp-product-relacionados-titulo">{titulo}</h2>
        {subtitulo && (
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[var(--l-text-muted)]">
            {subtitulo}
          </p>
        )}
      </div>

      {relacionados.length === 0 ? (
        <div
          className="mx-auto max-w-2xl rounded-[var(--l-radius)] border p-8 text-center"
          style={{ background: 'var(--l-card-bg)', borderColor: 'var(--l-card-border)' }}
        >
          <p className="text-sm text-[var(--l-text)] opacity-60">
            Elegí productos relacionados para que aparezcan acá.
          </p>
        </div>
      ) : (
        <div className="lp-product-relacionados-grid">
          {relacionados.map(r => {
            const precio = precioDe(r);
            const antes = precioAntesDe(r);
            const enOferta = antes != null && precio != null && Number(antes) > Number(precio);
            return (
              <article
                key={r.slug || r.id}
                className="lp-product-relacionados-card"
                onClick={() => abrir(r)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    abrir(r);
                  }
                }}
              >
                <div className="lp-product-relacionados-img">
                  <ImagenProductoHover
                    imagenes={(r.imagenes || []).map(getMediaUrl)}
                    imagen={r.imagen ? getMediaUrl(r.imagen) : null}
                    alt={r.nombre}
                    imgClassName="transition-opacity duration-500 ease-out"
                    fallback={<ImageOff size={20} />}
                  />
                </div>
                <p className="lp-product-relacionados-nombre">{r.nombre}</p>
                <div className="lp-product-relacionados-precio">
                  {precio != null && <span>{formatPrecio(precio)}</span>}
                  {enOferta && <span className="tachado">{formatPrecio(antes)}</span>}
                </div>
                <button type="button" className="lp-product-relacionados-cta">
                  {cta}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
