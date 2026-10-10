import React, { useMemo, useRef, useState } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import { getMediaUrl } from '../../services/api';
import { claveItem, precioDeVenta } from './PrecioAnclaItem';
import { contenidoFicha } from './datosRuntime';
import ImagenesProductoLanding from './ImagenesProductoLanding';
import { GripVertical, Upload } from 'lucide-react';

export const INSIGNIAS_COMERCIALES = ['Sale', 'Oferta', 'Flash Deal', 'Más vendido', 'Nuevo', 'Envío gratis', 'Últimas unidades', 'Combo'];
const campo = 'mt-1 w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg';
const area = 'mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg';
export const FICHA_BLOQUES_DEFAULT = {
  galeria: true,
  encabezado: true,
  nombre_comercial: true,
  resenas_comerciales: true,
  precio: true,
  badge_precio: true,
  descripcion: true,
  info_compra: true,
  urgencia: true,
  oferta: true,
  oferta_encabezado: true,
  oferta_nombre: true,
  oferta_texto: true,
  oferta_duracion: true,
  beneficios: true,
  confianza: true,
  compra: true,
  promociones_pago: true,
  contacto_pago: true,
  incluye: true,
  recomendados: true,
  opiniones: true,
  preguntas: true,
  // Compatibilidad con landings guardadas antes de separar los bloques.
  portada: true,
  textos: true,
};
export const FICHA_BLOQUES_ORDEN = [
  { clave: 'galeria', numero: 1, titulo: 'Galería del producto' },
  { clave: 'encabezado', numero: 2, titulo: 'Encabezado' },
  { clave: 'nombre_comercial', numero: 3, titulo: 'Nombre comercial' },
  { clave: 'resenas_comerciales', numero: 4, titulo: 'Reseñas comerciales' },
  { clave: 'precio', numero: 5, titulo: 'Precio y oferta' },
  { clave: 'badge_precio', numero: 6, titulo: 'Badge de precio' },
  { clave: 'oferta', numero: 7, titulo: 'Oferta por tiempo limitado' },
  { clave: 'descripcion', numero: 8, titulo: 'Descripción breve' },
  { clave: 'beneficios', numero: 9, titulo: 'Beneficios principales' },
  { clave: 'contacto_pago', numero: 9, titulo: 'Botones de contacto y pago' },
  { clave: 'promociones_pago', numero: 10, titulo: 'Disponibilidad y medios de pago' },
  { clave: 'incluye', numero: 11, titulo: 'Qué incluye tu pedido' },
  { clave: 'recomendados', numero: 12, titulo: 'Productos recomendados' },
  { clave: 'confianza', numero: 13, titulo: 'Zona de confianza' },
  { clave: 'opiniones', numero: 14, titulo: 'Opiniones' },
  { clave: 'preguntas', numero: 15, titulo: 'Preguntas frecuentes' },
];
const FICHA_BLOQUES_CLAVES = FICHA_BLOQUES_ORDEN.map(b => b.clave);
const FICHA_BLOQUES_ALIAS = {
  urgencia: ['oferta'],
  oferta_encabezado: ['oferta'],
  oferta_nombre: ['oferta'],
  oferta_texto: ['oferta'],
  oferta_duracion: ['oferta'],
};
const DEFAULTS_PRESENTACION = {
  resenas_texto: '4.9 · 5 estrellas · +1.000 reseñas verificadas',
  resenas_calificacion: 4.9,
  insignia_principal: '',
  beneficios_kicker: 'Por qué elegirlo',
  beneficios_titulo: 'Beneficios que se entienden rápido.',
  beneficios_subtitulo: 'Usá estos ejemplos como guía y ajustalos a lo que realmente ofrece tu producto.',
  cta_texto: 'Comprar con pago anticipado',
  cta_descuento_pct: '',
  agregar_carrito_texto: 'Agregar al carrito',
  urgencia_kicker: 'Oferta por tiempo limitado',
  urgencia_titulo: 'Reservá esta condición antes de que termine.',
  urgencia_texto: 'La fecha real se configura en Gesicomm; el contador se actualiza solo.',
  urgencia_horas: 1,
  urgencia_minutos: 59,
  urgencia_segundos: 58,
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
    { label: 'Pago contra entrega', tipo: 'checkout', valor: 'efectivo' },
  ],
  botones_contacto: [
    { label: 'Consultar por WhatsApp', tipo: 'whatsapp', valor: '' },
  ],
  metodos_pago: [],
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
const valorConfigurable = (obj, campo, fallback) => (
  Object.prototype.hasOwnProperty.call(obj || {}, campo) ? (obj[campo] || '') : fallback
);

