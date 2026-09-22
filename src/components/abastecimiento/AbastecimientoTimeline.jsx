import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, UploadCloud, CheckCircle2, Phone, PackageCheck, Truck, Warehouse, Package, XCircle,
} from 'lucide-react';
import { obtenerTimelineAbastecimiento } from '../../services/courierApi';

const PASOS_INICIALES = [
  { id: 'pendiente_pago', label: 'Pendiente de pago', icon: Clock },
  { id: 'pago_enviado', label: 'Comprobante enviado', icon: UploadCloud },
  { id: 'pago_validado', label: 'Pago validado', icon: CheckCircle2 },
  { id: 'proveedor_contactado', label: 'Proveedor contactado', icon: Phone },
  { id: 'enviado_por_proveedor', label: 'Enviado por el proveedor', icon: PackageCheck },
];

const PASOS_VIA_GESICOMM = [
  { id: 'en_transito_a_gesicomm', label: 'En tránsito a Gesicomm', icon: Truck },
  { id: 'recibido_en_gesicomm', label: 'Recibido en Gesicomm', icon: Warehouse },
];

const PASOS_PROPIA_DESDE_GESICOMM = [
  { id: 'preparando_envio_a_deposito_cliente', label: 'Preparando envío', icon: Package },
  { id: 'despachado_a_deposito_cliente', label: 'Despachado hacia tu depósito', icon: Truck },
  { id: 'en_transito_a_deposito_cliente', label: 'En tránsito a tu depósito', icon: Truck },
  { id: 'recibido_en_deposito_cliente', label: 'Recibido en tu depósito', icon: CheckCircle2 },
];

const PASOS_DIRECTA = [
  { id: 'en_transito_a_deposito_cliente', label: 'En tránsito a tu depósito', icon: Truck },
  { id: 'recibido_en_deposito_cliente', label: 'Recibido en tu depósito', icon: CheckCircle2 },
];

const PASOS_GESICOMM = [
  { id: 'disponible_en_gesicomm', label: 'Disponible en Gesicomm', icon: CheckCircle2 },
];

function construirPasos(tipoLogistica, rutaAbastecimiento = 'VIA_GESICOMM') {
  if (tipoLogistica === 'PROPIA') {
    if (rutaAbastecimiento === 'DIRECTA') {
      return [...PASOS_INICIALES, ...PASOS_DIRECTA];
    }
    return [...PASOS_INICIALES, ...PASOS_VIA_GESICOMM, ...PASOS_PROPIA_DESDE_GESICOMM];
  }
  if (tipoLogistica === 'GESICOMM') {
    return [...PASOS_INICIALES, ...PASOS_VIA_GESICOMM, ...PASOS_GESICOMM];
  }
  return [...PASOS_INICIALES, ...PASOS_VIA_GESICOMM];
}

