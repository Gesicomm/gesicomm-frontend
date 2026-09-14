import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Plus, Edit, Power, PowerOff, AlertTriangle, ArrowLeft } from 'lucide-react';
import { comboAdminService } from '../../services/comboAdminService';
import ConfirmDialog from '../../components/ConfirmDialog';
import './combos.css';

const ESTADOS = ['TODOS', 'BORRADOR', 'ACTIVO', 'INACTIVO'];

function formatMoney(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('es-PY') + ' Gs';
}

function formatPct(n) {
  if (n === null || n === undefined) return '—';
  return (Number(n) * 100).toFixed(2) + '%';
}

function EstadoBadge({ estado }) {
  const map = { BORRADOR: 'borrador', ACTIVO: 'activo', INACTIVO: 'inactivo' };
  const labels = { BORRADOR: 'Borrador', ACTIVO: 'Activo', INACTIVO: 'Inactivo' };
  return <span className={`combo-badge ${map[estado] || 'borrador'}`}>{labels[estado] || estado}</span>;
}

function OfertaBadge({ status }) {
  if (!status) return null;
  const map = { EXCELENTE: 'excelente', BUENA: 'buena', REVISAR: 'revisar' };
  const labels = { EXCELENTE: '★ Excelente', BUENA: '✓ Buena', REVISAR: '⚠ Revisar' };
  return <span className={`combo-badge ${map[status] || 'revisar'}`}>{labels[status] || status}</span>;
}