const gs = n => `Gs ${Math.round(Number(n) || 0).toLocaleString('es-PY')}`;
const limpiarNumero = valor => Number(String(valor ?? '').replace(/\D/g, '')) || 0;
const normalizarCalificacion = (valor, fallback = DEFAULTS_PRESENTACION.resenas_calificacion) => {
  const crudo = String(valor ?? '').replace(',', '.').trim();
  const n = Number(crudo);
  const base = Number.isFinite(n) ? n : Number(fallback);
  return Math.max(1, Math.min(5, Math.round((Number.isFinite(base) ? base : 5) * 10) / 10));
};
const formatearCalificacion = valor => normalizarCalificacion(valor).toLocaleString('es-PY', { maximumFractionDigits: 1 });
const normalizarDescuentoBoton = valor => {
  const crudo = String(valor ?? '').replace(',', '.').trim();
  const n = Number(crudo);
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.min(95, Math.round(n * 10) / 10));
};
const normalizarOrdenMobile = orden => {
  const vistos = new Set();
  const limpio = [];
  (Array.isArray(orden) ? orden : []).forEach(clave => {
    const claves = FICHA_BLOQUES_ALIAS[clave] || [clave];
    claves.forEach(claveReal => {
      if (!FICHA_BLOQUES_CLAVES.includes(claveReal) || vistos.has(claveReal)) return;
      vistos.add(claveReal);
      limpio.push(claveReal);
    });
  });
  return [...limpio, ...FICHA_BLOQUES_CLAVES.filter(clave => !vistos.has(clave))];
};

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

