import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, ChevronDown, ExternalLink, ImageOff, LockKeyhole, Play, Star, X } from 'lucide-react';
import { getMediaUrl } from '../../../../services/api';
import { formatPrecio } from '../../../../lib/mensajeWhatsapp';
import { getIconoBeneficio } from '../iconosBeneficios';
import { hexToRgba, componer, contraste, resolverTemaPorSlug } from '../themeUtils';
import { ahorroDePack, inicialesDe } from '../fichaComun';
import { RedesSocialesFooter, ImagenProductoHover } from '../sections';
import StoreFooterLegal from '../../../landing/StoreFooterLegal';
import RichText from '../../../../components/RichText';
import BarraMarquee from '../BarraMarquee';
import { analizarVideo, NOMBRE_PLATAFORMA } from '../video';
import { agruparOpciones, resolverVariante, estadoValor, varianteAgotada } from '../../../../lib/varianteOpciones';
import { MediaProducto, MiniaturaMediaProducto, galeriaConVariantePromovida, claveMedioProducto, imagenPrincipalDeGaleria } from '../mediaGaleria';
import './techProductPage.css';

/**
 * Ficha de producto del template "Electrónica & Tecnología".
 *
 * ── Un solo renderer ───────────────────────────────────────────────────
 * Este componente lo montan LOS DOS lados: el preview del armador y la
 * landing publicada (ver TechProductPagePublica.jsx y la rama de
 * LandingSimpleEditor). Es la regla que se estableció con la ficha de
 * Fitness después de que preview y publicada se desincronizaran por tener
 * dos componentes distintos dibujando lo mismo. Si aparece un tercer lugar
 * donde mostrar la ficha, llama a este componente — no se escribe otro.
 *
 * `previewMode` solo muestra ayudas del editor: evita navegar fuera del
 * editor, muestra carteles de secciones vacías y numera los títulos para
 * orientar al usuario. La landing publicada conserva el mismo contenido sin
 * esas guías.
 *
 * Estructura fija de 14 secciones, contenido 100% editable — ver
 * fichaTech.js para de dónde sale cada una.
 */
