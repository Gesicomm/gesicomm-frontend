import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { RefreshCw, Package, Truck, Warehouse, CheckCircle2, XCircle, ArrowRight, FileText, Search, GripVertical } from 'lucide-react';
import { solicitudAbastecimientoService } from '../../services/solicitudAbastecimiento.service';

function formatGs(n) {
  return Math.round(Number(n) || 0).toLocaleString('es-PY');
}

const CTA_AVANZAR = {
  pago_validado: 'Contactar proveedor',
  proveedor_contactado: 'Marcar enviado por proveedor',
  enviado_por_proveedor: 'Marcar en tránsito a Gesicom',
  en_transito_a_gesicomm: 'Marcar recibido en Gesicomm',
  recibido_en_gesicomm: 'Preparar / acreditar',
  preparando_envio_a_deposito_cliente: 'Marcar despachado',
  despachado_a_deposito_cliente: 'Marcar en tránsito',
};

// Una columna por CADA estado real de la maquina de estados (ver
// services/abastecimiento/estadoMachine.js) — antes agrupaba varios estados
// en "En proceso" y se perdia en que paso exacto estaba cada solicitud.
const COLUMNAS = [
  { estado: 'pendiente_pago', label: 'Pendiente de pago', dot: 'bg-warning' },
  { estado: 'pago_rechazado', label: 'Pago rechazado', dot: 'bg-danger' },
  { estado: 'pago_enviado', label: 'A validar', dot: 'bg-info' },
  { estado: 'pago_validado', label: 'Pago validado', dot: 'bg-primary' },
  { estado: 'proveedor_contactado', label: 'Proveedor contactado', dot: 'bg-primary' },
  { estado: 'enviado_por_proveedor', label: 'Enviado por proveedor', dot: 'bg-primary' },
  { estado: 'en_transito_a_gesicomm', label: 'En tránsito a Gesicom', dot: 'bg-primary' },
  { estado: 'recibido_en_gesicomm', label: 'Recibido en Gesicomm', dot: 'bg-primary' },
  { estado: 'preparando_envio_a_deposito_cliente', label: 'Preparando envío', dot: 'bg-primary' },
  { estado: 'despachado_a_deposito_cliente', label: 'Despachado', dot: 'bg-primary' },
  { estado: 'en_transito_a_deposito_cliente', label: 'En tránsito al depósito', dot: 'bg-primary' },
  { estado: 'disponible_en_gesicomm', label: 'Disponible en Gesicomm', dot: 'bg-success' },
  { estado: 'recibido_en_deposito_cliente', label: 'Recibido en depósito', dot: 'bg-success' },
];

/**
 * Espejo, solo para decidir donde se puede soltar una card, de las
 * transiciones que el ADMIN puede disparar (ver estadoMachine.js:
 * TRANSICIONES, filtradas a ACTORES.ADMIN). La validacion real sigue
 * siendo del backend — esto solo evita ofrecer un drop que el backend
 * va a rechazar. Estados donde solo el COMERCIO puede actuar
 * (pendiente_pago, pago_rechazado, en_transito_a_deposito_cliente) no
 * tienen destino admin: esas cards no se pueden arrastrar.
 */
function proximoEstadoAdmin(estado, tipoLogistica) {
  const MAPA = {
    pago_enviado: ['pago_validado', 'pago_rechazado'],
    pago_validado: ['proveedor_contactado'],
    proveedor_contactado: ['enviado_por_proveedor'],
    enviado_por_proveedor: ['en_transito_a_gesicomm'],
    en_transito_a_gesicomm: ['recibido_en_gesicomm'],
    recibido_en_gesicomm: [tipoLogistica === 'GESICOMM' ? 'disponible_en_gesicomm' : 'preparando_envio_a_deposito_cliente'],
    preparando_envio_a_deposito_cliente: ['despachado_a_deposito_cliente'],
    despachado_a_deposito_cliente: ['en_transito_a_deposito_cliente'],
  };
  return MAPA[estado] || [];
}

