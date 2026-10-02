import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, ChevronDown, ImageOff, Minus, Plus, ShoppingBag, Sparkles, Star,
} from 'lucide-react';
import { getMediaUrl } from '../../../../services/api';
import { formatPrecio } from '../../../../lib/mensajeWhatsapp';
import { getIconoBeneficio, CATALOGO_ICONOS_BENEFICIOS } from '../iconosBeneficios';
import { hexToRgba, componer, contraste, resolverTemaPorSlug, textoLegible, ajustarLegible } from '../themeUtils';
import { ahorroDePack } from '../fichaComun';
import { numeroDeSeccion as n } from './fichaBazar';
import { RedesSocialesFooter, ImagenProductoHover } from '../sections';
import {
  MediaProducto, MiniaturaMediaProducto, galeriaConVariantePromovida, claveMedioProducto,
} from '../mediaGaleria';
import StoreFooterLegal from '../../../landing/StoreFooterLegal';
import RichText from '../../../../components/RichText';
import BarraMarquee from '../BarraMarquee';
import ContadorUrgencia from '../contadorUrgencia';
import './bazarProductPage.css';

/**
 * Ficha de producto del template "Bazar, Hogar y Decoración".
 *
 * ── Un solo renderer ───────────────────────────────────────────────────
 * Lo montan los dos lados: el preview del armador y la landing publicada
 * (ver BazarProductPagePublica.jsx). Si aparece un tercer lugar, llama a
 * este componente — no se escribe otro.
 *
 * `previewMode` NO cambia el diseño: solo muestra un cartel en las
 * secciones que el comercio prendió pero todavía no cargó.
 *
 * Estructura fija (ver SECCIONES_BAZAR, en el mismo orden que acá) y
 * contenido 100% editable. Los únicos textos escritos acá son rótulos de
 * interfaz ("Volver al catálogo") y respaldos para campos vacíos.
 */
