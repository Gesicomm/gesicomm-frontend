import { useMemo } from "react";
import { STATUS, STATUS_ORDER, formatGs } from "../../lib/courier";

export function SummaryBar({ envios = [], couriers = [] }) {
  const stats = useMemo(() => {
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
    for (const e of envios) {
      if (counts[e.estado] !== undefined) {
        counts[e.estado]++;
      }
    }

    const entregados = envios.filter(
      (e) => e.estado === "Entregado" || e.estado === "entregado"
    );
    const rendidos = envios.filter(
      (e) => e.estado === "Rendido" || e.estado === "rendido"
    );

    const montoRendido = rendidos.reduce((s, e) => s + (Number(e.monto) || 0), 0);
    const facturacion = entregados.reduce((s, e) => s + (Number(e.monto) || 0), 0);

    return { counts, facturacion, montoRendido, totalEnvios: envios.length };
  }, [envios, couriers]);

  return (
    <div className="summary-bar">
      <StatBox title="Total Envíos" value={stats.totalEnvios} color="#ffffff" />
      <StatBox title="Pendientes" value={stats.counts["Pendiente"] || 0} color="#f59e0b" />
      <StatBox title="En camino" value={stats.counts["En camino"] || 0} color="#3b82f6" />
      <StatBox title="Entregados" value={stats.counts["Entregado"] || 0} color="#10b981" />
      <StatBox title="Cancelados" value={stats.counts["Cancelado"] || 0} color="#ef4444" />
      <StatBox title="Rendidos" value={stats.counts["Rendido"] || 0} color="#8b5cf6" />
      <StatBox title="Monto Rendido" value={formatGs(stats.montoRendido)} color="#10b981" />
    </div>
  );
}

function StatBox({ title, value, color = "#ffffff" }) {
  return (
    <div className="stat-box">
      <span className="stat-title">{title}</span>
      <span className="stat-value" style={{ color }}>{value}</span>
    </div>
  );
}