function BloqueFicha({ numero, titulo, resumen, abierto = false, visible = true, onVisible, bloqueClave, onMover, ordenIndice, children }) {
  const dragActivo = Boolean(bloqueClave && onMover);
  return (
    <details
      open={abierto}
      className="group overflow-hidden rounded-xl border border-border bg-surface"
      style={Number.isFinite(ordenIndice) ? { order: ordenIndice } : undefined}
      onDragOver={dragActivo ? e => e.preventDefault() : undefined}
      onDrop={dragActivo ? e => {
        e.preventDefault();
        const origen = e.dataTransfer.getData('text/plain');
        if (origen) onMover(origen, bloqueClave);
      } : undefined}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-2/70 [&::-webkit-details-marker]:hidden">
        {dragActivo && (
          <span
            draggable
            onClick={e => e.stopPropagation()}
            onDragStart={e => {
              e.stopPropagation();
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', bloqueClave);
            }}
            className="-ml-1 grid h-8 w-7 shrink-0 cursor-grab place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface active:cursor-grabbing"
            title="Arrastrar para ordenar"
          >
            <GripVertical size={15} />
          </span>
        )}
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
  const cambiar = (idx, valor) => onCambiar('beneficios', base.map((it, i) => (i === idx ? { ...it, titulo: valor, texto: '' } : it)));
  const agregar = () => onCambiar('beneficios', [...base, { titulo: '', texto: '' }].slice(0, 8));
  const quitar = idx => onCambiar('beneficios', base.filter((_, i) => i !== idx));
  return (
    <fieldset className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
      <legend className="px-1 text-sm font-semibold text-fg">Checks visibles</legend>
      {base.map((item, idx) => (
        <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-2/70 p-2 sm:grid-cols-[1fr_auto]">
          <input className={campo} value={item.titulo || item.texto || ''} maxLength={120} placeholder="Ej: Compra segura" onChange={e => cambiar(idx, e.target.value)} />
          <button type="button" onClick={() => quitar(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button>
        </div>
      ))}
      {base.length < 8 && <button type="button" onClick={agregar} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Agregar check</button>}
    </fieldset>
  );
}

function ListaConfianzaProducto({ items, onCambiar }) {
  const base = Array.isArray(items) ? items : [];
  const cambiar = (idx, campoItem, valor) => onCambiar('confianza', base.map((it, i) => (i === idx ? { ...it, [campoItem]: valor } : it)));
  const agregar = () => onCambiar('confianza', [...base, { icono: '', titulo: '', texto: '' }].slice(0, 6));
  const quitar = idx => onCambiar('confianza', base.filter((_, i) => i !== idx));
  return (
    <fieldset className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
      <legend className="px-1 text-sm font-semibold text-fg">Tarjetas de confianza</legend>
      <p className="text-xs leading-relaxed text-fg-muted">El ícono es texto libre: podés pegar un símbolo, emoji o clase de ícono. No hay lista fija.</p>
      {base.length === 0 && <p className="text-xs text-fg-muted">Todavía no agregaste tarjetas de confianza.</p>}
      {base.map((item, idx) => (
        <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-2/70 p-2 sm:grid-cols-[82px_1fr_auto]">
          <input className={campo} value={item.icono || ''} maxLength={40} placeholder="Ícono" aria-label={`Ícono ${idx + 1}`} onChange={e => cambiar(idx, 'icono', e.target.value)} />
          <div className="grid grid-cols-1 gap-2">
            <input className={campo} value={item.titulo || ''} maxLength={70} placeholder="Título, ej: Compra protegida" onChange={e => cambiar(idx, 'titulo', e.target.value)} />
            <input className={campo} value={item.texto || ''} maxLength={120} placeholder="Subtítulo, ej: Tu pago y tus datos están seguros." onChange={e => cambiar(idx, 'texto', e.target.value)} />
          </div>
          <button type="button" onClick={() => quitar(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button>
        </div>
      ))}
      {base.length < 6 && <button type="button" onClick={agregar} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Agregar tarjeta</button>}
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

function ListaBotones({ titulo, ayuda, items, campoLista, max = 4, onCambiar, descuentos = false, ocultarValorWhatsapp = false }) {
  const base = Array.isArray(items) ? items : [];
  const cambiar = (idx, campoItem, valor) => onCambiar(campoLista, base.map((it, i) => (i === idx ? { ...it, [campoItem]: valor } : it)));
  const cambiarTipo = (idx, tipo) => onCambiar(campoLista, base.map((it, i) => (
    i === idx ? { ...it, tipo, ...(ocultarValorWhatsapp && tipo === 'whatsapp' ? { valor: '' } : {}) } : it
  )));
  const agregar = () => onCambiar(campoLista, [...base, { label: 'Nuevo botón', tipo: 'url', valor: '' }].slice(0, max));
  const quitar = idx => onCambiar(campoLista, base.filter((_, i) => i !== idx));
  return (
    <fieldset className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
      <legend className="px-1 text-sm font-semibold text-fg">{titulo}</legend>
      {ayuda && <p className="text-xs leading-relaxed text-fg-muted">{ayuda}</p>}
      {base.map((boton, idx) => {
        const tipo = boton.tipo || 'whatsapp';
        const ocultarValor = ocultarValorWhatsapp && tipo === 'whatsapp';
        return (
          <div key={idx} className={`grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-2/70 p-2 ${descuentos ? 'sm:grid-cols-[1fr_120px_1fr_110px_auto]' : (ocultarValor ? 'sm:grid-cols-[1fr_130px_auto]' : 'sm:grid-cols-[1fr_130px_1fr_auto]')}`}>
            <input className={campo} value={boton.label || ''} maxLength={36} placeholder="Texto del botón" onChange={e => cambiar(idx, 'label', e.target.value)} />
            <select className={campo} value={tipo} onChange={e => cambiarTipo(idx, e.target.value)}>
              <option value="whatsapp">WhatsApp</option>
              <option value="checkout">Checkout</option>
              <option value="contacto">Contacto</option>
              <option value="url">URL</option>
            </select>
            {!ocultarValor && <input className={campo} value={boton.valor || ''} maxLength={180} placeholder={tipo === 'url' ? 'https://...' : tipo === 'whatsapp' ? 'Mensaje opcional' : 'Opcional'} onChange={e => cambiar(idx, 'valor', e.target.value)} />}
            {descuentos && <input className={campo} type="number" min="0" max="95" step="0.1" inputMode="decimal" value={boton.descuento_pct ?? ''} placeholder="Dto. %" aria-label={`Descuento del botón ${idx + 1}`} onChange={e => cambiar(idx, 'descuento_pct', e.target.value)} onBlur={e => cambiar(idx, 'descuento_pct', normalizarDescuentoBoton(e.target.value))} />}
            <button type="button" onClick={() => quitar(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button>
          </div>
        );
      })}
      {base.length < max && <button type="button" onClick={agregar} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Agregar botón</button>}
    </fieldset>
  );
}

// Los métodos de pago ya se comunican con botones y logos; estos chips viejos
// se filtran para no duplicar "Pago contra entrega" / "Transferencia bancaria".
const METODOS_OCULTOS = [
  ['contra_entrega', 'Pago contra entrega', 'Efectivo al recibir el pedido', ['pago contra entrega', 'contra entrega', 'pago al recibir']],
  ['transferencia', 'Transferencia bancaria', 'Te pasa el comprobante por WhatsApp', ['transferencia bancaria', 'transferencia']],
];
const METODOS_CHIP = [];
const normalizar = t => String(t || '').trim().toLowerCase();
const metodoChipDe = texto => METODOS_CHIP.find(([, , , alias]) => alias.includes(normalizar(texto)));
const metodoOcultoDe = texto => METODOS_OCULTOS.find(([, , , alias]) => alias.includes(normalizar(texto)));

function FilaMetodo({ label, detalle, checked, onChange, ariaLabel = label }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-2/60 px-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        <span className="block truncate text-xs text-fg-muted">{detalle}</span>
      </span>
      <input type="checkbox" className="mt-1 accent-primary" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={ariaLabel} />
    </label>
  );
}

function MetodosPagoEditor({ metodos, onCambiar, pagoLogos, paymentLogosCatalogo = [], onPagoLogosChange }) {
  const base = Array.isArray(metodos) ? metodos : [];
  const otros = base.filter(m => !metodoChipDe(m?.texto || m?.label) && !metodoOcultoDe(m?.texto || m?.label));
  const activo = clave => base.some(m => metodoChipDe(m?.texto || m?.label)?.[0] === clave);
  // Los chips conocidos van primero y en orden fijo; los "otros" detrás.
  const armar = (claves, extras) => [
    ...METODOS_CHIP.filter(([clave]) => claves.includes(clave)).map(([, label]) => ({ texto: label })),
    ...extras,
  ];
  const clavesActivas = METODOS_CHIP.map(([clave]) => clave).filter(activo);
  const alternar = (clave, si) => onCambiar('metodos_pago', armar(si ? [...clavesActivas, clave] : clavesActivas.filter(c => c !== clave), otros));
  const cambiarOtro = (idx, texto) => onCambiar('metodos_pago', armar(clavesActivas, otros.map((m, i) => (i === idx ? { texto } : m))));
  const quitarOtro = idx => onCambiar('metodos_pago', armar(clavesActivas, otros.filter((_, i) => i !== idx)));
  const agregarOtro = () => onCambiar('metodos_pago', armar(clavesActivas, [...otros, { texto: '' }]));
  const conLogos = !!(pagoLogos && onPagoLogosChange);
  return (
    <fieldset className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
      <legend className="px-1 text-sm font-semibold text-fg">Métodos de pago</legend>
      <p className="text-xs leading-relaxed text-fg-muted">Marcá solo lo que tu tienda cobra. Lo que desmarques no aparece en la ficha.</p>
      {METODOS_CHIP.map(([clave, label, detalle]) => (
        <FilaMetodo key={clave} label={label} detalle={detalle} checked={activo(clave)} onChange={si => alternar(clave, si)} />
      ))}
      {conLogos && paymentLogosCatalogo.map(logo => (
        <FilaMetodo key={logo.clave} label={logo.nombre} detalle={`${logo.grupo || 'medio de pago'} · igual en todas las fichas`} checked={pagoLogos[logo.clave] !== false} onChange={si => onPagoLogosChange(logo.clave, si)} ariaLabel={`Mostrar logo ${logo.nombre}`} />
      ))}
      {otros.length > 0 && <p className="pt-1 text-xs font-semibold text-fg">Otros métodos</p>}
      {otros.map((m, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input className={campo} value={m.texto || m.label || ''} maxLength={40} placeholder="Ej: Giros Tigo" aria-label={`Otro método ${idx + 1}`} onChange={e => cambiarOtro(idx, e.target.value)} />
          <button type="button" onClick={() => quitarOtro(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button>
        </div>
      ))}
      {base.length < 8 && <button type="button" onClick={agregarOtro} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Otro método</button>}
    </fieldset>
  );
}

export default function PresentacionProducto({
  item,
  ancla,
  onAncla,
  onCambiar,
  onSubirImagen,
  pagoLogos = null,
  paymentLogosCatalogo = [],
  onPagoLogosChange = null,
  inicialmenteAbierto = false,
  bloqueRecomendados = null,
  recomendadosActivo = true,
  resumenRecomendados = 'Productos relacionados',
  onRecomendadosVisible = null,
}) {
  const precio = Number(precioDeVenta(item)) || 0;
  const descuento = descuentoDesdeAncla(precio, ancla);
  const src = imagenPrincipal(item);
  const titulo = item.titulo_comercial || item.nombre || 'Producto';
  const insigniasListId = `insignias-comerciales-${claveItem(item).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const porcentaje = useMemo(() => descuento || '', [descuento]);
  const beneficios = Array.isArray(item.beneficios) && item.beneficios.length ? item.beneficios : DEFAULTS_PRESENTACION.beneficios;
  const confianza = Array.isArray(item.confianza) ? item.confianza : [];
  const botonesPago = Array.isArray(item.botones_pago) && item.botones_pago.length ? item.botones_pago : DEFAULTS_PRESENTACION.botones_pago;
  // Lista vacía = el comercio desmarcó todo; solo sin dato se usan los ejemplos.
  const metodosPago = Array.isArray(item.metodos_pago) ? item.metodos_pago : DEFAULTS_PRESENTACION.metodos_pago;
  const incluyePedido = Array.isArray(item.incluye_pedido) && item.incluye_pedido.length ? item.incluye_pedido : DEFAULTS_PRESENTACION.incluye_pedido;
  const botonesContacto = Array.isArray(item.botones_contacto) ? item.botones_contacto : DEFAULTS_PRESENTACION.botones_contacto;
  // Sin edición propia en esta landing, opiniones y preguntas arrancan con las
  // del producto (las mismas que muestra la ficha publicada); los ejemplos
  // quedan solo para el producto que no tiene ninguna.
  const delProducto = useMemo(() => contenidoFicha(item), [item]);
  const opiniones = Array.isArray(item.opiniones) ? item.opiniones : (delProducto.opiniones.length ? delProducto.opiniones : DEFAULTS_PRESENTACION.opiniones);
  const preguntas = Array.isArray(item.preguntas) && item.preguntas.length ? item.preguntas : (delProducto.preguntas.length ? delProducto.preguntas : DEFAULTS_PRESENTACION.preguntas);
  const bloquesGuardados = item.ficha_bloques || {};
  const bloquesFicha = { ...FICHA_BLOQUES_DEFAULT, ...bloquesGuardados };
  if (bloquesGuardados.encabezado === false) {
    if (bloquesGuardados.nombre_comercial === undefined) bloquesFicha.nombre_comercial = false;
    if (bloquesGuardados.resenas_comerciales === undefined) bloquesFicha.resenas_comerciales = false;
  }
  if (bloquesGuardados.precio === false && bloquesGuardados.badge_precio === undefined) bloquesFicha.badge_precio = false;
  if (bloquesGuardados.urgencia === false) {
    if (bloquesGuardados.oferta === undefined) bloquesFicha.oferta = false;
    ['oferta_encabezado', 'oferta_nombre', 'oferta_texto', 'oferta_duracion'].forEach(clave => {
      if (bloquesGuardados[clave] === undefined) bloquesFicha[clave] = false;
    });
  }
  if (bloquesGuardados.compra === false) {
    if (bloquesGuardados.contacto_pago === undefined) bloquesFicha.contacto_pago = false;
    if (bloquesGuardados.promociones_pago === undefined) bloquesFicha.promociones_pago = false;
  }
  const ordenMobile = useMemo(() => normalizarOrdenMobile(item.ficha_orden_mobile), [item.ficha_orden_mobile]);
  const ratingResenas = normalizarCalificacion(item.resenas_calificacion);
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
  function cambiarBloques(pares) {
    onCambiar('ficha_bloques', { ...bloquesFicha, ...pares });
  }
  function moverBloqueMobile(origen, destino) {
    const actual = normalizarOrdenMobile(ordenMobile);
    const desde = actual.indexOf(origen);
    const hasta = actual.indexOf(destino);
    if (desde < 0 || hasta < 0 || desde === hasta) return;
    const siguiente = [...actual];
    const [movido] = siguiente.splice(desde, 1);
    siguiente.splice(hasta, 0, movido);
    onCambiar('ficha_orden_mobile', siguiente);
  }
  function visibleBloque(clave) {
    if (bloquesFicha[clave] === false) return false;
    if (clave === 'galeria' && bloquesFicha.portada === false) return false;
    if (['encabezado', 'nombre_comercial', 'resenas_comerciales', 'precio', 'descripcion'].includes(clave) && bloquesFicha.textos === false) return false;
    if (['info_compra', 'promociones_pago', 'contacto_pago'].includes(clave) && bloquesFicha.compra === false) return false;
    return true;
  }
  function cambiarRecomendadosVisible(visible) {
    cambiarBloque('recomendados', visible);
    onRecomendadosVisible?.(visible);
  }

  const resumenPortada = src ? 'Imagen principal y miniaturas listas' : 'Subí o pegá la imagen principal';
  const resumenEncabezado = item.insignia_principal || 'Encabezado visible';
  const resumenNombreComercial = titulo;
  const resumenResenas = item.resenas_texto || `${formatearCalificacion(ratingResenas)} estrellas`;
  const resumenPrecio = `${gs(precio)}${descuento ? ` · -${descuento}%` : ''}`;
  const resumenOfertaEncabezado = item.urgencia_kicker || DEFAULTS_PRESENTACION.urgencia_kicker;
  const resumenOfertaNombre = item.urgencia_titulo || DEFAULTS_PRESENTACION.urgencia_titulo;
  const resumenOfertaTexto = item.urgencia_texto || DEFAULTS_PRESENTACION.urgencia_texto;
  const resumenOfertaDuracion = `${item.urgencia_horas ?? DEFAULTS_PRESENTACION.urgencia_horas}h ${item.urgencia_minutos ?? DEFAULTS_PRESENTACION.urgencia_minutos}m ${item.urgencia_segundos ?? DEFAULTS_PRESENTACION.urgencia_segundos}s`;
  const resumenOferta = `${resumenOfertaNombre} · ${resumenOfertaDuracion}`;
  const resumenDescripcion = item.mensaje_comercial || item.descripcion || 'Texto debajo del precio';
  const resumenBeneficios = beneficios.length ? `${beneficios.length} beneficio${beneficios.length === 1 ? '' : 's'}` : 'Sin beneficios cargados';
  const resumenConfianza = confianza.length ? `${confianza.length} tarjeta${confianza.length === 1 ? '' : 's'}` : 'Sin tarjetas cargadas';
  const resumenPagos = `${metodosPago.length} método${metodosPago.length === 1 ? '' : 's'}`;
  const resumenContacto = `${1 + botonesPago.length + botonesContacto.length} botón${1 + botonesPago.length + botonesContacto.length === 1 ? '' : 'es'}`;
  const resumenIncluye = incluyePedido.length ? `${incluyePedido.length} ítem${incluyePedido.length === 1 ? '' : 's'}` : 'Sin ítems cargados';
  const resumenOpiniones = opiniones.length ? `${opiniones.length} ${opiniones.length === 1 ? 'opinión' : 'opiniones'}` : 'Sin opiniones todavía';
  const resumenPreguntas = preguntas.length ? `${preguntas.length} pregunta${preguntas.length === 1 ? '' : 's'}` : 'Sin preguntas cargadas';

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
        <p className="text-sm font-semibold text-fg">Editás solo la ficha pública de este producto.</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">Los bloques siguen el orden real de la ficha. Los números quedan fijos aunque ocultes una sección.</p>
      </div>
      <div className="flex flex-col gap-3">
        <BloqueFicha numero="1" titulo="Galería del producto" resumen={resumenPortada} abierto={inicialmenteAbierto} visible={visibleBloque('galeria')} onVisible={v => cambiarBloque('galeria', v)} bloqueClave="galeria" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('galeria')}>
          <datalist id={insigniasListId}>{INSIGNIAS_COMERCIALES.map(i => <option key={i} value={i} />)}</datalist>
          <ImagenesProductoLanding item={item} onCambiar={onCambiar} onSubirImagen={onSubirImagen} />
        </BloqueFicha>
        <BloqueFicha numero="2" titulo="Encabezado" resumen={resumenEncabezado} abierto={inicialmenteAbierto} visible={visibleBloque('encabezado')} onVisible={v => cambiarBloque('encabezado', v)} bloqueClave="encabezado" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('encabezado')}>
          <label className="block text-xs text-fg-muted">Encabezado<input className={campo} value={item.insignia_principal || ''} list={insigniasListId} maxLength={40} placeholder={DEFAULTS_PRESENTACION.insignia_principal} onChange={e => onCambiar('insignia_principal', e.target.value)} /></label>
        </BloqueFicha>
        <BloqueFicha numero="3" titulo="Nombre comercial" resumen={resumenNombreComercial} abierto={inicialmenteAbierto} visible={visibleBloque('nombre_comercial')} onVisible={v => cambiarBloque('nombre_comercial', v)} bloqueClave="nombre_comercial" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('nombre_comercial')}>
          <label className="block text-xs text-fg-muted">Nombre comercial<input className={campo} value={item.titulo_comercial || ''} maxLength={100} placeholder={item.nombre} onChange={e => onCambiar('titulo_comercial', e.target.value)} /></label>
        </BloqueFicha>
        <BloqueFicha numero="4" titulo="Reseñas comerciales" resumen={resumenResenas} abierto={inicialmenteAbierto} visible={visibleBloque('resenas_comerciales')} onVisible={v => cambiarBloque('resenas_comerciales', v)} bloqueClave="resenas_comerciales" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('resenas_comerciales')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px]">
            <label className="block text-xs text-fg-muted">Texto de reseñas<input className={campo} value={item.resenas_texto || ''} maxLength={80} placeholder={DEFAULTS_PRESENTACION.resenas_texto} onChange={e => onCambiar('resenas_texto', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Cantidad de estrellas<input className={campo} type="number" min="1" max="5" step="0.1" inputMode="decimal" value={item.resenas_calificacion ?? DEFAULTS_PRESENTACION.resenas_calificacion} onChange={e => onCambiar('resenas_calificacion', e.target.value)} /></label>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <span className="font-black text-amber-500" aria-hidden="true">★★★★★</span>
            <span className="text-xs font-semibold text-fg-muted">{formatearCalificacion(ratingResenas)} de 5 estrellas</span>
          </div>
        </BloqueFicha>
        <BloqueFicha numero="5" titulo="Precio y oferta" resumen={resumenPrecio} abierto={inicialmenteAbierto} visible={visibleBloque('precio')} onVisible={v => cambiarBloques({ precio: v, badge_precio: v })} bloqueClave="precio" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('precio')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-xs text-fg-muted">Precio anterior<CurrencyInput id={`ancla-${claveItem(item)}`} aria-label="Precio anterior" inputMode="numeric" value={ancla ?? ''} onChange={v => onAncla(v == null ? '' : String(v))} placeholder="Opcional" className={campo} /></label>
            <label className="block text-xs text-fg-muted">% de descuento<input inputMode="numeric" value={porcentaje} placeholder="Ej: 21" className={campo} onChange={e => onAncla(precioAnclaPorDescuento(precio, e.target.value))} /></label>
            <label className="block text-xs text-fg-muted">Badge de precio<input className={campo} value={item.insignia_secundaria || ''} list={insigniasListId} maxLength={40} placeholder={descuento ? `-${descuento}%` : 'Oferta especial'} onChange={e => onCambiar('insignia_secundaria', e.target.value)} /></label>
          </div>
        </BloqueFicha>
        <BloqueFicha numero="6" titulo="Oferta por tiempo limitado" resumen={resumenOferta} abierto={inicialmenteAbierto} visible={visibleBloque('oferta')} onVisible={v => cambiarBloques({ oferta: v, urgencia: v })} bloqueClave="oferta" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('oferta')}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-xs text-fg-muted">Encabezado de la oferta<input className={campo} value={item.urgencia_kicker || ''} maxLength={60} placeholder={DEFAULTS_PRESENTACION.urgencia_kicker} onChange={e => onCambiar('urgencia_kicker', e.target.value)} /></label>
              <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_encabezado')} onChange={e => cambiarBloque('oferta_encabezado', e.target.checked)} /> Mostrar encabezado</label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-xs text-fg-muted">Nombre de la oferta<input className={campo} value={item.urgencia_titulo || ''} maxLength={90} placeholder={DEFAULTS_PRESENTACION.urgencia_titulo} onChange={e => onCambiar('urgencia_titulo', e.target.value)} /></label>
              <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_nombre')} onChange={e => cambiarBloque('oferta_nombre', e.target.checked)} /> Mostrar nombre</label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-xs text-fg-muted">Texto de la oferta<textarea className={area} rows={2} value={item.urgencia_texto || ''} maxLength={180} placeholder={DEFAULTS_PRESENTACION.urgencia_texto} onChange={e => onCambiar('urgencia_texto', e.target.value)} /></label>
              <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_texto')} onChange={e => cambiarBloque('oferta_texto', e.target.checked)} /> Mostrar texto</label>
            </div>
            <fieldset className="rounded-lg border border-border bg-surface px-3 py-3">
              <legend className="px-1 text-sm font-semibold text-fg">Duración del contador</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <label className="block text-xs text-fg-muted">Horas<input className={campo} type="number" min="0" max="99" value={item.urgencia_horas ?? ''} placeholder={String(DEFAULTS_PRESENTACION.urgencia_horas)} onChange={e => onCambiar('urgencia_horas', e.target.value)} /></label>
                <label className="block text-xs text-fg-muted">Minutos<input className={campo} type="number" min="0" max="59" value={item.urgencia_minutos ?? ''} placeholder={String(DEFAULTS_PRESENTACION.urgencia_minutos)} onChange={e => onCambiar('urgencia_minutos', e.target.value)} /></label>
                <label className="block text-xs text-fg-muted">Segundos<input className={campo} type="number" min="0" max="59" value={item.urgencia_segundos ?? ''} placeholder={String(DEFAULTS_PRESENTACION.urgencia_segundos)} onChange={e => onCambiar('urgencia_segundos', e.target.value)} /></label>
                <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_duracion')} onChange={e => cambiarBloque('oferta_duracion', e.target.checked)} /> Mostrar contador</label>
              </div>
            </fieldset>
          </div>
        </BloqueFicha>
        <BloqueFicha numero="7" titulo="Descripción breve" resumen={resumenDescripcion} abierto={inicialmenteAbierto} visible={visibleBloque('descripcion')} onVisible={v => cambiarBloque('descripcion', v)} bloqueClave="descripcion" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('descripcion')}>
          <label className="block text-xs text-fg-muted">Texto debajo del precio<textarea className={area} rows={2} value={item.mensaje_comercial || ''} maxLength={220} placeholder="Sonido para acompañar tu rutina." onChange={e => onCambiar('mensaje_comercial', e.target.value)} /></label>
        </BloqueFicha>
        <BloqueFicha numero="8" titulo="Beneficios principales" resumen={resumenBeneficios} visible={visibleBloque('beneficios')} onVisible={v => cambiarBloque('beneficios', v)} bloqueClave="beneficios" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('beneficios')}>
          <ListaBeneficios items={beneficios} onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="9" titulo="Botones de contacto y pago" resumen={resumenContacto} visible={visibleBloque('contacto_pago')} onVisible={v => cambiarBloques({ contacto_pago: v, compra: v })} bloqueClave="contacto_pago" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('contacto_pago')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px]">
            <label className="block text-xs text-fg-muted">Botón principal de compra<input className={campo} value={item.cta_texto || ''} maxLength={42} placeholder="Comprar con pago anticipado" onChange={e => onCambiar('cta_texto', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Descuento pago anticipado %<input className={campo} type="number" min="0" max="95" step="0.1" inputMode="decimal" value={item.cta_descuento_pct ?? ''} placeholder="Ej: 10" onChange={e => onCambiar('cta_descuento_pct', e.target.value)} onBlur={e => onCambiar('cta_descuento_pct', normalizarDescuentoBoton(e.target.value))} /></label>
          </div>
          <ListaBotones titulo="Botones de pago" ayuda="Botones secundarios como Pago contra entrega, Comprar por WhatsApp o un link de pago. Podés sumar un descuento por botón para incentivar el pago anticipado." items={botonesPago} campoLista="botones_pago" onCambiar={onCambiar} descuentos />
          <ListaBotones titulo="Botones configurables de contacto" ayuda="Caminos de contacto adicionales de esta ficha. WhatsApp usa el mensaje configurado en Mi tienda." items={botonesContacto} campoLista="botones_contacto" onCambiar={onCambiar} ocultarValorWhatsapp />
        </BloqueFicha>
        <BloqueFicha numero="10" titulo="Disponibilidad y medios de pago" resumen={resumenPagos} visible={visibleBloque('promociones_pago')} onVisible={v => cambiarBloque('promociones_pago', v)} bloqueClave="promociones_pago" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('promociones_pago')}>
          <p className="text-xs leading-relaxed text-fg-muted">Esta zona aparece después de los botones: disponibilidad, cobertura y medios de pago antes de confirmar.</p>
          <MetodosPagoEditor metodos={metodosPago} onCambiar={onCambiar} pagoLogos={pagoLogos} paymentLogosCatalogo={paymentLogosCatalogo} onPagoLogosChange={onPagoLogosChange} />
        </BloqueFicha>
        <BloqueFicha numero="11" titulo="Qué incluye tu pedido" resumen={resumenIncluye} visible={visibleBloque('incluye')} onVisible={v => cambiarBloque('incluye', v)} bloqueClave="incluye" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('incluye')}>
          <ListaSimple titulo="Ítems incluidos" ayuda="Cada línea aparece como checklist dentro de la ficha." items={incluyePedido} campoLista="incluye_pedido" placeholder="Ej: 1 unidad del producto seleccionado" onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="12" titulo="Productos recomendados" resumen={resumenRecomendados} visible={visibleBloque('recomendados') && recomendadosActivo !== false} onVisible={cambiarRecomendadosVisible} bloqueClave="recomendados" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('recomendados')}>
          {bloqueRecomendados || <p className="text-xs leading-relaxed text-fg-muted">Configurá acá los productos que aparecen como recomendados en la ficha.</p>}
        </BloqueFicha>
        <BloqueFicha numero="13" titulo="Zona de confianza" resumen={resumenConfianza} visible={visibleBloque('confianza')} onVisible={v => cambiarBloque('confianza', v)} bloqueClave="confianza" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('confianza')}>
          <ListaConfianzaProducto items={confianza} onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="14" titulo="Opiniones" resumen={resumenOpiniones} visible={visibleBloque('opiniones')} onVisible={v => cambiarBloque('opiniones', v)} bloqueClave="opiniones" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('opiniones')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">Rótulo de sección<input className={campo} value={valorConfigurable(item, 'opiniones_kicker', DEFAULTS_PRESENTACION.opiniones_kicker)} maxLength={60} placeholder={DEFAULTS_PRESENTACION.opiniones_kicker} onChange={e => onCambiar('opiniones_kicker', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted">Título de sección<input className={campo} value={valorConfigurable(item, 'opiniones_titulo', DEFAULTS_PRESENTACION.opiniones_titulo)} maxLength={90} placeholder={DEFAULTS_PRESENTACION.opiniones_titulo} onChange={e => onCambiar('opiniones_titulo', e.target.value)} /></label>
            <label className="block text-xs text-fg-muted sm:col-span-2">Subtítulo de sección<textarea className={area} rows={2} value={valorConfigurable(item, 'opiniones_subtitulo', DEFAULTS_PRESENTACION.opiniones_subtitulo)} maxLength={180} placeholder={DEFAULTS_PRESENTACION.opiniones_subtitulo} onChange={e => onCambiar('opiniones_subtitulo', e.target.value)} /></label>
          </div>
          <fieldset className="space-y-3 rounded-lg border border-border bg-surface px-3 py-3">
            <legend className="px-1 text-sm font-semibold text-fg">Opiniones reales</legend>
            <p className="text-xs leading-relaxed text-fg-muted">Podés subir una foto de la persona o pegar una URL pública. Si no agregás opiniones, la sección se oculta.</p>
            {opiniones.length === 0 ? <p className="text-xs text-fg-muted">Todavía no hay opiniones para esta ficha.</p> : (
              <div className="space-y-2">
                {opiniones.map((opinion, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-surface-2/70 p-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_auto]"><input className={campo} value={opinion.nombre || ''} maxLength={60} placeholder="Nombre" onChange={e => cambiarOpinion(idx, 'nombre', e.target.value)} /><input className={campo} type="number" min="1" max="5" step="0.1" inputMode="decimal" value={opinion.calificacion || 5} onChange={e => cambiarOpinion(idx, 'calificacion', e.target.value)} /><button type="button" onClick={() => quitarOpinion(idx)} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button></div>
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
        <BloqueFicha numero="15" titulo="Preguntas frecuentes" resumen={resumenPreguntas} visible={visibleBloque('preguntas')} onVisible={v => cambiarBloque('preguntas', v)} bloqueClave="preguntas" onMover={moverBloqueMobile} ordenIndice={ordenMobile.indexOf('preguntas')}>
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
