import React from 'react';
import { MapPin, Phone, User, Edit2, Trash2, Power, PowerOff, MoreVertical, Truck } from 'lucide-react';
import DepositoStatusBadge from './DepositoStatusBadge';

export default function DepositoCard({ deposito, onEdit, onToggleEstado, onDelete, onGestionarCouriers }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-start sm:justify-between sm:p-5 p-4 gap-4">
      <div className="flex-1 space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="m-0 text-base font-semibold text-fg">{deposito.nombre}</h3>
            <DepositoStatusBadge activo={deposito.activo} />
          </div>
          <p className="m-0 text-sm text-fg-muted flex items-center gap-1.5">
            <MapPin size={14} className="flex-shrink-0" />
            <span>
              {deposito.ciudad}{deposito.departamento ? ` · ${deposito.departamento}` : ''}
            </span>
          </p>
        </div>

        <div className="space-y-1.5 text-sm text-fg">
          <p className="m-0 break-words">{deposito.direccion}</p>
          {deposito.referencia && (
            <p className="m-0 text-fg-muted text-[13px]">{deposito.referencia}</p>
          )}
        </div>

        {(deposito.personaContacto || deposito.telefonoContacto) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-subtle pt-1">
            {deposito.personaContacto && (
              <span className="flex items-center gap-1.5">
                <User size={13} /> {deposito.personaContacto}
              </span>
            )}
            {deposito.telefonoContacto && (
              <span className="flex items-center gap-1.5">
                <Phone size={13} /> {deposito.telefonoContacto}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center sm:items-start gap-2 self-end sm:self-auto">
        {onGestionarCouriers && (
          <button
            type="button"
            onClick={() => onGestionarCouriers(deposito)}
            title="Elegir con qué couriers se despacha desde este depósito"
            className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Truck size={14} />
            Couriers
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(deposito)}
          className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Edit2 size={14} />
          Editar
        </button>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <MoreVertical size={16} />
          </button>
          
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
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
