import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ChevronDown, ImageOff, Lock, Star, Check,
} from 'lucide-react';
import { getMediaUrl } from '../../../../services/api';
import { formatPrecio } from '../../../../lib/mensajeWhatsapp';
import { getIconoBeneficio } from '../iconosBeneficios';
import { hexToRgba, componer, contraste, resolverTemaPorSlug } from '../themeUtils';
import { ahorroDePack, precioUnitarioDePack, inicialesDe } from './fichaFitness';
import { RedesSocialesFooter } from '../sections';
import StoreFooterLegal from '../../../landing/StoreFooterLegal';
import RichText from '../../../../components/RichText';
import './fitnessProductPage.css';

/**
 * Ficha de producto del template "Fitness & Suplementos".
 *
 * ── Por qué este componente es UNO SOLO ────────────────────────────────
 * Antes la ficha se dibujaba con dos componentes distintos: ProductoPreview
 * en el editor y ProductPagePublica en la landing publicada. Tenían el
 * mismo contenido pero markup distinto, así que se fueron desincronizando y
 * lo que el comercio veía en el preview no era lo que se publicaba. Acá hay
 * un solo renderer y los dos lados le pasan la MISMA forma de datos, que
 * arma fichaFitness.armarItemFicha(). Es el mismo criterio que ya usan los
 * templates de la landing (ver templates/index.js): si aparece un tercer
 * lugar donde mostrar la ficha, llama a este componente — no se escribe
 * otro.
 *
 * `previewMode` NO cambia el diseño: solo (a) evita navegar fuera del
 * editor y (b) muestra un cartel en las secciones que el comercio activó
 * pero todavía no cargó, que en la landing publicada simplemente no se
 * dibujan. Cualquier otra diferencia entre preview y publicada es un bug.
 *
 * La estructura es fija (12 secciones, en este orden) y el contenido es
 * todo editable — ver fichaFitness.js para de dónde sale cada sección.
 */
