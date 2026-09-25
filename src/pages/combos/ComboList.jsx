import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layers, Plus, Search, Edit2, Power, PowerOff, AlertTriangle, ArrowLeft, CheckCircle2,
} from 'lucide-react';
import { comboAdminService } from '../../services/comboAdminService';
import { getMediaUrl } from '../../services/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../productos/productos.css';
import './combos.css';
import './comboArmado.css';

// Mismas vistas que el listado de Productos, por estado del combo.
const VISTAS = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'ACTIVO', label: 'Activos' },
  { id: 'BORRADOR', label: 'Borradores' },
  { id: 'INACTIVO', label: 'Inactivos' },
];

const ESTADO_UI = {
  ACTIVO: { label: 'En venta', clase: 'estado-en_venta' },
  BORRADOR: { label: 'Borrador', clase: 'combo-estado-borrador' },
  INACTIVO: { label: 'Pausado', clase: 'estado-fuera_de_stock' },
};

function gs(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }) + ' Gs';
}

/**
 * Utilidad y margen AL PRECIO PUBLICADO. El snapshot guarda la utilidad al
 * precio "con descuentos" del motor, que no es el precio al que se vende
 * si el usuario lo ajustó — por eso antes la tarjeta mostraba un margen que
 * no cerraba con el precio de al lado.
 */
function economiaPublicada(combo) {
  const precio = Number(combo.precio_total) || 0;
  const costo = combo.snapshot_costo_total != null ? Number(combo.snapshot_costo_total) : null;
  if (costo === null || precio <= 0) return { precio, utilidad: null, margen: null };
  const utilidad = precio - costo;
  return { precio, utilidad, margen: utilidad / precio };
}

function portada(combo) {
  const imgs = Array.isArray(combo.imagenes) ? combo.imagenes : [];
  return (imgs.find(i => i.es_principal) || imgs[0])?.url || null;
}

