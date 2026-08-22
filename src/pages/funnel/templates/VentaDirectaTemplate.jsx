import React, { useState, useMemo, useEffect } from 'react';
import {
  Store, ImageOff, Check, ChevronLeft, ChevronRight, ChevronDown, Zap,
  ShoppingCart, MessageCircle, Truck, Lock, Undo2, ShieldCheck, Headphones, Star,
} from 'lucide-react';
import { hexToRgba } from '../../landing-simple/templates/themeUtils';
import { resolverTemaFunnel } from './funnelThemeUtils';
import { formatPrecio } from '../../../lib/mensajeWhatsapp';
import RichText from '../../../components/RichText';
import StoreFooterLegal from '../../landing/StoreFooterLegal';
import { InstagramIcon, FacebookIcon, TikTokIcon, YoutubeIcon, TwitterIcon } from '../../../page-builder/blocks/footer-builder/SocialIcons';

const NOOP = () => {};

const ICONOS_CONFIANZA = {
  envio: Truck,
  pago: Lock,
  devolucion: Undo2,
  garantia: ShieldCheck,
  soporte: Headphones,
};

/** "02:14:32" — cuenta regresiva real, solo si hay fecha de fin de descuento. */
function useCuentaRegresiva(fechaFin) {
  const [restante, setRestante] = useState(() => calcularRestante(fechaFin));
  useEffect(() => {
    if (!fechaFin) return;
    const id = setInterval(() => setRestante(calcularRestante(fechaFin)), 1000);
    return () => clearInterval(id);
  }, [fechaFin]);
  return restante;
}

