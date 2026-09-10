import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ImageOff, Star } from 'lucide-react';
import { getMediaUrl } from '../../../../services/api';
import { formatPrecio } from '../../../../lib/mensajeWhatsapp';
import { getIconoBeneficio } from '../iconosBeneficios';
import { hexToRgba, componer, contraste, resolverTemaPorSlug } from '../themeUtils';
import { ahorroDePack, inicialesDe } from '../fichaComun';
import { RedesSocialesFooter, ImagenProductoHover } from '../sections';
import StoreFooterLegal from '../../../landing/StoreFooterLegal';
import RichText from '../../../../components/RichText';
import BarraMarquee from '../BarraMarquee';
import './beautyProductPage.css';

/**
 * Ficha de producto del template "Beauty & Skin Care".
 *
 * ── Un solo renderer ───────────────────────────────────────────────────
 * Lo montan los dos lados: el preview del armador y la landing publicada
 * (ver BeautyProductPagePublica.jsx). Es la regla que se fijó cuando
 * preview y publicada se desincronizaron por tener dos componentes
 * dibujando lo mismo. Si aparece un tercer lugar, llama a este componente.
 *
 * `previewMode` solo muestra ayudas del editor: evita navegar fuera del
 * editor, muestra carteles de secciones vacías y numera los títulos para
 * orientar al usuario. La landing publicada conserva el mismo contenido sin
 * esas guías.
 *
 * Estructura fija de 12 secciones, contenido 100% editable — ver
 * fichaBeauty.js para de dónde sale cada una.
 */
