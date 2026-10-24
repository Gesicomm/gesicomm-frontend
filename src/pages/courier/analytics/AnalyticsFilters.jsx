import React, { useEffect, useMemo, useState } from 'react';
import { getCouriers, getMetodosPago } from '../../../services/courierApi';
import { canalVentaService } from '../../../services/canalVentaService';
import { productService } from '../../../services/productService';
import { CalendarDays, SlidersHorizontal, X } from 'lucide-react';
import { PRESETS_PERIODO, MESES, resolverRango, describirRango } from './periodo';

const ESTADOS = [
  'Pendiente', 'Confirmado', 'Empacado',
  'En tránsito', 'Entregado', 'Cancelado',
  'Devuelto', 'Reprogramado', 'Rechazado',
];

// El Resumen sale de otro cálculo (embudo por estado) que no filtra por estos
// campos. Se avisa en vez de dejar que el usuario crea que se aplicaron.
const NO_APLICAN = {
  resumen: ['estado', 'metodo_pago', 'ciudad'],
};

const ETIQUETAS = {
  estado: 'Estado',
  producto_id: 'Producto',
  metodo_pago: 'Método de pago',
  canal_venta_id: 'Canal',
  confirmador: 'Confirmador',
  ciudad: 'Ciudad',
  courierId: 'Courier',
};

const activo = (v) => v !== undefined && v !== null && v !== '' && v !== 'TODOS';