export default function FitnessProductPage({
  item,
  ficha,
  tema,
  templateSlug = 'fitness-suplementos',
  contacto = null,
  nombreComercio = null,
  isMobile = false,
  previewMode = false,
  onComprar = null,
  onVolver = null,
  onClickRelacionado = null,
}) {
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [packElegidoId, setPackElegidoId] = useState(null);
  const [preguntaAbierta, setPreguntaAbierta] = useState(null);
  const [suscripcion, setSuscripcion] = useState(false);

  const t = resolverTemaPorSlug(tema, templateSlug);
  const vars = useMemo(() => calcularVariables(t), [t.fondo, t.texto, t.acento]);

  const packs = item?.packs || [];
  const packElegido = packs.find(p => String(p.id) === String(packElegidoId)) || null;

  // El precio que se muestra arriba y en la barra fija sigue al paquete
  // elegido, igual que en el checkout — si no hay ninguno, el del producto.
  const precioMostrado = packElegido ? precioUnitarioDePack(packElegido) * (Number(packElegido.unidades) || 1) : item?.precio;

  useEffect(() => {
    if (packElegidoId && !packs.some(p => String(p.id) === String(packElegidoId))) setPackElegidoId(null);
  }, [packs, packElegidoId]);

  useEffect(() => { setIndiceImagen(0); }, [item?.nombre]);

  if (!item) return null;

  const irAOfertas = () => {
    const destino = document.getElementById('fpp-ofertas');
    if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else comprar();
  };

  const comprar = () => onComprar && onComprar(packElegido);

  const imagenActual = item.imagenes[indiceImagen] || item.imagenes[0] || null;

  // El diseño supone un título corto y golpeado, pero los nombres reales del
  // catálogo son descriptivos ("AdelFit - Suplemento natural para bajar de
  // peso y controlar el apetito"). A un tamaño fijo, esos ocupan cinco
  // renglones de mayúsculas y aplastan todo lo de al lado. El CSS no puede
  // medir el largo del texto, así que se decide acá y el tamaño lo baja una
  // clase. Los umbrales están en caracteres porque es lo que se puede saber
  // sin medir el render.
  const tituloTexto = `${ficha.hero.titulo || item.nombre} ${ficha.hero.titulo_destacado || ''}`.trim();
  const claseTitulo = tituloTexto.length > 88 ? 'es-muy-largo' : tituloTexto.length > 42 ? 'es-largo' : '';

  return (
    <div className={`fpp-root ${isMobile ? 'es-movil' : ''}`} style={vars}>
      {/* 1 · Barra de anuncio ─────────────────────────────────────── */}
      {ficha.anuncio.activo && ficha.anuncio.items.length > 0 && (
        <div className="fpp-anuncio">
          {ficha.anuncio.items.map((a, i) => {
            const Icono = getIconoBeneficio(a.icono);
            return (
              <span className="fpp-anuncio-item" key={i}>
                <Icono size={14} /> {a.texto}
              </span>
            );
          })}
          {ficha.anuncio.cta_texto && (
            <button type="button" className="fpp-anuncio-cta" onClick={irAOfertas}>
              {ficha.anuncio.cta_texto}
            </button>
          )}
        </div>
      )}

      <div className="fpp-wrap">
        {onVolver && (
          <button type="button" className="fpp-volver" onClick={onVolver}>
            <ArrowLeft size={15} /> Volver al catálogo
          </button>
        )}
      </div>

      {/* 2 · Encabezado ───────────────────────────────────────────── */}
      <section className="fpp-hero fpp-wrap" id="fpp-hero">
        <div className="fpp-hero-galeria">
          <div className={`fpp-hero-imagen ${imagenActual ? '' : 'vacia'}`}>
            {imagenActual
              ? <img src={getMediaUrl(imagenActual)} alt={item.nombre} />
              : <ImageOff size={44} />}
            {item.descuentoPct > 0 && (
              <span className="fpp-hero-badge-descuento">-{item.descuentoPct}%</span>
            )}
          </div>
          {item.imagenes.length > 1 && (
            <div className="fpp-miniaturas">
              {item.imagenes.map((url, i) => (
                <button
                  type="button"
                  key={url + i}
                  className={`fpp-miniatura ${i === indiceImagen ? 'activa' : ''}`}
                  onClick={() => setIndiceImagen(i)}
                >
                  <img src={getMediaUrl(url)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`fpp-hero-copy ${claseTitulo}`}>
          {(ficha.hero.eyebrow || item.categoria) && (
            <p className="fpp-eyebrow">{ficha.hero.eyebrow || item.categoria}</p>
          )}

          <h1>
            {ficha.hero.titulo || item.nombre}
            {ficha.hero.titulo_destacado && <em>{ficha.hero.titulo_destacado}</em>}
          </h1>

          {(ficha.hero.lead || item.descripcion) && (
            <RichText text={ficha.hero.lead || item.descripcion} className="fpp-lead" />
          )}

          {ficha.hero.checklist.length > 0 && (
            <ul className="fpp-checklist">
              {ficha.hero.checklist.map((linea, i) => (
                <li key={i}><Check size={17} /> {linea}</li>
              ))}
            </ul>
          )}

          {precioMostrado != null && (
            <p className="fpp-precio-hero">
              <b>{formatPrecio(precioMostrado)}</b>
              {!packElegido && item.precioAntes != null && <del>{formatPrecio(item.precioAntes)}</del>}
            </p>
          )}

          <button type="button" className="fpp-cta" onClick={packs.length ? irAOfertas : comprar}>
            {ficha.hero.cta_texto || 'Comprar ahora'} <span aria-hidden="true">→</span>
          </button>

          {ficha.hero.microcopy && (
            <p className="fpp-microcopy"><Lock size={13} /> {ficha.hero.microcopy}</p>
          )}
        </div>
      </section>

      {/* 3 · Prueba social rápida ─────────────────────────────────── */}
      {ficha.prueba_social.activo && (
        <div className="fpp-prueba-social">
          <div className="fpp-wrap fpp-prueba-social-inner">
            <div className="fpp-prueba-social-izq">
              {ficha.prueba_social.etiqueta && <b>{ficha.prueba_social.etiqueta}</b>}
              <Estrellas valor={ficha.prueba_social.calificacion} tamano={15} />
              <strong>{Number(ficha.prueba_social.calificacion).toFixed(1)}/5</strong>
              {ficha.prueba_social.resenas_texto && <small>· {ficha.prueba_social.resenas_texto}</small>}
            </div>
            {(ficha.prueba_social.avatares.length > 0 || ficha.prueba_social.clientes_texto) && (
              <div className="fpp-avatares">
                {ficha.prueba_social.avatares.map((a, i) => (
                  <span className="fpp-avatar" key={i}>
                    {a.foto
                      ? <img src={getMediaUrl(a.foto)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : inicialesDe(a.nombre)}
                  </span>
                ))}
                {ficha.prueba_social.clientes_texto && <b>{ficha.prueba_social.clientes_texto}</b>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 · Ofertas y paquetes ───────────────────────────────────── */}
      {ficha.ofertas.activo && (
        <section className="fpp-seccion fpp-wrap" id="fpp-ofertas">
          <TituloSeccion numero={4} texto={ficha.ofertas.titulo} acento={vars['--fpp-accent']} onAccent={vars['--fpp-on-accent']} />

          {packs.length === 0 ? (
            previewMode ? (
              <p className="fpp-vacio">
                Todavía no cargaste paquetes. Se cargan en la pestaña <b>Checkout y Ofertas</b> de este producto
                (“Paquete — más unidades del mismo producto”) y aparecen acá como tarjetas.
              </p>
            ) : null
          ) : (
            <>
              <div className="fpp-packs">
                <TarjetaPack
                  elegido={!packElegido}
                  badge={ficha.ofertas.badge_individual}
                  nombre={ficha.ofertas.etiqueta_individual || 'Individual'}
                  subtitulo="1 unidad"
                  imagen={item.imagenes[0] || null}
                  precioUnitario={item.precio}
                  precioAntes={item.precioAntes}
                  ahorro={null}
                  notaPrecioNormal="Precio normal"
                  nota={ficha.ofertas.nota_pack}
                  onElegir={() => setPackElegidoId(null)}
                />
                {packs.map(pack => {
                  const conf = ficha.ofertas.packs?.[String(pack.id)] || {};
                  const unidades = Number(pack.unidades) || 1;
                  return (
                    <TarjetaPack
                      key={pack.id}
                      elegido={String(packElegidoId) === String(pack.id)}
                      badge={conf.badge}
                      nombre={pack.nombre}
                      subtitulo={conf.subtitulo || `${unidades} unidades`}
                      imagen={pack.imagen || conf.imagen || item.imagenes[0] || null}
                      precioUnitario={precioUnitarioDePack(pack)}
                      precioAntes={item.precio != null && unidades > 1 ? item.precio : null}
                      ahorro={ahorroDePack(pack, item.precio)}
                      nota={ficha.ofertas.nota_pack}
                      onElegir={() => setPackElegidoId(pack.id)}
                    />
                  );
                })}
              </div>

              {ficha.ofertas.suscripcion.activo && (
                <label className="fpp-suscripcion">
                  <input
                    type="checkbox"
                    checked={suscripcion}
                    onChange={e => setSuscripcion(e.target.checked)}
                    style={{ accentColor: vars['--fpp-accent'] }}
                  />
                  <b>{ficha.ofertas.suscripcion.titulo || 'Suscribite y ahorrá'}</b>
                  <small>{ficha.ofertas.suscripcion.detalle}</small>
                </label>
              )}

              <div className="fpp-packs-cta">
                <button type="button" className="fpp-cta" onClick={comprar}>
                  {ficha.hero.cta_texto || 'Comprar ahora'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* 5 · Beneficios clave ─────────────────────────────────────── */}
      {ficha.beneficios.activo && (ficha.beneficios.items.length > 0 || previewMode) && (
        <section className="fpp-seccion fpp-seccion--fondo" id="fpp-beneficios" style={{ paddingBlock: 0 }}>
          <div className="fpp-wrap">
            {ficha.beneficios.titulo && (
              <div style={{ paddingTop: 34 }}>
                <TituloSeccion numero={5} texto={ficha.beneficios.titulo} acento={vars['--fpp-accent']} onAccent={vars['--fpp-on-accent']} />
              </div>
            )}
            {ficha.beneficios.items.length === 0 ? (
              <p className="fpp-vacio" style={{ marginBlock: 30 }}>
                Sección de beneficios activa y sin contenido. Se cargan en <b>Marketing &amp; Embudo</b> del producto,
                o acá mismo desde la pestaña <b>Ficha</b>.
              </p>
            ) : (
              <div className="fpp-beneficios">
                {ficha.beneficios.items.map((b, i) => {
                  const Icono = getIconoBeneficio(b.icono);
                  return (
                    <div className="fpp-beneficio" key={i}>
                      <Icono size={27} />
                      <b>{b.titulo}</b>
                      {b.texto && <p>{b.texto}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6 · Ingredientes y ciencia ───────────────────────────────── */}
      {ficha.ingredientes.activo && (ficha.ingredientes.items.length > 0 || previewMode) && (
        <section className="fpp-seccion fpp-wrap" id="fpp-ingredientes">
          <TituloSeccion numero={6} texto={ficha.ingredientes.titulo} acento={vars['--fpp-accent']} onAccent={vars['--fpp-on-accent']} />
          {ficha.ingredientes.items.length === 0 ? (
            <p className="fpp-vacio">Agregá los ingredientes con su dosis desde la pestaña <b>Ficha</b> de este producto.</p>
          ) : (
            <div className="fpp-ingredientes">
              {ficha.ingredientes.items.map((ing, i) => {
                const Icono = getIconoBeneficio(ing.icono || 'leaf');
                return (
                  <div className="fpp-ingrediente" key={i}>
                    <div className="fpp-ingrediente-icono"><Icono size={26} /></div>
                    <div>
                      <b>{ing.nombre} {ing.dosis && <small>{ing.dosis}</small>}</b>
                      {ing.texto && <p>{ing.texto}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 7 · Opiniones ────────────────────────────────────────────── */}
      {ficha.opiniones.activo && (ficha.opiniones.items.length > 0 || previewMode) && (
        <section className="fpp-seccion fpp-seccion--fondo" id="fpp-opiniones">
          <div className="fpp-wrap">
            <TituloSeccion numero={7} texto={ficha.opiniones.titulo} acento={vars['--fpp-accent']} onAccent={vars['--fpp-on-accent']} />
            {ficha.opiniones.items.length === 0 ? (
              <p className="fpp-vacio">Cargá las opiniones de tus clientes desde la pestaña <b>Ficha</b> de este producto.</p>
            ) : (
              <div className="fpp-opiniones">
                {ficha.opiniones.items.map((o, i) => (
                  <article className="fpp-opinion" key={i}>
                    <div className="fpp-opinion-cara">
                      {o.foto ? <img src={getMediaUrl(o.foto)} alt="" /> : inicialesDe(o.nombre)}
                    </div>
                    <div>
                      <Estrellas valor={o.calificacion} tamano={13} />
                      <p>“{o.comentario}”</p>
                      <b>— {o.nombre}</b>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 8 · Cómo funciona ────────────────────────────────────────── */}
      {ficha.como_funciona.activo && (ficha.como_funciona.pasos.length > 0 || previewMode) && (
        <section className="fpp-seccion fpp-wrap" id="fpp-como-funciona">
          <TituloSeccion numero={8} texto={ficha.como_funciona.titulo} acento={vars['--fpp-accent']} onAccent={vars['--fpp-on-accent']} />
          {ficha.como_funciona.pasos.length === 0 ? (
            <p className="fpp-vacio">Explicá el paso a paso desde la pestaña <b>Ficha</b>.</p>
          ) : (
            <div className="fpp-pasos">
              {ficha.como_funciona.pasos.map((p, i) => {
                const Icono = getIconoBeneficio(p.icono);
                return (
                  <div className="fpp-paso" key={i}>
                    <div className="fpp-paso-icono"><Icono size={26} /></div>
                    <b>{i + 1}. {p.titulo}</b>
                    {p.texto && <p>{p.texto}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 9 · Garantías y confianza ────────────────────────────────── */}
      {ficha.garantias.activo && ficha.garantias.items.length > 0 && (
        <section className="fpp-garantias" id="fpp-garantias">
          <div className="fpp-wrap fpp-garantias-grid">
            {ficha.garantias.items.map((g, i) => {
              const Icono = getIconoBeneficio(g.icono);
              return (
                <div className="fpp-garantia" key={i}>
                  <Icono size={24} />
                  <b>{g.titulo}</b>
                  {g.texto && <small>{g.texto}</small>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 10 · Preguntas frecuentes ────────────────────────────────── */}
      {ficha.faq.activo && (item.faq.length > 0 || previewMode) && (
        <section className="fpp-seccion fpp-wrap" id="fpp-faq">
          <TituloSeccion numero={10} texto={item.faqTitulo || ficha.faq.titulo} acento={vars['--fpp-accent']} onAccent={vars['--fpp-on-accent']} />
          {item.faq.length === 0 ? (
            <p className="fpp-vacio">Las preguntas se cargan en la pestaña <b>Detalles</b> de este producto.</p>
          ) : (
            <div className="fpp-faq-grid">
              {item.faq.map((f, i) => (
                <div className={`fpp-faq-item ${preguntaAbierta === i ? 'abierta' : ''}`} key={i}>
                  <button type="button" onClick={() => setPreguntaAbierta(preguntaAbierta === i ? null : i)}>
                    <span>{f.pregunta}</span>
                    <ChevronDown size={17} />
                  </button>
                  {preguntaAbierta === i && <p>{f.respuesta}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 11 · Productos complementarios ───────────────────────────── */}
      {ficha.upsells.activo && item.relacionados.length > 0 && (
        <section className="fpp-seccion fpp-wrap" id="fpp-upsells">
          <TituloSeccion numero={11} texto={item.relacionadosTitulo || ficha.upsells.titulo} acento={vars['--fpp-accent']} onAccent={vars['--fpp-on-accent']} />
          <div className="fpp-upsells">
            {item.relacionados.map(r => {
              const precio = r.precio ?? r.precio_efectivo ?? r.precio_base ?? null;
              const antes = r.precio_ancla ?? r.precio_tachado ?? null;
              const enOferta = antes != null && precio != null && Number(antes) > Number(precio);
              return (
                <div className="fpp-upsell" key={r.id}>
                  <div className="fpp-upsell-img">
                    {r.imagen ? <img src={getMediaUrl(r.imagen)} alt={r.nombre} /> : <ImageOff size={22} />}
                  </div>
                  <div className="fpp-upsell-datos">
                    <b>{r.nombre}</b>
                    {r.descripcion && <p>{r.descripcion}</p>}
                    <span className="fpp-upsell-precio">
                      {precio != null && <strong>{formatPrecio(precio)}</strong>}
                      {enOferta && <del>{formatPrecio(antes)}</del>}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="fpp-upsell-cta"
                    onClick={() => onClickRelacionado && onClickRelacionado(r)}
                  >
                    {ficha.upsells.cta_texto || 'Ver'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 12 · Cierre y urgencia ───────────────────────────────────── */}
      {ficha.cta_final.activo && (
        <section className="fpp-cierre" id="fpp-cierre">
          <div className="fpp-wrap fpp-cierre-inner">
            <div>
              {ficha.cta_final.etiqueta && <p className="fpp-cierre-etiqueta">{ficha.cta_final.etiqueta}</p>}
              {ficha.cta_final.contador.activo && <Contador desde={ficha.cta_final.contador} />}
            </div>
            <div className="fpp-cierre-copy">
              {ficha.cta_final.titulo && <h2>{ficha.cta_final.titulo}</h2>}
              {ficha.cta_final.texto && <p>{ficha.cta_final.texto}</p>}
            </div>
            <button type="button" className="fpp-cierre-cta" onClick={packs.length ? irAOfertas : comprar}>
              {ficha.cta_final.cta_texto || 'Comprar ahora'}
              {ficha.cta_final.cta_nota && <small>{ficha.cta_final.cta_nota}</small>}
            </button>
          </div>
        </section>
      )}

      {contacto && <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={vars['--fpp-border']} isMobile={isMobile} />}
      <StoreFooterLegal tema={t} bordeSuave={vars['--fpp-border']} nombreComercio={nombreComercio} isPreview={previewMode} />

      {/* Barra fija de compra — solo en móvil (la muestra el CSS). El CTA
          principal queda arriba del pliegue y el cliente lo pierde al
          scrollear por las 12 secciones. */}
      <div className="fpp-barra-movil">
        <div className="fpp-barra-movil-precio">
          <b>{precioMostrado != null ? formatPrecio(precioMostrado) : ''}</b>
          {packElegido && <small>{packElegido.nombre}</small>}
        </div>
        <button type="button" className="fpp-cta" onClick={packs.length ? irAOfertas : comprar}>
          {ficha.hero.cta_texto || 'Comprar ahora'}
        </button>
      </div>
    </div>
  );
}

/* ── Piezas internas ──────────────────────────────────────────────── */

function TituloSeccion({ numero, texto, acento, onAccent }) {
  if (!texto) return null;
  return (
    <div className="fpp-seccion-titulo">
      <h2>{texto}</h2>
    </div>
  );
}

function Estrellas({ valor = 5, tamano = 14 }) {
  const llenas = Math.round(Number(valor) || 0);
  return (
    <span className="fpp-estrellas" aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={tamano} fill={n <= llenas ? 'currentColor' : 'none'} strokeWidth={1.6} />
      ))}
    </span>
  );
}

const dosDigitos = (n) => String(Math.max(0, n)).padStart(2, '0');

/**
 * Contador decorativo: arranca en el tiempo configurado cada vez que
 * alguien abre la página y baja hasta cero, donde se queda. No hay ninguna
 * fecha límite real detrás — es una decisión de producto, no un olvido: la
 * alternativa (fecha de fin) exige que alguien la mantenga o el contador
 * queda apagado para siempre.
 */
function Contador({ desde }) {
  const total = useMemo(
    () => Math.max(0, (Number(desde.horas) || 0) * 3600 + (Number(desde.minutos) || 0) * 60 + (Number(desde.segundos) || 0)),
    [desde.horas, desde.minutos, desde.segundos]
  );
  const [restante, setRestante] = useState(total);

  useEffect(() => { setRestante(total); }, [total]);

  useEffect(() => {
    if (restante <= 0) return undefined;
    const id = setInterval(() => setRestante(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [restante > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="fpp-contador">
        <b>{dosDigitos(Math.floor(restante / 3600))}</b><span>:</span>
        <b>{dosDigitos(Math.floor((restante % 3600) / 60))}</b><span>:</span>
        <b>{dosDigitos(restante % 60)}</b>
      </div>
      <div className="fpp-contador-labels"><span>Horas</span><span>Minutos</span><span>Segundos</span></div>
    </div>
  );
}

/**
 * Tarjeta de "Elegí tu oferta especial" — la MISMA para el paquete real y
 * para "Individual" (1 unidad). Es deliberado: la referencia que dio el
 * comercio muestra las tres opciones con exactamente el mismo tamaño y la
 * misma foto, y solo se diferencian por el badge de arriba y el texto bajo
 * el precio ("Ahorrás X%" en los paquetes, "Precio normal" en la unidad
 * suelta vía `notaPrecioNormal`) — nunca por el tamaño de la tarjeta.
 */
function TarjetaPack({ elegido, badge, nombre, subtitulo, imagen, precioUnitario, precioAntes, ahorro, notaPrecioNormal, nota, onElegir }) {
  return (
    <button type="button" className={`fpp-pack ${elegido ? 'elegido' : ''}`} onClick={onElegir}>
      {badge && <span className="fpp-pack-badge">{badge}</span>}
      <span className="fpp-pack-nombre">{nombre}</span>
      {subtitulo && <span className="fpp-pack-sub">{subtitulo}</span>}
      <span className="fpp-pack-imagen">
        {imagen ? <img src={getMediaUrl(imagen)} alt="" /> : <ImageOff size={26} />}
      </span>
      <span className="fpp-pack-precio">
        {formatPrecio(precioUnitario)} <small>c/u</small>
      </span>
      {precioAntes != null && precioAntes > precioUnitario && <del>{formatPrecio(precioAntes)}</del>}
      {ahorro != null
        ? <span className="fpp-pack-ahorro">Ahorrás {ahorro}%</span>
        : notaPrecioNormal
          ? <span className="fpp-pack-precio-normal">{notaPrecioNormal}</span>
          : null}
      <span className="fpp-pack-elegir">{elegido ? 'Seleccionado' : 'Elegir'}</span>
      {nota && <span className="fpp-pack-sub">{nota}</span>}
    </button>
  );
}

/**
 * Paleta completa de la ficha a partir de los tres colores que el comercio
 * edita (fondo/texto/acento). Todo lo demás (superficies, bordes, texto
 * secundario, las franjas oscuras, el color legible sobre el acento) se
 * DERIVA — no hay un solo color literal en el CSS. Es lo que permite que la
 * estructura sea fija y el diseño siga siendo del comercio.
 */
function calcularVariables(t) {
  const { fondo, texto, acento } = t;
  // contraste(x, blanco) es ALTO cuando x es oscuro (el fondo de Fitness da
  // 19,6 y uno claro 1,07). El umbral 3 separa las dos familias de paletas.
  const fondoEsOscuro = contraste(fondo, '#FFFFFF') >= 3;
  // Texto legible sobre un color de fondo. Se prefiere blanco mientras
  // llegue a 3:1 — el mínimo AA para texto grande y en negrita, que es lo
  // único que se pinta sobre el acento (botones y cintillos) — porque
  // blanco sobre el color de marca es lo que el cliente espera de un botón.
  // Cuando no llega (celeste claro: 2,4:1) se cae a texto oscuro, que ahí
  // da 7,9:1. Sin esto, un acento claro deja el botón ilegible.
  const sobre = (color) => (contraste(color, '#FFFFFF') >= 3 ? '#FFFFFF' : '#111111');

  // Las franjas de anuncio y garantías van en un tono contrastante contra el
  // cuerpo: si la landing es clara, casi negro; si ya es oscura, un escalón
  // por encima del fondo (en oscuro, "más oscuro" no se distingue).
  const band = fondoEsOscuro ? componer(texto, 0.10, fondo) : componer(texto, 0.93, fondo);
  const onBand = sobre(band);
  // El acento sobre la franja puede quedar ilegible (naranja sobre casi
  // negro va bien, pero un acento oscuro sobre franja oscura no) — se cae
  // al color del texto de la franja antes que dibujar algo invisible.
  const acentoEnBand = contraste(acento, band) >= 3 ? acento : onBand;

  return {
    '--fpp-bg': fondo,
    '--fpp-fg': texto,
    '--fpp-accent': acento,
    '--fpp-on-accent': sobre(acento),
    '--fpp-accent-suave': hexToRgba(acento, 0.14),
    '--fpp-accent-borde': hexToRgba(acento, 0.38),
    '--fpp-accent-sombra': componer('#000000', 0.32, acento),
    '--fpp-muted': componer(texto, 0.62, fondo),
    '--fpp-border': hexToRgba(texto, 0.12),
    '--fpp-border-fuerte': hexToRgba(texto, 0.22),
    '--fpp-surface': hexToRgba(texto, 0.07),
    '--fpp-surface-suave': hexToRgba(texto, 0.03),
    // Las tarjetas (paquetes, opiniones, complementarios) se despegan del
    // cuerpo en la dirección que corresponda: en oscuro, un escalón hacia
    // el texto; en claro, hacia el blanco. Con `fondo` a secas quedaban
    // exactamente del color de la página y solo las separaba el borde.
    '--fpp-card': fondoEsOscuro ? componer(texto, 0.05, fondo) : componer('#FFFFFF', 0.7, fondo),
    '--fpp-sombra': hexToRgba(texto, 0.12),
    '--fpp-band': band,
    '--fpp-on-band': onBand,
    '--fpp-on-band-borde': hexToRgba(onBand, 0.2),
    '--fpp-accent-band': acentoEnBand,
    // Las estrellas van en dorado en cualquier paleta: es una convención
    // que el cliente lee de un vistazo, y teñirlas con el acento del
    // comercio las vuelve irreconocibles como calificación.
    '--fpp-estrella': '#F0A82A',
  };
}