export default function TechProductPage({
  item,
  ficha,
  tema,
  templateSlug = 'tech-electronica',
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
  // {} = "Estándar" (sin variante elegida, precio base del producto).
  const [seleccion, setSeleccion] = useState({});
  const [packId, setPackId] = useState(null);
  const [preguntaAbierta, setPreguntaAbierta] = useState(null);
  // Video abierto en el lightbox (solo los que se pueden incrustar).
  const [videoAbierto, setVideoAbierto] = useState(null);

  const t = resolverTemaPorSlug(tema, templateSlug);
  const vars = useMemo(() => calcularVariables(t), [t.fondo, t.texto, t.acento]);

  const variantes = item?.variantes || [];
  const gruposOpciones = useMemo(() => agruparOpciones(item), [item]);
  const variante = resolverVariante(item, seleccion);
  // Una variante agotada se puede elegir para ver su foto, pero no comprar.
  const agotada = varianteAgotada(variante);

  // Paquetes del mismo producto ("llevá 2 y pagá menos"). Son las Ofertas
  // con estrategia 'normal' que el comercio carga en "Ofertas"; hasta ahora
  // esta ficha las armaba y las tiraba, así que no aparecían en ningún lado.
  const packs = item?.packs || [];
  const pack = packs.find(p => String(p.id) === String(packId)) || null;

  // El precio sigue a lo elegido. Un paquete ya trae su precio total y no se
  // combina con la variante: son dos formas distintas de comprar lo mismo.
  const precioUnitario = variante?.precio_efectivo ?? item?.precio;
  const precio = pack ? (pack.precio_efectivo ?? pack.precio) : precioUnitario;

  // La variante solo toma el asiento principal: videos e imágenes generales
  // siguen en la galería porque también venden y explican el producto.
  const galeria = galeriaConVariantePromovida(item?.imagenes || [], variante);

  useEffect(() => { setIndiceImagen(0); }, [item?.nombre, variante?.id]);

  useEffect(() => {
    if (!videoAbierto) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') setVideoAbierto(null); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [videoAbierto]);

  useEffect(() => {
    if (packId && !packs.some(p => String(p.id) === String(packId))) setPackId(null);
  }, [packs, packId]);

  if (!item) return null;

  const irACompra = () => {
    const destino = document.getElementById('tpp-compra');
    if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else comprar();
  };

  const comprar = () => !agotada && onComprar && onComprar({ variante, pack, precio });
  // Agregar al carrito NO puede caer a comprar() si falta el handler: son
  // dos acciones distintas y abrir el formulario de compra cuando el
  // cliente solo quiso guardar el producto es lo peor que puede hacer un
  // botón. Sin handler, el botón directamente no se muestra.
  const agregar = () => !agotada && onAgregar && onAgregar({ variante, pack, precio });

  const imagenActual = galeria[indiceImagen] || galeria[0] || null;

  // Mismo criterio que la ficha de Fitness: el CSS no puede medir el texto
  // y los nombres del catálogo son descriptivos, no titulares cortos.
  const tituloTexto = `${ficha.hero.titulo || item.nombre} ${ficha.hero.titulo_destacado || ''}`.trim();
  const claseTitulo = tituloTexto.length > 88 ? 'es-muy-largo' : tituloTexto.length > 42 ? 'es-largo' : '';

  // Lo que está a medio cargar no se publica, pero se conserva en el
  // editor: por eso el filtro vive acá y no en el normalizador.
  const specs = (ficha.especificaciones.items || []).filter(e => e?.clave?.trim());
  const enLaCaja = (ficha.especificaciones.en_la_caja || []).filter(t => t?.trim());
  const comparativa = (ficha.comparativa.items || []).filter(c => c?.caracteristica?.trim());
  const multimedia = (ficha.multimedia.items || []).filter(m => m?.titulo?.trim() || m?.url?.trim() || m?.imagen?.trim());

  const hayRating = ficha.prueba_social.activo
    && (ficha.prueba_social.resenas_texto || ficha.prueba_social.clientes_texto || ficha.prueba_social.calificacion);

  return (
    <div className={`tpp-root ${isMobile ? 'es-movil' : ''}`} style={vars}>
      {/* 1 · Barra superior ───────────────────────────────────────── */}
      {ficha.barra_superior.activo && ficha.barra_superior.items.length > 0 && (
        <BarraMarquee
          className="tpp-barra"
          items={ficha.barra_superior.items}
          animado={ficha.barra_superior.animado !== false}
          velocidad={ficha.barra_superior.velocidad}
          separador={ficha.barra_superior.separador}
          renderItem={(a, i) => {
            const Icono = getIconoBeneficio(a.icono);
            return <span className="tpp-barra-item" key={i}><Icono size={14} /> {a.texto}</span>;
          }}
          cta={ficha.barra_superior.cta_texto ? (
            <button type="button" className="tpp-barra-cta" onClick={irACompra}>
              {ficha.barra_superior.cta_texto}
            </button>
          ) : null}
        />
      )}

      <div className="tpp-wrap">
        {onVolver && (
          <button type="button" className="tpp-volver" onClick={onVolver}>
            <ArrowLeft size={15} /> Volver al catálogo
          </button>
        )}
      </div>

      {/* 2 · Hero ─────────────────────────────────────────────────── */}
      <section className="tpp-hero tpp-wrap" id="tpp-hero">
        {/* Miniaturas debajo de la foto principal, misma regla que el resto
            de plantillas: galería limpia y comercial. */}
        <div className="tpp-galeria">
          <div className={`tpp-escenario ${imagenActual ? '' : 'vacia'}`}>
            {imagenActual
              ? <div className="lsp-media-frame"><MediaProducto medio={imagenActual} alt={item.nombre} /></div>
              : <ImageOff size={44} />}
            {ficha.hero.etiqueta && <span className="tpp-etiqueta-nueva">{ficha.hero.etiqueta}</span>}
          </div>
          {galeria.length > 1 && (
            <div className="tpp-miniaturas" role="tablist" aria-label="Fotos del producto">
              {galeria.map((medio, i) => (
                <button
                  type="button"
                  key={claveMedioProducto(medio, i)}
                  role="tab"
                  aria-selected={i === indiceImagen}
                  aria-label={`Medio ${i + 1} de ${galeria.length}`}
                  className={`tpp-miniatura ${i === indiceImagen ? 'activa' : ''}`}
                  onClick={() => setIndiceImagen(i)}
                >
                  <MiniaturaMediaProducto medio={medio} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`tpp-hero-copy ${claseTitulo}`}>
          {(ficha.hero.eyebrow || item.categoria) && (
            <p className="tpp-eyebrow">{ficha.hero.eyebrow || item.categoria}</p>
          )}

          <h1>
            {ficha.hero.titulo || item.nombre}
            {ficha.hero.titulo_destacado && <em>{ficha.hero.titulo_destacado}</em>}
          </h1>

          {(ficha.hero.lead || item.descripcion) && (
            <RichText text={ficha.hero.lead || item.descripcion} className="tpp-lead" />
          )}

          {ficha.hero.caracteristicas.length > 0 && (
            <ul className="tpp-caracteristicas">
              {ficha.hero.caracteristicas.map((linea, i) => (
                <li key={i}><Check size={16} /> {linea}</li>
              ))}
            </ul>
          )}

          {/* 3 · Prueba social — va acá, en el encabezado, como en la
              referencia: la calificación pesa mucho más arriba del pliegue
              que en una sección propia más abajo. */}
          {hayRating && (
            <div className="tpp-rating">
              <Estrellas valor={ficha.prueba_social.calificacion} tamano={15} />
              <b>{Number(ficha.prueba_social.calificacion).toFixed(1)}/5</b>
              {ficha.prueba_social.resenas_texto && <span>({ficha.prueba_social.resenas_texto})</span>}
              {ficha.prueba_social.clientes_texto && <span>· {ficha.prueba_social.clientes_texto}</span>}
            </div>
          )}

          <button type="button" className="tpp-cta" onClick={irACompra}>
            {ficha.hero.cta_texto || 'Añadir al carrito'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      {/* 4 · Precio, oferta y contador ────────────────────────────── */}
      {ficha.precio.activo && precio != null && (
        <div className="tpp-precio-banda">
          <div className="tpp-wrap tpp-precio-inner">
            <div>
              {(ficha.precio.etiqueta || item.descuentoPct > 0) && (
                <p className="tpp-precio-etiqueta">
                  {ficha.precio.etiqueta}
                  {item.descuentoPct > 0 && <b className="tpp-precio-badge">Ahorrá {item.descuentoPct}%</b>}
                </p>
              )}
              <div className="tpp-precio-fila">
                <strong>{formatPrecio(precio)}</strong>
                {item.precioAntes != null && <del>{formatPrecio(item.precioAntes)}</del>}
                {item.ahorroAbsoluto > 0 && (
                  <b>Ahorrás {formatPrecio(item.ahorroAbsoluto)} ({item.descuentoPct}%)</b>
                )}
              </div>
              {ficha.precio.cuotas_texto && (
                <p className="tpp-precio-cuotas">{ficha.precio.cuotas_texto}</p>
              )}
            </div>

            {ficha.precio.contador.activo && (
              <Contador desde={ficha.precio.contador} titulo="La oferta termina en:" />
            )}
          </div>
        </div>
      )}

      {/* 5 · Variantes + acciones de compra ───────────────────────── */}
      <section className="tpp-compra tpp-wrap" id="tpp-compra">
        <div className="tpp-panel">
          <TituloSeccion numero={5} texto={ficha.variantes.titulo} acento={vars['--tpp-accent']} onAccent={vars['--tpp-on-accent']} mostrarNumero={previewMode} />
          {variantes.length === 0 && packs.length === 0 ? (
            <p className="tpp-panel-label">
              {previewMode
                ? 'Sin variantes ni paquetes. Las variantes se cargan en Mis Productos; los paquetes, en la pestaña Ofertas de este producto.'
                : 'Producto en su única presentación.'}
            </p>
          ) : (
            <>
              <p className="tpp-panel-label">
                {ficha.variantes.etiqueta_grupo || 'Versión'}: <b>{variante?.nombre || 'Estándar'}</b>
              </p>
              <div className="tpp-variantes">
                <button
                  type="button"
                  className={`tpp-variante ${!variante ? 'activa' : ''}`}
                  onClick={() => setSeleccion({})}
                >
                  Estándar
                  {item.precio != null && <small>{formatPrecio(item.precio)}</small>}
                </button>
              </div>
              {gruposOpciones.map(grupo => (
                <div className="tpp-variantes" key={grupo.nombre} style={{ marginTop: '0.5rem' }}>
                  {grupo.valores.map(valor => {
                    const activo = seleccion[grupo.nombre] === valor;
                    const estado = estadoValor(item, grupo.nombre, valor, seleccion);
                    const previa = activo ? variante : resolverVariante(item, { ...seleccion, [grupo.nombre]: valor });
                    const imagenValor = variantes.find(v =>
                      (v.valoresOpcion || []).some(vo => vo.opcion === grupo.nombre && vo.valor === valor) && v.imagenes?.[0]
                    )?.imagenes?.[0];
                    return (
                      <button
                        key={valor}
                        type="button"
                        className={`tpp-variante ${activo ? 'activa' : ''} ${estado === 'agotado' ? 'agotada' : ''}`}
                        onClick={() => setSeleccion(prev => ({ ...prev, [grupo.nombre]: valor }))}
                        disabled={estado === 'inexistente'}
                        title={estado === 'agotado' ? 'Sin stock' : estado === 'inexistente' ? 'Combinación no disponible' : undefined}
                      >
                        {imagenValor && (
                          <img className="tpp-variante-foto" src={getMediaUrl(imagenValor)} alt="" loading="lazy" />
                        )}
                        {valor}
                        {previa?.precio_efectivo != null && <small>{formatPrecio(previa.precio_efectivo)}</small>}
                      </button>
                    );
                  })}
                </div>
              ))}
              {agotada && <p className="tpp-variante-agotada">Esta opción está sin stock por ahora.</p>}
            </>
          )}

          {/* Paquetes: la misma sección, según la guía de referencia
              ("variantes, versión o paquetes disponibles"). Van después de
              las variantes porque primero se elige QUÉ y después CUÁNTO. */}
          {packs.length > 0 && (
            <>
              <p className="tpp-panel-label tpp-packs-titulo">
                {ficha.variantes.packs_titulo || 'Cantidad'}
              </p>
              <div className="tpp-packs">
                <button
                  type="button"
                  className={`tpp-pack ${!pack ? 'activa' : ''}`}
                  onClick={() => setPackId(null)}
                >
                  <span className="tpp-pack-nombre">{ficha.variantes.etiqueta_individual || '1 unidad'}</span>
                  <span className="tpp-pack-precio">{formatPrecio(precioUnitario)}</span>
                </button>

                {packs.map(p => {
                  const conf = ficha.variantes.packs?.[String(p.id)] || {};
                  const unidades = Number(p.unidades) || 1;
                  const ahorro = ahorroDePack(p, precioUnitario);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`tpp-pack ${String(packId) === String(p.id) ? 'activa' : ''}`}
                      onClick={() => setPackId(p.id)}
                    >
                      {conf.badge && <span className="tpp-pack-badge">{conf.badge}</span>}
                      <span className="tpp-pack-nombre">
                        {p.nombre}
                        <small>{conf.subtitulo || `${unidades} unidades`}</small>
                      </span>
                      <span className="tpp-pack-precio">
                        {formatPrecio(p.precio_efectivo ?? p.precio)}
                        {ahorro != null && <small>Ahorrás {ahorro}%</small>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="tpp-panel tpp-acciones">
          {onAgregar && (
            <button type="button" className="tpp-cta" onClick={agregar} disabled={agotada}>
              {ficha.hero.cta_texto || 'Añadir al carrito'}
            </button>
          )}
          <button
            type="button"
            className={onAgregar ? 'tpp-cta-oscuro' : 'tpp-cta'}
            onClick={comprar}
            disabled={agotada}
          >
            {ficha.hero.cta_secundario || 'Comprar ahora'}
          </button>
          <div className="tpp-seguridad">
            <span><LockKeyhole size={13} /> Pago seguro</span>
            <span><Check size={13} /> Envío gratis</span>
            <span><Check size={13} /> Garantía incluida</span>
          </div>
        </div>
      </section>

      {/* 6 · Beneficios clave ─────────────────────────────────────── */}
      {ficha.beneficios.activo && (ficha.beneficios.items.length > 0 || previewMode) && (
        <section className="tpp-seccion tpp-seccion--fondo" style={{ paddingBlock: 0 }}>
          <div className="tpp-wrap">
            {ficha.beneficios.items.length === 0 ? (
              <p className="tpp-vacio" style={{ marginBlock: 28 }}>
                Beneficios activos y sin contenido. Se cargan en <b>Vista del producto</b>.
              </p>
            ) : (
              <div className="tpp-beneficios">
                {ficha.beneficios.items.map((b, i) => {
                  const Icono = getIconoBeneficio(b.icono);
                  return (
                    <div className="tpp-beneficio" key={i}>
                      <Icono size={25} />
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

      {/* 7 · Especificaciones técnicas ────────────────────────────── */}
      {ficha.especificaciones.activo
        && (specs.length > 0 || enLaCaja.length > 0 || previewMode) && (
        <section className="tpp-seccion tpp-wrap" id="tpp-specs">
          <TituloSeccion numero={7} texto={ficha.especificaciones.titulo} acento={vars['--tpp-accent']} onAccent={vars['--tpp-on-accent']} mostrarNumero={previewMode} />
          {specs.length === 0 && enLaCaja.length === 0 ? (
            <p className="tpp-vacio">
              Las especificaciones y el "en la caja" se cargan en <b>Mis Productos</b>, en la pestaña del rubro
              Tecnología, y sirven en todas tus landings.
            </p>
          ) : (
            <div className="tpp-specs-grid">
              {specs.length > 0 && (
                <div className="tpp-caja">
                  {specs.map((e, i) => (
                    <div className="tpp-spec-fila" key={i}>
                      <b>{e.clave}</b>
                      <span>{e.valor}</span>
                    </div>
                  ))}
                </div>
              )}
              {enLaCaja.length > 0 && (
                <div className="tpp-caja">
                  <b>{ficha.especificaciones.caja_titulo || 'En la caja'}</b>
                  {enLaCaja.map((linea, i) => (
                    <p className="tpp-caja-item" key={i}><Check size={14} /> {linea}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 8 · Contenido visual ─────────────────────────────────────── */}
      {ficha.multimedia.activo && (multimedia.length > 0 || previewMode) && (
        <section className="tpp-seccion tpp-seccion--fondo">
          <div className="tpp-wrap">
            <TituloSeccion numero={8} texto={ficha.multimedia.titulo} acento={vars['--tpp-accent']} onAccent={vars['--tpp-on-accent']} mostrarNumero={previewMode} />
            {multimedia.length === 0 ? (
              <p className="tpp-vacio">Agregá imágenes o videos adicionales desde <b>Vista del producto</b>.</p>
            ) : (
              <div className="tpp-media">
                {multimedia.map((m, i) => {
                  const video = analizarVideo(m.url);
                  // La portada: la que subió el comercio, o la que YouTube
                  // ya tiene del video. Vimeo no expone una por URL.
                  const portada = m.imagen ? getMediaUrl(m.imagen) : video?.miniatura || null;
                  const esVideo = !!video;

                  const contenido = (
                    <>
                      {portada
                        ? (
                          <img
                            src={portada}
                            alt=""
                            loading="lazy"
                            // Una portada que no carga (ruta mal escrita, link
                            // pegado en el campo equivocado) dejaba el ícono
                            // de imagen rota del navegador. Se esconde y se
                            // muestra el placeholder de la ficha.
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                        )
                        : null}
                      <span className="tpp-media-sinportada" aria-hidden="true"><ImageOff size={22} /></span>
                      {esVideo && <span className="tpp-media-play" aria-hidden="true"><Play size={18} fill="currentColor" /></span>}
                      <span>
                        {m.titulo || (video ? NOMBRE_PLATAFORMA[video.plataforma] : '')}
                        {video && !video.incrustable && <ExternalLink size={11} />}
                      </span>
                    </>
                  );

                  // Lo que se puede incrustar se abre acá mismo; el resto
                  // (Instagram, TikTok, X) solo permite incrustar con su
                  // script de rastreo, así que se abre en otra pestaña.
                  if (video?.incrustable) {
                    return (
                      <button
                        type="button"
                        className="tpp-media-card"
                        key={i}
                        onClick={() => setVideoAbierto(video)}
                        aria-label={`Reproducir ${m.titulo || NOMBRE_PLATAFORMA[video.plataforma]}`}
                      >
                        {contenido}
                      </button>
                    );
                  }

                  if (video) {
                    return (
                      <a
                        className="tpp-media-card"
                        key={i}
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {contenido}
                      </a>
                    );
                  }

                  return <div className="tpp-media-card" key={i}>{contenido}</div>;
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 9 · Comparación ──────────────────────────────────────────── */}
      {ficha.comparativa.activo && (comparativa.length > 0 || previewMode) && (
        <section className="tpp-seccion tpp-wrap">
          <TituloSeccion numero={9} texto={ficha.comparativa.titulo} acento={vars['--tpp-accent']} onAccent={vars['--tpp-on-accent']} mostrarNumero={previewMode} />
          {comparativa.length === 0 ? (
            <p className="tpp-vacio">
              La comparativa se carga en <b>Mis Productos → Vista del producto</b> (rubro Tecnología).
            </p>
          ) : (
            <div className="tpp-comparativa">
              {/* El duelo de fotos: la del producto contra la del rival. Solo
                  aparece si hay con qué compararla — sin la segunda imagen
                  sería una foto suelta, no una comparación. */}
              {(ficha.comparativa.imagen_otros || '').trim() && (
                <div className="tpp-duelo">
                  <figure>
                    <span className="tpp-duelo-foto">
                      <img
                        src={getMediaUrl((ficha.comparativa.imagen_nosotros || '').trim() || imagenPrincipalDeGaleria(item.imagenes) || '')}
                        alt={ficha.comparativa.nosotros}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    </span>
                    <figcaption className="es-nuestro">{ficha.comparativa.nosotros}</figcaption>
                  </figure>
                  <span className="tpp-duelo-vs" aria-hidden="true">VS</span>
                  <figure>
                    <span className="tpp-duelo-foto">
                      <img
                        src={getMediaUrl(ficha.comparativa.imagen_otros.trim())}
                        alt={ficha.comparativa.otros}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    </span>
                    <figcaption>{ficha.comparativa.otros}</figcaption>
                  </figure>
                </div>
              )}

              <div className="tpp-comparativa-fila tpp-comparativa-encabezado">
                <span>Característica</span>
                <span>{ficha.comparativa.nosotros}</span>
                <span>{ficha.comparativa.otros}</span>
              </div>
              {comparativa.map((c, i) => (
                <div className="tpp-comparativa-fila" key={i}>
                  <span>{c.caracteristica}</span>
                  <span className={c.nosotros ? 'tpp-comparativa-si' : 'tpp-comparativa-no'}>
                    {c.nosotros ? <Check size={17} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                  </span>
                  <span className={c.otros ? 'tpp-comparativa-si' : 'tpp-comparativa-no'}>
                    {c.otros ? <Check size={17} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 10 · Reseñas ─────────────────────────────────────────────── */}
      {ficha.resenas.activo && (ficha.resenas.items.length > 0 || previewMode) && (
        <section className="tpp-seccion tpp-seccion--fondo">
          <div className="tpp-wrap">
            <TituloSeccion numero={10} texto={ficha.resenas.titulo} acento={vars['--tpp-accent']} onAccent={vars['--tpp-on-accent']} mostrarNumero={previewMode} />
            {ficha.resenas.items.length === 0 ? (
              <p className="tpp-vacio">Cargá las opiniones de tus clientes desde <b>Vista del producto</b>.</p>
            ) : (
              <div className="tpp-resenas">
                {ficha.resenas.items.map((o, i) => (
                  <article className="tpp-resena" key={i}>
                    <div className="tpp-resena-avatar">
                      {o.foto ? <img src={getMediaUrl(o.foto)} alt="" /> : inicialesDe(o.nombre)}
                    </div>
                    <div>
                      <b>{o.nombre}</b>
                      <Estrellas valor={o.calificacion} tamano={12} />
                      <p>“{o.comentario}”</p>
                      {o.verificada && <small>✓ Compra verificada</small>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 11 · Preguntas frecuentes ────────────────────────────────── */}
      {ficha.faq.activo && (item.faq.length > 0 || previewMode) && (
        <section className="tpp-seccion tpp-wrap" id="tpp-faq">
          <TituloSeccion numero={11} texto={item.faqTitulo || ficha.faq.titulo} acento={vars['--tpp-accent']} onAccent={vars['--tpp-on-accent']} mostrarNumero={previewMode} />
          {item.faq.length === 0 ? (
            <p className="tpp-vacio">Cargá las preguntas desde esta misma sección, en el editor.</p>
          ) : (
            <div className="tpp-faq-grid">
              {item.faq.map((f, i) => (
                <div className={`tpp-faq-item ${preguntaAbierta === i ? 'abierta' : ''}`} key={i}>
                  <button type="button" onClick={() => setPreguntaAbierta(preguntaAbierta === i ? null : i)}>
                    <span>{f.pregunta}</span>
                    <ChevronDown size={17} />
                  </button>
                  {preguntaAbierta === i && <RichText text={f.respuesta} className="tpp-faq-respuesta" />}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 12 · Complementa tu compra ───────────────────────────────── */}
      {ficha.upsells.activo && item.relacionados.length > 0 && (
        <section className="tpp-seccion tpp-wrap">
          <TituloSeccion numero={12} texto={item.relacionadosTitulo || ficha.upsells.titulo} acento={vars['--tpp-accent']} onAccent={vars['--tpp-on-accent']} mostrarNumero={previewMode} />
          <div className="tpp-upsells">
            {item.relacionados.map(r => {
              const precioRel = r.precio ?? r.precio_efectivo ?? r.precio_base ?? null;
              const antes = r.precio_ancla ?? r.precio_tachado ?? null;
              const enOferta = antes != null && precioRel != null && Number(antes) > Number(precioRel);
              return (
                <div className="tpp-upsell" key={r.id}>
                  <div className="tpp-upsell-img">
                    <ImagenProductoHover
                      imagenes={(r.imagenes || []).map(getMediaUrl)}
                      imagen={r.imagen ? getMediaUrl(r.imagen) : null}
                      alt={r.nombre}
                      imgClassName="transition-opacity duration-500 ease-out"
                      fallback={<ImageOff size={20} />}
                    />
                  </div>
                  <div className="tpp-upsell-datos">
                    <b>{r.nombre}</b>
                    <span>
                      {precioRel != null && formatPrecio(precioRel)}
                      {enOferta && <del>{formatPrecio(antes)}</del>}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="tpp-upsell-cta"
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

      {/* 13 · Garantía y devoluciones ─────────────────────────────── */}
      {ficha.garantias.activo && ficha.garantias.items.length > 0 && (
        <section className="tpp-garantias">
          <div className="tpp-wrap tpp-garantias-grid">
            {ficha.garantias.items.map((g, i) => {
              const Icono = getIconoBeneficio(g.icono);
              return (
                <div className="tpp-garantia" key={i}>
                  <Icono size={22} />
                  <b>{g.titulo}</b>
                  {g.texto && <small>{g.texto}</small>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 14 · Cierre y urgencia ───────────────────────────────────── */}
      {ficha.cta_final.activo && (
        <section className="tpp-cierre">
          <div className="tpp-wrap tpp-cierre-inner">
            <div className="tpp-cierre-copy">
              {ficha.cta_final.etiqueta && <small>{ficha.cta_final.etiqueta}</small>}
              {ficha.cta_final.texto && <p>{ficha.cta_final.texto}</p>}
            </div>
            {ficha.cta_final.contador.activo && (
              <Contador desde={ficha.cta_final.contador} enCierre />
            )}
            <button type="button" className="tpp-cierre-cta" onClick={irACompra}>
              {ficha.cta_final.cta_texto || 'Comprar ahora'}
              {ficha.cta_final.cta_nota && <small>{ficha.cta_final.cta_nota}</small>}
            </button>
          </div>
        </section>
      )}

      {contacto && <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={vars['--tpp-border']} isMobile={isMobile} />}
      <StoreFooterLegal tema={t} bordeSuave={vars['--tpp-border']} nombreComercio={nombreComercio} isPreview={previewMode} />

      {/* Va por portal a <body> a propósito: el preview del armador vive
          dentro de un `transform: scale(...)`, y un `position: fixed` cuyo
          ancestro tiene transform se ancla A ESE ANCESTRO, no a la pantalla
          — el video quedaba escalado y fuera de vista. En móvil/tablet el
          preview además recorta con overflow:hidden. */}
      {videoAbierto && createPortal((
        <div
          className="tpp-lightbox"
          style={vars}
          role="dialog"
          aria-modal="true"
          aria-label="Video del producto"
          onClick={() => setVideoAbierto(null)}
        >
          <button type="button" className="tpp-lightbox-cerrar" onClick={() => setVideoAbierto(null)} aria-label="Cerrar video">
            <X size={20} />
          </button>
          <div className="tpp-lightbox-marco" onClick={e => e.stopPropagation()}>
            {videoAbierto.tipo === 'video' ? (
              <video src={videoAbierto.embed} controls playsInline />
            ) : (
              <iframe
                src={videoAbierto.embed}
                title="Video del producto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>
      ), document.body)}

      {/* Barra fija de compra en móvil: el CTA principal queda arriba del
          pliegue y se pierde al recorrer las 14 secciones. */}
      <div className="tpp-barra-movil">
        <div className="tpp-barra-movil-precio">
          <b>{precio != null ? formatPrecio(precio) : ''}</b>
          {(pack || variante) && <small>{pack ? pack.nombre : variante.nombre}</small>}
        </div>
        <button type="button" className="tpp-cta" onClick={irACompra}>
          {ficha.hero.cta_texto || 'Añadir al carrito'}
        </button>
      </div>
    </div>
  );
}

/* ── Piezas internas ──────────────────────────────────────────────── */

function TituloSeccion({ numero, texto, acento, onAccent, mostrarNumero = false }) {
  if (!texto) return null;
  return (
    <div className="tpp-seccion-titulo">
      {mostrarNumero && (
        <span
          aria-hidden="true"
          style={{
            display: 'grid', placeItems: 'center', width: 26, height: 26,
            borderRadius: '50%', background: acento, color: onAccent,
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
    <span className="tpp-estrellas" aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={tamano} fill={n <= llenas ? 'currentColor' : 'none'} strokeWidth={1.6} />
      ))}
    </span>
  );
}

const dosDigitos = (n) => String(Math.max(0, n)).padStart(2, '0');

/**
 * Contador decorativo: arranca en el tiempo configurado cada vez que
 * alguien abre la página y baja hasta cero, donde se queda. No hay una
 * fecha límite real detrás — es la misma decisión que se tomó en la ficha
 * de Fitness: la alternativa (fecha de fin) exige que alguien la mantenga o
 * el contador queda apagado para siempre.
 */
function Contador({ desde, titulo = null, enCierre = false }) {
  const total = useMemo(() => Math.max(0,
    (Number(desde.dias) || 0) * 86400
    + (Number(desde.horas) || 0) * 3600
    + (Number(desde.minutos) || 0) * 60
    + (Number(desde.segundos) || 0)
  ), [desde.dias, desde.horas, desde.minutos, desde.segundos]);

  const [restante, setRestante] = useState(total);

  useEffect(() => { setRestante(total); }, [total]);

  useEffect(() => {
    if (restante <= 0) return undefined;
    const id = setInterval(() => setRestante(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [restante > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const cajas = [
    ['Días', Math.floor(restante / 86400)],
    ['Horas', Math.floor((restante % 86400) / 3600)],
    ['Min', Math.floor((restante % 3600) / 60)],
    ['Seg', restante % 60],
  ];

  if (enCierre) {
    return (
      <div className="tpp-cierre-timer">
        {cajas.map(([label, valor]) => (
          <span className="tpp-cierre-timer-caja" key={label}>
            <b>{dosDigitos(valor)}</b>
            <small>{label}</small>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="tpp-contador">
      {titulo && <p className="tpp-contador-titulo">{titulo}</p>}
      <div className="tpp-contador-cajas">
        {cajas.map(([label, valor]) => (
          <span className="tpp-contador-caja" key={label}>
            <b>{dosDigitos(valor)}</b>
            <small>{label}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Paleta completa a partir de los tres colores que el comercio edita
 * (fondo/texto/acento). Todo lo demás se DERIVA — no hay un solo color
 * literal en el CSS. Es lo que permite que la estructura sea fija y el
 * diseño siga siendo del comercio.
 *
 * Misma lógica que la ficha de Fitness, incluidos los umbrales de
 * contraste, para que las dos se comporten igual ante una paleta rara.
 */
function calcularVariables(t) {
  const { fondo, texto, acento } = t;
  // contraste(x, blanco) es ALTO cuando x es oscuro. El umbral 3 separa
  // las dos familias de paletas.
  const fondoEsOscuro = contraste(fondo, '#FFFFFF') >= 3;
  // Se prefiere blanco mientras llegue a 3:1 (mínimo AA para texto grande
  // en negrita, que es lo único que se pinta sobre el acento). Cuando no
  // llega, se cae a texto oscuro: si no, el botón queda ilegible.
  // Ver comentario en BasicoProductPage.jsx: elegir el color de MÁS
  // contraste de los dos, no un corte binario, evita textos casi
  // invisibles con acentos de luminancia media.
  const sobre = (color) => (contraste(color, '#FFFFFF') >= contraste(color, '#111111') ? '#FFFFFF' : '#111111');

  const band = fondoEsOscuro ? componer(texto, 0.10, fondo) : componer(texto, 0.93, fondo);
  const onBand = sobre(band);

  return {
    '--tpp-bg': fondo,
    '--tpp-fg': texto,
    '--tpp-accent': acento,
    '--tpp-on-accent': sobre(acento),
    '--tpp-accent-suave': hexToRgba(acento, 0.14),
    '--tpp-accent-halo': hexToRgba(acento, 0.16),
    '--tpp-accent-sombra': componer('#000000', 0.32, acento),
    '--tpp-muted': componer(texto, 0.62, fondo),
    '--tpp-border': hexToRgba(texto, 0.12),
    '--tpp-border-fuerte': hexToRgba(texto, 0.22),
    '--tpp-surface': hexToRgba(texto, 0.07),
    '--tpp-surface-suave': hexToRgba(texto, 0.03),
    // Las tarjetas se despegan del cuerpo en la dirección que corresponda:
    // en oscuro un escalón hacia el texto, en claro hacia el blanco.
    '--tpp-card': fondoEsOscuro ? componer(texto, 0.05, fondo) : componer('#FFFFFF', 0.7, fondo),
    '--tpp-band': band,
    '--tpp-on-band': onBand,
    // Velo sobre las miniaturas de multimedia: siempre oscuro con texto
    // blanco, porque va encima de una foto cualquiera y no del fondo.
    '--tpp-velo': 'rgba(0,0,0,0.62)',
    '--tpp-on-velo': '#FFFFFF',
    '--tpp-velo-claro': hexToRgba(sobre(acento) === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.16),
    // El tilde de la comparativa va en verde en cualquier paleta: es una
    // convención que se lee de un vistazo, igual que el dorado de las
    // estrellas. Teñirlo con el acento lo vuelve irreconocible.
    '--tpp-ok': '#3FA84A',
    '--tpp-estrella': '#F0A82A',
  };
}
