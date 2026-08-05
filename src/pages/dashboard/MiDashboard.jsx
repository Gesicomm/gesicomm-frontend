import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye, MessageCircle, ShoppingCart, CreditCard, ArrowRight, Loader, Table2, BarChart3, Store,
} from 'lucide-react';
import { landingService } from '../../services/landingService';
import { getMetricasDashboardPedidos } from '../../services/courierApi';
import './MiDashboard.css';

const MESES = [
  { id: 1, label: 'Enero' }, { id: 2, label: 'Febrero' }, { id: 3, label: 'Marzo' },
  { id: 4, label: 'Abril' }, { id: 5, label: 'Mayo' }, { id: 6, label: 'Junio' },
  { id: 7, label: 'Julio' }, { id: 8, label: 'Agosto' }, { id: 9, label: 'Septiembre' },
  { id: 10, label: 'Octubre' }, { id: 11, label: 'Noviembre' }, { id: 12, label: 'Diciembre' },
];

const PRESETS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'este_mes', label: 'Este mes' },
  { id: 'mes_anterior', label: 'Mes anterior' },
  { id: 'este_anio', label: 'Este año' },
  { id: 'personalizado_mes', label: 'Por mes' },
];

/** Gs sin depender de que el valor ya venga como number — corta de raíz el
 * bug de "NaN%" en anchos de barra si algún día una API devuelve un
 * DECIMAL de Postgres como string. */
function gs(valor) {
  const n = Number(valor) || 0;
  return `Gs ${Math.round(n).toLocaleString('es-PY')}`;
}

