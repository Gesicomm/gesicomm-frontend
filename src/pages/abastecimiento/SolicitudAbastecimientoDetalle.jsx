import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Package, Warehouse, ArrowLeft, Truck, CheckCircle2, AlertTriangle,
  Clock, RefreshCw, Upload, FileText, Landmark, Copy,
} from 'lucide-react';
import { solicitudAbastecimientoService } from '../../services/solicitudAbastecimiento.service';
import useSesion from '../../hooks/useSesion';

const CTA_AVANZAR = {
  pago_validado: 'Contactar proveedor',
  proveedor_contactado: 'Marcar enviado por proveedor',
  enviado_por_proveedor: 'Marcar en tránsito a Gesicom',
  en_transito_a_gesicomm: 'Marcar recibido en Gesicomm',
  preparando_envio_a_deposito_cliente: 'Marcar despachado',
  despachado_a_deposito_cliente: 'Marcar en tránsito',
};

const ESTADO_BADGE = {
  pendiente_pago: 'bg-warning/10 text-warning-text border-warning/20',
  pago_enviado: 'bg-info/10 text-info-text border-info/20',
  pago_rechazado: 'bg-danger/10 text-danger-text border-danger/20',
  disponible_en_gesicomm: 'bg-success/10 text-success-text border-success/20',
  recibido_en_deposito_cliente: 'bg-success/10 text-success-text border-success/20',
};

