import { useMemo } from "react";
import { formatGs } from "../../lib/courier";

export function SummaryBar({ envios = [], couriers = [] }) {
  const stats = useMemo(() => {
    const counts = {
      "Entregado": 0,
      "Reagendado": 0,
      "Devuelto": 0,
      "Perdido": 0,
      "Cancelado": 0,
      "Pendiente": 0,
      "En camino": 0
    };

    const amounts = {
      "Entregado": 0,
      "Reagendado": 0,
      "Devuelto": 0,
      "Perdido": 0,
      "Cancelado": 0
    };

    let totalCostoDelivery = 0;
    let cobradoCourier = 0;
    let cobradoDirecto = 0;

    for (const e of envios) {
      const estadoNorm = e.estado || "Pendiente";
      
      // Contar estados
      if (counts[estadoNorm] !== undefined) {
        counts[estadoNorm]++;
      } else {
        counts[estadoNorm] = 1;
      }

      // Sumar montos para estados finales
      if (amounts[estadoNorm] !== undefined) {
        amounts[estadoNorm] += (Number(e.monto) || 0);
      }

      // Clasificación de cobros y costos de delivery
      const esCancelado = estadoNorm === "Cancelado";
      const esDevuelto = estadoNorm === "Devuelto";
      const esEntregado = estadoNorm === "Entregado" || estadoNorm === "Rendido";
      
      const metodo = e.metodo_pago || "Efectivo";
      const esPrepago = metodo === "Transferencia" || metodo === "Pagado";

      // 1. Cobros en Efectivo o POS (se cobran por courier únicamente cuando están Entregados o Rendidos)
      if (esEntregado && !esPrepago) {
        cobradoCourier += (Number(e.monto) || 0);
      }

      // 2. Cobros anticipados (Transferencia o Pagado)
      // Representan dinero que ingresa directo de inmediato, siempre que el pedido no se cancele o devuelva
      if (esPrepago && !esCancelado && !esDevuelto) {
        cobradoDirecto += (Number(e.monto) || 0);
      }

      // 3. Costo de envío pagado al courier
      if (esEntregado) {
        totalCostoDelivery += (Number(e.costo_envio) || 0);
      }
    }

    // Monto total pedidos: suma de pedidos entregados + pedidos prepagos activos.
    let facturacion = 0;
    for (const e of envios) {
      const estadoNorm = e.estado || "Pendiente";
      const esCancelado = estadoNorm === "Cancelado";
      const esDevuelto = estadoNorm === "Devuelto";
      const esEntregado = estadoNorm === "Entregado" || estadoNorm === "Rendido";
      
      const metodo = e.metodo_pago || "Efectivo";
      const esPrepago = metodo === "Transferencia" || metodo === "Pagado";

      if (esEntregado) {
        facturacion += (Number(e.monto) || 0);
      } else if (esPrepago && !esCancelado && !esDevuelto) {
        facturacion += (Number(e.monto) || 0);
      }
    }

    const saldoCourier = cobradoCourier - totalCostoDelivery;
    const cajaNeta = cobradoDirecto + saldoCourier;

    return {
      counts,
      amounts,
      facturacion,
      cobradoCourier,
      cobradoDirecto,
      totalCostoDelivery,
      saldoCourier,
      cajaNeta
    };
  }, [envios]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', marginBottom: '0.5rem' }}>
      
      {/* Fila 1: Estados de Envíos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.85rem',
        width: '100%'
      }}>
        <StatusCard 
          icon="✅" 
          title="Entregados" 
          count={stats.counts["Entregado"] || 0} 
          amount={stats.amounts["Entregado"] || 0} 
        />
        <StatusCard 
          icon="🍊" 
          title="Reagendados" 
          count={stats.counts["Reagendado"] || 0} 
          amount={stats.amounts["Reagendado"] || 0} 
        />
        <StatusCard 
          icon="🔄" 
          title="Devueltos" 
          count={stats.counts["Devuelto"] || 0} 
          amount={stats.amounts["Devuelto"] || 0} 
        />
        <StatusCard 
          icon="🔴" 
          title="Perdidos" 
          count={stats.counts["Perdido"] || 0} 
          amount={stats.amounts["Perdido"] || 0} 
        />
        <StatusCard 
          icon="🚫" 
          title="Cancelados" 
          count={stats.counts["Cancelado"] || 0} 
          amount={stats.amounts["Cancelado"] || 0} 
        />
      </div>

      {/* Fila 2: Métricas Económicas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.85rem',
        width: '100%'
      }}>
        <MetricCard title="Monto total pedidos" value={stats.facturacion} />
        <MetricCard title="Cobrado por Courier" value={stats.cobradoCourier} />
        <MetricCard title="Cobrado Directamente" value={stats.cobradoDirecto} />
        <MetricCard title="Costo Delivery" value={stats.totalCostoDelivery} />
        
        {/* Saldo Courier (Box Verde) */}
        <MetricCard 
          title="Saldo Courier" 
          value={stats.saldoCourier} 
          bg="color-mix(in srgb, var(--color-success) 8%, transparent)"
          border="1px solid color-mix(in srgb, var(--color-success) 30%, transparent)"
          textColor="var(--color-success)"
        />

        {/* Caja Neta (métrica destacada — acento dorado, no rompe la paleta oscura) */}
        <MetricCard
          title="Caja Neta"
          value={stats.cajaNeta}
          bg="color-mix(in srgb, var(--color-accent) 10%, transparent)"
          border="1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)"
          textColor="var(--color-accent-text)"
          labelColor="var(--color-accent-text)"
        />
      </div>

    </div>
  );
}

function StatusCard({ icon, title, count, amount }) {
  return (
    <div style={{
      background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)',
      border: '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)',
      borderRadius: '12px',
      padding: '0.85rem 1.1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
    }}>
      <span style={{
        fontSize: '0.68rem',
        color: 'var(--color-fg-subtle)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem'
      }}>
        <span>{icon}</span> {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.1rem' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 850, color: 'var(--color-fg)' }}>{count}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-fg-muted)', fontWeight: 600 }}>{formatGs(amount)}</span>
      </div>
    </div>
  );
}

function MetricCard({ title, value, bg = 'color-mix(in srgb, var(--color-fg) 2%, transparent)', border = '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)', textColor = 'var(--color-fg)', labelColor = 'var(--color-fg-subtle)' }) {
  return (
    <div style={{
      background: bg,
      border: border,
      borderRadius: '12px',
      padding: '0.85rem 1.1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.3rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
    }}>
      <span style={{
        fontSize: '0.65rem',
        color: labelColor,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {title}
      </span>
      <span style={{
        fontSize: '1.15rem',
        fontWeight: 800,
        color: textColor,
        letterSpacing: '-0.01em',
        marginTop: '0.1rem'
      }}>
        {formatGs(value)}
      </span>
    </div>
  );
}
