import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ImageOff, Minus, ShieldCheck, Star } from 'lucide-react';
import { getMediaUrl } from '../../../../services/api';
import { formatPrecio } from '../../../../lib/mensajeWhatsapp';
import { getIconoBeneficio } from '../iconosBeneficios';
import { hexToRgba, componer, contraste, resolverTemaPorSlug } from '../themeUtils';
import { ahorroDePack } from '../fichaComun';
import { RedesSocialesFooter, ImagenProductoHover } from '../sections';
import StoreFooterLegal from '../../../landing/StoreFooterLegal';
import RichText from '../../../../components/RichText';
import BarraMarquee from '../BarraMarquee';
import { agruparOpciones, resolverVariante, valorDisponible, seleccionDeVariante } from '../../../../lib/varianteOpciones';
import './basicoProductPage.css';

/**
 * Ficha de producto del template "Básico".
 *
 * ── Un solo renderer ───────────────────────────────────────────────────
 * Lo montan los dos lados: el preview del armador y la landing publicada
 * (ver BasicoProductPagePublica.jsx). Es la regla que se fijó cuando
 * preview y publicada se desincronizaron por tener dos componentes
 * dibujando lo mismo. Si aparece un tercer lugar, llama a este componente.
 *
 * `previewMode` solo muestra ayudas del editor: evita navegar fuera del
 * editor, muestra carteles de secciones vacías y numera los títulos para
 * orientar al usuario. La landing publicada conserva el mismo contenido sin
 * esas guías.
 *
 * Estructura fija de 13 secciones + el footer de siempre, contenido 100%
 * editable — ver fichaBasico.js para de dónde sale cada una.
 */
