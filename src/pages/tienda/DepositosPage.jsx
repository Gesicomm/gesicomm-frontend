import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FilterX, Building2, ArrowLeft } from 'lucide-react';
import { depositoService } from '../../services/deposito.service';
import { createCourier, updateCourier, replaceDeliveryZonas } from '../../services/courierApi';
import DepositoFilters from '../../components/depositos/DepositoFilters';
import DepositoCard from '../../components/depositos/DepositoCard';
import DepositoForm from '../../components/depositos/DepositoForm';
import CouriersDepositoModal from '../../components/depositos/CouriersDepositoModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import FulfillmentCard from '../../components/depositos/FulfillmentCard';
import { CourierWizard } from '../courier/CourierWizard';
import { normalizarRegla, paraApi } from '../courier/DeliveryPanel';
import CouriersSection from './CouriersSection';
import useSesion from '../../hooks/useSesion';

const detalleDelServidor = (err) => (err?.response?.data?.error ? ` (${err.response.data.error})` : '');

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

  // Alta: asistente Depósito → Courier → Ciudades → Resumen.
  const [altaOpen, setAltaOpen] = useState(false);
  // Lo que el asistente ya llegó a crear. El alta son varios guardados
  // encadenados; si uno falla y el usuario reintenta, no hay que duplicar el
  // depósito ni el courier que sí se guardaron.
  const altaRef = useRef({ depositoId: null, courierId: null });

  // Edición: un depósito existente se corrige en el modal de siempre.
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [depositoCouriers, setDepositoCouriers] = useState(null);
  const [recargarCouriers, setRecargarCouriers] = useState(0);

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
    altaRef.current = { depositoId: null, courierId: null };
    setAltaOpen(true);
  };

  const handleOpenEditar = (deposito) => {
    setFormValues(deposito);
    setFormOpen(true);
  };

  const refrescarTrasAlta = () => {
    setPage(1);
    fetchDepositos(1);
    setRecargarCouriers(k => k + 1);
  };

  // Depósito → courier → ciudades → vínculo, en ese orden. Cada paso que sale
  // bien queda anotado en altaRef para que un reintento retome desde ahí.
  const handleGuardarAlta = async ({ deposito, courier, reglas }) => {
    const alta = altaRef.current;

    try {
      if (alta.depositoId) {
        await depositoService.actualizarDeposito(alta.depositoId, deposito);
      } else {
        const creado = await depositoService.crearDeposito(deposito);
        alta.depositoId = creado.id;
      }
    } catch (err) {
      throw Object.assign(err, {
        mensajeUsuario: `No pudimos guardar el depósito. Intentá de nuevo.${detalleDelServidor(err)}`,
      });
    }

    if (courier) {
      try {
        if (alta.courierId) {
          await updateCourier(alta.courierId, courier);
        } else {
          const creado = await createCourier(courier);
          alta.courierId = creado.id;
        }
        const propias = reglas.map(r => normalizarRegla({ ...r, courier_id: String(alta.courierId) }));
        await replaceDeliveryZonas(paraApi(propias), [Number(alta.courierId)]);
        // Solo un courier activo se puede habilitar en un depósito.
        if (courier.activo !== false) {
          await depositoService.guardarCouriersDeposito(alta.depositoId, [alta.courierId]);
        }
      } catch (err) {
        refrescarTrasAlta();
        throw Object.assign(err, {
          mensajeUsuario: `El depósito ya quedó guardado, pero no pudimos guardar el courier. Tocá Guardar para reintentar solo esa parte.${detalleDelServidor(err)}`,
        });
      }
    }

    setAltaOpen(false);
    refrescarTrasAlta();
  };

  const handleGuardarEdicion = async (form) => {
    try {
      setFormLoading(true);
      await depositoService.actualizarDeposito(form.id, form);
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
            Desde dónde despachás y qué couriers entregan tus pedidos.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenNuevo}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover shadow-sm"
        >
          <Plus size={16} />
          Agregar depósito
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
                  onCouriers={setDepositoCouriers}
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
                  Agregá un depósito y, en el mismo asistente, el courier que retira de ahí y las ciudades que cubre.
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

      <div className="mt-10">
        <CouriersSection
          esAdmin={esAdmin}
          recargarKey={recargarCouriers}
        />
      </div>

      <CourierWizard
        open={altaOpen}
        conDeposito
        esAdmin={esAdmin}
        onClose={() => setAltaOpen(false)}
        onGuardar={handleGuardarAlta}
      />

      {formOpen && (
        <DepositoForm
          initialValues={formValues}
          onSubmit={handleGuardarEdicion}
          onClose={() => setFormOpen(false)}
          loading={formLoading}
        />
      )}

      <CouriersDepositoModal
        deposito={depositoCouriers}
        open={Boolean(depositoCouriers)}
        onClose={() => setDepositoCouriers(null)}
      />

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
