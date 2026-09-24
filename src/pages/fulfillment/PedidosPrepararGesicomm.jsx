import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  RefreshCw, Package, Warehouse, CheckCircle2, Phone, MapPin, MessageCircle,
  ExternalLink, Search, X, GripVertical, Truck, CreditCard, StickyNote, Check,
} from 'lucide-react';
import {
  listarPedidosParaPrepararGesicomm, updateEstadoEnvio, getProveedorLogisticoMatch,
} from '../../services/courierApi';
import { redFulfillmentService } from '../../services/redFulfillment.service';
import { numeroPedidoVisible } from '../courier/pedidoNumero';

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function soloDigitos(tel) {
  return String(tel || '').replace(/\D/g, '');
}

function nombreCompleto(p) {
  return [p.nombre_cliente, p.apellido_cliente].filter(Boolean).join(' ') || p.cliente || 'Sin nombre';
}

function centrosDe(pedido) {
  const nombres = new Set();
  (pedido.items || []).forEach((it) => {
    (it.componentes_vendidos || []).forEach((c) => { if (c.centroOrigen) nombres.add(c.centroOrigen.nombre); });
  });
  return [...nombres];
}

/**
 * Lo que Gesicomm tiene que picker: agrupado por producto+variante, con la
 * cantidad REAL a preparar (cantidad_desde_centro — lo que salio de ESTE
 * centro, no el total del item, que puede venir mezclado con stock propio
 * del comercio en casos raros).
 */
function lineasDePreparacion(pedido) {
  const mapa = new Map();
  (pedido.items || []).forEach((it) => {
    (it.componentes_vendidos || []).forEach((c) => {
      if (!c.producto) return;
      const key = `${c.producto.id}:${it.Variante?.id || ''}`;
      const actual = mapa.get(key) || { producto: c.producto, variante: it.Variante || null, cantidad: 0 };
      actual.cantidad += Number(c.cantidad_desde_centro) || 0;
      mapa.set(key, actual);
    });
  });
  return [...mapa.values()];
}

function resumenPreparacion(pedido) {
  const lineas = lineasDePreparacion(pedido);
  const unidades = lineas.reduce((acc, l) => acc + l.cantidad, 0);
  return { productos: lineas.length, unidades };
}

/** Nombre + telefono + direccion del cliente final — a quien hay que entregarle. */
function DatosEntrega({ p, compacto }) {
  const digitos = soloDigitos(p.telefono);
  const direccionCompleta = [p.direccion, p.ciudad, p.departamento].filter(Boolean).join(', ');

  return (
    <div className={compacto ? 'text-xs' : 'text-sm'}>
      <p className="m-0 font-medium text-fg">{nombreCompleto(p)}</p>
      {p.telefono && (
        <div className="flex items-center gap-2 mt-1">
          <a href={`tel:${digitos}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-fg-muted hover:text-primary" title="Llamar">
            <Phone size={11} /> {p.telefono}
          </a>
          {digitos && (
            <a
              href={`https://wa.me/${digitos.startsWith('595') ? digitos : `595${digitos.replace(/^0/, '')}`}`}
              target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-success hover:underline" title="Abrir WhatsApp"
            >
              <MessageCircle size={11} />
            </a>
          )}
        </div>
      )}
      {direccionCompleta && (
        <div className="flex items-start gap-1 mt-1">
          <MapPin size={11} className="text-fg-muted mt-0.5 shrink-0" />
          <p className="m-0 text-fg-muted leading-snug">
            {direccionCompleta}
            {p.referencia && <span className="block text-fg-subtle">Ref: {p.referencia}</span>}
          </p>
        </div>
      )}
      {p.link_maps && (
        <a href={p.link_maps} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-primary hover:underline mt-1">
          <ExternalLink size={11} /> Ver en el mapa
        </a>
      )}
    </div>
  );
}

/**
 * Estado de la asignación del proveedor logístico de la RED DE GESICOMM
 * (proveedores_logisticos: transportadoras/operadores propios, gestionados
 * en Operación — nunca los couriers que carga un comercio en su sección de
 * Delivery, que el admin no debe ver ni tocar acá).
 *
 * 'buscando' -> consultando si hay coincidencia EXACTA de ciudad+depto.
 * 'asignado' -> ya tiene proveedor (auto o manual).
 * 'manual'   -> no hubo match exacto, queda para carga manual — nunca se
 *               aproxima ni se ofrece un "parecido".
 */
