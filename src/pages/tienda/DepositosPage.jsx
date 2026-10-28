import { TutorialHeaderAction } from '../../components/TutorialDock';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FilterX, Building2, ArrowLeft, ChevronDown, Truck, Package } from 'lucide-react';
import { depositoService } from '../../services/deposito.service';
import DepositoFilters from '../../components/depositos/DepositoFilters';
import DepositoCard from '../../components/depositos/DepositoCard';
import DepositoDetailPanel from '../../components/depositos/DepositoDetailPanel';
import DepositoForm from '../../components/depositos/DepositoForm';
import CouriersDepositoModal from '../../components/depositos/CouriersDepositoModal';
import AbastecerDepositoModal from '../../components/depositos/AbastecerDepositoModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import FulfillmentCard from '../../components/depositos/FulfillmentCard';
import { CourierWizard } from '../courier/CourierWizard';
import { normalizarRegla, paraApi } from '../courier/DeliveryPanel';
import { createCourier, getDeliveryZonas, replaceDeliveryZonas, updateCourier } from '../../services/courierApi';
import useSesion from '../../hooks/useSesion';
import '../courier/courier.css';
import './depositos.css';
import '../../styles/settingsTypography.css';

const resumenCouriers = (data) => {
  const couriers = data?.couriers || [];
  const enabledCouriers = couriers.filter((c) => c.habilitado);
  return {
    enabledCouriers,
    enabledCount: enabledCouriers.length,
    totalAvailable: couriers.length,
    totalCities: enabledCouriers.reduce((acc, c) => acc + (Number(c.ciudades_cubiertas) || 0), 0),
    pendingCount: enabledCouriers.filter((c) => !c.ciudades_cubiertas).length,
  };
};

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

  // Alta y edición del depósito. Los couriers se asignan después, desde el detalle.
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [depositoCouriers, setDepositoCouriers] = useState(null);
  const [depositoAbastecer, setDepositoAbastecer] = useState(null);
  const [depositoSeleccionado, setDepositoSeleccionado] = useState(null);
  const [courierSummaries, setCourierSummaries] = useState({});
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [courierWizard, setCourierWizard] = useState({ open: false, deposito: null, courier: null, reglas: [] });
  const [fulfillmentOpen, setFulfillmentOpen] = useState(false);
  const [fulfillmentConfig, setFulfillmentConfig] = useState(null);
  const [filtersKey, setFiltersKey] = useState(0);
  const resumenesReqRef = useRef(0);

  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', desc: '', action: null, danger: false });

  const fetchResumenesCouriers = async (lista) => {
    const requestId = ++resumenesReqRef.current;
    if (!lista?.length) {
      setCourierSummaries({});
      setSummariesLoading(false);
      return;
    }

    setSummariesLoading(true);
    const resultados = await Promise.allSettled(
      lista.map(async (dep) => {
        const data = await depositoService.listarCouriersDeposito(dep.id);
        return [dep.id, resumenCouriers(data)];
      }),
    );

    if (requestId !== resumenesReqRef.current) return;

    const siguiente = {};
    resultados.forEach((resultado) => {
      if (resultado.status === 'fulfilled') {
        const [id, resumen] = resultado.value;
        siguiente[id] = resumen;
      }
    });
    setCourierSummaries(siguiente);
    setSummariesLoading(false);
  };

  const fetchDepositos = async (currentPage = page, currentFiltros = filtros) => {
    try {
      setLoading(true);
      const res = await depositoService.listarDepositos({
        page: currentPage,
        limit,
        ...currentFiltros
      });
      const lista = res.data || [];
      setDepositos(lista);
      setTotal(res.total || 0);
      setDepositoSeleccionado((seleccionado) => {
        if (!seleccionado) return null;
        return lista.find((dep) => dep.id === seleccionado.id) || null;
      });
      fetchResumenesCouriers(lista);
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

  const handleCrearCourierParaDeposito = (deposito) => {
    setCourierWizard({ open: true, deposito, courier: null, reglas: [] });
  };

  const handleConfigurarCourier = async (courier, deposito = depositoSeleccionado) => {
    try {
      const zonas = await getDeliveryZonas();
      const reglas = (zonas || []).filter((zona) => String(zona.courier_id) === String(courier.id));
      setCourierWizard({ open: true, deposito, courier, reglas });
    } catch (err) {
      console.error('Error cargando tarifas del courier:', err);
      alert('No pudimos cargar la configuración del courier.');
    }
  };

  const handleGuardarCourier = async ({ courier, reglas }) => {
    if (!courier) return;

    const guardado = courier.id
      ? await updateCourier(courier.id, courier)
      : await createCourier(courier);
    const courierId = guardado.id || courier.id;
    const reglasCourier = reglas.map((regla) => normalizarRegla({ ...regla, courier_id: courierId }));

    await replaceDeliveryZonas(paraApi(reglasCourier), [Number(courierId)]);

    if (!courier.id && courierWizard.deposito?.id) {
      const actuales = courierSummaries[courierWizard.deposito.id]?.enabledCouriers || [];
      const ids = [...new Set([...actuales.map((c) => Number(c.id)), Number(courierId)].filter(Boolean))];
      await depositoService.guardarCouriersDeposito(courierWizard.deposito.id, ids);
    }

    setCourierWizard({ open: false, deposito: null, courier: null, reglas: [] });
    await fetchResumenesCouriers(depositos);
  };

  const handleGuardarDeposito = async (form) => {
    try {
      setFormLoading(true);
      const guardado = form.id
        ? await depositoService.actualizarDeposito(form.id, form)
        : await depositoService.crearDepositoAvisandoDuplicado(form);
      // Eligió no crear el duplicado: el formulario queda abierto para corregir.
      if (!guardado) return;
      setFormOpen(false);
      setFormValues(null);
      setDepositoSeleccionado(guardado);
      if (!form.id) setPage(1);
      await fetchDepositos(form.id ? page : 1);
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
  const depositosActivos = depositos.filter((dep) => dep.activo).length;
  const resumenSeleccionado = depositoSeleccionado ? courierSummaries[depositoSeleccionado.id] : null;

  return (
    <div className="dep-page mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      {!esAdmin && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate('/mi-tienda')}
            className="dep-back-to-store"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            Volver a Mi Tienda
          </button>
        </div>
      )}
      <div className="dep-page-heading mb-6 flex flex-col gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold text-fg">Depósitos</h1>
          <p className="m-0 mt-1 text-sm text-fg-muted">
            Definí desde dónde sale tu mercadería y quién se encarga de entregarla.
          </p>
        </div>
        <nav aria-label="Acciones de depósitos" className="dep-primary-actions gc-tutorial-heading-actions">
          <TutorialHeaderAction />
          <button
            type="button"
            onClick={handleOpenNuevo}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover shadow-sm"
          >
            <Plus size={16} />
            Agregar depósito
          </button>

        </nav>
      </div>

      {!esAdmin && (
        <div className="dep-delivery">
          <div className="dep-delivery-heading">
            <div className="dep-delivery-copy">
              <Truck size={20} aria-hidden="true" />
              <div>
                <span className="dep-delivery-label">Modalidad de entrega actual</span>
                {fulfillmentConfig && <strong className="dep-delivery-mode">{fulfillmentConfig.modalidad === 'PROPIA' ? 'Mis propios envíos' : 'Gesicom-RAHA gestiona la entrega'}</strong>}
                <span className="dep-delivery-current">{fulfillmentConfig ? (fulfillmentConfig.modalidad === 'PROPIA' ? 'Despachás con tus depósitos y couriers.' : 'Gesicom-RAHA prepara y entrega tus pedidos.') : 'Consultá o cambiá cómo entregás tus pedidos.'}</span>
              </div>
            </div>
            <div className="dep-delivery-actions">
              <button type="button" className="dep-delivery-toggle" onClick={() => setFulfillmentOpen(open => !open)} aria-label={`Entrega de pedidos: ${fulfillmentOpen ? 'cerrar' : 'cambiar'} configuración`} aria-expanded={fulfillmentOpen} aria-controls="dep-delivery-options">
                {fulfillmentOpen ? 'Cerrar configuración' : 'Cambiar'}<ChevronDown size={18} className={fulfillmentOpen ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>
          <div id="dep-delivery-options" hidden={!fulfillmentOpen} className="border-t border-border p-4">
              <button type="button" className="dep-courier-catalog" onClick={() => navigate('/mi-tienda/couriers')}><Truck size={16} />Catálogo de couriers</button>
              <FulfillmentCard onConfiguracion={setFulfillmentConfig} />
            </div>
        </div>
      )}

      <div className="dep-list-controls">
        <DepositoFilters key={filtersKey} onChange={handleFiltrosChange} />
      </div>
      <div className="dep-list-summary"><strong>{total} {total === 1 ? 'depósito' : 'depósitos'}</strong><span>{depositosActivos} activos en esta página</span></div>

      <div className="relative min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas/50 backdrop-blur-[1px]">
            <span className="loader" />
          </div>
        )}

        {depositos.length > 0 ? (
          <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {depositos.map(dep => (
                  <DepositoCard
                    key={dep.id}
                    deposito={dep}
                    courierSummary={courierSummaries[dep.id]}
                    summaryLoading={summariesLoading && !courierSummaries[dep.id]}
                    modoPropio={esAdmin || fulfillmentConfig?.modalidad === 'PROPIA'}
                    selected={depositoSeleccionado?.id === dep.id}
                    onManage={setDepositoSeleccionado}
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
                  onClick={() => { handleFiltrosChange({}); setFiltersKey(value => value + 1); }}
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
                  Agregá primero el lugar desde donde despachás. Después vas a poder asignarle uno o varios couriers.
                </p>
                <button
                  type="button"
                  onClick={handleOpenNuevo}
                  className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover shadow-sm"
                >
                  <Plus size={16} />
                  Crear mi primer depósito
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {!esAdmin && <section className="dep-stock-section" aria-labelledby="dep-stock-title">
        <header><h2 id="dep-stock-title">Mercadería y abastecimiento</h2><p>Elegí hacia dónde necesitás mover tus productos.</p></header>
        <div className="dep-stock-grid">
          <button type="button" onClick={() => navigate('/mis-abastecimientos')}><Package size={23} /><span><strong>Traer productos de RAHA</strong><small>Consultá tus abastecimientos para recibir mercadería en tu depósito.</small></span><ArrowLeft size={17} /></button>
          <button type="button" onClick={() => navigate('/mis-envios-raha')}><Truck size={23} /><span><strong>Enviar mercadería a RAHA</strong><small>Enviá tus productos para que RAHA prepare y despache tus pedidos.</small></span><ArrowLeft className="rotate-180" size={17} /></button>
        </div>
      </section>}

      <DepositoDetailPanel
        deposito={depositoSeleccionado}
        modoPropio={esAdmin || fulfillmentConfig?.modalidad === 'PROPIA'}
        courierSummary={resumenSeleccionado}
        summaryLoading={summariesLoading && !resumenSeleccionado}
        onClose={() => setDepositoSeleccionado(null)}
        onEdit={handleOpenEditar}
        onAssignCouriers={setDepositoCouriers}
        onAbastecer={setDepositoAbastecer}
        onCreateCourier={handleCrearCourierParaDeposito}
        onConfigureCourier={handleConfigurarCourier}
      />

      {formOpen && (
        <DepositoForm
          initialValues={formValues}
          onSubmit={handleGuardarDeposito}
          onClose={() => setFormOpen(false)}
          loading={formLoading}
        />
      )}

      <CouriersDepositoModal
        deposito={depositoCouriers}
        open={Boolean(depositoCouriers)}
        onClose={() => setDepositoCouriers(null)}
        onGuardado={() => {
          setDepositoCouriers(null);
          fetchResumenesCouriers(depositos);
        }}
      />

      <AbastecerDepositoModal
        deposito={depositoAbastecer}
        open={Boolean(depositoAbastecer)}
        onClose={() => setDepositoAbastecer(null)}
      />

      <CourierWizard
        open={courierWizard.open}
        courier={courierWizard.courier}
        reglas={courierWizard.reglas}
        pasoInicial={courierWizard.courier ? 'ciudades' : 'courier'}
        esAdmin={esAdmin}
        departamentoSugerido={courierWizard.deposito?.departamento || ''}
        onClose={() => setCourierWizard({ open: false, deposito: null, courier: null, reglas: [] })}
        onGuardar={handleGuardarCourier}
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
