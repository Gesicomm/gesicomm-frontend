import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import { getMediaUrl } from '../../services/api';
import { claveItem, precioDeVenta } from './PrecioAnclaItem';
import { contenidoFicha, presentacionComercial } from './datosRuntime';
import { AVISO_PAGO_ANTICIPADO } from './usePagoparConectado';
import ImagenesProductoLanding from './ImagenesProductoLanding';
import { GripVertical, Lock, Upload } from 'lucide-react';

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
// Los bloques tal como se numeran y titulan en este panel, y qué zonas de la
// ficha (data-gesicomm-ficha-bloque) edita cada uno. Lo usa la vista previa
// para rotular un bloque al pasarle el mouse y abrirlo acá con un clic.
export const BLOQUES_FICHA_PANEL = [
  { clave: 'galeria', numero: 1, titulo: 'Galería del producto', zonas: ['galeria', 'portada'] },
  { clave: 'encabezado', numero: 2, titulo: 'Encabezado', zonas: ['encabezado'] },
  { clave: 'nombre_comercial', numero: 3, titulo: 'Nombre comercial', zonas: ['nombre_comercial'] },
  { clave: 'resenas_comerciales', numero: 4, titulo: 'Reseñas comerciales', zonas: ['resenas_comerciales'] },
  { clave: 'precio', numero: 5, titulo: 'Precio y oferta', zonas: ['precio', 'badge_precio'] },
  { clave: 'oferta', numero: 6, titulo: 'Oferta por tiempo limitado', zonas: ['oferta', 'urgencia', 'oferta_encabezado', 'oferta_nombre', 'oferta_texto', 'oferta_duracion'] },
  { clave: 'descripcion', numero: 7, titulo: 'Descripción breve', zonas: ['descripcion'] },
  { clave: 'beneficios', numero: 8, titulo: 'Beneficios principales', zonas: ['beneficios'] },
  { clave: 'contacto_pago', numero: 9, titulo: 'Botones de contacto y pago', zonas: ['contacto_pago', 'compra'] },
  { clave: 'promociones_pago', numero: 10, titulo: 'Disponibilidad y medios de pago', zonas: ['promociones_pago', 'info_compra'] },
  { clave: 'incluye', numero: 11, titulo: 'Qué incluye tu pedido', zonas: ['incluye'] },
  { clave: 'recomendados', numero: 12, titulo: 'Productos recomendados', zonas: ['recomendados'] },
  { clave: 'confianza', numero: 13, titulo: 'Zona de confianza', zonas: ['confianza'] },
  { clave: 'opiniones', numero: 14, titulo: 'Opiniones', zonas: ['opiniones'] },
  { clave: 'preguntas', numero: 15, titulo: 'Preguntas frecuentes', zonas: ['preguntas'] },
];
export const ROTULOS_BLOQUES_FICHA = Object.fromEntries(
  BLOQUES_FICHA_PANEL.flatMap(b => b.zonas.map(zona => [zona, `${b.numero} · ${b.titulo}`])),
);
export const bloqueDeZona = zona => BLOQUES_FICHA_PANEL.find(b => b.zonas.includes(zona))?.clave || null;
// pedido = { clave, n }: el bloque que la vista previa pidió abrir (n cambia en
// cada pedido). activo = el bloque que el comercio está editando ahora.
const BloquePedidoContext = createContext({ pedido: null, activo: null, marcarActivo: () => {} });
// El arrastre de bloques: quién se arrastra, sobre qué bloque no se puede
// soltar, y los manejadores (ver PresentacionProducto).
const ArrastreFichaContext = createContext(null);
const TIPO_ARRASTRE = 'application/x-gesicomm-bloque-ficha';
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

