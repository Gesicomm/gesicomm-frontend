import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Settings, Truck, Search, X, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { proveedoresService } from '../../services/costosGastosService';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useDebounce } from '../../hooks/useDebounce';
import CurrencyInput from '../../components/CurrencyInput';

export default function ProveedoresView() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounce(busqueda, 300);
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [registroEditar, setRegistroEditar] = useState(null);
  
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarProveedores = useCallback(() => {
    setLoading(true);
    proveedoresService.buscar({ nombre: busquedaDebounced, limit: 100 })
      .then(d => {
        setProveedores(d.proveedores || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [busquedaDebounced]);

  useEffect(() => { cargarProveedores(); }, [cargarProveedores]);

  const abrirNuevo = () => { setRegistroEditar(null); setModalAbierto(true); };
  const abrirEditar = (p) => { setRegistroEditar(p); setModalAbierto(true); };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await proveedoresService.eliminar(aEliminar.id);
      setAEliminar(null);
      cargarProveedores();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al eliminar proveedor.');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-fg">
            <Truck className="text-primary-text" size={24} /> Proveedores
          </h1>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">
            Administra los proveedores de tu tienda y configura el precio de dólar particular de cada uno.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={abrirNuevo}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <Plus size={16} /> Agregar proveedor
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3">
          <Search size={16} className="text-fg-subtle" />
          <input type="text" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="h-10 w-full max-w-md bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 border-b border-border">
            <tr>
              <th className="p-4 font-medium text-fg-subtle">Nombre</th>
              <th className="p-4 font-medium text-fg-subtle">Estado</th>
              <th className="p-4 font-medium text-fg-subtle">Precio Dólar</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-fg-muted">Cargando...</td></tr>
            ) : proveedores.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-fg-muted">No se encontraron proveedores.</td></tr>
            ) : proveedores.map(p => (
              <tr key={p.id} className="transition-colors hover:bg-surface-2">
                <td className="p-4 font-semibold text-fg">{p.nombre}</td>
                <td className="p-4">
                  {p.activo ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success border border-success/20">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger border border-danger/20">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="p-4 font-medium text-fg">
                  {p.precio_dolar ? `Gs. ${Number(p.precio_dolar).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : 'No definido'}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => abrirEditar(p)} className="rounded p-1.5 text-fg-subtle hover:bg-surface-3 hover:text-fg">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setAEliminar(p)} className="rounded p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <ProveedorFormModal
          registro={registroEditar}
          onClose={() => setModalAbierto(false)}
          onGuardado={() => { setModalAbierto(false); cargarProveedores(); }}
        />
      )}

      <ConfirmDialog
        open={!!aEliminar}
        title="¿Eliminar proveedor?"
        description={aEliminar ? `"${aEliminar.nombre}" se dará de baja. Podrás reactivarlo si es necesario.` : ''}
        confirmLabel="Eliminar"
        danger
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}

function ProveedorFormModal({ registro, onClose, onGuardado }) {
  const esEdicion = !!registro;
  const [nombre, setNombre] = useState(registro?.nombre || '');
  const [precioDolar, setPrecioDolar] = useState(registro?.precio_dolar ? Number(registro.precio_dolar) : '');
  const [activo, setActivo] = useState(registro ? registro.activo : true);
  
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setError('El nombre es requerido.'); return; }
    setError('');
    setGuardando(true);
    try {
      const payload = { 
        nombre: nombre.trim(), 
        activo, 
        precio_dolar: precioDolar ? Number(precioDolar) : null 
      };
      
      if (esEdicion) {
        await proveedoresService.actualizar(registro.id, payload);
      } else {
        await proveedoresService.crear(payload);
      }
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar proveedor.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">
            {esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"><X size={18} /></button>
        </div>
        <form onSubmit={guardar} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-fg-subtle">Nombre *</span>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
                className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg" />
            </label>
            
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-fg-subtle">Precio de Dólar</span>
              <CurrencyInput 
                value={precioDolar} 
                onChange={setPrecioDolar}
                placeholder="Ej: 7.450,50"
                decimals={2}
                className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg" 
              />
              <p className="text-[10px] text-fg-muted">El tipo de cambio utilizado para los costos de los productos de este proveedor.</p>
            </label>

            {esEdicion && (
               <label className="flex items-center gap-2 mt-2">
                 <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} className="rounded border-border bg-surface text-primary-text" />
                 <span className="text-sm font-medium text-fg">Activo</span>
               </label>
            )}
          </div>
          <div className="flex shrink-0 gap-2 border-t border-border p-4">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