function formatFechaCorta(iso) {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

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

/** Fila de ranking con barra proporcional — nunca divide por un máximo de
 * 0 (esa división es lo que rompía el ancho de las barras antes: NaN% cae
 * al ancho por defecto del navegador, que en un bloque es "ocupar todo"). */
function FilaRanking({ posicion, nombre, valor, valorLabel, max, tono }) {
  const pct = max > 0 ? Math.max(2, (valor / max) * 100) : 0;
  return (
    <div className="md-rank-fila">
      <span className="md-rank-num">{posicion}</span>
      <div className="md-rank-cuerpo">
        <div className="md-rank-linea">
          <span className="md-rank-nombre">{nombre}</span>
          <span className="md-rank-valor">{valorLabel}</span>
        </div>
        <div className="md-rank-track">
          <div className={`md-rank-barra md-rank-barra-${tono}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function GraficoTendencia({ serie }) {
  const [vistaTabla, setVistaTabla] = useState(false);
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const ANCHO = 800;
  const ALTO = 168;
  const PAD_INF = 22;
  const max = Math.max(1, ...serie.map(d => Math.max(d.visitas, d.contactos)));
  const grupoAncho = ANCHO / (serie.length || 1);
  const barAncho = Math.max(1.5, (grupoAncho - 4) / 2);
  const lineasGrid = [0.25, 0.5, 0.75, 1];

  const indicesEtiquetados = useMemo(() => {
    const n = serie.length;
    if (n <= 1) return new Set([0]);
    return new Set([0, Math.floor((n - 1) / 2), n - 1]);
  }, [serie.length]);

  const sinDatos = serie.every(d => d.visitas === 0 && d.contactos === 0);

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

  return (
    <section className="md-card md-chart-card">
      <div className="md-chart-head">
        <div>
          <h3 className="md-card-title">Visitas vs. contactos por día</h3>
          <div className="md-legend">
            <span className="md-legend-item"><i className="md-dot-visitas" /> Visitas</span>
            <span className="md-legend-item"><i className="md-dot-contactos" /> Contactos WhatsApp</span>
          </div>
        </div>
        <button type="button" className="md-btn-ghost" onClick={() => setVistaTabla(v => !v)}>
          {vistaTabla ? <BarChart3 size={13} /> : <Table2 size={13} />}
          {vistaTabla ? 'Gráfico' : 'Tabla'}
        </button>
      </div>

      {sinDatos ? (
        <div className="md-empty">
          <BarChart3 size={22} opacity={0.35} />
          <p>Sin visitas ni contactos registrados en este período.</p>
        </div>
      ) : vistaTabla ? (
        <div className="md-table-wrap">
          <table className="md-table">
            <thead><tr><th>Fecha</th><th>Visitas</th><th>Contactos</th><th>Valor en carrito</th></tr></thead>
            <tbody>
              {serie.map(d => (
                <tr key={d.fecha}>
                  <td>{formatFechaCorta(d.fecha)}</td>
                  <td>{d.visitas}</td>
                  <td>{d.contactos}</td>
                  <td>{gs(d.valor_carritos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={wrapRef}
          className="md-chart-svg-wrap"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseMove}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseLeave}
        >
          <svg viewBox={`0 0 ${ANCHO} ${ALTO + PAD_INF}`} preserveAspectRatio="none" className="md-chart-svg">
            {lineasGrid.map(f => (
              <line key={f} x1="0" y1={ALTO * (1 - f)} x2={ANCHO} y2={ALTO * (1 - f)} className="md-chart-grid" />
            ))}
            <line x1="0" y1={ALTO} x2={ANCHO} y2={ALTO} className="md-chart-baseline" />

            {hover !== null && (
              <rect
                x={hover * grupoAncho}
                y={0}
                width={grupoAncho}
                height={ALTO}
                fill="rgba(255, 255, 255, 0.06)"
                rx={3}
                style={{ pointerEvents: 'none' }}
              />
            )}

            {serie.map((d, i) => {
              const xGrupo = i * grupoAncho;
              const altoV = (d.visitas / max) * (ALTO - 6);
              const altoC = (d.contactos / max) * (ALTO - 6);
              const activo = hover === i;
              return (
                <g key={d.fecha} style={{ pointerEvents: 'none' }}>
                  <path
                    d={pathBarraRedondeada(xGrupo + 1, ALTO - altoV, barAncho, altoV, 2.5)}
                    className={`md-bar md-bar-visitas ${activo ? 'activa' : ''}`}
                  />
                  <path
                    d={pathBarraRedondeada(xGrupo + barAncho + 3, ALTO - altoC, barAncho, altoC, 2.5)}
                    className={`md-bar md-bar-contactos ${activo ? 'activa' : ''}`}
                  />
                  {indicesEtiquetados.has(i) && (
                    <text x={xGrupo + grupoAncho / 2} y={ALTO + 16} className="md-chart-label" textAnchor="middle">
                      {formatFechaCorta(d.fecha)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hover !== null && serie[hover] && (
            <div className="md-chart-tooltip" style={tooltipStyle}>
              <strong>{formatFechaCorta(serie[hover].fecha)}</strong>
              <span><i className="md-dot-visitas" /> {serie[hover].visitas} visitas</span>
              <span><i className="md-dot-contactos" /> {serie[hover].contactos} contactos</span>
              {serie[hover].valor_carritos > 0 && <small>{gs(serie[hover].valor_carritos)} en carritos</small>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function MiDashboard() {
  const [periodo, setPeriodo] = useState('este_mes');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  const [landingId, setLandingId] = useState(undefined); // undefined = todavía no se sabe, null = no tiene landing
  const [ventas, setVentas] = useState(null);
  const [pixel, setPixel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    landingService.listar()
      .then(landings => { if (activo) setLandingId(landings.length > 0 ? landings[0].id : null); })
      .catch(() => { if (activo) setLandingId(null); });
    return () => { activo = false; };
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    const filtros = { periodo, mes: periodo === 'personalizado_mes' ? mes : undefined, anio };
    try {
      const promesas = [getMetricasDashboardPedidos(filtros)];
      if (landingId) promesas.push(landingService.estadisticasRango(landingId, filtros));
      const [ventasRes, pixelRes] = await Promise.all(promesas);
      setVentas(ventasRes);
      if (pixelRes) setPixel(pixelRes);
    } catch (err) {
      console.error('Error cargando el dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [periodo, mes, anio, landingId]);

  useEffect(() => {
    if (landingId === undefined) return;
    cargar();
  }, [cargar, landingId]);

  const kpis = ventas?.kpis || { facturacion_entregada: 0, ticket_promedio: 0 };
  const funnel = ventas?.funnel || { entregados: 0 };
  const rangoLabel = ventas?.rango_fechas
    ? `${formatFechaCorta(ventas.rango_fechas.desde)} — ${formatFechaCorta(ventas.rango_fechas.hasta)}`
    : '';

  const productosVendidos = useMemo(() => {
    const lista = (ventas?.ranking_productos || []).filter(p => Number(p.facturacion_total) > 0);
    return [...lista].sort((a, b) => Number(b.facturacion_total) - Number(a.facturacion_total)).slice(0, 5);
  }, [ventas]);
  const maxVendidos = productosVendidos[0] ? Number(productosVendidos[0].facturacion_total) : 0;

  const productosConsultados = pixel?.productos_mas_consultados || [];
  const maxConsultados = productosConsultados[0]?.consultas || 0;

  const ctrPct = pixel ? (pixel.ctr * 100).toFixed(1).replace(/\.0$/, '') : '0';

  if (loading && !ventas) {
    return (
      <div className="md-page">
        <div className="md-loading">
          <Loader size={22} className="md-spin" />
          <span>Calculando tus métricas…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="md-page">
      <header className="md-header">
        <div>
          <span className="md-eyebrow">Mi Dashboard</span>
          <h1 className="md-h1">Cómo le está yendo a tu tienda</h1>
        </div>

        <div className="md-filtros">
          <div className="md-tabs">
            {PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                className={`md-tab ${periodo === p.id ? 'activo' : ''}`}
                onClick={() => setPeriodo(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="md-selects">
            {periodo === 'personalizado_mes' && (
              <select className="md-select" value={mes} onChange={e => setMes(Number(e.target.value))}>
                {MESES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            )}
            <select className="md-select" value={anio} onChange={e => setAnio(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* ── Hero: lo único que importa primero — plata confirmada ─────── */}
      <section className="md-hero">
        <div className="md-hero-top">
          <span className="md-eyebrow">Ventas confirmadas · {rangoLabel}</span>
          <span className="md-confirmado-tag"><i className="md-pulse" /> confirmado a mano</span>
        </div>
        <div className="md-hero-numero">{gs(kpis.facturacion_entregada)}</div>
        <div className="md-hero-stats">
          <span><strong>{funnel.entregados}</strong> pedidos entregados</span>
          <span className="md-hero-div" />
          <span>ticket promedio <strong>{gs(kpis.ticket_promedio)}</strong></span>
        </div>
      </section>

      {/* ── Interés en la landing (Pixel/CAPI) — intención, no venta ──── */}
      <section className="md-card md-funnel-card">
        <h3 className="md-card-title">Embudo de Conversión <span className="md-card-title-sub">Meta Pixel / CAPI</span></h3>
        <div className="md-funnel">
          <div className="md-funnel-step">
            <div className="md-funnel-icon md-icon-visitas"><Eye size={18} /></div>
            <div className="md-funnel-info">
              <span className="md-funnel-val">{pixel?.visitas ?? 0}</span>
              <span className="md-funnel-label">Visitas</span>
            </div>
          </div>
          
          <div className="md-funnel-arrow">
            <span className="md-funnel-pct">{pixel?.visitas > 0 ? ((pixel?.añadidos_carrito || 0) / pixel.visitas * 100).toFixed(1) : 0}%</span>
            <div className="md-funnel-line"></div>
          </div>

          <div className="md-funnel-step">
            <div className="md-funnel-icon md-icon-carrito"><ShoppingCart size={18} /></div>
            <div className="md-funnel-info">
              <span className="md-funnel-val">{pixel?.añadidos_carrito ?? 0}</span>
              <span className="md-funnel-label">Al carrito</span>
            </div>
          </div>

          <div className="md-funnel-arrow">
            <span className="md-funnel-pct">{pixel?.añadidos_carrito > 0 ? ((pixel?.checkouts_iniciados || 0) / pixel.añadidos_carrito * 100).toFixed(1) : 0}%</span>
            <div className="md-funnel-line"></div>
          </div>

          <div className="md-funnel-step">
            <div className="md-funnel-icon md-icon-checkout"><CreditCard size={18} /></div>
            <div className="md-funnel-info">
              <span className="md-funnel-val">{pixel?.checkouts_iniciados ?? 0}</span>
              <span className="md-funnel-label">Checkout</span>
            </div>
          </div>

          <div className="md-funnel-arrow">
            <span className="md-funnel-pct">{pixel?.checkouts_iniciados > 0 ? ((pixel?.contactos_whatsapp || 0) / pixel.checkouts_iniciados * 100).toFixed(1) : 0}%</span>
            <div className="md-funnel-line"></div>
          </div>

          <div className="md-funnel-step md-funnel-step-final">
            <div className="md-funnel-icon md-icon-contactos"><MessageCircle size={18} /></div>
            <div className="md-funnel-info">
              <span className="md-funnel-val">{pixel?.contactos_whatsapp ?? 0}</span>
              <span className="md-funnel-label">Contactos</span>
            </div>
          </div>
        </div>
        
        <div className="md-funnel-footer">
          <span>Conversión final (Visitas a Contactos): <strong>{ctrPct}%</strong></span>
          <span className="md-funnel-div" />
          <span>Valor total en carritos (intención de compra): <strong>{gs(pixel?.valor_carritos || 0)}</strong></span>
        </div>
      </section>

      {pixel ? (
        <GraficoTendencia serie={pixel.serie} />
      ) : (
        <section className="md-card md-chart-card">
          <div className="md-empty">
            <Store size={22} opacity={0.35} />
            <p>Todavía no tenés una landing publicada.</p>
            <Link to="/mi-landing" className="md-btn-primary">
              Crear mi landing <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      <div className="md-cols-2">
        <section className="md-card">
          <h3 className="md-card-title">Más vendidos <span className="md-card-title-sub">confirmado</span></h3>
          {productosVendidos.length === 0 ? (
            <p className="md-empty-hint">Todavía no hay pedidos entregados en este período — en cuanto confirmes uno, aparece acá.</p>
          ) : (
            <div className="md-rank-lista">
              {productosVendidos.map((p, i) => (
                <FilaRanking
                  key={p.producto_id || p.nombre}
                  posicion={i + 1}
                  nombre={p.nombre}
                  valor={Number(p.facturacion_total)}
                  valorLabel={gs(p.facturacion_total)}
                  max={maxVendidos}
                  tono="confirmado"
                />
              ))}
            </div>
          )}
        </section>

        <section className="md-card">
          <h3 className="md-card-title">Más consultados <span className="md-card-title-sub">pixel</span></h3>
          {productosConsultados.length === 0 ? (
            <p className="md-empty-hint">Todavía no hay clics en "Consultar" en este período.</p>
          ) : (
            <div className="md-rank-lista">
              {productosConsultados.map((p, i) => (
                <FilaRanking
                  key={p.nombre}
                  posicion={i + 1}
                  nombre={p.nombre}
                  valor={p.consultas}
                  valorLabel={`${p.consultas}`}
                  max={maxConsultados}
                  tono="intent"
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="md-footer-link">
        <Link to="/mis-pedidos?tab=analitica" className="md-btn-ghost">
          Ver Centro de Inteligencia Comercial completo <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
