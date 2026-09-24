import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, ImageOff, Star } from 'lucide-react';
import { getMediaUrl } from '../../../../services/api';
import { formatPrecio } from '../../../../lib/mensajeWhatsapp';
import { getIconoBeneficio } from '../iconosBeneficios';
import { hexToRgba, componer, contraste, resolverTemaPorSlug } from '../themeUtils';
import { RedesSocialesFooter } from '../sections';
import StoreFooterLegal from '../../../landing/StoreFooterLegal';
import RichText from '../../../../components/RichText';
import BarraMarquee from '../BarraMarquee';
import { MediaProducto, MiniaturaMediaProducto, normalizarGaleriaProducto, claveMedioProducto } from '../mediaGaleria';
import './comboProductPage.css';

/**
 * Ficha de detalle de un Combo.
 *
 * ── Un solo renderer ───────────────────────────────────────────────────
 * Lo montan los dos lados: el preview del armador y la landing publicada
 * (ver ComboProductPagePublica.jsx) — mismo criterio que las otras fichas
 * (ver BasicoProductPage.jsx). Se usa SIEMPRE que el ítem abierto es un
 * combo, sin importar qué template rígido (Fitness/Beauty/Tech/Básico) use
 * el resto de la landing: un combo no tiene rubro, tiene su propio diseño.
 *
 * `previewMode` solo muestra ayudas del editor. La landing publicada
 * conserva el mismo contenido sin esas guías.
 */
