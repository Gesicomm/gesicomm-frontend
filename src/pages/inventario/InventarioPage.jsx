import React, { useState, useEffect } from 'react';
import { Package, Truck, ArrowRight, ArrowLeftRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function InventarioPage() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' o 'ingresos'
  const [stock, setStock] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gesicom_token');
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'stock') {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/inventario/stock/listado`, {}, { headers });
        setStock(data);
      } else {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/inventario/ingresos/listado`, {}, { headers });
        setIngresos(data);
      }
    } catch (error) {
      console.error('Error cargando inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      BORRADOR: 'bg-surface text-fg border-surface-border',
      PENDIENTE_ENVIO: 'bg-warning/10 text-warning-text border-warning/20',
      EN_TRANSITO: 'bg-primary/10 text-primary-text border-primary/20',
      RECIBIDO: 'bg-info/10 text-info-text border-info/20',
      EN_VALIDACION: 'bg-warning/10 text-warning-text border-warning/20',
      CON_DIFERENCIAS: 'bg-danger/10 text-danger-text border-danger/20',
      DISPONIBLE: 'bg-success/10 text-success-text border-success/20'
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full border ${badges[estado] || badges.BORRADOR}`}>{estado.replace(/_/g, ' ')}</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 overflow-hidden">
      <div className="px-6 py-5 bg-surface border-b border-surface-border">
        <h1 className="text-xl font-bold text-fg mb-1">Inventario y Fulfillment</h1>
        <p className="text-sm text-fg-muted">Gestioná tu stock almacenado en Gesicomm y tus ingresos de mercadería.</p>
      </div>

      <div className="px-6 py-4 border-b border-surface-border bg-surface flex items-center justify-between">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${
              activeTab === 'stock'
                ? 'bg-primary text-primary-text'
                : 'text-fg-muted hover:bg-surface-2'
            }`}
          >
            Stock en Gesicomm
          </button>
          <button
            onClick={() => setActiveTab('ingresos')}
            className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${
              activeTab === 'ingresos'
                ? 'bg-primary text-primary-text'
                : 'text-fg-muted hover:bg-surface-2'
            }`}
          >
            Ingresos (Inbound)
          </button>
        </div>

        {activeTab === 'ingresos' && (
          <button
            onClick={() => navigate('/inventario/nuevo')}
            className="flex items-center gap-2 bg-primary text-primary-text px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Package size={16} />
            Nuevo Ingreso
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-fg-muted">
            <RefreshCw className="animate-spin mb-2" size={24} />
            <p>Cargando información...</p>
          </div>
        ) : activeTab === 'stock' ? (
          <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-surface-border">
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Producto</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Centro Gesicomm</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Disponible</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Reservado</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Total Físico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {stock.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-fg-muted">
                      No tenés stock almacenado en la red de Fulfillment de Gesicomm actualmente.
                    </td>
                  </tr>
                ) : (
                  stock.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.Producto?.imagen_principal ? (
                            <img src={s.Producto.imagen_principal} alt={s.Producto.nombre} className="w-10 h-10 rounded-md object-cover bg-surface-2" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-surface-2 flex items-center justify-center text-fg-subtle">
                              <Package size={20} />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm text-fg">{s.Producto?.nombre}</p>
                            {s.ProductoVariante && (
                              <p className="text-xs text-fg-muted">{s.ProductoVariante.sku || 'Variante'}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-fg">{s.Deposito?.nombre}</td>
                      <td className="px-4 py-3 font-semibold text-success-text">{s.cantidad_disponible}</td>
                      <td className="px-4 py-3 font-medium text-warning-text">{s.cantidad_reservada}</td>
                      <td className="px-4 py-3 font-bold text-fg">{s.cantidad_disponible + s.cantidad_reservada}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-surface-border">
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Centro Destino</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Items / Cantidad</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Fecha Creación</th>
                  <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Actualización</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {ingresos.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-fg-muted">
                      No tenés ingresos registrados. ¡Creá uno nuevo para mandar tu stock a Gesicomm!
                    </td>
                  </tr>
                ) : (
                  ingresos.map((ing) => {
                    const totalUnidades = ing.items?.reduce((acc, it) => acc + it.cantidad_declarada, 0) || 0;
                    return (
                      <tr key={ing.id} className="hover:bg-surface-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-sm text-fg">ING-{ing.id.toString().padStart(4, '0')}</td>
                        <td className="px-4 py-3 text-sm text-fg">{ing.centro?.nombre}</td>
                        <td className="px-4 py-3 text-sm text-fg">{ing.items?.length || 0} items ({totalUnidades} u.)</td>
                        <td className="px-4 py-3">{getEstadoBadge(ing.estado)}</td>
                        <td className="px-4 py-3 text-xs text-fg-muted">{formatearFecha(ing.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-fg-muted">{formatearFecha(ing.updatedAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-primary hover:underline text-sm font-medium">Ver detalle</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
