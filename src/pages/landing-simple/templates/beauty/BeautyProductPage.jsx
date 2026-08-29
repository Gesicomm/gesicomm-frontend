import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, ShieldCheck, Truck, LockKeyhole, RotateCcw, Sparkles, Droplets, Sun, Heart, Leaf } from 'lucide-react';
import { hexToRgba, resolverTemaPorSlug } from '../themeUtils';
import { getMediaUrl } from '../../../../services/api';
import './beautyProductPage.css';
import StoreFooterLegal from '../../../landing/StoreFooterLegal';

function Bottle({ small = false }) {
  return (
    <div className={`beauty-bottle ${small ? 'beauty-small' : ''}`}>
      <div className="beauty-dropper" />
      <div className="beauty-bottle-body">
        <b>GLOW</b><span>RENEW</span><small>SERUM</small>
      </div>
    </div>
  );
}

function Title({ n, children }) {
  return (
    <div className="beauty-section-title">
      <span>{n}</span><h2>{children}</h2>
    </div>
  );
}

export default function BeautyProductPage({
  item,
  ficha,
  tema,
  templateSlug,
  contacto,
  nombreComercio,
  isMobile = false,
  previewMode = false,
  onComprar = () => {},
  onVolver = () => {},
  onClickRelacionado = () => {},
}) {
  const [offer, setOffer] = useState(1);
  const [openFaq, setOpenFaq] = useState(null);
  const [sub, setSub] = useState(true);
  const [added, setAdded] = useState(false);

  const buy = () => {
    document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    // Execute real action if needed or handled by clicking on offer
  };

  const t = resolverTemaPorSlug(tema, templateSlug);
  const acento = t.acento || '#e94b70';

  const {
    barra_superior: sBarra, hero: sHero, prueba_social: sPrueba,
    precio: sPrecio, beneficios: sBeneficios, ingredientes: sIngredientes,
    resultados: sResultados, como_funciona: sComoFunciona, garantias: sGarantias,
    faq: sFaq, upsells: sUpsells, cta_final: sCtaFinal
  } = ficha;

  const galeria = item?.imagenes || [];
  const mainImage = galeria[0] ? getMediaUrl(galeria[0]) : null;

  const handleComprarOferta = (paqueteId) => {
    onComprar();
  };

  return (
    <main className="beauty-product-page" style={{ '--tpp-accent': acento }}>
      {sBarra?.activo && (
        <div className="beauty-topbar" style={{ backgroundColor: '#171216' }}>
          {sBarra.items?.map((it, i) => (
            <span key={i}>
              {it.icono === 'truck' && <Truck />}
              {it.icono === 'shield-check' && <ShieldCheck />}
              {it.icono === 'lock-keyhole' && <LockKeyhole />}
              {it.texto}
            </span>
          ))}
          <button onClick={buy}>{sBarra.cta_texto}</button>
        </div>
      )}

      {sHero?.activo && (
        <section className="beauty-hero beauty-wrap">
          <div className="beauty-hero-visual">
            {sHero.etiqueta && <span className="beauty-badge" style={{ backgroundColor: acento }}>{sHero.etiqueta}</span>}
            {mainImage ? (
              <img src={mainImage} alt={item.nombre} className="absolute inset-0 w-full h-full object-cover z-0 opacity-70" />
            ) : (
              <Bottle />
            )}
          </div>
          <div className="beauty-hero-copy">
            {sHero.eyebrow && <p className="beauty-eyebrow" style={{ color: acento }}>{sHero.eyebrow}</p>}
            <h1 dangerouslySetInnerHTML={{ __html: sHero.titulo || item?.nombre }} />
            <p className="beauty-lead">{sHero.lead || item?.descripcion}</p>
            <ul>
              {sHero.caracteristicas?.map((c, i) => (
                <li key={i}><Check style={{ color: acento }} /> {c}</li>
              ))}
            </ul>
            {sPrueba?.activo && (
              <div className="beauty-rating">
                <b>★★★★★</b> {sHero.calificacion_texto}
              </div>
            )}
            <button className="beauty-pink-btn" style={{ backgroundColor: acento }} onClick={buy}>
              {sHero.cta_texto}
            </button>
          </div>
        </section>
      )}

      {sPrueba?.activo && (
        <section className="beauty-social beauty-wrap">
          <b>EXCELENTE</b><span>★★★★★</span><b>{sPrueba.calificacion}/5</b>
          <span>{sPrueba.resenas_texto}</span><span>{sPrueba.clientes_texto}</span>
        </section>
      )}

      {sPrecio?.activo && (
        <section className="beauty-offers beauty-wrap" id="offers">
          <Title n={4}>{sPrecio.titulo}</Title>
          <div className="beauty-offer-grid">
            {(item.ofertas?.length > 0 ? item.ofertas : [{ nombre: '1 FRASCO', precio: item.precio, id: 1 }]).map((p, i) => (
              <button key={p.id || i} className={`beauty-offer ${offer === i ? 'selected' : ''}`} onClick={() => setOffer(i)} style={offer === i ? { borderColor: acento } : {}}>
                <span style={{ color: acento }}>{i === 1 ? 'MÁS VENDIDO' : (i === 2 ? 'MEJOR VALOR' : ' ')}</span>
                <b>{p.nombre}</b>
                <small>{p.unidades ? `${p.unidades} unidades` : '30 ml'}</small>
                {p.imagen || mainImage ? (
                  <img src={p.imagen ? getMediaUrl(p.imagen) : mainImage} alt={p.nombre} className="h-[100px] object-contain my-2" />
                ) : (
                  <Bottle small />
                )}
                <strong>Gs {Number(p.precio_efectivo || p.precio).toLocaleString('es-PY')}</strong>
                {p.precio_ancla && <del>Gs {Number(p.precio_ancla).toLocaleString('es-PY')}</del>}
                {i > 0 && <small>AHORRAS</small>}
                <em style={{ backgroundColor: acento }} onClick={(e) => { e.stopPropagation(); handleComprarOferta(p.id); }}>AGREGAR AL CARRITO</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {sBeneficios?.activo && sBeneficios.items?.length > 0 && (
        <section className="beauty-benefits">
          <div className="beauty-wrap">
            <Title n={5}>{sBeneficios.titulo}</Title>
            <div className="beauty-benefit-grid">
              {sBeneficios.items.map((b, i) => (
                <article key={i}>
                  {b.icono === 'sparkles' && <Sparkles style={{ color: acento }} />}
                  {b.icono === 'droplets' && <Droplets style={{ color: acento }} />}
                  {b.icono === 'sun' && <Sun style={{ color: acento }} />}
                  {b.icono === 'heart' && <Heart style={{ color: acento }} />}
                  <b>{b.titulo}</b>
                  <p>{b.descripcion}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {sIngredientes?.activo && item?.ficha_datos?.beauty_ingredientes?.length > 0 && (
        <section className="beauty-ingredients beauty-wrap">
          <Title n={6}>{sIngredientes.titulo}</Title>
          <div className="beauty-ingredient-grid">
            {item.ficha_datos.beauty_ingredientes.map((ing, i) => (
              <article key={i}>
                <span style={{ color: acento }}>{ing.icono || '💧'}</span>
                <b>{ing.nombre}</b>
                <p>{ing.descripcion}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {sResultados?.activo && item?.ficha_datos?.beauty_resultados?.length > 0 && (
        <section className="beauty-results beauty-wrap">
          <Title n={7}>{sResultados.titulo}</Title>
          <div className="beauty-result-grid">
            {item.ficha_datos.beauty_resultados.map((res, i) => (
              <article key={i}>
                <div className="beauty-before">ANTES</div>
                <div className="beauty-after">DESPUÉS</div>
                <b>{res.nombre}</b>
                <p>"{res.testimonio}"</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {sComoFunciona?.activo && item?.ficha_datos?.beauty_pasos?.length > 0 && (
        <section className="beauty-how beauty-wrap">
          <Title n={8}>{sComoFunciona.titulo}</Title>
          <div className="beauty-steps">
            {item.ficha_datos.beauty_pasos.map((paso, i) => (
              <article key={i}>
                <span style={{ borderColor: acento, color: acento }}>{paso.paso}</span>
                <b>{paso.titulo}</b>
                <p>{paso.descripcion}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {sGarantias?.activo && sGarantias.items?.length > 0 && (
        <section className="beauty-trust">
          <div className="beauty-wrap beauty-trust-grid">
            {sGarantias.items.map((g, i) => (
              <div key={i}>
                <span style={{ color: acento }}>{g.icono}</span>
                <b>{g.titulo}</b>
                <small>{g.descripcion}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {sFaq?.activo && item?.faq?.length > 0 && (
        <section className="beauty-faq beauty-wrap">
          <Title n={10}>{sFaq.titulo}</Title>
          <div className="beauty-faq-grid">
            {item.faq.map((f, i) => (
              <div className="beauty-faq-item" key={i}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  {f.pregunta} <ChevronDown />
                </button>
                {openFaq === i && <p>{f.respuesta}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {sUpsells?.activo && item?.relacionados?.length > 0 && (
        <section className="beauty-upsells beauty-wrap">
          <Title n={11}>{sUpsells.titulo}</Title>
          <div className="beauty-upsell-grid">
            {item.relacionados.map((rel, i) => (
              <article key={i}>
                <div className="beauty-mini-product">
                  {rel.imagen ? <img src={getMediaUrl(rel.imagen)} alt={rel.nombre} className="h-full" /> : <Bottle small />}
                </div>
                <b>{rel.nombre}</b>
                <p>Gs {Number(rel.precio_efectivo || rel.precio || rel.precio_base).toLocaleString('es-PY')}</p>
                <button onClick={() => onClickRelacionado(rel)} style={{ color: acento, borderColor: acento }}>VER PRODUCTO</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {sCtaFinal?.activo && (
        <section className="beauty-final" style={{ backgroundColor: acento }}>
          <div className="beauty-wrap beauty-final-inner">
            <div>
              <small>{sCtaFinal.etiqueta}</small>
              <strong>{String(sCtaFinal.contador.horas).padStart(2, '0')} : {String(sCtaFinal.contador.minutos).padStart(2, '0')} : {String(sCtaFinal.contador.segundos).padStart(2, '0')}</strong>
              <span>HORAS　 MINUTOS　 SEGUNDOS</span>
            </div>
            <p>{sCtaFinal.texto}<br/><small>{sCtaFinal.subtexto}</small></p>
            <button onClick={buy} style={{ color: acento }}>
              {added ? 'AÑADIDO AL CARRITO ✓' : sCtaFinal.cta_texto}
              <small>{sCtaFinal.cta_nota}</small>
            </button>
          </div>
        </section>
      )}

      <footer className="beauty-footer">
        {nombreComercio} <small>Fórmula avanzada para una piel que brilla.</small>
      </footer>
      
      {!previewMode && (
        <StoreFooterLegal tema={t} bordeSuave={hexToRgba(t.texto, 0.1)} nombreComercio={nombreComercio} isPreview={false} />
      )}
    </main>
  );
}