export default function ComboList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [combos, setCombos] = useState([]);
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState('TODOS');
  const [texto, setTexto] = useState('');
  const [cambiandoEstado, setCambiandoEstado] = useState(null);
  const [comboAConfirmar, setComboAConfirmar] = useState(null); // { combo, nuevoEstado }
  const [aviso, setAviso] = useState(location.state?.aviso || null);

  const margenMinimo = config?.margen_minimo !== undefined ? Number(config.margen_minimo) / 100 : 0.10;

  useEffect(() => {
    cargar();
    comboAdminService.obtenerConfiguracion().then(setConfig).catch(() => {});
    // El aviso llega por router state una sola vez; se limpia para que no
    // reaparezca al volver atrás.
    if (location.state?.aviso) navigate(location.pathname, { replace: true, state: null });
  }, []);

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function cargar() {
    try {
      setCargando(true);
      setError(null);
      const data = await comboAdminService.listar();
      setCombos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('No se pudieron cargar tus combos. Revisá tu conexión y reintentá.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  }

  async function confirmarCambioEstado() {
    if (!comboAConfirmar) return;
    const { combo, nuevoEstado } = comboAConfirmar;
    try {
      setCambiandoEstado(combo.id);
      await comboAdminService.cambiarEstado(combo.id, nuevoEstado);
      setComboAConfirmar(null);
      setAviso(nuevoEstado === 'ACTIVO' ? `"${combo.nombre}" ya está en venta.` : `"${combo.nombre}" quedó pausado.`);
      await cargar();
    } catch (err) {
      setComboAConfirmar(null);
      setError(err.response?.data?.message || 'No se pudo cambiar el estado del combo.');
    } finally {
      setCambiandoEstado(null);
    }
  }

  const conteo = useMemo(() => combos.reduce((acc, c) => {
    acc[c.estado] = (acc[c.estado] || 0) + 1;
    return acc;
  }, {}), [combos]);

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return combos.filter(c => {
      if (vista !== 'TODOS' && c.estado !== vista) return false;
      if (!q) return true;
      const nombres = [c.nombre, c.producto_padre?.nombre, ...(c.items || []).map(i => i.producto_incluido?.nombre)];
      return nombres.some(n => n?.toLowerCase().includes(q));
    });
  }, [combos, vista, texto]);

  return (
    <div className="prod-page">
      <div className="prod-header">
        <div className="prod-header-left">
          <div className="prod-icon-wrap"><Layers size={22} /></div>
          <div>
            <h1 className="prod-title">Mis combos</h1>
            <p className="prod-subtitle">
              {cargando ? 'Cargando...' : `${combos.length} combo${combos.length !== 1 ? 's' : ''} armado${combos.length !== 1 ? 's' : ''} por vos`}
            </p>
          </div>
        </div>
        <div className="combo-header-actions">
          <button className="btn-secondary" onClick={() => navigate('/mi-catalogo')}>
            <ArrowLeft size={16} /> Mi catálogo
          </button>
          <button className="btn-primary" onClick={() => navigate('/combos/nuevo')}>
            <Plus size={16} /> Armar combo
          </button>
        </div>
      </div>

      {aviso && (
        <div className="combo-aviso" role="status">
          <CheckCircle2 size={15} /> {aviso}
        </div>
      )}

      <div className="prod-filters">
        <div className="filter-search">
          <Search size={15} className="filter-icon" />
          <input
            className="filter-input"
            placeholder="Buscar por combo o producto incluido..."
            value={texto}
            onChange={e => setTexto(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="prod-view-tabs" role="tablist" aria-label="Estado del combo">
        {VISTAS.map(v => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={vista === v.id}
            className={`prod-view-tab ${vista === v.id ? 'active' : ''}`}
            onClick={() => setVista(v.id)}
          >
            {v.label} <span className="combo-tab-count">{v.id === 'TODOS' ? combos.length : (conteo[v.id] || 0)}</span>
          </button>
        ))}
      </div>

      <div className="prod-table-wrap">
        {cargando && combos.length === 0 ? (
          <div className="prod-loading"><div className="spinner" /></div>
        ) : error ? (
          <div className="prod-empty">
            <AlertTriangle size={40} color="var(--color-danger)" />
            <p>{error}</p>
            <button className="btn-secondary" onClick={cargar}>Reintentar</button>
          </div>
        ) : combos.length === 0 ? (
          <div className="prod-empty">
            <Layers size={48} opacity={0.3} />
            <p>Todavía no armaste ningún combo.</p>
            <p className="combo-empty-hint">Juntá un producto con otros que lo complementen y el sistema te dice hasta dónde podés bajar el precio sin perder plata.</p>
            <button className="btn-primary" onClick={() => navigate('/combos/nuevo')}>
              <Plus size={14} /> Armar el primero
            </button>
          </div>
        ) : visibles.length === 0 ? (
          <div className="prod-empty">
            <Search size={40} opacity={0.3} />
            <p>Ningún combo coincide con este filtro.</p>
            <button className="btn-secondary" onClick={() => { setTexto(''); setVista('TODOS'); }}>Ver todos</button>
          </div>
        ) : (
          <div className="prod-table-inner">
            <table className="prod-table">
              <thead>
                <tr>
                  <th>Combo</th>
                  <th>Precio</th>
                  <th>Utilidad</th>
                  <th>Margen</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(combo => {
                  const { precio, utilidad, margen } = economiaPublicada(combo);
                  const img = portada(combo);
                  const incluidos = combo.items || [];
                  const estado = ESTADO_UI[combo.estado] || ESTADO_UI.BORRADOR;
                  const tono = margen === null ? '' : margen <= 0 ? 'neg' : margen < margenMinimo ? 'warn' : 'pos';
                  const abrir = () => navigate(`/combos/${combo.id}/editar`);
                  return (
                    <tr
                      key={combo.id}
                      className={`prod-row ${combo.estado === 'INACTIVO' ? 'row-inactive' : ''}`}
                      onClick={abrir}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') abrir(); }}
                    >
                      <td>
                        <div className="prod-cell-name">
                          <div className="prod-thumb">
                            {img ? <img src={getMediaUrl(img)} alt="" /> : <Layers size={18} opacity={0.4} />}
                          </div>
                          <div>
                            <div className="prod-name-line">
                              <span className="prod-name">{combo.nombre}</span>
                              <span className="prod-indicator">{incluidos.length + 1} productos</span>
                            </div>
                            <div className="prod-meta-line combo-incluye">
                              <span>{combo.producto_padre?.nombre || 'Sin producto principal'}</span>
                              {incluidos.slice(0, 2).map(it => (
                                <span key={it.id}>
                                  + {it.producto_incluido?.nombre}
                                  {Number(it.descuento_porcentaje) > 0 && <em> −{Number(it.descuento_porcentaje)}%</em>}
                                </span>
                              ))}
                              {incluidos.length > 2 && <span>+{incluidos.length - 2} más</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className="price-tag">{gs(precio)}</span></td>
                      <td>
                        <span className={`combo-num ${utilidad === null ? '' : utilidad < 0 ? 'neg' : 'pos'}`}>
                          {utilidad !== null && utilidad < 0 ? `Pierde ${gs(-utilidad)}` : gs(utilidad)}
                        </span>
                      </td>
                      <td><span className={`combo-num ${tono}`}>{margen === null ? '—' : `${(margen * 100).toFixed(1)}%`}</span></td>
                      <td>
                        <span className={`estado-venta-badge ${estado.clase}`}>
                          <span className="estado-venta-dot" />
                          {estado.label}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="btn-icon"
                            onClick={e => { e.stopPropagation(); abrir(); }}
                            title="Editar combo"
                            aria-label={`Editar ${combo.nombre}`}
                          >
                            <Edit2 size={15} />
                          </button>
                          {combo.estado === 'ACTIVO' ? (
                            <button
                              className="btn-icon danger"
                              disabled={cambiandoEstado === combo.id}
                              onClick={e => { e.stopPropagation(); setComboAConfirmar({ combo, nuevoEstado: 'INACTIVO' }); }}
                              title="Pausar venta"
                              aria-label={`Pausar ${combo.nombre}`}
                            >
                              <PowerOff size={15} />
                            </button>
                          ) : (
                            <button
                              className="btn-icon combo-btn-activar"
                              disabled={cambiandoEstado === combo.id}
                              onClick={e => { e.stopPropagation(); setComboAConfirmar({ combo, nuevoEstado: 'ACTIVO' }); }}
                              title="Poner en venta"
                              aria-label={`Poner en venta ${combo.nombre}`}
                            >
                              <Power size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!comboAConfirmar}
        title={comboAConfirmar?.nuevoEstado === 'ACTIVO'
          ? `¿Poner en venta "${comboAConfirmar?.combo?.nombre}"?`
          : `¿Pausar "${comboAConfirmar?.combo?.nombre}"?`}
        description={comboAConfirmar?.nuevoEstado === 'ACTIVO'
          ? 'Va a aparecer en tu catálogo y en las landings donde lo agregues.'
          : 'Deja de aparecer en tu catálogo y en tus landings. Podés volver a ponerlo en venta cuando quieras.'}
        confirmLabel={comboAConfirmar?.nuevoEstado === 'ACTIVO' ? 'Poner en venta' : 'Pausar'}
        danger={comboAConfirmar?.nuevoEstado !== 'ACTIVO'}
        loading={cambiandoEstado === comboAConfirmar?.combo?.id}
        onConfirm={confirmarCambioEstado}
        onCancel={() => setComboAConfirmar(null)}
      />
    </div>
  );
}
