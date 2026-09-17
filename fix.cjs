const fs = require('fs');
const path = require('path');
const p = path.resolve('src/pages/reportes/VistaPedidos.jsx');
let content = fs.readFileSync(p, 'utf8');

// 1. Add sortConfig and handleSort
content = content.replace(
  'const [pedidoExpandido, setPedidoExpandido] = useState(null);',
  `const [pedidoExpandido, setPedidoExpandido] = useState(null);\n  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });`
);

content = content.replace(
  'const getBadgesResumen = (items) => {',
  `const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPedidos = React.useMemo(() => {
    let sortableItems = [...pedidos];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'fecha') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }
        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [pedidos, sortConfig]);

  const getBadgesResumen = (items) => {`
);

// 2. Modify table headers
content = content.replace(
  '<th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Pedido</th>',
  `<th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] cursor-pointer" onClick={() => handleSort('id')}>Pedido {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>`
);
content = content.replace(
  '<th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Cliente</th>',
  `<th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Cliente</th>
                <th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Estado / Pago</th>`
);
content = content.replace(
  '<th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)]">Fecha</th>',
  `<th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] cursor-pointer" onClick={() => handleSort('fecha')}>Fecha {sortConfig.key === 'fecha' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>`
);
content = content.replace(
  '<th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] text-right">Monto</th>',
  `<th className="p-4 text-[var(--vit-muted)] font-medium border-b border-[var(--vit-border)] text-right cursor-pointer" onClick={() => handleSort('monto')}>Monto {sortConfig.key === 'monto' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>`
);

// 3. Modify table body
content = content.replace(
  'pedidos.map(p => (',
  'sortedPedidos.map(p => ('
);

content = content.replace(
  `<td className="p-4 text-[var(--vit-text)]">
                      <div className="font-medium">{p.cliente}</div>
                      {p.telefono && <div className="text-xs text-[var(--vit-muted)]">{p.telefono}</div>}
                    </td>`,
  `<td className="p-4 text-[var(--vit-text)]">
                      <div className="font-medium">{p.cliente}</div>
                      {p.telefono && <div className="text-xs text-[var(--vit-muted)]">{p.telefono}</div>}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <BadgeStatus estado={p.estado} />
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-[color-mix(in_srgb,_var(--color-fg)_5%,_transparent)] text-fg-subtle border-[color-mix(in_srgb,_var(--color-fg)_10%,_transparent)]">
                          {p.metodo_pago}
                        </span>
                      </div>
                    </td>`
);

content = content.replace(
  '<tr><td colSpan="5" className="p-8 text-center text-[var(--vit-muted)]">Cargando pedidos...</td></tr>',
  '<tr><td colSpan="6" className="p-8 text-center text-[var(--vit-muted)]">Cargando pedidos...</td></tr>'
);
content = content.replace(
  '<tr><td colSpan="5" className="p-8 text-center text-[var(--vit-muted)]">No hay pedidos entregados para estos filtros.</td></tr>',
  '<tr><td colSpan="6" className="p-8 text-center text-[var(--vit-muted)]">No hay pedidos entregados para estos filtros.</td></tr>'
);

// 4. Modify drawer math
const oldDrawerTotal = `{/* Total */}
            <div className="p-4 bg-[var(--vit-card-bg)] rounded-lg border border-[var(--vit-border)]">
              <div className="flex justify-between items-center text-sm mb-1 text-[var(--vit-muted)]">
                <span>Costo de envío</span>
                <span>{pedidoExpandido.costo_envio > 0 ? formatPrecio(pedidoExpandido.costo_envio) : 'Gratis'}</span>
              </div>
              <div className="flex justify-between items-center text-base font-bold text-[var(--vit-text)] pt-2 border-t border-[var(--vit-border)]">
                <span>Total Cobrado</span>
                <span className="text-green-400">{formatPrecio(pedidoExpandido.monto)}</span>
              </div>
            </div>`;

const newDrawerTotal = `{/* Total */}
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
                <span className="text-[var(--vit-text)]">{formatPrecio(pedidoExpandido.monto)}</span>
              </div>
              {pedidoExpandido.estado === 'Pendiente' || pedidoExpandido.estado === 'Confirmado' || pedidoExpandido.estado === 'Empacado' || pedidoExpandido.estado === 'En tránsito' ? (
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
            </div>`;

content = content.replace(oldDrawerTotal, newDrawerTotal);

// 5. Add BadgeStatus at EOF
content += `\nfunction BadgeStatus({ estado }) {
  let color = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  if (estado === 'Entregado') color = 'bg-green-500/10 text-green-400 border-green-500/20';
  if (estado === 'En tránsito' || estado === 'Empacado' || estado === 'Confirmado') color = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (estado === 'Cancelado' || estado === 'Devuelto' || estado === 'Rechazado') color = 'bg-red-500/10 text-red-400 border-red-500/20';
  if (estado === 'Pendiente') color = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  
  return <span className={\`text-[10px] uppercase font-bold px-2 py-0.5 rounded border \${color}\`}>{estado}</span>;
}\n`;

fs.writeFileSync(p, content);
