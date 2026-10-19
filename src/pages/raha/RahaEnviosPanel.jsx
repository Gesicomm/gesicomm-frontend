import React, { useCallback, useEffect, useState } from 'react';
import { PackagePlus, RefreshCw, X } from 'lucide-react';
import { rahaPortalApi } from '../../services/rahaPortalApi';
import { rahaOperacionesService } from '../../services/rahaOperacionesService';
import { useDebounce } from '../../hooks/useDebounce';
import { formatFecha } from '../../components/abastecimiento/rahaSeguimiento';
import NuevoEnvioRaha from './NuevoEnvioRaha';
import { botonOperacion, botonPrincipal, controlOperacion, EstadoEnvio, ESTADOS_ENVIO, mensajeError,
  PaginacionOperacion, ResultadoConsulta, useConsultaOperacion } from './operacionesUI';

export default function RahaEnviosPanel({ portal = false }) {
  const api = portal ? rahaPortalApi : rahaOperacionesService;
  const [texto, setTexto] = useState('');
  const busqueda = useDebounce(texto, 300);
  const [estado, setEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [seleccionado, setSeleccionado] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [accion, setAccion] = useState('');
  const [comentario, setComentario] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const lista = useConsultaOperacion(useCallback(() => api.envios({ texto: busqueda, estado, desde, hasta, page, limit }), [api, busqueda, estado, desde, hasta, page, limit]));
  const detalle = useConsultaOperacion(useCallback(() => seleccionado ? api.envio(seleccionado) : Promise.resolve(null), [api, seleccionado]));
  const solicitud = detalle.data;

  useEffect(() => {
    if (lista.data && page > lista.data.totalPaginas) setPage(Math.max(1, lista.data.totalPaginas));
  }, [lista.data, page]);

  function seleccionar(id) {
    setSeleccionado(id);
    setAccion('');
    setComentario('');
    setErrorAccion('');
    setNuevo(false);
  }
  async function resolver(event) {
    event.preventDefault();
    if (busy || !solicitud || !accion) return;
    setBusy(true);
    setErrorAccion('');
    try {
      await api.resolverEnvio(solicitud.id, { estado: accion, comentario, version: solicitud.version });
      setAccion('');
      setComentario('');
      setMensaje('Estado de la solicitud actualizado.');
      lista.reintentar();
      detalle.reintentar();
    } catch (fallo) {
      setErrorAccion(mensajeError(fallo));
      if (fallo?.response?.status === 409) detalle.reintentar();
    } finally { setBusy(false); }
  }

  return <div className="min-w-0 space-y-5 text-fg">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0 text-xl font-bold">Envíos de mercadería a RAHA</h2><p className="mb-0 mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted">{portal ? 'Revisá los productos que cada comercio quiere enviar, su depósito de origen y el destino de recepción. Aceptá la solicitud o dejá observaciones para coordinar.' : 'Solicitá el envío de productos desde uno de tus depósitos a un depósito publicado por RAHA y seguí su revisión.'}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={lista.reintentar} disabled={lista.loading} className={botonOperacion}><RefreshCw size={15} /> Actualizar</button>{!portal && <button type="button" onClick={() => { setNuevo(true); setSeleccionado(null); setMensaje(''); }} className={botonPrincipal}><PackagePlus size={16} /> Nueva solicitud</button>}</div></div>
    <div className="rounded-xl border border-info/20 bg-info/5 p-4 text-sm leading-relaxed text-fg-muted">El comercio marca Preparado y luego Enviado. RAHA confirma Recibido al recibir físicamente la mercadería. Estos estados no generan compras ni modifican el inventario automáticamente; las transferencias de stock se implementarán por separado.</div>
    {mensaje && <div role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success-text">{mensaje}</div>}
    {nuevo && !portal && <NuevoEnvioRaha onCerrar={() => setNuevo(false)} onCreado={creado => { setNuevo(false); seleccionar(creado.id); setMensaje(`Solicitud #${creado.id} enviada a RAHA.`); setPage(1); lista.reintentar(); }} />}
    <section aria-label="Filtros de solicitudes de envío" className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold text-fg-muted">Buscar solicitud<input className={`${controlOperacion} mt-1.5`} value={texto} onChange={event => { setTexto(event.target.value); setPage(1); }} placeholder="Producto, SKU, comercio o depósito" /></label>
      <label className="text-xs font-semibold text-fg-muted">Estado de solicitud<select className={`${controlOperacion} mt-1.5`} value={estado} onChange={event => { setEstado(event.target.value); setPage(1); }}><option value="">Todos los estados</option>{Object.entries(ESTADOS_ENVIO).map(([valor, [label]]) => <option key={valor} value={valor}>{label}</option>)}</select></label>
      <label className="text-xs font-semibold text-fg-muted">Desde<input type="date" max={hasta || undefined} value={desde} onChange={event => { setDesde(event.target.value); setPage(1); }} className={`${controlOperacion} mt-1.5`} /></label>
      <label className="text-xs font-semibold text-fg-muted">Hasta<input type="date" min={desde || undefined} value={hasta} onChange={event => { setHasta(event.target.value); setPage(1); }} className={`${controlOperacion} mt-1.5`} /></label>
      {(texto || estado || desde || hasta) && <button type="button" className={`${botonOperacion} justify-self-start`} onClick={() => { setTexto(''); setEstado(''); setDesde(''); setHasta(''); setPage(1); }}>Limpiar filtros</button>}
    </section>
    <section aria-label="Solicitudes enviadas a RAHA" className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface">
      <ResultadoConsulta consulta={lista} vacio={!lista.data?.registros.length}>
        <div className="relative overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-surface-2 text-xs text-fg-muted"><tr>{['Solicitud', ...(portal ? ['Comercio'] : []), 'Desde', 'Hacia RAHA', 'Mercadería', 'Estado'].map(label => <th scope="col" className="px-4 py-3 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{lista.data?.registros.map(registro => <tr key={registro.id} className="align-top hover:bg-surface-2/50"><td className="px-4 py-4"><button type="button" onClick={() => seleccionar(registro.id)} className="font-bold text-primary-text hover:underline" aria-label={`Ver solicitud de envío ${registro.id}`}>#{registro.id}</button><span className="mt-1 block text-xs text-fg-muted">{formatFecha(registro.created_at)}</span></td>{portal && <td className="px-4 py-4"><span className="font-semibold">{registro.tienda?.nombre}</span><span className="mt-1 block text-xs text-fg-muted">{registro.comercio?.nombre}</span></td>}<td className="px-4 py-4"><span className="font-medium">{registro.origen_snapshot.nombre}</span><span className="mt-1 block text-xs text-fg-muted">{registro.origen_snapshot.ciudad}</span></td><td className="px-4 py-4"><span className="font-medium">{registro.destino_snapshot.nombre}</span><span className="mt-1 block text-xs text-fg-muted">{registro.destino_snapshot.ciudad}</span></td><td className="max-w-[240px] px-4 py-4"><span className="font-semibold">{registro.items.reduce((total, item) => total + item.cantidad, 0)} unidades</span><span className="mt-1 block text-xs text-fg-muted">{registro.items.map(item => `${item.nombre}${item.variante ? ` · ${item.variante}` : ''}`).join(', ')}</span></td><td className="px-4 py-4"><EstadoEnvio estado={registro.estado} /></td></tr>)}</tbody></table></div>
      </ResultadoConsulta>
      <PaginacionOperacion data={lista.data} page={page} limit={limit} cambiarPagina={setPage} cambiarLimite={valor => { setLimit(valor); setPage(1); }} loading={lista.loading} />
    </section>
    {seleccionado && <section className="rounded-xl border border-primary/30 bg-surface p-4 shadow-sm sm:p-6" aria-label="Detalle de solicitud de envío">
      <div className="mb-5 flex items-center justify-between gap-3"><h3 className="m-0 text-lg font-bold">Solicitud #{seleccionado}</h3><button type="button" disabled={busy} aria-label="Cerrar detalle de envío" className={botonOperacion} onClick={() => seleccionar(null)}><X size={16} /></button></div>
      <ResultadoConsulta consulta={detalle}>
        {solicitud && <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3"><EstadoEnvio estado={solicitud.estado} /><span className="text-xs text-fg-muted">{formatFecha(solicitud.created_at, true)}{portal && ` · ${solicitud.tienda?.nombre || ''}`}</span></div>
          <div className="grid gap-4 sm:grid-cols-2">{[['Origen', solicitud.origen_snapshot], ['Destino RAHA', solicitud.destino_snapshot]].map(([label, deposito]) => <div key={label} className="rounded-lg border border-border p-4"><h4 className="m-0 text-xs font-bold uppercase text-fg-muted">{label}</h4><p className="mb-1 mt-2 font-semibold">{deposito.nombre}</p><p className="my-1 text-sm text-fg-muted">{deposito.direccion} · {deposito.ciudad}</p><p className="mb-0 mt-2 text-sm text-fg-muted">{deposito.persona_contacto} {deposito.telefono_contacto}</p></div>)}</div>
          <ul className="m-0 list-none divide-y divide-border rounded-lg border border-border p-0">{solicitud.items.map(item => <li key={`${item.producto_id}:${item.variante_id}`} className="flex items-start justify-between gap-4 px-4 py-3"><div><p className="m-0 text-sm font-semibold">{item.nombre}</p><p className="mb-0 mt-1 text-xs text-fg-muted">{item.variante} · SKU {item.sku || 'Sin SKU'}</p>{item.stock_registrado === false && <p className="mb-0 mt-1 text-xs text-warning-text">Cantidad declarada por el comercio; sin stock registrado en origen al solicitar.</p>}</div><strong className="whitespace-nowrap text-sm">{item.cantidad} u.</strong></li>)}</ul>
          {solicitud.observacion && <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-4 text-sm"><strong>Observaciones del comercio:</strong> {solicitud.observacion}</p>}
          <div><h4 className="mb-3 mt-0 text-sm font-bold">Historial de la solicitud</h4><ol className="m-0 list-none space-y-3 border-l border-border pl-4">{solicitud.historial.map((evento, indice) => <li key={indice}><p className="m-0 text-sm font-semibold">{ESTADOS_ENVIO[evento.estado]?.[0] || evento.estado} · {evento.autor}</p><time className="mt-1 block text-xs text-fg-muted">{formatFecha(evento.fecha, true)}</time>{evento.comentario && <p className="mb-0 mt-1 whitespace-pre-wrap text-sm text-fg-muted">{evento.comentario}</p>}</li>)}</ol></div>
          <div className="border-t border-border pt-4">
            {!accion && <div className="flex flex-wrap gap-2">{portal && ['solicitada', 'observada'].includes(solicitud.estado) && <>{[['aceptada', 'Aceptar para coordinar'], ['observada', 'Pedir correcciones'], ['rechazada', 'Rechazar solicitud']].map(([valor, label]) => <button type="button" key={valor} className={valor === 'aceptada' ? botonPrincipal : botonOperacion} onClick={() => { setAccion(valor); setErrorAccion(''); }}>{label}</button>)}</>}
              {portal && solicitud.estado === 'enviado' && <button type="button" className={botonPrincipal} onClick={() => { setAccion('recibido'); setErrorAccion(''); }}>Marcar como recibido</button>}
              {!portal && ['solicitada', 'aceptada', 'preparado'].includes(solicitud.estado) && <button type="button" className={botonPrincipal} onClick={() => { setAccion(solicitud.estado === 'preparado' ? 'enviado' : 'preparado'); setErrorAccion(''); }}>{solicitud.estado === 'preparado' ? 'Marcar como enviado' : 'Marcar como preparado'}</button>}
              {!portal && ['solicitada', 'observada', 'aceptada', 'preparado'].includes(solicitud.estado) && <button type="button" className={botonOperacion} onClick={() => { setAccion('cancelada'); setErrorAccion(''); }}>Cancelar solicitud</button>}</div>}
            {accion && <form onSubmit={resolver} className="space-y-3 rounded-lg bg-surface-2 p-4"><p className="m-0 text-sm font-semibold">Confirmar: {ESTADOS_ENVIO[accion]?.[0]}</p><label className="block text-sm">{['observada', 'rechazada'].includes(accion) ? 'Motivo para el comercio (obligatorio)' : 'Comentario de coordinación (opcional)'}<textarea rows={3} maxLength={2000} required={['observada', 'rechazada'].includes(accion)} value={comentario} onChange={event => setComentario(event.target.value)} disabled={busy} className={`${controlOperacion} mt-1.5`} /></label><div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className={botonPrincipal}>{busy ? 'Guardando…' : 'Confirmar cambio'}</button><button type="button" disabled={busy} className={botonOperacion} onClick={() => setAccion('')}>Volver</button></div></form>}
            {errorAccion && <p role="alert" className="text-sm text-danger-text">{errorAccion}</p>}
          </div>
        </div>}
      </ResultadoConsulta>
    </section>}
  </div>;
}
