import React, { useState, useEffect, useMemo } from 'react';
import { UserCheck, DollarSign, Target, ChevronUp, ChevronDown } from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';
import { METRIC_TERMS } from '../../../../utils/metricGlossary';

export default function ReporteConfirmadores({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ top_confirmador: 'Ninguno', total_ingresos: 0, tasa_cierre_promedio: 0 });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  const [sortKey, setSortKey] = useState('entregados');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const response = await reportesService.obtenerReporteConfirmadores({
        ...filters,
        pagina: page,
        limite: pagination.limit
      });
      
      setData(response.data || []);
      setKpis(response.kpis || { top_confirmador: 'Ninguno', total_ingresos: 0, tasa_cierre_promedio: 0 });
      setPagination({
        ...pagination,
        page: response.actual || 1,
        total: response.total || 0,
        totalPages: response.paginas || 1
      });
    } catch (error) {
      console.error("Error al obtener reporte de confirmadores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [filters]);

  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const formatMoney = (val) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);

  const displayData = useMemo(() => {
    let sorted = [...data].map(row => {
      const efectividad = row.procesados > 0 ? ((row.entregados / row.procesados) * 100) : 0;
      const ticketPromedio = row.entregados > 0 ? (row.ingresos / row.entregados) : 0;
      return { ...row, efectividad, ticketPromedio };
    });

    sorted.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortKey, sortOrder]);

  const SortIcon = ({ columnKey }) => {
    if (sortKey !== columnKey) return <span style={{ opacity: 0.2, marginLeft: 4 }}><ChevronDown size={12} /></span>;
    return <span style={{ marginLeft: 4 }}>{sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* KPIs */}
      <div className="cic-kpis-grid">
        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            MEJOR CONFIRMADOR
            <UserCheck size={16} color="var(--color-primary-text)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-primary-text)', fontSize: '1.2rem', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>
            {kpis.top_confirmador}
          </div>
          <div className="cic-kpi-sub">Mayor cantidad de entregas</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            {METRIC_TERMS.ventasNetas}
            <DollarSign size={16} color="var(--color-success)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-success)' }}>{formatMoney(kpis.total_ingresos)}</div>
          <div className="cic-kpi-sub">Valor de los pedidos entregados</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-warning) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            TASA DE CIERRE PROMEDIO
            <Target size={16} color="var(--color-warning)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-warning)' }}>
            {kpis.tasa_cierre_promedio ? kpis.tasa_cierre_promedio.toFixed(1) : 0}%
          </div>
          <div className="cic-kpi-sub">Efectividad global del equipo</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="cic-table-card">
        <div className="cic-table-wrapper">
          <table className="cic-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('nombre')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>Nombre del Confirmador <SortIcon columnKey="nombre" /></div>
                </th>
                <th onClick={() => handleSort('procesados')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Total Procesados <SortIcon columnKey="procesados" /></div>
                </th>
                <th onClick={() => handleSort('entregados')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', color: 'var(--color-success)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Entregados <SortIcon columnKey="entregados" /></div>
                </th>
                <th onClick={() => handleSort('rechazados')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', color: 'var(--color-danger)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Caídos/Rechazados <SortIcon columnKey="rechazados" /></div>
                </th>
                <th onClick={() => handleSort('efectividad')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', color: 'var(--color-primary-text)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Efectividad % <SortIcon columnKey="efectividad" /></div>
                </th>
                <th onClick={() => handleSort('ingresos')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right', color: 'var(--color-success)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{METRIC_TERMS.ventasNetas} <SortIcon columnKey="ingresos" /></div>
                </th>
                <th onClick={() => handleSort('ticketPromedio')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{METRIC_TERMS.ticketPromedio} <SortIcon columnKey="ticketPromedio" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)' }}>Cargando reporte de confirmadores...</td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)' }}>No se encontraron registros en este período.</td>
                </tr>
              ) : (
                displayData.map((row, idx) => {
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.nombre}</td>
                      <td style={{ textAlign: 'center' }}>{row.procesados}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-success)', fontWeight: 'bold' }}>{row.entregados}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-danger)' }}>{row.rechazados}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-primary-text)', fontWeight: 'bold' }}>{row.efectividad.toFixed(1)}%</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 'bold' }}>{formatMoney(row.ingresos)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(row.ticketPromedio)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && pagination.totalPages > 1 && (
          <div className="cic-table-pagination" style={{ padding: '1rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
              Página {pagination.page} de {pagination.totalPages} <span style={{ opacity: 0.5 }}>• {pagination.total} registros</span>
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="cic-btn" 
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Anterior
              </button>
              <button 
                className="cic-btn" 
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
                disabled={pagination.page === pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
