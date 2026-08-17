import React, { useState, useEffect } from 'react';
import { reportesService } from '../../services/reportesApi';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import { ChevronRight, ChevronLeft, Package, Sparkles, TrendingUp } from 'lucide-react';

function formatFecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export default function VistaItems({ filtros }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginacion, setPaginacion] = useState({ actual: 1, total: 1, paginas: 1 });

  useEffect(() => {
    cargarDatos(1);
    // eslint-disable-next-line
  }, [filtros]);

  const cargarDatos = async (pagina) => {
    setLoading(true);
    try {
      const data = await reportesService.obtenerItems({ ...filtros, pagina });
      setItems(data.items || []);
      setPaginacion({ actual: data.actual, total: data.total, paginas: data.paginas });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 bg-[var(--vit-card-bg)] z-10 shadow-sm">
            <tr>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Pedido</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Fecha</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Cliente</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Producto Vendido</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Rol Comercial</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Estructura</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] text-right">Cant.</th>
              <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="p-8 text-center text-[var(--vit-muted)]">Cargando ítems...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="8" className="p-8 text-center text-[var(--vit-muted)]">No hay ítems entregados para estos filtros.</td></tr>
            ) : (
              items.map(it => {
                // Sequelize usa Ofertum como alias por defecto para Oferta (inglés irregular)
                const oferta = it.Ofertum || it.Oferta;
                const esBase = !oferta;
                const rol = esBase ? 'Base' :
                            oferta.estrategia === 'order_bump' ? 'Order Bump' :
                            oferta.estrategia === 'upsell' ? 'Upsell' : 'Base';
                const estructura = esBase ? 'Individual' :
                                   oferta.tipo_contenido === 'combo' ? 'Combo' : 'Pack';

                const icono = esBase ? <Package size={13} className="inline mr-1 text-blue-400" /> :
                              oferta.estrategia === 'order_bump' ? <Sparkles size={13} className="inline mr-1 text-orange-400" /> :
                              <TrendingUp size={13} className="inline mr-1 text-pink-400" />;

                return (
                  <tr key={it.id} className="border-b border-[var(--vit-border)] hover:bg-[var(--vit-bg-secondary)] transition-colors">
                    <td className="p-4 font-mono font-bold text-[var(--vit-text)]">#{it.envio_id}</td>
                    <td className="p-4 text-[var(--vit-text)]">
                      <div>{formatFecha(it.Envio?.fecha)}</div>
                      {it.Envio?.hora && <div className="text-xs text-[var(--vit-muted)]">{it.Envio.hora}</div>}
                    </td>
                    <td className="p-4 text-[var(--vit-text)]">{it.Envio?.cliente || '—'}</td>
                    <td className="p-4 font-medium text-[var(--vit-text)]">{it.nombre_producto}</td>
                    <td className="p-4 text-[var(--vit-text)]">{icono}{rol}</td>
                    <td className="p-4 text-[var(--vit-text)]">{estructura}</td>
                    <td className="p-4 text-right text-[var(--vit-text)]">{it.cantidad}</td>
                    <td className="p-4 text-right font-bold text-[var(--vit-text)]">{formatPrecio(it.subtotal)}</td>
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
