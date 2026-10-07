import React, { useMemo, useRef, useState } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import { getMediaUrl } from '../../services/api';
import { claveItem, precioDeVenta } from './PrecioAnclaItem';
import ImagenesProductoLanding from './ImagenesProductoLanding';
import { Upload } from 'lucide-react';

export const INSIGNIAS_COMERCIALES = ['Sale', 'Oferta', 'Flash Deal', 'Más vendido', 'Nuevo', 'Envío gratis', 'Últimas unidades', 'Combo'];
const campo = 'mt-1 w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg';
const area = 'mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg';
export const FICHA_BLOQUES_DEFAULT = {
  urgencia: true,
  portada: true,
  textos: true,
  beneficios: true,
  compra: true,
  incluye: true,
  opiniones: true,
  preguntas: true,
};
const DEFAULTS_PRESENTACION = {
  resenas_texto: '4.9 · 5 estrellas · +1.000 reseñas verificadas',
  insignia_principal: 'Oferta destacada',
  beneficios_kicker: 'Por qué elegirlo',
  beneficios_titulo: 'Beneficios que se entienden rápido.',
  beneficios_subtitulo: 'Usá estos ejemplos como guía y ajustalos a lo que realmente ofrece tu producto.',
  cta_texto: 'Comprar ahora',
  agregar_carrito_texto: 'Agregar al carrito',
  urgencia_kicker: 'Oferta por tiempo limitado',
  urgencia_titulo: 'Reservá esta condición antes de que termine.',
  urgencia_texto: 'La fecha real se configura en Gesicomm; el contador se actualiza solo.',
  opiniones_kicker: 'Opiniones',
  opiniones_titulo: 'Personas que ya lo probaron.',
  opiniones_subtitulo: 'Reemplazá estos ejemplos por comentarios reales de tus clientes.',
  preguntas_kicker: 'Resolvemos tus dudas',
  preguntas_titulo: 'Preguntas frecuentes',
  preguntas_subtitulo: '',
  beneficios: [
    { titulo: 'Compra simple', texto: 'Elegí la opción ideal y completá tu pedido en pocos pasos.' },
    { titulo: 'Atención cercana', texto: 'Podés consultar antes de comprar y recibir ayuda con tu pedido.' },
    { titulo: 'Producto seleccionado', texto: 'Una presentación clara para mostrar lo mejor de este producto.' },
  ],
  botones_pago: [
    { label: 'Pagar en checkout', tipo: 'checkout', valor: '' },
    { label: 'Consultar por WhatsApp', tipo: 'whatsapp', valor: 'Hola! Quiero consultar por este producto.' },
  ],
  metodos_pago: [
    { texto: 'Pago online' },
    { texto: 'Transferencia' },
    { texto: 'Pago al recibir' },
  ],
  incluye_pedido: [
    { texto: '1 unidad del producto seleccionado' },
    { texto: 'Coordinación de entrega' },
    { texto: 'Soporte de la tienda para tu compra' },
  ],
  opiniones: [
    { nombre: 'Cliente verificado', comentario: 'La compra fue simple y la atención me ayudó a elegir mejor.', detalle: 'Ejemplo editable', calificacion: 5, foto: '' },
    { nombre: 'María P.', comentario: 'Me gustó poder ver la información clara antes de hacer el pedido.', detalle: 'Ejemplo editable', calificacion: 5, foto: '' },
  ],
  preguntas: [
    { pregunta: '¿Cómo confirmo que este producto es para mí?', respuesta: 'Revisá las características y las imágenes. Si tenés alguna duda sobre compatibilidad o uso, consultanos antes de realizar el pedido.' },
    { pregunta: '¿Cuánto cuesta el envío y cuándo llega?', respuesta: 'La cobertura, el costo y el plazo se confirman según tu dirección antes de cerrar la compra.' },
    { pregunta: '¿Cómo funciona el pago anticipado?', respuesta: 'Consultá disponibilidad y solicitá el medio de pago habilitado. Confirmamos el importe con el descuento vigente antes de que realices el pago.' },
    { pregunta: '¿Puedo pagar contra entrega o pedir un cambio?', respuesta: 'Las opciones disponibles dependen de tu ciudad y de las políticas de la tienda. Podés consultarnos antes de comprar.' },
  ],
};

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