export default function BeautyProductPage({
  item,
  ficha,
  tema,
  templateSlug = 'beauty-skincare',
  contacto = null,
  nombreComercio = null,
  isMobile = false,
  previewMode = false,
  onComprar = null,
  onAgregar = null,
  onVolver = null,
  onClickRelacionado = null,
}) {
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [packId, setPackId] = useState(null);
  const [suscripcion, setSuscripcion] = useState(false);
  const [preguntaAbierta, setPreguntaAbierta] = useState(null);

  const t = resolverTemaPorSlug(tema, templateSlug);
  const vars = useMemo(() => calcularVariables(t), [t.fondo, t.texto, t.acento]);

  const packs = item?.packs || [];
  const pack = packs.find(p => String(p.id) === String(packId)) || null;
  const precio = pack ? (pack.precio_efectivo ?? pack.precio) : item?.precio;

  useEffect(() => { setIndiceImagen(0); }, [item?.nombre]);
  useEffect(() => {
    if (packId && !packs.some(p => String(p.id) === String(packId))) setPackId(null);
  }, [packs, packId]);

  if (!item) return null;

  // Lo que está a medio cargar no se publica, pero se conserva en el editor:
  // por eso el filtro vive acá y no en el normalizador.
  const beneficios = (ficha.beneficios.items || []).filter(b => b?.titulo?.trim());
  const ingredientes = (ficha.ingredientes.items || []).filter(i => i?.nombre?.trim());
  const resultados = (ficha.resultados.items || []).filter(r => r?.testimonio?.trim() || r?.nombre?.trim());
  const pasos = (ficha.como_funciona.pasos || []).filter(p => p?.titulo?.trim());
  const garantias = (ficha.garantias.items || []).filter(g => g?.titulo?.trim());
  const sellos = (ficha.precio.confianza || []).filter(c => c?.texto?.trim());

  const irAOfertas = () => {
    const destino = document.getElementById('bpp-ofertas');
    if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else comprar();
  };

  const comprar = () => onComprar && onComprar({ variante: null, pack, precio });
  // Agregar al carrito NO puede caer a comprar(): son acciones distintas y
  // abrir el formulario cuando la clienta solo quiso guardar el producto es
  // lo peor que puede hacer un botón. Sin handler, el botón no se muestra.
  const agregar = (elegido) => onAgregar && onAgregar({
    variante: null,
    pack: elegido ?? pack,
    precio: elegido ? (elegido.precio_efectivo ?? elegido.precio) : precio,
  });

  const imagenActual = item.imagenes[indiceImagen] || item.imagenes[0] || null;

  // Igual que en las otras fichas: el CSS no puede medir el texto y los
  // nombres del catálogo son descriptivos, no titulares cortos.
  const tituloTexto = (ficha.hero.titulo || item.nombre || '').trim();
  const claseTitulo = tituloTexto.length > 78 ? 'es-muy-largo' : tituloTexto.length > 38 ? 'es-largo' : '';

  return (
    <div className={`bpp-root ${isMobile ? 'es-movil' : ''}`} style={vars}>
      {/* 1 · Barra superior ───────────────────────────────────────── */}
      {ficha.barra_superior.activo && ficha.barra_superior.items.length > 0 && (
        <BarraMarquee
          className="bpp-barra"
          items={ficha.barra_superior.items}
          animado={ficha.barra_superior.animado !== false}
          velocidad={ficha.barra_superior.velocidad}
          separador={ficha.barra_superior.separador}
          renderItem={(a, i) => {
            const Icono = getIconoBeneficio(a.icono);
            return <span className="bpp-barra-item" key={i}><Icono size={14} /> {a.texto}</span>;
          }}
          cta={ficha.barra_superior.cta_texto ? (
            <button type="button" className="bpp-barra-cta" onClick={irAOfertas}>
              {ficha.barra_superior.cta_texto}
            </button>
          ) : null}
        />
      )}

      <div className="bpp-wrap">
        {onVolver && (
          <button type="button" className="bpp-volver" onClick={onVolver}>
            <ArrowLeft size={15} /> Volver al catálogo
          </button>
        )}
      </div>

      {/* 2 · Encabezado ───────────────────────────────────────────── */}
      <section className="bpp-hero bpp-wrap" id="bpp-hero">
        <div className="bpp-galeria">
          <div className={`bpp-foto ${imagenActual ? '' : 'vacia'}`}>
            {imagenActual
              ? <img src={getMediaUrl(imagenActual)} alt={item.nombre} />
              : <ImageOff size={44} />}
          </div>
          {item.imagenes.length > 1 && (
            <div className="bpp-miniaturas">
              {item.imagenes.map((url, i) => (
                <button
                  type="button"
                  key={url + i}
                  aria-label={`Foto ${i + 1} de ${item.imagenes.length}`}
                  className={`bpp-miniatura ${i === indiceImagen ? 'activa' : ''}`}
                  onClick={() => setIndiceImagen(i)}
                >
                  <img src={getMediaUrl(url)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`bpp-hero-copy ${claseTitulo}`}>
          {(ficha.hero.etiqueta || ficha.hero.eyebrow || item.categoria) && (
            <p className="bpp-eyebrow">
              {ficha.hero.etiqueta && <b className="bpp-badge">{ficha.hero.etiqueta}</b>}
              {ficha.hero.eyebrow || item.categoria}
            </p>
          )}

          <h1>{ficha.hero.titulo || item.nombre}</h1>
          {ficha.hero.subtitulo && <p className="bpp-subtitulo">{ficha.hero.subtitulo}</p>}

          {(ficha.hero.lead || item.descripcion) && (
            <RichText text={ficha.hero.lead || item.descripcion} className="bpp-lead" />
          )}

          {ficha.hero.caracteristicas.length > 0 && (
            <ul className="bpp-checklist">
              {ficha.hero.caracteristicas.map((linea, i) => (
                <li key={i}><span className="bpp-check"><Check size={12} strokeWidth={3} /></span> {linea}</li>
              ))}
            </ul>
          )}

          <button type="button" className="bpp-cta" onClick={irAOfertas}>
            {ficha.hero.cta_texto || 'Comprar ahora'}
          </button>
          {ficha.hero.garantia_texto && <p className="bpp-garantia-nota">{ficha.hero.garantia_texto}</p>}
        </div>
      </section>

      {/* 3 · Prueba social ────────────────────────────────────────── */}
      {ficha.prueba_social.activo && (
        <div className="bpp-social">
          <div className="bpp-wrap bpp-social-inner">
            <div className="bpp-social-izq">
              {ficha.prueba_social.etiqueta && <b>{ficha.prueba_social.etiqueta}</b>}
              <Estrellas valor={ficha.prueba_social.calificacion} tamano={15} />
              <strong>{Number(ficha.prueba_social.calificacion).toFixed(1)}/5</strong>
              {ficha.prueba_social.resenas_texto && <small>{ficha.prueba_social.resenas_texto}</small>}
            </div>
            {(ficha.prueba_social.avatares.length > 0 || ficha.prueba_social.clientes_texto) && (
              <div className="bpp-avatares">
                {ficha.prueba_social.avatares.map((a, i) => (
                  <span className="bpp-avatar" key={i}>
                    {a.foto
                      ? <img src={getMediaUrl(a.foto)} alt="" />
                      : inicialesDe(a.nombre)}
                  </span>
                ))}
                {ficha.prueba_social.clientes_texto && <b>{ficha.prueba_social.clientes_texto}</b>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 · Ofertas y opciones de compra ─────────────────────────── */}
      {ficha.precio.activo && (
        <section className="bpp-seccion bpp-wrap" id="bpp-ofertas">
          <div className="bpp-ofertas-encabezado">
            <TituloSeccion numero={4} texto={ficha.precio.titulo} vars={vars} mostrarNumero={previewMode} />
            {ficha.precio.suscripcion.activo && (
              <label className="bpp-suscripcion">
                <span>{ficha.precio.suscripcion.titulo || 'Suscribite y ahorrá'}</span>
                <input
                  type="checkbox"
                  checked={suscripcion}
                  onChange={e => setSuscripcion(e.target.checked)}
                />
                <i aria-hidden="true" />
              </label>
            )}
          </div>

          {packs.length === 0 ? (
            previewMode ? (
              <p className="bpp-vacio">
                Todavía no cargaste paquetes. Se crean en la pestaña <b>Ofertas</b> de este producto
                (“Paquete — más unidades del mismo producto”) y aparecen acá como tarjetas.
              </p>
            ) : (
              <div className="bpp-packs">
                <TarjetaPack
                  elegido
                  nombre={ficha.precio.etiqueta_individual || '1 unidad'}
                  imagen={item.imagenes[0]}
                  precio={item.precio}
                  precioAntes={item.precioAntes}
                  nota={ficha.precio.nota_pack}
                  cta={ficha.precio.cta_pack}
                  onElegir={() => setPackId(null)}
                  onAgregar={onAgregar ? () => agregar(null) : null}
                />
              </div>
            )
          ) : (
            <div className="bpp-packs">
              <TarjetaPack
                elegido={!pack}
                nombre={ficha.precio.etiqueta_individual || '1 unidad'}
                imagen={item.imagenes[0]}
                precio={item.precio}
                precioAntes={item.precioAntes}
                notaPrecio="Precio normal"
                nota={ficha.precio.nota_pack}
                cta={ficha.precio.cta_pack}
                onElegir={() => setPackId(null)}
                onAgregar={onAgregar ? () => agregar(null) : null}
              />
              {packs.map(p => {
                const conf = ficha.precio.packs?.[String(p.id)] || {};
                const unidades = Number(p.unidades) || 1;
                return (
                  <TarjetaPack
                    key={p.id}
                    elegido={String(packId) === String(p.id)}
                    badge={conf.badge}
                    nombre={p.nombre}
                    subtitulo={conf.subtitulo || `${unidades} unidades`}
                    imagen={p.imagen || item.imagenes[0]}
                    precio={p.precio_efectivo ?? p.precio}
                    ahorro={ahorroDePack(p, item.precio)}
                    nota={ficha.precio.nota_pack}
                    cta={ficha.precio.cta_pack}
                    onElegir={() => setPackId(p.id)}
                    onAgregar={onAgregar ? () => agregar(p) : null}
                  />
                );
              })}
            </div>
          )}

          {sellos.length > 0 && (
            <div className="bpp-sellos">
              {sellos.map((c, i) => {
                const Icono = getIconoBeneficio(c.icono);
                return <span key={i}><Icono size={15} /> {c.texto}</span>;
              })}
            </div>
          )}

          {!onAgregar && (
            <div className="bpp-ofertas-cta">
              <button type="button" className="bpp-cta" onClick={comprar}>
                {ficha.precio.cta_pack || 'Comprar ahora'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 5 · Beneficios clave ─────────────────────────────────────── */}
      {ficha.beneficios.activo && (beneficios.length > 0 || previewMode) && (
        <section className="bpp-seccion bpp-seccion--fondo">
          <div className="bpp-wrap">
            <TituloSeccion numero={5} texto={ficha.beneficios.titulo} vars={vars} centrado mostrarNumero={previewMode} />
            {beneficios.length === 0 ? (
              <p className="bpp-vacio">
                Se cargan en <b>Vista del producto</b>.
              </p>
            ) : (
              <div className="bpp-beneficios">
                {beneficios.map((b, i) => {
                  const Icono = getIconoBeneficio(b.icono);
                  return (
                    <div className="bpp-beneficio" key={i}>
                      <span className="bpp-beneficio-icono"><Icono size={22} /></span>
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

      {/* 6 · Ingredientes premium ─────────────────────────────────── */}
      {ficha.ingredientes.activo && (ingredientes.length > 0 || previewMode) && (
        <section className="bpp-seccion bpp-wrap">
          <TituloSeccion numero={6} texto={ficha.ingredientes.titulo} vars={vars} centrado mostrarNumero={previewMode} />
          {ingredientes.length === 0 ? (
            <p className="bpp-vacio">
              Se cargan en <b>Mis Productos → Vista del producto</b> (Beauty), y sirven en todas tus landings.
            </p>
          ) : (
            <div className="bpp-ingredientes">
              {ingredientes.map((ing, i) => (
                <div className="bpp-ingrediente" key={i}>
                  <span className="bpp-ingrediente-icono">
                    {ing.icono ? <span className="bpp-emoji">{ing.icono}</span> : <ImageOff size={18} />}
                  </span>
                  <b>{ing.nombre}</b>
                  {ing.descripcion && <p>{ing.descripcion}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 7 · Resultados de clientas ───────────────────────────────── */}
      {ficha.resultados.activo && (resultados.length > 0 || previewMode) && (
        <section className="bpp-seccion bpp-seccion--fondo">
          <div className="bpp-wrap">
            <TituloSeccion numero={7} texto={ficha.resultados.titulo} vars={vars} centrado mostrarNumero={previewMode} />
            {resultados.length === 0 ? (
              <p className="bpp-vacio">
                Cargá los testimonios en <b>Mis Productos → Vista del producto</b>.
              </p>
            ) : (
              <div className="bpp-resultados">
                {resultados.map((r, i) => (
                  <article className="bpp-resultado" key={i}>
                    {(r.antes || r.despues) && (
                      <div className="bpp-antes-despues">
                        <figure>
                          {r.antes
                            ? <img src={getMediaUrl(r.antes)} alt="Antes" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
                            : null}
                          <figcaption>Antes</figcaption>
                        </figure>
                        <figure>
                          {r.despues
                            ? <img src={getMediaUrl(r.despues)} alt="Después" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
                            : null}
                          <figcaption>Después</figcaption>
                        </figure>
                      </div>
                    )}
                    <Estrellas valor={r.calificacion} tamano={13} />
                    {r.testimonio && <p>“{r.testimonio}”</p>}
                    {r.nombre && <b>— {r.nombre}</b>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 8 · Cómo funciona ────────────────────────────────────────── */}
      {ficha.como_funciona.activo && (pasos.length > 0 || previewMode) && (
        <section className="bpp-seccion bpp-wrap">
          <TituloSeccion numero={8} texto={ficha.como_funciona.titulo} vars={vars} centrado mostrarNumero={previewMode} />
          {pasos.length === 0 ? (
            <p className="bpp-vacio">
              La rutina paso a paso se carga en <b>Mis Productos → Vista del producto</b> (Beauty).
            </p>
          ) : (
            <div className="bpp-pasos">
              {pasos.map((p, i) => (
                <div className="bpp-paso" key={i}>
                  <span className="bpp-paso-numero">{p.paso || i + 1}</span>
                  <b>{p.titulo}</b>
                  {p.descripcion && <p>{p.descripcion}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 9 · Garantías y confianza ────────────────────────────────── */}
      {ficha.garantias.activo && garantias.length > 0 && (
        <section className="bpp-garantias">
          <div className="bpp-wrap bpp-garantias-grid">
            {garantias.map((g, i) => {
              const Icono = getIconoBeneficio(g.icono);
              return (
                <div className="bpp-garantia" key={i}>
                  <Icono size={20} />
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
        <section className="bpp-seccion bpp-wrap">
          <TituloSeccion numero={10} texto={item.faqTitulo || ficha.faq.titulo} vars={vars} centrado mostrarNumero={previewMode} />
          {item.faq.length === 0 ? (
            <p className="bpp-vacio">Las preguntas se cargan en <b>Vista del producto</b>.</p>
          ) : (
            <div className="bpp-faq-grid">
              {item.faq.map((f, i) => (
                <div className={`bpp-faq-item ${preguntaAbierta === i ? 'abierta' : ''}`} key={i}>
                  <button type="button" onClick={() => setPreguntaAbierta(preguntaAbierta === i ? null : i)}>
                    <span>{f.pregunta}</span>
                    <ChevronDown size={16} />
                  </button>
                  {preguntaAbierta === i && <RichText text={f.respuesta} />}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 11 · Complementa tu rutina ───────────────────────────────── */}
      {ficha.upsells.activo && item.relacionados.length > 0 && (
        <section className="bpp-seccion bpp-seccion--fondo">
          <div className="bpp-wrap">
            <TituloSeccion numero={11} texto={item.relacionadosTitulo || ficha.upsells.titulo} vars={vars} centrado mostrarNumero={previewMode} />
            <div className="bpp-upsells">
              {item.relacionados.map(r => {
                const precioRel = r.precio ?? r.precio_efectivo ?? r.precio_base ?? null;
                const antes = r.precio_ancla ?? r.precio_tachado ?? null;
                const enOferta = antes != null && precioRel != null && Number(antes) > Number(precioRel);
                return (
                  <div className="bpp-upsell" key={r.id}>
                    <span className="bpp-upsell-img">
                      <ImagenProductoHover
                        imagenes={(r.imagenes || []).map(getMediaUrl)}
                        imagen={r.imagen ? getMediaUrl(r.imagen) : null}
                        alt={r.nombre}
                        imgClassName="transition-opacity duration-500 ease-out"
                        fallback={<ImageOff size={22} />}
                      />
                    </span>
                    <b>{r.nombre}</b>
                    {r.descripcion && <p>{r.descripcion}</p>}
                    <span className="bpp-upsell-precio">
                      {precioRel != null && formatPrecio(precioRel)}
                      {enOferta && <del>{formatPrecio(antes)}</del>}
                    </span>
                    <button
                      type="button"
                      className="bpp-upsell-cta"
                      onClick={() => onClickRelacionado && onClickRelacionado(r)}
                    >
                      {ficha.upsells.cta_texto || 'Agregar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 12 · Cierre y urgencia ───────────────────────────────────── */}
      {ficha.cta_final.activo && (
        <section className="bpp-cierre">
          <div className="bpp-wrap bpp-cierre-inner">
            <div>
              {ficha.cta_final.etiqueta && <p className="bpp-cierre-etiqueta">{ficha.cta_final.etiqueta}</p>}
              {ficha.cta_final.contador.activo && <Contador desde={ficha.cta_final.contador} />}
            </div>
            <div className="bpp-cierre-copy">
              {ficha.cta_final.titulo && <h2>{ficha.cta_final.titulo}</h2>}
              {ficha.cta_final.texto && <p>{ficha.cta_final.texto}</p>}
            </div>
            <button type="button" className="bpp-cierre-cta" onClick={irAOfertas}>
              {ficha.cta_final.cta_texto || 'Comprar ahora'}
              {ficha.cta_final.cta_nota && <small>{ficha.cta_final.cta_nota}</small>}
            </button>
          </div>
        </section>
      )}

      {contacto && <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={vars['--bpp-border']} isMobile={isMobile} />}
      <StoreFooterLegal tema={t} bordeSuave={vars['--bpp-border']} nombreComercio={nombreComercio} isPreview={previewMode} />

      {/* Barra fija en móvil: el CTA queda arriba del pliegue y se pierde al
          recorrer las 12 secciones. */}
      <div className="bpp-barra-movil">
        <div className="bpp-barra-movil-precio">
          <b>{precio != null ? formatPrecio(precio) : ''}</b>
          {pack && <small>{pack.nombre}</small>}
        </div>
        <button type="button" className="bpp-cta" onClick={irAOfertas}>
          {ficha.hero.cta_texto || 'Comprar ahora'}
        </button>
      </div>
    </div>
  );
}

/* ── Piezas internas ──────────────────────────────────────────────── */

function TituloSeccion({ numero, texto, vars, centrado = false, mostrarNumero = false }) {
  if (!texto) return null;
  return (
    <div className={`bpp-seccion-titulo ${centrado ? 'es-centrado' : ''}`}>
      {mostrarNumero && (
        <span
          aria-hidden="true"
          style={{
            display: 'grid', placeItems: 'center', width: 26, height: 26,
            borderRadius: '50%', background: vars['--bpp-accent'], color: vars['--bpp-on-accent'],
            fontSize: 12, fontWeight: 900, flexShrink: 0,
          }}
        >
          {numero}
        </span>
      )}
      <h2>{texto}</h2>
    </div>
  );
}

function Estrellas({ valor = 5, tamano = 14 }) {
  const llenas = Math.round(Number(valor) || 0);
  return (
    <span className="bpp-estrellas" aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={tamano} fill={n <= llenas ? 'currentColor' : 'none'} strokeWidth={1.6} />
      ))}
    </span>
  );
}

/**
 * Tarjeta de oferta. La misma para el paquete y para la unidad suelta: en
 * la referencia las tres opciones tienen exactamente el mismo tamaño y solo
 * se diferencian por el cintillo y el texto bajo el precio.
 */
function TarjetaPack({
  elegido, badge, nombre, subtitulo, imagen, precio, precioAntes,
  ahorro, notaPrecio, nota, cta, onElegir, onAgregar,
}) {
  return (
    <div className={`bpp-pack ${elegido ? 'elegido' : ''}`}>
      {badge && <span className="bpp-pack-badge">{badge}</span>}
      {/* La tarjeta entera selecciona; el CTA de abajo es el que agrega. Son
          dos botones hermanos, nunca uno adentro del otro. */}
      <button type="button" className="bpp-pack-elegir" onClick={onElegir}>
        <span className="bpp-pack-nombre">{nombre}</span>
        {subtitulo && <span className="bpp-pack-sub">{subtitulo}</span>}
        <span className="bpp-pack-imagen">
          {imagen ? <img src={getMediaUrl(imagen)} alt="" loading="lazy" /> : <ImageOff size={24} />}
        </span>
        <span className="bpp-pack-precio">{formatPrecio(precio)}</span>
        {precioAntes != null && precioAntes > precio && <del>{formatPrecio(precioAntes)}</del>}
        {ahorro != null
          ? <span className="bpp-pack-ahorro">Ahorrás {ahorro}%</span>
          : notaPrecio
            ? <span className="bpp-pack-normal">{notaPrecio}</span>
            : null}
      </button>
      {onAgregar && (
        <button type="button" className="bpp-pack-cta" onClick={onAgregar}>
          {cta || 'Agregar al carrito'}
          {nota && <small>{nota}</small>}
        </button>
      )}
    </div>
  );
}

const dosDigitos = (n) => String(Math.max(0, n)).padStart(2, '0');

/**
 * Contador decorativo: arranca en el tiempo configurado cada vez que
 * alguien abre la página y baja hasta cero. No hay fecha límite real
 * detrás — misma decisión que en las otras fichas: la alternativa exige
 * que alguien mantenga la fecha o el contador queda apagado para siempre.
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
    <div className="bpp-contador">
      {cajas.map(([label, valor], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span className="bpp-contador-sep">:</span>}
          <span className="bpp-contador-caja">
            <b>{dosDigitos(valor)}</b>
            <small>{label}</small>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Paleta completa a partir de los tres colores que el comercio edita
 * (fondo/texto/acento). Todo lo demás se DERIVA — no hay un solo color
 * literal en el CSS, que es lo que permite que la estructura sea fija y el
 * diseño siga siendo del comercio. Mismos umbrales que Fitness y Tech.
 */
function calcularVariables(t) {
  const { fondo, texto, acento } = t;
  const fondoEsOscuro = contraste(fondo, '#FFFFFF') >= 3;
  const sobre = (color) => (contraste(color, '#FFFFFF') >= 3 ? '#FFFFFF' : '#111111');

  const band = fondoEsOscuro ? componer(texto, 0.10, fondo) : componer(texto, 0.93, fondo);

  return {
    '--bpp-bg': fondo,
    '--bpp-fg': texto,
    '--bpp-accent': acento,
    '--bpp-on-accent': sobre(acento),
    '--bpp-accent-suave': hexToRgba(acento, 0.12),
    '--bpp-accent-borde': hexToRgba(acento, 0.35),
    '--bpp-muted': componer(texto, 0.62, fondo),
    '--bpp-border': hexToRgba(texto, 0.12),
    '--bpp-border-fuerte': hexToRgba(texto, 0.2),
    '--bpp-surface': hexToRgba(texto, 0.05),
    '--bpp-surface-suave': hexToRgba(texto, 0.028),
    '--bpp-card': fondoEsOscuro ? componer(texto, 0.05, fondo) : componer('#FFFFFF', 0.75, fondo),
    '--bpp-sombra': hexToRgba(texto, 0.1),
    '--bpp-band': band,
    '--bpp-on-band': sobre(band),
    // Dorado para las estrellas en cualquier paleta: es una convención que
    // se lee de un vistazo; teñirlas con el acento las vuelve irreconocibles.
    '--bpp-estrella': '#F0A82A',
  };
}