function useAsignacionProveedorLogistico(pedido, onAsignado) {
  const [estado, setEstado] = useState('buscando');
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    let cancelado = false;
    if (!pedido) return undefined;
    if (pedido.proveedorLogistico) { setEstado('asignado'); return undefined; }

    setEstado('buscando');
    (async () => {
      try {
        const { match } = await getProveedorLogisticoMatch(pedido.id);
        if (cancelado) return;
        if (match?.proveedor_id) {
          await updateEstadoEnvio(pedido.id, { proveedor_logistico_id: match.proveedor_id });
          if (cancelado) return;
          toast.success(`Proveedor logístico asignado automáticamente: ${match.proveedor_nombre}.`);
          setEstado('asignado');
          onAsignado();
          return;
        }
        const todos = await redFulfillmentService.proveedores();
        if (cancelado) return;
        setProveedores((todos || []).filter((p) => p.activo));
        setEstado('manual');
      } catch {
        if (!cancelado) setEstado('manual');
      }
    })();

    return () => { cancelado = true; };
  }, [pedido?.id, pedido?.proveedorLogistico]);

  const asignarManual = async (proveedorId) => {
    if (!pedido) return;
    try {
      await updateEstadoEnvio(pedido.id, { proveedor_logistico_id: proveedorId || null });
      toast.success(proveedorId ? 'Proveedor logístico asignado.' : 'Proveedor logístico removido.');
      onAsignado();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo asignar el proveedor logístico.');
    }
  };

  return { estado, proveedores, asignarManual };
}

