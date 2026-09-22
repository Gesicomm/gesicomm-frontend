import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { categoriasCostosGastosService } from '../../services/costosGastosService';

const GRUPOS = [
  { id: 'operacion', label: 'Operación' },
  { id: 'administracion', label: 'Administración' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'tecnologia', label: 'Tecnología' },
  { id: 'financiero', label: 'Financiero' },
  { id: 'otros', label: 'Otros' },
];

/** Modal simple para administrar las categorías propias del negocio (las
 * globales del sistema no se pueden borrar, solo las creadas por el tenant). */
export default function CategoriasConfig({ categorias, onClose, onCambio }) {
  const [nombre, setNombre] = useState('');
  const [grupo, setGrupo] = useState('otros');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const recargar = async () => {
    const d = await categoriasCostosGastosService.listar();
    onCambio(d.categorias || []);
  };

  const crear = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    setError('');
    try {
      await categoriasCostosGastosService.crear({ nombre: nombre.trim(), grupo });
      setNombre('');
      await recargar();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la categoría.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    try {
      await categoriasCostosGastosService.eliminar(id);
      await recargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar la categoría.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-border bg-surface shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">Categorías financieras</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg"><X size={18} /></button>
        </div>

        <form onSubmit={crear} className="flex shrink-0 flex-wrap gap-2 border-b border-border p-4">
          <input
            type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Nueva categoría…"
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle"
          />
          <select value={grupo} onChange={e => setGrupo(e.target.value)} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
            {GRUPOS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <button type="submit" disabled={guardando} className="flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm font-semibold text-white disabled:opacity-60">
            <Plus size={14} /> Agregar
          </button>
          {error && <p className="w-full text-xs text-danger">{error}</p>}
        </form>

        <div className="flex-1 overflow-y-auto p-4">
          {GRUPOS.map(g => {
            const items = categorias.filter(c => c.grupo === g.id);
            if (items.length === 0) return null;
            return (
              <div key={g.id} className="mb-4">
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">{g.label}</h4>
                <div className="flex flex-col gap-1">
                  {items.map(c => (
                    <div key={c.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5 text-sm">
                      <span className="text-fg">{c.nombre}</span>
                      {!c.es_global && (
                        <button type="button" onClick={() => eliminar(c.id)} className="text-fg-subtle hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