function BloqueFicha({ numero, titulo, resumen, abierto = false, visible = true, onVisible, children }) {
  return (
    <details open={abierto} className="group overflow-hidden rounded-xl border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-2/70 [&::-webkit-details-marker]:hidden">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-primary-fg">{numero}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">{titulo}</span>
          <span className="mt-0.5 block truncate text-xs text-fg-muted">{visible ? resumen : 'Oculto en la ficha'}</span>
        </span>
        {onVisible && (
          <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-fg-muted" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={visible} onChange={e => onVisible(e.target.checked)} className="accent-primary" />
            Mostrar
          </label>
        )}
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

function ListaPreguntas({ items, onCambiar }) {
  const base = Array.isArray(items) ? items : [];
  const cambiar = (idx, campoItem, valor) => onCambiar('preguntas', base.map((it, i) => (i === idx ? { ...it, [campoItem]: valor } : it)));
  const agregar = () => onCambiar('preguntas', [...base, { pregunta: '', respuesta: '' }].slice(0, 10));
  const quitar = idx => onCambiar('preguntas', base.filter((_, i) => i !== idx));
  return (
    <fieldset className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
      <legend className="px-1 text-sm font-semibold text-fg">Preguntas y respuestas</legend>
      {base.map((item, idx) => (
        <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-2/70 p-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <input className={campo} value={item.pregunta || ''} maxLength={140} placeholder="Pregunta frecuente" onChange={e => cambiar(idx, 'pregunta', e.target.value)} />
            <button type="button" onClick={() => quitar(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button>
          </div>
          <textarea className={area} rows={2} value={item.respuesta || ''} maxLength={320} placeholder="Respuesta clara y corta" onChange={e => cambiar(idx, 'respuesta', e.target.value)} />
        </div>
      ))}
      {base.length < 10 && <button type="button" onClick={agregar} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Agregar pregunta</button>}
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
  const descuento = descuentoDesdeAncla(precio, ancla);
  const src = imagenPrincipal(item);
  const titulo = item.titulo_comercial || item.nombre || 'Producto';
  const insigniasListId = `insignias-comerciales-${claveItem(item).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const porcentaje = useMemo(() => descuento || '', [descuento]);
  const beneficios = Array.isArray(item.beneficios) && item.beneficios.length ? item.beneficios : DEFAULTS_PRESENTACION.beneficios;
  const botonesPago = Array.isArray(item.botones_pago) && item.botones_pago.length ? item.botones_pago : DEFAULTS_PRESENTACION.botones_pago;
  const metodosPago = Array.isArray(item.metodos_pago) && item.metodos_pago.length ? item.metodos_pago : DEFAULTS_PRESENTACION.metodos_pago;
  const incluyePedido = Array.isArray(item.incluye_pedido) && item.incluye_pedido.length ? item.incluye_pedido : DEFAULTS_PRESENTACION.incluye_pedido;
  const botonesContacto = Array.isArray(item.botones_contacto) ? item.botones_contacto : [];
  const opiniones = Array.isArray(item.opiniones) && item.opiniones.length ? item.opiniones : DEFAULTS_PRESENTACION.opiniones;
  const preguntas = Array.isArray(item.preguntas) && item.preguntas.length ? item.preguntas : DEFAULTS_PRESENTACION.preguntas;
  const bloquesFicha = { ...FICHA_BLOQUES_DEFAULT, ...(item.ficha_bloques || {}) };
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
  function cambiarBloque(clave, visible) {
    onCambiar('ficha_bloques', { ...bloquesFicha, [clave]: visible });
  }

  const resumenPortada = src ? 'Imagen lista para la ficha' : 'Subí o pegá la imagen principal';
  const resumenTextos = `${titulo} · ${gs(precio)}`;
  const resumenBeneficios = beneficios.length ? `${beneficios.length} beneficio${beneficios.length === 1 ? '' : 's'}` : 'Sin beneficios cargados';
  const resumenPagos = `${botonesPago.length} botón${botonesPago.length === 1 ? '' : 'es'} · ${metodosPago.length} método${metodosPago.length === 1 ? '' : 's'}`;
  const resumenIncluye = incluyePedido.length ? `${incluyePedido.length} ítem${incluyePedido.length === 1 ? '' : 's'}` : 'Sin ítems cargados';
  const resumenOpiniones = opiniones.length ? `${opiniones.length} opinión${opiniones.length === 1 ? '' : 'es'}` : 'Sin opiniones todavía';
  const resumenPreguntas = preguntas.length ? `${preguntas.length} pregunta${preguntas.length === 1 ? '' : 's'}` : 'Sin preguntas cargadas';

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
        <p className="text-sm font-semibold text-fg">Editás solo la ficha pública de este producto.</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">Los bloques siguen el orden real de la vista: imagen, reseñas y textos, beneficios, compra, pagos, qué incluye, opiniones y preguntas frecuentes.</p>
      </div>
      <div className="space-y-3">
        <BloqueFicha numero="1" titulo="Oferta por tiempo limitado" resumen={item.urgencia_titulo || DEFAULTS_PRESENTACION.urgencia_titulo} abierto={inicialmenteAbierto} visible={bloquesFicha.urgencia} onVisible={v => cambiarBloque('urgencia', v)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Rótulo<input className={campo} value={item.urgencia_kicker || ''} maxLength={60} placeholder={DEFAULTS_PRESENTACION.urgencia_kicker} onChange={e => onCambiar('urgencia_kicker', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Título<input className={campo} value={item.urgencia_titulo || ''} maxLength={90} placeholder={DEFAULTS_PRESENTACION.urgencia_titulo} onChange={e => onCambiar('urgencia_titulo', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Texto<textarea className={area} rows={2} value={item.urgencia_texto || ''} maxLength={180} placeholder={DEFAULTS_PRESENTACION.urgencia_texto} onChange={e => onCambiar('urgencia_texto', e.target.value)} /></label>
          </div>
          <p className="text-xs leading-relaxed text-fg-muted">La fecha del contador se configura en el bloque de oferta flash. Si no hay fecha real, el preview muestra un contador de ejemplo.</p>
        </BloqueFicha>
        <BloqueFicha numero="2" titulo="Portada e imágenes" resumen={resumenPortada} abierto={inicialmenteAbierto} visible={bloquesFicha.portada} onVisible={v => cambiarBloque('portada', v)}>
          <datalist id={insigniasListId}>{INSIGNIAS_COMERCIALES.map(i => <option key={i} value={i} />)}</datalist>
          <ImagenesProductoLanding item={item} onCambiar={onCambiar} onSubirImagen={onSubirImagen} />
        </BloqueFicha>
        <BloqueFicha numero="3" titulo="Reseñas, rótulo, título y subtítulo" resumen={resumenTextos} abierto={inicialmenteAbierto} visible={bloquesFicha.textos} onVisible={v => cambiarBloque('textos', v)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Texto de reseñas<input className={campo} value={item.resenas_texto || ''} maxLength={80} placeholder={DEFAULTS_PRESENTACION.resenas_texto} onChange={e => onCambiar('resenas_texto', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Rótulo superior<input className={campo} value={item.insignia_principal || ''} list={insigniasListId} maxLength={40} placeholder={DEFAULTS_PRESENTACION.insignia_principal} onChange={e => onCambiar('insignia_principal', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Título<input className={campo} value={item.titulo_comercial || ''} maxLength={100} placeholder={item.nombre} onChange={e => onCambiar('titulo_comercial', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Subtítulo<textarea className={area} rows={2} value={item.mensaje_comercial || ''} maxLength={220} placeholder="Texto corto que aparece debajo del precio" onChange={e => onCambiar('mensaje_comercial', e.target.value)} /></label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-xs text-fg-muted">Precio anterior<CurrencyInput id={`ancla-${claveItem(item)}`} aria-label="Precio anterior" inputMode="numeric" value={ancla ?? ''} onChange={v => onAncla(v == null ? '' : String(v))} placeholder="Opcional" className={campo} /></label>
            <label className="block text-xs text-fg-muted">% de descuento<input inputMode="numeric" value={porcentaje} placeholder="Ej: 21" className={campo} onChange={e => onAncla(precioAnclaPorDescuento(precio, e.target.value))} /></label>
            <label className="block text-xs text-fg-muted">Badge de precio<input className={campo} value={item.insignia_secundaria || ''} list={insigniasListId} maxLength={40} placeholder={descuento ? `-${descuento}%` : 'Oferta especial'} onChange={e => onCambiar('insignia_secundaria', e.target.value)} /></label>
          </div>
        </BloqueFicha>
        <BloqueFicha numero="4" titulo="Beneficios" resumen={resumenBeneficios} visible={bloquesFicha.beneficios} onVisible={v => cambiarBloque('beneficios', v)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Rótulo de sección<input className={campo} value={item.beneficios_kicker || ''} maxLength={60} placeholder={DEFAULTS_PRESENTACION.beneficios_kicker} onChange={e => onCambiar('beneficios_kicker', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Título de sección<input className={campo} value={item.beneficios_titulo || ''} maxLength={90} placeholder={DEFAULTS_PRESENTACION.beneficios_titulo} onChange={e => onCambiar('beneficios_titulo', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Subtítulo de sección<textarea className={area} rows={2} value={item.beneficios_subtitulo || ''} maxLength={180} placeholder={DEFAULTS_PRESENTACION.beneficios_subtitulo} onChange={e => onCambiar('beneficios_subtitulo', e.target.value)} /></label>
          </div>
          <ListaBeneficios items={beneficios} onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="5" titulo="Botón de compra, pagos y contacto" resumen={resumenPagos} visible={bloquesFicha.compra} onVisible={v => cambiarBloque('compra', v)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Botón principal de compra<input className={campo} value={item.cta_texto || ''} maxLength={36} placeholder="Comprar ahora" onChange={e => onCambiar('cta_texto', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Botón agregar al carrito<input className={campo} value={item.agregar_carrito_texto || ''} maxLength={36} placeholder="Agregar al carrito" onChange={e => onCambiar('agregar_carrito_texto', e.target.value)} /></label>
          </div>
          <ListaBotones titulo="Botones de pago" ayuda="Botones secundarios como Pago contra entrega, Comprar por WhatsApp o un link de pago." items={botonesPago} campoLista="botones_pago" onCambiar={onCambiar} />
          <ListaSimple titulo="Métodos de pago" ayuda="Chips cortos debajo de los botones, por ejemplo Bancard, PagoPar o Transferencia bancaria." items={metodosPago} campoLista="metodos_pago" placeholder="Método de pago" onCambiar={onCambiar} />
          <ListaBotones titulo="Botones configurables de contacto" ayuda="Caminos de contacto adicionales de esta ficha." items={botonesContacto} campoLista="botones_contacto" onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="6" titulo="Qué incluye el pedido" resumen={resumenIncluye} visible={bloquesFicha.incluye} onVisible={v => cambiarBloque('incluye', v)}>
          <ListaSimple titulo="Ítems incluidos" ayuda="Cada línea aparece como checklist dentro de la ficha." items={incluyePedido} campoLista="incluye_pedido" placeholder="Ej: 1 unidad del producto seleccionado" onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="7" titulo="Opiniones de las personas" resumen={resumenOpiniones} visible={bloquesFicha.opiniones} onVisible={v => cambiarBloque('opiniones', v)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Rótulo de sección<input className={campo} value={item.opiniones_kicker || ''} maxLength={60} placeholder={DEFAULTS_PRESENTACION.opiniones_kicker} onChange={e => onCambiar('opiniones_kicker', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Título de sección<input className={campo} value={item.opiniones_titulo || ''} maxLength={90} placeholder={DEFAULTS_PRESENTACION.opiniones_titulo} onChange={e => onCambiar('opiniones_titulo', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Subtítulo de sección<textarea className={area} rows={2} value={item.opiniones_subtitulo || ''} maxLength={180} placeholder={DEFAULTS_PRESENTACION.opiniones_subtitulo} onChange={e => onCambiar('opiniones_subtitulo', e.target.value)} /></label>
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
        <BloqueFicha numero="8" titulo="Preguntas frecuentes" resumen={resumenPreguntas} visible={bloquesFicha.preguntas} onVisible={v => cambiarBloque('preguntas', v)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Rótulo de sección<input className={campo} value={item.preguntas_kicker || ''} maxLength={60} placeholder={DEFAULTS_PRESENTACION.preguntas_kicker} onChange={e => onCambiar('preguntas_kicker', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Título de sección<input className={campo} value={item.preguntas_titulo || ''} maxLength={90} placeholder={DEFAULTS_PRESENTACION.preguntas_titulo} onChange={e => onCambiar('preguntas_titulo', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Subtítulo de sección<textarea className={area} rows={2} value={item.preguntas_subtitulo || ''} maxLength={180} placeholder="Texto opcional debajo del título" onChange={e => onCambiar('preguntas_subtitulo', e.target.value)} /></label>
          </div>
          <ListaPreguntas items={preguntas} onCambiar={onCambiar} />
        </BloqueFicha>
      </div>
    </div>
  );
}
