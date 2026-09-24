import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, Truck, Building2, Check, AlertCircle, Loader } from 'lucide-react';
import { solicitudAbastecimientoService } from '../../services/solicitudAbastecimiento.service';
import DepositoSelector from '../depositos/DepositoSelector';

function formatGs(n) {
  return Number(n || 0).toLocaleString('es-PY');
}

/**
 * Camino 3: pedirle a Gesicomm que traiga stock de un producto de su
 * catalogo hacia el deposito propio del comercio o hacia un Centro de
 * Fulfillment de Gesicomm, antes de que exista ninguna venta.
 */
export default function AbastecerseModal({ producto, open, onClose }) {
  const navigate = useNavigate();
  const [cantidad, setCantidad] = useState(1);
  const [tipoLogistica, setTipoLogistica] = useState(null); // 'GESICOMM' | 'PROPIA'
  const [depositoSeleccionado, setDepositoSeleccionado] = useState(null);
  const [cotizacion, setCotizacion] = useState(null);
  const [cotizando, setCotizando] = useState(false);
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (!open) {
      setCantidad(1);
      setTipoLogistica(null);
      setDepositoSeleccionado(null);
      setCotizacion(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !tipoLogistica) { setCotizacion(null); return; }
    if (tipoLogistica === 'PROPIA' && !depositoSeleccionado) { setCotizacion(null); return; }

    let activo = true;
    setCotizando(true);
    setError(null);
    solicitudAbastecimientoService.cotizar({
      producto_id: producto.id,
      cantidad,
      tipoLogistica,
      depositoId: tipoLogistica === 'PROPIA' ? depositoSeleccionado?.id : undefined,
    })
      .then((res) => {
        if (!activo) return;
        if (!res.cubierto) {
          setError(res.mensaje || 'Sin cobertura para este destino.');
          setCotizacion(null);
        } else {
          setCotizacion(res);
        }
      })
      .catch(() => { if (activo) setError('No se pudo cotizar.'); })
      .finally(() => { if (activo) setCotizando(false); });

    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipoLogistica, depositoSeleccionado, cantidad, producto?.id]);

  if (!open || !producto) return null;

  const handleConfirmar = async () => {
    if (!tipoLogistica || !cotizacion?.cubierto) return;
    setCreando(true);
    try {
      const solicitud = await solicitudAbastecimientoService.crear({
        producto_id: producto.id,
        cantidad,
        tipoLogistica,
        depositoId: tipoLogistica === 'PROPIA' ? depositoSeleccionado?.id : undefined,
      });
      toast.success('Solicitud de abastecimiento creada.');
      onClose();
      navigate(`/mis-abastecimientos/${solicitud.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo crear la solicitud.');
    } finally {
      setCreando(false);
    }
  };

  const isFormValid = tipoLogistica === 'GESICOMM' || (tipoLogistica === 'PROPIA' && depositoSeleccionado);

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="m-0 text-lg font-semibold text-fg">Abastecerme</h2>
            <p className="m-0 mt-0.5 text-sm text-fg-muted">{producto.nombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 bg-surface-50 space-y-5">
          <div>
            <label className="block mb-2 text-sm font-semibold text-fg">Cantidad</label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-32 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-fg">¿A dónde querés que llegue?</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                onClick={() => setTipoLogistica('GESICOMM')}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                  tipoLogistica === 'GESICOMM' ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${tipoLogistica === 'GESICOMM' ? 'border-primary bg-primary' : 'border-fg-muted'}`}>
                    {tipoLogistica === 'GESICOMM' && <Check size={10} className="text-white" />}
                  </div>
                  <Truck size={16} className={tipoLogistica === 'GESICOMM' ? 'text-primary' : 'text-fg-muted'} />
                  <h3 className={`m-0 text-[15px] font-semibold ${tipoLogistica === 'GESICOMM' ? 'text-primary' : 'text-fg'}`}>Centro Gesicomm</h3>
                </div>
                <p className="m-0 pl-7 text-[13px] text-fg-muted">Queda listo para que Gesicomm lo prepare cuando lo vendas.</p>
              </div>

              <div
                onClick={() => setTipoLogistica('PROPIA')}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                  tipoLogistica === 'PROPIA' ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${tipoLogistica === 'PROPIA' ? 'border-primary bg-primary' : 'border-fg-muted'}`}>
                    {tipoLogistica === 'PROPIA' && <Check size={10} className="text-white" />}
                  </div>
                  <Building2 size={16} className={tipoLogistica === 'PROPIA' ? 'text-primary' : 'text-fg-muted'} />
                  <h3 className={`m-0 text-[15px] font-semibold ${tipoLogistica === 'PROPIA' ? 'text-primary' : 'text-fg'}`}>Mi depósito</h3>
                </div>
                <p className="m-0 pl-7 text-[13px] text-fg-muted">Viaja hasta tu propio depósito para que lo gestiones vos.</p>
              </div>
            </div>
          </div>

          {tipoLogistica === 'PROPIA' && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-fg">Depósito de destino</label>
              <DepositoSelector
                depositoSeleccionadoId={depositoSeleccionado?.id}
                onSelect={setDepositoSeleccionado}
              />
            </div>
          )}

          {cotizando && (
            <div className="flex items-center gap-2 text-sm text-fg-muted bg-surface-2 p-3 rounded-md">
              <Loader size={16} className="animate-spin text-primary" />
              Calculando costo...
            </div>
          )}

          {error && !cotizando && (
            <div className="flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p className="m-0">{error}</p>
            </div>
          )}

          {!cotizando && cotizacion?.cubierto && (
            <div className="bg-surface border border-border p-4 rounded-md">
              <p className="m-0 text-sm font-semibold text-fg mb-3">Resumen</p>
              <div className="flex justify-between items-center text-[13px] text-fg-muted mb-2">
                <span>Costo del producto ({cantidad} u.)</span>
                <span className="font-medium text-fg">Gs. {formatGs(cotizacion.costoProducto)}</span>
              </div>
              <div className="flex justify-between items-center text-[13px] text-fg-muted mb-2">
                <span>Costo logístico</span>
                <span className="font-medium text-fg">Gs. {formatGs(cotizacion.costoLogistico)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium mt-3 pt-3 border-t border-border">
                <span className="text-fg-muted">Total a pagar</span>
                <span className="text-primary font-bold">Gs. {formatGs(cotizacion.total)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border bg-surface px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={creando}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isFormValid || !cotizacion?.cubierto || cotizando || creando}
            onClick={handleConfirmar}
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {creando && <span className="loader loader-sm border-white" />}
            Confirmar y continuar al pago
          </button>
        </div>
      </div>
    </div>
  );
}