export function AnalyticsFilters({ filters, setFilters, filtrosIniciales, reporteActivo, confirmadoresDisponibles = [] }) {
  const [couriersList, setCouriersList] = useState([]);
  const [canalesVenta, setCanalesVenta] = useState([]);
  const [productos, setProductos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [showMasFiltros, setShowMasFiltros] = useState(false);
  const [filtrosMovilAbiertos, setFiltrosMovilAbiertos] = useState(false);
  const [ciudad, setCiudad] = useState(filters.ciudad || '');

  useEffect(() => {
    getCouriers().then(r => setCouriersList(r || [])).catch(() => setCouriersList([]));
    canalVentaService.listar().then(setCanalesVenta).catch(() => setCanalesVenta([]));
    productService.buscar({}).then(r => setProductos(Array.isArray(r) ? r : r?.productos || [])).catch(() => setProductos([]));
    getMetodosPago().then(setMetodosPago).catch(() => setMetodosPago([]));
  }, []);

  // La ciudad se escribe: se aplica al dejar de tipear, no en cada letra.
  useEffect(() => {
    if (ciudad === (filters.ciudad || '')) return undefined;
    const t = setTimeout(() => setFilters(prev => ({ ...prev, ciudad })), 450);
    return () => clearTimeout(t);
  }, [ciudad, filters.ciudad, setFilters]);
  useEffect(() => { setCiudad(filters.ciudad || ''); }, [filters.ciudad]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const rango = useMemo(() => resolverRango(filters), [filters]);
  const descripcion = describirRango(rango);

  const elegirPeriodo = (id) => {
    setFilters(prev => {
      // "Elegir fechas" arranca con el rango que se estaba viendo, así nunca
      // queda vacío ni cae en silencio a "Este mes".
      if (id === 'personalizado_rango') {
        const actual = resolverRango(prev);
        return { ...prev, periodo: id, fecha_desde: actual.fecha_desde, fecha_hasta: actual.fecha_hasta };
      }
      return { ...prev, periodo: id };
    });
  };

  // Un campo de fecha vacío se ignora; si "Desde" queda después de "Hasta"
  // se corre la otra punta en vez de dejar un rango imposible.
  const cambiarFecha = (campo, valor) => {
    if (!valor) return;
    setFilters(prev => {
      const next = { ...prev, [campo]: valor };
      if (next.fecha_desde && next.fecha_hasta && next.fecha_desde > next.fecha_hasta) {
        if (campo === 'fecha_desde') next.fecha_hasta = valor;
        else next.fecha_desde = valor;
      }
      return next;
    });
  };

  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: 4 }, (_, i) => anioActual - i);

  const etiquetaValor = (key, v) => {
    if (key === 'producto_id') return productos.find(p => String(p.id) === String(v))?.nombre || v;
    if (key === 'canal_venta_id') return canalesVenta.find(c => String(c.id) === String(v))?.nombre || v;
    if (key === 'courierId') return couriersList.find(c => String(c.id) === String(v))?.nombre || v;
    return v;
  };
  const filtrosActivos = Object.keys(ETIQUETAS).filter(k => activo(filters[k]));
  const extrasActivos = ['metodo_pago', 'canal_venta_id', 'confirmador', 'ciudad', 'courierId'].filter(k => activo(filters[k])).length;
  const noAplican = (NO_APLICAN[reporteActivo] || []).filter(k => activo(filters[k]));

  const limpiar = () => {
    setCiudad('');
    setFilters(prev => ({ ...filtrosIniciales, periodo: prev.periodo, mes: prev.mes, anio: prev.anio, fecha_desde: prev.fecha_desde, fecha_hasta: prev.fecha_hasta }));
  };

  return (
    <div className={`cic-filters-container${filtrosMovilAbiertos ? ' filtros-abiertos' : ''}`}>
      <div className="cic-periodo-head">
        <div className="cic-periodo-actual">
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <span className="cic-periodo-label">Estás viendo</span>
            <strong className="cic-periodo-rango">{descripcion ? descripcion.texto : 'Elegí las fechas'}</strong>
            {descripcion && <span className="cic-periodo-dias">{descripcion.dias === 1 ? '1 día' : `${descripcion.dias} días`}</span>}
          </div>
        </div>
      </div>

      <div className="cic-presets-bar" role="group" aria-label="Período">
        {PRESETS_PERIODO.map(p => (
          <button
            key={p.id}
            type="button"
            className={`cic-preset-pill ${filters.periodo === p.id ? 'active' : ''}`}
            aria-pressed={filters.periodo === p.id}
            onClick={() => elegirPeriodo(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {(filters.periodo === 'personalizado_mes' || filters.periodo === 'este_anio' || filters.periodo === 'personalizado_rango') && (
        <div className="cic-periodo-detalle">
          {filters.periodo === 'personalizado_mes' && (
            <label className="cic-filter-item">
              <span className="cic-filter-label">Mes</span>
              <select className="cic-select" value={filters.mes} onChange={e => updateFilter('mes', Number(e.target.value))}>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
          )}
          {(filters.periodo === 'personalizado_mes' || filters.periodo === 'este_anio') && (
            <label className="cic-filter-item">
              <span className="cic-filter-label">Año</span>
              <select className="cic-select" value={filters.anio} onChange={e => updateFilter('anio', Number(e.target.value))}>
                {anios.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          )}
          {filters.periodo === 'personalizado_rango' && (
            <>
              <label className="cic-filter-item">
                <span className="cic-filter-label">Desde</span>
                <input type="date" className="cic-select" value={filters.fecha_desde || ''} onChange={e => cambiarFecha('fecha_desde', e.target.value)} />
              </label>
              <label className="cic-filter-item">
                <span className="cic-filter-label">Hasta</span>
                <input type="date" className="cic-select" value={filters.fecha_hasta || ''} onChange={e => cambiarFecha('fecha_hasta', e.target.value)} />
              </label>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        className="cic-btn-filtros-movil"
        aria-expanded={filtrosMovilAbiertos}
        onClick={() => setFiltrosMovilAbiertos(v => !v)}
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        {filtrosMovilAbiertos ? 'Ocultar filtros' : 'Filtrar por estado, producto y más'}
        {!filtrosMovilAbiertos && filtrosActivos.length > 0 && <span className="cic-contador">{filtrosActivos.length}</span>}
      </button>

      <div className="cic-filters-grid">
        <label className="cic-filter-item">
          <span className="cic-filter-label">Estado</span>
          <select className="cic-select" value={filters.estado || 'TODOS'} onChange={e => updateFilter('estado', e.target.value)}>
            <option value="TODOS">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>

        <label className="cic-filter-item">
          <span className="cic-filter-label">Producto</span>
          <select className="cic-select" value={filters.producto_id || 'TODOS'} onChange={e => updateFilter('producto_id', e.target.value)}>
            <option value="TODOS">Todos los productos</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>

        <button
          type="button"
          className="cic-btn cic-btn-mas-filtros"
          aria-expanded={showMasFiltros}
          onClick={() => setShowMasFiltros(v => !v)}
        >
          <SlidersHorizontal size={16} />
          {showMasFiltros ? 'Ocultar filtros' : 'Más filtros'}
          {extrasActivos > 0 && <span className="cic-contador">{extrasActivos}</span>}
        </button>
      </div>

      {showMasFiltros && (
        <div className="cic-filters-grid">
          <label className="cic-filter-item">
            <span className="cic-filter-label">Método de pago</span>
            <select className="cic-select" value={filters.metodo_pago || 'TODOS'} onChange={e => updateFilter('metodo_pago', e.target.value)}>
              <option value="TODOS">Todos los métodos</option>
              {metodosPago.map(m => <option key={m.nombre} value={m.nombre}>{m.nombre}</option>)}
            </select>
          </label>

          <label className="cic-filter-item">
            <span className="cic-filter-label">Canal</span>
            <select className="cic-select" value={filters.canal_venta_id ?? 'TODOS'} onChange={e => updateFilter('canal_venta_id', e.target.value)}>
              <option value="TODOS">Todos los canales</option>
              {canalesVenta.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>

          <label className="cic-filter-item">
            <span className="cic-filter-label">Confirmador</span>
            <select className="cic-select" value={filters.confirmador} onChange={e => updateFilter('confirmador', e.target.value)}>
              <option value="TODOS">Todos los confirmadores</option>
              {confirmadoresDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="cic-filter-item">
            <span className="cic-filter-label">Ciudad</span>
            <input type="text" className="cic-select" placeholder="Ej. Asunción" value={ciudad} onChange={e => setCiudad(e.target.value)} />
          </label>

          <label className="cic-filter-item">
            <span className="cic-filter-label">Courier</span>
            <select className="cic-select" value={filters.courierId} onChange={e => updateFilter('courierId', e.target.value)}>
              <option value="TODOS">Todos los couriers</option>
              {couriersList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
        </div>
      )}

      {filtrosActivos.length > 0 && (
        <div className="cic-chips-activos">
          {filtrosActivos.map(k => (
            <span key={k} className="cic-chip">
              {ETIQUETAS[k]}: <strong>{etiquetaValor(k, filters[k])}</strong>
              <button
                type="button"
                aria-label={`Quitar filtro ${ETIQUETAS[k]}`}
                onClick={() => { if (k === 'ciudad') setCiudad(''); updateFilter(k, filtrosIniciales[k]); }}
              >
                <X size={14} />
              </button>
            </span>
          ))}
          <button type="button" className="cic-limpiar" onClick={limpiar}>Limpiar filtros</button>
        </div>
      )}

      {noAplican.length > 0 && (
        <p className="cic-aviso-filtros">
          Este reporte no se filtra por {noAplican.map(k => ETIQUETAS[k].toLowerCase()).join(', ')}.
        </p>
      )}
    </div>
  );
}
