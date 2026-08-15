import React, { useState, useMemo } from 'react';
import { Package, Plus, Edit } from 'lucide-react';
import ProductPicker from '../ProductPicker';
import { renderInput } from './SchemaInspector';

export default function ProductosInspector({ seccion, schema, onUpdate, catalogo, onUploadImagen }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  
  // seccion.contenido.productos = [ { id, tipo, etiqueta } ] 
  const productosSeleccionados = seccion.contenido?.productos || [];

  // Temporary state for the modal
  const [tempSeleccion, setTempSeleccion] = useState(new Map());

  const handleUpdate = (key, value) => {
    onUpdate(seccion.id, { contenido: { ...seccion.contenido, [key]: value } });
  };

  const handleUpdateConfig = (key, value) => {
    onUpdate(seccion.id, { config: { ...seccion.config, [key]: value } });
  };

  const handleQuitarProducto = (idx) => {
    const nuevos = [...productosSeleccionados];
    nuevos.splice(idx, 1);
    handleUpdate('productos', nuevos);
  };

  const claveItem = (tipo, id) => `${tipo}:${id}`;

  const abrirModal = () => {
    // Populate Map from array
    const mapa = new Map();
    productosSeleccionados.forEach(p => {
       mapa.set(claveItem(p.tipo, p.id), { tipo: p.tipo, id: p.id, etiqueta: p.etiqueta });
    });
    setTempSeleccion(mapa);
    setModalAbierto(true);
  };

  const guardarModal = () => {
    // Convert Map back to array in order
    const array = Array.from(tempSeleccion.values());
    handleUpdate('productos', array);
    setModalAbierto(false);
  };

  const handleToggle = (item) => {
    setTempSeleccion(prev => {
      const copia = new Map(prev);
      const clave = claveItem(item.tipo, item.id);
      if (copia.has(clave)) {
        copia.delete(clave);
      } else {
        if (copia.size >= 50) return prev; // max limit
        copia.set(clave, { tipo: item.tipo, id: item.id, nombre: item.nombre, etiqueta: '' });
      }
      return copia;
    });
  };

  const handleEtiqueta = (item, etiqueta) => {
    setTempSeleccion(prev => {
      const clave = claveItem(item.tipo, item.id);
      if (!prev.has(clave)) return prev;
      const copia = new Map(prev);
      copia.set(clave, { ...copia.get(clave), etiqueta });
      return copia;
    });
  };

  const handleQuitar = (item) => {
    setTempSeleccion(prev => {
      const clave = claveItem(item.tipo, item.id);
      const copia = new Map(prev);
      copia.delete(clave);
      return copia;
    });
  };

  const handleReordenar = (desde, hasta) => {
    setTempSeleccion(prev => {
      const entradas = Array.from(prev.entries());
      const [movida] = entradas.splice(desde, 1);
      entradas.splice(hasta, 0, movida);
      return new Map(entradas);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Contenido: Productos seleccionados */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Productos seleccionados</h4>
        <div className="flex flex-col gap-2 mb-3">
          {productosSeleccionados.map((p, idx) => {
            // Find name from catalogo for display if not saved
            let name = p.nombre;
            if (!name) {
               const catItem = p.tipo === 'combo' ? catalogo?.combos?.find(c => c.id === p.id) : catalogo?.productos?.find(pr => pr.id === p.id);
               name = catItem ? catItem.nombre : `${p.tipo} ${p.id}`;
            }
            return (
              <div key={`${p.tipo}-${p.id}-${idx}`} className="flex items-center justify-between p-2 rounded border border-[var(--vit-border)] bg-[var(--vit-surface)] text-sm group">
                <span className="truncate">{name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    type="button" 
                    onClick={() => {
                      const url = p.tipo === 'combo' ? `/combos/${p.id}/editar` : `/mi-landing/producto/${p.id}`;
                      window.open(url, '_blank');
                    }}
                    className="text-[var(--vit-muted)] hover:bg-[var(--vit-bg)] p-1.5 rounded"
                    title="Editar detalles del producto en nueva pestaña"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleQuitarProducto(idx)}
                    className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                    title="Quitar de la lista"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
          {productosSeleccionados.length === 0 && (
            <p className="text-sm text-[var(--vit-muted-2)]">No hay productos seleccionados.</p>
          )}
        </div>
        
        <button 
          type="button" 
          onClick={abrirModal}
          className="lb-btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Seleccionar productos
        </button>
      </div>
      
      {/* Diseño General */}
      {schema.contentSchema?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Configuracin</h4>
          <div className="flex flex-col gap-4">
             {schema.contentSchema.map(campo => (
                <label key={campo.key} className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-[var(--vit-text)]">{campo.label}</span>
                  {renderInput(
                    campo, 
                    seccion.contenido?.[campo.key], 
                    handleUpdate,
                    onUploadImagen
                  )}
                </label>
             ))}
          </div>
        </div>
      )}
      
      {/* Modal para ProductPicker */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--vit-bg)] rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-[var(--vit-border)]">
             <div className="flex items-center justify-between p-4 border-b border-[var(--vit-border)] bg-[var(--vit-card-bg)] shrink-0">
               <div>
                 <h3 className="font-semibold text-lg text-[var(--vit-text)]">Seleccionar Productos</h3>
                 <p className="text-sm text-[var(--vit-muted)]">Los productos seleccionados ({tempSeleccion.size}) se mostrarán en esta sección.</p>
               </div>
               <div className="flex items-center gap-2">
                 <button type="button" onClick={() => setModalAbierto(false)} className="lb-btn-ghost px-4 py-2">Cancelar</button>
                 <button type="button" onClick={guardarModal} className="lb-btn-primary px-4 py-2">Confirmar selección</button>
               </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4">
                <ProductPicker 
                  catalogo={catalogo}
                  seleccion={tempSeleccion}
                  itemsOrdenados={Array.from(tempSeleccion.values()).map(sel => {
                    const itemCat = sel.tipo === 'combo' ? catalogo?.combos?.find(c => c.id === sel.id) : catalogo?.productos?.find(p => p.id === sel.id);
                    return itemCat ? { ...itemCat, ...sel } : sel;
                  })}
                  max={50}
                  onToggle={handleToggle}
                  onEtiqueta={handleEtiqueta}
                  onQuitar={handleQuitar}
                  onReordenar={handleReordenar}
                />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
