import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Building2, Check, AlertCircle, CheckCircle2, MapPin, Eye, ArrowRight } from 'lucide-react';
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
export default function FulfillmentCard({ onCambio }) {
  const [config, setConfig] = useState(null);
  const [modalidad, setModalidad] = useState('PROPIA');
  const [depositoId, setDepositoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const [verCobertura, setVerCobertura] = useState(false);

  const cargar = () => {
    setCargando(true);
    tiendaService.obtenerFulfillment()
      .then((data) => {
        setConfig(data);
        setModalidad(data.modalidad);
        setDepositoId(data.deposito_fulfillment_id || data.propia.depositos[0]?.id || null);
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
      const data = await tiendaService.guardarFulfillment(modalidad, modalidad === 'PROPIA' ? depositoId : null);
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

  const hayCambios = modalidad !== config.modalidad
    || (modalidad === 'PROPIA' && depositoId !== config.deposito_fulfillment_id);

  const Opcion = ({ valor, icono: Icono, titulo, children, deshabilitada, motivo }) => {
    const activa = modalidad === valor;
    return (
      <button
        type="button"
        disabled={deshabilitada}
        onClick={() => setModalidad(valor)}
        className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          activa ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${activa ? 'border-primary bg-primary' : 'border-fg-muted'}`}>
            {activa && <Check size={10} className="text-white" />}
          </span>
          <Icono size={16} className={activa ? 'text-primary' : 'text-fg-muted'} />
          <h4 className={`m-0 text-[15px] font-semibold ${activa ? 'text-primary' : 'text-fg'}`}>{titulo}</h4>
        </div>
        <div className="pl-6 text-[13px] text-fg-muted">{children}</div>
        {deshabilitada && motivo && (
          <p className="m-0 mt-2 pl-6 text-[12px] text-warning">{motivo}</p>
        )}
      </button>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-1 flex items-center gap-2">
        <Truck size={18} className="text-primary" />
        <h3 className="m-0 text-base font-semibold text-fg">¿Cómo querés gestionar las entregas de tus pedidos?</h3>
      </div>
      <p className="m-0 mb-4 text-sm text-fg-muted">
        Esto define quién prepara y entrega cuando vendés. Es independiente de dónde recibís el stock que comprás.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Opcion
          valor="GESICOMM"
          icono={Truck}
          titulo="Gesicomm gestiona mis envíos"
          deshabilitada={!config.gesicomm.disponible}
          motivo="Gesicomm todavía no tiene cobertura configurada."
        >
          Gesicomm prepara y despacha tus pedidos con sus proveedores logísticos.
          {config.gesicomm.costo_desde !== null && (
            <span className="mt-1 block font-medium text-fg">
              Desde {formatGs(config.gesicomm.costo_desde)} por entrega
            </span>
          )}
          <span className="mt-1 block">El costo depende de la ciudad del destinatario.</span>
        </Opcion>

        <Opcion
          valor="PROPIA"
          icono={Building2}
          titulo="Quiero gestionar mis propios envíos"
          deshabilitada={!config.propia.disponible}
          motivo="Necesitás un depósito con al menos un courier habilitado."
        >
          Despachás desde tu depósito con los couriers que habilitaste.
        </Opcion>
      </div>

      {/* El enlace a la cobertura va fuera de la tarjeta de opción: esa tarjeta
          ya es un <button>, y anidar botones rompe el HTML y la navegación por
          teclado. */}
      {modalidad === 'GESICOMM' && (
        <button
          type="button"
          onClick={() => setVerCobertura(true)}
          className="mt-3 flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm font-medium text-primary hover:underline"
        >
          <Eye size={14} /> Ver cobertura y precios
        </button>
      )}

      {modalidad === 'PROPIA' && config.propia.depositos.length === 0 && (
        <p className="mt-3 rounded-md bg-surface-2 px-4 py-3 text-[13px] text-fg-muted">
          Todavía no tenés depósitos.{' '}
          <Link to="/mi-tienda/depositos" className="font-medium text-primary hover:underline">
            Creá uno <ArrowRight size={12} className="inline" />
          </Link>
        </p>
      )}

      {modalidad === 'PROPIA' && config.propia.depositos.length > 0 && (
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-fg">¿Desde qué depósito despachás?</label>
          <div className="flex flex-col gap-2">
            {config.propia.depositos.map((d) => {
              const elegido = depositoId === d.id;
              const sinCouriers = d.couriers_habilitados === 0;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDepositoId(d.id)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    elegido ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${elegido ? 'border-primary bg-primary' : 'border-fg-muted'}`}>
                    {elegido && <Check size={10} className="text-white" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-fg">{d.nombre}</span>
                    <span className={`mt-0.5 flex items-center gap-1 text-[12px] ${sinCouriers ? 'text-warning' : 'text-fg-muted'}`}>
                      <MapPin size={11} />
                      {d.ciudad} ·{' '}
                      {sinCouriers
                        ? 'sin couriers habilitados'
                        : `${d.couriers.map((c) => c.nombre).join(', ')}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="m-0">{error}</p>
        </div>
      )}

      {modalidad === 'PROPIA' && config.propia.depositos.length > 0 && (
        <p className="m-0 mt-3 text-[12px] text-fg-subtle">
          Los couriers y sus tarifas se configuran en Pedidos → Delivery.
        </p>
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
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          Guardar
        </button>
      </div>

      <FulfillmentCoverageViewer open={verCobertura} onClose={() => setVerCobertura(false)} />
    </div>
  );
}