const gs = n => `Gs ${Math.round(Number(n) || 0).toLocaleString('es-PY')}`;
const limpiarNumero = valor => Number(String(valor ?? '').replace(/\D/g, '')) || 0;
const normalizarCalificacion = (valor, fallback = DEFAULTS_PRESENTACION.resenas_calificacion) => {
  const crudo = String(valor ?? '').replace(',', '.').trim();
  // Sin dato no es un 0: Number('') da 0 y la ficha mostraba 1 estrella.
  const n = crudo === '' ? NaN : Number(crudo);
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
// Hasta dónde se puede arrastrar cada bloque. La ficha arma la columna del
// producto (bloques 2 a 11) y las secciones de abajo (12 a 15) en
// contenedores distintos, y la galería es la otra columna: un bloque solo
// cambia de lugar dentro de su grupo (ver aplicarOrdenMobileFicha en el
// runtime). null = fijo.
const SECCIONES_FICHA = ['recomendados', 'confianza', 'opiniones', 'preguntas'];
export const grupoOrdenFicha = clave => {
  if (clave === 'galeria') return null;
  return SECCIONES_FICHA.includes(clave) ? 'secciones' : 'columna';
};
const RANGO_GRUPO_FICHA = {
  columna: 'entre los bloques 2 y 11 (la columna del producto)',
  secciones: 'entre los bloques 12 y 15 (las secciones debajo de la ficha)',
};
const POSICION_GRUPO = { galeria: 0, columna: 1, secciones: 2 };
export const normalizarOrdenMobile = orden => {
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
  const completo = [...limpio, ...FICHA_BLOQUES_CLAVES.filter(clave => !vistos.has(clave))];
  // Un orden guardado antes de limitar el arrastre puede mezclar grupos: se
  // muestra como lo arma la página (cada grupo en su contenedor).
  const posicion = clave => POSICION_GRUPO[grupoOrdenFicha(clave) || 'galeria'];
  return completo
    .map((clave, i) => [clave, i])
    .sort((a, b) => posicion(a[0]) - posicion(b[0]) || a[1] - b[1])
    .map(([clave]) => clave);
};
// Pone `origen` justo después de `destino` (despues = true) o justo antes.
// Sin `despues`, al lugar de destino: después si baja, antes si sube. El
// badge de precio no tiene bloque propio en el panel: va siempre pegado al
// precio. null = movimiento no permitido o sin cambio.
export function moverEnOrden(orden, origen, destino, despues) {
  if (!grupoOrdenFicha(origen) || grupoOrdenFicha(origen) !== grupoOrdenFicha(destino) || origen === destino) return null;
  const actual = normalizarOrdenMobile(orden);
  const lista = actual.filter(clave => clave !== 'badge_precio');
  const desde = lista.indexOf(origen);
  if (desde < 0 || lista.indexOf(destino) < 0) return null;
  const baja = despues ?? desde < lista.indexOf(destino);
  lista.splice(desde, 1);
  lista.splice(lista.indexOf(destino) + (baja ? 1 : 0), 0, origen);
  lista.splice(lista.indexOf('precio') + 1, 0, 'badge_precio');
  return lista.join() === actual.join() ? null : lista;
}

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

// Desplaza SOLO el panel que contiene al bloque. scrollIntoView no sirve acá:
// el navegador mueve también los contenedores de afuera aunque tengan
// overflow oculto, y la pantalla entera del editor quedaba corrida hacia
// arriba, con una franja vacía debajo de la barra de "Inventario de la landing".
function llevarBloqueALaVista(bloque) {
  let panel = bloque.parentElement;
  while (panel) {
    const desborde = window.getComputedStyle(panel).overflowY;
    if ((desborde === 'auto' || desborde === 'scroll') && panel.scrollHeight > panel.clientHeight) break;
    panel = panel.parentElement;
  }
  if (!panel) return;
  const destino = bloque.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - 12;
  if (panel.scrollTo) panel.scrollTo({ top: Math.max(0, destino), behavior: 'smooth' });
  else panel.scrollTop = Math.max(0, destino);
}

// Un texto de la ficha con su "Mostrar": destildado no se dibuja en la página,
// pero el texto queda guardado para volver a mostrarlo (ver textos_ocultos en
// presentacionComercial). Vacío tampoco se dibuja.
function CampoOcultable({ titulo, campo, ocultos, onOcultos, className = '', children }) {
  const visible = !ocultos.includes(campo);
  return (
    <div className={`block text-xs text-fg-muted ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span>{titulo}</span>
        <label className="flex shrink-0 items-center gap-1.5 font-medium">
          <input
            type="checkbox"
            className="accent-primary"
            checked={visible}
            aria-label={`Mostrar ${titulo.toLowerCase()}`}
            onChange={e => onOcultos(e.target.checked ? ocultos.filter(c => c !== campo) : [...ocultos, campo])}
          />
          Mostrar
        </label>
      </div>
      <div className={visible ? '' : 'opacity-50'}>{children}</div>
    </div>
  );
}

function BloqueFicha({ numero, titulo, resumen, abierto = false, visible = true, onVisible, bloqueClave, ordenIndice, children }) {
  const arrastreCtx = useContext(ArrastreFichaContext);
  const grupo = bloqueClave ? grupoOrdenFicha(bloqueClave) : null;
  const dragActivo = Boolean(arrastreCtx && grupo);
  const arrastre = arrastreCtx?.arrastre;
  const esOrigen = arrastre?.origen === bloqueClave;
  const fueraDeGrupo = !!arrastre && grupo !== grupoOrdenFicha(arrastre.origen);
  const bloqueado = !!arrastre && arrastre.bloqueado === bloqueClave;
  const recienMovido = arrastreCtx?.recienMovido === bloqueClave;
  const { pedido, activo, marcarActivo } = useContext(BloquePedidoContext);
  const ref = useRef(null);
  useEffect(() => {
    if (!pedido || pedido.clave !== bloqueClave || !ref.current) return;
    ref.current.open = true;
    llevarBloqueALaVista(ref.current);
    marcarActivo(bloqueClave);
  }, [pedido?.n, pedido?.clave, bloqueClave, marcarActivo]);
  // El bloque en el que se está trabajando queda marcado con el mismo borde
  // que el bloque abierto del Inicio (FilaBloqueInicio), para saber de un
  // vistazo cuál se está editando aunque haya varios abiertos.
  const editando = !!bloqueClave && activo === bloqueClave;
  let estilo = editando ? 'border-primary ring-2 ring-primary/30' : 'border-border';
  if (esOrigen) estilo = 'border-dashed border-primary bg-primary/5 opacity-60';
  else if (bloqueado) estilo = 'border-danger ring-2 ring-danger/30 opacity-70';
  else if (fueraDeGrupo) estilo = 'border-border opacity-40';
  else if (recienMovido) estilo = 'border-primary ring-4 ring-primary/25';
  return (
    <details
      ref={ref}
      open={abierto}
      data-bloque-ficha={bloqueClave}
      data-editando={editando ? '' : undefined}
      data-arrastrando={esOrigen ? '' : undefined}
      onFocusCapture={() => marcarActivo(bloqueClave)}
      onClickCapture={() => marcarActivo(bloqueClave)}
      className={`group overflow-hidden rounded-xl border bg-surface transition-[box-shadow,opacity,border-color] duration-200 ${estilo}`}
      style={Number.isFinite(ordenIndice) ? { order: ordenIndice * 2 } : undefined}
      onDragOver={arrastreCtx && bloqueClave ? e => arrastreCtx.sobre(bloqueClave, e) : undefined}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-2/70 [&::-webkit-details-marker]:hidden">
        {dragActivo ? (
          <span
            draggable
            onClick={e => e.stopPropagation()}
            onDragStart={e => arrastreCtx.empezar(bloqueClave, e)}
            onDragEnd={arrastreCtx.terminar}
            className="-ml-1 grid h-8 w-7 shrink-0 cursor-grab place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
            title="Arrastrar para ordenar"
            aria-label={`Arrastrar ${titulo} para ordenar`}
          >
            <GripVertical size={15} />
          </span>
        ) : arrastreCtx && bloqueClave && (
          <span className="-ml-1 grid h-8 w-7 shrink-0 place-items-center text-fg-muted/50" title="Este bloque queda fijo: es la otra columna de la ficha">
            <Lock size={13} />
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

export function ListaConfianzaProducto({ items, onCambiar }) {
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
  cantidadSeleccionada = 1,
  ancla,
  onAncla,
  onCambiar,
  onSubirImagen,
  pagoLogos = null,
  paymentLogosCatalogo = [],
  onPagoLogosChange = null,
  // false = el comercio no conectó PagoPar: el pago anticipado se muestra
  // apagado. null = todavía no se sabe, no se bloquea nada.
  pagoparConectado = null,
  // Lo que ESTA landing guardó para el producto (solo lo que se tocó) y la
  // ficha tal como la resuelve la página. Sin ellas se calculan del item.
  propio = null,
  efectivo = null,
  // { clave, n }: bloque que hay que abrir y llevar a la vista.
  bloqueAbierto = null,
  inicialmenteAbierto = false,
  bloqueRecomendados = null,
  recomendadosActivo = true,
  resumenRecomendados = 'Productos relacionados',
  onRecomendadosVisible = null,
}) {
  const precio = Number(precioDeVenta(item)) || 0;
  const sinPagopar = pagoparConectado === false;
  const descuento = descuentoDesdeAncla(precio, ancla);
  const src = imagenPrincipal(item);
  const titulo = item.titulo_comercial || item.nombre || 'Producto';
  const insigniasListId = `insignias-comerciales-${claveItem(item).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const porcentaje = useMemo(() => descuento || '', [descuento]);
  // Cada campo muestra lo que SALE en la ficha. `ef` es la ficha resuelta con
  // la misma función que la página (presentacionComercial): lo propio de esta
  // landing, si no el texto del producto, si no el de respaldo. Antes el panel
  // calculaba todo por su cuenta y mostraba ejemplos o campos vacíos mientras
  // la página publicaba los beneficios, la descripción o las reseñas reales.
  const ef = useMemo(
    () => efectivo || { ...item, ...contenidoFicha(item), ...presentacionComercial(item, null) },
    [efectivo, item],
  );
  const mio = propio || item;
  const tiene = c => Object.prototype.hasOwnProperty.call(mio, c) && mio[c] != null;
  // Lo escrito en esta landing tal cual (también vacío: se borró a propósito);
  // si el campo no se tocó, el texto que resuelve la página.
  const val = (c, respaldo = '') => (propio && tiene(c) ? mio[c] : (ef[c] ?? respaldo));
  const listaDe = c => (propio && Array.isArray(mio[c]) ? mio[c] : (Array.isArray(ef[c]) ? ef[c] : []));
  const textosOcultos = propio && Array.isArray(mio.textos_ocultos) ? mio.textos_ocultos : [];
  const beneficios = listaDe('beneficios');
  const confianza = listaDe('confianza');
  const botonesPago = listaDe('botones_pago');
  const metodosPago = listaDe('metodos_pago');
  const incluyePedido = listaDe('incluye_pedido');
  const botonesContacto = listaDe('botones_contacto');
  const opiniones = listaDe('opiniones');
  const preguntas = listaDe('preguntas');
  const encabezado = propio && tiene('insignia_principal') ? mio.insignia_principal : (ef.insignia_principal || ef.categoria || '');
  const fraseDestacada = propio && tiene('propuesta_valor') ? mio.propuesta_valor : (ef.propuesta_valor || '');
  const descripcionFicha = propio && tiene('mensaje_comercial') ? mio.mensaje_comercial : (ef.mensaje_comercial || ef.descripcion_ficha || ef.descripcion_larga || ef.descripcion || '');
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
  const ratingResenas = normalizarCalificacion(val('resenas_calificacion', DEFAULTS_PRESENTACION.resenas_calificacion));
  const [bloqueActivo, setBloqueActivo] = useState(null);
  const contextoBloques = useMemo(
    () => ({ pedido: bloqueAbierto, activo: bloqueActivo, marcarActivo: setBloqueActivo }),
    [bloqueAbierto, bloqueActivo],
  );
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
  // ─── Arrastrar bloques ────────────────────────────────────────────────
  // Mientras se arrastra, la lista ya se reordena (los demás bloques se
  // corren para hacerle lugar, animados) y recién al soltar se guarda. Si se
  // suelta afuera o con Escape, todo vuelve a su lugar. La referencia es la
  // fuente de verdad (dragover llega antes de que React pinte); el estado,
  // lo que se dibuja.
  const listaBloquesRef = useRef(null);
  const arrastreRef = useRef(null);
  const posicionesRef = useRef(null);
  const [arrastre, setArrastre] = useState(null);
  const [recienMovido, setRecienMovido] = useState(null);
  const ordenVisible = arrastre?.orden || ordenMobile;
  function fijarArrastre(valor) {
    arrastreRef.current = valor;
    setArrastre(valor);
  }
  function medirBloques() {
    const lista = listaBloquesRef.current;
    if (!lista) return;
    posicionesRef.current = new Map(
      [...lista.querySelectorAll('[data-bloque-ficha]')].map(el => [el, el.getBoundingClientRect().top]),
    );
  }
  // FLIP: cada bloque arranca donde estaba y se desliza hasta su lugar nuevo.
  useLayoutEffect(() => {
    const antes = posicionesRef.current;
    posicionesRef.current = null;
    const lista = listaBloquesRef.current;
    if (!antes || !lista) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    lista.querySelectorAll('[data-bloque-ficha]').forEach(el => {
      const previo = antes.get(el);
      if (previo === undefined) return;
      el.style.transition = 'none';
      el.style.transform = '';
      const delta = previo - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      el.style.transform = `translateY(${delta}px)`;
      el.getBoundingClientRect();
      el.style.transition = 'transform 240ms cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
      clearTimeout(el.__finFlip);
      el.__finFlip = setTimeout(() => { el.style.transition = ''; }, 260);
    });
  }, [ordenVisible]);
  useEffect(() => {
    if (!recienMovido) return undefined;
    const t = setTimeout(() => setRecienMovido(null), 900);
    return () => clearTimeout(t);
  }, [recienMovido]);
  const controlArrastre = {
    arrastre,
    recienMovido,
    empezar(clave, e) {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      // Tipo propio: un texto plano se pegaría en el input sobre el que pase.
      e.dataTransfer.setData(TIPO_ARRASTRE, clave);
      // La "foto" que acompaña al cursor es la cabecera entera del bloque,
      // levantada (fondo y sombra solo durante la captura), no el ícono.
      const cabecera = e.currentTarget.closest('summary');
      if (cabecera && e.dataTransfer.setDragImage) {
        const r = cabecera.getBoundingClientRect();
        const fondo = window.getComputedStyle(cabecera.parentElement).backgroundColor;
        Object.assign(cabecera.style, { background: fondo, boxShadow: '0 12px 28px rgba(0,0,0,.35)', borderRadius: '12px' });
        e.dataTransfer.setDragImage(cabecera, e.clientX - r.left, e.clientY - r.top);
        setTimeout(() => Object.assign(cabecera.style, { background: '', boxShadow: '', borderRadius: '' }), 0);
      }
      arrastreRef.current = { origen: clave, orden: ordenMobile, bloqueado: null };
      // El bloque se vuelve "hueco" recién después de la captura.
      setTimeout(() => { if (arrastreRef.current?.origen === clave) setArrastre(arrastreRef.current); }, 0);
    },
    sobre(destino, e) {
      const actual = arrastreRef.current;
      if (!actual) return;
      if (grupoOrdenFicha(destino) !== grupoOrdenFicha(actual.origen)) {
        // Sin preventDefault: el cursor muestra que ahí no se puede soltar.
        if (actual.bloqueado !== destino) fijarArrastre({ ...actual, bloqueado: destino });
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const limpio = actual.bloqueado ? { ...actual, bloqueado: null } : actual;
      if (destino === actual.origen) {
        if (limpio !== actual) fijarArrastre(limpio);
        return;
      }
      // Arriba o abajo se decide por dónde están en pantalla los dos bloques,
      // no por el orden guardado: entre un dragover y el siguiente React
      // puede no haber repintado, y comparar contra un orden más nuevo que
      // la pantalla deshacía el movimiento. Se cambia de lugar cuando el
      // cursor entra en la zona que el bloque arrastrado va a ocupar: con
      // bloques de distinto alto (uno abierto) así no rebota.
      const r = e.currentTarget.getBoundingClientRect();
      const ro = listaBloquesRef.current?.querySelector(`[data-bloque-ficha="${actual.origen}"]`)?.getBoundingClientRect();
      let baja;
      if (ro && r.height > 0 && ro.height > 0) {
        baja = r.top > ro.top;
        const entra = baja ? e.clientY > r.bottom - ro.height : e.clientY < r.top + ro.height;
        if (!entra) {
          if (limpio !== actual) fijarArrastre(limpio);
          return;
        }
      }
      const siguiente = moverEnOrden(actual.orden, actual.origen, destino, baja);
      if (!siguiente) {
        if (limpio !== actual) fijarArrastre(limpio);
        return;
      }
      medirBloques();
      fijarArrastre({ ...limpio, orden: siguiente });
    },
    soltar(e) {
      const actual = arrastreRef.current;
      if (!actual) return;
      e.preventDefault();
      if (actual.orden.join() !== ordenMobile.join()) onCambiar('ficha_orden_mobile', actual.orden);
      setRecienMovido(actual.origen);
      fijarArrastre(null);
    },
    terminar() {
      // Soltado afuera, en un bloque de otro grupo o con Escape: vuelve.
      if (!arrastreRef.current) return;
      medirBloques();
      fijarArrastre(null);
    },
  };
  function dentroDeLista(e) {
    const actual = arrastreRef.current;
    // Entre bloque y bloque (el espacio que los separa) también se puede soltar.
    if (actual && !actual.bloqueado && !e.target.closest?.('[data-bloque-ficha]')) e.preventDefault();
  }
  const tituloBloque = clave => BLOQUES_FICHA_PANEL.find(b => b.clave === clave)?.titulo || clave;
  const inicioSecciones = ordenVisible.findIndex(clave => grupoOrdenFicha(clave) === 'secciones');
  function visibleBloque(clave) {
    if (bloquesFicha[clave] === false) return false;
    if (bloquesGuardados[clave] === undefined) {
      if (clave === 'galeria' && bloquesFicha.portada === false) return false;
      if (['encabezado', 'nombre_comercial', 'resenas_comerciales', 'precio', 'descripcion'].includes(clave) && bloquesFicha.textos === false) return false;
      if (['info_compra', 'promociones_pago', 'contacto_pago'].includes(clave) && bloquesFicha.compra === false) return false;
    }
    return true;
  }
  function cambiarRecomendadosVisible(visible) {
    cambiarBloque('recomendados', visible);
    onRecomendadosVisible?.(visible);
  }

  const resumenPortada = src ? 'Imagen principal y miniaturas listas' : 'Subí o pegá la imagen principal';
  const resumenEncabezado = encabezado || 'Sin encabezado';
  const resumenNombreComercial = titulo;
  const resumenResenas = val('resenas_texto') || `${formatearCalificacion(ratingResenas)} estrellas`;
  const resumenPrecio = `${gs(precio)}${descuento ? ` · -${descuento}%` : ''}`;
  const resumenOfertaEncabezado = item.urgencia_kicker || DEFAULTS_PRESENTACION.urgencia_kicker;
  const resumenOfertaNombre = val('urgencia_titulo') || 'Sin nombre';
  const resumenOfertaTexto = item.urgencia_texto || DEFAULTS_PRESENTACION.urgencia_texto;
  const resumenOfertaDuracion = `${val('urgencia_horas') || DEFAULTS_PRESENTACION.urgencia_horas}h ${val('urgencia_minutos') || DEFAULTS_PRESENTACION.urgencia_minutos}m ${val('urgencia_segundos') || DEFAULTS_PRESENTACION.urgencia_segundos}s`;
  const resumenOferta = `${resumenOfertaNombre} · ${resumenOfertaDuracion}`;
  const resumenDescripcion = fraseDestacada || descripcionFicha || 'Sin descripción';
  const resumenBeneficios = beneficios.length ? `${beneficios.length} beneficio${beneficios.length === 1 ? '' : 's'}` : 'Sin beneficios cargados';
  const resumenConfianza = confianza.length ? `${confianza.length} tarjeta${confianza.length === 1 ? '' : 's'}` : 'Sin tarjetas cargadas';
  const resumenPagos = `${metodosPago.length} método${metodosPago.length === 1 ? '' : 's'}`;
  const resumenContacto = `${1 + botonesPago.length + botonesContacto.length} botón${1 + botonesPago.length + botonesContacto.length === 1 ? '' : 'es'}`;
  const resumenIncluye = incluyePedido.length ? `${incluyePedido.length} ítem${incluyePedido.length === 1 ? '' : 's'}` : 'Sin ítems cargados';
  const resumenOpiniones = opiniones.length ? `${opiniones.length} ${opiniones.length === 1 ? 'opinión' : 'opiniones'}` : 'Sin opiniones todavía';
  const resumenPreguntas = preguntas.length ? `${preguntas.length} pregunta${preguntas.length === 1 ? '' : 's'}` : 'Sin preguntas cargadas';

  return (
    <BloquePedidoContext.Provider value={contextoBloques}>
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
        <p className="text-sm font-semibold text-fg">{cantidadSeleccionada > 1 ? `Editás las fichas públicas de ${cantidadSeleccionada} productos. Solo se copia lo que cambies.` : 'Editás solo la ficha pública de este producto.'}</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">Los bloques siguen el orden real de la ficha. Los números quedan fijos aunque ocultes una sección.</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">Para cambiar el orden, arrastrá un bloque desde <GripVertical size={12} className="inline align-[-2px]" />: los bloques 2 a 11 se ordenan dentro de la columna del producto y los 12 a 15 entre las secciones de abajo. La galería queda fija.</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">Cada campo muestra el texto que sale en la ficha. Si lo borrás, ese renglón deja de mostrarse. En la vista previa, pasá el mouse por una zona para ver a qué bloque corresponde y hacé clic para abrirlo acá.</p>
      </div>
      <ArrastreFichaContext.Provider value={controlArrastre}>
      {arrastre && (
        // Altura cero: el aviso flota sobre la lista sin correr los bloques.
        <div className="sticky top-2 z-20 h-0">
          <div
            role="status"
            className={`absolute inset-x-0 top-0 rounded-lg border px-3 py-2 text-xs font-medium bg-surface shadow-lg transition-colors ${arrastre.bloqueado ? 'border-danger text-danger' : 'border-primary/50 text-fg'}`}
          >
            {arrastre.bloqueado
              ? `«${tituloBloque(arrastre.origen)}» no puede ir junto a «${tituloBloque(arrastre.bloqueado)}»: se mueve solo ${RANGO_GRUPO_FICHA[grupoOrdenFicha(arrastre.origen)]}.`
              : `Soltá «${tituloBloque(arrastre.origen)}» ${RANGO_GRUPO_FICHA[grupoOrdenFicha(arrastre.origen)]}.`}
          </div>
        </div>
      )}
      <div ref={listaBloquesRef} className="flex flex-col gap-3" onDragOver={dentroDeLista} onDrop={controlArrastre.soltar}>
        {inicioSecciones > 0 && (
          <div style={{ order: inicioSecciones * 2 - 1 }} className="flex items-center gap-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
            <span className="h-px flex-1 bg-border" />Debajo de la ficha<span className="h-px flex-1 bg-border" />
          </div>
        )}
        <BloqueFicha numero="1" titulo="Galería del producto" resumen={resumenPortada} abierto={inicialmenteAbierto} visible={visibleBloque('galeria')} onVisible={v => cambiarBloque('galeria', v)} bloqueClave="galeria" ordenIndice={ordenVisible.indexOf('galeria')}>
          <datalist id={insigniasListId}>{INSIGNIAS_COMERCIALES.map(i => <option key={i} value={i} />)}</datalist>
          <ImagenesProductoLanding item={item} onCambiar={onCambiar} onSubirImagen={onSubirImagen} />
        </BloqueFicha>
        <BloqueFicha numero="2" titulo="Encabezado" resumen={resumenEncabezado} abierto={inicialmenteAbierto} visible={visibleBloque('encabezado')} onVisible={v => cambiarBloque('encabezado', v)} bloqueClave="encabezado" ordenIndice={ordenVisible.indexOf('encabezado')}>
          <label className="block text-xs text-fg-muted">Encabezado<input className={campo} value={encabezado} list={insigniasListId} maxLength={40} placeholder="Vacío: no se muestra" onChange={e => onCambiar('insignia_principal', e.target.value)} /></label>
        </BloqueFicha>
        <BloqueFicha numero="3" titulo="Nombre comercial" resumen={resumenNombreComercial} abierto={inicialmenteAbierto} visible={visibleBloque('nombre_comercial')} onVisible={v => cambiarBloque('nombre_comercial', v)} bloqueClave="nombre_comercial" ordenIndice={ordenVisible.indexOf('nombre_comercial')}>
          <label className="block text-xs text-fg-muted">Nombre comercial<input className={campo} value={item.titulo_comercial || ''} maxLength={100} placeholder={item.nombre} onChange={e => onCambiar('titulo_comercial', e.target.value)} /></label>
        </BloqueFicha>
        <BloqueFicha numero="4" titulo="Reseñas comerciales" resumen={resumenResenas} abierto={inicialmenteAbierto} visible={visibleBloque('resenas_comerciales')} onVisible={v => cambiarBloque('resenas_comerciales', v)} bloqueClave="resenas_comerciales" ordenIndice={ordenVisible.indexOf('resenas_comerciales')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px]">
            <CampoOcultable titulo="Texto de reseñas" campo="resenas_texto" ocultos={textosOcultos} onOcultos={v => onCambiar('textos_ocultos', v)}><input className={campo} value={val('resenas_texto')} maxLength={80} placeholder="Vacío: solo las estrellas" onChange={e => onCambiar('resenas_texto', e.target.value)} aria-label="Texto de reseñas" /></CampoOcultable>
            <label className="block text-xs text-fg-muted">Cantidad de estrellas<input className={campo} type="number" min="1" max="5" step="0.1" inputMode="decimal" value={val('resenas_calificacion', DEFAULTS_PRESENTACION.resenas_calificacion)} onChange={e => onCambiar('resenas_calificacion', e.target.value)} /></label>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <span className="font-black text-warning" aria-hidden="true">
              {[1, 2, 3, 4, 5].map(n => {
                // Misma cuenta que la ficha: cada estrella se llena hasta donde llega la calificación.
                const relleno = `${Math.max(0, Math.min(100, (ratingResenas - (n - 1)) * 100))}%`;
                // backgroundImage y no el atajo `background`: al cambiar la calificación React
                // reescribe solo lo que cambió, y el atajo borraba el recorte al texto
                // (la estrella quedaba como un rectángulo de color).
                return <span key={n} style={{ display: 'inline-block', backgroundImage: `linear-gradient(90deg, currentColor ${relleno}, rgba(148,163,184,.45) ${relleno})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>★</span>;
              })}
            </span>
            <span className="text-xs font-semibold text-fg-muted">{formatearCalificacion(ratingResenas)} de 5 estrellas</span>
          </div>
        </BloqueFicha>
        <BloqueFicha numero="5" titulo="Precio y oferta" resumen={resumenPrecio} abierto={inicialmenteAbierto} visible={visibleBloque('precio')} onVisible={v => cambiarBloques({ precio: v, badge_precio: v })} bloqueClave="precio" ordenIndice={ordenVisible.indexOf('precio')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-xs text-fg-muted">Precio anterior<CurrencyInput disabled={cantidadSeleccionada > 1} id={`ancla-${claveItem(item)}`} aria-label="Precio anterior" inputMode="numeric" value={ancla ?? ''} onChange={v => onAncla(v == null ? '' : String(v))} placeholder="Opcional" className={campo} /></label>
            <label className="block text-xs text-fg-muted">% de descuento<input disabled={cantidadSeleccionada > 1} inputMode="numeric" value={porcentaje} placeholder="Ej: 21" className={campo} onChange={e => onAncla(precioAnclaPorDescuento(precio, e.target.value))} /></label>
            <CampoOcultable titulo="Badge de precio" campo="insignia_secundaria" ocultos={textosOcultos} onOcultos={v => onCambiar('textos_ocultos', v)}><input className={campo} value={val('insignia_secundaria')} list={insigniasListId} maxLength={40} placeholder={descuento ? `-${descuento}%` : 'Oferta especial'} onChange={e => onCambiar('insignia_secundaria', e.target.value)} aria-label="Badge de precio" /></CampoOcultable>
          </div>
          {cantidadSeleccionada > 1 && <p className="mt-2 text-xs text-fg-muted">El precio anterior y su descuento se editan eligiendo un solo producto.</p>}
        </BloqueFicha>
        <BloqueFicha numero="6" titulo="Oferta por tiempo limitado" resumen={resumenOferta} abierto={inicialmenteAbierto} visible={visibleBloque('oferta')} onVisible={v => cambiarBloques({ oferta: v, urgencia: v })} bloqueClave="oferta" ordenIndice={ordenVisible.indexOf('oferta')}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-xs text-fg-muted">Encabezado de la oferta<input className={campo} value={val('urgencia_kicker')} maxLength={60} placeholder="Vacío: no se muestra" onChange={e => onCambiar('urgencia_kicker', e.target.value)} /></label>
              <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_encabezado')} onChange={e => cambiarBloque('oferta_encabezado', e.target.checked)} /> Mostrar encabezado</label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-xs text-fg-muted">Nombre de la oferta<input className={campo} value={val('urgencia_titulo')} maxLength={90} placeholder="Vacío: no se muestra" onChange={e => onCambiar('urgencia_titulo', e.target.value)} /></label>
              <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_nombre')} onChange={e => cambiarBloque('oferta_nombre', e.target.checked)} /> Mostrar nombre</label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-xs text-fg-muted">Texto de la oferta<textarea className={area} rows={2} value={val('urgencia_texto')} maxLength={180} placeholder="Vacío: no se muestra" onChange={e => onCambiar('urgencia_texto', e.target.value)} /></label>
              <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_texto')} onChange={e => cambiarBloque('oferta_texto', e.target.checked)} /> Mostrar texto</label>
            </div>
            <fieldset className="rounded-lg border border-border bg-surface px-3 py-3">
              <legend className="px-1 text-sm font-semibold text-fg">Duración del contador</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <label className="block text-xs text-fg-muted">Horas<input className={campo} type="number" min="0" max="99" value={val('urgencia_horas')} placeholder={String(DEFAULTS_PRESENTACION.urgencia_horas)} onChange={e => onCambiar('urgencia_horas', e.target.value)} /></label>
                <label className="block text-xs text-fg-muted">Minutos<input className={campo} type="number" min="0" max="59" value={val('urgencia_minutos')} placeholder={String(DEFAULTS_PRESENTACION.urgencia_minutos)} onChange={e => onCambiar('urgencia_minutos', e.target.value)} /></label>
                <label className="block text-xs text-fg-muted">Segundos<input className={campo} type="number" min="0" max="59" value={val('urgencia_segundos')} placeholder={String(DEFAULTS_PRESENTACION.urgencia_segundos)} onChange={e => onCambiar('urgencia_segundos', e.target.value)} /></label>
                <label className="flex h-9 items-center gap-2 text-xs font-semibold text-fg-muted"><input type="checkbox" checked={visibleBloque('oferta_duracion')} onChange={e => cambiarBloque('oferta_duracion', e.target.checked)} /> Mostrar contador</label>
              </div>
            </fieldset>
          </div>
        </BloqueFicha>
        <BloqueFicha numero="7" titulo="Descripción breve" resumen={resumenDescripcion} abierto={inicialmenteAbierto} visible={visibleBloque('descripcion')} onVisible={v => cambiarBloque('descripcion', v)} bloqueClave="descripcion" ordenIndice={ordenVisible.indexOf('descripcion')}>
          <CampoOcultable titulo="Frase destacada" campo="propuesta_valor" ocultos={textosOcultos} onOcultos={v => onCambiar('textos_ocultos', v)}><input className={campo} value={fraseDestacada} maxLength={220} placeholder="Vacío: no se muestra" onChange={e => onCambiar('propuesta_valor', e.target.value)} aria-label="Frase destacada" /></CampoOcultable>
          <CampoOcultable titulo="Descripción" campo="mensaje_comercial" ocultos={textosOcultos} onOcultos={v => onCambiar('textos_ocultos', v)}><textarea className={area} rows={4} value={descripcionFicha} maxLength={2000} placeholder="Vacío: no se muestra" onChange={e => onCambiar('mensaje_comercial', e.target.value)} aria-label="Descripción" /></CampoOcultable>
          <p className="text-xs leading-relaxed text-fg-muted">Arrancan con la propuesta de valor y la descripción cargadas en el producto. Lo que cambies acá vale solo para esta landing.</p>
        </BloqueFicha>
        <BloqueFicha numero="8" titulo="Beneficios principales" resumen={resumenBeneficios} visible={visibleBloque('beneficios')} onVisible={v => cambiarBloque('beneficios', v)} bloqueClave="beneficios" ordenIndice={ordenVisible.indexOf('beneficios')}>
          <ListaBeneficios items={beneficios} onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="9" titulo="Botones de contacto y pago" resumen={resumenContacto} visible={visibleBloque('contacto_pago')} onVisible={v => cambiarBloques({ contacto_pago: v, compra: v })} bloqueClave="contacto_pago" ordenIndice={ordenVisible.indexOf('contacto_pago')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px]">
            <label className="block text-xs text-fg-muted">Botón principal de compra<input className={campo} value={item.cta_texto || ''} maxLength={42} placeholder="Comprar con pago anticipado" onChange={e => onCambiar('cta_texto', e.target.value)} /></label>
            <label className={`block text-xs text-fg-muted ${sinPagopar ? 'cursor-not-allowed opacity-60' : ''}`} title={sinPagopar ? AVISO_PAGO_ANTICIPADO : undefined}>Descuento pago anticipado %<input className={`${campo} ${sinPagopar ? 'cursor-not-allowed' : ''}`} type="number" min="0" max="95" step="0.1" inputMode="decimal" disabled={sinPagopar} value={item.cta_descuento_pct ?? ''} placeholder="Ej: 10" onChange={e => onCambiar('cta_descuento_pct', e.target.value)} onBlur={e => onCambiar('cta_descuento_pct', normalizarDescuentoBoton(e.target.value))} /></label>
          </div>
          {sinPagopar && <p className="text-xs leading-relaxed text-fg-muted">{AVISO_PAGO_ANTICIPADO} Mientras tanto el botón de pago anticipado no se muestra, ni en la vista previa ni en la tienda publicada.</p>}
          <ListaBotones titulo="Botones de pago" ayuda="Botones secundarios como Pago contra entrega, Comprar por WhatsApp o un link de pago. Podés sumar un descuento por botón para incentivar el pago anticipado." items={botonesPago} campoLista="botones_pago" onCambiar={onCambiar} descuentos />
          <ListaBotones titulo="Botones configurables de contacto" ayuda="Caminos de contacto adicionales de esta ficha. WhatsApp usa el mensaje configurado en Mi tienda." items={botonesContacto} campoLista="botones_contacto" onCambiar={onCambiar} ocultarValorWhatsapp />
        </BloqueFicha>
        <BloqueFicha numero="10" titulo="Disponibilidad y medios de pago" resumen={resumenPagos} visible={visibleBloque('promociones_pago')} onVisible={v => cambiarBloque('promociones_pago', v)} bloqueClave="promociones_pago" ordenIndice={ordenVisible.indexOf('promociones_pago')}>
          <p className="text-xs leading-relaxed text-fg-muted">Esta zona aparece después de los botones: disponibilidad, cobertura y medios de pago antes de confirmar.</p>
          <MetodosPagoEditor metodos={metodosPago} onCambiar={onCambiar} pagoLogos={pagoLogos} paymentLogosCatalogo={paymentLogosCatalogo} onPagoLogosChange={onPagoLogosChange} />
        </BloqueFicha>
        <BloqueFicha numero="11" titulo="Qué incluye tu pedido" resumen={resumenIncluye} visible={visibleBloque('incluye')} onVisible={v => cambiarBloque('incluye', v)} bloqueClave="incluye" ordenIndice={ordenVisible.indexOf('incluye')}>
          <ListaSimple titulo="Ítems incluidos" ayuda="Cada línea aparece como checklist dentro de la ficha." items={incluyePedido} campoLista="incluye_pedido" placeholder="Ej: 1 unidad del producto seleccionado" onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="12" titulo="Productos recomendados" resumen={resumenRecomendados} visible={visibleBloque('recomendados') && recomendadosActivo !== false} onVisible={cambiarRecomendadosVisible} bloqueClave="recomendados" ordenIndice={ordenVisible.indexOf('recomendados')}>
          {bloqueRecomendados || <p className="text-xs leading-relaxed text-fg-muted">Configurá acá los productos que aparecen como recomendados en la ficha.</p>}
        </BloqueFicha>
        <BloqueFicha numero="13" titulo="Zona de confianza" resumen={resumenConfianza} visible={visibleBloque('confianza')} onVisible={v => cambiarBloque('confianza', v)} bloqueClave="confianza" ordenIndice={ordenVisible.indexOf('confianza')}>
          <ListaConfianzaProducto items={confianza} onCambiar={onCambiar} />
        </BloqueFicha>
        <BloqueFicha numero="14" titulo="Opiniones" resumen={resumenOpiniones} visible={visibleBloque('opiniones')} onVisible={v => cambiarBloque('opiniones', v)} bloqueClave="opiniones" ordenIndice={ordenVisible.indexOf('opiniones')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoOcultable titulo="Rótulo de sección" campo="opiniones_kicker" ocultos={textosOcultos} onOcultos={v => onCambiar('textos_ocultos', v)}><input className={campo} value={val('opiniones_kicker')} maxLength={60} placeholder="Vacío: no se muestra" onChange={e => onCambiar('opiniones_kicker', e.target.value)} aria-label="Rótulo de sección" /></CampoOcultable>
            <CampoOcultable titulo="Título de sección" campo="opiniones_titulo" ocultos={textosOcultos} onOcultos={v => onCambiar('textos_ocultos', v)}><input className={campo} value={val('opiniones_titulo')} maxLength={90} placeholder="Vacío: no se muestra" onChange={e => onCambiar('opiniones_titulo', e.target.value)} aria-label="Título de sección" /></CampoOcultable>
            <CampoOcultable titulo="Subtítulo de sección" campo="opiniones_subtitulo" ocultos={textosOcultos} onOcultos={v => onCambiar('textos_ocultos', v)} className="sm:col-span-2"><textarea className={area} rows={2} value={val('opiniones_subtitulo')} maxLength={180} placeholder="Vacío: no se muestra" onChange={e => onCambiar('opiniones_subtitulo', e.target.value)} aria-label="Subtítulo de sección" /></CampoOcultable>
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
        <BloqueFicha numero="15" titulo="Preguntas frecuentes" resumen={resumenPreguntas} visible={visibleBloque('preguntas')} onVisible={v => cambiarBloque('preguntas', v)} bloqueClave="preguntas" ordenIndice={ordenVisible.indexOf('preguntas')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoOcultable titulo="Rótulo de sección" campo="preguntas_kicker" ocultos={textosOcultos} onOcultos={v => onCambiar('textos_ocultos', v)}><input className={campo} value={val('preguntas_kicker')} maxLength={60} placeholder="Vacío: no se muestra" onChange={e => onCambiar('preguntas_kicker', e.target.value)} aria-label="Rótulo de sección" /></CampoOcultable>
            <CampoOcultable titulo="Título de sección" campo="preguntas_titulo" ocultos={textosOcultos} onOcultos={v => onCambiar('textos_ocultos', v)}><input className={campo} value={val('preguntas_titulo')} maxLength={90} placeholder="Vacío: no se muestra" onChange={e => onCambiar('preguntas_titulo', e.target.value)} aria-label="Título de sección" /></CampoOcultable>
            <CampoOcultable titulo="Subtítulo de sección" campo="preguntas_subtitulo" ocultos={textosOcultos} onOcultos={v => onCambiar('textos_ocultos', v)} className="sm:col-span-2"><textarea className={area} rows={2} value={val('preguntas_subtitulo')} maxLength={180} placeholder="Vacío: no se muestra" onChange={e => onCambiar('preguntas_subtitulo', e.target.value)} aria-label="Subtítulo de sección" /></CampoOcultable>
          </div>
          <ListaPreguntas items={preguntas} onCambiar={onCambiar} />
        </BloqueFicha>
      </div>
      </ArrastreFichaContext.Provider>
    </div>
    </BloquePedidoContext.Provider>
  );
}
