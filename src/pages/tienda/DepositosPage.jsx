import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FilterX, Building2, Package, ArrowLeft } from 'lucide-react';
import { depositoService } from '../../services/deposito.service';
import DepositoFilters from '../../components/depositos/DepositoFilters';
import DepositoCard from '../../components/depositos/DepositoCard';
import DepositoForm from '../../components/depositos/DepositoForm';
import ConfirmDialog from '../../components/ConfirmDialog';
import FulfillmentCard from '../../components/depositos/FulfillmentCard';
import useSesion from '../../hooks/useSesion';

export default function DepositosPage() {
  const navigate = useNavigate();
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === 'administrador';

  const [depositos, setDepositos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({});
  const limit = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', desc: '', action: null, danger: false });

  const fetchDepositos = async (currentPage = page, currentFiltros = filtros) => {
    try {
      setLoading(true);
      const res = await depositoService.listarDepositos({
        page: currentPage,
        limit,
        ...currentFiltros
      });
      setDepositos(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Error cargando depósitos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepositos();
  }, [page, filtros]);

  const handleFiltrosChange = (nuevosFiltros) => {
    setFiltros(nuevosFiltros);
    setPage(1); // Reset a primera página al filtrar
  };

  const handleOpenNuevo = () => {
    setFormValues(null);
    setFormOpen(true);
  };

  const handleOpenEditar = (deposito) => {
    setFormValues(deposito);
    setFormOpen(true);
  };

  const handleGuardar = async (form) => {
    try {
      setFormLoading(true);
      if (form.id) {
        await depositoService.actualizarDeposito(form.id, form);
      } else {
        await depositoService.crearDeposito(form);
        setPage(1);
      }
      setFormOpen(false);
      fetchDepositos();
    } catch (err) {
      alert(err.response?.data?.error || 'Ocurrió un error al guardar el depósito.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleEstado = (deposito) => {
    const accion = deposito.activo ? 'desactivar' : 'activar';
    setConfirmDialog({
      open: true,
      title: `¿Querés ${accion} este depósito?`,
      desc: deposito.activo 
        ? 'Ya no podrá utilizarse como destino de nuevos abastecimientos.'
        : 'Volverá a estar disponible para recibir mercadería.',
      danger: deposito.activo,
      action: async () => {
        try {
          await depositoService.cambiarEstadoDeposito(deposito.id, !deposito.activo);
          fetchDepositos();
        } catch (err) {
          alert(err.response?.data?.error || `Error al ${accion} el depósito.`);
        } finally {
          setConfirmDialog({ open: false });
        }
      }
    });
  };

  const handleDelete = (deposito) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar depósito',
      desc: '¿Estás seguro de que querés eliminar este depósito? Esta acción no se puede deshacer.',
      danger: true,
      action: async () => {
        try {
          const res = await depositoService.eliminarDeposito(deposito.id);
          alert(res.message || 'Depósito eliminado correctamente');
          fetchDepositos();
        } catch (err) {
          alert(err.response?.data?.error || 'Error al eliminar el depósito.');
        } finally {
          setConfirmDialog({ open: false });
        }
      }
    });
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const tieneFiltros = Object.keys(filtros).length > 0;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      {!esAdmin && (
        <div className="mb-4">
          <button
            onClick={() => navigate('/mi-tienda')}
            className="flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft size={16} />
            Volver a Mi Tienda
          </button>
        </div>
      )}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-bold text-fg">Depósitos</h1>
          <p className="m-0 mt-1 text-sm text-fg-muted">
            Administrá los lugares donde recibís tu mercadería.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenNuevo}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover shadow-sm"
        >
          <Plus size={16} />
          Nuevo depósito
        </button>
      </div>

      {!esAdmin && (
        <div className="mb-6">
          <FulfillmentCard />
        </div>
      )}

      <div className="mb-6">
        <DepositoFilters onChange={handleFiltrosChange} />
      </div>

      <div className="relative min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas/50 backdrop-blur-[1px]">
            <span className="loader" />
          </div>
        )}

        {depositos.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {depositos.map(dep => (
                <DepositoCard
                  key={dep.id}
                  deposito={dep}
                  onEdit={handleOpenEditar}
                  onToggleEstado={handleToggleEstado}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {total > limit && (
              <div className="flex items-center justify-between border-t border-border pt-4 mt-8">
                <span className="text-sm text-fg-muted">
                  Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total} depósitos
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Anterior
                  </button>
                  <span className="text-sm font-medium text-fg px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : !loading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-50 py-20 text-center px-4">
            {tieneFiltros ? (
              <>
                <FilterX size={48} className="mb-4 text-fg-muted opacity-50" />
                <h3 className="m-0 mb-1 text-lg font-medium text-fg">No hay resultados</h3>
                <p className="m-0 mb-6 text-sm text-fg-muted max-w-sm">
                  No encontramos depósitos que coincidan con los filtros aplicados.
                </p>
                <button
                  type="button"
                  onClick={() => handleFiltrosChange({})}
                  className="rounded-md bg-surface-2 px-4 py-2 text-sm font-medium text-fg hover:bg-surface-3 transition-colors border border-border"
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <Building2 size={48} className="mb-4 text-fg-muted opacity-50" />
                <h3 className="m-0 mb-1 text-lg font-medium text-fg">Todavía no tenés depósitos registrados</h3>
                <p className="m-0 mb-6 text-sm text-fg-muted max-w-sm leading-relaxed">
                  Agregá un depósito para poder recibir productos cuando quieras gestionar tus propios envíos.
                </p>
                <button
                  type="button"
                  onClick={handleOpenNuevo}
                  className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover shadow-sm"
                >
                  <Plus size={16} />
                  Crear mi primer depósito
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <DepositoForm
          initialValues={formValues}
          onSubmit={handleGuardar}
          onClose={() => setFormOpen(false)}
          loading={formLoading}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.desc}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog({ open: false })}
      />
    </div>
  );
}
