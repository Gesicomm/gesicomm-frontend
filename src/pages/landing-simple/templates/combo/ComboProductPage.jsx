import OfertaTiempoLimitado from '../../OfertaTiempoLimitado';
import { ofertaProductoDesdeCombo } from '../../ofertaComboAdapter';
import IconoLibreCombo from '../../IconoLibreCombo';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, ImageOff, Layers, Star } from 'lucide-react';
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
import { productosSeccionCombo, beneficiosVisiblesCombo } from '../../comboContenido';
import { BLOQUES_COMBO, BLOQUES_EDITABLES_COMBO, ordenBloquesCombo, ordenPartesCombo } from '../../comboBloques';

/**
 * Ficha de detalle de un Combo.
 *
 * ── Un solo renderer ───────────────────────────────────────────────────
 * Lo montan los dos lados: el preview del armador y la landing publicada
 * (ver ComboProductPagePublica.jsx) — mismo criterio que las otras fichas
 * (ver BasicoProductPage.jsx). Se usa SIEMPRE que el ítem abierto es un
 * combo, sin importar qué template rígido (Fitness/Beauty/Tech/Básico) use
 * el resto de la landing. Conserva las secciones de un combo y acompaña
 * los colores y la tipografía del template elegido.
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
  layout = null,
  bloqueActivo = null,
  onBloque = null,
  onActivo = null,
  documento = false,
}) {
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [preguntaAbierta, setPreguntaAbierta] = useState(null);
  const rootRef = useRef(null);
  useEffect(() => {
    if (previewMode && bloqueActivo && onBloque) {
      rootRef.current?.querySelector(`[data-combo-preview-bloque="${bloqueActivo}"]`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }
  }, [bloqueActivo, previewMode, onBloque]);

  const t = resolverTemaPorSlug(tema, templateSlug);
  const vars = useMemo(() => {
    const editorial = ['bazar-hogar', 'moda-indumentaria', 'beauty-skincare'].includes(templateSlug);
    return {
      ...calcularVariables(t),
      '--cmb-font-body': templateSlug === 'tech-electronica' ? "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" : 'Arial, Helvetica, sans-serif',
      '--cmb-font-heading': editorial ? "Georgia, 'Times New Roman', serif" : 'inherit',
      '--cmb-heading-weight': editorial ? 400 : 800,
    };
  }, [t.fondo, t.texto, t.acento, templateSlug]);

  useEffect(() => { setIndiceImagen(0); }, [item?.nombre]);

  if (!item) return null;

  const productos = item.productosIncluidos || [];
  const beneficios = (ficha.beneficio_principal.items || []).filter(b => b?.titulo?.trim() || b?.texto?.trim());
  const testimonios = (ficha.prueba_social.testimonios || []).filter(t2 => t2?.comentario?.trim());
  const confianzaItems = (ficha.confianza.items || []).filter(c => c?.titulo?.trim() || c?.texto?.trim());
  const preguntas = (ficha.faq.items ?? item.faq ?? []).filter(f => f?.pregunta?.trim() && f.partes?.pregunta !== false);

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
  const tituloTexto = (ficha.hero.titulo ?? item.nombre ?? '').trim();
  const largoTitulo = tituloTexto.length + (ficha.hero.titulo_destacado || '').length;
  const claseTitulo = largoTitulo > 60 ? 'es-muy-largo' : largoTitulo > 32 ? 'es-largo' : '';
  const leadTexto = ficha.hero.lead ?? item.descripcion;

  // Valor del combo: suma de precios individuales de referencia de cada
  // producto (a lo que costaría comprarlos sueltos) vs. lo que sale el
  // combo. Se arma sola con lo que ya trae el combo — no se inventa nada.
  const precioCombo = Number(item.precio) || 0;
  const totalIndividual = productos.reduce((sum, p) => sum + (Number(p.precio) || 0) * (p.cantidad || 1), 0);
  const totalIndividualValido = totalIndividual > 0 ? totalIndividual : null;
  const precioReferenciaCombo = totalIndividualValido;
  const ahorroValor = precioReferenciaCombo && precioReferenciaCombo > precioCombo ? precioReferenciaCombo - precioCombo : null;
  const descuentoPorcentaje = ahorroValor && precioReferenciaCombo
    ? Math.round((ahorroValor / precioReferenciaCombo) * 100)
    : null;
  const productosHero = productos.slice(0, 4);
  const totalUnidades = productos.reduce((sum, p) => sum + (Number(p.cantidad) || 1), 0);
  const resumenUnidades = totalUnidades === 1 ? '1 producto incluido' : `${totalUnidades} productos incluidos`;

  const ofertaCompartida = ofertaProductoDesdeCombo(ficha.hero);
  const encabezadoVisible = ficha.hero.activo && layout?._visibilidad?.hero !== false;
  const parteVisible = clave => ficha.hero.partes?.[clave] !== false;
  const verParte = (bloque, clave) => (ficha[bloque] || layout?.[bloque])?.partes?.[clave] !== false;
  const verItem = (bloque, dato, clave) => dato.partes?.[clave] ?? verParte(bloque, clave);
  const tarjetasConfianza = confianzaItems.filter(c => (verItem('confianza', c, 'nombre') && c.titulo?.trim()) || (verItem('confianza', c, 'texto') && c.texto?.trim()));
  const tarjetasBeneficios = beneficios.filter(b => (verItem('beneficio_principal', b, 'nombre') && b.titulo?.trim()) || (verItem('beneficio_principal', b, 'texto') && b.texto?.trim()));
  const caracteristicas = (ficha.hero.caracteristicas || []).filter(v => v.trim());
  const contenido = (
    <>
      {/* Barra superior de urgencia (envío, garantía, pago) ─────────── */}
      {ficha.barra_superior.activo && ficha.barra_superior.items.some(v => v.texto?.trim()) && (
        <div data-combo-bloque="barra_superior">
        {!ficha.barra_superior.items.length && <p className="cmb-vacio">Agregá las ventajas de tu tienda en el bloque Barra superior.</p>}
        <BarraMarquee
          className="cmb-barra"
          items={ficha.barra_superior.items.filter(v => v.texto?.trim())}
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
        /></div>
      )}

      {/* Migas de pan ────────────────────────────────────────────────── */}
      {onVolver && (
        <div className="cmb-wrap" data-combo-navegacion="catalogo">
          <button type="button" className="cmb-breadcrumbs" onClick={onVolver}>
            Volver al catálogo <span>/</span> <b>{item.nombre}</b>
          </button>
        </div>
      )}

      {/* Hero: oferta + combo principal ──────────────────────────────── */}
      {
        <div data-combo-bloque="hero">
          <section className="cmb-hero cmb-wrap" id="cmb-hero">
            {encabezadoVisible && <PartesHero orden={layout?._orden_hero} data-combo-estructura="encabezado" className={`cmb-hero-copy ${claseTitulo}`}>
              <div data-combo-sub-bloque="hero_titulo" data-combo-parte="Nombre y sobre-título" data-combo-orden="titulo">
              {parteVisible('sobre_titulo') && ficha.hero.eyebrow?.trim() && (
                <p className="cmb-eyebrow">{ficha.hero.eyebrow}</p>
              )}
              {((parteVisible('titulo') && tituloTexto) || (parteVisible('titulo_destacado') && ficha.hero.titulo_destacado?.trim())) && <h1>
                {parteVisible('titulo') ? tituloTexto : ''}
                {parteVisible('titulo_destacado') && ficha.hero.titulo_destacado && <> <span className="cmb-hero-destacado">{ficha.hero.titulo_destacado}</span></>}
              </h1>}
              </div>

              {parteVisible('calificacion') && ficha.hero.rating_activo && (
                <div className="cmb-rating" data-combo-sub-bloque="hero_calificacion" data-combo-parte="Calificación" data-combo-orden="calificacion">
                  <Estrellas valor={ficha.hero.rating_valor} tamano={16} />
                  <b>{Number(ficha.hero.rating_valor).toFixed(1)}/5</b>
                </div>
              )}

              {parteVisible('descripcion') && leadTexto && <div data-combo-sub-bloque="hero_descripcion" data-combo-parte="Descripción" data-combo-orden="descripcion"><RichText text={leadTexto} className="cmb-lead" /></div>}
            </PartesHero>}

            <div data-combo-estructura="oferta" className="cmb-offer-card" aria-label="Oferta del combo" style={!parteVisible('galeria') || !galeria.length ? { gridTemplateColumns: '1fr' } : undefined}>
              {parteVisible('galeria') && galeria.length > 0 && <div className="cmb-hero-visual" data-combo-sub-bloque="hero_galeria" data-combo-parte="Galería e imágenes">
                <div className={`cmb-hero-foto ${!imagenActual ? 'sin-imagen' : ''}`}>
                  {parteVisible('etiqueta') && ficha.hero.etiqueta && <span className="cmb-hero-badge">{ficha.hero.etiqueta}</span>}
                  {imagenActual
                    ? documento ? <>{galeria.map((medio, i) => <div key={i} data-combo-media-panel={i} hidden={i !== 0} className="lsp-media-frame"><MediaProducto medio={medio} alt={item.nombre} /></div>)}</>
                      : <div className="lsp-media-frame"><MediaProducto medio={imagenActual} alt={item.nombre} /></div>
                    : (
                      <div className="cmb-hero-foto-vacio">
                        <ImageOff size={32} />
                        {previewMode && <span>{onBloque ? 'Agregá fotos desde Galería e imágenes del encabezado.' : 'Sin imagen — subila en "Imágenes del combo"'}</span>}
                      </div>
                    )}
                </div>
                {parteVisible('productos') && productos.length > 0 && (
                  <div className="cmb-kit-strip" aria-label={resumenUnidades}>
                    {productosHero.map((p, i) => (
                      <React.Fragment key={p.id}>
                        {i > 0 && <span className="cmb-kit-plus">+</span>}
                        <div className="cmb-kit-product">
                          <div className="cmb-kit-thumb">
                            {p.imagen ? <img src={getMediaUrl(p.imagen)} alt="" loading="lazy" /> : <ImageOff size={18} />}
                          </div>
                          <span>{p.nombre}</span>
                          <b>×{p.cantidad || 1}</b>
                        </div>
                      </React.Fragment>
                    ))}
                    {productos.length > productosHero.length && (
                      <span className="cmb-kit-more">+{productos.length - productosHero.length}</span>
                    )}
                  </div>
                )}
                {parteVisible('miniaturas') && galeria.length > 1 && (
                  <div className="cmb-miniaturas">
                    {galeria.slice(0, 6).map((medio, i) => (
                      <button
                        type="button"
                        key={claveMedioProducto(medio, i)}
                        aria-label={`Medio ${i + 1} de ${galeria.length}`}
                        data-combo-imagen={documento ? i : undefined}
                        className={`cmb-miniatura ${i === indiceImagen ? 'activa' : ''}`}
                        onClick={() => setIndiceImagen(i)}
                      >
                        <MiniaturaMediaProducto medio={medio} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>}

              <PartesHero orden={layout?._orden_hero} className="cmb-offer-panel">
                <div data-combo-sub-bloque="hero_precio" data-combo-parte="Precio y ahorro" data-combo-orden="precio">
                <div className="cmb-offer-panel-head">
                  {parteVisible('rotulo_combo') && ficha.hero.rotulo_combo?.trim() && <span><Layers size={15} /> {ficha.hero.rotulo_combo ?? 'Combo armado'}</span>}
                  {parteVisible('cantidad_productos') && <strong>{resumenUnidades}</strong>}
                </div>

                {(parteVisible('precio') || (parteVisible('precio_anterior') && precioReferenciaCombo) || (parteVisible('ahorro') && ahorroValor != null)) && <div className="cmb-offer-pricing">
                  {parteVisible('precio_anterior') && precioReferenciaCombo && (
                    <div className="cmb-price-line">
                      {parteVisible('rotulo_precio_anterior') && ficha.hero.rotulo_precio_anterior?.trim() && <span>{ficha.hero.rotulo_precio_anterior ?? 'Valor por separado'}</span>}
                      <del>{formatPrecio(precioReferenciaCombo)}</del>
                    </div>
                  )}
                  {parteVisible('precio') && <div className="cmb-price-main">
                    {parteVisible('rotulo_precio') && ficha.hero.rotulo_precio?.trim() && <span>{ficha.hero.rotulo_precio ?? 'Hoy llevás el combo por'}</span>}
                    <strong>{formatPrecio(item.precio)}</strong>
                  </div>}
                  {parteVisible('ahorro') && ahorroValor != null && (
                    <div className="cmb-saving-xl">
                      <span>Ahorrás {formatPrecio(ahorroValor)}</span>
                      {parteVisible('porcentaje') && descuentoPorcentaje != null && <b>{descuentoPorcentaje}% OFF</b>}
                    </div>
                  )}
                </div>}

                  {ficha.hero.contador.activo && <div className="cmb-offer-timer" data-combo-sub-bloque="hero_oferta" data-combo-parte="Oferta por tiempo limitado">
                    <OfertaTiempoLimitado datos={ofertaCompartida.datos} partes={ofertaCompartida.partes} documento={documento} combo />
                  </div>}
                </div>

                {parteVisible('caracteristicas') && caracteristicas.length > 0 && (
                  <ul className="cmb-hero-checklist" data-combo-sub-bloque="hero_caracteristicas" data-combo-parte="Puntos clave" data-combo-orden="caracteristicas">
                    {caracteristicas.slice(0, 6).map((linea, i) => (
                      <li key={i}><span className="cmb-check"><Check size={12} strokeWidth={3} /></span> {linea}</li>
                    ))}
                  </ul>
                )}

                  {parteVisible('compra') && ficha.hero.cta_texto?.trim() && <div className="cmb-hero-accion" data-combo-sub-bloque="hero_compra" data-combo-orden="compra"><button type="button" className="cmb-cta" onClick={comprar} data-combo-parte="Botón de compra">
                    {ficha.hero.cta_texto} <ArrowRight size={16} />
                  </button></div>}

              </PartesHero>
            </div>
          </section>
        </div>
      }

      {/* ¿Qué incluye? ─────────────────────────────────────────────── */}
      {ficha.incluye.activo && productos.length > 0 && (
        <section className="cmb-seccion cmb-seccion--fondo" data-combo-bloque="incluye">
          <div className="cmb-wrap">
            <SeccionTitulo config={ficha.incluye} eyebrow="Todo lo que recibís" texto={ficha.incluye.titulo} sub={ficha.incluye.subtitulo} numero={3} mostrarNumero={previewMode} />
            {productos.length === 0 ? (
              <p className="cmb-vacio">Agregá productos al combo para que esta sección se arme sola.</p>
            ) : (
              <div className="cmb-products-grid">
                {productosSeccionCombo(productos, ficha.incluye).filter(p =>
                  (verItem('incluye', p, 'nombre') && p.nombre?.trim()) || (verItem('incluye', p, 'imagen') && p.imagen) ||
                  verItem('incluye', p, 'cantidad') || (verItem('incluye', p, 'beneficio') && p.beneficios?.some(b => textoBeneficio(b)))).map(p => (
                  <article className="cmb-product-card" data-combo-sub-bloque={`incluye_producto_${p.id}`} key={p.id}>
                    {verItem('incluye', p, 'imagen') && p.imagen ? <div className="cmb-product-card-image">
                      {p.imagen ? <img src={getMediaUrl(p.imagen)} alt={p.nombre} loading="lazy" /> : <ImageOff size={26} />}
                      {verItem('incluye', p, 'cantidad') && <span>×{p.cantidad || 1}</span>}
                    </div> : verItem('incluye', p, 'cantidad') && <span className="cmb-product-cantidad">×{p.cantidad || 1}</span>}
                    <div className="cmb-product-card-copy">
                      {verItem('incluye', p, 'nombre') && p.nombre?.trim() && <h3>{p.nombre}</h3>}
                      {verItem('incluye', p, 'beneficio') && beneficiosVisiblesCombo(p).length > 0 && <ul className="cmb-checklist cmb-product-beneficios">
                        {beneficiosVisiblesCombo(p).map((beneficio, i) => <li key={i}><span className="cmb-check"><Check size={11} /></span>{beneficio}</li>)}
                      </ul>}
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
        <section className="cmb-seccion cmb-wrap" data-combo-bloque="valor">
          <SeccionTitulo config={ficha.valor} eyebrow="Más valor en un solo combo" texto="El valor del combo" numero={4} mostrarNumero={previewMode} />
          <div className="cmb-value-grid">
            {verParte('valor', 'desglose') && <div className="cmb-price-breakdown">
              <div className="cmb-breakdown-head">
                {verParte('valor', 'rotulo_desglose') && ficha.valor.titulo?.trim() && <span>{ficha.valor.titulo}</span>}
                <span>Valor</span>
              </div>
              {productos.map(p => (
                <div className="cmb-breakdown-row" key={p.id}>
                  <span>{p.nombre}{p.cantidad > 1 ? ` ×${p.cantidad}` : ''}</span>
                  <strong>{p.precio != null ? formatPrecio(p.precio * (p.cantidad || 1)) : '—'}</strong>
                </div>
              ))}
              {verParte('valor', 'total') && <div className="cmb-breakdown-total">
                <span>{ficha.valor.rotulo_total}</span>
                <strong>{precioReferenciaCombo ? formatPrecio(precioReferenciaCombo) : '—'}</strong>
              </div>}
            </div>}
            <div className="cmb-combo-price">
              {verParte('valor', 'rotulo_precio') && ficha.valor.titulo_combo?.trim() && <p>{ficha.valor.titulo_combo}</p>}
              {verParte('valor', 'precio') && <strong>{formatPrecio(item.precio)}</strong>}
              {verParte('valor', 'ahorro') && ahorroValor != null && <span>Ahorrás {formatPrecio(ahorroValor)}</span>}
              {verParte('valor', 'nota') && ficha.valor.nota_ahorro && <small>{ficha.valor.nota_ahorro}</small>}
            </div>
          </div>
          {verParte('valor', 'compra') && ficha.valor.cta_texto?.trim() && <button type="button" className="cmb-cta cmb-value-button" onClick={comprar}>
            {ficha.valor.cta_texto} <ArrowRight size={16} />
          </button>}
        </section>
      )}

      {/* ¿Por qué este combo? ──────────────────────────────────────── */}
      {ficha.beneficio_principal.activo && (tarjetasBeneficios.length > 0 || tieneTituloSeccion(ficha.beneficio_principal, 'Elegidos para complementarse')
        || (ficha.beneficio_principal.partes?.subtitulo !== false && ficha.beneficio_principal.texto?.trim())) && (
        <section className="cmb-seccion cmb-seccion--fondo" data-combo-bloque="beneficio_principal">
          <div className="cmb-wrap">
          <SeccionTitulo config={ficha.beneficio_principal} eyebrow="Elegidos para complementarse" texto={ficha.beneficio_principal.titulo} sub={ficha.beneficio_principal.texto} numero={5} mostrarNumero={previewMode} />
          {tarjetasBeneficios.length === 0 ? (
            null
          ) : (
            <div className="cmb-why-grid">
              {tarjetasBeneficios.map((b, i) => {
                return (
                  <div className="cmb-why-item" key={i}>
                    {verItem('beneficio_principal', b, 'iconos') && <IconoLibreCombo valor={b.icono} />}
                    {verItem('beneficio_principal', b, 'nombre') && <h3>{b.titulo}</h3>}
                    {verItem('beneficio_principal', b, 'texto') && b.texto && <p>{b.texto}</p>}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </section>
      )}

      {/* Opiniones reales ──────────────────────────────────────────── */}
      {ficha.prueba_social.activo && (
        <section className="cmb-seccion cmb-seccion--fondo" data-combo-bloque="prueba_social">
          <div className="cmb-wrap">
            <SeccionTitulo config={ficha.prueba_social} eyebrow="Experiencias reales" texto={ficha.prueba_social.titulo} numero={7} mostrarNumero={previewMode} />
            {testimonios.length > 0 && verParte('prueba_social', 'calificacion') && <div className="cmb-rating cmb-rating--centrado">
              <Estrellas valor={ficha.prueba_social.calificacion} tamano={18} />
              <b>{Number(ficha.prueba_social.calificacion).toFixed(1)}/5</b>
            </div>}
            {testimonios.length === 0 ? (
              <p className="cmb-vacio">{previewMode ? 'Todavía no hay opiniones cargadas. Agregá una opinión desde este bloque para mostrar su foto, comentario y calificación.' : 'Todavía no hay opiniones de este combo.'}</p>
            ) : (
              <div className="cmb-reviews-grid">
                {testimonios.map((t2, i) => (
                  <article className="cmb-review" key={i}>
                    {verItem('prueba_social', t2, 'estrellas') && <Estrellas valor={t2.calificacion ?? 5} tamano={14} />}
                    {verItem('prueba_social', t2, 'comentario') && <p>"{t2.comentario}"</p>}
                    {verItem('prueba_social', t2, 'foto') && t2.foto?.trim() && <img className="cmb-review-foto" src={getMediaUrl(t2.foto)} alt={t2.nombre || ''} loading="lazy" />}
                    {verItem('prueba_social', t2, 'nombre') && t2.nombre && <strong>{t2.nombre}</strong>}
                    {verParte('prueba_social', 'verificada') && verItem('prueba_social', t2, 'detalle') && (t2.detalle ?? ficha.prueba_social.rotulo_verificada)?.trim() && <small>{t2.detalle ?? ficha.prueba_social.rotulo_verificada}</small>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Comprá con confianza ──────────────────────────────────────── */}
      {ficha.confianza.activo && (tarjetasConfianza.length > 0 || tieneTituloSeccion(ficha.confianza, 'Comprá tranquilo')) && (
        <section className="cmb-seccion cmb-wrap" data-combo-bloque="confianza">
          <SeccionTitulo config={ficha.confianza} eyebrow="Comprá tranquilo" texto={ficha.confianza.titulo} numero={8} mostrarNumero={previewMode} />
          {tarjetasConfianza.length > 0 && <div className="cmb-trust-grid">
            {tarjetasConfianza.map((c, i) => {
              return (
                <div className="cmb-trust-item" key={i}>
                  {verItem('confianza', c, 'iconos') && <IconoLibreCombo valor={c.icono} />}
                  <div>
                  {verItem('confianza', c, 'nombre') && <h3>{c.titulo}</h3>}
                  {verItem('confianza', c, 'texto') && c.texto && <p>{c.texto}</p>}
                  </div>
                </div>
              );
            })}
          </div>}
        </section>
      )}

      {/* Preguntas frecuentes ──────────────────────────────────────── */}
      {ficha.faq.activo && (preguntas.length > 0 || tieneTituloSeccion(ficha.faq, 'Resolvemos tus dudas')) && (
        <section className="cmb-seccion cmb-seccion--fondo" data-combo-bloque="faq">
          <div className="cmb-wrap">
            <SeccionTitulo config={ficha.faq} eyebrow="Resolvemos tus dudas" texto={ficha.faq.titulo} numero={9} mostrarNumero={previewMode} />
            {preguntas.length > 0 && (
              <div className="cmb-faq-list">
                {preguntas.map((f, i) => (
                  <div className={`cmb-faq-item ${preguntaAbierta === i ? 'abierta' : ''}`} key={i}>
                    <button type="button" data-combo-pregunta={documento ? i : undefined} onClick={() => setPreguntaAbierta(preguntaAbierta === i ? null : i)} aria-expanded={preguntaAbierta === i}>
                      <span>{f.pregunta}</span>
                      <ChevronDown size={16} />
                    </button>
                    {verParte('faq', 'respuestas') && f.partes?.respuesta !== false && f.respuesta?.trim() && (documento || preguntaAbierta === i) && (
                      <div className="cmb-faq-answer" hidden={documento && preguntaAbierta !== i}>
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

      {/* El footer de siempre ──────────────────────────────────────── */}
      <div data-combo-bloque="pie">
      {contacto && <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={vars['--cmb-border']} isMobile={isMobile} />}
      <StoreFooterLegal tema={t} bordeSuave={vars['--cmb-border']} nombreComercio={layout?.pie?.texto ?? nombreComercio} isPreview={previewMode} />
      </div>

      {/* Barra fija en móvil: el CTA queda arriba del pliegue. */}
      <div className="cmb-barra-movil" data-combo-bloque="compra_movil">
        {verParte('compra_movil', 'precio') && <div className="cmb-barra-movil-precio">
          <b>{item.precio != null ? formatPrecio(item.precio) : ''}</b>
        </div>}
        {verParte('compra_movil', 'compra') && (layout?.compra_movil?.texto ?? 'Comprar ahora').trim() && <button type="button" className="cmb-cta" onClick={comprar}>
          {layout?.compra_movil?.texto ?? 'Comprar ahora'}
        </button>}
      </div>
    </>
  );
  const orden = ordenBloquesCombo(layout?._orden);
  const bloques = React.Children.toArray(contenido.props.children)
    .filter(el => el.props?.['data-combo-bloque'] === 'hero' || layout?._visibilidad?.[el.props?.['data-combo-bloque']] !== false)
    .sort((a, b) => orden.indexOf(a.props?.['data-combo-bloque']) - orden.indexOf(b.props?.['data-combo-bloque']));
  return <div ref={rootRef} data-template={templateSlug} className={`cmb-root ${isMobile ? 'es-movil' : ''} ${previewMode && onBloque ? 'cmb-editor' : ''}`} style={vars}>
    {bloques.map(el => {
      const clave = el.props?.['data-combo-bloque'];
      if (!previewMode || !onBloque || !BLOQUES_EDITABLES_COMBO.some(b => b.key === clave)) return el;
      const bloque = BLOQUES_COMBO.find(b => b.key === clave) || { label: 'Barra superior' };
      return <div key={clave} className={`cmb-editor-bloque ${bloqueActivo === clave ? 'cmb-editor-seleccionado' : ''}`} data-combo-preview-bloque={clave}
        onMouseEnter={() => onActivo?.(clave)} onMouseLeave={() => onActivo?.(null)}
        onClickCapture={e => { if (!e.target.closest('button, a, input, textarea, select')) { e.preventDefault(); e.stopPropagation(); onBloque(e.target.closest('[data-combo-sub-bloque]')?.getAttribute('data-combo-sub-bloque') || clave); } }}>
        <button type="button" className="cmb-editor-label" aria-label={`Editar bloque ${bloque.label}`} onClick={() => onBloque(clave)}>{orden.filter(k => BLOQUES_EDITABLES_COMBO.some(b => b.key === k)).indexOf(clave) + 1} · {bloque.label} · Editar</button>
        {el}
      </div>;
    })}
  </div>;
}

/* ── Piezas internas ──────────────────────────────────────────────── */

function PartesHero({ orden, children, ...props }) {
  const claves = ordenPartesCombo(orden);
  return <div {...props}>{React.Children.toArray(children).sort((a, b) =>
    claves.indexOf(a.props?.['data-combo-orden']) - claves.indexOf(b.props?.['data-combo-orden']))}</div>;
}

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
function tieneTituloSeccion(config, eyebrow) {
  return (config.partes?.eyebrow !== false && (config.eyebrow ?? eyebrow)?.trim())
    || (config.partes?.titulo !== false && (config.encabezado ?? config.titulo)?.trim());
}

function SeccionTitulo({ config = {}, eyebrow, texto, sub, numero, mostrarNumero = false }) {
  eyebrow = config.partes?.eyebrow === false ? '' : (config.eyebrow ?? eyebrow)?.trim();
  texto = config.partes?.titulo === false ? '' : (config.encabezado ?? texto)?.trim();
  sub = config.partes?.subtitulo === false ? '' : sub?.trim();
  if (!texto && !eyebrow && !sub) return null;
  return (
    <div className="cmb-seccion-titulo">
      {mostrarNumero && <span className="cmb-seccion-numero">{numero}</span>}
      {eyebrow && <p className="cmb-eyebrow">{eyebrow}</p>}
      {texto && <h2>{texto}</h2>}
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
