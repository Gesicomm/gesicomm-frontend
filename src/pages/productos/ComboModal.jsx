import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Lock, Save } from 'lucide-react';
import { productService } from '../../services/productService';
import CurrencyInput from '../../components/CurrencyInput';

export default function ComboModal({ comboInicial, productoPadre, onClose, onSave }) {
  const [nombre, setNombre] = useState(comboInicial?.nombre || '');
  const [precioTotal, setPrecioTotal] = useState(comboInicial?.precio_total || '');
  const [activo, setActivo] = useState(comboInicial?.activo !== false); // default true
  const [items, setItems] = useState([]);
  
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const searchRef = useRef(null);

  useEffect(() => {
    if (comboInicial?.items) {
      setItems(comboInicial.items.map(it => ({
        id: it.producto_incluido?.id || it.producto_incluido_id, // backend puede traer producto_incluido
        nombre: it.producto_incluido?.nombre || it._nombre, // _nombre es un hack del front
        precio_base: it.producto_incluido?.precio_base || it._precio_base,
        cantidad: it.cantidad,
        esPadre: Number(it.producto_incluido_id) === Number(productoPadre.id)
      })));
    } else {
      // Iniciar con el producto padre bloqueado
      setItems([{
        id: productoPadre.id,
        nombre: productoPadre.nombre,
        precio_base: productoPadre.precio_base,
        cantidad: 1,
        esPadre: true
      }]);
    }
  }, [comboInicial, productoPadre]);

  // Debounce search
  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productService.buscar({ texto: search, activo: true, limit: 10 });
        setSearchResults(res.productos || []);
      } catch (err) {
        console.error('Error buscando productos para combo', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const agregarProducto = (prod) => {
    setItems(prev => {
      const existe = prev.find(i => Number(i.id) === Number(prod.id));
      if (existe) {
        return prev.map(i => i === existe ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, {
        id: prod.id,
        nombre: prod.nombre,
        precio_base: prod.precio_base,
        cantidad: 1,
        esPadre: Number(prod.id) === Number(productoPadre.id)
      }];
    });
    setSearch('');
    setSearchResults([]);
  };

  const updateCantidad = (id, delta) => {
    setItems(prev => prev.map(i => {
      if (i.id === id) {
        const nc = Math.max(1, i.cantidad + delta); // min 1
        return { ...i, cantidad: nc };
      }
      return i;
    }));
  };

  const removeProducto = (id) => {
    setItems(prev => prev.filter(i => i.id !== id || i.esPadre)); // nunca remover al padre
  };

  const normalTotal = items.reduce((acc, it) => acc + ((parseFloat(it.precio_base) || 0) * parseInt(it.cantidad)), 0);
  const finalTotal = parseFloat(precioTotal) || 0;
  const ahorro = normalTotal - finalTotal;

  const handleSave = () => {
    if (!nombre.trim()) return alert('El nombre del combo es obligatorio.');
    if (finalTotal < 0) return alert('El precio no puede ser negativo.');
    
    // Mapear al formato que espera el backend
    const dataItems = items.map(i => ({
      producto_incluido_id: i.id,
      cantidad: i.cantidad,
      _nombre: i.nombre, // Para mostrar en frontend sin refetch
      _precio_base: i.precio_base // Para frontend
    }));

    onSave({
      id: comboInicial?.id,
      nombre: nombre.trim(),
      precio_total: finalTotal,
      activo,
      items: dataItems
    });
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-content" style={{ background: '#0a0a0b', width: '100%', maxWidth: '600px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* HEADER */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{comboInicial ? 'Editar Combo' : 'Crear Combo'}</h2>
          <button type="button" className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* BODY */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          <div className="form-group full">
            <label>Nombre de la promoción</label>
            <input 
              value={nombre} 
              onChange={e => setNombre(e.target.value)} 
              placeholder="Ej: Promo Verano" 
              autoFocus 
            />
          </div>

          <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>
              Productos incluidos
            </label>
            
            {/* Buscador */}
            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
              <div className="input-prefix" style={{ width: '100%' }}>
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar producto para agregar..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              
              {/* Resultados flotantes */}
              {search.length >= 2 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1c', border: '1px solid #333', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                  {searching ? (
                    <div style={{ padding: '1rem', color: '#888', textAlign: 'center', fontSize: '0.85rem' }}>Buscando...</div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: '1rem', color: '#888', textAlign: 'center', fontSize: '0.85rem' }}>No se encontraron productos.</div>
                  ) : (
                    searchResults.map(p => {
                      const yaAgregado = items.find(i => Number(i.id) === Number(p.id));
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => agregarProducto(p)}
                          style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #222', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#2a2a2c'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.nombre}</div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>SKU: {p.sku || 'N/A'} - {parseFloat(p.precio_base).toLocaleString()} Gs</div>
                          </div>
                          {yaAgregado && <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>✓ En combo ({yaAgregado.cantidad})</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Lista de Items */}
            <div style={{ marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
              {items.map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: it.esPadre ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {it.nombre}
                      {it.esPadre && <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px', color: '#888', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}><Lock size={10} /> Producto actual</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{(parseFloat(it.precio_base) || 0).toLocaleString()} Gs c/u</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#000', borderRadius: '6px', padding: '2px' }}>
                    <button type="button" className="btn-icon" onClick={() => updateCantidad(it.id, -1)} style={{ padding: '0.3rem' }}>-</button>
                    <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{it.cantidad}</span>
                    <button type="button" className="btn-icon" onClick={() => updateCantidad(it.id, 1)} style={{ padding: '0.3rem' }}>+</button>
                  </div>

                  {!it.esPadre && (
                    <button type="button" className="btn-icon danger" style={{ marginLeft: '1rem' }} onClick={() => removeProducto(it.id)}>
                      <X size={15} />
                    </button>
                  )}
                  {it.esPadre && <div style={{ width: '15px', marginLeft: '1rem' }} />}
                </div>
              ))}
            </div>
          </div>

          {/* PRECIOS Y AHORRO */}
          <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: '#888' }}>Precio individual (Suma)</span>
              <span style={{ fontSize: '1.1rem', textDecoration: ahorro > 0 ? 'line-through' : 'none' }}>{normalTotal.toLocaleString()} Gs</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600' }}>Precio del combo</span>
              <div className="input-prefix" style={{ width: '150px', padding: 0, border: 'none', background: 'transparent' }}>
                <CurrencyInput
                  value={precioTotal}
                  onChange={(val) => setPrecioTotal(val)}
                  style={{ padding: '0.5rem', width: '100%' }}
                />
              </div>
            </div>

            {finalTotal > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                {ahorro > 0 ? (
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Ahorro: {ahorro.toLocaleString()} Gs ({((ahorro / normalTotal) * 100).toFixed(1)}%)</span>
                ) : ahorro < 0 ? (
                  <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                    ⚠️ El combo es {Math.abs(ahorro).toLocaleString()} Gs más caro
                  </span>
                ) : (
                  <span style={{ color: '#888' }}>Sin ahorro (Mismo precio)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            <Save size={16} /> Guardar Combo
          </button>
        </div>

      </div>
    </div>
  );
}
