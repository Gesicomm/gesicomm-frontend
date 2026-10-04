import React, { useMemo, useState } from 'react';
import PrecioAncla, { claveItem, precioDeVenta } from './PrecioAnclaItem';
import CodigoPreview from './CodigoPreview';
import { datosRuntimePreview } from './datosRuntime';
import ImagenesProductoLanding from './ImagenesProductoLanding';

export const INSIGNIAS_COMERCIALES = ['Oferta', 'Más vendido', 'Nuevo', 'Recomendado', 'Envío gratis', 'Últimas unidades', 'Exclusivo online', 'Combo'];
const campo = 'mt-1 w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg';
export function codigoTarjeta(codigo) {
  if (!codigo?.html?.trim()) return null;
  const doc = new DOMParser().parseFromString(codigo.html, 'text/html');
  const lista = doc.querySelector('[data-gesicomm-lista="catalogo"], [data-gesicomm-lista="productos"], [data-gesicomm-lista="solo_productos"], [data-gesicomm-lista="combos"]');
  const template = lista?.querySelector('template');
  if (!template) return null;
  const copia = lista.cloneNode(false);
  copia.setAttribute('data-gesicomm-lista', 'productos');
  copia.appendChild(template.cloneNode(true));
  const seccion = lista.closest('section')?.cloneNode(false) || doc.createElement('section');
  seccion.appendChild(copia);
  return { html: seccion.outerHTML, css: `${codigo.css || ''}\nbody{padding:12px!important}section{padding:0!important}.product-grid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:0!important}.product-image{height:160px!important;max-height:160px!important;aspect-ratio:auto!important}.product-image img{height:100%!important}.reveal{opacity:1!important;transform:none!important}`, js: '' };
}

export default function PresentacionProducto({ item, ancla, onAncla, onCambiar, destacado, onDestacar, codigo, tienda, onSubirImagen, inicialmenteAbierto = false }) {
  const [abierto, setAbierto] = useState(inicialmenteAbierto);
  const tarjeta = useMemo(() => codigoTarjeta(codigo), [codigo]);
  const datos = useMemo(() => datosRuntimePreview({ productos: [item], tienda, vista: 'inicio' }), [item, tienda]);
  const insignia = (nombre, valor) => <label className="block text-xs text-fg-muted">{nombre}
    <select aria-label={nombre} className={campo} value={INSIGNIAS_COMERCIALES.includes(valor) ? valor : valor ? 'Personalizada' : ''} onChange={e => onCambiar(nombre === 'Insignia principal' ? 'insignia_principal' : 'insignia_secundaria', e.target.value === 'Personalizada' ? 'Tu insignia' : e.target.value)}>
      <option value="">Sin insignia</option>{INSIGNIAS_COMERCIALES.map(i => <option key={i}>{i}</option>)}<option>Personalizada</option>
    </select>
    {valor && !INSIGNIAS_COMERCIALES.includes(valor) && <input aria-label={`${nombre} personalizada`} className={campo} value={valor} maxLength={40} onChange={e => onCambiar(nombre === 'Insignia principal' ? 'insignia_principal' : 'insignia_secundaria', e.target.value)} />}
  </label>;
  return <details open={abierto} onToggle={e => setAbierto(e.currentTarget.open)} className="mt-3 rounded-xl border border-border bg-surface-2/30">
    <summary className="px-3 py-2 text-sm font-semibold text-primary-text cursor-pointer">Presentación y tarjeta del producto</summary>
    <div className="p-3 space-y-4">
      <ImagenesProductoLanding item={item} onCambiar={onCambiar} onSubirImagen={onSubirImagen} />
      <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold text-fg">Datos comerciales</legend>
        <label className="block text-xs text-fg-muted">Título comercial<input className={campo} value={item.titulo_comercial || ''} maxLength={100} placeholder={item.nombre} onChange={e => onCambiar('titulo_comercial', e.target.value)} /></label>
        <label className="block text-xs text-fg-muted">Mensaje corto<input className={campo} value={item.mensaje_comercial || ''} maxLength={160} placeholder="Qué hace atractivo este producto" onChange={e => onCambiar('mensaje_comercial', e.target.value)} /></label>
        <PrecioAncla id={`ancla-${claveItem(item)}`} venta={precioDeVenta(item)} valor={ancla} onCambiar={onAncla} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{insignia('Insignia principal', item.insignia_principal || '')}{insignia('Insignia secundaria', item.insignia_secundaria || '')}</div>
        <p className="text-xs text-fg-muted">Las insignias son afirmaciones de tu tienda: usá “Oferta” con un precio ancla válido y las demás cuando correspondan a tus ventas, stock o condiciones de entrega.</p>
      </fieldset>
      <fieldset><legend className="mb-2 text-sm font-semibold text-fg">Visibilidad</legend><div className="flex flex-wrap gap-4 text-xs text-fg">
        <label><input type="checkbox" checked={item.mostrar_en_inicio !== false} onChange={e => onCambiar('mostrar_en_inicio', e.target.checked)} /> Mostrar en inicio</label>
        <label><input type="checkbox" checked={destacado} onChange={onDestacar} /> Destacar</label>
        <label><input type="checkbox" checked={item.envio_incluido === true} onChange={e => onCambiar('envio_incluido', e.target.checked)} /> Envío gratis</label>
      </div></fieldset>
      <fieldset><legend className="mb-2 text-sm font-semibold text-fg">Datos de catálogo y filtros</legend>
        <p className="text-xs text-fg-muted">{item.categoria || 'Sin categoría'}{item.sku ? ` · SKU ${item.sku}` : ''}. Conserva el nombre técnico del producto.</p>
        <label className="mt-2 block text-xs text-fg-muted">Etiquetas para filtrar (separadas por coma)<input className={campo} value={item.etiqueta || ''} maxLength={100} placeholder="Ej: Cocina, Ceraflame" onChange={e => onCambiar('etiqueta', e.target.value)} /></label>
      </fieldset>
      <div><p className="text-sm font-semibold text-fg mb-2">Así se verá tu tarjeta</p>
        {abierto && tarjeta ? <CodigoPreview codigo={tarjeta} datos={datos} titulo={`Tarjeta de ${item.nombre}`} style={{ width: '100%', height: 490, border: 0, borderRadius: 12 }} /> : !tarjeta ? <p className="text-xs text-fg-muted">Tu HTML todavía no tiene una tarjeta de catálogo. La vista previa de la landing muestra los datos donde tu diseño los utiliza.</p> : null}
      </div>
    </div>
  </details>;
}
