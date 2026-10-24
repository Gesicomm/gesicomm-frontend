import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  TrendingUp, CheckCircle2, RotateCcw, ArrowRight, ChevronRight,
  AlertTriangle, Trophy, TrendingDown, Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMetricasDashboardPedidos } from '../../../../services/courierApi';
import '../../CentroInteligenciaComercial.css';

// ─── Gráfico SVG de evolución temporal ───────────────────────────────────────
// Muestra tres líneas: Creados / Confirmados / Entregados sobre el tiempo.
// Solo se etiquetan inicio, mitad y fin del eje X para no solapar fechas.
// El hover muestra una línea vertical y un tooltip con los tres valores.

const LINEAS = [
  { campo: 'pedidos',     label: 'Entraron',     color: 'var(--color-info)' },
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
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-fg-subtle)', fontSize: '0.9375rem' }}>
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
            textAnchor="middle" fontSize={12} fill="color-mix(in srgb, var(--color-fg) 45%, transparent)">
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
          fontSize: '0.875rem', boxShadow: '0 4px 16px rgba(0,0,0,.25)', minWidth: 120,
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
      fontSize: '0.8125rem', fontWeight: 700, padding: '1px 6px', borderRadius: 12,
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
// El Resumen contesta dos preguntas, en este orden:
//   1. ¿Qué tengo que atender ahora? → lo que espera algo del comerciante,
//      con el botón para ir a resolverlo.
//   2. ¿Cómo me fue en el período? → el recorrido de los pedidos, una sola
//      vez. Antes había 6 tarjetas y abajo un embudo de 8 cajas que repetía
//      los mismos números.
// La plata no va acá: está en el Dashboard General.
export function ReporteResumen({ filters, setConfirmadoresDisponibles, onAbrirReporte }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    cargarMetricas();
  }, [filters]);

  const cargarMetricas = async () => {
    try {
      setLoading(true);
      setError(false);
      // fecha_desde/fecha_hasta ya vienen resueltas desde el contenedor
      // (analytics/periodo.js) para cualquier preset.
      const payload = {
        periodo:        filters.periodo,
        fecha_desde:    filters.fecha_desde || undefined,
        fecha_hasta:    filters.fecha_hasta || undefined,
        confirmador:    filters.confirmador !== 'TODOS' ? filters.confirmador : undefined,
        courier_id:     filters.courierId !== 'TODOS' ? filters.courierId : undefined,
        canal_venta_id: filters.canal_venta_id !== 'TODOS' ? filters.canal_venta_id : undefined,
        producto_id:    filters.producto_id && filters.producto_id !== 'TODOS' ? filters.producto_id : undefined,
      };
      const res = await getMetricasDashboardPedidos(payload);
      setData(res);
      if (res.confirmadores_disponibles && setConfirmadoresDisponibles) {
        setConfirmadoresDisponibles(res.confirmadores_disponibles);
      }
    } catch (err) {
      console.error('Error cargando métricas analíticas:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="cic-res-cargando" role="status">
        <div className="animate-spin cic-res-spinner" />
        Calculando el resumen…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="cic-res-vacio">
        <p>No pudimos cargar el resumen.</p>
        <button type="button" className="cic-btn" onClick={cargarMetricas}>Reintentar</button>
      </div>
    );
  }

  if (!data) return null;

  const funnel = data.funnel || {};
  const cmp = data.comparativo || null;
  const n = (v) => Number(v) || 0;
  // Igual que el Dashboard General: "En seguimiento" es el mismo pedido sin
  // confirmar, solo que alguien ya le escribió.
  const porConfirmar = n(funnel.por_estado_actual?.Pendiente) + n(funnel.por_estado_actual?.EnSeguimiento);
  const enCamino = n(funnel.en_transito);
  const fallidos = n(funnel.devueltos) + n(funnel.perdidos);
  const creados = n(funnel.total_creados);
  const pct = (parte) => (creados > 0 ? Math.round((parte / creados) * 100) : 0);

  const pendientes = [
    {
      id: 'confirmar', valor: porConfirmar, icon: AlertTriangle, tono: 'aviso',
      titulo: porConfirmar === 1 ? 'pedido por confirmar' : 'pedidos por confirmar',
      texto: 'Esperan que los llames o les escribas. Mientras no se confirman, no salen.',
      accion: 'Ir a confirmar', onClick: () => navigate('/mis-pedidos'),
    },
    {
      id: 'camino', valor: enCamino, icon: Truck, tono: 'info',
      titulo: enCamino === 1 ? 'pedido en camino' : 'pedidos en camino',
      texto: 'Ya salieron y el courier todavía no los entregó.',
      accion: 'Seguir envíos', onClick: () => navigate('/gestion-logistica'),
    },
    {
      id: 'fallidos', valor: fallidos, icon: RotateCcw, tono: 'peligro',
      titulo: fallidos === 1 ? 'pedido devuelto o perdido' : 'pedidos devueltos o perdidos',
      texto: 'En el período elegido. Mirá por qué volvieron y cuánto te costaron.',
      accion: 'Ver por qué', onClick: () => onAbrirReporte?.('fallos'),
    },
  ];
  const hayPendientes = pendientes.some(p => p.valor > 0);

  const pasos = [
    { id: 'creados', label: 'Entraron', valor: creados, ayuda: 'pedidos nuevos' },
    { id: 'confirmados', label: 'Confirmados', valor: n(funnel.confirmados), ayuda: `${pct(n(funnel.confirmados))}% de los que entraron` },
    { id: 'despachados', label: 'Salieron', valor: n(funnel.despachados), ayuda: `${pct(n(funnel.despachados))}% de los que entraron` },
    { id: 'entregados', label: 'Entregados', valor: n(funnel.entregados), ayuda: `${pct(n(funnel.entregados))}% de los que entraron`, destacado: true },
  ];
  const caidas = [
    { label: 'Cancelados o rechazados', valor: n(funnel.cancelados) },
    { label: 'Devueltos', valor: n(funnel.devueltos) },
    { label: 'Perdidos', valor: n(funnel.perdidos) },
    { label: 'Reprogramados', valor: n(funnel.reprogramados) },
  ];

  return (
    <div className="cic-res">

      {/* 1. Lo que espera algo del comerciante */}
      <section className="cic-res-seccion" aria-labelledby="cic-res-atender">
        <div className="cic-res-encabezado">
          <h2 id="cic-res-atender" className="cic-res-titulo">Para atender ahora</h2>
        </div>
        {hayPendientes ? (
          <div className="cic-res-pendientes">
            {pendientes.map(({ id, valor, icon: Icon, tono, titulo, texto, accion, onClick }) => (
              <article key={id} className={`cic-res-pendiente tono-${valor > 0 ? tono : 'ok'}`}>
                <div className="cic-res-pendiente-cabeza">
                  <span className="cic-res-pendiente-icono"><Icon size={20} aria-hidden="true" /></span>
                  <p><strong>{valor}</strong> {titulo}</p>
                </div>
                <p className="cic-res-pendiente-texto">{valor > 0 ? texto : 'Nada pendiente acá.'}</p>
                {valor > 0 && (
                  <button type="button" className="cic-res-accion" onClick={onClick}>
                    {accion} <ArrowRight size={16} aria-hidden="true" />
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="cic-res-al-dia">
            <CheckCircle2 size={22} aria-hidden="true" />
            <p><strong>Todo al día.</strong> No hay pedidos esperando confirmación ni envíos en la calle.</p>
          </div>
        )}
      </section>

      {/* 2. El recorrido del período, una sola vez */}
      <section className="cic-res-seccion" aria-labelledby="cic-res-periodo">
        <div className="cic-res-encabezado">
          <h2 id="cic-res-periodo" className="cic-res-titulo">Cómo te fue en el período</h2>
          <p className="cic-res-bajada">De todos los pedidos que entraron, cuántos llegaron a entregarse.</p>
        </div>

        {creados === 0 ? (
          <div className="cic-res-vacio"><p>No entraron pedidos en este período. Probá con otro rango de fechas.</p></div>
        ) : (
          <div className="cic-res-recorrido-card">
            <ol className="cic-res-recorrido">
              {pasos.map((p, i) => (
                <li key={p.id} className={`cic-res-paso${p.destacado ? ' destacado' : ''}`}>
                  {i > 0 && <ChevronRight size={20} className="cic-res-flecha" aria-hidden="true" />}
                  <div>
                    <span className="cic-res-paso-label">{p.label}</span>
                    <span className="cic-res-paso-valor">
                      {p.valor}
                      {p.id === 'entregados' && <Variacion actual={p.valor} previo={cmp?.pedidos_entregados} />}
                    </span>
                    <span className="cic-res-paso-ayuda">{p.ayuda}</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="cic-res-barra" aria-hidden="true">
              <span style={{ width: `${pct(n(funnel.entregados))}%` }} />
            </div>
            <div className="cic-res-caidas">
              <span className="cic-res-caidas-label">Se quedaron en el camino:</span>
              {caidas.map(c => (
                <span key={c.label} className={`cic-res-caida${c.valor > 0 ? '' : ' cero'}`}>
                  {c.label} <strong>{c.valor}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. Tendencia + avisos */}
      {creados > 0 && (
        <div className="cic-res-dos-columnas">
          {data.tendencias && data.tendencias.length > 0 && (
            <section className="cic-res-recorrido-card" aria-labelledby="cic-res-dias">
              <h2 id="cic-res-dias" className="cic-res-subtitulo">Pedidos por día</h2>
              <p className="cic-res-leyenda">
                {LINEAS.map(l => (
                  <span key={l.campo}>
                    <span className="cic-res-leyenda-color" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </p>
              <GraficoEvolucion serie={data.tendencias} />
            </section>
          )}

          <section className="cic-res-recorrido-card" aria-labelledby="cic-res-avisos">
            <h2 id="cic-res-avisos" className="cic-res-subtitulo">Para prestar atención</h2>
            {data.insights && data.insights.length > 0 ? (
              <ul className="cic-res-avisos">
                {data.insights.slice(0, 4).map((ins, i) => {
                  const Icono = ins.tipo === 'positivo' ? Trophy : ins.tipo === 'critico' ? AlertTriangle : TrendingUp;
                  return (
                    <li key={i} className={`cic-res-aviso tipo-${ins.tipo || 'neutro'}`}>
                      <Icono size={18} aria-hidden="true" />
                      <div>
                        <strong>{ins.titulo}</strong>
                        <p>{ins.mensaje}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="cic-res-sin-avisos">Nada fuera de lo normal en este período.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