export default function ComboProductPage({
  item,
  ficha,
  tema,
  templateSlug = 'basico',
  contacto = null,
  nombreComercio = null,
  isMobile = false,
  previewMode = false,
  // Acción PRINCIPAL del botón: agrega al carrito y abre el carrito, donde
  // el cliente elige el medio de pago (PagoPar o contra entrega) — mismo
  // recorrido que un producto individual (ver BasicoProductPage.jsx). Un
  // combo no compra distinto de un producto: no tiene sentido abrir un
  // checkout aparte.
  onAgregar = null,
  // Solo se usa si no hay carrito (por ejemplo, un contexto sin
  // `onAgregar` todavía cableado) — no es el camino real de compra.
  onComprar = null,
  onVolver = null,
}) {
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [preguntaAbierta, setPreguntaAbierta] = useState(null);

  const t = resolverTemaPorSlug(tema, templateSlug);
  const vars = useMemo(() => calcularVariables(t), [t.fondo, t.texto, t.acento]);

  useEffect(() => { setIndiceImagen(0); }, [item?.nombre]);

  if (!item) return null;

  const productos = item.productosIncluidos || [];
  const beneficios = (ficha.beneficio_principal.items || []).filter(b => b?.titulo?.trim() || b?.texto?.trim());
  const testimonios = (ficha.prueba_social.testimonios || []).filter(t2 => t2?.comentario?.trim());
  const confianzaItems = (ficha.confianza.items || []).filter(c => c?.titulo?.trim());

  const comprar = () => {
    const datos = { variante: null, pack: null, precio: item.precio };
    if (onAgregar) onAgregar(datos);
    else if (onComprar) onComprar(datos);
  };
  const irAComprar = () => {
    const destino = document.getElementById('cmb-hero');
    if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else comprar();
  };

  const galeria = normalizarGaleriaProducto(item.imagenes);
  const imagenActual = galeria[indiceImagen] || galeria[0] || null;
  const tituloTexto = (ficha.hero.titulo || item.nombre || '').trim();
  const largoTitulo = tituloTexto.length + (ficha.hero.titulo_destacado || '').length;
  const claseTitulo = largoTitulo > 60 ? 'es-muy-largo' : largoTitulo > 32 ? 'es-largo' : '';
  const leadTexto = ficha.hero.lead || item.descripcion;

  // Valor del combo: suma de precios individuales de referencia de cada
  // producto (a lo que costaría comprarlos sueltos) vs. lo que sale el
  // combo. Se arma sola con lo que ya trae el combo — no se inventa nada.
  const totalIndividual = productos.reduce((sum, p) => sum + (Number(p.precio) || 0) * (p.cantidad || 1), 0);
  const ahorroValor = totalIndividual > (item.precio || 0) ? totalIndividual - (item.precio || 0) : null;

  return (
    <div className={`cmb-root ${isMobile ? 'es-movil' : ''}`} style={vars}>
      {/* Barra superior de urgencia (envío, garantía, pago) ─────────── */}
      {ficha.barra_superior.activo && ficha.barra_superior.items.length > 0 && (
        <BarraMarquee
          className="cmb-barra"
          items={ficha.barra_superior.items}
          animado={ficha.barra_superior.animado !== false}
          velocidad={ficha.barra_superior.velocidad}
          separador={ficha.barra_superior.separador}
          renderItem={(a, i) => {
            const Icono = getIconoBeneficio(a.icono);
            return <span className="cmb-barra-item" key={i}><Icono size={14} /> {a.texto}</span>;
          }}
          cta={ficha.barra_superior.cta_texto ? (
            <button type="button" className="cmb-barra-cta" onClick={irAComprar}>
              {ficha.barra_superior.cta_texto}
            </button>
          ) : null}
        />
      )}

      {/* Migas de pan ────────────────────────────────────────────────── */}
      {onVolver && (
        <div className="cmb-wrap">
          <button type="button" className="cmb-breadcrumbs" onClick={onVolver}>
            Volver al catálogo <span>/</span> <b>{item.nombre}</b>
          </button>
        </div>
      )}

      {/* Hero: oferta + combo principal ──────────────────────────────── */}
      {ficha.hero.activo && (
        <>
          {(ficha.hero.etiqueta_oferta || ficha.hero.contador.activo) && (
            <div className="cmb-wrap">
              <div className="cmb-offer-timer">
                {ficha.hero.etiqueta_oferta && <span className="cmb-hero-etiqueta">{ficha.hero.etiqueta_oferta}</span>}
                {ficha.hero.contador.activo && <Contador desde={ficha.hero.contador} />}
              </div>
            </div>
          )}

          <section className="cmb-hero cmb-wrap" id="cmb-hero">
            <div className="cmb-hero-visual">
              <div className={`cmb-hero-foto ${!imagenActual ? 'sin-imagen' : ''}`}>
                {ficha.hero.etiqueta && <span className="cmb-hero-badge">{ficha.hero.etiqueta}</span>}
                {imagenActual
                  ? <div className="lsp-media-frame"><MediaProducto medio={imagenActual} alt={item.nombre} /></div>
                  : (
                    <div className="cmb-hero-foto-vacio">
                      <ImageOff size={32} />
                      {previewMode && <span>Sin imagen — subila en "Imágenes del combo"</span>}
                    </div>
                  )}
              </div>
              {galeria.length > 1 && (
                <div className="cmb-miniaturas">
                  {galeria.slice(0, 6).map((medio, i) => (
                    <button
                      type="button"
                      key={claveMedioProducto(medio, i)}
                      aria-label={`Medio ${i + 1} de ${galeria.length}`}
                      className={`cmb-miniatura ${i === indiceImagen ? 'activa' : ''}`}
                      onClick={() => setIndiceImagen(i)}
                    >
                      <MiniaturaMediaProducto medio={medio} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={`cmb-hero-copy ${claseTitulo}`}>
              {(ficha.hero.eyebrow || item.categoria) && (
                <p className="cmb-eyebrow">{ficha.hero.eyebrow || nombreCategoria(item.categoria)}</p>
              )}
              <h1>
                {ficha.hero.titulo || item.nombre}
                {ficha.hero.titulo_destacado && <> <span className="cmb-hero-destacado">{ficha.hero.titulo_destacado}</span></>}
              </h1>

              {ficha.hero.rating_activo && (
                <div className="cmb-rating">
                  <Estrellas valor={ficha.hero.rating_valor} tamano={16} />
                  <b>{Number(ficha.hero.rating_valor).toFixed(1)}/5</b>
                </div>
              )}

              {leadTexto && <RichText text={leadTexto} className="cmb-lead" />}

              {Array.isArray(ficha.hero.caracteristicas) && ficha.hero.caracteristicas.length > 0 && (
                <ul className="cmb-hero-checklist">
                  {ficha.hero.caracteristicas.map((linea, i) => (
                    <li key={i}><span className="cmb-check"><Check size={12} strokeWidth={3} /></span> {linea}</li>
                  ))}
                </ul>
              )}

              <div className="cmb-precio-row">
                {item.precioAntes != null && <del className="cmb-precio-antes">{formatPrecio(item.precioAntes)}</del>}
                <strong className="cmb-precio-valor">{formatPrecio(item.precio)}</strong>
              </div>
              {item.ahorroAbsoluto > 0 && (
                <p className="cmb-saving">Ahorrás {formatPrecio(item.ahorroAbsoluto)}</p>
              )}

              {(ficha.hero.nota_stock || ficha.hero.nota_envio) && (
                <p className="cmb-availability">
                  <span />
                  {[ficha.hero.nota_stock, ficha.hero.nota_envio].filter(Boolean).join(' · ')}
                </p>
              )}

              <div className="cmb-hero-accion">
                <button type="button" className="cmb-cta" onClick={comprar}>
                  {ficha.hero.cta_texto || 'Comprar combo'} <ArrowRight size={16} />
                </button>

                {ficha.hero.nota_garantia && (
                  <p className="cmb-hero-garantia"><Check size={13} strokeWidth={3} /> {ficha.hero.nota_garantia}</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ¿Qué incluye? ─────────────────────────────────────────────── */}
      {ficha.incluye.activo && (productos.length > 0 || previewMode) && (
        <section className="cmb-seccion cmb-seccion--fondo">
          <div className="cmb-wrap">
            <SeccionTitulo eyebrow="Todo lo que recibís" texto={ficha.incluye.titulo} sub={ficha.incluye.subtitulo} numero={3} mostrarNumero={previewMode} />
            {productos.length === 0 ? (
              <p className="cmb-vacio">Agregá productos al combo para que esta sección se arme sola.</p>
            ) : (
              <div className="cmb-products-grid">
                {productos.map(p => (
                  <article className="cmb-product-card" key={p.id}>
                    <div className="cmb-product-card-image">
                      {p.imagen ? <img src={getMediaUrl(p.imagen)} alt={p.nombre} loading="lazy" /> : <ImageOff size={26} />}
                      <span>×{p.cantidad || 1}</span>
                    </div>
                    <div className="cmb-product-card-copy">
                      <h3>{p.nombre}</h3>
                      {textoBeneficio(p.beneficios?.[0]) && <p>{textoBeneficio(p.beneficios[0])}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* El valor del combo ────────────────────────────────────────── */}
      {ficha.valor.activo && productos.length > 0 && (
        <section className="cmb-seccion cmb-wrap">
          <SeccionTitulo eyebrow="Más valor en un solo combo" texto="El valor del combo" numero={4} mostrarNumero={previewMode} />
          <div className="cmb-value-grid">
            <div className="cmb-price-breakdown">
              <div className="cmb-breakdown-head">
                <span>{ficha.valor.titulo}</span>
                <span>Valor</span>
              </div>
              {productos.map(p => (
                <div className="cmb-breakdown-row" key={p.id}>
                  <span>{p.nombre}{p.cantidad > 1 ? ` ×${p.cantidad}` : ''}</span>
                  <strong>{p.precio != null ? formatPrecio(p.precio * (p.cantidad || 1)) : '—'}</strong>
                </div>
              ))}
              <div className="cmb-breakdown-total">
                <span>Valor por separado</span>
                <strong>{formatPrecio(totalIndividual)}</strong>
              </div>
            </div>
            <div className="cmb-combo-price">
              <p>{ficha.valor.titulo_combo}</p>
              <strong>{formatPrecio(item.precio)}</strong>
              {ahorroValor != null && <span>Ahorrás {formatPrecio(ahorroValor)}</span>}
              {ficha.valor.nota_ahorro && <small>{ficha.valor.nota_ahorro}</small>}
            </div>
          </div>
          <button type="button" className="cmb-cta cmb-value-button" onClick={comprar}>
            {ficha.hero.cta_texto || 'Comprar combo'} <ArrowRight size={16} />
          </button>
        </section>
      )}

      {/* ¿Por qué este combo? ──────────────────────────────────────── */}
      {ficha.beneficio_principal.activo && (beneficios.length > 0 || ficha.beneficio_principal.texto || previewMode) && (
        <section className="cmb-seccion cmb-seccion--fondo">
          <div className="cmb-wrap">
          <SeccionTitulo eyebrow="Elegidos para complementarse" texto={ficha.beneficio_principal.titulo} sub={ficha.beneficio_principal.texto} numero={5} mostrarNumero={previewMode} />
          {beneficios.length === 0 ? (
            <p className="cmb-vacio">Se cargan en <b>Vista del combo</b>, como beneficios.</p>
          ) : (
            <div className="cmb-why-grid">
              {beneficios.map((b, i) => {
                const Icono = getIconoBeneficio(b.icono);
                return (
                  <div className="cmb-why-item" key={i}>
                    <Icono size={22} />
                    <h3>{b.titulo}</h3>
                    {b.texto && <p>{b.texto}</p>}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </section>
      )}

      {/* Conocé lo que recibís ─────────────────────────────────────── */}
      {ficha.detalle_productos.activo && productos.length > 0 && (
        <section className="cmb-seccion cmb-wrap">
          <SeccionTitulo eyebrow="Detalles de tu compra" texto={ficha.detalle_productos.titulo} numero={6} mostrarNumero={previewMode} />
          <div className="cmb-receive-list">
            {productos.map(p => (
              <div className="cmb-receive-row" key={p.id}>
                <div className="cmb-receive-foto">
                  {p.imagen ? <img src={getMediaUrl(p.imagen)} alt={p.nombre} loading="lazy" /> : <ImageOff size={22} />}
                </div>
                <div className="cmb-receive-copy">
                  <strong>{p.nombre}</strong>
                  {p.beneficios && p.beneficios.length > 0 ? (
                    <ul className="cmb-checklist">
                      {p.beneficios.map((beneficio, i) => (
                        textoBeneficio(beneficio) && (
                          <li key={i}><span className="cmb-check"><Check size={11} strokeWidth={3} /></span> {textoBeneficio(beneficio)}</li>
                        )
                      ))}
                    </ul>
                  ) : previewMode ? (
                    <p className="cmb-vacio-inline">Sin checks: se cargan en la Vista del producto de "{p.nombre}".</p>
                  ) : null}
                </div>
                <span className="cmb-receive-cant">×{p.cantidad || 1}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Opiniones reales ──────────────────────────────────────────── */}
      {ficha.prueba_social.activo && (
        <section className="cmb-seccion cmb-seccion--fondo">
          <div className="cmb-wrap">
            <SeccionTitulo eyebrow="Experiencias reales" texto={ficha.prueba_social.titulo} numero={7} mostrarNumero={previewMode} />
            <div className="cmb-rating cmb-rating--centrado">
              <Estrellas valor={ficha.prueba_social.calificacion} tamano={18} />
              <b>{Number(ficha.prueba_social.calificacion).toFixed(1)}/5</b>
            </div>
            {testimonios.length === 0 ? (
              previewMode && <p className="cmb-vacio">Sin testimonios cargados.</p>
            ) : (
              <div className="cmb-reviews-grid">
                {testimonios.map((t2, i) => (
                  <article className="cmb-review" key={i}>
                    <Estrellas valor={t2.calificacion ?? 5} tamano={14} />
                    <p>"{t2.comentario}"</p>
                    {t2.nombre && <strong>{t2.nombre}</strong>}
                    <small>Compra verificada</small>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Comprá con confianza ──────────────────────────────────────── */}
      {ficha.confianza.activo && confianzaItems.length > 0 && (
        <section className="cmb-seccion cmb-wrap">
          <SeccionTitulo eyebrow="Comprá tranquilo" texto={ficha.confianza.titulo} numero={8} mostrarNumero={previewMode} />
          <div className="cmb-trust-grid">
            {confianzaItems.map((c, i) => {
              const Icono = getIconoBeneficio(c.icono);
              return (
                <div className="cmb-trust-item" key={i}>
                  <Icono size={24} />
                  <h3>{c.titulo}</h3>
                  {c.texto && <p>{c.texto}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Preguntas frecuentes ──────────────────────────────────────── */}
      {ficha.faq.activo && (item.faq.length > 0 || previewMode) && (
        <section className="cmb-seccion cmb-seccion--fondo">
          <div className="cmb-wrap">
            <SeccionTitulo eyebrow="Resolvemos tus dudas" texto={item.faqTitulo || ficha.faq.titulo} numero={9} mostrarNumero={previewMode} />
            {item.faq.length === 0 ? (
              <p className="cmb-vacio">Las preguntas se cargan en <b>Vista del combo</b>.</p>
            ) : (
              <div className="cmb-faq-list">
                {item.faq.map((f, i) => (
                  <div className={`cmb-faq-item ${preguntaAbierta === i ? 'abierta' : ''}`} key={i}>
                    <button type="button" onClick={() => setPreguntaAbierta(preguntaAbierta === i ? null : i)} aria-expanded={preguntaAbierta === i}>
                      <span>{f.pregunta}</span>
                      <ChevronDown size={16} />
                    </button>
                    {preguntaAbierta === i && (
                      <div className="cmb-faq-answer">
                        <RichText text={f.respuesta} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Cierre de venta ───────────────────────────────────────────── */}
      {ficha.cta_final.activo && (
        <section className="cmb-final-cta">
          <div className="cmb-wrap cmb-final-cta-inner">
            <div className="cmb-cierre-bloque-timer">
              {ficha.cta_final.etiqueta && <p className="cmb-cierre-etiqueta">{ficha.cta_final.etiqueta}</p>}
              {ficha.cta_final.contador.activo && <Contador desde={ficha.cta_final.contador} />}
            </div>
            <div className="cmb-cierre-bloque-info">
              <h2>{ficha.cta_final.titulo || item.nombre}</h2>
              <div className="cmb-final-price">
                {item.precioAntes != null && <span>{formatPrecio(item.precioAntes)}</span>}
                {formatPrecio(item.precio)}
              </div>
              <p>
                {[
                  item.ahorroAbsoluto > 0 ? `Ahorrás ${formatPrecio(item.ahorroAbsoluto)}` : null,
                  ficha.hero.nota_stock,
                  ficha.hero.nota_envio,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="cmb-cierre-bloque-accion">
              <button type="button" className="cmb-cta" onClick={comprar}>
                {ficha.cta_final.cta_texto || 'Comprar ahora'} <ArrowRight size={16} />
              </button>
              {ficha.hero.nota_garantia && (
                <small className="cmb-cierre-garantia">{ficha.hero.nota_garantia}</small>
              )}
            </div>
          </div>
        </section>
      )}

      {/* El footer de siempre ──────────────────────────────────────── */}
      {contacto && <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={vars['--cmb-border']} isMobile={isMobile} />}
      <StoreFooterLegal tema={t} bordeSuave={vars['--cmb-border']} nombreComercio={nombreComercio} isPreview={previewMode} />

      {/* Barra fija en móvil: el CTA queda arriba del pliegue. */}
      <div className="cmb-barra-movil">
        <div className="cmb-barra-movil-precio">
          <b>{item.precio != null ? formatPrecio(item.precio) : ''}</b>
        </div>
        <button type="button" className="cmb-cta" onClick={comprar}>
          Comprar ahora
        </button>
      </div>
    </div>
  );
}

/* ── Piezas internas ──────────────────────────────────────────────── */

function nombreCategoria(categoria) {
  if (!categoria) return '';
  return typeof categoria === 'string' ? categoria : (categoria.nombre || '');
}

function textoBeneficio(beneficio) {
  if (!beneficio) return '';
  if (typeof beneficio === 'string') return beneficio.trim();
  if (typeof beneficio !== 'object') return String(beneficio).trim();
  return String(beneficio.titulo || beneficio.texto || '').trim();
}

/** Patrón de título de sección: eyebrow + h2 + bajada opcional, siempre centrado. */
function SeccionTitulo({ eyebrow, texto, sub, numero, mostrarNumero = false }) {
  if (!texto) return null;
  return (
    <div className="cmb-seccion-titulo">
      {mostrarNumero && <span className="cmb-seccion-numero">{numero}</span>}
      {eyebrow && <p className="cmb-eyebrow">{eyebrow}</p>}
      <h2>{texto}</h2>
      {sub && <p className="cmb-seccion-sub">{sub}</p>}
    </div>
  );
}

function Estrellas({ valor = 5, tamano = 14 }) {
  const llenas = Math.round(Number(valor) || 0);
  return (
    <span className="cmb-estrellas" aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={tamano} fill={n <= llenas ? 'currentColor' : 'none'} strokeWidth={1.6} />
      ))}
    </span>
  );
}

const dosDigitos = (n) => String(Math.max(0, n)).padStart(2, '0');

/**
 * Contador decorativo, igual criterio que en las otras fichas (ver
 * BasicoProductPage.jsx): arranca en el tiempo configurado cada vez que se
 * abre la página. No hay fecha límite real detrás — la oferta "por tiempo
 * limitado" es una convención de urgencia, no un plazo que alguien deba
 * mantener.
 */
function Contador({ desde }) {
  const total = useMemo(() => Math.max(0,
    (Number(desde.horas) || 0) * 3600 + (Number(desde.minutos) || 0) * 60 + (Number(desde.segundos) || 0)
  ), [desde.horas, desde.minutos, desde.segundos]);

  const [restante, setRestante] = useState(total);
  useEffect(() => { setRestante(total); }, [total]);
  useEffect(() => {
    if (restante <= 0) return undefined;
    const id = setInterval(() => setRestante(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [restante > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const cajas = [
    ['Horas', Math.floor(restante / 3600)],
    ['Minutos', Math.floor((restante % 3600) / 60)],
    ['Segundos', restante % 60],
  ];

  return (
    <div className="cmb-contador">
      {cajas.map(([label, valor], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span className="cmb-contador-sep">:</span>}
          <span className="cmb-contador-caja">
            <b>{dosDigitos(valor)}</b>
            <small>{label}</small>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Paleta a partir de los tres colores del comercio (fondo/texto/acento),
 * mismo algoritmo que las otras fichas (ver BasicoProductPage.jsx).
 */
function calcularVariables(t) {
  const { fondo, texto, acento } = t;
  const fondoEsOscuro = contraste(fondo, '#FFFFFF') >= 3;
  const fondoPagina = fondoEsOscuro ? fondo : '#FFFFFF';
  // Ver comentario en BasicoProductPage.jsx: elegir el color de MÁS
  // contraste de los dos, no un corte binario, evita textos casi
  // invisibles con acentos de luminancia media.
  const sobre = (color) => (contraste(color, '#FFFFFF') >= contraste(color, '#111111') ? '#FFFFFF' : '#111111');
  const band = fondoEsOscuro ? componer(texto, 0.10, fondo) : componer(texto, 0.93, fondo);

  return {
    '--cmb-bg': fondo,
    '--cmb-fg': texto,
    '--cmb-accent': acento,
    '--cmb-on-accent': sobre(acento),
    '--cmb-accent-suave': hexToRgba(acento, 0.10),
    '--cmb-accent-borde': hexToRgba(acento, 0.35),
    '--cmb-muted': componer(texto, 0.60, fondoPagina),
    '--cmb-border': hexToRgba(texto, 0.14),
    '--cmb-border-fuerte': hexToRgba(texto, 0.24),
    '--cmb-surface-suave': hexToRgba(texto, 0.03),
    '--cmb-card': fondoEsOscuro ? componer(texto, 0.06, fondoPagina) : '#FFFFFF',
    '--cmb-sombra': hexToRgba(texto, 0.1),
    '--cmb-band': band,
    '--cmb-on-band': sobre(band),
    '--cmb-estrella': '#F0A82A',
    '--cmb-ahorro-bg': hexToRgba('#16A34A', 0.12),
    '--cmb-ahorro-fg': fondoEsOscuro ? '#4ADE80' : '#15803D',
  };
}
