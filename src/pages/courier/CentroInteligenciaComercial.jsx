import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, LayoutDashboard, ShoppingCart, Package, UserCheck, DollarSign, PiggyBank, List, MapPin, Truck, Shuffle, Users } from 'lucide-react';
import './CentroInteligenciaComercial.css';
import './analytics/analytics.css';
import './analytics/grouped-nav.css';

import { AnalyticsFilters } from './analytics/AnalyticsFilters';
import { ReporteResumen } from './analytics/reports/ReporteResumen';
import { ReporteVentas } from './analytics/reports/ReporteVentas';
import ReporteProductos from './analytics/reports/ReporteProductos';
import { ReporteComposicion } from './analytics/reports/ReporteComposicion';
import { ReporteClientes } from './analytics/reports/ReporteClientes';
import { ReporteMetodosPago } from './analytics/reports/ReporteMetodosPago';
import { ReporteFallos } from './analytics/reports/ReporteFallos';
import { ReporteGeografia } from './analytics/reports/ReporteGeografia';
import { ReporteLogistica } from './analytics/reports/ReporteLogistica';
import { ReporteAfinidad } from './analytics/reports/ReporteAfinidad';
import ReporteConfirmadores from './analytics/reports/ReporteConfirmadores';
import { ReporteFinanzas } from './analytics/reports/ReporteFinanzas';

export function CentroInteligenciaComercial({ couriers = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.has('report')) {
      searchParams.delete('report');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [activeReport, setActiveReport] = useState('resumen');
  const [analyticsFilters, setAnalyticsFilters] = useState({
    periodo: 'este_mes',
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    confirmador: 'TODOS',
    courierId: 'TODOS',
    canal_venta_id: 'TODOS',
  });
  const [confirmadoresDisponibles, setConfirmadoresDisponibles] = useState([]);

  const renderActiveReport = () => {
    switch (activeReport) {
      case 'resumen': return <ReporteResumen filters={analyticsFilters} setConfirmadoresDisponibles={setConfirmadoresDisponibles} />;
      case 'ventas': return <ReporteVentas filters={analyticsFilters} />;
      case 'productos': return <ReporteProductos filters={analyticsFilters} />;
      case 'composicion': return <ReporteComposicion filters={analyticsFilters} />;
      case 'afinidad': return <ReporteAfinidad filters={analyticsFilters} />;
      case 'clientes': return <ReporteClientes filters={analyticsFilters} />;
      case 'confirmadores': return <ReporteConfirmadores filters={analyticsFilters} />;
      case 'fallos': return <ReporteFallos filters={analyticsFilters} />;
      case 'geografia': return <ReporteGeografia filters={analyticsFilters} />;
      case 'logistica': return <ReporteLogistica filters={analyticsFilters} />;
      case 'metodos_pago': return <ReporteMetodosPago filters={analyticsFilters} />;
      case 'finanzas': return <ReporteFinanzas filters={analyticsFilters} />;
      default: return <ReporteResumen filters={analyticsFilters} setConfirmadoresDisponibles={setConfirmadoresDisponibles} />;
    }
  };

  return (
    <div className="cic-wrapper">
      <div className="cic-top-bar">
        <div className="cic-header-row">
          <div className="cic-title-box">
            <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-active))', padding: '0.6rem', borderRadius: '12px', color: 'var(--color-primary-fg)', display: 'flex' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-fg)' }}>Inteligencia Comercial</h2>
                <span className="cic-badge-live">
                  <span className="pulse-dot" /> En Vivo
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)', margin: '0.2rem 0 0 0' }}>
                Insights automáticos y reportes deep-dive.
              </p>
            </div>
          </div>
        </div>

        <AnalyticsFilters
          filters={analyticsFilters}
          setFilters={setAnalyticsFilters}
          confirmadoresDisponibles={confirmadoresDisponibles}
        />
      </div>

      <div className="cic-layout">
        {/* Sidebar de Navegación Agrupada */}
        <aside className="cic-sidebar-nav">
          <div className="cic-nav-group">
            <h4>Overview</h4>
            <button className={`cic-nav-item ${activeReport === 'resumen' ? 'active' : ''}`} onClick={() => setActiveReport('resumen')}>
              <LayoutDashboard size={15} /> Resumen General
            </button>
          </div>

          <div className="cic-nav-group">
            <h4>Ventas</h4>
            <button className={`cic-nav-item ${activeReport === 'ventas' ? 'active' : ''}`} onClick={() => setActiveReport('ventas')}>
              <ShoppingCart size={15} /> Vista de Pedidos
            </button>
            <button className={`cic-nav-item ${activeReport === 'productos' ? 'active' : ''}`} onClick={() => setActiveReport('productos')}>
              <Package size={15} /> Rendimiento de Productos
            </button>
            <button className={`cic-nav-item ${activeReport === 'composicion' ? 'active' : ''}`} onClick={() => setActiveReport('composicion')}>
              <List size={15} /> Composición (Upsells)
            </button>
            <button className={`cic-nav-item ${activeReport === 'afinidad' ? 'active' : ''}`} onClick={() => setActiveReport('afinidad')}>
              <Shuffle size={15} /> Afinidad de Productos
            </button>
          </div>

          <div className="cic-nav-group">
            <h4>Clientes</h4>
            <button className={`cic-nav-item ${activeReport === 'clientes' ? 'active' : ''}`} onClick={() => setActiveReport('clientes')}>
              <Users size={15} /> Comportamiento e Histórico
            </button>
          </div>

          <div className="cic-nav-group">
            <h4>Operaciones</h4>
            <button className={`cic-nav-item ${activeReport === 'confirmadores' ? 'active' : ''}`} onClick={() => setActiveReport('confirmadores')}>
              <UserCheck size={15} /> Desempeño Confirmadores
            </button>
            <button className={`cic-nav-item ${activeReport === 'fallos' ? 'active' : ''}`} onClick={() => setActiveReport('fallos')}>
              <TrendingUp size={15} /> Fallos y Devoluciones
            </button>
            <button className={`cic-nav-item ${activeReport === 'geografia' ? 'active' : ''}`} onClick={() => setActiveReport('geografia')}>
              <MapPin size={15} /> Geografía
            </button>
            <button className={`cic-nav-item ${activeReport === 'logistica' ? 'active' : ''}`} onClick={() => setActiveReport('logistica')}>
              <Truck size={15} /> Logística y Couriers
            </button>
          </div>

          <div className="cic-nav-group">
            <h4>Pagos y Finanzas</h4>
            <button className={`cic-nav-item ${activeReport === 'metodos_pago' ? 'active' : ''}`} onClick={() => setActiveReport('metodos_pago')}>
              <PiggyBank size={15} /> Métodos de Pago
            </button>
            <button className={`cic-nav-item ${activeReport === 'finanzas' ? 'active' : ''}`} onClick={() => setActiveReport('finanzas')}>
              <DollarSign size={15} /> Rentabilidad (Costos)
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="cic-content-area">
          {renderActiveReport()}
        </main>
      </div>
    </div>
  );
}
