import React from 'react';
import { AlertTriangle, MapPin, PackagePlus, Pencil, Plus, Truck, User, X } from 'lucide-react';
import DepositoStatusBadge from './DepositoStatusBadge';

function CourierRow({ courier, onConfigure }) {
  const sinCobertura = (courier.ciudades_cubiertas || 0) === 0;
  return (
    <li className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-semibold text-fg">{courier.nombre}</p>
          <p className={`m-0 mt-1 flex items-center gap-1.5 text-[13px] ${sinCobertura ? 'text-warning' : 'text-fg-muted'}`}>
            {sinCobertura ? <AlertTriangle size={13} /> : <MapPin size={13} />}
            {sinCobertura ? 'Sin cobertura configurada' : `${courier.ciudades_cubiertas} ciudad${courier.ciudades_cubiertas === 1 ? '' : 'es'} configurada${courier.ciudades_cubiertas === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onConfigure?.(courier)}
          className="rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-fg hover:bg-surface-2"
        >
          Configurar
        </button>
      </div>
    </li>
  );
}

export default function DepositoDetailPanel({
  deposito,
  modoPropio = true,
  courierSummary,
  summaryLoading,
  onClose,
  onEdit,
  onAssignCouriers,
  onAbastecer,
  onCreateCourier,
  onConfigureCourier,
}) {
  if (!deposito) return null;

  const couriersAsignados = courierSummary?.enabledCouriers || [];
  const sinCouriers = !summaryLoading && couriersAsignados.length === 0;
  const hayCouriersDisponibles = (courierSummary?.totalAvailable || 0) > 0;
  const pendientes = courierSummary?.pendingCount || 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-fg/30 p-0 backdrop-blur-[1px]" onClick={onClose}>
      <aside
        className="dep-detail h-full w-full max-w-[620px] overflow-y-auto border-l border-border bg-canvas shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Administrar ${deposito.nombre}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-canvas px-5 py-4">
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-semibold uppercase tracking-normal text-fg-muted">Administrar depósito</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="m-0 truncate text-lg font-semibold text-fg">{deposito.nombre}</h2>
              <DepositoStatusBadge activo={deposito.activo} />
            </div>
            <p className="m-0 mt-1 text-sm text-fg-muted">
              {deposito.ciudad}{deposito.departamento ? ` · ${deposito.departamento}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Cerrar detalle"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
        <section className="dep-detail-block">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-[12px] font-semibold uppercase text-fg-muted">Ubicación y contacto</p>
              <p className="m-0 mt-2 text-sm font-medium text-fg">{deposito.direccion}</p>
              {deposito.referencia && <p className="m-0 mt-1 text-sm text-fg-muted">{deposito.referencia}</p>}
              {(deposito.personaContacto || deposito.telefonoContacto) && (
                <p className="m-0 mt-3 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                  <User size={14} />
                  {[deposito.personaContacto, deposito.telefonoContacto].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onEdit?.(deposito)}
              className="inline-flex flex-shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2"
            >
              <Pencil size={15} />
              Editar
            </button>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border bg-surface-50 px-3 py-2">
            <p className="m-0 text-[11px] font-medium text-fg-muted">Couriers</p>
            <p className="m-0 mt-1 text-lg font-semibold text-fg">{summaryLoading ? '...' : courierSummary?.enabledCount || 0}</p>
          </div>
          <div className="rounded-md border border-border bg-surface-50 px-3 py-2">
            <p className="m-0 text-[11px] font-medium text-fg-muted">Ciudades</p>
            <p className="m-0 mt-1 text-lg font-semibold text-fg">{summaryLoading ? '...' : courierSummary?.totalCities || 0}</p>
          </div>
          <div className="rounded-md border border-border bg-surface-50 px-3 py-2">
            <p className="m-0 text-[11px] font-medium text-fg-muted">Sin cobertura</p>
            <p className={`m-0 mt-1 text-lg font-semibold ${pendientes > 0 ? 'text-warning' : 'text-fg'}`}>{summaryLoading ? '...' : pendientes}</p>
          </div>
        </section>

        <section className="dep-detail-block">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="m-0 text-base font-semibold text-fg">Transportistas y cobertura</h3>
              <p className="m-0 mt-0.5 text-[13px] text-fg-muted">{modoPropio ? 'Elegí quién entrega y las ciudades que atiende.' : 'Opcional: configurá transportistas si también despachás desde aquí.'}</p>
            </div>
            <button
              type="button"
              onClick={() => (hayCouriersDisponibles ? onAssignCouriers?.(deposito) : onCreateCourier?.(deposito))}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-[13px] font-semibold text-primary-fg hover:bg-primary-hover"
            >
              {hayCouriersDisponibles ? null : <Plus size={14} />}
              {hayCouriersDisponibles ? 'Asignar' : 'Crear courier'}
            </button>
          </div>

          {summaryLoading ? (
            <div className="rounded-lg border border-border bg-surface-50 px-4 py-6 text-center text-sm text-fg-muted">Cargando couriers...</div>
          ) : sinCouriers ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-50 px-4 py-5">
              <p className="m-0 text-sm font-semibold text-fg">
                {hayCouriersDisponibles ? 'Sin couriers asignados' : 'Primero cargá tus couriers'}
              </p>
              <p className="m-0 mt-1 text-sm text-fg-muted">
                {hayCouriersDisponibles
                  ? 'Asigná uno o varios couriers para habilitar despachos desde este depósito.'
                  : 'Todavía no hay couriers disponibles para asignar. Creá un courier con su cobertura y después vinculalo a este depósito.'}
              </p>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {couriersAsignados.map((courier) => (
                <CourierRow key={courier.id} courier={courier} onConfigure={(c) => onConfigureCourier?.(c, deposito)} />
              ))}
            </ul>
          )}
        </section>
        <section className="dep-detail-block dep-detail-stock">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="m-0 text-base font-semibold text-fg">Abastecer este depósito</h3>
              <p className="m-0 mt-0.5 text-[13px] text-fg-muted">Pedí productos de catálogo RAHA para que lleguen a esta dirección.</p>
            </div>
            <button
              type="button"
              onClick={() => onAbastecer?.(deposito)}
              disabled={!deposito.activo}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-fg hover:bg-surface-2 disabled:opacity-50"
            >
              <PackagePlus size={15} />
              Abastecer depósito
            </button>
          </div>
        </section>

      </div>
      </aside>
    </div>
  );
}
