import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, LayoutDashboard, ShoppingCart, Package, UserCheck, Truck, DollarSign, PiggyBank } from 'lucide-react';
import './CentroInteligenciaComercial.css';
import './analytics/analytics.css';

import { AnalyticsFilters } from './analytics/AnalyticsFilters';
import { ReporteResumen } from './analytics/reports/ReporteResumen';
import { ReporteVentas } from './analytics/reports/ReporteVentas';
import ReporteProductos from './analytics/reports/ReporteProductos';
import ReporteConfirmadores from './analytics/reports/ReporteConfirmadores';
import { ReporteFinanzas } from './analytics/reports/ReporteFinanzas';
import { ReporteRentabilidad } from './analytics/reports/ReporteRentabilidad';
import { PlaceholderReport } from './analytics/reports/PlaceholderReport';
import { DashboardGeneralTab } from './DashboardGeneralTab';

export function CentroInteligenciaComercial({ couriers = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Limpiar la URL si tiene ?report= para no confundir al usuario (ahora usamos estado local)
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
    canal_venta_id: 'TODOS'
  });

  const [confirmadoresDisponibles, setConfirmadoresDisponibles] = useState([]);

  const setTab = (report) => {
    setActiveReport(report);
  };

  const renderActiveReport = () => {
    switch (activeReport) {
      case 'resumen':
        return <ReporteResumen filters={analyticsFilters} setConfirmadoresDisponibles={setConfirmadoresDisponibles} />;
      case 'ventas':
        return <ReporteVentas filters={analyticsFilters} />;
      case 'productos':
        return <ReporteProductos filters={analyticsFilters} />;
      case 'confirmadores':
        return <ReporteConfirmadores filters={analyticsFilters} />;
      case 'finanzas':
        return <ReporteFinanzas filters={analyticsFilters} />;
      case 'rentabilidad':
        return <ReporteRentabilidad filters={analyticsFilters} />;
      case 'resumen_pedidos':
        return <DashboardGeneralTab couriers={couriers} />;
      default:
        return <ReporteResumen filters={analyticsFilters} setConfirmadoresDisponibles={setConfirmadoresDisponibles} />;
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-fg)' }}>Centro de Inteligencia Comercial & Analytics</h2>
                <span className="cic-badge-live">
                  <span className="pulse-dot" /> En Vivo
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)', margin: '0.2rem 0 0 0' }}>
                Tracker analítico de confirmaciones, funnel comercial, rendimiento de productos y scorecards de transporte.
              </p>
            </div>
          </div>
        </div>

        {/* Componente de Filtros Centralizado */}
        <AnalyticsFilters 
          filters={analyticsFilters} 
          setFilters={setAnalyticsFilters} 
          confirmadoresDisponibles={confirmadoresDisponibles}
        />
      </div>

      {/* Sub-navegación Interna */}
      <div className="cic-subnav">
        <button className={`cic-subnav-btn ${activeReport === 'resumen' ? 'active' : ''}`} onClick={() => setTab('resumen')}>
          <LayoutDashboard size={16} /> Resumen Ejecutivo
        </button>
        <button className={`cic-subnav-btn ${activeReport === 'ventas' ? 'active' : ''}`} onClick={() => setTab('ventas')}>
          <ShoppingCart size={16} /> Ventas y Pedidos
        </button>
        <button className={`cic-subnav-btn ${activeReport === 'productos' ? 'active' : ''}`} onClick={() => setTab('productos')}>
          <Package size={16} /> Rendimiento por Productos
        </button>
        <button className={`cic-subnav-btn ${activeReport === 'confirmadores' ? 'active' : ''}`} onClick={() => setTab('confirmadores')}>
          <UserCheck size={16} /> Rendimiento Confirmadores
        </button>
        <button className={`cic-subnav-btn ${activeReport === 'resumen_pedidos' ? 'active' : ''}`} onClick={() => setTab('resumen_pedidos')}>
          <Truck size={16} /> Resumen de Pedidos
        </button>
        <button className={`cic-subnav-btn ${activeReport === 'finanzas' ? 'active' : ''}`} onClick={() => setTab('finanzas')}>
          <DollarSign size={16} /> Control Financiero
        </button>
        <button className={`cic-subnav-btn ${activeReport === 'rentabilidad' ? 'active' : ''}`} onClick={() => setTab('rentabilidad')}>
          <PiggyBank size={16} /> Rentabilidad
        </button>
      </div>

      {/* Reporte Activo */}
      {renderActiveReport()}
    </div>
  );
}
