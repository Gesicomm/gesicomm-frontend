import React, { useState, useEffect } from 'react';
import { reportesService } from '../../services/reportesApi';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import { ChevronRight, ChevronLeft, Package, Sparkles, TrendingUp, X, Calendar, Clock, CreditCard, FileText, CheckCircle } from 'lucide-react';

function formatFecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export default function VistaPedidos({ filtros }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginacion, setPaginacion] = useState({ actual: 1, total: 1, paginas: 1 });
  const [pedidoExpandido, setPedidoExpandido] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  useEffect(() => {
    cargarDatos(1);
    // eslint-disable-next-line
  }, [filtros]);

  const cargarDatos = async (pagina) => {
    setLoading(true);
    try {
      const data = await reportesService.obtenerPedidos({ ...filtros, pagina });
      setPedidos(data.pedidos || []);
      setPaginacion({ actual: data.actual, total: data.total, paginas: data.paginas });
      setPedidoExpandido(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPedidos = React.useMemo(() => {
    let items = [...pedidos];
    items.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (sortConfig.key === 'fecha') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [pedidos, sortConfig]);

  const getBadgesResumen = (items) => {
    if (!items || items.length === 0) return null;
    const stats = { base: 0, order_bump: 0, upsell: 0, combo: 0 };
    items.forEach(it => {
      const oferta = it.Ofertum || it.Oferta;
      if (!oferta) { stats.base++; return; }
      if (oferta.estrategia === 'order_bump') stats.order_bump++;
      else if (oferta.estrategia === 'upsell') stats.upsell++;
      else if (oferta.tipo_contenido === 'combo') stats.combo++;
      else stats.base++;
    });

    return (
      <div className="flex gap-1 flex-wrap">
        {stats.base > 0 && <Badge color="bg-blue-500/10 text-blue-400 border-blue-500/20">Base</Badge>}
        {stats.combo > 0 && <Badge color="bg-[#3d5fa3]/10 text-[#7d9bd6] border-[#3d5fa3]/20">Combo</Badge>}
        {stats.order_bump > 0 && <Badge color="bg-orange-500/10 text-orange-400 border-orange-500/20">Order Bump</Badge>}
        {stats.upsell > 0 && <Badge color="bg-pink-500/10 text-pink-400 border-pink-500/20">Upsell</Badge>}
      </div>
    );
  };

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* TABLA PRINCIPAL */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${pedidoExpandido ? 'border-r border-[var(--vit-border)]' : ''}`}>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 bg-[var(--vit-card-bg)] z-10 shadow-sm">
              <tr>
                <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] cursor-pointer" onClick={() => handleSort('id')}>
                  Pedido <SortIcon col="id" />
                </th>
                <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Cliente</th>
                <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Estado / Pago</th>
                <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] cursor-pointer" onClick={() => handleSort('fecha')}>
                  Fecha <SortIcon col="fecha" />
                </th>
                <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Composición</th>
                <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] text-right cursor-pointer" onClick={() => handleSort('monto')}>
                  Monto <SortIcon col="monto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-[var(--vit-muted)]">Cargando pedidos...</td></tr>
              ) : sortedPedidos.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-[var(--vit-muted)]">No hay pedidos para estos filtros.</td></tr>
              ) : (
                sortedPedidos.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setPedidoExpandido(p)}
                    className={`cursor-pointer border-b border-[var(--vit-border)] transition-colors hover:bg-[var(--vit-bg-secondary)] ${pedidoExpandido?.id === p.id ? 'bg-[var(--vit-bg-secondary)]' : ''}`}
                  >
                    <td className="p-4 font-mono text-[var(--vit-text)] font-bold">#{p.id}</td>
                    <td className="p-4 text-[var(--vit-text)]">
                      <div className="font-medium">{p.cliente}</div>
                      {p.telefono && <div className="text-xs text-[var(--vit-muted)]">{p.telefono}</div>}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <BadgeStatus estado={p.estado} />
                        {p.metodo_pago && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-[color-mix(in_srgb,_var(--color-fg)_5%,_transparent)] text-fg-subtle border-[color-mix(in_srgb,_var(--color-fg)_10%,_transparent)]">
                            {p.metodo_pago}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-[var(--vit-text)]">
                      <div className="text-sm">{formatFecha(p.fecha)}</div>
                      {p.hora && <div className="text-xs text-[var(--vit-muted)]">{p.hora}</div>}
                    </td>
                    <td className="p-4">
                      {getBadgesResumen(p.items)}
                      <div className="text-xs text-[var(--vit-muted-2)] mt-1">{p.items?.length || 0} ítem(s)</div>
                    </td>
                    <td className="p-4 text-right font-bold text-[var(--vit-text)]">
                      {formatPrecio(p.monto)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {paginacion.paginas > 1 && (
          <div className="p-4 border-t border-[var(--vit-border)] bg-[var(--vit-surface)] flex justify-between items-center shrink-0">
            <span className="text-sm text-[var(--vit-muted)]">
              Página {paginacion.actual} de {paginacion.paginas} ({paginacion.total} pedidos)
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

      {/* DRAWER LATERAL */}
      {pedidoExpandido && (
        <div className="w-[420px] shrink-0 flex flex-col bg-[var(--vit-surface)] overflow-hidden">
          {/* Header del drawer */}
          <div className="p-4 border-b border-[var(--vit-border)] flex items-center justify-between bg-[var(--vit-card-bg)] shrink-0">
            <div>
              <h3 className="text-lg font-bold text-[var(--vit-text)]">Pedido #{pedidoExpandido.id}</h3>
              <p className="text-sm text-[var(--vit-muted)]">{pedidoExpandido.cliente}</p>
            </div>
            <button onClick={() => setPedidoExpandido(null)} className="p-2 text-[var(--vit-muted)] hover:text-[var(--vit-text)] hover:bg-[var(--vit-bg)] rounded-md transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Metadata del pedido */}
            <div className="grid grid-cols-2 gap-2">
              <InfoChip icon={<Calendar size={13} />} label="Fecha" value={formatFecha(pedidoExpandido.fecha)} />
              <InfoChip icon={<Clock size={13} />} label="Hora" value={pedidoExpandido.hora || '—'} />
              <InfoChip icon={<CreditCard size={13} />} label="Método de Pago" value={pedidoExpandido.metodo_pago || '—'} />
              <InfoChip
                icon={pedidoExpandido.quiere_factura ? <FileText size={13} className="text-green-400" /> : <CheckCircle size={13} />}
                label="Factura"
                value={pedidoExpandido.quiere_factura ? 'Requiere factura' : 'Sin factura'}
                highlight={pedidoExpandido.quiere_factura}
              />
            </div>

            <h4 className="text-xs font-semibold text-[var(--vit-muted-2)] uppercase tracking-wider border-t border-[var(--vit-border)] pt-3">Desglose de Ítems</h4>

            <div className="flex flex-col gap-0 border border-[var(--vit-border)] rounded-lg overflow-hidden bg-[var(--vit-bg)]">
              {pedidoExpandido.items?.length === 0 && (
                <p className="p-4 text-sm text-[var(--vit-muted)] text-center">Sin ítems registrados</p>
              )}
              {pedidoExpandido.items?.map((it, idx) => {
                const oferta = it.Ofertum || it.Oferta;
                const esBase = !oferta;
                const rol = esBase ? 'Producto Base' :
                            oferta.estrategia === 'order_bump' ? 'Order Bump' :
                            oferta.estrategia === 'upsell' ? 'Upsell' :
                            oferta.tipo_contenido === 'combo' ? 'Combo' : 'Pack';

                const icono = esBase ? <Package size={14} /> :
                              oferta.estrategia === 'order_bump' ? <Sparkles size={14} /> :
                              <TrendingUp size={14} />;

                const colorTexto = esBase ? 'text-blue-400' :
                                   oferta?.estrategia === 'order_bump' ? 'text-orange-400' :
                                   'text-pink-400';

                return (
                  <div key={idx} className={`p-3 ${idx > 0 ? 'border-t border-[var(--vit-border)]' : ''}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-[var(--vit-text)] text-sm">{it.nombre_producto}</span>
                      <span className="font-bold text-[var(--vit-text)] text-sm ml-2 shrink-0">{formatPrecio(it.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${colorTexto}`}>
                        {icono} {rol}
                      </div>
                      <span className="text-xs text-[var(--vit-muted-2)]">
                        {it.cantidad} × {formatPrecio(it.precio_unitario)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="p-4 bg-[var(--vit-card-bg)] rounded-lg border border-[var(--vit-border)] flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm text-[var(--vit-muted)]">
                <span>Subtotal productos</span>
                <span>{formatPrecio((pedidoExpandido.items || []).reduce((acc, it) => acc + parseInt(it.subtotal || 0), 0))}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-[var(--vit-muted)]">
                <span>Descuentos</span>
                <span className="text-orange-400">-{formatPrecio(pedidoExpandido.descuento || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-[var(--vit-muted)]">
                <span>Costo de envío</span>
                <span>{pedidoExpandido.costo_envio > 0 ? formatPrecio(pedidoExpandido.costo_envio) : 'Gratis'}</span>
              </div>
              <div className="flex justify-between items-center text-base font-bold text-[var(--vit-text)] pt-2 border-t border-[var(--vit-border)]">
                <span>Total pedido</span>
                <span>{formatPrecio(pedidoExpandido.monto)}</span>
              </div>
              {(pedidoExpandido.estado === 'Pendiente' || pedidoExpandido.estado === 'Confirmado' || pedidoExpandido.estado === 'Empacado' || pedidoExpandido.estado === 'En tránsito') ? (
                <div className="flex justify-between items-center text-sm font-semibold text-yellow-400 pt-2 border-t border-[var(--vit-border)]">
                  <span>Pendiente de cobro</span>
                  <span>{formatPrecio(pedidoExpandido.monto)}</span>
                </div>
              ) : pedidoExpandido.estado === 'Entregado' ? (
                <div className="flex justify-between items-center text-sm font-semibold text-green-400 pt-2 border-t border-[var(--vit-border)]">
                  <span>Pagado</span>
                  <span>{formatPrecio(pedidoExpandido.monto)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ children, color }) {
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${color}`}>
      {children}
    </span>
  );
}

function BadgeStatus({ estado }) {
  let color = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  if (estado === 'Entregado') color = 'bg-green-500/10 text-green-400 border-green-500/20';
  if (estado === 'En tránsito' || estado === 'Empacado' || estado === 'Confirmado') color = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (estado === 'Cancelado' || estado === 'Devuelto' || estado === 'Rechazado') color = 'bg-red-500/10 text-red-400 border-red-500/20';
  if (estado === 'Pendiente') color = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  return <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${color}`}>{estado}</span>;
}

function InfoChip({ icon, label, value, highlight }) {
  return (
    <div className="bg-[var(--vit-bg)] rounded-lg p-2.5 border border-[var(--vit-border)]">
      <div className="flex items-center gap-1.5 text-[var(--vit-muted)] mb-1 text-xs">{icon} {label}</div>
      <div className={`text-sm font-semibold ${highlight ? 'text-green-400' : 'text-[var(--vit-text)]'}`}>{value}</div>
    </div>
  );
}