function EstadoBadge({ estado }) {
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${ESTADO_BADGE[estado] || 'bg-primary/10 text-primary-text border-primary/20'}`}>
      {(estado || '').replace(/_/g, ' ')}
    </span>
  );
}

function formatGs(n) {
  return Math.round(Number(n) || 0).toLocaleString('es-PY');
}

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TransferenciaDato({ label, value, highlight = false, onCopy }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-2 min-w-0">
        <p className={`m-0 text-sm font-medium truncate ${highlight ? 'text-primary' : 'text-fg'}`}>{value}</p>
        {onCopy && (
          <button
            type="button"
            onClick={() => onCopy(value)}
            className="shrink-0 p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-2"
            title={`Copiar ${label.toLowerCase()}`}
            aria-label={`Copiar ${label.toLowerCase()}`}
          >
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function SolicitudAbastecimientoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === 'administrador';

  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [centroInput, setCentroInput] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await solicitudAbastecimientoService.obtener(id);
      setSolicitud(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cargar la solicitud.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const volverA = esAdmin ? '/abastecimiento' : '/mis-abastecimientos';

  const ejecutar = async (accion, mensajeOk) => {
    setProcesando(true);
    try {
      await accion();
      toast.success(mensajeOk);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar la acción.');
    } finally {
      setProcesando(false);
    }
  };

  const handleSubirComprobante = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    ejecutar(() => solicitudAbastecimientoService.subirComprobante(id, file), 'Comprobante enviado.');
  };

  const handleValidar = () => ejecutar(() => solicitudAbastecimientoService.validarPago(id), 'Pago validado.');

  const handleRechazar = () => {
    const motivo = window.prompt('Motivo del rechazo (lo ve el comercio):', '');
    if (!motivo) return;
    ejecutar(() => solicitudAbastecimientoService.rechazarPago(id, motivo), 'Pago rechazado.');
  };

  const handleAvanzar = () => ejecutar(() => solicitudAbastecimientoService.avanzar(id), 'Avanzado.');

  const handleMarcarDisponibleGesicomm = () => {
    const centroId = parseInt(centroInput, 10);
    if (!centroId) { toast.error('Indicá el ID del Centro Gesicomm.'); return; }
    ejecutar(() => solicitudAbastecimientoService.avanzar(id, centroId), 'Stock acreditado en el centro.');
  };

  const handleConfirmarRecepcion = () => ejecutar(() => solicitudAbastecimientoService.confirmarRecepcion(id), 'Recepción confirmada, stock acreditado.');

  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(String(texto || ''));
      toast.success('Copiado.');
    } catch {
      toast.error('No se pudo copiar.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-fg-muted">
        <RefreshCw className="animate-spin mr-2" size={20} /> Cargando...
      </div>
    );
  }
  if (!solicitud) return null;

  const total = (Number(solicitud.costo_producto) || 0) + (Number(solicitud.costo_logistico) || 0);
  const esTerminal = ['disponible_en_gesicomm', 'recibido_en_deposito_cliente', 'cancelada'].includes(solicitud.estado);
  const transferencia = solicitud.datos_transferencia || {};
  const tieneDatosBancarios = Boolean(
    transferencia.banco || transferencia.titular || transferencia.numero_cuenta || transferencia.alias_valor
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 overflow-hidden">
      <div className="px-6 py-5 bg-surface border-b border-surface-border">
        <button
          onClick={() => navigate(volverA)}
          className="flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg mb-3"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-fg mb-1">Solicitud de abastecimiento #{solicitud.id}</h1>
            <p className="text-sm text-fg-muted flex items-center gap-1.5">
              <Package size={14} /> {solicitud.producto?.nombre} · {solicitud.cantidad} u.
              {esAdmin && solicitud.Usuario && <span className="ml-2 text-fg-subtle">· Comercio: {solicitud.Usuario.nombre}</span>}
            </p>
          </div>
          <EstadoBadge estado={solicitud.estado} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-3xl mx-auto w-full space-y-6">
        <div className="bg-surface border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            {solicitud.tipo_logistica === 'GESICOMM' ? <Truck size={16} className="text-primary" /> : <Warehouse size={16} className="text-primary" />}
            <p className="m-0 text-sm font-medium text-fg">
              {solicitud.tipo_logistica === 'GESICOMM'
                ? `Destino: Centro Gesicomm${solicitud.centroGesicomm ? ` (${solicitud.centroGesicomm.nombre})` : ''}`
                : `Destino: ${solicitud.depositoDestino?.nombre || 'Depósito propio'}`}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-surface-border">
            <div>
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Producto</p>
              <p className="text-sm font-medium text-fg">Gs. {formatGs(solicitud.costo_producto)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Logística</p>
              <p className="text-sm font-medium text-fg">Gs. {formatGs(solicitud.costo_logistico)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Total</p>
              <p className="text-sm font-bold text-primary">Gs. {formatGs(total)}</p>
            </div>
          </div>
        </div>

        {(solicitud.depositoDestino?.persona_contacto || solicitud.depositoDestino?.telefono_contacto || solicitud.depositoDestino?.direccion || (esAdmin && solicitud.Usuario?.correo_electronico)) && (
          <div className="bg-surface border border-surface-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {esAdmin && solicitud.Usuario && (
              <div>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Comercio</p>
                <p className="text-sm text-fg">{solicitud.Usuario.nombre}</p>
                {solicitud.Usuario.correo_electronico && <p className="text-xs text-fg-muted">{solicitud.Usuario.correo_electronico}</p>}
              </div>
            )}
            {solicitud.tipo_logistica === 'PROPIA' && (solicitud.depositoDestino?.persona_contacto || solicitud.depositoDestino?.telefono_contacto || solicitud.depositoDestino?.direccion) && (
              <div>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Contacto en {solicitud.depositoDestino?.nombre}</p>
                {solicitud.depositoDestino?.persona_contacto && <p className="text-sm text-fg">{solicitud.depositoDestino.persona_contacto}</p>}
                {solicitud.depositoDestino?.telefono_contacto && (
                  <a href={`tel:${solicitud.depositoDestino.telefono_contacto.replace(/\D/g, '')}`} className="text-xs text-primary hover:underline block">{solicitud.depositoDestino.telefono_contacto}</a>
                )}
                {solicitud.depositoDestino?.direccion && <p className="text-xs text-fg-muted">{solicitud.depositoDestino.direccion}</p>}
              </div>
            )}
          </div>
        )}

        <div className="bg-surface border border-surface-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-fg mb-3">Próximo paso</h2>

          {!esAdmin && ['pendiente_pago', 'pago_rechazado'].includes(solicitud.estado) && (
            <div className="flex items-start gap-3 bg-warning/5 border border-warning/20 rounded-lg p-4">
              <Upload size={20} className="text-warning-text mt-0.5 shrink-0" />
              <div className="flex-1">
                {solicitud.estado === 'pago_rechazado' && solicitud.rechazo_motivo && (
                  <p className="text-sm text-danger-text mb-2"><strong>Rechazado:</strong> {solicitud.rechazo_motivo}</p>
                )}
                <p className="text-sm text-fg mb-3">Transferí Gs. {formatGs(transferencia.monto || total)} y subí el comprobante.</p>
                <div className="rounded-lg border border-surface-border bg-surface p-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Landmark size={16} className="text-primary" />
                    <p className="m-0 text-sm font-semibold text-fg">Datos para la transferencia</p>
                  </div>
                  {tieneDatosBancarios ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TransferenciaDato label="Banco" value={transferencia.banco} />
                      <TransferenciaDato label="Titular" value={transferencia.titular} />
                      <TransferenciaDato label="CI / RUC" value={transferencia.ci_ruc} onCopy={copiar} />
                      <TransferenciaDato label="Cuenta" value={transferencia.numero_cuenta} onCopy={copiar} />
                      <TransferenciaDato
                        label={transferencia.alias_tipo ? `Alias ${transferencia.alias_tipo}` : 'Alias'}
                        value={transferencia.alias_valor}
                        onCopy={copiar}
                      />
                      <TransferenciaDato label="Monto" value={`Gs. ${formatGs(transferencia.monto || total)}`} highlight />
                    </div>
                  ) : (
                    <p className="text-sm text-warning-text m-0">Gesicomm todavía no configuró los datos bancarios para abastecimiento.</p>
                  )}
                  <div className="mt-4 pt-3 border-t border-surface-border">
                    <TransferenciaDato
                      label="Descripción / referencia a enviar"
                      value={transferencia.descripcion || transferencia.referencia}
                      highlight
                      onCopy={copiar}
                    />
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-fg rounded-lg font-medium text-sm hover:bg-primary/90 cursor-pointer disabled:opacity-50">
                  {procesando ? 'Subiendo...' : 'Subir comprobante'}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleSubirComprobante} disabled={procesando} />
                </label>
              </div>
            </div>
          )}

          {!esAdmin && solicitud.estado === 'pago_enviado' && (
            <div className="flex items-start gap-3 bg-info/5 border border-info/20 rounded-lg p-4">
              <Clock size={20} className="text-info-text mt-0.5 shrink-0" />
              <p className="text-sm text-fg">Comprobante enviado. Esperando validación del admin.</p>
            </div>
          )}

          {!esAdmin && !esTerminal && !['pendiente_pago', 'pago_rechazado', 'pago_enviado', 'en_transito_a_deposito_cliente'].includes(solicitud.estado) && (
            <div className="flex items-start gap-3 bg-info/5 border border-info/20 rounded-lg p-4">
              <Clock size={20} className="text-info-text mt-0.5 shrink-0" />
              <p className="text-sm text-fg">Gesicomm está gestionando el traslado de tu mercadería.</p>
            </div>
          )}

          {!esAdmin && solicitud.estado === 'en_transito_a_deposito_cliente' && (
            <div className="flex items-start gap-3 bg-warning/5 border border-warning/20 rounded-lg p-4">
              <Truck size={20} className="text-warning-text mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-fg mb-3">Tu mercadería está en camino. Confirmá cuando la recibas en tu depósito.</p>
                <button
                  onClick={handleConfirmarRecepcion}
                  disabled={procesando}
                  className="px-4 py-2 bg-primary text-primary-fg rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {procesando ? 'Procesando...' : 'Confirmar recepción'}
                </button>
              </div>
            </div>
          )}

          {esAdmin && solicitud.estado === 'pago_enviado' && (
            <div className="flex items-start gap-3 bg-warning/5 border border-warning/20 rounded-lg p-4">
              <AlertTriangle size={20} className="text-warning-text mt-0.5 shrink-0" />
              <div className="flex-1">
                {solicitud.comprobante_url && (
                  <p className="mb-3"><a href={solicitud.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline flex items-center gap-1.5 w-fit"><FileText size={14} /> Ver comprobante</a></p>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={handleValidar} disabled={procesando} className="px-4 py-2 bg-success text-white rounded-lg font-medium text-sm hover:bg-success/90 disabled:opacity-50">Validar pago</button>
                  <button onClick={handleRechazar} disabled={procesando} className="px-4 py-2 bg-danger text-white rounded-lg font-medium text-sm hover:bg-danger/90 disabled:opacity-50">Rechazar</button>
                </div>
              </div>
            </div>
          )}

          {esAdmin && CTA_AVANZAR[solicitud.estado] && solicitud.estado !== 'en_transito_a_gesicomm' && (
            <div className="flex items-start gap-3 bg-info/5 border border-info/20 rounded-lg p-4">
              <Package size={20} className="text-info-text mt-0.5 shrink-0" />
              <div className="flex-1">
                <button onClick={handleAvanzar} disabled={procesando} className="px-4 py-2 bg-primary text-primary-fg rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50">
                  {procesando ? 'Procesando...' : CTA_AVANZAR[solicitud.estado]}
                </button>
              </div>
            </div>
          )}

          {esAdmin && solicitud.estado === 'en_transito_a_gesicomm' && (
            <div className="flex items-start gap-3 bg-info/5 border border-info/20 rounded-lg p-4">
              <Package size={20} className="text-info-text mt-0.5 shrink-0" />
              <button onClick={handleAvanzar} disabled={procesando} className="px-4 py-2 bg-primary text-primary-fg rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50">
                {procesando ? 'Procesando...' : CTA_AVANZAR.en_transito_a_gesicomm}
              </button>
            </div>
          )}

          {esAdmin && solicitud.estado === 'recibido_en_gesicomm' && solicitud.tipo_logistica === 'GESICOMM' && (
            <div className="flex items-start gap-3 bg-success/5 border border-success/20 rounded-lg p-4">
              <CheckCircle2 size={20} className="text-success-text mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-fg mb-3">Llegó a Gesicom. Indicá en qué Centro quedó y acreditá el stock.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="ID del Centro"
                    value={centroInput}
                    onChange={(e) => setCentroInput(e.target.value)}
                    className="w-32 px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface"
                  />
                  <button onClick={handleMarcarDisponibleGesicomm} disabled={procesando} className="px-4 py-2 bg-success text-white rounded-lg font-medium text-sm hover:bg-success/90 disabled:opacity-50">
                    {procesando ? 'Procesando...' : 'Marcar disponible'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {esAdmin && solicitud.estado === 'recibido_en_gesicomm' && solicitud.tipo_logistica === 'PROPIA' && (
            <div className="flex items-start gap-3 bg-info/5 border border-info/20 rounded-lg p-4">
              <Package size={20} className="text-info-text mt-0.5 shrink-0" />
              <button onClick={handleAvanzar} disabled={procesando} className="px-4 py-2 bg-primary text-primary-fg rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50">
                {procesando ? 'Procesando...' : 'Iniciar preparación para envío'}
              </button>
            </div>
          )}

          {solicitud.estado === 'disponible_en_gesicomm' && (
            <div className="flex items-start gap-3 bg-success/5 border border-success/20 rounded-lg p-4">
              <CheckCircle2 size={20} className="text-success-text mt-0.5 shrink-0" />
              <p className="text-sm text-fg">Stock disponible en {solicitud.centroGesicomm?.nombre || 'el centro de Gesicomm'}.</p>
            </div>
          )}
          {solicitud.estado === 'recibido_en_deposito_cliente' && (
            <div className="flex items-start gap-3 bg-success/5 border border-success/20 rounded-lg p-4">
              <CheckCircle2 size={20} className="text-success-text mt-0.5 shrink-0" />
              <p className="text-sm text-fg">Stock acreditado en tu depósito.</p>
            </div>
          )}
        </div>

        {solicitud.historial?.length > 0 && (
          <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-border bg-surface-2">
              <h2 className="text-sm font-semibold text-fg">Historial</h2>
            </div>
            <ul className="divide-y divide-surface-border">
              {solicitud.historial.map((h) => (
                <li key={h.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-fg">{(h.estado || '').replace(/_/g, ' ')}</p>
                    {h.comentario && <p className="text-xs text-fg-muted">{h.comentario}</p>}
                  </div>
                  <span className="text-xs text-fg-subtle whitespace-nowrap">{formatFecha(h.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