function formatFecha(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Stepper horizontal del abastecimiento (mismo espíritu que el tracking de
 * un pedido de e-commerce): recorre TODOS los pasos posibles de la máquina
 * de estados —no solo los que ya ocurrieron— y marca completado / actual /
 * pendiente según en qué estado está el envío hoy. La rama después de
 * "Recibido en Gesicomm" depende de tipo_logistica_abastecimiento.
 *
 * Se usa tanto inline (fila expandida de la tabla de pedidos) como dentro
 * del modal — una sola implementación para las dos vistas.
 */
export default function AbastecimientoTimeline({ envio, compacto = false, esAdmin = false, onConfirmarRecepcion = null }) {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const envioId = envio?.id;

  useEffect(() => {
    if (!envioId) return;
    let vigente = true;
    setCargando(true);
    setError(null);
    obtenerTimelineAbastecimiento(envioId)
      .then((res) => { if (vigente) setEventos(res); })
      .catch((err) => { if (vigente) setError(err.response?.data?.error || 'No se pudo cargar el seguimiento.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [envioId]);

  const fechaPorEstado = useMemo(() => {
    const mapa = {};
    for (const ev of eventos) {
      if (!mapa[ev.estado_nuevo]) mapa[ev.estado_nuevo] = ev.fecha;
    }
    return mapa;
  }, [eventos]);

  const rechazo = useMemo(
    () => [...eventos].reverse().find((ev) => ev.estado_nuevo === 'pago_rechazado'),
    [eventos],
  );

  if (!envio) return null;

  if (cargando) {
    return <div className="flex h-20 items-center justify-center text-sm text-fg-muted">Cargando seguimiento...</div>;
  }
  if (error) {
    return <p className="m-0 text-sm text-danger">{error}</p>;
  }

  const estadoActual = envio.abastecimiento_estado;
  const pasos = construirPasos(envio.tipo_logistica_abastecimiento, envio.ruta_abastecimiento || 'VIA_GESICOMM');

  // pago_rechazado no es un paso lineal propio (es un rebote a pago_enviado):
  // a los fines del avance se lo trata como si siguiera en "pago_enviado".
  const estadoParaIndice = estadoActual === 'pago_rechazado' ? 'pago_enviado' : estadoActual;
  const indiceActual = pasos.findIndex((p) => p.id === estadoParaIndice);
  const esFinal = estadoActual === 'recibido_en_deposito_cliente' || estadoActual === 'disponible_en_gesicomm';

  const anchoPaso = compacto ? 104 : 116;
  const tamanoCirculo = compacto ? 34 : 40;

  return (
    <div>
      {rechazo && (
        <div className="mb-4 flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <XCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="m-0">
            <strong>Comprobante rechazado</strong>{formatFecha(rechazo.fecha) ? ` (${formatFecha(rechazo.fecha)})` : ''}: {rechazo.comentario}
            {estadoActual === 'pago_rechazado' ? ' — esperando que el comercio reenvíe el comprobante.' : ' — se resolvió con un nuevo envío.'}
          </p>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex items-start" style={{ minWidth: pasos.length * (anchoPaso + 16) }}>
          {pasos.map((paso, i) => {
            const completado = i < indiceActual || (i === indiceActual && esFinal);
            const esActual = i === indiceActual && !esFinal;
            const pendiente = i > indiceActual;
            const Icono = paso.icon;
            const fecha = formatFecha(fechaPorEstado[paso.id]);

            const circuloStyle = completado
              ? { background: 'var(--color-success)', color: '#fff' }
              : esActual
              ? (estadoActual === 'pago_rechazado'
                ? { background: 'var(--color-danger)', color: '#fff' }
                : { background: 'var(--color-primary)', color: '#fff' })
              : { background: 'var(--color-surface-2)', color: 'var(--color-fg-subtle)', border: '2px solid var(--color-border)' };

            return (
              <div key={paso.id} style={{ display: 'flex', alignItems: 'flex-start', flex: i === pasos.length - 1 ? '0 0 auto' : '1 1 auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: anchoPaso }}>
                  <div
                    style={{
                      width: tamanoCirculo,
                      height: tamanoCirculo,
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: esActual ? '0 0 0 4px color-mix(in srgb, var(--color-primary) 20%, transparent)' : 'none',
                      ...circuloStyle,
                    }}
                  >
                    {estadoActual === 'pago_rechazado' && esActual ? <XCircle size={compacto ? 16 : 18} /> : <Icono size={compacto ? 16 : 18} />}
                  </div>
                  <span
                    className="mt-2 text-center text-[12px] font-medium leading-tight"
                    style={{ color: pendiente ? 'var(--color-fg-subtle)' : 'var(--color-fg)' }}
                  >
                    {paso.label}
                  </span>
                  {fecha && <span className="text-[11px] text-fg-subtle">{fecha}</span>}
                </div>
                {i < pasos.length - 1 && (
                  <div
                    style={{
                      height: 2,
                      flex: 1,
                      marginTop: tamanoCirculo / 2,
                      background: i < indiceActual ? 'var(--color-success)' : 'var(--color-border)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {estadoActual === 'en_transito_a_deposito_cliente' && (
        esAdmin ? (
          <div className="mt-4 rounded-md border border-border bg-surface-2 px-4 py-3 text-sm text-fg-muted">
            Esperando confirmación de recepción por parte del cliente.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
            <div>
              <p className="m-0 text-sm font-semibold text-fg">¿Recibiste esta mercadería en tu depósito?</p>
              <p className="m-0 text-[13px] text-fg-muted">
                Tenés que confirmar la recepción para poder preparar y despachar el pedido.
              </p>
            </div>
            {onConfirmarRecepcion && (
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                onClick={(ev) => { ev.stopPropagation(); onConfirmarRecepcion(envio); }}
              >
                Confirmar recepción
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
