import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, FilterX, Package, RefreshCw, Search, Truck, Warehouse } from 'lucide-react';
import { solicitudAbastecimientoService } from '../../services/solicitudAbastecimiento.service';
import { depositoService } from '../../services/deposito.service';
import { useDebounce } from '../../hooks/useDebounce';
import { ESTADOS_RAHA, estadoRaha, formatFecha, formatGs } from '../../components/abastecimiento/rahaSeguimiento';

const control = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
const boton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40';

export default function MisAbastecimientos() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ solicitudes: [], total: 0, total_paginas: 1 });
  const [depositos, setDepositos] = useState([]);
  const [errorDepositos, setErrorDepositos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actualizacion, setActualizacion] = useState(0);
  const texto = params.get('texto') || '';
  const textoDebounced = useDebounce(texto, 350);
  const pagina = Math.max(1, parseInt(params.get('page'), 10) || 1);
  const limit = [10, 20, 50, 100].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 20;
  const estado = params.get('estado') || '';
  const depositoId = params.get('depositoId') || '';
  const desde = params.get('desde') || '';
  const hasta = params.get('hasta') || '';
  const ordenar = params.get('ordenar') || 'recientes';
  const volverA = `/mis-abastecimientos${params.size ? `?${params.toString()}` : ''}`;

  function cambiar(clave, valor) {
    setParams(prev => {
      const siguiente = new URLSearchParams(prev);
      if (valor) siguiente.set(clave, String(valor));
      else siguiente.delete(clave);
      if (clave !== 'page') siguiente.delete('page');
      return siguiente;
    }, { replace: true });
  }

  useEffect(() => {
    let activo = true;
    async function cargarDepositos() {
      try {
        const lista = [];
        let page = 1;
        let totalPages = 1;
        do {
          const respuesta = await depositoService.listarDepositos({ page, limit: 100 });
          lista.push(...(respuesta.data || []));
          totalPages = respuesta.totalPages || 1;
          page += 1;
        } while (activo && page <= totalPages);
        if (activo) { setDepositos(lista); setErrorDepositos(false); }
      } catch {
        if (activo) setErrorDepositos(true);
      }
    }
    cargarDepositos();
    return () => { activo = false; };
  }, [actualizacion]);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    if (texto !== textoDebounced) return () => { activo = false; };
    setError('');
    solicitudAbastecimientoService.listar({ vista: 'raha', texto: textoDebounced || undefined,
      estado: estado || undefined, depositoId: depositoId || undefined,
      desde: desde || undefined, hasta: hasta || undefined, ordenar, page: pagina, limit })
      .then(respuesta => {
        if (!activo) return;
        const paginas = Math.max(1, respuesta.total_paginas || 1);
        if (pagina > paginas) {
          setParams(prev => { const siguiente = new URLSearchParams(prev); siguiente.set('page', String(paginas)); return siguiente; }, { replace: true });
          return;
        }
        setData(respuesta);
      })
      .catch(err => { if (activo) setError(err.response?.data?.error || 'No pudimos cargar tus abastecimientos. Intentá nuevamente.'); })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, [texto, textoDebounced, estado, depositoId, desde, hasta, ordenar, pagina, limit, actualizacion, setParams]);

  const solicitudes = data.solicitudes || [];
  const tieneFiltros = Boolean(texto || estado || depositoId || desde || hasta);
  const paginas = Math.max(1, data.total_paginas || 1);
  const metricas = [
    { label: 'Abastecimientos encontrados', valor: data.total || 0, icono: Package },
    { label: 'Unidades en esta página', valor: solicitudes.reduce((suma, solicitud) => suma + Number(solicitud.cantidad), 0), icono: Truck },
    { label: 'Importe en esta página', valor: formatGs(solicitudes.reduce((suma, solicitud) => suma + Number(solicitud.costo_producto || 0) + Number(solicitud.costo_logistico || 0), 0)), icono: Warehouse },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] p-4 text-fg sm:p-6 lg:p-8">
      <Link to="/mi-tienda/depositos" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft size={16} /> Mis depósitos</Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary-text">Mis depósitos / Abastecimientos</span>
          <h1 className="mb-2 mt-2 text-2xl font-bold sm:text-3xl">Abastecimientos RAHA</h1>
          <p className="m-0 max-w-2xl text-sm leading-relaxed text-fg-muted">Seguí tus pedidos, consultá la mercadería en cada depósito y revisá las ventas de tus productos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={boton} disabled={loading} onClick={() => setActualizacion(valor => valor + 1)}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar</button>
          <Link to="/mi-tienda/depositos" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover"><Package size={16} /> Abastecer un depósito</Link>
        </div>
      </header>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Truck size={20} className="mt-0.5 shrink-0 text-primary-text" />
        <div><p className="m-0 text-sm font-semibold">Pago contra entrega</p><p className="mb-0 mt-1 text-sm text-fg-muted">No necesitás adelantar el pago ni enviar comprobantes. Los estados logísticos se actualizan desde RAHA.</p></div>
      </div>
      <section aria-label="Resumen de resultados" className="mb-6 grid gap-3 sm:grid-cols-3">
        {metricas.map(({ label, valor, icono: Icono }) => <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm"><div><p className="m-0 text-xs font-medium text-fg-muted">{label}</p><p className="mb-0 mt-2 text-2xl font-bold tabular-nums">{loading || error ? '—' : valor}</p></div><Icono size={22} className="shrink-0 text-primary-text" /></div>)}
      </section>
      <section aria-label="Filtros de abastecimientos" className="mb-5 rounded-xl border border-border bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-fg-muted lg:col-span-2">Buscar pedido o producto
            <div className="relative mt-1.5"><Search size={16} className="absolute left-3 top-3 text-fg-muted" /><input value={texto} onChange={event => cambiar('texto', event.target.value)} placeholder="Producto, SKU, depósito, pedido RAHA o #ID" className={`${control} pl-9`} /></div>
          </label>
          <label className="text-xs font-semibold text-fg-muted">Estado RAHA<select className={`${control} mt-1.5`} value={estado} onChange={event => cambiar('estado', event.target.value)}><option value="">Todos los estados</option>{Object.entries(ESTADOS_RAHA).map(([valor, configuracion]) => <option key={valor} value={valor}>{configuracion.label}</option>)}</select></label>
          <label className="text-xs font-semibold text-fg-muted">Depósito de destino<select className={`${control} mt-1.5`} value={depositoId} onChange={event => cambiar('depositoId', event.target.value)}><option value="">Todos mis depósitos</option>{depositos.map(deposito => <option key={deposito.id} value={deposito.id}>{deposito.nombre}</option>)}</select></label>
          <label className="text-xs font-semibold text-fg-muted">Desde<input type="date" value={desde} max={hasta || undefined} onChange={event => cambiar('desde', event.target.value)} className={`${control} mt-1.5`} /></label>
          <label className="text-xs font-semibold text-fg-muted">Hasta<input type="date" value={hasta} min={desde || undefined} onChange={event => cambiar('hasta', event.target.value)} className={`${control} mt-1.5`} /></label>
          <label className="text-xs font-semibold text-fg-muted">Ordenar por<select value={ordenar} onChange={event => cambiar('ordenar', event.target.value)} className={`${control} mt-1.5`}><option value="recientes">Más recientes primero</option><option value="antiguos">Más antiguos primero</option></select></label>
          <div className="flex items-end">{tieneFiltros && <button type="button" onClick={() => setParams({}, { replace: true })} className={`${boton} w-full`}><FilterX size={15} /> Limpiar filtros</button>}</div>
        </div>
        {errorDepositos && <p role="status" className="mb-0 mt-3 text-xs text-warning-text">No pudimos cargar el selector de depósitos. Podés buscar por nombre o volver a actualizar.</p>}
      </section>
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm" aria-label="Pedidos de abastecimiento" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4"><h2 className="m-0 text-sm font-bold">Historial de abastecimientos</h2><span className="text-xs text-fg-muted" role="status">{loading ? 'Actualizando resultados…' : `${data.total || 0} pedidos encontrados`}</span></div>
        {error ? <div role="alert" className="p-8 text-center"><p className="text-danger-text">{error}</p><button type="button" onClick={() => setActualizacion(valor => valor + 1)} className={boton}>Reintentar</button></div>
          : loading ? <div className="space-y-3 p-5" aria-label="Cargando abastecimientos">{[1, 2, 3, 4].map(fila => <div key={fila} className="h-16 animate-pulse rounded-lg bg-surface-2" />)}</div>
            : solicitudes.length === 0 ? <div className="flex flex-col items-center px-5 py-14 text-center"><Package size={36} className="mb-3 text-fg-muted" /><h3 className="m-0 text-lg font-semibold">{tieneFiltros ? 'No encontramos coincidencias' : 'Tu próximo abastecimiento empieza acá'}</h3><p className="mb-5 mt-2 max-w-md text-sm text-fg-muted">{tieneFiltros ? 'Probá con otro estado, depósito o rango de fechas.' : 'Elegí un depósito y pedí productos del catálogo RAHA. Vas a poder seguir cada entrega desde esta sección.'}</p>{tieneFiltros ? <button type="button" className={boton} onClick={() => setParams({})}>Limpiar filtros</button> : <Link className={boton} to="/mi-tienda/depositos">Ir a mis depósitos</Link>}</div>
              : <div className="relative overflow-x-auto"><table className="w-full min-w-[1150px] border-collapse text-left text-sm"><thead className="bg-surface-2 text-xs text-fg-muted"><tr>{['Pedido / fecha', 'Producto', 'Destino', 'Cantidad / precio', 'Total', 'Estado RAHA', 'Stock en destino', 'Ventas del producto', 'Seguimiento'].map(titulo => <th key={titulo} scope="col" className="px-4 py-3 font-semibold">{titulo}</th>)}</tr></thead><tbody className="divide-y divide-border">{solicitudes.map(solicitud => {
                const estadoActual = estadoRaha(solicitud.estado_seguimiento);
                return <tr key={solicitud.id} className="align-top transition-colors hover:bg-surface-2/50">
                  <td className="px-4 py-4"><Link to={`/mis-abastecimientos/${solicitud.id}`} state={{ volverA }} className="font-bold text-primary-text hover:underline">#{solicitud.id}</Link><span className="mt-1 block text-xs text-fg-muted">{formatFecha(solicitud.created_at)}</span>{solicitud.pedidoRaha?.order_id && <span className="mt-1 block break-all text-[11px] text-fg-muted">RAHA {solicitud.pedidoRaha.order_id}</span>}</td>
                  <td className="max-w-[240px] px-4 py-4"><span className="font-semibold">{solicitud.producto?.nombre || `Producto #${solicitud.producto_id}`}</span>{solicitud.variante?.nombre && <span className="mt-1 block text-xs text-fg-muted">{solicitud.variante.nombre}</span>}<span className="mt-1 block font-mono text-xs text-fg-muted">{solicitud.variante?.sku_variante || solicitud.producto?.sku || 'Sin SKU'}</span></td>
                  <td className="max-w-[170px] px-4 py-4"><span className="font-medium">{solicitud.depositoDestino?.nombre || 'Sin depósito'}</span><span className="mt-1 block text-xs text-fg-muted">{solicitud.depositoDestino?.ciudad}</span></td>
                  <td className="whitespace-nowrap px-4 py-4 tabular-nums"><strong>{solicitud.cantidad} u.</strong><span className="mt-1 block text-xs text-fg-muted">{formatGs(solicitud.precio_unitario)} / u.</span></td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums">{formatGs(Number(solicitud.costo_producto || 0) + Number(solicitud.costo_logistico || 0))}<span className="mt-1 block text-xs font-normal text-fg-muted">Contra entrega</span></td>
                  <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoActual.color}`}>{estadoActual.label}</span>{solicitud.estado_seguimiento === 'entregado' && !solicitud.stock_acreditado && <span className="mt-2 block text-xs text-warning-text">Recepción pendiente de confirmar</span>}</td>
                  <td className="whitespace-nowrap px-4 py-4 tabular-nums"><strong>{solicitud.inventario?.disponible ?? '—'}</strong> disponibles<span className="mt-1 block text-xs text-fg-muted">{solicitud.inventario?.reservado ?? '—'} reservadas</span></td>
                  <td className="whitespace-nowrap px-4 py-4 tabular-nums"><strong>{solicitud.ventas_producto?.unidades ?? '—'}</strong> vendidas<span className="mt-1 block text-xs text-fg-muted">Pedidos entregados</span></td>
                  <td className="px-4 py-4"><Link to={`/mis-abastecimientos/${solicitud.id}`} state={{ volverA }} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-text hover:underline" aria-label={`Ver seguimiento del abastecimiento ${solicitud.id}`}>Seguimiento <ArrowUpRight size={14} /></Link></td>
                </tr>;
              })}</tbody></table></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <label className="flex items-center gap-2 text-xs text-fg-muted">Mostrar<select className="rounded-md border border-border bg-surface px-2 py-1.5 text-fg" value={limit} onChange={event => cambiar('limit', event.target.value)}>{[10, 20, 50, 100].map(cantidad => <option key={cantidad} value={cantidad}>{cantidad}</option>)}</select>por página</label>
          <span className="text-xs text-fg-muted">{data.total ? `${(pagina - 1) * limit + 1}–${Math.min(pagina * limit, data.total)} de ${data.total}` : '0 resultados'}</span>
          <nav aria-label="Paginación de abastecimientos" className="flex items-center gap-2"><button type="button" className={boton} disabled={loading || pagina <= 1} onClick={() => cambiar('page', pagina - 1)} aria-label="Página anterior"><ChevronLeft size={16} /></button><span className="px-2 text-xs tabular-nums">Página {pagina} de {paginas}</span><button type="button" className={boton} disabled={loading || pagina >= paginas} onClick={() => cambiar('page', pagina + 1)} aria-label="Página siguiente"><ChevronRight size={16} /></button></nav>
        </div>
      </section>
      <p className="mt-4 text-xs leading-relaxed text-fg-muted">El stock corresponde al saldo actual del producto y variante en el depósito de destino. Las ventas incluyen pedidos entregados de ese producto y variante, en todos los depósitos y fechas; no se atribuyen a un lote de abastecimiento. Los saldos pueden repetirse si pediste el mismo producto varias veces.</p>
    </div>
  );
}
