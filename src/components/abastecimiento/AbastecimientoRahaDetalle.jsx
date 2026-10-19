import React from 'react';
import { ArrowLeft, CheckCircle2, Clock, Package, RefreshCw, Truck, Warehouse } from 'lucide-react';
import { estadoRaha, formatFecha, formatGs } from './rahaSeguimiento';

const pasos = ['pendiente_envio', 'pendiente_confirmacion', 'cargado', 'en_camino', 'entregado'];

export default function AbastecimientoRahaDetalle({ solicitud, volver, actualizar, confirmarRecepcion, procesando, esAdmin }) {
  const estado = estadoRaha(solicitud.estado_seguimiento);
  const indiceActual = pasos.indexOf(solicitud.estado_seguimiento);
  const eventos = solicitud.historial_raha || [];
  const historial = [
    ...(solicitud.historial || []).map(evento => ({ ...evento, origen: 'Gesicom' })),
    ...eventos,
  ].sort((anterior, siguiente) => new Date(siguiente.created_at) - new Date(anterior.created_at));
  const destino = solicitud.depositoDestino;
  const total = Number(solicitud.costo_producto || 0) + Number(solicitud.costo_logistico || 0);
  const detalles = [
    ['Cantidad solicitada', `${solicitud.cantidad} unidades`],
    ['Precio unitario', formatGs(solicitud.precio_unitario)],
    ['Productos', formatGs(solicitud.costo_producto)],
    ['Logística', formatGs(solicitud.costo_logistico)],
    ['Total contra entrega', formatGs(total)],
  ];

  return (
    <div className="mx-auto w-full max-w-6xl p-4 text-fg sm:p-6 lg:p-8">
      <button type="button" onClick={volver} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft size={16} /> Volver a abastecimientos</button>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><p className="m-0 text-xs font-bold uppercase tracking-widest text-primary-text">Abastecimiento RAHA</p><h1 className="mb-2 mt-2 text-2xl font-bold">Pedido #{solicitud.id}</h1><p className="m-0 text-sm text-fg-muted">Solicitado el {formatFecha(solicitud.created_at, true)}{solicitud.pedidoRaha?.order_id && ` · Pedido RAHA ${solicitud.pedidoRaha.order_id}`}</p></div>
        <div className="flex items-center gap-3"><span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${estado.color}`}>{estado.label}</span><button type="button" onClick={actualizar} disabled={procesando} className="rounded-lg border border-border p-2.5 hover:bg-surface-2 disabled:opacity-50" aria-label="Actualizar seguimiento"><RefreshCw size={17} /></button></div>
      </header>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ['Disponibles en destino', `${solicitud.inventario?.disponible ?? '—'} u.`, Warehouse],
          ['Reservadas en destino', `${solicitud.inventario?.reservado ?? '—'} u.`, Package],
          ['Ventas del producto', `${solicitud.ventas_producto?.unidades ?? '—'} unidades`, CheckCircle2],
        ].map(([label, valor, Icono]) => <div key={label} className="rounded-xl border border-border bg-surface p-5 shadow-sm"><Icono size={20} className="mb-3 text-primary-text" /><p className="m-0 text-xs text-fg-muted">{label}</p><p className="mb-0 mt-2 text-xl font-bold tabular-nums">{valor}</p></div>)}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <div className="mb-6 flex items-center gap-2"><Truck size={19} className="text-primary-text" /><h2 className="m-0 text-base font-bold">Seguimiento del pedido</h2></div>
            {['devuelto', 'requiere_revision'].includes(solicitud.estado_seguimiento) && <div role="status" className="mb-5 rounded-lg border border-danger/20 bg-danger/5 p-4 text-sm text-danger-text">{solicitud.estado_seguimiento === 'devuelto' ? 'RAHA informó una devolución. La mercadería devuelta no se acredita como stock recibido.' : 'El envío del pedido requiere revisión. Consultá con soporte antes de volver a solicitarlo.'}</div>}
            <ol className="m-0 list-none p-0">
              {pasos.map((paso, indice) => {
                const evento = [...eventos].reverse().find(registro => registro.estado === paso);
                const actual = solicitud.estado_seguimiento === paso;
                const registrado = Boolean(evento) || indice === 0 || actual;
                const superado = indiceActual > indice;
                const fecha = evento?.created_at || (indice === 0 ? solicitud.created_at : actual ? solicitud.pedidoRaha?.status_at : null);
                return <li key={paso} className="relative flex gap-4 pb-7 last:pb-0" aria-current={actual ? 'step' : undefined}>
                  {indice < pasos.length - 1 && <span aria-hidden="true" className={`absolute bottom-0 left-[15px] top-8 w-px ${superado ? 'bg-primary/40' : 'bg-border'}`} />}
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${actual ? 'border-primary bg-primary text-primary-fg ring-4 ring-primary/10' : registrado || superado ? 'border-primary/30 bg-primary/10 text-primary-text' : 'border-border bg-surface text-fg-muted'}`}>{registrado || superado ? <CheckCircle2 size={16} /> : <Clock size={15} />}</span>
                  <div className="min-w-0 pt-1"><p className={`m-0 text-sm ${actual ? 'font-bold text-primary-text' : 'font-medium'}`}>{estadoRaha(paso).label}{actual && <span className="ml-2 text-[11px] font-normal">Estado actual</span>}</p><p className="mb-0 mt-1 text-xs text-fg-muted">{fecha ? formatFecha(fecha, true) : superado ? 'Sin fecha de evento registrada' : 'Pendiente de actualización de RAHA'}</p></div>
                </li>;
              })}
            </ol>
            {solicitud.estado_seguimiento === 'entregado' && !solicitud.stock_acreditado && <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4"><h3 className="m-0 text-sm font-bold">RAHA confirmó la entrega</h3><p className="mb-3 mt-2 text-sm text-fg-muted">Confirmá que recibiste las {solicitud.cantidad} unidades en {destino?.nombre || 'tu depósito'} para acreditar el stock.</p>{!esAdmin && <button type="button" disabled={procesando} onClick={confirmarRecepcion} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50">{procesando ? 'Confirmando…' : 'Confirmar recepción y acreditar stock'}</button>}</div>}
            {solicitud.stock_acreditado && <p className="mb-0 mt-6 flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success-text"><CheckCircle2 size={18} /> Recepción confirmada y stock acreditado.</p>}
          </section>
          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-4"><h2 className="m-0 text-base font-bold">Historial de movimientos</h2><p className="mb-0 mt-1 text-xs text-fg-muted">Eventos recibidos de RAHA y acciones registradas en Gesicom.</p></div>
            {historial.length ? <ol className="m-0 list-none divide-y divide-border p-0">{historial.map(evento => <li key={`${evento.origen}-${evento.id}`} className="px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-primary-text">{evento.origen}</span><time className="text-xs text-fg-muted">{formatFecha(evento.created_at, true)}</time></div><p className="mb-0 mt-2 text-sm font-medium">{evento.origen === 'RAHA' ? estadoRaha(evento.estado).label : evento.comentario || evento.estado?.replace(/_/g, ' ')}</p></li>)}</ol> : <p className="p-5 text-sm text-fg-muted">Todavía no se recibieron movimientos. Actualizá para consultar el seguimiento.</p>}
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-surface p-5"><h2 className="m-0 text-sm font-bold">Producto solicitado</h2><p className="mb-1 mt-4 text-base font-semibold">{solicitud.producto?.nombre || `Producto #${solicitud.producto_id}`}</p>{solicitud.variante?.nombre && <p className="my-1 text-sm text-fg-muted">{solicitud.variante.nombre}</p>}<p className="mt-2 font-mono text-xs text-fg-muted">SKU {solicitud.variante?.sku_variante || solicitud.producto?.sku || 'Sin SKU'}</p><dl className="mb-0 mt-4 space-y-3 border-t border-border pt-4">{detalles.map(([label, valor]) => <div key={label} className="flex items-center justify-between gap-3 text-sm"><dt className="text-fg-muted">{label}</dt><dd className="m-0 font-semibold tabular-nums">{valor}</dd></div>)}</dl><div className="mt-5 rounded-lg bg-primary/5 p-3 text-xs leading-relaxed text-fg-muted"><strong className="text-fg">Pago contra entrega.</strong> No se requiere transferencia anticipada ni comprobante.</div></section>
          <section className="rounded-xl border border-border bg-surface p-5"><h2 className="m-0 flex items-center gap-2 text-sm font-bold"><Warehouse size={17} /> Depósito de destino</h2><p className="mb-1 mt-4 text-sm font-semibold">{destino?.nombre || 'Sin depósito'}</p><p className="my-1 text-sm text-fg-muted">{destino?.direccion}</p><p className="my-1 text-sm text-fg-muted">{destino?.ciudad}</p>{destino?.persona_contacto && <p className="mb-1 mt-3 text-sm">{destino.persona_contacto}</p>}{destino?.telefono_contacto && <a className="text-sm text-primary-text hover:underline" href={`tel:${destino.telefono_contacto.replace(/\D/g, '')}`}>{destino.telefono_contacto}</a>}</section>
          <p className="text-xs leading-relaxed text-fg-muted">El stock muestra el saldo actual del producto y variante en este depósito. Las ventas corresponden a pedidos entregados de ese producto y variante en todos los depósitos y fechas. No representan las ventas de este lote específico.</p>
        </aside>
      </div>
    </div>
  );
}
