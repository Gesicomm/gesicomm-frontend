import React, { useState, useEffect } from 'react';
import {
  Truck,
  Building2,
  Check,
  AlertCircle,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { tiendaService } from '../../services/tiendaService';
import FulfillmentCoverageViewer from '../fulfillment/FulfillmentCoverageViewer';

function formatGs(valor) {
  const n = Math.max(0, Math.round(Number(valor) || 0));
  return `Gs. ${n.toLocaleString('es-PY')}`;
}

/**
 * Cómo entrega el comercio lo que vende.
 *
 * No confundir con la logística de abastecimiento (dónde recibe el stock que
 * compra): son decisiones distintas y se configuran por separado. Acá sólo
 * se decide qué pasa cuando hay una venta.
 */
export default function FulfillmentCard({ onCambio, onConfiguracion }) {
  const [config, setConfig] = useState(null);
  const [modalidad, setModalidad] = useState('PROPIA');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const [verCobertura, setVerCobertura] = useState(false);
  useEffect(() => { onConfiguracion?.(config); }, [config, onConfiguracion]);

  const cargar = () => {
    setCargando(true);
    tiendaService.obtenerFulfillment()
      .then((data) => {
        setConfig(data);
        setModalidad(data.modalidad);
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.message || 'No se pudo cargar la configuración de entregas.'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  if (cargando) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-fg-muted">
        Cargando configuración de entregas...
      </div>
    );
  }
  if (!config) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-danger">{error}</div>
    );
  }

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      const data = await tiendaService.guardarFulfillment(modalidad, null);
      setConfig(data);
      setOk(true);
      onCambio?.();
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  const hayCambios = modalidad !== config.modalidad;

  const Opcion = ({ valor, icono: Icono, titulo, bajada, children, deshabilitada, motivo }) => {
    const activa = modalidad === valor;
    return (
      <button
        type="button"
        aria-pressed={activa}
        aria-disabled={deshabilitada || undefined}
        onClick={() => {
          if (deshabilitada) {
            toast.error(motivo || 'Opción no disponible');
            return;
          }
          setModalidad(valor);
        }}
        className={`flex-1 rounded-lg border p-4 text-left transition-colors ${
          deshabilitada ? 'cursor-not-allowed opacity-60' : ''
        } ${
          activa ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${activa ? 'border-primary bg-primary' : 'border-fg-muted'}`}>
            {activa && <Check size={10} className="text-fg" />}
          </span>
          <Icono size={16} className={activa ? 'text-primary-text' : 'text-fg-muted'} />
          <h4 className={`m-0 text-[15px] font-semibold ${activa ? 'text-primary-text' : 'text-fg'}`}>{titulo}</h4>
        </div>
        {bajada && <p className="m-0 pl-6 text-[13px] text-fg-muted">{bajada}</p>}
        {children && <div className="mt-2 pl-6 text-[13px] text-fg-muted">{children}</div>}
        {deshabilitada && motivo && (
          <p className="m-0 mt-2 pl-6 text-[12px] text-warning">{motivo}</p>
        )}
      </button>
    );
  };

  return (
    <div className="fulfillment-config">
      <div className="mb-4">
        <h3 className="m-0 text-base font-semibold text-fg">Quién entrega cuando vendés</h3>
        <p className="m-0 mt-1 text-sm text-fg-muted">
          Elegí quién se encarga de entregar tus pedidos.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Opcion
          valor="PROPIA"
          icono={Building2}
          titulo="Mis propios envíos"
          bajada="Despachás desde tus depósitos y usás tus couriers asignados."
          deshabilitada={!config.propia.disponible}
          motivo="Necesitás tener al menos un depósito activo."
        >
          <span className="mt-1 block">
            Si vendés mercadería de RAHA, primero tenés que abastecer tu depósito con ese stock.
          </span>
        </Opcion>

        <Opcion
          valor="GESICOMM"
          icono={Truck}
          titulo="Gesicom-RAHA gestiona la entrega"
          bajada="Gesicom prepara y despacha con su red logística."
          deshabilitada={!config.gesicomm.disponible}
          motivo="Gesicomm todavía no tiene cobertura configurada."
        >
          {config.gesicomm.costo_desde !== null && (
            <span className="mt-1 block font-medium text-fg">
              Desde {formatGs(config.gesicomm.costo_desde)} por entrega
            </span>
          )}
          <span className="mt-1 block">El costo depende de la ciudad del destinatario.</span>
          <span className="mt-1 block">
            Si vendés productos propios, primero tenés que enviar ese stock al depósito de RAHA: desde ahí despachan todo.
          </span>
        </Opcion>
      </div>

      {/* El enlace a la cobertura va fuera de la tarjeta de opción: esa tarjeta
          ya es un <button>, y anidar botones rompe el HTML y la navegación por
          teclado. */}
      {modalidad === 'GESICOMM' && (
        <button
          type="button"
          onClick={() => setVerCobertura(true)}
          className="mt-3 flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm font-medium text-primary-text hover:underline"
        >
          <Eye size={14} /> Ver cobertura y precios
        </button>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="m-0">{error}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-3">
        {ok && (
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-success">
            <CheckCircle2 size={14} /> Guardado
          </span>
        )}
        <button
          type="button"
          disabled={!hayCambios || guardando}
          onClick={guardar}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
        >
          Guardar
        </button>
      </div>

      <FulfillmentCoverageViewer open={verCobertura} onClose={() => setVerCobertura(false)} />
    </div>
  );
}