function calcularRestante(fechaFin) {
  if (!fechaFin) return null;
  const ms = new Date(fechaFin).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * EMBUDO DE VENTA DIRECTA — página de un solo producto, con una sola
 * decisión posible: comprar.
 *
 * El orden de los bloques responde, en secuencia, las preguntas del
 * comprador: ¿qué es? → ¿por qué lo necesito? → ¿el precio me convence? →
 * ¿confío? → ¿puedo comprar fácil? Por eso la estructura es FIJA: el
 * comercio edita contenido, nunca el orden ni qué secciones existen (si
 * pudiera reordenarlo dejaría de ser un embudo).
 *
 * Nada se muestra sin dato real detrás: sin opiniones cargadas no hay
 * estrellas, sin fecha de fin de descuento no hay cuenta regresiva, sin
 * stock conocido no hay mensaje de escasez. Nunca se fabrica urgencia ni
 * prueba social.
 *
 * Sin order bump ni upsell: son mecanismos de otros embudos. Acá el
 * objetivo es que el cliente decida rápido.
 *
 * Se usa TAL CUAL en el editor y en la página pública (ver FunnelEditor.jsx
 * y LandingPublica.jsx) para que no puedan divergir.
 */
export default function VentaDirectaTemplate({
  data,
  onComprarAhora = NOOP,
  onAgregarCarrito = NOOP,
  linkWhatsapp = null,
  onContactar = NOOP,
  isMobile = false,
  previewMode = false,
}) {
  const {
    nombreComercio, logo, producto, contenido, beneficios = [],
    opiniones = [], faq = [], contacto, templateSlug,
  } = data;

  const tema = resolverTemaFunnel(data.tema, templateSlug);
  const bordeSuave = hexToRgba(tema.texto, 0.12);
  const textoSuave = (a) => ({ color: hexToRgba(tema.texto, a) });

  const [varianteId, setVarianteId] = useState(null);
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [agregado, setAgregado] = useState(false);

  const variantes = producto?.variantes || [];
  const tieneVariantes = variantes.length > 0;
  const variante = tieneVariantes ? variantes.find(v => v.id === varianteId) : null;

  // La variante NO se autoselecciona: el spec pide que no se pueda comprar
  // sin elegir una cuando el producto tiene variantes. Autoseleccionar
  // haría que el comprador se lleve un talle/color que nunca eligió.
  useEffect(() => { setIndiceImagen(0); }, [varianteId]);

  const galeria = useMemo(() => {
    const propia = variante?.imagenes?.length ? variante.imagenes : producto?.imagenes;
    return propia?.length ? propia : [];
  }, [variante, producto?.imagenes]);

  const precio = variante ? variante.precio_efectivo : producto?.precio;
  const precioAntes = producto?.precio_antes;
  const enOferta = precioAntes != null && precio != null && Number(precioAntes) > Number(precio);
  const ahorro = enOferta ? Number(precioAntes) - Number(precio) : 0;

  const stock = variante ? variante.stock : producto?.stock;
  const stockConocido = stock !== null && stock !== undefined;
  const sinStock = stockConocido && stock <= 0;
  const stockBajo = stockConocido && stock > 0 && stock <= 10;

  const cuentaRegresiva = useCuentaRegresiva(producto?.oferta_termina);

  const faltaElegirVariante = tieneVariantes && !varianteId;
  const puedeComprar = !sinStock && !faltaElegirVariante;

  // Promedio real de las opiniones que cargó el comercio. Sin opiniones no
  // hay estrellas — no se inventa un 4.8.
  const rating = useMemo(() => {
    const validas = opiniones.filter(o => Number(o.calificacion) > 0);
    if (!validas.length) return null;
    const prom = validas.reduce((s, o) => s + Number(o.calificacion), 0) / validas.length;
    return { promedio: Math.round(prom * 10) / 10, cantidad: validas.length };
  }, [opiniones]);

  // --- Herencia del Producto ---
  // El embudo prioriza lo que se carga específicamente para él (contenido).
  // Si está vacío, hereda la configuración general del producto (ideal para B2B
  // y para no repetir el trabajo si el copy base ya es bueno).
  const confianza = contenido?.confianza?.length > 0 ? contenido.confianza : (producto?.confianza || []);
  const propuestaValor = contenido?.propuesta_valor || producto?.propuesta_valor || '';
  const beneficiosFinales = beneficios?.length > 0 ? beneficios : (producto?.beneficios || []);
  const faqFinales = faq?.length > 0 ? faq : (producto?.preguntas_frecuentes || []);
  const sobreTitulo = contenido?.descripcion_titulo || 'Sobre este producto';
  const sobreTexto = contenido?.descripcion_texto || producto?.sobre_este_producto || producto?.descripcion_larga || '';
  
  const textoCta = contenido?.cta_primario || 'Comprar ahora';
  const mostrarCarrito = contenido?.mostrar_agregar_carrito !== false;
  const mostrarWhatsapp = contenido?.mostrar_whatsapp !== false && !!linkWhatsapp;

  const [preguntaAbierta, setPreguntaAbierta] = useState(null);

  function comprar() {
    if (!puedeComprar) return;
    onComprarAhora({ producto, variante, precio });
  }

  function agregar() {
    if (!puedeComprar) return;
    onAgregarCarrito({ producto, variante, precio });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1600);
  }

  if (!producto) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" style={{ backgroundColor: tema.fondo, color: tema.texto }}>
        <p style={textoSuave(0.6)}>Este embudo todavía no tiene un producto asignado.</p>
      </div>
    );
  }

  return (
    <div
      className="w-full font-sans flex flex-col"
      style={{ backgroundColor: tema.fondo, color: tema.texto, minHeight: '100vh' }}
    >
      {/* ── HEADER — mínimo a propósito: sin menú ni catálogo. Cualquier
             link de salida es una fuga de conversión. ── */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${bordeSuave}` }}
      >
        <div className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={nombreComercio} className="h-9 w-auto max-w-[130px] object-contain" />
          ) : (
            <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: tema.acento }}>
              <Store size={18} style={{ color: tema.fondo }} />
            </div>
          )}
          <span className="font-bold tracking-tight text-lg">{nombreComercio}</span>
        </div>
        {confianza[0] && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold" style={textoSuave(0.6)}>
            {React.createElement(ICONOS_CONFIANZA[confianza[0].icono] || Truck, { size: 14 })}
            {confianza[0].texto}
          </span>
        )}
      </header>

      {/* ══ ABOVE THE FOLD ══ */}
      <section className="px-6 py-8 md:py-12">
        <div className={`mx-auto max-w-6xl grid gap-8 md:gap-12 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>

          {/* ── IZQUIERDA: galería ── */}
          <div className="flex flex-col gap-3">
            <div
              className="aspect-square rounded-2xl overflow-hidden flex items-center justify-center relative"
              style={{ backgroundColor: hexToRgba(tema.texto, 0.05) }}
            >
              {galeria.length > 0 ? (
                <>
                  <img src={galeria[indiceImagen]} alt={producto.nombre} className="w-full h-full object-cover" />
                  {galeria.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIndiceImagen(i => (i - 1 + galeria.length) % galeria.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center backdrop-blur transition-opacity hover:opacity-80"
                        style={{ backgroundColor: hexToRgba(tema.fondo, 0.85), color: tema.texto }}
                        aria-label="Imagen anterior"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIndiceImagen(i => (i + 1) % galeria.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center backdrop-blur transition-opacity hover:opacity-80"
                        style={{ backgroundColor: hexToRgba(tema.fondo, 0.85), color: tema.texto }}
                        aria-label="Imagen siguiente"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                /* Estado real cuando el comercio no cargó fotos — no se
                   inventa un placeholder decorativo. */
                <div className="flex flex-col items-center gap-2" style={textoSuave(0.35)}>
                  <ImageOff size={40} />
                  <span className="text-sm">Sin imagen disponible</span>
                </div>
              )}
            </div>

            {galeria.length > 1 && (
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {galeria.map((url, idx) => (
                  <button
                    key={url + idx}
                    type="button"
                    onClick={() => setIndiceImagen(idx)}
                    className="w-16 h-16 rounded-lg overflow-hidden shrink-0 transition-opacity hover:opacity-80"
                    style={{ border: idx === indiceImagen ? `2px solid ${tema.acento}` : `1px solid ${bordeSuave}` }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── DERECHA: decisión de compra ── */}
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-2">{producto.nombre}</h1>

            {/* Prueba social compacta — solo si hay opiniones reales cargadas */}
            {rating && (
              <div className="flex items-center gap-2 mb-3">
                <span className="flex" aria-label={`${rating.promedio} de 5`}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star
                      key={n}
                      size={15}
                      style={{ color: tema.acento }}
                      fill={n <= Math.round(rating.promedio) ? tema.acento : 'transparent'}
                    />
                  ))}
                </span>
                <span className="text-sm font-semibold">{rating.promedio}</span>
                <span className="text-sm" style={textoSuave(0.55)}>
                  ({rating.cantidad} {rating.cantidad === 1 ? 'opinión' : 'opiniones'})
                </span>
              </div>
            )}

            {/* PROPUESTA DE VALOR — "¿por qué lo necesito?", antes del precio */}
            {propuestaValor && (
              <p className="text-base sm:text-lg mb-5 font-medium leading-relaxed" style={textoSuave(0.85)}>
                {propuestaValor}
              </p>
            )}

            {/* PRECIO + OFERTA */}
            <div className="mb-1 flex items-end gap-3 flex-wrap">
              {enOferta && (
                <span className="text-lg line-through" style={textoSuave(0.45)}>
                  {formatPrecio(precioAntes)}
                </span>
              )}
              <span className="text-4xl font-extrabold leading-none">{formatPrecio(precio)}</span>
              {enOferta && producto.descuento_pct > 0 && (
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-extrabold"
                  style={{ backgroundColor: tema.acento, color: tema.fondo }}
                >
                  {producto.descuento_pct}% OFF
                </span>
              )}
            </div>
            {enOferta && ahorro > 0 && (
              <p className="text-sm font-semibold mb-3" style={{ color: tema.acento }}>
                Ahorrás {formatPrecio(ahorro)}
              </p>
            )}

            {/* Urgencia REAL — solo si el descuento tiene fecha de fin cargada */}
            {cuentaRegresiva && (
              <div
                className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-lg text-sm font-bold mb-4"
                style={{ backgroundColor: hexToRgba(tema.acento, 0.12), color: tema.acento }}
              >
                Oferta por tiempo limitado — finaliza en {cuentaRegresiva}
              </div>
            )}

            {/* VARIANTES — obligatorias antes de comprar */}
            {tieneVariantes && (
              <div className="mb-5">
                <span className="block text-sm font-bold mb-2">
                  Elegí una opción{faltaElegirVariante && <span style={{ color: tema.acento }}> *</span>}
                </span>
                <div className="flex flex-wrap gap-2">
                  {variantes.map(v => {
                    const activa = v.id === varianteId;
                    const agotada = v.stock !== null && v.stock !== undefined && v.stock <= 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={agotada}
                        onClick={() => setVarianteId(v.id)}
                        title={agotada ? 'Sin stock' : undefined}
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          border: `2px solid ${activa ? tema.acento : bordeSuave}`,
                          backgroundColor: activa ? hexToRgba(tema.acento, 0.08) : 'transparent',
                          textDecoration: agotada ? 'line-through' : 'none',
                        }}
                      >
                        {v.nombre}
                      </button>
                    );
                  })}
                </div>
                {faltaElegirVariante && (
                  <p className="text-xs mt-2" style={textoSuave(0.55)}>
                    Elegí una opción para continuar.
                  </p>
                )}
              </div>
            )}

            {/* STOCK — el mismo dato, distinto énfasis según sea escaso o no */}
            {stockConocido && (
              <p className="text-sm font-bold mb-5" style={{ color: sinStock ? '#ef4444' : (stockBajo ? '#f59e0b' : '#10b981') }}>
                {sinStock
                  ? 'Sin stock por ahora'
                  : (stockBajo ? `⚡ Últimas ${stock} unidades` : `✓ ${stock} disponibles`)}
              </p>
            )}

            {/* CTA PRINCIPAL — domina visualmente. Nunca con aspecto de
                deshabilitado si se puede comprar. */}
            <button
              type="button"
              onClick={comprar}
              disabled={!puedeComprar}
              className="w-full flex items-center justify-center gap-2 rounded-xl text-lg font-extrabold py-4 transition-transform hover:scale-[1.01] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ backgroundColor: tema.acento, color: tema.fondo }}
            >
              <Zap size={20} /> {sinStock ? 'Sin stock' : textoCta}
            </button>

            {/* Acción secundaria — visualmente subordinada al CTA */}
            {mostrarCarrito && (
              <button
                type="button"
                onClick={agregar}
                disabled={!puedeComprar}
                className="w-full mt-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold py-3 transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ border: `1.5px solid ${bordeSuave}`, color: tema.texto, backgroundColor: 'transparent' }}
              >
                {agregado ? <><Check size={17} /> ¡Agregado!</> : <><ShoppingCart size={17} /> Agregar al carrito</>}
              </button>
            )}

            {mostrarWhatsapp && (
              <a
                href={linkWhatsapp}
                target="_blank"
                rel="noreferrer"
                onClick={() => onContactar(producto)}
                className="w-full mt-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold py-2.5 transition-opacity hover:opacity-80"
                style={{ color: hexToRgba(tema.texto, 0.7) }}
              >
                <MessageCircle size={16} /> Consultar por WhatsApp
              </a>
            )}

            {/* FRANJA DE CONFIANZA — compacta, debajo del CTA */}
            {confianza.length > 0 && (
              <div
                className="flex flex-wrap gap-x-5 gap-y-2 mt-5 pt-4"
                style={{ borderTop: `1px solid ${bordeSuave}` }}
              >
                {confianza.map((c, idx) => {
                  const Icono = ICONOS_CONFIANZA[c.icono] || ShieldCheck;
                  return (
                    <span key={idx} className="inline-flex items-center gap-1.5 text-sm font-semibold" style={textoSuave(0.65)}>
                      <Icono size={15} style={{ color: tema.acento }} /> {c.texto}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ BENEFICIOS RÁPIDOS ══ */}
      {beneficiosFinales.length > 0 && (
        <section className="px-6 py-10" style={{ borderTop: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.texto, 0.03) }}>
          <div className={`mx-auto max-w-5xl grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {beneficiosFinales.map((b, idx) => (
              <div key={idx} className="flex gap-3">
                <Check size={20} className="shrink-0 mt-0.5" style={{ color: tema.acento }} />
                <div>
                  <p className="font-bold mb-0.5">{b.titulo}</p>
                  {b.texto && <p className="text-sm leading-relaxed" style={textoSuave(0.6)}>{b.texto}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ DESCRIPCIÓN / CÓMO FUNCIONA ══ */}
      {sobreTexto && (
        <section className="px-6 py-16" style={{ borderTop: `1px solid ${bordeSuave}` }}>
          <div className={`mx-auto max-w-5xl grid gap-10 items-start ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div>
              <h2 className="text-3xl font-extrabold mb-6 leading-tight">
                {sobreTitulo}
              </h2>
              <RichText text={sobreTexto} className="leading-relaxed text-[15px]" style={textoSuave(0.75)} />
            </div>
            {/* Si tiene imagen secundaria, la mostramos acá para romper el texto. Si no, usamos la principal. */}
            <div className="rounded-2xl overflow-hidden sticky top-8" style={{ border: `1px solid ${bordeSuave}` }}>
              {(producto.imagenes?.length > 1) ? (
                <img src={producto.imagenes[1]} alt="" className="w-full h-auto object-cover aspect-square" />
              ) : (
                producto.imagenes?.length > 0 && <img src={producto.imagenes[0]} alt="" className="w-full h-auto object-cover aspect-square" />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ══ OPINIONES — "¿confío?". Más abajo, no compite con el CTA ══ */}
      {opiniones.length > 0 && (
        <section className="px-6 py-12" style={{ borderTop: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.texto, 0.03) }}>
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-extrabold mb-6">Lo que dicen quienes ya lo compraron</h2>
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {opiniones.map((o, idx) => (
                <div key={idx} className="rounded-xl p-5" style={{ border: `1px solid ${bordeSuave}`, backgroundColor: tema.fondo }}>
                  <span className="flex mb-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star
                        key={n}
                        size={14}
                        style={{ color: tema.acento }}
                        fill={n <= Number(o.calificacion) ? tema.acento : 'transparent'}
                      />
                    ))}
                  </span>
                  <p className="text-sm leading-relaxed mb-3" style={textoSuave(0.75)}>“{o.comentario}”</p>
                  <p className="text-xs font-bold" style={textoSuave(0.5)}>{o.nombre}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ FAQ — resolver objeciones ══ */}
      {/* ══ PREGUNTAS FRECUENTES ══ */}
      {faqFinales.length > 0 && (
        <section className="px-6 py-12" style={{ borderTop: `1px solid ${bordeSuave}` }}>
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-extrabold mb-6 text-center">Todo lo que necesitás saber</h2>
            <div className="flex flex-col gap-3">
              {faqFinales.map((f, idx) => {
                const abierto = preguntaAbierta === idx;
                return (
                  <div key={idx} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.texto, 0.02) }}>
                    <button
                      type="button"
                      onClick={() => setPreguntaAbierta(abierto ? null : idx)}
                      className="w-full text-left px-5 py-4 font-bold flex justify-between items-center"
                    >
                      {f.pregunta}
                      <span className="shrink-0 ml-4 transition-transform duration-200" style={{ transform: abierto ? 'rotate(180deg)' : 'rotate(0)' }}>
                        <ChevronDown size={18} style={{ color: tema.acento }} />
                      </span>
                    </button>
                    {abierto && (
                      <div className="px-5 pb-4 text-sm leading-relaxed" style={textoSuave(0.7)}>
                        {f.respuesta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══ CIERRE: última oportunidad de comprar sin tener que scrollear
             de vuelta arriba ══ */}
      <section className="px-6 py-12 text-center" style={{ borderTop: `1px solid ${bordeSuave}` }}>
        <p className="text-xl font-extrabold mb-1">{producto.nombre}</p>
        <p className="text-2xl font-extrabold mb-5" style={{ color: tema.acento }}>{formatPrecio(precio)}</p>
        <button
          type="button"
          onClick={comprar}
          disabled={!puedeComprar}
          className="inline-flex items-center justify-center gap-2 rounded-xl text-lg font-extrabold px-10 py-4 transition-transform hover:scale-[1.02] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ backgroundColor: tema.acento, color: tema.fondo }}
        >
          <Zap size={20} /> {sinStock ? 'Sin stock' : textoCta}
        </button>
      </section>

      {/* ══ REDES SOCIALES ══ */}
      {(contacto?.instagram || contacto?.facebook || contacto?.tiktok || contacto?.youtube || contacto?.twitter) && (
        <section className="px-6 pt-10 pb-2 text-center" style={{ backgroundColor: tema.fondo, color: tema.texto }}>
          <div className="flex justify-center gap-6">
            {contacto.instagram && (
              <a href={contacto.instagram.startsWith('http') ? contacto.instagram : `https://instagram.com/${contacto.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-100 opacity-60" style={{ color: tema.texto }}>
                <InstagramIcon size={24} />
              </a>
            )}
            {contacto.facebook && (
              <a href={contacto.facebook.startsWith('http') ? contacto.facebook : `https://facebook.com/${contacto.facebook}`} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-100 opacity-60" style={{ color: tema.texto }}>
                <FacebookIcon size={24} />
              </a>
            )}
            {contacto.tiktok && (
              <a href={contacto.tiktok.startsWith('http') ? contacto.tiktok : `https://tiktok.com/@${contacto.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-100 opacity-60" style={{ color: tema.texto }}>
                <TikTokIcon size={24} />
              </a>
            )}
            {contacto.youtube && (
              <a href={contacto.youtube.startsWith('http') ? contacto.youtube : `https://youtube.com/@${contacto.youtube.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-100 opacity-60" style={{ color: tema.texto }}>
                <YoutubeIcon size={24} />
              </a>
            )}
            {contacto.twitter && (
              <a href={contacto.twitter.startsWith('http') ? contacto.twitter : `https://x.com/${contacto.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-100 opacity-60" style={{ color: tema.texto }}>
                <TwitterIcon size={24} />
              </a>
            )}
          </div>
        </section>
      )}

      {/* El copyright cierra la página SIEMPRE. mt-auto lo empuja al fondo
          aunque el embudo sea corto (el contenedor es flex-column con
          min-height 100vh). */}
      <div style={{ marginTop: 'auto' }}>
        <StoreFooterLegal
          tema={tema}
          bordeSuave={bordeSuave}
          nombreComercio={nombreComercio}
          isPreview={previewMode}
        />
      </div>
    </div>
  );
}
