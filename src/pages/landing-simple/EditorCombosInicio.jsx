import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, PackagePlus, Search } from 'lucide-react';
import { contentIdPanel } from './datosRuntime';
import { normalizarCombosInicio } from './combosInicio';
import { contenidoCombo } from './comboContenido';
import { getMediaUrl } from '../../services/api';

const campo = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary';
const precio = item => `Gs ${Number(item.precio_efectivo ?? item.precio ?? item.precio_total ?? 0).toLocaleString('es-PY')}`;
const buscar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export default function EditorCombosInicio({ config, combos, onCambiar, onAdministrar, onAgregarCombo, cargando = {}, errores = {}, onReintentar }) {
  const cfg = normalizarCombosInicio(config);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const disponibles = useMemo(() => combos.map(item => {
    const combo = contenidoCombo(item);
    return { ...combo, content_id: contentIdPanel(item), productos_combo: combo.productos_combo.length ? combo.productos_combo
      : (Array.isArray(combo.productos_incluidos) ? combo.productos_incluidos : []).map(nombre => ({ nombre, cantidad: 1 })) };
  }), [combos]);
  const seleccionados = cfg.modo === 'todos' ? disponibles.filter(c => c.en_landing !== false).map(c => c.content_id) : cfg.items;
  const elegidos = new Set(seleccionados);
  const filtrados = disponibles.filter(c => buscar(`${c.nombre} ${c.productos_combo.map(p => p.nombre).join(' ')}`).includes(buscar(busqueda)));
  const paginas = Math.max(1, Math.ceil(filtrados.length / 8));
  const paginaActual = Math.min(pagina, paginas);
  const visibles = filtrados.slice((paginaActual - 1) * 8, paginaActual * 8);
  const elegidosDisponibles = seleccionados.filter(id => disponibles.some(c => c.content_id === id && c.en_landing !== false));
  const cantidadVisible = Math.min(cfg.limite, cfg.columnas * cfg.filas, elegidosDisponibles.length);
  function alternar(id) {
    const combo = disponibles.find(c => c.content_id === id);
    if (!elegidos.has(id) && combo?.en_landing === false) onAgregarCombo?.(combo);
    onCambiar({ modo: 'manual', items: elegidos.has(id) ? seleccionados.filter(v => v !== id) : [...seleccionados, id].slice(0, 48) });
  }
  function mover(id, delta) {
    const items = [...seleccionados]; const desde = items.indexOf(id); const hasta = desde + delta;
    if (hasta < 0 || hasta >= items.length) return;
    [items[desde], items[hasta]] = [items[hasta], items[desde]];
    onCambiar({ modo: 'manual', items });
  }
  const texto = (clave, titulo, max, multilinea = false) => <label className="block" key={clave}>
    <span className="mb-1 block text-xs font-medium text-fg-muted">{titulo}</span>
    {multilinea ? <textarea className={campo} rows={2} value={cfg[clave]} maxLength={max} onChange={e => onCambiar({ [clave]: e.target.value })} />
      : <input className={campo} value={cfg[clave]} maxLength={max} onChange={e => onCambiar({ [clave]: e.target.value })} />}
  </label>;
  return <div className="space-y-5" data-testid="editor-combos-inicio">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {texto('kicker', 'Rótulo de combos', 60)}{texto('titulo', 'Título de combos', 100)}
    </div>
    {texto('descripcion', 'Descripción de la sección de combos', 240, true)}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {texto('enlace_texto', 'Texto de Ver todos los combos', 60)}{texto('pie', 'Texto al pie de combos', 120)}
    </div>
    <p className="text-xs text-fg-muted">Dejá un texto vacío para ocultarlo. El enlace abre el catálogo filtrado por solo combos.</p>

    <fieldset className="space-y-3 rounded-xl border border-border bg-surface-2/40 p-3">
      <legend className="px-1 text-sm font-semibold text-fg">Distribución de las tarjetas</legend>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-fg-muted">Tarjetas por fila<select className={`${campo} mt-1`} value={cfg.columnas} onChange={e => { const columnas = Number(e.target.value); onCambiar({ columnas, limite: columnas * cfg.filas }); }}>
          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
        </select></label>
        <label className="text-xs text-fg-muted">Filas de combos<select className={`${campo} mt-1`} value={cfg.filas} onChange={e => { const filas = Number(e.target.value); onCambiar({ filas, limite: filas * cfg.columnas }); }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
        </select></label>
        <label className="text-xs text-fg-muted">Máximo de combos<input className={`${campo} mt-1`} type="number" min={1} max={Math.min(48, cfg.columnas * 8)} value={cfg.limite} onChange={e => { const limite = Math.max(1, Math.min(48, cfg.columnas * 8, Math.floor(Number(e.target.value) || 1))); onCambiar({ limite, filas: Math.ceil(limite / cfg.columnas) }); }} /></label>
      </div>
      <p className="text-xs text-fg-muted">En escritorio: hasta {cfg.columnas} tarjetas por fila y {cfg.filas} filas. En celular: una tarjeta por fila para facilitar la lectura.</p>
    </fieldset>

    <fieldset className="space-y-2 rounded-xl border border-border bg-surface-2/40 p-3">
      <legend className="px-1 text-sm font-semibold text-fg">Contenido de cada tarjeta</legend>
      <p className="text-sm text-fg-muted">Estos ajustes se aplican a todos los combos de la sección.</p>
      {[
        ['mostrar_incluidos', 'Mostrar qué incluye', 'Lista de productos y cantidades incluidos.'],
        ['mostrar_ahorro', 'Mostrar ahorro real', 'Precio anterior y ahorro calculado para el combo.'],
        ['mostrar_descripcion', 'Mostrar descripción de cada combo', 'Texto propio de cada combo, cuando está cargado.'],
      ].map(([k, nombre, ayuda]) => (
        <label key={k} className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-surface px-3 py-2.5">
          <span className="min-w-0"><strong className="block text-sm font-medium text-fg">{nombre}</strong><span className="block text-sm text-fg-muted">{ayuda}</span></span>
          <input type="checkbox" aria-label={nombre} checked={cfg[k] !== false} onChange={e => onCambiar({ [k]: e.target.checked })} className="h-5 w-5 shrink-0 accent-primary" />
        </label>
      ))}
      <p className="text-sm text-fg-muted">Las tarjetas usan la imagen que cargaste al crear el combo. Si cargaste varias, se muestra la principal. Solo cuando no tiene foto se muestran imágenes de los productos incluidos. Podés cambiar la portada en Administrar combos.</p>
    </fieldset>

    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-fg">Elegí los combos de esta sección</h4><button type="button" className="text-xs font-medium text-primary-text hover:underline" onClick={onAdministrar}>Administrar combos</button></div>
      <label className="block text-xs text-fg-muted">Combos que se muestran<select className={`${campo} mt-1`} value={cfg.modo} onChange={e => onCambiar({ modo: e.target.value, items: e.target.value === 'manual' ? seleccionados : cfg.items })}>
        <option value="todos">Todos los combos disponibles en la landing</option><option value="manual">Solo los combos que selecciono</option>
      </select></label>
      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-fg-muted"><Check size={15} className="mt-0.5 shrink-0" /><span><strong className="text-fg">{disponibles.length} disponibles · {elegidosDisponibles.length} seleccionados</strong><br />Se mostrarán {cantidadVisible} combos en el inicio. Elegí y ordená los que querés destacar.</span></div>
      <label className="relative block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" /><input type="search" aria-label="Buscar combos" placeholder="Buscar por combo o producto incluido" className={`${campo} pl-9`} value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} /></label>
      <div className="flex gap-3 text-xs"><button type="button" className="text-primary-text hover:underline" onClick={() => {
        const candidatos = filtrados.filter(c => c.puede_incluir !== false).slice(0, 48);
        const items = [...new Set([...seleccionados, ...candidatos.map(c => c.content_id)])].slice(0, 48);
        candidatos.filter(c => c.en_landing === false && items.includes(c.content_id)).forEach(c => onAgregarCombo?.(c));
        onCambiar({ modo: 'manual', items });
      }}>Seleccionar resultados</button><button type="button" className="text-fg-muted hover:underline" onClick={() => onCambiar({ modo: 'manual', items: [] })}>Quitar selección</button></div>
      {!visibles.length && <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-fg-muted"><PackagePlus size={22} className="mx-auto mb-2" />{disponibles.length ? 'No hay combos que coincidan con la búsqueda.' : 'Esta landing todavía no tiene combos disponibles. Agregalos desde Administrar combos.'}</div>}
      <div className="space-y-2">{visibles.map(c => {
        const id = c.content_id; const marcado = elegidos.has(id); const pos = seleccionados.indexOf(id);
        const componentes = c.productos_combo; const src = getMediaUrl(c.imagen || componentes[0]?.imagen);
        return <div key={id} className={`rounded-xl border p-3 ${marcado ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}>
          <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={marcado} disabled={!marcado && c.puede_incluir === false} aria-label={`Mostrar combo ${c.nombre}`} onChange={() => alternar(id)} className="mt-2 accent-primary" />
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">{src ? <img src={src} alt="" className="h-full w-full object-contain" /> : <PackagePlus size={22} className="text-fg-muted" />}</span>
            <span className="min-w-0 flex-1"><strong className="block text-sm text-fg">{c.nombre}</strong><span className="mt-1 block text-xs text-fg-muted">{componentes.length ? componentes.map(p => `${p.cantidad > 1 ? p.cantidad + ' × ' : ''}${p.nombre}`).join(' · ') : cargando[`combo:${c.id}`] ? 'Cargando productos incluidos…' : 'Sin detalle de productos cargado'}</span><span className="mt-1 block text-xs font-semibold text-fg">{precio(c)}</span></span>
          </label>
          {c.en_landing === false && <p className="mt-2 text-xs text-fg-muted">{c.puede_incluir === false ? 'Este combo queda fuera de las categorías de venta elegidas. Incluí su categoría para poder mostrarlo.' : 'Al seleccionarlo también se agrega a los productos de esta landing.'}</p>}
          {errores[`combo:${c.id}`] && <p className="mt-2 text-xs text-fg-muted">No se pudo cargar el detalle. <button type="button" className="text-primary-text underline" onClick={() => onReintentar?.(c)}>Reintentar</button></p>}
          {marcado && <div className="mt-2 flex items-center justify-end gap-1"><span className="mr-2 text-xs text-fg-muted">Posición {pos + 1}</span><button type="button" aria-label={`Subir ${c.nombre}`} disabled={pos <= 0} onClick={() => mover(id, -1)} className="rounded border border-border p-1 disabled:opacity-30"><ArrowUp size={14} /></button><button type="button" aria-label={`Bajar ${c.nombre}`} disabled={pos >= seleccionados.length - 1} onClick={() => mover(id, 1)} className="rounded border border-border p-1 disabled:opacity-30"><ArrowDown size={14} /></button></div>}
        </div>;
      })}</div>
      {paginas > 1 && <div className="flex items-center justify-between text-xs text-fg-muted"><button type="button" disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)}>Anterior</button><span>Página {paginaActual} de {paginas}</span><button type="button" disabled={paginaActual === paginas} onClick={() => setPagina(paginaActual + 1)}>Siguiente</button></div>}
      {cfg.modo === 'manual' && !elegidosDisponibles.length && <p role="status" className="text-xs text-fg-muted">Seleccioná al menos un combo para que aparezca esta sección en la tienda.</p>}
    </div>
  </div>;
}
