import React, { useState, useEffect, useCallback } from 'react';
import { Package, Layers, BarChart3, Loader, ImageOff, Check, AlertCircle } from 'lucide-react';
import { vitrinaService } from '../../services/vitrinaService';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';
import SensibilidadPanel from './SensibilidadPanel';
import './vitrina.css';

const FILTROS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'producto', label: 'Productos' },
  { valor: 'combo', label: 'Combos' },
];

function formatGs(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }) + ' Gs';
}

function PrecioEditable({ item, onGuardar }) {
  const [valor, setValor] = useState(item.precio_efectivo ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setValor(item.precio_efectivo ?? '');
    setError(null);
    setOk(false);
  }, [item.precio_efectivo]);

  const huboCambio = Number(valor) !== Number(item.precio_efectivo);

  async function guardar() {
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) {
      setError('Ingresá un precio válido.');
      return;
    }
    if (item.precio_minimo && num < item.precio_minimo) {
      setError(`No puede ser menor al mínimo (${formatGs(item.precio_minimo)}).`);
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await onGuardar(item, num);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="vit-price-editor" onClick={(e) => e.stopPropagation()}>
      <div className="vit-price-input-wrap">
        <CurrencyInput
          className={`vit-price-input ${error ? 'error' : ''}`}
          value={valor}
          prefix=""
          onChange={(num) => { setValor(num === '' ? '' : num); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') guardar(); }}
        />
        <span className="vit-price-suffix">Gs</span>
      </div>
      {huboCambio && !guardando && (
        <button className="vit-price-save-btn" onClick={guardar} title="Guardar precio">
          Guardar
        </button>
      )}
      {guardando && <Loader size={14} className="spin-icon" />}
      {ok && <Check size={16} color="#10b981" />}
      {error && (
        <div className="vit-price-error"><AlertCircle size={12} /> {error}</div>
      )}
      {item.precio_minimo ? (
        <span className="vit-price-min">Mínimo: {formatGs(item.precio_minimo)}</span>
      ) : null}
    </div>
  );
}

function VitrinaCard({ item, onGuardarPrecio, onVerSensibilidad }) {
  const esCombo = item.tipo === 'combo';

  return (
    <div className="vit-card" onClick={() => onVerSensibilidad(item)}>
      <div className="vit-card-media">
        {esCombo ? (
          <div className="vit-card-media-placeholder combo"><Layers size={28} /></div>
        ) : item.imagen ? (
          <img src={getMediaUrl(item.imagen)} alt={item.nombre} />
        ) : (
          <div className="vit-card-media-placeholder"><ImageOff size={28} /></div>
        )}
        <span className={`vit-card-badge ${esCombo ? 'combo' : 'producto'}`}>
          {esCombo ? <><Layers size={11} /> Combo</> : <><Package size={11} /> Producto</>}
        </span>
      </div>

      <div className="vit-card-body">
        <h3 className="vit-card-name">{item.nombre}</h3>
        {esCombo && item.productos_incluidos?.length > 0 && (
          <p className="vit-card-includes">Incluye: {item.productos_incluidos.join(', ')}</p>
        )}
        {item.descripcion && <p className="vit-card-desc">{item.descripcion}</p>}

        <PrecioEditable item={item} onGuardar={onGuardarPrecio} />

        <button className="vit-card-sensib-btn" onClick={() => onVerSensibilidad(item)}>
          <BarChart3 size={14} /> Ver análisis de sensibilidad
        </button>
      </div>
    </div>
  );
}

export default function VitrinaGrid() {
  const [productos, setProductos] = useState([]);
  const [combos, setCombos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [seleccionSensibilidad, setSeleccionSensibilidad] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await vitrinaService.catalogo();
      setProductos(data.productos || []);
      setCombos(data.combos || []);
    } catch (err) {
      setError('No se pudo cargar el catálogo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleGuardarPrecio(item, precio) {
    if (item.tipo === 'combo') {
      await vitrinaService.guardarPrecioCombo(item.id, precio);
      setCombos(prev => prev.map(c => c.id === item.id ? { ...c, precio_usuario: precio, precio_efectivo: precio } : c));
    } else {
      await vitrinaService.guardarPrecioProducto(item.id, precio);
      setProductos(prev => prev.map(p => p.id === item.id ? { ...p, precio_usuario: precio, precio_efectivo: precio } : p));
    }
  }

  const items = [
    ...productos.map(p => ({ ...p, tipo: 'producto' })),
    ...combos.map(c => ({ ...c, tipo: 'combo' })),
  ];
  const itemsFiltrados = filtro === 'todos' ? items : items.filter(i => i.tipo === filtro);

  return (
    <div className="vit-page">
      <div className="vit-header">
        <div>
          <h1 className="vit-title">Mi catálogo</h1>
          <p className="vit-subtitle">
            Definí tu propio precio de venta para cada producto o combo. Nunca puede ser menor al mínimo configurado.
          </p>
        </div>
      </div>

      <div className="vit-filters">
        {FILTROS.map(f => (
          <button
            key={f.valor}
            className={`vit-filter-btn ${filtro === f.valor ? 'active' : ''}`}
            onClick={() => setFiltro(f.valor)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="vit-empty"><Loader size={24} className="spin-icon" /><p>Cargando catálogo...</p></div>
      ) : error ? (
        <div className="vit-empty">
          <AlertCircle size={28} color="#ef4444" />
          <p>{error}</p>
          <button className="btn-secondary" onClick={cargar}>Reintentar</button>
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <div className="vit-empty">
          <Package size={32} opacity={0.3} />
          <p>Todavía no hay {filtro === 'combo' ? 'combos' : filtro === 'producto' ? 'productos' : 'productos ni combos'} disponibles.</p>
        </div>
      ) : (
        <div className="vit-grid">
          {itemsFiltrados.map(item => (
            <VitrinaCard
              key={`${item.tipo}-${item.id}`}
              item={item}
              onGuardarPrecio={handleGuardarPrecio}
              onVerSensibilidad={setSeleccionSensibilidad}
            />
          ))}
        </div>
      )}

      {seleccionSensibilidad && (
        <SensibilidadPanel
          item={seleccionSensibilidad}
          onClose={() => setSeleccionSensibilidad(null)}
        />
      )}
    </div>
  );
}
