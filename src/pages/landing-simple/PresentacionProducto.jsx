import React, { useMemo, useRef, useState } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import { getMediaUrl } from '../../services/api';
import { claveItem, precioDeVenta } from './PrecioAnclaItem';
import ImagenesProductoLanding from './ImagenesProductoLanding';
import { Upload } from 'lucide-react';

export const INSIGNIAS_COMERCIALES = ['Sale', 'Oferta', 'Flash Deal', 'Más vendido', 'Nuevo', 'Envío gratis', 'Últimas unidades', 'Combo'];
const campo = 'mt-1 w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg';
const area = 'mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg';

const gs = n => `Gs ${Math.round(Number(n) || 0).toLocaleString('es-PY')}`;
const limpiarNumero = valor => Number(String(valor ?? '').replace(/\D/g, '')) || 0;

function precioAnclaPorDescuento(precio, pct) {
  const descuento = Number(pct);
  if (!Number.isFinite(descuento) || descuento <= 0 || descuento >= 95) return '';
  return String(Math.ceil(Number(precio || 0) / (1 - descuento / 100)));
}

function descuentoDesdeAncla(precio, ancla) {
  const antes = limpiarNumero(ancla);
  const ahora = Number(precio) || 0;
  return antes > ahora && ahora > 0 ? Math.round((1 - ahora / antes) * 100) : '';
}

function imagenPrincipal(item) {
  const propia = Array.isArray(item.imagenes_landing) ? item.imagenes_landing[0] : null;
  return getMediaUrl(propia || item.imagen || item.imagen_url || null);
}

function BloqueFicha({ numero, titulo, resumen, abierto = false, children }) {
  return (
    <details open={abierto} className="group overflow-hidden rounded-xl border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-2/70 [&::-webkit-details-marker]:hidden">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-primary-fg">{numero}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">{titulo}</span>
          {resumen && <span className="mt-0.5 block truncate text-xs text-fg-muted">{resumen}</span>}
        </span>
        <span className="text-lg leading-none text-fg-muted transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-3 border-t border-border bg-surface-2/25 p-3">{children}</div>
    </details>
  );
}

function ListaSimple({ titulo, ayuda, items, campoLista, placeholder, max = 8, onCambiar }) {
  const base = Array.isArray(items) ? items : [];
  const cambiar = (idx, valor) => onCambiar(campoLista, base.map((it, i) => (i === idx ? { ...it, texto: valor } : it)));
  const agregar = () => onCambiar(campoLista, [...base, { texto: '' }].slice(0, max));
  const quitar = idx => onCambiar(campoLista, base.filter((_, i) => i !== idx));
  return (
    <fieldset className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
      <legend className="px-1 text-sm font-semibold text-fg">{titulo}</legend>
      {ayuda && <p className="text-xs leading-relaxed text-fg-muted">{ayuda}</p>}
      {base.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input className={campo} value={item.texto || ''} maxLength={120} placeholder={placeholder} onChange={e => cambiar(idx, e.target.value)} />
          <button type="button" onClick={() => quitar(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button>
        </div>
      ))}
      {base.length < max && <button type="button" onClick={agregar} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Agregar</button>}
    </fieldset>
  );
}