function SolicitudCard({ s, onAbrir, onValidar, onRechazar, onAvanzar, procesando, arrastrable, onDragStart, onDragEnd, dragging }) {
  const total = (Number(s.costo_producto) || 0) + (Number(s.costo_logistico) || 0);
  const detener = (fn) => (e) => { e.stopPropagation(); fn(s); };

  return (
    <article
      draggable={arrastrable}
      onDragStart={arrastrable ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(s.id); } : undefined}
      onDragEnd={onDragEnd}
      onClick={() => onAbrir(s)}
      className={`bg-surface border border-surface-border rounded-lg p-3 transition-colors shadow-sm ${
        arrastrable ? 'cursor-grab active:cursor-grabbing hover:border-primary/50' : 'cursor-pointer hover:border-primary/50'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1">
          {arrastrable && <GripVertical size={12} className="text-fg-subtle -ml-1" />}
          <span className="text-xs font-semibold text-fg-subtle">#{s.id}</span>
        </div>
        <span className="text-xs font-bold text-primary">Gs. {formatGs(total)}</span>
      </div>
      <p className="text-sm font-medium text-fg leading-snug mb-0.5">{s.producto?.nombre || 'Producto'}</p>
      <p className="text-xs text-fg-muted mb-2">x{s.cantidad} · {s.Usuario?.nombre || 'Comercio'}</p>
      <div className="flex items-center gap-1.5 text-[11px] text-fg-subtle mb-2">
        {s.tipo_logistica === 'GESICOMM' ? <Truck size={11} /> : <Warehouse size={11} />}
        {s.tipo_logistica === 'GESICOMM' ? 'Centro Gesicomm' : (s.depositoDestino?.nombre || 'Depósito propio')}
      </div>

      {s.comprobante_url && (
        <a
          href={s.comprobante_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-[11px] text-primary hover:underline mb-2 w-fit"
        >
          <FileText size={11} /> Ver comprobante
        </a>
      )}

      {s.estado === 'pago_enviado' && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-surface-border">
          <button
            type="button"
            onClick={detener(onValidar)}
            disabled={procesando}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-success text-white rounded-md text-xs font-medium hover:bg-success/90 disabled:opacity-50"
          >
            <CheckCircle2 size={12} /> Validar
          </button>
          <button
            type="button"
            onClick={detener(onRechazar)}
            disabled={procesando}
            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-danger text-white rounded-md text-xs font-medium hover:bg-danger/90 disabled:opacity-50"
          >
            <XCircle size={12} />
          </button>
        </div>
      )}

      {(s.estado === 'pendiente_pago' || s.estado === 'pago_rechazado') && (
        <p className="text-[11px] text-fg-subtle pt-2 border-t border-surface-border">Esperando al comercio.</p>
      )}

      {s.estado === 'en_transito_a_deposito_cliente' && (
        <p className="text-[11px] text-fg-subtle pt-2 border-t border-surface-border">Esperando confirmación del comercio.</p>
      )}

      {CTA_AVANZAR[s.estado] && (
        <button
          type="button"
          onClick={detener(onAvanzar)}
          disabled={procesando}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 mt-2 pt-2 border-t border-surface-border bg-transparent text-primary text-xs font-medium hover:bg-primary/5 rounded-md disabled:opacity-50"
        >
          {CTA_AVANZAR[s.estado]} <ArrowRight size={11} />
        </button>
      )}
    </article>
  );
}

/** Admin: solicitudes de abastecimiento del Camino 3 (producto Gesicomm -> comercio), como tablero Kanban. */
export function SolicitudesAbastecimientoPanel() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [tipoLogisticaFiltro, setTipoLogisticaFiltro] = useState('TODOS'); // TODOS | GESICOMM | PROPIA
  const [draggingId, setDraggingId] = useState(null);
  const [colSobre, setColSobre] = useState(null);

  // Auto-scroll horizontal del tablero mientras se arrastra una card cerca
  // de un borde — con 13 columnas, la mayoria no entra en pantalla y sin
  // esto habria que soltar, scrollear a mano y volver a agarrar la card.
  const scrollRef = useRef(null);
  const autoScrollRaf = useRef(null);
  const pointerXRef = useRef(null);

  const tickAutoScroll = useCallback(() => {
    const el = scrollRef.current;
    const x = pointerXRef.current;
    if (!el || x == null) { autoScrollRaf.current = null; return; }
    const rect = el.getBoundingClientRect();
    const EDGE = 90;
    const MAX_SPEED = 16;
    let speed = 0;
    if (x < rect.left + EDGE) {
      speed = -MAX_SPEED * (1 - Math.max(0, x - rect.left) / EDGE);
    } else if (x > rect.right - EDGE) {
      speed = MAX_SPEED * (1 - Math.max(0, rect.right - x) / EDGE);
    }
    if (speed !== 0) el.scrollLeft += speed;
    autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
  }, []);

  const detenerAutoScroll = useCallback(() => {
    pointerXRef.current = null;
    if (autoScrollRaf.current) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  }, []);

  useEffect(() => () => detenerAutoScroll(), [detenerAutoScroll]);

  const handleBoardDragOver = (e) => {
    pointerXRef.current = e.clientX;
    if (draggingId && !autoScrollRaf.current) {
      autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
    }
  };

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await solicitudAbastecimientoService.listar();
      setSolicitudes(data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return solicitudes.filter((s) => {
      if (tipoLogisticaFiltro !== 'TODOS' && s.tipo_logistica !== tipoLogisticaFiltro) return false;
      if (!q) return true;
      const enComercio = (s.Usuario?.nombre || '').toLowerCase().includes(q);
      const enProducto = (s.producto?.nombre || '').toLowerCase().includes(q);
      const enId = String(s.id).includes(q);
      return enComercio || enProducto || enId;
    });
  }, [solicitudes, busqueda, tipoLogisticaFiltro]);

  const solicitudArrastrada = draggingId ? solicitudes.find((s) => s.id === draggingId) : null;
  const columnasValidasParaDrop = solicitudArrastrada
    ? new Set(proximoEstadoAdmin(solicitudArrastrada.estado, solicitudArrastrada.tipo_logistica))
    : new Set();

  const onAbrir = (s) => navigate(`/abastecimiento/solicitudes/${s.id}`);

  const ejecutar = async (id, accion) => {
    setProcesandoId(id);
    try {
      await accion();
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar la acción.');
    } finally {
      setProcesandoId(null);
    }
  };

  const onValidar = (s) => ejecutar(s.id, () => solicitudAbastecimientoService.validarPago(s.id));
  const onRechazar = (s) => {
    const motivo = window.prompt('Motivo del rechazo (lo ve el comercio):', '');
    if (!motivo) return;
    ejecutar(s.id, () => solicitudAbastecimientoService.rechazarPago(s.id, motivo));
  };
  const onAvanzar = (s) => {
    if (s.estado === 'recibido_en_gesicomm' && s.tipo_logistica === 'GESICOMM') {
      onAbrir(s); // ese paso pide el centro destino, no se puede resolver desde la card
      return;
    }
    ejecutar(s.id, () => solicitudAbastecimientoService.avanzar(s.id));
  };

  const handleDrop = (colEstado) => {
    setColSobre(null);
    detenerAutoScroll();
    const s = solicitudArrastrada;
    setDraggingId(null);
    if (!s) return;
    if (!columnasValidasParaDrop.has(colEstado)) return; // columna invalida: no se avisa, ya se veia deshabilitada

    if (colEstado === 'pago_rechazado') { onRechazar(s); return; }
    if (colEstado === 'pago_validado') { onValidar(s); return; }
    if (colEstado === 'disponible_en_gesicomm') {
      const centroId = window.prompt('¿A qué Centro Gesicomm llegó? Indicá su ID:', '');
      if (!centroId || isNaN(parseInt(centroId, 10))) return;
      ejecutar(s.id, () => solicitudAbastecimientoService.avanzar(s.id, parseInt(centroId, 10)));
      return;
    }
    ejecutar(s.id, () => solicitudAbastecimientoService.avanzar(s.id));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" size={14} />
            <input
              type="text"
              placeholder="Buscar por comercio, producto o #ID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-surface outline-none focus:border-primary w-64"
            />
          </div>
          <div className="flex gap-1 bg-surface-2 rounded-lg p-1">
            {[['TODOS', 'Todos'], ['GESICOMM', 'Centro Gesicomm'], ['PROPIA', 'Depósito propio']].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTipoLogisticaFiltro(val)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  tipoLogisticaFiltro === val ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-3'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-fg-muted whitespace-nowrap">{filtradas.length} de {solicitudes.length}</p>
          <button onClick={cargar} className="flex items-center gap-2 px-3 py-2 border border-surface-border rounded-lg text-sm font-medium text-fg hover:bg-surface-2">
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-fg-muted">
          <RefreshCw className="animate-spin mr-2" size={20} /> Cargando...
        </div>
      ) : (
        <div ref={scrollRef} onDragOver={handleBoardDragOver} className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNAS.map((col) => {
            const items = filtradas.filter((s) => s.estado === col.estado);
            const esDestinoValido = draggingId && columnasValidasParaDrop.has(col.estado);
            const hayArrastre = !!draggingId;
            return (
              <div
                key={col.estado}
                onDragOver={(e) => { if (esDestinoValido) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setColSobre(col.estado); } }}
                onDragLeave={() => setColSobre((c) => (c === col.estado ? null : c))}
                onDrop={(e) => { if (esDestinoValido) { e.preventDefault(); handleDrop(col.estado); } }}
                className={`flex-shrink-0 w-[260px] border rounded-xl flex flex-col max-h-[calc(100vh-260px)] transition-colors ${
                  colSobre === col.estado ? 'border-primary bg-primary/5' :
                  hayArrastre && !esDestinoValido ? 'border-surface-border bg-surface-50 opacity-40' :
                  'border-surface-border bg-surface-50'
                }`}
              >
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-surface-border flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
                  <h3 className="m-0 text-xs font-semibold text-fg flex-1 leading-tight">{col.label}</h3>
                  <span className="text-xs font-medium text-fg-muted bg-surface-2 px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
                  {items.length === 0 ? (
                    <div className="flex items-center justify-center h-16 text-xs text-fg-subtle">
                      <Package size={14} className="mr-1 opacity-40" /> Vacío
                    </div>
                  ) : (
                    items.map((s) => (
                      <SolicitudCard
                        key={s.id}
                        s={s}
                        onAbrir={onAbrir}
                        onValidar={onValidar}
                        onRechazar={onRechazar}
                        onAvanzar={onAvanzar}
                        procesando={procesandoId === s.id}
                        arrastrable={proximoEstadoAdmin(s.estado, s.tipo_logistica).length > 0}
                        onDragStart={setDraggingId}
                        onDragEnd={() => { setDraggingId(null); setColSobre(null); detenerAutoScroll(); }}
                        dragging={draggingId === s.id}
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
  );
}
