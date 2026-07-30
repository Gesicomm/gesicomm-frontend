import React, { useState, useEffect } from 'react';
import { X, Plus, Copy, Power, PowerOff, Edit } from 'lucide-react';
import { comboService } from '../../services/comboService';
import ComboModal from './ComboModal';

export default function ProductCombosDrawer({ producto, onClose }) {
  const [combos, setCombos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorBase, setErrorBase] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [comboEditando, setComboEditando] = useState(null);

  useEffect(() => {
    cargarCombos();
  }, [producto.id]);

  const cargarCombos = async () => {
    try {
      setCargando(true);
      const data = await comboService.listar(producto.id);
      setCombos(data);
    } catch (err) {
      console.error(err);
      setErrorBase('Error al cargar los combos del producto.');
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async (comboData) => {
    try {
      setErrorBase('');
      if (comboEditando) {
        await comboService.actualizar(producto.id, comboData.id, comboData);
      } else {
        await comboService.crear(producto.id, comboData);
      }
      setModalOpen(false);
      setComboEditando(null);
      cargarCombos();
    } catch (err) {
      console.error(err);
      setErrorBase(err.response?.data?.message || 'Error al guardar el combo.');
    }
  };

  const handleEditar = (combo) => {
    setComboEditando(combo);
    setModalOpen(true);
  };

  const handleDuplicar = async (combo) => {
    try {
      setErrorBase('');
      const payload = {
        ...combo,
        nombre: `${combo.nombre} (copia)`,
        activo: false,
        items: combo.items.map(it => ({
          producto_incluido_id: it.producto_incluido_id,
          cantidad: it.cantidad
        }))
      };
      await comboService.crear(producto.id, payload);
      cargarCombos();
    } catch (err) {
      console.error(err);
      setErrorBase(err.response?.data?.message || 'Error al duplicar el combo.');
    }
  };

  const handleToggleActivo = async (combo) => {
    if (combo.activo) {
      if (!window.confirm(`¿Desactivar "${combo.nombre}"?\nEl combo dejará de estar disponible para nuevas ventas.`)) {
        return;
      }
    }
    try {
      setErrorBase('');
      await comboService.cambiarEstado(producto.id, combo.id, !combo.activo);
      cargarCombos();
    } catch (err) {
      console.error(err);
      setErrorBase(err.response?.data?.message || 'Error al cambiar el estado del combo.');
    }
  };

  return (
    <>
      <div 
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900 }} 
        onClick={onClose}
      />
      
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: '600px',
        background: '#0a0a0b', zIndex: 901, display: 'flex', flexDirection: 'column',
        boxShadow: '-5px 0 25px rgba(0,0,0,0.5)', borderLeft: '1px solid rgba(255,255,255,0.05)',
        transform: 'translateX(0)', transition: 'transform 0.3s ease-out'
      }}>
        
        {/* Header Drawer */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Combos de {producto.nombre}
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#888' }}>
              Promociones que incluyen a {producto.nombre} como producto principal.
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}><X size={24} /></button>
        </div>

        {/* Action Bar */}
        <div style={{ padding: '1.5rem 1.5rem 0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {combos.length > 0 && (
              <span style={{ fontSize: '0.85rem', color: '#888' }}>{combos.length} combo(s) configurado(s)</span>
            )}
          </div>
          {combos.length > 0 && (
            <button type="button" className="btn-primary" onClick={() => { setComboEditando(null); setModalOpen(true); }}>
              <Plus size={16} /> Crear combo
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {errorBase && <div className="field-error" style={{ marginBottom: '1rem' }}>{errorBase}</div>}

          {cargando ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Cargando combos...</div>
          ) : combos.length === 0 ? (
            <div className="empty-state" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#eee' }}>Este producto todavía no tiene combos.</h3>
              <p style={{ color: '#888', marginBottom: '2rem', lineHeight: '1.5' }}>
                Crea una promoción combinando <strong>{producto.nombre}</strong><br/>con otros productos de tu catálogo.
              </p>
              <button type="button" className="btn-primary" style={{ margin: '0 auto' }} onClick={() => { setComboEditando(null); setModalOpen(true); }}>
                <Plus size={16} /> Crear promoción
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {combos.map((combo) => {
                const normal = combo.items?.reduce((acc, item) => acc + ((parseFloat(item.producto_incluido?.precio_base) || 0) * parseInt(item.cantidad)), 0) || 0;
                const final = parseFloat(combo.precio_total) || 0;
                const ahorro = normal - final;
                const pct = normal > 0 ? ((ahorro / normal) * 100).toFixed(2) : 0;

                return (
                  <div key={combo.id} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', opacity: combo.activo ? 1 : 0.6, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{combo.nombre}</h3>
                      <span className={`badge ${combo.activo ? 'badge-active' : 'badge-archived'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: combo.activo ? '#10b981' : '#ef4444' }} />
                        {combo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                      {combo.items?.map((it, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ccc', marginBottom: '0.5rem' }}>
                          <span>{it.producto_incluido?.nombre}</span>
                          <span style={{ fontWeight: '600' }}>× {it.cantidad}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ padding: '1rem', background: '#0a0a0b', borderRadius: '8px', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#888', marginBottom: '0.4rem' }}>
                        <span>Precio normal</span>
                        <span style={{ textDecoration: ahorro > 0 ? 'line-through' : 'none' }}>{normal.toLocaleString()} Gs</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold' }}>
                        <span>Precio combo</span>
                        <span>{final.toLocaleString()} Gs</span>
                      </div>
                      {ahorro > 0 ? (
                        <div style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: '600', textAlign: 'right' }}>
                          ✓ Ahorras {ahorro.toLocaleString()} Gs ({pct}%)
                        </div>
                      ) : ahorro < 0 ? (
                        <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: '600', textAlign: 'right' }}>
                          ⚠️ El combo cuesta {Math.abs(ahorro).toLocaleString()} Gs más
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleEditar(combo)}>
                        <Edit size={15} /> Editar
                      </button>
                      <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleDuplicar(combo)}>
                        <Copy size={15} /> Duplicar
                      </button>
                      <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', color: combo.activo ? '#ef4444' : '#10b981' }} onClick={() => handleToggleActivo(combo)}>
                        {combo.activo ? <PowerOff size={15} /> : <Power size={15} />}
                        {combo.activo ? ' Desactivar' : ' Activar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <ComboModal
          comboInicial={comboEditando}
          productoPadre={producto}
          onClose={() => { setModalOpen(false); setComboEditando(null); }}
          onSave={handleGuardar}
        />
      )}
    </>
  );
}
