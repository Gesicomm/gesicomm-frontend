import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  CheckCircle2,
  Truck,
  RotateCcw,
  AlertTriangle,
  DollarSign,
  Users,
  Calendar,
  Filter,
  Download,
  Printer,
  Mail,
  RefreshCw,
  Search,
  ArrowRight,
  TrendingDown,
  Trophy,
  UserCheck,
  Percent,
  X,
  CreditCard,
  Receipt
} from 'lucide-react';
import { getMetricasDashboardPedidos, getCouriers } from '../../services/courierApi';
import { formatGs } from '../../lib/courier';
import './CentroInteligenciaComercial.css';

const MESES = [
  { id: 1, label: 'Enero' },
  { id: 2, label: 'Febrero' },
  { id: 3, label: 'Marzo' },
  { id: 4, label: 'Abril' },
  { id: 5, label: 'Mayo' },
  { id: 6, label: 'Junio' },
  { id: 7, label: 'Julio' },
  { id: 8, label: 'Agosto' },
  { id: 9, label: 'Septiembre' },
  { id: 10, label: 'Octubre' },
  { id: 11, label: 'Noviembre' },
  { id: 12, label: 'Diciembre' }
];

export function CentroInteligenciaComercial() {
  // Filtros
  const [periodo, setPeriodo] = useState('este_mes');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [confirmador, setConfirmador] = useState('TODOS');
  const [courierId, setCourierId] = useState('TODOS');
  const [origen, setOrigen] = useState('TODOS');
  const [searchProd, setSearchProd] = useState('');

  // Ordenamiento de tabla de productos
  const [sortField, setSortField] = useState('unidades_totales');
  const [sortOrder, setSortOrder] = useState('desc');

  // Datos
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [couriersList, setCouriersList] = useState([]);

  // Modal Programar Reporte
  const [openScheduleModal, setOpenScheduleModal] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleTime, setScheduleTime] = useState('08:30');
  const [scheduleSaved, setScheduleSaved] = useState(false);

  useEffect(() => {
    cargarCouriers();
  }, []);

  useEffect(() => {
    cargarMetricas();
  }, [periodo, mes, anio, confirmador, courierId, origen]);

  const cargarCouriers = async () => {
    try {
      const res = await getCouriers();
      setCouriersList(res || []);
    } catch (err) {
      console.error('Error cargando couriers:', err);
    }
  };

  const cargarMetricas = async () => {
    try {
      setLoading(true);
      const payload = {
        periodo,
        mes: periodo === 'personalizado_mes' ? mes : undefined,
        anio,
        confirmador,
        courier_id: courierId,
        origen,
      };
      const res = await getMetricasDashboardPedidos(payload);
      setData(res);
    } catch (err) {
      console.error('Error cargando métricas analíticas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Productos filtrados y ordenados
  const productosFiltrados = useMemo(() => {
    if (!data?.ranking_productos) return [];
    let list = [...data.ranking_productos];
    if (searchProd.trim()) {
      const q = searchProd.toLowerCase();
      list = list.filter(p => p.nombre.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)));
    }
    list.sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];
      if (typeof vA === 'string') {
        return sortOrder === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortOrder === 'asc' ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
    });
    return list;
  }, [data, searchProd, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    if (!data) return;
    const rows = [];
    rows.push(['CENTRO DE INTELIGENCIA COMERCIAL - GESICOMM']);
    rows.push([`Periodo: ${data.rango_fechas.desde} al ${data.rango_fechas.hasta}`]);
    rows.push([]);

    rows.push(['EMBUDO GENERAL']);
    rows.push(['Total Creados', data.funnel.total_creados]);
    rows.push(['Confirmados', data.funnel.confirmados, `${data.funnel.tasa_confirmacion}%`]);
    rows.push(['Despachados', data.funnel.despachados, `${data.funnel.tasa_despacho}%`]);
    rows.push(['Entregados', data.funnel.entregados, `${data.funnel.tasa_entrega}%`]);
    rows.push(['Devueltos', data.funnel.devueltos, `${data.funnel.tasa_devolucion}%`]);
    rows.push([]);

    rows.push(['RANKING DE PRODUCTOS']);
    rows.push(['Producto', 'SKU', 'Pedidos', 'Unidades', 'Confirmados', '% Conf.', 'Entregados', '% Entrega', 'Facturacion', 'Margen Estimado']);
    (data.ranking_productos || []).forEach(p => {
      rows.push([
        `"${p.nombre}"`,
        p.sku || '',
        p.total_pedidos,
        p.unidades_totales,
        p.confirmados,
        `${p.tasa_confirmacion}%`,
        p.entregados,
        `${p.tasa_entrega}%`,
        p.facturacion_total,
        p.margen_estimado
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Analytics_Gesicomm_${data.rango_fechas.desde}_${data.rango_fechas.hasta}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSchedule = (e) => {
    e.preventDefault();
    setScheduleSaved(true);
    setTimeout(() => {
      setScheduleSaved(false);
      setOpenScheduleModal(false);
    }, 1500);
  };

  const funnel = data?.funnel || {
    total_creados: 0,
    confirmados: 0,
    despachados: 0,
    entregados: 0,
    devueltos: 0,
    tasa_confirmacion: 0,
    tasa_despacho: 0,
    tasa_entrega: 0,
    tasa_devolucion: 0,
    canales: { web: { total: 0, confirmados: 0, tasa: 0 }, whatsapp: { total: 0, confirmados: 0, tasa: 0 } }
  };

  const kpis = data?.kpis || {
    facturacion_entregada: 0,
    valor_confirmado: 0,
    valor_perdido: 0,
    ticket_promedio: 0,
    costo_logistico_total: 0,
    costo_logistico_por_entrega: 0,
    costo_comision_total: 0,
    costo_comision_por_entrega: 0,
    iva_facturado_total: 0,
    margen_bruto_estimado: 0,
    pct_margen_bruto: 0
  };

  return (
    <div className="cic-wrapper">
      {/* 1. TOP BAR DE CONTROL Y FILTROS */}
      <div className="cic-top-bar">
        <div className="cic-header-row">
          <div className="cic-title-box">
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '0.6rem', borderRadius: '12px', color: '#fff', display: 'flex' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>Centro de Inteligencia Comercial & Analytics</h2>
                <span className="cic-badge-live">
                  <span className="pulse-dot" /> En Vivo
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                Tracker analítico de confirmaciones, funnel comercial, rendimiento de productos y scorecards de transporte.
              </p>
            </div>
          </div>

          <div className="cic-actions-row">
            <button type="button" className="cic-btn" onClick={cargarMetricas} title="Actualizar datos">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refrescar
            </button>
            <button type="button" className="cic-btn" onClick={handleExportCSV}>
              <Download size={15} />
              Exportar CSV / Excel
            </button>
            <button type="button" className="cic-btn" onClick={handlePrint}>
              <Printer size={15} />
              Imprimir / PDF
            </button>
            <button type="button" className="cic-btn cic-btn-primary" onClick={() => setOpenScheduleModal(true)}>
              <Mail size={15} />
              Programar Envío Diario
            </button>
          </div>
        </div>

        {/* Barra de Presets Rápidos */}
        <div className="cic-presets-bar">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: '0.3rem' }}>
            Período:
          </span>
          {[
            { id: 'hoy', label: 'Hoy' },
            { id: 'ayer', label: 'Ayer' },
            { id: '7d', label: 'Últimos 7 días' },
            { id: '30d', label: 'Últimos 30 días' },
            { id: 'este_mes', label: 'Este Mes' },
            { id: 'mes_anterior', label: 'Mes Anterior' },
            { id: 'este_anio', label: 'Este Año' },
            { id: 'personalizado_mes', label: 'Por Mes' },
          ].map(p => (
            <button
              key={p.id}
              type="button"
              className={`cic-preset-pill ${periodo === p.id ? 'active' : ''}`}
              onClick={() => setPeriodo(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filtros Dropdown Específicos */}
        <div className="cic-filters-grid">
          {periodo === 'personalizado_mes' && (
            <div className="cic-filter-item">
              <label className="cic-filter-label">Mes</label>
              <select className="cic-select" value={mes} onChange={e => setMes(Number(e.target.value))}>
                {MESES.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="cic-filter-item">
            <label className="cic-filter-label">Año</label>
            <select className="cic-select" value={anio} onChange={e => setAnio(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="cic-filter-item">
            <label className="cic-filter-label">Confirmador</label>
            <select className="cic-select" value={confirmador} onChange={e => setConfirmador(e.target.value)}>
              <option value="TODOS">Todos los confirmadores</option>
              {(data?.confirmadores_disponibles || []).map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="cic-filter-item">
            <label className="cic-filter-label">Courier</label>
            <select className="cic-select" value={courierId} onChange={e => setCourierId(e.target.value)}>
              <option value="TODOS">Todos los Couriers</option>
              {couriersList.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="cic-filter-item">
            <label className="cic-filter-label">Canal / Origen</label>
            <select className="cic-select" value={origen} onChange={e => setOrigen(e.target.value)}>
              <option value="TODOS">Todos los Canales</option>
              <option value="WEB">Web / Catálogo</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="LANDING">Landing Page</option>
              <option value="MANUAL">Manual / Directo</option>
              <option value="META_ADS">Meta Ads</option>
            </select>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: '#6366f1' }} />
          Calculando métricas comerciales y logísticas en tiempo real...
        </div>
      ) : (
        <>
          {/* ==========================================================================
              A. VISUAL CONVERSION FUNNEL (EMBUDO DE CONVERSIÓN COMPLETO)
              ========================================================================== */}
          <div className="cic-funnel-card">
            <div className="cic-card-header">
              <div>
                <h3 className="cic-card-title">
                  <TrendingUp size={18} style={{ color: '#6366f1' }} />
                  Embudo de Conversión Integral (Funnel de Pedidos)
                </h3>
                <p className="cic-card-subtitle">
                  Rango evaluado: <strong style={{ color: '#fff' }}>{data?.rango_fechas?.desde}</strong> al <strong style={{ color: '#fff' }}>{data?.rango_fechas?.hasta}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.45rem 0.9rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.78rem' }}>
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>Canal Web: </span>
                  <span style={{ color: '#fff', fontWeight: 800 }}>{funnel.canales.web.confirmados}/{funnel.canales.web.total} ({funnel.canales.web.tasa}%)</span>
                </div>
                <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ fontSize: '0.78rem' }}>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>WhatsApp: </span>
                  <span style={{ color: '#fff', fontWeight: 800 }}>{funnel.canales.whatsapp.confirmados}/{funnel.canales.whatsapp.total} ({funnel.canales.whatsapp.tasa}%)</span>
                </div>
              </div>
            </div>

            <div className="cic-funnel-track">
              {/* Paso 1: Creados */}
              <div className="cic-funnel-step step-created">
                <div className="cic-step-head">
                  <span>1. Pedidos Creados</span>
                  <Package size={16} />
                </div>
                <div className="cic-step-val">{funnel.total_creados}</div>
                <div className="cic-step-rate-badge rate-blue">
                  100% Volumen Base
                </div>
                <div className="cic-step-progress-bar">
                  <div className="cic-step-progress-fill" style={{ width: '100%', background: '#3b82f6' }} />
                </div>
              </div>

              {/* Paso 2: Confirmados */}
              <div className="cic-funnel-step step-confirmed">
                <div className="cic-step-head">
                  <span>2. Confirmados</span>
                  <CheckCircle2 size={16} />
                </div>
                <div className="cic-step-val">{funnel.confirmados}</div>
                <div className="cic-step-rate-badge rate-green">
                  {funnel.tasa_confirmacion}% Tasa Confirmación
                </div>
                <div className="cic-step-progress-bar">
                  <div className="cic-step-progress-fill" style={{ width: `${Math.min(100, funnel.tasa_confirmacion)}%`, background: '#10b981' }} />
                </div>
              </div>

              {/* Paso 3: Despachados */}
              <div className="cic-funnel-step step-dispatched">
                <div className="cic-step-head">
                  <span>3. Despachados</span>
                  <Truck size={16} />
                </div>
                <div className="cic-step-val">{funnel.despachados}</div>
                <div className="cic-step-rate-badge rate-purple">
                  {funnel.tasa_despacho}% de Confirmados
                </div>
                <div className="cic-step-progress-bar">
                  <div className="cic-step-progress-fill" style={{ width: `${Math.min(100, funnel.tasa_despacho)}%`, background: '#8b5cf6' }} />
                </div>
              </div>

              {/* Paso 4: Entregados */}
              <div className="cic-funnel-step step-delivered">
                <div className="cic-step-head">
                  <span>4. Entregados / Rendidos</span>
                  <Trophy size={16} />
                </div>
                <div className="cic-step-val">{funnel.entregados}</div>
                <div className="cic-step-rate-badge rate-green">
                  {funnel.tasa_entrega}% Tasa Entrega
                </div>
                <div className="cic-step-progress-bar">
                  <div className="cic-step-progress-fill" style={{ width: `${Math.min(100, funnel.tasa_entrega)}%`, background: '#06b6d4' }} />
                </div>
              </div>

              {/* Paso 5: Devoluciones */}
              <div className="cic-funnel-step step-returned">
                <div className="cic-step-head">
                  <span>5. Devoluciones</span>
                  <RotateCcw size={16} />
                </div>
                <div className="cic-step-val">{funnel.devueltos}</div>
                <div className="cic-step-rate-badge rate-red">
                  {funnel.tasa_devolucion}% Tasa Devolución
                </div>
                <div className="cic-step-progress-bar">
                  <div className="cic-step-progress-fill" style={{ width: `${Math.min(100, funnel.tasa_devolucion)}%`, background: '#f43f5e' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ==========================================================================
              B. SMART INSIGHTS & ALERTAS ACCIONABLES
              ========================================================================== */}
          {data?.insights && data.insights.length > 0 && (
            <div className="cic-insights-grid">
              {data.insights.map((ins, i) => {
                let iconClass = 'icon-info';
                if (ins.tipo === 'positivo') iconClass = 'icon-positivo';
                if (ins.tipo === 'alerta') iconClass = 'icon-alerta';
                if (ins.tipo === 'critico') iconClass = 'icon-critico';

                return (
                  <div key={i} className="cic-insight-card">
                    <div className={`cic-insight-icon ${iconClass}`}>
                      {ins.tipo === 'positivo' ? <Trophy size={18} /> : ins.tipo === 'critico' ? <AlertTriangle size={18} /> : <TrendingUp size={18} />}
                    </div>
                    <div className="cic-insight-content">
                      <h4>{ins.titulo}</h4>
                      <p>{ins.mensaje}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ==========================================================================
              C. FINANCIAL & OPERATIONAL KPIS GRID
              ========================================================================== */}
          <div className="cic-kpis-grid">
            <div className="cic-kpi-card" style={{ borderTop: '3px solid #10b981' }}>
              <div className="cic-kpi-header">
                <span>Facturación Entregada</span>
                <DollarSign size={16} style={{ color: '#34d399' }} />
              </div>
              <div className="cic-kpi-val" style={{ color: '#34d399' }}>{formatGs(kpis.facturacion_entregada)}</div>
              <div className="cic-kpi-sub">Total cobrado de {funnel.entregados} pedidos entregados</div>
            </div>

            <div className="cic-kpi-card" style={{ borderTop: '3px solid #6366f1' }}>
              <div className="cic-kpi-header">
                <span>Ticket Promedio</span>
                <Percent size={16} style={{ color: '#818cf8' }} />
              </div>
              <div className="cic-kpi-val">{formatGs(kpis.ticket_promedio)}</div>
              <div className="cic-kpi-sub">Promedio por pedido entregado</div>
            </div>

            <div className="cic-kpi-card" style={{ borderTop: '3px solid #3b82f6' }}>
              <div className="cic-kpi-header">
                <span>Valor Confirmado en Proceso</span>
                <TrendingUp size={16} style={{ color: '#60a5fa' }} />
              </div>
              <div className="cic-kpi-val">{formatGs(kpis.valor_confirmado)}</div>
              <div className="cic-kpi-sub">En ruta / esperando entrega</div>
            </div>

            <div className="cic-kpi-card" style={{ borderTop: '3px solid #f43f5e' }}>
              <div className="cic-kpi-header">
                <span>Valor Perdido / Cancelado</span>
                <TrendingDown size={16} style={{ color: '#fb7185' }} />
              </div>
              <div className="cic-kpi-val" style={{ color: '#fb7185' }}>{formatGs(kpis.valor_perdido)}</div>
              <div className="cic-kpi-sub">En cancelaciones y devoluciones</div>
            </div>

            <div className="cic-kpi-card" style={{ borderTop: '3px solid #f59e0b' }}>
              <div className="cic-kpi-header">
                <span>Costo Logístico Total</span>
                <Truck size={16} style={{ color: '#fbbf24' }} />
              </div>
              <div className="cic-kpi-val">{formatGs(kpis.costo_logistico_total)}</div>
              <div className="cic-kpi-sub">Costo por entrega: {formatGs(kpis.costo_logistico_por_entrega)}</div>
            </div>

            <div className="cic-kpi-card" style={{ borderTop: '3px solid #06b6d4' }}>
              <div className="cic-kpi-header">
                <span>Comisiones de Cobro</span>
                <CreditCard size={16} style={{ color: '#22d3ee' }} />
              </div>
              <div className="cic-kpi-val">{formatGs(kpis.costo_comision_total)}</div>
              <div className="cic-kpi-sub">Por entrega: {formatGs(kpis.costo_comision_por_entrega)}</div>
            </div>

            <div className="cic-kpi-card" style={{ borderTop: '3px solid #eab308' }}>
              <div className="cic-kpi-header">
                <span>IVA a Pagar (Facturas)</span>
                <Receipt size={16} style={{ color: '#facc15' }} />
              </div>
              <div className="cic-kpi-val">{formatGs(kpis.iva_facturado_total)}</div>
              <div className="cic-kpi-sub">10% sobre pedidos con factura</div>
            </div>

            <div className="cic-kpi-card" style={{ borderTop: '3px solid #8b5cf6' }}>
              <div className="cic-kpi-header">
                <span>Margen Bruto Estimado</span>
                <Trophy size={16} style={{ color: '#c084fc' }} />
              </div>
              <div className="cic-kpi-val" style={{ color: '#c084fc' }}>{formatGs(kpis.margen_bruto_estimado)}</div>
              <div className="cic-kpi-sub">Margen sobre ventas: {kpis.pct_margen_bruto}%</div>
            </div>
          </div>

          {/* ==========================================================================
              D. SPARKLINES DE TENDENCIAS
              ========================================================================== */}
          {data?.tendencias && data.tendencias.length > 0 && (
            <div className="cic-trends-grid">
              <div className="cic-trend-card">
                <div className="cic-trend-header">
                  <span>📈 Tendencia de Pedidos Creados</span>
                  <span style={{ color: '#3b82f6', fontWeight: 800 }}>{funnel.total_creados}</span>
                </div>
                <div className="cic-sparkline-box">
                  {data.tendencias.map((t, idx) => {
                    const maxP = Math.max(...data.tendencias.map(x => x.pedidos), 1);
                    const h = Math.max(8, (t.pedidos / maxP) * 100);
                    return (
                      <div
                        key={idx}
                        className="cic-spark-bar"
                        style={{ height: `${h}%`, background: '#3b82f6' }}
                        title={`${t.fecha}: ${t.pedidos} pedidos`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="cic-trend-card">
                <div className="cic-trend-header">
                  <span>🟢 Tendencia de Confirmaciones</span>
                  <span style={{ color: '#10b981', fontWeight: 800 }}>{funnel.confirmados}</span>
                </div>
                <div className="cic-sparkline-box">
                  {data.tendencias.map((t, idx) => {
                    const maxC = Math.max(...data.tendencias.map(x => x.confirmados), 1);
                    const h = Math.max(8, (t.confirmados / maxC) * 100);
                    return (
                      <div
                        key={idx}
                        className="cic-spark-bar"
                        style={{ height: `${h}%`, background: '#10b981' }}
                        title={`${t.fecha}: ${t.confirmados} confirmados`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="cic-trend-card">
                <div className="cic-trend-header">
                  <span>🚚 Tendencia de Entregas</span>
                  <span style={{ color: '#06b6d4', fontWeight: 800 }}>{funnel.entregados}</span>
                </div>
                <div className="cic-sparkline-box">
                  {data.tendencias.map((t, idx) => {
                    const maxE = Math.max(...data.tendencias.map(x => x.entregados), 1);
                    const h = Math.max(8, (t.entregados / maxE) * 100);
                    return (
                      <div
                        key={idx}
                        className="cic-spark-bar"
                        style={{ height: `${h}%`, background: '#06b6d4' }}
                        title={`${t.fecha}: ${t.entregados} entregados`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="cic-trend-card">
                <div className="cic-trend-header">
                  <span>⚠️ Tendencia de Devoluciones</span>
                  <span style={{ color: '#f43f5e', fontWeight: 800 }}>{funnel.devueltos}</span>
                </div>
                <div className="cic-sparkline-box">
                  {data.tendencias.map((t, idx) => {
                    const maxD = Math.max(...data.tendencias.map(x => x.devueltos), 1);
                    const h = Math.max(8, (t.devueltos / maxD) * 100);
                    return (
                      <div
                        key={idx}
                        className="cic-spark-bar"
                        style={{ height: `${h}%`, background: '#f43f5e' }}
                        title={`${t.fecha}: ${t.devueltos} devoluciones`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================================
              E. RANKING DE PRODUCTOS (¿QUÉ SE ESTÁ VENDIENDO Y CONFIRMANDO MÁS?)
              ========================================================================== */}
          <div className="cic-table-card">
            <div className="cic-card-header">
              <div>
                <h3 className="cic-card-title">
                  <Package size={18} style={{ color: '#6366f1' }} />
                  Ranking de Productos & Análisis de Conversión
                </h3>
                <p className="cic-card-subtitle">
                  Métricas por producto: volumen de pedidos, tasas de confirmación y entrega, facturación y margen.
                </p>
              </div>

              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Buscar producto o SKU..."
                  className="cic-input"
                  style={{ width: '100%', paddingLeft: '2rem', height: '36px' }}
                  value={searchProd}
                  onChange={e => setSearchProd(e.target.value)}
                />
              </div>
            </div>

            <div className="cic-table-wrapper">
              <table className="cic-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('nombre')}>
                      Producto {sortField === 'nombre' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Canales</th>
                    <th className="sortable" style={{ textAlign: 'center' }} onClick={() => handleSort('total_pedidos')}>
                      Pedidos {sortField === 'total_pedidos' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="sortable" style={{ textAlign: 'center' }} onClick={() => handleSort('unidades_totales')}>
                      Unidades {sortField === 'unidades_totales' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="sortable" style={{ textAlign: 'center' }} onClick={() => handleSort('confirmados')}>
                      Confirmados {sortField === 'confirmados' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="sortable" style={{ textAlign: 'center' }} onClick={() => handleSort('tasa_confirmacion')}>
                      % Confirmación {sortField === 'tasa_confirmacion' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="sortable" style={{ textAlign: 'center' }} onClick={() => handleSort('tasa_entrega')}>
                      % Entrega {sortField === 'tasa_entrega' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="sortable" style={{ textAlign: 'right' }} onClick={() => handleSort('facturacion_total')}>
                      Facturación {sortField === 'facturacion_total' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="sortable" style={{ textAlign: 'right' }} onClick={() => handleSort('margen_estimado')}>
                      Margen Est. {sortField === 'margen_estimado' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No se encontraron productos registrados en este período.
                      </td>
                    </tr>
                  ) : (
                    productosFiltrados.map((p, idx) => {
                      let badgeClass = 'badge-green';
                      if (p.badge === 'moderado') badgeClass = 'badge-yellow';
                      if (p.badge === 'critico') badgeClass = 'badge-red';

                      return (
                        <tr key={idx}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#fff' }}>{p.nombre}</div>
                            {p.sku && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>SKU: {p.sku}</div>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              {p.canales.WEB > 0 && <span className="cic-channel-tag tag-web">Web ({p.canales.WEB})</span>}
                              {p.canales.WHATSAPP > 0 && <span className="cic-channel-tag tag-whatsapp">Wpp ({p.canales.WHATSAPP})</span>}
                              {p.canales.OTROS > 0 && <span className="cic-channel-tag tag-landing">Otro ({p.canales.OTROS})</span>}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.total_pedidos}</td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: '#60a5fa' }}>{p.unidades_totales}</td>
                          <td style={{ textAlign: 'center', color: '#34d399', fontWeight: 700 }}>{p.confirmados}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`cic-status-badge ${badgeClass}`}>
                              {p.tasa_confirmacion}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>
                            {p.tasa_entrega}%
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                            {formatGs(p.facturacion_total)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#c084fc' }}>
                            {formatGs(p.margen_estimado)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==========================================================================
              F. RENDIMIENTO DE CONFIRMADORES (MÉTRICA COMERCIAL)
              ========================================================================== */}
          <div className="cic-table-card">
            <div className="cic-card-header">
              <div>
                <h3 className="cic-card-title">
                  <UserCheck size={18} style={{ color: '#10b981' }} />
                  Rendimiento del Equipo de Confirmadores
                </h3>
                <p className="cic-card-subtitle">
                  Evaluación comercial individual: efectividad en confirmaciones, ticket promedio y producto líder.
                </p>
              </div>
            </div>

            <div className="cic-table-wrapper">
              <table className="cic-table">
                <thead>
                  <tr>
                    <th>Confirmador</th>
                    <th style={{ textAlign: 'center' }}>Pedidos Asignados</th>
                    <th style={{ textAlign: 'center' }}>Confirmados</th>
                    <th style={{ textAlign: 'center' }}>Cancelados</th>
                    <th style={{ textAlign: 'center' }}>% Efectividad</th>
                    <th style={{ textAlign: 'right' }}>Ticket Promedio</th>
                    <th>Producto Top</th>
                    <th>Canal Principal</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.confirmadores || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No hay confirmaciones registradas en este período.
                      </td>
                    </tr>
                  ) : (
                    data.confirmadores.map((c, i) => {
                      let badgeClass = 'badge-green';
                      if (c.badge === 'moderado') badgeClass = 'badge-yellow';
                      if (c.badge === 'critico') badgeClass = 'badge-red';

                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, color: '#fff' }}>{c.confirmador}</td>
                          <td style={{ textAlign: 'center' }}>{c.total_pedidos}</td>
                          <td style={{ textAlign: 'center', color: '#34d399', fontWeight: 800 }}>{c.confirmados}</td>
                          <td style={{ textAlign: 'center', color: '#fb7185' }}>{c.cancelados}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`cic-status-badge ${badgeClass}`}>
                              {c.tasa_confirmacion}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatGs(c.ticket_promedio)}</td>
                          <td style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{c.mejor_producto}</td>
                          <td>
                            <span className="cic-channel-tag tag-web">{c.mejor_canal}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==========================================================================
              G. SCORECARDS DE COURIERS (LOGÍSTICA Y TRANSPORTE)
              ========================================================================== */}
          <div className="cic-table-card">
            <div className="cic-card-header">
              <div>
                <h3 className="cic-card-title">
                  <Truck size={18} style={{ color: '#3b82f6' }} />
                  Scorecards Operativos por Courier
                </h3>
                <p className="cic-card-subtitle">
                  Rendimiento logístico: tasa de entrega %, devoluciones, recaudación de dinero y costos de flete.
                </p>
              </div>
            </div>

            <div className="cic-courier-cards-grid">
              {(data?.couriers || []).map((cr, idx) => {
                let badgeClass = 'badge-green';
                if (cr.badge === 'moderado') badgeClass = 'badge-yellow';
                if (cr.badge === 'critico') badgeClass = 'badge-red';

                return (
                  <div key={idx} className="cic-courier-card">
                    <div className="cic-courier-card-head">
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{cr.nombre}</h4>
                        {cr.vehiculo && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{cr.vehiculo}</span>}
                      </div>
                      <span className={`cic-status-badge ${badgeClass}`}>
                        {cr.tasa_entrega}% Entrega
                      </span>
                    </div>

                    <div className="cic-courier-stats-row">
                      <div className="cic-courier-stat-item">
                        <span>Asignados</span>
                        <span>{cr.total_asignados}</span>
                      </div>
                      <div className="cic-courier-stat-item">
                        <span>Entregados</span>
                        <span style={{ color: '#34d399' }}>{cr.entregados}</span>
                      </div>
                      <div className="cic-courier-stat-item">
                        <span>En Ruta</span>
                        <span style={{ color: '#60a5fa' }}>{cr.en_transito}</span>
                      </div>
                      <div className="cic-courier-stat-item">
                        <span>Devueltos</span>
                        <span style={{ color: '#fb7185' }}>{cr.devueltos}</span>
                      </div>
                    </div>

                    <div className="cic-courier-finance-row">
                      <div>
                        <span style={{ color: '#94a3b8' }}>Recaudado: </span>
                        <strong style={{ color: '#34d399' }}>{formatGs(cr.monto_recaudado)}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Fletes: </span>
                        <strong style={{ color: '#fbbf24' }}>{formatGs(cr.costo_fletes)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ==========================================================================
          MODAL DE PROGRAMAR REPORTE DIARIO
          ========================================================================== */}
      {openScheduleModal && (
        <div className="cic-modal-overlay" onClick={() => setOpenScheduleModal(false)}>
          <div className="cic-modal-box" onClick={e => e.stopPropagation()}>
            <div className="cic-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={20} style={{ color: '#6366f1' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  Programar Reporte Diario Automatizado
                </h3>
              </div>
              <button type="button" className="cic-btn" style={{ padding: '0.3rem' }} onClick={() => setOpenScheduleModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
              El sistema generará y enviará automáticamente cada mañana un resumen ejecutivo con el Embudo de Pedidos, Ranking de Productos y Alertas de Couriers a tu correo o al del supervisor.
            </p>

            <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="cic-input-group">
                <label>Email del Destinatario / Supervisor</label>
                <input
                  type="email"
                  required
                  placeholder="supervisor@empresa.com"
                  className="cic-input"
                  value={scheduleEmail}
                  onChange={e => setScheduleEmail(e.target.value)}
                />
              </div>

              <div className="cic-input-group">
                <label>Hora de Envío Diario</label>
                <input
                  type="time"
                  required
                  className="cic-input"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <label style={{ fontWeight: 700 }}>Secciones a incluir en el reporte:</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="checkbox" defaultChecked /> Resumen del Embudo Comercial & Logístico
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="checkbox" defaultChecked /> Top 10 Productos con Mayor Demanda y % Confirmación
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="checkbox" defaultChecked /> Alertas de Couriers con exceso de devolución
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button type="button" className="cic-btn" onClick={() => setOpenScheduleModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cic-btn cic-btn-primary">
                  {scheduleSaved ? '✓ ¡Programado con éxito!' : 'Guardar y Activar Envío'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
