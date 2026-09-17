import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, LayoutDashboard, ShoppingCart, Package, UserCheck, DollarSign, PiggyBank, List, MapPin, Truck, Shuffle } from 'lucide-react';
import './CentroInteligenciaComercial.css';
import './analytics/analytics.css';

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
    canal_venta_id: 'TODOS',
    estado: 'TODOS',
    producto_id: 'TODOS',
    metodo_pago: 'TODOS',
    // Rango personalizado: solo se envían al backend cuando periodo === 'personalizado_rango'
    fecha_desde: '',
    fecha_hasta: '',
  });

  const [confirmadoresDisponibles, setConfirmadoresDisponibles] = useState([]);

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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-fg)' }}>Analítica de Pedidos</h2>
                <span className="cic-badge-live">
                  <span className="pulse-dot" /> En Vivo
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)', margin: '0.2rem 0 0 0' }}>
                Funnel comercial, rendimiento de productos, confirmadores y finanzas.
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

      {/* Sub-navegación — 6 pestañas (sin "Resumen de Pedidos") */}
      <div className="cic-subnav">
        <button className={`cic-subnav-btn ${activeReport === 'resumen' ? 'active' : ''}`} onClick={() => setActiveReport('resumen')}>
          <LayoutDashboard size={16} /> Resumen
        </button>
        <button className={`cic-subnav-btn ${activeReport === 'ventas' ? 'active' : ''}`} onClick={() => setActiveReport('ventas')}>
          <ShoppingCart size={16} /> Ventas y Pedidos
        </button>
        <button className={`cic-subnav-btn ${activeReport === 'productos' ? 'active' : ''}`} onClick={() => setActiveReport('productos')}>
          <Package size={16} /> Productos
        </button>
        <button className={`cic-subnav-btn ${activeReport === 'confirmadores' ? 'active' : ''}`} onClick={() => setActiveReport('confirmadores')}>
          <UserCheck size={16} /> Confirmadores
        </button>
        <button className={`cic-subnav-btn ${activeReport === 'finanzas' ? 'active' : ''}`} onClick={() => setActiveReport('finanzas')}>
          <DollarSign size={16} /> Finanzas
        </button>
      </div>

      {/* Reporte Activo */}
      {renderActiveReport()}
    </div>
  );
}
