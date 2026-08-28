import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Eye, MessageCircle, Percent, Loader, AlertCircle, Table2, BarChart3, Package } from 'lucide-react';
import { landingService } from '../../services/landingService';

const PERIODOS = [
  { valor: 7, label: '7 días' },
  { valor: 30, label: '30 días' },
  { valor: 90, label: '90 días' },
];

function formatFecha(iso) {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

/**
 * Barra con extremo redondeado solo del lado contrario a la base (spec de
 * la skill de dataviz: "4px rounded data-ends anchored to the baseline").
 * Un <rect rx> redondea las 4 esquinas — acá se arma el path a mano para
 * que la base quede recta.
 */
function pathBarraRedondeada(x, yTop, ancho, alto, radio) {
  const r = Math.max(0, Math.min(radio, ancho / 2, alto));
  const yBase = yTop + alto;
  if (alto <= 0) return '';
  if (r <= 0.5) return `M ${x} ${yBase} L ${x} ${yTop} L ${x + ancho} ${yTop} L ${x + ancho} ${yBase} Z`;
  return `M ${x} ${yBase}
          L ${x} ${yTop + r}
          Q ${x} ${yTop} ${x + r} ${yTop}
          L ${x + ancho - r} ${yTop}
          Q ${x + ancho} ${yTop} ${x + ancho} ${yTop + r}
          L ${x + ancho} ${yBase} Z`;
}

/** Gráfico de barras de una sola serie (visitas por día) — ver dataviz skill. */
function GraficoVisitas({ serie }) {
  const [vistaTabla, setVistaTabla] = useState(false);
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const ANCHO = 720;
  const ALTO = 130;
  const PAD_INF = 18;
  const max = Math.max(1, ...serie.map(d => d.cantidad));
  const anchoColumna = ANCHO / (serie.length || 1);
  const anchoBarra = Math.max(1.5, anchoColumna - 2);

  // Etiquetas selectivas: primera, última y una intermedia — nunca un
  // número por punto (hasta 90 puntos no entrarían).
  const indicesEtiquetados = useMemo(() => {
    const n = serie.length;
    if (n <= 1) return new Set([0]);
    return new Set([0, Math.floor((n - 1) / 2), n - 1]);
  }, [serie.length]);

  const handleMouseMove = useCallback((e) => {
    if (!wrapRef.current || !serie.length) return;
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < 0 || x > rect.width) {
      setHover(null);
      return;
    }
    const idx = Math.floor((x / rect.width) * serie.length);
    const clamped = Math.max(0, Math.min(serie.length - 1, idx));
    setHover(clamped);
  }, [serie.length]);

  const handleMouseLeave = useCallback(() => {
    setHover(null);
  }, []);

  const tooltipStyle = useMemo(() => {
    if (hover === null || !serie.length) return {};
    const pct = ((hover + 0.5) / serie.length) * 100;
    const transform = pct < 18 ? 'translateX(0%)' : pct > 82 ? 'translateX(-100%)' : 'translateX(-50%)';
    return {
      left: `${pct}%`,
      transform,
    };
  }, [hover, serie.length]);

  if (serie.every(d => d.cantidad === 0)) {
    return (
      <div className="lb-stats-empty">
        <BarChart3 size={26} opacity={0.3} />
        <p>Todavía no hay visitas registradas en este período.</p>
      </div>
    );
  }

  return (
    <div className="lb-chart">
      <div className="lb-chart-head">
        <span>Visitas por día</span>
        <button type="button" className="lb-chip ghost" onClick={() => setVistaTabla(v => !v)}>
          {vistaTabla ? <BarChart3 size={12} /> : <Table2 size={12} />}
          {vistaTabla ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      </div>

      {vistaTabla ? (
        <div className="lb-chart-tabla-wrap">
          <table className="lb-chart-tabla">
            <thead><tr><th>Fecha</th><th>Visitas</th></tr></thead>
            <tbody>
              {serie.map(d => <tr key={d.fecha}><td>{formatFecha(d.fecha)}</td><td>{d.cantidad}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={wrapRef}
          className="lb-chart-svg-wrap"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseMove}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseLeave}
        >
          <svg viewBox={`0 0 ${ANCHO} ${ALTO + PAD_INF}`} preserveAspectRatio="none" className="lb-chart-svg">
            <line x1="0" y1={ALTO} x2={ANCHO} y2={ALTO} className="lb-chart-baseline" />
            {hover !== null && (
              <rect
                x={hover * anchoColumna}
                y={0}
                width={anchoColumna}
                height={ALTO}
                fill="color-mix(in srgb, var(--color-fg) 6%, transparent)"
                rx={3}
                style={{ pointerEvents: 'none' }}
              />
            )}
            {serie.map((d, i) => {
              const x = i * anchoColumna + 1;
              const alto = (d.cantidad / max) * (ALTO - 8);
              const activo = hover === i;
              return (
                <g key={d.fecha} style={{ pointerEvents: 'none' }}>
                  {d.cantidad > 0 ? (
                    <path
                      d={pathBarraRedondeada(x, ALTO - alto, anchoBarra, alto, 3)}
                      className={`lb-chart-bar ${activo ? 'activa' : ''}`}
                    />
                  ) : (
                    <rect x={x} y={ALTO - 1.5} width={anchoBarra} height="1.5" className="lb-chart-bar-cero" />
                  )}
                  {indicesEtiquetados.has(i) && (
                    <text x={x + anchoBarra / 2} y={ALTO + 13} className="lb-chart-label" textAnchor="middle">
                      {formatFecha(d.fecha)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hover !== null && serie[hover] && (
            <div
              className="lb-chart-tooltip"
              style={tooltipStyle}
            >
              <strong>{serie[hover].cantidad}</strong> visita{serie[hover].cantidad === 1 ? '' : 's'}
              <small>{formatFecha(serie[hover].fecha)}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EstadisticasPanel({ landingId }) {
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await landingService.estadisticas(landingId, dias));
    } catch {
      setError('No se pudieron cargar las estadísticas.');
    } finally {
      setCargando(false);
    }
  }, [landingId, dias]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return <div className="lb-empty"><Loader size={22} className="spin-icon" /><p>Cargando estadísticas...</p></div>;
  }
  if (error) {
    return <div className="lb-empty"><AlertCircle size={22} color="#ef4444" /><p>{error}</p></div>;
  }

  const ctrPct = (datos.ctr * 100).toFixed(1).replace(/\.0$/, '');

  return (
    <div className="lb-stats">
      <div className="lb-segmented">
        {PERIODOS.map(p => (
          <button key={p.valor} type="button" className={dias === p.valor ? 'active' : ''} onClick={() => setDias(p.valor)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="lb-stats-tiles">
        <div className="lb-stat-tile">
          <span className="lb-stat-icon"><Eye size={15} /></span>
          <span className="lb-stat-valor">{datos.visitas}</span>
          <span className="lb-stat-label">Visitas</span>
        </div>
        <div className="lb-stat-tile">
          <span className="lb-stat-icon"><MessageCircle size={15} /></span>
          <span className="lb-stat-valor">{datos.conversaciones_whatsapp}</span>
          <span className="lb-stat-label">Conversaciones WhatsApp</span>
        </div>
        <div className="lb-stat-tile">
          <span className="lb-stat-icon"><Percent size={15} /></span>
          <span className="lb-stat-valor">{ctrPct}%</span>
          <span className="lb-stat-label">CTR (contacto / visita)</span>
        </div>
      </div>

      <GraficoVisitas serie={datos.serie_visitas} />

      <div className="lb-stats-productos">
        <h3><Package size={14} /> Productos con más consultas</h3>
        {datos.productos_mas_consultados.length === 0 ? (
          <p className="lb-hint">Todavía no hay clics en "Consultar" en este período.</p>
        ) : (
          <div className="lb-productos-lista">
            {datos.productos_mas_consultados.map(p => {
              const max = datos.productos_mas_consultados[0].consultas;
              return (
                <div key={p.nombre} className="lb-producto-fila">
                  <span className="lb-producto-nombre">{p.nombre}</span>
                  <div className="lb-producto-barra-track">
                    <div className="lb-producto-barra" style={{ width: `${(p.consultas / max) * 100}%` }} />
                  </div>
                  <span className="lb-producto-cantidad">{p.consultas}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="lb-hint">
        No incluye ventas ni pedidos: Gesicom todavía no tiene un módulo de pedidos, así que "más vendido" no es un dato real que se pueda mostrar todavía.
      </p>
    </div>
  );
}