export default function ComboList() {
  const navigate = useNavigate();
  const [combos, setCombos] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [cambiandoEstado, setCambiandoEstado] = useState(null);
  const [comboAConfirmar, setComboAConfirmar] = useState(null); // { combo, nuevoEstado }
  const [expandedComboId, setExpandedComboId] = useState(null);
  const [expandedComboData, setExpandedComboData] = useState(null);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

  // Umbral configurado (Configuración económica > Margen mínimo), como fracción.
  const margenMinimoDecimal = config?.margen_minimo !== undefined ? Number(config.margen_minimo) / 100 : 0.10;

  useEffect(() => {
    cargar();
    comboAdminService.obtenerConfiguracion().then(setConfig).catch(() => {});
  }, []);

  async function cargar() {
    try {
      setLoading(true);
      const data = await comboAdminService.listar();
      setCombos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error al cargar los combos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function confirmarCambioEstado() {
    if (!comboAConfirmar) return;
    const { combo, nuevoEstado } = comboAConfirmar;
    try {
      setCambiandoEstado(combo.id);
      await comboAdminService.cambiarEstado(combo.id, nuevoEstado);
      setComboAConfirmar(null);
      await cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar el estado.');
    } finally {
      setCambiandoEstado(null);
    }
  }

  async function toggleCombo(id) {
    if (expandedComboId === id) {
      setExpandedComboId(null);
      return;
    }
    setExpandedComboId(id);
    setLoadingExpanded(true);
    try {
      const data = await comboAdminService.obtener(id);
      setExpandedComboData(data);
    } catch (err) {
      console.error('Error fetching expanded combo', err);
    } finally {
      setLoadingExpanded(false);
    }
  }

  const combosFiltrados = filtroEstado === 'TODOS'
    ? combos
    : combos.filter(c => c.estado === filtroEstado);

  const counts = ESTADOS.slice(1).reduce((acc, e) => {
    acc[e] = combos.filter(c => c.estado === e).length;
    return acc;
  }, {});

  return (
    <div className="combo-page">
      {/* Header */}
      <div className="combo-header">
        <div className="combo-header-left">
          <div className="combo-icon-wrap"><Layers size={20} /></div>
          <div>
            <h1 className="combo-title">Mis combos</h1>
            <p className="combo-subtitle">{combos.length} combo{combos.length !== 1 ? 's' : ''} creado{combos.length !== 1 ? 's' : ''} para vender en tu catálogo</p>
          </div>
        </div>
        <div className="combo-header-actions">
          <Link to="/mi-catalogo" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Volver a catálogo
          </Link>
          <Link to="/combos/nuevo" className="btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={16} /> Nuevo combo
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="combo-filters">
        {ESTADOS.map(e => (
          <button
            key={e}
            className={`combo-filter-btn ${filtroEstado === e ? 'active' : ''}`}
            onClick={() => setFiltroEstado(e)}
          >
            {e === 'TODOS' ? `Todos (${combos.length})` : `${e.charAt(0) + e.slice(1).toLowerCase()} (${counts[e] || 0})`}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="combo-empty">
          <div className="combo-empty-icon"><Layers size={28} /></div>
          <p>Cargando combos...</p>
        </div>
      ) : error ? (
        <div className="combo-empty">
          <AlertTriangle size={28} style={{ color: '#ef4444' }} />
          <h3>Error al cargar</h3>
          <p>{error}</p>
          <button className="btn-secondary" onClick={cargar}>Reintentar</button>
        </div>
      ) : combosFiltrados.length === 0 ? (
        <div className="combo-empty">
          <div className="combo-empty-icon"><Layers size={28} /></div>
          <h3>{filtroEstado === 'TODOS' ? 'Aún no hay combos' : `No hay combos en estado ${filtroEstado}`}</h3>
          <p>Los combos te permiten agrupar productos y calcular su rentabilidad.</p>
          {filtroEstado === 'TODOS' && (
            <Link to="/combos/nuevo" className="btn-primary" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              <Plus size={16} /> Crear primer combo
            </Link>
          )}
        </div>
      ) : (
        <div className="combo-list-grid">
          {combosFiltrados.map(combo => {
            const margen = combo.snapshot_margen != null ? Number(combo.snapshot_margen) : null;
            const utilidad = combo.snapshot_utilidad != null ? Number(combo.snapshot_utilidad) : null;
            const precio = Number(combo.precio_total);
            const upsells = combo.items || [];

            return (
              <div key={combo.id} className={`combo-list-card ${combo.estado === 'INACTIVO' ? 'inactivo' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleCombo(combo.id)}>
                <div className="combo-list-card-header">
                  <div>
                    <div className="combo-list-card-name">{combo.nombre}</div>
                    <div className="combo-list-card-principal">
                      Principal: {combo.producto_padre?.nombre || '—'}
                    </div>
                  </div>
                  <EstadoBadge estado={combo.estado} />
                </div>

                {/* Upsells resumen */}
                {upsells.length > 0 && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {upsells.slice(0, 2).map(it => (
                      <span key={it.id} style={{ marginRight: '0.5rem' }}>
                        + {it.producto_incluido?.nombre}
                        {Number(it.descuento_porcentaje) > 0 && ` (${Number(it.descuento_porcentaje)}% off)`}
                      </span>
                    ))}
                    {upsells.length > 2 && <span>+{upsells.length - 2} más</span>}
                  </div>
                )}

                {/* Métricas snapshot */}
                <div className="combo-list-card-metrics">
                  <div className="combo-list-card-metric">
                    <span className="combo-list-card-metric-label">Precio</span>
                    <span className="combo-list-card-metric-value">{formatMoney(precio)}</span>
                  </div>
                  {utilidad !== null && (
                    <div className="combo-list-card-metric">
                      <span className="combo-list-card-metric-label">Utilidad</span>
                      <span className="combo-list-card-metric-value" style={{ color: utilidad >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatMoney(utilidad)}
                      </span>
                    </div>
                  )}
                  {margen !== null && (
                    <div className="combo-list-card-metric">
                      <span className="combo-list-card-metric-label">Margen</span>
                      <span className="combo-list-card-metric-value" style={{ color: margen >= margenMinimoDecimal ? '#10b981' : margen > 0 ? '#f59e0b' : '#ef4444' }}>
                        {(margen * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="combo-list-card-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                    onClick={() => navigate(`/combos/${combo.id}/editar`)}
                  >
                    <Edit size={13} /> Editar
                  </button>
                  {combo.estado !== 'ACTIVO' && (
                    <button
                      className="btn-activate"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                      disabled={cambiandoEstado === combo.id}
                      onClick={() => setComboAConfirmar({ combo, nuevoEstado: 'ACTIVO' })}
                    >
                      <Power size={13} /> {cambiandoEstado === combo.id ? '...' : 'Activar'}
                    </button>
                  )}
                  {combo.estado === 'ACTIVO' && (
                    <button
                      className="btn-deactivate"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                      disabled={cambiandoEstado === combo.id}
                      onClick={() => setComboAConfirmar({ combo, nuevoEstado: 'INACTIVO' })}
                    >
                      <PowerOff size={13} /> {cambiandoEstado === combo.id ? '...' : 'Desactivar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!comboAConfirmar}
        title={
          comboAConfirmar?.nuevoEstado === 'ACTIVO'
            ? `¿Activar "${comboAConfirmar?.combo?.nombre}"?`
            : `¿Desactivar "${comboAConfirmar?.combo?.nombre}"?`
        }
        description={
          comboAConfirmar?.nuevoEstado === 'ACTIVO'
            ? 'El combo quedará disponible para la venta.'
            : 'El combo dejará de estar disponible para la venta.'
        }
        confirmLabel={comboAConfirmar?.nuevoEstado === 'ACTIVO' ? 'Activar' : 'Desactivar'}
        danger={comboAConfirmar?.nuevoEstado !== 'ACTIVO'}
        loading={cambiandoEstado === comboAConfirmar?.combo?.id}
        onConfirm={confirmarCambioEstado}
        onCancel={() => setComboAConfirmar(null)}
      />
    </div>
  );
}
