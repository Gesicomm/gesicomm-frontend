import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Layers, Loader2, Plus, ShoppingCart, Sparkles, Tag } from 'lucide-react';
import { PanelOfertas } from './ConfigurarVentaCodigo';
// Comparte los siete pasos del armador de Productos.
import ArmarComboPanel from './ArmarComboPanel';
import { ofertaService } from '../../services/ofertaService';
import { contentIdPanel } from './datosRuntime';
import PrecioAncla, { claveItem, precioDeVenta } from './PrecioAnclaItem';

/**
 * Paso 2 del wizard de IA: armar las ofertas de los productos elegidos.
 *
 * Por qué no se reusa ConfigurarVentaCodigo entero: ese panel es el del
 * editor de código, denso y pensado para alguien que ya sabe qué es un order
 * bump. Acá entra un comercio que recién empieza, así que este paso explica
 * cada tipo de oferta con el nombre que usaría él ("sumar algo antes de
 * pagar") y le muestra DÓNDE la va a ver su cliente, que es lo que nadie
 * entiende la primera vez.
 *
 * Lo que NO se reimplementa: el formulario de la oferta (precios,
 * componentes, margen, imagen) es el mismo PanelOfertas de la ficha de
 * producto. Una oferta creada desde acá es idéntica a una creada en
 * Productos, y aparece igual en las dos pantallas.
 */

const POR_ESTRATEGIA = {
  normal: { etiqueta: 'Paquete', color: 'text-primary-text', fondo: 'bg-primary/12' },
  order_bump: { etiqueta: 'Order bump', color: 'text-warning', fondo: 'bg-warning/12' },
  upsell: { etiqueta: 'Upsell', color: 'text-success', fondo: 'bg-success/12' },
};

const gs = n => `Gs ${Number(n || 0).toLocaleString('es-PY')}`;

