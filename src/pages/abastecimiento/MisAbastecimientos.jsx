import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { RefreshCw, Package, Truck, Warehouse, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { solicitudAbastecimientoService } from '../../services/solicitudAbastecimiento.service';

const PAGE_SIZE = 20;

const ESTADO_BADGE = {
  pendiente_pago: 'bg-warning/10 text-warning-text border-warning/20',
  pago_enviado: 'bg-info/10 text-info-text border-info/20',
  pago_rechazado: 'bg-danger/10 text-danger-text border-danger/20',
  disponible_en_gesicomm: 'bg-success/10 text-success-text border-success/20',
  recibido_en_deposito_cliente: 'bg-success/10 text-success-text border-success/20',
};

const ESTADOS = [
  ['TODOS', 'Todos los estados'],
  ['pendiente_pago', 'Pendiente de pago'],
  ['pago_enviado', 'Pago enviado'],
  ['pago_rechazado', 'Pago rechazado'],
  ['pago_validado', 'Pago validado'],
  ['proveedor_contactado', 'Proveedor contactado'],
  ['enviado_por_proveedor', 'Enviado por proveedor'],
  ['en_transito_a_gesicomm', 'En tránsito a Gesicomm'],
  ['recibido_en_gesicomm', 'Recibido en Gesicomm'],
  ['preparando_envio_a_deposito_cliente', 'Preparando envío'],
  ['despachado_a_deposito_cliente', 'Despachado'],
  ['en_transito_a_deposito_cliente', 'En tránsito a mi depósito'],
  ['disponible_en_gesicomm', 'Disponible en Gesicomm'],
  ['recibido_en_deposito_cliente', 'Recibido en mi depósito'],
];

function EstadoBadge({ estado }) {
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${ESTADO_BADGE[estado] || 'bg-primary/10 text-primary-text border-primary/20'}`}>
      {(estado || '').replace(/_/g, ' ')}
    </span>
  );
}

function formatGs(n) {
  return Math.round(Number(n) || 0).toLocaleString('es-PY');
}

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Paginador({ pagina, totalPaginas, onCambiar }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
      <p className="text-xs text-fg-muted">Página {pagina} de {totalPaginas}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina <= 1}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-surface-border rounded-md disabled:opacity-40 hover:bg-surface-2"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <button
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-surface-border rounded-md disabled:opacity-40 hover:bg-surface-2"
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function productoNombre(s) {
  const producto = s.producto?.nombre || 'Producto';
  return s.variante?.nombre ? `${producto} · ${s.variante.nombre}` : producto;
}

function destinoLabel(s) {
  if (s.tipo_logistica === 'GESICOMM') {
    return s.centroGesicomm?.nombre ? `Centro Gesicomm · ${s.centroGesicomm.nombre}` : 'Centro Gesicomm';
  }
  return `Mi depósito · ${s.depositoDestino?.nombre || 'Sin depósito'}`;
}

/** Comercio: sus propias solicitudes de abastecimiento (Camino 3). */
export default function MisAbastecimientos() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('TODOS');
  const [tipoLogistica, setTipoLogistica] = useState('TODOS');
  const textoDebounced = useDebounce(busqueda, 350);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await solicitudAbastecimientoService.listar({
        texto: textoDebounced || undefined,
        estado: estado === 'TODOS' ? undefined : estado,
        tipoLogistica: tipoLogistica === 'TODOS' ? undefined : tipoLogistica,
        page: pagina,
        limit: PAGE_SIZE,
      });
      setSolicitudes(data.solicitudes || []);
      setTotalPaginas(data.total_paginas || 1);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudieron cargar tus solicitudes.');
    } finally {
      setLoading(false);
    }
  }, [textoDebounced, estado, tipoLogistica, pagina]);

  useEffect(() => { setPagina(1); }, [textoDebounced, estado, tipoLogistica]);
  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 overflow-hidden">
      <div className="px-6 py-5 bg-surface border-b border-surface-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-fg mb-1">Compras a Gesicomm</h1>
          <p className="text-sm text-fg-muted">
            Acá ves los productos del catálogo Gesicomm que compraste o pediste abastecer, con pago, destino y estado del proceso.
          </p>
        </div>
        <button onClick={cargar} className="flex items-center gap-2 px-3 py-2 border border-surface-border rounded-lg text-sm font-medium text-fg hover:bg-surface-2">
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" size={14} />
              <input
                type="text"
                placeholder="Buscar producto, destino o #ID..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-surface outline-none focus:border-primary w-72"
              />
            </div>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface outline-none focus:border-primary"
            >
              {ESTADOS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase text-fg-muted">Destino</p>
              <div className="flex items-center gap-1 bg-surface border border-surface-border rounded-lg p-1">
                {[['TODOS', 'Todos'], ['GESICOMM', 'Centro Gesicomm'], ['PROPIA', 'Mi depósito']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTipoLogistica(val)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tipoLogistica === val ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-2'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm text-fg-muted">{total} abastecimiento{total === 1 ? '' : 's'}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-fg-muted">
            <RefreshCw className="animate-spin mr-2" size={20} /> Cargando...
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-fg-muted gap-2">
            <Package size={32} className="opacity-30" />
            <p>No hay abastecimientos que coincidan con estos filtros.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-surface-border">
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Solicitud</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Producto</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase text-right">Pedido</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Destino</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {solicitudes.map((s) => {
                  const total = (Number(s.costo_producto) || 0) + (Number(s.costo_logistico) || 0);
                  return (
                    <tr key={s.id} className="hover:bg-surface-50 transition-colors cursor-pointer" onClick={() => navigate(`/mis-abastecimientos/${s.id}`)}>
                      <td className="px-4 py-3 font-medium text-sm text-fg">#{s.id}</td>
                      <td className="px-4 py-3 text-sm text-fg">{productoNombre(s)}</td>
                      <td className="px-4 py-3 text-sm text-fg text-right">{s.cantidad}</td>
                      <td className="px-4 py-3 text-sm text-fg flex items-center gap-1.5">
                        {s.tipo_logistica === 'GESICOMM' ? <Truck size={13} className="text-fg-muted" /> : <Warehouse size={13} className="text-fg-muted" />}
                        {destinoLabel(s)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-fg">Gs. {formatGs(total)}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={s.estado} /></td>
                      <td className="px-4 py-3 text-xs text-fg-muted">{formatFecha(s.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
          </div>
        )}
      </div>
    </div>
  );
}
