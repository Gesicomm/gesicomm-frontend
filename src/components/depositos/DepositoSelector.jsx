import React, { useState, useEffect } from 'react';
import { Search, MapPin, Check, Plus } from 'lucide-react';
import { depositoService } from '../../services/deposito.service';
import { useDebounce } from '../../hooks/useDebounce';
import DepositoForm from './DepositoForm';

export default function DepositoSelector({ onSelect, depositoSeleccionadoId }) {
  const [depositos, setDepositos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [page, setPage] = useState(1);
  const [openCrear, setOpenCrear] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  
  const limit = 10;
  const debouncedBuscar = useDebounce(buscar, 400);

  const fetchDepositos = async (currentPage = 1, currentBuscar = '') => {
    try {
      setLoading(true);
      const res = await depositoService.listarDepositos({
        page: currentPage,
        limit,
        buscar: currentBuscar || undefined,
        activo: true // Solo activos para el abastecimiento
      });
      setDepositos(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Error cargando depósitos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchDepositos(1, debouncedBuscar);
  }, [debouncedBuscar]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchDepositos(newPage, debouncedBuscar);
  };

  const handleCrearDeposito = async (formValues) => {
    try {
      setLoadingForm(true);
      const nuevoDeposito = await depositoService.crearDeposito(formValues);
      setOpenCrear(false);
      
      // Volver a página 1 y refrescar
      setPage(1);
      await fetchDepositos(1, debouncedBuscar);
      
      // Auto-seleccionar el nuevo depósito
      onSelect(nuevoDeposito);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear depósito');
    } finally {
      setLoadingForm(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col h-[400px] border border-border rounded-lg bg-surface flex-shrink-0">
      <div className="p-3 border-b border-border bg-surface-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={16} />
          <input
            type="text"
            placeholder="Buscar depósito..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 relative">
        {loading && depositos.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="loader" />
          </div>
        ) : depositos.length > 0 ? (
          depositos.map(dep => (
            <div
              key={dep.id}
              onClick={() => onSelect(dep)}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                depositoSeleccionadoId === dep.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-2'
              }`}
            >
              <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                depositoSeleccionadoId === dep.id ? 'border-primary bg-primary' : 'border-fg-muted'
              }`}>
                {depositoSeleccionadoId === dep.id && <Check size={10} className="text-white" />}
              </div>
              <div className="flex-1">
                <h4 className={`m-0 text-[13px] font-semibold ${
                  depositoSeleccionadoId === dep.id ? 'text-primary' : 'text-fg'
                }`}>
                  {dep.nombre}
                </h4>
                <p className="m-0 mt-0.5 text-[12px] text-fg-muted flex items-center gap-1">
                  {dep.ciudad}{dep.departamento ? ` · ${dep.departamento}` : ''}
                </p>
                <p className="m-0 mt-0.5 text-[12px] text-fg-subtle truncate">
                  {dep.direccion}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <MapPin size={32} className="text-fg-muted mb-3 opacity-50" />
            <p className="text-sm font-medium text-fg mb-1">
              {buscar ? 'No encontramos depósitos' : 'No tenés depósitos activos'}
            </p>
            <p className="text-[13px] text-fg-muted mb-4 max-w-[250px]">
              {buscar 
                ? 'Probá buscando con otras palabras o creá uno nuevo.' 
                : 'Creá uno para recibir este abastecimiento y gestionar vos mismo la preparación y despacho.'}
            </p>
            <button
              type="button"
              onClick={() => setOpenCrear(true)}
              className="flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-fg hover:bg-surface-3 transition-colors border border-border"
            >
              <Plus size={14} />
              Crear depósito
            </button>
          </div>
        )}
        
        {loading && depositos.length > 0 && (
          <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="loader" />
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="border-t border-border bg-surface-50 p-2 flex items-center justify-between">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
            className="rounded px-2 py-1 text-[12px] font-medium text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-[12px] text-fg-muted">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="rounded px-2 py-1 text-[12px] font-medium text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30"
          >
            Siguiente
          </button>
        </div>
      )}

      {openCrear && (
        <DepositoForm
          onSubmit={handleCrearDeposito}
          onClose={() => setOpenCrear(false)}
          loading={loadingForm}
        />
      )}
    </div>
  );
}
