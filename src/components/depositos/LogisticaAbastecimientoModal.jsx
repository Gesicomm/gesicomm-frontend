import React, { useState, useEffect } from 'react';
import { X, Package, Truck, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { actualizarLogisticaAbastecimiento } from '../../services/courierApi';
import DepositoSelector from './DepositoSelector';
import { depositoService } from '../../services/deposito.service';

export default function LogisticaAbastecimientoModal({ envio, open, onClose, onPagar }) {
  const [tipoLogistica, setTipoLogistica] = useState(null); // 'GESICOMM' | 'PROPIA'
  const [depositoSeleccionado, setDepositoSeleccionado] = useState(null);
  const [guardandoLogistica, setGuardandoLogistica] = useState(false);
  const [logisticaConfirmada, setLogisticaConfirmada] = useState(false);
  const [errorBackend, setErrorBackend] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const esPendientePago = envio?.abastecimiento_estado === 'pendiente_pago';

  useEffect(() => {
    if (open && envio) {
      // Cargar estado inicial si ya existe logística guardada
      if (envio.tipo_logistica_abastecimiento) {
        setTipoLogistica(envio.tipo_logistica_abastecimiento);
        setLogisticaConfirmada(true);
        if (envio.tipo_logistica_abastecimiento === 'PROPIA' && envio.deposito_id) {
          // Obtener datos del depósito si es propia
          depositoService.obtenerDeposito(envio.deposito_id)
            .then(dep => setDepositoSeleccionado(dep))
            .catch(err => console.error("No se pudo cargar el depósito inicial", err))
            .finally(() => setInitialLoading(false));
        } else {
          setInitialLoading(false);
        }
      } else {
        setInitialLoading(false);
      }
    } else {
      // Resetear estado al cerrar
      setTipoLogistica(null);
      setDepositoSeleccionado(null);
      setLogisticaConfirmada(false);
      setErrorBackend(null);
      setInitialLoading(true);
    }
  }, [open, envio]);

  if (!open || !envio) return null;

  const handleGuardarLogistica = async () => {
    setErrorBackend(null);
    setGuardandoLogistica(true);
    
    const payload = {
      tipoLogistica
    };
    
    if (tipoLogistica === 'PROPIA') {
      if (!depositoSeleccionado) {
        setGuardandoLogistica(false);
        return; // Validación extra
      }
      payload.depositoId = depositoSeleccionado.id;
    }

    try {
      await actualizarLogisticaAbastecimiento(envio.id, payload);
      setLogisticaConfirmada(true);
      // Tras confirmar la logística con éxito, pasamos al flujo de pago real
      onPagar();
    } catch (err) {
      console.error('Error actualizando logística:', err);
      const errorMsg = err.response?.data?.error || 'Error al guardar la logística de abastecimiento';
      setErrorBackend(errorMsg);
      
      // Si el depósito ya no existe o es inactivo, limpiar selección
      if (errorMsg.includes('no existe') || errorMsg.includes('inactivo')) {
        setDepositoSeleccionado(null);
        setLogisticaConfirmada(false);
      }
      
      // Si el pedido ya no está pendiente_pago, cerramos y avisamos para que recargue
      if (errorMsg.includes('pendiente de pago')) {
        alert(errorMsg);
        onClose();
      }
    } finally {
      setGuardandoLogistica(false);
    }
  };

  const handleCambiar = () => {
    setLogisticaConfirmada(false);
    setErrorBackend(null);
  };

  const isFormValid = tipoLogistica === 'GESICOMM' || (tipoLogistica === 'PROPIA' && depositoSeleccionado);

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl rounded-xl bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="m-0 text-lg font-semibold text-fg">Logística de Abastecimiento</h2>
            <p className="m-0 mt-0.5 text-sm text-fg-muted">Pedido #{envio.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 bg-surface-50">
          {initialLoading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="loader" />
            </div>
          ) : !esPendientePago || (logisticaConfirmada && esPendientePago) ? (
            // ================= RESUMEN / MODO LECTURA =================
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-success" />
                  <h3 className="m-0 font-medium text-fg">Logística definida</h3>
                </div>
                {esPendientePago && (
                  <button
                    type="button"
                    onClick={handleCambiar}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Cambiar modalidad
                  </button>
                )}
              </div>
              
              <div className="rounded-md bg-surface-2 p-4">
                {tipoLogistica === 'GESICOMM' ? (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-primary"><Package size={20} /></div>
                    <div>
                      <p className="m-0 font-medium text-fg text-sm">Gesicomm se encargará de la preparación y despacho</p>
                      <p className="m-0 text-[13px] text-fg-muted mt-0.5">El producto saldrá directo desde nuestros centros logísticos.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-primary"><Truck size={20} /></div>
                    <div>
                      <p className="m-0 font-medium text-fg text-sm">Gestionás tus propios envíos</p>
                      
                      <div className="mt-3 rounded border border-border bg-surface p-3">
                        <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle mb-1">Destino</p>
                        {depositoSeleccionado ? (
                          <>
                            <p className="m-0 text-sm font-medium text-fg">{depositoSeleccionado.nombre}</p>
                            <p className="m-0 text-[13px] text-fg-muted flex items-center gap-1 mt-0.5">
                              {depositoSeleccionado.ciudad}{depositoSeleccionado.departamento ? ` · ${depositoSeleccionado.departamento}` : ''}
                            </p>
                            <p className="m-0 text-[13px] text-fg-subtle mt-0.5">{depositoSeleccionado.direccion}</p>
                          </>
                        ) : (
                          <span className="text-[13px] text-fg-muted">Depósito guardado (ID {envio.deposito_id})</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // ================= SELECCIÓN / EDICIÓN =================
            <div className="space-y-5">
              <p className="m-0 text-sm text-fg-muted">
                Elegí quién se encarga de la preparación y despacho de este pedido.
              </p>
              
              {errorBackend && (
                <div className="flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p className="m-0">{errorBackend}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  onClick={() => {
                    setTipoLogistica('GESICOMM');
                    setErrorBackend(null);
                  }}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                    tipoLogistica === 'GESICOMM'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      tipoLogistica === 'GESICOMM' ? 'border-primary bg-primary' : 'border-fg-muted'
                    }`}>
                      {tipoLogistica === 'GESICOMM' && <Check size={10} className="text-white" />}
                    </div>
                    <h3 className={`m-0 text-[15px] font-semibold ${tipoLogistica === 'GESICOMM' ? 'text-primary' : 'text-fg'}`}>
                      Despacha Gesicomm
                    </h3>
                  </div>
                  <p className="m-0 pl-7 text-[13px] text-fg-muted">
                    Nos encargamos de toda la logística.
                  </p>
                </div>

                <div
                  onClick={() => {
                    setTipoLogistica('PROPIA');
                    setErrorBackend(null);
                  }}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                    tipoLogistica === 'PROPIA'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      tipoLogistica === 'PROPIA' ? 'border-primary bg-primary' : 'border-fg-muted'
                    }`}>
                      {tipoLogistica === 'PROPIA' && <Check size={10} className="text-white" />}
                    </div>
                    <h3 className={`m-0 text-[15px] font-semibold ${tipoLogistica === 'PROPIA' ? 'text-primary' : 'text-fg'}`}>
                      Logística propia
                    </h3>
                  </div>
                  <p className="m-0 pl-7 text-[13px] text-fg-muted">
                    Recibís el producto en tu depósito.
                  </p>
                </div>
              </div>

              {tipoLogistica === 'PROPIA' && (
                <div className="animate-in fade-in slide-in-from-top-4 mt-6">
                  <h3 className="m-0 mb-3 text-sm font-semibold text-fg">Seleccioná el depósito de destino</h3>
                  <DepositoSelector
                    depositoSeleccionadoId={depositoSeleccionado?.id}
                    onSelect={(dep) => {
                      setDepositoSeleccionado(dep);
                      setErrorBackend(null);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* ================= FOOTER / BOTONERA ================= */}
        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border bg-surface px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={guardandoLogistica}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {esPendientePago && !logisticaConfirmada ? 'Cancelar' : 'Cerrar'}
          </button>
          
          {esPendientePago && !logisticaConfirmada && (
            <button
              type="button"
              disabled={!isFormValid || guardandoLogistica}
              onClick={handleGuardarLogistica}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {guardandoLogistica && <span className="loader loader-sm border-white" />}
              Guardar y Continuar al Pago
            </button>
          )}
          
          {esPendientePago && logisticaConfirmada && (
            <button
              type="button"
              onClick={onPagar}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Ir a pagar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
