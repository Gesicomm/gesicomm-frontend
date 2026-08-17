import React, { useEffect, useState } from 'react';
import { getCouriers } from '../../../services/courierApi';

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

export function AnalyticsFilters({ filters, setFilters, confirmadoresDisponibles = [] }) {
  const [couriersList, setCouriersList] = useState([]);

  useEffect(() => {
    cargarCouriers();
  }, []);

  const cargarCouriers = async () => {
    try {
      const res = await getCouriers();
      setCouriersList(res || []);
    } catch (err) {
      console.error('Error cargando couriers:', err);
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="cic-filters-container">
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
            className={`cic-preset-pill ${filters.periodo === p.id ? 'active' : ''}`}
            onClick={() => updateFilter('periodo', p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filtros Dropdown Específicos */}
      <div className="cic-filters-grid">
        {filters.periodo === 'personalizado_mes' && (
          <div className="cic-filter-item">
            <label className="cic-filter-label">Mes</label>
            <select className="cic-select" value={filters.mes} onChange={e => updateFilter('mes', Number(e.target.value))}>
              {MESES.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="cic-filter-item">
          <label className="cic-filter-label">Año</label>
          <select className="cic-select" value={filters.anio} onChange={e => updateFilter('anio', Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="cic-filter-item">
          <label className="cic-filter-label">Confirmador</label>
          <select className="cic-select" value={filters.confirmador} onChange={e => updateFilter('confirmador', e.target.value)}>
            <option value="TODOS">Todos los confirmadores</option>
            {confirmadoresDisponibles.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="cic-filter-item">
          <label className="cic-filter-label">Courier</label>
          <select className="cic-select" value={filters.courierId} onChange={e => updateFilter('courierId', e.target.value)}>
            <option value="TODOS">Todos los Couriers</option>
            {couriersList.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="cic-filter-item">
          <label className="cic-filter-label">Canal / Origen</label>
          <select className="cic-select" value={filters.origen} onChange={e => updateFilter('origen', e.target.value)}>
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
  );
}
