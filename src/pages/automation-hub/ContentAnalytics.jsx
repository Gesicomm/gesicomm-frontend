import React, { useEffect, useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { analyticsApi } from '../../services/automationHubApi';

const FORMATO_LABEL = { R: 'Video/Reel', C: 'Carrusel', H: 'Historia' };
const FORMATO_COLOR = { R: '#7d9bd6', C: '#10b981', H: '#f59e0b' };

// Paleta de colores para las barras del ranking por pieza
const BAR_COLORS = ['#7d9bd6', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#f97316'];

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    borderRadius: '8px',
    color: 'var(--color-fg)',
    fontSize: '12px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
  },
  itemStyle: { color: 'var(--color-fg)', fontWeight: 600 },
  labelStyle: { color: 'var(--color-fg-muted)', fontSize: '11px', fontWeight: 600, marginBottom: '2px' },
  cursor: { fill: 'var(--color-surface-2)', opacity: 0.4 },
};

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-[10px] font-semibold uppercase text-fg-subtle">{label}</div>
      <div className="mt-1 text-xl font-bold text-fg">{value}</div>
      {hint && <div className="mt-1 text-[10px] text-fg-muted">{hint}</div>}
    </div>
  );
}

function RankingList({ titulo, items }) {
  const max = items[0]?.revenue || 1;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 text-xs font-semibold text-fg">{titulo}</div>
      {!items.length ? (
        <div className="text-xs text-fg-muted">Sin datos suficientes todavía.</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((it, i) => (
            <div key={it.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="truncate text-fg-muted max-w-[70%]">{it.label}</span>
                <span className="font-semibold text-fg">{it.revenue.toLocaleString('es-PY')} Gs</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-2">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${Math.round((it.revenue / max) * 100)}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContentAnalytics() {
  const [datosVentas, setDatosVentas] = useState(null);
  const [datosEditorial, setDatosEditorial] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([analyticsApi.obtener(), analyticsApi.obtenerEditorial()])
      .then(([ventas, editorial]) => { setDatosVentas(ventas); setDatosEditorial(editorial); })
      .catch((err) => setError(err.response?.data?.message || 'No se pudo cargar el analizador.'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <div className="p-8 text-center text-sm text-fg-muted">Cargando...</div>;
  if (error) return <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>;
  if (!datosVentas || !datosEditorial) return null;

  const { summary, pareto, topTopics, topAngles, topCtas } = datosVentas;

  const paretoData = pareto.map((c, i) => ({
    name: c.trackingCode,
    revenue: c.revenue,
    fill: BAR_COLORS[i % BAR_COLORS.length],
  }));

  return (
    <div className="flex flex-col gap-6">

      {/* ── Productividad Editorial ────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-border pb-6">
        <h2 className="m-0 text-lg font-bold text-fg">Productividad Editorial</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Piezas Programadas" value={datosEditorial.total} />
          <Kpi label="Piezas Publicadas" value={datosEditorial.published} />
          <Kpi label="Cumplimiento" value={`${Math.round(datosEditorial.fulfillment * 100)}%`} hint="Basado en fechas pasadas/hoy" />
          <Kpi label="Pendientes" value={datosEditorial.scheduled} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Tendencia */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 text-xs font-semibold text-fg">Publicaciones — últimos 6 meses</div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={datosEditorial.history.slice().reverse()} margin={{ top: 8, right: 8, left: 0, bottom: 8 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-fg-muted)' }} stroke="var(--color-border)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-fg-muted)' }} stroke="var(--color-border)" />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'Publicaciones']} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Publicaciones" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribución por formato con barra visual */}
          <div className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-center gap-4">
            <div className="text-xs font-semibold text-fg">Distribución por Formato</div>
            {[
              { key: 'R', label: 'Videos/Reels' },
              { key: 'C', label: 'Carruseles' },
              { key: 'H', label: 'Historias' },
            ].map(({ key, label }) => {
              const total = (datosEditorial.formats.R || 0) + (datosEditorial.formats.C || 0) + (datosEditorial.formats.H || 0);
              const val = datosEditorial.formats[key] || 0;
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-fg-muted">{label}</span>
                    <span className="font-bold text-fg">{val} <span className="text-fg-subtle font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: FORMATO_COLOR[key] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Atribución de Ventas ───────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <h2 className="m-0 text-lg font-bold text-fg">Atribución de Ventas</h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Ventas totales" value={summary.totalSales} />
          <Kpi label="Ingreso total" value={summary.totalRevenue.toLocaleString('es-PY') + ' Gs'} />
          <Kpi label="Ventas con tracking" value={summary.attributedSales} hint={`${Math.round(summary.attributionRate * 100)}% del total`} />
          <Kpi label="Ingreso atribuido" value={summary.attributedRevenue.toLocaleString('es-PY') + ' Gs'} />
        </div>

        {/* Gráfico: ingresos por pieza */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-1 text-xs font-semibold text-fg">Ingresos generados por pieza de contenido</div>
          <div className="mb-3 text-[11px] text-fg-muted">Cada barra representa cuánto dinero generó esa pieza (en Gs) a partir de los leads que llegaron con ese código de tracking.</div>
          {!paretoData.length ? (
            <div className="text-xs text-fg-muted">Todavía no hay ventas con código de tracking asignado.</div>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={paretoData} margin={{ top: 8, right: 16, left: 8, bottom: 16 }} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-fg-muted)', fontWeight: 600 }} stroke="var(--color-border)" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-fg-muted)' }} stroke="var(--color-border)" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value) => [`${Number(value || 0).toLocaleString('es-PY')} Gs`, 'Ingreso']}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {paretoData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <RankingList titulo="Temas que más venden" items={topTopics} />
          <RankingList titulo="Ángulos que más venden" items={topAngles} />
          <RankingList titulo="CTAs que más venden" items={topCtas} />
        </div>

        {/* Tabla de contenidos */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 text-xs font-semibold text-fg">Detalle por pieza</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-fg-subtle">
                  <th className="pb-2 font-semibold">Código</th>
                  <th className="pb-2 font-semibold">Formato</th>
                  <th className="pb-2 font-semibold">Tema</th>
                  <th className="pb-2 font-semibold text-right">Ventas</th>
                  <th className="pb-2 font-semibold text-right">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {datosVentas.contents.filter((c) => c.sales > 0).map((c, i) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="py-2 font-bold" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }}>{c.trackingCode}</td>
                    <td className="py-2 text-fg-muted">{FORMATO_LABEL[c.format] || c.format}</td>
                    <td className="py-2 text-fg max-w-[200px] truncate">{c.topic}</td>
                    <td className="py-2 text-right text-fg">{c.sales}</td>
                    <td className="py-2 text-right font-semibold text-success">{c.revenue.toLocaleString('es-PY')} Gs</td>
                  </tr>
                ))}
                {!datosVentas.contents.some((c) => c.sales > 0) && (
                  <tr><td colSpan={5} className="py-6 text-center text-fg-muted">Sin ventas atribuidas todavía.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