function precioDeOferta(o) {
  const n = Number(o?.precio_order_bump ?? o?.precio_normal ?? o?.precio ?? 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function PasoOfertas({
  productosSeleccionados,
  ofertasElegidas,
  setOfertasElegidas,
  destacados,
  setDestacados,
  onVolver,
  onContinuar,
  onSaltear,
  onComboCreado,
  onOfertasCargadas,
  // Precio tachado por producto, solo para ESTA landing.
  anclas = {},
  setAnclas = () => {},
}) {
  const [ofertas, setOfertas] = useState(null);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(null);
  // { principal } — el armador de combos, aparte del panel de ofertas.
  const [combo, setCombo] = useState(null);

  const items = useMemo(() => Array.from(productosSeleccionados.values()), [productosSeleccionados]);
  const productos = useMemo(() => items.filter(i => i.tipo === 'producto'), [items]);
  const idsEnLanding = useMemo(() => new Set(productos.map(p => Number(p.id))), [productos]);

  const cargar = async () => {
    setError('');
    try {
      const lista = await ofertaService.listarTodas({ estrategias: ['normal', 'order_bump', 'upsell'] });
      const limpias = Array.isArray(lista) ? lista : [];
      setOfertas(limpias);
      onOfertasCargadas?.(limpias);
    } catch (err) {
      setError(err?.response?.data?.message || 'No pudimos traer tus ofertas. Probá de nuevo.');
      setOfertas([]);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Al cerrar el panel se recargan: si acaba de crear una, tiene que
  // aparecer sin que el comercio tenga que buscarla ni refrescar.
  const cerrarPanel = async () => {
    setPanel(null);
    await cargar();
  };

  const porProducto = useMemo(() => productos.map(producto => ({
    producto,
    ofertas: (ofertas || []).filter(o => Number(o.producto_ancla_id) === Number(producto.id)),
  })), [productos, ofertas]);

  const total = porProducto.reduce((acc, g) => acc + g.ofertas.length, 0);
  const marcadas = porProducto.reduce((acc, g) => acc + g.ofertas.filter(o => ofertasElegidas.has(Number(o.id))).length, 0);

  const alternar = id => setOfertasElegidas(prev => {
    const copia = new Set(prev);
    const n = Number(id);
    if (copia.has(n)) copia.delete(n); else copia.add(n);
    return copia;
  });

  const alternarDestacado = item => {
    const id = contentIdPanel(item);
    if (!id) return;
    setDestacados(prev => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id); else copia.add(id);
      return copia;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas text-fg">
      <header className="shrink-0 border-b border-border bg-surface px-5 py-4 md:px-7">
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">Paso 2 de 3</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold leading-tight">Potenciá tu oferta</h2>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-fg-muted ring-1 ring-border">Opcional</span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">
              Podés sumar paquetes, combos, order bumps o upsells. También podés continuar sin ofertas.
            </p>
          </div>
          <button
            type="button"
            onClick={onVolver}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-surface-2 px-3 text-sm font-semibold text-fg-muted transition hover:bg-surface-3 hover:text-fg"
          >
            Volver al resumen
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-7">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {/* Tus productos y lo que ya tienen */}
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">Tus productos</h3>
              {total > 0 && (
                <p className="text-[13px] text-fg-muted">
                  {marcadas} de {total} {total === 1 ? 'oferta marcada' : 'ofertas marcadas'} para esta landing
                </p>
              )}
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}{' '}
                <button type="button" onClick={cargar} className="font-semibold underline">Reintentar</button>
              </p>
            )}

            {ofertas === null ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-fg-muted">
                <Loader2 size={15} className="animate-spin" /> Buscando tus ofertas…
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {porProducto.map(({ producto, ofertas: suyas }) => (
                  <article key={producto.id} className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-start gap-3">
                      {producto.imagen
                        ? <img src={producto.imagen} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-border bg-white object-contain" />
                        : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-subtle"><Tag size={16} /></span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{producto.nombre}</p>
                        <p className="mt-0.5 text-[13px] text-fg-muted">{gs(precioDeVenta(producto))}</p>
                        <PrecioAncla
                          venta={precioDeVenta(producto)}
                          valor={anclas[claveItem(producto)] || ''}
                          onCambiar={v => setAnclas(prev => ({ ...prev, [claveItem(producto)]: v }))}
                        />
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCombo({ principal: producto })}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold text-fg-muted transition hover:border-border-strong hover:text-fg"
                          title={`Armar un combo con ${producto.nombre} como producto principal`}
                        >
                          <Layers size={15} /> Armar combo
                        </button>
                        <button
                          type="button"
                          onClick={() => setPanel({ producto, estrategia: null })}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover"
                        >
                          <Plus size={15} /> Sumar oferta
                        </button>
                      </div>
                    </div>

                    {suyas.length > 0 && (
                      <ul className="mt-3 space-y-2 border-t border-border pt-3">
                        {suyas.map(oferta => {
                          const meta = POR_ESTRATEGIA[oferta.estrategia] || { etiqueta: 'Oferta', color: 'text-fg-muted', fondo: 'bg-fg/10' };
                          const activa = ofertasElegidas.has(Number(oferta.id));
                          const precio = precioDeOferta(oferta);
                          return (
                            <li key={oferta.id}>
                              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                                activa ? 'border-primary/50 bg-primary/8' : 'border-border bg-surface-2 hover:border-border-strong'
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={activa}
                                  onChange={() => alternar(oferta.id)}
                                  className="mt-0.5 h-4 w-4 accent-primary"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium">{oferta.nombre}</span>
                                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${meta.fondo} ${meta.color}`}>
                                      {meta.etiqueta}
                                    </span>
                                    {precio && <span className="text-[13px] text-fg-muted">{gs(precio)}</span>}
                                  </span>
                                </span>
                                <span className={`shrink-0 text-[11.5px] font-semibold ${activa ? 'text-primary-text' : 'text-fg-subtle'}`}>
                                  {activa ? 'Se muestra' : 'Oculta'}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {suyas.length === 0 && (
                      <p className="mt-3 border-t border-border pt-3 text-[13px] text-fg-muted">
                        Todavía no tiene ofertas. Sumale una y tu cliente la va a ver al comprar.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Destacados */}
          <section>
            <h3 className="text-sm font-semibold">¿Cuál querés que sea la estrella?</h3>
            <p className="mt-1 text-[13px] text-fg-muted">
              La IA le va a dar el lugar principal en la página y le arma su propia vista de producto.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {items.map(item => {
                const id = contentIdPanel(item);
                const activo = destacados.has(id);
                return (
                  <button
                    key={`${item.tipo}:${item.id}`}
                    type="button"
                    onClick={() => alternarDestacado(item)}
                    className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-medium transition ${
                      activo
                        ? 'border-warning/60 bg-warning/12 text-warning'
                        : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg'
                    }`}
                    aria-pressed={activo}
                  >
                    {activo ? <Check size={14} /> : <Sparkles size={14} />}
                    <span className="truncate">{item.nombre}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-surface px-5 py-3.5 md:px-7">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-fg-muted">
            {marcadas > 0
              ? <><ShoppingCart size={13} className="mr-1 inline" />{marcadas} {marcadas === 1 ? 'oferta va' : 'ofertas van'} a esta landing</>
              : 'Sin ofertas marcadas — la landing se genera igual.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaltear}
              className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-fg-muted transition hover:text-fg"
            >
              Continuar sin ofertas
            </button>
            <button
              type="button"
              onClick={onContinuar}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-fg transition hover:bg-primary-hover"
            >
              Continuar a instrucciones <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </footer>

      {combo && (
        <ArmarComboPanel
          productos={productos}
          principalInicial={combo.principal}
          onCerrar={() => setCombo(null)}
          onCreado={async nuevo => {
            setCombo(null);
            if (nuevo.estado !== 'ACTIVO') return;
            // El combo recién creado entra a la landing y queda destacado:
            // si lo acabás de armar, es porque lo querés mostrar.
            await onComboCreado?.(nuevo);
            await cargar();
          }}
        />
      )}

      {panel && (
        <PanelOfertas
          producto={panel.producto}
          estrategia={panel.estrategia}
          productos={productos}
          enLanding={idsEnLanding}
          onElegir={producto => setPanel(p => ({ ...p, producto }))}
          onCambiarProducto={() => setPanel(p => ({ ...p, producto: null }))}
          onCerrar={cerrarPanel}
          onComboCreado={async nuevo => {
            setPanel(null);
            if (nuevo.estado !== 'ACTIVO') return;
            await onComboCreado?.(nuevo);
            await cargar();
          }}
        />
      )}
    </div>
  );
}
