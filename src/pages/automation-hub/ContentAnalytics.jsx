import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { analyticsApi } from '../../services/automationHubApi';

const FORMATO_LABEL = { R: 'Video/Reel', C: 'Carrusel', H: 'Historias' };

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
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 text-xs font-semibold text-fg">{titulo}</div>
      {!items.length ? (
        <div className="text-xs text-fg-muted">Todavía no hay ventas atribuidas suficientes.</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((it) => (
            <div key={it.label} className="flex items-center justify-between text-xs">
              <span className="truncate text-fg-muted">{it.label}</span>
              <span className="font-semibold text-fg">{it.revenue.toLocaleString('es-PY')}</span>
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
    Promise.all([
      analyticsApi.obtener(),
      analyticsApi.obtenerEditorial()
    ])
      .then(([ventas, editorial]) => {
        setDatosVentas(ventas);
        setDatosEditorial(editorial);
      })
      .catch((err) => setError(err.response?.data?.message || 'No se pudo cargar el analizador.'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <div className="p-8 text-center text-sm text-fg-muted">Cargando...</div>;
  if (error) return <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>;
  if (!datosVentas || !datosEditorial) return null;

  const { summary, pareto, topTopics, topAngles, topCtas } = datosVentas;

  return (
    <div className="flex flex-col gap-6">
      
      {/* SECCIÓN: Productividad Editorial */}
      <div className="flex flex-col gap-4 border-b border-border pb-6">
        <h2 className="m-0 text-lg font-bold text-fg">Productividad Editorial</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Piezas Programadas" value={datosEditorial.total} />
          <Kpi label="Piezas Publicadas" value={datosEditorial.published} />
          <Kpi label="Cumplimiento" value={`${Math.round(datosEditorial.fulfillment * 100)}%`} hint="Basado en fechas pasadas/hoy" />
          <Kpi label="Pendientes" value={datosEditorial.scheduled} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Gráfico de tendencia */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 text-xs font-semibold text-fg">Tendencia Publicaciones (Últimos 6 meses)</div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={datosEditorial.history.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip cursor={{ fill: 'var(--color-surface-2)' }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Publicaciones" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Formatos */}
          <div className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-center">
            <div className="mb-3 text-xs font-semibold text-fg">Distribución por Formato</div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-sm font-semibold text-fg-muted">Videos/Reels</span>
                <span className="text-sm font-bold text-fg">{datosEditorial.formats.R}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-sm font-semibold text-fg-muted">Carruseles</span>
                <span className="text-sm font-bold text-fg">{datosEditorial.formats.C}</span>
              </div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-semibold text-fg-muted">Historias</span>
                <span className="text-sm font-bold text-fg">{datosEditorial.formats.H}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN: Atribución de Ventas */}
      <div className="flex flex-col gap-4">
        <h2 className="m-0 text-lg font-bold text-fg">Atribución de Ventas</h2>
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          Esta atribución se arma solo con datos reales de Gesicomm (ventas vinculadas por código de tracking). No incluye views/alcance de Instagram porque esa integración no existe hoy. Las piezas de prueba han sido excluidas.
        </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Ventas totales" value={summary.totalSales} />
        <Kpi label="Ingreso total" value={summary.totalRevenue.toLocaleString('es-PY')} />
        <Kpi label="Ventas atribuidas" value={summary.attributedSales} hint={`${Math.round(summary.attributionRate * 100)}% con código de tracking`} />
        <Kpi label="Ingreso atribuido" value={summary.attributedRevenue.toLocaleString('es-PY')} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 text-xs font-semibold text-fg">Pareto 80/20 — piezas que más venden</div>
        {!pareto.length ? (
          <div className="text-xs text-fg-muted">Todavía no hay ventas atribuidas.</div>
        ) : (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={pareto.map((c) => ({ name: c.trackingCode, revenue: c.revenue }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <RankingList titulo="Temas que más venden" items={topTopics} />
        <RankingList titulo="Ángulos que más venden" items={topAngles} />
        <RankingList titulo="CTA que más venden" items={topCtas} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-2 text-xs font-semibold text-fg">Contenidos con venta atribuida</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead>
              <tr className="text-fg-subtle">
                <th className="pb-2">Cdigo</th>
                <th className="pb-2">Formato</th>
                <th className="pb-2">Tema</th>
                <th className="pb-2">Ventas</th>
                <th className="pb-2">Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {datosVentas.contents.filter((c) => c.sales > 0).map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-1.5 font-semibold text-primary-text">{c.trackingCode}</td>
                  <td className="py-1.5 text-fg-muted">{FORMATO_LABEL[c.format] || c.format}</td>
                  <td className="py-1.5 text-fg">{c.topic}</td>
                  <td className="py-1.5 text-fg">{c.sales}</td>
                  <td className="py-1.5 font-semibold text-success">{c.revenue.toLocaleString('es-PY')}</td>
                </tr>
              ))}
              {!datosVentas.contents.some((c) => c.sales > 0) && (
                <tr><td colSpan={5} className="py-4 text-center text-fg-muted">Sin ventas atribuidas todava.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}
