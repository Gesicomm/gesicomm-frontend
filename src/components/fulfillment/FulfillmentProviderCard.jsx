import React, { useState } from 'react';
import { Truck, MapPin, AlertTriangle, Phone, Mail, User, Pencil, Trash2, Power } from 'lucide-react';
import { formatGs } from './vocabulario';
import { etiquetaTipo, etiquetaCapacidad } from './proveedorVocabulario';

/**
 * Un proveedor logístico de la red.
 *
 * "Sin cobertura configurada" se muestra como advertencia y no como un cero
 * discreto: un proveedor que no llega a ninguna ciudad no puede cotizar, y
 * eso es un problema de configuración, no un dato más.
 */
export default function FulfillmentProviderCard({ proveedor, onEditar, onEliminar, onAlternarActivo }) {
  const [confirmando, setConfirmando] = useState(false);
  const sinCobertura = !proveedor.ciudades;
  const capacidades = proveedor.capacidades || [];
  const contacto = [proveedor.contacto, proveedor.telefono, proveedor.email].filter(Boolean);

  return (
    <div className={`rounded-xl border bg-surface p-4 ${proveedor.activo ? 'border-border' : 'border-border opacity-70'}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-muted">
            <Truck size={17} />
          </span>
          <div>
            <h3 className="m-0 text-sm font-semibold text-fg">{proveedor.nombre}</h3>
            <p className="m-0 text-[12px] text-fg-subtle">{etiquetaTipo(proveedor.tipo)}</p>
          </div>
        </div>
        {!proveedor.activo && (
          <span className="rounded-full bg-fg-muted/10 px-2 py-0.5 text-[10px] font-bold uppercase text-fg-muted">
            Inactivo
          </span>
        )}
      </div>

      {capacidades.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {capacidades.map((c) => (
            <span key={c} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-fg-muted">
              {etiquetaCapacidad(c)}
            </span>
          ))}
        </div>
      )}

      <p className="m-0 flex items-center gap-1.5 text-[13px] text-fg-muted">
        <MapPin size={12} />
        {proveedor.ciudades} ciudad{proveedor.ciudades === 1 ? '' : 'es'}
        {proveedor.desde != null && ` · desde ${formatGs(proveedor.desde)}`}
      </p>

      {contacto.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
          {proveedor.contacto && (
            <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
              <User size={11} /> {proveedor.contacto}
            </span>
          )}
          {proveedor.telefono && (
            <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
              <Phone size={11} /> {proveedor.telefono}
            </span>
          )}
          {proveedor.email && (
            <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
              <Mail size={11} /> {proveedor.email}
            </span>
          )}
        </div>
      )}

      {sinCobertura && (
        <p className="m-0 mt-2 flex items-start gap-1.5 rounded-md bg-warning/10 px-2.5 py-1.5 text-[12px] text-warning">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          Sin cobertura configurada: todavía no puede cotizar entregas.
        </p>
      )}

      {(onEditar || onEliminar || onAlternarActivo) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
          {onEditar && (
            <button
              type="button"
              onClick={() => onEditar(proveedor)}
              className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[13px] font-medium text-primary hover:underline"
            >
              <Pencil size={13} /> Editar
            </button>
          )}
          {onAlternarActivo && (
            <button
              type="button"
              onClick={() => onAlternarActivo(proveedor)}
              className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[13px] text-fg-muted hover:text-fg"
            >
              <Power size={13} /> {proveedor.activo ? 'Desactivar' : 'Activar'}
            </button>
          )}
          {onEliminar && (
            confirmando ? (
              <span className="flex items-center gap-2 text-[13px]">
                <span className="text-fg-muted">¿Eliminar?</span>
                <button
                  type="button"
                  onClick={() => { setConfirmando(false); onEliminar(proveedor); }}
                  className="cursor-pointer border-none bg-transparent p-0 font-semibold text-danger hover:underline"
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="cursor-pointer border-none bg-transparent p-0 text-fg-muted hover:text-fg"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="ml-auto flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[13px] text-fg-muted hover:text-danger"
              >
                <Trash2 size={13} /> Eliminar
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
