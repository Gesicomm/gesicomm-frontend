import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, LayoutDashboard, ShoppingCart, Package, UserCheck, DollarSign, PiggyBank, List, MapPin, Truck, Shuffle, Users } from 'lucide-react';
import './CentroInteligenciaComercial.css';
import './analytics/analytics.css';
import './analytics/grouped-nav.css';

import { AnalyticsFilters } from './analytics/AnalyticsFilters';
import { resolverRango } from './analytics/periodo';
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

const REPORTES = [
  { grupo: 'Resumen', items: [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  ] },
  { grupo: 'Ventas', items: [
    { id: 'ventas', label: 'Pedidos del período', icon: ShoppingCart },
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'composicion', label: 'Ventas extra (bump y upsell)', icon: List },
    { id: 'afinidad', label: 'Se compran juntos', icon: Shuffle },
  ] },
  { grupo: 'Clientes', items: [
    { id: 'clientes', label: 'Clientes buenos y problemáticos', icon: Users },
  ] },
  { grupo: 'Equipo y entregas', items: [
    { id: 'confirmadores', label: 'Confirmadores', icon: UserCheck },
    { id: 'fallos', label: 'Pedidos no entregados', icon: TrendingUp },
    { id: 'geografia', label: 'Ciudades', icon: MapPin },
    { id: 'logistica', label: 'Couriers', icon: Truck },
  ] },
  { grupo: 'Pagos', items: [
    { id: 'metodos_pago', label: 'Formas de pago', icon: PiggyBank },
    { id: 'finanzas', label: 'Comisiones e IVA', icon: DollarSign },
  ] },
];

const FILTROS_INICIALES = {
  periodo: 'este_mes',
  mes: new Date().getMonth() + 1,
  anio: new Date().getFullYear(),
  confirmador: 'TODOS',
  courierId: 'TODOS',
  canal_venta_id: 'TODOS',
  estado: 'TODOS',
  producto_id: 'TODOS',
  metodo_pago: 'TODOS',
  ciudad: '',
};

// Filtros y reporte abierto sobreviven a recargar o a ir y volver dentro de
// la pestaña (sessionStorage, nunca la URL).
const CLAVE_SESION = 'gesicomm.dashboardOperativo.v1';
function leerSesion() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null') || {};
  } catch {
    return {};
  }
}

export function CentroInteligenciaComercial() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.has('report')) {
      searchParams.delete('report');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const sesion = useMemo(leerSesion, []);
  const [activeReport, setActiveReport] = useState(sesion.reporte || 'resumen');
  const [analyticsFilters, setAnalyticsFilters] = useState({ ...FILTROS_INICIALES, ...(sesion.filtros || {}) });
  const [confirmadoresDisponibles, setConfirmadoresDisponibles] = useState([]);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ reporte: activeReport, filtros: analyticsFilters }));
    } catch { /* almacenamiento bloqueado: se pierde solo la preferencia */ }
  }, [activeReport, analyticsFilters]);

  // Lo que reciben los reportes: el período ya traducido a fechas. Pisa
  // cualquier fecha vieja de un rango personalizado anterior.
  const filtrosReporte = useMemo(
    () => ({ ...analyticsFilters, ...resolverRango(analyticsFilters) }),
    [analyticsFilters],
  );

  const renderActiveReport = () => {
    const f = filtrosReporte;
    switch (activeReport) {
      case 'ventas': return <ReporteVentas filters={f} />;
      case 'productos': return <ReporteProductos filters={f} />;
      case 'composicion': return <ReporteComposicion filters={f} />;
      case 'afinidad': return <ReporteAfinidad filters={f} />;
      case 'clientes': return <ReporteClientes filters={f} />;
      case 'confirmadores': return <ReporteConfirmadores filters={f} />;
      case 'fallos': return <ReporteFallos filters={f} />;
      case 'geografia': return <ReporteGeografia filters={f} />;
      case 'logistica': return <ReporteLogistica filters={f} />;
      case 'metodos_pago': return <ReporteMetodosPago filters={f} />;
      case 'finanzas': return <ReporteFinanzas filters={f} />;
      case 'resumen':
      default: return <ReporteResumen filters={f} setConfirmadoresDisponibles={setConfirmadoresDisponibles} onAbrirReporte={setActiveReport} />;
    }
  };

  return (
    <div className="cic-wrapper">
      {/* En celular y notebooks el menú de reportes es un selector, y va antes de
          los filtros: primero se elige qué ver y después de cuándo. */}
      <label className="cic-nav-movil">
        <span>Reporte</span>
        <select className="cic-select" value={activeReport} onChange={e => setActiveReport(e.target.value)}>
          {REPORTES.map(g => (
            <optgroup key={g.grupo} label={g.grupo}>
              {g.items.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="cic-top-bar">
        <AnalyticsFilters
          filters={analyticsFilters}
          setFilters={setAnalyticsFilters}
          filtrosIniciales={FILTROS_INICIALES}
          reporteActivo={activeReport}
          confirmadoresDisponibles={confirmadoresDisponibles}
        />
      </div>

      <div className="cic-layout">
        <aside className="cic-sidebar-nav" aria-label="Reportes">
          {REPORTES.map(g => (
            <div className="cic-nav-group" key={g.grupo}>
              <h4>{g.grupo}</h4>
              {g.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`cic-nav-item ${activeReport === id ? 'active' : ''}`}
                  aria-current={activeReport === id ? 'page' : undefined}
                  onClick={() => setActiveReport(id)}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <main className="cic-content-area">
          {renderActiveReport()}
        </main>
      </div>
    </div>
  );
}
