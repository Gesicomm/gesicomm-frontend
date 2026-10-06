import React, { useMemo, useState } from 'react';
import CurrencyInput from '../../components/CurrencyInput';
import { getMediaUrl } from '../../services/api';
import { claveItem, precioDeVenta } from './PrecioAnclaItem';
import ImagenesProductoLanding from './ImagenesProductoLanding';

export const INSIGNIAS_COMERCIALES = ['Sale', 'Oferta', 'Flash Deal', 'Más vendido', 'Nuevo', 'Envío gratis', 'Últimas unidades', 'Combo'];
export const ETIQUETAS_COMERCIALES = ['Oferta', 'Novedades', 'Más vendidos'];
const campo = 'mt-1 w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg';

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

function etiquetasDe(valor) {
  return String(valor || '').split(',').map(t => t.trim()).filter(Boolean);
}

function alternarEtiqueta(valor, etiqueta) {
  const actuales = etiquetasDe(valor);
  const normal = etiqueta.toLowerCase();
  const existe = actuales.some(t => t.toLowerCase() === normal);
  return existe
    ? actuales.filter(t => t.toLowerCase() !== normal).join(', ')
    : [...actuales, etiqueta].join(', ');
}

export default function PresentacionProducto({
  item,
  ancla,
  onAncla,
  onCambiar,
  destacado,
  onDestacar,
  tienda,
  onSubirImagen,
  ofertaActiva = false,
  onAlternarOferta = null,
  ofertaFinAt = '',
  onOfertaFinAt = null,
  inicialmenteAbierto = false,
}) {
  const [abierto, setAbierto] = useState(inicialmenteAbierto);
  const precio = Number(precioDeVenta(item)) || 0;
  const precioAntes = limpiarNumero(ancla);
  const descuento = descuentoDesdeAncla(precio, ancla);
  const ahorro = precioAntes > precio ? precioAntes - precio : 0;
  const src = imagenPrincipal(item);
  const titulo = item.titulo_comercial || item.nombre || 'Producto';
  const mensaje = item.mensaje_comercial || item.descripcion || 'Mostrá una razón clara para comprar ahora.';
  const insignia = item.insignia_principal || (descuento ? 'Sale' : 'Nuevo');
  const secundaria = item.insignia_secundaria || (descuento ? `-${descuento}% OFF` : 'Oferta especial');
  const cta = item.cta_texto || (item.tipo === 'combo' ? 'Quiero el combo' : 'Comprar');
  const insigniasListId = `insignias-comerciales-${claveItem(item).replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const porcentaje = useMemo(() => descuento || '', [descuento]);
  const etiquetasActuales = etiquetasDe(item.etiqueta);
  const tieneEtiqueta = etiqueta => etiquetasActuales.some(t => t.toLowerCase() === etiqueta.toLowerCase());

  function cambiarEtiquetaComercial(etiqueta) {
    const siguiente = alternarEtiqueta(item.etiqueta, etiqueta);
    onCambiar('etiqueta', siguiente);
    if (etiqueta === 'Oferta') {
      const quedaActiva = etiquetasDe(siguiente).some(t => t.toLowerCase() === 'oferta');
      if (onAlternarOferta && quedaActiva !== ofertaActiva) onAlternarOferta();
      if (quedaActiva && !item.insignia_principal) onCambiar('insignia_principal', 'Oferta');
    }
    if (etiqueta === 'Novedades' && !item.insignia_principal) onCambiar('insignia_principal', 'Nuevo');
    if (etiqueta === 'Más vendidos' && !item.insignia_principal) onCambiar('insignia_principal', 'Más vendido');
  }

  const selectorInsignia = (nombre, valor, campoDestino) => (
    <label className="block text-xs text-fg-muted">
      {nombre}
      <input
        aria-label={nombre === 'Badge principal' ? 'Insignia principal' : nombre === 'Badge de oferta' ? 'Insignia de oferta' : nombre}
        className={campo}
        value={valor}
        list={insigniasListId}
        maxLength={40}
        placeholder="Escribí cualquier badge"
        onChange={e => onCambiar(campoDestino, e.target.value)}
      />
    </label>
  );

  return (
    <details open={abierto} onToggle={e => setAbierto(e.currentTarget.open)} className="mt-3 rounded-xl border border-border bg-surface-2/30">
      <summary className="px-3 py-2 text-sm font-semibold text-primary-text cursor-pointer">Presentación comercial</summary>
      <div className="p-3 space-y-4">
        <datalist id={insigniasListId}>
          {INSIGNIAS_COMERCIALES.map(i => <option key={i} value={i} />)}
        </datalist>
        <ImagenesProductoLanding item={item} onCambiar={onCambiar} onSubirImagen={onSubirImagen} />

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-semibold text-fg">Oferta visible</legend>
          <label className="block text-xs text-fg-muted">
            Título comercial
            <input className={campo} value={item.titulo_comercial || ''} maxLength={100} placeholder={item.nombre} onChange={e => onCambiar('titulo_comercial', e.target.value)} />
          </label>
          <label className="block text-xs text-fg-muted">
            Mensaje corto
            <input className={campo} value={item.mensaje_comercial || ''} maxLength={160} placeholder="Qué hace irresistible esta oferta" onChange={e => onCambiar('mensaje_comercial', e.target.value)} />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-fg-muted">
              Precio anterior
              <CurrencyInput
                id={`ancla-${claveItem(item)}`}
                aria-label="Precio ancla"
                inputMode="numeric"
                value={ancla ?? ''}
                onChange={v => onAncla(v == null ? '' : String(v))}
                placeholder="Opcional"
                className={campo}
              />
            </label>
            <label className="block text-xs text-fg-muted">
              % de descuento
              <input
                inputMode="numeric"
                value={porcentaje}
                placeholder="Ej: 49"
                className={campo}
                onChange={e => onAncla(precioAnclaPorDescuento(precio, e.target.value))}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {selectorInsignia('Badge principal', item.insignia_principal || '', 'insignia_principal')}
            {selectorInsignia('Badge de oferta', item.insignia_secundaria || '', 'insignia_secundaria')}
          </div>

          <label className="block text-xs text-fg-muted">
            CTA
            <input className={campo} value={item.cta_texto || ''} maxLength={32} placeholder={item.tipo === 'combo' ? 'Quiero el combo' : 'Comprar'} onChange={e => onCambiar('cta_texto', e.target.value)} />
          </label>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-fg">Visibilidad</legend>
          <div className="flex flex-wrap gap-4 text-xs text-fg">
            <label><input type="checkbox" checked={item.mostrar_en_inicio !== false} onChange={e => onCambiar('mostrar_en_inicio', e.target.checked)} /> Mostrar en inicio</label>
            <label><input type="checkbox" checked={destacado} onChange={onDestacar} /> Destacar</label>
            <label><input type="checkbox" checked={item.envio_incluido === true} onChange={e => onCambiar('envio_incluido', e.target.checked)} /> Envío gratis</label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-fg">Filtros</legend>
          <p className="text-xs text-fg-muted">{item.categoria || 'Sin categoría'}{item.sku ? ` · SKU ${item.sku}` : ''}. Conserva el nombre técnico del producto.</p>
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-fg-muted">Etiquetas comerciales</p>
            <div className="flex flex-wrap gap-2">
              {ETIQUETAS_COMERCIALES.map(etiqueta => {
                const activa = tieneEtiqueta(etiqueta);
                return (
                  <button
                    key={etiqueta}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => cambiarEtiquetaComercial(etiqueta)}
                    className={`h-8 rounded-full border px-3 text-xs font-semibold transition-colors ${activa ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg-muted hover:text-fg hover:border-border-strong'}`}
                  >
                    {etiqueta}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
              Estos chips alimentan los filtros rápidos de la página de productos.
            </p>
          </div>
          <label className="mt-2 block text-xs text-fg-muted">
            Etiquetas para filtrar
            <input aria-label="Etiquetas para filtrar (separadas por coma)" className={campo} value={item.etiqueta || ''} maxLength={100} placeholder="Ej: Cocina, Ceraflame" onChange={e => onCambiar('etiqueta', e.target.value)} />
          </label>
          {onAlternarOferta && (
            <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface px-3 py-2">
              <label className="flex items-center gap-2 text-xs text-fg">
                <input type="checkbox" checked={ofertaActiva} onChange={onAlternarOferta} className="accent-primary" />
                Usar fecha fin de oferta para este producto
              </label>
              {ofertaActiva && onOfertaFinAt && (
                <label className="block text-xs text-fg-muted">
                  Fecha fin de oferta
                  <input
                    type="datetime-local"
                    aria-label="Fecha fin de oferta"
                    className={campo}
                    value={ofertaFinAt || ''}
                    onChange={e => onOfertaFinAt(e.target.value)}
                  />
                </label>
              )}
            </div>
          )}
        </fieldset>

        <div>
          <p className="text-sm font-semibold text-fg mb-2">Así se venderá en la landing</p>
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="relative flex h-44 items-center justify-center bg-slate-50">
              {src ? <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" /> : <span className="text-sm text-slate-400">Sin imagen</span>}
              {(insignia || secundaria) && (
                <span className="absolute left-3 top-3 rounded-md bg-[#a90f3d] px-2 py-1 text-[11px] font-black text-white shadow-sm">
                  {insignia || secundaria}
                </span>
              )}
            </div>
            <div className="space-y-3 p-4 text-slate-950">
              <div>
                <h3 className="text-[17px] font-black leading-tight">{titulo}</h3>
                <p className="mt-2 text-[13px] leading-5 text-slate-600">{mensaje}</p>
              </div>
              <div className="rounded-lg bg-[#a90f3d] px-3 py-3 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-2xl font-black tracking-normal">{gs(precio)}</p>
                      {precioAntes > precio && <p className="text-sm font-bold text-white/75 line-through">{gs(precioAntes)}</p>}
                    </div>
                    {ahorro > 0 && <p className="mt-1 text-sm font-bold">{descuento}% Off · Ahorrás {gs(ahorro)}</p>}
                  </div>
                  <button type="button" className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#a90f3d] shadow-sm">
                    {cta}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
                <span>Ver producto →</span>
                {item.envio_incluido === true && <span>Envío gratis</span>}
              </div>
            </div>
          </article>
        </div>
      </div>
    </details>
  );
}
