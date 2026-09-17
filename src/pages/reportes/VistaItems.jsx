import React, { useState, useEffect } from 'react';
import { reportesService } from '../../services/reportesApi';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import { ChevronRight, ChevronLeft, Package, Sparkles, TrendingUp, Search } from 'lucide-react';

function formatFecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export default function VistaItems({ filtros }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginacion, setPaginacion] = useState({ actual: 1, total: 1, paginas: 1 });
  const [localSearch, setLocalSearch] = useState({ buscador: '', fecha_desde: '', fecha_hasta: '' });

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarDatos(1);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [filtros, localSearch]);

  const cargarDatos = async (pagina) => {
    setLoading(true);
    try {
      const payload = { ...filtros, pagina, limite: 10 };
      if (localSearch.buscador) payload.buscador = localSearch.buscador;
      if (localSearch.fecha_desde) payload.fecha_desde = localSearch.fecha_desde;
      if (localSearch.fecha_hasta) payload.fecha_hasta = localSearch.fecha_hasta;

      const data = await reportesService.obtenerItems(payload);
      setItems(data.items || []);
      setPaginacion({ actual: data.actual, total: data.total, paginas: data.paginas });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--vit-bg)]">
      {/* TOOLBAR LOCAL */}
      <div className="p-4 border-b border-[var(--vit-border)] bg-[var(--vit-surface)] flex gap-3 flex-wrap items-end shrink-0">
        <div className="flex-1 min-w-[200px] relative">
          <label className="block text-xs font-semibold text-[var(--vit-muted)] uppercase mb-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--vit-muted)]" size={14} />
            <input
              type="text"
              placeholder="Cliente, # Pedido o Teléfono..."
              className="w-full bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-md pl-8 pr-3 py-1.5 text-sm text-[var(--vit-text)] placeholder:text-[var(--vit-muted-2)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
              value={localSearch.buscador}
              onChange={e => setLocalSearch(prev => ({ ...prev, buscador: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--vit-muted)] uppercase mb-1">Desde</label>
          <input
            type="date"
            className="bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-md px-3 py-1.5 text-sm text-[var(--vit-text)] focus:outline-none focus:border-blue-500/50"
            value={localSearch.fecha_desde}
            onChange={e => setLocalSearch(prev => ({ ...prev, fecha_desde: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--vit-muted)] uppercase mb-1">Hasta</label>
          <input
            type="date"
            className="bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-md px-3 py-1.5 text-sm text-[var(--vit-text)] focus:outline-none focus:border-blue-500/50"
            value={localSearch.fecha_hasta}
            onChange={e => setLocalSearch(prev => ({ ...prev, fecha_hasta: e.target.value }))}
          />
        </div>
        { (localSearch.buscador || localSearch.fecha_desde || localSearch.fecha_hasta) && (
          <button
            onClick={() => setLocalSearch({ buscador: '', fecha_desde: '', fecha_hasta: '' })}
            className="text-xs text-[var(--vit-muted)] hover:text-red-400 font-medium px-2 py-1.5 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 bg-[var(--vit-card-bg)] z-10 shadow-sm">
            <tr>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Pedido</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Fecha</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Producto</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Variante/SKU</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Rol Comercial</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] text-right">Cant.</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] text-right">Precio Unit.</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] text-right">Desc.</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] text-right">Venta Neta</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="p-8 text-center text-[var(--vit-muted)]">Cargando ítems...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="9" className="p-8 text-center text-[var(--vit-muted)]">No hay ítems entregados para estos filtros.</td></tr>
            ) : (
              items.map(it => {
                const oferta = it.Ofertum || it.Oferta;
                const esBase = !oferta;
                const rol = esBase ? 'Base' :
                            oferta.estrategia === 'order_bump' ? 'Order Bump' :
                            oferta.estrategia === 'upsell' ? 'Upsell' : 'Base';
                const icono = esBase ? <Package size={13} className="inline mr-1 text-blue-400" /> :
                              oferta.estrategia === 'order_bump' ? <Sparkles size={13} className="inline mr-1 text-orange-400" /> :
                              <TrendingUp size={13} className="inline mr-1 text-pink-400" />;

                const varianteTexto = it.Variante ? (it.Variante.sku ? `${it.Variante.nombre} (${it.Variante.sku})` : it.Variante.nombre) : (it.Producto?.sku || '-');
                
                const precioBase = it.precio_normal || it.precio_unitario || 0;
                const totalBase = precioBase * it.cantidad;
                const ventaNeta = it.subtotal || 0;
                const descuento = totalBase > ventaNeta ? totalBase - ventaNeta : 0;

                return (
                  <tr key={it.id} className="border-b border-[var(--vit-border)] hover:bg-[var(--vit-bg-secondary)] transition-colors">
                    <td className="p-4 font-mono font-bold text-[var(--vit-text)]">
                      {it.Envio?.numero_pedido ? `#${it.Envio.numero_pedido}` : `#${it.envio_id}`}
                    </td>
                    <td className="p-4 text-[var(--vit-text)]">
                      <div>{formatFecha(it.Envio?.fecha)}</div>
                      {it.Envio?.hora && <div className="text-xs text-[var(--vit-muted)]">{it.Envio.hora}</div>}
                    </td>
                    <td className="p-4 font-medium text-[var(--vit-text)]">{it.nombre_producto}</td>
                    <td className="p-4 text-[var(--vit-text)] text-xs text-[var(--vit-muted)]">{varianteTexto}</td>
                    <td className="p-4 text-[var(--vit-text)]">{icono}{rol}</td>
                    <td className="p-4 text-right text-[var(--vit-text)]">{it.cantidad}</td>
                    <td className="p-4 text-right text-[var(--vit-text)]">{formatPrecio(precioBase)}</td>
                    <td className="p-4 text-right text-orange-400">{descuento > 0 ? `-${formatPrecio(descuento)}` : '-'}</td>
                    <td className="p-4 text-right font-bold text-[var(--vit-text)]">{formatPrecio(ventaNeta)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      {paginacion.paginas > 1 && (
        <div className="p-4 border-t border-[var(--vit-border)] bg-[var(--vit-surface)] flex justify-between items-center shrink-0">
          <span className="text-sm text-[var(--vit-muted)]">
            Página {paginacion.actual} de {paginacion.paginas} ({paginacion.total} ítems)
          </span>
          <div className="flex gap-2">
            <button
              disabled={paginacion.actual === 1}
              onClick={() => cargarDatos(paginacion.actual - 1)}
              className="p-1.5 rounded bg-[var(--vit-bg)] border border-[var(--vit-border)] disabled:opacity-50"
            >
              <ChevronLeft size={16} className="text-[var(--vit-text)]" />
            </button>
            <button
              disabled={paginacion.actual === paginacion.paginas}
              onClick={() => cargarDatos(paginacion.actual + 1)}
              className="p-1.5 rounded bg-[var(--vit-bg)] border border-[var(--vit-border)] disabled:opacity-50"
            >
              <ChevronRight size={16} className="text-[var(--vit-text)]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