function ListaBeneficios({ items, onCambiar }) {
  const base = Array.isArray(items) ? items : [];
  const cambiar = (idx, campoItem, valor) => onCambiar('beneficios', base.map((it, i) => (i === idx ? { ...it, [campoItem]: valor } : it)));
  const agregar = () => onCambiar('beneficios', [...base, { titulo: '', texto: '' }].slice(0, 8));
  const quitar = idx => onCambiar('beneficios', base.filter((_, i) => i !== idx));
  return (
    <fieldset className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
      <legend className="px-1 text-sm font-semibold text-fg">Lista de beneficios</legend>
      {base.map((item, idx) => (
        <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-2/70 p-2 sm:grid-cols-[1fr_1.5fr_auto]">
          <input className={campo} value={item.titulo || ''} maxLength={80} placeholder="Beneficio" onChange={e => cambiar(idx, 'titulo', e.target.value)} />
          <input className={campo} value={item.texto || ''} maxLength={160} placeholder="Explicación corta" onChange={e => cambiar(idx, 'texto', e.target.value)} />
          <button type="button" onClick={() => quitar(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button>
        </div>
      ))}
      {base.length < 8 && <button type="button" onClick={agregar} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Agregar beneficio</button>}
    </fieldset>
  );
}

function ListaBotones({ titulo, ayuda, items, campoLista, max = 4, onCambiar }) {
  const base = Array.isArray(items) ? items : [];
  const cambiar = (idx, campoItem, valor) => onCambiar(campoLista, base.map((it, i) => (i === idx ? { ...it, [campoItem]: valor } : it)));
  const agregar = () => onCambiar(campoLista, [...base, { label: 'Nuevo botón', tipo: 'url', valor: '' }].slice(0, max));
  const quitar = idx => onCambiar(campoLista, base.filter((_, i) => i !== idx));
  return (
    <fieldset className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
      <legend className="px-1 text-sm font-semibold text-fg">{titulo}</legend>
      {ayuda && <p className="text-xs leading-relaxed text-fg-muted">{ayuda}</p>}
      {base.map((boton, idx) => (
        <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-2/70 p-2 sm:grid-cols-[1fr_130px_1fr_auto]">
          <input className={campo} value={boton.label || ''} maxLength={36} placeholder="Texto del botón" onChange={e => cambiar(idx, 'label', e.target.value)} />
          <select className={campo} value={boton.tipo || 'whatsapp'} onChange={e => cambiar(idx, 'tipo', e.target.value)}>
            <option value="whatsapp">WhatsApp</option>
            <option value="checkout">Checkout</option>
            <option value="contacto">Contacto</option>
            <option value="url">URL</option>
          </select>
          <input className={campo} value={boton.valor || ''} maxLength={180} placeholder={boton.tipo === 'url' ? 'https://...' : boton.tipo === 'whatsapp' ? 'Mensaje opcional' : 'Opcional'} onChange={e => cambiar(idx, 'valor', e.target.value)} />
          <button type="button" onClick={() => quitar(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button>
        </div>
      ))}
      {base.length < max && <button type="button" onClick={agregar} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Agregar botón</button>}
    </fieldset>
  );
}

export default function PresentacionProducto({ item, ancla, onAncla, onCambiar, onSubirImagen, inicialmenteAbierto = false }) {
  const precio = Number(precioDeVenta(item)) || 0;
  const precioAntes = limpiarNumero(ancla);
  const descuento = descuentoDesdeAncla(precio, ancla);
  const ahorro = precioAntes > precio ? precioAntes - precio : 0;
  const src = imagenPrincipal(item);
  const titulo = item.titulo_comercial || item.nombre || 'Producto';
  const mensaje = item.mensaje_comercial || item.descripcion || 'Mostrá una razón clara para comprar ahora.';
  const insignia = item.insignia_principal || (descuento ? 'Sale' : 'Nuevo');
  const cta = item.cta_texto || (item.tipo === 'combo' ? 'Quiero el combo' : 'Comprar ahora');
  const agregarCarrito = item.agregar_carrito_texto || 'Agregar al carrito';
  const insigniasListId = `insignias-comerciales-${claveItem(item).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const porcentaje = useMemo(() => descuento || '', [descuento]);
  const beneficios = Array.isArray(item.beneficios) ? item.beneficios : [];
  const botonesPago = Array.isArray(item.botones_pago) ? item.botones_pago : [];
  const metodosPago = Array.isArray(item.metodos_pago) ? item.metodos_pago : [];
  const incluyePedido = Array.isArray(item.incluye_pedido) ? item.incluye_pedido : [];
  const botonesContacto = Array.isArray(item.botones_contacto) ? item.botones_contacto : [];
  const opiniones = Array.isArray(item.opiniones) ? item.opiniones : [];
  const [opinionError, setOpinionError] = useState('');
  const [opinionSubiendo, setOpinionSubiendo] = useState(null);
  const opinionInputs = useRef({});

  function cambiarOpinion(idx, campoItem, valor) {
    onCambiar('opiniones', opiniones.map((opinion, i) => (i === idx ? { ...opinion, [campoItem]: valor } : opinion)));
  }
  function agregarOpinion() {
    if (opiniones.length >= 6) return;
    onCambiar('opiniones', [...opiniones, { nombre: '', comentario: '', detalle: '', calificacion: 5, foto: '' }]);
  }
  function quitarOpinion(idx) {
    onCambiar('opiniones', opiniones.filter((_, i) => i !== idx));
  }
  async function subirFotoOpinion(event, idx) {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo || !onSubirImagen) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      setOpinionError('Elegí una foto JPG, PNG o WEBP de hasta 5 MB.');
      return;
    }
    setOpinionError('');
    setOpinionSubiendo(idx);
    try {
      const url = await onSubirImagen(archivo);
      onCambiar('opiniones', opiniones.map((opinion, i) => (i === idx ? { ...opinion, foto: url } : opinion)));
    } catch (err) {
      setOpinionError(err.response?.data?.message || err.message || 'No pudimos subir la foto. Intentá nuevamente.');
    } finally {
      setOpinionSubiendo(null);
    }
  }
  function quitarFotoOpinion(idx) {
    onCambiar('opiniones', opiniones.map((opinion, i) => (i === idx ? { ...opinion, foto: '' } : opinion)));
  }

  const resumenPortada = src ? 'Imagen lista para la ficha' : 'Subí o pegá la imagen principal';
  const resumenTextos = `${titulo} · ${gs(precio)}`;
  const resumenBeneficios = beneficios.length ? `${beneficios.length} beneficio${beneficios.length === 1 ? '' : 's'}` : 'Sin beneficios cargados';
  const resumenPagos = `${botonesPago.length} botón${botonesPago.length === 1 ? '' : 'es'} · ${metodosPago.length} método${metodosPago.length === 1 ? '' : 's'}`;
  const resumenIncluye = incluyePedido.length ? `${incluyePedido.length} ítem${incluyePedido.length === 1 ? '' : 's'}` : 'Sin ítems cargados';
  const resumenOpiniones = opiniones.length ? `${opiniones.length} opinión${opiniones.length === 1 ? '' : 'es'}` : 'Sin opiniones todavía';

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
        <p className="text-sm font-semibold text-fg">Editás solo la ficha pública de este producto.</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">Los bloques siguen el orden real de la vista: imagen, reseñas y textos, beneficios, compra, pagos, qué incluye, opiniones.</p>
      </div>
      <div className="space-y-3">
        <BloqueFicha numero="2" titulo="Portada e imágenes" resumen={resumenPortada} abierto={inicialmenteAbierto}>
          <datalist id={insigniasListId}>{INSIGNIAS_COMERCIALES.map(i => <option key={i} value={i} />)}</datalist>
          <ImagenesProductoLanding item={item} onCambiar={onCambiar} onSubirImagen={onSubirImagen} />
        </BloqueFicha>
        <BloqueFicha numero="3" titulo="Reseñas, rótulo, título y subtítulo" resumen={resumenTextos} abierto={inicialmenteAbierto}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Texto de reseñas<input className={campo} value={item.resenas_texto || ''} maxLength={60} placeholder="Sin reseñas todavía" onChange={e => onCambiar('resenas_texto', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Rótulo superior<input className={campo} value={item.insignia_principal || ''} list={insigniasListId} maxLength={40} placeholder="Tecnología para tu día a día" onChange={e => onCambiar('insignia_principal', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Título<input className={campo} value={item.titulo_comercial || ''} maxLength={100} placeholder={item.nombre} onChange={e => onCambiar('titulo_comercial', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Subtítulo<textarea className={area} rows={2} value={item.mensaje_comercial || ''} maxLength={220} placeholder="Texto corto que aparece debajo del precio" onChange={e => onCambiar('mensaje_comercial', e.target.value)} /></label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-xs text-fg-muted">Precio anterior<CurrencyInput id={`ancla-${claveItem(item)}`} aria-label="Precio anterior" inputMode="numeric" value={ancla ?? ''} onChange={v => onAncla(v == null ? '' : String(v))} placeholder="Opcional" className={campo} /></label>
            <label className="block text-xs text-fg-muted">% de descuento<input inputMode="numeric" value={porcentaje} placeholder="Ej: 21" className={campo} onChange={e => onAncla(precioAnclaPorDescuento(precio, e.target.value))} /></label>
            <label className="block text-xs text-fg-muted">Badge de precio<input className={campo} value={item.insignia_secundaria || ''} list={insigniasListId} maxLength={40} placeholder={descuento ? `-${descuento}%` : 'Oferta especial'} onChange={e => onCambiar('insignia_secundaria', e.target.value)} /></label>
          </div>
        </BloqueFicha>
        <BloqueFicha numero="4" titulo="Beneficios" resumen={resumenBeneficios}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Rótulo de sección<input className={campo} value={item.beneficios_kicker || ''} maxLength={60} placeholder="Por qué elegirlo" onChange={e => onCambiar('beneficios_kicker', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Título de sección<input className={campo} value={item.beneficios_titulo || ''} maxLength={90} placeholder="Lo que vas a notar" onChange={e => onCambiar('beneficios_titulo', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Subtítulo de sección<textarea className={area} rows={2} value={item.beneficios_subtitulo || ''} maxLength={180} placeholder="Opcional" onChange={e => onCambiar('beneficios_subtitulo', e.target.value)} /></label>
          </div>
          <ListaBeneficios items={beneficios} onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="5" titulo="Botón de compra, pagos y contacto" resumen={resumenPagos}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Botón principal de compra<input className={campo} value={item.cta_texto || ''} maxLength={36} placeholder="Comprar ahora" onChange={e => onCambiar('cta_texto', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Botón agregar al carrito<input className={campo} value={item.agregar_carrito_texto || ''} maxLength={36} placeholder="Agregar al carrito" onChange={e => onCambiar('agregar_carrito_texto', e.target.value)} /></label>
          </div>
          <ListaBotones titulo="Botones de pago" ayuda="Botones secundarios como Pago contra entrega, Comprar por WhatsApp o un link de pago." items={botonesPago} campoLista="botones_pago" onCambiar={onCambiar} />
          <ListaSimple titulo="Métodos de pago" ayuda="Chips cortos debajo de los botones, por ejemplo Bancard, PagoPar o Transferencia bancaria." items={metodosPago} campoLista="metodos_pago" placeholder="Método de pago" onCambiar={onCambiar} />
          <ListaBotones titulo="Botones configurables de contacto" ayuda="Caminos de contacto adicionales de esta ficha." items={botonesContacto} campoLista="botones_contacto" onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="6" titulo="Qué incluye el pedido" resumen={resumenIncluye}>
          <ListaSimple titulo="Ítems incluidos" ayuda="Cada línea aparece como checklist dentro de la ficha." items={incluyePedido} campoLista="incluye_pedido" placeholder="Ej: 1 unidad del producto seleccionado" onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="7" titulo="Opiniones de las personas" resumen={resumenOpiniones}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Rótulo de sección<input className={campo} value={item.opiniones_kicker || ''} maxLength={60} placeholder="Opiniones" onChange={e => onCambiar('opiniones_kicker', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Título de sección<input className={campo} value={item.opiniones_titulo || ''} maxLength={90} placeholder="Personas que ya lo probaron" onChange={e => onCambiar('opiniones_titulo', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Subtítulo de sección<textarea className={area} rows={2} value={item.opiniones_subtitulo || ''} maxLength={180} placeholder="Opcional" onChange={e => onCambiar('opiniones_subtitulo', e.target.value)} /></label>
          </div>
          <fieldset className="space-y-3 rounded-lg border border-border bg-surface px-3 py-3">
            <legend className="px-1 text-sm font-semibold text-fg">Opiniones reales</legend>
            <p className="text-xs leading-relaxed text-fg-muted">Podés subir una foto de la persona o pegar una URL pública. Si no agregás opiniones, la sección se oculta.</p>
            {opiniones.length === 0 ? <p className="text-xs text-fg-muted">Todavía no hay opiniones para esta ficha.</p> : (
              <div className="space-y-2">
                {opiniones.map((opinion, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-surface-2/70 p-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_auto]"><input className={campo} value={opinion.nombre || ''} maxLength={60} placeholder="Nombre" onChange={e => cambiarOpinion(idx, 'nombre', e.target.value)} /><input className={campo} type="number" min="1" max="5" value={opinion.calificacion || 5} onChange={e => cambiarOpinion(idx, 'calificacion', Math.max(1, Math.min(5, Number(e.target.value) || 5)))} /><button type="button" onClick={() => quitarOpinion(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button></div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[64px_1fr_auto] sm:items-end">
                      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-border bg-surface text-[11px] font-semibold text-fg-muted">{opinion.foto ? <img src={getMediaUrl(opinion.foto)} alt="" className="h-full w-full object-cover" loading="lazy" /> : 'Foto'}</div>
                      <label className="block text-xs text-fg-muted">Foto de la persona<input className={campo} type="url" value={opinion.foto || ''} maxLength={500} placeholder="https://ejemplo.com/persona.webp" onChange={e => cambiarOpinion(idx, 'foto', e.target.value)} /></label>
                      <div className="flex flex-wrap gap-2"><button type="button" disabled={!onSubirImagen || opinionSubiendo === idx} onClick={() => opinionInputs.current[idx]?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-primary-text disabled:opacity-50"><Upload size={13} /> {opinionSubiendo === idx ? 'Subiendo...' : 'Subir foto'}</button>{opinion.foto && <button type="button" onClick={() => quitarFotoOpinion(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar foto</button>}</div>
                      <input ref={el => { if (el) opinionInputs.current[idx] = el; }} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!onSubirImagen || opinionSubiendo === idx} onChange={e => subirFotoOpinion(e, idx)} />
                    </div>
                    <textarea className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg" rows={2} maxLength={220} value={opinion.comentario || ''} placeholder="Comentario real del cliente" onChange={e => cambiarOpinion(idx, 'comentario', e.target.value)} />
                    <input className={campo} value={opinion.detalle || ''} maxLength={80} placeholder="Ej: Compra verificada" onChange={e => cambiarOpinion(idx, 'detalle', e.target.value)} />
                  </div>
                ))}
              </div>
            )}
            {opinionError && <p role="alert" className="text-xs text-danger">{opinionError}</p>}
            {!onSubirImagen && <p className="text-xs text-fg-muted">Guardá la landing para habilitar la subida de fotos de opiniones.</p>}
            {opiniones.length < 6 && <button type="button" onClick={agregarOpinion} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Agregar opinión</button>}
          </fieldset>
        </BloqueFicha>
        <BloqueFicha numero="8" titulo="Vista rápida" resumen="Control visual de esta ficha">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="relative flex h-44 items-center justify-center bg-slate-50">{src ? <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" /> : <span className="text-sm text-slate-400">Sin imagen</span>}{insignia && <span className="absolute left-3 top-3 rounded-md bg-[#a90f3d] px-2 py-1 text-[11px] font-black text-white shadow-sm">{insignia}</span>}</div><div className="space-y-3 p-4 text-slate-950"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">{item.resenas_texto || 'Sin reseñas todavía'}</p><h3 className="mt-1 text-[17px] font-black leading-tight">{titulo}</h3><p className="mt-2 whitespace-pre-line text-[13px] leading-5 text-slate-600">{mensaje}</p></div><div className="rounded-lg bg-[#a90f3d] px-3 py-3 text-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex flex-wrap items-baseline gap-2"><p className="text-2xl font-black tracking-normal">{gs(precio)}</p>{precioAntes > precio && <p className="text-sm font-bold text-white/75 line-through">{gs(precioAntes)}</p>}</div>{ahorro > 0 && <p className="mt-1 text-sm font-bold">{descuento}% Off · Ahorrás {gs(ahorro)}</p>}</div><button type="button" className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#a90f3d] shadow-sm">{cta}</button></div></div><div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600"><span>{agregarCarrito}</span>{botonesPago.slice(0, 2).map((b, i) => <span key={i}>· {b.label}</span>)}</div></div></article>
        </BloqueFicha>
      </div>
    </div>
  );
}
