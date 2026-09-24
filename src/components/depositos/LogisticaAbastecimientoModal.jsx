import React, { useState, useEffect } from 'react';
import { X, Package, Truck, CheckCircle2, AlertCircle, Check, Loader } from 'lucide-react';
import { actualizarLogisticaAbastecimiento, cotizarLogisticaAbastecimiento } from '../../services/courierApi';
import DepositoSelector from './DepositoSelector';
import { depositoService } from '../../services/deposito.service';

function formatGs(n) {
  return Number(n || 0).toLocaleString('es-PY');
}

export default function LogisticaAbastecimientoModal({ envio, open, onClose, onPagar }) {
  const [tipoLogistica, setTipoLogistica] = useState(null); // 'GESICOMM' | 'PROPIA'
  const [depositoSeleccionado, setDepositoSeleccionado] = useState(null);
  
  const [cotizacion, setCotizacion] = useState(null);
  const [cotizando, setCotizando] = useState(false);

  const [guardandoLogistica, setGuardandoLogistica] = useState(false);
  const [logisticaConfirmada, setLogisticaConfirmada] = useState(false);
  const [errorBackend, setErrorBackend] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const esPendientePago = envio?.abastecimiento_estado === 'pendiente_pago';

  useEffect(() => {
    if (open && envio) {
      if (envio.tipo_logistica_abastecimiento) {
        setTipoLogistica(envio.tipo_logistica_abastecimiento);
        setLogisticaConfirmada(true);
        if (envio.tipo_logistica_abastecimiento === 'PROPIA' && envio.deposito_id) {
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
      setTipoLogistica(null);
      setDepositoSeleccionado(null);
      setLogisticaConfirmada(false);
      setErrorBackend(null);
      setInitialLoading(true);
      setCotizacion(null);
    }
  }, [open, envio]);

  useEffect(() => {
    if (!open || !envio || logisticaConfirmada) return;
    
    // Cotizar
    if (tipoLogistica === 'PROPIA' && depositoSeleccionado) {
      setCotizando(true);
      setErrorBackend(null);
      setCotizacion(null);
      cotizarLogisticaAbastecimiento(envio.id, { tipoLogistica: 'PROPIA', depositoId: depositoSeleccionado.id })
        .then(res => {
          if (!res.cubierto) {
            setErrorBackend(res.mensaje || 'Sin cobertura');
            setCotizacion({ cubierto: false });
          } else {
            setCotizacion(res);
          }
        })
        .catch(() => setErrorBackend('No se pudo cotizar el traslado a este depósito.'))
        .finally(() => setCotizando(false));
    } else if (tipoLogistica === 'GESICOMM') {
      setCotizacion({ cubierto: true, costo: 0, proveedor: 'Red Gesicomm', tiempo: null });
      setErrorBackend(null);
    } else {
      setCotizacion(null);
    }
  }, [open, envio, tipoLogistica, depositoSeleccionado, logisticaConfirmada]);

  if (!open || !envio) return null;

  const handleGuardarLogistica = async () => {
    setErrorBackend(null);
    
    if (cotizacion && !cotizacion.cubierto) {
      setErrorBackend('No hay cobertura para el destino seleccionado.');
      return;
    }

    setGuardandoLogistica(true);
    
    const payload = {
      tipoLogistica,
      tipo_logistica: tipoLogistica,
      tipo_logistica_abastecimiento: tipoLogistica,
      costo_logistica_abastecimiento: cotizacion?.costo || 0 // Save shipping cost for the merchant to pay!
    };
    
    if (tipoLogistica === 'PROPIA') {
      if (!depositoSeleccionado) {
        setGuardandoLogistica(false);
        return;
      }
      payload.depositoId = depositoSeleccionado.id;
      payload.deposito_id = depositoSeleccionado.id;
      payload.abastecimiento_deposito_id = depositoSeleccionado.id;
    }

    try {
      await actualizarLogisticaAbastecimiento(envio.id, payload);
      setLogisticaConfirmada(true);
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
                          <span className="text-[13px] text-fg-muted">
                            {envio.deposito_id ? `Cargando detalles (ID ${envio.deposito_id})...` : 'Depósito propio (Destino guardado)'}
                          </span>
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
                      Despacha Gesicom
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
                  
                  {cotizando && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-fg-muted bg-surface-2 p-3 rounded-md">
                      <Loader size={16} className="animate-spin text-primary" />
                      Calculando costo de envío...
                    </div>
                  )}

                  {!cotizando && cotizacion && cotizacion.cubierto && (
                    <div className="mt-4 bg-surface-50 border border-border p-4 rounded-md">
                      <p className="m-0 text-sm font-semibold text-fg mb-3">Resumen del traslado</p>
                      <div className="flex justify-between items-center text-[13px] text-fg-muted mb-2">
                        <span>Proveedor</span>
                        <span className="font-medium text-fg">{cotizacion.proveedor}</span>
                      </div>
                      <div className="flex justify-between items-center text-[13px] text-fg-muted mb-2">
                        <span>Tiempo estimado</span>
                        <span className="font-medium text-fg">{cotizacion.tiempo}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-medium mt-3 pt-3 border-t border-border">
                        <span className="text-fg-muted">Costo de traslado</span>
                        <span className="text-primary font-bold">Gs. {formatGs(cotizacion.costo)}</span>
                      </div>
                    </div>
                  )}
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
              disabled={!isFormValid || guardandoLogistica || cotizando || (cotizacion && !cotizacion.cubierto)}
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
