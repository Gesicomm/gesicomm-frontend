import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader, Plus, X, AlertTriangle, TrendingUp, Layers } from 'lucide-react';
import { comboAdminService } from '../../services/comboAdminService';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';
import SelectorProducto from './SelectorProducto';

/**
 * Armar un combo sin salir de "Configurar venta" (antes se abría Mis combos
 * en otra pestaña y se perdía el hilo).
 *
 * Todo en una pantalla, en el orden en que se piensa: qué se vende, qué se
 * suma y con cuánto descuento, a qué precio queda y cuánto se gana. A la
 * derecha, en vivo, cómo lo ve el cliente. La cuenta la hace el mismo motor
 * que Mis combos (POST /combos/simular): costos, precio mínimo y descuento
 * máximo salen del servidor, nunca de acá.
 *
 * Lo que dicen los datos de bundles (Shopify, Amazon "Comprados juntos"):
 * 2–3 productos que se usan juntos, ahorro visible en guaraníes y en %, y
 * el precio anterior tachado al lado. Por eso: descuento por producto
 * sumado, ahorro destacado y aviso si se agregan demasiados.
 *
 * Al guardar: se crea, se activa y se suma a la landing (onCreado).
 */

const DESCUENTO_INICIAL = 10;
const MAX_RECOMENDADO = 3; // productos en total, principal incluido

function gs(n) {
  const num = Math.round(Number(n) || 0);
  return `Gs ${num.toLocaleString('es-PY')}`;
}

const precioDe = item => Number(item?.precio_efectivo ?? item?.precio_usuario ?? item?.precio_base ?? item?.precio ?? 0) || 0;

function Foto({ item, tam = 'w-10 h-10' }) {
  const src = item?.imagen ? getMediaUrl(item.imagen) : null;
  return src
    ? <img src={src} alt="" className={`${tam} rounded-lg object-cover bg-surface-2 shrink-0`} loading="lazy" />
    : <span className={`${tam} rounded-lg bg-surface-2 shrink-0`} />;
}

