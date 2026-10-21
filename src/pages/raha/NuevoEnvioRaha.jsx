import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PackagePlus, Trash2, X } from 'lucide-react';
import { rahaOperacionesService as api } from '../../services/rahaOperacionesService';
import { useDebounce } from '../../hooks/useDebounce';
import ImagenMercaderia from './ImagenMercaderia';
import { botonOperacion, botonPrincipal, controlOperacion, mensajeError, ResultadoConsulta, useConsultaOperacion } from './operacionesUI';

export default function NuevoEnvioRaha({ onCreado, onCerrar }) {
  const opciones = useConsultaOperacion(useCallback(async () => {
    const [origenes, destinos] = await Promise.all([api.origenes(), api.destinos()]);
    return { origenes, destinos };
  }, []));
  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [texto, setTexto] = useState('');
  const textoDebounced = useDebounce(texto, 300);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [observacion, setObservacion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const solicitudRef = useRef(null);
  const stock = useConsultaOperacion(useCallback(() => origenId
    ? api.stock({ deposito_origen_id: Number(origenId), texto: textoDebounced, page, limit: 10 })
    : Promise.resolve({ registros: [], total: 0, totalPaginas: 1 }), [origenId, textoDebounced, page]));

  useEffect(() => {
    if (stock.data && page > stock.data.totalPaginas) setPage(Math.max(1, stock.data.totalPaginas));
  }, [stock.data, page]);

  function cambiarOrigen(valor) {
    setOrigenId(valor);
    setItems([]);
    setPage(1);
    setTexto('');
    setError('');
  }
  function seleccionar(fila) {
    const clave = `${fila.producto_id}:${fila.variante_id || 0}`;
    if (items.some(item => item.clave === clave)) return;
    setItems(prev => [...prev, { ...fila, clave, cantidad: 1 }]);
    setError('');
  }
  async function enviar(event) {
    event.preventDefault();
    if (busy || !items.length) return;
    setBusy(true);
    setError('');
    const payload = { deposito_origen_id: Number(origenId), destino_raha_id: Number(destinoId), observacion,
      items: items.map(item => ({ producto_id: item.producto_id, variante_id: item.variante_id || null, cantidad: Number(item.cantidad) })) };
    const firma = JSON.stringify(payload);
    if (solicitudRef.current?.firma !== firma) solicitudRef.current = { firma, clave: crypto.randomUUID() };
    try {
      const creado = await api.crearEnvio({ ...payload, solicitud_key: solicitudRef.current.clave });
      onCreado(creado);
    } catch (fallo) { setError(mensajeError(fallo)); }
    finally { setBusy(false); }
  }

  return <section className="rounded-xl border border-primary/30 bg-surface p-4 shadow-sm sm:p-6" aria-label="Nueva solicitud de envío a RAHA">
    <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-bold">Preparar solicitud de envío</h2><p className="mb-0 mt-1 text-sm text-fg-muted">Elegí desde dónde enviar y qué mercadería querés que reciba RAHA.</p></div><button type="button" disabled={busy} onClick={onCerrar} aria-label="Cerrar nueva solicitud" className={botonOperacion}><X size={17} /></button></div>
    <ResultadoConsulta consulta={opciones}>
      <form onSubmit={enviar} className="space-y-5">
        <fieldset disabled={busy} className="m-0 min-w-0 space-y-5 border-0 p-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Depósito de origen<select required value={origenId} onChange={event => cambiarOrigen(event.target.value)} className={`${controlOperacion} mt-1.5`}><option value="">Seleccionar mi depósito</option>{opciones.data?.origenes.map(deposito => <option key={deposito.id} value={deposito.id}>{deposito.nombre} · {deposito.ciudad}</option>)}</select></label>
            <label className="block text-sm font-semibold">Depósito RAHA de destino<select required value={destinoId} onChange={event => setDestinoId(event.target.value)} className={`${controlOperacion} mt-1.5`}><option value="">Seleccionar destino RAHA</option>{opciones.data?.destinos.map(deposito => <option key={deposito.id} value={deposito.id}>{deposito.nombre} · {deposito.ciudad}</option>)}</select></label>
          </div>
          {opciones.data && !opciones.data.origenes.length && <p className="text-sm text-warning-text">Primero registrá un depósito propio en esta tienda.</p>}
          {opciones.data && !opciones.data.destinos.length && <p className="text-sm text-warning-text">RAHA todavía no publicó depósitos de recepción. Podrás enviar la solicitud cuando habilite un destino.</p>}
          {destinoId && <p className="rounded-lg bg-surface-2 p-3 text-sm text-fg-muted">Destino: {opciones.data?.destinos.find(destino => String(destino.id) === destinoId)?.direccion}</p>}
          {origenId && <div className="grid items-start gap-5 lg:grid-cols-2">
            <div className="min-w-0"><label className="block text-sm font-semibold">Buscar en mis productos propios<input type="search" className={`${controlOperacion} mt-1.5`} value={texto} onChange={event => { setTexto(event.target.value); setPage(1); }} placeholder="Producto, variante o SKU" /></label><p className="text-xs text-fg-muted">Solo se muestran productos propios de esta tienda. Si el depósito no tiene stock registrado, la cantidad es declarada por vos. No se crea inventario automáticamente.</p><div className="mt-3 space-y-2"><ResultadoConsulta consulta={stock} vacio={!stock.data?.registros.length}>
              {stock.data?.registros.map(fila => {
                const clave = `${fila.producto_id}:${fila.variante_id || 0}`;
                const seleccionado = items.some(item => item.clave === clave);
                return <button key={clave} type="button" disabled={seleccionado || fila.variante?.activo === false || (fila.stock_registrado !== false && Number(fila.disponible) <= 0) || items.length >= 100} onClick={() => seleccionar(fila)} className="flex w-full items-start justify-between gap-3 rounded-lg border border-border p-3 text-left hover:bg-surface-2 disabled:opacity-50"><ImagenMercaderia producto={fila.producto} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{fila.producto?.nombre}</span><span className="mt-1 block text-xs text-fg-muted">{fila.variante?.nombre} · {fila.variante?.sku_variante || fila.producto?.sku || 'Sin SKU'}</span><span className="mt-1 block text-xs text-fg-muted">{fila.stock_registrado === false ? 'Sin stock registrado · cantidad declarada' : `${fila.disponible} disponibles`}</span></span><span className="text-xs font-semibold text-primary-text">{seleccionado ? 'Agregado' : 'Agregar'}</span></button>;
              })}
            </ResultadoConsulta></div><div className="mt-3 flex items-center justify-between gap-2 text-xs text-fg-muted"><button type="button" disabled={stock.loading || page <= 1} onClick={() => setPage(valor => valor - 1)} className={botonOperacion}>Anterior</button><span>{page} / {stock.data?.totalPaginas || 1} · {stock.data?.total || 0} productos</span><button type="button" disabled={stock.loading || page >= (stock.data?.totalPaginas || 1)} onClick={() => setPage(valor => valor + 1)} className={botonOperacion}>Siguiente</button></div></div>
            <div className="min-w-0 rounded-lg border border-border p-4"><h3 className="m-0 mb-3 text-sm font-bold">Mercadería seleccionada · {items.length} productos</h3>{!items.length && <p className="text-sm text-fg-muted">Agregá los productos que querés enviar. Cambiar de origen vacía esta selección.</p>}<ul className="m-0 list-none space-y-3 p-0">{items.map(item => <li key={item.clave} className="rounded-lg bg-surface-2 p-3"><div className="flex items-start gap-3"><ImagenMercaderia producto={item.producto} className="h-20 w-20" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="m-0 text-sm font-semibold">{item.producto?.nombre}</p><p className="mb-2 mt-1 text-xs text-fg-muted">{item.variante?.nombre} · {item.stock_registrado === false ? 'Cantidad declarada' : `${item.disponible} disponibles`}</p></div><button type="button" aria-label={`Quitar ${item.producto?.nombre}`} onClick={() => setItems(prev => prev.filter(fila => fila.clave !== item.clave))} className="rounded-md p-1.5 text-fg-muted hover:text-danger-text"><Trash2 size={15} /></button></div><label className="flex flex-wrap items-center gap-3 text-xs font-medium">Cantidad<input required type="number" min="1" max={item.stock_registrado === false ? 1000000 : item.disponible} step="1" value={item.cantidad} onChange={event => setItems(prev => prev.map(fila => fila.clave === item.clave ? { ...fila, cantidad: event.target.value } : fila))} className={`${controlOperacion} max-w-28`} /></label></div></div></li>)}</ul></div>
          </div>}
          <label className="block text-sm font-semibold">Observaciones para RAHA<textarea rows={3} maxLength={2000} value={observacion} onChange={event => setObservacion(event.target.value)} className={`${controlOperacion} mt-1.5`} placeholder="Presentación, empaque o indicaciones para coordinar la recepción" /></label>
        </fieldset>
        {error && <div role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger-text">{error}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="m-0 max-w-xl text-xs leading-relaxed text-fg-muted">La solicitud no reserva ni descuenta stock. RAHA revisará la mercadería y coordinará el traslado antes de su recepción física.</p><button type="submit" disabled={busy || !origenId || !destinoId || !items.length} className={botonPrincipal}><PackagePlus size={16} /> {busy ? 'Enviando…' : 'Enviar solicitud a RAHA'}</button></div>
      </form>
    </ResultadoConsulta>
  </section>;
}
