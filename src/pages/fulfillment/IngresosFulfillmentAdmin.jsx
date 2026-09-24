import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { RefreshCw, Package, Warehouse } from 'lucide-react';
import { inventarioService } from '../../services/inventario.service';

const ESTADO_BADGE = {
  BORRADOR: 'bg-surface text-fg border-surface-border',
  PENDIENTE_ENVIO: 'bg-warning/10 text-warning-text border-warning/20',
  EN_TRANSITO: 'bg-primary/10 text-primary-text border-primary/20',
  RECIBIDO: 'bg-info/10 text-info-text border-info/20',
  EN_VALIDACION: 'bg-warning/10 text-warning-text border-warning/20',
  CON_DIFERENCIAS: 'bg-danger/10 text-danger-text border-danger/20',
  DISPONIBLE: 'bg-success/10 text-success-text border-success/20',
};

function EstadoBadge({ estado }) {
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${ESTADO_BADGE[estado] || ESTADO_BADGE.BORRADOR}`}>
      {(estado || '').replace(/_/g, ' ')}
    </span>
  );
}

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TABS = [
  { id: 'POR_RECIBIR', label: 'Por recibir', estados: ['PENDIENTE_ENVIO', 'EN_TRANSITO'] },
  { id: 'EN_VALIDACION', label: 'En validacion', estados: ['RECIBIDO', 'EN_VALIDACION'] },
  { id: 'CON_DIFERENCIAS', label: 'Con diferencias', estados: ['CON_DIFERENCIAS'] },
  { id: 'DISPONIBLE', label: 'Disponibles', estados: ['DISPONIBLE'] },
  { id: 'TODOS', label: 'Todos', estados: null },
];

/**
 * Bandeja admin del inbound (Camino 2): ingresos de stock propio del
 * comercio hacia un Centro de Fulfillment de Gesicomm. Antes de esto no
 * existia ninguna pantalla que permitiera avanzar estos ingresos despues de
 * que el comercio los enviaba — quedaban atascados en PENDIENTE_ENVIO.
 */
export default function IngresosFulfillmentAdmin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('POR_RECIBIR');
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await inventarioService.listarIngresos({});
      setIngresos(data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudieron cargar los ingresos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const tabActiva = TABS.find((t) => t.id === tab);
  const filtrados = tabActiva.estados
    ? ingresos.filter((i) => tabActiva.estados.includes(i.estado))
    : ingresos;

  const conteoPorTab = (t) => (t.estados ? ingresos.filter((i) => t.estados.includes(i.estado)).length : ingresos.length);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 overflow-hidden">
      <div className="px-6 py-5 bg-surface border-b border-surface-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-fg mb-1">Ingresos a Fulfillment</h1>
          <p className="text-sm text-fg-muted">Stock propio que los comercios envian a los centros de Gesicomm.</p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-3 py-2 border border-surface-border rounded-lg text-sm font-medium text-fg hover:bg-surface-2"
        >
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      <div className="px-6 py-3 border-b border-surface-border bg-surface flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'btn-primary' : 'btn-secondary'}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/30 text-white font-bold' : 'bg-surface-2 text-fg-muted'}`}>
              {conteoPorTab(t)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-surface-border">
                <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Comercio</th>
                <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Centro destino</th>
                <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Items / Cantidad</th>
                <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Estado</th>
                <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-fg-muted">
                  <RefreshCw className="animate-spin inline mr-2" size={16} /> Cargando...
                </td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-fg-muted">No hay ingresos en este estado.</td></tr>
              ) : (
                filtrados.map((ing) => {
                  const totalUnidades = ing.items?.reduce((acc, it) => acc + (it.cantidad_declarada || 0), 0) || 0;
                  return (
                    <tr
                      key={ing.id}
                      className="hover:bg-surface-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/fulfillment/ingresos/${ing.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-sm text-fg">ING-{String(ing.id).padStart(4, '0')}</td>
                      <td className="px-4 py-3 text-sm text-fg">{ing.Usuario?.nombre || '—'}</td>
                      <td className="px-4 py-3 text-sm text-fg flex items-center gap-1.5">
                        <Warehouse size={13} className="text-fg-muted" /> {ing.centro?.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-fg flex items-center gap-1.5">
                        <Package size={13} className="text-fg-muted" /> {ing.items?.length || 0} items ({totalUnidades} u.)
                      </td>
                      <td className="px-4 py-3"><EstadoBadge estado={ing.estado} /></td>
                      <td className="px-4 py-3 text-xs text-fg-muted">{formatFecha(ing.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-primary hover:underline text-sm font-medium">Ver detalle</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
