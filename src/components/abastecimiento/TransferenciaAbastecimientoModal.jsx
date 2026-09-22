import React, { useState, useEffect } from 'react';
import { X, Landmark, UploadCloud, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { obtenerDatosTransferenciaAbastecimiento, subirComprobanteAbastecimiento } from '../../services/courierApi';

const LABELS_ALIAS_TIPO = { CEDULA: 'Cédula', TELEFONO: 'Teléfono', EMAIL: 'Correo' };

function formatGs(valor) {
  const n = Math.max(0, Math.round(Number(valor) || 0));
  return `Gs. ${n.toLocaleString('es-PY')}`;
}

function FilaDato({ label, valor }) {
  const [copiado, setCopiado] = useState(false);
  if (!valor) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <div>
        <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
        <p className="m-0 text-sm font-medium text-fg">{valor}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(String(valor)).then(() => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          });
        }}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
        title="Copiar"
      >
        {copiado ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

/**
 * Reemplaza el redirect a PagoPar: muestra los datos de la cuenta de
 * Gesicomm y exige subir el comprobante de transferencia antes de habilitar
 * el envío. Subir el comprobante ES la acción de "marcar pago enviado" — no
 * hay un paso separado.
 */
export default function TransferenciaAbastecimientoModal({ envio, open, onClose, onEnviado }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const rechazado = envio?.abastecimiento_estado === 'pago_rechazado';

  useEffect(() => {
    if (!open || !envio) return;
    setDatos(null);
    setArchivo(null);
    setError(null);
    setCargando(true);
    obtenerDatosTransferenciaAbastecimiento(envio.id)
      .then(setDatos)
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar los datos de transferencia.'))
      .finally(() => setCargando(false));
  }, [open, envio]);

  if (!open || !envio) return null;

  const handleEnviar = async () => {
    if (!archivo) return;
    setEnviando(true);
    setError(null);
    try {
      const actualizado = await subirComprobanteAbastecimiento(envio.id, archivo);
      onEnviado?.(actualizado);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo subir el comprobante.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="m-0 text-lg font-semibold text-fg">Pagar abastecimiento</h2>
            <p className="m-0 mt-0.5 text-sm text-fg-muted">Pedido #{envio.numero_pedido || envio.id}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {rechazado && (
            <div className="flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p className="m-0">
                <strong>El comprobante anterior fue rechazado.</strong>
                {envio.abastecimiento_pago_rechazo_motivo ? ` ${envio.abastecimiento_pago_rechazo_motivo}` : ''} Subí uno nuevo para reintentar.
              </p>
            </div>
          )}

          {cargando ? (
            <div className="flex h-24 items-center justify-center"><span className="loader" /></div>
          ) : datos ? (
            <>
              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark size={18} className="text-primary" />
                  <h3 className="m-0 text-sm font-semibold text-fg">Datos para transferir</h3>
                </div>
                <FilaDato label="Banco" valor={datos.banco} />
                <FilaDato label="Titular" valor={datos.titular} />
                <FilaDato label="CI / RUC" valor={datos.ci_ruc} />
                <FilaDato label="Número de cuenta" valor={datos.numero_cuenta} />
                <FilaDato label={`Alias (${LABELS_ALIAS_TIPO[datos.alias_tipo] || datos.alias_tipo})`} valor={datos.alias_tipo ? datos.alias_valor : null} />
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Monto a transferir</p>
                <p className="m-0 text-2xl font-bold text-fg">{formatGs(datos.monto)}</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-fg">Comprobante de transferencia (obligatorio)</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border px-4 py-6 text-sm text-fg-muted hover:border-primary/50">
                  <UploadCloud size={18} />
                  {archivo ? archivo.name : 'Elegí una imagen o PDF'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p className="m-0">{error}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-danger">{error || 'No se pudieron cargar los datos.'}</p>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border bg-surface px-6 py-4">
          <button type="button" onClick={onClose} disabled={enviando} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2 disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!archivo || enviando || cargando}
            onClick={handleEnviar}
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {enviando && <span className="loader loader-sm border-white" />}
            Enviar transferencia
          </button>
        </div>
      </div>
    </div>
  );
}
