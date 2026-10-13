import React from 'react';
import { MapPin, Phone, User, Edit2, Trash2, Power, PowerOff, MoreVertical, Truck, ArrowRight, AlertTriangle, PackagePlus } from 'lucide-react';
import DepositoStatusBadge from './DepositoStatusBadge';

export default function DepositoCard({
  deposito,
  courierSummary,
  summaryLoading = false,
  selected = false,
  onManage,
  onEdit,
  onCouriers,
  onAbastecer,
  onToggleEstado,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const couriersAsignados = courierSummary?.enabledCount ?? 0;
  const ciudades = courierSummary?.totalCities ?? 0;
  const pendientes = courierSummary?.pendingCount ?? 0;

  return (
    <div className={`flex flex-col gap-4 rounded-lg border bg-surface px-4 py-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md lg:grid lg:grid-cols-[minmax(260px,1fr)_minmax(170px,240px)_210px_auto] lg:items-center ${selected ? 'border-primary/60 ring-2 ring-primary/10' : 'border-border'}`}>
      <button
        type="button"
        onClick={() => onManage?.(deposito)}
        className="flex min-w-0 items-start gap-3 text-left"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MapPin size={18} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-base font-semibold text-fg">{deposito.nombre}</h3>
            <DepositoStatusBadge activo={deposito.activo} />
            {pendientes > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                <AlertTriangle size={11} />
                Por configurar
              </span>
            )}
          </span>
          <span className="block text-sm text-fg-muted">
            {deposito.ciudad}{deposito.departamento ? ` · ${deposito.departamento}` : ''}
          </span>
          <span className="mt-1 block truncate text-sm text-fg">{deposito.direccion}</span>
          {deposito.referencia && (
            <span className="mt-0.5 block truncate text-[13px] text-fg-muted">{deposito.referencia}</span>
          )}
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-subtle">
        {deposito.personaContacto ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <User size={13} /> <span className="truncate">{deposito.personaContacto}</span>
          </span>
        ) : (
          <span className="text-fg-muted">Sin contacto</span>
        )}
        {deposito.telefonoContacto && (
          <span className="flex min-w-0 items-center gap-1.5">
            <Phone size={13} /> <span className="truncate">{deposito.telefonoContacto}</span>
          </span>
        )}
      </div>

      <div className="grid w-full grid-cols-2 gap-2 text-sm">
        <span className="rounded-md border border-border bg-surface-50 px-3 py-2">
          <span className="block text-[11px] font-medium uppercase text-fg-muted">Couriers</span>
          <span className="font-semibold text-fg">{summaryLoading ? '...' : couriersAsignados}</span>
        </span>
        <span className="rounded-md border border-border bg-surface-50 px-3 py-2">
          <span className="block text-[11px] font-medium uppercase text-fg-muted">Ciudades</span>
          <span className="font-semibold text-fg">{summaryLoading ? '...' : ciudades}</span>
        </span>
      </div>

      <div className="flex items-center justify-end gap-2 self-end lg:self-auto">
        <button
          type="button"
          onClick={() => onManage?.(deposito)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-surface-2 px-3 text-[13px] font-semibold text-fg transition-colors hover:bg-primary hover:text-white"
        >
          Administrar
          <ArrowRight size={14} />
        </button>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label={`Más acciones para ${deposito.nombre}`}
          >
            <MoreVertical size={16} />
          </button>
          
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(deposito);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-fg-muted hover:bg-surface-2 hover:text-fg"
                >
                  <Edit2 size={14} />
                  Editar depósito
                </button>
                {onCouriers && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onCouriers(deposito);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-fg-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <Truck size={14} />
                    Asignar couriers
                  </button>
                )}
                {onAbastecer && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onAbastecer(deposito);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-fg-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <PackagePlus size={14} />
                    Abastecer depósito
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleEstado(deposito);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-fg-muted hover:bg-surface-2 hover:text-fg"
                >
                  {deposito.activo ? (
                    <>
                      <PowerOff size={14} />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <Power size={14} />
                      Activar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(deposito);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-danger hover:bg-danger/10"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