export default function BazarProductPage({
  item,
  ficha,
  tema,
  templateSlug = 'bazar-hogar',
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
  const [varianteId, setVarianteId] = useState(null);
  const [packId, setPackId] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const [preguntaAbierta, setPreguntaAbierta] = useState(0);

  const t = resolverTemaPorSlug(tema, templateSlug);
  const colorCta = ficha?.compra?.cta_color || '';
  const materialFondo = ficha?.materiales?.color_fondo || t.texto;
  const vars = useMemo(() => ({
    ...calcularVariables(t, colorCta),
    '--hpg-material-bg': materialFondo,
    '--hpg-material-fg': textoLegible(t.texto, materialFondo),
  }), [t.fondo, t.texto, t.acento, colorCta, materialFondo]);

  const variantes = item?.variantes || [];
  const packs = item?.packs || [];
  const variante = variantes.find(v => String(v.id) === String(varianteId)) || null;
  const pack = packs.find(p => String(p.id) === String(packId)) || null;

  // Un paquete trae su precio total y manda sobre la variante (mismo
  // criterio que Tech y que el carrito).
  const precio = pack
    ? Number(pack.precio_efectivo ?? pack.precio)
    : (variante?.precio_efectivo ?? item?.precio);
  const precioAntes = pack
    ? (pack.tipo_contenido !== 'combo' && item?.precio != null && Number(item.precio) * (Number(pack.unidades) || 1) > precio ? Number(item.precio) * (Number(pack.unidades) || 1) : null)
    : (!variante ? item?.precioAntes : null);
  const descuento = precioAntes && precio ? Math.round((1 - precio / precioAntes) * 100) : 0;
  const stockMax = variante?.stock != null ? Number(variante.stock) : null;

  const galeria = useMemo(
    () => galeriaConVariantePromovida(item?.imagenes || [], variante),
    [item?.imagenes, variante]
  );

  useEffect(() => { setIndiceImagen(0); }, [item?.nombre, varianteId]);
  useEffect(() => {
    if (packId && !packs.some(p => String(p.id) === String(packId))) setPackId(null);
    if (varianteId && !variantes.some(v => String(v.id) === String(varianteId))) setVarianteId(null);
  }, [packs, variantes, packId, varianteId]);
  useEffect(() => {
    if (stockMax != null && cantidad > Math.max(1, stockMax)) setCantidad(Math.max(1, stockMax));
  }, [stockMax, cantidad]);
  useEffect(() => {
    if (!agregado) return undefined;
    const id = setTimeout(() => setAgregado(false), 2500);
    return () => clearTimeout(id);
  }, [agregado]);

  if (!item) return null;

  // Lo que está a medio cargar no se publica, pero se conserva en el
  // editor: por eso el filtro vive acá y no en el normalizador.
  const beneficios = ficha.beneficios.items.filter(b => b?.titulo?.trim());
  const puntosHistoria = ficha.historia.puntos.filter(p => p?.trim());
  const materiales = ficha.materiales.items.filter(i => i?.nombre?.trim());
  const pasos = ficha.ambientes.pasos.filter(p => p?.titulo?.trim());
  const resenas = ficha.resenas.items.filter(r => r?.comentario?.trim());
  const garantias = ficha.garantias.items.filter(g => g?.titulo?.trim());
  const notasCompra = ficha.compra.notas.filter(x => x?.texto?.trim());
  const fotos = galeria.filter(m => m.tipo === 'imagen').map(m => m.url);

  // Con paquetes en Ofertas la cantidad la definen los paquetes: el
  // cliente elige "1 unidad" o un pack, nunca un número suelto. Si no, el
  // selector permitiría armar 3 unidades a precio unitario y saltearse el
  // pack que el comercio quiere vender.
  const conCantidad = ficha.compra.mostrar_cantidad && packs.length === 0;
  const eleccion = () => ({ variante, pack, precio, cantidad: conCantidad ? cantidad : 1 });
  const agregar = () => {
    if (onAgregar) onAgregar(eleccion());
    else if (onComprar) onComprar(eleccion());
    setAgregado(true);
  };

  const medioActual = galeria[indiceImagen] || galeria[0] || null;
  const categoria = ficha.hero.eyebrow || item.categoria;
  const tituloTexto = (ficha.hero.titulo || item.nombre || '').trim();
  const claseTitulo = tituloTexto.length > 70 ? 'es-muy-largo' : tituloTexto.length > 32 ? 'es-largo' : '';

  const irAResenas = (e) => {
    e.preventDefault();
    document.getElementById('hpg-resenas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hayOpciones = ficha.opciones.activo && (variantes.length > 0 || packs.length > 0);

  return (
    <div className={`hpg-root ${isMobile ? 'es-movil' : ''}`} style={vars}>
      {/* Contador de urgencia ──────────────────────────────────────── */}
      {ficha.urgencia.activo && (
        <div className="hpg-urgencia hpg-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="urgencia" />
          {ficha.urgencia.texto && <span>{ficha.urgencia.texto}</span>}
          <ContadorUrgencia desde={ficha.urgencia} className="hpg-contador" />
        </div>
      )}

      {/* Cinta de beneficios ───────────────────────────────────────── */}
      {ficha.barra_superior.activo && ficha.barra_superior.items.some(a => a?.texto?.trim()) && (
        <div className="hpg-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="barra_superior" />
          <BarraMarquee
            className="hpg-barra"
            items={ficha.barra_superior.items.filter(a => a?.texto?.trim())}
            animado={ficha.barra_superior.animado !== false}
            velocidad={ficha.barra_superior.velocidad}
            separador={ficha.barra_superior.separador}
            renderItem={(a, i) => {
              const Icono = a.icono ? getIconoBeneficio(a.icono) : null;
              return <span className="hpg-barra-item" key={i}>{Icono && <Icono size={14} />} {a.texto}</span>;
            }}
            cta={ficha.barra_superior.cta_texto ? (
              <button type="button" className="hpg-barra-cta" onClick={agregar} disabled={stockMax != null && stockMax <= 0}>
                {ficha.barra_superior.cta_texto}
              </button>
            ) : null}
          />
        </div>
      )}

      {/* Ruta de navegación ────────────────────────────────────────── */}
      {ficha.migas.activo ? (
        <nav className="hpg-migas hpg-wrap" aria-label="Ruta">
          {onVolver
            ? <button type="button" onClick={onVolver}>{ficha.migas.inicio || 'Inicio'}</button>
            : <span>{ficha.migas.inicio || 'Inicio'}</span>}
          {item.categoria && <><i aria-hidden="true">/</i><span>{item.categoria}</span></>}
          <i aria-hidden="true">/</i><b>{item.nombre}</b>
        </nav>
      ) : onVolver ? (
        <div className="hpg-wrap">
          <button type="button" className="hpg-volver" onClick={onVolver}>
            <ArrowLeft size={15} /> Volver al catálogo
          </button>
        </div>
      ) : null}

      {/* Producto: galería + compra ────────────────────────────────── */}
      <section className="hpg-detalle hpg-wrap hpg-preview-section" id="hpg-producto">
        <MarcadorPreview previewMode={previewMode} seccion="hero" />
        <div className="hpg-galeria">
          <div className={`hpg-galeria-principal ${medioActual ? '' : 'vacia'}`}>
            {medioActual
              ? <div className="lsp-media-frame"><MediaProducto medio={medioActual} alt={item.nombre} /></div>
              : <ImageOff size={44} />}
            {ficha.hero.activo && ficha.hero.etiqueta && <span className="hpg-galeria-badge">{ficha.hero.etiqueta}</span>}
          </div>
          {galeria.length > 1 && (
            <div className="hpg-miniaturas">
              {galeria.map((medio, i) => (
                <button
                  type="button"
                  key={claveMedioProducto(medio, i)}
                  aria-label={`Ver imagen ${i + 1}`}
                  className={`hpg-miniatura ${i === indiceImagen ? 'activa' : ''}`}
                  onClick={() => setIndiceImagen(i)}
                >
                  <MiniaturaMediaProducto medio={medio} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`hpg-compra ${claseTitulo}`}>
          {ficha.hero.activo && categoria && <p className="hpg-kicker">{categoria}</p>}
          {ficha.hero.activo && <h1>{tituloTexto}</h1>}
          {ficha.hero.activo && (ficha.hero.lead || item.descripcion) && (
            <RichText text={ficha.hero.lead || item.descripcion} className="hpg-lead" />
          )}

          {ficha.prueba_social.activo && (
            <div className="hpg-rating">
              <Estrellas valor={ficha.prueba_social.calificacion} tamano={14} />
              <b>{Number(ficha.prueba_social.calificacion).toFixed(1)}</b>
              {ficha.prueba_social.resenas_texto && (
                resenas.length && ficha.resenas.activo
                  ? <a href="#hpg-resenas" onClick={irAResenas}>{ficha.prueba_social.resenas_texto}</a>
                  : <span>{ficha.prueba_social.resenas_texto}</span>
              )}
            </div>
          )}

          {ficha.precio.activo && precio != null && (
            <>
              <div className="hpg-precio">
                <strong>{formatPrecio(precio)}</strong>
                {precioAntes && <del>{formatPrecio(precioAntes)}</del>}
                {ficha.precio.mostrar_descuento && descuento > 0 && <em>-{descuento}%</em>}
              </div>
              {ficha.precio.nota && <p className="hpg-precio-nota">{ficha.precio.nota}</p>}
            </>
          )}

          <div className="hpg-divisor" />

          {hayOpciones && variantes.length > 0 && (
            <div className="hpg-opcion-bloque">
              {ficha.opciones.titulo && <b>{ficha.opciones.titulo}</b>}
              <div className="hpg-opciones">
                {variantes.map(v => {
                  const conf = ficha.opciones.variantes?.[String(v.id)] || {};
                  const agotada = v.stock != null && Number(v.stock) <= 0;
                  return (
                    <button
                      type="button"
                      key={v.id}
                      disabled={agotada}
                      className={`hpg-opcion ${String(v.id) === String(varianteId) ? 'elegida' : ''}`}
                      onClick={() => { setVarianteId(String(v.id) === String(varianteId) ? null : v.id); setPackId(null); }}
                      aria-pressed={String(v.id) === String(varianteId)}
                    >
                      <strong>{v.nombre}</strong>
                      {(v.precio_efectivo ?? item.precio) != null && <small>{formatPrecio(v.precio_efectivo ?? item.precio)}</small>}
                      {conf.nota && <small className="hpg-opcion-nota">{conf.nota}</small>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hayOpciones && packs.length > 0 && (
            <div className="hpg-opcion-bloque">
              {ficha.opciones.titulo_packs && <b>{ficha.opciones.titulo_packs}</b>}
              <div className={`hpg-packs cantidad-${Math.min(packs.length + 1, 4)}`}>
                <TarjetaPack
                  elegido={!pack}
                  nombre={ficha.opciones.etiqueta_individual || '1 unidad'}
                  imagen={fotos[0]}
                  precio={variante?.precio_efectivo ?? item.precio}
                  nota={ficha.opciones.nota_individual}
                  onElegir={() => setPackId(null)}
                />
                {packs.map(p => {
                  const conf = ficha.opciones.packs?.[String(p.id)] || {};
                  const unidades = Math.max(1, Number(p.unidades) || 1);
                  const total = Number(p.precio_efectivo ?? p.precio) || 0;
                  const sinPack = p.tipo_contenido !== 'combo' && item.precio != null ? Number(item.precio) * unidades : null;
                  const ahorro = p.tipo_contenido !== 'combo' ? ahorroDePack(p, item.precio) : null;
                  return (
                    <TarjetaPack
                      key={p.id}
                      elegido={String(p.id) === String(packId)}
                      nombre={p.nombre}
                      // La foto que se cargó en la oferta (Ofertas → Paquete) manda;
                      // si no hay, la principal del producto.
                      imagen={p.imagen || conf.imagen || fotos[0]}
                      precio={total}
                      precioAntes={sinPack != null && sinPack > total ? sinPack : null}
                      ahorro={ahorro ? `${ficha.opciones.texto_ahorro ? `${ficha.opciones.texto_ahorro} ` : '-'}${ahorro}%` : ''}
                      nota={conf.nota}
                      onElegir={() => { setPackId(p.id); setVarianteId(null); }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {previewMode && ficha.opciones.activo && !variantes.length && !packs.length && (
            <p className="hpg-vacio">
              Sin variantes ni paquetes. Las variantes se cargan en Mis Productos y los paquetes en la pestaña
              Ofertas; aparecen acá como botones.
            </p>
          )}

          {ficha.compra.activo && (
            <div className="hpg-opcion-bloque">
              {conCantidad && ficha.compra.etiqueta_cantidad && <b>{ficha.compra.etiqueta_cantidad}</b>}
              <div className="hpg-comprar-fila">
                {conCantidad && (
                  <div className="hpg-cantidad">
                    <button type="button" aria-label="Restar uno" onClick={() => setCantidad(c => Math.max(1, c - 1))} disabled={cantidad <= 1}>
                      <Minus size={14} />
                    </button>
                    <span aria-live="polite">{cantidad}</span>
                    <button
                      type="button"
                      aria-label="Sumar uno"
                      onClick={() => setCantidad(c => (stockMax != null ? Math.min(stockMax, c + 1) : c + 1))}
                      disabled={stockMax != null && cantidad >= stockMax}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
                <button type="button" className="hpg-cta" onClick={agregar} disabled={stockMax != null && stockMax <= 0}>
                  {agregado ? (ficha.compra.cta_agregado || ficha.compra.cta_texto) : (ficha.compra.cta_texto || 'Agregar al carrito')}
                  <ShoppingBag size={17} />
                </button>
              </div>
            </div>
          )}

          {ficha.compra.activo && notasCompra.length > 0 && (
            <div className="hpg-notas">
              {notasCompra.map((x, i) => {
                const Icono = getIconoBeneficio(x.icono);
                return <span key={i}><Icono size={15} /> {x.texto}</span>;
              })}
            </div>
          )}
        </div>
      </section>

      {/* Franja de beneficios ──────────────────────────────────────── */}
      {ficha.beneficios.activo && (beneficios.length > 0 || previewMode) && (
        <section className="hpg-beneficios hpg-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="beneficios" />
          <div className="hpg-wrap">
            {beneficios.length === 0 ? (
              <p className="hpg-vacio">Cargá hasta cuatro beneficios en <b>Vista del producto</b> o en la sección {n('beneficios')}.</p>
            ) : (
              <div className={`hpg-beneficios-grid cantidad-${beneficios.length}`}>
                {beneficios.map((b, i) => (
                  <div key={i}>
                    <b>{String(i + 1).padStart(2, '0')}</b>
                    <span>{b.titulo}</span>
                    {b.texto && <small>{b.texto}</small>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Por qué te va a encantar ──────────────────────────────────── */}
      {ficha.historia.activo && (ficha.historia.titulo || ficha.historia.texto || puntosHistoria.length || previewMode) && (
        <section className="hpg-historia hpg-wrap hpg-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="historia" />
          <div>
            {ficha.historia.eyebrow && <p className="hpg-kicker">{ficha.historia.eyebrow}</p>}
            {ficha.historia.titulo && <h2>{ficha.historia.titulo}</h2>}
            {ficha.historia.texto
              ? <RichText text={ficha.historia.texto} className="hpg-texto" />
              : previewMode && !ficha.historia.titulo && <p className="hpg-vacio">Contá por qué este producto vale la pena (sección {n('historia')}).</p>}
            {puntosHistoria.length > 0 && (
              <div className="hpg-puntos">
                {puntosHistoria.map((p, i) => <span key={i}><Check size={15} /> {p}</span>)}
              </div>
            )}
          </div>
          <Foto src={ficha.historia.imagen || fotos[1] || fotos[0]} alt="" className="hpg-historia-foto" />
        </section>
      )}

      {/* Materiales y terminaciones ─────────────────────────────────── */}
      {ficha.materiales.activo && (materiales.length > 0 || previewMode) && (
        <section className="hpg-materiales hpg-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="materiales" />
          <div className="hpg-wrap">
            <Intro
              eyebrow={ficha.materiales.eyebrow}
              titulo={ficha.materiales.titulo}
              destacado={ficha.materiales.titulo_destacado}
              texto={ficha.materiales.subtitulo}
            />
            {materiales.length === 0 ? (
              <p className="hpg-vacio">Cargá los materiales en <b>Vista del producto</b> o en la sección {n('materiales')}.</p>
            ) : (
              <div className="hpg-materiales-grid">
                {materiales.map((ing, i) => (
                  <article key={i}>
                    {ing.imagen
                      ? <img className="hpg-material-foto" src={getMediaUrl(ing.imagen)} alt={ing.nombre} loading="lazy" />
                      : <IconoLibre valor={ing.icono} />}
                    <b>{ing.nombre}</b>
                    {ing.descripcion && <p>{ing.descripcion}</p>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Ideas de ambientación ─────────────────────────────────────────────── */}
      {ficha.ambientes.activo && (pasos.length > 0 || previewMode) && (
        <section className="hpg-ritual hpg-wrap hpg-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="ambientes" />
          <Intro
            eyebrow={ficha.ambientes.eyebrow}
            titulo={ficha.ambientes.titulo}
            destacado={ficha.ambientes.titulo_destacado}
            salto
          />
          {pasos.length === 0 ? (
            <p className="hpg-vacio">Cargá las ideas de ambientación en <b>Vista del producto</b> o en la sección {n('ambientes')}.</p>
          ) : (
            <div className={`hpg-pasos cantidad-${pasos.length}`}>
              {pasos.map((p, i) => (
                <article key={i}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {p.imagen
                    ? <img className="hpg-paso-foto" src={getMediaUrl(p.imagen)} alt={p.titulo} loading="lazy" />
                    : <IconoLibre valor={p.icono} />}
                  <b>{p.titulo}</b>
                  {p.descripcion && <p>{p.descripcion}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {ficha.medidas.activo && (ficha.medidas.texto || ficha.medidas.items.length > 0 || previewMode) && (
        <section className="hpg-medidas hpg-wrap hpg-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="medidas" />
          <Intro eyebrow={ficha.medidas.eyebrow} titulo={ficha.medidas.titulo} texto={ficha.medidas.texto} />
          <div className="hpg-medidas-items">
            {ficha.medidas.items.filter(x => x?.trim()).map((texto, i) => <span key={i}><Check size={16} />{texto}</span>)}
          </div>
        </section>
      )}

      {/* Detalles del producto (FAQ) ───────────────────────────────── */}
      {ficha.faq.activo && (item.faq.length > 0 || previewMode) && (
        <section className="hpg-detalles hpg-wrap hpg-preview-section" id="hpg-faq">
          <MarcadorPreview previewMode={previewMode} seccion="faq" />
          <div>
            {ficha.faq.eyebrow && <p className="hpg-kicker">{ficha.faq.eyebrow}</p>}
            {ficha.faq.titulo && <h2>{ficha.faq.titulo}</h2>}
          </div>
          {item.faq.length === 0 ? (
            <p className="hpg-vacio">Las preguntas se cargan en <b>Vista del producto</b> o en la sección {n('faq')}.</p>
          ) : (
            <div>
              {item.faq.map((f, i) => (
                <div className={`hpg-acordeon ${preguntaAbierta === i ? 'abierto' : ''}`} key={i}>
                  <button type="button" aria-expanded={preguntaAbierta === i} onClick={() => setPreguntaAbierta(preguntaAbierta === i ? null : i)}>
                    <span>{f.pregunta}</span>
                    <ChevronDown size={17} />
                  </button>
                  {preguntaAbierta === i && <RichText text={f.respuesta} className="hpg-acordeon-texto" />}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Reseñas ───────────────────────────────────────────────────── */}
      {ficha.resenas.activo && (resenas.length > 0 || previewMode) && (
        <section className="hpg-resenas hpg-preview-section" id="hpg-resenas">
          <MarcadorPreview previewMode={previewMode} seccion="resenas" />
          <div className="hpg-wrap">
            {ficha.resenas.eyebrow && <p className="hpg-kicker">{ficha.resenas.eyebrow}</p>}
            {ficha.resenas.titulo && <h2>{ficha.resenas.titulo}</h2>}
            {resenas.length === 0 ? (
              <p className="hpg-vacio">Cargá reseñas reales en <b>Vista del producto</b> o en la sección {n('resenas')}.</p>
            ) : (
              <div className="hpg-resenas-grid">
                {resenas.map((r, i) => (
                  <article key={i} className={r.foto ? 'con-foto' : ''}>
                    {r.foto && <img className="hpg-resena-foto" src={getMediaUrl(r.foto)} alt={r.nombre ? `Foto de ${r.nombre}` : ''} loading="lazy" />}
                    {Number(r.calificacion) > 0 && <Estrellas valor={r.calificacion} tamano={13} />}
                    <p>“{r.comentario}”</p>
                    {(r.nombre || r.detalle) && <b>— {[r.nombre, r.detalle].filter(Boolean).join(' · ')}</b>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Complementá tu rutina ─────────────────────────────────────── */}
      {ficha.upsells.activo && item.relacionados.length > 0 && (
        <section className="hpg-upsells hpg-wrap hpg-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="upsells" />
          {(item.relacionadosTitulo || ficha.upsells.titulo) && <h2>{item.relacionadosTitulo || ficha.upsells.titulo}</h2>}
          <div className="hpg-upsells-grid">
            {item.relacionados.map(r => {
              const precioR = r.precio ?? r.precio_efectivo ?? r.precio_base ?? null;
              const antes = r.precio_ancla ?? r.precio_tachado ?? null;
              return (
                <div className="hpg-upsell" key={r.id}>
                  <div className="hpg-upsell-img">
                    <ImagenProductoHover
                      imagenes={(r.imagenes || []).map(getMediaUrl)}
                      imagen={r.imagen ? getMediaUrl(r.imagen) : null}
                      alt={r.nombre}
                      fallback={<ImageOff size={22} />}
                    />
                  </div>
                  <div className="hpg-upsell-datos">
                    <b>{r.nombre}</b>
                    {r.descripcion && <p>{r.descripcion}</p>}
                    <span>
                      {precioR != null && <strong>{formatPrecio(precioR)}</strong>}
                      {antes != null && precioR != null && Number(antes) > Number(precioR) && <del>{formatPrecio(antes)}</del>}
                    </span>
                  </div>
                  <button type="button" onClick={() => onClickRelacionado && onClickRelacionado(r)}>
                    {ficha.upsells.cta_texto || 'Ver'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sellos de confianza ───────────────────────────────────────── */}
      {ficha.garantias.activo && garantias.length > 0 && (
        <section className={`hpg-sellos hpg-wrap hpg-preview-section cantidad-${garantias.length}`}>
          <MarcadorPreview previewMode={previewMode} seccion="garantias" />
          {garantias.map((g, i) => {
            const Icono = getIconoBeneficio(g.icono);
            return (
              <div key={i}>
                <Icono size={22} />
                <b>{g.titulo}</b>
                {g.texto && <span>{g.texto}</span>}
              </div>
            );
          })}
        </section>
      )}

      {/* Pie de la ficha ───────────────────────────────────────────── */}
      {ficha.cta_final.activo && (ficha.cta_final.marca || nombreComercio || ficha.cta_final.texto) && (
        <div className="hpg-pie hpg-preview-section">
          <MarcadorPreview previewMode={previewMode} seccion="cta_final" />
          <div className="hpg-wrap">
            {(ficha.cta_final.marca || nombreComercio) && <b>{ficha.cta_final.marca || nombreComercio}</b>}
            {ficha.cta_final.texto && <span>{ficha.cta_final.texto}</span>}
          </div>
        </div>
      )}

      {contacto && <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={vars['--hpg-line']} isMobile={isMobile} />}
      <StoreFooterLegal tema={{ ...t, texto: vars['--hpg-fg'] }} bordeSuave={vars['--hpg-line']} nombreComercio={nombreComercio} isPreview={previewMode} />

      {/* Barra fija de compra — solo en celular (la muestra el CSS). */}
      {ficha.compra.activo && (
        <div className="hpg-barra-movil">
          <div>
            <b>{precio != null ? formatPrecio(precio) : ''}</b>
            {(pack || variante) && <small>{pack ? pack.nombre : variante.nombre}</small>}
          </div>
          <button type="button" className="hpg-cta" onClick={agregar} disabled={stockMax != null && stockMax <= 0}>
            {agregado ? (ficha.compra.cta_agregado || ficha.compra.cta_texto) : (ficha.compra.cta_texto || 'Agregar al carrito')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Piezas internas ──────────────────────────────────────────────── */

function MarcadorPreview({ previewMode, seccion }) {
  if (!previewMode) return null;
  const numero = n(seccion);
  if (!numero) return null;
  return <span className="hpg-preview-marker">Sección {numero}</span>;
}

/**
 * Tarjeta de "Elegí tu pack": foto, nombre, precio, precio sin el pack
 * tachado y el ahorro. La MISMA para la unidad suelta y para cada paquete,
 * así las opciones quedan del mismo tamaño y solo cambia el contenido.
 */
function TarjetaPack({ elegido, nombre, imagen, precio, precioAntes = null, ahorro = '', nota = '', onElegir }) {
  return (
    <button type="button" className={`hpg-pack ${elegido ? 'elegido' : ''}`} onClick={onElegir} aria-pressed={elegido}>
      <span className="hpg-pack-foto">
        {imagen ? <img src={getMediaUrl(imagen)} alt="" loading="lazy" /> : <ImageOff size={22} />}
        {elegido && <span className="hpg-pack-tilde" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>}
      </span>
      <span className="hpg-pack-datos">
        <strong>{nombre}</strong>
        {precio != null && (
          <span className="hpg-pack-precios">
            <b>{formatPrecio(precio)}</b>
            {precioAntes != null && <del>{formatPrecio(precioAntes)}</del>}
          </span>
        )}
        {ahorro && <span className="hpg-pack-ahorro">{ahorro}</span>}
        {nota && <small>{nota}</small>}
      </span>
    </button>
  );
}

/** Rótulo, título (con parte destacada en cursiva) y bajada de una sección. */
function Intro({ eyebrow, titulo, destacado, texto, salto = false }) {
  if (!eyebrow && !titulo && !destacado && !texto) return null;
  return (
    <div className="hpg-intro">
      {eyebrow && <p className="hpg-kicker">{eyebrow}</p>}
      {(titulo || destacado) && (
        <h2>
          {titulo}
          {destacado && <>{salto ? <br /> : ' '}<em>{destacado}</em></>}
        </h2>
      )}
      {texto && <p className="hpg-texto">{texto}</p>}
    </div>
  );
}

/**
 * Ícono de un material o paso. En Mis Productos el ícono de Bazar se
 * carga como emoji ("💧"); en el panel, como clave del catálogo ("droplet").
 * Las dos formas valen: si no es una clave conocida se dibuja el texto.
 */
const CLAVES_ICONO = new Set(CATALOGO_ICONOS_BENEFICIOS.map(i => i.key));
function IconoLibre({ valor }) {
  if (valor && CLAVES_ICONO.has(valor)) {
    const Icono = getIconoBeneficio(valor);
    return <span className="hpg-icono"><Icono size={22} /></span>;
  }
  if (valor) return <span className="hpg-icono hpg-icono--texto" aria-hidden="true">{valor}</span>;
  return <span className="hpg-icono"><Sparkles size={22} /></span>;
}

function Foto({ src, alt, className }) {
  if (!src) return <div className={`${className} hpg-foto-vacia`}><ImageOff size={30} /></div>;
  return <img src={getMediaUrl(src)} alt={alt} className={className} loading="lazy" />;
}

function Estrellas({ valor = 5, tamano = 14 }) {
  const llenas = Math.round(Number(valor) || 0);
  return (
    <span className="hpg-estrellas" aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map(k => (
        <Star key={k} size={tamano} fill={k <= llenas ? 'currentColor' : 'none'} strokeWidth={1.6} />
      ))}
    </span>
  );
}

/**
 * Paleta de la ficha a partir de los tres colores que edita el comercio.
 * El diseño es una escala de rosa sobre crema con franjas oscuras: el rosa
 * sale del acento (el "color de botones" de la tienda), los fondos suaves
 * del acento aclarado y las franjas oscuras del texto (o del acento
 * oscurecido si el texto de la tienda es claro). No hay un color literal en
 * el CSS.
 *
 * ── Legibilidad ────────────────────────────────────────────────────────
 * Los colores de la tienda se usan tal cual SOLO si se leen. Cada texto se
 * valida contra todas las superficies donde aparece (fondo, tarjetas,
 * franjas suaves) y, si no llega al contraste mínimo, cae al oscuro o claro
 * que sí se lea (textoLegible). Sin esto, una tienda con fondo rosa y texto
 * blanco dejaba los packs con texto blanco sobre tarjetas blancas.
 */
function calcularVariables(t, colorCta) {
  const { fondo, texto, acento } = t;
  const fondoEsOscuro = contraste(fondo, '#FFFFFF') >= 3;
  const cta = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorCta || '') ? colorCta : acento;

  // Superficies: salen del fondo y del acento, nunca del texto.
  const card = fondoEsOscuro ? componer('#FFFFFF', 0.07, fondo) : '#FFFFFF';
  const crema = fondoEsOscuro ? componer('#FFFFFF', 0.04, fondo) : componer(acento, 0.07, fondo);
  const rosa = componer(acento, fondoEsOscuro ? 0.12 : 0.13, fondo);
  const blush = fondoEsOscuro ? componer(acento, 0.2, fondo) : componer(acento, 0.2, '#FFFFFF');
  const superficies = [fondo, card, crema, rosa];

  // Un color que se lea sobre TODAS las superficies; si no, el oscuro o el
  // claro que mejor se lea en la peor de ellas.
  // Conserva el tono elegido: si no se lee, lo oscurece/aclara lo justo
  // (ver ajustarLegible), nunca lo cambia por negro de entrada.
  const legibleEn = (color, fondos, minimo = 4.5) => ajustarLegible(color, fondos, minimo);
  const suaveEn = (base, fondos, minimo = 4.5) => {
    for (let a = 0.68; a < 1; a += 0.04) {
      const c = componer(base, a, fondo);
      if (fondos.every(b => contraste(c, b) >= minimo)) return c;
    }
    return base;
  };
  // Para botones y cintillos (texto grande y en negrita): blanco mientras se
  // lea, que es lo que se espera de un botón; si no, oscuro.
  const sobre = (color) => (contraste('#FFFFFF', color) >= 3 ? '#FFFFFF' : '#1A1A1A');

  const fg = legibleEn(texto, superficies);
  const muted = suaveEn(fg, superficies);
  // Rótulos, notas y precios en el color de la tienda si se lee; si no, el texto.
  // Va también en rótulos chicos (10-11 px): pide el mínimo de texto normal.
  const destacado = legibleEn(acento, superficies);

  // Franja oscura: el texto de la tienda si es oscuro; si es claro (o la
  // landing es oscura), el acento oscurecido.
  const profundo = fondoEsOscuro
    ? componer('#FFFFFF', 0.1, fondo)
    : (contraste(texto, '#FFFFFF') >= 7 ? texto : componer('#000000', 0.72, acento));
  const onProfundo = sobre(profundo);
  const acentoSobreProfundo = contraste(componer(acento, 0.45, '#FFFFFF'), profundo) >= 4.5
    ? componer(acento, 0.45, '#FFFFFF')
    : onProfundo;
  const urgencia = fondoEsOscuro ? componer(acento, 0.7, fondo) : componer(acento, 0.75, '#FFFFFF');

  return {
    '--hpg-bg': fondo,
    '--hpg-fg': fg,
    '--hpg-accent': acento,
    '--hpg-on-accent': sobre(acento),
    '--hpg-destacado': destacado,
    '--hpg-muted': muted,
    '--hpg-line': hexToRgba(fg, 0.14),
    '--hpg-line-fuerte': hexToRgba(fg, 0.26),
    '--hpg-card': card,
    '--hpg-crema': crema,
    '--hpg-rosa': rosa,
    '--hpg-blush': blush,
    '--hpg-on-suave': textoLegible(fg, blush),
    '--hpg-profundo': profundo,
    '--hpg-on-profundo': onProfundo,
    // El tono suave solo si todavía se lee; si no, el pleno.
    '--hpg-on-profundo-suave': contraste(componer(onProfundo, 0.78, profundo), profundo) >= 4.5 ? hexToRgba(onProfundo, 0.78) : onProfundo,
    '--hpg-acento-profundo': acentoSobreProfundo,
    '--hpg-urgencia': urgencia,
    // Las cajitas del contador son siempre blancas.
    '--hpg-on-blanco': textoLegible(fg, '#FFFFFF'),
    '--hpg-on-urgencia': sobre(urgencia),
    '--hpg-cta': cta,
    '--hpg-on-cta': sobre(cta),
    '--hpg-cta-sombra': hexToRgba(cta, 0.3),
    // Si el botón o el acento casi no se distinguen del fondo (colores muy
    // claros), el botón lleva borde y lo elegido se marca con el texto.
    '--hpg-cta-borde': contraste(cta, fondo) < 1.6 ? hexToRgba(fg, 0.35) : 'transparent',
    '--hpg-marca': contraste(acento, card) >= 3 ? acento : fg,
    '--hpg-on-marca': sobre(contraste(acento, card) >= 3 ? acento : fg),
    '--hpg-sombra': hexToRgba(fg, 0.1),
    '--hpg-estrella': '#D4953E',
  };
}
