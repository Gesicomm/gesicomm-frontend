import React, { useCallback, useEffect, useState } from 'react';
import { Truck, Plus, AlertCircle } from 'lucide-react';
import { redFulfillmentService } from '../../services/redFulfillment.service';
import FulfillmentProviderCard from '../../components/fulfillment/FulfillmentProviderCard';
import ProveedorLogisticoWizard from '../../components/fulfillment/ProveedorLogisticoWizard';

/**
 * Proveedores logísticos de la red.
 *
 * No son couriers: un courier pertenece a un comercio y entrega los pedidos
 * de ese comercio. Estos operan la red de Gesicomm —retiro en proveedor,
 * cross-docking, traslado entre centros, última milla— y no se vinculan al
 * depósito privado de nadie.
 */
export default function ProveedoresLogisticos() {
  const [proveedores, setProveedores] = useState([]);
  const [centros, setCentros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [wizardAbierto, setWizardAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, centrosData] = await Promise.all([
        redFulfillmentService.proveedores(),
        redFulfillmentService.listarCentros(),
      ]);
      setProveedores(lista || []);
      setCentros(centrosData.centros || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los proveedores.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const alternarActivo = async (proveedor) => {
    try {
      await redFulfillmentService.actualizarProveedor(proveedor.id, { activo: !proveedor.activo });
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cambiar el estado.');
    }
  };

  /**
   * Borrar arrastra las tarifas del proveedor por cascada. El backend
   * responde 409 con cuántas son antes de tocar nada, así que se puede decir
   * el número exacto en vez de un "¿estás seguro?" a ciegas.
   */
  const eliminar = async (proveedor) => {
    setError(null);
    try {
      await redFulfillmentService.eliminarProveedor(proveedor.id);
      cargar();
    } catch (err) {
      if (err.response?.status === 409) {
        const reglas = err.response.data?.reglas?.total ?? 0;
        const confirmado = window.confirm(
          `"${proveedor.nombre}" tiene ${reglas} tarifa(s) cargada(s). `
          + 'Si lo eliminás se borran con él y la red deja de cotizar esas ciudades.\n\n'
          + 'Si sólo querés sacarlo de circulación, cancelá y usá "Desactivar".',
        );
        if (!confirmado) return;
        try {
          await redFulfillmentService.eliminarProveedor(proveedor.id, true);
          cargar();
        } catch (err2) {
          setError(err2.response?.data?.error || 'No se pudo eliminar.');
        }
        return;
      }
      setError(err.response?.data?.error || 'No se pudo eliminar.');
    }
  };

  const sinCentros = centros.length === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck size={21} />
          </span>
          <div>
            <h1 className="m-0 text-2xl font-bold text-fg">Proveedores logísticos</h1>
            <p className="m-0 mt-1 text-sm text-fg-muted">
              Los operadores con los que Gesicomm mueve mercadería dentro de su red.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={sinCentros}
          onClick={() => setWizardAbierto(true)}
          title={sinCentros ? 'Primero designá un centro en la red' : undefined}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          <Plus size={16} /> Nuevo proveedor
        </button>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="m-0">{error}</p>
        </div>
      )}

      {cargando ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-2" />)}
        </div>
      ) : proveedores.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
            <Truck size={20} />
          </div>
          <p className="m-0 text-sm font-medium text-fg">Todavía no hay proveedores en la red</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-fg-muted">
            {sinCentros
              ? 'Primero designá un centro de fulfillment: un proveedor opera siempre desde un centro.'
              : 'Un proveedor define a qué ciudades llega la red desde un centro y cuánto cuesta cada entrega.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {proveedores.map((p) => (
            <FulfillmentProviderCard
              key={p.id}
              proveedor={p}
              onEditar={setEditando}
              onAlternarActivo={alternarActivo}
              onEliminar={eliminar}
            />
          ))}
        </div>
      )}

      {/* Mismo formulario para alta y edición: dos pantallas parecidas para
          lo mismo obligan a aprenderlo dos veces, y la edición termina
          alcanzando menos campos que el alta. */}
      {(wizardAbierto || editando) && (
        <ProveedorLogisticoWizard
          centros={centros}
          proveedorExistente={editando}
          onCerrar={() => { setWizardAbierto(false); setEditando(null); }}
          onListo={() => { setWizardAbierto(false); setEditando(null); cargar(); }}
        />
      )}
    </div>
  );
}
