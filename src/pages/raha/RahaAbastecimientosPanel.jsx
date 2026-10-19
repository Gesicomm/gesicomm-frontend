import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { rahaPortalApi as api } from '../../services/rahaPortalApi';
import { ESTADOS_RAHA, estadoRaha, formatFecha, formatGs } from '../../components/abastecimiento/rahaSeguimiento';
import { useDebounce } from '../../hooks/useDebounce';
import { botonOperacion, controlOperacion, PaginacionOperacion, ResultadoConsulta, useConsultaOperacion } from './operacionesUI';

export default function RahaAbastecimientosPanel() {
  const [texto, setTexto] = useState('');
  const busqueda = useDebounce(texto, 300);
  const [estado, setEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [seleccionado, setSeleccionado] = useState(null);
  const lista = useConsultaOperacion(useCallback(() => api.abastecimientos({ texto: busqueda, estado, desde, hasta, page, limit }), [busqueda, estado, desde, hasta, page, limit]));
  const detalle = useConsultaOperacion(useCallback(() => seleccionado ? api.abastecimiento(seleccionado) : Promise.resolve(null), [seleccionado]));
  const pedido = detalle.data;
  useEffect(() => {
    if (lista.data && page > lista.data.totalPaginas) setPage(Math.max(1, lista.data.totalPaginas));
  }, [lista.data, page]);

  return <div className="min-w-0 space-y-5 text-fg">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0 text-xl font-bold">Abastecimientos de los comercios</h2><p className="mb-0 mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted">Productos del catálogo RAHA solicitados por los comercios para sus depósitos. Los pedidos vinculados a la integración se consultan aquí con sus estados logísticos.</p></div><button type="button" disabled={lista.loading} onClick={() => { lista.reintentar(); if (seleccionado) detalle.reintentar(); }} className={botonOperacion}><RefreshCw size={15} /> Actualizar</button></div>
    <section aria-label="Filtros de abastecimientos RAHA" className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold text-fg-muted">Buscar abastecimiento<input value={texto} onChange={event => { setTexto(event.target.value); setPage(1); }} placeholder="Producto, SKU, comercio o pedido RAHA" className={`${controlOperacion} mt-1.5`} /></label>
      <label className="text-xs font-semibold text-fg-muted">Estado RAHA<select value={estado} onChange={event => { setEstado(event.target.value); setPage(1); }} className={`${controlOperacion} mt-1.5`}><option value="">Todos los estados</option>{Object.entries(ESTADOS_RAHA).map(([valor, configuracion]) => <option key={valor} value={valor}>{configuracion.label}</option>)}</select></label>
      <label className="text-xs font-semibold text-fg-muted">Desde<input type="date" max={hasta || undefined} value={desde} onChange={event => { setDesde(event.target.value); setPage(1); }} className={`${controlOperacion} mt-1.5`} /></label>
      <label className="text-xs font-semibold text-fg-muted">Hasta<input type="date" min={desde || undefined} value={hasta} onChange={event => { setHasta(event.target.value); setPage(1); }} className={`${controlOperacion} mt-1.5`} /></label>
      {(texto || estado || desde || hasta) && <button type="button" className={`${botonOperacion} justify-self-start`} onClick={() => { setTexto(''); setEstado(''); setDesde(''); setHasta(''); setPage(1); }}>Limpiar filtros</button>}
    </section>
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface" aria-label="Listado de abastecimientos RAHA">
      <ResultadoConsulta consulta={lista} vacio={!lista.data?.registros.length}><div className="relative overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-surface-2 text-xs text-fg-muted"><tr>{['Pedido / fecha', 'Comercio', 'Producto', 'Cantidad / precio', 'Destino', 'Total', 'Estado RAHA'].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{lista.data?.registros.map(registro => {
        const estadoActual = estadoRaha(registro.estado_seguimiento);
        return <tr key={registro.id} className="align-top hover:bg-surface-2/50"><td className="px-4 py-4"><button type="button" onClick={() => setSeleccionado(registro.id)} className="font-bold text-primary-text hover:underline" aria-label={`Ver abastecimiento ${registro.id}`}>#{registro.id}</button><span className="mt-1 block text-xs text-fg-muted">{formatFecha(registro.created_at)}</span><span className="mt-1 block max-w-40 break-all text-xs text-fg-muted">RAHA {registro.pedidoRaha?.order_id || 'Pendiente de envío'}</span></td><td className="px-4 py-4"><span className="font-semibold">{registro.depositoDestino?.tienda?.nombre || registro.Usuario?.nombre}</span><span className="mt-1 block text-xs text-fg-muted">{registro.Usuario?.nombre}</span></td><td className="max-w-64 px-4 py-4"><span className="font-semibold">{registro.producto?.nombre}</span><span className="mt-1 block text-xs text-fg-muted">{registro.variante?.nombre}</span><span className="mt-1 block font-mono text-xs text-fg-muted">{registro.variante?.sku_variante || registro.producto?.sku}</span></td><td className="whitespace-nowrap px-4 py-4"><strong>{registro.cantidad} u.</strong><span className="mt-1 block text-xs text-fg-muted">{formatGs(registro.precio_unitario)} / u.</span></td><td className="max-w-48 px-4 py-4"><span className="font-medium">{registro.depositoDestino?.nombre}</span><span className="mt-1 block text-xs text-fg-muted">{registro.depositoDestino?.ciudad}</span></td><td className="whitespace-nowrap px-4 py-4 font-semibold">{formatGs(Number(registro.costo_producto || 0) + Number(registro.costo_logistico || 0))}<span className="mt-1 block text-xs font-normal text-fg-muted">Contra entrega</span></td><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoActual.color}`}>{estadoActual.label}</span></td></tr>;
      })}</tbody></table></div></ResultadoConsulta>
      <PaginacionOperacion data={lista.data} page={page} limit={limit} cambiarPagina={setPage} cambiarLimite={valor => { setLimit(valor); setPage(1); }} loading={lista.loading} />
    </section>
    {seleccionado && <section aria-label="Detalle del abastecimiento" className="rounded-xl border border-primary/30 bg-surface p-4 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><h3 className="m-0 text-lg font-bold">Abastecimiento #{seleccionado}</h3><button type="button" aria-label="Cerrar detalle del abastecimiento" onClick={() => setSeleccionado(null)} className={botonOperacion}><X size={16} /></button></div><ResultadoConsulta consulta={detalle}>{pedido && <div className="grid gap-5 lg:grid-cols-2"><div><h4 className="mb-2 mt-0 font-semibold">{pedido.producto?.nombre}</h4><p className="text-sm text-fg-muted">{pedido.variante?.nombre} · {pedido.cantidad} unidades · {formatGs(pedido.precio_unitario)} / u.</p><h4 className="mb-2 mt-5 text-sm font-bold">Destino del comercio</h4><p className="mb-1 text-sm">{pedido.depositoDestino?.nombre}</p><p className="my-1 text-sm text-fg-muted">{pedido.depositoDestino?.direccion} · {pedido.depositoDestino?.ciudad}</p><p className="my-1 text-sm text-fg-muted">{pedido.depositoDestino?.persona_contacto} {pedido.depositoDestino?.telefono_contacto}</p><p className="mb-0 mt-5 rounded-lg bg-surface-2 p-3 text-xs text-fg-muted">El estado de este pedido se actualiza desde la integración logística de RAHA.</p></div><div><h4 className="mb-3 mt-0 text-sm font-bold">Historial logístico</h4><ol className="m-0 list-none space-y-3 border-l border-border pl-4">{pedido.historial_raha?.map(evento => <li key={evento.id}><p className="m-0 text-sm font-semibold">{estadoRaha(evento.estado).label}</p><time className="mt-1 block text-xs text-fg-muted">{formatFecha(evento.created_at, true)}</time></li>)}</ol>{!pedido.historial_raha?.length && <p className="text-sm text-fg-muted">Todavía no se recibieron eventos logísticos de RAHA.</p>}</div></div>}</ResultadoConsulta></section>}
  </div>;
}
