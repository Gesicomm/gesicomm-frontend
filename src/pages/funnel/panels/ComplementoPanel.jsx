import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import ComplementoConfig from '../ComplementoConfig';

/**
 * Pestaña "Complemento" del editor — solo existe en el embudo de Venta con
 * complemento. Reutiliza el MISMO configurador que se usa al crear el
 * embudo, así lo que se ve al configurarlo por primera vez y al cambiarlo
 * después es idéntico.
 */
export default function ComplementoPanel({
  producto,
  complementoId,
  precio,
  precioLista,
  descripcion,
  cantidad,
  guardando,
  error,
  aviso,
  onGuardar,
}) {
  const [tocado, setTocado] = useState(false);

  if (!producto) {
    return <p className="text-xs text-white/40">Este embudo no tiene producto asignado.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-white/40 leading-relaxed">
        Se ofrece durante la compra, después de que el cliente ya decidió
        llevar el producto principal. No aparece en la página del embudo: es
        parte del checkout.
      </p>

      {!complementoId && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Todavía no elegiste el complemento. Sin él, este embudo se comporta
            igual que uno de venta directa.
          </p>
        </div>
      )}

      {aviso && !tocado && (
        <p className="text-xs text-emerald-400">{aviso}</p>
      )}

      <ComplementoConfig
        producto={producto}
        complementoInicialId={complementoId}
        precioInicial={precio}
        precioListaInicial={precioLista}
        descripcionInicial={descripcion}
        cantidadInicial={cantidad}
        guardando={guardando}
        error={error}
        textoConfirmar="Guardar complemento"
        onConfirmar={(datos) => { setTocado(false); onGuardar(datos); }}
      />
    </div>
  );
}