export default function ArmarComboPanel({ productos, principalInicial = null, onCerrar, onCreado }) {
  const [principalId, setPrincipalId] = useState(principalInicial ? Number(principalInicial.id) : null);
  const [sumados, setSumados] = useState([]); // [{ id, descuento }]
  // Buscador abierto: 'principal' | 'sumar' | null. Arranca en el principal si todavía no hay.
  const [buscando, setBuscando] = useState(principalInicial ? null : 'principal');
  const [nombre, setNombre] = useState('');
  const [nombreTocado, setNombreTocado] = useState(false);
  const [precio, setPrecio] = useState('');
  const [precioTocado, setPrecioTocado] = useState(false);
  const [sim, setSim] = useState(null);
  const [simulando, setSimulando] = useState(false);
  const [errorSim, setErrorSim] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const pedido = useRef(0);

  const porId = useMemo(() => new Map(productos.map(p => [Number(p.id), p])), [productos]);
  const principal = principalId ? porId.get(principalId) : null;
  const itemsSumados = sumados.map(s => ({ ...s, producto: porId.get(s.id) })).filter(s => s.producto);

  useEffect(() => {
    const alTeclear = e => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  // Nombre sugerido mientras no lo toquen: "AdelFit + Articumina".
  useEffect(() => {
    if (nombreTocado) return;
    const corto = p => String(p?.nombre || '').split(/\s[-–—]\s/)[0].trim();
    setNombre([principal, ...itemsSumados.map(s => s.producto)].filter(Boolean).map(corto).join(' + '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principalId, sumados, nombreTocado]);

  // Simulación en vivo con el motor del servidor.
  useEffect(() => {
    if (!principalId) { setSim(null); return undefined; }
    const id = ++pedido.current;
    setSimulando(true);
    const t = setTimeout(() => {
      comboAdminService.simular({
        principalProductId: principalId,
        upsells: sumados.map(s => ({ productId: s.id, discountPercentage: s.descuento })),
      })
        .then(r => { if (id === pedido.current) { setSim(r); setErrorSim(''); } })
        .catch(err => { if (id === pedido.current) { setSim(null); setErrorSim(err?.response?.data?.message || 'No se pudo calcular el combo.'); } })
        .finally(() => { if (id === pedido.current) setSimulando(false); });
    }, 350);
    return () => clearTimeout(t);
  }, [principalId, sumados]);

  // El precio sigue al "precio con descuentos" hasta que lo editen a mano.
  useEffect(() => {
    if (!precioTocado && sim?.combo?.finalPrice) setPrecio(Math.round(sim.combo.finalPrice));
  }, [sim, precioTocado]);

  // Cuentas con el precio que se va a publicar (puede no ser el sugerido).
  const precioNum = Number(precio) || 0;
  const original = sim?.combo?.originalPrice || (precioDe(principal) + itemsSumados.reduce((a, s) => a + precioDe(s.producto), 0));
  const costo = sim?.combo?.totalCost || 0;
  const ahorro = Math.max(0, original - precioNum);
  const ahorroPct = original > 0 ? Math.round((ahorro / original) * 100) : 0;
  const ganancia = precioNum - costo;
  const margen = precioNum > 0 ? Math.round((ganancia / precioNum) * 100) : 0;
  const minimo = sim?.minimumPrice || 0;
  const debajoMinimo = precioNum > 0 && minimo > 0 && precioNum < minimo;
  const totalProductos = 1 + itemsSumados.length;

  function sumar(p) {
    setSumados(prev => [...prev, { id: Number(p.id), descuento: DESCUENTO_INICIAL }]);
    setBuscando(null);
  }

  function elegirPrincipal(p) {
    setPrincipalId(Number(p.id));
    setSumados(prev => prev.filter(x => x.id !== Number(p.id)));
    // Con el principal elegido, lo natural es sumar el primero.
    setBuscando(sumados.length ? null : 'sumar');
  }

  async function guardar() {
    setError('');
    if (!principal) return setError('Elegí el producto principal.');
    if (!itemsSumados.length) return setError('Sumá al menos un producto: un combo son dos o más.');
    if (!nombre.trim()) return setError('Poné un nombre al combo.');
    if (!(precioNum > 0)) return setError('El combo necesita un precio.');
    if (debajoMinimo) return setError(`El precio queda debajo del mínimo rentable (${gs(minimo)}). Subilo o bajá los descuentos.`);
    setGuardando(true);
    try {
      const combo = await comboAdminService.crear({
        nombre: nombre.trim(),
        descripcion: null,
        precio_total: precioNum,
        precio_minimo: null,
        principalProductId: principal.id,
        upsells: itemsSumados.map(s => ({ productId: s.id, discountPercentage: s.descuento })),
        ficha_rubro: 'combo',
        ficha_datos: {},
      });
      await comboAdminService.cambiarEstado(combo.id, 'ACTIVO');
      await onCreado?.(combo);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear el combo. Probá de nuevo.');
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Armar combo">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-black/40 cursor-default" />
      <div className="relative w-full max-w-5xl h-full bg-canvas border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 md:px-6 h-16 border-b border-border bg-surface shrink-0">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-fg truncate">Armar combo</p>
            <p className="text-xs text-fg-muted truncate">Varios productos juntos, a un precio que conviene más que comprarlos por separado</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 p-5 md:p-6">
            {/* ── Armado ─────────────────────────────────────────────── */}
            <div className="space-y-6 min-w-0">
              <section>
                <h3 className="text-sm font-semibold text-fg">¿Qué producto se vende?</h3>
                <p className="text-xs text-fg-muted mt-0.5">El principal: el que el cliente vino a buscar. Va a precio normal.</p>
                <div className="mt-2">
                  {principal && buscando !== 'principal' ? (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
                      <Foto item={principal} tam="w-12 h-12" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-fg leading-snug">{principal.nombre}</span>
                        <span className="block text-xs text-fg-muted">{[principal.categoria, principal.proveedor].filter(Boolean).join(', ') || 'Sin categoría'}</span>
                      </span>
                      <span className="font-mono text-xs text-fg tabular-nums">{gs(precioDe(principal))}</span>
                      <button type="button" onClick={() => setBuscando('principal')} className="shrink-0 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-fg hover:border-border-strong">
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <SelectorProducto
                      productos={productos}
                      excluir={principal ? [principal.id] : []}
                      onElegir={elegirPrincipal}
                      onCerrar={principal ? () => setBuscando(null) : null}
                      etiqueta="Buscar el producto principal"
                    />
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-fg">¿Qué se suma y con cuánto descuento?</h3>
                <p className="text-xs text-fg-muted mt-0.5">Productos que se usan junto al principal. El descuento es lo que baja cada uno dentro del combo.</p>

                {itemsSumados.length > 0 && (
                  <ul className="mt-3 rounded-xl border border-border divide-y divide-border bg-surface">
                    {itemsSumados.map(s => {
                      const r = sim?.upsells?.find(u => Number(u.productId) === s.id);
                      const base = r?.originalPrice ?? precioDe(s.producto);
                      const final = r?.finalPrice ?? base * (1 - s.descuento / 100);
                      return (
                        <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                          <Foto item={s.producto} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-fg truncate">{s.producto.nombre}</span>
                            <span className="block text-xs text-fg-muted">
                              <s>{gs(base)}</s> → <b className="text-fg">{gs(final)}</b>
                            </span>
                          </span>
                          <label className="flex items-center gap-2 text-xs text-fg-muted">
                            <input
                              type="range" min="0" max="50" step="5" value={s.descuento}
                              onChange={e => setSumados(prev => prev.map(x => (x.id === s.id ? { ...x, descuento: Number(e.target.value) } : x)))}
                              aria-label={`Descuento de ${s.producto.nombre}`}
                              className="w-24 accent-primary"
                            />
                            <span className="w-10 text-right font-mono text-fg tabular-nums">-{s.descuento}%</span>
                          </label>
                          <button type="button" onClick={() => setSumados(prev => prev.filter(x => x.id !== s.id))} aria-label={`Quitar ${s.producto.nombre}`} className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2">
                            <X size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {totalProductos > MAX_RECOMENDADO && (
                  <p className="mt-2 text-[11px] text-warning">
                    {totalProductos} productos: los combos que más se venden son de 2 o 3 que se usan juntos. Más opciones hacen dudar.
                  </p>
                )}

                <div className="mt-3">
                  {!principal ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-fg-muted">Elegí primero el producto principal.</p>
                  ) : buscando === 'sumar' ? (
                    <SelectorProducto
                      productos={productos}
                      excluir={[principal.id, ...sumados.map(x => x.id)]}
                      referencia={principal}
                      onElegir={sumar}
                      onCerrar={itemsSumados.length ? () => setBuscando(null) : null}
                      etiqueta="Buscar un producto para sumar"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBuscando('sumar')}
                      className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-dashed border-border-strong text-sm font-medium text-fg hover:bg-surface-2"
                    >
                      <Plus size={15} /> {itemsSumados.length ? 'Sumar otro producto' : 'Sumar un producto'}
                    </button>
                  )}
                </div>
              </section>

              <section className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-semibold text-fg">Precio del combo</span>
                  <span className="block text-xs text-fg-muted mt-0.5">
                    {precioTocado ? 'Precio elegido a mano.' : 'Sale de los descuentos. Podés cambiarlo.'}
                  </span>
                  <CurrencyInput
                    value={precio}
                    // CurrencyInput también avisa cuando el valor cambia desde acá
                    // (precio sugerido): eso no cuenta como "editado a mano".
                    onChange={v => {
                      if (Number(v || 0) === Number(precio || 0)) return;
                      setPrecio(v);
                      setPrecioTocado(true);
                    }}
                    className="mt-2 w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
                  />
                  {precioTocado && sim?.combo?.finalPrice > 0 && (
                    <button type="button" onClick={() => { setPrecioTocado(false); setPrecio(Math.round(sim.combo.finalPrice)); }} className="mt-1 text-xs font-medium text-primary-text hover:underline">
                      Volver al precio con descuentos ({gs(sim.combo.finalPrice)})
                    </button>
                  )}
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold text-fg">Nombre</span>
                  <span className="block text-xs text-fg-muted mt-0.5">Lo ve el cliente en la tarjeta y en la ficha.</span>
                  <input
                    value={nombre}
                    onChange={e => { setNombre(e.target.value); setNombreTocado(true); }}
                    placeholder="Ej.: Kit AdelFit + Articumina"
                    className="mt-2 w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
                  />
                </label>
              </section>
            </div>

            {/* ── En vivo ────────────────────────────────────────────── */}
            <aside className="space-y-4 lg:sticky lg:top-0 self-start">
              <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                <p className="px-4 pt-3 text-xs font-semibold text-fg-muted">Así lo ve tu cliente</p>
                <div className="px-4 pb-4 pt-2">
                  <div className="flex -space-x-3">
                    {[principal, ...itemsSumados.map(s => s.producto)].filter(Boolean).slice(0, 4).map(p => (
                      <span key={p.id} className="rounded-xl ring-2 ring-surface"><Foto item={p} tam="w-16 h-16" /></span>
                    ))}
                    {!principal && <span className="w-16 h-16 rounded-xl bg-surface-2 grid place-items-center text-fg-muted"><Layers size={18} /></span>}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-fg leading-snug">{nombre || 'Tu combo'}</p>
                  <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg font-bold text-fg tabular-nums">{precioNum ? gs(precioNum) : '—'}</span>
                    {ahorro > 0 && <s className="text-xs text-fg-muted tabular-nums">{gs(original)}</s>}
                  </div>
                  {ahorro > 0 && (
                    <p className="mt-1 inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                      Ahorrás {gs(ahorro)} (-{ahorroPct}%)
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
                  <TrendingUp size={13} /> Lo que ganás {simulando && <Loader size={12} className="animate-spin" />}
                </p>
                {errorSim ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-danger"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {errorSim}</p>
                ) : !sim ? (
                  <p className="mt-2 text-xs text-fg-muted">Elegí el principal y sumá productos para ver la cuenta.</p>
                ) : (
                  <dl className="mt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-fg-muted">Costo de los productos</dt><dd className="tabular-nums">{gs(costo)}</dd></div>
                    <div className="flex justify-between"><dt className="text-fg-muted">Ganancia por combo</dt><dd className={`font-semibold tabular-nums ${ganancia > 0 ? 'text-success' : 'text-danger'}`}>{gs(ganancia)}</dd></div>
                    <div className="flex justify-between"><dt className="text-fg-muted">Margen</dt><dd className="tabular-nums">{margen}%</dd></div>
                    {minimo > 0 && <div className="flex justify-between"><dt className="text-fg-muted">Precio mínimo rentable</dt><dd className="tabular-nums">{gs(minimo)}</dd></div>}
                    {sim.maximumDiscountPercentage > 0 && (
                      <p className="pt-1 text-xs text-fg-muted">Podés bajar hasta <b className="text-fg">{Math.floor(sim.maximumDiscountPercentage)}%</b> del total sin perder tu margen mínimo.</p>
                    )}
                    {debajoMinimo && <p className="text-xs text-danger">Con este precio perdés margen: subilo a {gs(minimo)} o más.</p>}
                    {(sim.warnings || []).map(w => <p key={w} className="text-xs text-warning">{w}</p>)}
                  </dl>
                )}
              </div>
            </aside>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-surface px-5 md:px-6 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-fg-muted min-w-0">
            {error ? <span className="text-danger">{error}</span> : 'Se guarda activo y se suma a esta landing con su propia ficha. Las fotos y la ficha se editan después en Mis combos.'}
          </p>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={onCerrar} className="h-10 px-4 rounded-lg text-sm font-medium text-fg-muted hover:text-fg hover:bg-surface-2">Cancelar</button>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-fg text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
            >
              {guardando ? <Loader size={15} className="animate-spin" /> : <Check size={15} />} Crear combo y sumarlo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