function DetalleModal({ pedido, onClose, onAvanzar, onCambio, procesando }) {
  const [chequeados, setChequeados] = useState({});
  const { estado: estadoProveedor, proveedores, asignarManual } = useAsignacionProveedorLogistico(pedido, onCambio);

  useEffect(() => { setChequeados({}); }, [pedido?.id]);

  if (!pedido) return null;
  const lineas = lineasDePreparacion(pedido);
  const { productos, unidades } = resumenPreparacion(pedido);
  const esPreparado = pedido.estado === 'Preparado';

  const toggleLinea = (idx) => setChequeados((c) => ({ ...c, [idx]: !c[idx] }));

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4 flex-shrink-0">
          <div>
            <h2 className="m-0 text-lg font-semibold text-fg">Pedido #{numeroPedidoVisible(pedido)}</h2>
            <p className="m-0 mt-0.5 text-sm text-fg-muted">{pedido.Usuario?.nombre || 'Comercio'} · {formatFecha(pedido.created_at)}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Bloque 1: Cliente */}
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Cliente</p>
            <div className="bg-surface-50 border border-surface-border rounded-lg p-3">
              <DatosEntrega p={pedido} />
            </div>
          </div>

          {/* Bloque 2: Preparación */}
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Preparación</p>
            <div className="bg-surface-50 border border-surface-border rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-fg flex items-center gap-1.5"><Warehouse size={13} className="text-fg-muted" /> {centrosDe(pedido).join(', ')}</span>
              <span className="text-sm font-medium text-fg">{productos} producto{productos !== 1 ? 's' : ''} · {unidades} u.</span>
            </div>
          </div>

          {/* Bloque 3: Productos (checklist de picking, no se guarda) */}
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Productos a preparar</p>
            <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden">
              {lineas.map((l, idx) => {
                const marcado = !!chequeados[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleLinea(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${marcado ? 'bg-success/5' : 'bg-surface hover:bg-surface-50'}`}
                  >
                    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${marcado ? 'border-success bg-success' : 'border-fg-muted'}`}>
                      {marcado && <Check size={10} className="text-white" />}
                    </span>
                    <span className={`flex-1 text-sm ${marcado ? 'text-fg-muted line-through' : 'text-fg'}`}>
                      {l.producto.nombre}
                      {l.variante && <span className="block text-xs text-fg-muted">{l.variante.nombre}</span>}
                    </span>
                    <span className={`text-sm font-semibold ${marcado ? 'text-fg-muted' : 'text-primary'}`}>x{l.cantidad}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloque 4: Entrega */}
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Entrega</p>
            <div className="bg-surface-50 border border-surface-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Truck size={13} className="text-fg-muted shrink-0" />
                <span className="text-fg-muted">Proveedor logístico:</span>
                {pedido.proveedorLogistico ? (
                  <span className="text-fg font-medium">{pedido.proveedorLogistico.nombre}</span>
                ) : estadoProveedor === 'buscando' ? (
                  <span className="text-fg-muted italic">Buscando coincidencia exacta de zona...</span>
                ) : (
                  <select
                    defaultValue=""
                    onChange={(e) => asignarManual(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 text-sm border border-surface-border rounded-md bg-surface px-2 py-1 outline-none focus:border-primary"
                  >
                    <option value="">
                      {proveedores.length === 0 ? 'Sin coincidencia exacta — no hay proveedores en la red' : 'Sin coincidencia exacta — elegir manualmente'}
                    </option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}{p.telefono ? ` · ${p.telefono}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard size={13} className="text-fg-muted shrink-0" />
                <span className="text-fg-muted">Forma de pago:</span>
                <span className={`font-medium ${pedido.pago_anticipado ? 'text-success' : 'text-warning'}`}>
                  {pedido.pago_anticipado ? 'Pago anticipado' : 'Contra entrega'}
                </span>
                {pedido.metodo_pago && <span className="text-fg-muted">({pedido.metodo_pago})</span>}
              </div>
              {pedido.observaciones && (
                <div className="flex items-start gap-2 text-sm">
                  <StickyNote size={13} className="text-fg-muted shrink-0 mt-0.5" />
                  <span className="text-fg-muted">{pedido.observaciones}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-surface-border px-5 py-4">
          <button
            type="button"
            onClick={() => onAvanzar(pedido, esPreparado ? 'Despachado' : 'Preparado')}
            disabled={procesando}
            className="w-full px-4 py-2.5 bg-primary text-primary-fg rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {procesando ? 'Procesando...' : esPreparado ? 'Despachar pedido' : 'Marcar como preparado'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PedidoCard({ p, onAbrir, onAccion, arrastrable, onDragStart, onDragEnd, dragging, procesando }) {
  const { productos, unidades } = resumenPreparacion(p);
  const esPreparado = p.estado === 'Preparado';
  const digitos = soloDigitos(p.telefono);

  return (
    <article
      draggable={arrastrable}
      onDragStart={arrastrable ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(p.id); } : undefined}
      onDragEnd={onDragEnd}
      onClick={() => onAbrir(p)}
      className={`bg-surface border border-surface-border rounded-lg p-3.5 transition-colors shadow-sm ${
        arrastrable ? 'cursor-grab active:cursor-grabbing hover:border-primary/50' : 'cursor-pointer hover:border-primary/50'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1">
          {arrastrable && <GripVertical size={13} className="text-fg-subtle -ml-1" />}
          <span className="text-sm font-semibold text-fg">#{numeroPedidoVisible(p)}</span>
        </div>
        <span className="text-xs text-fg-subtle truncate max-w-[120px]">{p.Usuario?.nombre}</span>
      </div>

      <p className="m-0 text-sm font-medium text-fg">{nombreCompleto(p)}</p>
      <p className="m-0 text-xs text-fg-muted mt-0.5">{[p.ciudad, p.departamento].filter(Boolean).join(', ') || 'Sin ciudad'}</p>

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-surface-border">
        <span className="text-xs text-fg-muted">{productos} producto{productos !== 1 ? 's' : ''} · {unidades} u.</span>
        {digitos && (
          <a
            href={`https://wa.me/${digitos.startsWith('595') ? digitos : `595${digitos.replace(/^0/, '')}`}`}
            target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-success hover:underline"
          >
            <MessageCircle size={11} /> WhatsApp
          </a>
        )}
      </div>
      <p className="m-0 mt-1 text-xs text-fg-subtle flex items-center gap-1"><Warehouse size={11} /> {centrosDe(p).join(', ')}</p>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAccion(p, esPreparado ? 'Despachado' : 'Preparado'); }}
        disabled={procesando}
        className="w-full mt-2.5 px-3 py-1.5 bg-primary text-primary-fg rounded-md text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
      >
        {procesando ? 'Procesando...' : esPreparado ? 'Despachar' : 'Preparar'}
      </button>
    </article>
  );
}

const COLUMNAS = [
  { estado: 'Confirmado', label: 'Confirmado', dot: 'bg-warning', destinoDrop: 'Preparado' },
  { estado: 'Preparado', label: 'Preparado', dot: 'bg-primary', destinoDrop: null },
];

/**
 * Cola de pedidos vendidos desde stock que fisicamente esta en un Centro de
 * Fulfillment de Gesicomm (ver reservarDesdeUbicacionTracked en
 * envioController). Antes de esto, un pedido asi quedaba vendido pero nadie
 * del lado Gesicomm se enteraba de que tenia que prepararlo.
 */
export default function PedidosPrepararGesicomm() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [centroFiltro, setCentroFiltro] = useState('TODOS');
  const [detalle, setDetalle] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [colSobre, setColSobre] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listarPedidosParaPrepararGesicomm();
      setPedidos(data || []);
      setDetalle((actual) => (actual ? (data || []).find((p) => p.id === actual.id) || null : actual));
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const centrosDisponibles = useMemo(() => {
    const set = new Set();
    pedidos.forEach((p) => centrosDe(p).forEach((c) => set.add(c)));
    return [...set];
  }, [pedidos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (centroFiltro !== 'TODOS' && !centrosDe(p).includes(centroFiltro)) return false;
      if (!q) return true;
      const enComercio = (p.Usuario?.nombre || '').toLowerCase().includes(q);
      const enCliente = nombreCompleto(p).toLowerCase().includes(q);
      const enProducto = lineasDePreparacion(p).some((l) => l.producto.nombre.toLowerCase().includes(q));
      const enPedido = String(numeroPedidoVisible(p)).includes(q);
      return enComercio || enCliente || enProducto || enPedido;
    });
  }, [pedidos, busqueda, centroFiltro]);

  const porPreparar = pedidos.filter((p) => p.estado === 'Confirmado').length;
  const preparados = pedidos.filter((p) => p.estado === 'Preparado').length;

  const avanzarUnPaso = async (pedido, nuevoEstado) => {
    setProcesandoId(pedido.id);
    try {
      await updateEstadoEnvio(pedido.id, { estado: nuevoEstado });
      const mensaje = nuevoEstado === 'Despachado'
        ? `Pedido #${numeroPedidoVisible(pedido)} despachado.`
        : `Pedido #${numeroPedidoVisible(pedido)} marcado como preparado.`;
      toast.success(mensaje);
      setDetalle(null);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo actualizar el pedido.');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleDrop = (col) => {
    setColSobre(null);
    const p = pedidos.find((x) => x.id === draggingId);
    setDraggingId(null);
    if (!p || p.estado !== col.estado || !col.destinoDrop) return;
    avanzarUnPaso(p, col.destinoDrop);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 overflow-hidden">
      <div className="px-6 py-5 bg-surface border-b border-surface-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-fg mb-1">Pedidos a preparar</h1>
          <p className="text-sm text-fg-muted">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} activo{pedidos.length !== 1 ? 's' : ''} · {porPreparar} por preparar · {preparados} preparado{preparados !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={cargar} className="flex items-center gap-2 px-3 py-2 border border-surface-border rounded-lg text-sm font-medium text-fg hover:bg-surface-2">
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      <div className="px-6 py-3 border-b border-surface-border bg-surface flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" size={14} />
          <input
            type="text"
            placeholder="Buscar por pedido, comercio, cliente o producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-surface outline-none focus:border-primary w-72"
          />
        </div>
        {centrosDisponibles.length > 1 && (
          <select
            value={centroFiltro}
            onChange={(e) => setCentroFiltro(e.target.value)}
            className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface outline-none focus:border-primary"
          >
            <option value="TODOS">Todos los centros</option>
            {centrosDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <p className="text-sm text-fg-muted ml-auto">{filtrados.length} de {pedidos.length}</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-fg-muted">
            <RefreshCw className="animate-spin mr-2" size={20} /> Cargando...
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-fg-muted gap-2">
            <CheckCircle2 size={32} className="opacity-30" />
            <p>No hay pedidos pendientes de preparación en Gesicomm.</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, minmax(380px, 440px))', justifyContent: 'start' }}>
            {COLUMNAS.map((col) => {
              const items = filtrados.filter((p) => p.estado === col.estado);
              const pedidoArrastrado = draggingId ? pedidos.find((p) => p.id === draggingId) : null;
              const esDestinoValido = pedidoArrastrado && pedidoArrastrado.estado === 'Confirmado' && col.estado === 'Preparado';
              const hayArrastre = !!draggingId;
              return (
                <div
                  key={col.estado}
                  onDragOver={(e) => { if (esDestinoValido) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setColSobre(col.estado); } }}
                  onDragLeave={() => setColSobre((c) => (c === col.estado ? null : c))}
                  onDrop={(e) => { if (esDestinoValido) { e.preventDefault(); handleDrop(col); } }}
                  className={`border rounded-xl flex flex-col max-h-[calc(100vh-320px)] transition-colors ${
                    colSobre === col.estado ? 'border-primary bg-primary/5' :
                    hayArrastre && !esDestinoValido ? 'border-surface-border bg-surface-50 opacity-40' :
                    'border-surface-border bg-surface-50'
                  }`}
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
                    <h3 className="m-0 text-sm font-semibold text-fg flex-1">{col.label}</h3>
                    <span className="text-xs font-medium text-fg-muted bg-surface-2 px-1.5 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[120px]">
                    {items.length === 0 ? (
                      <div className="flex items-center justify-center h-16 text-xs text-fg-subtle">
                        <Package size={14} className="mr-1 opacity-40" /> Vacío
                      </div>
                    ) : (
                      items.map((p) => (
                        <PedidoCard
                          key={p.id}
                          p={p}
                          onAbrir={setDetalle}
                          onAccion={avanzarUnPaso}
                          arrastrable={p.estado === 'Confirmado'}
                          onDragStart={setDraggingId}
                          onDragEnd={() => { setDraggingId(null); setColSobre(null); }}
                          dragging={draggingId === p.id}
                          procesando={procesandoId === p.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DetalleModal
        pedido={detalle}
        onClose={() => setDetalle(null)}
        onAvanzar={avanzarUnPaso}
        onCambio={cargar}
        procesando={procesandoId === detalle?.id}
      />
    </div>
  );
}