export default function BasicoProductPage({
  item,
  ficha,
  tema,
  templateSlug = 'basico',
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
  const [preguntaAbierta, setPreguntaAbierta] = useState(null);

  const t = resolverTemaPorSlug(tema, templateSlug);
  const vars = useMemo(() => calcularVariables(t), [t.fondo, t.texto, t.acento]);

  const packs = item?.packs || [];
  const pack = packs.find(p => String(p.id) === String(packId)) || null;

  const tieneVariantes = (item?.variantes || []).length > 0;
  const gruposOpciones = useMemo(() => agruparOpciones(item), [item]);
  const [seleccion, setSeleccion] = useState(() => {
    if (!tieneVariantes) return {};
    const conStock = item.variantes.find(v => v.stock > 0);
    return seleccionDeVariante(item, conStock || item.variantes[0]);
  });
  const variante = tieneVariantes ? resolverVariante(item, seleccion) : null;

  // Paquete y variante no se combinan (misma regla que en Fitness/Beauty/
  // Tech): el paquete manda si hay uno elegido, si no sigue la variante.
  const precio = pack ? (pack.precio_efectivo ?? pack.precio) : (variante ? variante.precio_efectivo : item?.precio);

  useEffect(() => { setIndiceImagen(0); }, [item?.nombre, variante?.id]);
  useEffect(() => {
    if (packId && !packs.some(p => String(p.id) === String(packId))) setPackId(null);
  }, [packs, packId]);

  if (!item) return null;

  // Lo que está a medio cargar no se publica, pero se conserva en el editor:
  // por eso el filtro vive acá y no en el normalizador.
  const beneficios = (ficha.beneficios.items || []).filter(b => b?.titulo?.trim());
  const pasos = (ficha.usos.pasos || []).filter(p => p?.titulo?.trim());
  const garantias = (ficha.garantias.items || []).filter(g => g?.titulo?.trim());
  const destacados = (ficha.descripcion.destacados || []).filter(d => String(d || '').trim());
  const comparaciones = (ficha.comparacion.items || []).filter(c => c?.caracteristica?.trim());

  const irAOfertas = () => {
    const destino = document.getElementById('bsc-opciones');
    if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else comprar();
  };

  const comprar = () => onComprar && onComprar({ variante, pack, precio });
  // Agregar al carrito NO puede caer a comprar(): son acciones distintas y
  // abrir el formulario cuando alguien solo quiso guardar el producto es lo
  // peor que puede hacer un botón. Sin handler, el botón no se muestra.
  const agregar = (elegido) => onAgregar && onAgregar({
    variante,
    pack: elegido ?? pack,
    precio: elegido ? (elegido.precio_efectivo ?? elegido.precio) : precio,
  });

  // Si la variante elegida tiene fotos propias, la galería pasa a ser la
  // de ella — es la que el cliente espera ver al elegir, por ej., el color.
  // Si no cargaron ninguna, se sigue viendo la galería general del producto.
  const galeria = variante?.imagenes?.length ? variante.imagenes : item.imagenes;
  const imagenActual = galeria[indiceImagen] || galeria[0] || null;

  const tituloTexto = (ficha.hero.titulo || item.nombre || '').trim();
  const largoTitulo = tituloTexto.length + (ficha.hero.titulo_destacado || '').length;
  const claseTitulo = largoTitulo > 78 ? 'es-muy-largo' : largoTitulo > 38 ? 'es-largo' : '';

  const descripcionTexto = ficha.descripcion.texto || item.descripcion;
  const imagenNosotros = ficha.comparacion.imagen_nosotros || item.imagenes[0] || null;

  return (
    <div className={`bsc-root ${isMobile ? 'es-movil' : ''}`} style={vars}>
      {/* 1 · Barra superior ───────────────────────────────────────── */}
      {ficha.barra_superior.activo && ficha.barra_superior.items.length > 0 && (
        <BarraMarquee
          className="bsc-barra"
          items={ficha.barra_superior.items}
          animado={ficha.barra_superior.animado !== false}
          velocidad={ficha.barra_superior.velocidad}
          separador={ficha.barra_superior.separador}
          renderItem={(a, i) => {
            const Icono = getIconoBeneficio(a.icono);
            return <span className="bsc-barra-item" key={i}><Icono size={14} /> {a.texto}</span>;
          }}
          cta={ficha.barra_superior.cta_texto ? (
            <button type="button" className="bsc-barra-cta" onClick={irAOfertas}>
              {ficha.barra_superior.cta_texto}
            </button>
          ) : null}
        />
      )}

      <div className="bsc-wrap">
        {onVolver && (
          <button type="button" className="bsc-volver" onClick={onVolver}>
            <ArrowLeft size={15} /> Volver al catálogo
          </button>
        )}
      </div>

      {/* 2 · Hero ─────────────────────────────────────────────────── */}
      <section className="bsc-hero bsc-wrap" id="bsc-hero">
        <div className="bsc-hero-visual">
          {ficha.hero.etiqueta && <span className="bsc-hero-badge">{ficha.hero.etiqueta}</span>}
          <div className="bsc-hero-foto">
            {imagenActual
              ? <img src={getMediaUrl(imagenActual)} alt={item.nombre} />
              : <ImageOff size={44} />}
          </div>
          {galeria.length > 1 && (
            <div className="bsc-miniaturas">
              {galeria.slice(0, 5).map((url, i) => (
                <button
                  type="button"
                  key={url + i}
                  aria-label={`Foto ${i + 1} de ${galeria.length}`}
                  className={`bsc-miniatura ${i === indiceImagen ? 'activa' : ''}`}
                  onClick={() => setIndiceImagen(i)}
                >
                  <img src={getMediaUrl(url)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`bsc-hero-copy ${claseTitulo}`}>
          {(ficha.hero.eyebrow || item.categoria) && (
            <p className="bsc-eyebrow">{ficha.hero.eyebrow || nombreCategoria(item.categoria)}</p>
          )}

          <h1>
            {ficha.hero.titulo || item.nombre}
            {ficha.hero.titulo_destacado && (
              <> <span className="bsc-hero-destacado">{ficha.hero.titulo_destacado}</span></>
            )}
          </h1>

          {(ficha.hero.lead || item.descripcion) && (
            <RichText text={ficha.hero.lead || item.descripcion} className="bsc-lead" />
          )}

          {ficha.hero.caracteristicas.length > 0 && (
            <ul className="bsc-checklist">
              {ficha.hero.caracteristicas.map((linea, i) => (
                <li key={i}><span className="bsc-check"><Check size={12} strokeWidth={3} /></span> {linea}</li>
              ))}
            </ul>
          )}

          <button type="button" className="bsc-cta" onClick={irAOfertas}>
            {ficha.hero.cta_texto || 'Comprar ahora'}
          </button>
        </div>
      </section>

      {/* 3 · Oferta y precio ──────────────────────────────────────── */}
      {ficha.precio.activo && item.precio != null && (
        <section className="bsc-seccion bsc-wrap">
          <TituloSeccion numero={3} texto={ficha.precio.titulo} vars={vars} mostrarNumero={previewMode} />
          <div className="bsc-precio-caja">
            <div>
              {ficha.precio.etiqueta_oferta && (
                <p className="bsc-precio-etiqueta">{ficha.precio.etiqueta_oferta}</p>
              )}
              <span className="bsc-precio-valor">{formatPrecio(item.precio)}</span>
            </div>
            {item.precioAntes != null && (
              <>
                <del className="bsc-precio-antes">{formatPrecio(item.precioAntes)}</del>
                {item.descuentoPct > 0 && <span className="bsc-precio-desc">-{item.descuentoPct}%</span>}
              </>
            )}
          </div>
          {ficha.precio.nota && <p className="bsc-precio-nota">{ficha.precio.nota}</p>}
        </section>
      )}

      {/* 4 · Opciones de compra ───────────────────────────────────── */}
      {ficha.opciones.activo && (
        <section className="bsc-seccion bsc-wrap" id="bsc-opciones">
          <TituloSeccion numero={4} texto={ficha.opciones.titulo} vars={vars} mostrarNumero={previewMode} />

          {tieneVariantes && gruposOpciones.map(grupo => (
            <div className="bsc-variantes" key={grupo.nombre}>
              <span className="bsc-variantes-label">{grupo.nombre}:</span>
              <div className="bsc-variantes-pills">
                {grupo.valores.map(valor => {
                  const activo = seleccion[grupo.nombre] === valor;
                  const disponible = valorDisponible(item, grupo.nombre, valor, seleccion);
                  return (
                    <button
                      key={valor}
                      type="button"
                      className={`bsc-variante-pill ${activo ? 'activa' : ''}`}
                      onClick={() => setSeleccion(prev => ({ ...prev, [grupo.nombre]: valor }))}
                      disabled={!disponible}
                      title={!disponible ? 'Sin stock o combinación no disponible' : undefined}
                    >
                      {valor}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {packs.length === 0 && previewMode ? (
            <p className="bsc-vacio">
              Todavía no cargaste paquetes. Se crean en la pestaña <b>Ofertas</b> de este producto
              (“Paquete — más unidades del mismo producto”) y aparecen acá como tarjetas.
            </p>
          ) : (
            <div className="bsc-packs">
              <TarjetaPack
                elegido={!pack}
                nombre={ficha.opciones.etiqueta_individual || '1 unidad'}
                imagen={galeria[0]}
                precio={item.precio}
                precioAntes={item.precioAntes}
                notaPrecio={packs.length > 0 ? 'Precio normal' : null}
                nota={ficha.opciones.nota_pack}
                cta={ficha.opciones.cta_pack}
                onElegir={() => setPackId(null)}
                onAgregar={onAgregar ? () => agregar(null) : null}
              />
              {packs.map(p => {
                const conf = ficha.opciones.packs?.[String(p.id)] || {};
                const unidades = Number(p.unidades) || 1;
                return (
                  <TarjetaPack
                    key={p.id}
                    elegido={String(packId) === String(p.id)}
                    badge={conf.badge}
                    nombre={p.nombre}
                    subtitulo={conf.subtitulo || `${unidades} unidades`}
                    imagen={p.imagen || galeria[0]}
                    precio={p.precio_efectivo ?? p.precio}
                    ahorro={ahorroDePack(p, item.precio)}
                    nota={ficha.opciones.nota_pack}
                    cta={ficha.opciones.cta_pack}
                    onElegir={() => setPackId(p.id)}
                    onAgregar={onAgregar ? () => agregar(p) : null}
                  />
                );
              })}
            </div>
          )}

          {/* Sin carrito (el preview del armador) el único camino de compra
              es este botón; con carrito, cada tarjeta ya tiene el suyo. */}
          {!onAgregar && (
            <div className="bsc-opciones-cta">
              <button type="button" className="bsc-cta" onClick={comprar}>
                {ficha.opciones.cta_pack || 'Comprar ahora'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 5 · Beneficios clave ─────────────────────────────────────── */}
      {ficha.beneficios.activo && (beneficios.length > 0 || previewMode) && (
        <section className="bsc-seccion bsc-seccion--fondo">
          <div className="bsc-wrap">
            <TituloSeccion numero={5} texto={ficha.beneficios.titulo} vars={vars} centrado mostrarNumero={previewMode} />
            {beneficios.length === 0 ? (
              <p className="bsc-vacio">
                Se cargan en <b>Vista del producto</b>.
              </p>
            ) : (
              <div className="bsc-beneficios">
                {beneficios.map((b, i) => {
                  const Icono = getIconoBeneficio(b.icono);
                  return (
                    <div className="bsc-beneficio" key={i}>
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

      {/* 6 · Descripción del producto ─────────────────────────────── */}
      {ficha.descripcion.activo && (descripcionTexto || previewMode) && (
        <section className="bsc-seccion bsc-wrap">
          <TituloSeccion numero={6} texto={ficha.descripcion.titulo} vars={vars} mostrarNumero={previewMode} />
          {!descripcionTexto ? (
            <p className="bsc-vacio">
              El texto sale de la descripción del producto, o se escribe en <b>Vista del producto</b>.
            </p>
          ) : (
            <div className="bsc-descripcion-card">
              {ficha.descripcion.encabezado && <h3>{ficha.descripcion.encabezado}</h3>}
              <RichText text={descripcionTexto} className="bsc-texto" />
              {destacados.length > 0 && (
                <div className="bsc-destacados">
                  {destacados.map((d, i) => (
                    <span key={i}><Check size={14} strokeWidth={3} /> {d}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 7 · Usos y aplicaciones ──────────────────────────────────── */}
      {ficha.usos.activo && (pasos.length > 0 || previewMode) && (
        <section className="bsc-seccion bsc-wrap">
          <TituloSeccion numero={7} texto={ficha.usos.titulo} vars={vars} centrado mostrarNumero={previewMode} />
          {pasos.length === 0 ? (
            <p className="bsc-vacio">
              Los pasos de uso se cargan en <b>Vista del producto</b>.
            </p>
          ) : (
            <div className="bsc-pasos">
              {pasos.map((p, i) => (
                <div className="bsc-paso" key={i}>
                  <span className="bsc-paso-numero">{p.paso || i + 1}</span>
                  <b>{p.titulo}</b>
                  {p.texto && <p>{p.texto}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 8 · Prueba social ────────────────────────────────────────── */}
      {ficha.prueba_social.activo && (
        <div className="bsc-social">
          <div className="bsc-wrap bsc-social-inner">
            {ficha.prueba_social.etiqueta && <b>{ficha.prueba_social.etiqueta}</b>}
            <Estrellas valor={ficha.prueba_social.calificacion} tamano={15} />
            <b>{Number(ficha.prueba_social.calificacion).toFixed(1)}/5</b>
            {ficha.prueba_social.resenas_texto && <small>{ficha.prueba_social.resenas_texto}</small>}
            {ficha.prueba_social.clientes_texto && <small>{ficha.prueba_social.clientes_texto}</small>}
          </div>
        </div>
      )}

      {/* 9 · Comparación ──────────────────────────────────────────── */}
      {ficha.comparacion.activo && (comparaciones.length > 0 || previewMode) && (
        <section className="bsc-seccion bsc-wrap">
          <TituloSeccion numero={9} texto={ficha.comparacion.titulo} vars={vars} centrado mostrarNumero={previewMode} />
          {comparaciones.length === 0 ? (
            <p className="bsc-vacio">
              Agregá las características a comparar en <b>Vista del producto</b>.
            </p>
          ) : (
            <div className="bsc-compare">
              <LadoComparacion
                titulo={ficha.comparacion.nosotros}
                imagen={imagenNosotros}
                items={comparaciones}
                campo="nosotros"
              />
              <span className="bsc-compare-vs">VS</span>
              <LadoComparacion
                esOtros
                titulo={ficha.comparacion.otros}
                imagen={ficha.comparacion.imagen_otros}
                items={comparaciones}
                campo="otros"
              />
            </div>
          )}
        </section>
      )}

      {/* 10 · Preguntas frecuentes ────────────────────────────────── */}
      {ficha.faq.activo && (item.faq.length > 0 || previewMode) && (
        <section className="bsc-seccion bsc-wrap">
          <TituloSeccion numero={10} texto={item.faqTitulo || ficha.faq.titulo} vars={vars} centrado mostrarNumero={previewMode} />
          {item.faq.length === 0 ? (
            <p className="bsc-vacio">Cargá las preguntas desde esta misma sección, en el editor.</p>
          ) : (
            <div className="bsc-faq-grid">
              {item.faq.map((f, i) => (
                <div className={`bsc-faq-item ${preguntaAbierta === i ? 'abierta' : ''}`} key={i}>
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

      {/* 11 · Productos relacionados ──────────────────────────────── */}
      {ficha.relacionados.activo && item.relacionados.length > 0 && (
        <section className="bsc-seccion bsc-seccion--fondo">
          <div className="bsc-wrap">
            <TituloSeccion numero={11} texto={item.relacionadosTitulo || ficha.relacionados.titulo} vars={vars} centrado mostrarNumero={previewMode} />
            <div className="bsc-relacionados">
              {item.relacionados.map(r => {
                const precioRel = r.precio ?? r.precio_efectivo ?? r.precio_base ?? null;
                const antes = r.precio_ancla ?? r.precio_tachado ?? null;
                const enOferta = antes != null && precioRel != null && Number(antes) > Number(precioRel);
                return (
                  <div className="bsc-relacionado" key={r.id}>
                    <span className="bsc-relacionado-img">
                      <ImagenProductoHover
                        imagenes={(r.imagenes || []).map(getMediaUrl)}
                        imagen={r.imagen ? getMediaUrl(r.imagen) : null}
                        alt={r.nombre}
                        imgClassName="w-full h-full object-contain transition-opacity duration-500 ease-out"
                        fallback={<ImageOff size={22} />}
                      />
                    </span>
                    <b>{r.nombre}</b>
                    {r.descripcion && <p>{r.descripcion}</p>}
                    <span className="bsc-relacionado-precio">
                      {precioRel != null && formatPrecio(precioRel)}
                      {enOferta && <del>{formatPrecio(antes)}</del>}
                    </span>
                    <button
                      type="button"
                      className="bsc-relacionado-cta"
                      onClick={() => onClickRelacionado && onClickRelacionado(r)}
                    >
                      {ficha.relacionados.cta_texto || 'Agregar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 12 · Garantía y devoluciones ─────────────────────────────── */}
      {ficha.garantias.activo && (garantias.length > 0 || ficha.garantias.texto) && (
        <section className="bsc-seccion bsc-wrap">
          <TituloSeccion numero={12} texto={ficha.garantias.titulo} vars={vars} centrado mostrarNumero={previewMode} />
          {garantias.length > 0 && (
            <div className="bsc-garantias-grid">
              {garantias.map((g, i) => {
                const Icono = getIconoBeneficio(g.icono);
                return (
                  <div className="bsc-garantia" key={i}>
                    <Icono size={22} />
                    <b>{g.titulo}</b>
                    {g.texto && <small>{g.texto}</small>}
                  </div>
                );
              })}
            </div>
          )}
          {ficha.garantias.texto && (
            <div className="bsc-devolucion">
              <ShieldCheck size={34} />
              <div>
                {ficha.garantias.encabezado && <h3>{ficha.garantias.encabezado}</h3>}
                <p>{ficha.garantias.texto}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 13 · Cierre y urgencia ───────────────────────────────────── */}
      {ficha.cta_final.activo && (
        <section className="bsc-cierre">
          <div className="bsc-wrap bsc-cierre-inner">
            <div>
              {ficha.cta_final.etiqueta && <p className="bsc-cierre-etiqueta">{ficha.cta_final.etiqueta}</p>}
              {ficha.cta_final.contador.activo && <Contador desde={ficha.cta_final.contador} />}
            </div>
            <div className="bsc-cierre-copy">
              {ficha.cta_final.titulo && <h2>{ficha.cta_final.titulo}</h2>}
              {ficha.cta_final.texto && <p>{ficha.cta_final.texto}</p>}
            </div>
            <button type="button" className="bsc-cierre-cta" onClick={irAOfertas}>
              {ficha.cta_final.cta_texto || 'Comprar ahora'}
              {ficha.cta_final.cta_nota && <small>{ficha.cta_final.cta_nota}</small>}
            </button>
          </div>
        </section>
      )}

      {/* 14 · El footer de siempre ────────────────────────────────── */}
      {contacto && <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={vars['--bsc-border']} isMobile={isMobile} />}
      <StoreFooterLegal tema={t} bordeSuave={vars['--bsc-border']} nombreComercio={nombreComercio} isPreview={previewMode} />

      {/* Barra fija en móvil: el CTA queda arriba del pliegue y se pierde al
          recorrer las 13 secciones. */}
      <div className="bsc-barra-movil">
        <div className="bsc-barra-movil-precio">
          <b>{precio != null ? formatPrecio(precio) : ''}</b>
          {pack && <small>{pack.nombre}</small>}
        </div>
        <button type="button" className="bsc-cta" onClick={irAOfertas}>
          {ficha.hero.cta_texto || 'Comprar ahora'}
        </button>
      </div>
    </div>
  );
}

/* ── Piezas internas ──────────────────────────────────────────────── */

/** La categoría llega como string en el editor y como objeto en el DTO público. */
function nombreCategoria(categoria) {
  if (!categoria) return '';
  return typeof categoria === 'string' ? categoria : (categoria.nombre || '');
}

function TituloSeccion({ numero, texto, vars, centrado = false, mostrarNumero = false }) {
  if (!texto) return null;
  return (
    <div className={`bsc-seccion-titulo ${centrado ? 'es-centrado' : ''}`}>
      {mostrarNumero && (
        <span
          aria-hidden="true"
          style={{
            display: 'grid', placeItems: 'center', width: 28, height: 28,
            borderRadius: '50%', background: vars['--bsc-accent'], color: vars['--bsc-on-accent'],
            fontSize: 13, fontWeight: 900, flexShrink: 0,
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
    <span className="bsc-estrellas" aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={tamano} fill={n <= llenas ? 'currentColor' : 'none'} strokeWidth={1.6} />
      ))}
    </span>
  );
}

/**
 * Una de las dos columnas de la comparación. Las dos recorren la MISMA
 * lista de características: es lo que hace que las filas queden alineadas y
 * que la comparación se lea de corrido.
 */
function LadoComparacion({ titulo, imagen, items, campo, esOtros = false }) {
  return (
    <div className={`bsc-compare-lado ${esOtros ? 'es-otros' : ''}`}>
      <div className="bsc-compare-foto">
        {imagen ? <img src={getMediaUrl(imagen)} alt={titulo || ''} loading="lazy" /> : <ImageOff size={26} />}
      </div>
      {titulo && <b>{titulo}</b>}
      <ul className="bsc-compare-lista">
        {items.map((c, i) => (
          <li key={i}>
            {c[campo]
              ? <Check size={14} strokeWidth={3} className="bsc-compare-si" />
              : <Minus size={14} strokeWidth={3} className="bsc-compare-no" />}
            {c.caracteristica}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Tarjeta de opción de compra. La misma para el paquete y para la unidad
 * suelta: en la referencia las tres opciones tienen exactamente el mismo
 * tamaño y solo se diferencian por el cintillo y el texto bajo el precio.
 */
function TarjetaPack({
  elegido, badge, nombre, subtitulo, imagen, precio, precioAntes,
  ahorro, notaPrecio, nota, cta, onElegir, onAgregar,
}) {
  return (
    <div className={`bsc-pack ${elegido ? 'elegido' : ''}`}>
      {badge && <span className="bsc-pack-badge">{badge}</span>}
      {/* La tarjeta entera selecciona; el CTA de abajo es el que agrega. Son
          dos botones hermanos, nunca uno adentro del otro. */}
      <button type="button" className="bsc-pack-elegir" onClick={onElegir}>
        <span className="bsc-pack-nombre">{nombre}</span>
        {subtitulo && <span className="bsc-pack-sub">{subtitulo}</span>}
        <span className="bsc-pack-imagen">
          {imagen ? <img src={getMediaUrl(imagen)} alt="" loading="lazy" /> : <ImageOff size={24} />}
        </span>
        <span className="bsc-pack-precio">{formatPrecio(precio)}</span>
        {precioAntes != null && precioAntes > precio && <del>{formatPrecio(precioAntes)}</del>}
        {ahorro != null
          ? <span className="bsc-pack-ahorro">Ahorrás {ahorro}%</span>
          : notaPrecio
            ? <span className="bsc-pack-normal">{notaPrecio}</span>
            : null}
      </button>
      {onAgregar && (
        <button type="button" className="bsc-pack-cta" onClick={onAgregar}>
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
    <div className="bsc-contador">
      {cajas.map(([label, valor], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span className="bsc-contador-sep">:</span>}
          <span className="bsc-contador-caja">
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
 * diseño siga siendo del comercio. Mismos umbrales que las otras fichas.
 *
 * El tema de fábrica de este template es blanco/negro/negro: con acento
 * igual al texto la página sigue leyéndose, porque todo deriva del
 * contraste y no de un azul fijo como en la referencia de diseño.
 */
function calcularVariables(t) {
  const { fondo, texto, acento } = t;
  const fondoEsOscuro = contraste(fondo, '#FFFFFF') >= 3;
  const sobre = (color) => (contraste(color, '#FFFFFF') >= 3 ? '#FFFFFF' : '#111111');

  const band = fondoEsOscuro ? componer(texto, 0.10, fondo) : componer(texto, 0.93, fondo);

  return {
    '--bsc-bg': fondo,
    '--bsc-fg': texto,
    '--bsc-accent': acento,
    '--bsc-on-accent': sobre(acento),
    '--bsc-accent-suave': hexToRgba(acento, 0.10),
    '--bsc-accent-borde': hexToRgba(acento, 0.35),
    '--bsc-muted': componer(texto, 0.60, fondo),
    '--bsc-border': hexToRgba(texto, 0.14),
    '--bsc-border-fuerte': hexToRgba(texto, 0.24),
    '--bsc-surface-suave': hexToRgba(texto, 0.03),
    // Las tarjetas se despegan del fondo por muy poco: este template es de
    // retícula y bordes, no de sombras.
    '--bsc-card': fondoEsOscuro ? componer(texto, 0.05, fondo) : componer('#FFFFFF', 0.75, fondo),
    '--bsc-sombra': hexToRgba(texto, 0.1),
    '--bsc-band': band,
    '--bsc-on-band': sobre(band),
    // Dorado para las estrellas en cualquier paleta: es una convención que
    // se lee de un vistazo; teñirlas con el acento las vuelve irreconocibles.
    '--bsc-estrella': '#F0A82A',
  };
}
