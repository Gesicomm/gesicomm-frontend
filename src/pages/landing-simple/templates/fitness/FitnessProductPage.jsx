import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ImageOff, ShoppingCart, Star, Check, X,
} from 'lucide-react';
import { getMediaUrl } from '../../../../services/api';
import { formatPrecio } from '../../../../lib/mensajeWhatsapp';
import { getIconoBeneficio } from '../iconosBeneficios';
import { hexToRgba, componer, contraste, resolverTemaPorSlug, textoLegible, ajustarLegible } from '../themeUtils';
import { ahorroDePack, inicialesDe, numeroDeSeccion as n } from './fichaFitness';
import { RedesSocialesFooter, ImagenProductoHover } from '../sections';
import {
  MediaProducto, MiniaturaMediaProducto, normalizarGaleriaProducto, claveMedioProducto,
} from '../mediaGaleria';
import StoreFooterLegal from '../../../landing/StoreFooterLegal';
import RichText from '../../../../components/RichText';
import BarraMarquee from '../BarraMarquee';
import ContadorUrgencia from '../contadorUrgencia';
import ComparadorAntesDespues, { FotoAntesDespuesCombinada } from '../comparadorAntesDespues';
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
 * `previewMode` solo muestra ayudas del editor: evita navegar fuera del
 * editor y muestra carteles en las secciones prendidas pero vacías. La
 * landing publicada conserva el mismo contenido sin esas guías.
 *
 * La estructura es fija y el contenido es editable — ver fichaFitness.js
 * para de dónde sale cada sección y cómo se agrupa en el panel.
 * Ningún texto visible al cliente está escrito acá salvo rótulos de
 * interfaz ("Seleccionado", "Volver al catálogo").
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
  const [preguntaAbierta, setPreguntaAbierta] = useState(0);
  const [suscripcion, setSuscripcion] = useState(false);
  const [ingredienteActivo, setIngredienteActivo] = useState(0);
  const [pasoActivo, setPasoActivo] = useState(0);

  const t = resolverTemaPorSlug(tema, templateSlug);
  const colorCta = ficha?.compra?.cta_color || '';
  const vars = useMemo(() => calcularVariables(t, colorCta), [t.fondo, t.texto, t.acento, colorCta]);

  const packs = item?.packs || [];
  const packElegido = packs.find(p => String(p.id) === String(packElegidoId)) || null;

  // El precio que se muestra en la barra fija sigue al paquete elegido,
  // igual que en el checkout — si no hay ninguno, el del producto.
  const precioMostrado = packElegido ? Number(packElegido.precio_efectivo ?? packElegido.precio) : item?.precio;

  useEffect(() => {
    if (packElegidoId && !packs.some(p => String(p.id) === String(packElegidoId))) setPackElegidoId(null);
  }, [packs, packElegidoId]);

  useEffect(() => { setIndiceImagen(0); }, [item?.nombre]);

  const galeria = useMemo(() => normalizarGaleriaProducto(item?.imagenes || []), [item?.imagenes]);
  // Solo fotos: lo que se usa de respaldo en las secciones con imagen
  // (proceso, ingredientes, por qué elegirnos). Un video no sirve de foto.
  const fotos = useMemo(() => galeria.filter(m => m.tipo === 'imagen').map(m => m.url), [galeria]);

  if (!item) return null;

  const irAOfertas = () => {
    const destino = document.getElementById('fpp-oferta');
    if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else comprar();
  };

  // Firma única en las tres fichas: siempre un objeto con lo elegido. Así
  // el editor y la landing publicada consumen lo mismo sin adivinar tipos.
  const comprar = () => onComprar && onComprar({ variante: null, pack: packElegido, precio: precioMostrado });

  const medioActual = galeria[indiceImagen] || galeria[0] || null;
  const moverImagen = (delta) => setIndiceImagen(i => (i + delta + galeria.length) % galeria.length);
  const fotoDeRespaldo = (i = 0) => (fotos.length ? fotos[i % fotos.length] : null);

  // El diseño supone un título corto, pero los nombres reales del catálogo
  // son descriptivos ("AdelFit - Suplemento natural para bajar de peso y
  // controlar el apetito"). El CSS no puede medir el largo del texto, así
  // que se decide acá y el tamaño lo baja una clase.
  const tituloTexto = `${ficha.hero.titulo || item.nombre} ${ficha.hero.titulo_destacado || ''}`.trim();
  const claseTitulo = tituloTexto.length > 80 ? 'es-muy-largo' : tituloTexto.length > 44 ? 'es-largo' : '';

  const promesa = ficha.hero.lead || item.descripcion;
  const garantias = ficha.garantias.activo ? ficha.garantias.items.filter(g => g.titulo) : [];
  const mostrarOfertas = ficha.ofertas.activo && packs.length > 0;

  const ingredientes = ficha.ingredientes.items;
  const ingrediente = ingredientes[Math.min(ingredienteActivo, ingredientes.length - 1)] || null;
  const pasos = ficha.como_funciona.pasos;
  // La tira de fotos usa las opiniones cargadas en su sección: se apaga si
  // se apaga cualquiera de las dos.
  // Primero las fotos subidas en la propia sección (solo de esta landing);
  // si no hay, las opiniones con foto del producto.
  const fotosPropias = ficha.galeria_clientes.items.filter(o => o.foto);
  const opinionesConFoto = !ficha.galeria_clientes.activo
    ? []
    : fotosPropias.length
      ? fotosPropias
      : (ficha.opiniones.activo ? ficha.opiniones.items.filter(o => o.foto) : []);
  // La sección de abajo es la de los comentarios: una opinión que es solo
  // una foto ya se ve en la tira del encabezado.
  const opinionesConTexto = ficha.opiniones.items.filter(o => o.comentario?.trim());

  const nombreNosotros = ficha.comparativa.nosotros || nombreComercio || 'Nosotros';

  return (
    <div className={`fpp-root ${isMobile ? 'es-movil' : ''}`} style={vars}>
      {/* 1 · Contador superior ────────────────────────────────────── */}
      {ficha.urgencia.activo && (
        <div className="fpp-urgencia fpp-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="urgencia" />
          {ficha.urgencia.texto && <span>{ficha.urgencia.texto}</span>}
          <ContadorUrgencia desde={ficha.urgencia} className="fpp-contador" />
        </div>
      )}

      {/* 2 · Cinta de beneficios ──────────────────────────────────── */}
      {ficha.anuncio.activo && ficha.anuncio.items.length > 0 && (
        <div className="fpp-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="anuncio" />
          <BarraMarquee
            className="fpp-anuncio"
            items={ficha.anuncio.items}
            animado={ficha.anuncio.animado !== false}
            velocidad={ficha.anuncio.velocidad}
            separador={ficha.anuncio.separador}
            renderItem={(a, i) => {
              const Icono = a.icono ? getIconoBeneficio(a.icono) : null;
              return (
                <span className="fpp-anuncio-item" key={i}>
                  {Icono && <Icono size={14} />} {a.texto}
                </span>
              );
            }}
            cta={ficha.anuncio.cta_texto ? (
              <button type="button" className="fpp-anuncio-cta" onClick={irAOfertas}>
                {ficha.anuncio.cta_texto}
              </button>
            ) : null}
          />
        </div>
      )}

      {onVolver && (
        <div className="fpp-wrap">
          <button type="button" className="fpp-volver" onClick={onVolver}>
            <ArrowLeft size={15} /> Volver al catálogo
          </button>
        </div>
      )}

      {/* 3 · Encabezado ───────────────────────────────────────────── */}
      <section className="fpp-hero fpp-wrap fpp-preview-section" id="fpp-hero">
        <MarcadorPreview previewMode={previewMode} seccion="hero" />
        <div className="fpp-galeria">
          <div className={`fpp-galeria-principal ${medioActual ? '' : 'vacia'}`}>
            {medioActual
              ? <div className="lsp-media-frame"><MediaProducto medio={medioActual} alt={item.nombre} /></div>
              : <ImageOff size={44} />}
            {item.descuentoPct > 0 && <span className="fpp-galeria-descuento">-{item.descuentoPct}%</span>}
            {galeria.length > 1 && (
              <>
                <button type="button" aria-label="Imagen anterior" className="fpp-galeria-flecha izq" onClick={() => moverImagen(-1)}>
                  <ChevronLeft size={20} />
                </button>
                <button type="button" aria-label="Imagen siguiente" className="fpp-galeria-flecha der" onClick={() => moverImagen(1)}>
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
          {galeria.length > 1 && (
            <div className="fpp-miniaturas">
              {galeria.map((medio, i) => (
                <button
                  type="button"
                  key={claveMedioProducto(medio, i)}
                  className={`fpp-miniatura ${i === indiceImagen ? 'activa' : ''}`}
                  onClick={() => setIndiceImagen(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                >
                  <MiniaturaMediaProducto medio={medio} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`fpp-hero-copy ${claseTitulo}`}>
          {/* 4 · Calificación */}
          {ficha.prueba_social.activo && (
            <div className="fpp-calificacion">
              <Estrellas valor={ficha.prueba_social.calificacion} tamano={17} />
              <b>{Number(ficha.prueba_social.calificacion).toFixed(1)}/5</b>
              {ficha.prueba_social.resenas_texto && <span>{ficha.prueba_social.resenas_texto}</span>}
            </div>
          )}

          {(ficha.hero.eyebrow || item.categoria) && (
            <p className="fpp-eyebrow">{ficha.hero.eyebrow || item.categoria}</p>
          )}

          <h1>
            {ficha.hero.titulo || item.nombre}
            {ficha.hero.titulo_destacado && <> <em>{ficha.hero.titulo_destacado}</em></>}
          </h1>

          {(ficha.hero.lead_resaltado || promesa) && (
            <div className="fpp-lead">
              {ficha.hero.lead_resaltado && <mark>{ficha.hero.lead_resaltado}</mark>}
              {promesa && <RichText text={promesa} />}
            </div>
          )}

          {/* 5 · Beneficios con ícono */}
          {ficha.beneficios.activo && (ficha.beneficios.items.length > 0 ? (
            <div className="fpp-features">
              {ficha.beneficios.items.map((b, i) => {
                const Icono = getIconoBeneficio(b.icono);
                return (
                  <div className="fpp-feature" key={i}>
                    <span className="fpp-feature-icono"><Icono size={19} /></span>
                    <div>
                      <strong>{b.titulo}</strong>
                      {b.texto && <p>{b.texto}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : previewMode ? (
            <p className="fpp-vacio">Los beneficios se cargan en <b>Vista del producto</b> o en la sección {n('beneficios')} de la ficha.</p>
          ) : null)}

          {/* 6 · Packs */}
          <div className="fpp-oferta" id="fpp-oferta">
            {mostrarOfertas ? (
              <>
                {ficha.ofertas.titulo && <h3>{ficha.ofertas.titulo}</h3>}
                <div className={`fpp-packs cantidad-${Math.min(packs.length + 1, 4)}`}>
                  <TarjetaPack
                    elegido={!packElegido}
                    badge={ficha.ofertas.badge_individual}
                    nombre={ficha.ofertas.etiqueta_individual || '1 unidad'}
                    subtitulo={ficha.ofertas.subtitulo_individual}
                    imagen={fotoDeRespaldo(0)}
                    precio={item.precio}
                    precioAntes={item.precioAntes}
                    onElegir={() => setPackElegidoId(null)}
                  />
                  {packs.map(pack => {
                    const conf = ficha.ofertas.packs?.[String(pack.id)] || {};
                    const unidades = Number(pack.unidades) || 1;
                    const total = Number(pack.precio_efectivo ?? pack.precio) || 0;
                    const sinPack = item.precio != null ? Number(item.precio) * unidades : null;
                    return (
                      <TarjetaPack
                        key={pack.id}
                        elegido={String(packElegidoId) === String(pack.id)}
                        badge={conf.badge}
                        nombre={pack.nombre}
                        subtitulo={conf.subtitulo || `${unidades} unidades`}
                        imagen={pack.imagen || conf.imagen || fotoDeRespaldo(0)}
                        precio={total}
                        precioAntes={sinPack != null && sinPack > total ? sinPack : null}
                        ahorro={ahorroDePack(pack, item.precio)}
                        textoAhorro={ficha.ofertas.texto_ahorro}
                        onElegir={() => setPackElegidoId(pack.id)}
                      />
                    );
                  })}
                </div>

                {ficha.ofertas.suscripcion.activo && (
                  <label className="fpp-suscripcion">
                    <input type="checkbox" checked={suscripcion} onChange={e => setSuscripcion(e.target.checked)} />
                    <span>
                      <b>{ficha.ofertas.suscripcion.titulo || 'Suscribite y ahorrá'}</b>
                      {ficha.ofertas.suscripcion.detalle && <small>{ficha.ofertas.suscripcion.detalle}</small>}
                    </span>
                  </label>
                )}
              </>
            ) : (
              <>
                {previewMode && ficha.ofertas.activo && (
                  <p className="fpp-vacio">
                    Sin paquetes cargados: se muestra el precio suelto. Los paquetes se crean en la
                    pestaña <b>Venta</b> del producto y aparecen acá como tarjetas.
                  </p>
                )}
                {item.precio != null && (
                  <p className="fpp-precio">
                    <b>{formatPrecio(item.precio)}</b>
                    {item.precioAntes != null && <del>{formatPrecio(item.precioAntes)}</del>}
                    {item.descuentoPct > 0 && <span>-{item.descuentoPct}%</span>}
                  </p>
                )}
              </>
            )}

            <button type="button" className="fpp-comprar" onClick={comprar}>
              <span className="fpp-comprar-texto"><ShoppingCart size={21} /> {ficha.compra.cta_texto || 'Comprar ahora'}</span>
              {ficha.compra.microcopy && <small>{ficha.compra.microcopy}</small>}
            </button>

            {/* 7 · Sellos bajo el botón */}
            {garantias.length > 0 && (
              <div className="fpp-sellos">
                {garantias.map((g, i) => {
                  const Icono = getIconoBeneficio(g.icono);
                  return (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="fpp-sellos-sep" aria-hidden="true" />}
                      <span className="fpp-sello"><Icono size={15} /> {g.titulo}</span>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* Opiniones, versión fotos: "Ellos ya lo probaron…" */}
          {opinionesConFoto.length > 0 && (
            <div className="fpp-ugc">
              {(ficha.galeria_clientes.titulo || ficha.galeria_clientes.titulo_destacado) && (
                <p className="fpp-ugc-titulo">
                  {ficha.galeria_clientes.titulo}
                  {ficha.galeria_clientes.titulo_destacado && <> <em>{ficha.galeria_clientes.titulo_destacado}</em></>}
                </p>
              )}
              <div className="fpp-ugc-tira">
                {opinionesConFoto.map((o, i) => <TarjetaCliente key={i} opinion={o} />)}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 8 · Proceso y resultados ─────────────────────────────────── */}
      {ficha.como_funciona.activo && (pasos.length > 0 || ficha.como_funciona.imagen || previewMode) && (
        <section className="fpp-banda fpp-preview-section" id="fpp-proceso">
          <MarcadorPreview previewMode={previewMode} seccion="como_funciona" />
          <div className="fpp-wrap fpp-proceso">
            <div>
              <Encabezado
                eyebrow={ficha.como_funciona.eyebrow}
                titulo={ficha.como_funciona.titulo}
                destacado={ficha.como_funciona.titulo_destacado}
                saltoDeLinea
                alinear="izq"
              />
              {pasos.length === 0 ? (!previewMode ? null :
                <p className="fpp-vacio">Cargá los pasos en <b>Vista del producto</b> o en la sección {n('como_funciona')}.</p>
              ) : (
                <ol className="fpp-timeline">
                  {pasos.map((p, i) => (
                    <li key={i} className={i === pasoActivo ? 'actual' : ''}>
                      <button type="button" onClick={() => setPasoActivo(i)}>
                        <span className="fpp-timeline-num">{i + 1}</span>
                        <span>
                          <b>{p.titulo}</b>
                          {p.texto && <> · {p.texto}</>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <Foto src={ficha.como_funciona.imagen || fotoDeRespaldo(0)} alt="" className="fpp-proceso-foto" />
          </div>
        </section>
      )}

      {/* 9 · Ingredientes ─────────────────────────────────────────── */}
      {ficha.ingredientes.activo && (ingredientes.length > 0 || previewMode) && (
        <section className="fpp-seccion fpp-wrap fpp-preview-section" id="fpp-ingredientes">
          <MarcadorPreview previewMode={previewMode} seccion="ingredientes" />
          <Encabezado
            eyebrow={ficha.ingredientes.eyebrow}
            titulo={ficha.ingredientes.titulo}
            destacado={ficha.ingredientes.titulo_destacado}
            subtitulo={ficha.ingredientes.subtitulo}
          />
          {!ingrediente ? (
            <p className="fpp-vacio">Agregá los ingredientes desde <b>Vista del producto</b> o en la sección {n('ingredientes')}.</p>
          ) : (
            <>
              <div className="fpp-ing-tabs" role="tablist">
                {ingredientes.map((ing, i) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={ing === ingrediente}
                    key={i}
                    className={ing === ingrediente ? 'activo' : ''}
                    onClick={() => setIngredienteActivo(i)}
                  >
                    {ing.nombre || `Ingrediente ${i + 1}`}
                  </button>
                ))}
              </div>
              <div className="fpp-ing-contenido">
                {ingrediente.imagen ? (
                  <Foto src={ingrediente.imagen} alt={ingrediente.nombre} className="fpp-ing-foto" />
                ) : (
                  <div className="fpp-ing-foto fpp-ing-foto--icono">
                    {React.createElement(getIconoBeneficio(ingrediente.icono || 'leaf'), { size: 64, strokeWidth: 1.4 })}
                  </div>
                )}
                <div>
                  <h3>
                    {ingrediente.nombre}
                    {ingrediente.dosis && <small>{ingrediente.dosis}</small>}
                  </h3>
                  {ingrediente.texto && <p>{ingrediente.texto}</p>}
                  {ficha.ingredientes.frase && <div className="fpp-frase">{ficha.ingredientes.frase}</div>}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* 10 · Por qué elegirnos ───────────────────────────────────── */}
      {ficha.estadisticas.activo && (ficha.estadisticas.items.length > 0 || previewMode) && (
        <section className="fpp-suave fpp-preview-section" id="fpp-estadisticas">
          <MarcadorPreview previewMode={previewMode} seccion="estadisticas" />
          <div className="fpp-wrap fpp-estadisticas">
            <div>
              <Encabezado
                eyebrow={ficha.estadisticas.eyebrow}
                titulo={ficha.estadisticas.titulo}
                destacado={ficha.estadisticas.titulo_destacado}
                subtitulo={ficha.estadisticas.texto}
                alinear="izq"
              />
              {ficha.estadisticas.items.length === 0 ? (
                <p className="fpp-vacio">Cargá cifras reales (por ejemplo, de una encuesta a tus clientes) en la sección {n('estadisticas')}.</p>
              ) : (
                <div className="fpp-stats">
                  {ficha.estadisticas.items.map((s, i) => (
                    <div key={i}>
                      <b>{s.valor}</b>
                      <span>{s.texto}</span>
                    </div>
                  ))}
                </div>
              )}
              {ficha.estadisticas.nota && <p className="fpp-nota">{ficha.estadisticas.nota}</p>}
            </div>
            <Foto src={ficha.estadisticas.imagen || fotoDeRespaldo(2)} alt="" className="fpp-estadisticas-foto" />
          </div>
        </section>
      )}

      {/* 11 · Antes y después ─────────────────────────────────────── */}
      {ficha.antes_despues.activo && (ficha.antes_despues.imagen_combinada || ficha.antes_despues.imagen_antes || ficha.antes_despues.imagen_despues || previewMode) && (
        <section className="fpp-lavado fpp-preview-section" id="fpp-antes-despues">
          <MarcadorPreview previewMode={previewMode} seccion="antes_despues" />
          <div className="fpp-wrap fpp-seccion">
            <Encabezado
              eyebrow={ficha.antes_despues.eyebrow}
              titulo={ficha.antes_despues.titulo}
              destacado={ficha.antes_despues.titulo_destacado}
              subtitulo={ficha.antes_despues.subtitulo}
            />
            <div className="fpp-ad">
              <div className="fpp-ad-copy">
                {ficha.antes_despues.bloque_titulo && <h3>{ficha.antes_despues.bloque_titulo}</h3>}
                {ficha.antes_despues.texto && <p>{ficha.antes_despues.texto}</p>}
                {ficha.antes_despues.puntos.filter(Boolean).length > 0 && (
                  <ul>
                    {ficha.antes_despues.puntos.filter(Boolean).map((punto, i) => (
                      <li key={i}><Check size={15} /> {punto}</li>
                    ))}
                  </ul>
                )}
              </div>
              {ficha.antes_despues.imagen_combinada ? (
                <FotoAntesDespuesCombinada
                  className="fpp-ad-fotos"
                  src={ficha.antes_despues.imagen_combinada}
                  etiquetaAntes={ficha.antes_despues.etiqueta_antes}
                  etiquetaDespues={ficha.antes_despues.etiqueta_despues}
                />
              ) : (
                <ComparadorAntesDespues
                  className="fpp-ad-fotos"
                  antes={ficha.antes_despues.imagen_antes}
                  despues={ficha.antes_despues.imagen_despues}
                  etiquetaAntes={ficha.antes_despues.etiqueta_antes}
                  etiquetaDespues={ficha.antes_despues.etiqueta_despues}
                  previewMode={previewMode}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* 12 · Tabla comparativa ───────────────────────────────────── */}
      {ficha.comparativa.activo && (ficha.comparativa.items.length > 0 || previewMode) && (
        <section className="fpp-seccion fpp-wrap fpp-preview-section" id="fpp-comparativa">
          <MarcadorPreview previewMode={previewMode} seccion="comparativa" />
          <Encabezado
            eyebrow={ficha.comparativa.eyebrow}
            titulo={ficha.comparativa.titulo}
            destacado={ficha.comparativa.titulo_destacado}
            subtitulo={ficha.comparativa.subtitulo}
          />
          {ficha.comparativa.items.length === 0 ? (
            <p className="fpp-vacio">Agregá las filas de la comparación en la sección {n('comparativa')}.</p>
          ) : (
            <div className="fpp-tabla" role="table">
              <div className="fpp-tabla-fila fpp-tabla-cabecera" role="row">
                <b role="columnheader">{ficha.comparativa.columna_beneficio}</b>
                <b role="columnheader">{nombreNosotros}</b>
                <b role="columnheader">{ficha.comparativa.otros}</b>
              </div>
              {ficha.comparativa.items.map((fila, i) => (
                <div className="fpp-tabla-fila" role="row" key={i}>
                  <span role="cell">{fila.caracteristica}</span>
                  <strong role="cell"><Check size={15} /> {fila.nosotros || 'Sí'}</strong>
                  <span role="cell" className="fpp-tabla-otros"><X size={13} /> {fila.otros || 'No'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 13 · Opiniones ───────────────────────────────────────────── */}
      {ficha.opiniones.activo && (opinionesConTexto.length > 0 || previewMode) && (
        <section className="fpp-lavado fpp-preview-section" id="fpp-opiniones">
          <MarcadorPreview previewMode={previewMode} seccion="opiniones" />
          <div className="fpp-wrap fpp-seccion">
            <Encabezado eyebrow={ficha.opiniones.eyebrow} titulo={ficha.opiniones.titulo} />
            {opinionesConTexto.length === 0 ? (
              <p className="fpp-vacio">Cargá las opiniones de tus clientes (con comentario) desde <b>Vista del producto</b> o en la sección {n('opiniones')}.</p>
            ) : (
              <div className="fpp-opiniones">
                {opinionesConTexto.map((o, i) => (
                  <article className="fpp-opinion" key={i}>
                    <Estrellas valor={o.calificacion} tamano={14} />
                    <p>“{o.comentario}”</p>
                    <footer>
                      <span className="fpp-opinion-cara">
                        {o.foto ? <img src={getMediaUrl(o.foto)} alt="" /> : inicialesDe(o.nombre)}
                      </span>
                      <b>{o.nombre}</b>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 14 · Preguntas frecuentes ────────────────────────────────── */}
      {ficha.faq.activo && (item.faq.length > 0 || previewMode) && (
        <section className="fpp-seccion fpp-wrap fpp-faq fpp-preview-section" id="fpp-faq">
          <MarcadorPreview previewMode={previewMode} seccion="faq" />
          {/* faqTitulo es el título que el comercio escribió para las
              preguntas de este producto (lo comparten todos los templates).
              Si existe manda, y entonces no se le pega el destacado. */}
          <Encabezado
            eyebrow={ficha.faq.eyebrow}
            titulo={item.faqTitulo || ficha.faq.titulo}
            destacado={item.faqTitulo ? '' : ficha.faq.titulo_destacado}
            alinear="izq"
          />
          {item.faq.length === 0 ? (
            <p className="fpp-vacio">Las preguntas se cargan en <b>Vista del producto</b> o en la sección {n('faq')}.</p>
          ) : (
            <div className="fpp-faq-lista">
              {item.faq.map((f, i) => (
                <div className={`fpp-faq-item ${preguntaAbierta === i ? 'abierta' : ''}`} key={i}>
                  <button
                    type="button"
                    aria-expanded={preguntaAbierta === i}
                    onClick={() => setPreguntaAbierta(preguntaAbierta === i ? null : i)}
                  >
                    <span>{f.pregunta}</span>
                    <ChevronDown size={18} />
                  </button>
                  {preguntaAbierta === i && <div className="fpp-faq-respuesta"><RichText text={f.respuesta} /></div>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 15 · Productos complementarios ───────────────────────────── */}
      {ficha.upsells.activo && item.relacionados.length > 0 && (
        <section className="fpp-seccion fpp-wrap fpp-preview-section" id="fpp-upsells">
          <MarcadorPreview previewMode={previewMode} seccion="upsells" />
          <Encabezado titulo={item.relacionadosTitulo || ficha.upsells.titulo} />
          <div className="fpp-upsells">
            {item.relacionados.map(r => {
              const precio = r.precio ?? r.precio_efectivo ?? r.precio_base ?? null;
              const antes = r.precio_ancla ?? r.precio_tachado ?? null;
              const enOferta = antes != null && precio != null && Number(antes) > Number(precio);
              return (
                <div className="fpp-upsell" key={r.id}>
                  <div className="fpp-upsell-img">
                    <ImagenProductoHover
                      imagenes={(r.imagenes || []).map(getMediaUrl)}
                      imagen={r.imagen ? getMediaUrl(r.imagen) : null}
                      alt={r.nombre}
                      imgClassName="transition-opacity duration-500 ease-out"
                      fallback={<ImageOff size={22} />}
                    />
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

      {/* 16 · Franja de cierre ────────────────────────────────────── */}
      {ficha.cta_final.activo && (ficha.cta_final.titulo || ficha.cta_final.texto) && (
        <div className="fpp-cierre fpp-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="cta_final" />
          <div className="fpp-wrap fpp-cierre-inner">
            {ficha.cta_final.titulo && <b>{ficha.cta_final.titulo}</b>}
            {ficha.cta_final.texto && <span>{ficha.cta_final.texto}</span>}
          </div>
        </div>
      )}

      {contacto && <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={vars['--fpp-line']} isMobile={isMobile} />}
      <StoreFooterLegal tema={{ ...t, texto: vars['--fpp-fg'] }} bordeSuave={vars['--fpp-line']} nombreComercio={nombreComercio} isPreview={previewMode} />

      {/* Barra fija de compra — solo en móvil (la muestra el CSS). El botón
          principal queda arriba del pliegue y el cliente lo pierde al
          scrollear por las secciones. */}
      <div className="fpp-barra-movil">
        <div className="fpp-barra-movil-precio">
          <b>{precioMostrado != null ? formatPrecio(precioMostrado) : ''}</b>
          {packElegido && <small>{packElegido.nombre}</small>}
        </div>
        <button type="button" className="fpp-comprar fpp-comprar--chico" onClick={mostrarOfertas ? irAOfertas : comprar}>
          {ficha.compra.cta_texto || 'Comprar ahora'}
        </button>
      </div>
    </div>
  );
}

/* ── Piezas internas ──────────────────────────────────────────────── */

function MarcadorPreview({ previewMode, seccion }) {
  if (!previewMode) return null;
  return <span className="fpp-preview-marker">Sección {n(seccion)}</span>;
}

/**
 * Encabezado de sección del diseño: rótulo chico arriba, título con una
 * parte en negrita de color y bajada opcional. Si no hay título no dibuja
 * nada, así una sección puede ir sin encabezado borrando el texto.
 */
function Encabezado({ eyebrow, titulo, destacado, subtitulo, alinear = 'centro', saltoDeLinea = false }) {
  if (!titulo && !destacado && !eyebrow) return null;
  return (
    <div className={`fpp-encabezado ${alinear === 'izq' ? 'izq' : ''}`}>
      {eyebrow && <p className="fpp-eyebrow">{eyebrow}</p>}
      {(titulo || destacado) && (
        <h2>
          {titulo}
          {destacado && <>{saltoDeLinea ? <br /> : ' '}<em>{destacado}</em></>}
        </h2>
      )}
      {subtitulo && <p className="fpp-encabezado-sub">{subtitulo}</p>}
    </div>
  );
}

/**
 * Una tarjeta de "Ellos ya lo probaron…": la foto del cliente y, abajo,
 * estrellas, nombre y lo que contó. El comentario se corta en pocas líneas
 * para que las tarjetas queden parejas; "Ver más" lo muestra entero.
 */
function TarjetaCliente({ opinion: o }) {
  const [abierta, setAbierta] = useState(false);
  const comentario = (o.comentario || '').trim();
  // A ojo: con ~90 caracteres el texto ya pasa las 4 líneas de la tarjeta.
  const esLargo = comentario.length > 90;
  return (
    <figure className="fpp-ugc-item">
      <span className="fpp-ugc-foto">
        <img src={getMediaUrl(o.foto)} alt={o.nombre ? `Foto de ${o.nombre}` : 'Foto de cliente'} loading="lazy" />
      </span>
      {(o.nombre || Number(o.calificacion) > 0 || comentario) && (
        <figcaption>
          {Number(o.calificacion) > 0 && <Estrellas valor={o.calificacion} tamano={11} />}
          {o.nombre && <b>{o.nombre}</b>}
          {comentario && <p className={abierta ? 'abierta' : ''}>“{comentario}”</p>}
          {esLargo && (
            <button type="button" onClick={() => setAbierta(v => !v)}>
              {abierta ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </figcaption>
      )}
    </figure>
  );
}

function Foto({ src, alt, className }) {
  if (!src) return <div className={`${className} fpp-foto-vacia`}><ImageOff size={30} /></div>;
  return <img src={getMediaUrl(src)} alt={alt} className={className} loading="lazy" />;
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

/**
 * Tarjeta de pack — la MISMA para el paquete real y para la unidad suelta.
 * Las tres opciones tienen el mismo tamaño y solo se diferencian por el
 * cintillo de arriba, el nombre y el precio.
 */
function TarjetaPack({ elegido, badge, nombre, subtitulo, imagen, precio, precioAntes, ahorro = null, textoAhorro = '', onElegir }) {
  return (
    <button type="button" className={`fpp-pack ${elegido ? 'elegido' : ''}`} onClick={onElegir} aria-pressed={elegido}>
      <span className={`fpp-pack-badge ${badge ? '' : 'vacio'}`}>{badge || ' '}</span>
      <span className="fpp-pack-imagen">
        {imagen ? <img src={getMediaUrl(imagen)} alt="" /> : <ImageOff size={22} />}
      </span>
      <strong className="fpp-pack-nombre">{nombre}</strong>
      {subtitulo && <small className="fpp-pack-sub">{subtitulo}</small>}
      {precio != null && <b className="fpp-pack-precio">{formatPrecio(precio)}</b>}
      {precioAntes != null && Number(precioAntes) > Number(precio) && <del>{formatPrecio(precioAntes)}</del>}
      {ahorro != null && <span className="fpp-pack-ahorro">{textoAhorro ? `${textoAhorro} ${ahorro}%` : `-${ahorro}%`}</span>}
    </button>
  );
}

/**
 * Paleta completa de la ficha a partir de los tres colores que el comercio
 * edita (fondo/texto/acento) más el color del botón de compra. Todo lo
 * demás (la franja oscura, el verde suave, el lavado de fondo, las líneas)
 * se DERIVA del acento — no hay un solo color literal en el CSS. El diseño
 * original es una escala de verdes; con otro acento la escala sale de ese
 * color y la estructura se mantiene.
 */
function calcularVariables(t, colorCta) {
  const { fondo, texto, acento } = t;
  const fondoEsOscuro = contraste(fondo, '#FFFFFF') >= 3;
  // Botones y cintillos (texto grande y en negrita): blanco mientras se lea
  // (3:1); si no, oscuro.
  const sobre = (color) => (contraste('#FFFFFF', color) >= 3 ? '#FFFFFF' : '#1A1A1A');
  const cta = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorCta || '') ? colorCta : acento;

  // Superficies: salen del fondo y del acento, nunca del texto.
  const card = fondoEsOscuro ? componer('#FFFFFF', 0.07, fondo) : '#FFFFFF';
  const lavado = fondoEsOscuro ? componer('#FFFFFF', 0.05, fondo) : componer(acento, 0.07, fondo);
  const superficies = [fondo, card, lavado];

  // ── Legibilidad ──────────────────────────────────────────────────────
  // Los colores de la tienda se usan tal cual solo si se leen sobre TODAS
  // las superficies donde aparecen; si no, el oscuro o el claro que mejor
  // se lea. Una tienda con fondo rosa y texto blanco dejaba la ficha
  // ilegible (1,9:1).
  // Conserva el tono elegido: si no se lee, lo oscurece/aclara lo justo
  // (ver ajustarLegible), nunca lo cambia por negro de entrada.
  const legibleEn = (color, fondos, minimo = 4.5) => ajustarLegible(color, fondos, minimo);
  const suaveEn = (base, fondos, minimo = 4.5) => {
    for (let a = 0.72; a < 1; a += 0.04) {
      const c = componer(base, a, fondo);
      if (fondos.every(b => contraste(c, b) >= minimo)) return c;
    }
    return base;
  };

  const fg = legibleEn(texto, superficies);
  const onAccent = sobre(acento);
  // La parte destacada (títulos, precios, rótulos chicos) va en el acento si
  // se lee en todas las superficies; si no, en el texto.
  const destacado = legibleEn(acento, superficies);
  const ctaTexto = legibleEn(cta, superficies);

  // Escala del acento hacia el blanco: el verde del contador, el salvia de
  // "por qué elegirnos" y el menta de la frase.
  const urgencia = componer(acento, 0.55, '#FFFFFF');
  const suave = componer(acento, 0.36, '#FFFFFF');
  const menta = componer(acento, 0.14, '#FFFFFF');
  const bandDestacadoClaro = componer(acento, 0.35, '#FFFFFF');

  return {
    '--fpp-bg': fondo,
    '--fpp-fg': fg,
    '--fpp-accent': acento,
    '--fpp-on-accent': onAccent,
    '--fpp-destacado': destacado,
    '--fpp-muted': suaveEn(fg, superficies),
    '--fpp-line': hexToRgba(fg, fondoEsOscuro ? 0.16 : 0.14),
    '--fpp-lavado': lavado,
    '--fpp-card': card,
    '--fpp-sombra': hexToRgba(fg, 0.14),
    // Franja oscura (proceso, tabla, cierre): el acento pleno.
    '--fpp-band': acento,
    '--fpp-on-band': onAccent,
    // El tono suave solo si todavía se lee; si no, el pleno.
    '--fpp-on-band-suave': contraste(componer(onAccent, 0.78, acento), acento) >= 4.5 ? hexToRgba(onAccent, 0.78) : onAccent,
    '--fpp-on-band-linea': hexToRgba(onAccent, 0.3),
    '--fpp-band-destacado': contraste(bandDestacadoClaro, acento) >= 4.5 ? bandDestacadoClaro : onAccent,
    '--fpp-urgencia': urgencia,
    '--fpp-on-urgencia': sobre(urgencia),
    '--fpp-suave': suave,
    '--fpp-on-suave': textoLegible(fg, suave),
    '--fpp-menta': menta,
    // El menta y las cajitas del contador son siempre claros.
    '--fpp-on-menta': textoLegible(fg, menta),
    '--fpp-on-blanco': textoLegible(fg, '#FFFFFF'),
    '--fpp-cta': cta,
    '--fpp-on-cta': sobre(cta),
    '--fpp-cta-texto': ctaTexto,
    '--fpp-cta-sombra': hexToRgba(cta, 0.35),
    // Las estrellas van en dorado en cualquier paleta: es una convención
    // que el cliente lee de un vistazo.
    '--fpp-estrella': '#F49A00',
  };
}
