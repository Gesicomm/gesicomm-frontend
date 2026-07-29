import React, { useState } from 'react';
import { Plus, Edit, Copy, Power, PowerOff, X } from 'lucide-react';
import ComboModal from './ComboModal';

export default function ComboManager({ combos = [], setCombos, productoPadre, errorBase }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [comboEditando, setComboEditando] = useState(null);

  const handleGuardar = (combo) => {
    if (comboEditando) {
      setCombos(combos.map(c => c === comboEditando ? combo : c));
    } else {
      setCombos([...combos, combo]);
    }
    setModalOpen(false);
    setComboEditando(null);
  };

  const handleEditar = (combo) => {
    setComboEditando(combo);
    setModalOpen(true);
  };

  const handleDuplicar = (combo) => {
    const copia = {
      ...combo,
      id: undefined, // nuevo
      nombre: `${combo.nombre} (copia)`,
      activo: false // inactivo por defecto
    };
    setCombos([...combos, copia]);
  };

  const handleToggleActivo = (combo) => {
    if (combo.activo) {
      if (!window.confirm(`¿Desactivar "${combo.nombre}"?\nEl combo dejará de estar disponible para nuevas ventas.`)) {
        return;
      }
    }
    setCombos(combos.map(c => c === combo ? { ...c, activo: !c.activo } : c));
  };

  return (
    <div className="combo-manager">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Combos Promocionales</h2>
          <p className="field-hint" style={{ marginTop: '0.2rem' }}>
            Crea promociones agrupando este producto con otros productos de tu catálogo.
          </p>
        </div>
        {combos.length > 0 && (
          <button type="button" className="btn-primary" onClick={() => { setComboEditando(null); setModalOpen(true); }}>
            <Plus size={16} /> Crear combo
          </button>
        )}
      </div>

      {errorBase && <div className="field-error" style={{ marginBottom: '1rem' }}>{errorBase}</div>}

      {combos.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem', textAlign: 'center', background: '#0a0a0b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: '#888', marginBottom: '1rem' }}>Este producto todavía no tiene combos.</p>
          <button type="button" className="btn-secondary" onClick={() => { setComboEditando(null); setModalOpen(true); }}>
            <Plus size={15} /> Crear promoción
          </button>
        </div>
      ) : (
        <div className="combos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {combos.map((combo, idx) => {
            const normal = combo.items?.reduce((acc, item) => acc + ((parseFloat(item.producto_incluido?.precio_base || item._precio_base) || 0) * parseInt(item.cantidad)), 0) || 0;
            const final = parseFloat(combo.precio_total) || 0;
            const ahorro = normal - final;
            const pct = normal > 0 ? ((ahorro / normal) * 100).toFixed(1) : 0;

            return (
              <div key={idx} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', opacity: combo.activo ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{combo.nombre}</h3>
                  <span className={`badge ${combo.activo ? 'badge-active' : 'badge-archived'}`}>
                    {combo.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <div style={{ flex: 1, marginBottom: '1.5rem' }}>
                  {combo.items?.slice(0, 3).map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ccc', marginBottom: '0.4rem' }}>
                      <span>• {it.producto_incluido?.nombre || it._nombre}</span>
                      <span>× {it.cantidad}</span>
                    </div>
                  ))}
                  {combo.items?.length > 3 && (
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>
                      + {combo.items.length - 3} productos más
                    </div>
                  )}
                </div>

                <div style={{ padding: '1rem', background: '#0a0a0b', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>
                    <span>Precio normal</span>
                    <span style={{ textDecoration: ahorro > 0 ? 'line-through' : 'none' }}>{normal.toLocaleString()} Gs</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold' }}>
                    <span>Precio combo</span>
                    <span>{final.toLocaleString()} Gs</span>
                  </div>
                  {ahorro > 0 ? (
                    <div style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: '600' }}>
                      ✓ Ahorras {ahorro.toLocaleString()} Gs ({pct}%)
                    </div>
                  ) : ahorro < 0 ? (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: '600' }}>
                      ⚠️ El combo cuesta {Math.abs(ahorro).toLocaleString()} Gs más
                    </div>
                  ) : (
                    <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: '600' }}>
                      Mismo precio individual
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleEditar(combo)}>
                    <Edit size={14} /> Editar
                  </button>
                  <button type="button" className="btn-icon" onClick={() => handleDuplicar(combo)} title="Duplicar">
                    <Copy size={15} />
                  </button>
                  <button type="button" className="btn-icon" onClick={() => handleToggleActivo(combo)} title={combo.activo ? 'Desactivar' : 'Activar'}>
                    {combo.activo ? <PowerOff size={15} color="#ef4444" /> : <Power size={15} color="#10b981" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <ComboModal
          comboInicial={comboEditando}
          productoPadre={productoPadre}
          onClose={() => { setModalOpen(false); setComboEditando(null); }}
          onSave={handleGuardar}
        />
      )}
    </div>
  );
}
