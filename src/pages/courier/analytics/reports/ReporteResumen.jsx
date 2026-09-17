import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  TrendingUp, Package, CheckCircle2, RotateCcw,
  AlertTriangle, DollarSign, Trophy, TrendingDown
} from 'lucide-react';
import { getMetricasDashboardPedidos } from '../../../../services/courierApi';
import { formatGs } from '../../../../lib/courier';
import '../../CentroInteligenciaComercial.css';

// ─── Gráfico SVG de evolución temporal ───────────────────────────────────────
// Muestra tres líneas: Creados / Confirmados / Entregados sobre el tiempo.
// Solo se etiquetan inicio, mitad y fin del eje X para no solapar fechas.
// El hover muestra una línea vertical y un tooltip con los tres valores.

const LINEAS = [
  { campo: 'pedidos',     label: 'Creados',     color: 'var(--color-info)' },
  { campo: 'confirmados', label: 'Confirmados', color: 'var(--color-success)' },
  { campo: 'entregados',  label: 'Entregados',  color: 'var(--color-primary-text)' },
];

const ANCHO = 900;
const ALTO  = 160;
const PAD_INF = 24; // espacio para etiquetas de fecha

function formatFechaCorta(ymd) {
  if (!ymd) return '';
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
}

// Traza una polilínea suave (spline cúbico) entre los puntos dados.
function pathLinea(pts) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i].x + pts[i - 1].x) / 2;
    d += ` C${cp},${pts[i - 1].y} ${cp},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  return d;
}

function GraficoEvolucion({ serie }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const valorDe = (d, campo) => Number(d?.[campo]) || 0;
  const todos = serie.flatMap(d => LINEAS.map(l => valorDe(d, l.campo)));
  const maxV = Math.max(1, ...todos);
  const grupoAncho = ANCHO / (serie.length || 1);

  const indicesLabel = useMemo(() => {
    const n = serie.length;
    if (n <= 1) return new Set([0]);
    return new Set([0, Math.floor((n - 1) / 2), n - 1]);
  }, [serie.length]);

  const yFor = useCallback(v => ALTO - (v / maxV) * ALTO, [maxV]);
  const xFor = useCallback(i => i * grupoAncho + grupoAncho / 2, [grupoAncho]);

  const sinDatos = serie.every(d => LINEAS.every(l => valorDe(d, l.campo) === 0));

  const onMove = useCallback(e => {
    if (!wrapRef.current || !serie.length) return;
    const cx = e.touches?.length ? e.touches[0].clientX : e.clientX;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = cx - rect.left;
    if (x < 0 || x > rect.width) { setHover(null); return; }
    const idx = Math.floor((x / rect.width) * serie.length);
    setHover(Math.max(0, Math.min(serie.length - 1, idx)));
  }, [serie.length]);

  const tooltipStyle = useMemo(() => {
    if (hover === null || !serie.length) return {};
    const pct = ((hover + 0.5) / serie.length) * 100;
    const transform = pct < 15 ? 'translateX(0%)' : pct > 85 ? 'translateX(-100%)' : 'translateX(-50%)';
    return { left: `${pct}%`, transform };
  }, [hover, serie.length]);

  if (sinDatos) {
    return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-fg-subtle)', fontSize: '0.85rem' }}>
        Sin datos de tendencia para este período.
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', cursor: 'crosshair' }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      onTouchStart={onMove}
      onTouchMove={onMove}
      onTouchEnd={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${ANCHO} ${ALTO + PAD_INF}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: `${ALTO + PAD_INF}px` }}>
        {/* Líneas de grid horizontales */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={0} y1={ALTO * (1 - f)} x2={ANCHO} y2={ALTO * (1 - f)}
            stroke="color-mix(in srgb, var(--color-fg) 6%, transparent)" strokeWidth={1} />
        ))}

        {/* Línea vertical de hover */}
        {hover !== null && (
          <line x1={xFor(hover)} y1={0} x2={xFor(hover)} y2={ALTO}
            stroke="color-mix(in srgb, var(--color-fg) 14%, transparent)" strokeWidth={1} />
        )}

        {/* Polilíneas */}
        {LINEAS.map(l => {
          const pts = serie.map((d, i) => ({ x: xFor(i), y: yFor(valorDe(d, l.campo)) }));
          return (
            <path key={l.campo} d={pathLinea(pts)} fill="none" stroke={l.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          );
        })}

        {/* Puntos de hover */}
        {hover !== null && serie[hover] && LINEAS.map(l => (
          <circle key={l.campo}
            cx={xFor(hover)} cy={yFor(valorDe(serie[hover], l.campo))}
            r={4} fill={l.color} stroke="var(--color-canvas)" strokeWidth={2} />
        ))}

        {/* Etiquetas de fecha (solo inicio, mitad, fin) */}
        {serie.map((d, i) => indicesLabel.has(i) && (
          <text key={d.fecha} x={xFor(i)} y={ALTO + 18}
            textAnchor="middle" fontSize={11} fill="color-mix(in srgb, var(--color-fg) 45%, transparent)">
            {formatFechaCorta(d.fecha)}
          </text>
        ))}
      </svg>

      {/* Tooltip flotante */}
      {hover !== null && serie[hover] && (
        <div style={{
          position: 'absolute', bottom: PAD_INF + 8, ...tooltipStyle,
          background: 'var(--color-canvas)', border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
          borderRadius: 8, padding: '0.5rem 0.75rem', pointerEvents: 'none',
          fontSize: '0.78rem', boxShadow: '0 4px 16px rgba(0,0,0,.25)', minWidth: 120,
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-fg)' }}>
            {formatFechaCorta(serie[hover].fecha)}
          </div>
          {LINEAS.map(l => (
            <div key={l.campo} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: 'var(--color-fg-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                {l.label}
              </span>
              <strong style={{ color: 'var(--color-fg)' }}>{valorDe(serie[hover], l.campo)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Badge de variación vs. período anterior ──────────────────────────────────
// Verde si mejora, rojo si baja. Si no hay dato previo, no muestra nada.
function Variacion({ actual, previo }) {
  if (previo == null || previo === 0 || actual == null) return null;
  const pct = Math.round(((actual - previo) / Math.abs(previo)) * 100);
  if (pct === 0) return null;
  const sube = pct > 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontSize: '0.72rem', fontWeight: 700, padding: '1px 6px', borderRadius: 12,
      background: sube ? 'color-mix(in srgb, var(--color-success) 12%, transparent)' : 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
      color: sube ? 'var(--color-success)' : 'var(--color-danger)',
      marginLeft: 6,
    }}>
      {sube ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {sube ? '+' : ''}{pct}%
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ReporteResumen({ filters, setConfirmadoresDisponibles }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    cargarMetricas();
  }, [filters]);

  const cargarMetricas = async () => {
    try {
      setLoading(true);
      const payload = {
        periodo:       filters.periodo,
        mes:           filters.periodo === 'personalizado_mes' ? filters.mes : undefined,
        anio:          filters.anio,
        // Rango personalizado — el backend (resolverRangoFechas) prioriza
        // fecha_desde/fecha_hasta si ambas están presentes. Se envían
        // siempre pero solo tienen efecto cuando periodo === 'personalizado_rango'.
        fecha_desde:   filters.periodo === 'personalizado_rango' ? (filters.fecha_desde || undefined) : undefined,
        fecha_hasta:   filters.periodo === 'personalizado_rango' ? (filters.fecha_hasta || undefined) : undefined,
        confirmador:   filters.confirmador !== 'TODOS' ? filters.confirmador : undefined,
        courier_id:    filters.courierId !== 'TODOS' ? filters.courierId : undefined,
        canal_venta_id: filters.canal_venta_id !== 'TODOS' ? filters.canal_venta_id : undefined,
      };
      const res = await getMetricasDashboardPedidos(payload);
      setData(res);
      if (res.confirmadores_disponibles && setConfirmadoresDisponibles) {
        setConfirmadoresDisponibles(res.confirmadores_disponibles);
      }
    } catch (err) {
      console.error('Error cargando métricas analíticas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>
        <div className="animate-spin" style={{ margin: '0 auto 1rem auto', width: '28px', height: '28px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
        Calculando métricas...
      </div>
    );
  }

  if (!data) return null;

  const funnel = data.funnel;
  const kpis   = data.kpis;
  const cmp    = data.comparativo || null; // variación vs. período anterior

  return (
    <div className="cic-wrapper" style={{ marginTop: '1rem' }}>

      {/* ── Zona 1: KPIs con variación ───────────────────────────────────── */}
      <div className="cic-kpis-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>

        <div className="cic-kpi-card" style={{ borderTop: '3px solid var(--color-info)' }}>
          <div className="cic-kpi-header"><span>Pedidos Creados</span><Package size={16} style={{ color: 'var(--color-info)' }} /></div>
          <div className="cic-kpi-val">{funnel.total_creados}</div>
          <div className="cic-kpi-sub">Volumen base del período</div>
        </div>

        <div className="cic-kpi-card" style={{ borderTop: '3px solid var(--color-success)' }}>
          <div className="cic-kpi-header"><span>Confirmados</span><CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} /></div>
          <div className="cic-kpi-val">
            {funnel.confirmados}
            <Variacion actual={funnel.confirmados} previo={cmp?.pedidos_entregados} />
          </div>
          <div className="cic-kpi-sub">{funnel.tasa_confirmacion}% de creados</div>
        </div>

        <div className="cic-kpi-card" style={{ borderTop: '3px solid var(--color-primary-text)' }}>
          <div className="cic-kpi-header"><span>Entregados</span><Trophy size={16} style={{ color: 'var(--color-primary-text)' }} /></div>
          <div className="cic-kpi-val">
            {funnel.entregados}
            <Variacion actual={funnel.entregados} previo={cmp?.pedidos_entregados} />
          </div>
          <div className="cic-kpi-sub">{funnel.tasa_entrega}% de creados</div>
        </div>

        <div className="cic-kpi-card" style={{ borderTop: '3px solid var(--color-accent-text, #f59e0b)' }}>
          <div className="cic-kpi-header"><span>Facturación Entregada</span><DollarSign size={16} style={{ color: 'var(--color-accent-text)' }} /></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-accent-text)' }}>
            {formatGs(kpis.facturacion_entregada)}
            <Variacion actual={kpis.facturacion_entregada} previo={cmp?.facturacion_entregada} />
          </div>
          <div className="cic-kpi-sub">Ingreso real de producto</div>
        </div>

        <div className="cic-kpi-card" style={{ borderTop: '3px solid var(--color-warning)' }}>
          <div className="cic-kpi-header"><span>Margen Bruto Est.</span><TrendingUp size={16} style={{ color: 'var(--color-warning)' }} /></div>
          <div className="cic-kpi-val" style={{ color: kpis.margen_bruto_estimado < 0 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
            {formatGs(kpis.margen_bruto_estimado)}
          </div>
          <div className="cic-kpi-sub">{kpis.pct_margen_bruto}% sobre ventas</div>
        </div>

      </div>

      {/* ── Zona 2: Embudo (2/3) + Insights (1/3) ───────────────────────── */}
      <div className="cic-content-grid">

        {/* Embudo comercial */}
        <div className="cic-funnel-card" style={{ margin: 0 }}>
          <div className="cic-card-header">
            <div>
              <h3 className="cic-card-title">Embudo Comercial</h3>
              <p className="cic-card-subtitle">Conversión end-to-end del período seleccionado</p>
            </div>
          </div>
          <div className="cic-funnel-track">
            <FunnelStep num={1} label="Creados" valor={funnel.total_creados} tasa={null} color="var(--color-info)" />
            <FunnelStep num={2} label="Confirmados" valor={funnel.confirmados} tasa={funnel.tasa_confirmacion} color="var(--color-success)" tasaLabel="de creados" />
            <FunnelStepSalida label="Cancelados / Rechazados" valor={funnel.cancelados} tasa={funnel.tasa_cancelacion} />
            <FunnelStep num={3} label="Despachados" valor={funnel.despachados} tasa={funnel.tasa_despacho} color="var(--color-primary-text)" tasaLabel="de creados" />
            <FunnelStep num={4} label="Entregados" valor={funnel.entregados} tasa={funnel.tasa_entrega} color="var(--color-success)" tasaLabel="de creados" highlight />
            <FunnelStepSalida label="Devueltos" valor={funnel.devueltos} tasa={funnel.tasa_devolucion} colorDanger />
            <FunnelStepSalida label="Perdidos" valor={funnel.perdidos} tasa={funnel.tasa_perdida} colorWarning />
          </div>
        </div>

        {/* Insights */}
        <div className="cic-side-stack">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--color-fg)' }}>
            Insights
          </h3>
          {data.insights && data.insights.slice(0, 4).map((ins, i) => (
            <div key={i} style={{
              padding: '0.85rem', marginBottom: '0.5rem',
              background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
              borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)',
              display: 'flex', gap: '0.75rem',
            }}>
              <div style={{
                flexShrink: 0, marginTop: '0.1rem',
                color: ins.tipo === 'positivo' ? 'var(--color-success)' : ins.tipo === 'critico' ? 'var(--color-danger)' : 'var(--color-warning)',
              }}>
                {ins.tipo === 'positivo' ? <Trophy size={16} /> : ins.tipo === 'critico' ? <AlertTriangle size={16} /> : <TrendingUp size={16} />}
              </div>
              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--color-fg)' }}>{ins.titulo}</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-fg-muted)', margin: 0, lineHeight: 1.4 }}>{ins.mensaje}</p>
              </div>
            </div>
          ))}
          {(!data.insights || data.insights.length === 0) && (
            <div style={{ color: 'var(--color-fg-subtle)', fontSize: '0.82rem', padding: '1rem', border: '1px dashed color-mix(in srgb, var(--color-fg) 10%, transparent)', borderRadius: '8px', textAlign: 'center' }}>
              Sin alertas detectadas en este período.
            </div>
          )}
        </div>
      </div>

      {/* ── Zona 3: Gráfico de evolución temporal ───────────────────────── */}
      {data.tendencias && data.tendencias.length > 0 && (
        <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
          <div className="cic-card-header">
            <div>
              <h3 className="cic-card-title"><TrendingUp size={16} style={{ color: 'var(--color-primary-text)', marginRight: 6 }} />Evolución Temporal</h3>
              <p className="cic-card-subtitle" style={{ marginTop: 2 }}>
                {LINEAS.map((l, i) => (
                  <span key={l.campo} style={{ marginRight: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 3, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                    {l.label}
                  </span>
                ))}
              </p>
            </div>
          </div>
          <div style={{ padding: '0.5rem 1rem 0.25rem 1rem' }}>
            <GraficoEvolucion serie={data.tendencias} />
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Sub-componentes del funnel ───────────────────────────────────────────────

function FunnelStep({ num, label, valor, tasa, color, tasaLabel = '', highlight = false }) {
  return (
    <div className={`cic-funnel-step${highlight ? ' step-delivered' : ''}`} style={{ borderColor: `color-mix(in srgb, ${color} 20%, transparent)` }}>
      <div className="cic-step-head">
        <span style={{ color }}>{num}. {label}</span>
      </div>
      <div className="cic-step-val" style={{ color }}>
        {valor}
      </div>
      {tasa !== null && (
        <div className="cic-step-rate-badge" style={{
          background: `color-mix(in srgb, ${color} 10%, transparent)`,
          color,
        }}>
          {tasa}% {tasaLabel}
        </div>
      )}
      <div className="cic-step-progress-bar">
        <div className="cic-step-progress-fill" style={{ width: `${Math.min(100, tasa ?? 100)}%`, background: color }} />
      </div>
    </div>
  );
}

// Pasos de salida del funnel (Cancelados, Devueltos, Perdidos): siempre con
// apariencia atenuada — son pérdidas, no avances del flujo.
function FunnelStepSalida({ label, valor, tasa, colorDanger = false, colorWarning = false }) {
  const color = colorDanger ? 'var(--color-danger)' : colorWarning ? 'var(--color-warning)' : 'var(--color-fg-muted)';
  return (
    <div className="cic-funnel-step step-returned" style={{ borderColor: `color-mix(in srgb, ${color} 12%, transparent)`, opacity: 0.8 }}>
      <div className="cic-step-head">
        <RotateCcw size={12} style={{ color }} />
        <span style={{ color, marginLeft: 4 }}>{label}</span>
      </div>
      <div className="cic-step-val" style={{ color }}>{valor}</div>
      <div className="cic-step-rate-badge" style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}>
        {tasa}% de creados
      </div>
      <div className="cic-step-progress-bar">
        <div className="cic-step-progress-fill" style={{ width: `${Math.min(100, tasa)}%`, background: color }} />
      </div>
    </div>
  );
}
